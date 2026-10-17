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

- Live prototype: https://bhumisetu.adribmahmud.workers.dev
- Public repository: https://github.com/AdribMahmud101/bhumisetu
- Current main commit: `f96460f` — `Enhance OCR inputs and audit editable extraction fields`.
- Stack: Next.js 15.5.28 App Router, React 18, TypeScript, Tailwind, Bun; Cloudflare Workers through OpenNext; Supabase Auth, Postgres and private Storage; DeepInfra vision through the OpenAI SDK; PDF.js for PDF text/rendering; `fflate` and `fast-xml-parser` for DOCX; Zod validation; Playwright Firefox and Bun tests.
- Supabase project is linked locally as `bhumishetu` (ref `xbjlzsmkhyayogjigpaq`). The spelling difference between the product name BhumiSetu and project slug is intentional.
- Preserve the current Workers address and account subdomain. The user explicitly chose to keep it simple and accepted the available address; do not rename or add a custom domain without a new request.
- Visual direction: polished Bangladesh government-portal style inspired by land.gov.bd, Bangla-first, modern and restrained. This is an independent hackathon prototype, not a government website or endorsed service.

## Product capabilities implemented

### Citizens

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
- All ten structured document fields (including empty fields) are editable on intake and source-review screens for Khatian, Porcha, Deed and Mutation. Corrections preserve original extraction and record previous/new values, actor and reason transactionally.
- Intake confirmation creates a draft/private land record and pending document atomically and idempotently. Document verification and public publication are separate explicit steps. Changing reviewed source data invalidates the reviewed/published state where applicable.
- Mutation queue supports review and decisions. Verification cannot create duplicate cases; unresolved conflicts and stale parcel revisions block unsafe approval server-side.

### OCR and extraction

- Images, PDF page renders and embedded DOCX images use a common browser preprocessing path: orientation-aware decoding, bounded resolution, restrained contrast/brightness, mild luminance sharpening, and small-angle deskew only when projection alignment improves.
- Enhancement can be toggled. Intake supports re-extraction and shows a preview of the images sent to the model. Original source bytes and hashes remain intact.
- Native PDF/DOCX text is retained and preferred over AI transcription as extraction evidence. Prompting requests a literal transcription before field mapping. Conservative rules map current khatian separately from form/previous numbers, normalize one explicit area quantity for Khatian/Porcha, suppress dates unsupported by the available source year, and avoid applying deed transfer area as parcel entitlement.
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
- Postgres transactions/RPCs handle intake confirmation, correction audit and mutation consistency. `confirm_document_intake_review` retains original AI extraction, applies officer edits through audited review, and is idempotent. Separate verification and publication prevent AI output from becoming public automatically.
- The risk/evidence engine is deterministic TypeScript. AI extracts candidate fields; it does not calculate the conflict score or make legal decisions.
- Audits are append-only for application roles. This is not a claim that a privileged database administrator cannot alter the database.
- Original files stay in private storage. An authorized officer may view source through a short-lived signed URL. QR links lead to the published report and cannot grant access to private sources.

## Data and rule behavior

Four document categories: KHATIAN, PORCHA, DEED and MUTATION. Multiple documents per subtype are allowed. Extracted values are nullable; unknown values stay unknown. Preserve source identity, dates, parties, area/share, parcel context, extraction evidence, original storage path/hash, review state and correction history.

The core indicator is built from versioned, deduplicated signals. The canonical fixture is **40 excess/overlapping sale + 20 deed–mutation conflict = 60/100**. Ownership-history and timeline rules can add their documented signals when evidence supports them. The score is capped at 100. Missing checks reduce coverage and require further verification; they do not add a false clearance. Same-parcel linkage requires context, not a dag number alone. Khatian/Porcha baseline entitlement is not added twice. Deed transfer amounts are not treated as total parcel entitlement.

Mutation and publication decisions remain human actions. The most recent named party in a record is not automatically declared legal owner. A QR/printed report is an indicative prototype dossier, not a certificate, order or DCR.

## Validation actually completed

- Latest production Worker deployed at the URL above; code is pushed to GitHub main at `f96460f`.
- 40 Bun unit tests passed after the final JSON parser change.
- Typecheck, lint, OpenNext production build and 421-message localization catalog check passed for the final implementation.
- 27 live Firefox workflows passed after the extraction/grounding, OCR preprocessing and editable-field changes. The final control-character parser patch was followed by build/unit checks and the real supplied Porcha retest; the whole 27-workflow suite was not rerun after that parser-only change.
- On `demo assets/khotian.jpg`, the updated pipeline matched all seven manually checked fields both with and without preprocessing: current khatian 105, dag 207, area 15 decimals from 0.15 acre, district নরসিংদী, upazila নমুনা উপজেলা, mouza নমুনা মৌজা and JL 25. Dates remained null. Preprocessing by itself, before field-mapping changes, matched only 3/7 in both modes. This is one sample and does not prove general OCR accuracy or an enhancement-only gain.
- The supplied `demo assets/০২_পর্চা_নমুনা.docx` (37,541 bytes; 32 text nodes) passed real live extraction after the final parser fix: official number নথি-পর্চা-০০১, owner আবদুল করিম, dag 207, khatian আরএস-১১৮, area 20 decimals, expected district/upazila/mouza/JL, issue date 2020-02-12 and absent execution date null. The exact original remained a private unconfirmed intake; no publication occurred.
- These source assets and validation artifacts are local ignored/untracked data. Do not add `demo assets/` or `.local/` to Git.

## Known limitations and honest claims

- Synthetic records only. No real landowner dataset, government API, portal scraping, NID or phone records are used.
- No guarantee of OCR accuracy. Bangla handwriting, blur, skew/perspective, faint marks, multi-column layouts, missing pages and ambiguous historical formats still require officer comparison with the original. Source transcription can also be wrong.
- No comprehensive cadastral map, authoritative title adjudication, inheritance/partition resolution, or verified court/khas/acquisition data. Such checks remain unavailable in the report.
- The indicator is not a fraud probability, title certificate, legal advice, government decision or automatic rejection. Hash equality proves byte identity with an enrolled source only.
- Limits: 5 MB per original, PDF up to 3 pages; DOCX up to 40,000 extracted text characters, 3 embedded PNG/JPEG image sources, with package expansion and entry limits. Re-save `.doc`/`.docm` and encrypted files as supported formats.
- Camera scanning and voice assistance are deferred. Live government-system integration is out of scope for this hackathon prototype.

## Competition submission goal and remaining work

The application/repository/live deployment are ready. The remaining external competition deliverables are:

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
- `.env.local`, `.local/`, `demo assets/`, `test-results/`: private/local material; do not commit.

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
