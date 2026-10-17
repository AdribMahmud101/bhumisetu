### 1. The Zero-Friction, Fast-Track Dev Stack (16-Hour Sprint)

To ensure your AI coding agent (Cursor / Windsurf / Claude Code) writes **100% real, working code** with zero mock stubs, zero auth roadblocks, and zero compilation errors before tomorrow's **October 18, 2026** Round 1 deadline, lock in this stack:

| Layer | Choice | Why It Guarantees Zero Friction |
| --- | --- | --- |
| **Framework** | **Next.js 14 (App Router, TypeScript)** | Single codebase for UI and Server Actions. Deploys to **Vercel** (recommended over Cloudflare Pages because Node.js `crypto`, `pdf-lib`, and OpenAI SDK work natively without Edge runtime incompatibilities). |
| **UI Components** | **Tailwind CSS + Shadcn UI + Lucide React** | Copy-paste accessible components (`Card`, `Tabs`, `Badge`, `Dialog`, `Table`, `Sheet`) that AI agents know by heart. |
| **Database & Storage** | **Supabase (Postgres + Storage)** | Disable RLS during the hackathon or use `SUPABASE_SERVICE_ROLE_KEY` in Server Actions so the agent never hits permission-denied bugs. |
| **OCR & LLM** | **DeepInfra (`openai` npm SDK)** | Vision: `Qwen/Qwen2.5-VL-72B-Instruct`. Reasoning: `deepseek-ai/DeepSeek-V3`. |
| **PDF & QR Tools** | **`pdfjs-dist` + `qrcode.react` + `html5-qrcode**` | Renders uploaded PDFs to Canvas Base64 PNGs in the browser before sending to DeepInfra Vision, and generates/scans real QR codes.

 |
| **E2E Validation** | **Playwright (`@playwright/test`)** | Automated headless browser tests that verify real database mutations, OCR extraction, and the `65/100` risk calculation.

 |

---

### 2. Required `.md` Files for Your Coding Agent

Drop these **5 Markdown files** into the root of your repository. Modern coding agents automatically index `.md` files to stay grounded and avoid hallucinating requirements.

---

#### File 1: `AGENT_INSTRUCTIONS.md` (Master Prompt & Strict Rules)

```markdown
# BhumiSetu (LandArchive BD) - Master Agent Instructions

## 1. STRICT OPERATIONAL RULES (NON-NEGOTIABLE)
1. **NO MOCK IMPLEMENTATIONS**: Never return hardcoded `setTimeout` fake responses or `// TODO: implement later` comments. Every action must read/write to **Supabase PostgreSQL** or call the **DeepInfra API**.
2. **DATA PRIVACY COMPLIANCE**: Per Hackathon Rule 10, NEVER use real citizen NIDs, phone numbers, or real deeds. Only use synthetic records (e.g., `LND-MOCK-001`, Mouza `Kaliganj`, `Abdul Karim`, `Rahima Begum`, `Karim Uddin`).
3. **FOUR-DOCUMENT ARCHITECTURE**: Every Master Land Record (`master_lands`) holds 4 distinct document categories in `land_documents`:
   - `KHATIAN` (`CS`, `SA`, `RS`, `BS_BRS`, `NAMJARI`)
   - `PORCHA` (`GENERAL`, `CERTIFIED`, `FIELD`, `DRAFT`)
   - `DEED` (`SAF_KABALA`, `HEBA_DANPATRA`, `BANTONNAMA`, `BAYNAPATRA`, `OSIYATNAMA`, `MORTGAGE`)
   - `MUTATION` (`PURCHASE`, `INHERITANCE`, `PARTITION`, `OTHER`)
   Multiple PDFs can be uploaded per category/sub-type using the "+" button.
4. **ADMIN AUDIT LOG**: Any manual edit to AI-extracted fields MUST insert a record into `audit_logs` capturing `previous_value`, `new_value`, `field_name`, `reason`, and `admin_id` before updating `land_documents`.
5. **TERMINOLOGY GUARDRAILS**:
   - In P3 & P5, NEVER label the score as "Fraud Probability". Label it **"Estimated Risk Score (Rule-Based Indicator)"**.
   - In Ownership History, NEVER label the latest name as "Confirmed Legal Owner". Label it **"সর্বশেষ রেকর্ডীয় মালিক (Latest Recorded Owner)"**.
   - If Court Litigation, Khas Land, or Acquisition data is missing, display **"যাচাই করা হয়নি / তথ্য অনুপস্থিত (Not Checked / Data Unavailable)"**, NEVER "No Issue".

