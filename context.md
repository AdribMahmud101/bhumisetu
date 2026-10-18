# BhumiSetu — project context and handoff

Updated: 18 October 2026 (Asia/Dhaka). This file is the working source of truth for the project's purpose, current implementation, evidence, limitations and next steps. Keep it current when meaningful work lands. Never put secret values, passwords, private user data or demo-account credentials here.

## The goal

**Win Round 1 of the LandTech hackathon with a clear, credible, working prototype.** The product should feel immediately understandable to judges, show a complete useful workflow, and be honest about what it can and cannot verify. The user's stated priority is winning; architecture and feature choices should serve the demo and the problem rather than add complexity for its own sake.

The selected competition problem is **P3 — Catch Fraud & Double-Selling**. The coherent product promise is:

> BhumiSetu connects fragmented land documents and explains conflicts before a buyer pays or an officer approves a mutation.

The other capabilities—digitizing documents (P1), comparing copies (P2), mutation review (P4), and citizen reporting (P5)—support this central story. The prototype does not claim that every hackathon problem is its primary focus.

## The human story and emotion

Land is more than a plot number in Bangladesh. It can represent a family's savings, a home, inheritance, security and years of trust. Yet evidence is spread across old khatians, porchas, deeds and mutation records. A buyer may not know that another sale already exists; a conscientious officer may have to reconcile mismatched paper records under pressure; families can face fear, delay, expense and conflict when records disagree.

BhumiSetu's emotional promise is **less uncertainty and more informed trust**. It gives citizens a readable, source-linked explanation, and gives officers a careful workflow that preserves the original document, surfaces missing evidence, records corrections and leaves the decision with a human. It should feel reassuring and respectful, not sensational or accusatory.

The core line for the pitch is:

> **AI reads. Rules explain. Officers decide.**

Do not call a person a fraudster, call a parcel safe, or present an indicator as legal truth. A conflict is a reason to investigate, not proof of wrongdoing. Missing records mean unknown, not clear. This distinction is part of the product's trust story and should be visible in the demo.

## What judges should understand in the first minute

Use the fictional parcel `LND-MOCK-001`: it has 20 decimals recorded, but two competing deeds each transfer 12 decimals, making 24 claimed decimals against 20. A related mutation references the later deed. BhumiSetu shows the source documents and a deterministic **60/100 review indicator**: 40 for excess/overlapping sale evidence and 20 for the deed–mutation conflict. It explains the evidence and routes the case for human review. It is not a probability of fraud or a government decision.

Then show one officer correction against a real stored source, the persisted old/new audit values and reason, and the same source-linked evidence in the citizen report. Keep the canonical fixture restored at 60/100 after rehearsal. All names, records and files are synthetic.

## Current state

- The live Supabase application data was reset at the user's request: no lands, documents, audit rows, mutation cases, intake drafts or private document files remain. Officer/citizen accounts and schema remain. Earlier descriptions of the canonical fixtures and their live validation are historical; the demo fixtures must be recreated before using the scripted demo.
- Live prototype: https://bhumisetu.adribmahmud.workers.dev (current Worker version `bca4c33c-28fd-4266-99fa-c216c1e0a68e`)
- Public repository: https://github.com/AdribMahmud101/bhumisetu
- Recent feature commits: `1ac722d` (OCR/category fields), `d7917b9` (land management/trash), and `4e8666d` (extraction speed/document management). They and the intake-form change `2ccd21c` are included in the Worker deployment below.
- Stack: Next.js 15.5.28 App Router, React 18, TypeScript, Tailwind, Bun; Cloudflare Workers through OpenNext; Supabase Auth, Postgres and private Storage; DeepInfra vision through the OpenAI SDK; PDF.js for PDF text/rendering; `fflate` and `fast-xml-parser` for DOCX; Zod validation; Playwright Firefox and Bun tests.
- Supabase project is linked locally as `bhumishetu` (ref `xbjlzsmkhyayogjigpaq`). The spelling difference between the product name BhumiSetu and project slug is intentional.
- Preserve the current Workers address and account subdomain. The user explicitly chose to keep it simple and accepted the available address; do not rename or add a custom domain without a new request.
- Visual direction: polished Bangladesh government-portal style inspired by land.gov.bd, Bangla-first, modern and restrained. This is an independent hackathon prototype, not a government website or endorsed service.

