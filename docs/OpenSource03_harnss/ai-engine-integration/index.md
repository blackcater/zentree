# AI Engine Integration

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [.claude/skills/release/references/release-notes-template.md](.claude/skills/release/references/release-notes-template.md)
- [CLAUDE.md](CLAUDE.md)
- [README.md](README.md)
- [shared/types/engine.ts](shared/types/engine.ts)
- [src/components/InputBar.test.ts](src/components/InputBar.test.ts)
- [src/components/InputBar.tsx](src/components/InputBar.tsx)
- [src/components/SummaryBlock.tsx](src/components/SummaryBlock.tsx)
- [src/components/TurnChangesSummary.tsx](src/components/TurnChangesSummary.tsx)
- [src/hooks/useAppOrchestrator.ts](src/hooks/useAppOrchestrator.ts)
- [src/hooks/useCodex.ts](src/hooks/useCodex.ts)
- [src/hooks/useEngineBase.ts](src/hooks/useEngineBase.ts)
- [src/hooks/useSessionManager.ts](src/hooks/useSessionManager.ts)
- [src/lib/codex-adapter.ts](src/lib/codex-adapter.ts)

</details>



Harnss is designed as a multi-engine desktop client that abstracts the complexities of different AI agent protocols into a unified user interface. It currently supports three primary execution engines: **Claude Code**, **Codex**, and **ACP (Agent Client Protocol)** compatible agents. 

The architecture centers around a "one UI, many engines" philosophy, where the `useSessionManager` hook [src/hooks/useSessionManager.ts:25-25]() orchestrates engine-specific hooks that all adhere to a common `EngineHookState` interface [shared/types/engine.ts:61-77](). This allows Harnss to maintain consistent features like streaming, tool visualization, and permission management regardless of the underlying protocol.

### Engine Architecture Overview

The following diagram illustrates how Harnss bridges the gap between high-level user intent and the specific code entities responsible for engine communication.

**Engine Communication & Translation Map**
```mermaid
graph TD
    subgraph "Natural Language Space (UI)"
        A["User Input / Composer"]
        B["Tool Call Card"]
        C["Permission Prompt"]
    end

    subgraph "Code Entity Space (Logic)"
        D["useSessionManager"]
        E["useClaude"]
        F["useACP"]
        G["useCodex"]
        
        H["AsyncChannel (Main Process)"]
        I["acp-adapter"]
        J["codex-adapter"]
    end

    A -->|"send(message)"| D
    D --> E
    D --> F
    D --> G

    E -->|"IPC: claude:send"| H
    F -->|"Normalization"| I
    G -->|"Normalization"| J

    I -->|"ndJsonStream"| K["ACP Agent Process"]
    J -->|"JSON-RPC"| L["Codex CLI"]
    H -->|"SDK query()"| M["Anthropic API"]

    Sources: [src/hooks/useSessionManager.ts:47-91](), [shared/types/engine.ts:61-77](), [CLAUDE.md:71-78]()
```

### Core Engine Foundations

All engines in Harnss leverage a shared foundation to ensure high-performance UI updates and stable state management.

*   **`useEngineBase`**: A foundational hook that provides the 8 common state variables (messages, processing state, cost, etc.) and manages the `requestAnimationFrame` (rAF) flush mechanism [src/hooks/useEngineBase.ts:50-141]().
*   **Streaming Performance**: To prevent React 19 batching issues during high-frequency updates, engines use a `scheduleFlush` pattern [src/hooks/useEngineBase.ts:100-107]() and a `StreamingBuffer` to accumulate deltas before updating the UI.
*   **Protocol Translation**: Each engine includes an adapter layer (e.g., `codex-adapter.ts`) that translates engine-specific events into a unified `UIMessage` format [src/hooks/useCodex.ts:26-33]().

### Supported Engines

| Engine | Protocol | Key Implementation |
| :--- | :--- | :--- |
| **Claude** | Anthropic Agent SDK | Uses `AsyncChannel` for multi-turn input and `query()` for session management [CLAUDE.md:71-74](). |
| **ACP** | Agent Client Protocol | Spawns processes via `ndJsonStream` and supports the standard ACP turn lifecycle [README.md:146-152](). |
| **Codex** | JSON-RPC | Implements a complex app-server protocol with support for "Plan Mode" and skill-based slash commands [src/hooks/useCodex.ts:72-118](). |

---

### [3.1 Claude Engine: Sessions & Streaming](#)
Deep dive into the integration with `@anthropic-ai/claude-agent-sdk`. Covers the lifecycle of the `AsyncChannel`, how `QueryHandle` is used to interrupt or restart sessions, and the main-process event loop that forwards SDK callbacks to the renderer.
*For details, see [Claude Engine: Sessions & Streaming](#3.1).*

### [3.2 ACP Engine: Agent Client Protocol](#)
Overview of the Agent Client Protocol implementation. Covers how Harnss interacts with agents like Gemini CLI or Goose using newline-delimited JSON, and how the `acp-adapter` normalizes diverse agent behaviors into the Harnss UI.
*For details, see [ACP Engine: Agent Client Protocol](#3.2).*

### [3.3 Codex Engine: JSON-RPC Protocol](#)
Technical details on the Codex CLI integration. Explains the JSON-RPC communication layer, binary management via `npm pack`, and the implementation of "Plan Mode" where the agent drafts changes before execution.
*For details, see [Codex Engine: JSON-RPC Protocol](#3.3).*

### [3.4 Agent Registry & Binary Management](#)
How Harnss discovers and manages agent binaries. This includes the `agents.json` persistence, the tiered search strategy for finding executables (PATH vs. managed installs), and the UI for browsing the ACP community registry.
*For details, see [Agent Registry & Binary Management](#3.4).*

### [3.5 Background Agents & Task Lifecycle](#)
Explains the `BackgroundAgentStore` and how sub-agents (Tasks) are tracked. Covers the state machine for background processes and how progress notifications are bridged from the agent to the `BackgroundAgentsPanel`.
*For details, see [Background Agents & Task Lifecycle](#3.5).*

**Session Lifecycle & State Flow**
```mermaid
sequenceDiagram
    participant UI as Renderer (InputBar)
    participant SM as useSessionManager
    participant EH as Engine Hook (useClaude/useACP)
    participant MP as Main Process (IPC)
    participant AG as AI Agent/SDK

    UI->>SM: sendMessage(text)
    SM->>EH: send(text)
    EH->>MP: invoke("engine:send", { sessionId, text })
    MP->>AG: Push to AsyncChannel / stdin
    AG-->>MP: Event: Delta/ToolCall
    MP-->>EH: IPC Event: "engine:event"
    EH->>EH: bufferDelta(chunk)
    EH->>EH: scheduleFlush()
    EH->>SM: setMessages([...])
    SM->>UI: Render Message/Tool Card
    
    Sources: [src/hooks/useSessionManager.ts:89-91](), [src/hooks/useEngineBase.ts:100-107](), [CLAUDE.md:85-92]()
```

**Sources:**
*   [README.md:23-29]() - Overview of multi-engine support.
*   [CLAUDE.md:67-92]() - Main process SDK and IPC architecture.
*   [shared/types/engine.ts:32-77]() - Engine identifiers and the `EngineHookState` interface.
*   [src/hooks/useSessionManager.ts:47-91]() - Dispatch logic for active engines.
*   [src/hooks/useEngineBase.ts:1-141]() - Shared streaming and state foundation.
*   [src/hooks/useCodex.ts:72-153]() - Codex-specific state and protocol handling.