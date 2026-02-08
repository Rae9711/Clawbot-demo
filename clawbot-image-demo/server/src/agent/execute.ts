/**
 * Plan execution — dispatches to registered tools.
 *
 * For each step:
 *   1. Resolve {{vars.NAME}} and {{vars.NAME.field}} in args (mechanical string replacement)
 *   2. Look up tool in registry
 *   3. Run tool with resolved args (sandboxed with timeout)
 *   4. Store output in vars[step.saveAs]
 *   5. Record result in ExecutionSummary
 *
 * Tools that use LLM internally (text.generate, image.generate) are explicit,
 * approved calls — not hidden "let me think again" detours.
 *
 * Failures are captured, not thrown. The Reporter acknowledges them.
 */

import { nanoid } from "nanoid";
import { getPlan } from "../planStore.js";
import { runSandboxed } from "../sandbox/sandboxRunner.js";
import {
  saveRun,
  type RunRecord,
  type StepResult,
  type ExecutionSummary,
} from "./executeStore.js";
import { getTool } from "./tools/registry.js";
import type { Plan, PlanStep } from "./plan.js";

// ── var resolution ───────────────────────────────────────

/**
 * Resolve {{vars.NAME}} and {{vars.NAME.field}} in a value.
 * Works recursively on objects and arrays.
 * This is mechanical string replacement — no LLM reasoning.
 */
function resolveVars(value: any, vars: Record<string, any>): any {
  if (typeof value === "string") {
    return value.replace(
      /\{\{\s*vars\.([a-zA-Z0-9_]+)(?:\.([a-zA-Z0-9_]+))?\s*\}\}/g,
      (_match, varName, field) => {
        const v = vars[varName];
        if (v === undefined) {
          return `[missing: ${varName}]`;
        }
        
        // Check if variable has an error (from failed tool execution)
        // If found === false, it means the tool failed to find/create the resource
        if (v && typeof v === "object") {
          if (v.error || (v.found === false)) {
            const errorMsg = v.error || "上一步执行失败（未找到资源）";
            if (field) {
              return `[error: ${varName}.${field} - ${errorMsg}]`;
            }
            return `[error: ${varName} - ${errorMsg}]`;
          }
        }
        
        if (field) {
          // First check if this is a failed tool result (found === false)
          if (v && typeof v === "object" && v.found === false) {
            const errorMsg = v.error || "上一步执行失败（未找到资源）";
            return `[error: ${varName}.${field} - ${errorMsg}]`;
          }
          
          const f = typeof v === "object" && v !== null ? v[field] : undefined;
          if (f === undefined || f === null) {
            // Provide helpful error message
            const availableFields = v && typeof v === "object" ? Object.keys(v).join(", ") : "无可用字段";
            return `[missing: ${varName}.${field} (可用字段: ${availableFields})]`;
          }
          return String(f);
        }
        return typeof v === "object" ? JSON.stringify(v) : String(v);
      },
    );
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveVars(item, vars));
  }

  if (value && typeof value === "object") {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = resolveVars(v, vars);
    }
    return out;
  }

  return value;
}

// ── timeout config per tool category ─────────────────────

/** Tools that need long timeouts (LLM calls, AppleScript automation) */
const SLOW_TOOLS = new Set(["text.generate", "image.generate", "contacts.apple", "imessage.send"]);
const SLOW_TIMEOUT = 300_000;  // 5 minutes
const FAST_TIMEOUT = 10_000;   // 10 seconds for local tools

// ── executor ─────────────────────────────────────────────

