/**
 * Plan Generation Module (计划生成模块) — Call A (Planner)
 * 
 * 这是系统的 Planner（计划器），负责将用户的自然语言请求转换为可执行的计划。
 * 
 * ## 核心职责
 * 
 * **单一职责**: 生成严格的 JSON 计划，包含具体的工具调用和参数。
 * 
 * Planner 不做的事情：
 * - 不执行工具（那是 Executor 的工作）
 * - 不生成最终答案（那是 Reporter 的工作）
 * - 不进行推理（只生成计划结构）
 * 
 * ## 计划结构
 * 
 * 计划是一个 JSON 对象，包含：
 * - `intent`: 用户意图的简短描述
 * - `steps`: 执行步骤数组
 *   - `id`: 步骤 ID（如 "s1", "s2"）
 *   - `tool`: 工具 ID（必须来自注册表）
 *   - `description`: 步骤描述（中文）
 *   - `args`: 工具参数（可以包含变量引用）
 *   - `saveAs`: 结果保存的变量名（可选）
 *   - `dependsOn`: 依赖的步骤 ID（可选）
 * - `requiredPermissions`: 所需权限列表
 * 
 * ## 处理流程
 * 
 * 1. **构建提示词**:
 *    - 角色定义（中文 Planner）
 *    - 工具目录（动态生成，根据平台过滤）
 *    - 重要规则（CRITICAL RULES）
 *    - Few-shot 示例
 *    - 用户请求
 * 
 * 2. **调用 LLM**: 使用 `textComplete()` 调用 Planner 模型
 * 
 * 3. **提取 JSON**: 从 LLM 输出中提取 JSON（可能包含 markdown 代码块）
 * 
 * 4. **修复 JSON**: 使用 `jsonrepair` 修复常见的 JSON 错误
 * 
 * 5. **规范化**: `normalizePlanDraft()` 处理各种 JSON 格式：
 *    - 单步骤对象 → 包装成数组
 *    - 不同键名（plan/steps, actions, tasks） → 统一为 steps
 *    - 缺失字段 → 自动推断
 * 
 * 6. **后处理**:
 *    - 清理 saveAs（移除 {{vars.}} 包装）
 *    - 自动推断 saveAs（如果模型忘记）
 *    - 过滤不需要的 file.save 步骤
 * 
 * 7. **验证**: 确保计划包含非空的 steps 数组
 * 
 * ## 模型选择
 * 
 * - 默认使用 `qwen2.5:1.5b`（快速、成本低）
 * - 可以通过 `OLLAMA_PLANNER_MODEL` 环境变量覆盖
 * - 温度设置为 0（确定性输出）
 * 
 * ## 错误处理
 * 
 * - JSON 解析失败：尝试修复，如果仍失败则抛出错误
 * - 计划格式错误：规范化处理，如果仍无效则抛出错误
 * - LLM 超时：10 分钟超时（可配置）
 * 
 * ## 示例输出
 * 
 * ```json
 * {
 *   "intent": "给查理发消息",
 *   "steps": [
 *     {
 *       "id": "s1",
 *       "tool": "contacts.apple",
 *       "description": "查找查理",
 *       "args": { "query": "查理" },
 *       "saveAs": "contact"
 *     },
 *     {
 *       "id": "s2",
 *       "tool": "imessage.send",
 *       "description": "发送消息",
 *       "args": {
 *         "handle": "{{vars.contact.handle}}",
 *         "message": "你好"
 *       },
 *       "dependsOn": ["s1"]
 *     }
 *   ],
 *   "requiredPermissions": ["contacts.read", "platform.send"]
 * }
 * ```
 */

import { nanoid } from "nanoid";
import { savePlan } from "../planStore.js";
import { textComplete } from "./ollama.js";
import { jsonrepair } from "jsonrepair";
import { getTool, getToolCatalog, getToolIds } from "./tools/registry.js";

// ── types ────────────────────────────────────────────────

