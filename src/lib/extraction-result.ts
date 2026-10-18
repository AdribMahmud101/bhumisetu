import { emptyFields, normalize } from "./domain";
import { fieldsSchema, parcelExtractionSchema } from "./validation";
export function parseExtractionResult(
  raw: unknown,
  category: string,
  includeParcel = false,
) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new Error("Invalid extraction result");
  const parsed = { ...emptyFields, ...raw } as Record<string, any>;
  // Model booleans are not documentary evidence; leave the field for review.
  for (const key of Object.keys(emptyFields))
    if (typeof parsed[key] === "boolean") parsed[key] = null;
  for (const key of [
    "official_number",
    "dag_number",
    "khatian_ref",
    "share_identity",
    "based_on_deed",
  ])
    if (typeof parsed[key] === "number" && Number.isFinite(parsed[key]))
      parsed[key] = String(parsed[key]);
  if (
    typeof parsed.area_decimals === "string" &&
    /^\d+(?:\.\d+)?$/.test(normalize(parsed.area_decimals))
  )
    parsed.area_decimals = Number(normalize(parsed.area_decimals));
  if (typeof parsed.area_unit === "string")
    parsed.area_unit = parsed.area_unit.trim() || null;
  // Never guess a calendar/date order from an ambiguous model response.
  for (const key of ["document_date", "execution_date"] as const) {
    if (typeof parsed[key] === "string") parsed[key] = normalize(parsed[key]);
    const date = fieldsSchema.shape[key].safeParse(parsed[key]);
    if (
      !date.success ||
      (date.data &&
        new Date(date.data).toISOString().slice(0, 10) !== date.data)
    )
      parsed[key] = null;
    else parsed[key] = date.data;
  }
  if (category !== "DEED") parsed.execution_date = null;
  if (category !== "MUTATION") parsed.based_on_deed = null;
  if (["KHATIAN", "PORCHA"].includes(category))
    parsed.seller_or_prior_owner = null;
  const fields = fieldsSchema.parse(parsed);
  let parcel: ReturnType<typeof parcelExtractionSchema.parse> | undefined;
  if (includeParcel) {
    const source =
      parsed.parcel && typeof parsed.parcel === "object" ? parsed.parcel : {};
    const candidate = Object.fromEntries(
      [
        "district",
        "upazila",
        "mouza",
        "jl_number",
        "dag_number",
        "current_khatian_no",
        "total_area_decimals",
        "total_area_unit",
      ].map((key) => [key, source[key] ?? null]),
    );
    for (const key of Object.keys(candidate))
      if (typeof candidate[key] === "boolean") candidate[key] = null;
    for (const key of ["jl_number", "dag_number", "current_khatian_no"])
      if (typeof candidate[key] === "number")
        candidate[key] = String(candidate[key]);
    if (
      typeof candidate.total_area_decimals === "string" &&
      /^\d+(?:\.\d+)?$/.test(normalize(candidate.total_area_decimals))
    )
      candidate.total_area_decimals = Number(
        normalize(candidate.total_area_decimals),
      );
    // A transferred area never establishes the parcel's baseline entitlement.
    if (!["KHATIAN", "PORCHA"].includes(category))
      candidate.total_area_decimals = null;
    parcel = parcelExtractionSchema.parse(candidate);
    parcel.dag_number ??= fields.dag_number;
    parcel.current_khatian_no ??=
      fields.khatian_ref ??
      (category === "KHATIAN" ? fields.official_number : null);
  }
  return { fields, parcel };
}
