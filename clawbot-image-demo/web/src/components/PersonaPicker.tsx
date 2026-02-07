import React from "react";

export default function PersonaPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Personality</div>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ width: "100%", padding: 8 }}>
        <option value="professional">Professional</option>
        <option value="friendly_coach">Friendly Coach</option>
        <option value="no_bs">No-BS</option>
        <option value="playful_nerd">Playful Nerd</option>
      </select>
    </div>
  );
}
