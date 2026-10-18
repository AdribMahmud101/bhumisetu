import { Land, LandDocument, normalize } from "./domain";

export type P2VerificationOutcome = "matched" | "mismatch" | "inconclusive";

export interface ExtractedDeedFields {
  deedNumber?: string | null;
  deedDate?: string | null;
  sellerName?: string | null;
  buyerName?: string | null;
  mouza?: string | null;
  khatianNumber?: string | null;
  dagNumber?: string | null;
  landAreaDecimals?: number | null;
  qrPayload?: string | null;
}

export interface FieldComparisonItem {
  fieldName: string;
  fieldLabelBn: string;
  fieldLabelEn: string;
  storedValue: string | number | null;
  uploadedValue: string | number | null;
  isMatch: boolean;
  severity: "none" | "critical" | "warning";
}

export interface DeedVerificationResult {
  outcome: P2VerificationOutcome;
  headlineMessageBn: string;
  headlineMessageEn: string;
  deedId: string | null;
  masterLandId: string | null;
  fieldsComparison: FieldComparisonItem[];
  crossChecks: {
    khatianMatch: boolean | "unavailable";
    porchaMatch: boolean | "unavailable";
    namjariMatch: boolean | "unavailable";
  };
  discrepanciesCount: number;
  nextStepsBn: string[];
  nextStepsEn: string[];
}

export function parseQrDeedPayload(qr: string): {
  deedNumber?: string;
  masterLandId?: string;
} {
  const trimmed = qr.trim();
  if (!trimmed) return {};

  // Try URL parse if it's a URL
  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      const url = new URL(trimmed);
      const pathname = url.pathname;
      const parts = pathname.split("/").filter(Boolean);
      // e.g. /verify/LND-001 or /p3/land/LND-001 or query ?deed=502/2021
      const deedParam = url.searchParams.get("deed") || url.searchParams.get("doc");
      if (deedParam) return { deedNumber: deedParam };
      if (parts.length >= 2 && (parts[0] === "verify" || parts[0] === "land" || parts[0] === "p3")) {
        return { masterLandId: parts[1] };
      }
    }
  } catch {
    // Not a valid URL, treat as raw string
  }

  // Try JSON
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const obj = JSON.parse(trimmed);
      return {
        deedNumber: obj.deedNumber || obj.official_number || obj.deed_no,
        masterLandId: obj.masterLandId || obj.land_id || obj.unique_land_id,
      };
    } catch {
      // ignore json parse error
    }
  }

  // Raw ID or deed number
  if (/^LND-/i.test(trimmed) || /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(trimmed)) {
    return { masterLandId: trimmed };
  }

  return { deedNumber: trimmed };
}

