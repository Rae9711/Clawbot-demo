/* ──────────────────────────────────────────────────────────
 *  Execution store – structured execution receipts.
 *
 *  Key principle: tool outputs are *receipts*.
 *  The LLM may interpret them, never fabricate them.
 * ────────────────────────────────────────────────────────── */

export type StepResult = {
  stepId: string;
  tool: string;
  status: "ok" | "error" | "timeout";
  /** Tool return value (only when status === "ok") */
  output?: any;
  /** Error message (only when status !== "ok") */
  error?: string;
};

export type ExecutionSummary = {
  runId: string;
  planId: string;
  status: "ok" | "partial" | "failed";
  steps: StepResult[];
};

export type RunRecord = {
  runId: string;
  planId: string;
  /** Original user prompt, verbatim */
  prompt: string;
  /** Structured execution receipt – fed to Reporter as-is */
  executionSummary: ExecutionSummary;
  /** stepId → raw tool return value */
  toolResults: Record<string, any>;
};

// ── in-memory store ──────────────────────────────────────

const runs = new Map<string, RunRecord>();

export function saveRun(r: RunRecord) {
  runs.set(r.runId, r);
}

export function getRun(runId: string): RunRecord {
  const r = runs.get(runId);
  if (!r) throw new Error(`Run not found: ${runId}`);
  return r;
}
