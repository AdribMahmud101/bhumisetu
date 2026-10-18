import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const root = resolve(import.meta.dir, "..");
const mdPath = resolve(root, "docs/CONCEPT_NOTE.md");
const diagramPath = resolve(root, "docs/concept-note-architecture.html");
const htmlPath = resolve(root, "docs/CONCEPT_NOTE.html");
const pdfPath = resolve(root, "docs/BhumiSetu_LandTech2026_Concept_Note.pdf");

const markdown = readFileSync(mdPath, "utf8");
if ((markdown.match(/<div class="page-break"><\/div>/g) || []).length !== 2) {
  throw new Error("Concept note must define exactly three pages with two page breaks");
}
let article = execFileSync("bunx", ["marked", "-i", mdPath], { encoding: "utf8" });
const diagramHtml = readFileSync(diagramPath, "utf8");
const svg = diagramHtml.match(/<svg\b[\s\S]*?<\/svg>/)?.[0];
if (!svg) throw new Error("Architecture SVG not found");
const architecturePlaceholder =
  "<p>The architecture diagram is included in the PDF and available as <code>docs/concept-note-architecture.html</code>.</p>";
if (!article.includes(architecturePlaceholder)) {
  throw new Error("Architecture placeholder not found in concept Markdown");
}
article = article.replace(
  architecturePlaceholder,
  `<figure class="architecture">${svg}<figcaption>Officer-reviewed evidence reaches a versioned rule engine through protected server routes.</figcaption></figure>`,
);

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>BhumiSetu · LandTech 2026 Concept Note</title>
<style>
  @page{size:A4;margin:14mm 15mm 17mm}
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;color:#1c342b;background:#fff;font-family:Arial,"Noto Sans Bengali",sans-serif}
  body{font-size:9.8pt;line-height:1.38}
  article{max-width:100%}
  h1{font-size:28pt;line-height:1.07;letter-spacing:-.035em;margin:0 0 3mm;color:#084b37}
  h3{font-size:10.4pt;font-weight:700;color:#086447;margin:0 0 7mm;padding-bottom:3mm;border-bottom:2px solid #086447}
  h2{font-size:13.2pt;line-height:1.15;color:#084b37;margin:6mm 0 2.5mm;padding-bottom:1.5mm;border-bottom:1px solid #d6e4d9;break-after:avoid}
  p{margin:0 0 3.5mm;orphans:3;widows:3}
  strong{color:#123d2c}
  ol,ul{margin:0 0 3.5mm;padding-left:5.4mm}
  li{padding-left:.5mm;margin:0 0 2.3mm;break-inside:avoid}
  li::marker{color:#086447;font-weight:700}
  table{border-collapse:collapse;width:100%;margin:2.5mm 0 4mm;font-size:8.9pt;line-height:1.32}
  th{text-align:left;background:#e8f2eb;color:#084b37;font-weight:700}
  td,th{border-bottom:1px solid #d7e2d9;padding:2mm 2.5mm;vertical-align:top}
  td:first-child,th:first-child{width:30%}
  a{color:#086447;text-decoration:none;overflow-wrap:anywhere}
  code{font-family:Arial,"Noto Sans Bengali",sans-serif;color:#086447}
  em{font-size:8.1pt;color:#5c6d63}
  .page-break{break-after:page;height:0}
  .architecture{margin:1.8mm 0 3.5mm;padding:1.6mm;border:1px solid #d3e1d6;background:#f7f9f5;break-inside:avoid}
  .architecture svg{display:block;width:100%;height:auto;min-width:0}
  .architecture .edge{fill:none;stroke:#8ba69a;stroke-width:1.6;marker-end:url(#bs-arrow)}
  .architecture .edge-main{fill:none;stroke:#086447;stroke-width:1.9;marker-end:url(#bs-arrow-green)}
  .architecture .node{fill:#fff;stroke:#97afa2;stroke-width:1.1}
  .architecture .node-main{fill:#e9f4ed;stroke:#086447;stroke-width:1.5}
  .architecture .node-name{font-size:15px;font-weight:700;fill:#1c342b}
  .architecture .node-sub{font-size:11.5px;fill:#52675d}
  .architecture .tag{font-size:9.5px;font-weight:700;letter-spacing:.09em;fill:#086447}
  .architecture .legend{font-size:11px;fill:#52675d}
  figcaption{font-size:8pt;color:#52675d;margin:1.2mm 1mm .4mm}
  @media screen{body{background:#e9eee9;padding:28px}article{width:180mm;margin:auto;background:#fff;padding:14mm 15mm;box-shadow:0 8px 36px #1c342b18}}
</style></head><body><article>${article}</article></body></html>`;
writeFileSync(htmlPath, html);

const browser = await chromium.launch({ headless: true, channel: "chromium" });
try {
  const page = await browser.newPage();
  await page.goto(`file://${htmlPath}`, { waitUntil: "load" });
  await page.pdf({
    path: pdfPath,
    format: "A4",
    preferCSSPageSize: true,
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: "<span></span>",
    footerTemplate:
      '<div style="width:100%;padding:0 15mm;font:8px Arial,sans-serif;color:#6d8174;display:flex;justify-content:space-between"><span>BhumiSetu · LandTech 2026 · Concept note</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
  });
  console.log(`Wrote ${pdfPath}`);
} finally {
  await browser.close();
}
