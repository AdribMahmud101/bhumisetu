import { documentMime, DOCX_MIME } from "./document-types";
import {
  prepareImageBlob,
  preprocessImage,
  processingInfo,
  PrepareOptions,
  PageProcessing,
} from "./ocr-preprocessor";
export async function prepareDocument(
  file: File,
  options: PrepareOptions = {},
) {
  const enhance = options.enhance !== false;
  if (file.size > 5242880) throw new Error("Maximum file size is 5 MB");
  const mime = documentMime(file);
  if (mime === DOCX_MIME)
    return (await import("./docx-client")).prepareDocx(file, options);
  if (mime.startsWith("image/")) {
    const prepared = await prepareImageBlob(
      new Blob([file], { type: mime }),
      enhance,
    );
    return {
      pages: [prepared.url],
      text: "",
      preprocessing: processingInfo(enhance, [prepared.info]),
    };
  }

  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
  }).promise;
  if (doc.numPages > 3) {
    await doc.destroy();
    throw new Error(
      "Prototype limit: 3 pages per PDF. Split a longer document before uploading.",
    );
  }
  const pages: string[] = [];
  const texts: string[] = [];
  const pageInfo: PageProcessing[] = [];
  try {
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      texts.push(
        `PAGE ${n}\n` +
          content.items.map((i) => ("str" in i ? i.str : "")).join(" "),
      );
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({
        scale: Math.min(2.2, 1800 / Math.max(base.width, base.height)),
      });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext("2d")!, viewport })
        .promise;
      const prepared = await preprocessImage(
        canvas,
        canvas.width,
        canvas.height,
        enhance,
      );
      pages.push(prepared.url);
      pageInfo.push(prepared.info);
    }
  } finally {
    await doc.destroy();
  }
  return {
    pages,
    text: texts.join("\n").slice(0, 40000),
    preprocessing: processingInfo(enhance, pageInfo),
  };
}
