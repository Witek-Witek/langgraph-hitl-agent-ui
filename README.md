# Stage 10 — parametry per żądanie: kontekst uruchomienia + katalogi

## Co wprowadza
Klient steruje modelem i stylem odpowiedzi **per żądanie**. Wybór przechodzi typowanym
kontekstem (`RunContext` + `context_schema`), a klient wysyła **klucze z katalogu**,
nigdy specyfikacji. Prompt składany warstwowo. Naprawiony heartbeat (L-11).

## Jak uruchomić
    uv sync
    cp .env.example .env
    uv run python diagnostics.py
    uv run python serve.py
    uv run langgraph dev
    # klient: cd ../ui && pnpm dev

## Trzy kanały danych
| Kanał | Zawartość | Utrwalany | Przykład |
|---|---|---|---|
| State | dane rozmowy | tak (checkpoint) | `messages`, `route`, `tool_iterations` |
| Config | identyfikatory techniczne | — | `thread_id`, `metadata` |
| **Context** | wybory per uruchomienie | **nie** | `profile`, `persona` |

**Kontekst nie przeżywa w checkpoincie** — każde uruchomienie musi go przekazać,
w tym `/resume` i `/finish`. Pominięcie = cicha degradacja do wartości domyślnych.

## Katalogi (serwer decyduje, klient wybiera)
- `MODEL_PROFILES` w `llm.py` — `fast` / `balanced` / `deep`; specyfikacja i parametry
  (w tym temperatura) są właściwością profilu.
- `PERSONAS` w `prompts.py` — `neutral` / `teacher` / `concise`; persona to **fragment**,
  nie pełny prompt.

Klient nigdy nie wysyła specyfikacji modelu ani treści promptu. Powody: podmiana
`api_key`/`base_url`, dopuszczenie niezweryfikowanego modelu oraz **wzrost cache'u
fabryki sterowany z zewnątrz** (klucz od klienta = nieograniczona liczba wpisów).

## Warstwy promptu
`FRAME` (stała, w tym zasady bezpieczeństwa) → persona → dane dynamiczne (data).
Kolejność jest kontraktem: zmienne na końcu, bo dostawcy cache'ują **prefiks**.
`FRAME` musi być identyczny we wszystkich personach — weryfikowalne w trace.

## Endpointy
- `POST /chat/stream` — body: `{thread_id, message, profile?, persona?}`
- `POST /threads/{id}/resume` — body: `{action, note?, profile?, persona?}`
- `POST /threads/{id}/finish` — body: `{profile?, persona?}` *(zmiana kontraktu vs Stage 09)*
- `GET /config/options` — katalogi + `contract_version` + `defaults`
- `GET /threads/{id}/state`, `/history`, `GET /health`

`contract_version: "10.0"` — klient przy rozbieżności **ostrzega**, nie blokuje.

## Uwagi
- **Dwie fabryki modeli:** `get_profile_llm(key)` (wybór użytkownika, katalog) i
  `get_role_llm(role)` (decyzja operatora — klasyfikator, destylator). Nie ma `get_llm`.
- **Walidacja dwuwarstwowa:** Pydantic na granicy HTTP (422) + `resolve_profile`/
  `resolve_persona` w module (ValueError) — Studio i CLI nie przechodzą przez pierwszą.
- **Heartbeat (L-11):** oczekiwanie na dwa źródła (`FIRST_COMPLETED`), nie opróżnianie
  kolejki przy obrocie pętli — inaczej sygnał milczy dokładnie w fazie myślenia modelu.
  Przy ręcznym `anext` obowiązkowe `agen.aclose()` w `finally`.
- **Panel ustawień zablokowany na czas całej tury** (`streaming` + `waiting_gate`) —
  tura z bramką to dwa uruchomienia; zmiana w połowie dałaby dwa modele w jednej odpowiedzi.
- `classify` nie przyjmuje kontekstu — brak argumentu dokumentuje granicę w kodzie.
- Dług: `thread_id` od klienta (IDOR od Stage 05), brak retencji checkpointów.

## Co dojdzie dalej
Uwierzytelnienie: `thread_id` budowany serwerowo z tożsamości użytkownika; katalogi
profili mogą wtedy zależeć od uprawnień (np. `deep` tylko dla części kont).