import { GoogleGenAI } from "@google/genai";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

let envLoaded = false;

function loadEnvFile(): void {
  if (envLoaded) return;
  envLoaded = true;
  try {
    const envPath = resolve(process.cwd(), ".env");
    if (existsSync(envPath)) {
      const content = readFileSync(envPath, "utf8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (process.env[key] === undefined) {
            process.env[key] = val;
          }
        }
      }
    }
  } catch {
    // Ignore error loading .env
  }
}

export function getLLMBaseUrl(): string {
  loadEnvFile();
  return (
    process.env.OPENAI_BASE_URL ||
    process.env.LLM_BASE_URL ||
    "https://api.openai.com/v1"
  );
}

export function getOpenAIApiKey(): string | null {
  loadEnvFile();
  const key =
    process.env.OPENAI_API_KEY ||
    process.env.LLM_API_KEY;
  return key && key.trim() !== "" ? key.trim() : null;
}

export function getGeminiApiKey(): string | null {
  loadEnvFile();
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
  return key && key.trim() !== "" ? key.trim() : null;
}

export function getLLMApiKey(): string | null {
  return getOpenAIApiKey() || getGeminiApiKey();
}

export function getLLMModel(): string {
  loadEnvFile();
  if (process.env.OPENAI_MODEL || process.env.LLM_MODEL) {
    return process.env.OPENAI_MODEL || process.env.LLM_MODEL || "auto:fast";
  }
  // If OpenAI key is present, default to OpenAI-compatible auto:fast
  if (getOpenAIApiKey()) {
    return "auto:fast";
  }
  return "gemini-3.5-flash-lite";
}

export function getGeminiModel(): string {
  return getLLMModel();
}

export interface LLMCallStats {
  promptTokens?: number;
  candidatesTokens?: number;
  totalTokens?: number;
  latencyMs: number;
}

export interface LLMCallResult<T> {
  data: T | null;
  stats: LLMCallStats;
  error?: string;
}

function cleanAndParseJSON<T>(rawText: string): T {
  const cleanJsonStr = rawText
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "");
  return JSON.parse(cleanJsonStr) as T;
}

/**
 * OpenAI-compatible execution for OpenAI, proxies, Groq, Ollama, etc.
 */
async function callOpenAICompatible<T>(
  apiKey: string,
  baseUrl: string,
  model: string,
  systemInstruction: string,
  userPrompt: string,
  timeoutMs: number
): Promise<LLMCallResult<T>> {
  const startTime = Date.now();
  const url = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;

  const candidateModels = [model];
  if (model === "auto:fast") {
    candidateModels.push("auto");
  } else if (model === "auto") {
    candidateModels.push("auto:fast");
  }

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`OpenAI API call timed out after ${timeoutMs}ms`)), timeoutMs)
  );

  const executePost = async (targetModel: string, sendJsonFormat: boolean = true) => {
    const payload: Record<string, unknown> = {
      model: targetModel,
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
    };
    if (sendJsonFormat) {
      payload.response_format = { type: "json_object" };
    }

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      // If proxy complains about response_format being unsupported, retry without it
      if (sendJsonFormat && res.status === 400 && errText.toLowerCase().includes("response_format")) {
        return executePost(targetModel, false);
      }
      throw new Error(`HTTP ${res.status}: ${errText}`);
    }

    const json = (await res.json()) as any;
    const choice = json.choices?.[0];
    const content = choice?.message?.content;
    if (!content) {
      throw new Error("Empty response content from OpenAI-compatible API");
    }

    const parsed = cleanAndParseJSON<T>(content);
    const latencyMs = Date.now() - startTime;
    const stats: LLMCallStats = {
      promptTokens: json.usage?.prompt_tokens,
      candidatesTokens: json.usage?.completion_tokens,
      totalTokens: json.usage?.total_tokens,
      latencyMs,
    };
    return { data: parsed, stats };
  };

  const callPromise = (async () => {
    let lastErr: any = null;
    for (const curModel of candidateModels) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          return await executePost(curModel);
        } catch (err: any) {
          lastErr = err;
          const msg = String(err?.message || err);
          if (
            attempt === 1 &&
            (msg.includes("429") ||
              msg.includes("503") ||
              msg.includes("UNAVAILABLE") ||
              msg.includes("high demand") ||
              msg.includes("rate limit"))
          ) {
            console.warn(`[OpenAI Provider] Model ${curModel} returned transient error (${msg}). Retrying in 1500ms...`);
            await new Promise((r) => setTimeout(r, 1500));
            continue;
          }
          break;
        }
      }
    }
    throw lastErr;
  })();

  const result = await Promise.race([callPromise, timeoutPromise]);
  return result;
}

/**
 * Direct Google GenAI SDK execution
 */
