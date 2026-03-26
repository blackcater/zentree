# Architecture Overview

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [codex-rs/app-server-protocol/schema/json/ClientRequest.json](codex-rs/app-server-protocol/schema/json/ClientRequest.json)
- [codex-rs/app-server-protocol/schema/json/codex_app_server_protocol.schemas.json](codex-rs/app-server-protocol/schema/json/codex_app_server_protocol.schemas.json)
- [codex-rs/app-server-protocol/schema/json/codex_app_server_protocol.v2.schemas.json](codex-rs/app-server-protocol/schema/json/codex_app_server_protocol.v2.schemas.json)
- [codex-rs/app-server-protocol/schema/typescript/ClientRequest.ts](codex-rs/app-server-protocol/schema/typescript/ClientRequest.ts)
- [codex-rs/app-server-protocol/schema/typescript/index.ts](codex-rs/app-server-protocol/schema/typescript/index.ts)
- [codex-rs/app-server-protocol/schema/typescript/v2/index.ts](codex-rs/app-server-protocol/schema/typescript/v2/index.ts)
- [codex-rs/app-server-protocol/src/protocol/common.rs](codex-rs/app-server-protocol/src/protocol/common.rs)
- [codex-rs/app-server-protocol/src/protocol/v2.rs](codex-rs/app-server-protocol/src/protocol/v2.rs)
- [codex-rs/app-server/README.md](codex-rs/app-server/README.md)
- [codex-rs/app-server/src/bespoke_event_handling.rs](codex-rs/app-server/src/bespoke_event_handling.rs)
- [codex-rs/app-server/src/codex_message_processor.rs](codex-rs/app-server/src/codex_message_processor.rs)
- [codex-rs/app-server/tests/common/mcp_process.rs](codex-rs/app-server/tests/common/mcp_process.rs)
- [codex-rs/app-server/tests/suite/v2/mod.rs](codex-rs/app-server/tests/suite/v2/mod.rs)
- [codex-rs/codex-api/src/error.rs](codex-rs/codex-api/src/error.rs)
- [codex-rs/codex-api/src/rate_limits.rs](codex-rs/codex-api/src/rate_limits.rs)
- [codex-rs/core/src/api_bridge.rs](codex-rs/core/src/api_bridge.rs)
- [codex-rs/core/src/client.rs](codex-rs/core/src/client.rs)
- [codex-rs/core/src/client_common.rs](codex-rs/core/src/client_common.rs)
- [codex-rs/core/src/codex.rs](codex-rs/core/src/codex.rs)
- [codex-rs/core/src/error.rs](codex-rs/core/src/error.rs)
- [codex-rs/core/src/rollout/policy.rs](codex-rs/core/src/rollout/policy.rs)
- [codex-rs/exec/src/event_processor.rs](codex-rs/exec/src/event_processor.rs)
- [codex-rs/exec/src/event_processor_with_human_output.rs](codex-rs/exec/src/event_processor_with_human_output.rs)
- [codex-rs/mcp-server/src/codex_tool_runner.rs](codex-rs/mcp-server/src/codex_tool_runner.rs)
- [codex-rs/protocol/src/protocol.rs](codex-rs/protocol/src/protocol.rs)
- [codex-rs/tui/src/app.rs](codex-rs/tui/src/app.rs)
- [codex-rs/tui/src/app_event.rs](codex-rs/tui/src/app_event.rs)
- [codex-rs/tui/src/bottom_pane/bottom_pane_view.rs](codex-rs/tui/src/bottom_pane/bottom_pane_view.rs)
- [codex-rs/tui/src/bottom_pane/chat_composer.rs](codex-rs/tui/src/bottom_pane/chat_composer.rs)
- [codex-rs/tui/src/bottom_pane/mod.rs](codex-rs/tui/src/bottom_pane/mod.rs)
- [codex-rs/tui/src/chatwidget.rs](codex-rs/tui/src/chatwidget.rs)
- [codex-rs/tui/src/chatwidget/tests.rs](codex-rs/tui/src/chatwidget/tests.rs)
- [codex-rs/tui/src/history_cell.rs](codex-rs/tui/src/history_cell.rs)
- [codex-rs/tui/src/slash_command.rs](codex-rs/tui/src/slash_command.rs)
- [codex-rs/tui/src/status_indicator_widget.rs](codex-rs/tui/src/status_indicator_widget.rs)

</details>