## 2. SHARED RULE-BASED VERIFICATION ENGINE (`lib/verification-engine.ts`)
Both **P3 (Admin Fraud Detection)** and **P5 (Citizen Pre-Purchase Check)** MUST call a single shared function `analyzeMasterLand(landId: string)` that queries all verified `land_documents` for that `landId` and computes:
- **Rule 1: Overlapping / Double Sale (+40 points)**: Sum of `transferred_area_decimals` across `SAF_KABALA` deeds from the same seller on the same `dag_number` exceeds the seller's recorded Khatian/Porcha `total_area_decimals` OR two deeds sell the exact same share/area (`12 decimals` in Deed `502/2021` + `12 decimals` in Deed `889/2022` > `20 decimals` total in `RS-118`).
- **Rule 2: Ownership History Conflict (+25 points)**: A deed's `seller_name` does not match any prior recorded owner in the Khatian or previous Deeds.
- **Rule 3: Deed-Mutation Mismatch (+20 points)**: A `MUTATION` record is approved for a later conflicting deed (`889/2022` for `Karim Uddin`) while an earlier valid registered deed (`502/2021` for `Rahima Begum`) exists on the same plot without mutation.
- **Rule 4: Suspicious Transaction Timeline (+15 points)**: Rapid back-to-back transfers or backdated execution vs registration dates.
- **Deduplication**: Cap total score at `100`. Return `{ riskScore, status, triggeredRules, evidenceDocs, missingChecks }`.

## 3. P4 SMART E-MUTATION AUTO-TRIGGER (SOLVING THE P4 GAP)
When a `DEED` document is marked `VERIFIED` by the Admin:
1. Automatically insert a draft row into `mutation_cases` with status `AUTO_INITIATED`, linking `deed_doc_id`, `master_land_id`, `buyer_name`, `seller_name`, and `transferred_area_decimals`.
2. Automatically run `analyzeMasterLand(master_land_id)` and attach `risk_score` and `conflict_summary` to the `mutation_cases` row.
3. On the **P4 Smart e-Mutation Dashboard (`/admin/mutations`)**, AC Land officers see pre-audited mutation cases:
   - If `risk_score === 0`: Enable **"One-Click Approve & Issue DCR + Digital Namjari Khatian"**.
   - If `risk_score > 0`: Flag in Red (`CONFLICT_DETECTED - HEARING_REQUIRED`) showing the exact colliding deeds (`502/2021` vs `889/2022`).

```

---

#### File 2: `DATABASE_AND_SEED.md` (Complete Supabase SQL & `LND-MOCK-001` Seed)

```markdown
# Supabase Database Schema & Deterministic Seed Data

Run this entire SQL script in the Supabase SQL Editor before starting the Next.js server.

