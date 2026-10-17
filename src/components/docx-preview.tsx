"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useI18n } from "@/i18n/provider";
export default function DocxPreview({ src }: { src: string }) {
  const { t, tt } = useI18n();
  const [content, setContent] = useState<{
    text: string;
    images: string[];
  } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const urls: string[] = [];
    setContent(null);
    setError("");
    (async () => {
      const response = await fetch(src, { signal: controller.signal });
      if (!response.ok) throw new Error("Request failed");
      const { readDocx } = await import("@/lib/docx");
      const result = readDocx(new Uint8Array(await response.arrayBuffer()));
      if (controller.signal.aborted) return;
      for (const image of result.images)
        urls.push(
          URL.createObjectURL(
            new Blob([Uint8Array.from(image.bytes).buffer], {
              type: image.mime,
            }),
          ),
        );
      setContent({ text: result.text, images: urls });
    })().catch((e) => {
      if (!controller.signal.aborted) setError(e.message);
    });
    return () => {
      controller.abort();
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [src]);
  return (
    <div className="docx-preview" data-testid="docx-preview">
      <p className="muted">{t("docx_preview_note")}</p>
      {error ? (
        <p role="alert">{tt(error)}</p>
      ) : content ? (
        <>
          <pre>{content.text}</pre>
          {content.images.map((url, index) => (
            <Image
              key={url}
              src={url}
              alt={t("original_uploaded_document_a7e66")}
              unoptimized
              width={640}
              height={850}
            />
          ))}
        </>
      ) : (
        <p role="status">{t("docx_loading")}</p>
      )}
    </div>
  );
}
