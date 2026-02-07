export default function ProposedPlan({ plan }: { plan: any }) {
  if (!plan) return <div style={{ marginTop: 12, opacity: 0.7 }}>No plan yet.</div>;

  return (
    <div style={{ marginTop: 12, border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Proposed Plan</div>

      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>
        <div><b>Intent:</b> {plan.intent ?? "n/a"}</div>
        <div><b>Plan ID:</b> {plan.planId ?? "n/a"}</div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Prompt</div>
        <div style={{ whiteSpace: "pre-wrap", fontSize: 13, background: "#fafafa", padding: 10, borderRadius: 8 }}>
          {plan.prompt ?? ""}
        </div>
      </div>

      <div style={{ fontWeight: 600, marginBottom: 6 }}>Steps</div>
      <ol style={{ margin: 0, paddingLeft: 18 }}>
        {(plan.steps ?? []).map((s: any, idx: number) => (
          <li key={s.id ?? idx} style={{ marginBottom: 10 }}>
            <div>
              <b>{s.id ?? `s${idx + 1}`}</b> — <code>{s.tool}</code>
            </div>

            {s.tool === "llm.text" && (
              <div style={{ marginTop: 6, fontSize: 13, whiteSpace: "pre-wrap" }}>
                <div style={{ opacity: 0.8 }}><b>saveAs:</b> {s.saveAs}</div>
                <div style={{ opacity: 0.8 }}><b>prompt:</b></div>
                <div style={{ background: "#fafafa", padding: 8, borderRadius: 8 }}>{s.prompt}</div>
              </div>
            )}

            {s.tool === "outbox.send" && (
              <div style={{ marginTop: 6, fontSize: 13, whiteSpace: "pre-wrap" }}>
                <div style={{ opacity: 0.8 }}><b>teamTarget:</b> {s.teamTarget ?? "n/a"}</div>
                <div style={{ opacity: 0.8 }}><b>message:</b></div>
                <div style={{ background: "#fafafa", padding: 8, borderRadius: 8 }}>{s.message}</div>
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
