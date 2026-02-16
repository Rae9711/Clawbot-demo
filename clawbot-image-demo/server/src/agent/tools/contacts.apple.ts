/**
 * Tool: contacts.apple
 *
 * Reads REAL contacts from macOS Apple Contacts via JXA (JavaScript for Automation).
 * This is NOT a mock — it accesses your actual address book.
 *
 * macOS will prompt for permission on first use:
 *   "Terminal wants to access your Contacts" → Allow
 */

import { execSync } from "child_process";
import fs from "fs";
import { registerTool, type ToolContext } from "./registry.js";

function normalizeDirectHandle(input: string): string | null {
  const q = input.trim();
  if (!q) return null;

  const emailLike = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(q);
  if (emailLike) return q;

  const digits = q.replace(/[^\d+]/g, "");
  const onlyPhoneChars = /^[\d\s()+-]+$/.test(q);
  const digitCount = digits.replace(/\+/g, "").length;
  if (onlyPhoneChars && digitCount >= 7) {
    return digits.startsWith("+") ? digits : digits;
  }

  return null;
}

// ── JXA script template ─────────────────────────────────

function buildSearchScript(query: string): string {
  // Escape for shell + JXA (escape single quotes and backslashes)
  const safe = query.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, '\\"');

  return `
try {
  const app = Application("Contacts");
  app.includeStandardAdditions = false;
  
  const allPeople = app.people();
  const query = "${safe}".toLowerCase();
  const results = [];

  for (let i = 0; i < allPeople.length; i++) {
    try {
      const p = allPeople[i];
      const name = p.name();
      if (!name || !name.toLowerCase().includes(query)) continue;

      const phones = [];
      try {
        const phoneList = p.phones();
        if (phoneList && phoneList.length > 0) {
          for (let j = 0; j < phoneList.length; j++) {
            const ph = phoneList[j];
            phones.push({
              label: (ph.label() || "").replace(/_\\$!<|>!\\$_/g, ""),
              value: ph.value() || ""
            });
          }
        }
      } catch (e) {
        // Skip phones if unavailable
      }

      const emails = [];
      try {
        const emailList = p.emails();
        if (emailList && emailList.length > 0) {
          for (let j = 0; j < emailList.length; j++) {
            const em = emailList[j];
            emails.push({
              label: (em.label() || "").replace(/_\\$!<|>!\\$_/g, ""),
              value: em.value() || ""
            });
          }
        }
      } catch (e) {
        // Skip emails if unavailable
      }

      results.push({ name, phones, emails });
    } catch (e) {
      // Skip this contact if there's an error
      continue;
    }
  }

  JSON.stringify(results);
} catch (e) {
  JSON.stringify({ error: e.toString() });
}

`.trim();
}

function isRunningInContainer(): boolean {
  if (process.env.CI === "true") return true;
  if (fs.existsSync("/.dockerenv")) return true;
  return false;
}

function preflightContactsAccess(): { ok: true } | { ok: false; error: string } {
  if (process.platform !== "darwin") {
    return {
      ok: false,
      error: "Apple 通讯录读取仅支持 macOS。",
    };
  }

  if (isRunningInContainer()) {
    return {
      ok: false,
      error:
        "检测到当前在容器环境中运行，无法读取你本机通讯录。请在 macOS 本机直接运行 server（不要在 Docker 容器内），并用你的系统账户授权后再试。",
    };
  }

  try {
    execSync(`osascript -e 'id of application "Contacts"'`, {
      timeout: 10_000,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    return {
      ok: false,
      error:
        "未检测到 Contacts 应用。请确认在 macOS 本机运行，并确保系统通讯录可用。",
    };
  }

  return { ok: true };
}

// ── tool registration ────────────────────────────────────

registerTool({
  id: "contacts.apple",
  name: "Apple 通讯录",
  description: "从 macOS 通讯录中查找真实联系人（读取 Apple Contacts）",
  category: "data",
  permissions: ["contacts.read"],
  argsSchema: '{ "query": "联系人姓名" }',
  outputSchema: '{ "found": true, "name": "姓名", "phone": "手机号", "email": "邮箱", "handle": "iMessage地址" }',

  async execute(args: { query: string }, _ctx: ToolContext) {
    const query = (args.query ?? "").trim();
    if (!query) throw new Error("contacts.apple requires a non-empty query");

    const preflight = preflightContactsAccess();
    if (!preflight.ok) {
      return {
        found: false,
        name: query,
        error: preflight.error,
      };
    }

    const directHandle = normalizeDirectHandle(query);
    if (directHandle) {
      return {
        found: true,
        name: query,
        phone: directHandle.includes("@") ? null : directHandle,
        email: directHandle.includes("@") ? directHandle : null,
        handle: directHandle,
        allPhones: directHandle.includes("@") ? [] : [{ label: "direct", value: directHandle }],
        allEmails: directHandle.includes("@") ? [{ label: "direct", value: directHandle }] : [],
        matchCount: 1,
        note: "输入是直接联系人地址，已跳过通讯录搜索",
      };
    }

    let raw: string;
    try {
      raw = execSync(`osascript -l JavaScript -e '${buildSearchScript(query)}'`, {
        timeout: 15_000,
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "pipe"], // Capture stderr for better error messages
      }).trim();
    } catch (e: any) {
      // Permission denied or Contacts not available
      const errorOutput = e.stderr?.toString() || e.stdout?.toString() || "";
      const errorMsg = e.message?.split("\n")[0] || "未知错误";
      
      // Provide helpful error messages
      let userFriendlyError = `无法访问 Apple 通讯录`;
      if (/not allowed|denied|not authorized|\(-1743\)|权限|未授权/i.test(errorOutput + " " + errorMsg)) {
        userFriendlyError += ": 需要你本人在本机授权通讯录访问。请在 系统设置 > 隐私与安全性 > 通讯录 中允许 Terminal/iTerm/你的启动器。";
      } else if (/(application|Application).*(not found|can't be found|does not exist)/.test(errorOutput)) {
        userFriendlyError += ": Contacts 应用未找到（可能当前不是在 macOS 本机环境）";
      } else {
        userFriendlyError += `: ${errorMsg}`;
      }
      
      return {
        found: false,
        name: query,
        error: userFriendlyError,
        debug: errorOutput || errorMsg,
      };
    }

    let results: any[];
    try {
      const parsed = JSON.parse(raw);
      // Check if script returned an error
      if (parsed && typeof parsed === "object" && parsed.error) {
        return {
          found: false,
          name: query,
          error: `Apple 通讯录访问错误: ${parsed.error}`,
        };
      }
      results = Array.isArray(parsed) ? parsed : [];
    } catch (e: any) {
      return {
        found: false,
        name: query,
        error: `通讯录返回格式异常: ${e.message || "无法解析结果"}`,
        debug: raw.substring(0, 200), // Include first 200 chars for debugging
      };
    }

    if (results.length === 0) {
      return {
        found: false,
        name: query,
        phone: null,
        email: null,
        error: `在 Apple 通讯录中未找到: ${query}`,
      };
    }

    // Take the first match
    const contact = results[0];
    const phone = contact.phones?.[0]?.value ?? null;
    const email = contact.emails?.[0]?.value ?? null;

    // iMessage handle: prefer phone, fall back to email
    const handle = phone ?? email ?? null;

    return {
      found: true,
      name: contact.name,
      phone,
      email,
      handle,
      allPhones: contact.phones,
      allEmails: contact.emails,
      matchCount: results.length,
    };
  },
});