export async function executePlan(opts: {
  sessionId: string;
  planId: string;
  approved: boolean;
  emit: (event: string, data: any) => void;
  outboxDir: string;
}): Promise<RunRecord> {
  const plan = getPlan(opts.planId) as Plan;
  if (!opts.approved) throw new Error("Execution requires approval.");

  const runId = nanoid();
  opts.emit("agent.exec.started", { runId, planId: plan.planId });

  const stepResults: StepResult[] = [];
  const toolResults: Record<string, any> = {};
  const vars: Record<string, any> = {};

  for (let i = 0; i < plan.steps.length; i++) {
    const step: PlanStep = plan.steps[i];
    const stepId = step.id ?? `s${i + 1}`;

    opts.emit("agent.exec.step", {
      runId,
      stepId,
      status: "running",
      tool: step.tool,
      description: step.description,
    });

    // Look up tool in registry
    const tool = getTool(step.tool);
    if (!tool) {
      const error = `Tool not found in registry: ${step.tool}`;
      stepResults.push({ stepId, tool: step.tool, status: "error", error });
      opts.emit("agent.exec.step", { runId, stepId, status: "error", outputPreview: error });
      continue;
    }

    opts.emit("tool.start", {
      runId,
      tool: step.tool,
      toolName: tool.name,
      args: step.args,
    });

    try {
      // Resolve {{vars.*}} in args
      console.log(`[execute] Step ${stepId} resolving vars, current vars:`, Object.keys(vars));
      const resolvedArgs = resolveVars(step.args, vars);
      console.log(`[execute] Step ${stepId} resolved args:`, JSON.stringify(resolvedArgs).substring(0, 300));

      // Run tool with appropriate timeout
      const timeout = SLOW_TOOLS.has(step.tool) ? SLOW_TIMEOUT : FAST_TIMEOUT;
      const ctx = { outboxDir: opts.outboxDir, vars };

      const result = await runSandboxed(
        () => tool.execute(resolvedArgs, ctx),
        { timeoutMs: timeout, label: step.tool },
      );

      // Check if tool returned an error (some tools return { found: false, error: ... } instead of throwing)
      // If found === false, it means the tool failed to find/create the resource
      const hasError = result && typeof result === "object" && (
        (result as any).error !== undefined ||
        (result as any).found === false
      );

      console.log(`[execute] Step ${stepId} error check:`, {
        hasError,
        hasErrorField: !!(result as any)?.error,
        found: (result as any)?.found,
        tool: step.tool,
        resultKeys: result && typeof result === "object" ? Object.keys(result) : "not an object"
      });

      if (hasError) {
        const errorMsg = (result as any).error || "工具执行失败";
        stepResults.push({
          stepId,
          tool: step.tool,
          status: "error",
          error: errorMsg,
          output: result,
        });

        opts.emit("tool.error", { runId, tool: step.tool, toolName: tool.name, error: errorMsg });
        opts.emit("agent.exec.step", {
          runId,
          stepId,
          status: "error",
          outputPreview: errorMsg,
        });

        // Still store the result (with error) so later steps can check it
        if (step.saveAs) {
          const saveKey = step.saveAs
            .replace(/^\{\{\s*vars\.\s*/, "")
            .replace(/\s*\}\}\s*$/, "")
            .replace(/\..+$/, "");
          vars[saveKey] = result;
          console.log(`[execute] Saved error result to vars[${saveKey}]:`, JSON.stringify(result).substring(0, 200));
        }

        // Continue to next step (don't throw)
        continue;
      }

      // Store output for later steps
      if (step.saveAs) {
        // Sanitize saveAs — small models sometimes write "{{vars.foo}}" instead of "foo"
        const saveKey = step.saveAs
          .replace(/^\{\{\s*vars\.\s*/, "")
          .replace(/\s*\}\}\s*$/, "")
          .replace(/\..+$/, ""); // "{{vars.contact.name}}" → "contact"
        vars[saveKey] = result;
        console.log(`[execute] Saved result to vars[${saveKey}]:`, JSON.stringify(result).substring(0, 200));
      } else {
        console.log(`[execute] Step ${stepId} has no saveAs, result not saved`);
      }

      toolResults[stepId] = result;
      stepResults.push({ stepId, tool: step.tool, status: "ok", output: result });

      // Build a preview string for the UI
      const preview = buildPreview(result);
      opts.emit("tool.success", { runId, tool: step.tool, toolName: tool.name, result });
      opts.emit("agent.exec.step", {
        runId,
        stepId,
        status: "ok",
        outputPreview: preview,
      });
    } catch (e: any) {
      const errorMsg = e?.message || String(e);
      const isTimeout = errorMsg.includes("timeout");

      stepResults.push({
        stepId,
        tool: step.tool,
        status: isTimeout ? "timeout" : "error",
        error: errorMsg,
      });

      opts.emit("tool.error", { runId, tool: step.tool, toolName: tool.name, error: errorMsg });
      opts.emit("agent.exec.step", {
        runId,
        stepId,
        status: "error",
        outputPreview: errorMsg,
      });

      // Don't throw — record failure and continue.
    }
  }

  // ── build execution summary ────────────────────────────

  const allOk = stepResults.every((s) => s.status === "ok");
  const allFailed = stepResults.every((s) => s.status !== "ok");
  const summaryStatus = allOk ? "ok" : allFailed ? "failed" : "partial";

  const executionSummary: ExecutionSummary = {
    runId,
    planId: plan.planId,
    status: summaryStatus,
    steps: stepResults,
  };

  opts.emit("agent.exec.finished", { runId, status: summaryStatus });

  const record: RunRecord = {
    runId,
    planId: plan.planId,
    prompt: plan.prompt,
    executionSummary,
    toolResults,
  };

  saveRun(record);
  return record;
}

// ── helpers ──────────────────────────────────────────────

function buildPreview(result: any): string {
  if (!result) return "(empty)";
  if (typeof result === "string") return result.slice(0, 160);
  if (result.text) return String(result.text).slice(0, 160);
  if (result.filePath) return `File: ${result.filePath}`;
  if (result.sent) return `Sent to ${result.recipientName ?? "recipient"} (${result.platform ?? "?"})`;
  if (result.name) return `Found: ${result.name}`;
  return JSON.stringify(result).slice(0, 160);
}
