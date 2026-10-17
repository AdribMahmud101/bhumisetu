import { readDocx } from "./docx";
export async function prepareDocx(file: File) {
  const content = readDocx(new Uint8Array(await file.arrayBuffer()));
  const pages: string[] = [];
  for (const image of content.images) {
    const bitmap = await createImageBitmap(
      new Blob([Uint8Array.from(image.bytes).buffer], { type: image.mime }),
    ).catch(() => {
      throw new Error("Invalid DOCX embedded image");
    });
    try {
      if (
        !bitmap.width ||
        !bitmap.height ||
        bitmap.width * bitmap.height > 24000000
      )
        throw new Error(
          "DOCX embedded image dimensions exceed the supported limit",
        );
      const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Invalid DOCX embedded image");
      context.fillStyle = "white";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const page = canvas.toDataURL("image/jpeg", 0.85);
      if (page.length >= 2500000)
        throw new Error("DOCX embedded image exceeds the supported limit");
      pages.push(page);
    } finally {
      bitmap.close();
    }
  }
  return { pages, text: content.text };
}
