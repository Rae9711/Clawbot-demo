import React from "react";

// ── permission labels ────────────────────────────────────

const PERMISSION_LABELS: Record<string, string> = {
  "contacts.read": "读取本机联系人（需用户授权）",
  "platform.send": "使用你的账号发送消息（需用户授权）",
  "files.write": "写入文件",
};

// ── tool display names & icons ───────────────────────────

const TOOL_INFO: Record<string, { icon: string; label: string }> = {
  "text.generate": { icon: "✍", label: "文本生成" },
  "image.generate": { icon: "🎨", label: "图片生成" },
  "contacts.lookup": { icon: "👤", label: "联系人查找" },
  "contacts.apple": { icon: "📇", label: "Apple 通讯录" },
  "platform.send": { icon: "📤", label: "平台消息" },
  "sms.send": { icon: "📱", label: "发送短信" },
  "imessage.send": { icon: "💬", label: "发送 iMessage" },
  "file.save": { icon: "💾", label: "保存文件" },
};

// ── component ────────────────────────────────────────────

export default function ProposedPlan({
  plan,
  approvedPermissions,
  onTogglePermission,
}: {
  plan: any;
  approvedPermissions: Set<string>;
  onTogglePermission: (perm: string) => void;
}) {
  if (!plan) {
    return (
      <Card>
        <Title>执行方案</Title>
        <Empty>方案生成后将在此显示。</Empty>
      </Card>
    );
  }

  const requiredPermissions: string[] = plan.requiredPermissions ?? [];
  const allPermissionsApproved =
    requiredPermissions.length === 0 ||
    requiredPermissions.every((p: string) => approvedPermissions.has(p));

  return (
    <Card>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <Title>执行方案</Title>
        {plan.intent && (
          <span style={pillStyle}>{plan.intent}</span>
        )}
      </div>

      {/* Original prompt */}
      <div style={blockStyle}>
        <div style={blockLabelStyle}>原始指令</div>
        {plan.prompt ?? ""}
      </div>

      {/* Required permissions */}
      {requiredPermissions.length > 0 && (
        <div
          style={{
            background: allPermissionsApproved ? "#ECFDF5" : "#FEF3C7",
            borderRadius: 8,
            padding: 12,
            marginBottom: 14,
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 12, color: "#374151", marginBottom: 8 }}>
            需要以下权限
          </div>
          {requiredPermissions.map((perm: string) => {
            const checked = approvedPermissions.has(perm);
            return (
              <label
                key={perm}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 4,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onTogglePermission(perm)}
                  style={{ accentColor: "#4F46E5" }}
                />
                <span style={{ fontWeight: checked ? 600 : 400 }}>
                  {PERMISSION_LABELS[perm] ?? perm}
                </span>
              </label>
            );
          })}
        </div>
      )}

      {/* Steps */}
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: "#374151" }}>
        执行步骤（{plan.steps?.length ?? 0} 步）
      </div>

      {(plan.steps ?? []).map((s: any, idx: number) => {
        const info = TOOL_INFO[s.tool] ?? { icon: "⚡", label: s.tool };

        return (
          <div key={s.id ?? idx} style={stepCardStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              {/* Step number */}
              <span style={stepNumStyle}>{idx + 1}</span>

              {/* Tool icon + label */}
              <span style={{ fontSize: 14 }}>{info.icon}</span>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{info.label}</span>

              {/* saveAs badge */}
              {s.saveAs && (
                <span style={{ ...pillStyle, background: "#EEF2FF", color: "#4F46E5" }}>
                  → {s.saveAs}
                </span>
              )}

              {/* dependsOn badge */}
              {s.dependsOn?.length > 0 && (
                <span style={{ ...pillStyle, background: "#FEF3C7", color: "#92400E" }}>
                  ← {s.dependsOn.join(", ")}
                </span>
              )}
            </div>

            {/* Description */}
            <div style={{ fontSize: 13, color: "#374151", marginBottom: 6 }}>
              {s.description ?? ""}
            </div>

            {/* Args preview */}
            {s.args && Object.keys(s.args).length > 0 && (
              <div style={argsBlockStyle}>
                {Object.entries(s.args).map(([k, v]) => (
                  <div key={k} style={{ marginBottom: 2 }}>
                    <span style={{ color: "#6B7280" }}>{k}:</span>{" "}
                    <span style={{ color: "#374151" }}>
                      {typeof v === "string" ? v : JSON.stringify(v)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </Card>
  );
}

// ── styles ───────────────────────────────────────────────

const pillStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#6B7280",
  padding: "2px 8px",
  background: "#F3F4F6",
  borderRadius: 12,
};

const blockStyle: React.CSSProperties = {
  background: "#FAFAFA",
  borderRadius: 8,
  padding: 12,
  marginBottom: 14,
  fontSize: 13,
  color: "#374151",
  whiteSpace: "pre-wrap",
  lineHeight: 1.5,
};

const blockLabelStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: 12,
  color: "#9CA3AF",
  marginBottom: 4,
};

const stepCardStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 8,
  border: "1px solid #E5E7EB",
  marginBottom: 8,
};

const stepNumStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 22,
  height: 22,
  borderRadius: "50%",
  background: "#EEF2FF",
  color: "#4F46E5",
  fontSize: 12,
  fontWeight: 700,
  flexShrink: 0,
};

const argsBlockStyle: React.CSSProperties = {
  background: "#FAFAFA",
  borderRadius: 6,
  padding: 8,
  fontSize: 12,
  fontFamily: "ui-monospace, SFMono-Regular, monospace",
  lineHeight: 1.5,
  overflow: "auto",
  maxHeight: 120,
};

// ── small helpers ────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "white", borderRadius: 12, border: "1px solid #E5E7EB", padding: 20 }}>
      {children}
    </div>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return <div style={{ fontWeight: 600, fontSize: 14 }}>{children}</div>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ color: "#9CA3AF", fontSize: 13, marginTop: 8 }}>{children}</div>;
}
