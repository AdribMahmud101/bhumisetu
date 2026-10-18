# BhumiSetu · ভূমিসেতু

> **AI-Powered Land Record Verification & Fraud Prevention Platform**  
> *Built for LandTech Hackathon 2026*  
> **Live Deployment:** [https://bhumisetu.adribmahmud.workers.dev](https://bhumisetu.adribmahmud.workers.dev)

---

## 🌟 Overview

In Bangladesh, land record management has historically suffered from fragmented paper documents, physical deed tampering, and a lack of real-time communication between Sub-Registry offices (under the Ministry of Law) and AC Land offices (under the Ministry of Land). This structural disconnect enables dishonest actors to sell the same plot of land to multiple unsuspecting buyers or alter handwritten records without immediate detection.

**BhumiSetu (ভূমিসেতু)** is a bilingual, cloud-edge land governance platform designed to restore transparency and trust in property transactions. It bridges the gap between citizens and land administrators through automated document digitization, multi-modal deed verification, and graph-based fraud detection.

---

## 🎯 Challenges Solved

BhumiSetu directly addresses four critical challenges outlined in the LandTech 2026 framework:

### 1. P1: Legacy Record Digitization & Intake
* **Intelligent Intake:** Converts physical or scanned Khatians (CS, SA, RS, BS), Certified Porchas, Sale Deeds (সাফ-কবলা), and Mutation orders into structured, searchable digital data.
* **Bengali Vision OCR:** Utilizes advanced vision models to extract complex Bengali script, conjunct characters (যুক্তাক্ষর), and dates.
* **Dynamic Land Unit Normalization:** Automatically recognizes and converts varied regional land units (একর, বিঘা, কাঠা, শতাংশ/শতক, ছটাক) into standardized decimal values.
* **Human-in-the-Loop Corrections:** Allows land officers to review and manually edit extracted values before immutable database commit, logging every change to an audit trail.

### 2. P2: Deed & Ownership Verification
* **Multi-Modal Verification:** Citizens can verify deeds through **QR code scanning** (live camera or uploaded image file) or by uploading **smartphone photos / PDFs** of physical deeds.
* **Side-by-Side Comparison Matrix:** Extracts deed attributes (Deed No, Execution Date, Seller, Buyer, Dag No, Land Area) and cross-checks them line-by-line against official government database records.
* **Instant Tamper Detection:** Flagging discrepancies (e.g., an altered document claiming 25 decimals when the official archive records only 15 decimals) as an immediate **Critical Mismatch**.
* **Cryptographic Integrity (SHA-256):** Every official archive record is anchored with an immutable SHA-256 fingerprint to verify file integrity.

### 3. P3: Fraud & Double-Selling Detection
* **Timeline Reconciliation:** Constructs a chronological ownership graph for each Dag (plot), tallying cumulative sold decimals across historical deeds against the baseline parcel area.
* **Double-Selling Alerts:** Automatically catches instances where an owner has sold the same parcel of land to more than one buyer.
* **Mutation-Deed Conflict Tracking:** Identifies unauthorized mutations where a mutation case references a conflicting or non-existent deed.

### 4. P5: Pre-Purchase Verification for Citizens
* **Actionable Risk Score (0–100):** Evaluates ownership anomalies and assigns a clear, transparent risk indicator (Low Risk, Elevated, High Risk).
* **Clear Legal Guardrails:** Generates an actionable buyer checklist highlighting missing lineage, unverified court litigation, and recommended Sub-Registry Balam book searches before investing money.

---

## ⚙️ How the Mechanism Works

The core innovation of BhumiSetu is its deterministic evidence pipeline, designed to operate in four straightforward steps:

```
[Citizen Document / QR]
          │
          ▼
1. Preprocess & Fingerprint ──► Image deskew, contrast boost & SHA-256 hashing
          │
          ▼
2. Vision Extraction        ──► Direct structured JSON parsing of names, dates, plots & areas
          │
          ▼
3. Cross-Field Comparison   ──► Side-by-side verification against official database records
          │
          ▼
4. Timeline & Area Math     ──► Entitlement graph checks for oversold plots & double-selling
          │
          ▼
[0–100 Risk Verdict & Report]
```

1. **Preprocess & Fingerprint:** Uploaded document images are enhanced in the browser (deskewed, contrast-adjusted, dynamically resized) and hashed with SHA-256 for cryptographic tamper-evidence.
2. **Vision Extraction:** Our serverless vision pipeline extracts primary entities (parties, plot numbers, dates, land area) directly into structured JSON.
3. **Cross-Field Match:** The deed number or QR code queries the official master record, feeding attributes into a strict comparison matrix to expose altered fields.
4. **Timeline & Area Math:** The evidence engine links all historical Khatians, Deeds, and Mutations on that Dag into a timeline, tallying every decimal sold against the original land balance to catch oversold plots or duplicate sales.

---

## 🔬 Research, Design & Development Journey

Developing a domain-specific land verification engine required navigating Bangladesh's multi-layered land laws and complex administrative workflows. We leveraged modern AI tooling throughout our R&D and implementation phases:

### Domain R&D with Google Gemini & NotebookLM
* **Synthesizing Complex Land Regulations:** We used **NotebookLM** and **Gemini** to analyze and synthesize Bangladesh land operations—including the *State Acquisition and Tenancy Act 1950*, *Transfer of Property Act 1882*, and official Ministry of Land mutation manuals (*নামজারি নির্দেশিকা*).
* **Mapping Information Asymmetry:** R&D sessions helped model the exact fault lines between Sub-Registry office registrations and AC Land mutation workflows, allowing us to formalize deterministic rules for double-selling and title-chain breaks.
* **Bengali Numeral & Unit Mapping:** Documenting edge cases in fractional land arithmetic (আনা-গণ্ডা-কড়া-ক্রান্তি vs modern shotangsho/acre units) to guarantee mathematical precision.

### Prototyping & UI/UX with OpenAI Codex
* **Rapid Prototyping:** **Codex** assisted in scaffolding our full-stack architecture, writing TypeScript domain contracts, and generating comprehensive synthetic test fixtures.
* **Citizen-Centric UI/UX:** Designed an intuitive, high-contrast, bilingual interface accessible to non-technical citizens and land officers alike, ensuring critical verification verdicts are instantly legible.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Next.js 15.5 (App Router), React 18, TypeScript, Tailwind CSS, Lucide Icons |
| **Edge Runtime** | Cloudflare Workers via OpenNext (Node.js compatibility mode) |
| **Database & Auth** | Supabase (PostgreSQL with Row-Level Security, HttpOnly Auth sessions) |
| **Storage & Security** | Private Supabase Storage buckets, client-side SHA-256 cryptographic hashing |
| **AI Vision & OCR** | DeepInfra Vision (Qwen-VL) with local canvas preprocessing |
| **QR Code Engine** | `html5-qrcode` (supports live camera scanning and client-side image file decoding) |
| **Testing & Quality** | Bun Test runner (78 unit tests), Playwright for End-to-End browser tests |

---

## 🚀 Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (v20.9.0 or higher)
* [Bun](https://bun.sh/) (v1.2.0 or higher)
* [Supabase CLI](https://supabase.com/docs/guides/cli)

### Installation & Local Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/AdribMahmud101/bhumisetu.git
   cd land_tech_hackathon
   ```

2. **Install dependencies:**
   ```bash
   bun install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   Fill in your Supabase project credentials and DeepInfra API key in `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   DEEPINFRA_API_KEY=your-deepinfra-api-key
   DEEPINFRA_VISION_MODEL=Qwen/Qwen3-VL-30B-A3B-Instruct
   ```

4. **Seed sample data:**
   ```bash
   bun run seed
   ```

5. **Start local development server:**
   ```bash
   bun run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Validation

Our codebase is backed by a comprehensive unit and acceptance test suite verifying mathematical accuracy, i18n key parity, and fraud detection logic:

```bash
# Run TypeScript typechecks
bun run typecheck

# Run unit and acceptance tests (78 passing tests)
bun test tests/unit

# Run End-to-End browser tests
bun run test:e2e
```

### Key Verified Acceptance Cases:
* **Test Case 1:** Area Mismatch (Stored 12/15 decimals vs Altered 25 decimals deed).
* **Test Case 2:** Double-Selling Alert (12 decimals sold twice to Rahima Begum & Karim Uddin).
* **Test Case 3:** Unregistered Mutation Conflict Detection.
* **Test Case 4:** Dynamic Land Unit Normalization (Acre, Bigha, Katha to Shotangsho).
* **Test Case 5:** Bilingual i18n key set equality and Bengali numeral formatting.

---

## 🌐 Live Deployment to Cloudflare Workers

BhumiSetu is built to deploy globally on Cloudflare Workers edge nodes for minimal latency:

```bash
# Build with OpenNext and deploy
bun run deploy
```

Live Demo: [https://bhumisetu.adribmahmud.workers.dev](https://bhumisetu.adribmahmud.workers.dev)

---

## 📁 Submission Materials & Demonstration

* **Live Platform:** [https://bhumisetu.adribmahmud.workers.dev](https://bhumisetu.adribmahmud.workers.dev)
* **3-Page Concept Note (PDF):** [`docs/BhumiSetu_LandTech2026_Concept_Note.pdf`](docs/BhumiSetu_LandTech2026_Concept_Note.pdf) (Markdown draft: [`docs/CONCEPT_NOTE.md`](docs/CONCEPT_NOTE.md))
* **90-Second Narrated Video:** [`videos/bhumisetu-demo/renders/BhumiSetu_90s_Bangla_Priya.mp4`](videos/bhumisetu-demo/renders/BhumiSetu_90s_Bangla_Priya.mp4) (Script: [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) / [`videos/bhumisetu-demo/SCRIPT.md`](videos/bhumisetu-demo/SCRIPT.md))

---

## 👥 Demo Access

For judges and reviewers exploring the live prototype:
* **Citizen Portal:** `/login` (One-click demo citizen login available, or explore public verification at `/verify/deed`).
* **Land Officer Workspace:** `/admin/login` (One-click demo officer login to test document intake and digitization).

---

## ⚖️ Ethical Considerations & Legal Disclaimer

* **Synthetic Data:** All demonstration names, land records, NID numbers, and deed files used in this prototype are entirely fictional and generated for hackathon benchmarking. No real citizen data is utilized.
* **Decision Support, Not Legal Title:** BhumiSetu is an administrative decision-support and civic verification tool. Verification scores and mismatch alerts highlight potential risks and discrepancies to guide formal investigation; they do not constitute a legal court decree or definitive title guarantee.

---

## 📜 License

Developed for the **LandTech Hackathon 2026**. Open source under the MIT License.
