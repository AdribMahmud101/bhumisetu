import { toBengaliDigits } from "./numbers";

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
      "OTHER",
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
  total_area_unit?: string | null;
  is_finalized: boolean;
  is_deleted?: boolean;
  deleted_at?: string | null;
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
  area_unit?: string | null;
  khatian_ref: string | null;
  share_identity: string | null;
  based_on_deed: string | null;
}
export interface LandDocument extends Fields {
  id: string;
  deleted_at?: string | null;
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
  area_decimals: "জমির পরিমাণ / Land area",
  area_unit: "জমির একক / Land unit",
  khatian_ref: "খতিয়ান / Khatian reference",
  share_identity: "জমির অংশ / Share identifier",
  based_on_deed: "সংশ্লিষ্ট দলিল / Referenced deed",
};

export const categoryFields: Record<Category, (keyof Fields)[]> = {
  KHATIAN: [
    "official_number",
    "buyer_or_current_owner",
    "document_date",
    "dag_number",
    "area_decimals",
    "khatian_ref",
  ],
  PORCHA: [
    "official_number",
    "buyer_or_current_owner",
    "document_date",
    "dag_number",
    "area_decimals",
    "khatian_ref",
  ],
  DEED: [
    "official_number",
    "seller_or_prior_owner",
    "buyer_or_current_owner",
    "execution_date",
    "document_date",
    "dag_number",
    "area_decimals",
    "khatian_ref",
  ],
  MUTATION: [
    "official_number",
    "seller_or_prior_owner",
    "buyer_or_current_owner",
    "document_date",
    "based_on_deed",
    "dag_number",
    "area_decimals",
    "khatian_ref",
  ],
};
export const emptyFields: Fields = {
  official_number: null,
  document_date: null,
  execution_date: null,
  seller_or_prior_owner: null,
  buyer_or_current_owner: null,
  dag_number: null,
  area_decimals: null,
  area_unit: null,
  khatian_ref: null,
  share_identity: null,
  based_on_deed: null,
};

export const LAND_UNITS = [
  "শতাংশ",
  "একর",
  "বিঘা",
  "কাঠা",
  "ছটাক",
] as const;
export type LandUnit = (typeof LAND_UNITS)[number];

export function formatLandArea(
  decimals: number | null | undefined,
  unit?: string | null,
  locale: string = "bn",
): string {
  if (decimals == null) return "—";
  const num = Number(decimals);
  if (!Number.isFinite(num)) return "—";
  const isEn = locale === "en";
  const fmt = (v: number | string) => (isEn ? String(v) : toBengaliDigits(v));
  const u = (unit || "").trim().toLowerCase();
  if (u === "একর" || u === "acre" || u === "acres") {
    const acres = (num / 100).toFixed(2).replace(/\.00$/, "");
    return isEn
      ? `${acres} acres (${num} decimals)`
      : `${fmt(acres)} একর (${fmt(num)} শতাংশ)`;
  }
  if (u === "বিঘা" || u === "bigha" || u === "bighas") {
    const bighas = (num / 33).toFixed(2).replace(/\.00$/, "");
    return isEn
      ? `${bighas} bighas (${num} decimals)`
      : `${fmt(bighas)} বিঘা (${fmt(num)} শতাংশ)`;
  }
  if (u === "কাঠা" || u === "katha" || u === "kathas") {
    const kathas = (num / 1.65).toFixed(2).replace(/\.00$/, "");
    return isEn
      ? `${kathas} kathas (${num} decimals)`
      : `${fmt(kathas)} কাঠা (${fmt(num)} শতাংশ)`;
  }
  if (u === "ছটাক" || u === "chhatak") {
    const chhataks = (num / 0.103125).toFixed(2).replace(/\.00$/, "");
    return isEn
      ? `${chhataks} chhataks (${num} decimals)`
      : `${fmt(chhataks)} ছটাক (${fmt(num)} শতাংশ)`;
  }
  if (u === "একর ও শতাংশ") {
    const acres = Math.floor(num / 100);
    const rem = Math.round((num % 100) * 100) / 100;
    return isEn
      ? `${acres} acres ${rem} decimals`
      : `${fmt(acres)} একর ${fmt(rem)} শতাংশ`;
  }
  return isEn ? `${num} decimals` : `${fmt(num)} শতাংশ`;
}

export function normalize(value: unknown) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)))
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}
