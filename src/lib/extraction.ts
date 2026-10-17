import "server-only";
import { createDeepInfraClient } from "./deepinfra";
import { parseExtractionResult } from "./extraction-result";
import { extractionPrompt } from "./extraction-prompt";
import { parseExtractionJson } from "./extraction-json";
import { groundExtraction } from "./extraction-grounding";
export async function extractPages(
  pages: string[],
  text: string,
  category: string,
  subtype: string,
  includeParcel = false,
) {
  if (!process.env.DEEPINFRA_API_KEY)
    throw new Error("DeepInfra is not configured");
  const result = await createDeepInfraClient().chat.completions.create(
    {
      model:
        process.env.DEEPINFRA_VISION_MODEL ||
        "Qwen/Qwen3-VL-235B-A22B-Instruct",
      temperature: 0,
      max_tokens: 3500,
      messages: [
        {
          role: "system",
          content: extractionPrompt(includeParcel),
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Category ${category}; subtype ${subtype}. Extract the JSON object from these pages. Selectable text:\n${text.slice(0, 40000)}`,
            },
            ...pages.map((url) => ({
              type: "image_url" as const,
              image_url: { url },
            })),
          ],
        },
      ],
    },
    { timeout: 60000, maxRetries: 0 },
  );
  const raw = result.choices[0]?.message.content || "";
  const parsed = parseExtractionJson(raw);
  const grounded = groundExtraction(parsed, text, category);
  return {
    ...parseExtractionResult(grounded.raw, category, includeParcel),
    evidence: grounded.evidence,
    original_model_fields: parsed,
    model: result.model,
    usage: result.usage,
  };
}