## Product capabilities implemented

### Citizens

- The `/verify` citizen entry page is search-led: it no longer displays a grid of land records or fetches the land list. Citizens can enter a land ID or upload a PNG/JPG/WebP image of the QR code printed on a BhumiSetu record. The QR image is read locally in the browser; only a same-origin BhumiSetu `/verify/LND-…` URL or a bare land ID is accepted. The list API now requires an officer session, while an individual published record remains reachable by its ID or QR link. Live Firefox validation confirmed no card grid, anonymous list access denied (401), image upload from the record's own QR reaching `LND-MOCK-001`, a 60/100 indicator, and manual ID search. The canonical synthetic `LND-MOCK-001` and `LND-CLEAN-002` fixtures had been moved to Trash and unpublished; both were restored and republished after confirming all their documents were verified. Their live scores are 60 and 0 respectively.
- Search and open published fictional land records.
- Read the deterministic evidence report, source-linked history, document comparisons, quota/area conflict, coverage gaps and next steps.
- Open a QR-linked public record and print a bilingual evidence dossier.
- See missing court, khas and acquisition checks explicitly marked unavailable.
- Use the interface in Bangla or English; locale persists through navigation/reload. Entered form data, identifiers and source evidence are not translated.
- Exact SHA-256 copy comparison can confirm that a file matches an enrolled copy. A matching hash does not establish that the enrolled record is legally authentic.

### Officers

- Dedicated `/admin/login` with normal email/password and a frictionless one-click demo account. Citizens also have `/login`, `/register` and a separate one-click demo. Public citizen registration never grants officer privileges; server routes verify roles.
- Create a record by uploading first, or choose manual parcel entry. Intake stores the source privately before parcel metadata is complete; supports retry, manual continuation, session resume, abort and returning from manual entry to upload.
- Upload PDF, DOCX, JPG or PNG under bounded limits. DOCX text/tables/headers and embedded PNG/JPEG scans are handled; the original package is validated and retained. Unsupported DOC/DOCM, active content, malformed packages and oversized input are rejected.
- Run actual DeepInfra multimodal extraction. AI output and missing values are shown for officer confirmation, not silently accepted as official fact.
- Relevant structured document fields (including missing values) are editable on intake and source-review screens for Khatian, Porcha, Deed and Mutation. The editor now shows a fixed set per category and a unit selector beside area. Normal review corrections preserve original extraction and record previous/new values, actor and reason transactionally.
- Intake confirmation creates a draft/private land record and pending document atomically and idempotently. Document verification and public publication are separate explicit steps. Changing reviewed source data invalidates the reviewed/published state where applicable.
- Mutation queue supports review and decisions. Verification cannot create duplicate cases; unresolved conflicts and stale parcel revisions block unsafe approval server-side.
- Officer workspace now includes land search and status filters, parcel metadata editing, soft delete to Trash, restore, and permanent purge/empty Trash controls. The source/document area includes interactive category previews, category/subtype editing, and a removal confirmation dialog. Document removal archives the row, hides it from active lists/analysis, retains its source and audit, and returns the parcel to draft. Land-level permanent purge remains a separate path with the limitation described below.
- The officer dashboard land-card grid now shows only two rows initially: six cards on desktop and two on mobile. A bilingual See more/Show fewer control reveals the remaining matching records; search and status filters still search all records and reset the view to two rows. Deployed in Worker version `26f48637-48c4-4f04-b36c-4072ae587092`. Live Firefox verification showed 6 of 74 cards initially, 74 expanded, 6 collapsed, a hidden record found via search, and 2 cards on mobile and under the draft filter. This is distinct from the per-land document-row control below.
- The stored-document list now starts with two visible rows and a localized See more/Show less control when additional documents exist. Pending reviews appear first, then newer records; a changed document count collapses the list again so newly uploaded drafts remain visible without crowding the page. All records remain available through expansion and category previews. Deployed in Worker version `a0e17d44-c117-469b-b4d9-c981112fd900`; a live Firefox check on five-document `LND-MOCK-001` showed 2 rows initially, 5 expanded and 2 after collapse, with the Bangla remaining count visible.
- New-record intake no longer asks an officer to type a separate source/reason. The original is linked to the intake and the server supplies a standard reason for confirmation audits; later review and decisions still have their own reason controls where required.
- Land area displays can show the document's original unit (decimal/শতাংশ, acre, bigha, katha or chhatak) beside a normalized decimal amount. The rule engine still uses decimals for comparisons.

