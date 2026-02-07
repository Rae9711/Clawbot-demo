import React from "react";

export default function ExecutionLog({ logs }: { logs: any[] }) {
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
      <div style={{ fontWeight: 700 }}>Execution Log</div>
      <div style={{ marginTop: 8, height: 260, overflow: "auto", fontFamily: "ui-monospace, SFMono-Regular", fontSize: 12 }}>
        {logs.length === 0 ? (
          <div style={{ opacity: 0.7 }}>No execution yet.</div>
        ) : logs.map((l, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <div><b>{l.ev}</b></div>
            <div style={{ opacity: 0.8 }}>{JSON.stringify(l.data)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
