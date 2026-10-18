"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/i18n/provider";
import {
  Check,
  CheckCircle2,
  FileText,
  Layers3,
  ShieldAlert,
  ShieldCheck,
  History,
} from "lucide-react";
import { Land, LandDocument, VerificationResult } from "@/lib/domain";
import { AuditTrail, AuditLogEntry } from "./audit-trail";

interface P3ReportProps {
  land: Land;
  documents: LandDocument[];
  verificationResult: VerificationResult;
  onReviewed?: () => void;
}

export default function P3ReportView({
  land,
  documents,
  verificationResult: vr,
  onReviewed,
}: P3ReportProps) {
  const { t, formatNumber, formatDate } = useI18n();
  const [reviewed, setReviewed] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoadingAudit(true);
      const res = await fetch(`/api/service/audit/${land.unique_land_id || land.id}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setAuditLogs(data);
      }
    } catch (e) {
      console.error("Failed to load audit logs:", e);
    } finally {
      setLoadingAudit(false);
    }
  }, [land.unique_land_id, land.id]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const handleMarkReviewed = async () => {
    setReviewing(true);
    try {
      const res = await fetch(
        `/api/service/mark-reviewed/${land.unique_land_id || land.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            notes: "Officer marked fraud & double-selling verification as reviewed",
          }),
        },
      );
      if (res.ok) {
        setReviewed(true);
        if (onReviewed) onReviewed();
      }
    } catch (e) {
      console.error("Failed to mark reviewed:", e);
    } finally {
      setReviewing(false);
    }
  };

  const severityClass = `severity-${vr.severityLevel}`;
  const fillClass = `fill-${vr.severityLevel}`;
  const squareClass = `square-${vr.severityLevel}`;

  // Find conflicting deeds / documents
  const conflictingDocs = documents.filter((d) =>
    vr.triggeredAlerts.some((a) => a.evidenceDocs.includes(d.id)),
  );

  return (
    <div className="p3-report-container">
      {/* 1. Risk Score Card with Dynamic Redness */}
      <section className="panel risk-score-panel" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <span className="kicker" style={{ fontSize: 13, fontWeight: 700, color: "#1e5e3a" }}>
              {t("rule_based_risk_indicator_f4894")}
            </span>
            <h2 style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 700 }}>
              {t("land_risk_indicator")}
            </h2>
          </div>
          <span className={`severity-badge ${severityClass}`}>
            {vr.severityLevel === "low" ? (
              <ShieldCheck size={15} />
            ) : (
              <ShieldAlert size={15} />
            )}
            {vr.severityLevel === "critical"
              ? t("critical_conflict_indicator")
              : vr.severityLevel === "elevated"
                ? t("elevated_risk_indicator")
                : vr.severityLevel === "moderate"
                  ? t("moderate_risk_indicator")
                  : t("low_risk_indicator")}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "14px 0 8px" }}>
          <strong data-testid="risk-indicator-score" style={{ fontSize: 46, fontWeight: 800, lineHeight: 1 }}>
            {formatNumber(vr.riskScore)}
          </strong>
          <span style={{ fontSize: 20, fontWeight: 600, color: "#64748b" }}>
            / {formatNumber(vr.maxScore)}
          </span>
          <span style={{ fontSize: 13, color: "#64748b", marginLeft: 12, fontWeight: 500 }}>
            {t("illustrative_rule_based_score")}
          </span>
        </div>

        {/* Visual Graph: Horizontal Two-Tone Progress Bar */}
        <div className="risk-progress-bar-container">
          <div className="risk-progress-track">
            <div
              className={`risk-progress-fill ${fillClass}`}
              style={{ width: `${Math.max(4, Math.min(100, vr.riskScore))}%` }}
            />
          </div>
          <div className="risk-progress-legend">
            <span>
              <i className={`legend-square ${squareClass}`} />
              {t("risk_score_legend")} ({formatNumber(vr.riskScore)}%)
            </span>
            <span>
              <i className="legend-square square-scale" />
              {t("remaining_scale_legend")} ({formatNumber(100 - vr.riskScore)}%)
            </span>
          </div>
        </div>

        {/* 2. Plain-Language Meaning Callout ("এর অর্থ কী?") */}
        <div className="p3-meaning-box">
          <h4>{t("what_does_this_mean")}</h4>
          <p>{t("p3_meaning_callout")}</p>
        </div>
      </section>

      {/* Five Mandatory Content Sections */}
      <div style={{ display: "grid", gap: 20 }}>
        {/* Section 1: Parcel & Risk Summary */}
        <section className="panel">
          <div className="section-heading">
            <div>
              <span className="kicker">{t("integrated_land_record_44e09")}</span>
              <h3>{t("land_info")}</h3>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginTop: 12 }}>
            <div>
              <small style={{ color: "#64748b", display: "block" }}>{t("land_id_dbdcc")}</small>
              <strong>{land.unique_land_id}</strong>
            </div>
            <div>
              <small style={{ color: "#64748b", display: "block" }}>{t("mouza_d199e")}</small>
              <strong>{land.mouza}</strong>
            </div>
            <div>
              <small style={{ color: "#64748b", display: "block" }}>{t("dag_number_03982")}</small>
              <strong>{formatNumber(land.dag_number)}</strong>
            </div>
            <div>
              <small style={{ color: "#64748b", display: "block" }}>{t("khatian_number_74e57")}</small>
              <strong>{land.current_khatian_no}</strong>
            </div>
            <div>
              <small style={{ color: "#64748b", display: "block" }}>{t("recorded_owner_label")}</small>
              <strong>{vr.parcelSummary.recordedOwner}</strong>
            </div>
            <div>
              <small style={{ color: "#64748b", display: "block" }}>{t("recorded_land_area_91f11")}</small>
              <strong>{formatNumber(land.total_area_decimals)} {t("decimals_2dd44")}</strong>
            </div>
          </div>
        </section>

        {/* Section 2: Short & Clear Detection Reasons */}
        <section className="panel" data-testid="p3-reasons-panel">
          <div className="section-heading">
            <div>
              <span className="kicker">{t("every_alert_has_a_source_80011")}</span>
              <h3>{t("short_reasons_title")}</h3>
            </div>
            <span className={`severity-badge ${severityClass}`}>
              {formatNumber(vr.triggeredAlerts.length)} {t("signals_c1d2c")}
            </span>
          </div>

          <div style={{ marginTop: 14 }}>
            {vr.triggeredAlerts.length ? (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
                {vr.triggeredAlerts.map((alert, idx) => (
                  <li
                    key={alert.ruleId + idx}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      padding: "12px 16px",
                      borderRadius: 8,
                      backgroundColor: "#fef2f2",
                      border: "1px solid #fecdd3",
                    }}
                  >
                    <span style={{ fontSize: 18, lineHeight: 1.2 }}>
                      🔴
                    </span>
                    <div style={{ flex: 1 }}>
                      <strong style={{ display: "block", fontSize: 14, color: "#1e293b", marginBottom: 2 }}>
                        {alert.shortTitle}
                      </strong>
                      <p style={{ margin: 0, fontSize: 13.5, color: "#334155", lineHeight: 1.5 }}>
                        {alert.shortReason}
                      </p>
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 4,
                        backgroundColor: "white",
                        color: alert.weight > 0 ? "#b91c1c" : "#64748b",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      {alert.weight > 0 ? `+${formatNumber(alert.weight)}` : `${formatNumber(0)} (dedup)`}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#059669" }}>
                <CheckCircle2 size={20} />
                <span>{t("clean_records_verdict")}</span>
              </div>
            )}
          </div>
        </section>

        {/* Section 3: Evidence Table */}
        <section className="panel" data-testid="p3-evidence-panel">
          <div className="section-heading">
            <div>
              <span className="kicker">{t("documents_58873")}</span>
              <h3>{t("evidence_conflict_table")}</h3>
            </div>
          </div>

          <div style={{ overflowX: "auto", marginTop: 14 }}>
            <table className="deed-comparison-matrix">
              <thead>
                <tr>
                  <th>{t("doc_code")}</th>
                  <th>{t("document_category")}</th>
                  <th>{t("document_number_06882")}</th>
                  <th>{t("record_date_e274d")}</th>
                  <th>{t("seller_label")}</th>
                  <th>{t("buyer_label")}</th>
                  <th>{t("doc_area_label")}</th>
                  <th>{t("ownership_share_label")}</th>
                </tr>
              </thead>
              <tbody>
                {conflictingDocs.length ? (
                  conflictingDocs.map((doc) => (
                    <tr key={doc.id} className={doc.category === "DEED" ? "deed-col-highlight" : undefined}>
                      <td><strong>{doc.doc_code || doc.id.slice(0, 8)}</strong></td>
                      <td>{doc.category} ({doc.sub_type})</td>
                      <td><strong>{doc.official_number || "—"}</strong></td>
                      <td>{doc.document_date ? formatDate(new Date(doc.document_date)) : "—"}</td>
                      <td>{doc.seller_or_prior_owner || "—"}</td>
                      <td>{doc.buyer_or_current_owner || "—"}</td>
                      <td><strong>{formatNumber(doc.area_decimals)} {t("decimals_2dd44")}</strong></td>
                      <td><code>{doc.share_identity || "—"}</code></td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", color: "#64748b", padding: 20 }}>
                      {t("clean_records_verdict")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 4: Coverage Matrix */}
        <section className="panel">
          <div className="section-heading">
            <div>
              <span className="kicker">{t("verification_coverage_4390f")}</span>
              <h3>{t("document_coverage_matrix")}</h3>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 10px", color: "#334155" }}>
              {t("reviewed_documents_307e7")} ({formatNumber(vr.coverage.checkedRecords.length)})
            </h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
              {vr.coverage.checkedRecords.map((rec, i) => (
                <span
                  key={i}
                  style={{
                    backgroundColor: "#f1f5f9",
                    padding: "4px 12px",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#334155",
                    border: "1px solid #cbd5e1",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <FileText size={14} color="#059669" />
                  {rec}
                </span>
              ))}
            </div>

            <h4 style={{ fontSize: 14, fontWeight: 700, margin: "16px 0 10px", color: "#334155" }}>
              {t("external_registry_checks")}
            </h4>
            <div className="external-checks-grid">
              {vr.coverage.missingOrExternalSources.map((ext, idx) => (
                <div key={idx} className="external-check-card">
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: "#1e293b" }}>
                    {ext.name}
                  </span>
                  <span className="badge-unavailable">
                    {t("not_checked_data_unavailable")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 5: Verification Status & Officer Actions */}
        <section className="panel" style={{ backgroundColor: "#fafaf9", border: "1px solid #e7e5e4" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
            <div>
              <span className="kicker">{t("verification_status_title")}</span>
              <h3 style={{ margin: "4px 0", fontSize: 16 }}>
                {vr.verificationStatus}
              </h3>
              <small style={{ color: "#78716c" }}>
                {t("human_review_20a6a")} · AC Land / Sub-Registry
              </small>
            </div>

            <div>
              {reviewed ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 16px",
                    borderRadius: 8,
                    backgroundColor: "#ecfdf5",
                    color: "#047857",
                    border: "1px solid #a7f3d0",
                    fontWeight: 700,
                  }}
                >
                  <Check size={16} />
                  {t("reviewed_by_officer")}
                </span>
              ) : (
                <button
                  type="button"
                  className="button primary"
                  onClick={handleMarkReviewed}
                  disabled={reviewing}
                  data-testid="mark-reviewed-btn"
                >
                  <CheckCircle2 size={16} />
                  <span>{reviewing ? t("loading_records_f15e0") : t("mark_as_reviewed")}</span>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Section 6: Audit Trail & Officer Activity Log ("Who Did What") */}
        <section className="panel" data-testid="p3-audit-trail-section">
          <div className="section-heading">
            <div>
              <span className="kicker">{t("transparency_and_audit_log")}</span>
              <h3>{t("officer_activity_audit_trail_title")}</h3>
            </div>
            <History size={20} color="#059669" />
          </div>

          <div style={{ marginTop: 14 }}>
            {loadingAudit ? (
              <div style={{ padding: "20px 0", textAlign: "center", color: "#64748b", fontSize: 13 }}>
                {t("loading_records_f15e0")}...
              </div>
            ) : (
              <AuditTrail
                logs={auditLogs}
                subtitle={t("officer_activity_audit_trail_desc")}
                emptyMessage={t("no_audit_events_recorded")}
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