```sql
-- 1. Master Land Record (Central Container)
create table if not exists master_lands (
  id uuid primary key default gen_random_uuid(),
  unique_land_id text unique not null, -- e.g. 'LND-MOCK-001' or 'ভূমি-০০০০০১'
  division text default 'ঢাকা',
  district text not null,
  upazila text not null,
  mouza text not null,
  jl_number text not null,
  current_khatian_no text not null,
  dag_number text not null,
  total_area_decimals numeric(10,2) not null,
  latest_recorded_owner text not null,
  khas_status text default 'UNAVAILABLE', -- 'CLEAR', 'FLAGGED', 'UNAVAILABLE'
  court_case_status text default 'UNAVAILABLE',
  acquisition_status text default 'UNAVAILABLE',
  is_finalized boolean default false,
  qr_code_payload text,
  created_at timestamptz default now()
);

-- 2. Four-Category Documents Table
create table if not exists land_documents (
  id uuid primary key default gen_random_uuid(),
  doc_code text unique not null, -- e.g. 'DOC-KH-001', 'DOC-DEED-001'
  master_land_id uuid references master_lands(id) on delete cascade not null,
  category text check (category in ('KHATIAN', 'PORCHA', 'DEED', 'MUTATION')) not null,
  sub_type text not null, -- e.g. 'RS', 'CERTIFIED', 'SAF_KABALA', 'PURCHASE'
  official_number text not null, -- Khatian No, Deed No, or Mutation Case No
  document_date date,
  seller_or_prior_owner text,
  buyer_or_current_owner text,
  dag_number text not null,
  khatian_ref text,
  area_decimals numeric(10,2) not null,
  consideration_amount numeric(14,2),
  sub_registry_or_office text,
  file_url text,
  extracted_json jsonb default '{}'::jsonb,
  ocr_confidence numeric(4,2) default 0.95,
  verification_status text check (verification_status in ('PENDING', 'VERIFIED', 'NEEDS_CORRECTION')) default 'PENDING',
  created_at timestamptz default now()
);

-- 3. Immutable Admin Audit Log (P1 Requirement)
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references land_documents(id) on delete cascade not null,
  admin_id text default 'ADM-007',
  field_name text not null,
  previous_value text,
  new_value text,
  reason text not null,
  created_at timestamptz default now()
);

-- 4. P4 Smart e-Mutation Automated Workflow Table
create table if not exists mutation_cases (
  id uuid primary key default gen_random_uuid(),
  case_number text unique not null, -- e.g. 'MUT-2026-00125'
  master_land_id uuid references master_lands(id) on delete cascade not null,
  source_deed_id uuid references land_documents(id),
  applicant_name text not null,
  prior_owner_name text not null,
  dag_number text not null,
  requested_area_decimals numeric(10,2) not null,
  auto_risk_score int default 0,
  auto_check_summary jsonb default '[]'::jsonb,
  status text check (status in ('AUTO_INITIATED', 'HEARING_REQUIRED', 'APPROVED', 'REJECTED')) default 'AUTO_INITIATED',
  dcr_number text,
  created_at timestamptz default now()
);

-- ============================================================================
-- SEED DATA: LND-MOCK-001 (Exact Test Case from Spec Pages 26-29)
-- ============================================================================
insert into master_lands (
  id, unique_land_id, district, upazila, mouza, jl_number,
  current_khatian_no, dag_number, total_area_decimals, latest_recorded_owner,
  khas_status, court_case_status, acquisition_status, is_finalized, qr_code_payload
) values (
  '11111111-1111-1111-1111-111111111111',
  'LND-MOCK-001',
  'Narsingdi (নরসিংদী)',
  'Shibpur (শিবপুর)',
  'Kaliganj (কালীগঞ্জ - কাল্পনিক)',
  '25',
  'RS-118',
  '207',
  20.00,
  'Abdul Karim (আবদুল করিম)',
  'UNAVAILABLE',
  'UNAVAILABLE',
  'UNAVAILABLE',
  true,
  '/verify/LND-MOCK-001'
) on conflict (unique_land_id) do nothing;

-- Doc 1: RS Khatian 118 (20 Decimals owned by Abdul Karim)
insert into land_documents (
  doc_code, master_land_id, category, sub_type, official_number, document_date,
  seller_or_prior_owner, buyer_or_current_owner, dag_number, khatian_ref,
  area_decimals, sub_registry_or_office, verification_status, extracted_json
) values (
  'DOC-KH-001', '11111111-1111-1111-1111-111111111111', 'KHATIAN', 'RS', 'RS-118', '2018-01-10',
  'CS-42 Reference', 'Abdul Karim (আবদুল করিম)', '207', 'RS-118',
  20.00, 'Settlement Press, Dhaka', 'VERIFIED',
  '{"survey": "RS", "khatian_no": "118", "dag_no": "207", "owner": "Abdul Karim", "area_decimals": 20, "land_class": "Viti"}'::jsonb
) on conflict (doc_code) do nothing;

-- Doc 2: Certified Porcha for RS-118
insert into land_documents (
  doc_code, master_land_id, category, sub_type, official_number, document_date,
  seller_or_prior_owner, buyer_or_current_owner, dag_number, khatian_ref,
  area_decimals, sub_registry_or_office, verification_status, extracted_json
) values (
  'DOC-PR-001', '11111111-1111-1111-1111-111111111111', 'PORCHA', 'CERTIFIED', 'PR-2020-118', '2020-03-15',
  'Abdul Karim (আবদুল করিম)', 'Abdul Karim (আবদুল করিম)', '207', 'RS-118',
  20.00, 'Narsingdi Record Room', 'VERIFIED',
  '{"porcha_type": "CERTIFIED", "khatian_ref": "RS-118", "dag_no": "207", "owner": "Abdul Karim", "area_decimals": 20}'::jsonb
) on conflict (doc_code) do nothing;

-- Doc 3: First Sale Deed 502/2021 (Abdul Karim -> Rahima Begum, 12 Decimals)
insert into land_documents (
  doc_code, master_land_id, category, sub_type, official_number, document_date,
  seller_or_prior_owner, buyer_or_current_owner, dag_number, khatian_ref,
  area_decimals, consideration_amount, sub_registry_or_office, verification_status, extracted_json
) values (
  'DOC-DEED-001', '11111111-1111-1111-1111-111111111111', 'DEED', 'SAF_KABALA', '502/2021', '2021-03-15',
  'Abdul Karim (আবদুল করিম)', 'Rahima Begum (রহিমা বেগম)', '207', 'RS-118',
  12.00, 500000.00, 'Shibpur Sub-Registry Office', 'VERIFIED',
  '{"deed_no": "502/2021", "seller": "Abdul Karim", "buyer": "Rahima Begum", "dag_no": "207", "area_decimals": 12, "portion_note": "Specific 12 decimals of Dag 207"}'::jsonb
) on conflict (doc_code) do nothing;

-- Doc 4: Second Sale Deed 889/2022 (INTENTIONAL CONFLICT: Abdul Karim -> Karim Uddin, 12 Decimals)
insert into land_documents (
  doc_code, master_land_id, category, sub_type, official_number, document_date,
  seller_or_prior_owner, buyer_or_current_owner, dag_number, khatian_ref,
  area_decimals, consideration_amount, sub_registry_or_office, verification_status, extracted_json
) values (
  'DOC-DEED-002', '11111111-1111-1111-1111-111111111111', 'DEED', 'SAF_KABALA', '889/2022', '2022-08-20',
  'Abdul Karim (আবদুল করিম)', 'Karim Uddin (করিম উদ্দিন)', '207', 'RS-118',
  12.00, 650000.00, 'Shibpur Sub-Registry Office', 'VERIFIED',
  '{"deed_no": "889/2022", "seller": "Abdul Karim", "buyer": "Karim Uddin", "dag_no": "207", "area_decimals": 12, "portion_note": "Overlapping 12 decimals of Dag 207"}'::jsonb
) on conflict (doc_code) do nothing;

-- Doc 5: Namjari Record in favor of Karim Uddin (Creates Deed-Mutation Conflict with Deed 502/2021)
insert into land_documents (
  doc_code, master_land_id, category, sub_type, official_number, document_date,
  seller_or_prior_owner, buyer_or_current_owner, dag_number, khatian_ref,
  area_decimals, sub_registry_or_office, verification_status, extracted_json
) values (
  'DOC-MUT-001', '11111111-1111-1111-1111-111111111111', 'MUTATION', 'PURCHASE', 'MUT-2022-991', '2022-10-05',
  'Abdul Karim (আবদুল করিম)', 'Karim Uddin (করিম উদ্দিন)', '207', 'RS-118',
  12.00, 'AC Land Office, Shibpur', 'VERIFIED',
  '{"mutation_case": "MUT-2022-991", "based_on_deed": "889/2022", "new_owner": "Karim Uddin", "area_decimals": 12}'::jsonb
) on conflict (doc_code) do nothing;

-- Seed P4 Smart e-Mutation Queue Case
insert into mutation_cases (
  case_number, master_land_id, applicant_name, prior_owner_name,
  dag_number, requested_area_decimals, auto_risk_score, status, auto_check_summary
) values (
  'MUT-2026-00125',
  '11111111-1111-1111-1111-111111111111',
  'Karim Uddin (করিম উদ্দিন)',
  'Abdul Karim (আবদুল করিম)',
  '207',
  12.00,
  85,
  'HEARING_REQUIRED',
  '[{"rule": "Double-Selling Overlap (+40)", "detail": "Total sold (12 + 12 = 24 decimals) exceeds RS-118 Khatian total (20 decimals). Prior Deed 502/2021 to Rahima Begum already transferred 12 decimals."}]'::jsonb
) on conflict (case_number) do nothing;

```