### OCR and extraction

- Images, PDF page renders and embedded DOCX images use a common browser preprocessing path: orientation-aware decoding, bounded resolution (currently targeting a maximum long edge of about 1800 pixels), restrained contrast/brightness, mild luminance sharpening, and small-angle deskew only when projection alignment improves. Enhancement is automatically enabled for new-record intake; the earlier intake checkbox was removed. Intake can re-extract and preview the model input. Original source bytes and hashes remain intact.
- The visible extraction editor now uses a fixed set of relevant fields for each document category, informed by [docs/Fixed_field_for_extract.pdf](docs/Fixed_field_for_extract.pdf). Area has a unit selector. Irrelevant category fields are hidden and constrained during extraction. Earlier wording about showing all ten fields in every category is obsolete.
- Officer OCR/review date fields display and accept `DD/MM/YYYY` (including Bangla digits) while retaining validated ISO `YYYY-MM-DD` values internally for the API, database, and rule engine. Invalid dates cannot be silently converted.
- Native PDF/DOCX text is retained and preferred over AI transcription as extraction evidence. The newer prompt skips transcription when native text is present; for scanned images it asks for a short supporting excerpt (up to 300 characters). Its response budget is 800 tokens with native text or 1500 for scans, down from 3500. A recent commit describes a 40-second to roughly 4-second extraction improvement, but this handoff has no independently reproduced timing or distribution.
- Conservative checks separate current khatian from form/previous numbers, prefer a labelled deed number to an internal file ID, normalize dates against visible source evidence, strip father/address suffixes from personal names, distinguish share from land area, and derive decimal equivalents for a single explicit unit quantity. Parcel baseline is inferred only from Khatian/Porcha, never a deed or mutation transfer. When evidence is ambiguous, officers still need to review it.
- Model JSON parsing repairs literal control characters inside valid quoted strings but does not complete truncated/incomplete model output. Invalid output remains an extraction failure, not a fabricated success.
- The configured production model remains `Qwen/Qwen3-VL-30B-A3B-Instruct`. DeepSeek V4.1 Flash 1017 and GLM 5.3 Flash are available as multimodal candidates through DeepInfra, but they have not yet been compared against our Bangla land-record examples. General vision benchmarks do not establish which is more accurate on these records.

## Architecture and trust boundaries

```text
Citizen browser ─┐
                 ├─ Next.js / Cloudflare Worker server routes ─┬─ Supabase Postgres
Officer browser ─┘                                             ├─ Supabase private Storage
                                                               └─ DeepInfra vision API

Stored reviewed evidence ─ deterministic TypeScript rules ─ evidence report
                                                         ├─ citizen view / print / QR
                                                         └─ officer mutation review
```

- The server owns privileged Supabase and DeepInfra calls. Service-role/API secrets are held in ignored local environment files and Cloudflare Worker secrets; never expose, echo, document, or commit them.
- Supabase RLS is enabled; private documents and intakes are accessed through authorized server paths. Public views expose published data only. Officer identity/role is checked server-side, not inferred from UI state.
- Postgres transactions/RPCs handle intake confirmation, correction audit and mutation consistency. `confirm_document_intake_review` retains original AI extraction, applies officer edits through audited review, and is idempotent. Separate verification and publication are the designed review path; the newer direct land-edit endpoint can also set `is_finalized`, so publication safeguards on that path need review before making a stronger blanket claim.
- The risk/evidence engine is deterministic TypeScript. AI extracts candidate fields; it does not calculate the conflict score or make legal decisions.
- Normal field corrections retain old/new values and reasons in audit records. Document removal now writes a removal audit and retains earlier audit rows. The separate land-level permanent purge path still attempts to delete related audit rows despite the application's delete restriction, so an unqualified claim of permanent-purge reliability or immutable history across all paths remains inappropriate.
- Original files stay in private storage. An authorized officer may view source through a short-lived signed URL. QR links lead to the published report and cannot grant access to private sources.

