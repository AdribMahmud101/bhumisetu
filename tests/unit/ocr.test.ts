import { expect, test } from "bun:test";
import {
  enhancePixels,
  estimateSkew,
  luminance,
} from "../../src/lib/ocr-pixels";
test("a blank page is never rotated or marked up", () => {
  const gray = new Uint8Array(400 * 400).fill(255);
  expect(estimateSkew(gray, 400, 400)).toBe(0);
  const data = new Uint8ClampedArray(40 * 40 * 4).fill(255);
  enhancePixels(data, 40, 40);
  expect(data.every((value) => value === 255)).toBe(true);
});
test("projection deskew detects a small slant and leaves horizontal text alone", () => {
  const width = 600,
    height = 500;
  const draw = (degrees: number) => {
    const gray = new Uint8Array(width * height).fill(245);
    for (let baseline = 80; baseline <= 400; baseline += 40)
      for (let x = 50; x < 550; x++) {
        if (x % 45 > 32) continue;
        const y = Math.round(
          baseline + (x - width / 2) * Math.tan((degrees * Math.PI) / 180),
        );
        for (let dy = 0; dy < 4; dy++) gray[(y + dy) * width + x] = 80;
      }
    return gray;
  };
  expect(estimateSkew(draw(0), width, height)).toBe(0);
  expect(estimateSkew(draw(3), width, height)).toBeCloseTo(-3, 0);
});
test("contrast increases for faint text without deleting small marks or color differences", () => {
  const w = 50,
    h = 50,
    data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = 220;
    data[i * 4 + 1] = 225;
    data[i * 4 + 2] = 230;
    data[i * 4 + 3] = 255;
  }
  for (let y = 10; y < 40; y++)
    for (let x = 10; x < 20; x++)
      for (let c = 0; c < 3; c++) data[(y * w + x) * 4 + c] = 145;
  const dark = (20 * w + 15) * 4,
    background = (20 * w + 30) * 4;
  const before =
    luminance(data[background], data[background + 1], data[background + 2]) -
    luminance(data[dark], data[dark + 1], data[dark + 2]);
  const result = enhancePixels(data, w, h);
  const after =
    luminance(data[background], data[background + 1], data[background + 2]) -
    luminance(data[dark], data[dark + 1], data[dark + 2]);
  expect(result.contrast).toBe(true);
  expect(after).toBeGreaterThan(before);
  expect(data[background + 2]).toBeGreaterThan(data[background]);
});

test("officer corrections reject impossible dates and invalid areas with readable guidance", async () => {
  const { parseReviewedFields } = await import("../../src/lib/validation");
  const { emptyFields } = await import("../../src/lib/domain");
  expect(() =>
    parseReviewedFields({ ...emptyFields, document_date: "2021-02-30" }),
  ).toThrow("Check document dates");
  expect(() =>
    parseReviewedFields({ ...emptyFields, area_decimals: -1 }),
  ).toThrow("positive area");
  expect(
    parseReviewedFields({ ...emptyFields, document_date: "2020-02-29" })
      .document_date,
  ).toBe("2020-02-29");
  expect(
    parseReviewedFields({ ...emptyFields, document_date: "১৯/৫/২০২২" })
      .document_date,
  ).toBe("2022-05-19");
  expect(
    parseReviewedFields({ ...emptyFields, execution_date: "19/5/2022" })
      .execution_date,
  ).toBe("2022-05-19");
  expect(
    parseReviewedFields({ ...emptyFields, document_date: "2022" })
      .document_date,
  ).toBe("2022-01-01");
  expect(
    parseReviewedFields({ ...emptyFields, document_date: "২০২২" })
      .document_date,
  ).toBe("2022-01-01");
  expect(
    parseReviewedFields({ ...emptyFields, document_date: "১২ ফেব্রুয়ারি ২০২০" })
      .document_date,
  ).toBe("2020-02-12");
  expect(parseReviewedFields(emptyFields).area_decimals).toBeNull();
});
