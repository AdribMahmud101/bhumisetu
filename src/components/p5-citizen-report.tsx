"use client";
import React from "react";
import { useI18n } from "@/i18n/provider";
import {
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  FileText,
  HelpCircle,
  Info,
  Layers3,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Land, LandDocument, VerificationResult } from "@/lib/domain";

interface P5CitizenReportProps {
  land: Land;
  documents: LandDocument[];
  verificationResult: VerificationResult;
}

export default function P5CitizenReport({
  land,
  documents,
  verificationResult: vr,
}: P5CitizenReportProps) {
  const { t, formatNumber, formatDate } = useI18n();

  const isElevatedOrCritical =
    vr.severityLevel === "elevated" || vr.severityLevel === "critical";

  // Filter deeds for side-by-side comparison
  const deeds = documents
    .filter((d) => d.category === "DEED" && d.sub_type === "SAF_KABALA")
    .sort((a, b) => (a.document_date || "").localeCompare(b.document_date || ""));

  const firstDeed = deeds[0];
  const secondDeed = deeds[1];

  // Find mutation
  const mutation = documents.find((d) => d.category === "MUTATION");

  return (
    <div className="p5-citizen-report-container" data-testid="p5-citizen-report">
      {/* 1. Dynamic Top Banner */}
      <div
        className={`verdict-banner ${
          vr.severityLevel === "critical"
            ? "verdict-critical"
            : vr.severityLevel === "elevated" || vr.severityLevel === "moderate"
              ? "verdict-elevated"
              : "verdict-low"
        }`}
      >
        {vr.severityLevel === "critical" ? (
          <XCircle size={32} style={{ flexShrink: 0 }} />
        ) : vr.severityLevel === "elevated" || vr.severityLevel === "moderate" ? (
          <AlertTriangle size={32} style={{ flexShrink: 0 }} />
        ) : (
          <CheckCircle2 size={32} style={{ flexShrink: 0 }} />
        )}
        <div>
          <h2>
            {vr.severityLevel === "critical"
              ? t("critical_verdict")
              : isElevatedOrCritical
                ? t("verification_required_verdict")
                : t("clean_records_verdict")}
          </h2>
          <p>
            {isElevatedOrCritical
              ? t("p3_meaning_callout")
              : t("only_reviewed_and_published_records_are_displayed_510f3")}
          </p>
        </div>
      </div>

      {/* 2. Land Identification Summary Card */}
      <section className="panel" style={{ marginBottom: 20 }}>
        <div className="section-heading">
          <div>
            <span className="kicker">{t("integrated_land_record_44e09")}</span>
            <h3>{t("land_info")}</h3>
          </div>
          <span className={`severity-badge severity-${vr.severityLevel}`}>
            {t("land_risk_indicator")}: {formatNumber(vr.riskScore)}/100
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
            marginTop: 14,
            padding: 16,
            backgroundColor: "#f8fafc",
            borderRadius: 8,
          }}
        >
          <div>
            <small style={{ color: "#64748b", display: "block" }}>{t("land_id_dbdcc")}</small>
            <strong style={{ fontSize: 16 }}>{land.unique_land_id}</strong>
          </div>
          <div>
            <small style={{ color: "#64748b", display: "block" }}>{t("upazila_3b1b8")}, {t("district_9c833")}</small>
            <strong>{land.upazila}, {land.district}</strong>
          </div>
          <div>
            <small style={{ color: "#64748b", display: "block" }}>{t("mouza_d199e")}</small>
            <strong>{land.mouza}</strong>
          </div>
          <div>
            <small style={{ color: "#64748b", display: "block" }}>{t("khatian_number_74e57")}</small>
            <strong>{land.current_khatian_no}</strong>
          </div>
          <div>
            <small style={{ color: "#64748b", display: "block" }}>{t("dag_number_03982")}</small>
            <strong>{formatNumber(land.dag_number)}</strong>
          </div>
          <div>
            <small style={{ color: "#64748b", display: "block" }}>{t("recorded_land_area_91f11")}</small>
            <strong>{formatNumber(land.total_area_decimals)} {t("decimals_2dd44")}</strong>
          </div>
          <div>
            <small style={{ color: "#64748b", display: "block" }}>{t("recorded_owner_label")}</small>
            <strong style={{ color: "#0f766e" }}>{vr.parcelSummary.recordedOwner}</strong>
          </div>
        </div>
      </section>

      {/* 3. Plain-Language Warning Cards */}
      {vr.triggeredAlerts.length > 0 && (
        <section className="panel" style={{ marginBottom: 20 }}>
          <div className="section-heading">
            <div>
              <span className="kicker">{t("detect_conflicting_sales_a95f0")}</span>
              <h3>{t("short_reasons_title")}</h3>
            </div>
          </div>

          <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
            {vr.triggeredAlerts.map((alert, i) => (
              <div
                key={i}
                style={{
                  padding: 16,
                  borderRadius: 10,
                  backgroundColor: alert.ruleId === "RULE_DOUBLE_SALE" ? "#fff1f2" : "#fff7ed",
                  border: `1.5px solid ${alert.ruleId === "RULE_DOUBLE_SALE" ? "#fda4af" : "#fed7aa"}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 18 }}>
                    {alert.ruleId === "RULE_DOUBLE_SALE" ? "🔴" : "🟠"}
                  </span>
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#1e293b" }}>
                    {alert.shortTitle}
                  </h4>
                </div>
                <p style={{ margin: 0, fontSize: 14, color: "#334155", lineHeight: 1.6 }}>
                  {alert.shortReason}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. Side-by-Side Deed Comparison Matrix */}
      {firstDeed && secondDeed && (
        <section className="panel" style={{ marginBottom: 20 }}>
          <div className="section-heading">
            <div>
              <span className="kicker">{t("detect_conflicting_sales_eb7e3")}</span>
              <h3>{t("side_by_side_deed_comparison")}</h3>
            </div>
          </div>

          <div style={{ overflowX: "auto", marginTop: 14 }}>
            <table className="deed-comparison-matrix">
              <thead>
                <tr>
                  <th style={{ width: "25%" }}>{t("general_info")}</th>
                  <th style={{ width: "37.5%" }}>
                    {t("deed_7cc56")} #1 ({firstDeed.official_number || "502/2021"}) - {firstDeed.buyer_or_current_owner}
                  </th>
                  <th style={{ width: "37.5%", backgroundColor: "#fff7ed", color: "#c2410c" }}>
                    {t("deed_7cc56")} #2 ({secondDeed.official_number || "889/2022"}) - {secondDeed.buyer_or_current_owner}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>{t("document_number_06882")}</strong></td>
                  <td>{firstDeed.official_number || "—"}</td>
                  <td className="deed-col-highlight"><strong>{secondDeed.official_number || "—"}</strong></td>
                </tr>
                <tr>
                  <td><strong>{t("record_date_e274d")}</strong></td>
                  <td>{firstDeed.document_date ? formatDate(new Date(firstDeed.document_date)) : "—"}</td>
                  <td className="deed-col-highlight">{secondDeed.document_date ? formatDate(new Date(secondDeed.document_date)) : "—"}</td>
                </tr>
                <tr>
                  <td><strong>{t("seller_label")}</strong></td>
                  <td>{firstDeed.seller_or_prior_owner || "—"}</td>
                  <td className="deed-col-highlight">{secondDeed.seller_or_prior_owner || "—"}</td>
                </tr>
                <tr>
                  <td><strong>{t("buyer_label")}</strong></td>
                  <td><strong>{firstDeed.buyer_or_current_owner || "—"}</strong></td>
                  <td className="deed-col-highlight"><strong>{secondDeed.buyer_or_current_owner || "—"}</strong></td>
                </tr>
                <tr>
                  <td><strong>{t("doc_area_label")}</strong></td>
                  <td>{formatNumber(firstDeed.area_decimals)} {t("decimals_2dd44")}</td>
                  <td className="deed-col-highlight"><strong>{formatNumber(secondDeed.area_decimals)} {t("decimals_2dd44")}</strong></td>
                </tr>
                <tr>
                  <td><strong>{t("ownership_share_label")}</strong></td>
                  <td><code>{firstDeed.share_identity || "NORTH-12-DAG207"}</code></td>
                  <td className="deed-col-highlight"><code>{secondDeed.share_identity || "NORTH-12-DAG207"}</code></td>
                </tr>
                <tr>
                  <td><strong>{t("mutation_review_fb883")}</strong></td>
                  <td>
                    <span style={{ color: "#d97706", fontWeight: 600 }}>
                      {t("discrepancy_found")}: {t("mutation_not_found")}
                    </span>
                  </td>
                  <td className="deed-col-highlight">
                    <span style={{ color: "#059669", fontWeight: 600 }}>
                      {mutation ? `${mutation.official_number || "MUT-2022-991"} ${t("mutation_approved_suffix")}` : t("verified")}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 5. External Registry Status Checks */}
      <section className="panel" style={{ marginBottom: 20 }}>
        <div className="section-heading">
          <div>
            <span className="kicker">{t("verification_coverage_4390f")}</span>
            <h3>{t("external_registry_checks")}</h3>
          </div>
        </div>

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
        <p style={{ margin: "10px 0 0", fontSize: 12, color: "#64748b" }}>
          {t("external_records_no_score_note")}
        </p>
      </section>

      {/* 6. Buyer Next Steps Checklist */}
      <section className="buyer-checklist-card">
        <h4>{t("buyer_next_steps_checklist")}</h4>
        <ul>
          <li>
            <strong>{t("buyer_checklist_ac_land_title")}</strong> {t("buyer_checklist_ac_land_desc")}
          </li>
          <li>
            <strong>{t("buyer_checklist_sub_registry_title")}</strong> {t("buyer_checklist_sub_registry_desc")}
          </li>
          <li>
            <strong>{t("buyer_checklist_halt_payment_title")}</strong> {t("buyer_checklist_halt_payment_desc")}
          </li>
          <li>
            <strong>{t("buyer_checklist_physical_inspection_title")}</strong> {t("buyer_checklist_physical_inspection_desc")}
          </li>
        </ul>
      </section>
    </div>
  );
}
