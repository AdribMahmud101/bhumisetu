"use client";
import React, { useState } from "react";
import { useI18n, LanguageSwitch } from "@/i18n/provider";
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Eye,
  FileCheck2,
  FileText,
  Files,
  Lock,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  User,
  Users,
  X,
} from "lucide-react";
import {
  Category,
  categories,
  formatLandArea,
  Land,
  LandDocument,
} from "@/lib/domain";
import { DOCX_MIME } from "@/lib/document-types";
import dynamic from "next/dynamic";

const DocxPreview = dynamic(() => import("./docx-preview"), { ssr: false });

interface UserDocumentModalProps {
  document: LandDocument;
  land: Land;
  categoryDocs?: LandDocument[];
  onSelectDoc?: (doc: LandDocument) => void;
  onClose: () => void;
  onViewSource?: (doc: LandDocument) => void;
}

export default function UserDocumentModal({
  document: doc,
  land,
  categoryDocs = [],
  onSelectDoc,
  onClose,
  onViewSource,
}: UserDocumentModalProps) {
  const { t, tt, locale, formatDate } = useI18n();
  const [activeTab, setActiveTab] = useState<"details" | "preview">("details");

  const renderValue = (val: string | number | null | undefined) => {
    if (val === null || val === undefined || String(val).trim() === "") {
      return (
        <span
          className="missing-field"
          style={{
            color: "#839288",
            fontStyle: "italic",
            fontWeight: 400,
            fontSize: "12px",
          }}
        >
          {t("field_not_found_in_doc")}
        </span>
      );
    }
    return <strong>{String(val)}</strong>;
  };

  const getPartyFields = () => {
    if (doc.category === "KHATIAN" || doc.category === "PORCHA") {
      return (
        <div className="grid two" style={{ gap: "16px" }}>
          <div className="detail-item">
            <span className="field-label">{t("recorded_owner_label")}</span>
            <div className="field-value">
              {renderValue(doc.buyer_or_current_owner)}
            </div>
          </div>
          <div className="detail-item">
            <span className="field-label">{t("ownership_share_label")}</span>
            <div className="field-value">{renderValue(doc.share_identity)}</div>
          </div>
        </div>
      );
    }

    if (doc.category === "DEED") {
      let sellerLabel = t("seller_label");
      let buyerLabel = t("buyer_label");

      if (doc.sub_type === "HEBA_DANPATRA") {
        sellerLabel = t("donor_label");
        buyerLabel = t("donee_label");
      } else if (doc.sub_type === "OSIYATNAMA") {
        sellerLabel = t("testator_label");
        buyerLabel = t("beneficiary_label");
      } else if (doc.sub_type === "MORTGAGE") {
        sellerLabel = t("mortgagor_label");
        buyerLabel = t("mortgagee_label");
      } else if (doc.sub_type === "BANTONNAMA") {
        return (
          <div className="grid two" style={{ gap: "16px" }}>
            <div className="detail-item">
              <span className="field-label">{t("co_sharers_label")}</span>
              <div className="field-value">
                {renderValue(
                  [doc.buyer_or_current_owner, doc.seller_or_prior_owner]
                    .filter(Boolean)
                    .join(", ") || null,
                )}
              </div>
            </div>
            <div className="detail-item">
              <span className="field-label">{t("ownership_share_label")}</span>
              <div className="field-value">
                {renderValue(doc.share_identity)}
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="grid two" style={{ gap: "16px" }}>
          <div className="detail-item">
            <span className="field-label">{sellerLabel}</span>
            <div className="field-value">
              {renderValue(doc.seller_or_prior_owner)}
            </div>
          </div>
          <div className="detail-item">
            <span className="field-label">{buyerLabel}</span>
            <div className="field-value">
              {renderValue(doc.buyer_or_current_owner)}
            </div>
          </div>
          <div className="detail-item">
            <span className="field-label">{t("ownership_share_label")}</span>
            <div className="field-value">{renderValue(doc.share_identity)}</div>
          </div>
        </div>
      );
    }

    if (doc.category === "MUTATION") {
      return (
        <div className="grid two" style={{ gap: "16px" }}>
          <div className="detail-item">
            <span className="field-label">
              {t("applicant_new_owner_label")}
            </span>
            <div className="field-value">
              {renderValue(doc.buyer_or_current_owner)}
            </div>
          </div>
          <div className="detail-item">
            <span className="field-label">{t("prior_owner_label")}</span>
            <div className="field-value">
              {renderValue(doc.seller_or_prior_owner)}
            </div>
          </div>
          <div className="detail-item">
            <span className="field-label">{t("referenced_deed_label")}</span>
            <div className="field-value">{renderValue(doc.based_on_deed)}</div>
          </div>
          <div className="detail-item">
            <span className="field-label">{t("ownership_share_label")}</span>
            <div className="field-value">{renderValue(doc.share_identity)}</div>
          </div>
        </div>
      );
    }

    return null;
  };

  const landAreaString =
    doc.area_decimals != null
      ? formatLandArea(
          doc.area_decimals,
          doc.area_unit || (doc.extracted_json as any)?.area_unit,
          locale,
        )
      : land.total_area_decimals != null
        ? formatLandArea(
            land.total_area_decimals,
            (land as any).total_area_unit,
            locale,
          )
        : null;

  return (
    <div className="modal-backdrop">
      <section
        className="review-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t("doc_details_title")}
        style={{ width: "1060px", maxWidth: "100%", height: "92vh" }}
        data-testid="user-document-modal"
      >
        <div className="review-header">
          <div>
            <span className="kicker">
              {tt(categories[doc.category].bn)} · {tt(doc.sub_type)} ·{" "}
              {t("doc_details_title")}
            </span>
            <h2>{doc.official_number || doc.file_name}</h2>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <LanguageSwitch idPrefix="user-doc-locale" />
            {onViewSource ? (
              <button
                type="button"
                className="button outline small"
                onClick={() => onViewSource(doc)}
                data-testid="user-doc-view-source-btn"
              >
                <Eye size={13} /> {t("view_source_doc")}
              </button>
            ) : (
              <a
                href={"/api/service/document/" + doc.id}
                target="_blank"
                rel="noreferrer"
                className="button outline small"
                title={t("open_separately_c807b")}
              >
                {t("open_separately_c807b")} <ArrowUpRight size={13} />
              </a>
            )}
            <button
              className="icon-button"
              aria-label={t("cancel_action")}
              onClick={onClose}
              data-testid="close-user-doc-modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {categoryDocs.length > 1 && (
          <div
            style={{
              display: "flex",
              gap: "6px",
              padding: "8px 20px",
              background: "#f8fafc",
              borderBottom: "1px solid var(--line)",
              overflowX: "auto",
            }}
          >
            {categoryDocs.map((cd, idx) => (
              <button
                key={cd.id}
                type="button"
                className={
                  "button " +
                  (cd.id === doc.id ? "primary" : "outline") +
                  " small"
                }
                style={{ padding: "4px 10px", fontSize: "11px" }}
                onClick={() => onSelectDoc?.(cd)}
              >
                {cd.official_number || cd.file_name} ({idx + 1})
              </button>
            ))}
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: "12px",
            padding: "8px 20px",
            background: "#fff",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <button
            type="button"
            className={"button " + (activeTab === "details" ? "primary" : "ghost") + " small"}
            onClick={() => setActiveTab("details")}
            style={{ fontSize: "12px", padding: "6px 12px" }}
          >
            <FileText size={14} /> {t("doc_details_title")}
          </button>
          <button
            type="button"
            className={"button " + (activeTab === "preview" ? "primary" : "ghost") + " small"}
            onClick={() => setActiveTab("preview")}
            style={{ fontSize: "12px", padding: "6px 12px" }}
          >
            <Eye size={14} /> {t("original_source_70902")}
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px",
            background: "#fafbf9",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          {activeTab === "preview" ? (
            <div
              style={{
                flex: 1,
                minHeight: "520px",
                display: "flex",
                flexDirection: "column",
                background: "#f1f4ed",
                padding: "16px",
                borderRadius: "8px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "10px" }}>
                <a
                  href={"/api/service/document/" + doc.id}
                  target="_blank"
                  rel="noreferrer"
                  className="button outline small"
                >
                  {t("open_separately_c807b")} <ArrowUpRight size={13} />
                </a>
              </div>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  overflow: "hidden",
                }}
              >
                {doc.mime_type === DOCX_MIME ? (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      overflow: "auto",
                      background: "white",
                      padding: "16px",
                      borderRadius: "6px",
                    }}
                  >
                    <DocxPreview src={"/api/service/document/" + doc.id} />
                  </div>
                ) : doc.mime_type === "application/pdf" ? (
                  <iframe
                    title={t("original_document_92349")}
                    src={"/api/service/document/" + doc.id}
                    style={{
                      width: "100%",
                      height: "550px",
                      border: "1px solid #dbe3d4",
                      borderRadius: "6px",
                      background: "white",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      overflow: "auto",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={t("original_uploaded_document_a7e66")}
                      src={"/api/service/document/" + doc.id}
                      style={{
                        maxWidth: "100%",
                        maxHeight: "550px",
                        objectFit: "contain",
                        borderRadius: "6px",
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Privacy and Verification Banner */}
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: "8px",
                  padding: "14px 18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#166534" }}>
                  <ShieldCheck size={18} />
                  <strong style={{ fontSize: "13px" }}>{t("citizen_doc_preview_note")}</strong>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#6b7280", fontSize: "11px" }}>
                  <Lock size={12} />
                  <span>{t("officer_audit_restricted_note")}</span>
                </div>
              </div>

              {/* Status Header Strip */}
              <div
                style={{
                  background: "white",
                  border: "1px solid var(--line)",
                  borderRadius: "8px",
                  padding: "16px 20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div>
                  <span style={{ fontSize: "11px", color: "#6b7280" }}>
                    {t("doc_verification_status")}
                  </span>
                  <div style={{ marginTop: "4px" }}>
                    <span
                      className={
                        "badge " +
                        (doc.verification_status === "VERIFIED"
                          ? "green"
                          : doc.verification_status === "NEEDS_CORRECTION"
                            ? "red"
                            : "amber")
                      }
                      style={{ fontSize: "12px", padding: "4px 10px" }}
                    >
                      {doc.verification_status === "VERIFIED"
                        ? t("verified")
                        : doc.verification_status === "NEEDS_CORRECTION"
                          ? t("discrepancy_found")
                          : t("verification_underway")}
                    </span>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: "11px", color: "#6b7280" }}>
                    {t("record_date_e274d")}
                  </span>
                  <div style={{ marginTop: "2px" }}>
                    {doc.document_date
                      ? renderValue(formatDate(doc.document_date))
                      : renderValue(null)}
                  </div>
                </div>

                {doc.category === "DEED" && (
                  <div>
                    <span style={{ fontSize: "11px", color: "#6b7280" }}>
                      {t("execution_date_67a7c")}
                    </span>
                    <div style={{ marginTop: "2px" }}>
                      {doc.execution_date
                        ? renderValue(formatDate(doc.execution_date))
                        : renderValue(null)}
                    </div>
                  </div>
                )}

                <div>
                  <span style={{ fontSize: "11px", color: "#6b7280" }}>
                    {t("original_source_70902")}
                  </span>
                  <div style={{ marginTop: "2px" }}>
                    <button
                      type="button"
                      className="button outline small"
                      onClick={() => setActiveTab("preview")}
                      style={{ padding: "4px 10px", fontSize: "11px" }}
                    >
                      <Eye size={12} /> {t("preview_action")}
                    </button>
                  </div>
                </div>
              </div>

              {/* Grid with Structured Sections */}
              <div className="grid two" style={{ gap: "18px" }}>
                {/* General Information Card */}
                <div
                  style={{
                    background: "white",
                    border: "1px solid var(--line)",
                    borderRadius: "8px",
                    padding: "18px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid #f1f4ed", paddingBottom: "10px" }}>
                    <FileCheck2 size={18} color="var(--green)" />
                    <h3 style={{ fontSize: "14px", margin: 0 }}>{t("general_info")}</h3>
                  </div>

                  <div className="grid two" style={{ gap: "14px" }}>
                    <div className="detail-item">
                      <span className="field-label">{t("document_category")}</span>
                      <div className="field-value">
                        <strong>{tt(categories[doc.category].bn)}</strong>
                      </div>
                    </div>
                    <div className="detail-item">
                      <span className="field-label">{t("document_subtype")}</span>
                      <div className="field-value">
                        <strong>{tt(doc.sub_type)}</strong>
                      </div>
                    </div>
                    <div className="detail-item">
                      <span className="field-label">{t("document_number_06882")}</span>
                      <div className="field-value">{renderValue(doc.official_number)}</div>
                    </div>
                    <div className="detail-item">
                      <span className="field-label">{t("record_date_e274d")}</span>
                      <div className="field-value">
                        {doc.document_date
                          ? renderValue(formatDate(doc.document_date))
                          : renderValue(null)}
                      </div>
                    </div>
                    {doc.category === "DEED" && (
                      <div className="detail-item">
                        <span className="field-label">{t("execution_date_67a7c")}</span>
                        <div className="field-value">
                          {doc.execution_date
                            ? renderValue(formatDate(doc.execution_date))
                            : renderValue(null)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Parties Information Card */}
                <div
                  style={{
                    background: "white",
                    border: "1px solid var(--line)",
                    borderRadius: "8px",
                    padding: "18px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid #f1f4ed", paddingBottom: "10px" }}>
                    <Users size={18} color="var(--green)" />
                    <h3 style={{ fontSize: "14px", margin: 0 }}>{t("parties_info")}</h3>
                  </div>

                  {getPartyFields()}
                </div>
              </div>

              {/* Land Information Card */}
              <div
                style={{
                  background: "white",
                  border: "1px solid var(--line)",
                  borderRadius: "8px",
                  padding: "18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid #f1f4ed", paddingBottom: "10px" }}>
                  <MapPin size={18} color="var(--green)" />
                  <h3 style={{ fontSize: "14px", margin: 0 }}>{t("land_info")}</h3>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "16px",
                  }}
                >
                  <div className="detail-item">
                    <span className="field-label">{t("dag_number_03982")}</span>
                    <div className="field-value">{renderValue(doc.dag_number || land.dag_number)}</div>
                  </div>
                  <div className="detail-item">
                    <span className="field-label">{t("doc_area_label")}</span>
                    <div className="field-value">{renderValue(landAreaString)}</div>
                  </div>
                  <div className="detail-item">
                    <span className="field-label">{t("khatian_number_74e57")}</span>
                    <div className="field-value">
                      {renderValue(doc.khatian_ref || land.current_khatian_no)}
                    </div>
                  </div>
                  <div className="detail-item">
                    <span className="field-label">{t("mouza_d199e")}</span>
                    <div className="field-value">{renderValue(land.mouza)}</div>
                  </div>
                  <div className="detail-item">
                    <span className="field-label">{t("jl_number_31a6d")}</span>
                    <div className="field-value">{renderValue(land.jl_number)}</div>
                  </div>
                  <div className="detail-item">
                    <span className="field-label">{t("upazila_3b1b8")}</span>
                    <div className="field-value">{renderValue(land.upazila)}</div>
                  </div>
                  <div className="detail-item">
                    <span className="field-label">{t("district_9c833")}</span>
                    <div className="field-value">{renderValue(land.district)}</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
