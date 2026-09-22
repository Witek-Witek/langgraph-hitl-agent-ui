# Klient przeglądarkowy agenta LangGraph

Jeden klient dla wszystkich stage'ów backendu — wskazuje backend przez `VITE_API_URL`,
konsumuje kontrakt SSE, nie implementację. Jeśli przestaje działać po zmianie stage'u
backendu, kontrakt został złamany.

## Uruchomienie
    cd ui
    pnpm install
    cp .env.example .env.local        # VITE_API_URL=http://localhost:8000
    pnpm dev                          # http://localhost:5173

Backend (`stage_08`) musi mieć `http://localhost:5173` w `CORS_ORIGINS`.

## Architektura
    src/api/client.js        REST: /state, /history, ConflictError, mapThreadState
    src/api/stream.js        POST + ReadableStream + parser SSE, zdarzenia syntetyczne
    src/hooks/useAgentSession.js   maszyna stanów, tabela ALLOWED, runStream
    src/components/          MessageList, Composer, GatePanel, StatusBar, ThreadPicker

## Maszyna stanów
| Stan | Dozwolone | Źródło |
|---|---|---|
| `idle` | send | `done`, `/state` bez oczekiwania |
| `streaming` | abort | start operacji |
| `waiting_gate` | decide | zdarzenie `gate`, `/state` z `pending_kind: gate` |
| `pending_execution` | finish | `/state` z `pending_kind: execution` |
| `error` | send | zdarzenie `error`, błąd sieci |

## Kontrakt zdarzeń (obsługiwany)
`token` · `tool_start` · `tool_end` · `gate` · `done` · `error` · `heartbeat`
Syntetyczne (transport): `__truncated__`, `__malformed__`.
Nieznane → pomijane i liczone (licznik „kontrakt: N" w pasku stanu).

## Zasady, których ten klient pilnuje
- **`gate` i `error` kończą strumień jak `done`** — inaczej UI wisi na każdej bramce.
- **Payload bramki renderowany bez modyfikacji** — człowiek widzi dokładnie to, co zostanie wykonane.
- **Stan przed historią** przy otwarciu wątku — zaległa bramka widoczna, zanim UI zasugeruje gotowość.
- **Optymistyczna wiadomość wycofywana, gdy backend jej nie przyjął** (409, brak połączenia);
  zostaje, gdy strumień zerwał się po przyjęciu (jest w checkpoincie).
- **409 → odświeżenie stanu, nigdy ponowienie.**
- **Strumień nigdy z `useEffect`** — StrictMode wysłałby dwie tury.

## Ograniczenia
- Lista wątków tylko w `localStorage` tej przeglądarki (backend nie ma rejestru wątków).
- Brak uwierzytelnienia; `thread_id` od klienta (dług IDOR od Stage 05).
- Heartbeat backendu nie dociera w fazie myślenia modelu (luka D-08).
- Brak Markdown i historii argumentów narzędzi po odświeżeniu (`/history` zwraca wynik bez `args`).