/**
 * Local LLM client — Ollama on localhost.
 *
 * Three distinct roles, each with its own knobs:
 *
 *   planner  – strict JSON output, temperature ≈ 0, no personality
 *   reporter – neutral factual answer, low temperature
 *   styler   – persona rewrite only, moderate creativity, cheaper model OK
 *
 * The key constraint: each call does ONE job.
 */

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://127.0.0.1:11434";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;

// Detect if using cloud API (OpenRouter, Together.ai, etc.)
const isCloudAPI = OLLAMA_URL.includes("openrouter.ai") || 
                   OLLAMA_URL.includes("together.xyz") ||
                   OLLAMA_URL.includes("api.together");

// ── per-role models (override independently) ─────────────

const DEFAULT_MODEL = process.env.OLLAMA_MODEL ?? "qwen2.5:7b";

/** Planner benefits from a smaller/faster model — it only outputs structured JSON. */
const PLANNER_MODEL = process.env.OLLAMA_PLANNER_MODEL ?? "qwen2.5:1.5b";

const OLLAMA_PLANNER_MODEL = PLANNER_MODEL;

const OLLAMA_REPORTER_MODEL =
  process.env.OLLAMA_REPORTER_MODEL ?? "qwen2.5:1.5b";

/** Styler can (and should) be a cheaper / smaller model. */
const OLLAMA_STYLER_MODEL =
  process.env.OLLAMA_STYLER_MODEL ?? "qwen2.5:1.5b";

// ── role configs ─────────────────────────────────────────

export type LLMRole = "planner" | "reporter" | "styler" | "tool";

type RoleConfig = {
  model: string;
  temperature: number;
  num_predict: number;
  systemPrompt: string;
};

const ROLE_CONFIG: Record<LLMRole, RoleConfig> = {
  planner: {
    model: OLLAMA_PLANNER_MODEL,
    temperature: 0,
    num_predict: 2048, // multi-step plans with tool args are larger
    systemPrompt:
      "You are a planning assistant. Output ONLY valid JSON. " +
      "No prose, no markdown, no commentary. saveAs must be a plain variable name like msg or contact, never {{vars.xxx}}.",
  },
  reporter: {
    model: OLLAMA_REPORTER_MODEL,
    temperature: 0.1, // almost deterministic, just enough for natural phrasing
    num_predict: 512,
    systemPrompt:
      "你是一个事实汇报助手。只报告实际发生了什么。" +
      "不要编造信息。如果数据缺失，请说明。用中文回复。",
  },
  styler: {
    model: OLLAMA_STYLER_MODEL,
    temperature: 0.4, // creative enough for voice, constrained enough for safety
    num_predict: 512,
    systemPrompt:
      "你是风格改写器。请按指定语气重写内容，并使用中文输出。" +
      "绝对不要新增、删除或篡改事实。",
  },
  tool: {
    model: "qwen2.5:1.5b",
    temperature: 0.2, // low creativity — tools produce content, not opinions
    num_predict: 512,
    systemPrompt:
      "你是一个内容生成工具。直接输出请求的内容，用中文回复。不要解释、不要评论。",
  },
};

// ── fetch with retry (handles Ollama cold-start / slow model load) ───

