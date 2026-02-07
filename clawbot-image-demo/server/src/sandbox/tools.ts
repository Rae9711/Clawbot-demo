import fs from "fs";
import path from "path";

/**
 * Sandbox “send to team”.
 * This does NOT integrate with real tools.
 * It writes a JSON artifact to outboxDir for inspection.
 */
export async function sendToTeam(params: {
  outboxDir: string;
  teamTarget?: string;
  prompt: string;
  summary: string;
}) {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `send_${ts}.json`;
  const filePath = path.join(params.outboxDir, filename);

  const payload = {
    teamTarget: params.teamTarget ?? "#demo-team",
    prompt: params.prompt,
    summary: params.summary,
    createdAt: new Date().toISOString(),
  };

  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf-8");

  return {
    ok: true,
    artifact: filePath,
  };
}
