import { readDocx } from "./docx";
import {
  prepareImageBlob,
  processingInfo,
  PrepareOptions,
  PageProcessing,
} from "./ocr-preprocessor";
export async function prepareDocx(file: File, options: PrepareOptions = {}) {
  const content = readDocx(new Uint8Array(await file.arrayBuffer()));
  const enhance = options.enhance !== false;
  const pages: string[] = [],
    info: PageProcessing[] = [];
  for (const image of content.images) {
    const prepared = await prepareImageBlob(
      new Blob([Uint8Array.from(image.bytes).buffer], { type: image.mime }),
      enhance,
    );
    pages.push(prepared.url);
    info.push(prepared.info);
  }
  return {
    pages,
    text: content.text,
    preprocessing: processingInfo(enhance, info),
  };
}
