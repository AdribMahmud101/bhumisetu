import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { categories } from "./domain";
import { db, check } from "./data";
import { extractPages } from "./extraction";
import { landSchema } from "./validation";
export async function getIntake(id: string, actor: string) {
  const { data, error } = await db()
    .from("document_intakes")
    .select("*")
    .eq("id", id)
    .eq("created_by", actor)
    .maybeSingle();
  check(error);
  if (!data) throw new Error("NOT_FOUND");
  // A terminated worker must not leave the private intake permanently locked.
  if (
    data.status === "EXTRACTING" &&
    Date.now() - Date.parse(data.updated_at) > 120000
  ) {
    const { data: recovered, error: recoveryError } = await db()
      .from("document_intakes")
      .update({
        status: "FAILED",
        extraction_error: "Extraction interrupted; retry available",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("created_by", actor)
      .eq("status", "EXTRACTING")
      .eq("updated_at", data.updated_at)
      .select()
      .maybeSingle();
    check(recoveryError);
    if (recovered) return recovered;
  }
  return {
    ...data,
    retry_recommended:
      data.status === "FAILED" &&
      /invalid_type|invalid_format|Invalid date/.test(
        data.extraction_error || "",
      ) &&
      data.extraction_metadata?.parser_version !== "2026-10-17-v2",
  };
}
export async function createIntake(form: FormData, actor: string) {
  const file = form.get("file");
  const category = String(form.get("category")) as keyof typeof categories;
  const subtype = String(form.get("subtype"));
  if (
    !categories[category] ||
    !(categories[category].types as readonly string[]).includes(subtype)
  )
    throw new Error("Invalid category/subtype");
  if (
    !(file instanceof File) ||
    file.size === 0 ||
    file.size > 5242880 ||
    !["application/pdf", "image/png", "image/jpeg"].includes(file.type)
  )
    throw new Error("Upload a PDF, PNG or JPEG up to 5 MB");
  const bytes = Buffer.from(await file.arrayBuffer());
  const valid =
    file.type === "application/pdf"
      ? bytes.subarray(0, 5).equals(Buffer.from("%PDF-"))
      : file.type === "image/png"
        ? bytes
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (!valid) throw new Error("File content does not match its document type");
  const id = randomUUID(),
    hash = createHash("sha256").update(bytes).digest("hex");
  const path = `intakes/${actor}/${id}${file.type === "application/pdf" ? ".pdf" : file.type === "image/png" ? ".png" : ".jpg"}`;
  check(
    (
      await db()
        .storage.from("land-documents")
        .upload(path, bytes, { contentType: file.type })
    ).error,
  );
  const { data, error } = await db()
    .from("document_intakes")
    .insert({
      id,
      created_by: actor,
      category,
      sub_type: subtype,
      file_name: file.name,
      file_path: path,
      mime_type: file.type,
      sha256: hash,
    })
    .select()
    .single();
  if (error) {
    await db().storage.from("land-documents").remove([path]);
    check(error);
  }
  return data;
}
export async function extractIntake(
  id: string,
  actor: string,
  pages: string[],
  text: string,
) {
  const { data, error } = await db()
    .from("document_intakes")
    .update({
      status: "EXTRACTING",
      extraction_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("created_by", actor)
    .in("status", ["UPLOADED", "FAILED", "READY"])
    .select()
    .maybeSingle();
  check(error);
  if (!data)
    throw new Error("Intake is already attached or extraction is running");
  try {
    const result = await extractPages(
      pages,
      text,
      data.category,
      data.sub_type,
      true,
    );
    const { data: saved, error: e } = await db()
      .from("document_intakes")
      .update({
        status: "READY",
        extracted_fields: result.fields,
        parcel_fields: result.parcel,
        extraction_metadata: {
          parser_version: "2026-10-17-v2",
          model: result.model,
          usage: result.usage,
          source_pages: pages.length,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("created_by", actor)
      .eq("status", "EXTRACTING")
      .select()
      .single();
    check(e);
    return saved;
  } catch (error) {
    await db()
      .from("document_intakes")
      .update({
        status: "FAILED",
        extraction_metadata: {
          ...data.extraction_metadata,
          parser_version: "2026-10-17-v2",
        },
        extraction_error:
          error instanceof Error ? error.message : "Extraction failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("created_by", actor)
      .eq("status", "EXTRACTING");
    throw error;
  }
}
export async function confirmIntake(
  id: string,
  actor: string,
  body: { land: unknown; reason: unknown },
) {
  const land = landSchema.parse(body.land);
  const reason = String(body.reason || "").trim();
  if (reason.length < 3 || reason.length > 1000)
    throw new Error("Confirmation reason required");
  const { data, error } = await db().rpc("confirm_document_intake", {
    p_id: id,
    p_actor: actor,
    p_land: land,
    p_reason: reason,
  });
  check(error);
  return data;
}
