# BhumiSetu session handoff

## Current objective and completed outcome

User requested a competitive, functional LandTech 2026 Round 1 prototype using the supplied architecture/UX PDF and master brief, plus public GitHub and a live Cloudflare Workers deployment. The core system is implemented and live.

- Live: https://bhumisetu.adribmahmud.workers.dev
- Repository: https://github.com/AdribMahmud101/bhumisetu
- Supabase project: `bhumishetu`, ref `xbjlzsmkhyayogjigpaq`, linked locally.
- User explicitly accepted the current workers.dev address and requested no domain complexity. Do not rename the Worker or account subdomain.
- Design: modern Bangla-first Bangladesh government portal style, inspired by land.gov.bd; clearly a synthetic-data hackathon prototype, without claims of government affiliation.

## Implemented

Next.js 15.5.28 / React 18 / TypeScript / Tailwind / Bun. Upgraded from 14 to satisfy current Cloudflare OpenNext support. Supabase Postgres + private Storage + Auth, DeepInfra vision via the OpenAI SDK, PDF.js local worker, SHA-256, QR-linked citizen reports and browser-print dossier.

Citizen search, four document categories with multiple uploads per subtype, source-linked history, deterministic evidence report, 20-versus-24 quota overflow, exact-copy hashing and extracted field comparison all work. Officer login, draft creation, real PDF/image upload, actual AI extraction, source/extracted review, correction audit, verification, separate publication and mutation queue/decisions work. All service-role access stays server-side. Direct anonymous table reads fail. Drafts and unverified documents are private. Review changes invalidate publication. Mutation decisions verify current revision; conflicting cases cannot be approved. Audit edits store old/new values, actor and reason in the same transaction.

The canonical fictional fixture computes **60/100 = 40 sale conflict + 20 deed–mutation conflict**, not 65 or 85. Source PDFs, hashes and data are actually stored in Supabase. There are clean and incomplete/private fixtures as well. Live extraction browser tests create additional private synthetic parcels; those are real test records, not a simulated success.

## Configuration and credentials

User supplied a DeepInfra key; saved in ignored, permission-restricted `.env.local` and uploaded as a Cloudflare Worker secret. Do not repeat it in chat, documentation, logs or Git. Supabase credentials are also in `.env.local` and Worker secrets. Vision model: `Qwen/Qwen3-VL-30B-A3B-Instruct` (confirmed available and live-tested).

Prototype officer credentials: ignored `.local/officer.json`. Synthetic original PDFs and altered comparison sample: `.local/fixtures/`. Secret bulk deployment input: ignored `.local/worker-secrets.json`. Never commit these files. Supabase CLI and Wrangler account authentication work.

OpenAI SDK initially failed in Workers due to Node fetch; fixed with `openai/shims/web` and explicit global fetch. Model identifier numbers are normalized to strings before field validation. Both fixes are deployed and tested.

## Validation

- 11 Bun engine unit tests passed.
- Lint, TypeScript and production/OpenNext build passed.
- All **6 Playwright Firefox browser workflows passed against the live URL**: citizen search/evidence/history/source; unauthorized access; clean/mobile view; persisted audited correction + idempotent cases + blocked approval; real PDF upload/DeepInfra extraction; exact-hash match + altered PDF area mismatch (stored 12 vs uploaded 25).
- Screenshots: ignored `.local/record-desktop.png` and `.local/record-mobile.png`.
- Database migrations applied and registered in Supabase migration history.

Run `bun run test:unit`, `bun run lint`, `bun run typecheck`, `bun run build`. Live browser suite: `TEST_BASE_URL=https://bhumisetu.adribmahmud.workers.dev bun run test:e2e`. It calls DeepInfra and writes synthetic review records. Deploy: `bun run deploy`.

## Scope and remaining human deliverables

Primary competition problem is P3 (rulebook says choose one), with digitization, integrity checks, citizen reports and mutation review supporting it. All data is fictional; no government scraping/integration. Court/khas/acquisition coverage remains explicitly unavailable. Scores are indicators, not fraud probabilities; printed reports and decisions are not official certificates/orders.

