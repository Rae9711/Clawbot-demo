export function createWS(url: string, onEvent: (m: EventMsg) => void) {
  const ws = new WebSocket(url);
  console.log("[ws] connecting", url);

  const queue: PendingMsg[] = [];
  let isOpen = false;

  ws.onopen = () => {
    isOpen = true;
    console.log("[ws] open");
    for (const m of queue) ws.send(JSON.stringify(m.payload));
    queue.length = 0;
  };

  ws.onmessage = (e) => {
    console.log("[ws] message", e.data);
    onEvent(JSON.parse(e.data));
  };

  ws.onerror = (e) => {
    console.error("[ws] error", e);
  };

  ws.onclose = (e) => {
    console.warn("[ws] close", e.code, e.reason);
  };

  function send(payload: any) {
    if (isOpen && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
    else queue.push({ payload });
  }

  const client = {
    ws,
    call(method: string, params: any) {
      const id = Math.random().toString(16).slice(2);
      const msg = { id, method, params };
      console.log("[ws] send", msg);
      send(msg);
      return id;
    }
  };

  // 👇 expose for debugging
  (window as any).wsClient = client;

  return client;
}
