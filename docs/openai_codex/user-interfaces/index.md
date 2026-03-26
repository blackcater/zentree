# User Interfaces

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [codex-rs/Cargo.lock](codex-rs/Cargo.lock)
- [codex-rs/Cargo.toml](codex-rs/Cargo.toml)
- [codex-rs/README.md](codex-rs/README.md)
- [codex-rs/cli/Cargo.toml](codex-rs/cli/Cargo.toml)
- [codex-rs/cli/src/main.rs](codex-rs/cli/src/main.rs)
- [codex-rs/config.md](codex-rs/config.md)
- [codex-rs/core/Cargo.toml](codex-rs/core/Cargo.toml)
- [codex-rs/core/src/flags.rs](codex-rs/core/src/flags.rs)
- [codex-rs/core/src/lib.rs](codex-rs/core/src/lib.rs)
- [codex-rs/core/src/model_provider_info.rs](codex-rs/core/src/model_provider_info.rs)
- [codex-rs/exec/Cargo.toml](codex-rs/exec/Cargo.toml)
- [codex-rs/exec/src/cli.rs](codex-rs/exec/src/cli.rs)
- [codex-rs/exec/src/lib.rs](codex-rs/exec/src/lib.rs)
- [codex-rs/tui/Cargo.toml](codex-rs/tui/Cargo.toml)
- [codex-rs/tui/src/app.rs](codex-rs/tui/src/app.rs)
- [codex-rs/tui/src/app_event.rs](codex-rs/tui/src/app_event.rs)
- [codex-rs/tui/src/bottom_pane/bottom_pane_view.rs](codex-rs/tui/src/bottom_pane/bottom_pane_view.rs)
- [codex-rs/tui/src/bottom_pane/chat_composer.rs](codex-rs/tui/src/bottom_pane/chat_composer.rs)
- [codex-rs/tui/src/bottom_pane/mod.rs](codex-rs/tui/src/bottom_pane/mod.rs)
- [codex-rs/tui/src/chatwidget.rs](codex-rs/tui/src/chatwidget.rs)
- [codex-rs/tui/src/chatwidget/tests.rs](codex-rs/tui/src/chatwidget/tests.rs)
- [codex-rs/tui/src/cli.rs](codex-rs/tui/src/cli.rs)
- [codex-rs/tui/src/history_cell.rs](codex-rs/tui/src/history_cell.rs)
- [codex-rs/tui/src/lib.rs](codex-rs/tui/src/lib.rs)
- [codex-rs/tui/src/slash_command.rs](codex-rs/tui/src/slash_command.rs)
- [codex-rs/tui/src/status_indicator_widget.rs](codex-rs/tui/src/status_indicator_widget.rs)

</details>

## Purpose and Scope

