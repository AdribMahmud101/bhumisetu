import { z } from "zod";
import { dateFromDisplay } from "./date-input";
import { toAsciiDigits } from "./numbers";

const nullableText = z.string().trim().max(500).nullable();
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (s) =>
      !Number.isNaN(Date.parse(s)) &&
      new Date(s).toISOString().slice(0, 10) === s,
    "Invalid date",
  )
  .nullable();

export const fieldsSchema = z.object({
  official_number: nullableText,
  document_date: date,
  execution_date: date,
  seller_or_prior_owner: nullableText,
  buyer_or_current_owner: nullableText,
  dag_number: nullableText,
  area_decimals: z.preprocess(
    (val) => {
      if (val == null || val === "") return null;
      const ascii = toAsciiDigits(String(val)).trim();
      const num = Number(ascii);
      return Number.isFinite(num) ? num : val;
    },
    z.number().positive().max(10000000).nullable(),
  ),
  area_unit: nullableText.optional(),
  khatian_ref: nullableText,
  share_identity: nullableText,
  based_on_deed: nullableText,
});
export const landSchema = z.object({
  district: z.string().trim().min(1).max(100),
  upazila: z.string().trim().min(1).max(100),
  mouza: z.string().trim().min(1).max(100),
  jl_number: z.string().max(50),
  dag_number: z.string().trim().min(1).max(50),
  current_khatian_no: z.string().max(100),
  total_area_decimals: z.preprocess(
    (val) => {
      if (val == null || val === "") return val;
      const ascii = toAsciiDigits(String(val)).trim();
      const num = Number(ascii);
      return Number.isFinite(num) ? num : val;
    },
    z.coerce.number().positive().max(10000000),
  ),
});

export const parcelExtractionSchema = z.object({
  district: nullableText,
  upazila: nullableText,
  mouza: nullableText,
  jl_number: nullableText,
  dag_number: nullableText,
  current_khatian_no: nullableText,
  total_area_decimals: z.preprocess(
    (val) => {
      if (val == null || val === "") return null;
      const ascii = toAsciiDigits(String(val)).trim();
      const num = Number(ascii);
      return Number.isFinite(num) ? num : val;
    },
    z.number().positive().max(10000000).nullable(),
  ),
  total_area_unit: nullableText.optional(),
});

export const preprocessingSchema = z.object({
  version: z.literal("scan-v1"),
  enhanced: z.boolean(),
  pages: z
    .array(
      z.object({
        width: z.number().int().positive().max(5000),
        height: z.number().int().positive().max(5000),
        rotation: z.number().min(-4).max(4),
        contrast: z.boolean(),
        brightened: z.boolean(),
      }),
    )
    .max(3),
});

export function parseReviewedFields(value: unknown) {
  if (value && typeof value === "object") {
    const raw = { ...value } as Record<string, any>;
    for (const key of ["document_date", "execution_date"] as const) {
      if (typeof raw[key] === "string") {
        const trimmed = raw[key].trim();
        if (!trimmed) {
          raw[key] = null;
        } else {
          const parsed = dateFromDisplay(trimmed);
          raw[key] = parsed ?? "INVALID_DATE";
        }
      }
    }
    const result = fieldsSchema.safeParse(raw);
    if (!result.success)
      throw new Error(
        "Check document dates (YYYY-MM-DD) and positive area; leave unknown values blank",
      );
    return result.data;
  }
  const result = fieldsSchema.safeParse(value);
  if (!result.success)
    throw new Error(
      "Check document dates (YYYY-MM-DD) and positive area; leave unknown values blank",
    );
  return result.data;
}
