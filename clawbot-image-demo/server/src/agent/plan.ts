import { nanoid } from "nanoid";
import { savePlan } from "../planStore.js";
import { textComplete } from "./ollama.js";

export type AllowedTool = "llm.text" | "outbox.send";

export type PlanStep =
  | {
      id: string;
      tool: "llm.text";
      /** prompt template; can reference {{prompt}} and {{vars.*}} */
      prompt: string;
      /** store output into vars[name] */
      saveAs: string;
    }
  | {
      id: string;
      tool: "outbox.send";
      /** optional target */
      teamTarget?: string;
      /** message template; can reference {{vars.*}} and {{prompt}} */
      message: string;
    };

export type Plan = {
  planId: string;
  sessionId: string;
  createdAt: number;
  persona: string;

  /** user prompt captured at plan time */
  prompt: string;

  /** free-form intent label; not trusted for execution */
  intent: string;

  /** steps must be allowlisted + validated */
  steps: PlanStep[];
};

/** Very small templating: {{prompt}}, {{vars.foo}} */
function renderTemplate(tpl: string, ctx: { prompt: string; vars: Record<string, string> }) {
  return tpl
    .replaceAll("{{prompt}}", ctx.prompt)
    .replace(/\{\{\s*vars\.([a-zA-Z0-9_]+)\s*\}\}/g, (_m, k) => ctx.vars[k] ?? "");
}

function safeJsonParse(s: string): any {
  // Model may wrap JSON in text/code fences; try to extract first {...} block.
  const trimmed = s.trim();

  // If fenced ```json ... ```
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fence?.[1]?.trim() ?? trimmed;

  // Try direct parse
  try {
    return JSON.parse(candidate);
  } catch {}

  // Try extracting first JSON object
  const firstObj = candidate.match(/\{[\s\S]*\}/);
  if (firstObj) return JSON.parse(firstObj[0]);

  throw new Error("Planner returned non-JSON output");
}

function validatePlanDraft(draft: any): { intent: string; steps: PlanStep[] } {
  if (!draft || typeof draft !== "object") throw new Error("Plan draft must be an object");
  const intent = typeof draft.intent === "string" ? draft.intent : "unspecified";
  const steps = draft.steps;

  if (!Array.isArray(steps) || steps.length === 0) {
    throw new Error("Plan draft must include a non-empty steps array");
  }

  const out: PlanStep[] = [];

  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    if (!s || typeof s !== "object") throw new Error(`Step ${i} must be an object`);

    const tool = s.tool as AllowedTool;
    const id = typeof s.id === "string" ? s.id : `s${i + 1}`;

    if (tool === "llm.text") {
      if (typeof s.prompt !== "string" || !s.prompt.trim()) {
        throw new Error(`Step ${id}: llm.text requires non-empty prompt`);
      }
      if (typeof s.saveAs !== "string" || !/^[a-zA-Z0-9_]+$/.test(s.saveAs)) {
        throw new Error(`Step ${id}: llm.text requires saveAs (alphanum/underscore)`);
      }
      out.push({ id, tool, prompt: s.prompt, saveAs: s.saveAs });
      continue;
    }

    if (tool === "outbox.send") {
      if (typeof s.message !== "string" || !s.message.trim()) {
        throw new Error(`Step ${id}: outbox.send requires non-empty message`);
      }
      const teamTarget = typeof s.teamTarget === "string" ? s.teamTarget : undefined;
      out.push({ id, tool, teamTarget, message: s.message });
      continue;
    }

    // Reject unknown tools
    throw new Error(`Step ${id}: tool not allowed: ${String(s.tool)}`);
  }

  return { intent, steps: out };
}

export async function createPlan(args: {
  sessionId: string;
  persona: string;
  prompt: string;
  intent?: string;
  teamTarget?: string; // optional default target the model can use
}): Promise<Plan> {
  const prompt = (args.prompt ?? "").trim();
  if (!prompt) throw new Error("Prompt is required");

  const planId = nanoid();

  // Ask the LLM to output a strict JSON plan using only allowlisted tools.
  const plannerInstruction = `
  Return ONLY JSON. No markdown.

  Allowed tools:
  - llm.text: { "id": "s1", "tool": "llm.text", "prompt": "...", "saveAs": "name" }
  - outbox.send: { "id": "s2", "tool": "outbox.send", "teamTarget": "#demo-team", "message": "..." }

  Use {{prompt}} and {{vars.NAME}} templates.

  Output schema:
  { "intent": "string", "steps": [ ... ] }

  User prompt:
  ${prompt}
  `.trim();


  console.log("[createPlan] calling ollama...");

  // Call the same text model to generate the plan JSON.
  const raw = await textComplete({
    persona: args.persona,
    prompt: plannerInstruction,
    model: process.env.OLLAMA_PLANNER_MODEL // uses qwen2.5:7b if set
  });

  const draft = safeJsonParse(raw);
  const { intent, steps } = validatePlanDraft(draft);

  const plan: Plan = {
    planId,
    sessionId: args.sessionId,
    createdAt: Date.now(),
    persona: args.persona,
    prompt,
    intent: args.intent ?? intent,
    steps
  };

  savePlan(planId, plan);
  return plan;
}

// Export template renderer so executor can use the same logic (optional)
export { renderTemplate };