```

---

#### File 3: `TODO_16H_SPRINT.md` (Ultra-Brief Agent Checklist)

```markdown
# 16-Hour Vibe-Coding Sprint Checklist

Keep this file updated by marking `[x]` after completing each step. Never move to the next phase until the current phase compiles cleanly.

## Phase 1: Foundation & Database (Hours 0–2)
- [ ] Initialize Next.js 14 App Router + Tailwind + Shadcn UI (`card`, `tabs`, `badge`, `dialog`, `table`, `progress`, `alert`).
- [ ] Configure `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DEEPINFRA_API_KEY`).
- [ ] Execute `DATABASE_AND_SEED.md` in Supabase and verify `LND-MOCK-001` returns 5 documents.
- [ ] Build Top Navbar with Role Switcher (`Citizen View` ⇄ `Admin / AC Land Officer View`) and Language Toggle (`বাংলা` / `EN`).

## Phase 2: Shared Core Engines (Hours 2–5)
- [ ] Create `lib/deepinfra.ts`: OpenAI client pointing to `https://api.deepinfra.com/v1/openai` using `Qwen/Qwen2.5-VL-72B-Instruct` for document extraction and `deepseek-ai/DeepSeek-V3` for legal discrepancy summaries.
- [ ] Create `lib/pdf-to-image.ts`: Client-side utility using `pdfjs-dist` to convert Page 1 of any uploaded PDF into a Base64 PNG for DeepInfra Vision.
- [ ] Create `lib/verification-engine.ts`: Implement `analyzeMasterLand(uniqueLandId)` calculating the exact rule-based Risk Indicator (`40` double-sale + `25` ownership conflict + `20` deed-mutation mismatch + `15` timeline) and returning evidence document codes (`DOC-DEED-001`, `DOC-DEED-002`).