Codex is an AI coding agent that supports multiple execution modes (TUI, CLI, IDE integrations, web interface) all powered by a shared core engine. The system uses a queue-based submission/event protocol to enable asynchronous, interruptible workflows.

## System Organization

The architecture is organized into six major subsystems:

1. **User Interfaces** – TUI, CLI exec mode, IDE app-server, and web interface
2. **Core Engine** – Session management, turn execution, and event processing (`codex-core`)
3. **Execution & Tools** – Built-in and MCP tools with approval workflows and sandboxing
4. **Configuration & Model Management** – Hierarchical config, profiles, model metadata, and authentication
5. **External Services** – Model provider APIs, MCP servers, and cloud backend
6. **App Server** – JSON-RPC protocol for IDE integrations

The core design pattern is an **asynchronous submission/event queue**: user operations are submitted as `Op` messages, the agent processes them, and results stream back as `EventMsg` events. This enables cancellation, interruption, and streaming UX across all interfaces.

For installation procedures, see page 1.1. For crate-level organization, see page 1.2. For detailed protocol semantics, see page 2.1.

---

## Complete System Overview

The diagram below shows how all major subsystems connect. User interfaces (TUI, CLI, IDE extensions, web) submit operations to the core engine, which coordinates model API calls, tool execution, and state persistence. Configuration flows through multiple layers, and MCP servers provide external tool integrations.

**Diagram: Complete System Architecture**

```mermaid
graph TB
    subgraph UserInterfaces["User Interfaces"]
        TUI["Codex TUI<br/>(Terminal UI)<br/>Interactive Chat"]
        CLI["Codex CLI<br/>(Exec Mode)<br/>Non-Interactive"]
        IDE["IDE Extensions<br/>(VS Code, Cursor)<br/>via App Server"]
        Web["Codex Web<br/>(Cloud-based)"]
    end

    subgraph CoreEngine["Core Engine - codex-rs/core"]
        Codex["Codex Struct<br/>Session Management<br/>Op/Event Queue"]
        Session["Session<br/>Turn Management<br/>Context & State"]
        ThreadMgr["ThreadManager<br/>Thread Lifecycle<br/>Multi-Agent Support"]
        CtxMgr["ContextManager<br/>History & Compaction<br/>Token Tracking"]
    end

    subgraph ExecAndTools["Execution & Tools"]
        ToolRouter["Tool Router<br/>Built-in & MCP Tools<br/>Approval Workflows"]
        UnifiedExec["UnifiedExec<br/>Interactive Shell<br/>Process Management"]
        CodeMode["Code Mode<br/>JavaScript REPL<br/>Yield/Resume"]
        McpMgr["MCP Connection Manager<br/>External Tool Servers<br/>Elicitation Handling"]
    end

    subgraph ConfigAndModel["Configuration & Model Management"]
        Config["Config System<br/>Profiles & Permissions<br/>Feature Flags"]
        ModelsMgr["Models Manager<br/>Model Discovery<br/>Caching & Metadata"]
        Auth["Auth Manager<br/>ChatGPT/API Key<br/>Token Refresh"]
    end

    subgraph ExtServices["External Services"]
        ModelAPI["Model Provider APIs<br/>OpenAI/Ollama/Custom<br/>SSE Streaming"]
        McpServers["MCP Servers<br/>stdio/HTTP<br/>External Tools"]
        Backend["Codex Backend<br/>Account/Requirements<br/>Cloud Tasks"]
    end

    subgraph AppServerIntegration["App Server (IDE Integration)"]
        AppServer["App Server<br/>JSON-RPC Protocol<br/>Thread Management"]
        V2Protocol["v2 API<br/>thread/*, turn/*<br/>Notifications"]
    end

    TUI --> Codex
    CLI --> Codex
    IDE --> AppServer
    AppServer --> ThreadMgr

    Codex --> Session
    ThreadMgr --> Session

    Session --> CtxMgr
    Session --> ToolRouter
    Session --> Config
    Session --> ModelsMgr
    Session --> Auth

    ToolRouter --> UnifiedExec
    ToolRouter --> CodeMode
    ToolRouter --> McpMgr

    McpMgr --> McpServers
    Session --> ModelAPI
    ModelsMgr --> ModelAPI
    Auth --> Backend
    ThreadMgr --> Backend
```

