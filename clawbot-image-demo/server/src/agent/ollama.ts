/**
 * Local LLM (no API key): Ollama running on localhost.
 * Uses /api/chat. For text-only, we send normal text messages.
 *
 * Default model can be qwen2.5:7b (text) or qwen2.5vl:7b (vision).
 */
const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://127.0.0.1:11434";

// Separate models: planner should be fast text model
const OLLAMA_PLANNER_MODEL = process.env.OLLAMA_PLANNER_MODEL ?? process.env.OLLAMA_MODEL ?? "qwen2.5:7b";
const OLLAMA_EXEC_MODEL = process.env.OLLAMA_EXEC_MODEL ?? process.env.OLLAMA_MODEL ?? "qwen2.5vl:7b";


/**
 * Persona -> system style. Keep it short so it doesn't fight user intent.
 */
function personaSystem(persona: string) {
  switch (persona) {
    case "professional":
      return "Write clearly, concise, and businesslike. Use structured bullets when helpful.";
    case "friendly_coach":
      return "Be friendly and encouraging. Offer concrete next steps. Keep it practical.";
    case "no_bs":
      return "Be direct and blunt. No fluff. Call out uncertainties explicitly.";
    case "playful_nerd":
      return "Be playful and nerdy, but still accurate. Use crisp explanations.";
    default:
      return "Be helpful, accurate, and concise.";
  }
}

// -------------------------
// VISION (legacy / optional)
// -------------------------

// Extract local file path from an absolute URL like http://localhost:8080/uploads/xxx.png
function urlToLocalUploadPath(imageUrl: string) {
  // server serves /uploads from server/src/uploads
  const u = new URL(imageUrl);
  const pathname = u.pathname; // /uploads/abc.png
  if (!pathname.startsWith("/uploads/")) throw new Error("Unexpected imageUrl path");
  const file = pathname.replace("/uploads/", "");
  // index.ts sets static folder at src/uploads
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
          { type: "text", text: prompt }
        ]
      }
    ],
    stream: false
  };

  console.log("[ollama] url =", OLLAMA_URL, "model =", OLLAMA_PLANNER_MODEL);

  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Ollama chat failed: ${res.status} ${t}`);
  }

  const json: any = await res.json();
  const out = json?.message?.content;
  if (!out) throw new Error("Ollama returned empty content");
  return String(out).trim();
}

// -------------------------
// TEXT (new primary path)
// -------------------------

/**
 * Text-only completion using /api/chat.
 * Use this for your new prompt-only agent.
 */
export async function textComplete(args: { persona: string; prompt: string; model?: string }): Promise<string> {
  const prompt = (args.prompt ?? "").trim();
  if (!prompt) throw new Error("textComplete requires a non-empty prompt");

  const body = {
    model: args.model ?? OLLAMA_PLANNER_MODEL,
    messages: [
      { role: "system", content: personaSystem(args.persona) },
      { role: "user", content: prompt }
    ],
    stream: false,
    options: { temperature: 0, num_predict: 200 }
  };

  

  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Ollama chat failed: ${res.status} ${t}`);
  }


  const json: any = await res.json();
  const out = json?.message?.content;
  if (!out) throw new Error("Ollama returned empty content");
  return String(out).trim();
}
