import { unzipSync, strFromU8 } from "fflate";
import { XMLParser, XMLValidator } from "fast-xml-parser";
export interface DocxContent {
  text: string;
  images: { bytes: Uint8Array; mime: string }[];
}
const invalid = () => new Error("Invalid DOCX document");
function xml(bytes: Uint8Array | undefined): any[] {
  if (!bytes) throw invalid();
  const source = strFromU8(bytes);
  if (
    /<!DOCTYPE|<!ENTITY/i.test(source) ||
    XMLValidator.validate(source) !== true
  )
    throw invalid();
  return new XMLParser({
    preserveOrder: true,
    ignoreAttributes: false,
    parseTagValue: false,
    trimValues: false,
    processEntities: false,
  }).parse(source);
}
function decodeText(value: string) {
  return value.replace(
    /&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi,
    (match, entity: string) => {
      const known: Record<string, string> = {
        amp: "&",
        lt: "<",
        gt: ">",
        quot: '"',
        apos: "'",
      };
      if (entity[0] !== "#") return known[entity] ?? match;
      const code =
        entity[1].toLowerCase() === "x"
          ? parseInt(entity.slice(2), 16)
          : parseInt(entity.slice(1), 10);
      return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)
        ? String.fromCodePoint(code)
        : "";
    },
  );
}
export function readDocx(bytes: Uint8Array): DocxContent {
  if (bytes.length === 0 || bytes.length > 5242880)
    throw new Error("Maximum file size is 5 MB");
  if (bytes[0] !== 80 || bytes[1] !== 75 || bytes[2] !== 3 || bytes[3] !== 4)
    throw invalid();
  let archive: Record<string, Uint8Array>;
  const names = new Set<string>();
  let expanded = 0;
  try {
    // First inspect every entry without inflating any payload.
    unzipSync(bytes, {
      filter: (file) => {
        if (
          names.has(file.name) ||
          file.name.includes("\\") ||
          file.name.startsWith("/") ||
          file.name.split("/").includes("..") ||
          /[\x00-\x1f]/.test(file.name)
        )
          throw invalid();
        names.add(file.name);
        expanded += file.originalSize;
        if (
          names.size > 512 ||
          expanded > 20971520 ||
          file.originalSize > 5242880
        )
          throw new Error("DOCX expanded content exceeds the supported limit");
        if (/vbaProject|activeX|embeddings\//i.test(file.name))
          throw new Error("DOCX active or embedded objects are not supported");
        return false;
      },
    });
    archive = unzipSync(bytes, {
      filter: (file) =>
        file.name === "[Content_Types].xml" ||
        file.name === "_rels/.rels" ||
        /^word\/(document|header\d*|footer\d*|footnotes|endnotes)\.xml$/.test(
          file.name,
        ) ||
        /^word\/_rels\/[^/]+\.xml\.rels$/.test(file.name) ||
        /^word\/media\/[^/]+$/.test(file.name),
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("DOCX "))
      throw error;
    throw invalid();
  }
  const types = archive["[Content_Types].xml"];
  const typeTree = xml(types);
  const overrides = typeTree.flatMap((node) =>
    Object.values(node)
      .filter(Array.isArray)
      .flatMap((children) => children as any[]),
  );
  if (
    !overrides.some(
      (node) =>
        Object.keys(node).some((key) => key.split(":").pop() === "Override") &&
        node[":@"]?.["@_PartName"] === "/word/document.xml" &&
        node[":@"]?.["@_ContentType"] ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml",
    )
  )
    throw invalid();
  const roots = xml(archive["_rels/.rels"]);
  const relationshipRows = (tree: any[]) => {
    const result: Record<string, string>[] = [];
    const visit = (nodes: any[], depth = 0) => {
      if (depth > 100) throw invalid();
      for (const node of nodes)
        for (const [key, value] of Object.entries(node)) {
          if (key.split(":").pop() === "Relationship") {
            const attrs: Record<string, string> = {};
            for (const [name, val] of Object.entries(node[":@"] || {}))
              attrs[name.replace(/^@_/, "").split(":").pop()!] = String(val);
            result.push(attrs);
          }
          if (Array.isArray(value)) visit(value, depth + 1);
        }
    };
    visit(tree);
    return result;
  };
  if (
    !relationshipRows(roots).some(
      (r) =>
        r.Type?.endsWith("/officeDocument") &&
        ["word/document.xml", "/word/document.xml"].includes(r.Target) &&
        r.TargetMode !== "External",
    )
  )
    throw invalid();
  const parts = [
    "word/document.xml",
    ...Object.keys(archive)
      .filter((name) =>
        /^word\/(header\d*|footer\d*|footnotes|endnotes)\.xml$/.test(name),
      )
      .sort(),
  ];
  const texts: string[] = [],
    images: DocxContent["images"] = [];
  const seenImages = new Set<string>();
  for (const part of parts) {
    const tree = xml(archive[part]);
    if (
      part === "word/document.xml" &&
      !tree.some((node) =>
        Object.keys(node).some((key) => key.split(":").pop() === "document"),
      )
    )
      throw invalid();
    const relPath = "word/_rels/" + part.split("/").pop() + ".rels";
    const relations = archive[relPath]
      ? relationshipRows(xml(archive[relPath]))
      : [];
    const chunks: string[] = [];
    const walk = (nodes: any[], depth = 0) => {
      if (depth > 100) throw invalid();
      for (const node of nodes)
        for (const [key, children] of Object.entries(node)) {
          const local = key.split(":").pop();
          if (["del", "instrText", "delText"].includes(local || "")) continue;
          if (local === "t" && Array.isArray(children))
            chunks.push(
              children
                .map((child) => decodeText(String(child["#text"] ?? "")))
                .join(""),
            );
          else if (local === "tab") chunks.push("\t");
          else if (local === "br" || local === "cr") chunks.push("\n");
          else if (local === "blip" || local === "imagedata") {
            const attrs = node[":@"] || {};
            const id = Object.entries(attrs).find(([name]) =>
              /(?:embed|link|id)$/.test(name),
            )?.[1];
            const relation = relations.find((r) => r.Id === id);
            if (!relation || relation.TargetMode === "External")
              throw new Error(
                "DOCX linked images must be embedded before upload",
              );
            const target = relation.Target;
            const path = target?.startsWith("/word/media/")
              ? target.slice(1)
              : target?.startsWith("media/")
                ? "word/" + target
                : "";
            if (!path || !archive[path]) throw invalid();
            if (!seenImages.has(path)) {
              seenImages.add(path);
              if (seenImages.size > 3)
                throw new Error("DOCX supports up to 3 embedded images");
              const image = archive[path];
              const png = [137, 80, 78, 71, 13, 10, 26, 10].every(
                (v, i) => image[i] === v,
              );
              const jpeg =
                image[0] === 255 && image[1] === 216 && image[2] === 255;
              if (!png && !jpeg)
                throw new Error("DOCX embedded images must be PNG or JPEG");
              images.push({
                bytes: image,
                mime: png ? "image/png" : "image/jpeg",
              });
            }
          } else if (Array.isArray(children)) walk(children, depth + 1);
          if (local === "p" || local === "tr") chunks.push("\n");
          if (local === "tc") chunks.push("\t");
        }
    };
    walk(tree);
    texts.push(chunks.join(""));
  }
  const text = texts.join("\n").trim();
  if (text.length > 40000)
    throw new Error("DOCX text exceeds 40000 characters; split the document");
  if (!text && !images.length)
    throw new Error("DOCX contains no readable text or supported images");
  return { text, images };
}
