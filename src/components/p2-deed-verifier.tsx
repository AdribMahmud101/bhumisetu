"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { useI18n } from "@/i18n/provider";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  FileCheck2,
  FileText,
  HelpCircle,
  QrCode,
  ShieldAlert,
  Upload,
  XCircle,
  RefreshCw,
  Search,
  Eye,
  Edit3,
  ArrowRight,
  ArrowLeft,
  FileSpreadsheet,
} from "lucide-react";
import { DeedVerificationResult, ExtractedDeedFields } from "@/lib/deed-comparison-engine";
import { prepareDocument } from "@/lib/pdf-client";
import { DOCUMENT_ACCEPT } from "@/lib/document-types";
import { toAsciiDigits, toBengaliDigits } from "@/lib/numbers";

interface P2DeedVerifierProps {
  initialLandId?: string;
  onVerified?: (result: DeedVerificationResult) => void;
}

type VerifierStage = "input" | "extracting" | "review" | "verifying" | "result";

export function P2DeedVerifier({
  initialLandId,
  onVerified,
}: P2DeedVerifierProps) {
  const { t, formatNumber, locale } = useI18n();
  const [stage, setStage] = useState<VerifierStage>("input");
  const [tab, setTab] = useState<"upload" | "qr">("upload");
  const [landId, setLandId] = useState(initialLandId || "");
  const [qrText, setQrText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewPages, setPreviewPages] = useState<string[]>([]);
  const [extractedFields, setExtractedFields] = useState<{
    deedNumber: string;
    deedDate: string;
    sellerName: string;
    buyerName: string;
    dagNumber: string;
    landAreaDecimals: string;
    khatianNumber: string;
    mouza: string;
  }>({
    deedNumber: "",
    deedDate: "",
    sellerName: "",
    buyerName: "",
    dagNumber: "",
    landAreaDecimals: "",
    khatianNumber: "",
    mouza: "",
  });
  const [areaUnit, setAreaUnit] = useState<string>("decimal");
  const [loadingStep, setLoadingStep] = useState<1 | 2 | 3>(1);
  const [result, setResult] = useState<DeedVerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [scanning, setScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleQrVerify = useCallback(
    async (textToVerify?: string) => {
      const payload = textToVerify || qrText;
      if (!payload.trim()) {
        setError(locale === "bn" ? "কিউআর কোডের টেক্সট বা লিংক লিখুন" : "Enter QR code text or URL");
        return;
      }
      setError(null);
      setStage("verifying");
      setLoadingStep(1);

      try {
        const stepTimer1 = setTimeout(() => setLoadingStep(2), 600);
        const stepTimer2 = setTimeout(() => setLoadingStep(3), 1200);

        const res = await fetch("/api/service/verify-deed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            qrPayload: payload.trim(),
            landId: landId.trim() || undefined,
          }),
        });

        clearTimeout(stepTimer1);
        clearTimeout(stepTimer2);

        if (!res.ok) {
          throw new Error("Verification request failed");
        }

        const data: DeedVerificationResult = await res.json();
        setResult(data);
        setStage("result");
        if (onVerified) onVerified(data);
      } catch (e) {
        console.error(e);
        setError(
          locale === "bn"
            ? "যাচাই প্রক্রিয়া সম্পন্ন করা সম্ভব হয়নি। অনুগ্রহ করে পুনরায় চেষ্টা করুন।"
            : "Could not complete deed verification. Please try again.",
        );
        setStage("input");
      }
    },
    [qrText, locale, landId, onVerified],
  );

  // Stop scanner when tab changes or unmounts
  useEffect(() => {
    let activeScanner: import("html5-qrcode").Html5Qrcode | null = null;
    let mounted = true;

    async function initScanner() {
      if (tab === "qr" && scanning) {
        try {
          const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import(
            "html5-qrcode"
          );
          if (!mounted) return;
          const scanner = new Html5Qrcode("p2-qr-reader", {
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
            verbose: false,
          });
          activeScanner = scanner;

          await scanner.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText) => {
              if (mounted) {
                setQrText(decodedText);
                scanner.stop().catch(() => {});
                setScanning(false);
                handleQrVerify(decodedText);
              }
            },
            () => {},
          );
        } catch (err) {
          console.error("Camera scanner error:", err);
          if (mounted) {
            setScanning(false);
          }
        }
      }
    }

    initScanner();

    return () => {
      mounted = false;
      if (activeScanner) {
        activeScanner.stop().catch(() => {});
      }
    };
  }, [tab, scanning, handleQrVerify]);

  const handleExtractFromDocument = async (fileToUpload?: File) => {
    const targetFile = fileToUpload || selectedFile;
    if (!targetFile) {
      setError(locale === "bn" ? "অনুগ্রহ করে একটি দলিল ফাইল (PDF বা ছবি) নির্বাচন করুন" : "Please select a deed file (PDF or Image)");
      return;
    }
    setError(null);
    setStage("extracting");
    setLoadingStep(1);

    try {
      // Enhanced OCR preprocessing: scaling, deskewing, contrast normalization
      const prepared = await prepareDocument(targetFile, { enhance: true });
      setPreviewPages(prepared.pages || []);

      setLoadingStep(2);
      const form = new FormData();
      form.append("file", targetFile);
      form.append("pages", JSON.stringify(prepared.pages));
      form.append("text", prepared.text);
      form.append("extractOnly", "true");
      if (landId.trim()) {
        form.append("landId", landId.trim());
      }

      const res = await fetch("/api/service/verify-deed", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to extract deed data");
      }

      const data = await res.json();
      const extracted: ExtractedDeedFields = data.extracted || {};

      setExtractedFields({
        deedNumber: extracted.deedNumber || "",
        deedDate: extracted.deedDate || "",
        sellerName: extracted.sellerName || "",
        buyerName: extracted.buyerName || "",
        dagNumber: extracted.dagNumber || "",
        landAreaDecimals:
          extracted.landAreaDecimals != null
            ? locale === "bn"
              ? toBengaliDigits(extracted.landAreaDecimals)
              : String(extracted.landAreaDecimals)
            : "",
        khatianNumber: extracted.khatianNumber || "",
        mouza: extracted.mouza || "",
      });

      setStage("review");
    } catch (e: any) {
      console.error(e);
      setError(
        locale === "bn"
          ? "দলিল থেকে স্বয়ংক্রিয় তথ্য সংগ্রহ করা যায়নি। আপনি নিচের ফর্মে সরাসরি তথ্য লিখে যাচাই করতে পারেন।"
          : "Automatic extraction could not complete. You can manually enter the deed details below.",
      );
      // Fallback directly to review screen with manual editing
      setStage("review");
    }
  };

  const handleManualEntry = () => {
    setError(null);
    setExtractedFields({
      deedNumber: "",
      deedDate: "",
      sellerName: "",
      buyerName: "",
      dagNumber: "",
      landAreaDecimals: "",
      khatianNumber: "",
      mouza: "",
    });
    setPreviewPages([]);
    setStage("review");
  };

  const handleFinalVerify = async () => {
    const rawDeedNo = extractedFields.deedNumber.trim();
    const rawDag = extractedFields.dagNumber.trim();

    if (!rawDeedNo && !rawDag && !landId.trim()) {
      setError(
        locale === "bn"
          ? "যাচাইয়ের জন্য অন্তত দলিল নম্বর অথবা দাগ নম্বর প্রয়োজন।"
          : "Please enter at least Deed Number or Dag Number for verification.",
      );
      return;
    }

    setError(null);
    setStage("verifying");
    setLoadingStep(1);

    try {
      const stepTimer1 = setTimeout(() => setLoadingStep(2), 500);
      const stepTimer2 = setTimeout(() => setLoadingStep(3), 1100);

      // Convert unit if necessary
      let areaDecimals: number | null = null;
      if (extractedFields.landAreaDecimals.trim()) {
        const ascii = toAsciiDigits(extractedFields.landAreaDecimals).replace(/[^0-9.]/g, "");
        const baseNum = Number(ascii);
        if (!Number.isNaN(baseNum) && baseNum > 0) {
          if (areaUnit === "acre") areaDecimals = baseNum * 100;
          else if (areaUnit === "bigha") areaDecimals = baseNum * 33;
          else if (areaUnit === "katha") areaDecimals = baseNum * 1.65;
          else if (areaUnit === "chhatak") areaDecimals = baseNum * 0.103125;
          else areaDecimals = baseNum;
        }
      }

      const payloadFields: ExtractedDeedFields = {
        deedNumber: rawDeedNo ? toAsciiDigits(rawDeedNo) : null,
        deedDate: extractedFields.deedDate.trim() ? toAsciiDigits(extractedFields.deedDate.trim()) : null,
        sellerName: extractedFields.sellerName.trim() || null,
        buyerName: extractedFields.buyerName.trim() || null,
        dagNumber: rawDag ? toAsciiDigits(rawDag) : null,
        landAreaDecimals: areaDecimals,
        khatianNumber: extractedFields.khatianNumber.trim() ? toAsciiDigits(extractedFields.khatianNumber.trim()) : null,
        mouza: extractedFields.mouza.trim() || null,
        qrPayload: qrText.trim() || undefined,
      };

      const res = await fetch("/api/service/verify-deed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          extractedFields: payloadFields,
          landId: landId.trim() || undefined,
        }),
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      if (!res.ok) {
        throw new Error("Verification request failed");
      }

      const data: DeedVerificationResult = await res.json();
      setResult(data);
      setStage("result");
      if (onVerified) onVerified(data);
    } catch (e: any) {
      console.error(e);
      setError(
        locale === "bn"
          ? "যাচাই প্রক্রিয়া সম্পন্ন করা সম্ভব হয়নি। অনুগ্রহ করে পুনরায় চেষ্টা করুন।"
          : "Could not complete deed verification. Please try again.",
      );
      setStage("review");
    }
  };

  const handleReset = () => {
    setResult(null);
    setSelectedFile(null);
    setPreviewPages([]);
    setExtractedFields({
      deedNumber: "",
      deedDate: "",
      sellerName: "",
      buyerName: "",
      dagNumber: "",
      landAreaDecimals: "",
      khatianNumber: "",
      mouza: "",
    });
    setAreaUnit("decimal");
    setQrText("");
    setError(null);
    setStage("input");
    setScanning(false);
  };

  return (
    <div className="p2-verifier-container" data-testid="p2-deed-verifier">
      {/* Step 1: Upload or QR Input Panel */}
      {stage === "input" && (
        <section className="panel" style={{ maxWidth: 680, margin: "30px auto" }}>
          <div className="section-heading" style={{ marginBottom: 18 }}>
            <div>
              <span className="kicker" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <FileCheck2 size={14} color="#059669" /> P2 · {t("p2_deed_verification_title")}
              </span>
              <h2 style={{ fontSize: 22, margin: "6px 0 4px" }}>{t("p2_deed_verification_title")}</h2>
              <p style={{ margin: 0, color: "#64748b", fontSize: 13.5 }}>{t("p2_deed_verification_sub")}</p>
            </div>
          </div>

          {/* Toggle Tabs */}
          <div className="tabs" role="tablist" style={{ marginBottom: 20 }}>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "upload"}
              className={tab === "upload" ? "selected" : ""}
              onClick={() => {
                setTab("upload");
                setScanning(false);
                setError(null);
              }}
            >
              <Upload size={14} style={{ marginRight: 6 }} />
              {t("upload_deed_tab")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "qr"}
              className={tab === "qr" ? "selected" : ""}
              onClick={() => {
                setTab("qr");
                setError(null);
              }}
            >
              <QrCode size={14} style={{ marginRight: 6 }} />
              {t("scan_deed_qr_tab")}
            </button>
          </div>

          {error && (
            <div
              style={{
                backgroundColor: "#fef2f2",
                border: "1px solid #fecdd3",
                color: "#991b1b",
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: 13.5,
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}

          {/* Tab 1: Enhanced Document Upload */}
          {tab === "upload" && (
            <div>
              <div
                style={{
                  border: "2px dashed #cbd5e1",
                  borderRadius: 10,
                  padding: "32px 20px",
                  textAlign: "center",
                  backgroundColor: "#f8fafc",
                  cursor: "pointer",
                  transition: "border-color 0.2s ease",
                }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files?.[0]) {
                    setSelectedFile(e.dataTransfer.files[0]);
                  }
                }}
              >
                <Upload size={32} color="#059669" style={{ margin: "0 auto 10px", display: "block" }} />
                <strong style={{ display: "block", fontSize: 15, color: "#1e293b", marginBottom: 4 }}>
                  {selectedFile ? selectedFile.name : t("drag_drop_deed_pdf")}
                </strong>
                <span style={{ fontSize: 12.5, color: "#64748b" }}>
                  {selectedFile
                    ? `${(selectedFile.size / 1024).toFixed(1)} KB`
                    : "PDF, ছবি (PNG, JPG), DOCX · সর্বোচ্চ ৫ MB, ৩ পৃষ্ঠা"}
                </span>

                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  accept={DOCUMENT_ACCEPT}
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setSelectedFile(e.target.files[0]);
                    }
                  }}
                />
              </div>

              <div style={{ marginTop: 20, display: "flex", gap: 12, justifyContent: "space-between", alignItems: "center" }}>
                <button
                  type="button"
                  className="button outline"
                  onClick={handleManualEntry}
                  style={{ fontSize: 13 }}
                >
                  <Edit3 size={14} style={{ marginRight: 6 }} />
                  <span>{t("manual_entry_btn")}</span>
                </button>

                <button
                  type="button"
                  className="button primary"
                  disabled={!selectedFile}
                  onClick={() => handleExtractFromDocument()}
                  data-testid="p2-verify-pdf-btn"
                >
                  <FileSpreadsheet size={16} />
                  <span>{t("process_and_review_btn")}</span>
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: QR Code Scan */}
          {tab === "qr" && (
            <div>
              <div style={{ marginBottom: 16 }}>
                {!scanning ? (
                  <button
                    type="button"
                    className="button outline"
                    style={{ width: "100%", justifyContent: "center", padding: "12px 16px" }}
                    onClick={() => setScanning(true)}
                  >
                    <Camera size={18} />
                    <span>{t("camera_scan_label")}</span>
                  </button>
                ) : (
                  <div>
                    <div id="p2-qr-reader" style={{ width: "100%", borderRadius: 8, overflow: "hidden" }} />
                    <button
                      type="button"
                      className="button outline small"
                      style={{ marginTop: 8 }}
                      onClick={() => setScanning(false)}
                    >
                      {locale === "bn" ? "ক্যামেরা বন্ধ করুন" : "Close Camera"}
                    </button>
                  </div>
                )}
              </div>

              <div style={{ margin: "16px 0 8px" }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
                  {t("manual_qr_input_label")}
                </label>
                <input
                  type="text"
                  value={qrText}
                  onChange={(e) => setQrText(e.target.value)}
                  placeholder={t("qr_input_placeholder")}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    fontSize: 14,
                  }}
                  data-testid="p2-qr-input"
                />
              </div>

              <div style={{ marginTop: 18, display: "flex", gap: 12, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="button primary"
                  disabled={!qrText.trim()}
                  onClick={() => handleQrVerify()}
                  data-testid="p2-verify-qr-btn"
                >
                  <Search size={16} />
                  <span>{t("verify_deed_action")}</span>
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Step 2: Animated OCR Extraction Screen */}
      {stage === "extracting" && (
        <section className="panel" style={{ maxWidth: 640, margin: "40px auto", textAlign: "center", padding: "36px 24px" }}>
          <RefreshCw
            size={36}
            color="#059669"
            style={{ margin: "0 auto 18px", display: "block", animation: "spin 1.5s linear infinite" }}
          />
          <h3 style={{ fontSize: 18, margin: "0 0 10px" }}>
            {locale === "bn" ? "দলিল বিশ্লেষণ ও তথ্য সংগ্রহ করা হচ্ছে..." : "Processing Deed & Extracting Fields with Enhanced OCR..."}
          </h3>
          <p style={{ color: "#64748b", fontSize: 13.5, margin: 0 }}>
            {locale === "bn"
              ? "ছবি/পিডিএফ রেজোলিউশন ও কন্ট্রাস্ট বৃদ্ধি করে স্বয়ংক্রিয়ভাবে দলিলের মূল তথ্য পড়া হচ্ছে।"
              : "Enhancing document contrast, deskewing, and reading core deed metadata."}
          </p>
        </section>
      )}

      {/* Step 3: Intermediate Editable Fields Review Screen */}
      {stage === "review" && (
        <section className="panel" style={{ maxWidth: 740, margin: "30px auto" }} data-testid="p2-fields-review-panel">
          <div className="section-heading" style={{ marginBottom: 16 }}>
            <div>
              <span className="kicker" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Edit3 size={14} color="#059669" /> {t("review_extracted_heading")}
              </span>
              <h2 style={{ fontSize: 20, margin: "6px 0 4px" }}>{t("review_extracted_heading")}</h2>
              <p style={{ margin: 0, color: "#64748b", fontSize: 13.5 }}>{t("review_extracted_help")}</p>
            </div>
          </div>

          {error && (
            <div
              style={{
                backgroundColor: "#fffbeb",
                border: "1px solid #fde68a",
                color: "#92400e",
                padding: "10px 14px",
                borderRadius: 8,
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}

          {/* Document Visual Preview (Collapsible) */}
          {previewPages.length > 0 && (
            <details className="ocr-preview" open style={{ marginBottom: 20 }}>
              <summary style={{ cursor: "pointer", color: "#059669", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Eye size={15} />
                <span>
                  {t("ocr_preview")} ({formatNumber(previewPages.length)} {locale === "bn" ? "টি পৃষ্ঠা" : "page(s)"})
                </span>
              </summary>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: previewPages.length > 1 ? "repeat(auto-fit, minmax(280px, 1fr))" : "1fr",
                  gap: 12,
                  marginTop: 10,
                  maxHeight: 360,
                  overflowY: "auto",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  padding: 10,
                  backgroundColor: "#f8fafc",
                }}
              >
                {previewPages.map((url, idx) => (
                  <Image
                    key={idx}
                    src={url}
                    alt={`Deed Page ${idx + 1}`}
                    width={640}
                    height={850}
                    unoptimized
                    style={{
                      width: "100%",
                      height: "auto",
                      objectFit: "contain",
                      borderRadius: 6,
                      border: "1px solid #cbd5e1",
                    }}
                  />
                ))}
              </div>
            </details>
          )}

          {/* Form Grid for Manual Review / Editing */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleFinalVerify();
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 14,
                marginBottom: 20,
              }}
            >
              {/* 1. Deed Number */}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 5 }}>
                  {t("deed_number_label")} *
                </label>
                <input
                  type="text"
                  required
                  value={extractedFields.deedNumber}
                  onChange={(e) =>
                    setExtractedFields({ ...extractedFields, deedNumber: e.target.value })
                  }
                  placeholder="যেমন: ৫০২/২০২১"
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    fontSize: 14,
                  }}
                  data-testid="p2-input-deed-number"
                />
              </div>

              {/* 2. Deed Date */}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 5 }}>
                  {t("deed_date_label")}
                </label>
                <input
                  type="text"
                  value={extractedFields.deedDate}
                  onChange={(e) =>
                    setExtractedFields({ ...extractedFields, deedDate: e.target.value })
                  }
                  placeholder="YYYY-MM-DD বা DD/MM/YYYY"
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    fontSize: 14,
                  }}
                  data-testid="p2-input-deed-date"
                />
              </div>

              {/* 3. Seller Name */}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 5 }}>
                  {t("seller_name_label")}
                </label>
                <input
                  type="text"
                  value={extractedFields.sellerName}
                  onChange={(e) =>
                    setExtractedFields({ ...extractedFields, sellerName: e.target.value })
                  }
                  placeholder="বিক্রেতার নাম লিখুন"
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    fontSize: 14,
                  }}
                  data-testid="p2-input-seller"
                />
              </div>

              {/* 4. Buyer Name */}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 5 }}>
                  {t("buyer_name_label")}
                </label>
                <input
                  type="text"
                  value={extractedFields.buyerName}
                  onChange={(e) =>
                    setExtractedFields({ ...extractedFields, buyerName: e.target.value })
                  }
                  placeholder="ক্রেতার নাম লিখুন"
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    fontSize: 14,
                  }}
                  data-testid="p2-input-buyer"
                />
              </div>

              {/* 5. Dag Number */}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 5 }}>
                  {t("dag_number_label")}
                </label>
                <input
                  type="text"
                  value={extractedFields.dagNumber}
                  onChange={(e) =>
                    setExtractedFields({ ...extractedFields, dagNumber: e.target.value })
                  }
                  placeholder="যেমন: ২০৭"
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    fontSize: 14,
                  }}
                  data-testid="p2-input-dag"
                />
              </div>

              {/* 6. Land Area & Unit */}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 5 }}>
                  {t("land_area_label")}
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={extractedFields.landAreaDecimals}
                    onChange={(e) =>
                      setExtractedFields({ ...extractedFields, landAreaDecimals: e.target.value })
                    }
                    placeholder="যেমন: ১২.০০"
                    style={{
                      flex: 1,
                      padding: "9px 12px",
                      borderRadius: 6,
                      border: "1px solid #cbd5e1",
                      fontSize: 14,
                    }}
                    data-testid="p2-input-area"
                  />
                  <select
                    value={areaUnit}
                    onChange={(e) => setAreaUnit(e.target.value)}
                    style={{
                      width: "auto",
                      minWidth: 100,
                      padding: "9px 10px",
                      borderRadius: 6,
                      border: "1px solid #cbd5e1",
                      fontSize: 13,
                    }}
                    data-testid="p2-select-unit"
                  >
                    <option value="decimal">{t("unit_decimal")}</option>
                    <option value="acre">{t("unit_acre")}</option>
                    <option value="bigha">{t("unit_bigha")}</option>
                    <option value="katha">{t("unit_katha")}</option>
                    <option value="chhatak">{t("unit_chhatak")}</option>
                  </select>
                </div>
              </div>

              {/* 7. Khatian Reference */}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 5 }}>
                  {t("khatian_number_label")}
                </label>
                <input
                  type="text"
                  value={extractedFields.khatianNumber}
                  onChange={(e) =>
                    setExtractedFields({ ...extractedFields, khatianNumber: e.target.value })
                  }
                  placeholder="যেমন: RS-১১৮"
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    fontSize: 14,
                  }}
                  data-testid="p2-input-khatian"
                />
              </div>

              {/* 8. Mouza */}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 5 }}>
                  {t("mouza_label")}
                </label>
                <input
                  type="text"
                  value={extractedFields.mouza}
                  onChange={(e) =>
                    setExtractedFields({ ...extractedFields, mouza: e.target.value })
                  }
                  placeholder="মৌজার নাম লিখুন"
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    fontSize: 14,
                  }}
                  data-testid="p2-input-mouza"
                />
              </div>

              {/* 9. Target Land ID (Optional) */}
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 5 }}>
                  {t("target_land_id_label")}
                </label>
                <input
                  type="text"
                  value={landId}
                  onChange={(e) => setLandId(e.target.value)}
                  placeholder={t("target_land_id_placeholder")}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    fontSize: 14,
                  }}
                  data-testid="p2-input-land-id"
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #e2e8f0", paddingTop: 16 }}>
              <button
                type="button"
                className="button outline"
                onClick={() => setStage("input")}
              >
                <ArrowLeft size={15} style={{ marginRight: 6 }} />
                <span>{t("reupload_document")}</span>
              </button>

              <button
                type="submit"
                className="button primary"
                data-testid="p2-confirm-verify-btn"
              >
                <FileCheck2 size={16} />
                <span>{t("confirm_and_verify")}</span>
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Step 4: Final Comparison Loading Card */}
      {stage === "verifying" && (
        <section className="panel" style={{ maxWidth: 640, margin: "40px auto", textAlign: "center", padding: "36px 24px" }}>
          <RefreshCw
            size={36}
            color="#059669"
            style={{ margin: "0 auto 18px", display: "block", animation: "spin 1.5s linear infinite" }}
          />
          <h3 style={{ fontSize: 18, margin: "0 0 16px" }}>
            {locale === "bn" ? "সংরক্ষিত রেকর্ডের সাথে মিলিয়ে দেখা হচ্ছে..." : "Cross-Checking with Official Land Database..."}
          </h3>

          <div style={{ maxWidth: 440, margin: "0 auto", textAlign: "left", display: "grid", gap: 12 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 14,
                color: "#047857",
                fontWeight: 600,
              }}
            >
              <CheckCircle2 size={18} color="#10b981" />
              <span>{t("reading_extracting_fields")}</span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 14,
                color: loadingStep >= 2 ? "#047857" : "#94a3b8",
                fontWeight: loadingStep === 2 ? 700 : 500,
              }}
            >
              {loadingStep > 2 ? <CheckCircle2 size={18} color="#10b981" /> : <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid currentColor" }} />}
              <span>{t("locating_stored_record")}</span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 14,
                color: loadingStep >= 3 ? "#047857" : "#94a3b8",
                fontWeight: loadingStep === 3 ? 700 : 500,
              }}
            >
              <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid currentColor" }} />
              <span>{t("cross_checking_records")}</span>
            </div>
          </div>
        </section>
      )}

      {/* Step 5: Verification Report (The 4 Visual Zones) */}
      {result && stage === "result" && (
        <div style={{ maxWidth: 840, margin: "30px auto" }}>
          {/* Zone 1: High-Impact Verdict Banner */}
          <div
            className={`verdict-banner ${
              result.outcome === "matched"
                ? "verdict-low"
                : result.outcome === "mismatch"
                  ? "verdict-critical"
                  : "verdict-inconclusive"
            }`}
            data-testid="p2-verdict-banner"
          >
            {result.outcome === "matched" ? (
              <CheckCircle2 size={34} style={{ flexShrink: 0 }} />
            ) : result.outcome === "mismatch" ? (
              <AlertTriangle size={34} style={{ flexShrink: 0 }} />
            ) : (
              <HelpCircle size={34} style={{ flexShrink: 0 }} />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 4,
                    backgroundColor: "rgba(255, 255, 255, 0.8)",
                    border: "1px solid currentColor",
                  }}
                >
                  {result.outcome === "matched"
                    ? `${t("status_matched")} (Verified Match)`
                    : result.outcome === "mismatch"
                      ? `${t("status_mismatch")} (Mismatch Detected)`
                      : `${t("status_unverified")} (Inconclusive)`}
                </span>
              </div>
              <h2 style={{ margin: "4px 0 6px", fontSize: 19 }}>
                {locale === "bn" ? result.headlineMessageBn : result.headlineMessageEn}
              </h2>
              <p style={{ margin: 0, fontSize: 13.5, opacity: 0.9 }}>
                {result.outcome === "matched"
                  ? t("deed_verdict_matched")
                  : result.outcome === "mismatch"
                    ? t("deed_verdict_mismatch")
                    : t("deed_verdict_inconclusive")}
              </p>
            </div>

            <button
              type="button"
              className="button outline small"
              onClick={handleReset}
              style={{ backgroundColor: "white", alignSelf: "flex-start" }}
            >
              <RefreshCw size={14} />
              <span>{locale === "bn" ? "নতুন যাচাই" : "New Verification"}</span>
            </button>
          </div>

          {/* Zone 2: Side-by-Side Comparison Matrix */}
          <section className="panel" style={{ marginBottom: 20 }} data-testid="p2-comparison-matrix">
            <div className="section-heading">
              <div>
                <span className="kicker">{t("p2_deed_verification_title")}</span>
                <h3>{locale === "bn" ? "দলিলে উল্লিখিত তথ্য বনাম সংরক্ষিত অফিসিয়াল রেকর্ড" : "Extracted Deed Fields vs Stored Official Record"}</h3>
              </div>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: result.discrepanciesCount > 0 ? "#dc2626" : "#059669",
                }}
              >
                {result.discrepanciesCount > 0
                  ? `${formatNumber(result.discrepanciesCount)} ${t("status_mismatch")}`
                  : `${formatNumber(result.fieldsComparison.length)} ${t("status_matched")}`}
              </span>
            </div>

            <div style={{ overflowX: "auto", marginTop: 14 }}>
              <table className="deed-comparison-matrix">
                <thead>
                  <tr>
                    <th style={{ width: "26%" }}>{t("field_name_col")}</th>
                    <th style={{ width: "32%" }}>{t("stored_record_col")}</th>
                    <th style={{ width: "32%" }}>{t("uploaded_deed_col")}</th>
                    <th style={{ width: "10%", textAlign: "center" }}>{t("status_col")}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.fieldsComparison.map((field) => {
                    const isMismatch = !field.isMatch;
                    return (
                      <tr
                        key={field.fieldName}
                        style={{
                          backgroundColor: isMismatch ? "#fef2f2" : undefined,
                        }}
                      >
                        <td>
                          <strong>{locale === "bn" ? field.fieldLabelBn : field.fieldLabelEn}</strong>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: "#1e293b" }}>
                            {field.storedValue != null
                              ? typeof field.storedValue === "number"
                                ? `${formatNumber(field.storedValue)} ${t("decimals_2dd44")}`
                                : String(field.storedValue)
                              : "—"}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              fontWeight: 600,
                              color: isMismatch ? "#b91c1c" : "#1e293b",
                            }}
                          >
                            {field.uploadedValue != null
                              ? typeof field.uploadedValue === "number"
                                ? `${formatNumber(field.uploadedValue)} ${t("decimals_2dd44")}`
                                : String(field.uploadedValue)
                              : "—"}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span
                            style={{
                              display: "inline-block",
                              fontSize: 12,
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: 4,
                              backgroundColor: field.isMatch ? "#ecfdf5" : "#fee2e2",
                              color: field.isMatch ? "#047857" : "#b91c1c",
                              border: `1px solid ${field.isMatch ? "#a7f3d0" : "#fca5a5"}`,
                            }}
                          >
                            {field.isMatch ? t("status_matched") : t("status_mismatch")}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Zone 3: Secondary Record Cross-Check Badges */}
          <section className="panel" style={{ marginBottom: 20 }}>
            <div className="section-heading">
              <div>
                <span className="kicker">{t("verification_coverage_4390f")}</span>
                <h3>{locale === "bn" ? "সহায়ক নথির সাথে তুলনামূলক পরীক্ষা" : "Secondary Record Cross-Checks"}</h3>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 14,
                marginTop: 14,
              }}
            >
              {/* RS Khatian Check */}
              <div
                style={{
                  padding: 14,
                  borderRadius: 8,
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <strong style={{ fontSize: 14, display: "block", color: "#1e293b" }}>
                    {t("khatian_check_title")}
                  </strong>
                  <small style={{ color: "#64748b" }}>RS Khatian</small>
                </div>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: 4,
                    backgroundColor:
                      result.crossChecks.khatianMatch === true
                        ? "#ecfdf5"
                        : result.crossChecks.khatianMatch === false
                          ? "#fee2e2"
                          : "#f1f5f9",
                    color:
                      result.crossChecks.khatianMatch === true
                        ? "#047857"
                        : result.crossChecks.khatianMatch === false
                          ? "#b91c1c"
                          : "#475569",
                  }}
                >
                  {result.crossChecks.khatianMatch === true
                    ? t("checked_and_aligned")
                    : result.crossChecks.khatianMatch === false
                      ? t("area_exceeded_alert")
                      : t("not_checked_data_unavailable")}
                </span>
              </div>

              {/* RS Porcha Check */}
              <div
                style={{
                  padding: 14,
                  borderRadius: 8,
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <strong style={{ fontSize: 14, display: "block", color: "#1e293b" }}>
                    {t("porcha_check_title")}
                  </strong>
                  <small style={{ color: "#64748b" }}>Certified Porcha</small>
                </div>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: 4,
                    backgroundColor:
                      result.crossChecks.porchaMatch === true
                        ? "#ecfdf5"
                        : result.crossChecks.porchaMatch === false
                          ? "#fee2e2"
                          : "#f1f5f9",
                    color:
                      result.crossChecks.porchaMatch === true
                        ? "#047857"
                        : result.crossChecks.porchaMatch === false
                          ? "#b91c1c"
                          : "#475569",
                  }}
                >
                  {result.crossChecks.porchaMatch === true
                    ? t("checked_and_aligned")
                    : result.crossChecks.porchaMatch === false
                      ? t("conflict_found")
                      : t("not_checked_data_unavailable")}
                </span>
              </div>

              {/* Namjari Mutation Check */}
              <div
                style={{
                  padding: 14,
                  borderRadius: 8,
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <strong style={{ fontSize: 14, display: "block", color: "#1e293b" }}>
                    {t("namjari_check_title")}
                  </strong>
                  <small style={{ color: "#64748b" }}>Mutation Record</small>
                </div>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: 4,
                    backgroundColor:
                      result.crossChecks.namjariMatch === true
                        ? "#ecfdf5"
                        : result.crossChecks.namjariMatch === false
                          ? "#fee2e2"
                          : "#f1f5f9",
                    color:
                      result.crossChecks.namjariMatch === true
                        ? "#047857"
                        : result.crossChecks.namjariMatch === false
                          ? "#b91c1c"
                          : "#475569",
                  }}
                >
                  {result.crossChecks.namjariMatch === true
                    ? t("checked_and_aligned")
                    : result.crossChecks.namjariMatch === false
                      ? t("conflict_found")
                      : t("not_checked_data_unavailable")}
                </span>
              </div>
            </div>
          </section>

          {/* Zone 4: Actionable Guidance & Legal Disclaimer */}
          <section className="buyer-checklist-card">
            <h4>{t("actionable_next_steps")}</h4>
            <ul>
              {(locale === "bn" ? result.nextStepsBn : result.nextStepsEn).map(
                (step, idx) => (
                  <li key={idx} style={{ marginBottom: 6 }}>
                    {step}
                  </li>
                ),
              )}
            </ul>

            <div
              style={{
                marginTop: 16,
                paddingTop: 14,
                borderTop: "1px solid #bbf7d0",
                fontSize: 12.5,
                color: "#166534",
                lineHeight: 1.6,
              }}
            >
              {t("legal_guardrail_disclaimer")}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
