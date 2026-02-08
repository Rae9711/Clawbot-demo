/**
 * Tool: sms.send
 *
 * Sends an SMS text message to a phone number.
 * For the demo, this writes a JSON artifact to the outbox directory.
 * In production, this would call Twilio / Vonage / carrier API.
 */

import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { registerTool, type ToolContext } from "./registry.js";

registerTool({
  id: "sms.send",
  name: "发送短信",
  description: "通过手机发送短信给联系人",
  category: "platform",
  permissions: ["platform.send"],
  argsSchema:
    '{ "recipientPhone": "手机号码", "recipientName": "接收者姓名", "message": "短信内容" }',
  outputSchema: '{ "sent": true, "messageId": "消息ID", "artifact": "本地存档路径" }',

  async execute(
    args: {
      recipientPhone?: string;
      recipientName?: string;
      message?: string;
    },
    ctx: ToolContext,
  ) {
    const message = (args.message ?? "").trim();
    if (!message) throw new Error("sms.send requires a non-empty message");

    const phone = args.recipientPhone ?? "unknown";
    const recipientName = args.recipientName ?? "unknown";
    const messageId = nanoid(10);

    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `sms_${ts}.json`;
    const filePath = path.join(ctx.outboxDir, filename);

    const payload = {
      messageId,
      type: "sms",
      recipientPhone: phone,
      recipientName,
      message,
      createdAt: new Date().toISOString(),
    };

    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf-8");

    console.log(`[sms.send] SMS to ${recipientName} (${phone}): "${message.slice(0, 50)}…"`);

    return {
      sent: true,
      messageId,
      artifact: filePath,
      recipientName,
      recipientPhone: phone,
    };
  },
});
