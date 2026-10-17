import ts from "typescript";
import { readFileSync } from "node:fs";
import en from "../../src/i18n/en.json";
import bn from "../../src/i18n/bn.json";
import sources from "../../src/i18n/sources.json";
const failures: string[] = [];
const english = new Set(Object.keys(en)),
  bangla = new Set(Object.keys(bn));
for (const key of new Set([...english, ...bangla])) {
  if (!english.has(key) || !bangla.has(key))
    failures.push(`Missing locale entry: ${key}`);
  const a = (en as Record<string, string>)[key],
    b = (bn as Record<string, string>)[key];
  if (!a?.trim() || !b?.trim()) failures.push(`Empty translation: ${key}`);
  const placeholders = (v: string) =>
    [...v.matchAll(/\{(\w+)\}/g)]
      .map((m) => m[1])
      .sort()
      .join(",");
  if (a && b && placeholders(a) !== placeholders(b))
    failures.push(`Placeholder mismatch: ${key}`);
}
for (const [source, key] of Object.entries(sources))
  if (!english.has(key)) failures.push(`Unknown alias: ${source}`);
for (const path of [
  "src/components/portal.tsx",
  "src/components/create-land-dialog.tsx",
  "src/components/docx-preview.tsx",
  "src/components/document-fields-editor.tsx",
  "src/components/auth-panel.tsx",
  "src/app/not-found.tsx",
]) {
  const file = ts.createSourceFile(
    path,
    readFileSync(path, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const neutral =
    /^(?:\s|[^A-Za-z\u0980-\u09ff]|LND-[A-Z0-9-]+|BhumiSetu|SHA-256:|LandTech 2026 · P3|© 2026 BhumiSetu · LandArchive BD|বাংলা|English)+$/;
  function visit(n: ts.Node) {
    if (ts.isJsxText(n) && n.text.trim() && !neutral.test(n.text.trim()))
      failures.push(`Untranslated visible text in ${path}: ${n.text.trim()}`);
    if (
      ts.isCallExpression(n) &&
      ts.isIdentifier(n.expression) &&
      n.expression.text === "t" &&
      n.arguments[0] &&
      ts.isStringLiteral(n.arguments[0]) &&
      !english.has(n.arguments[0].text)
    )
      failures.push(`Unknown message in ${path}: ${n.arguments[0].text}`);
    if (ts.isStringLiteral(n) && /[\u0980-\u09ff]/.test(n.text))
      failures.push(`Untranslated Bangla literal in ${path}: ${n.text}`);
    ts.forEachChild(n, visit);
  }
  visit(file);
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(
  `Translation check passed: ${english.size} complete bn/en messages, matching placeholders, valid aliases and no untranslated JSX copy.`,
);
