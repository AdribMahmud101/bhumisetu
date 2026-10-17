import { expect, test } from "bun:test";
import { strToU8, zipSync } from "fflate";
import { readDocx } from "../../src/lib/docx";
import { validateDocumentUpload } from "../../src/lib/document-upload";
import { documentMime, DOCX_MIME } from "../../src/lib/document-types";
import { fixtureDocx, fixtureText } from "../fixtures/docx";
const rel = (target: string, mode = "") =>
  strToU8(
    `<Relationships><Relationship Id="rId2" Type="image" Target="${target}" ${mode}/></Relationships>`,
  );
const drawing = '<w:p><w:r><a:blip r:embed="rId2"/></w:r></w:p>';
const png = new Uint8Array(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j4ZkAAAAASUVORK5CYII=",
    "base64",
  ),
);
test("DOCX preserves Bangla, split runs, tables and entity text without HTML execution", () => {
  const doc = readDocx(
    fixtureDocx(
      "<w:p><w:r><w:t>বাংলা </w:t></w:r><w:r><w:t>খতিয়ান &amp; &lt;script&gt;</w:t></w:r></w:p>" +
        fixtureText,
    ),
  );
  expect(doc.text).toContain("বাংলা খতিয়ান & <script>");
  expect(doc.text).toContain("RS-118");
  expect(doc.text).toContain("20 decimals");
});
test("DOCX includes header text, skips deleted text and preserves current revisions", () => {
  const doc = readDocx(
    fixtureDocx(
      "<w:p><w:del><w:r><w:t>OLD OWNER</w:t></w:r></w:del><w:ins><w:r><w:t>Current owner</w:t></w:r></w:ins></w:p>",
      {
        "word/header1.xml": strToU8(
          "<w:hdr><w:p><w:r><w:t>Header district</w:t></w:r></w:p></w:hdr>",
        ),
      },
    ),
  );
  expect(doc.text).not.toContain("OLD OWNER");
  expect(doc.text).toContain("Current owner");
  expect(doc.text).toContain("Header district");
});
test("image-only DOCX supports embedded scans and rejects external or unsupported images", () => {
  const files = {
    "word/_rels/document.xml.rels": rel("media/scan.png"),
    "word/media/scan.png": png,
  };
  const result = readDocx(fixtureDocx(drawing, files));
  expect(result.text).toBe("");
  expect(result.images[0].mime).toBe("image/png");
  expect(() =>
    readDocx(
      fixtureDocx(drawing, {
        ...files,
        "word/_rels/document.xml.rels": rel(
          "https://example.invalid/scan.png",
          'TargetMode="External"',
        ),
      }),
    ),
  ).toThrow("linked images");
  expect(() =>
    readDocx(
      fixtureDocx(drawing, { ...files, "word/media/scan.png": strToU8("svg") }),
    ),
  ).toThrow("PNG or JPEG");
});
test("DOCX rejects non-docx ZIPs, corrupt files, empty files and entity declarations", () => {
  expect(() => readDocx(zipSync({ "fake.txt": strToU8("fake") }))).toThrow();
  expect(() => readDocx(strToU8("not a zip"))).toThrow();
  expect(() => readDocx(fixtureDocx(""))).toThrow("no readable text");
  expect(() =>
    readDocx(
      fixtureDocx(fixtureText, {
        "word/document.xml": strToU8(
          '<!DOCTYPE x [<!ENTITY x "fake">]><w:document/>',
        ),
      }),
    ),
  ).toThrow();
});
test("archive and text limits reject oversized content before AI extraction", () => {
  expect(() =>
    readDocx(
      fixtureDocx("<w:p><w:r><w:t>" + "A".repeat(40001) + "</w:t></w:r></w:p>"),
    ),
  ).toThrow("40000");
  expect(() =>
    readDocx(fixtureDocx(fixtureText, { "huge.bin": new Uint8Array(5242881) })),
  ).toThrow("expanded content");
  expect(() =>
    readDocx(fixtureDocx(fixtureText, { "../outside": strToU8("x") })),
  ).toThrow();
  expect(() =>
    readDocx(fixtureDocx(fixtureText, { "word/vbaProject.bin": strToU8("x") })),
  ).toThrow("active or embedded");
});
test("server validates actual content and normalizes missing browser MIME", async () => {
  expect(documentMime({ name: "RECORD.DOCX", type: "" })).toBe(DOCX_MIME);
  expect(documentMime({ name: "record.docx", type: "application/zip" })).toBe(
    DOCX_MIME,
  );
  expect(() =>
    documentMime({ name: "record.docm", type: DOCX_MIME }),
  ).toThrow();
  const file = new File(
    [Uint8Array.from(fixtureDocx(fixtureText)).buffer],
    "record.docx",
    { type: "application/octet-stream" },
  );
  expect((await validateDocumentUpload(file)).mime).toBe(DOCX_MIME);
  await expect(
    validateDocumentUpload(
      new File(["fake"], "record.docx", { type: DOCX_MIME }),
    ),
  ).rejects.toThrow();
});

test("DOCX image count is enforced without silently dropping image pages", () => {
  const extras: Record<string, Uint8Array> = {};
  let relationships = "<Relationships>",
    body = "";
  for (let i = 1; i <= 4; i++) {
    relationships += `<Relationship Id="image${i}" Type="image" Target="media/scan${i}.png"/>`;
    extras[`word/media/scan${i}.png`] = png;
    body += `<w:p><w:r><a:blip r:embed="image${i}"/></w:r></w:p>`;
  }
  extras["word/_rels/document.xml.rels"] = strToU8(
    relationships + "</Relationships>",
  );
  expect(() => readDocx(fixtureDocx(body, extras))).toThrow("up to 3");
});
