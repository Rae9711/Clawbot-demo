import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { WebSocketServer } from "ws";
import { runSandboxed } from "./sandbox/sandboxRunner.js";
import { getSession, setPersona, setPrompt } from "./sessionStore.js";
import { createPlan } from "./agent/plan.js";
import { executePlan } from "./agent/execute.js";
import { renderFinal } from "./agent/render.js";

// Register all tools at startup
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
  | { id: string; method: "agent.plan"; params: { sessionId: string; intent: string; prompt?: string; teamTarget?: string; platform?: string } }
  | { id: string; method: "agent.execute"; params: { sessionId: string; planId: string; approved: boolean } }
  | { id: string; method: "agent.render"; params: { sessionId: string; runId: string; persona: string } };

function sendJSON(ws: any, obj: any) {
  ws.send(JSON.stringify(obj));
}

const wss = new WebSocketServer({ server });

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
});

// write test

// overwrite-test
