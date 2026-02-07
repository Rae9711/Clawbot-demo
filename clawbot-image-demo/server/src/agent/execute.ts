import { nanoid } from "nanoid";
import { getPlan } from "../planStore.js";
import { runSandboxed } from "../sandbox/sandboxRunner.js";
import { sendToTeam } from "../sandbox/tools.js";
import { saveRun, type RunRecord } from "./executeStore.js";
import { textComplete } from "./ollama.js";
import { renderTemplate, type Plan, type PlanStep } from "./plan.js";

export async function executePlan(opts: {
  sessionId: string;
  persona: string;
  planId: string;
  approved: boolean;
  emit: (event: string, data: any) => void;
  outboxDir: string;
}): Promise<RunRecord> {
  const plan = getPlan(opts.planId) as Plan;
  if (!opts.approved) throw new Error("Execution requires approval.");

  const runId = nanoid();
  opts.emit("agent.exec.started", { runId, planId: plan.planId });

  const vars: Record<string, string> = {};
  let toolResult: any = null;

  for (let i = 0; i < plan.steps.length; i++) {
    const step: PlanStep = plan.steps[i];
    const stepId = step.id ?? `s${i + 1}`;

    opts.emit("agent.exec.step", { runId, stepId, status: "running", tool: step.tool });

    if (step.tool === "llm.text") {
      opts.emit("tool.start", {
        runId,
        tool: "tool.llmTextProcess",
        args: { model: process.env.OLLAMA_MODEL ?? "qwen2.5:7b", saveAs: step.saveAs }
      });

      try {
        const renderedPrompt = renderTemplate(step.prompt, { prompt: plan.prompt, vars });

        const out = await runSandboxed(
          () => textComplete({ persona: opts.persona, prompt: renderedPrompt }),
          { timeoutMs: 4500_000, label: "textComplete" }
        );

        vars[step.saveAs] = String(out).trim();

        opts.emit("tool.success", {
          runId,
          tool: "tool.llmTextProcess",
          resultPreview: vars[step.saveAs].slice(0, 200)
        });

        opts.emit("agent.exec.step", {
          runId,
          stepId,
          status: "ok",
          outputPreview: vars[step.saveAs].slice(0, 160) + "…"
        });
      } catch (e: any) {
        const msg = e?.message || String(e);
        opts.emit("tool.error", { runId, tool: "tool.llmTextProcess", error: msg });
        opts.emit("agent.exec.step", { runId, stepId, status: "error", outputPreview: msg });
        throw e;
      }

      continue;
    }

    if (step.tool === "outbox.send") {
      opts.emit("tool.start", {
        runId,
        tool: "tool.sendToTeam",
        args: { teamTarget: step.teamTarget ?? "#demo-team" }
      });

      const message = renderTemplate(step.message, { prompt: plan.prompt, vars });

      toolResult = await runSandboxed(
        () =>
          sendToTeam({
            outboxDir: opts.outboxDir,
            teamTarget: step.teamTarget ?? "#demo-team",
            prompt: plan.prompt,
            summary: message
          }),
        { timeoutMs: 5_000, label: "sendToTeam" }
      );

      opts.emit("tool.success", { runId, tool: "tool.sendToTeam", result: toolResult });
      opts.emit("agent.exec.step", { runId, stepId, status: "ok", outputPreview: message.slice(0, 160) + "…" });
      continue;
    }

    // Should be impossible because plan validation rejects unknown tools,
    // but keep a hard fail anyway.
    throw new Error(`Unknown/blocked tool: ${(step as any).tool}`);
  }

  // Choose a “final” output: prefer vars.final if exists, else last var, else prompt
  const keys = Object.keys(vars);
  const finalText =
    vars["final"] ??
    (keys.length ? vars[keys[keys.length - 1]] : plan.prompt);

  opts.emit("agent.exec.finished", { runId, status: "ok" });

  const record: RunRecord = {
    runId,
    planId: plan.planId,
    teamTarget: (plan as any).teamTarget,
    prompt: plan.prompt,
    summary: finalText,
    toolResult,
    vars
  };

  saveRun(record);
  return record;
}
