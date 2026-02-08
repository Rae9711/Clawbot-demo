/**
 * WebSocket client with auto-reconnect.
 */

export type EventMsg = {
  type?: string;
  event?: string;
  data?: any;
  id?: string;
  ok?: boolean;
  result?: any;
  error?: string;
};

type PendingMsg = { payload: any };

export function createWS(url: string, onEvent: (m: EventMsg) => void) {
  let ws: WebSocket;
  let isOpen = false;
  const queue: PendingMsg[] = [];
  let reconnectTimer: ReturnType<typeof setTimeout>;

  function connect() {
    ws = new WebSocket(url);
    console.log("[ws] connecting", url);

    ws.onopen = () => {
      isOpen = true;
      console.log("[ws] open");
      for (const m of queue) ws.send(JSON.stringify(m.payload));
      queue.length = 0;
    };

    ws.onmessage = (e) => {
      console.log("[ws] message", e.data);
      try {
        onEvent(JSON.parse(e.data));
      } catch { /* ignore parse errors */ }
    };

    ws.onerror = (e) => console.error("[ws] error", e);

    ws.onclose = (e) => {
      isOpen = false;
      console.warn("[ws] close", e.code);
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => {
        console.log("[ws] reconnecting…");
        connect();
      }, 2000);
    };
  }

  connect();

  function send(payload: any) {
    if (isOpen && ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    } else {
      queue.push({ payload });
    }
  }

  const client = {
    get ws() { return ws; },
    call(method: string, params: any) {
      const id = Math.random().toString(16).slice(2);
      const msg = { id, method, params };
      console.log("[ws] send", msg);
      send(msg);
      return id;
    },
  };

  (window as any).wsClient = client;
  return client;
}