export function compareDeedWithRecord(
  extracted: ExtractedDeedFields,
  storedDocuments: LandDocument[],
  masterLand?: Land | null,
): DeedVerificationResult {
  const qrResolved = extracted.qrPayload ? parseQrDeedPayload(extracted.qrPayload) : {};
  const targetDeedNo = extracted.deedNumber || qrResolved.deedNumber;

  // 1. Locate matching stored deed
  const deeds = storedDocuments.filter(
    (d) => d.category === "DEED" && d.verification_status === "VERIFIED",
  );

  let matchedDeed: LandDocument | undefined;

  if (targetDeedNo) {
    matchedDeed = deeds.find(
      (d) => normalize(d.official_number) === normalize(targetDeedNo),
    );
  }

  // If not matched by deed number and dagNumber was extracted, try matching by dag and area or seller
  if (!matchedDeed && extracted.dagNumber) {
    const dagMatches = deeds.filter(
      (d) => normalize(d.dag_number) === normalize(extracted.dagNumber),
    );
    if (dagMatches.length === 1) {
      matchedDeed = dagMatches[0];
    } else if (dagMatches.length > 1 && extracted.sellerName) {
      matchedDeed = dagMatches.find(
        (d) => normalize(d.seller_or_prior_owner) === normalize(extracted.sellerName),
      );
    }
  }

  // If still no deed found, check if deed list is empty or target deed cannot be resolved
  if (!matchedDeed) {
    return {
      outcome: "inconclusive",
      headlineMessageBn:
        "দলিলের সত্যতা নিশ্চিত করা যায়নি। সংশ্লিষ্ট কর্তৃপক্ষের মাধ্যমে আরও যাচাই করুন।",
      headlineMessageEn:
        "No corresponding record found or document scan was insufficient for a decisive match.",
      deedId: null,
      masterLandId: masterLand?.unique_land_id || masterLand?.id || null,
      fieldsComparison: [
        {
          fieldName: "deedNumber",
          fieldLabelBn: "দলিল নম্বর",
          fieldLabelEn: "Deed No",
          storedValue: null,
          uploadedValue: targetDeedNo || null,
          isMatch: false,
          severity: "critical",
        },
      ],
      crossChecks: {
        khatianMatch: "unavailable",
        porchaMatch: "unavailable",
        namjariMatch: "unavailable",
      },
      discrepanciesCount: 1,
      nextStepsBn: [
        "সাব-রেজিস্ট্রি অফিসে মূল দলিলের বালাম বই তল্লাশি দিন।",
        "দলিল নম্বর ও সাল সঠিক আছে কি না পুনরায় নিশ্চিত করুন।",
        "সহকারী কমিশনার (ভূমি) অফিস থেকে খতিয়ান ও দাগ নম্বর যাচাই করুন।",
      ],
      nextStepsEn: [
        "Search the original deed in the Sub-Registry Balam book.",
        "Verify that the deed number and registration year are entered correctly.",
        "Confirm Khatian and Dag details at the local AC Land office.",
      ],
    };
  }

  // 2. Field-by-Field Cross-Matching
  const comparisons: FieldComparisonItem[] = [];

  // 1) Deed Number (Critical)
  const storedDeedNo = matchedDeed.official_number;
  const uploadedDeedNo = extracted.deedNumber || targetDeedNo || null;
  const isDeedNoMatch =
    !!uploadedDeedNo &&
    normalize(storedDeedNo) === normalize(uploadedDeedNo);

  comparisons.push({
    fieldName: "deedNumber",
    fieldLabelBn: "দলিল নম্বর",
    fieldLabelEn: "Deed No",
    storedValue: storedDeedNo,
    uploadedValue: uploadedDeedNo,
    isMatch: isDeedNoMatch,
    severity: isDeedNoMatch ? "none" : "critical",
  });

  // 2) Land Area (Critical - numerical with 0.01 tolerance)
  const storedArea = matchedDeed.area_decimals != null ? Number(matchedDeed.area_decimals) : null;
  const uploadedArea = extracted.landAreaDecimals != null ? Number(extracted.landAreaDecimals) : null;
  const isAreaMatch =
    storedArea != null &&
    uploadedArea != null &&
    Math.abs(storedArea - uploadedArea) <= 0.01;

  comparisons.push({
    fieldName: "landAreaDecimals",
    fieldLabelBn: "জমির পরিমাণ (শতক)",
    fieldLabelEn: "Land Area (Decimals)",
    storedValue: storedArea != null ? storedArea : null,
    uploadedValue: uploadedArea != null ? uploadedArea : null,
    isMatch: isAreaMatch,
    severity: isAreaMatch ? "none" : "critical",
  });

  // 3) Seller Name (Critical)
  const storedSeller = matchedDeed.seller_or_prior_owner;
  const uploadedSeller = extracted.sellerName || null;
  const isSellerMatch =
    !!uploadedSeller &&
    !!storedSeller &&
    normalize(storedSeller) === normalize(uploadedSeller);

  comparisons.push({
    fieldName: "sellerName",
    fieldLabelBn: "বিক্রেতার নাম",
    fieldLabelEn: "Seller Name",
    storedValue: storedSeller,
    uploadedValue: uploadedSeller,
    isMatch: isSellerMatch,
    severity: isSellerMatch ? "none" : "critical",
  });

  // 4) Buyer Name (Critical)
  const storedBuyer = matchedDeed.buyer_or_current_owner;
  const uploadedBuyer = extracted.buyerName || null;
  const isBuyerMatch =
    !!uploadedBuyer &&
    !!storedBuyer &&
    normalize(storedBuyer) === normalize(uploadedBuyer);

  comparisons.push({
    fieldName: "buyerName",
    fieldLabelBn: "ক্রেতার নাম",
    fieldLabelEn: "Buyer Name",
    storedValue: storedBuyer,
    uploadedValue: uploadedBuyer,
    isMatch: isBuyerMatch,
    severity: isBuyerMatch ? "none" : "critical",
  });

  // 5) Dag Number (Critical)
  const storedDag = matchedDeed.dag_number;
  const uploadedDag = extracted.dagNumber || null;
  const isDagMatch =
    !!uploadedDag &&
    !!storedDag &&
    normalize(storedDag) === normalize(uploadedDag);

  comparisons.push({
    fieldName: "dagNumber",
    fieldLabelBn: "দাগ নম্বর",
    fieldLabelEn: "Dag No",
    storedValue: storedDag,
    uploadedValue: uploadedDag,
    isMatch: isDagMatch,
    severity: isDagMatch ? "none" : "critical",
  });

  // 6) Deed Date (Warning/Critical)
  const storedDate = matchedDeed.document_date;
  const uploadedDate = extracted.deedDate || null;
  const isDateMatch =
    !!uploadedDate &&
    !!storedDate &&
    normalize(storedDate) === normalize(uploadedDate);

  comparisons.push({
    fieldName: "deedDate",
    fieldLabelBn: "দলিলের তারিখ",
    fieldLabelEn: "Deed Date",
    storedValue: storedDate,
    uploadedValue: uploadedDate,
    isMatch: isDateMatch,
    severity: isDateMatch ? "none" : "warning",
  });

  // 3. Cross-Check with Secondary Records (Khatian / Porcha / Namjari)
  const khatians = storedDocuments.filter((d) => d.category === "KHATIAN");
  const porchas = storedDocuments.filter((d) => d.category === "PORCHA");
  const mutations = storedDocuments.filter((d) => d.category === "MUTATION");

  let khatianMatch: boolean | "unavailable" = "unavailable";
  if (khatians.length > 0) {
    const baselineArea = Math.max(...khatians.map((k) => Number(k.area_decimals || 0)));
    const transferArea = uploadedArea ?? storedArea ?? 0;
    khatianMatch = baselineArea >= transferArea;
  }

  let porchaMatch: boolean | "unavailable" = "unavailable";
  if (porchas.length > 0) {
    const porchaArea = Math.max(...porchas.map((p) => Number(p.area_decimals || 0)));
    const transferArea = uploadedArea ?? storedArea ?? 0;
    porchaMatch = porchaArea >= transferArea;
  }

  let namjariMatch: boolean | "unavailable" = "unavailable";
  if (mutations.length > 0) {
    const relatedMutation = mutations.find(
      (m) =>
        normalize(m.based_on_deed) === normalize(matchedDeed!.official_number) ||
        normalize(m.buyer_or_current_owner) === normalize(matchedDeed!.buyer_or_current_owner),
    );
    if (relatedMutation) {
      namjariMatch =
        relatedMutation.area_decimals != null &&
        storedArea != null &&
        Math.abs(Number(relatedMutation.area_decimals) - storedArea) <= 0.01;
    }
  }

  // 4. Outcome Evaluation
  const hasCriticalMismatch = comparisons.some(
    (c) => c.severity === "critical" && !c.isMatch,
  );
  const hasWarningMismatch = comparisons.some(
    (c) => c.severity === "warning" && !c.isMatch,
  );
  const missingCoreFields =
    uploadedDeedNo == null || uploadedArea == null || uploadedSeller == null || uploadedBuyer == null;

  let outcome: P2VerificationOutcome = "matched";
  if (hasCriticalMismatch) {
    outcome = "mismatch";
  } else if (hasWarningMismatch && missingCoreFields) {
    outcome = "inconclusive";
  } else if (!comparisons.every((c) => c.isMatch)) {
    // If only warning mismatched but core fields matched, flag as mismatch or warning
    outcome = hasWarningMismatch ? "mismatch" : "matched";
  }

  const discrepanciesCount = comparisons.filter((c) => !c.isMatch).length;

  let headlineMessageBn = "";
  let headlineMessageEn = "";

  if (outcome === "matched") {
    headlineMessageBn = "দলিলের তথ্য সংরক্ষিত রেকর্ডের সঙ্গে মিলেছে।";
    headlineMessageEn = "All verifiable deed attributes correspond with stored digital records.";
  } else if (outcome === "mismatch") {
    headlineMessageBn = "দলিলের তথ্যে অমিল পাওয়া গেছে। বিস্তারিত যাচাই প্রয়োজন।";
    headlineMessageEn = "One or more critical fields differ from the stored official land registry.";
  } else {
    headlineMessageBn =
      "দলিলের সত্যতা নিশ্চিত করা যায়নি। সংশ্লিষ্ট কর্তৃপক্ষের মাধ্যমে আরও যাচাই করুন।";
    headlineMessageEn =
      "No corresponding record found or document scan was insufficient for a decisive match.";
  }

  const nextStepsBn: string[] = [];
  const nextStepsEn: string[] = [];

  if (outcome === "mismatch") {
    nextStepsBn.push("সাব-রেজিস্ট্রি অফিসের বালাম বই থেকে মূল দলিলের নকল সংগ্রহ করে মিলিয়ে দেখুন।");
    nextStepsBn.push("সহকারী কমিশনার (ভূমি) অফিসে নামজারি ও জমাভাগ রেকর্ড যাচাই করুন।");
    nextStepsBn.push("জমির চৌহদ্দি ও সরেজমিন দখলদারিত্ব পরীক্ষা করুন।");

    nextStepsEn.push("Obtain a certified copy of the original deed from the Sub-Registry Balam book.");
    nextStepsEn.push("Verify mutation and partition records at the local AC Land office.");
    nextStepsEn.push("Inspect physical boundaries and on-site land possession.");
  } else if (outcome === "matched") {
    nextStepsBn.push("সহকারী কমিশনার (ভূমি) অফিসে নামজারি ও খাজনা পরিশোধের হালনাগাদ রশিদ যাচাই করুন।");
    nextStepsBn.push("জমির সীমানা এবং দখলদারিত্ব সরেজমিনে পরিদর্শন করুন।");

    nextStepsEn.push("Confirm up-to-date land tax (Khajna) and Namjari mutation receipts at the AC Land office.");
    nextStepsEn.push("Perform a physical site inspection to verify actual possession and boundaries.");
  } else {
    nextStepsBn.push("সাব-রেজিস্ট্রি অফিসে মূল দলিলের বালাম বই তল্লাশি দিন।");
    nextStepsBn.push("দলিল নম্বর ও সাল সঠিক আছে কি না পুনরায় নিশ্চিত করুন।");

    nextStepsEn.push("Search the Sub-Registry office Balam book for original deed enrollment.");
    nextStepsEn.push("Ensure document digits, deed number, and registration year are correct.");
  }

  return {
    outcome,
    headlineMessageBn,
    headlineMessageEn,
    deedId: matchedDeed.id,
    masterLandId: masterLand?.unique_land_id || masterLand?.id || matchedDeed.master_land_id,
    fieldsComparison: comparisons,
    crossChecks: {
      khatianMatch,
      porchaMatch,
      namjariMatch,
    },
    discrepanciesCount,
    nextStepsBn,
    nextStepsEn,
  };
}