export type PlanStep = {
  id: string;
  /** Tool ID from the registry (e.g. "text.generate", "platform.send") */
  tool: string;
  /** Chinese description of what this step does */
  description: string;
  /** Tool arguments — may contain {{vars.NAME}} or {{vars.NAME.field}} refs */
  args: Record<string, any>;
  /** Store output in vars[saveAs] for use by later steps */
  saveAs?: string;
  /** Step IDs this depends on (informational for the UI) */
  dependsOn?: string[];
};

export type Plan = {
  planId: string;
  sessionId: string;
  createdAt: number;

  /** Original user prompt, verbatim */
  prompt: string;

  /** Free-form intent label */
  intent: string;

  /** Concrete execution steps */
  steps: PlanStep[];

  /** Union of all permissions required across all steps */
  requiredPermissions: string[];
};

// ── JSON extraction / repair ─────────────────────────────

function extractJsonObject(s: string): string {
  const t = (s ?? "").trim();

  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced ? fenced[1].trim() : t;

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start >= 0 && end > start) return candidate.slice(start, end + 1);

  return candidate;
}

function safeJsonParse(s: string): any {
  const candidate = extractJsonObject(s);
  const repaired = jsonrepair(candidate);
  return JSON.parse(repaired);
}

// ── validation ───────────────────────────────────────────

function validatePlanDraft(draft: any): {
  intent: string;
  steps: PlanStep[];
  requiredPermissions: string[];
} {
  if (!draft || typeof draft !== "object") {
    throw new Error("Plan draft must be an object, got: " + JSON.stringify(draft).slice(0, 200));
  }

  const intent = typeof draft.intent === "string" ? draft.intent : "unspecified";

  // The 1.5b model sometimes puts steps in different places — try to find them
  let steps: any[] | undefined;
  if (Array.isArray(draft.steps) && draft.steps.length > 0) {
    steps = draft.steps;
  } else if (Array.isArray(draft.plan) && draft.plan.length > 0) {
    steps = draft.plan;
  } else if (Array.isArray(draft.actions) && draft.actions.length > 0) {
    steps = draft.actions;
  } else if (Array.isArray(draft)) {
    steps = draft;
  } else {
    // Last resort: look for any array property
    for (const v of Object.values(draft)) {
      if (Array.isArray(v) && v.length > 0 && v[0]?.tool) {
        steps = v;
        break;
      }
    }
  }

  if (!steps || steps.length === 0) {
    console.error("[validatePlanDraft] no steps found in:", JSON.stringify(draft).slice(0, 500));
    throw new Error("Plan draft must include a non-empty steps array");
  }

  const allowedToolIds = new Set(getToolIds());
  const allPermissions = new Set<string>();
  const out: PlanStep[] = [];

  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    if (!s || typeof s !== "object") {
      throw new Error(`Step ${i} must be an object`);
    }

    const toolId = s.tool;
    const id = typeof s.id === "string" ? s.id : `s${i + 1}`;

    // Validate tool exists in registry
    if (!allowedToolIds.has(toolId)) {
      throw new Error(`Step ${id}: tool not in registry: ${String(toolId)}`);
    }

    const tool = getTool(toolId)!;

    // Collect permissions
    for (const perm of tool.permissions) {
      allPermissions.add(perm);
    }

    const description =
      typeof s.description === "string" ? s.description : tool.name;
    const args =
      s.args && typeof s.args === "object" ? s.args : {};
    // Sanitize saveAs — small models write "{{vars.foo.bar}}" instead of "foo"
    let saveAs: string | undefined;
    if (typeof s.saveAs === "string") {
      saveAs = s.saveAs
        .replace(/^\{\{\s*vars\.\s*/, "")
        .replace(/\s*\}\}\s*$/, "")
        .replace(/\..+$/, "");
    }

    // Auto-infer saveAs when the model forgot it but later steps reference it
    if (!saveAs) {
      saveAs = inferSaveAs(toolId);
    }

    const dependsOn = Array.isArray(s.dependsOn)
      ? s.dependsOn.filter((d: any) => typeof d === "string")
      : undefined;

    out.push({ id, tool: toolId, description, args, saveAs, dependsOn });
  }

  return {
    intent,
    steps: out,
    requiredPermissions: Array.from(allPermissions),
  };
}

// ── auto-infer saveAs for tools that produce data ────────

