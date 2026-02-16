/**
 * Main Server Entry Point (服务器主入口)
 * 
 * 这是整个后端服务的入口文件，负责：
 * 1. Express HTTP 服务器设置
 * 2. WebSocket 服务器设置
 * 3. 消息路由和处理
 * 4. 静态文件服务（生产环境）
 * 
 * ## 服务器架构
 * 
 * - **HTTP**: Express 服务器，提供 REST API
 * - **WebSocket**: 实时双向通信，用于 Agent 操作
 * - **静态文件**: 生产环境 serve 前端文件
 * 
 * ## 启动流程
 * 
 * 1. 导入工具注册模块（自动注册所有工具）
 * 2. 创建 Express 应用
 * 3. 设置中间件（CORS, JSON）
 * 4. 设置路由（/health）
 * 5. 设置静态文件服务（生产环境）
 * 6. 创建 WebSocket 服务器
 * 7. 监听端口（默认 8080）
 * 
 * ## WebSocket 消息类型
 * 
 * ### 客户端 → 服务器
 * 
 * - `session.setPersona`: 设置 AI 人格
 * - `session.setPrompt`: 设置提示词
 * - `agent.plan`: 生成计划
 * - `agent.execute`: 执行计划
 * - `agent.render`: 重新渲染结果（不同风格）
 * 
 * ### 服务器 → 客户端
 * 
 * - `gateway.ready`: 连接就绪
 * - `agent.plan.proposed`: 计划生成完成
 * - `agent.plan.error`: 计划生成失败
 * - `agent.exec.started`: 执行开始
 * - `agent.exec.step`: 步骤状态更新
 * - `agent.exec.finished`: 执行完成
 * - `tool.start`: 工具开始执行
 * - `tool.success`: 工具执行成功
 * - `tool.error`: 工具执行失败
 * - `agent.rendered`: 结果渲染完成
 * 
 * ## 执行流程
 * 
 * 1. **Plan Generation** (agent.plan):
 *    - 调用 `createPlan()` 生成计划
 *    - 发送 `agent.plan.proposed` 事件
 * 
 * 2. **Execution** (agent.execute):
 *    - 调用 `executePlan()` 执行计划
 *    - 发送执行事件（tool.start, tool.success, etc.）
 *    - 调用 `renderFinal()` 生成最终答案
 *    - 发送 `agent.rendered` 事件
 * 
 * 3. **Re-render** (agent.render):
 *    - 使用不同的 persona 重新渲染结果
 *    - 发送 `agent.rendered` 事件
 * 
 * ## 错误处理
 * 
 * - WebSocket 消息解析失败：返回 "Bad JSON" 错误
 * - 未知方法：返回 "Unknown method" 错误
 * - 执行错误：发送 `agent.plan.error` 事件
 * - 渲染失败：发送降级消息（包含执行摘要）
 * 
 * ## 环境变量
 * 
 * - `PORT`: 服务器端口（默认 8080）
 * - `NODE_ENV`: 环境模式（development/production）
 * - `OLLAMA_URL`: Ollama API 地址
 * - `OLLAMA_MODEL`: 默认模型
 */
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { WebSocketServer } from "ws";
import { runSandboxed } from "./sandbox/sandboxRunner.js";
import { bindConnector, getConnectorId, getSession, setPersona, setPrompt } from "./sessionStore.js";
import { createPlan } from "./agent/plan.js";
import { executePlan } from "./agent/execute.js";
import { renderFinal } from "./agent/render.js";
import {
  getConnectedConnectorIds,
  hasConnector,
  invokeConnectorTool,
  registerConnector,
  resolveConnectorResult,
  unregisterConnectorBySocket,
} from "./connectorHub.js";

/**
 * 导入工具注册模块
 * 
 * 这个导入会执行所有工具的 registerTool() 调用，
 * 将所有工具注册到全局工具注册表中。
 * 
 * 工具注册顺序：
 * 1. text.generate
 * 2. image.generate
 * 3. contacts.lookup
 * 4. contacts.apple
 * 5. platform.send
 * 6. sms.send
 * 7. imessage.send
 * 8. file.save
 */
import "./agent/tools/index.js";

const app = express();
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Keep outbox (still useful even for text-only "send to team" sandbox artifacts)
const outboxDir = path.resolve("src/outbox");
fs.mkdirSync(outboxDir, { recursive: true });

