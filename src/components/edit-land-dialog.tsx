"use client";
import { useState } from "react";
import { useI18n, LanguageSwitch } from "@/i18n/provider";
import { Land } from "@/lib/domain";
import { Check, Loader2, X } from "lucide-react";

export default function EditLandDialog({
  land,
  onClose,
  onSaved,
}: {
  land: Land;
  onClose: () => void;
  onSaved: (updatedLand: Land) => void;
}) {
  const { t, tt } = useI18n();
  const [district, setDistrict] = useState(land.district || "");
  const [upazila, setUpazila] = useState(land.upazila || "");
  const [mouza, setMouza] = useState(land.mouza || "");
  const [jlNumber, setJlNumber] = useState(land.jl_number || "");
  const [dagNumber, setDagNumber] = useState(land.dag_number || "");
  const [currentKhatianNo, setCurrentKhatianNo] = useState(
    land.current_khatian_no || "",
  );
  const [totalAreaDecimals, setTotalAreaDecimals] = useState(
    land.total_area_decimals ? String(land.total_area_decimals) : "",
  );
  const [isFinalized, setIsFinalized] = useState(Boolean(land.is_finalized));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const area = Number(totalAreaDecimals);
      if (Number.isNaN(area) || area <= 0) {
        throw new Error(t("ocr_invalid_fields"));
      }
      const res = await fetch(`/api/service/update-land/${land.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          district,
          upazila,
          mouza,
          jl_number: jlNumber,
          dag_number: dagNumber,
          current_khatian_no: currentKhatianNo,
          total_area_decimals: area,
          is_finalized: isFinalized,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      onSaved(data.land);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save changes");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-land-title"
        data-testid="edit-land-dialog"
      >
        <div className="flex-between">
          <h2 id="edit-land-title">{t("edit_land_heading")}</h2>
          <LanguageSwitch idPrefix="edit-dialog-locale" />
          <button
            className="icon-button"
            disabled={busy}
            onClick={onClose}
            aria-label={t("cancel_action")}
            data-testid="edit-land-cancel"
          >
            <X size={18} />
          </button>
        </div>

        <p className="muted">{t("edit_land_help")}</p>

        {error && (
          <p role="alert" className="notice">
            {tt(error)}
          </p>
        )}

        <form onSubmit={handleSave}>
          <div className="form-grid">
            <label>
              {t("district_9c833")}
              <input
                required
                data-testid="edit-land-district"
                value={district}
                disabled={busy}
                onChange={(e) => setDistrict(e.target.value)}
              />
            </label>
            <label>
              {t("upazila_3b1b8")}
              <input
                required
                data-testid="edit-land-upazila"
                value={upazila}
                disabled={busy}
                onChange={(e) => setUpazila(e.target.value)}
              />
            </label>
            <label>
              {t("mouza_d199e")}
              <input
                required
                data-testid="edit-land-mouza"
                value={mouza}
                disabled={busy}
                onChange={(e) => setMouza(e.target.value)}
              />
            </label>
            <label>
              {t("jl_number_31a6d")}
              <input
                data-testid="edit-land-jl"
                value={jlNumber}
                disabled={busy}
                onChange={(e) => setJlNumber(e.target.value)}
              />
            </label>
            <label>
              {t("dag_number_03982")}
              <input
                required
                data-testid="edit-land-dag"
                value={dagNumber}
                disabled={busy}
                onChange={(e) => setDagNumber(e.target.value)}
              />
            </label>
            <label>
              {t("khatian_number_74e57")}
              <input
                data-testid="edit-land-khatian"
                value={currentKhatianNo}
                disabled={busy}
                onChange={(e) => setCurrentKhatianNo(e.target.value)}
              />
            </label>
            <label>
              {t("land_area_decimals_9095e")}
              <input
                required
                data-testid="edit-land-area"
                type="number"
                step="0.01"
                min="0.01"
                value={totalAreaDecimals}
                disabled={busy}
                onChange={(e) => setTotalAreaDecimals(e.target.value)}
              />
            </label>
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              margin: "18px 0",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              data-testid="edit-land-published"
              checked={isFinalized}
              disabled={busy}
              onChange={(e) => setIsFinalized(e.target.checked)}
              style={{ width: "18px", height: "18px" }}
            />
            <span>{t("published_status_label")}</span>
          </label>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              marginTop: "20px",
            }}
          >
            <button
              type="button"
              className="button outline"
              disabled={busy}
              onClick={onClose}
            >
              {t("cancel_action")}
            </button>
            <button
              type="submit"
              data-testid="edit-land-submit"
              className="button primary"
              disabled={busy}
            >
              {busy ? (
                <>
                  <Loader2 size={16} className="spin" /> {t("saving_changes")}
                </>
              ) : (
                <>
                  <Check size={16} /> {t("save_changes")}
                </>
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
