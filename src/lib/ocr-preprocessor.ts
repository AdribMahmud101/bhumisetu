import { enhancePixels, estimateSkew, luminance } from "./ocr-pixels";
export interface PageProcessing {
  width: number;
  height: number;
  rotation: number;
  contrast: boolean;
  brightened: boolean;
}
export interface ProcessingInfo {
  version: "scan-v1";
  enhanced: boolean;
  pages: PageProcessing[];
}
export interface PrepareOptions {
  enhance?: boolean;
}
export function processingInfo(
  enhance: boolean,
  pages: PageProcessing[],
): ProcessingInfo {
  return { version: "scan-v1", enhanced: enhance, pages };
}
function canvas(width: number, height: number) {
  const value = document.createElement("canvas");
  value.width = width;
  value.height = height;
  const context = value.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Image preprocessing is unavailable");
  context.fillStyle = "white";
  context.fillRect(0, 0, width, height);
  return { canvas: value, context };
}
export async function preprocessImage(
  source: CanvasImageSource,
  width: number,
  height: number,
  enhance = true,
) {
  if (!width || !height || width * height > 36000000)
    throw new Error("Image dimensions exceed the supported limit");
  const maxDim = Math.max(width, height);
  const targetMax = 1500;
  const scale = maxDim > targetMax ? targetMax / maxDim : 1;
  let output = canvas(
    Math.max(1, Math.round(width * scale)),
    Math.max(1, Math.round(height * scale)),
  );
  output.context.imageSmoothingEnabled = true;
  output.context.imageSmoothingQuality = "high";
  output.context.drawImage(
    source,
    0,
    0,
    output.canvas.width,
    output.canvas.height,
  );
  let rotation = 0,
    contrast = false,
    brightened = false;
  if (enhance) {
    const ratio = Math.min(
      1,
      700 / Math.max(output.canvas.width, output.canvas.height),
    );
    const small = canvas(
      Math.max(1, Math.round(output.canvas.width * ratio)),
      Math.max(1, Math.round(output.canvas.height * ratio)),
    );
    small.context.drawImage(
      output.canvas,
      0,
      0,
      small.canvas.width,
      small.canvas.height,
    );
    const pixels = small.context.getImageData(
      0,
      0,
      small.canvas.width,
      small.canvas.height,
    ).data;
    const gray = new Uint8Array(small.canvas.width * small.canvas.height);
    for (let i = 0; i < gray.length; i++)
      gray[i] = luminance(pixels[i * 4], pixels[i * 4 + 1], pixels[i * 4 + 2]);
    rotation = estimateSkew(gray, small.canvas.width, small.canvas.height);
    if (rotation) {
      const radians = (rotation * Math.PI) / 180,
        w = output.canvas.width,
        h = output.canvas.height;
      const rotated = canvas(
        Math.ceil(
          Math.abs(w * Math.cos(radians)) + Math.abs(h * Math.sin(radians)),
        ),
        Math.ceil(
          Math.abs(w * Math.sin(radians)) + Math.abs(h * Math.cos(radians)),
        ),
      );
      rotated.context.translate(
        rotated.canvas.width / 2,
        rotated.canvas.height / 2,
      );
      rotated.context.rotate(radians);
      rotated.context.drawImage(output.canvas, -w / 2, -h / 2);
      rotated.context.setTransform(1, 0, 0, 1, 0, 0);
      output = rotated;
    }
    const image = output.context.getImageData(
      0,
      0,
      output.canvas.width,
      output.canvas.height,
    );
    ({ contrast, brightened } = enhancePixels(
      image.data,
      output.canvas.width,
      output.canvas.height,
    ));
    output.context.putImageData(image, 0, 0);
  }
  let url = output.canvas.toDataURL("image/jpeg", 0.80);
  if (url.length >= 1500000) url = output.canvas.toDataURL("image/jpeg", 0.72);
  while (
    url.length >= 1800000 &&
    Math.max(output.canvas.width, output.canvas.height) > 1000
  ) {
    const resized = canvas(
      Math.round(output.canvas.width * 0.85),
      Math.round(output.canvas.height * 0.85),
    );
    resized.context.drawImage(
      output.canvas,
      0,
      0,
      resized.canvas.width,
      resized.canvas.height,
    );
    output = resized;
    url = output.canvas.toDataURL("image/jpeg", 0.78);
  }
  if (url.length >= 2500000)
    throw new Error("Prepared image exceeds the supported limit");
  return {
    url,
    info: {
      width: output.canvas.width,
      height: output.canvas.height,
      rotation,
      contrast,
      brightened,
    } satisfies PageProcessing,
  };
}
export async function prepareImageBlob(blob: Blob, enhance = true) {
  const bitmap = await createImageBitmap(blob, {
    imageOrientation: "from-image",
  }).catch(() => {
    throw new Error("Image could not be decoded");
  });
  try {
    return await preprocessImage(bitmap, bitmap.width, bitmap.height, enhance);
  } finally {
    bitmap.close();
  }
}