**Analysis**: The system supports four execution modes (TUI, CLI, IDE, Web), all converging on the core engine. The `Codex` struct manages session lifecycle through a submission/event queue pattern, delegating to `Session` for turn execution. The `Session` coordinates context management, tool execution, configuration, and model interactions. Tools can be built-in (`UnifiedExec`, `CodeMode`) or external (MCP servers). The App Server provides a separate entry point for IDE integrations via JSON-RPC, wrapping the same core `ThreadManager` infrastructure.

**Sources**: [codex-rs/core/src/codex.rs:330-725](), [codex-rs/core/src/thread_manager.rs](), [codex-rs/core/src/context_manager.rs](), [codex-rs/core/src/tools/mod.rs](), [codex-rs/core/src/unified_exec.rs](), [codex-rs/app-server/src/codex_message_processor.rs]()

---

## Submission/Event Queue Pattern

The core engine uses an asynchronous queue-based protocol to decouple operation submission from execution. Clients submit `Op` messages and receive `EventMsg` results. This design enables streaming UX, cancellation, and multi-client support.

**Diagram: Submission and Event Flow**

```mermaid
graph LR
    Client["Client<br/>(TUI/Exec/App Server)"]
    TxSub["tx_sub: Sender&lt;Submission&gt;"]
    SubLoop["submission_loop<br/>Tokio task"]
    Session["Session"]
    RxEvent["rx_event: Receiver&lt;Event&gt;"]

    Client -->|"submit(Op)"| TxSub
    TxSub --> SubLoop
    SubLoop -->|"dispatch"| Session
    Session -->|"tx_event.send"| RxEvent
    RxEvent -->|"next_event()"| Client
```

**Key Protocol Types**:

- **`Submission`**: Wraps `Op` with unique ID and optional trace context
- **`Op`**: Operation variants include `UserTurn`, `Interrupt`, `Shutdown`, `ExecApproval`, `SteerInput`
- **`Event`**: Wraps `EventMsg` with submission ID
- **`EventMsg`**: Event variants include `SessionConfigured`, `TurnStarted`, `AgentMessageDelta`, `ExecCommandBegin`, `ExecCommandEnd`, `TurnComplete`

The `submission_loop` runs as a dedicated Tokio task that dispatches operations sequentially. This ensures linearization of state changes while allowing asynchronous I/O. Clients call `Codex::submit()` to enqueue work and `Codex::next_event()` to receive results.

**Sources**: [codex-rs/core/src/codex.rs:330-341](), [codex-rs/protocol/src/protocol.rs:89-99](), [codex-rs/protocol/src/protocol.rs:180-350](), [codex-rs/protocol/src/protocol.rs:664-850]()

---

## Request/Response Flow

The following diagram shows how a user turn flows through the system: from input submission through prompt construction, model streaming, tool execution, and final completion.

**Diagram: User Turn Execution Flow**

```mermaid
sequenceDiagram
    participant User
    participant UI as UI Layer<br/>(TUI/CLI/AppServer)
    participant Codex as Codex Core<br/>Op Queue
    participant Session
    participant CtxMgr as Context Manager
    participant ModelClient
    participant API as Model Provider<br/>SSE Stream
    participant Tools as Tool System

    User->>UI: Submit Input
    UI->>Codex: submit(Op::UserInput)
    Codex->>Session: Process Op

    Session->>CtxMgr: Record user message
    Session->>CtxMgr: Build prompt (with cache)
    CtxMgr-->>Session: Prompt + cached prefix

    Session->>ModelClient: stream_responses(prompt)
    ModelClient->>API: POST /v1/responses<br/>with headers & telemetry

    loop SSE Event Stream
        API-->>ModelClient: ResponseEvent
        ModelClient-->>Session: Map to EventMsg

        alt Agent Message
            Session->>CtxMgr: Record message
            Session->>Codex: Emit event
            Codex-->>UI: Display delta
        else Tool Call
            Session->>Tools: Route tool call
            Tools->>Tools: Check approval/sandbox
            Tools-->>Session: Tool output
            Session->>CtxMgr: Record call+output
            Session->>ModelClient: Continue streaming
        else Reasoning
            Session->>CtxMgr: Record reasoning
            Session->>Codex: Emit event
        end
    end

    API-->>ModelClient: response.completed
    ModelClient-->>Session: Final tokens
    Session->>CtxMgr: Update token usage

    alt Auto-compact needed
        Session->>Session: Spawn CompactTask
        Session->>CtxMgr: Replace with summary
    end

    Session->>Codex: TurnComplete
    Codex-->>UI: Display complete
```

