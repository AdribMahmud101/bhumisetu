import { zipSync, strToU8 } from "fflate";
export const DOCX_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export function fixtureDocx(
  body: string,
  extra: Record<string, Uint8Array> = {},
) {
  return zipSync({
    "[Content_Types].xml": strToU8(
      '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    ),
    "_rels/.rels": strToU8(
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    ),
    "word/document.xml": strToU8(
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><w:body>' +
        body +
        "</w:body></w:document>",
    ),
    ...extra,
  });
}
export const fixtureText =
  "<w:p><w:r><w:t>FICTIONAL LAND RECORD — TEST ONLY</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>RS Khatian RS-118; Dag 207; Recorded area 20 decimals</w:t></w:r></w:p></w:tc></w:tr></w:tbl><w:p><w:r><w:t>Recorded owner: Abdul Karim. Document date: 2018-01-01.</w:t></w:r></w:p><w:p><w:r><w:t>District: Synthetic District; Upazila: Synthetic Upazila; Mouza: Synthetic Mouza; JL: 12.</w:t></w:r></w:p>";
