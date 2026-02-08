/**
 * Tool: imessage.send
 *
 * Sends a REAL iMessage via macOS Messages.app using AppleScript.
 * This is NOT a mock — it will actually send a message.
 *
 * macOS will prompt for permission on first use:
 *   "Terminal wants to control Messages" → Allow
 *
 * The recipient must be reachable via iMessage (Apple ID / phone number).
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { nanoid } from "nanoid";
import { registerTool, type ToolContext } from "./registry.js";

// ── AppleScript execution via temp file (avoids shell escaping) ──

function runAppleScript(script: string): void {
  const tmpFile = path.join(os.tmpdir(), `imessage_${Date.now()}.scpt`);
  try {
    fs.writeFileSync(tmpFile, script, "utf-8");
    execSync(`osascript "${tmpFile}"`, {
      timeout: 30_000,
      encoding: "utf-8",
    });
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}

function buildSendScript(handle: string, message: string): string {
  // Escape for AppleScript string literals (only need to escape backslash and double-quote)
  const safeHandle = handle.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const safeMessage = message.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

  return `
tell application "Messages"
    set targetService to 1st service whose service type = iMessage
    set targetBuddy to buddy "${safeHandle}" of targetService
    send "${safeMessage}" to targetBuddy
end tell
`.trim();
}

// ── tool registration ────────────────────────────────────

registerTool({
  id: "imessage.send",
  name: "发送 iMessage",
  description: "通过 macOS Messages 应用发送真实 iMessage 消息",
  category: "platform",
  permissions: ["platform.send"],
  argsSchema:
    '{ "handle": "iMessage地址（手机号或邮箱）", "recipientName": "接收者姓名", "message": "消息内容" }',
  outputSchema: '{ "sent": true, "messageId": "消息ID", "handle": "iMessage地址" }',

  async execute(
    args: {
      handle?: string;
      recipientName?: string;
      message?: string;
    },
    ctx: ToolContext,
  ) {
    const message = (args.message ?? "").trim();
    if (!message) throw new Error("imessage.send requires a non-empty message");

    const handle = (args.handle ?? "").trim();
    if (!handle) throw new Error("imessage.send requires a handle (phone or email)");
    
    // Check if handle is a variable resolution error
    if (handle.startsWith("[missing:") || handle.startsWith("[error:")) {
      throw new Error(`无法获取联系人信息: ${handle}。请确保上一步（查找联系人）执行成功。`);
    }

    const recipientName = args.recipientName ?? handle;
    const messageId = nanoid(10);

    console.log(`[imessage.send] Sending to ${recipientName} (${handle}): "${message.slice(0, 80)}…"`);

    // Actually send via AppleScript (written to temp file to avoid shell escaping issues)
    const script = buildSendScript(handle, message);

    try {
      runAppleScript(script);
    } catch (e: any) {
      const errMsg = e.message?.split("\n")[0] ?? "未知错误";

      // Save failed attempt to outbox for audit
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      const failPath = path.join(ctx.outboxDir, `imessage_failed_${ts}.json`);
      fs.writeFileSync(
        failPath,
        JSON.stringify(
          { messageId, handle, recipientName, message, error: errMsg, createdAt: new Date().toISOString() },
          null,
          2,
        ),
        "utf-8",
      );

      return {
        sent: false,
        messageId,
        handle,
        recipientName,
        error: `iMessage 发送失败: ${errMsg}`,
        artifact: failPath,
      };
    }

    // Save successful send to outbox for audit trail
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const artifactPath = path.join(ctx.outboxDir, `imessage_sent_${ts}.json`);
    fs.writeFileSync(
      artifactPath,
      JSON.stringify(
        { messageId, handle, recipientName, message, sent: true, createdAt: new Date().toISOString() },
        null,
        2,
      ),
      "utf-8",
    );

    return {
      sent: true,
      messageId,
      handle,
      recipientName,
      artifact: artifactPath,
    };
  },
});
