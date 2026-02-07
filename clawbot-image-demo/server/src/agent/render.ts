import type { Persona } from "../sessionStore.js";
import { getRun } from "./executeStore.js";
import { applyPersona } from "./persona.js";

/**
 * Render the final, user-facing message from a completed run.
 * This is presentation-only: no planning, no execution.
 */
export function renderFinal(opts: { runId: string; persona: string }) {
  const run = getRun(opts.runId);
  const persona = (opts.persona || "professional") as Persona;

  /**
   * Core content is deliberately simple and explicit.
   * The persona layer rewrites style, not substance.
   */
  const core = `
User prompt:
${run.prompt}

Result:
${run.summary}

Team target: ${run.teamTarget ?? "n/a"}
Artifact: ${run.toolResult?.artifact ?? "n/a"}
`.trim();

  const message = applyPersona(persona, core);

  return {
    runId: run.runId,
    persona,
    message
  };
}