const TOOL_SAVE_AS: Record<string, string> = {
  "contacts.apple": "contact",
  "contacts.lookup": "contact",
  "text.generate": "msg",
  "image.generate": "image",
};

function inferSaveAs(toolId: string): string | undefined {
  return TOOL_SAVE_AS[toolId];
}

// ── normalize LLM output into plan shape ─────────────────

/**
 * The 1.5b model produces various JSON shapes. This normalizes them all
 * into { intent, steps: [...] }.
 */
function normalizePlanDraft(parsed: any): any {
  if (!parsed || typeof parsed !== "object") return parsed;

  // Case 1: already correct { steps: [...] }
  if (Array.isArray(parsed.steps) && parsed.steps.length > 0) {
    return parsed;
  }

  // Case 2: single step object { tool: "...", ... }
  if (parsed.tool && typeof parsed.tool === "string") {
    console.log("[normalize] single step object → wrapping in steps array");
    return {
      intent: parsed.description ?? "unspecified",
      steps: [{ ...parsed, id: parsed.id ?? "s1" }],
    };
  }

  // Case 3: bare array of steps [{ tool: "..." }, ...]
  if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.tool) {
    console.log("[normalize] bare array → wrapping");
    return { intent: "unspecified", steps: parsed };
  }

  // Case 4: nested under a different key (plan, actions, tasks, etc.)
  for (const key of ["plan", "actions", "tasks", "execution", "workflow"]) {
    const val = parsed[key];
    if (Array.isArray(val) && val.length > 0) {
      console.log(`[normalize] found steps under "${key}"`);
      return { ...parsed, steps: val };
    }
  }

  // Case 5: any array-valued property that contains objects with "tool"
  for (const [key, val] of Object.entries(parsed)) {
    if (Array.isArray(val) && val.length > 0 && (val[0] as any)?.tool) {
      console.log(`[normalize] found tool-steps under "${key}"`);
      return { ...parsed, steps: val };
    }
  }

  // Can't normalize — return as-is, let validatePlanDraft throw with good error
  return parsed;
}

// ── plan generation with ONE repair attempt ──────────────

async function planWithRepair(plannerInstruction: string) {
  let raw = await textComplete({
    prompt: plannerInstruction,
    role: "planner",
    forceJson: true,
  });

  console.log("[planWithRepair] raw LLM output:", raw.slice(0, 800));

  try {
    const parsed = safeJsonParse(raw);
    return normalizePlanDraft(parsed);
  } catch (e) {
    console.warn("[planWithRepair] parse failed:", (e as Error).message);
  }

  // Repair attempt
  const repairPrompt = `
Return ONLY valid JSON. No markdown. No extra text.

The previous output was invalid JSON. Fix ONLY the formatting.
Do not change the content or meaning.

Invalid output:
${raw}
`.trim();

  raw = await textComplete({
    prompt: repairPrompt,
    role: "planner",
    forceJson: true,
  });

  return safeJsonParse(raw);
}

// ── public API ───────────────────────────────────────────

