"use client";
import { useI18n } from "@/i18n/provider";
import { Category, categoryFields, Fields, fieldLabels } from "@/lib/domain";
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
  const activeKeys: (keyof Fields)[] =
    category && category in categoryFields
      ? categoryFields[category as Category]
      : (Object.keys(fieldLabels) as (keyof Fields)[]);
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
          ) : (
            <input
              name={prefix + key}
              data-testid={prefix + key}
              disabled={disabled}
              type="text"
              maxLength={key.includes("date") ? 10 : 500}
              pattern={key.includes("date") ? "\\d{4}-\\d{2}-\\d{2}" : undefined}
              placeholder={
                key.includes("date")
                  ? t("ocr_date_placeholder")
                  : t("ocr_empty_placeholder")
              }
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
