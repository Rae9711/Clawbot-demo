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

const app = express();
app.use(cors());
app.use(express.json());

// Keep outbox (still useful even for text-only “send to team” sandbox artifacts)
const outboxDir = path.resolve("src/outbox");
fs.mkdirSync(outboxDir, { recursive: true });

const server = app.listen(8080, () => {
  console.log("Server on http://localhost:8080");
  console.log("Ollama endpoint:", process.env.OLLAMA_URL ?? "http://127.0.0.1:11434");
  console.log("Ollama model:", process.env.OLLAMA_MODEL ?? "qwen2.5:7b");
});
type WSMsg =
  | { id: string; method: "session.setPersona"; params: { sessionId: string; persona: string } }
  | { id: string; method: "session.setPrompt"; params: { sessionId: string; prompt: string } }
  | { id: string; method: "agent.plan"; params: { sessionId: string; intent: string; prompt?: string; teamTarget?: string } }
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

      if (msg.method === "agent.plan") {
        const session = getSession(msg.params.sessionId);
        const prompt = (msg.params.prompt ?? session.prompt ?? "").trim();
        if (!prompt) throw new Error("Prompt is required");

        const plan = await runSandboxed(
          () =>
            createPlan({
              sessionId: msg.params.sessionId,
              persona: session.persona,
              prompt,
              intent: msg.params.intent ?? "unspecified",
              teamTarget: msg.params.teamTarget ?? "#demo-team"
            }),
          { timeoutMs: 1200_000, label: "createPlan" }
        );

        sendJSON(ws, { type: "event", event: "agent.plan.proposed", data: plan });
        sendJSON(ws, { id: msg.id, ok: true, result: { planId: plan.planId } });
        console.log("[agent.plan] start", msg.params.sessionId);
        console.log("[agent.plan] prompt len", prompt.length);

        return;
}



      if (msg.method === "agent.execute") {
        const session = getSession(msg.params.sessionId);

        const emit = (event: string, data: any) => {
          sendJSON(ws, { type: "event", event, data });
        };

        const run = await executePlan({
          sessionId: msg.params.sessionId,
          persona: session.persona,
          planId: msg.params.planId,
          approved: msg.params.approved,
          emit,
          outboxDir,
        });

        // Auto-render at end using current session persona
        const rendered = renderFinal({ runId: run.runId, persona: session.persona });
        sendJSON(ws, { type: "event", event: "agent.rendered", data: rendered });

        sendJSON(ws, { id: msg.id, ok: true, result: { runId: run.runId } });
        return;
      }

      if (msg.method === "agent.render") {
        const session = getSession(msg.params.sessionId);
        const persona = (msg.params.persona || session.persona) as any;

        const rendered = renderFinal({ runId: msg.params.runId, persona });
        sendJSON(ws, { type: "event", event: "agent.rendered", data: rendered });

        sendJSON(ws, { id: msg.id, ok: true });
        return;
      }

      sendJSON(ws, { id: msg.id, ok: false, error: "Unknown method" });
    } catch (e: any) {
      console.error("[agent.plan] ERROR:", e);

      sendJSON(ws, {
        type: "event",
        event: "agent.plan.error",
        data: { message: e?.message || String(e) }
      });

      sendJSON(ws, { id: msg.id, ok: false, error: e?.message || String(e) });
    }

  });

  sendJSON(ws, { type: "event", event: "gateway.ready", data: { ok: true } });
});
