import { createClient } from "@supabase/supabase-js";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createHash, randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { emptyFields, type Fields } from "../src/lib/domain";
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);
const check = (e: any) => {
  if (e) throw new Error(e.message);
};
await mkdir(".local/fixtures", { recursive: true });
let officerId: string;
const email = "officer@bhumisetu.example";
const { data: users, error: ue } = await db.auth.admin.listUsers();
check(ue);
const existing = users.users.find((u) => u.email === email);
if (existing) officerId = existing.id;
else {
  const password = randomBytes(18).toString("base64url");
  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: "officer" },
  });
  check(error);
  officerId = data.user!.id;
  await writeFile(
    ".local/officer.json",
    JSON.stringify({ email, password }, null, 2),
    { mode: 0o600 },
  );
}
const lands = [
  {
    unique_land_id: "LND-MOCK-001",
    district: "Narsingdi",
    upazila: "Shibpur",
    mouza: "Kaliganj (fictional)",
    jl_number: "25",
    dag_number: "207",
    current_khatian_no: "RS-118",
    total_area_decimals: 20,
    is_finalized: true,
  },
  {
    unique_land_id: "LND-CLEAN-002",
    district: "Gazipur",
    upazila: "Kaliganj",
    mouza: "Shobujpur (fictional)",
    jl_number: "42",
    dag_number: "310",
    current_khatian_no: "RS-220",
    total_area_decimals: 30,
    is_finalized: true,
  },
  {
    unique_land_id: "LND-DRAFT-003",
    district: "Dhaka",
    upazila: "Savar",
    mouza: "Notunpara (fictional)",
    jl_number: "12",
    dag_number: "410",
    current_khatian_no: "RS-330",
    total_area_decimals: 15,
    is_finalized: false,
  },
];
async function pdf(
  title: string,
  fields: Fields,
  land: (typeof lands)[number],
  fileName: string,
) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  page.drawRectangle({
    x: 0,
    y: 777,
    width: 595,
    height: 65,
    color: rgb(0.03, 0.32, 0.23),
  });
  page.drawText("BHUMISETU | SYNTHETIC SAMPLE DOCUMENT", {
    x: 38,
    y: 804,
    size: 16,
    font: bold,
    color: rgb(1, 1, 1),
  });
  page.drawText("FICTIONAL DATA - NOT A GOVERNMENT RECORD - NO LEGAL VALUE", {
    x: 38,
    y: 756,
    size: 9,
    font: bold,
    color: rgb(0.65, 0.21, 0.17),
  });
  page.drawText(title, {
    x: 38,
    y: 711,
    size: 22,
    font: bold,
    color: rgb(0.06, 0.29, 0.21),
  });
  page.drawText(`Master land: ${land.unique_land_id} | ${land.mouza}`, {
    x: 38,
    y: 682,
    size: 10,
    font,
  });
  let y = 642;
  for (const [key, val] of Object.entries(fields)) {
    if (val == null) continue;
    page.drawText(key.replaceAll("_", " ").toUpperCase(), {
      x: 38,
      y,
      size: 9,
      font: bold,
      color: rgb(0.4, 0.48, 0.4),
    });
    page.drawText(String(val), { x: 250, y, size: 11, font });
    page.drawLine({
      start: { x: 38, y: y - 13 },
      end: { x: 555, y: y - 13 },
      thickness: 0.5,
      color: rgb(0.85, 0.9, 0.84),
    });
    y -= 44;
  }
  page.drawText(
    "Fictional training sample created for LandTech 2026. Names and records are invented.",
    { x: 38, y: 65, size: 9, font },
  );
  const bytes = await pdf.save();
  await writeFile(".local/fixtures/" + fileName, bytes);
  return bytes;
}
for (let i = 0; i < lands.length; i++) {
  const l = lands[i];
  const { data: land, error } = await db
    .from("master_lands")
    .upsert(l, { onConflict: "unique_land_id" })
    .select()
    .single();
  check(error);
  const base = {
    ...emptyFields,
    document_date: "2018-01-10",
    official_number: l.current_khatian_no,
    buyer_or_current_owner: i === 0 ? "Abdul Karim" : "Nadia Akter",
    dag_number: l.dag_number,
    area_decimals: l.total_area_decimals,
    khatian_ref: l.current_khatian_no,
  };
  const fixture: any[] = [
    {
      category: "KHATIAN",
      sub_type: "RS",
      fields: base,
      code: `DOC-KH-00${i + 1}`,
    },
  ];
  if (i === 0) {
    fixture.push(
      {
        category: "PORCHA",
        sub_type: "CERTIFIED",
        code: "DOC-POR-001",
        fields: { ...base, official_number: "POR-118" },
      },
      {
        category: "DEED",
        sub_type: "SAF_KABALA",
        code: "DOC-DEED-001",
        fields: {
          ...base,
          official_number: "502/2021",
          document_date: "2021-03-15",
          execution_date: "2021-03-14",
          seller_or_prior_owner: "Abdul Karim",
          buyer_or_current_owner: "Rahima Begum",
          area_decimals: 12,
          share_identity: "NORTH-12-DAG207",
        },
      },
      {
        category: "DEED",
        sub_type: "SAF_KABALA",
        code: "DOC-DEED-002",
        fields: {
          ...base,
          official_number: "889/2022",
          document_date: "2022-08-20",
          execution_date: "2022-08-19",
          seller_or_prior_owner: "Abdul Karim",
          buyer_or_current_owner: "Karim Uddin",
          area_decimals: 12,
          share_identity: "NORTH-12-DAG207",
        },
      },
      {
        category: "MUTATION",
        sub_type: "PURCHASE",
        code: "DOC-MUT-001",
        fields: {
          ...base,
          official_number: "MUT-2022-991",
          document_date: "2022-10-05",
          seller_or_prior_owner: "Abdul Karim",
          buyer_or_current_owner: "Karim Uddin",
          area_decimals: 12,
          based_on_deed: "889/2022",
          share_identity: "NORTH-12-DAG207",
        },
      },
    );
  }
  if (i === 1) {
    fixture.push({
      category: "DEED",
      sub_type: "SAF_KABALA",
      code: "DOC-DEED-003",
      fields: {
        ...base,
        official_number: "301/2023",
        document_date: "2023-02-10",
        execution_date: "2023-02-09",
        seller_or_prior_owner: "Nadia Akter",
        buyer_or_current_owner: "Sajid Hasan",
        area_decimals: 10,
        share_identity: "EAST-10-DAG310",
      },
    });
  }
  for (const f of fixture) {
    const filename = f.code + ".pdf";
    const bytes = await pdf(
      `${f.category} - ${f.sub_type}`,
      f.fields,
      l,
      filename,
    );
    const hash = createHash("sha256").update(bytes).digest("hex");
    const path = land.id + "/" + filename;
    const { data: old } = await db
      .from("land_documents")
      .select("id,file_path")
      .eq("doc_code", f.code)
      .maybeSingle();
    if (old) {
      const original = await db.storage
        .from("land-documents")
        .download(old.file_path);
      check(original.error);
      await writeFile(
        ".local/fixtures/" + filename,
        new Uint8Array(await original.data!.arrayBuffer()),
      );
      continue;
    }
    check(
      (
        await db.storage
          .from("land-documents")
          .upload(path, bytes, { contentType: "application/pdf", upsert: true })
      ).error,
    );
    const { data: doc, error: e } = await db
      .from("land_documents")
      .insert({
        ...f.fields,
        master_land_id: land.id,
        category: f.category,
        sub_type: f.sub_type,
        doc_code: f.code,
        file_path: path,
        file_name: filename,
        mime_type: "application/pdf",
        sha256: hash,
        verification_status: "PENDING",
        extraction_status: "READY",
        extracted_json: {
          source: "Reviewed synthetic fixture; not a live OCR result",
          page: 1,
        },
      })
      .select()
      .single();
    check(e);
    if (i < 2)
      check(
        (
          await db.rpc("review_document", {
            p_id: doc.id,
            p_actor: officerId,
            p_reason:
              "Synthetic fixture checked against generated original source PDF",
            p_fields: f.fields,
            p_status: "VERIFIED",
          })
        ).error,
      );
  }
  check(
    (
      await db
        .from("master_lands")
        .update({ is_finalized: l.is_finalized })
        .eq("id", land.id)
    ).error,
  );
  if (i === 0) {
    const tampered = { ...fixture[2].fields, area_decimals: 25 };
    await pdf(
      "DEED - SAF_KABALA | ALTERED SAMPLE",
      tampered,
      l,
      "TAMPERED-DEED-502.pdf",
    );
  }
}
console.log(
  "Seed complete: 3 parcels, 8 documents, real source PDFs in private storage.",
);
console.log(
  "Officer credentials stored in ignored .local/officer.json. No credentials printed.",
);