// Serve frontend static files in production
const isProduction = process.env.NODE_ENV === "production";
if (isProduction) {
  // Try multiple paths: Docker build path, then local dev path
  const webDistPaths = [
    path.resolve("./web-dist"),  // Docker build (copied from frontend-builder)
    path.resolve("../web/dist"), // Local development
  ];
  
  for (const webDist of webDistPaths) {
    if (fs.existsSync(webDist)) {
      app.use(express.static(webDist));
      app.get("*", (_req, res) => {
        res.sendFile(path.join(webDist, "index.html"));
      });
      console.log(`Serving frontend from: ${webDist}`);
      break;
    }
  }
}

const PORT = process.env.PORT ?? 8080;
const server = app.listen(PORT, () => {
  console.log(`Server on http://localhost:${PORT}`);
  console.log("Ollama endpoint:", process.env.OLLAMA_URL ?? "http://127.0.0.1:11434");
  console.log("Ollama model:", process.env.OLLAMA_MODEL ?? "qwen2.5:7b");
});

type WSMsg =
  | { id: string; method: "session.setPersona"; params: { sessionId: string; persona: string } }
  | { id: string; method: "session.setPrompt"; params: { sessionId: string; prompt: string } }
  | { id: string; method: "session.bindConnector"; params: { sessionId: string; connectorId: string } }
  | { id: string; method: "agent.plan"; params: { sessionId: string; intent: string; prompt?: string; teamTarget?: string; platform?: string } }
  | { id: string; method: "agent.execute"; params: { sessionId: string; planId: string; approved: boolean } }
  | { id: string; method: "agent.render"; params: { sessionId: string; runId: string; persona: string } }
  | { id: string; method: "connector.register"; params: { connectorId: string; token?: string } }
  | { id: string; method: "connector.result"; params: { requestId: string; ok: boolean; result?: any; error?: string } };

function sendJSON(ws: any, obj: any) {
  ws.send(JSON.stringify(obj));
}

const wss = new WebSocketServer({ server });

const CONNECTOR_TOOLS = new Set(["contacts.apple", "imessage.send"]);
const CONNECTOR_TOKEN = process.env.CONNECTOR_TOKEN?.trim();
const REQUIRE_CONNECTOR_FOR_APPLE = process.env.REQUIRE_CONNECTOR_FOR_APPLE !== "false";

