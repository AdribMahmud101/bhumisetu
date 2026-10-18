---
name: landtech-docs
description: "Automated generator for LandTech 2026 3-page Concept Notes, audit-compliant READMEs, and pitch deck outlines."
---

# LandTech 2026 documentation

Use this skill for one of three modes: `concept-note`, `readme`, or `pitch-deck`. Treat the repository's `landtech_hackathon_rulebook.pdf` (Rule Book v1.2) as the authority. Inspect the current implementation, data fixtures, and team information before making factual claims. Mark missing facts as `TODO` for the team; never invent names, results, integrations, or compliance evidence.

## Shared rulebook checks

- Name exactly one selected problem, P1–P6, as the primary submission problem. Explain other implemented features as support for that problem.
- Attribute borrowed code, open-source tools, and public data. Keep the document consistent with the code the students can explain.
- Use made-up data or organizer-provided samples only. Do not use real names, NID numbers, phone numbers, or land records; do not scrape or bulk-download government websites. An organizer-approved fully anonymized document is a stated exception in the rulebook, and must be disclosed accurately rather than described as dummy data.
- Disclose every AI assistant actually used. Check repository records and ask for missing team/tool details when needed; do not claim a tool was not used without evidence.

## `concept-note`

Produce PDF-ready Markdown that renders to **at most three A4 pages**. Include these sections, compressing prose or figures as needed:

1. **Selected Problem (P1–P6)** and why it matters in Bangladesh. Explain relevant CS/SA/RS/BS Khatian lineage, mutation, and sub-registry discrepancies where they relate to the selected problem.
2. **Solution Architecture** with actual components, data flow, security/trust boundaries, and tech stack.
3. **Core Features** and an honest prototype status for each.
4. **Nationwide Scalability Plan** covering ingestion, interoperability, access control, operations, and phased rollout without implying live government integration.
5. **Team Details** with exactly two DIU student members (one team leader) and two mentors (one faculty, one industry). Use explicit placeholders until names/roles are supplied.

Check the rendered PDF page count before calling it final. The rulebook requires submission as a PDF of up to three pages.

## `readme`

Create or update the repository's GitHub `README.md`. Include project purpose and selected problem, implemented capabilities, prerequisites, exact **Setup / Quickstart** commands, environment-variable names without secrets, test commands, data sources, and demo instructions. If the project changes after Round 1, list those changes.

Include a section titled **Data Compliance & Dummy Data**. After inspecting code, fixtures, and documentation, state whether the project used zero government-site scraping and zero real NID, phone, or land-record data. If that cannot be verified, say what remains unverified and resolve it before publishing an unconditional disclaimer. Include a section titled **AI Tools Disclosed** listing all AI assistants actually used and their roles; do not fabricate a complete list.

## `pitch-deck`

Produce an outline for **exactly 10 slides**, suitable for a PDF of at most 10 slides. Cover the problem, Bangladesh context, user journey, live demo, architecture, evidence of function, trust/data safeguards, national scale, impact, and team/closing. Keep a five-minute student-led pitch and three-minute Q&A in mind. Distinguish working features from roadmap claims and leave room for both students to present.
