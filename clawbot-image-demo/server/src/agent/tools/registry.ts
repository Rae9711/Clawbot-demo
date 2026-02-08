/**
 * Tool registry — the single source of truth for all available tools.
 *
 * The planner gets a tool catalog generated from this registry.
 * The executor dispatches by tool ID from this registry.
 * Validation checks tool IDs against this registry.
 */

// ── types ────────────────────────────────────────────────

export type ToolPermission =
  | "contacts.read"
  | "platform.send"
  | "files.write";

export type ToolCategory = "content" | "platform" | "data" | "file";

export type ToolContext = {
  outboxDir: string;
  vars: Record<string, any>;
};

export type ToolDefinition = {
  id: string;
  /** Chinese display name */
  name: string;
  /** Chinese description */
  description: string;
  category: ToolCategory;
  permissions: ToolPermission[];
  /** Args schema description for the planner prompt */
  argsSchema: string;
  /** Output schema description for the planner prompt */
  outputSchema: string;
  /** Execute the tool — returns structured output */
  execute: (args: any, ctx: ToolContext) => Promise<any>;
};

// ── registry ─────────────────────────────────────────────

const TOOLS = new Map<string, ToolDefinition>();

export function registerTool(tool: ToolDefinition) {
  if (TOOLS.has(tool.id)) {
    throw new Error(`Tool already registered: ${tool.id}`);
  }
  TOOLS.set(tool.id, tool);
  console.log(`[registry] registered tool: ${tool.id}`);
}

export function getTool(id: string): ToolDefinition | undefined {
  return TOOLS.get(id);
}

export function getAllTools(): ToolDefinition[] {
  return Array.from(TOOLS.values());
}

export function getToolIds(): string[] {
  return Array.from(TOOLS.keys());
}

/**
 * Generate the tool catalog text for the planner prompt.
 * Optionally filter by platform to keep prompt small for slow LLMs.
 */
export function getToolCatalog(platform?: string): string {
  const lines: string[] = [];

  // Determine which tools to show based on platform
  const skipIds = new Set<string>();
  if (platform === "imessage") {
    // Don't show mock contacts, sms, platform tools
    skipIds.add("contacts.lookup");
    skipIds.add("sms.send");
    skipIds.add("platform.send");
  } else if (platform === "sms") {
    skipIds.add("contacts.apple");
    skipIds.add("imessage.send");
    skipIds.add("platform.send");
  } else {
    // wecom / dingtalk / feishu
    skipIds.add("contacts.apple");
    skipIds.add("imessage.send");
    skipIds.add("sms.send");
  }

  for (const tool of TOOLS.values()) {
    if (skipIds.has(tool.id)) continue;
    lines.push(`- ${tool.id}: ${tool.description}. Args: ${tool.argsSchema}. Output: ${tool.outputSchema}`);
  }

  return lines.join("\n");
}

// ── permission labels (Chinese) ──────────────────────────

const PERMISSION_LABELS: Record<ToolPermission, string> = {
  "contacts.read": "读取联系人",
  "platform.send": "发送消息",
  "files.write": "写入文件",
};

export function getPermissionLabel(perm: ToolPermission): string {
  return PERMISSION_LABELS[perm] ?? perm;
}
