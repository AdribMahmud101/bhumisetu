"use client";
import React from "react";
import { useI18n } from "@/i18n/provider";
import { fieldLabels, Fields } from "@/lib/domain";
import {
  UserCheck,
  Clock,
  ArrowRight,
  FileText,
  ShieldAlert,
  Edit3,
} from "lucide-react";

export interface AuditLogEntry {
  id: string;
  document_id: string;
  admin_id: string;
  field_name: string;
  previous_value: string | null;
  new_value: string | null;
  reason: string;
  created_at: string;
  document?: {
    id: string;
    official_number?: string | null;
    category?: string;
    sub_type?: string;
    doc_code?: string;
  } | null;
  land?: {
    id: string;
    unique_land_id: string;
    mouza?: string;
    upazila?: string;
    district?: string;
  } | null;
}

interface AuditTrailProps {
  logs: AuditLogEntry[];
  title?: string;
  subtitle?: string;
  emptyMessage?: string;
  compact?: boolean;
}

export function AuditTrail({
  logs,
  title,
  subtitle,
  emptyMessage,
  compact = false,
}: AuditTrailProps) {
  const { t, formatDate, tt } = useI18n();

  const getActionBadge = (field: string, prev: string | null, next: string | null) => {
    if (field === "verification_status") {
      if (next === "VERIFIED") {
        return {
          label: t("verified"),
          bg: "#ecfdf5",
          color: "#047857",
          border: "#a7f3d0",
        };
      }
      if (next === "NEEDS_CORRECTION") {
        return {
          label: t("discrepancy_found"),
          bg: "#fff1f2",
          color: "#be123c",
          border: "#fecdd3",
        };
      }
      return {
        label: t("verification_underway"),
        bg: "#fef3c7",
        color: "#b45309",
        border: "#fde68a",
      };
    }
    return {
      label: t("field_correction_action"),
      bg: "#eff6ff",
      color: "#1d4ed8",
      border: "#bfdbfe",
    };
  };

  return (
    <div className="audit-trail-container" data-testid="audit-trail-container">
      {title && (
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "#1e293b" }}>
            {title}
          </h3>
          {subtitle && (
            <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{subtitle}</p>
          )}
        </div>
      )}

      {!logs || logs.length === 0 ? (
        <div
          style={{
            padding: "24px 16px",
            textAlign: "center",
            backgroundColor: "#f8fafc",
            borderRadius: 8,
            border: "1px dashed #cbd5e1",
            color: "#64748b",
            fontSize: 13,
          }}
          data-testid="audit-trail-empty"
        >
          {emptyMessage || t("no_corrections_yet_64ac0")}
        </div>
      ) : (
        <div
          className="audit-timeline"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: compact ? 10 : 14,
          }}
        >
          {logs.map((log) => {
            const badge = getActionBadge(log.field_name, log.previous_value, log.new_value);
            const labelKey = fieldLabels[log.field_name as keyof typeof fieldLabels] || log.field_name;
            const fieldDisplay = tt(labelKey);

            return (
              <div
                key={log.id}
                className="audit-entry-card"
                style={{
                  backgroundColor: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  padding: compact ? "10px 14px" : "14px 16px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                  transition: "border-color 0.15s ease",
                }}
                data-testid={`audit-entry-${log.id}`}
              >
                {/* Header row: Actor & Action & Time */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {/* Actor Badge */}
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#334155",
                        backgroundColor: "#f1f5f9",
                        padding: "3px 8px",
                        borderRadius: 6,
                        border: "1px solid #cbd5e1",
                      }}
                    >
                      <UserCheck size={13} color="#059669" />
                      <span>{t("ac_land_officer_label")}</span>
                      <code style={{ fontSize: 11, color: "#64748b" }}>
                        ({log.admin_id.slice(0, 8)})
                      </code>
                    </span>

                    {/* Action Tag */}
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 4,
                        backgroundColor: badge.bg,
                        color: badge.color,
                        border: `1px solid ${badge.border}`,
                      }}
                    >
                      {badge.label}
                    </span>

                    {/* Associated Land Parcel (if present) */}
                    {log.land && (
                      <a
                        href={`/admin/land/${log.land.unique_land_id || log.land.id}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#059669",
                          backgroundColor: "#ecfdf5",
                          padding: "2px 8px",
                          borderRadius: 4,
                          border: "1px solid #a7f3d0",
                          textDecoration: "none",
                        }}
                      >
                        <span>{log.land.unique_land_id}</span>
                        {log.land.mouza && <span style={{ color: "#64748b", fontWeight: 400 }}>({log.land.mouza})</span>}
                      </a>
                    )}

                    {/* Associated Document (if present) */}
                    {log.document && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 11,
                          fontWeight: 500,
                          color: "#475569",
                          backgroundColor: "#f8fafc",
                          padding: "2px 6px",
                          borderRadius: 4,
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        <FileText size={11} />
                        <span>
                          {log.document.category} {log.document.official_number || log.document.doc_code || ""}
                        </span>
                      </span>
                    )}
                  </div>

                  {/* Timestamp */}
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                      color: "#64748b",
                    }}
                  >
                    <Clock size={12} />
                    <span>{formatDate(new Date(log.created_at), true)}</span>
                  </span>
                </div>

                {/* Diff section: Changed field previous -> new */}
                <div
                  style={{
                    backgroundColor: "#f8fafc",
                    border: "1px solid #f1f5f9",
                    borderRadius: 6,
                    padding: "8px 12px",
                    margin: "8px 0",
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 8,
                    fontSize: 12.5,
                  }}
                >
                  <strong style={{ color: "#334155", minWidth: 100 }}>
                    <Edit3 size={12} style={{ display: "inline", marginRight: 4 }} />
                    {fieldDisplay}:
                  </strong>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span
                      style={{
                        backgroundColor: "#fee2e2",
                        color: "#991b1b",
                        padding: "2px 6px",
                        borderRadius: 4,
                        textDecoration: "line-through",
                        fontSize: 12,
                      }}
                    >
                      {log.previous_value ?? t("empty_1aa25")}
                    </span>
                    <ArrowRight size={13} color="#94a3b8" />
                    <span
                      style={{
                        backgroundColor: "#dcfce7",
                        color: "#166534",
                        fontWeight: 600,
                        padding: "2px 6px",
                        borderRadius: 4,
                        fontSize: 12,
                      }}
                    >
                      {log.new_value ?? t("empty_1aa25")}
                    </span>
                  </div>
                </div>

                {/* Justification / Reason */}
                {log.reason && (
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 12,
                      color: "#475569",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 6,
                    }}
                  >
                    <span style={{ fontWeight: 600, color: "#64748b" }}>
                      {t("justification_label")}:
                    </span>
                    <span style={{ fontStyle: "italic" }}>“{log.reason}”</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
export default AuditTrail;
