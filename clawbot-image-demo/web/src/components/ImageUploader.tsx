import React, { useState } from "react";

export default function ImageUploader({
  apiUrl,
  imageUrl,
  onUploaded
}: {
  apiUrl: string;
  imageUrl: string | null;
  onUploaded: (url: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch(`${apiUrl}/api/upload`, { method: "POST", body: fd });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Upload failed");
      onUploaded(`${apiUrl}${json.imageUrl}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12, marginTop: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Upload image (demo-only)</div>
      <input
        type="file"
        accept="image/*"
        disabled={busy}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
        }}
      />
      {imageUrl && (
        <div style={{ marginTop: 10 }}>
          <img src={imageUrl} style={{ width: "100%", borderRadius: 10, border: "1px solid #eee" }} />
        </div>
      )}
    </div>
  );
}
