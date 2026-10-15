# LangGraph HITL Agent — UI

A React client for a LangGraph agent with human-in-the-loop approval. It streams responses over SSE, shows tool activity as it happens, and lets the user approve or reject tool calls that have side effects.

The backend lives in **[langgraph-hitl-agent](https://github.com/Witek-Witek/langgraph-hitl-agent)**.

## Features

- **Sign-in** with Supabase email and password. The access token is attached in one place, and a `401` triggers one session refresh and retry before signing the user out.
- **Per-user threads** stored on the server. The client keeps only the last opened thread in `localStorage`.
- **Streaming** over `fetch` and `ReadableStream`, parsed with `eventsource-parser`. `EventSource` is not used because it cannot send a POST body or an `Authorization` header.
- **Approval panel** that shows the pending tool calls and their arguments exactly as the server will execute them.
- **Tool trace** attached to each answer, including calls that were rejected.
- **Model profile and persona picker** built from the server's catalog, with a warning when the server reports a different contract version.
- **Connection health indicator** driven by server heartbeats, and autoscroll that stops while you read earlier messages.

## Tech stack

React 19 · Vite · Supabase JS · eventsource-parser · plain CSS

## How it works

The session hook runs a small state machine, and each state allows only certain actions:

| State | Allowed action | Entered on |
|---|---|---|
| `idle` | send | `done`, or an idle thread on open |
| `streaming` | abort | any operation starting a run |
| `waiting_gate` | approve / reject | `gate` event, or a pending approval on open |
| `pending_execution` | finish | a run interrupted by a server restart |
| `error` | send | `error` event, network failure |

Rules the client follows:

- `gate` and `error` end a stream just like `done`; otherwise the UI would hang on every approval.
- When opening a thread, state is fetched **before** history, so a pending approval is shown before the UI looks ready.
- An optimistic user message is rolled back if the server never accepted it, and kept if the stream broke after acceptance.
- A `409` refreshes the thread state; it is never retried.
- Streams are started from user actions only, never from `useEffect`, so React StrictMode cannot send a turn twice.
- The app tree is keyed by user id, so switching accounts discards all in-memory state.

## Project layout

```
src/api/        HTTP client, SSE stream parser, authenticated fetch, Supabase client
src/hooks/      session state machine, auth, server options
src/components/ messages, composer, approval panel, status bar, thread and settings pickers, login
src/App.jsx     auth gate and main layout
```

## Getting started

**Prerequisites:** Node.js 20+, pnpm, and the backend running locally.

```bash
pnpm install
cp .env.example .env.local    # backend URL, Supabase URL and publishable key
pnpm dev                      # http://localhost:5173
```

The backend must list `http://localhost:5173` in `CORS_ORIGINS`.

## Known limitations

- Messages are rendered as plain text, without Markdown.
- Threads can be created and switched; renaming and deleting exist in the API but not yet in the UI.

## Development

The client is developed alongside the backend stages. Each completed stage is tagged (`ui-stage-11`, …).

## License

[MIT](LICENSE)