This document describes the four user-facing interfaces through which users interact with Codex: the **Terminal User Interface (TUI)** for interactive sessions, **headless execution mode** (`codex exec`) for non-interactive automation, the **CLI entry point** that dispatches to different modes, and the **App Server** for IDE integrations. Each interface provides a different interaction model while sharing the same underlying core engine described in [Core Agent System](#3).

For configuration of these interfaces, see [Configuration System](#2.2). For the protocol layer that coordinates async communication across all interfaces, see [Protocol Layer (Submission/Event System)](#2.1).

---

## Execution Modes Overview

Codex supports four distinct execution modes, each optimized for different use cases:

```mermaid
graph TB
    subgraph "Entry Points"
        CLI["codex CLI<br/>(MultitoolCli)"]
        NPM["npm -g @openai/codex"]
        Brew["brew install codex"]
    end

    subgraph "Execution Modes"
        TUI["Interactive TUI<br/>(codex)"]
        Exec["Headless Exec<br/>(codex exec)"]
        AppServer["App Server<br/>(codex app-server)"]
        Review["Code Review<br/>(codex review)"]
    end

    subgraph "Core Integration"
        ThreadMgr["ThreadManager"]
        Codex["Codex Session"]
    end

    subgraph "IDE Clients"
        VSCode["VS Code Extension"]
        Cursor["Cursor IDE"]
        Other["Other IDEs"]
    end

    NPM --> CLI
    Brew --> CLI

    CLI --> TUI
    CLI --> Exec
    CLI --> Review
    CLI --> AppServer

    TUI --> ThreadMgr
    Exec --> ThreadMgr
    Review --> ThreadMgr
    AppServer --> ThreadMgr

    ThreadMgr --> Codex

    AppServer --> VSCode
    AppServer --> Cursor
    AppServer --> Other
```

**Execution Mode Characteristics:**

| Mode       | Interactive   | Output Format       | Primary Use Case                   |
| ---------- | ------------- | ------------------- | ---------------------------------- |
| TUI        | Yes           | Rich terminal UI    | Human-driven development sessions  |
| Exec       | No            | Plain text or JSONL | CI/CD, scripting, automation       |
| Review     | No            | Plain text          | Code review workflows              |
| App Server | Yes (via IDE) | JSON-RPC            | IDE integrations (VS Code, Cursor) |

Sources: [codex-rs/cli/src/main.rs:56-111](), [codex-rs/tui/src/lib.rs:1-227](), [codex-rs/exec/src/lib.rs:1-100](), [Diagram 1 from high-level architecture]()

---

## CLI Entry Point and Multitool Dispatch

### MultitoolCli Structure

The `codex` binary acts as a multitool that dispatches to different execution modes based on subcommands. The entry point is `MultitoolCli` in [codex-rs/cli/src/main.rs:56-82]():

```mermaid
graph LR
    subgraph "MultitoolCli"
        ConfigOverrides["config_overrides<br/>(CliConfigOverrides)"]
        FeatureToggles["feature_toggles<br/>(--enable/--disable)"]
        Interactive["interactive<br/>(TuiCli)"]
        Subcommand["subcommand<br/>(Option<Subcommand>)"]
    end

    subgraph "Subcommands"
        ExecCmd["Exec(ExecCli)"]
        ReviewCmd["Review(ReviewArgs)"]
        LoginCmd["Login"]
        LogoutCmd["Logout"]
        McpCmd["Mcp(McpCli)"]
        McpServerCmd["McpServer"]
        AppServerCmd["AppServer"]
        AppCmd["App (macOS only)"]
    end

    Subcommand --> ExecCmd
    Subcommand --> ReviewCmd
    Subcommand --> LoginCmd
    Subcommand --> LogoutCmd
    Subcommand --> McpCmd
    Subcommand --> McpServerCmd
    Subcommand --> AppServerCmd
    Subcommand --> AppCmd

    ExecCmd --> ExecMain["codex_exec::run_main()"]
    ReviewCmd --> ExecMain
    Interactive --> TuiMain["codex_tui::run_main()"]
    AppServerCmd --> AppServerMain["codex_app_server::run_server()"]
```

**Dispatch Logic:**

When no subcommand is provided, CLI args are forwarded to the interactive TUI. The `subcommand_negates_reqs` clap attribute ensures TUI-specific requirements don't block subcommand execution [codex-rs/cli/src/main.rs:63]().

**Configuration Override Flow:**

```mermaid
sequenceDiagram
    participant User
    participant CLI as MultitoolCli
    participant Parser as CliConfigOverrides
    participant Builder as ConfigBuilder
    participant Mode as Execution Mode

    User->>CLI: codex -c key=value exec "task"
    CLI->>Parser: parse_overrides()
    Parser-->>CLI: HashMap<String, TomlValue>
    CLI->>Builder: with_overrides(overrides)
    Builder->>Builder: Merge layers:<br/>CLI → env → project → global
    Builder-->>Mode: Final Config
    Mode->>Mode: Execute with merged config
```

Sources: [codex-rs/cli/src/main.rs:56-111](), [codex-rs/tui/src/lib.rs:230-287](), [codex-rs/exec/src/lib.rs:1-100]()

---

## Terminal User Interface (TUI)

### Component Hierarchy

The TUI is structured as a layered widget hierarchy with clear separation between state management, input handling, and rendering:

```mermaid
graph TB
    subgraph "App Layer"
        App["App<br/>(app.rs)"]
        Tui["Tui<br/>(terminal wrapper)"]
        EventLoop["Event Loop<br/>(TuiEvent stream)"]
    end

    subgraph "Widget Layer"
        ChatWidget["ChatWidget<br/>(chatwidget.rs)"]
        BottomPane["BottomPane<br/>(bottom_pane/mod.rs)"]
        Overlay["Overlay<br/>(transcript/help)"]
    end

    subgraph "Input Components"
        ChatComposer["ChatComposer<br/>(chat_composer.rs)"]
        TextArea["TextArea<br/>(textarea.rs)"]
        Popups["Popups<br/>(command/file/skill)"]
    end

    subgraph "Display Components"
        HistoryCells["History Cells<br/>(history_cell.rs)"]
        StatusIndicator["StatusIndicatorWidget<br/>(status_indicator_widget.rs)"]
        SessionHeader["SessionHeader"]
    end

    subgraph "State Management"
        ThreadEventStore["ThreadEventStore<br/>(buffered events)"]
        ThreadManager["ThreadManager<br/>(codex-core)"]
        CodexThread["CodexThread"]
    end

    App --> ChatWidget
    App --> Overlay
    App --> EventLoop
    App --> Tui

    ChatWidget --> BottomPane
    ChatWidget --> HistoryCells
    ChatWidget --> StatusIndicator
    ChatWidget --> SessionHeader

    BottomPane --> ChatComposer
    ChatComposer --> TextArea
    ChatComposer --> Popups

    App --> ThreadEventStore
    ThreadEventStore --> ThreadManager
    ThreadManager --> CodexThread

    EventLoop -.->|KeyEvent| App
    App -.->|Op| ThreadManager
    ThreadManager -.->|Event| App
```

**Key Components:**

| Component      | File                                     | Responsibility                                                |
| -------------- | ---------------------------------------- | ------------------------------------------------------------- |
| `App`          | [tui/src/app.rs]()                       | Top-level event loop, thread switching, lifecycle             |
| `ChatWidget`   | [tui/src/chatwidget.rs]()                | Session UI state, event-to-UI translation, history management |
| `BottomPane`   | [tui/src/bottom_pane/mod.rs]()           | Input routing, view stack (composer/popups/overlays)          |
| `ChatComposer` | [tui/src/bottom_pane/chat_composer.rs]() | Text input, paste handling, slash commands                    |
| `HistoryCell`  | [tui/src/history_cell.rs]()              | Transcript display trait, concrete cell types                 |

Sources: [codex-rs/tui/src/app.rs:1-113](), [codex-rs/tui/src/chatwidget.rs:1-270](), [codex-rs/tui/src/bottom_pane/mod.rs:1-152]()

### Event Flow Architecture

The TUI operates on a bidirectional event flow model:

```mermaid
sequenceDiagram
    participant User
    participant Tui as Tui (Terminal)
    participant App
    participant ChatWidget
    participant BottomPane
    participant ThreadMgr as ThreadManager
    participant Core as CodexThread

    User->>Tui: Keystroke
    Tui->>App: TuiEvent::Key
    App->>ChatWidget: handle_key
    ChatWidget->>BottomPane: handle_key

    alt Input Submitted
        BottomPane-->>ChatWidget: InputResult::Submit
        ChatWidget->>ChatWidget: Build UserInput
        ChatWidget->>ThreadMgr: submit(Op::UserInput)
        ThreadMgr->>Core: Process turn
    end

    loop Event Stream
        Core-->>ThreadMgr: Event
        ThreadMgr-->>App: Event (via channel)
        App->>App: ThreadEventStore::push_event
        App->>ChatWidget: handle_codex_event
        ChatWidget->>ChatWidget: Update active_cell
        ChatWidget-->>App: AppEvent::RequestFrame
        App->>Tui: Draw
        Tui->>User: Render update
    end
```

**Event Types:**

1. **TuiEvent** [tui/src/tui.rs](): Terminal events (key, mouse, resize, paste)
2. **AppEvent** [tui/src/app_event.rs](): Internal app messages (open picker, exit, etc.)
3. **Op** [codex-rs/protocol/src/protocol.rs](): Submissions to core (user input, interrupt)
4. **Event** [codex-rs/protocol/src/protocol.rs](): Core notifications (message deltas, tool calls)

Sources: [codex-rs/tui/src/app.rs:1-113](), [codex-rs/tui/src/chatwidget.rs:1-270](), [codex-rs/tui/src/app_event.rs:1-147]()

### App Main Loop

The `App::run` method orchestrates the main event loop:

```mermaid
graph TB
    Start["App::run()"]

    subgraph "Initialization"
        LoadState["Load ThreadEventStore<br/>from session history"]
        CreateWidget["Create ChatWidget<br/>with InProcessAppServerClient"]
        SpawnAgent["Spawn agent thread<br/>(spawn_agent)"]
    end

    subgraph "Event Loop"
        Select["tokio::select!"]
        TuiEvent["TUI event<br/>(key/mouse/resize)"]
        CoreEvent["Core event<br/>(ThreadManager)"]
        AppEvent["App event<br/>(internal channel)"]
        TickEvent["Periodic tick<br/>(frame request)"]
    end

    subgraph "Event Handlers"
        HandleKey["handle_key_event"]
        HandleCodex["handle_codex_event"]
        HandleApp["handle_app_event"]
        HandleTick["handle_tick"]
    end

    subgraph "Rendering"
        CheckDirty["Check dirty flag"]
        Draw["tui.draw()"]
        ClearDirty["Clear dirty flag"]
    end

    subgraph "Exit"
        Cleanup["Cleanup resources"]
        ExitInfo["Return AppExitInfo"]
    end

    Start --> LoadState
    LoadState --> CreateWidget
    CreateWidget --> SpawnAgent
    SpawnAgent --> Select

    Select --> TuiEvent
    Select --> CoreEvent
    Select --> AppEvent
    Select --> TickEvent

    TuiEvent --> HandleKey
    CoreEvent --> HandleCodex
    AppEvent --> HandleApp
    TickEvent --> HandleTick

    HandleKey --> CheckDirty
    HandleCodex --> CheckDirty
    HandleApp --> CheckDirty
    HandleTick --> CheckDirty

    CheckDirty -->|dirty| Draw
    Draw --> ClearDirty
    CheckDirty -->|not dirty| Select
    ClearDirty --> Select

    HandleApp -->|Exit| Cleanup
    Cleanup --> ExitInfo
```

**Frame Request Optimization:**

The TUI uses a `FrameRequester` [tui/src/frames.rs]() to avoid unnecessary redraws. Widgets request frames when state changes, and the app loop only calls `tui.draw()` when the dirty flag is set.

Sources: [codex-rs/tui/src/app.rs:580-800](), [codex-rs/tui/src/lib.rs:230-535]()

### ChatWidget State Machine

`ChatWidget` manages per-session UI state and translates protocol events into UI changes:

```mermaid
stateDiagram-v2
    [*] --> Idle

    Idle --> WaitingForConfigured: SessionConfiguredEvent
    WaitingForConfigured --> Ready: Apply config/cwd/permissions

    Ready --> TurnActive: UserMessageEvent
    TurnActive --> Streaming: AgentMessageDeltaEvent
    Streaming --> ToolExecution: ExecCommandBeginEvent
    ToolExecution --> Streaming: ExecCommandEndEvent
    Streaming --> TurnComplete: TurnCompleteEvent
    TurnComplete --> Ready

    TurnActive --> Interrupted: Op::Interrupt
    Streaming --> Interrupted: Op::Interrupt
    ToolExecution --> Interrupted: Op::Interrupt
    Interrupted --> Ready: Cleanup active_cell

    Ready --> ThreadSwitch: Switch to different thread
    ThreadSwitch --> WaitingForConfigured: Replay ThreadEventSnapshot

    TurnActive --> ApprovalPending: ExecApprovalRequestEvent
    ApprovalPending --> TurnActive: ApprovalOverlay dismissed

    Ready --> [*]: AppEvent::Exit
```

**Active Cell Pattern:**

While an agent turn is in progress, `ChatWidget` maintains an `active_cell` [tui/src/chatwidget.rs:546]() that can mutate in place during streaming. When the turn completes, this cell is flushed to history via `AppEvent::InsertHistoryCell`.

Sources: [codex-rs/tui/src/chatwidget.rs:530-656](), [codex-rs/tui/src/chatwidget/tests.rs:1-100]()

### Bottom Pane Input Handling

The `BottomPane` manages input routing between the composer and active overlays:

```mermaid
graph TB
    subgraph "BottomPane"
        ViewStack["view_stack<br/>(VecDeque<BottomPaneView>)"]
        Composer["composer<br/>(ChatComposer)"]
        StatusRow["status_indicator<br/>(StatusIndicatorWidget)"]
    end

    subgraph "Views (Popups/Overlays)"
        ApprovalOverlay["ApprovalOverlay"]
        SelectionView["ListSelectionView"]
        CustomPromptView["CustomPromptView"]
        McpElicitation["McpServerElicitationOverlay"]
        RequestInput["RequestUserInputOverlay"]
    end

    subgraph "Composer Components"
        TextArea["TextArea<br/>(editable buffer)"]
        CommandPopup["CommandPopup<br/>(slash commands)"]
        FileSearchPopup["FileSearchPopup"]
        SkillPopup["SkillPopup<br/>(@mentions)"]
    end

    KeyEvent["KeyEvent"]

    KeyEvent --> ViewStack
    ViewStack -->|If view active| Views
    ViewStack -->|If empty| Composer

    Views --> ApprovalOverlay
    Views --> SelectionView
    Views --> CustomPromptView
    Views --> McpElicitation
    Views --> RequestInput

    Composer --> TextArea
    Composer --> CommandPopup
    Composer --> FileSearchPopup
    Composer --> SkillPopup
```

**Input Priority:**

1. **Active View** (top of `view_stack`): Gets first chance at key event
2. **Status Indicator**: Intercepts Ctrl+C if task running and interrupt hint visible
3. **Composer**: Handles remaining input (typing, slash commands, history navigation)

**Cancellation Handling:**

Ctrl+C returns `CancellationEvent` [tui/src/bottom_pane/mod.rs:135-138]() to indicate whether the event was consumed locally. Unhandled cancellation bubbles to `ChatWidget` for turn interruption or quit shortcut logic.

Sources: [codex-rs/tui/src/bottom_pane/mod.rs:1-152](), [codex-rs/tui/src/bottom_pane/chat_composer.rs:1-230](), [codex-rs/tui/src/bottom_pane/bottom_pane_view.rs:1-50]()

### History Cell Rendering

The `HistoryCell` trait [tui/src/history_cell.rs:98-168]() defines the interface for transcript display:

```mermaid
classDiagram
    class HistoryCell {
        <<trait>>
        +display_lines(width: u16) Vec~Line~
        +desired_height(width: u16) u16
        +transcript_lines(width: u16) Vec~Line~
        +desired_transcript_height(width: u16) u16
        +transcript_animation_tick() Option~u64~
    }

    class UserHistoryCell {
        +message: String
        +text_elements: Vec~TextElement~
        +local_image_paths: Vec~PathBuf~
        +remote_image_urls: Vec~String~
    }

    class AgentMessageCell {
        +content: String
        +phase: Option~MessagePhase~
    }

    class ExecCell {
        +calls: Vec~ExecCall~
        +running: bool
    }

    class WebSearchCell {
        +query: String
        +results: Vec~SearchResult~
        +status: SearchStatus
    }

    class McpToolCallCell {
        +tool_name: String
        +arguments: Value
        +result: Option~String~
    }

    HistoryCell <|.. UserHistoryCell
    HistoryCell <|.. AgentMessageCell
    HistoryCell <|.. ExecCell
    HistoryCell <|.. WebSearchCell
    HistoryCell <|.. McpToolCallCell
```

**Transcript vs Display Lines:**

- `display_lines()`: Main viewport rendering (may omit tool output for brevity)
- `transcript_lines()`: Full transcript overlay (includes all tool calls with `$` prefix)

**Active Cell Caching:**

The transcript overlay caches the rendered tail of the in-flight `active_cell` using a revision counter [tui/src/chatwidget.rs:556]() that invalidates when content changes or animations tick.

Sources: [codex-rs/tui/src/history_cell.rs:88-197](), [codex-rs/tui/src/chatwidget.rs:1-270]()

---

## Headless Execution Mode (codex exec)

### Architecture Overview

The `codex exec` mode provides non-interactive automation with two output formats:

```mermaid
graph TB
    subgraph "Entry Point"
        ExecCLI["codex exec [args]<br/>(Cli::Exec)"]
        ReviewCLI["codex review [args]<br/>(Cli::Review)"]
    end

    subgraph "Configuration"
        ConfigBuilder["ConfigBuilder"]
        ExecArgs["Parse CLI args"]
        Overrides["Apply overrides<br/>(-c, --enable, etc.)"]
    end

    subgraph "App Server Client"
        InProcess["InProcessAppServerClient"]
        ServerEvents["InProcessServerEvent channel"]
        ThreadStart["thread/start or thread/resume"]
    end

    subgraph "Event Processing"
        Processor["EventProcessor trait"]
        HumanOutput["EventProcessorWithHumanOutput"]
        JsonlOutput["EventProcessorWithJsonOutput"]
    end

    subgraph "Core Integration"
        ThreadMgr["ThreadManager"]
        CodexThread["CodexThread"]
    end

    subgraph "Output"
        Stdout["stdout<br/>(final message or JSONL)"]
        Stderr["stderr<br/>(errors/warnings)"]
    end

    ExecCLI --> ConfigBuilder
    ReviewCLI --> ConfigBuilder
    ConfigBuilder --> ExecArgs
    ExecArgs --> Overrides
    Overrides --> InProcess

    InProcess --> ThreadStart
    ThreadStart --> ThreadMgr
    ThreadMgr --> CodexThread

    CodexThread --> ServerEvents
    ServerEvents --> Processor

    Processor --> HumanOutput
    Processor --> JsonlOutput

    HumanOutput --> Stdout
    HumanOutput --> Stderr
    JsonlOutput --> Stdout
```

**Output Mode Selection:**

- **Default** (`--format=text`): Pretty-printed output for humans [exec/src/event_processor_with_human_output.rs]()
- **JSONL** (`--format=jsonl`): Structured events for scripting [exec/src/event_processor_with_jsonl_output.rs]()

Sources: [codex-rs/exec/src/lib.rs:1-100](), [codex-rs/exec/src/cli.rs:1-120]()

### Event Processor Pattern

Both output formats implement the `EventProcessor` trait:

```mermaid
classDiagram
    class EventProcessor {
        <<trait>>
        +process_event(&mut self, event: &Event) Result
        +process_approval_request(&mut self, request: &ApprovalRequest) Result~bool~
        +process_mcp_elicitation(&mut self, request: &McpElicitation) Result~Response~
        +finish(&mut self) Result
    }

    class EventProcessorWithHumanOutput {
        -terminal_supports_color: bool
        -emitted_any_message: bool
        -approval_manager: ApprovalManager
    }

    class EventProcessorWithJsonOutput {
        -stdout_writer: BufWriter
        -event_sequence: u64
    }

    EventProcessor <|.. EventProcessorWithHumanOutput
    EventProcessor <|.. EventProcessorWithJsonOutput
```

**Human Output Processing:**

The human-readable processor [exec/src/event_processor_with_human_output.rs:1-500]() filters events to show only user-visible content:

- `AgentMessageEvent`: Print assistant message
- `ExecCommandBeginEvent`: Print command with `$` prefix
- `ExecCommandEndEvent`: Print exit status
- `ErrorEvent` / `WarningEvent`: Print to stderr with color

**JSONL Output Processing:**

The JSONL processor [exec/src/event_processor_with_jsonl_output.rs:1-200]() emits every event as a JSON line:

```json
{"sequence":1,"event_id":"msg-1","event_type":"user_message","data":{...}}
{"sequence":2,"event_id":"msg-2","event_type":"agent_message_delta","data":{...}}
{"sequence":3,"event_id":"tool-1","event_type":"exec_command_begin","data":{...}}
```

Sources: [codex-rs/exec/src/event_processor.rs:1-100](), [codex-rs/exec/src/event_processor_with_human_output.rs:1-500](), [codex-rs/exec/src/event_processor_with_jsonl_output.rs:1-200]()

### Approval Handling in Exec Mode

Headless mode must handle approval requests without user interaction:

```mermaid
sequenceDiagram
    participant Core as CodexThread
    participant Client as InProcessClient
    participant Processor as EventProcessor
    participant Policy as ApprovalPolicy

    Core->>Client: ExecApprovalRequestEvent
    Client->>Processor: process_approval_request()

    alt Approval Policy = Never
        Processor-->>Client: Approved (true)
    else Approval Policy = Always
        Processor-->>Client: Denied (false)
    else Approval Policy = OnRequest
        Processor->>Policy: Check exec_policy rules
        Policy-->>Processor: Allow/Deny/Warn
        Processor-->>Client: Decision (bool)
    end

    Client->>Core: Op::ApprovalResponse
```

**Approval Behavior by Policy:**

| `approval_policy` | Behavior                                                               |
| ----------------- | ---------------------------------------------------------------------- |
| `Never`           | Auto-approve all requests                                              |
| `Always`          | Deny all requests (exec mode cannot prompt user)                       |
| `OnRequest`       | Use `exec_policy` rules to decide [codex-rs/core/src/exec_policy.rs]() |

Sources: [codex-rs/exec/src/event_processor_with_human_output.rs:1-500](), [codex-rs/exec/src/lib.rs:1-100]()

### Review Mode Delegation

The `codex review` command is a specialized exec mode that delegates to a review sub-agent:

```mermaid
sequenceDiagram
    participant CLI as codex review
    participant ExecMain as exec::run_main
    participant Client as InProcessClient
    participant ThreadMgr as ThreadManager
    participant ReviewAgent as Review Sub-Agent

    CLI->>ExecMain: ReviewArgs
    ExecMain->>ExecMain: Parse --targets, --guidelines
    ExecMain->>Client: thread/start
    Client->>ThreadMgr: NewThread with SessionSource::Review
    ThreadMgr->>ReviewAgent: Spawn with review prompt

    ReviewAgent->>ReviewAgent: Analyze targets
    ReviewAgent->>ReviewAgent: Apply guidelines
    ReviewAgent-->>ThreadMgr: ReviewCompleteEvent
    ThreadMgr-->>Client: Events
    Client-->>ExecMain: Process output
    ExecMain-->>CLI: Exit with status
```

**Review Configuration:**

Review sessions use a restricted config [exec/src/lib.rs:200-300]():

- `approval_policy = Never`
- `web_search = Disabled`
- Sandboxed to target paths only

Sources: [codex-rs/exec/src/cli.rs:60-120](), [codex-rs/exec/src/lib.rs:1-100]()

---

## App Server and IDE Integration

### JSON-RPC Protocol Architecture

The App Server [app-server/src/lib.rs]() exposes Codex functionality to IDE clients via a JSON-RPC 2.0 protocol:

```mermaid
graph TB
    subgraph "IDE Client"
        Extension["VS Code Extension<br/>or Cursor"]
        JSONRPC["JSON-RPC Client"]
    end

    subgraph "App Server"
        Listener["TCP/WebSocket Listener"]
        Processor["CodexMessageProcessor"]
        ThreadMgrWrapper["ThreadManager wrapper"]
    end

    subgraph "Protocol v2 API"
        ThreadAPI["thread/* methods"]
        TurnAPI["turn/* methods"]
        ConfigAPI["config/* methods"]
        AuthAPI["auth/* methods"]
    end

    subgraph "Core Integration"
        ThreadMgr["ThreadManager"]
        CodexThread["CodexThread"]
    end

    subgraph "Bidirectional Messaging"
        ClientRequests["Client → Server<br/>(requests)"]
        ServerRequests["Server → Client<br/>(elicitations)"]
        Notifications["Server → Client<br/>(events)"]
    end

    Extension --> JSONRPC
    JSONRPC --> Listener
    Listener --> Processor

    Processor --> ThreadAPI
    Processor --> TurnAPI
    Processor --> ConfigAPI
    Processor --> AuthAPI

    ThreadAPI --> ThreadMgrWrapper
    TurnAPI --> ThreadMgrWrapper
    ThreadMgrWrapper --> ThreadMgr
    ThreadMgr --> CodexThread

    Processor --> ClientRequests
    Processor --> ServerRequests
    Processor --> Notifications

    ClientRequests --> ThreadMgr
    ServerRequests --> JSONRPC
    Notifications --> JSONRPC
```

**Key Protocol Methods:**

| Category | Methods                                         | Purpose              |
| -------- | ----------------------------------------------- | -------------------- |
| Thread   | `thread/start`, `thread/resume`, `thread/fork`  | Session lifecycle    |
| Turn     | `turn/start`, `turn/interrupt`, `turn/undo`     | Conversation control |
| Config   | `config/read`, `config/write`, `config/layer/*` | Settings management  |
| Auth     | `auth/login`, `auth/logout`, `auth/info`        | Authentication       |

Sources: [codex-rs/app-server/src/lib.rs](), [codex-rs/app-server-protocol/src/lib.rs]()

### InProcessAppServerClient

Both the TUI and exec mode use `InProcessAppServerClient` [app-server-client/src/lib.rs]() to communicate with core without network overhead:

```mermaid
sequenceDiagram
    participant UI as TUI/Exec
    participant Client as InProcessClient
    participant Server as AppServer
    participant ThreadMgr as ThreadManager

    UI->>Client: start(InProcessClientStartArgs)
    Client->>Server: Spawn server task
    Server->>ThreadMgr: Initialize ThreadManager

    UI->>Client: send_request(thread/start)
    Client->>Server: ClientRequest via channel
    Server->>ThreadMgr: NewThread
    ThreadMgr-->>Server: ThreadStartResponse
    Server-->>Client: ServerResponse
    Client-->>UI: Deserialized response

    loop Event Stream
        ThreadMgr->>Server: Event
        Server->>Client: ServerNotification
        Client->>UI: InProcessServerEvent::Event
    end

    loop Server Requests
        Server->>Client: ServerRequest (elicitation)
        Client->>UI: InProcessServerEvent::ServerRequest
        UI->>Client: send_request_response()
        Client->>Server: ClientRequest
    end
```

**Channel Architecture:**

- **Client → Server**: Bounded mpsc channel (default 512 capacity) for requests
- **Server → Client**: Unbounded mpsc channel for responses/notifications/server-requests

This avoids backpressure issues where the UI blocks on a full channel while the server waits for a response.

Sources: [codex-rs/app-server-client/src/lib.rs](), [codex-rs/app-server/src/lib.rs]()

### Thread Event Store and Switching

The App maintains a `ThreadEventStore` [app.rs:271-378]() per thread to support fast thread switching:

```mermaid
graph TB
    subgraph "App State"
        ActiveThread["active_thread_id"]
        EventChannels["thread_event_channels<br/>HashMap<ThreadId, ThreadEventChannel>"]
    end

    subgraph "ThreadEventChannel"
        Sender["mpsc::Sender<Event>"]
        Receiver["mpsc::Receiver<Event>"]
        Store["Arc<Mutex<ThreadEventStore>>"]
    end

    subgraph "ThreadEventStore"
        SessionConfigured["session_configured: Option<Event>"]
        Buffer["buffer: VecDeque<Event><br/>(max 32768)"]
        InputState["input_state: Option<ThreadInputState>"]
    end

    ActiveThread --> EventChannels
    EventChannels --> ThreadEventChannel

    ThreadEventChannel --> Sender
    ThreadEventChannel --> Receiver
    ThreadEventChannel --> Store

    Store --> SessionConfigured
    Store --> Buffer
    Store --> InputState
```

**Thread Switch Flow:**

1. User presses Ctrl+Left/Right or selects from agent picker
2. App saves current `ChatWidget` input state to `ThreadEventStore`
3. App retrieves `ThreadEventSnapshot` for target thread
4. App creates new `ChatWidget` and replays snapshot events
5. App restores input state (draft message, attachments)

**Event Capacity:**

The buffer holds up to 32,768 events [app.rs:122]() per thread. Older events are evicted FIFO, but `SessionConfiguredEvent` is preserved separately to support thread resumption.

Sources: [codex-rs/tui/src/app.rs:271-378](), [codex-rs/tui/src/app.rs:114-162]()

---

## Session Resumption and Forking

### Resume vs Fork Semantics

```mermaid
graph LR
    subgraph "Existing Thread"
        RolloutFile["rollout.jsonl<br/>(persisted events)"]
        SessionIndex["session_index.jsonl<br/>(metadata)"]
    end

    subgraph "Resume Operation"
        ResumePicker["Resume Picker<br/>(Ctrl+P)"]
        LoadEvents["Load rollout events"]
        ReplayHistory["Replay into ChatWidget"]
        ContinueThread["Continue existing thread"]
    end

    subgraph "Fork Operation"
        ForkCommand["/fork command"]
        CopyEvents["Copy rollout events"]
        NewThread["Create new thread"]
        IndependentHistory["Independent history"]
    end

    RolloutFile --> LoadEvents
    SessionIndex --> ResumePicker

    ResumePicker --> LoadEvents
    LoadEvents --> ReplayHistory
    ReplayHistory --> ContinueThread

    ResumePicker --> CopyEvents
    CopyEvents --> NewThread
    NewThread --> IndependentHistory
```

**Key Differences:**

| Aspect    | Resume                      | Fork                              |
| --------- | --------------------------- | --------------------------------- |
| Thread ID | Same as original            | New UUID                          |
| History   | Append to existing rollout  | Copy to new rollout               |
| State     | Restore session state       | Fresh session with copied history |
| Metadata  | Preserve original name/tags | New name, links to parent         |

**Resume Implementation:**

The TUI loads a `ThreadEventSnapshot` [app.rs:264-269]() containing:

- `SessionConfiguredEvent` (config/cwd/permissions)
- Filtered event buffer (excludes answered approvals)
- Input state (draft message, queued inputs)

Sources: [codex-rs/tui/src/app.rs:264-378](), [codex-rs/core/src/rollout/mod.rs]()

### Rollout File Persistence

Events are persisted to `~/.codex/sessions/<thread-id>/rollout.jsonl` [core/src/rollout/mod.rs]():

```
{"id":"cfg-1","msg":{"SessionConfigured":{...}}}
{"id":"usr-1","msg":{"UserMessage":{...}}}
{"id":"agt-1","msg":{"AgentMessage":{...}}}
{"id":"tool-1","msg":{"ExecCommandBegin":{...}}}
{"id":"tool-1","msg":{"ExecCommandEnd":{...}}}
```

**Persistence Policy:**

Not all events are persisted [core/src/rollout/policy.rs]():

- Persisted: User messages, agent messages, tool calls, errors, turn metadata
- Filtered: Streaming deltas, intermediate reasoning, rate limit snapshots

This reduces rollout size while preserving replay-ability.

Sources: [codex-rs/core/src/rollout/mod.rs](), [codex-rs/core/src/rollout/policy.rs]()

---

## Sources Summary

**Overall Architecture:**

- [codex-rs/Cargo.lock:1-400]()
- [codex-rs/Cargo.toml:1-395]()
- [codex-rs/README.md:1-100]()
- [High-level architecture diagrams provided]()

**CLI Entry Point:**

- [codex-rs/cli/src/main.rs:56-111]()
- [codex-rs/cli/Cargo.toml:1-80]()

**TUI Implementation:**

- [codex-rs/tui/src/lib.rs:1-227]()
- [codex-rs/tui/src/app.rs:1-113]()
- [codex-rs/tui/src/chatwidget.rs:1-656]()
- [codex-rs/tui/src/chatwidget/tests.rs:1-600]()
- [codex-rs/tui/src/bottom_pane/mod.rs:1-152]()
- [codex-rs/tui/src/bottom_pane/chat_composer.rs:1-230]()
- [codex-rs/tui/src/bottom_pane/bottom_pane_view.rs:1-50]()
- [codex-rs/tui/src/history_cell.rs:88-197]()
- [codex-rs/tui/src/status_indicator_widget.rs:1-200]()
- [codex-rs/tui/src/app_event.rs:1-147]()
- [codex-rs/tui/src/slash_command.rs:1-70]()
- [codex-rs/tui/src/cli.rs:1-100]()
- [codex-rs/tui/Cargo.toml:1-120]()

**Exec Mode:**

- [codex-rs/exec/src/lib.rs:1-100]()
- [codex-rs/exec/src/cli.rs:1-120]()
- [codex-rs/exec/Cargo.toml:1-80]()

**Core Integration:**

- [codex-rs/core/src/lib.rs:1-178]()
- [codex-rs/core/Cargo.toml:1-160]()
- [codex-rs/core/src/model_provider_info.rs:1-200]()
