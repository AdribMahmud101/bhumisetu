"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import DocumentFieldsEditor from "./document-fields-editor";
import { X, Loader2 } from "lucide-react";
import { LanguageSwitch, useI18n } from "@/i18n/provider";
import { categories, Category, emptyFields, Fields } from "@/lib/domain";
import { prepareDocument } from "@/lib/pdf-client";
import { DOCUMENT_ACCEPT } from "@/lib/document-types";

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
  if (!response.ok)
    throw Object.assign(new Error(data.error || "Request failed"), {
      status: response.status,
    });
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
  const [preview, setPreview] = useState<string[]>([]);
  const [documentFields, setDocumentFields] = useState<Fields>({
    ...emptyFields,
  });
  const documentEdits = useRef(new Set<keyof Fields>());
  const [restoring, setRestoring] = useState(true);
  const [saving, setSaving] = useState(false);
  const abandoned = useRef(false);
  const restored = useRef(false);
  const edited = useRef(new Set<string>());
  const latest = useRef<{ id: string; updated: number } | null>(null);
  const fields = [
    ["district", t("district_9c833")],
    ["upazila", t("upazila_3b1b8")],
    ["mouza", t("mouza_d199e")],
    ["jl_number", t("jl_number_31a6d")],
    ["dag_number", t("dag_number_03982")],
    ["current_khatian_no", t("khatian_number_74e57")],
    ["total_area_decimals", t("land_area_decimals_9095e")],
  ];
  const load = useCallback((data: any) => {
    if (abandoned.current) return;
    const updated = Date.parse(data.updated_at) || 0;
    if (
      latest.current &&
      latest.current.id === data.id &&
      updated < latest.current.updated
    )
      return;
    latest.current = { id: data.id, updated };
    setIntake(data);
    setDocumentFields((previous) => ({
      ...previous,
      ...Object.fromEntries(
        Object.entries(data.extracted_fields || {}).filter(
          ([key]) => !documentEdits.current.has(key as keyof Fields),
        ),
      ),
    }));
    setValues((previous) => ({
      ...previous,
      ...Object.fromEntries(
        Object.entries(data.parcel_fields || {})
          .filter(([key]) => !edited.current.has(key))
          .map(([key, value]) => [key, value == null ? "" : String(value)]),
      ),
    }));
  }, []);
  const extract = useCallback(
    async (data: any, file?: File) => {
      if (abandoned.current) return;
      setBusy(true);
      setError("");
      setIntake({ ...data, status: "EXTRACTING" });
      try {
        if (!file) {
          const response = await fetch(
            "/api/service/intake-document/" + data.id,
          );
          if (!response.ok) throw new Error("Request failed");
          file = new File([await response.blob()], data.file_name, {
            type: data.mime_type,
          });
        }
        const content = await prepareDocument(file, { enhance: true });
        setPreview(content.pages);
        if (abandoned.current) return;
        load(await request("intake-extract/" + data.id, content));
      } catch (e) {
        if (abandoned.current) return;
        const errMessage =
          (e as Error).message || "Extraction timeout or network failure";
        setError(errMessage);
        try {
          const refreshed = await request("intake/" + data.id);
          if (refreshed.status === "EXTRACTING") {
            setIntake({
              ...refreshed,
              status: "FAILED",
              extraction_error: errMessage,
            });
          } else {
            setIntake(refreshed);
          }
        } catch {
          setIntake({
            ...data,
            status: "FAILED",
            extraction_error: errMessage,
          });
        }
      } finally {
        setBusy(false);
      }
    },
    [load],
  );
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const id = sessionStorage.getItem("bs-intake-id");
    if (!id) {
      setRestoring(false);
      return;
    }
    request("intake/" + id)
      .then(async (data) => {
        if (data.status === "ATTACHED")
          sessionStorage.removeItem("bs-intake-id");
        else {
          load(data);
          if (data.retry_recommended) await extract(data);
        }
      })
      .catch((e) => {
        if (e.status === 401 || e.status === 404)
          sessionStorage.removeItem("bs-intake-id");
        else setError(e.message);
      })
      .finally(() => setRestoring(false));
  }, [extract, load]);
  const intakeId = intake?.id;
  const intakeStatus = intake?.status;
  useEffect(() => {
    if (!intakeId) return;
    const update = () =>
      request("intake/" + intakeId)
        .then(load)
        .catch(() => {});
    const focus = () => {
      if (!busy) update();
    };
    window.addEventListener("focus", focus);
    const timer =
      intakeStatus === "EXTRACTING" ? setInterval(update, 3000) : undefined;
    return () => {
      window.removeEventListener("focus", focus);
      clearInterval(timer);
    };
  }, [intakeId, intakeStatus, busy, load]);
  function startNew() {
    sessionStorage.removeItem("bs-intake-id");
    edited.current.clear();
    documentEdits.current.clear();
    setDocumentFields({ ...emptyFields });
    setPreview([]);
    latest.current = null;
    setIntake(null);
    setValues({});
    setManual(false);
    setReason("");
    setError("");
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
            {/invalid_type|invalid_format|Invalid date/.test(error)
              ? t("intake_extraction_failed")
              : tt(error)}
          </p>
        )}
        {(busy || restoring || intake?.status === "EXTRACTING") && (
          <p role="status">
            <Loader2 className="animate-spin" size={18} />
            {t("intake_processing")}
          </p>
        )}

        {preview.length > 0 && (
          <details className="ocr-preview">
            <summary>{t("ocr_preview")}</summary>
            {preview.map((url, index) => (
              <Image
                key={index}
                src={url}
                alt={t("ocr_preview")}
                width={640}
                height={850}
                unoptimized
              />
            ))}
          </details>
        )}
        {!restoring && !intake && !manual && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              const form = new FormData(e.currentTarget);
              const file = form.get("file") as File;
              try {
                const data = await request("intake", form);
                if (abandoned.current) return;
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
                accept={DOCUMENT_ACCEPT}
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
                <strong role="status">
                  {intake.status === "READY"
                    ? t("intake_complete")
                    : intake.status === "FAILED"
                      ? t("intake_extraction_failed")
                      : t("intake_saved")}
                </strong>
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
                {intake.status !== "EXTRACTING" && (
                  <button
                    className="button"
                    disabled={busy || intake.status === "EXTRACTING"}
                    onClick={() => extract(intake)}
                  >
                    {intake.status === "READY"
                      ? t("ocr_reextract")
                      : t("intake_retry")}
                  </button>
                )}
                {intake.status !== "READY" && (
                  <button
                    type="button"
                    className="button"
                    disabled={busy || intake.status === "EXTRACTING"}
                    onClick={() => setManual(true)}
                  >
                    {t("intake_manual")}
                  </button>
                )}
                <button
                  type="button"
                  className="button"
                  disabled={busy || restoring || intake.status === "EXTRACTING"}
                  onClick={startNew}
                >
                  {t("intake_start_new")}
                </button>
              </div>
            )}
            {manual && !intake && (
              <button
                type="button"
                className="button"
                disabled={busy}
                onClick={() => {
                  setManual(false);
                  setError("");
                }}
              >
                {t("intake_back_upload")}
              </button>
            )}
            {(manual || intake?.status === "READY") && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  setError("");
                  try {
                    setSaving(true);
                    const land = Object.fromEntries(
                      fields.map(([key]) => [key, values[key] || ""]),
                    );
                    const result = intake
                      ? await request("intake-confirm/" + intake.id, {
                          land,
                          reason,
                          fields: documentFields,
                        })
                      : await request("create", land);
                    sessionStorage.removeItem("bs-intake-id");
                    onClose();
                    router.push("/admin/land/" + result.unique_land_id);
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                    setSaving(false);
                  }
                }}
              >
                {intake && (
                  <section className="ocr-field-review">
                    <h3>{t("ocr_edit_heading")}</h3>
                    <p className="muted">{t("ocr_edit_help")}</p>
                    <DocumentFieldsEditor
                      category={intake?.category || category}
                      fields={documentFields}
                      disabled={busy}
                      prefix="intake-edit-field-"
                      onChange={(next, key) => {
                        documentEdits.current.add(key);
                        setDocumentFields(next);
                      }}
                    />
                    <h3>{t("ocr_parcel_heading")}</h3>
                  </section>
                )}
                <div className="form-grid">
                  {fields.map(([key, title]) => (
                    <label key={key}>
                      {title}
                      <input
                        name={key}
                        placeholder={t("ocr_empty_placeholder")}
                        value={values[key] || ""}
                        onChange={(e) => {
                          edited.current.add(key);
                          setValues({ ...values, [key]: e.target.value });
                        }}
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
            )}
          </>
        )}
        <div className="intake-abort-actions">
          <button
            type="button"
            className="button intake-abort-button"
            data-testid="abort-intake"
            disabled={saving}
            onClick={() => {
              abandoned.current = true;
              sessionStorage.removeItem("bs-intake-id");
              onClose();
            }}
          >
            {t("intake_abort")}
          </button>
        </div>
      </section>
    </div>
  );
}
