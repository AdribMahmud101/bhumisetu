import { z } from "zod";
const nullableText = z.string().trim().max(500).nullable();
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => !Number.isNaN(Date.parse(s)), "Invalid date")
  .nullable();
export const fieldsSchema = z.object({
  official_number: nullableText,
  document_date: date,
  execution_date: date,
  seller_or_prior_owner: nullableText,
  buyer_or_current_owner: nullableText,
  dag_number: nullableText,
  area_decimals: z.number().positive().max(10000000).nullable(),
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
  total_area_decimals: z.coerce.number().positive().max(10000000),
});

export const parcelExtractionSchema = z.object({
  district: nullableText,
  upazila: nullableText,
  mouza: nullableText,
  jl_number: nullableText,
  dag_number: nullableText,
  current_khatian_no: nullableText,
  total_area_decimals: z.number().positive().max(10000000).nullable(),
});
