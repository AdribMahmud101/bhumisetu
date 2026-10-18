"use client";
import { useI18n } from "@/i18n/provider";
import { Category, categoryFields, Fields, fieldLabels } from "@/lib/domain";
import { dateFromDisplay, dateToDisplay } from "@/lib/date-input";
import { useEffect, useRef, useState } from "react";

function ReviewDateInput({
  value,
  onChange,
  name,
  disabled,
  placeholder,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  name: string;
  disabled: boolean;
  placeholder: string;
}) {
  const [display, setDisplay] = useState(() => dateToDisplay(value));
  const lastSentRef = useRef<string | null>(value);

  useEffect(() => {
    if (value !== lastSentRef.current) {
      setDisplay(dateToDisplay(value));
      lastSentRef.current = value;
    }
  }, [value]);

  return (
    <input
      name={name}
      data-testid={name}
      disabled={disabled}
      type="text"
      placeholder={placeholder}
      value={display}
      onChange={(event) => {
        const next = event.target.value;
        setDisplay(next);
        if (!next.trim()) {
          lastSentRef.current = null;
          onChange(null);
        } else {
          const parsed = dateFromDisplay(next);
          const toSend = parsed || next;
          lastSentRef.current = toSend;
          onChange(toSend);
        }
      }}
      onBlur={() => {
        if (!display.trim()) {
          setDisplay("");
          lastSentRef.current = null;
          onChange(null);
        } else {
          const parsed = dateFromDisplay(display);
          if (parsed) {
            setDisplay(dateToDisplay(parsed));
            lastSentRef.current = parsed;
            onChange(parsed);
          }
        }
      }}
    />
  );
}

export default function DocumentFieldsEditor({
  fields,
  onChange,
  category,
  disabled = false,
  prefix = "edit-field-",
}: {
  fields: Fields;
  onChange: (fields: Fields, key: keyof Fields) => void;
  category?: Category | string;
  disabled?: boolean;
  prefix?: string;
}) {
  const { t, tt, locale } = useI18n();
  const rawKeys: (keyof Fields)[] =
    category && category in categoryFields
      ? categoryFields[category as Category]
      : (Object.keys(fieldLabels) as (keyof Fields)[]);
  const activeKeys = rawKeys.filter(
    (k) => k !== "share_identity" && k !== "area_unit",
  );
  return (
    <div className="form-grid document-fields-editor">
      {activeKeys.map((key) => (
        <label key={key}>
          {tt(fieldLabels[key])}
          {key === "area_decimals" ? (
            <div className="area-field-with-unit" style={{ display: "flex", gap: "8px" }}>
              <input
                name={prefix + key}
                data-testid={prefix + key}
                disabled={disabled}
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                placeholder={t("ocr_empty_placeholder")}
                value={fields[key as keyof Fields] ?? ""}
                onChange={(e) =>
                  onChange(
                    {
                      ...fields,
                      [key]:
                        e.target.value === "" ? null : Number(e.target.value),
                    },
                    key as keyof Fields,
                  )
                }
              />
              <select
                name={prefix + "area_unit"}
                data-testid="area-unit-select"
                disabled={disabled}
                value={fields.area_unit || "decimal"}
                onChange={(e) =>
                  onChange(
                    {
                      ...fields,
                      area_unit: e.target.value,
                    },
                    "area_unit" as keyof Fields,
                  )
                }
                style={{ width: "auto", minWidth: "96px", flexShrink: 0 }}
              >
                <option value="decimal">{t("unit_decimal")}</option>
                <option value="acre">{t("unit_acre")}</option>
                <option value="bigha">{t("unit_bigha")}</option>
                <option value="katha">{t("unit_katha")}</option>
                <option value="chhatak">{t("unit_chhatak")}</option>
              </select>
            </div>
          ) : key === "document_date" || key === "execution_date" ? (
            <ReviewDateInput
              name={prefix + key}
              disabled={disabled}
              placeholder={t("ocr_date_placeholder")}
              value={fields[key]}
              onChange={(value) => onChange({ ...fields, [key]: value }, key)}
            />
          ) : (
            <input
              name={prefix + key}
              data-testid={prefix + key}
              disabled={disabled}
              type="text"
              maxLength={500}
              placeholder={t("ocr_empty_placeholder")}
              value={fields[key as keyof Fields] ?? ""}
              onChange={(e) =>
                onChange(
                  {
                    ...fields,
                    [key]: e.target.value === "" ? null : e.target.value,
                  },
                  key as keyof Fields,
                )
              }
            />
          )}
        </label>
      ))}
    </div>
  );
}