Limits: 5 MB per upload; PDFs up to 3 pages; DOCX up to 40,000 text characters and 3 embedded PNG/JPEG images; handwriting accuracy not established; camera QR scanning and voice deferred; the interface now supports full Bangla/English switching. QR links work. Auth sessions last one hour; sign in again after expiry. Complex legal ownership/partition/inheritance/dag mapping is outside the implemented prototype.

User still needs the team/mentor details, ≤3-page concept PDF, ≤90-second recording and final platform submission. `docs/DEMO_SCRIPT.md` provides the timed script. `TODO.md`, `BUILD_PLAN.md` and README document actual status and setup. Architecture reference is `architecture_&_ui_ux.pdf`; actual master file is `master_instructions.md` (`master_prompt.md` is absent).

## Citizen and officer access update

User requested separate citizen Login, Registration, and Administrative entries plus one-click judge access. Implemented and deployed `/login` (citizen), `/register` (citizen sign-up), and `/admin/login` (officer). Both login pages offer one-click demo and normal email/password login. Dedicated confirmed Supabase demo users carry server-controlled `app_metadata.role` and `demo`; credentials are only in ignored `.local/demo-accounts.json`, `.env.local`, and Worker secrets. `scripts/setup-demo.ts` provisions them. Citizen self-registration accepts name/email/password and never grants officer privileges. Supabase registration is enabled and email confirmation remains required; email delivery depends on the project's provider settings.

Seven live regression workflows passed: citizen/officer one-click access, citizen/officer normal password access, registration validation and blocked officer self-registration, anonymous access restrictions, and existing audited correction/idempotent mutation/blocked approval. Lint/typecheck and Cloudflare production build passed. Mobile registration screenshot checked in `.local/registration-mobile.png`. Shared officer demo access is intentionally public for judges working with fictional data only. Do not put demo passwords in browser code or Git.

Email-confirmation redirects now use the live Workers site; localhost login remains an allowed development redirect. Only those two auth URL properties were updated, and email confirmation remains enabled.


## Bangla / English localization update

Implemented and deployed persistent bn/en switching across the interface, including auth, navigation, citizen evidence/history/document reports, officer forms/dialogs, status labels, known validation/server errors and print layouts. `src/i18n/bn.json` and `en.json` hold 371 reviewed messages. `core.ts` provides typed keys/interpolation/known-message aliases and Intl date formatting; `provider.tsx` holds the shared React context and switch. No external translation service/dependency or DOM text rewriting is used. The `bs-locale` cookie is read in the root server layout (default bn) and updated immediately on switch; HTML lang stays correct on reload/navigation. Root routes render dynamically to respect the locale cookie.

Names, official IDs, numeric evidence, uploaded source files, user inputs and audit reasons are not translated or mutated. Known engine signals retain their original IDs/points/evidence; `evidence.ts` renders localized explanations using those references. Mutation API responses now include already-loaded source documents for the officer explanation. Unknown provider/source text remains original rather than being guessed. Both create and review dialogs have their own language control, preserving open form state.

Validation: 17 unit tests passed; `bun run i18n:check` verifies complete catalogs, matching placeholders, valid aliases and no untranslated JSX copy. Lint/typecheck and the Cloudflare production build passed. All **15 live Playwright browser workflows passed** in 48.6 seconds, including language persistence/server HTML, preserved form values/localized errors, English desktop/mobile/print reports, officer dialog switching, all previous authentication flows and actual DeepInfra extraction/document comparison. Screenshots: `.local/report-en-desktop.png` and `.local/report-en-mobile.png`. Live URL remains unchanged.

## Upload-first digitization update

User approved replacing mandatory manual parcel creation with upload-first intake. Implemented `CreateLandDialog`: choose category/subtype, save original privately, run actual vision extraction, confirm parcel metadata with source/reason, then open Documents for existing pending review. Manual parcel-first entry remains optional. New shared catalog messages cover both languages; changing locale preserves entered values. JL and khatian identifiers may remain empty when unavailable; mandatory district/upazila/mouza/dag/positive baseline area require officer confirmation.

