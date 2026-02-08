import React from "react";

export default function FinalAnswer({ message }: { message: string }) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: 12,
        border: "1px solid #E5E7EB",
        padding: 20,
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>
        AI 回复
      </div>

      {!message ? (
        <div style={{ color: "#9CA3AF", fontSize: 13 }}>
          执行完成后将显示回复。
        </div>
      ) : (
        <div
          style={{
            whiteSpace: "pre-wrap",
            fontSize: 14,
            lineHeight: 1.7,
            color: "#374151",
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}
