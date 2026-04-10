# Session Lifecycle: Draft, Materialization & Revival

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [electron/src/ipc/projects.ts](electron/src/ipc/projects.ts)
- [src/hooks/session/types.ts](src/hooks/session/types.ts)
- [src/hooks/session/useDraftMaterialization.ts](src/hooks/session/useDraftMaterialization.ts)
- [src/hooks/session/useMessageQueue.ts](src/hooks/session/useMessageQueue.ts)
- [src/hooks/session/useSessionPersistence.ts](src/hooks/session/useSessionPersistence.ts)
- [src/hooks/session/useSessionRevival.ts](src/hooks/session/useSessionRevival.ts)

</details>



The Harnss session lifecycle is designed for immediate responsiveness. Rather than waiting for a backend process to initialize before allowing user interaction, Harnss uses a **draft-first** approach. Every project view begins with an eager "Draft" session that is "materialized" into a persistent, real session only when the first message is sent. If an underlying engine process terminates, the system performs a "revival" to reconnect the UI state to a new process.

## The Draft-First Approach

When a user selects a project, the system immediately enters a state identified by `DRAFT_ID` [src/hooks/session/types.ts:7-7](). This allows the UI to render the input bar and model selectors instantly.

### Eager Starting
To reduce perceived latency, the `useDraftMaterialization` hook attempts to "eagerly" start the underlying engine process in the background before the user even types.

1.  **Claude Eager Start**: `eagerStartSession` calls `window.claude.start` with the project's current working directory [src/hooks/session/useDraftMaterialization.ts:73-86](). It fetches MCP server statuses and supported models immediately so the UI can display them while the user is composing their first message [src/hooks/session/useDraftMaterialization.ts:105-117]().
2.  **ACP Eager Start**: `eagerStartAcpSession` spawns the agent process and fetches configuration options and slash commands [src/hooks/session/useDraftMaterialization.ts:125-185]().
3.  **Abandonment**: If the user switches projects before sending a message, the pre-started session is stopped via `window.claude.stop` with the reason `"draft_abandoned"` [src/hooks/session/useDraftMaterialization.ts:120-121]().

### Materialization Flow
Materialization is the process of converting a `DRAFT_ID` session into a permanent, unique `sessionId`. This is triggered by `materializeDraft` [src/hooks/session/useDraftMaterialization.ts:228-228]().

| Step | Action | Code Entity |
| :--- | :--- | :--- |
| 1 | Generate UUID | `crypto.randomUUID()` |
| 2 | Adopt Pre-started ID | `preStartedSessionIdRef.current` [src/hooks/session/useDraftMaterialization.ts:243-243]() |
| 3 | Persistence | `window.claude.sessions.save` [src/hooks/session/useSessionPersistence.ts:65-65]() |
| 4 | UI Update | `setActiveSessionId(newId)` [src/hooks/session/useDraftMaterialization.ts:285-285]() |

**Sources:** [src/hooks/session/useDraftMaterialization.ts:73-285](), [src/hooks/session/types.ts:7-7](), [src/hooks/session/useSessionPersistence.ts:65-65]()

## Session Revival

Revival occurs when a user attempts to send a message to a session whose underlying engine process has exited (e.g., due to an app restart, a crash, or a timeout).

### ACP Revival
The `reviveAcpSession` function uses the `agentSessionId` to reconnect to a specific agent state [src/hooks/session/useSessionRevival.ts:54-78](). If successful, it replaces the old `sessionId` with the new one in the global `sessions` state while preserving the message history [src/hooks/session/useSessionRevival.ts:96-100]().

### Codex Revival
Codex revival relies on the `codexThreadId`. The `reviveCodexSession` function calls `window.claude.codex.resume` with the existing thread ID, which allows the Codex app-server to restore the conversation context [src/hooks/session/useSessionRevival.ts:147-182]().

### Revival Logic Flow
The following diagram illustrates how the `useSessionRevival` hook bridges the UI intent to the underlying IPC calls.

