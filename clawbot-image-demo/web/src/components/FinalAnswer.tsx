import React from "react";

export default function FinalAnswer({ message }: { message: string }) {
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12, marginTop: 12 }}>
      <div style={{ fontWeight: 700 }}>Final Response</div>
      <pre style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>{message || "Nothing rendered yet."}</pre>
    </div>
  );
}