## Data and rule behavior

Four document categories: KHATIAN, PORCHA, DEED and MUTATION. Multiple documents per subtype are allowed. Extracted values are nullable; unknown values stay unknown. Each category has an explicit visible field set. The extraction payload now includes an area unit and normalized decimal amount, while the parcel's comparison baseline remains in decimals. Document removal archives its record and retains source identity, extraction evidence, original storage path/hash and correction history. A partial unique index permits re-uploading identical bytes after the earlier entry is archived.

The core indicator is built from versioned, deduplicated signals. The canonical fixture is **40 excess/overlapping sale + 20 deed–mutation conflict = 60/100**. Ownership-history and timeline rules can add their documented signals when evidence supports them. The score is capped at 100. Missing checks reduce coverage and require further verification; they do not add a false clearance. Same-parcel linkage requires context, not a dag number alone. Khatian/Porcha baseline entitlement is not added twice. Deed transfer amounts are not treated as total parcel entitlement.

Mutation and publication decisions remain human actions. The most recent named party in a record is not automatically declared legal owner. A QR/printed report is an indicative prototype dossier, not a certificate, order or DCR.

## Validation actually completed

- The 27-workflow/40-test evidence below belongs to the implementation through `f96460f`; the complete suite was not rerun after the three newer feature commits. The intake textarea removal passed TypeScript and a focused Firefox browser flow that confirmed a record and checked its audit without the textarea. A production OpenNext build passed, and Worker version `152d2eae-c9d9-45eb-b497-563fbd21c8d4` deployed the code through `2ccd21c` to the existing URL.
- 40 Bun unit tests passed after the final JSON parser change.
- Typecheck, lint, OpenNext production build and 421-message localization catalog check passed for the final implementation.
- 27 live Firefox workflows passed after the extraction/grounding, OCR preprocessing and editable-field changes. The final control-character parser patch was followed by build/unit checks and the real supplied Porcha retest; the whole 27-workflow suite was not rerun after that parser-only change.
- On `demo assets/khotian.jpg`, the updated pipeline matched all seven manually checked fields both with and without preprocessing: current khatian 105, dag 207, area 15 decimals from 0.15 acre, district নরসিংদী, upazila নমুনা উপজেলা, mouza নমুনা মৌজা and JL 25. Dates remained null. Preprocessing by itself, before field-mapping changes, matched only 3/7 in both modes. This is one sample and does not prove general OCR accuracy or an enhancement-only gain.
- The supplied `demo assets/০২_পর্চা_নমুনা.docx` (37,541 bytes; 32 text nodes) passed real live extraction after the final parser fix: official number নথি-পর্চা-০০১, owner আবদুল করিম, dag 207, khatian আরএস-১১৮, area 20 decimals, expected district/upazila/mouza/JL, issue date 2020-02-12 and absent execution date null. The exact original remained a private unconfirmed intake; no publication occurred.
- Document-removal repair, 18 October: the old delete handler removed Storage before a prohibited audit-row delete, leaving an active row with a missing source. Added migrations `20261018000400_document_archive.sql` and `20261018000500_active_document_hash.sql` to archive inside one database transaction, retain sources/audits, hide archived documents from active analysis and permit re-upload of the same bytes. Both migrations are applied. The orphaned Porcha entry on `LND-D7EB49CBC273` was archived; its 14 audit entries remain, but its original file had already been lost by the prior handler. The other two original sources still load. A focused local upload/review/removal browser flow passed, plus typecheck and 474-message catalog validation. Worker version `bfe1cfaf-6852-4ae4-b0c4-6a2409f693e8` is deployed; live API verification showed two active documents, the archived row absent, an existing preview HTTP 200 and the removed source endpoint HTTP 404. The parcel is draft pending a fresh publication decision.
- The newer `d7917b9` commit added seven files from `demo assets/` and `docs/Fixed_field_for_extract.pdf` to the repository. These are sample/reference files, not credentials. `.local/`, environment files and validation artifacts remain private/ignored; do not add secrets to Git.