Applied migration `20261017000400_document_intake.sql` to linked Supabase. `document_intakes` is service-role-only, owner-scoped via authenticated server routes. Confirmation RPC locks the intake, creates master+pending document atomically, retains original/extraction metadata, audits parcel corrections, and returns the same IDs on repeat confirmation. Neither verification nor publication happens automatically. AI never substitutes a deed/mutation transfer area for baseline entitlement. Retry/manual continuation retain the stored original; the browser session remembers an unfinished intake. Polling resumes running extraction; a two-minute stale lock can recover after a terminated worker.

Reference distinction: this is an internal digitization draft, not the official mutation draft khatian. Official application and subsequent verification/proposal guidance: https://mutation.land.gov.bd/nirdeshika and https://mutation.land.gov.bd/namjari-steps.

Local validation: 20 unit tests, typecheck, lint, 389-message catalog check, and 6 targeted Firefox workflows passed, including real PDF/DeepInfra extraction, private pending draft, idempotent confirmation, correction audit, source access, invalid extraction/manual continuation and locale preservation. Final live deployment/regression status recorded below.

Final outcome: deployed to the existing Worker (version `87ec859e-54f6-4c96-b08f-1911d2bb985b`). All **17 live Firefox workflows passed** in 1.1 minutes, including real intake extraction, citizen/other-officer intake access rejection, idempotent confirmation, audit and existing auth/verification/comparison regressions. Production/OpenNext build passed. No credentials are committed.

Deed subtype update: added `OTHER` to the shared DEED type list. Existing bn/en catalogs render it as অন্যান্য / Other. The intake and existing-document upload selectors and server validation all use this same list.

Extraction robustness fix: an uploaded deed returned `based_on_deed: false`, causing strict schema rejection. Model boolean values now become null (unknown) for document and parcel fields before validation; valid extracted fields and actual reference strings remain intact. Objects/other malformed values still fail validation. The model prompt explicitly defines references as strings/null, never yes/no flags. Regression tests cover this exact failure and retained valid data.

The real `demo assets/saf_kabla.jpg` live test also exposed unsupported model date formats. Extraction now normalizes Bangla digits in ISO dates and leaves unsupported/ambiguous/impossible dates null instead of guessing or rejecting otherwise valid extraction. Strict manual review validation is unchanged. Added date regression coverage (23 unit tests pass).

## Saved intake recovery / state update

User reported the old empty form still appearing after the parser deployment. The original failed intake was restored from session storage; deployment alone does not re-extract its stored source. The API now flags legacy schema-failed intakes for one automatic retry on reopening, recording the current parser version on completed/failed attempts to avoid retry loops. The dialog shows progress/failure/completion explicitly, refreshes status on focus, displays extracted document fields, hides parcel confirmation until extraction completes or manual entry is selected, and offers a fresh upload without deleting stored originals. Officer edits survive status refresh; older responses cannot replace newer results. Transient network failures do not clear the saved intake pointer.

Local validation for recovery: typecheck/lint clean, 392 bn/en catalog entries validated, 23 unit tests pass, 6 upload/language browser checks pass. A dedicated recovery browser test simulates the legacy failure response and then uses the real stored PDF and AI extraction; automatic retry, visible extracted fields, preserved officer edit and fresh-upload reset passed.

Recovery fix deployed (Worker version `cf58d4d7-dd1a-4bfe-be78-edd8fdf8ba48`). All 3 targeted live browser workflows passed: resumed legacy failure with real extraction, regular upload/confirmation, and failure/manual continuation. Existing user files in `demo assets/` remain untracked and untouched.

## Explicit intake abort

Added a sticky full-width `Abort / বাতিল করুন` action to the intake dialog. It closes the dialog and clears the current browser draft selection/form. In-flight upload responses are ignored after abort, preventing an abandoned draft from being restored. Existing stored originals remain private; abort does not delete sources or publish a parcel. Abort is temporarily disabled while final confirmation is committing. The X close action retains its previous resume behavior.

Typecheck, lint and 393-message localization check passed. Dedicated browser check passed for mobile button visibility, manual-form reset, abort during an artificially delayed upload, no restored session selection after late completion, and Bangla label.

