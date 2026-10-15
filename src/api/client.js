import { authFetch } from "./auth";

const API = import.meta.env.VITE_API_URL;

export class ConflictError extends Error {
  constructor(detail) {
    super(detail || "Operacja niezgodna ze stanem wątku.");
    this.name = "ConflictError";
    this.detail = detail;
  }
}

async function request(path, { method = "GET", body } = {}) {
  const init = { method };
  if (body !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }
  const res = await authFetch(`${API}${path}`, init);
  if (res.status === 409) {
    const b = await res.json().catch(() => ({}));
    throw new ConflictError(b.detail);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (res.status === 204) return null;
  return res.json();
}

export function mapThreadState(raw) {
  const kind = raw.pending_kind;
  return {
    status:
      kind === "gate" ? "waiting_gate" :
      kind === "execution" ? "pending_execution" :
      "idle",
    gate: raw.gate ?? null,
    pendingNode: raw.pending_node ?? null,
    sideEffectsPossible: Boolean(raw.side_effects_possible),
  };
}

export const getHealth = () => request("/health");
export const getOptions = () => request("/config/options");

export const getThreadState = (id) =>
  request(`/threads/${encodeURIComponent(id)}/state`).then(mapThreadState);
export const getHistory = (id) =>
  request(`/threads/${encodeURIComponent(id)}/history`);

const toThread = (t) => ({ id: t.thread_id, label: t.label ?? "Bez nazwy", updatedAt: t.updated_at });

export const listThreads = async () => (await request("/threads")).map(toThread);
export const createThread = async (label) =>
  toThread(await request("/threads", { method: "POST", body: { label } }));
export const renameThread = async (id, label) =>
  toThread(await request(`/threads/${encodeURIComponent(id)}`, { method: "PATCH", body: { label } }));
export const deleteThread = (id) =>
  request(`/threads/${encodeURIComponent(id)}`, { method: "DELETE" });