export async function createPlan(args: {
  sessionId: string;
  prompt: string;
  intent?: string;
  platform?: string;
}): Promise<Plan> {
  const prompt = (args.prompt ?? "").trim();
  if (!prompt) throw new Error("Prompt is required");

  const planId = nanoid();
  const platform = args.platform ?? "wecom";

  // Build tool catalog — only show tools relevant to this platform
  const toolCatalog = getToolCatalog(platform);

  // Pick platform-specific send example (2 steps: lookup + send with DIRECT message)
  const sendTool = platform === "imessage" ? "imessage.send" : platform === "sms" ? "sms.send" : "platform.send";
  const contactTool = platform === "imessage" ? "contacts.apple" : "contacts.lookup";
  const sendArgs = platform === "imessage"
    ? `"handle":"{{vars.contact.handle}}","recipientName":"{{vars.contact.name}}","message":"THE_MESSAGE"`
    : platform === "sms"
    ? `"recipientPhone":"{{vars.contact.phone}}","recipientName":"{{vars.contact.name}}","message":"THE_MESSAGE"`
    : `"recipientId":"{{vars.contact.id}}","recipientName":"{{vars.contact.name}}","platform":"${platform}","message":"THE_MESSAGE"`;
  const contactArgs = platform === "imessage"
    ? `"query":"PERSON_NAME"`
    : `"query":"PERSON_NAME","platform":"${platform}"`;

  const plannerInstruction = `
Return ONLY valid JSON. No markdown.

Produce a multi-step plan. Steps share data via "saveAs"/"{{vars.x.field}}".

Tools:
${toolCatalog}

IMPORTANT rules:
1. If the user gives a DIRECT message to send (e.g. "说明天吃什么"), put that text directly in the send tool's "message" arg. Do NOT use text.generate.
2. Only use text.generate when the user asks to COMPOSE/WRITE something (e.g. "写一封邀请函", "帮我想一段祝福语").
3. If the user already provides a direct address (phone/email), send directly without contact lookup.
4. If no direct address is provided, FIRST look up the contact, THEN send.
5. Each step needs: id, tool, description (Chinese), args. saveAs must be a plain name like "contact".

Example A — direct message "给查理说明天开会":
{"intent":"给查理发消息","steps":[{"id":"s1","tool":"${contactTool}","description":"查找查理","args":{${contactArgs.replace("PERSON_NAME", "查理")}},"saveAs":"contact"},{"id":"s2","tool":"${sendTool}","description":"发送消息","args":{${sendArgs.replace("THE_MESSAGE", "明天开会")}},"dependsOn":["s1"]}]}

Example B — compose + send "帮我写个生日祝福发给查理":
{"intent":"写生日祝福发给查理","steps":[{"id":"s1","tool":"text.generate","description":"生成祝福","args":{"prompt":"写一段简短的生日祝福语"},"saveAs":"msg"},{"id":"s2","tool":"${contactTool}","description":"查找查理","args":{${contactArgs.replace("PERSON_NAME", "查理")}},"saveAs":"contact"},{"id":"s3","tool":"${sendTool}","description":"发送消息","args":{${sendArgs.replace("THE_MESSAGE", "{{vars.msg.text}}")}},"dependsOn":["s1","s2"]}]}

Example C — direct address "给 ruiraywang97@gmail.com 发消息测试":
${platform === "imessage"
  ? '{"intent":"给指定地址发送消息","steps":[{"id":"s1","tool":"imessage.send","description":"直接发送 iMessage","args":{"handle":"ruiraywang97@gmail.com","recipientName":"ruiraywang97@gmail.com","message":"测试"}}]}'
  : platform === "sms"
  ? '{"intent":"给指定号码发送短信","steps":[{"id":"s1","tool":"sms.send","description":"直接发送短信","args":{"recipientPhone":"13800001111","recipientName":"13800001111","message":"测试"}}]}'
  : '{"intent":"发送平台消息","steps":[{"id":"s1","tool":"platform.send","description":"发送平台消息","args":{"recipientId":"USER_ID","recipientName":"同事","platform":"wecom","message":"测试"}}]}'}

User: ${prompt}
`.trim();

  console.log("[createPlan] calling planner…");

  const draft = await planWithRepair(plannerInstruction);
  let { intent, steps, requiredPermissions } = validatePlanDraft(draft);

  // Post-process: strip file.save steps the user didn't ask for
  const wantsFile = /保存|存储|文件|save|file|导出|export/i.test(prompt);
  if (!wantsFile) {
    const before = steps.length;
    steps = steps.filter((s) => s.tool !== "file.save");
    if (steps.length < before) {
      console.log(`[createPlan] stripped ${before - steps.length} unwanted file.save step(s)`);
      // Recompute permissions
      const permsSet = new Set<string>();
      for (const s of steps) {
        const t = getTool(s.tool);
        if (t) for (const p of t.permissions) permsSet.add(p);
      }
      requiredPermissions = Array.from(permsSet);
    }
  }

  const plan: Plan = {
    planId,
    sessionId: args.sessionId,
    createdAt: Date.now(),
    prompt,
    intent: args.intent ?? intent,
    steps,
    requiredPermissions,
  };

  savePlan(planId, plan);
  return plan;
}