**Title: Session Revival Logic Flow**
```mermaid
graph TD
    "UI:SendMessage"["UI: Send Message"] --> "check:IsLive"{"Is Session Live?"}
    "check:IsLive" -- "No" --> "revive:reviveSession"["useSessionRevival.ts"]
    "revive:reviveSession" --> "get:ThreadID"["Retrieve Thread/Agent ID"]
    "get:ThreadID" --> "ipc:Revive"["window.claude.acp.reviveSession() / .resume()"]
    "ipc:Revive" --> "update:State"["setSessions() with new ID"]
    "update:State" --> "send:Original"["engine.prompt()"]
    "check:IsLive" -- "Yes" --> "send:Original"
```
**Sources:** [src/hooks/session/useSessionRevival.ts:54-182](), [src/hooks/session/types.ts:49-80]()

## The Message Queue

To prevent race conditions and ensure messages are delivered in order during materialization or high-latency periods, Harnss implements a `useMessageQueue`.

### Enqueueing and Draining
When a user sends a message, it is first added to the `messageQueueRef` and displayed in the UI with an `isQueued: true` flag [src/hooks/session/useMessageQueue.ts:72-91]().

The queue is "drained" by `drainNextQueuedMessage` [src/hooks/session/useMessageQueue.ts:142-142](). It waits for `engine.isProcessing` to be false before sending the next message [src/hooks/session/useMessageQueue.ts:144-144]().

### Queue Boundaries
The queue respects specific "boundaries" via `boundaryWaitRef` [src/hooks/session/useMessageQueue.ts:35-35]():
*   **after_stream**: Waits until the assistant finishes streaming.
*   **after_tool**: Waits until specific tool calls are resolved [src/hooks/session/useMessageQueue.ts:19-19]().

**Sources:** [src/hooks/session/useMessageQueue.ts:17-174]()

## Data Flow & Entity Association

The lifecycle involves coordination between React hooks, the background store, and Electron IPC.

**Title: Session Lifecycle Entity Map**
```mermaid
graph LR
    subgraph "Renderer Process (React)"
        "hook:Orchestrator"["useAppOrchestrator"] -- "manages" --> "hook:Materialization"["useDraftMaterialization"]
        "hook:Orchestrator" -- "manages" --> "hook:Persistence"["useSessionPersistence"]
        "hook:Persistence" -- "syncs" --> "class:BGStore"["BackgroundSessionStore"]
    end

    subgraph "Electron Main Process"
        "ipc:Sessions"["ipc/sessions.ts"] -- "CRUD" --> "file:sessions.json"["userData/sessions/{projId}/{sessId}.json"]
        "ipc:Claude"["ipc/claude.ts"] -- "Spawns" --> "proc:Engine"["Engine Process (Claude/Codex/ACP)"]
    end

    "hook:Materialization" -- "invoke" --> "ipc:Claude"
    "hook:Persistence" -- "invoke" --> "ipc:Sessions"
    "class:BGStore" -- "handles" --> "proc:Engine"
```

### Key Entities

| Entity | Role | File Reference |
| :--- | :--- | :--- |
| `DRAFT_ID` | Sentinel value for unmaterialized sessions. | [src/hooks/session/types.ts:7-7]() |
| `useDraftMaterialization` | Handles eager starts and the transition from draft to real session. | [src/hooks/session/useDraftMaterialization.ts:27-35]() |
| `useSessionPersistence` | Manages saving session state to disk and routing background events. | [src/hooks/session/useSessionPersistence.ts:17-22]() |
| `BackgroundSessionStore` | Holds state for sessions that are not currently active in the UI. | [src/hooks/session/useSessionPersistence.ts:69-87]() |
| `useMessageQueue` | Serializes outgoing messages and handles UI optimistic updates. | [src/hooks/session/useMessageQueue.ts:22-22]() |

**Sources:** [src/hooks/session/useDraftMaterialization.ts:1-27](), [src/hooks/session/useSessionPersistence.ts:1-52](), [src/hooks/session/useMessageQueue.ts:1-22](), [src/hooks/session/types.ts:1-80]()