## Phase 3: P1 Admin Master Document, OCR & Audit Log (Hours 5–9)
- [ ] Build `/admin`: List of Master Lands + **"নতুন জমির নথি তৈরি (Create Master Land)"** modal.
- [ ] Build `/admin/land/[id]`: The 4-Category Grid (**খতিয়ান, পর্চা, দলিল, নামজারি**) with sub-type selector and **"+"** multi-PDF upload button.
- [ ] Build Split-Screen Verification Drawer: Left side shows uploaded PDF/Image preview; Right side shows AI-extracted fields with confidence badges.
- [ ] Wire **"সংশোধন সংরক্ষণ (Save Edit with Audit Log)"** and **"যাচাই সম্পন্ন (Mark Verified)"** buttons to write to `audit_logs` and generate the Master Document QR Code (`qrcode.react`).

## Phase 4: P4 Smart e-Mutation & P1 Ownership Timeline (Hours 9–12)
- [ ] Build `/admin/mutations` (P4): Display auto-triggered e-Mutation dossiers linked from Deed registrations, showing pre-audited Risk Score, conflict flags, and 1-Click DCR / Namjari approval.
- [ ] Build `/land/[id]/timeline` (P1 History): Chronological vertical timeline (`2018 RS Khatian` → `2021 Deed 502` → `2022 Deed 889 Conflict` → `2022 Namjari`) with **"মূল নথি দেখুন (View Source PDF)"** drawer on every card.

## Phase 5: P2, P3 & P5 Citizen Verification Suite (Hours 12–14)
- [ ] Build `/verify` (P5 "Verify Before You Buy" Hub): Search by Unique Land ID (`LND-MOCK-001`) or Scan QR Code (`html5-qrcode` + 1-click **"Simulate QR Scan"** button).
- [ ] Build P2 Tab (**"দলিল যাচাই / Verify a Document"**): Upload a PDF deed, extract fields via DeepInfra, compare field-by-field against `DOC-DEED-001` in DB, and render the 3-State Report:
  - `১. মিলেছে (Matched)`
  - `২. অমিল পাওয়া গেছে (Mismatch Found - e.g. 25 Decimals vs 12 Decimals)`
  - `৩. আরও যাচাই প্রয়োজন (Further Verification Required)`
- [ ] Build P3 & P5 Report Tab (**"Fraud & Pre-Purchase Report"**): Render the `0–100` Risk Indicator Gauge, triggered rules list, colliding deed comparison table (`DOC-DEED-001` vs `DOC-DEED-002`), and explicit `Not Checked / Data Unavailable` badges for Khas/Court/Acquisition status.