**Analysis**: This sequence shows a complete user turn. The UI submits an `Op::UserInput` to the `Codex` submission queue, which dispatches to `Session`. The session builds a prompt using the `ContextManager` (leveraging cached prefix for performance), then streams responses from the model API. Events flow back through the layers: `ResponseEvent` → `EventMsg` → UI. Tool calls interrupt the stream for execution (with approval checks), then resume. When the turn completes, token usage is updated, and automatic compaction may trigger if context window limits are approached.

**Sources**: [codex-rs/core/src/codex.rs:1500-1800](), [codex-rs/core/src/context_manager.rs:1-500](), [codex-rs/core/src/client.rs:400-600](), [codex-rs/core/src/tools/mod.rs:150-350]()

---

## Execution Modes and Entry Points

Codex supports multiple execution modes, each with different installation paths and configuration sources. All modes converge on the `ThreadManager` for thread initialization.

**Diagram: Execution Modes and Configuration Assembly**

```mermaid
graph LR
    subgraph Installation["Installation & Distribution"]
        NPM["npm install -g<br/>@openai/codex"]
        Brew["brew install<br/>--cask codex"]
        Binary["GitHub Releases<br/>Platform Binaries"]
    end

    subgraph ExecModes["Execution Modes"]
        Interactive["codex<br/>(Interactive TUI)"]
        Exec["codex exec 'task'<br/>(Non-interactive)"]
        Review["codex review<br/>(Code Review)"]
        AppServerMode["codex app-server<br/>(JSON-RPC Server)"]
        McpServerMode["codex mcp-server<br/>(MCP Server)"]
        AppMode["codex app<br/>(Desktop App)"]
    end

    subgraph ConfigSources["Configuration Sources"]
        GlobalConfig["~/.codex/config.toml<br/>(Global Settings)"]
        ProjectConfig[".codex/config.toml<br/>(Project Settings)"]
        EnvVars["Environment Variables<br/>CODEX_*, OPENAI_*"]
        CLIArgs["CLI Arguments<br/>--model, -c, --enable"]
        Requirements["requirements.toml<br/>(Constraints)"]
    end

    subgraph Initialization["Core Initialization"]
        ConfigBuilder["ConfigBuilder<br/>Merge & Validate"]
        ThreadMgr["ThreadManager::new<br/>Auth + Config"]
        SessionStart["thread/start or<br/>thread/resume"]
    end

    NPM --> Interactive
    Brew --> Interactive
    Binary --> Interactive

    Interactive --> ConfigBuilder
    Exec --> ConfigBuilder
    Review --> ConfigBuilder
    AppServerMode --> ConfigBuilder
    McpServerMode --> ConfigBuilder

    GlobalConfig --> ConfigBuilder
    ProjectConfig --> ConfigBuilder
    EnvVars --> ConfigBuilder
    CLIArgs --> ConfigBuilder
    Requirements --> ConfigBuilder

    ConfigBuilder --> ThreadMgr
    ThreadMgr --> SessionStart

    AppServerMode --> VSCode["VS Code<br/>Extension"]
    AppServerMode --> Cursor["Cursor IDE"]
    AppServerMode --> OtherIDE["Other IDEs"]
```

**Analysis**: Installation happens through npm (cross-platform), Homebrew (macOS), or direct binaries (all platforms). The CLI supports five execution modes: interactive TUI (default), non-interactive exec, code review, app server (for IDE integrations), and MCP server (for tool delegation). Configuration sources are layered with CLI args taking highest priority, followed by environment variables, project config, global config, and requirements (constraints). The `ConfigBuilder` merges these sources and validates the result before initializing the `ThreadManager`.

**Sources**: [codex-rs/cli/src/main.rs:1-200](), [codex-rs/core/src/config/mod.rs:1-500](), [codex-rs/core/src/config_loader.rs](), [codex-rs/core/src/thread_manager.rs:1-300]()

### Execution Mode Summary

