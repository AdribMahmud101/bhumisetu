import "server-only";
import OpenAI from "openai";
export const VISION_MODEL = "Qwen/Qwen2.5-VL-72B-Instruct";
export const REASONING_MODEL = "deepseek-ai/DeepSeek-V3";
export function createDeepInfraClient() {
  const apiKey = process.env.DEEPINFRA_API_KEY;
  if (!apiKey) throw new Error("Configure DEEPINFRA_API_KEY in .env.local.");
  return new OpenAI({ apiKey, baseURL: "https://api.deepinfra.com/v1/openai" });
}
