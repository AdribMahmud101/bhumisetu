import { documentMime, DOCX_MIME } from "./document-types";
import { readDocx } from "./docx";
export async function validateDocumentUpload(value: unknown) {
  if (!(value instanceof File) || !value.size || value.size > 5242880)
    throw new Error("Upload a PDF, DOCX, PNG or JPEG up to 5 MB");
  const mime = documentMime(value);
  const bytes = Buffer.from(await value.arrayBuffer());
  if (mime === DOCX_MIME) readDocx(bytes);
  else {
    const valid =
      mime === "application/pdf"
        ? bytes.subarray(0, 5).equals(Buffer.from("%PDF-"))
        : mime === "image/png"
          ? bytes
              .subarray(0, 8)
              .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    if (!valid)
      throw new Error("File content does not match its document type");
  }
  return { file: value, bytes, mime };
}