| Mode           | Entry Point                  | Primary Use Case                  | Event Processing                                                  |
| -------------- | ---------------------------- | --------------------------------- | ----------------------------------------------------------------- |
| **TUI**        | `codex` binary, `App` struct | Interactive terminal sessions     | `ChatWidget` maintains UI state, renders cells                    |
| **Exec**       | `codex exec` subcommand      | CI/CD pipelines, scripts          | `EventProcessorWithHumanOutput` or `EventProcessorWithJsonOutput` |
| **App Server** | `codex app-server` binary    | IDE extensions (VS Code, Cursor)  | `CodexMessageProcessor` translates to JSON-RPC notifications      |
| **Review**     | `codex review` subcommand    | Code review workflows             | Spawns review sub-agent with restricted config                    |
| **MCP Server** | `codex mcp-server` binary    | Expose Codex as MCP tool provider | Handles MCP protocol requests                                     |

---

## Multi-Agent and Task System

Codex supports multi-agent workflows through thread management and sub-agent delegation. A primary thread can spawn sub-agents for specialized tasks (review, custom tasks, guardian approval analysis), and the system maintains full state for each thread.

**Diagram: Multi-Agent Thread Architecture**

```mermaid
graph TB
    subgraph UserSession["User Session"]
        Primary["Primary Thread<br/>ThreadId: main"]
        PrimaryTasks["Active Tasks<br/>Regular/Compact"]
    end

    subgraph SubAgentDelegation["Sub-Agent Delegation"]
        Review["Review Sub-Agent<br/>ThreadId: review-*"]
        SubAgent["Custom Sub-Agent<br/>ThreadId: task-*"]
        Guardian["Guardian Sub-Agent<br/>Approval Analysis"]
    end

    subgraph TaskTypes["Task Types"]
        RegularTask["Regular Task<br/>Standard Chat Turn"]
        CompactTask["Compact Task<br/>History Summarization"]
        ReviewTask["Review Task<br/>Code Analysis"]
        GhostTask["Ghost Snapshot<br/>State Persistence"]
    end

    subgraph SessionStateManagement["Session State Management"]
        EventStore["ThreadEventStore<br/>Buffered Events (32k)"]
        InputState["ThreadInputState<br/>Composer State"]
        SessionConfig["SessionConfigured<br/>Thread Config"]
    end

    Primary --> PrimaryTasks
    PrimaryTasks --> RegularTask
    PrimaryTasks --> CompactTask

    RegularTask -.->|"Spawns"| Review
    RegularTask -.->|"Spawns"| SubAgent
    RegularTask -.->|"Spawns"| Guardian

    Review --> ReviewTask
    SubAgent --> RegularTask
    Guardian --> RegularTask

    Primary --> EventStore
    Review --> EventStore
    SubAgent --> EventStore

    EventStore --> SessionConfig
    EventStore --> InputState

    Primary -.->|"Thread Switch"| Review
    Review -.->|"Exit Review"| Primary

    Primary -.->|"Fork"| SubAgent
    SubAgent -.->|"Independent"| EventStore
```

**Analysis**: This diagram illustrates Codex's multi-agent architecture. A primary thread manages the main user conversation and can spawn sub-agents for specialized tasks. Each thread has its own `ThreadEventStore` that buffers up to 32,768 events, enabling thread switching with full state preservation. The review sub-agent uses a restricted configuration (disabled web search, `approval_policy = Never`) to analyze code safely. Custom sub-agents can be spawned for arbitrary tasks. The guardian sub-agent analyzes permission requests to auto-approve low-risk operations. Thread switching is supported through event replay—when switching to a previously-active thread, the system replays buffered events to rebuild `ChatWidget` state.

**Sources**: [codex-rs/core/src/thread_manager.rs](), [codex-rs/core/src/tasks/mod.rs](), [codex-rs/core/src/tasks/review.rs](), [codex-rs/tui/src/app.rs:260-380]()

---

## Tool Ecosystem and MCP Integration

Codex provides both built-in tools and external MCP (Model Context Protocol) server integration. All tools flow through a unified approval and sandboxing pipeline.

**Diagram: Tool System Architecture**

