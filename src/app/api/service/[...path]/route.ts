import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { categories, emptyFields, Land, LandDocument, normalize } from "@/lib/domain";
import {
  compareDeedWithRecord,
  parseQrDeedPayload,
  ExtractedDeedFields,
} from "@/lib/deed-comparison-engine";
import {
  check,
  db,
  loadLand,
  officer,
  sessionUser,
  publicAuth,
  requireOfficer,
} from "@/lib/data";
import {
  parseReviewedFields,
  landSchema,
  preprocessingSchema,
} from "@/lib/validation";
import { extractPages } from "@/lib/extraction";
import { validateDocumentUpload } from "@/lib/document-upload";
import { documentExtension } from "@/lib/document-types";
import {
  createIntake,
  getIntake,
  extractIntake,
  confirmIntake,
} from "@/lib/intake";
import { toAsciiDigits } from "@/lib/numbers";
export const dynamic = "force-dynamic";
const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
function fail(error: unknown) {
  const message = error instanceof Error ? error.message : "Request failed";
  const status =
    message === "UNAUTHORIZED" ? 401 : message === "NOT_FOUND" ? 404 : 400;
  return json({ error: message }, status);
}
async function purgeLandRecord(landId: string) {
  const { data: docs } = await db()
    .from("land_documents")
    .select("id, file_path")
    .eq("master_land_id", landId);

  await db().from("mutation_cases").delete().eq("master_land_id", landId);

  if (docs?.length) {
    const docIds = docs.map((d) => d.id);
    await db().from("audit_logs").delete().in("document_id", docIds);
    const paths = docs.map((d) => d.file_path).filter(Boolean);
    if (paths.length) {
      try {
        await db().storage.from("land-documents").remove(paths);
      } catch (storageErr) {
        console.warn("Storage cleanup note:", storageErr);
      }
    }
    await db().from("land_documents").delete().eq("master_land_id", landId);
  }
  try {
    await db()
      .from("document_intakes")
      .update({ master_land_id: null, document_id: null })
      .eq("master_land_id", landId);
    await db().from("document_intakes").delete().eq("master_land_id", landId);
  } catch (intakeErr) {
    console.warn("Intake cleanup note:", intakeErr);
  }
  const { error: delErr } = await db()
    .from("master_lands")
    .delete()
    .eq("id", landId);
  check(delErr);
}
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const [action, id] = (await params).path;
    const user = await sessionUser();
    const admin = user?.app_metadata?.role === "officer";
    if (action === "session")
      return json({
        officer: admin,
        authenticated: !!user,
        role: user ? (admin ? "officer" : "citizen") : null,
        demo: !!user?.app_metadata?.demo,
      });
    if (action === "intake" || action === "intake-document") {
      const actor = await requireOfficer();
      const intake = await getIntake(id, actor.id);
      if (action === "intake-document") {
        const { data, error } = await db()
          .storage.from("land-documents")
          .createSignedUrl(intake.file_path, 180);
        check(error);
        return NextResponse.redirect(data!.signedUrl);
      }
      return json(intake);
    }
    if (action === "stats") {
      await requireOfficer();
      const [{ count: docCount, error: docErr }, { count: landCount, error: landErr }] = await Promise.all([
        db().from("land_documents").select("*", { count: "exact", head: true }),
        db().from("master_lands").select("*", { count: "exact", head: true }).eq("is_deleted", false),
      ]);
      check(docErr);
      check(landErr);
      return json({
        totalDocuments: docCount || 0,
        totalLands: landCount || 0,
      });
    }
    if (action === "lands") {
      await requireOfficer();
      const { data, error } = await db()
        .from("master_lands")
        .select("*")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      check(error);
      return json(data);
    }
    if (action === "trash") {
      await requireOfficer();
      const { data, error } = await db()
        .from("master_lands")
        .select("*")
        .eq("is_deleted", true)
        .order("deleted_at", { ascending: false });
      check(error);
      return json(data || []);
    }
    if (action === "land") {
      const result = await loadLand(id, admin);
      return json({
        ...result,
        documents: result.documents.map((d) => {
          const copy = { ...d };
          if (!admin) {
            copy.file_path = "";
            copy.extracted_json = {};
            copy.extraction_error = null;
          }
          return copy;
        }),
      });
    }
    if (action === "verification" || action === "verify-engine") {
      const { runVerificationEngine } = await import("@/lib/verification-engine");
      const verification = await runVerificationEngine(id);
      return json(verification);
    }
    if (action === "audit") {
      await requireOfficer();
      if (!id || id === "all") {
        const { data: logs, error } = await db()
          .from("audit_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);
        check(error);

        const docIds = Array.from(new Set((logs || []).map((l) => l.document_id).filter(Boolean)));
        let docMap = new Map<string, any>();
        let landMap = new Map<string, any>();

        if (docIds.length) {
          const { data: docs } = await db()
            .from("land_documents")
            .select("id, official_number, category, sub_type, doc_code, master_land_id")
            .in("id", docIds);
          docMap = new Map((docs || []).map((d) => [d.id, d]));

          const landIds = Array.from(new Set((docs || []).map((d) => d.master_land_id).filter(Boolean)));
          if (landIds.length) {
            const { data: lands } = await db()
              .from("master_lands")
              .select("id, unique_land_id, mouza, upazila, district")
              .in("id", landIds);
            landMap = new Map((lands || []).map((l) => [l.id, l]));
          }
        }

        const enriched = (logs || []).map((l) => {
          const doc = docMap.get(l.document_id) || null;
          const land = doc?.master_land_id ? landMap.get(doc.master_land_id) || null : null;
          return {
            ...l,
            document: doc,
            land: land,
          };
        });
        return json(enriched);
      }

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      
      // 1. First check if it matches a master_land by UUID or unique_land_id
      let masterLandQuery = db().from("master_lands").select("id, unique_land_id");
      masterLandQuery = isUuid ? masterLandQuery.or(`id.eq.${id},unique_land_id.eq.${id}`) : masterLandQuery.eq("unique_land_id", id);
      const { data: landRecord } = await masterLandQuery.maybeSingle();

      if (landRecord) {
        // Fetch all documents for this land
        const { data: docs } = await db()
          .from("land_documents")
          .select("id, official_number, category, sub_type, doc_code")
          .eq("master_land_id", landRecord.id);
        const docIds = (docs || []).map((d) => d.id);
        if (!docIds.length) return json([]);
        
        const docMap = new Map((docs || []).map((d) => [d.id, d]));
        const { data: logs, error } = await db()
          .from("audit_logs")
          .select("*")
          .in("document_id", docIds)
          .order("created_at", { ascending: false });
        check(error);

        const enrichedLogs = (logs || []).map((l) => ({
          ...l,
          document: docMap.get(l.document_id) || null,
        }));
        return json(enrichedLogs);
      }

      // 2. Otherwise query directly by document_id
      const { data: docData } = await db()
        .from("land_documents")
        .select("id, official_number, category, sub_type, doc_code")
        .eq("id", id)
        .maybeSingle();

      const { data, error } = await db()
        .from("audit_logs")
        .select("*")
        .eq("document_id", id)
        .order("created_at", { ascending: false });
      check(error);

      const enriched = (data || []).map((l) => ({
        ...l,
        document: docData || null,
      }));
      return json(enriched);
    }
    if (action === "document") {
      const { data: d, error } = await db()
        .from("land_documents")
        .select("*")
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle();
      check(error);
      if (!d) throw new Error("NOT_FOUND");
      const { land } = await loadLand(
        (
          await db()
            .from("master_lands")
            .select("unique_land_id")
            .eq("id", d.master_land_id)
            .single()
        ).data!.unique_land_id,
        admin,
      );
      if (
        !admin &&
        (!land.is_finalized || d.verification_status !== "VERIFIED")
      )
        throw new Error("UNAUTHORIZED");
      const { data, error: e } = await db()
        .storage.from("land-documents")
        .createSignedUrl(d.file_path, 180);
      check(e);
      return NextResponse.redirect(data!.signedUrl);
    }
    if (action === "mutations") {
      await requireOfficer();
      const { data, error } = await db()
        .from("mutation_cases")
        .select("*,land_documents(*)")
        .order("created_at", { ascending: false });
      check(error);
      const cases = await Promise.all(
        (data || []).map(async (c) => {
          const { data: l } = await db()
            .from("master_lands")
            .select("unique_land_id")
            .eq("id", c.master_land_id)
            .single();
          const result = await loadLand(l!.unique_land_id, true);
          return {
            ...c,
            land: result.land,
            analysis: result.analysis,
            documents: result.documents,
            display_status:
              c.status === "REJECTED"
                ? "REJECTED"
                : result.analysis.score > 0
                  ? "HEARING_REQUIRED"
                  : c.status === "APPROVED"
                    ? "APPROVED"
                    : "READY_FOR_REVIEW",
          };
        }),
      );
      return json(cases);
    }
    throw new Error("NOT_FOUND");
  } catch (error) {
    return fail(error);
  }
}
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const origin = req.headers.get("origin");
    if (origin && new URL(origin).host !== req.headers.get("host"))
      return json({ error: "Origin rejected" }, 403);
    const [action, id] = (await params).path;
    if (action === "register") {
      const b = await req.json();
      if (b.role && b.role !== "citizen")
        throw new Error(
          "Only citizen self-registration is available. Officer accounts are provisioned by administrators.",
        );
      const email = String(b.email || "").trim();
      const password = String(b.password || "");
      const name = String(b.name || "").trim();
      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        password.length < 8 ||
        password.length > 128 ||
        name.length < 2 ||
        name.length > 100
      )
        throw new Error(
          "Enter your name, a valid email and a password of 8–128 characters.",
        );
      const { data, error } = await publicAuth().auth.signUp({
        email,
        password,
        options: {
          data: { display_name: name },
          emailRedirectTo: req.nextUrl.origin + "/login",
        },
      });
      check(error);
      if (data.session)
        await setSession(
          req,
          data.session.access_token,
          data.session.expires_in,
        );
      return json({
        ok: true,
        authenticated: !!data.session,
        role: "citizen",
        message: data.session
          ? "Registration complete. You are signed in."
          : "Check your email to confirm registration, then sign in. If an account already exists, use the login form.",
      });
    }
    if (action === "login" || action === "demo-login") {
      const b = await req.json();
      const role = b.role || "officer";
      if (!["citizen", "officer"].includes(role))
        throw new Error("Choose citizen or officer access");
      const prefix = role === "officer" ? "DEMO_OFFICER" : "DEMO_CITIZEN";
      const email =
        action === "demo-login"
          ? process.env[prefix + "_EMAIL"]
          : String(b.email || "").trim();
      const password =
        action === "demo-login"
          ? process.env[prefix + "_PASSWORD"]
          : String(b.password || "");
      if (!email || !password)
        throw new Error(
          action === "demo-login"
            ? "Demo access is not configured"
            : "Email and password are required",
        );
      const { data, error } = await publicAuth().auth.signInWithPassword({
        email,
        password,
      });
      check(error);
      const actualRole =
        data.user?.app_metadata?.role === "officer" ? "officer" : "citizen";
      if (actualRole !== role)
        throw new Error(
          role === "officer"
            ? "Officer account required. Citizens should use citizen login."
            : "This is an officer account. Use administrative login.",
        );
      if (action === "demo-login" && !data.user?.app_metadata?.demo)
        throw new Error("Dedicated demo account required");
      await setSession(
        req,
        data.session!.access_token,
        data.session!.expires_in,
      );
      return json({
        ok: true,
        role: actualRole,
        demo: action === "demo-login",
      });
    }
    if (action === "logout") {
      (await cookies()).delete("bs-session");
      return json({ ok: true });
    }
    if (action === "verify-deed") {
      const contentType = req.headers.get("content-type") || "";
      let targetLandId: string | undefined = id;
      let qrPayload: string | undefined;
      let extracted: ExtractedDeedFields = {};

      if (contentType.includes("application/json")) {
        const body = await req.json();
        if (body.extractOnly) {
          const pages = body.pages || [];
          const text = body.text || "";
          validateContent(pages, text);
          const { fields } = await extractPages(pages, text, "DEED", "SAF_KABALA");
          let decimals = fields.area_decimals != null ? Number(fields.area_decimals) : null;
          if (decimals != null && fields.area_unit && /একর|acre/i.test(fields.area_unit) && decimals < 5) {
            decimals = Math.round(decimals * 100 * 100) / 100;
          }
          const extractedDeed: ExtractedDeedFields = {
            deedNumber: fields.official_number,
            deedDate: fields.document_date || fields.execution_date,
            sellerName: fields.seller_or_prior_owner,
            buyerName: fields.buyer_or_current_owner,
            dagNumber: fields.dag_number,
            landAreaDecimals: decimals,
            khatianNumber: fields.khatian_ref,
            qrPayload: body.qrPayload,
          };
          return json({
            ok: true,
            extracted: extractedDeed,
            fields,
          });
        }
        qrPayload = body.qrPayload;
        targetLandId = targetLandId || body.landId || body.masterLandId;
        extracted = body.extractedFields || {};
        if (qrPayload) {
          extracted.qrPayload = qrPayload;
        }
      } else {
        const form = await req.formData();
        const extractOnly = form.get("extractOnly") === "true";
        qrPayload = form.get("qrPayload") ? String(form.get("qrPayload")) : undefined;
        targetLandId = targetLandId || (form.get("landId") ? String(form.get("landId")) : undefined);
        const file = form.get("file");
        if (file && typeof file === "object" && "size" in file && file.size > 0) {
          const pages = JSON.parse(String(form.get("pages") || "[]"));
          const text = String(form.get("text") || "");
          validateContent(pages, text);
          const { fields } = await extractPages(pages, text, "DEED", "SAF_KABALA");
          let decimals = fields.area_decimals != null ? Number(fields.area_decimals) : null;
          if (decimals != null && fields.area_unit && /একর|acre/i.test(fields.area_unit) && decimals < 5) {
            decimals = Math.round(decimals * 100 * 100) / 100;
          }
          extracted = {
            deedNumber: fields.official_number,
            deedDate: fields.document_date || fields.execution_date,
            sellerName: fields.seller_or_prior_owner,
            buyerName: fields.buyer_or_current_owner,
            dagNumber: fields.dag_number,
            landAreaDecimals: decimals,
            khatianNumber: fields.khatian_ref,
            qrPayload,
          };
          if (extractOnly) {
            return json({
              ok: true,
              extracted,
              fields,
            });
          }
        } else if (qrPayload) {
          extracted = { qrPayload };
        }
      }

      if (extracted.landAreaDecimals != null) {
        const raw = String(extracted.landAreaDecimals);
        const ascii = toAsciiDigits(raw).replace(/[^0-9.]/g, "");
        const num = Number(ascii);
        extracted.landAreaDecimals = !Number.isNaN(num) && ascii !== "" ? num : null;
      }

      // If we don't have targetLandId yet, attempt to resolve via QR or deed number
      if (!targetLandId && qrPayload) {
        const parsed = parseQrDeedPayload(qrPayload);
        if (parsed.masterLandId) {
          targetLandId = parsed.masterLandId;
        } else if (parsed.deedNumber) {
          const { data: matchedDocs } = await db()
            .from("land_documents")
            .select("master_land_id")
            .eq("category", "DEED")
            .ilike("official_number", `%${parsed.deedNumber}%`)
            .limit(1);
          if (matchedDocs && matchedDocs.length > 0) {
            targetLandId = matchedDocs[0].master_land_id;
          }
        }
      }

      if (!targetLandId && extracted.deedNumber) {
        const { data: matchedDocs } = await db()
          .from("land_documents")
          .select("master_land_id")
          .eq("category", "DEED")
          .ilike("official_number", `%${extracted.deedNumber}%`)
          .limit(1);
        if (matchedDocs && matchedDocs.length > 0) {
          targetLandId = matchedDocs[0].master_land_id;
        }
      }

      let storedDocuments: LandDocument[] = [];
      let masterLand: Land | null = null;

      if (targetLandId) {
        try {
          const bundle = await loadLand(targetLandId, true);
          storedDocuments = bundle.documents;
          masterLand = bundle.land;
        } catch {
          // not found in DB
        }
      } else {
        const { data: allDocs } = await db()
          .from("land_documents")
          .select("*")
          .eq("verification_status", "VERIFIED")
          .is("deleted_at", null);
        storedDocuments = (allDocs || []) as LandDocument[];
      }

      const result = compareDeedWithRecord(extracted, storedDocuments, masterLand);
      return json(result);
    }
    if (action === "compare") {
      const form = await req.formData();
      const file = form.get("file");
      const { bytes } = await validateDocumentUpload(file);
      const { documents } = await loadLand(id, false);
      const sha = createHash("sha256").update(bytes).digest("hex");
      const exact = documents.find((d) => d.sha256 === sha);
      if (exact)
        return json({
          status: "Matched",
          mode: "SHA-256 exact copy",
          document: exact.official_number,
          rows: [],
          detail:
            "Exact bytes match the enrolled, reviewed document. This confirms copy integrity, not legal title.",
        });
      const pages = JSON.parse(String(form.get("pages") || "[]"));
      const text = String(form.get("text") || "");
      validateContent(pages, text);
      const { fields } = await extractPages(pages, text, "DEED", "SAF_KABALA");
      const reference = documents.find(
        (d) =>
          d.category === "DEED" &&
          normalize(d.official_number) === normalize(fields.official_number),
      );
      if (!reference)
        return json({
          status: "Further verification required",
          rows: [],
          detail:
            "No matching reviewed deed number was found. A different hash alone does not establish tampering.",
        });
      const keys = [
        "official_number",
        "seller_or_prior_owner",
        "buyer_or_current_owner",
        "dag_number",
        "area_decimals",
        "document_date",
      ] as const;
      const rows = keys.map((key) => ({
        key,
        stored: reference[key],
        uploaded: fields[key],
        status:
          fields[key] == null || reference[key] == null
            ? "Unknown"
            : normalize(reference[key]) === normalize(fields[key])
              ? "Matched"
              : "Mismatch",
      }));
      return json({
        status: rows.some((r) => r.status === "Mismatch")
          ? "Mismatch found"
          : rows.some((r) => r.status === "Unknown")
            ? "Further verification required"
            : "Matched",
        mode: "Extracted field comparison",
        rows,
        detail:
          "Field comparison against an enrolled record. Differences require source review; no legal authenticity conclusion is made.",
      });
    }
    const user = await requireOfficer();
    if (action === "intake")
      return json(await createIntake(await req.formData(), user.id));
    if (action === "intake-extract") {
      const body = await req.json();
      validateContent(body.pages, body.text);
      return json(
        await extractIntake(
          id,
          user.id,
          body.pages,
          body.text,
          body.preprocessing,
        ),
      );
    }
    if (action === "intake-confirm")
      return json(await confirmIntake(id, user.id, await req.json()));
    if (action === "create") {
      const fields = landSchema.parse(await req.json());
      const { data, error } = await db()
        .from("master_lands")
        .insert({
          ...fields,
          unique_land_id: "LND-" + randomUUID().slice(0, 8).toUpperCase(),
        })
        .select()
        .single();
      check(error);
      return json(data);
    }
    if (action === "update-land") {
      const b = await req.json();
      const updateData: Record<string, any> = {};
      if (b.district !== undefined) updateData.district = String(b.district).trim();
      if (b.upazila !== undefined) updateData.upazila = String(b.upazila).trim();
      if (b.mouza !== undefined) updateData.mouza = String(b.mouza).trim();
      if (b.jl_number !== undefined) updateData.jl_number = String(b.jl_number).trim();
      if (b.dag_number !== undefined) updateData.dag_number = String(b.dag_number).trim();
      if (b.current_khatian_no !== undefined)
        updateData.current_khatian_no = String(b.current_khatian_no).trim();
      if (b.total_area_decimals !== undefined) {
        const area = Number(toAsciiDigits(b.total_area_decimals));
        if (Number.isNaN(area) || area <= 0)
          throw new Error("Land area must be a positive number");
        updateData.total_area_decimals = area;
      }
      if (b.is_finalized !== undefined) updateData.is_finalized = Boolean(b.is_finalized);

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      let query = db().from("master_lands").update(updateData);
      query = isUuid ? query.eq("id", id) : query.eq("unique_land_id", id);
      const { data, error } = await query.select().single();
      check(error);
      return json({ ok: true, land: data });
    }
    if (action === "mark-reviewed" || action === "audit-review") {
      const b = await req.json().catch(() => ({}));
      return json({
        ok: true,
        reviewed: true,
        master_land_id: id,
        reviewed_by: user.id,
        notes: b.notes || "Marked as reviewed by officer",
        reviewed_at: new Date().toISOString(),
      });
    }
    if (action === "delete-land") {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      let query = db().from("master_lands").update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        is_finalized: false,
      });
      query = isUuid ? query.eq("id", id) : query.eq("unique_land_id", id);
      const { data, error } = await query.select().single();
      check(error);
      return json({ ok: true, trashed: data.unique_land_id, land: data });
    }
    if (action === "restore-land") {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      let query = db().from("master_lands").update({
        is_deleted: false,
        deleted_at: null,
      });
      query = isUuid ? query.eq("id", id) : query.eq("unique_land_id", id);
      const { data, error } = await query.select().single();
      check(error);
      return json({ ok: true, restored: data.unique_land_id, land: data });
    }
    if (action === "purge-land") {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      let query = db().from("master_lands").select("id, unique_land_id");
      query = isUuid ? query.eq("id", id) : query.eq("unique_land_id", id);
      const { data: land, error: le } = await query.maybeSingle();
      check(le);
      if (!land) throw new Error("Land record not found");

      await purgeLandRecord(land.id);
      return json({ ok: true, purged: land.unique_land_id });
    }
    if (action === "empty-trash") {
      const { data: trashed, error } = await db()
        .from("master_lands")
        .select("id")
        .eq("is_deleted", true);
      check(error);
      if (trashed?.length) {
        for (const t of trashed) {
          await purgeLandRecord(t.id);
        }
      }
      return json({ ok: true, purged_count: trashed?.length || 0 });
    }
    if (action === "delete-document") {
      const { data, error } = await db().rpc("archive_land_document", {
        p_id: id,
        p_actor: user.id,
      });
      check(error);
      return json(data);
    }
    if (action === "update-document") {
      const b = await req.json();
      const updateData: Record<string, any> = {};
      if (b.category !== undefined) {
        if (!["KHATIAN", "PORCHA", "DEED", "MUTATION"].includes(b.category))
          throw new Error("Invalid document category");
        updateData.category = b.category;
      }
      if (b.sub_type !== undefined) {
        updateData.sub_type = String(b.sub_type).trim();
      }
      if (b.official_number !== undefined) {
        updateData.official_number = String(b.official_number).trim() || null;
      }
      const { data, error } = await db()
        .from("land_documents")
        .update(updateData)
        .eq("id", id)
        .is("deleted_at", null)
        .select()
        .single();
      check(error);
      return json({ ok: true, document: data });
    }
    if (action === "upload") {
      const { land } = await loadLand(id, true);
      const form = await req.formData();
      const file = form.get("file");
      const category = String(form.get("category")) as keyof typeof categories;
      const subtype = String(form.get("subtype"));
      if (
        !categories[category] ||
        !(categories[category].types as readonly string[]).includes(subtype)
      )
        throw new Error("Invalid category/subtype");
      const {
        file: original,
        bytes,
        mime,
      } = await validateDocumentUpload(file);
      const hash = createHash("sha256").update(bytes).digest("hex");
      const { data: duplicate } = await db()
        .from("land_documents")
        .select("id")
        .eq("master_land_id", land.id)
        .eq("sha256", hash)
        .is("deleted_at", null)
        .maybeSingle();
      if (duplicate)
        throw new Error("This exact document is already stored for the parcel");
      const path = land.id + "/" + randomUUID() + documentExtension(mime);
      const { error: se } = await db()
        .storage.from("land-documents")
        .upload(path, bytes, { contentType: mime });
      check(se);
      const { data, error } = await db()
        .from("land_documents")
        .insert({
          master_land_id: land.id,
          doc_code: "DOC-" + randomUUID().slice(0, 8).toUpperCase(),
          category,
          sub_type: subtype,
          file_path: path,
          sha256: hash,
          file_name: original.name,
          mime_type: mime,
        })
        .select()
        .single();
      if (error) {
        await db().storage.from("land-documents").remove([path]);
        check(error);
      }
      return json(data);
    }
    if (action === "extract") {
      const { data: doc, error } = await db()
        .from("land_documents")
        .select("*")
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle();
      check(error);
      if (!doc) throw new Error("NOT_FOUND");
      if (doc.verification_status === "VERIFIED")
        throw new Error("Reviewed documents cannot be re-extracted");
      const body = await req.json();
      validateContent(body.pages, body.text);
      const processing =
        body.preprocessing === undefined
          ? null
          : preprocessingSchema.parse(body.preprocessing);
      if (processing && processing.pages.length !== body.pages.length)
        throw new Error("Invalid preprocessing metadata");
      await db()
        .from("land_documents")
        .update({ extraction_status: "EXTRACTING", extraction_error: null })
        .eq("id", id);
      try {
        const result = await extractPages(
          body.pages,
          body.text,
          doc.category,
          doc.sub_type,
        );
        // Only previously unreviewed fields can be populated automatically; correction changes use audited RPC.
        const { error: e } = await db().rpc("extract_document", {
          p_id: id,
          p_actor: user.id,
          p_fields: result.fields,
          p_metadata: {
            model: result.model,
            evidence: result.evidence,
            original_model_fields: result.original_model_fields,
            source_pages: body.pages.length,
            preprocessing: processing,
            usage: result.usage,
          },
        });
        check(e);
        return json(result);
      } catch (e) {
        await db()
          .from("land_documents")
          .update({
            extraction_status: "FAILED",
            extraction_error:
              e instanceof Error ? e.message : "Extraction failed",
          })
          .eq("id", id);
        throw e;
      }
    }
    if (action === "review") {
      const { data: activeDocument, error: activeError } = await db()
        .from("land_documents")
        .select("id")
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle();
      check(activeError);
      if (!activeDocument) throw new Error("NOT_FOUND");
      const b = await req.json();
      const fields = parseReviewedFields(b.fields);
      if (!["PENDING", "VERIFIED", "NEEDS_CORRECTION"].includes(b.status))
        throw new Error("Invalid review status");
      if (
        b.status === "VERIFIED" &&
        (!fields.official_number ||
          !fields.document_date ||
          !fields.dag_number ||
          !fields.area_decimals ||
          !fields.buyer_or_current_owner)
      )
        throw new Error(
          "Document number, date, recorded party, dag and area are required to verify",
        );
      const { error } = await db().rpc("review_document", {
        p_id: id,
        p_actor: user.id,
        p_reason: String(b.reason),
        p_fields: fields,
        p_status: b.status,
      });
      check(error);
      return json({ ok: true });
    }
    if (action === "publish") {
      const { land, documents } = await loadLand(id, true);
      if (
        !documents.length ||
        documents.some((d) => d.verification_status !== "VERIFIED")
      )
        throw new Error("Review all uploaded documents before publication");
      const { data: published, error } = await db()
        .from("master_lands")
        .update({ is_finalized: true })
        .eq("id", land.id)
        .eq("revision", land.revision)
        .select("id")
        .maybeSingle();
      check(error);
      if (!published)
        throw new Error(
          "Records changed during publication; refresh and review again",
        );
      return json({ ok: true });
    }
    if (action === "decision") {
      const b = await req.json();
      if (
        !["APPROVED", "REJECTED", "HEARING_REQUIRED"].includes(b.status) ||
        String(b.reason || "").trim().length < 3
      )
        throw new Error("Choose a decision and provide a reason");
      const { data: c, error } = await db()
        .from("mutation_cases")
        .select("*,master_lands(unique_land_id)")
        .eq("id", id)
        .single();
      check(error);
      const result = await loadLand(c.master_lands.unique_land_id, true);
      if (
        b.status === "APPROVED" &&
        (result.analysis.score > 0 ||
          result.analysis.pending > 0 ||
          !result.documents.some(
            (d) =>
              d.category === "KHATIAN" && d.verification_status === "VERIFIED",
          ))
      )
        throw new Error(
          "Approval blocked: resolve conflicts and complete the required document review",
        );
      const { error: e } = await db().rpc("decide_mutation", {
        p_id: id,
        p_actor: user.id,
        p_status: b.status,
        p_reason: b.reason,
        p_revision: result.land.revision,
      });
      check(e);
      return json({ ok: true });
    }
    throw new Error("NOT_FOUND");
  } catch (error) {
    return fail(error);
  }
}
function validateContent(pages: unknown, text: unknown) {
  if (
    !Array.isArray(pages) ||
    pages.length > 3 ||
    !pages.every(
      (p) =>
        typeof p === "string" &&
        /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(p) &&
        p.length < 2500000,
    ) ||
    typeof text !== "string" ||
    text.length > 40000 ||
    (!pages.length && !text.trim())
  )
    throw new Error("Provide 1–3 rendered pages or selectable document text");
}

async function setSession(req: NextRequest, token: string, expires: number) {
  (await cookies()).set("bs-session", token, {
    httpOnly: true,
    secure: req.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: expires,
  });
}
