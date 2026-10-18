# BhumiSetu | ভূমিসেতু
### LandTech 2026 concept note · **P1 · P2 · P3 · P5**

**BhumiSetu connects four land workflows:** digitizing records (P1), verifying deeds (P2), detecting conflicting transactions (P3), and helping citizens check before buying (P5).

**The human idea:** A buyer should see a conflict in the records before it becomes a conflict between families. BhumiSetu turns scattered papers into reviewed digital evidence, explains contradictions in plain language, and leaves the decision with an officer.

## 1. The problem in Bangladesh

For many families, a plot is their largest savings. Yet the evidence for one parcel can be spread across CS, SA, RS and BS khatians, porchas, registered deeds and later mutation (namjari) entries. A deed recorded at a sub-registry office and a mutation record can describe different parties or areas; older and newer survey identifiers may also need careful reconciliation. Someone checking only one paper can miss another transfer of the same land. The [Ministry of Land's e-Mutation process](https://mutation.land.gov.bd/namjari-steps) routes mismatched details for officer review, which is the right place for our evidence alerts.

One broken link in that chain can hide a second sale or create uncertainty for an honest buyer. A warning is evidence for review, not a finding of fraud or a declaration of legal title.

## 2. Four problems addressed in one working system

| Challenge | What BhumiSetu already does |
|---|---|
| **P1 · Digitize old records** | Officers upload Khatian, Porcha, Deed and Mutation PDFs, DOCX files or images. Text/vision extraction proposes searchable fields; officers inspect the original and edit the result before verification. |
| **P2 · Verify deeds & ownership evidence** | A deed image, document or QR payload is checked against a reviewed record. Field-by-field comparisons show matched, mismatched or inconclusive results; enrolled originals also have SHA-256 copy hashes. |
| **P3 · Catch fraud & double-selling** | Versioned rules flag overlapping or excess sales, ownership-chain gaps, deed–mutation conflicts and suspicious dates, with the source documents behind each alert. |
| **P5 · Check before buying** | A citizen enters a land ID or QR link to see the published parcel's recorded parties, area, history and evidence report in Bangla or English, then print a dossier. |

## 3. One parcel, two users, one evidence trail

An officer uploads the source papers, reviews AI-suggested fields, records corrections with reasons and publishes verified evidence. A buyer searches the parcel or scans its QR; the same reviewed data powers a readable conflict report and deed comparison. The officer sees the underlying documents and rule trace before deciding a related mutation case.

**Illustrative synthetic case:** A parcel has 20 decimals recorded, while two deeds from the same seller claim 12 decimals each. BhumiSetu shows the 24-versus-20 discrepancy and both deeds before a buyer pays or an officer approves a mutation.

<div class="page-break"></div>

## 4. Solution architecture and tech stack

The architecture diagram is included in the PDF and available as `docs/concept-note-architecture.html`.

| Layer | Current implementation |
|---|---|
| Citizen and officer interface | Next.js 15 App Router, React 18, TypeScript, Tailwind; Bangla/English catalogues; land-ID and QR journeys |
| Application and deployment | Next.js server routes packaged by OpenNext for Cloudflare Workers; server-side role checks and protected API actions |
| Records and access | Supabase Auth, PostgreSQL, row-level security, private Supabase Storage; original file hash and audited edits |
| Document understanding | PDF.js, DOCX parser, image preparation, DeepInfra-hosted Qwen vision model; officer reviews every extracted field |
| Verification | Versioned TypeScript rules and deed field comparison; evidence-linked reports and mutation review |

**Human control is part of the architecture.** AI proposes document fields; deterministic rules produce the conflict indicator. Officers compare extraction with the source, verify documents and decide mutation cases. Original files stay private; published citizen views use reviewed data.

## 5. Why the four parts fit together

**P1 creates the reviewed evidence; P2 checks a presented deed against it; P3 finds contradictions across records; P5 gives the buyer an understandable view of the result.** These are linked product journeys, not four disconnected demos. Corrections preserve old/new values and reasons in an officer audit trail, while the server blocks approval of unresolved conflict cases.

<div class="page-break"></div>

## 6. From prototype to nationwide use

**Phase 1 — district pilot.** Start with a controlled, synthetic-to-authorized-data transition in one district. Define a parcel matching key using district, upazila, mouza, JL, dag, khatian and survey type; map CS/SA/RS/BS changes without collapsing distinct historical identifiers. Have officers validate ambiguous matches and measure extraction corrections, alert precision and time saved.

**Phase 2 — interoperable exchange.** With government authorization, connect registry, land-record and mutation workflows through documented import/API contracts. Preserve each source's issuing office, document date, version and hash. Route conflicting updates to a review queue instead of silently replacing one record with another.

**Phase 3 — national operations.** Scale ingestion in batches by district, monitor processing and audit events, and use role-scoped access so only authorized officers can alter reviewed data. Continue human review for disputed ownership and publish only the minimum citizen-facing evidence needed for informed checking.

## 7. Why this matters

BhumiSetu turns a pile of papers into a question a person can act on: **“Do these records agree about this parcel?”** A buyer gets a timely reason to pause; an officer gets the documents and rule trace needed to investigate. The prototype demonstrates all four connected challenges with invented records and original sample files, without government-site scraping or real citizen data.

**Live prototype:** https://bhumisetu.adribmahmud.workers.dev  
**Code and reproducibility:** https://github.com/AdribMahmud101/bhumisetu

## 8. Team (four required members)

| Role | Name / affiliation |
|---|---|
| Student 1 · Team Leader (DIU) | **[TEAM LEADER NAME / ID]** |
| Student 2 (DIU) | **[STUDENT NAME / ID]** |
| Faculty Mentor | **[FACULTY MENTOR NAME / DEPARTMENT]** |
| Industry Mentor | **[INDUSTRY MENTOR NAME / ORGANIZATION]** |

*Team details are placeholders until confirmed by the applicants.*

**Land context:** [Ministry of Land e-Mutation steps](https://mutation.land.gov.bd/namjari-steps) · [Ministry of Land portal](https://www.land.gov.bd/)
