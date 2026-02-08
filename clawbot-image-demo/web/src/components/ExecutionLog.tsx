import React from "react";

export default function ExecutionLog({ logs }: { logs: any[] }) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: 12,
        border: "1px solid #E5E7EB",
        padding: 20,
        marginBottom: 16,
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>
        执行日志
      </div>

      {logs.length === 0 ? (
        <div style={{ color: "#9CA3AF", fontSize: 13 }}>等待执行…</div>
      ) : (
        <div style={{ maxHeight: 260, overflow: "auto" }}>
          {logs.map((l, i) => {
            const isOk =
              l.ev === "tool.success" ||
              l.ev === "agent.exec.finished" ||
              l.data?.status === "ok";
            const isErr =
              l.ev === "tool.error" || l.data?.status === "error";
            const isRunning = l.data?.status === "running";

            let icon = "⚡";
            let color = "#6B7280";
            if (isOk) {
              icon = "✓";
              color = "#059669";
            } else if (isErr) {
              icon = "✗";
              color = "#DC2626";
            } else if (isRunning) {
              icon = "⏳";
              color = "#D97706";
            }

            // Friendly event label
            const label = friendlyLabel(l.ev);

            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 10,
                  marginBottom: 8,
                  alignItems: "flex-start",
                }}
              >
                <span
                  style={{
                    color,
                    fontWeight: 700,
                    fontSize: 14,
                    width: 18,
                    textAlign: "center",
                    flexShrink: 0,
                    lineHeight: "20px",
                  }}
                >
                  {icon}
                </span>
                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 13,
                      lineHeight: "20px",
                    }}
                  >
                    {label}
                  </div>
                  {l.data?.outputPreview && (
                    <div
                      style={{
                        color: "#6B7280",
                        fontSize: 12,
                        marginTop: 2,
                        maxWidth: 380,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {l.data.outputPreview}
                    </div>
                  )}
                  {l.data?.error && (
                    <div
                      style={{
                        color: "#DC2626",
                        fontSize: 12,
                        marginTop: 2,
                      }}
                    >
                      {l.data.error}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function friendlyLabel(ev: string): string {
  const map: Record<string, string> = {
    "agent.exec.started": "开始执行",
    "agent.exec.step": "执行步骤",
    "agent.exec.finished": "执行完成",
    "tool.start": "调用工具",
    "tool.success": "工具成功",
    "tool.error": "工具失败",
  };
  return map[ev] ?? ev;
}