const MAX_RETRIES = 3;
const RETRY_DELAYS = [2_000, 5_000, 10_000]; // ms between retries
const FETCH_TIMEOUT = 300_000; // 5 minutes per attempt

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  label: string,
): Promise<Response> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);
      return res;
    } catch (err: any) {
      const isLast = attempt === MAX_RETRIES;
      const errMsg = err?.cause?.code ?? err?.code ?? err?.message ?? String(err);
      console.warn(
        `[ollama] ${label} attempt ${attempt + 1}/${MAX_RETRIES + 1} failed: ${errMsg}`,
      );

      if (isLast) throw err;

      const delay = RETRY_DELAYS[attempt] ?? 5_000;
      console.log(`[ollama] retrying in ${delay}ms…`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  // unreachable, but keeps TS happy
  throw new Error("fetchWithRetry exhausted");
}

// ── public API ───────────────────────────────────────────

export async function textComplete(args: {
  prompt: string;
  role?: LLMRole;
  forceJson?: boolean;
}): Promise<string> {
  const prompt = (args.prompt ?? "").trim();
  if (!prompt) throw new Error("textComplete requires a non-empty prompt");

  const role = args.role ?? "reporter";
  const cfg = ROLE_CONFIG[role];

  const body: any = {
    model: cfg.model,
    messages: [
      { role: "system", content: cfg.systemPrompt },
      { role: "user", content: prompt },
    ],
    stream: false,
    options: {
      temperature: cfg.temperature,
      num_predict: cfg.num_predict,
    },
  };

  if (args.forceJson) body.format = "json";

  console.log(`[ollama] role=${role} model=${cfg.model} temp=${cfg.temperature}`);

  // Build headers (add auth for cloud APIs)
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (isCloudAPI) {
    if (OLLAMA_URL.includes("openrouter.ai") && OPENROUTER_API_KEY) {
      headers["Authorization"] = `Bearer ${OPENROUTER_API_KEY}`;
      headers["HTTP-Referer"] = "https://clawbot-demo.com"; // Optional
      headers["X-Title"] = "Clawbot Demo"; // Optional
    } else if (OLLAMA_URL.includes("together.xyz") && TOGETHER_API_KEY) {
      headers["Authorization"] = `Bearer ${TOGETHER_API_KEY}`;
    }
  }

  // Cloud APIs use OpenAI format, need to map model names
  let apiUrl = `${OLLAMA_URL}/api/chat`;
  let requestBody: any = body;

  if (isCloudAPI) {
    // OpenRouter/Together use OpenAI-compatible API
    apiUrl = OLLAMA_URL.includes("openrouter.ai") 
      ? "https://openrouter.ai/api/v1/chat/completions"
      : "https://api.together.xyz/v1/chat/completions";
    
    // Map model names for cloud APIs
    const modelMap: Record<string, string> = {
      "qwen2.5:1.5b": "qwen/qwen-2-1.5b-instruct:free",
      "qwen2.5:7b": "qwen/qwen-2-7b-instruct:free",
    };
    const cloudModel = modelMap[cfg.model] ?? cfg.model;

    requestBody = {
      model: cloudModel,
      messages: body.messages,
      temperature: cfg.temperature,
      max_tokens: cfg.num_predict,
    };
    if (args.forceJson) {
      requestBody.response_format = { type: "json_object" };
    }
  }

  const res = await fetchWithRetry(
    apiUrl,
    {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    },
    role,
  );

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Ollama chat failed (${role}): ${res.status} ${t}`);
  }

  const json: any = await res.json();
  
  // Handle different response formats
  let out: string;
  if (isCloudAPI) {
    // OpenAI format: { choices: [{ message: { content: "..." } }] }
    out = json?.choices?.[0]?.message?.content;
  } else {
    // Ollama format: { message: { content: "..." } }
    out = json?.message?.content;
  }
  
  if (!out) throw new Error(`API returned empty content (${role}): ${JSON.stringify(json).slice(0, 200)}`);
  return String(out).trim();
}

// ── legacy vision (kept for backwards compat) ────────────

function urlToLocalUploadPath(imageUrl: string) {
  const u = new URL(imageUrl);
  const pathname = u.pathname;
  if (!pathname.startsWith("/uploads/")) throw new Error("Unexpected imageUrl path");
  const file = pathname.replace("/uploads/", "");
  return new URL(`../uploads/${file}`, import.meta.url).pathname;
}

async function fileToBase64(filePath: string) {
  const fs = await import("fs");
  const buf = fs.readFileSync(filePath);
  return buf.toString("base64");
}

export async function visionSummarize(imageUrl: string): Promise<string> {
  const localPath = urlToLocalUploadPath(imageUrl);
  const b64 = await fileToBase64(localPath);

  const prompt =
    "You are a helpful assistant. Look at the image and write a concise summary (3-6 bullet points) " +
    "and one clear action item. Keep it short and factual.";

  const body = {
    model: OLLAMA_PLANNER_MODEL,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", image: b64 },
          { type: "text", text: prompt },
        ],
      },
    ],
    stream: false,
  };

  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Ollama vision failed: ${res.status} ${t}`);
  }

  const json: any = await res.json();
  const out = json?.message?.content;
  if (!out) throw new Error("Ollama returned empty content (vision)");
  return String(out).trim();
}
