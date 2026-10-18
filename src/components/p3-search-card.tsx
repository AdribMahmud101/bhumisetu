"use client";
import React, { useState, type ChangeEvent } from "react";
import { useI18n } from "@/i18n/provider";
import { ArrowRight, Loader2, QrCode, Search, ShieldAlert } from "lucide-react";

interface P3SearchCardProps {
  onSearch: (landId: string) => void;
}

export default function P3SearchCard({ onSearch }: P3SearchCardProps) {
  const { t } = useI18n();
  const [tab, setTab] = useState<"id" | "qr">("id");
  const [query, setQuery] = useState("");
  const [qrBusy, setQrBusy] = useState(false);
  const [qrError, setQrError] = useState("");

  const handleUploadQr = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setQrBusy(true);
    setQrError("");
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("p3-qr-reader-search");
      const text = await scanner.scanFile(file, true);
      const url = new URL(text);
      const parts = url.pathname.split("/").filter(Boolean);
      const landId = parts[parts.length - 1];
      if (landId) onSearch(landId);
      else onSearch(text);
    } catch {
      setQrError("QR কোড রিড করা সম্ভব হয়নি। পরিষ্কার ছবি দিন।");
    } finally {
      setQrBusy(false);
    }
  };

  return (
    <div className="panel search-panel" style={{ maxWidth: 640, margin: "40px auto" }}>
      <div className="section-heading" style={{ marginBottom: 16 }}>
        <div>
          <span className="kicker" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <ShieldAlert size={14} color="#dc2626" /> P3 · Fraud & Double-Selling Detection
          </span>
          <h2 style={{ fontSize: 22, margin: "6px 0 4px" }}>{t("search_land_record_title")}</h2>
          <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>{t("search_land_record_sub")}</p>
        </div>
      </div>

      <div className="tabs" role="tablist" style={{ marginBottom: 20 }}>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "id"}
          className={tab === "id" ? "selected" : ""}
          onClick={() => setTab("id")}
        >
          <Search size={16} /> {t("search_by_unique_land_id")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "qr"}
          className={tab === "qr" ? "selected" : ""}
          onClick={() => setTab("qr")}
        >
          <QrCode size={16} /> {t("scan_qr_code")}
        </button>
      </div>

      {tab === "id" ? (
        <form
          className="record-search"
          onSubmit={(e) => {
            e.preventDefault();
            if (query.trim()) onSearch(query.trim());
          }}
        >
          <Search size={22} />
          <input
            name="query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="LND-00125 অথবা LND-MOCK-001"
            required
            autoFocus
          />
          <button type="submit" className="button primary">
            {t("search_land_action")}
            <ArrowRight size={17} />
          </button>
        </form>
      ) : (
        <div className="citizen-qr-upload" style={{ textAlign: "center", padding: "20px 0" }}>
          <input
            id="p3-qr-upload-input"
            type="file"
            accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
            onChange={handleUploadQr}
            disabled={qrBusy}
          />
          <label htmlFor="p3-qr-upload-input" className="button outline">
            {qrBusy ? <Loader2 size={17} className="spin" /> : <QrCode size={17} />}
            {qrBusy ? t("reading_qr") : t("scan_qr_code")}
          </label>
          <div id="p3-qr-reader-search" className="qr-reader-offscreen" aria-hidden="true" />
          {qrError && <p className="citizen-qr-error" role="alert">{qrError}</p>}
        </div>
      )}

      <div style={{ marginTop: 18, borderTop: "1px solid #e2e8f0", paddingTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <small style={{ color: "#64748b" }}>ডেমো রেকর্ড টেস্ট করতে চান?</small>
        <button
          type="button"
          className="button outline small"
          onClick={() => onSearch("LND-MOCK-001")}
        >
          LND-MOCK-001 লোড করুন
        </button>
      </div>
    </div>
  );
}
