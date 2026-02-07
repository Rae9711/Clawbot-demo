export async function runSandboxed<T>(
  fn: () => Promise<T>,
  opts?: {
    timeoutMs?: number;
    label?: string;
  }
): Promise<T> {
  const timeoutMs = opts?.timeoutMs ?? 60_000; // 60s hard cap
  const label = opts?.label ?? "sandboxed-task";

  let timer: NodeJS.Timeout;

  try {
    return await Promise.race([
      fn(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`Sandbox timeout (${label}) after ${timeoutMs}ms`));
        }, timeoutMs);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