async function callGeminiDirect<T>(
  apiKey: string,
  modelToUse: string,
  systemInstruction: string,
  userPrompt: string,
  timeoutMs: number
): Promise<LLMCallResult<T>> {
  const startTime = Date.now();
  const ai = new GoogleGenAI({ apiKey });

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`LLM API call timed out after ${timeoutMs}ms`)), timeoutMs)
  );

  const executeAttempt = async (targetModel: string) => {
    const response = await ai.models.generateContent({
      model: targetModel,
      contents: [
        { role: "user", parts: [{ text: `${systemInstruction}\n\nUSER INPUT:\n${userPrompt}` }] },
      ],
      config: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    const latencyMs = Date.now() - startTime;
    const usageMetadata = response.usageMetadata;
    const stats: LLMCallStats = {
      promptTokens: usageMetadata?.promptTokenCount,
      candidatesTokens: usageMetadata?.candidatesTokenCount,
      totalTokens: usageMetadata?.totalTokenCount,
      latencyMs,
    };

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Empty response from LLM API");
    }

    const parsed = cleanAndParseJSON<T>(responseText);
    return { data: parsed, stats };
  };

  const candidateModels = [modelToUse];
  if (modelToUse !== "gemini-3.1-flash-lite") {
    candidateModels.push("gemini-3.1-flash-lite");
  }

  const callPromise = (async () => {
    let lastErr: any = null;
    for (const curModel of candidateModels) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          return await executeAttempt(curModel);
        } catch (err: any) {
          lastErr = err;
          const msg = String(err?.message || err);
          if (msg.includes("503") || msg.includes("UNAVAILABLE") || msg.includes("high demand")) {
            if (attempt === 1) {
              console.warn(`[Gemini Provider] Model ${curModel} returned transient 503. Retrying in 1500ms...`);
              await new Promise((r) => setTimeout(r, 1500));
              continue;
            } else {
              console.warn(`[Gemini Provider] Model ${curModel} hit repeated 503. Attempting fallback model...`);
              break;
            }
          }
          break;
        }
      }
    }
    throw lastErr;
  })();

  const result = await Promise.race([callPromise, timeoutPromise]);
  return result;
}

/**
 * Universal JSON LLM Caller supporting both OpenAI-compatible endpoints and Gemini
 */
export async function callGeminiStructuredJSONWithStats<T>(
  systemInstruction: string,
  userPrompt: string,
  timeoutMs: number = 20000,
  overrideModel?: string
): Promise<LLMCallResult<T>> {
  const startTime = Date.now();
  const openAIKey = getOpenAIApiKey();
  const geminiKey = getGeminiApiKey();
  const modelToUse = overrideModel || getLLMModel();

  if (!openAIKey && !geminiKey) {
    console.warn("[LLM Provider] No OPENAI_API_KEY or GEMINI_API_KEY found in environment. Using fallback mode.");
    return { data: null, stats: { latencyMs: Date.now() - startTime }, error: "No API key configured" };
  }

  // If OpenAI key is present, use OpenAI-compatible endpoint
  if (openAIKey) {
    try {
      const baseUrl = getLLMBaseUrl();
      const openAIModel = overrideModel || (modelToUse.startsWith("gemini") ? "auto:fast" : modelToUse);
      return await callOpenAICompatible<T>(
        openAIKey,
        baseUrl,
        openAIModel,
        systemInstruction,
        userPrompt,
        timeoutMs
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[OpenAI Provider Failure] ${errMsg}. Attempting fallback...`);
      // If Gemini key is also available, failover to Gemini
      if (geminiKey) {
        try {
          return await callGeminiDirect<T>(
            geminiKey,
            "gemini-3.5-flash-lite",
            systemInstruction,
            userPrompt,
            timeoutMs
          );
        } catch (gemErr) {
          console.warn("[Gemini Fallback Failure]", gemErr);
        }
      }
      return { data: null, stats: { latencyMs: Date.now() - startTime }, error: errMsg };
    }
  }

  // Otherwise, use direct Gemini
  if (geminiKey) {
    try {
      return await callGeminiDirect<T>(
        geminiKey,
        modelToUse,
        systemInstruction,
        userPrompt,
        timeoutMs
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[Gemini Provider Failure] ${errMsg}. Degraded gracefully.`);
      return { data: null, stats: { latencyMs: Date.now() - startTime }, error: errMsg };
    }
  }

  return { data: null, stats: { latencyMs: Date.now() - startTime }, error: "No valid LLM provider available" };
}

export async function callGeminiStructuredJSON<T>(
  systemInstruction: string,
  userPrompt: string,
  timeoutMs: number = 20000,
  overrideModel?: string
): Promise<T | null> {
  const res = await callGeminiStructuredJSONWithStats<T>(
    systemInstruction,
    userPrompt,
    timeoutMs,
    overrideModel
  );
  return res.data;
}

// Aliases for modern naming
export const callLLMStructuredJSON = callGeminiStructuredJSON;
export const callLLMStructuredJSONWithStats = callGeminiStructuredJSONWithStats;
