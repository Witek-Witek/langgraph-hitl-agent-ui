import { createParser } from "eventsource-parser";
import { ConflictError } from "./client";
import { authFetch } from "./auth";

const API = import.meta.env.VITE_API_URL;

const TERMINAL_EVENTS = new Set(["done", "gate", "error"]);

export async function streamRun({ path, body, signal, onEvent, onOpen }) {
  const res = await authFetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : null,
    signal,
  });

  if (res.status === 409) {
    const detail = await res.json().catch(() => ({}));
    throw new ConflictError(detail.detail);
  }
  if (!res.ok) {
    let detail = "";
    try { detail = JSON.stringify((await res.json()).detail); } catch { /* nie-JSON */ }
    const msg = `HTTP ${res.status}${detail ? ` — ${detail}` : ""}`;
    throw new Error(msg)
  }

  if (!res.body) throw new Error("Odpowiedź bez strumienia.");
  onOpen?.();

  let terminated = false;

  const parser = createParser({
    onEvent(evt) {
      const type = evt.event || "message";
      if (TERMINAL_EVENTS.has(type)) terminated = true;

      let data = {};
      if (evt.data) {
        try {
          data = JSON.parse(evt.data);
        } catch {
          onEvent({ type: "__malformed__", data: { raw: evt.data, event: type } });
          return;
        }
      }
      onEvent({ type, data });
    },
    onError() {
      onEvent({ type: "__malformed__", data: {} });
    },
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      parser.feed(decoder.decode(value, { stream: true }));
    }
  } finally {
    parser.feed(decoder.decode());
    reader.releaseLock();
  }

  if (!terminated) onEvent({ type: "__truncated__", data: {} });
}