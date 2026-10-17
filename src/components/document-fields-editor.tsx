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
  const { t, tt } = useI18n();
  const activeKeys: (keyof Fields)[] =
    category && category in categoryFields
      ? categoryFields[category as Category]
      : (Object.keys(fieldLabels) as (keyof Fields)[]);
  return (
    <div className="form-grid document-fields-editor">
      {activeKeys.map((key) => (
        <label key={key}>
          {tt(fieldLabels[key])}
          <input
            name={prefix + key}
            data-testid={prefix + key}
            disabled={disabled}
            type={key === "area_decimals" ? "number" : "text"}
            inputMode={key === "area_decimals" ? "decimal" : undefined}
            step="0.01"
            min={key === "area_decimals" ? "0.01" : undefined}
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
                  [key]:
                    e.target.value === ""
                      ? null
                      : key === "area_decimals"
                        ? Number(e.target.value)
                        : e.target.value,
                },
                key as keyof Fields,
              )
            }
          />
        </label>
      ))}
    </div>
  );
}