## Known limitations and honest claims

- Synthetic records only. No real landowner dataset, government API, portal scraping, NID or phone records are used.
- No guarantee of OCR accuracy. Bangla handwriting, blur, skew/perspective, faint marks, multi-column layouts, missing pages and ambiguous historical formats still require officer comparison with the original. Source transcription can also be wrong.
- The latest OCR speed claim and new field/unit behavior need a measured regression on representative scans and native-text files; earlier 7/7 Khatian and Porcha results predate these optimizations.
- Land-level permanent purge still uses separate database/storage calls and attempts audit deletion; verify its intended retention policy and repair its transaction/error behavior before relying on it. Direct editing of a land's published status should be reviewed against the normal verification/publication workflow.
- No comprehensive cadastral map, authoritative title adjudication, inheritance/partition resolution, or verified court/khas/acquisition data. Such checks remain unavailable in the report.
- The indicator is not a fraud probability, title certificate, legal advice, government decision or automatic rejection. Hash equality proves byte identity with an enrolled source only.
- Limits: 5 MB per original, PDF up to 3 pages; DOCX up to 40,000 extracted text characters, 3 embedded PNG/JPEG image sources, with package expansion and entry limits. Re-save `.doc`/`.docm` and encrypted files as supported formats.
- Camera scanning and voice assistance are deferred. Live government-system integration is out of scope for this hackathon prototype.

## Competition submission goal and remaining work

The current feature code is pushed and deployed. Verify the new officer land/document flows and OCR changes end to end before claiming full regression coverage; check the `20261018000300_land_trash.sql` migration before using Trash on a newly provisioned database. The remaining external competition deliverables are:

1. Record and review a truthful demo video of at most 90 seconds.
2. Prepare a concept PDF of at most three pages.
3. Add actual team/mentor details and submit through the official platform.

The timed demo sequence is in [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md). Use the focused conflict story, then one officer correction/audit and the citizen evidence view. Rehearse restoring the canonical fixture and do not display passwords, keys, session tokens or developer tools. The user's team details are not in the repository, so do not invent them.

Potential next technical improvement, only if time allows: make a small, controlled A/B comparison of current Qwen, DeepSeek V4.1 Flash 1017 and GLM 5.3 Flash on identical original scan inputs. Score field-level exactness (Bangla names, identifiers, labels, area/unit, dates), unsupported invented values, valid structured response, and latency. Keep officer review mandatory. Do not switch the live model based only on a vendor benchmark.

## Useful files and commands

- [README.md](README.md): user-facing project overview, setup, routes, limitations and AI disclosure.
- [TODO.md](TODO.md): implementation tracker and completion evidence.
- [BUILD_PLAN.md](BUILD_PLAN.md): original architecture decisions, rules and demo pitch (some early planning sections are historical; this context and the current source code describe the actual implemented stack).
- [architecture_&_ui_ux.pdf](architecture_%26_ui_ux.pdf): supplied product/architecture reference.
- [master_instructions.md](master_instructions.md): supplied master brief. A file named `master_prompt.md` was not present.
- [Hackathon_Overview.md](Hackathon_Overview.md) and `landtech_hackathon_rulebook.pdf`: competition overview and rules reviewed during planning.
- `.env.local`, `.local/`, `test-results/`: private/local material; do not commit. `demo assets/` is now tracked in Git as sample material; inspect any future addition before committing it.

```bash
bun run dev
bun run lint
bun run typecheck
bun run test:unit
bun run i18n:check
bun run build
TEST_BASE_URL=https://bhumisetu.adribmahmud.workers.dev bun run test:e2e
bun run deploy
```

Live Playwright tests write synthetic records and call the actual extraction provider; use the configured test setup and restore the canonical fixture after demonstrations. Deploy only from this linked project after the relevant checks pass.