```mermaid
graph TB
    subgraph BuiltinTools["Built-in Tools"]
        Shell["shell_command<br/>exec_command<br/>write_stdin"]
        Patch["apply_patch<br/>File Modifications"]
        WebSearch["web_search<br/>Live/Cached/Disabled"]
        ViewImage["view_image<br/>Image Analysis"]
        RequestPerms["request_permissions<br/>Dynamic Grants"]
    end

    subgraph CodeExecution["Code Execution"]
        UnifiedExec["UnifiedExec System<br/>Interactive PTY<br/>Process Manager"]
        CodeMode["Code Mode<br/>JavaScript REPL<br/>Yield/Resume"]
        Sandbox["Sandbox Selection<br/>Landlock/Seatbelt<br/>Windows Token"]
    end

    subgraph MCPServerIntegration["MCP Server Integration"]
        McpMgr["McpConnectionManager<br/>Server Lifecycle"]
        StdioServers["stdio Servers<br/>Command-based"]
        HttpServers["HTTP Servers<br/>Remote Tools"]
        CodexApps["codex-apps Server<br/>Cached Tools"]
    end

    subgraph ApprovalSystem["Approval System"]
        Policy["Approval Policy<br/>Always/OnRequest/Never"]
        ExecPolicy["Exec Policy<br/>Starlark Rules"]
        Guardian["Guardian Sub-Agent<br/>AI-Powered Review"]
        UserPrompt["User Prompt<br/>Interactive Decision"]
    end

    subgraph ToolRouter["Tool Router"]
        ToolReg["Tool Registry<br/>Built-in + MCP"]
        ToolOrchestrator["Tool Orchestrator<br/>Approval + Sandbox"]
        Runtime["Shell/Exec Runtime<br/>Process Spawning"]
    end

    Shell --> UnifiedExec
    Shell --> CodeMode
    Patch --> Runtime

    UnifiedExec --> Sandbox
    CodeMode --> Sandbox

    McpMgr --> StdioServers
    McpMgr --> HttpServers
    McpMgr --> CodexApps

    StdioServers -.->|"Expose Tools"| ToolReg
    HttpServers -.->|"Expose Tools"| ToolReg
    CodexApps -.->|"Cached"| ToolReg

    Shell -.->|"Register"| ToolReg
    Patch -.->|"Register"| ToolReg
    WebSearch -.->|"Register"| ToolReg
    ViewImage -.->|"Register"| ToolReg
    RequestPerms -.->|"Register"| ToolReg

    ToolReg --> ToolOrchestrator

    ToolOrchestrator --> Policy
    Policy --> ExecPolicy
    ExecPolicy --> Guardian
    ExecPolicy --> UserPrompt

    Guardian -.->|"Auto-approve"| Runtime
    UserPrompt -.->|"Manual"| Runtime

    ToolOrchestrator --> Runtime
```

**Analysis**: This diagram shows Codex's extensible tool ecosystem. Built-in tools (shell, patch, web search, image viewing, permission requests) are complemented by external MCP servers via stdio or HTTP transport. The `codex-apps` server receives special treatment with cached tool discovery for faster startup. All tools flow through the `ToolOrchestrator`, which enforces a layered approval system: `AskForApproval` policy determines if approval is needed, `ExecPolicy` (Starlark rules) provides allow/deny/warn decisions, Guardian sub-agent can auto-approve low-risk operations, and finally user prompts handle edge cases. Sandbox selection happens after approval, with platform-specific implementations (Landlock on Linux, Seatbelt on macOS, restricted tokens on Windows).

**Sources**: [codex-rs/core/src/tools/mod.rs](), [codex-rs/core/src/tools/orchestrator.rs](), [codex-rs/core/src/tools/sandboxing/mod.rs](), [codex-rs/core/src/unified_exec.rs](), [codex-rs/core/src/mcp_connection_manager.rs](), [codex-rs/core/src/exec_policy/mod.rs]()

---

## Configuration and State Management

Configuration flows through multiple layers (defaults, user config, project config, CLI overrides) and is resolved once per session. Session state is persisted to JSONL rollout files.

**Diagram: Configuration Flow**

