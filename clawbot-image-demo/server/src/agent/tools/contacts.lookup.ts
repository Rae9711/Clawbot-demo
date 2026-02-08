/**
 * Tool: contacts.lookup
 *
 * Looks up a contact by name on a given platform.
 * For the demo, this uses a mock contact database.
 * In production, this would call the platform's contacts API.
 */

import { registerTool, type ToolContext } from "./registry.js";

// ── mock contact database ────────────────────────────────

type MockContact = {
  id: string;
  name: string;
  platform: string;
  phone?: string;
  department?: string;
};

const MOCK_CONTACTS: MockContact[] = [
  // 企业微信
  { id: "wecom-001", name: "张三", platform: "wecom", phone: "13800001111", department: "市场部" },
  { id: "wecom-002", name: "李四", platform: "wecom", phone: "13800002222", department: "技术部" },
  { id: "wecom-003", name: "王五", platform: "wecom", phone: "13800003333", department: "产品部" },
  { id: "wecom-004", name: "赵六", platform: "wecom", phone: "13800004444", department: "设计部" },
  { id: "wecom-005", name: "陈七", platform: "wecom", phone: "13800005555", department: "运营部" },

  // 钉钉
  { id: "dingtalk-001", name: "张三", platform: "dingtalk", phone: "13800001111", department: "市场部" },
  { id: "dingtalk-002", name: "李四", platform: "dingtalk", phone: "13800002222", department: "技术部" },

  // 飞书
  { id: "feishu-001", name: "张三", platform: "feishu", phone: "13800001111", department: "市场部" },
  { id: "feishu-002", name: "李四", platform: "feishu", phone: "13800002222", department: "技术部" },

  // SMS (手机通讯录)
  { id: "sms-001", name: "张三", platform: "sms", phone: "13800001111" },
  { id: "sms-002", name: "李四", platform: "sms", phone: "13800002222" },
  { id: "sms-003", name: "王五", platform: "sms", phone: "13800003333" },
  { id: "sms-004", name: "查理", platform: "sms", phone: "13900006666" },
  { id: "sms-005", name: "Charlie", platform: "sms", phone: "13900006666" },
  { id: "sms-006", name: "大卫", platform: "sms", phone: "13900007777" },
  { id: "sms-007", name: "David", platform: "sms", phone: "13900007777" },
  { id: "sms-008", name: "小明", platform: "sms", phone: "13900008888" },
  { id: "sms-009", name: "赵六", platform: "sms", phone: "13800004444" },
  { id: "sms-010", name: "陈七", platform: "sms", phone: "13800005555" },
];

// ── tool registration ────────────────────────────────────

registerTool({
  id: "contacts.lookup",
  name: "联系人查找",
  description: "在通讯录中查找联系人（支持企业微信、钉钉、飞书、手机通讯录）",
  category: "data",
  permissions: ["contacts.read"],
  argsSchema: '{ "query": "联系人姓名", "platform": "wecom|dingtalk|feishu|sms" }',
  outputSchema: '{ "found": true, "id": "联系人ID", "name": "姓名", "platform": "平台", "phone": "手机号", "department": "部门" }',

  async execute(
    args: { query: string; platform?: string },
    _ctx: ToolContext,
  ) {
    const query = (args.query ?? "").trim();
    if (!query) throw new Error("contacts.lookup requires a non-empty query");

    const platform = args.platform ?? "sms";

    // Search mock database — name includes query, platform matches
    const match = MOCK_CONTACTS.find(
      (c) =>
        c.name.toLowerCase().includes(query.toLowerCase()) &&
        c.platform === platform,
    );

    if (!match) {
      // Fallback: search across all platforms
      const anyMatch = MOCK_CONTACTS.find((c) =>
        c.name.toLowerCase().includes(query.toLowerCase()),
      );

      if (anyMatch) {
        return {
          found: true,
          id: anyMatch.id,
          name: anyMatch.name,
          platform: anyMatch.platform,
          phone: anyMatch.phone ?? null,
          department: anyMatch.department ?? null,
          note: `未在${platform}中找到，但在${anyMatch.platform}中找到`,
        };
      }

      return {
        found: false,
        id: null,
        name: query,
        platform,
        phone: null,
        error: `未找到联系人: ${query}`,
      };
    }

    return {
      found: true,
      id: match.id,
      name: match.name,
      platform: match.platform,
      phone: match.phone ?? null,
      department: match.department ?? null,
    };
  },
});