## Phase 6: Automated E2E Tests & Vercel Deployment (Hours 14–16)
- [ ] Run `npx playwright test` (`VALIDATION_TESTS.md`) and fix any failing assertions.
- [ ] Deploy to Vercel, test live URL, and record the 90-second demo video.

```

---

#### File 4: `VALIDATION_TESTS.md` (Automated Logic & UI Playwright Tests)

```markdown
# Strict Logic & UI Automated Validation Suite

Save this test file as `tests/bhumisetu.spec.ts` and run `npx playwright test` to validate all 5 problem tracks automatically.

```typescript
import { test, expect } from '@playwright/test';

test.describe('BhumiSetu E2E Hackathon Validation Suite', () => {

  test('P1 & P5: Search LND-MOCK-001 loads Master Document & 4 Categories', async ({ page }) => {
    await page.goto('http://localhost:3000/verify');
    await page.fill('[data-testid="land-search-input"]', 'LND-MOCK-001');
    await page.click('[data-testid="land-search-btn"]');

    await expect(page.locator('[data-testid="master-land-id"]')).toContainText('LND-MOCK-001');
    await expect(page.locator('[data-testid="recorded-area"]')).toContainText('20');
    await expect(page.locator('[data-testid="category-khatian"]')).toBeVisible();
    await expect(page.locator('[data-testid="category-porcha"]')).toBeVisible();
    await expect(page.locator('[data-testid="category-deed"]')).toBeVisible();
    await expect(page.locator('[data-testid="category-mutation"]')).toBeVisible();
  });

  test('P3 & P5: Shared Verification Engine catches 12+12 > 20 Double-Selling Conflict', async ({ page }) => {
    await page.goto('http://localhost:3000/verify/LND-MOCK-001');
    await page.click('[data-testid="run-fraud-detection-btn"]');

    // Risk score must be >= 60 (40 double sale + 20 deed-mutation mismatch)
    const scoreText = await page.locator('[data-testid="risk-indicator-score"]').innerText();
    const score = parseInt(scoreText, 10);
    expect(score).toBeGreaterThanOrEqual(60);

    // Must cite both conflicting deeds
    await expect(page.locator('[data-testid="evidence-panel"]')).toContainText('502/2021');
    await expect(page.locator('[data-testid="evidence-panel"]')).toContainText('889/2022');
    await expect(page.locator('[data-testid="evidence-panel"]')).toContainText('Rahima Begum');
    await expect(page.locator('[data-testid="evidence-panel"]')).toContainText('Karim Uddin');

    // Must explicitly show "Data Unavailable" for unchecked external government sources
    await expect(page.locator('[data-testid="external-checks-panel"]')).toContainText(/Data Unavailable|তথ্য অনুপস্থিত/i);
  });

  test('P1 Audit Log: Editing an extracted field records previous and new value', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/land/LND-MOCK-001');
    await page.click('[data-testid="review-doc-DOC-KH-001"]');
    await page.fill('[data-testid="edit-field-dag_number"]', '207-A');
    await page.fill('[data-testid="edit-reason-input"]', 'Matched with original RS scan');
    await page.click('[data-testid="save-audit-correction-btn"]');

    await expect(page.locator('[data-testid="audit-log-table"]')).toContainText('207');
    await expect(page.locator('[data-testid="audit-log-table"]')).toContainText('207-A');
    await expect(page.locator('[data-testid="audit-log-table"]')).toContainText('Matched with original RS scan');
  });

  test('P1 Ownership Timeline: Displays chronological events with source PDF links', async ({ page }) => {
    await page.goto('http://localhost:3000/verify/LND-MOCK-001/timeline');
    const events = page.locator('[data-testid="timeline-event-card"]');
    await expect(events).toHaveCount(4); // 2018 RS, 2021 Deed 502, 2022 Deed 889, 2022 Mutation
  });

  test('P4 Smart e-Mutation: Flags conflicting mutation case for AC Land hearing', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/mutations');
    await expect(page.locator('[data-testid="mutation-case-MUT-2026-00125"]')).toContainText('HEARING_REQUIRED');
  });
});

```

