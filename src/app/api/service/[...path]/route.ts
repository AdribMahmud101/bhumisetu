import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { categories, emptyFields, LandDocument, normalize } from "@/lib/domain";
import {
  check,
  db,
  loadLand,
  officer,
  sessionUser,
  publicAuth,
  requireOfficer,
} from "@/lib/data";
import { fieldsSchema, landSchema } from "@/lib/validation";
import { extractPages } from "@/lib/extraction";
export const dynamic = "force-dynamic";
const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
function fail(error: unknown) {
  const message = error instanceof Error ? error.message : "Request failed";
  const status =
    message === "UNAUTHORIZED" ? 401 : message === "NOT_FOUND" ? 404 : 400;
  return json({ error: message }, status);
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
    if (action === "lands") {
      let q = db()
        .from("master_lands")
        .select("*")
        .order("created_at", { ascending: false });
      if (!admin) q = q.eq("is_finalized", true);
      const { data, error } = await q;
      check(error);
      return json(data);
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
    if (action === "audit") {
      await requireOfficer();
      const { data, error } = await db()
        .from("audit_logs")
        .select("*")
        .eq("document_id", id)
        .order("created_at", { ascending: false });
      check(error);
      return json(data);
    }
    if (action === "document") {
      const { data: d, error } = await db()
        .from("land_documents")
        .select("*")
        .eq("id", id)
        .single();
      check(error);
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
    if (action === "compare") {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File) || file.size > 5242880)
        throw new Error("Choose a file up to 5 MB");
      const { documents } = await loadLand(id, false);
      const sha = createHash("sha256")
        .update(Buffer.from(await file.arrayBuffer()))
        .digest("hex");
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
      if (
        !(file instanceof File) ||
        file.size > 5242880 ||
        !["application/pdf", "image/png", "image/jpeg"].includes(file.type)
      )
        throw new Error("Upload a PDF, PNG or JPEG up to 5 MB");
      const bytes = Buffer.from(await file.arrayBuffer());
      const hash = createHash("sha256").update(bytes).digest("hex");
      if (
        file.type === "application/pdf" &&
        !bytes.subarray(0, 5).equals(Buffer.from("%PDF-"))
      )
        throw new Error("Invalid PDF");
      const { data: duplicate } = await db()
        .from("land_documents")
        .select("id")
        .eq("master_land_id", land.id)
        .eq("sha256", hash)
        .maybeSingle();
      if (duplicate)
        throw new Error("This exact document is already stored for the parcel");
      const path =
        land.id +
        "/" +
        randomUUID() +
        (file.type === "application/pdf"
          ? ".pdf"
          : file.type === "image/png"
            ? ".png"
            : ".jpg");
      const { error: se } = await db()
        .storage.from("land-documents")
        .upload(path, bytes, { contentType: file.type });
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
          file_name: file.name,
          mime_type: file.type,
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
        .single();
      check(error);
      if (doc.verification_status === "VERIFIED")
        throw new Error("Reviewed documents cannot be re-extracted");
      const body = await req.json();
      validateContent(body.pages, body.text);
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
            source_pages: body.pages.length,
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
      const b = await req.json();
      const fields = fieldsSchema.parse(b.fields);
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
