"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2 } from "lucide-react";
import { LanguageSwitch, useI18n } from "@/i18n/provider";
import { categories, Category } from "@/lib/domain";
import { prepareDocument } from "@/lib/pdf-client";

async function request(path: string, body?: unknown) {
  const response = await fetch("/api/service/" + path, {
    method: body ? "POST" : "GET",
    headers:
      body && !(body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : undefined,
    body:
      body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}
export default function CreateLandDialog({ onClose }: { onClose: () => void }) {
  const { t, tt } = useI18n();
  const router = useRouter();
  const [category, setCategory] = useState<Category>("KHATIAN");
  const [subtype, setSubtype] = useState("RS");
  const [intake, setIntake] = useState<any>(null);
  const [manual, setManual] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");
  const fields = [
    ["district", t("district_9c833")],
    ["upazila", t("upazila_3b1b8")],
    ["mouza", t("mouza_d199e")],
    ["jl_number", t("jl_number_31a6d")],
    ["dag_number", t("dag_number_03982")],
    ["current_khatian_no", t("khatian_number_74e57")],
    ["total_area_decimals", t("land_area_decimals_9095e")],
  ];
  function load(data: any) {
    setIntake(data);
    setValues(
      Object.fromEntries(
        Object.entries(data.parcel_fields || {}).map(([key, value]) => [
          key,
          value == null ? "" : String(value),
        ]),
      ),
    );
  }
  useEffect(() => {
    const id = sessionStorage.getItem("bs-intake-id");
    if (id)
      request("intake/" + id)
        .then((data) => {
          if (data.status === "ATTACHED")
            sessionStorage.removeItem("bs-intake-id");
          else load(data);
        })
        .catch(() => sessionStorage.removeItem("bs-intake-id"));
  }, []);
  useEffect(() => {
    if (intake?.status !== "EXTRACTING") return;
    const timer = setInterval(
      () =>
        request("intake/" + intake.id)
          .then(load)
          .catch(() => {}),
      3000,
    );
    return () => clearInterval(timer);
  }, [intake?.id, intake?.status]);
  async function extract(data: any, file?: File) {
    setBusy(true);
    setError("");
    try {
      if (!file) {
        const response = await fetch("/api/service/intake-document/" + data.id);
        if (!response.ok) throw new Error("Request failed");
        file = new File([await response.blob()], data.file_name, {
          type: data.mime_type,
        });
      }
      const content = await prepareDocument(file);
      load(await request("intake-extract/" + data.id, content));
    } catch (e) {
      setError((e as Error).message);
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
        aria-labelledby="intake-title"
      >
        <div className="flex-between">
          <h2 id="intake-title">{t("create_land_record_8f76d")}</h2>
          <LanguageSwitch idPrefix="dialog-locale" />
          <button
            className="icon-button"
            aria-label={t("close_7d9eb")}
            onClick={onClose}
          >
            <X />
          </button>
        </div>
        <p className="muted">{t("intake_intro")}</p>
        {error && (
          <p role="alert" className="notice">
            {tt(error)}
          </p>
        )}
        {busy && (
          <p role="status">
            <Loader2 className="animate-spin" size={18} />
            {t("intake_processing")}
          </p>
        )}
        {!intake && !manual && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              const form = new FormData(e.currentTarget);
              const file = form.get("file") as File;
              try {
                const data = await request("intake", form);
                sessionStorage.setItem("bs-intake-id", data.id);
                load(data);
                await extract(data, file);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="form-grid">
              <label>
                {t("intake_category")}
                <select
                  name="category"
                  value={category}
                  onChange={(e) => {
                    const key = e.target.value as Category;
                    setCategory(key);
                    setSubtype(categories[key].types[0]);
                  }}
                >
                  {Object.entries(categories).map(([key, item]) => (
                    <option key={key} value={key}>
                      {tt(item.bn)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("document_type_82172")}
                <select
                  name="subtype"
                  value={subtype}
                  onChange={(e) => setSubtype(e.target.value)}
                >
                  {categories[category].types.map((type) => (
                    <option key={type} value={type}>
                      {tt(type)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              {t("intake_file")}
              <input
                name="file"
                type="file"
                accept="application/pdf,image/png,image/jpeg"
                required
                disabled={busy}
              />
            </label>
            <p className="muted">{t("intake_limits")}</p>
            <button className="button primary" disabled={busy}>
              {t("intake_upload")}
            </button>
            <button
              type="button"
              className="button"
              disabled={busy}
              onClick={() => setManual(true)}
            >
              {t("intake_manual")}
            </button>
          </form>
        )}
        {(intake || manual) && (
          <>
            {intake && (
              <div className="notice">
                <strong>{t("intake_saved")}</strong>
                <p>{intake.file_name}</p>
                <a
                  href={"/api/service/intake-document/" + intake.id}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("intake_original")}
                </a>
                <p>
                  {intake.status === "READY"
                    ? t("intake_confirm_help")
                    : t("intake_retry_help")}
                </p>
                {intake.status !== "READY" && (
                  <button
                    className="button"
                    disabled={busy || intake.status === "EXTRACTING"}
                    onClick={() => extract(intake)}
                  >
                    {t("intake_retry")}
                  </button>
                )}
              </div>
            )}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError("");
                try {
                  const land = Object.fromEntries(
                    fields.map(([key]) => [key, values[key] || ""]),
                  );
                  const result = intake
                    ? await request("intake-confirm/" + intake.id, {
                        land,
                        reason,
                      })
                    : await request("create", land);
                  sessionStorage.removeItem("bs-intake-id");
                  onClose();
                  router.push("/admin/land/" + result.unique_land_id);
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <div className="form-grid">
                {fields.map(([key, title]) => (
                  <label key={key}>
                    {title}
                    <input
                      name={key}
                      value={values[key] || ""}
                      onChange={(e) =>
                        setValues({ ...values, [key]: e.target.value })
                      }
                      required={
                        !["jl_number", "current_khatian_no"].includes(key)
                      }
                      type={key === "total_area_decimals" ? "number" : "text"}
                      step="0.01"
                      min={key === "total_area_decimals" ? "0.01" : undefined}
                    />
                  </label>
                ))}
              </div>
              {intake && (
                <label>
                  {t("intake_reason")}
                  <textarea
                    name="reason"
                    required
                    minLength={3}
                    maxLength={1000}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </label>
              )}
              <p className="muted">{t("intake_pending")}</p>
              <button
                className="button primary"
                disabled={busy || intake?.status === "EXTRACTING"}
              >
                {intake ? t("intake_confirm") : t("create_draft_7f2d7")}
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