```mermaid
graph TB
    subgraph Sources["Configuration Sources (config/mod.rs)"]
        Defaults["Built-in defaults<br/>(config/default.rs)"]
        UserConfig["~/.codex/config.toml<br/>Global settings"]
        ProjConfig[".codex/config.toml<br/>Project settings"]
        Profiles["Profile configs<br/>(fast/slow/custom)"]
        CLIOver["CLI overrides<br/>--set key=value"]
        Cloud["Cloud requirements<br/>(cloud_requirements.rs)"]
    end

    Defaults --> LayerStack["ConfigLayerStack<br/>(config_loader.rs:100)"]
    UserConfig --> LayerStack
    ProjConfig --> LayerStack
    Profiles --> LayerStack
    CLIOver --> LayerStack
    Cloud --> LayerStack

    LayerStack --> Merge["Layer merging<br/>(highest priority wins)"]
    Merge --> Config["Config<br/>(config/mod.rs:50)<br/>Effective settings"]

    subgraph RuntimeConfig["Runtime Config Fields"]
        Model["model: Option<String>"]
        Effort["model_reasoning_effort"]
        ApprovalPol["permissions.approval_policy"]
        SandboxPol["permissions.sandbox_policy"]
        Feat["features: Features"]
        McpServers["mcp_servers: HashMap"]
    end

    Config --> RuntimeConfig

    Config --> SessionConfig["SessionConfiguration<br/>(codex.rs:708)<br/>Frozen snapshot"]
    SessionConfig --> SessionState["SessionState<br/>(state.rs:50)<br/>Mutable turn state"]

    SessionState --> ContextMgr["ContextManager<br/>(context_manager.rs)<br/>History + tokens"]
    SessionState --> Rollout["RolloutRecorder<br/>(rollout/mod.rs)<br/>JSONL persistence"]
```

**Configuration Resolution** ([config/mod.rs:50-500]()):

1. Load defaults ([config/default.rs:1-200]())
2. Load user config from `~/.codex/config.toml` (if exists)
3. Walk directory tree, load `.codex/config.toml` files (project config)
4. Apply profile (if specified via `--profile`)
5. Apply CLI overrides (`--set`, `--feature`)
6. Apply cloud requirements (if enabled)
7. Merge layers by priority (CLI > cloud > profile > project > user > defaults)

**`Config` Structure** ([config/mod.rs:50-300]()):

- **`model: Option<String>`**: Model slug (e.g., `"gpt-4o"`)
- **`model_reasoning_effort: Option<ReasoningEffortConfig>`**: Reasoning effort (low/medium/high)
- **`permissions: Permissions`**: Approval/sandbox policies
- **`features: Features`**: Immutable feature toggles
- **`mcp_servers: HashMap<String, McpServerConfig>`**: MCP server configurations

**`SessionConfiguration`** ([codex.rs:708-800]()):

- Frozen snapshot of config at session start
- Contains base instructions, CWD, approval/sandbox policies
- Immutable for session lifetime (per-turn config derived from this)

**Rollout Persistence** ([rollout/mod.rs:1-300]()):

- JSONL format: one `RolloutLine` per line
- `RolloutLine::Turn`: Complete turn with all events
- `RolloutLine::SessionMeta`: Thread name, updated timestamp
- Resume: read JSONL, reconstruct `InitialHistory::Resumed`
- Fork: copy JSONL with new thread ID, update session_meta

**Sources**: [codex-rs/core/src/config/mod.rs:50-500](), [codex-rs/core/src/config/default.rs:1-200](), [codex-rs/core/src/config_loader.rs:100-800](), [codex-rs/core/src/codex.rs:708-800](), [codex-rs/core/src/state.rs:50-250](), [codex-rs/core/src/rollout/mod.rs:1-300]()

---

---

---

## Thread and Session Management

The `ThreadManager` ([thread_manager.rs:1-500]()) coordinates multiple conversations. Each thread is a `CodexThread` ([codex_thread.rs:1-300]()) that owns a `Codex` instance and tracks metadata.

**Diagram: ThreadManager Architecture**

```mermaid
graph TB
    ThreadMgr["ThreadManager<br/>(thread_manager.rs:50)<br/>Arc-wrapped, shared"]

    subgraph ThreadMap["threads: HashMap<ThreadId, CodexThread>"]
        Thread1["CodexThread 1"]
        Thread2["CodexThread 2"]
        ThreadN["CodexThread N"]
    end

    ThreadMgr --> ThreadMap

    subgraph CodexThread["CodexThread (codex_thread.rs:50)"]
        Codex["codex: Codex<br/>(codex.rs:274)"]
        Meta["metadata: ThreadMetadata<br/>name, updated_at"]
        EventTx["event_tx: Sender<Event><br/>Buffered event stream"]
    end

    Thread1 --> CodexThread

    subgraph Operations["ThreadManager Operations"]
        Create["create_thread()<br/>InitialHistory::New"]
        Resume["resume_thread(thread_id)<br/>InitialHistory::Resumed"]
        Fork["fork_thread(source_id)<br/>InitialHistory::Forked"]
        List["list_threads(cursor, sort)<br/>Paginated"]
    end

    ThreadMgr --> Operations
```

**ThreadManager Key Methods**:

