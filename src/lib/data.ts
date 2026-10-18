import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "./supabase/server";
import { Land, LandDocument } from "./domain";
import { analyzeRecords } from "./verification-engine";
export const db = () => createSupabaseServerClient();
export function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}
export async function sessionUser() {
  const token = (await cookies()).get("bs-session")?.value;
  if (!token) return null;
  const { data, error } = await db().auth.getUser(token);
  return error ? null : data.user;
}
export async function officer() {
  const user = await sessionUser();
  return user?.app_metadata?.role === "officer" ? user : null;
}
export async function requireOfficer() {
  const user = await officer();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}
export function publicAuth() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export async function loadLand(id: string, admin = false) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  let q = db().from("master_lands").select("*");
  q = isUuid ? q.eq("id", id) : q.eq("unique_land_id", id);
  if (!admin) q = q.eq("is_finalized", true).eq("is_deleted", false);
  const { data: land, error } = await q.maybeSingle();
  check(error);
  if (!land) throw new Error("NOT_FOUND");
  let d = db()
    .from("land_documents")
    .select("*")
    .eq("master_land_id", land.id)
    .is("deleted_at", null)
    .order("document_date", { ascending: true });
  if (!admin) d = d.eq("verification_status", "VERIFIED");
  const { data: documents, error: de } = await d;
  check(de);
  return {
    land: land as Land & { revision: number },
    documents: (documents || []) as LandDocument[],
    analysis: analyzeRecords(land, documents || []),
  };
}