wss.on("connection", (ws) => {
  ws.on("message", async (raw) => {
    let msg: WSMsg;

    try {
      msg = JSON.parse(raw.toString());
    } catch {
      sendJSON(ws, { type: "error", error: "Bad JSON" });
      return;
    }

    const msgId = msg.id;

    try {
      if (msg.method === "session.setPersona") {
        setPersona(msg.params.sessionId, msg.params.persona);
        sendJSON(ws, { id: msg.id, ok: true });
        return;
      }

      if (msg.method === "session.setPrompt") {
        setPrompt(msg.params.sessionId, msg.params.prompt ?? "");
        sendJSON(ws, { id: msg.id, ok: true });
        return;
      }

      if (msg.method === "session.bindConnector") {
        const sessionId = msg.params.sessionId;
        const connectorId = (msg.params.connectorId ?? "").trim();
        if (!connectorId) throw new Error("connectorId is required");

        bindConnector(sessionId, connectorId);
        sendJSON(ws, {
          id: msg.id,
          ok: true,
          result: {
            sessionId,
            connectorId,
            connected: hasConnector(connectorId),
          },
        });
        return;
      }

      if (msg.method === "connector.register") {
        const connectorId = (msg.params.connectorId ?? "").trim();
        if (!connectorId) throw new Error("connectorId is required");

        if (CONNECTOR_TOKEN && msg.params.token !== CONNECTOR_TOKEN) {
          console.warn(`[connector] register rejected (invalid token): ${connectorId}`);
          sendJSON(ws, { id: msg.id, ok: false, error: "Invalid connector token" });
          return;
        }

        registerConnector(connectorId, ws as any);
        console.log(`[connector] register accepted: ${connectorId}`);
        sendJSON(ws, {
          id: msg.id,
          ok: true,
          result: {
            connectorId,
            connectedConnectors: getConnectedConnectorIds(),
          },
        });
        return;
      }

      if (msg.method === "connector.result") {
        resolveConnectorResult(msg.params);
        sendJSON(ws, { id: msg.id, ok: true });
        return;
      }

      // ── Call A: Planner ──────────────────────────────
      if (msg.method === "agent.plan") {
        const session = getSession(msg.params.sessionId);
        const prompt = (msg.params.prompt ?? session.prompt ?? "").trim();
        if (!prompt) throw new Error("Prompt is required");

        const plan = await runSandboxed(
          () =>
            createPlan({
              sessionId: msg.params.sessionId,
              prompt,
              intent: msg.params.intent ?? "unspecified",
              platform: msg.params.platform ?? "wecom",
            }),
          { timeoutMs: 600_000, label: "createPlan" },
        );

        sendJSON(ws, { type: "event", event: "agent.plan.proposed", data: plan });
        sendJSON(ws, { id: msg.id, ok: true, result: { planId: plan.planId } });
        console.log("[agent.plan] done", msg.params.sessionId, "prompt len", prompt.length);
        return;
      }

      // ── Deterministic execution → Reporter → Styler ──
      if (msg.method === "agent.execute") {
        const session = getSession(msg.params.sessionId);

        const emit = (event: string, data: any) => {
          sendJSON(ws, { type: "event", event, data });
        };

        // Execution: dispatch to tools from registry
        const run = await executePlan({
          sessionId: msg.params.sessionId,
          planId: msg.params.planId,
          approved: msg.params.approved,
          emit,
          outboxDir,
          executeTool: async ({ sessionId, step, args, timeoutMs, localExecute }) => {
            const connectorId = getConnectorId(sessionId);

            if (!CONNECTOR_TOOLS.has(step.tool)) {
              return localExecute();
            }

            if (!connectorId) {
              if (!REQUIRE_CONNECTOR_FOR_APPLE) {
                return localExecute();
              }
              return {
                error: "当前会话未绑定本机 Connector。请先在页面中绑定 Connector ID 后再执行 Apple 通讯录/iMessage 操作。",
              };
            }

            if (!hasConnector(connectorId)) {
              return {
                error: `未连接本地 Connector（${connectorId}）。请在你的 Mac 上启动 Connector 后重试。`,
              };
            }

            try {
              return await invokeConnectorTool({
                connectorId,
                tool: step.tool,
                args,
                timeoutMs: timeoutMs + 15_000,
              });
            } catch (e: any) {
              return {
                error: `本地 Connector 执行失败: ${e?.message || String(e)}`,
              };
            }
          },
        });

        // Reporter + optional Styler — the only post-execution LLM calls.
        // If rendering fails, still return the run result (execution succeeded).
        try {
          const rendered = await renderFinal({
            runId: run.runId,
            persona: session.persona,
          });
          sendJSON(ws, { type: "event", event: "agent.rendered", data: rendered });
        } catch (renderErr: any) {
          console.error("[render] ERROR:", renderErr?.message ?? renderErr);
          // Fallback: send execution summary as the rendered message
          sendJSON(ws, {
            type: "event",
            event: "agent.rendered",
            data: {
              runId: run.runId,
              persona: session.persona,
              message: `执行已完成（${run.executionSummary.status}），但生成回复时出错。\n\n` +
                `错误: ${renderErr?.message ?? "未知错误"}\n\n` +
                `执行摘要:\n${run.executionSummary.steps.map(s => `• ${s.tool}: ${s.status}`).join("\n")}`,
            },
          });
        }

        sendJSON(ws, { id: msg.id, ok: true, result: { runId: run.runId } });
        return;
      }

      // ── Re-render with a different persona ───────────
      if (msg.method === "agent.render") {
        const session = getSession(msg.params.sessionId);
        const persona = (msg.params.persona || session.persona) as any;

        const rendered = await renderFinal({ runId: msg.params.runId, persona });
        sendJSON(ws, { type: "event", event: "agent.rendered", data: rendered });

        sendJSON(ws, { id: msg.id, ok: true });
        return;
      }

      sendJSON(ws, { id: msgId, ok: false, error: "Unknown method" });
    } catch (e: any) {
      console.error("[ws] ERROR:", e);

      sendJSON(ws, {
        type: "event",
        event: "agent.plan.error",
        data: { message: e?.message || String(e) },
      });

      sendJSON(ws, { id: msgId, ok: false, error: e?.message || String(e) });
    }
  });

  sendJSON(ws, { type: "event", event: "gateway.ready", data: { ok: true } });

  ws.on("close", () => {
    unregisterConnectorBySocket(ws as any);
  });
});

// write test

// overwrite-test