Abort update deployed (Worker version `65b216f8-91dc-48df-af62-2aea9fa7b168`). Live browser check passed, including abort remaining enabled after a rejected save, mobile visibility, reset, late-upload handling and bilingual label.

Manual-mode navigation update: added `← নথি আপলোডে ফিরে যান / ← Back to document upload` above the manual parcel form when no source has been uploaded. Switching back clears stale validation errors and preserves typed parcel values and category/subtype state, so returning to manual entry restores the input. Existing upload-abort browser workflow now checks this round trip.

Manual-mode back action deployed (Worker version `e9ffcc83-c770-4040-b694-ffbe455f4d63`); live browser workflow passed for manual → upload → manual with preserved field input, plus existing abort checks. Typecheck, production build/lint and 394-message catalog check passed.

## DOCX support

Added `fflate` and `fast-xml-parser` for DOCX handling. Shared `document-types.ts`, `document-upload.ts` and `docx.ts` validate real package contents and canonical MIME, preserving original bytes/hash in both intake and existing-document upload. DOCX text includes Bangla/English split runs, tables, headers/footers and notes; deleted revision text is skipped. Embedded PNG/JPEG images are resized in the browser and passed to the existing vision pipeline. Source review lazy-loads a safe text/image preview (React text, no HTML execution); original download remains available. Copy-comparison accepts DOCX too.

Limits: 5 MB original; 40,000 extracted text characters, 3 referenced image sources; declared ZIP expansion limited to 20 MB, 512 entries and 5 MB per entry. No silent DOCX text/image truncation. Reject malformed packages, empty content, traversal/duplicate paths, entity declarations, macros/active objects, external images and unsupported image formats. DOC/DOCM are explicitly unsupported; encrypted documents must be resaved. Client parsers are loaded only when DOCX is selected.

Applied migration `20261018000100_docx_storage.sql` to the existing private storage bucket. Updated all upload accept filters, visible limits and bn/en errors (407 catalog entries). 30 unit tests pass, typecheck/lint/catalog checks pass. Three local Firefox workflows passed, with real AI for text-only and image-only DOCX, exact original bytes/MIME, private pending draft and source preview, and server rejection of malformed files. Final deployed regression recorded below.

Final DOCX outcome: deployed to the existing Worker (version `e3970645-e079-4bea-ad15-50414e67d244`). All **22 live Firefox workflows passed** in 1.7 minutes, including real text/image-only DOCX extraction, private original MIME/byte preservation, safe preview, malformed-file rejection and existing PDF/auth/i18n/recovery/abort/evidence/comparison workflows. All 30 unit tests passed; production build/typecheck/lint and 407-message catalog check passed.

## User-provided porcha DOCX validation

Tested `demo assets/০২_পর্চা_নমুনা.docx` (37,541 bytes) through the deployed officer upload-first UI, category PORCHA / GENERAL. Independent Python ZIP/XML inspection found 32 text nodes and confirmed every nonempty source text node was retained by our parser (716 text characters; no embedded images).

Initial extraction exposed an issue-date mapping error: AI put the porcha issue date in execution_date instead of document_date. Clarified field meanings in the model prompt and enforced execution_date=null for non-DEED categories. Added a regression test; all 31 unit tests passed and production build/lint/typecheck passed. Deployed Worker version `4422c95e-e1ec-4af5-9bb0-8252f89851ff`.

Reran the exact sample through the live UI and validated: document identity নথি-পর্চা-০০১, owner আবদুল করিম, khatian আরএস-১১৮, dag 207, area/baseline 20 decimals, district নরসিংদী, upazila শিবপুর, mouza কালীগঞ্জ (কাল্পনিক পরীক্ষামূলক মৌজা), JL নমুনা-জেএল-০১৭, issue date 2020-02-12, execution_date null. Bangla confirmation fields populated correctly. Original download bytes, SHA-256 and canonical DOCX MIME matched. The test remains a private, unconfirmed intake; no record was published. JSON evidence `.local/porcha-validation.json`, screenshot `.local/porcha-intake-validated.png`, and script `.local/validate-porcha.ts` are ignored. User demo assets remain untracked.