- **`create_thread()`** ([thread_manager.rs:200-300]()): Spawns new `Codex` with `InitialHistory::New`
- **`resume_thread(thread_id)`** ([thread_manager.rs:350-450]()): Loads JSONL rollout, creates `Codex` with `InitialHistory::Resumed`
- **`fork_thread(source_id, fork_from_turn_id)`** ([thread_manager.rs:500-600]()): Copies rollout to new file, creates `Codex` with `InitialHistory::Forked`
- **`list_threads(cursor, page_size, sort_key)`** ([thread_manager.rs:700-850]()): Reads session index, returns paginated list

**ThreadEventStore** (in TUI `App`): When a thread is inactive, events are buffered in a bounded queue so switching threads can replay recent events without re-reading the rollout file.

**Sources**: [codex-rs/core/src/thread_manager.rs:50-850](), [codex-rs/core/src/codex_thread.rs:50-300](), [codex-rs/tui/src/app.rs:245-320]()

---

---

## Summary: Data Flow Example

The following sequence shows a typical user turn with tool execution and approval.

**Diagram: Typical Turn Data Flow**

```mermaid
sequenceDiagram
    participant User
    participant TUI["TUI<br/>(ChatWidget)"]
    participant Codex["Codex<br/>(codex.rs:274)"]
    participant Session["Session<br/>(codex.rs:525)"]
    participant ModelClient["ModelClient<br/>(client.rs:175)"]
    participant API["Model API<br/>/v1/responses"]
    participant ToolRouter["ToolRouter<br/>(tools/mod.rs)"]
    participant UnifiedExec["UnifiedExec<br/>(unified_exec.rs)"]

    User->>TUI: Enter message
    TUI->>Codex: submit(Op::UserTurn)
    Codex->>Session: submission_loop<br/>handle_user_turn
    Session->>Session: Create RegularTask
    Session->>Session: Build TurnContext<br/>+ Prompt
    Session->>ModelClient: stream(prompt, model_info)
    ModelClient->>API: POST /v1/responses<br/>(WebSocket or HTTP+SSE)

    loop Response Events
        API-->>ModelClient: ResponseEvent
        ModelClient-->>Session: ResponseEvent

        alt Agent Message
            Session->>Codex: emit(AgentMessageDelta)
            Codex-->>TUI: next_event()
            TUI->>User: Display streaming text
        end

        alt Function Call (shell)
            Session->>ToolRouter: route_tool_call("shell", args)
            ToolRouter->>ToolRouter: Check approval/sandbox
            ToolRouter->>Codex: emit(ExecApprovalRequest)
            Codex-->>TUI: next_event()
            TUI->>User: Show approval popup
            User->>TUI: Approve
            TUI->>Codex: submit(Op::ExecApproval)
            Codex->>Session: Resolve approval
            Session->>ToolRouter: Continue execution
            ToolRouter->>UnifiedExec: exec_command(command)
            UnifiedExec->>ToolRouter: Stream output
            ToolRouter->>Codex: emit(ExecCommandOutputDelta)
            Codex-->>TUI: next_event()
            TUI->>User: Display command output
            UnifiedExec->>ToolRouter: Exit status
            ToolRouter->>Codex: emit(ExecCommandEnd)
            Codex-->>TUI: next_event()
        end
    end

    Session->>Codex: emit(TurnComplete)
    Codex-->>TUI: next_event()
    TUI->>User: Display final state
```

**Sources**: [codex-rs/tui/src/chatwidget.rs:1-300](), [codex-rs/core/src/codex.rs:274-520](), [codex-rs/core/src/codex.rs:2680-2870](), [codex-rs/core/src/client.rs:400-600](), [codex-rs/core/src/tools/mod.rs:150-350](), [codex-rs/core/src/unified_exec.rs:200-500]()

---

## Key Architectural Benefits

1. **Multiple UIs, One Core**: TUI, Exec, and App Server share identical business logic, reducing bug surface area
2. **Queue-Based Async**: Submission/event protocol enables interruptible, cancellable operations
3. **JSONL Persistence**: Human-readable, diffable session logs; no database required
4. **Model Provider Agnostic**: Uniform abstraction over OpenAI, OSS, local models
5. **Tool Extensibility**: MCP servers and dynamic tools enable third-party integrations

**Sources**: All files in [codex-rs/core/src/](), [codex-rs/tui/src/](), [codex-rs/exec/src/](), [codex-rs/app-server/src/]()
