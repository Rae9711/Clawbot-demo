import React, { useEffect, useMemo, useState } from "react";
import { createWS, type EventMsg } from "./api/ws";
import ProposedPlan from "./components/ProposedPlan";
import ExecutionLog from "./components/ExecutionLog";
import FinalAnswer from "./components/FinalAnswer";

// Auto-detect WebSocket URL from current hostname if accessed via ngrok
function getWebSocketURL(): string {
  const envUrl = import.meta.env.VITE_WS_URL;
  if (envUrl) return envUrl;
  
  // If accessed via ngrok (or any HTTPS), use wss:// with same hostname
  if (window.location.protocol === 'https:') {
    const wsProtocol = 'wss:';
    const hostname = window.location.hostname;
    // Default to port 8080 for backend, but ngrok will handle routing
    return `${wsProtocol}//${hostname}`;
  }
  
  // Local development
  return "ws://localhost:8080";
}

const WS_URL = getWebSocketURL();

// ── AI Identity (persisted in localStorage) ──────────────

type AIIdentity = {
  name: string;
  persona: string;
  platform: string;
  platformTarget: string;
  createdAt: number;
};

function loadIdentity(): AIIdentity | null {
  try {
    const raw = localStorage.getItem("ai_identity");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveIdentity(id: AIIdentity) {
  localStorage.setItem("ai_identity", JSON.stringify(id));
}

function getSessionId() {
  let id = localStorage.getItem("demo_session");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("demo_session", id);
  }
  return id;
}

// ── Shared constants ─────────────────────────────────────

const PERSONA_OPTIONS: Record<string, { label: string; desc: string }> = {
  professional: { label: "专业顾问", desc: "正式、结构化、直接给出建议" },
  friendly_coach: { label: "贴心教练", desc: "友好、鼓励、用大白话沟通" },
  no_bs: { label: "直言不讳", desc: "简洁、直接、不说废话" },
  playful_nerd: { label: "极客玩家", desc: "有趣、用比喻，但信息准确" },
};

const PLATFORMS = [
  { id: "imessage", label: "iMessage", target: "#imessage" },
  { id: "sms", label: "手机短信", target: "#sms" },
  { id: "wecom", label: "企业微信", target: "#wecom-team" },
  { id: "dingtalk", label: "钉钉", target: "#dingtalk-group" },
  { id: "feishu", label: "飞书", target: "#feishu-group" },
];

// ── Setup Screen ─────────────────────────────────────────

function SetupScreen({ onComplete }: { onComplete: (id: AIIdentity) => void }) {
  const [name, setName] = useState("");
  const [persona, setPersona] = useState("professional");
  const [platform, setPlatform] = useState("wecom");

  const submit = () => {
    if (!name.trim()) return;
    const plat = PLATFORMS.find((p) => p.id === platform) ?? PLATFORMS[0];
    const identity: AIIdentity = {
      name: name.trim(),
      persona,
      platform: plat.id,
      platformTarget: plat.target,
      createdAt: Date.now(),
    };
    saveIdentity(identity);
    onComplete(identity);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        fontFamily: "'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: 16,
          padding: "40px 36px",
          width: 440,
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 24, textAlign: "center" }}>
          创建你的 AI 助手
        </h1>
        <p
          style={{
            textAlign: "center",
            color: "#6B7280",
            fontSize: 14,
            marginTop: 8,
            marginBottom: 32,
          }}
        >
          从第一天起，这个 AI 就是你的。
        </p>

        {/* AI Name */}
        <div style={{ marginBottom: 24 }}>
          <label
            style={{
              display: "block",
              fontWeight: 600,
              marginBottom: 6,
              fontSize: 14,
            }}
          >
            给你的 AI 起个名字
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：小助、阿智、团队管家…"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #D1D5DB",
              fontSize: 15,
              outline: "none",
            }}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </div>

        {/* Persona */}
        <div style={{ marginBottom: 24 }}>
          <label
            style={{
              display: "block",
              fontWeight: 600,
              marginBottom: 8,
              fontSize: 14,
            }}
          >
            选择沟通风格
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {Object.entries(PERSONA_OPTIONS).map(([key, { label, desc }]) => (
              <div
                key={key}
                onClick={() => setPersona(key)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border:
                    persona === key
                      ? "2px solid #4F46E5"
                      : "1px solid #E5E7EB",
                  background: persona === key ? "#EEF2FF" : "white",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>
                <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
                  {desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Platform */}
        <div style={{ marginBottom: 32 }}>
          <label
            style={{
              display: "block",
              fontWeight: 600,
              marginBottom: 8,
              fontSize: 14,
            }}
          >
            你用什么平台？
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {PLATFORMS.map((p) => (
              <div
                key={p.id}
                onClick={() => setPlatform(p.id)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 20,
                  border:
                    platform === p.id
                      ? "2px solid #4F46E5"
                      : "1px solid #E5E7EB",
                  background: platform === p.id ? "#EEF2FF" : "white",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: platform === p.id ? 600 : 400,
                  transition: "all 0.15s",
                }}
              >
                {p.label}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={submit}
          disabled={!name.trim()}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: 10,
            border: "none",
            background: name.trim() ? "#4F46E5" : "#D1D5DB",
            color: "white",
            fontWeight: 700,
            fontSize: 16,
            cursor: name.trim() ? "pointer" : "not-allowed",
            transition: "background 0.2s",
          }}
        >
          开始使用
        </button>
      </div>
    </div>
  );
}

// ── Phase stepper ────────────────────────────────────────

type Phase = "idle" | "planning" | "planned" | "executing" | "done";

const PHASE_STEPS: { key: Phase; label: string }[] = [
  { key: "idle", label: "输入指令" },
  { key: "planning", label: "生成方案" },
  { key: "planned", label: "审批方案" },
  { key: "executing", label: "执行中" },
  { key: "done", label: "完成" },
];

function PhaseBar({ phase }: { phase: Phase }) {
  const currentIdx = PHASE_STEPS.findIndex((s) => s.key === phase);

  return (
    <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
      {PHASE_STEPS.map((s, i) => (
        <div
          key={s.key}
          style={{
            flex: 1,
            textAlign: "center",
            padding: "8px 0",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: i === currentIdx ? 700 : 400,
            color: i <= currentIdx ? "white" : "#9CA3AF",
            background:
              i < currentIdx
                ? "#059669"
                : i === currentIdx
                  ? "#4F46E5"
                  : "#F3F4F6",
            transition: "all 0.3s",
          }}
        >
          {s.label}
        </div>
      ))}
    </div>
  );
}

// ── App entry point ──────────────────────────────────────

export default function App() {
  const [identity, setIdentity] = useState<AIIdentity | null>(loadIdentity());

  if (!identity) {
    return <SetupScreen onComplete={setIdentity} />;
  }

  return (
    <MainScreen
      identity={identity}
      onReset={() => {
        localStorage.removeItem("ai_identity");
        localStorage.removeItem("demo_session");
        setIdentity(null);
      }}
    />
  );
}

// ── Main screen ──────────────────────────────────────────

function MainScreen({
  identity,
  onReset,
}: {
  identity: AIIdentity;
  onReset: () => void;
}) {
  const sessionId = useMemo(() => getSessionId(), []);
  const [prompt, setPrompt] = useState("");
  const [plan, setPlan] = useState<any>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [finalMsg, setFinalMsg] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [wsClient, setWsClient] = useState<any>(null);
  const [connected, setConnected] = useState(false);
  const [approvedPermissions, setApprovedPermissions] = useState<Set<string>>(new Set());

  // ── WebSocket setup ──────────────────────────────────
  useEffect(() => {
    const client = createWS(WS_URL, (m: EventMsg) => {
      if (m.type === "event") {
        const ev = m.event ?? "";
        const data = m.data;

        if (ev === "gateway.ready") setConnected(true);

        if (ev === "agent.plan.proposed") {
          setPlan(data);
          setPhase("planned");
        }

        if (ev === "agent.plan.error") setPhase("idle");

        if (ev.startsWith("agent.exec") || ev.startsWith("tool.")) {
          setLogs((prev) => [...prev, { ts: Date.now(), ev, data }]);
        }

        if (ev === "agent.exec.started") setPhase("executing");

        if (ev === "agent.rendered") {
          setFinalMsg(data.message);
          setPhase("done");
        }
      } else {
        if (m.result?.planId) setPlanId(m.result.planId);
        if (m.result?.runId) setRunId(m.result.runId);
      }
    });

    setWsClient(client);
  }, []);

  // Set persona on connect
  useEffect(() => {
    if (!wsClient) return;
    wsClient.call("session.setPersona", {
      sessionId,
      persona: identity.persona,
    });
  }, [wsClient, sessionId, identity.persona]);

  // ── Actions ──────────────────────────────────────────
  const askPlan = () => {
    if (!wsClient || !prompt.trim()) return;
    setLogs([]);
    setFinalMsg("");
    setRunId(null);
    setPlanId(null);
    setPlan(null);
    setApprovedPermissions(new Set());
    setPhase("planning");

    wsClient.call("agent.plan", {
      sessionId,
      intent: "process_text",
      prompt,
      platform: identity.platform,
    });
  };

  const togglePermission = (perm: string) => {
    setApprovedPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(perm)) next.delete(perm);
      else next.add(perm);
      return next;
    });
  };

  const requiredPerms: string[] = plan?.requiredPermissions ?? [];
  const allPermsApproved =
    requiredPerms.length === 0 ||
    requiredPerms.every((p: string) => approvedPermissions.has(p));

  const approve = () => {
    if (!wsClient || !planId || !allPermsApproved) return;
    wsClient.call("agent.execute", { sessionId, planId, approved: true });
  };

  const rewrite = (p: string) => {
    if (!wsClient || !runId) return;
    wsClient.call("agent.render", { sessionId, runId, persona: p });
  };

  // ── Derived ──────────────────────────────────────────
  const platLabel =
    PLATFORMS.find((p) => p.id === identity.platform)?.label ?? identity.platform;
  const personaInfo = PERSONA_OPTIONS[identity.persona];

  return (
    <div
      style={{
        fontFamily: "'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif",
        background: "#F9FAFB",
        minHeight: "100vh",
      }}
    >
      {/* ── Header ──────────────────────────────────────── */}
      <header
        style={{
          background: "white",
          borderBottom: "1px solid #E5E7EB",
          padding: "10px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Avatar */}
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: 700,
              fontSize: 16,
              flexShrink: 0,
            }}
          >
            {identity.name[0]}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{identity.name}</div>
            <div style={{ fontSize: 12, color: "#6B7280" }}>
              {personaInfo?.label ?? identity.persona} · {platLabel}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Locality badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "4px 10px",
              borderRadius: 20,
              background: connected ? "#ECFDF5" : "#FEF2F2",
              color: connected ? "#059669" : "#DC2626",
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: connected ? "#059669" : "#DC2626",
                display: "inline-block",
              }}
            />
            {connected ? "本地运行中" : "未连接"}
          </div>

          {/* Model badge */}
          <div
            style={{
              padding: "4px 10px",
              borderRadius: 20,
              background: "#F3F4F6",
              fontSize: 12,
              color: "#6B7280",
            }}
          >
            Ollama · qwen2.5
          </div>

          <button
            onClick={onReset}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              border: "1px solid #E5E7EB",
              background: "white",
              fontSize: 12,
              color: "#6B7280",
              cursor: "pointer",
            }}
          >
            重新设置
          </button>
        </div>
      </header>

      {/* ── Main content ────────────────────────────────── */}
      <div style={{ maxWidth: 1020, margin: "0 auto", padding: "20px 24px" }}>
        <PhaseBar phase={phase} />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 20,
            alignItems: "start",
          }}
        >
          {/* ── Left: Input + Plan ──────────────────────── */}
          <div>
            {/* Prompt input card */}
            <div
              style={{
                background: "white",
                borderRadius: 12,
                border: "1px solid #E5E7EB",
                padding: 20,
                marginBottom: 16,
              }}
            >
              <label
                style={{
                  display: "block",
                  fontWeight: 600,
                  marginBottom: 8,
                  fontSize: 14,
                }}
              >
                告诉{identity.name}你想做什么
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={5}
                placeholder="例如：帮我写一封活动邀请函并发送给团队…"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid #D1D5DB",
                  fontFamily: "inherit",
                  fontSize: 14,
                  resize: "vertical",
                  outline: "none",
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.metaKey) askPlan();
                }}
              />

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginTop: 12,
                }}
              >
                <button
                  onClick={askPlan}
                  disabled={!prompt.trim() || phase === "planning"}
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    borderRadius: 8,
                    border: "none",
                    background:
                      prompt.trim() && phase !== "planning"
                        ? "#4F46E5"
                        : "#D1D5DB",
                    color: "white",
                    fontWeight: 600,
                    fontSize: 14,
                    cursor:
                      prompt.trim() && phase !== "planning"
                        ? "pointer"
                        : "not-allowed",
                    transition: "background 0.2s",
                  }}
                >
                  {phase === "planning" ? "方案生成中…" : "生成方案"}
                </button>

                {phase === "planned" && (
                  <button
                    onClick={approve}
                    disabled={!allPermsApproved}
                    style={{
                      flex: 1,
                      padding: "10px 16px",
                      borderRadius: 8,
                      border: "none",
                      background: allPermsApproved ? "#059669" : "#D1D5DB",
                      color: "white",
                      fontWeight: 600,
                      fontSize: 14,
                      cursor: allPermsApproved ? "pointer" : "not-allowed",
                      transition: "background 0.2s",
                    }}
                  >
                    {allPermsApproved
                      ? "批准并执行"
                      : `请先授权 (${requiredPerms.length - approvedPermissions.size} 项)`}
                  </button>
                )}
              </div>
            </div>

            {/* Plan card */}
            <ProposedPlan
              plan={plan}
              approvedPermissions={approvedPermissions}
              onTogglePermission={togglePermission}
            />
          </div>

          {/* ── Right: Execution + Response ─────────────── */}
          <div>
            <ExecutionLog logs={logs} />
            <FinalAnswer message={finalMsg} />

            {/* Persona rewrite buttons — only after done */}
            {phase === "done" && (
              <div
                style={{
                  marginTop: 16,
                  background: "white",
                  borderRadius: 12,
                  border: "1px solid #E5E7EB",
                  padding: 16,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 10,
                    color: "#6B7280",
                  }}
                >
                  换个风格试试
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {Object.entries(PERSONA_OPTIONS).map(([key, { label }]) => (
                    <button
                      key={key}
                      onClick={() => rewrite(key)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 20,
                        border: "1px solid #E5E7EB",
                        background:
                          key === identity.persona ? "#EEF2FF" : "white",
                        fontSize: 13,
                        cursor: "pointer",
                        fontWeight: key === identity.persona ? 600 : 400,
                        transition: "all 0.15s",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
