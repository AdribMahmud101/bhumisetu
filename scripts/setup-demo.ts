import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);
await mkdir(".local", { recursive: true });
const path = ".local/demo-accounts.json";
let saved: Record<string, { email: string; password: string }> = {};
try {
  saved = JSON.parse(await readFile(path, "utf8"));
} catch {}
const { data: users, error } = await db.auth.admin.listUsers();
if (error) throw error;
const env: Record<string, string> = {};
for (const role of ["citizen", "officer"]) {
  const email = `demo-${role}@bhumisetu.example`;
  const password =
    saved[role]?.password || randomBytes(24).toString("base64url");
  const existing = users.users.find((u) => u.email === email);
  const attributes = {
    password,
    email_confirm: true,
    app_metadata: { role, demo: true },
  };
  const result = existing
    ? await db.auth.admin.updateUserById(existing.id, attributes)
    : await db.auth.admin.createUser({ email, ...attributes });
  if (result.error) throw result.error;
  saved[role] = { email, password };
  env[`DEMO_${role.toUpperCase()}_EMAIL`] = email;
  env[`DEMO_${role.toUpperCase()}_PASSWORD`] = password;
}
await writeFile(path, JSON.stringify(saved, null, 2), { mode: 0o600 });
const envPath = ".env.local";
const content = (await readFile(envPath, "utf8"))
  .split("\n")
  .filter((l) => !Object.keys(env).includes(l.split("=")[0]))
  .join("\n")
  .trim();
await writeFile(
  envPath,
  content +
    "\n" +
    Object.entries(env)
      .map(([k, v]) => k + "=" + v)
      .join("\n") +
    "\n",
  { mode: 0o600 },
);
await writeFile(".local/demo-worker-secrets.json", JSON.stringify(env), {
  mode: 0o600,
});
console.log(
  "Dedicated citizen and officer demo accounts configured. Credentials saved only in ignored local files.",
);
