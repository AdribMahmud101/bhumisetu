import { documentMime, DOCX_MIME } from "./document-types";
export async function prepareDocument(file: File) {
  if (file.size > 5242880) throw new Error("Maximum file size is 5 MB");
  const mime = documentMime(file);
  if (mime === DOCX_MIME)
    return (await import("./docx-client")).prepareDocx(file);
  if (mime.startsWith("image/")) {
    const data = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = reject;
      r.readAsDataURL(new Blob([file], { type: mime }));
    });
    return { pages: [data], text: "" };
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
  try {
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      texts.push(
        `PAGE ${n}\n` +
          content.items.map((i) => ("str" in i ? i.str : "")).join(" "),
      );
      const viewport = page.getViewport({ scale: 1.3 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext("2d")!, viewport })
        .promise;
      pages.push(canvas.toDataURL("image/jpeg", 0.75));
    }
  } finally {
    await doc.destroy();
  }
  return { pages, text: texts.join("\n").slice(0, 40000) };
}
