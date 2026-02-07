const runs = new Map<string, any>();

export type RunRecord = {
  runId: string;
  planId: string;
  teamTarget?: string;
  prompt: string;
  summary: string;
  toolResult: any;
  vars: Record<string, string>;
};

export function saveRun(r: RunRecord) {
  runs.set(r.runId, r);
}

export function getRun(runId: string): RunRecord {
  const r = runs.get(runId);
  if (!r) throw new Error(`Run not found: ${runId}`);
  return r;
}
