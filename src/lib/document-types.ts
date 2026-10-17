export const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const DOCUMENT_ACCEPT =
  ".pdf,.png,.jpg,.jpeg,.docx,application/pdf,image/png,image/jpeg," +
  DOCX_MIME;
export function documentMime(file: { name: string; type: string }) {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "doc" || ext === "docm")
    throw new Error("Use DOCX instead of DOC or DOCM");
  const generic =
    !file.type ||
    [
      "application/octet-stream",
      "application/zip",
      "application/x-zip-compressed",
    ].includes(file.type);
  if (ext === "docx" || file.type === DOCX_MIME) {
    if (!generic && file.type !== DOCX_MIME)
      throw new Error("Invalid DOCX document");
    return DOCX_MIME;
  }
  if (generic) {
    if (ext === "pdf") return "application/pdf";
    if (ext === "png") return "image/png";
    if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  }
  if (["application/pdf", "image/png", "image/jpeg"].includes(file.type))
    return file.type;
  throw new Error("Upload a PDF, DOCX, PNG or JPEG up to 5 MB");
}
export function documentExtension(mime: string) {
  return mime === DOCX_MIME
    ? ".docx"
    : mime === "application/pdf"
      ? ".pdf"
      : mime === "image/png"
        ? ".png"
        : ".jpg";
}