```

---

#### File 5: `WINNING_INNOVATIONS.md` (High-Impact Creative Differentiators)

```markdown
# Winning Factor Innovations (Post-Base Architecture)

Once Phases 1–5 are working, add these 4 lightweight, high-impact features (each takes < 30 minutes to implement) to set your project apart before the CSE and Law Department judges:

## 1. Visual "Share Quota" Depletion Bar (হিস্যা ও অংশ মিটার)
- **Concept**: Law and CSE judges want to *see* double-selling visually. On the Master Land Overview card, render a horizontal stacked progress bar representing the plot's `20.00 শতাংশ (100% Share)`:
  - Segment 1 (Green): `Deed 502/2021 (Rahima Begum) — 12 শতাংশ (60%)`
  - Segment 2 (Flashing Red Overflow): `Deed 889/2022 (Karim Uddin) — 12 শতাংশ (+60% -> 120% OVERFLOW!)`
- **Why It Wins**: Instantly communicates the mathematical impossibility (`24 > 20 decimals`) without reading a single paragraph.

## 2. Side-by-Side "Visual Diff" Highlighter for Fake Deeds (P2)
- **Concept**: When a citizen uploads a tampered PDF in P2 (e.g., where `১২ শতাংশ` was altered to `২৫ শতাংশ`), render a GitHub-style Side-by-Side Diff Table:
  - Left Column (`সরকারি সংরক্ষিত রেকর্ড / Verified DB Record`): `১২ শতাংশ` (Green badge)
  - Right Column (`আপলোড করা নথি / Uploaded PDF`): `২৫ শতাংশ` (Red strikethrough + `"অমিল / Tampering Suspected"` alert)
- **Why It Wins**: Directly satisfies P2 ("so fake or changed copies are caught at once") with crystal-clear visual evidence.

## 3. Bangla Voice "কেনার আগে যাচাই" Citizen Assistant (Web Speech API)
- **Concept**: Add a floating `"🎙️ বাংলায় প্রশ্ন করুন"` button on the P5 Buyer Report page using the browser's built-in `window.speechSynthesis` and `webkitSpeechRecognition` (zero external cost).
- **Behavior**: Clicking **"রিপোর্টটি পড়ে শোনান (Read Report Aloud in Bangla)"** speaks a natural Bangla summary of the P5 report:
  > *"সতর্কবার্তা: নমুনা মৌজার ২০৭ নম্বর দাগে মোট জমির পরিমাণ ২০ শতাংশ। কিন্তু ৫0২ এবং ৮৮৯ নম্বর দলিলে মোট ২৪ শতাংশ জমি বিক্রির রেকর্ড পাওয়া গেছে। জমিটি কেনার পূর্বে অবশ্যই সাব-রেজিস্ট্রি ও এসি ল্যান্ড অফিসে যাচাই করুন।"*
- **Why It Wins**: Shows inclusivity for rural Bangladeshi citizens with low digital literacy.

## 4. One-Click "Generate Legal Due-Diligence Dossier (PDF)" for Lawyers & Banks
- **Concept**: Add a `"Download Official Verification Report (PDF)"` button on P5 that prints a clean, QR-stamped 1-page Verification Certificate listing:
  - Checked Documents (`RS-118`, `Deed 502/2021`, `Deed 889/2022`, `MUT-2022-991`)
  - Risk Indicator Score (`65/100`)
  - Explicit Legal Disclaimer (*"This report is an indicative digital verification aid based on available records, not a judicial title declaration"*)
- **Why It Wins**: Directly targets Section 4 of the Rulebook (*"Banks & financial institutions, Courts & lawyers, Real estate developers"*).

```

---

### How to Run Your 16-Hour Session Starting Right Now

1. Create your project folder and drop these 5 `.md` files into the root directory.
2. Open Supabase, create a project, and paste the SQL block from `DATABASE_AND_SEED.md`.
3. Give your coding agent this single kickoff prompt:
> *"Read `AGENT_INSTRUCTIONS.md`, `DATABASE_AND_SEED.md`, `TODO_16H_SPRINT.md`, `VALIDATION_TESTS.md`, and `WINNING_INNOVATIONS.md`. Execute `TODO_16H_SPRINT.md` sequentially from Phase 1 to Phase 6 with zero mock implementations. Check off each item in `TODO_16H_SPRINT.md` as you complete it."*
