import React, { useEffect, useMemo, useState } from "react";
import { createWS, type EventMsg } from "./api/ws";
import PersonaPicker from "./components/PersonaPicker";
import ProposedPlan from "./components/ProposedPlan";
import ExecutionLog from "./components/ExecutionLog";
import FinalAnswer from "./components/FinalAnswer";

const WS_URL = "ws://localhost:8080";

function newSessionId() {
  return (
    localStorage.getItem("demo_session") ||
    (() => {
      const id = crypto.randomUUID();
      localStorage.setItem("demo_session", id);
      return id;
    })()
  );
}

export default function App() {
  const sessionId = useMemo(() => newSessionId(), []);
  const [persona, setPersona] = useState("professional");

  const [prompt, setPrompt] = useState<string>(
    "We want to build a lightweight agent framework where LLMs propose plans but never execute tools directly."
  );

  const [plan, setPlan] = useState<any>(null);
  const [planId, setPlanId] = useState<string | null>(null);

  const [runId, setRunId] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [finalMsg, setFinalMsg] = useState<string>("");

  const [wsClient, setWsClient] = useState<any>(null);

  useEffect(() => {
    const client = createWS(WS_URL, (m: EventMsg) => {
      if ((m as any).type === "event") {
        const ev = (m as any).event;
        const data = (m as any).data;

        if (ev === "agent.plan.proposed") setPlan(data);

        if (ev.startsWith("agent.exec") || ev.startsWith("tool.")) {
          setLogs((prev) => [...prev, { ts: Date.now(), ev, data }]);
        }

        if (ev === "agent.rendered") setFinalMsg(data.message);
      } else {
        if ((m as any).result?.planId) setPlanId((m as any).result.planId);
        if ((m as any).result?.runId) setRunId((m as any).result.runId);
      }
    });

    setWsClient(client);
  }, []);

  useEffect(() => {
    if (!wsClient) return;
    wsClient.call("session.setPersona", { sessionId, persona });
  }, [wsClient, persona, sessionId]);

  useEffect(() => {
    if (!wsClient) return;
    wsClient.call("session.setPrompt", { sessionId, prompt });
  }, [wsClient, prompt, sessionId]);

  const askPlan = () => {
    if (!wsClient) return;

    setLogs([]);
    setFinalMsg("");
    setRunId(null);
    setPlanId(null);
    setPlan(null);

    wsClient.call("agent.plan", {
      sessionId,
      intent: "process_text",
      prompt,
      teamTarget: "#demo-team",
    });
  };

  const approveAndExecute = () => {
    if (!wsClient || !planId) return;
    wsClient.call("agent.execute", { sessionId, planId, approved: true });
  };

  const rewrite = (p: string) => {
    if (!wsClient || !runId) return;
    wsClient.call("agent.render", { sessionId, runId, persona: p });
  };

  const canRun = Boolean(wsClient && prompt.trim().length > 0);

  return (
    <div style={{ fontFamily: "system-ui", padding: 16, maxWidth: 980, margin: "0 auto" }}>
      <h2>Clawbot-style Demo (Text-only + Local Qwen via Ollama)</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <PersonaPicker value={persona} onChange={setPersona} />

          <div style={{ marginTop: 12 }}>
            <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
              Prompt / Instructions
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={6}
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 8,
                border: "1px solid #ddd",
                fontFamily: "inherit",
                fontSize: 14,
                resize: "vertical",
              }}
              placeholder="Tell the agent what you want it to do..."
            />
            <div style={{ opacity: 0.6, fontSize: 12, marginTop: 6 }}>
              This text will be sent to the planner (and stored in session).
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={askPlan} disabled={!canRun}>
              Generate plan
            </button>
            <button onClick={approveAndExecute} disabled={!planId}>
              Approve
            </button>
          </div>

          <ProposedPlan plan={plan} />
        </div>

        <div>
          <ExecutionLog logs={logs} />
          <FinalAnswer message={finalMsg} />

          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <button onClick={() => rewrite("professional")} disabled={!runId}>
              Rewrite: Professional
            </button>
            <button onClick={() => rewrite("friendly_coach")} disabled={!runId}>
              Rewrite: Friendly Coach
            </button>
            <button onClick={() => rewrite("no_bs")} disabled={!runId}>
              Rewrite: No-BS
            </button>
            <button onClick={() => rewrite("playful_nerd")} disabled={!runId}>
              Rewrite: Playful Nerd
            </button>
          </div>

          <p style={{ opacity: 0.7, marginTop: 12 }}>
            “Send to team” writes a JSON artifact to server/src/outbox/ (sandbox output).
          </p>
        </div>
      </div>
    </div>
  );
}
