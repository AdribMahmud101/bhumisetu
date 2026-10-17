export const categories = {
  KHATIAN: {
    bn: "খতিয়ান",
    en: "Khatian",
    types: ["CS", "SA", "RS", "BS_BRS", "NAMJARI"],
  },
  PORCHA: {
    bn: "পর্চা",
    en: "Porcha",
    types: ["GENERAL", "CERTIFIED", "FIELD", "DRAFT"],
  },
  DEED: {
    bn: "দলিল",
    en: "Deed",
    types: [
      "SAF_KABALA",
      "HEBA_DANPATRA",
      "BANTONNAMA",
      "BAYNAPATRA",
      "OSIYATNAMA",
      "MORTGAGE",
    ],
  },
  MUTATION: {
    bn: "নামজারি",
    en: "Mutation",
    types: ["PURCHASE", "INHERITANCE", "PARTITION", "OTHER"],
  },
} as const;
export type Category = keyof typeof categories;
export interface Land {
  id: string;
  unique_land_id: string;
  district: string;
  upazila: string;
  mouza: string;
  jl_number: string;
  dag_number: string;
  current_khatian_no: string;
  total_area_decimals: number;
  is_finalized: boolean;
  created_at: string;
}
export interface Fields {
  official_number: string | null;
  document_date: string | null;
  execution_date: string | null;
  seller_or_prior_owner: string | null;
  buyer_or_current_owner: string | null;
  dag_number: string | null;
  area_decimals: number | null;
  khatian_ref: string | null;
  share_identity: string | null;
  based_on_deed: string | null;
}
export interface LandDocument extends Fields {
  id: string;
  doc_code: string;
  master_land_id: string;
  category: Category;
  sub_type: string;
  verification_status: "PENDING" | "VERIFIED" | "NEEDS_CORRECTION";
  extraction_status: string;
  extraction_error: string | null;
  file_path: string;
  sha256: string;
  file_name: string;
  mime_type: string;
  extracted_json: Record<string, unknown>;
  created_at: string;
}
export interface Signal {
  id: string;
  title: string;
  points: number;
  detail: string;
  evidence: string[];
}
export interface Analysis {
  score: number;
  signals: Signal[];
  coverage: number;
  pending: number;
  recorded: number;
  sold: number;
  excess: number;
  status: string;
  missing: string[];
  version: string;
}
export const fieldLabels: Record<keyof Fields, string> = {
  official_number: "নথি নম্বর / Document number",
  document_date: "নিবন্ধনের তারিখ / Record date",
  execution_date: "সম্পাদনের তারিখ / Execution date",
  seller_or_prior_owner: "বিক্রেতা / Prior recorded party",
  buyer_or_current_owner: "ক্রেতা / Recorded party",
  dag_number: "দাগ নম্বর / Dag",
  area_decimals: "জমির পরিমাণ (শতাংশ) / Decimals",
  khatian_ref: "খতিয়ান / Khatian reference",
  share_identity: "জমির অংশ / Share identifier",
  based_on_deed: "সংশ্লিষ্ট দলিল / Referenced deed",
};
export const emptyFields: Fields = {
  official_number: null,
  document_date: null,
  execution_date: null,
  seller_or_prior_owner: null,
  buyer_or_current_owner: null,
  dag_number: null,
  area_decimals: null,
  khatian_ref: null,
  share_identity: null,
  based_on_deed: null,
};
export function normalize(value: unknown) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)))
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}
