# Terminal User Interface (TUI)

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [packages/opencode/src/cli/cmd/tui/app.tsx](packages/opencode/src/cli/cmd/tui/app.tsx)
- [packages/opencode/src/cli/cmd/tui/attach.ts](packages/opencode/src/cli/cmd/tui/attach.ts)
- [packages/opencode/src/cli/cmd/tui/component/dialog-command.tsx](packages/opencode/src/cli/cmd/tui/component/dialog-command.tsx)
- [packages/opencode/src/cli/cmd/tui/component/prompt/autocomplete.tsx](packages/opencode/src/cli/cmd/tui/component/prompt/autocomplete.tsx)
- [packages/opencode/src/cli/cmd/tui/component/prompt/index.tsx](packages/opencode/src/cli/cmd/tui/component/prompt/index.tsx)
- [packages/opencode/src/cli/cmd/tui/context/args.tsx](packages/opencode/src/cli/cmd/tui/context/args.tsx)
- [packages/opencode/src/cli/cmd/tui/context/exit.tsx](packages/opencode/src/cli/cmd/tui/context/exit.tsx)
- [packages/opencode/src/cli/cmd/tui/context/local.tsx](packages/opencode/src/cli/cmd/tui/context/local.tsx)
- [packages/opencode/src/cli/cmd/tui/context/sdk.tsx](packages/opencode/src/cli/cmd/tui/context/sdk.tsx)
- [packages/opencode/src/cli/cmd/tui/routes/session/header.tsx](packages/opencode/src/cli/cmd/tui/routes/session/header.tsx)
- [packages/opencode/src/cli/cmd/tui/routes/session/index.tsx](packages/opencode/src/cli/cmd/tui/routes/session/index.tsx)
- [packages/opencode/src/cli/cmd/tui/routes/session/sidebar.tsx](packages/opencode/src/cli/cmd/tui/routes/session/sidebar.tsx)
- [packages/opencode/src/cli/cmd/tui/win32.ts](packages/opencode/src/cli/cmd/tui/win32.ts)
- [packages/opencode/src/command/index.ts](packages/opencode/src/command/index.ts)
- [packages/opencode/src/command/template/review.txt](packages/opencode/src/command/template/review.txt)
- [packages/sdk/js/src/v2/client.ts](packages/sdk/js/src/v2/client.ts)

</details>

The Terminal User Interface (TUI) is OpenCode's primary interactive mode, providing a full-featured terminal-based interface for conversing with AI agents, managing sessions, and executing commands. The TUI runs in a worker thread architecture where it spawns and communicates with an HTTP server process, enabling real-time synchronization and responsive UI updates.

For information about the HTTP server that the TUI communicates with, see [HTTP Server & REST API](#2.6). For the web-based UI alternative, see [Web Application](#3.2).

## Architecture Overview

The TUI follows a multi-layered architecture with a clear separation between rendering, state management, and business logic:

```mermaid
graph TB
    subgraph "CLI Entry"
        CLI["opencode CLI<br/>packages/opencode/src/cli/index.ts"]
        TuiCmd["tui() function<br/>packages/opencode/src/cli/cmd/tui/app.tsx"]
    end

    subgraph "Worker Thread Architecture"
        Worker["TUI Worker Thread<br/>@opentui/solid renderer"]
        Server["HTTP Server Process<br/>Hono + SSE"]
        EventSource["EventSource<br/>SSE Connection"]
    end

    subgraph "Context Providers"
        Route["RouteProvider<br/>Navigation state"]
        Sync["SyncProvider<br/>Data synchronization"]
        Local["LocalProvider<br/>User preferences"]
        SDK["SDKProvider<br/>API client"]
        Dialog["DialogProvider<br/>Modal system"]
        Command["CommandProvider<br/>Keybinds + commands"]
        Theme["ThemeProvider<br/>Colors + syntax"]
    end

    subgraph "Routes"
        Home["Home<br/>routes/home"]
        Session["Session<br/>routes/session"]
    end

    subgraph "Core Components"
        Prompt["Prompt<br/>Input with autocomplete"]
        MessageList["Message List<br/>Turn-based display"]
        Sidebar["Sidebar<br/>Context info"]
        Header["Header<br/>Session metadata"]
    end

    CLI --> TuiCmd
    TuiCmd --> Worker
    Worker --> Server
    Server --> EventSource
    EventSource --> Sync

    TuiCmd --> Route
    TuiCmd --> Sync
    TuiCmd --> Local
    TuiCmd --> SDK
    TuiCmd --> Dialog
    TuiCmd --> Command
    TuiCmd --> Theme

    Route --> Home
    Route --> Session

    Session --> Prompt
    Session --> MessageList
    Session --> Sidebar
    Session --> Header
```

**Sources:** [packages/opencode/src/cli/cmd/tui/app.tsx:1-200](), [packages/opencode/src/cli/cmd/tui/routes/session/index.tsx:1-150]()

## Entry Point and Bootstrap

The TUI is initialized through the `tui()` function which sets up the rendering environment and all necessary providers:

| Step | Component         | Responsibility                                                           |
| ---- | ----------------- | ------------------------------------------------------------------------ |
| 1    | Terminal Setup    | Detects terminal background color, disables processed input on Windows   |
| 2    | Renderer          | Initializes `@opentui/solid` with 60 FPS target, Kitty keyboard protocol |
| 3    | Provider Stack    | Wraps app in 15+ context providers for state management                  |
| 4    | Server Connection | Establishes HTTP client and SSE connection for real-time updates         |
| 5    | Route Navigation  | Loads initial route (home or session) based on CLI args                  |

```mermaid
sequenceDiagram
    participant CLI as CLI
    participant Bootstrap as tui()
    participant Term as Terminal
    participant Server as HTTP Server
    participant App as App Component

    CLI->>Bootstrap: tui({url, args, config})
    Bootstrap->>Term: getTerminalBackgroundColor()
    Term-->>Bootstrap: "dark" | "light"
    Bootstrap->>Term: win32DisableProcessedInput()
    Bootstrap->>Server: Initialize SDK client
    Server-->>Bootstrap: Connection established
    Bootstrap->>App: render() with providers
    App->>Server: EventSource connection
    Server-->>App: SSE events
    App->>App: Navigate to initial route
```

**Sources:** [packages/opencode/src/cli/cmd/tui/app.tsx:44-201]()

## Context Provider System

The TUI uses SolidJS context providers to manage state and dependencies. These are initialized in a specific order to handle dependencies correctly:

```mermaid
graph LR
    Args["ArgsProvider<br/>CLI arguments"]
    Exit["ExitProvider<br/>Cleanup handler"]
    KV["KVProvider<br/>Persistent storage"]
    Toast["ToastProvider<br/>Notifications"]
    Route["RouteProvider<br/>Navigation"]
    TuiConfig["TuiConfigProvider<br/>TUI settings"]
    SDK["SDKProvider<br/>API client"]
    Sync["SyncProvider<br/>Data sync"]
    Theme["ThemeProvider<br/>Colors + syntax"]
    Local["LocalProvider<br/>Preferences"]
    Keybind["KeybindProvider<br/>Shortcuts"]
    Stash["PromptStashProvider<br/>Saved prompts"]
    Dialog["DialogProvider<br/>Modal stack"]
    Cmd["CommandProvider<br/>Command registry"]
    Frecency["FrecencyProvider<br/>File ranking"]
    History["PromptHistoryProvider<br/>Input history"]
    PromptRef["PromptRefProvider<br/>Prompt access"]

    Args --> Exit
    Exit --> KV
    KV --> Toast
    Toast --> Route
    Route --> TuiConfig
    TuiConfig --> SDK
    SDK --> Sync
    Sync --> Theme
    Theme --> Local
    Local --> Keybind
    Keybind --> Stash
    Stash --> Dialog
    Dialog --> Cmd
    Cmd --> Frecency
    Frecency --> History
    History --> PromptRef
```

| Provider          | Purpose       | Key State                                          |
| ----------------- | ------------- | -------------------------------------------------- |
| `ArgsProvider`    | CLI arguments | `sessionID`, `agent`, `model`, `fork`, `continue`  |
| `SDKProvider`     | API client    | HTTP client, event source, directory               |
| `SyncProvider`    | Data sync     | `session`, `message`, `part`, `provider`, `config` |
| `LocalProvider`   | User prefs    | Current agent, model, variant selection            |
| `CommandProvider` | Commands      | Keybind registry, slash commands, command palette  |
| `ThemeProvider`   | Appearance    | Theme colors, syntax highlighting                  |
| `DialogProvider`  | Modal stack   | Dialog queue, navigation helpers                   |

**Sources:** [packages/opencode/src/cli/cmd/tui/app.tsx:139-178](), [packages/opencode/src/cli/cmd/tui/context/local.tsx:1-100]()

## Session View Architecture

The session view is the primary interface for AI conversations. It consists of several major components working together:

```mermaid
graph TB
    subgraph SessionPage["Session Page<br/>routes/session/index.tsx"]
        SessionCtx["Session Context<br/>width, sessionID, settings"]

        subgraph Layout["Layout Structure"]
            Header["Header<br/>Title, context, cost"]
            ScrollBox["ScrollBox<br/>Message container"]
            Footer["Footer<br/>Status indicators"]
            PromptArea["Prompt<br/>Input + autocomplete"]
        end

        subgraph MessageRendering["Message Rendering"]
            UserMsg["UserMessage<br/>Text + file parts"]
            AssistantMsg["AssistantMessage<br/>Text + tool calls"]
            Dynamic["Dynamic<br/>Tool-specific rendering"]
        end

        subgraph StateManagement["State Management"]
            Messages["messages()<br/>sync.data.message"]
            Permissions["permissions()<br/>Pending approvals"]
            Questions["questions()<br/>User input needed"]
            Status["status()<br/>idle/generating/error"]
        end

        subgraph InteractionHandlers["Interaction Handlers"]
            Commands["Command Registry<br/>63 commands"]
            Keybinds["Keyboard Handlers<br/>Navigation, scroll"]
            MouseEvents["Mouse Events<br/>Selection, copy"]
        end
    end

    subgraph OptionalPanels["Optional Panels"]
        Sidebar["Sidebar<br/>MCP, LSP, todo, diff"]
        RevertBanner["Revert Banner<br/>Undo visualization"]
    end

    SessionCtx --> Layout
    Layout --> MessageRendering
    StateManagement --> MessageRendering
    InteractionHandlers --> Layout

    SessionPage --> OptionalPanels
```

### Session State and Memos

The session page uses reactive memos to derive state from synchronized data:

| Memo            | Source                               | Purpose                     |
| --------------- | ------------------------------------ | --------------------------- |
| `session()`     | `sync.session.get(route.sessionID)`  | Current session metadata    |
| `messages()`    | `sync.data.message[route.sessionID]` | All messages in session     |
| `pending()`     | Last incomplete assistant message    | Loading indicator           |
| `permissions()` | Child sessions + current             | Pending permission requests |
| `questions()`   | Child sessions + current             | Questions awaiting answers  |
| `children()`    | Sessions with matching `parentID`    | Subagent sessions           |
| `revert()`      | `session()?.revert`                  | Undo state with diff files  |

**Sources:** [packages/opencode/src/cli/cmd/tui/routes/session/index.tsx:116-147]()

## Prompt System

The prompt system handles user input with rich features including autocomplete, history, extmarks (virtual text), and multi-modal input:

```mermaid
graph TB
    subgraph PromptComponent["Prompt Component"]
        Textarea["TextareaRenderable<br/>@opentui/core"]
        Anchor["BoxRenderable<br/>Positioning anchor"]

        subgraph PromptStore["Store State"]
            Input["prompt.input<br/>Plain text"]
            Parts["prompt.parts<br/>File/agent/text parts"]
            Mode["mode<br/>normal | shell"]
            Extmarks["extmarkToPartIndex<br/>Virtual text mapping"]
        end

        subgraph Features["Features"]
            History["History<br/>Up/down navigation"]
            Stash["Stash<br/>Save/restore prompts"]
            Editor["External Editor<br/>$EDITOR integration"]
            Paste["Smart Paste<br/>Images, files, text"]
        end
    end

    subgraph Autocomplete["Autocomplete System"]
        Files["File Search<br/>Ripgrep + frecency"]
        Agents["Subagents<br/>@mentions"]
        Commands["Slash Commands<br/>/ prefix"]
        Resources["MCP Resources<br/>Remote files"]
    end

    subgraph Submission["Submission Flow"]
        Validate["Validate Input<br/>Check model selected"]
        Expand["Expand Parts<br/>Inline pasted text"]
        Submit["Submit to API<br/>prompt/command/shell"]
        Clear["Clear Input<br/>Reset state"]
    end

    Textarea --> PromptStore
    PromptStore --> Features
    Textarea --> Autocomplete
    Features --> Submission
    Autocomplete --> Submission
```

### Extmarks and Virtual Text

The prompt uses extmarks to display compact representations of complex inputs:

| Part Type       | Virtual Text              | Actual Content                 |
| --------------- | ------------------------- | ------------------------------ |
| `file`          | `@filename`               | Full file URL with line ranges |
| `agent`         | `@agent-name`             | Agent invocation metadata      |
| `text` (pasted) | `[Pasted Text: 50 words]` | Full multi-line text content   |
| `image`         | `[Image 1]`               | Base64-encoded image data      |

Extmarks are synchronized with the prompt store via `syncExtmarksWithPromptParts()`, updating positions as the user types.

**Sources:** [packages/opencode/src/cli/cmd/tui/component/prompt/index.tsx:1-200](), [packages/opencode/src/cli/cmd/tui/component/prompt/index.tsx:395-471]()

### Prompt Modes

The prompt supports two modes:

**Normal Mode** (default):

- Text input sent as user message
- `@` triggers file/agent autocomplete
- `/` triggers slash command autocomplete
- Submit sends `session.prompt` API call

**Shell Mode** (`!` prefix):

- Activated by typing `!` at start of empty prompt
- Input interpreted as bash command
- Sends `session.shell` API call
- Border color changes to `theme.primary`

**Sources:** [packages/opencode/src/cli/cmd/tui/component/prompt/index.tsx:874-886](), [packages/opencode/src/cli/cmd/tui/component/prompt/index.tsx:574-584]()

## Autocomplete System

The autocomplete provides context-aware suggestions for files, agents, commands, and MCP resources:

```mermaid
graph TB
    subgraph AutocompleteFlow["Autocomplete Flow"]
        Trigger["Trigger Detection<br/>@ or / character"]
        Filter["Filter Input<br/>Text after trigger"]
        Search["Search Query<br/>Fuzzy matching"]
        Rank["Rank Results<br/>Frecency + fuzzy score"]
        Display["Display Options<br/>ScrollBox + keyboard nav"]
        Select["Selection<br/>Insert extmark"]
    end

    subgraph DataSources["Data Sources"]
        FilesAPI["sdk.client.find.files()<br/>Ripgrep search"]
        AgentsSync["sync.data.agent<br/>Filtered by mode"]
        CommandsRegistry["command.slashes()<br/>+ sync.data.command"]
        McpResources["sync.data.mcp_resource<br/>Remote resources"]
    end

    subgraph FrecencySystem["Frecency Ranking"]
        Track["Track Access<br/>Path + timestamp"]
        Score["Calculate Score<br/>Frequency × recency"]
        Sort["Sort Results<br/>Score → depth → alpha"]
    end

    Trigger --> Filter
    Filter --> Search
    Search --> DataSources
    DataSources --> Rank
    Rank --> FrecencySystem
    FrecencySystem --> Display
    Display --> Select
```

### Autocomplete Options

| Trigger | Options        | Source                                        | Line Range Support |
| ------- | -------------- | --------------------------------------------- | ------------------ |
| `@`     | Files          | `sdk.client.find.files()`                     | Yes (`#123-456`)   |
| `@`     | Subagents      | `sync.data.agent` filtered by mode            | No                 |
| `@`     | MCP Resources  | `sync.data.mcp_resource`                      | No                 |
| `/`     | Slash Commands | `command.slashes()`                           | N/A                |
| `/`     | MCP Prompts    | `sync.data.command` (source: mcp)             | N/A                |
| `/`     | Skills         | `sync.data.command` (source: skill, excluded) | N/A                |

**Line Range Syntax:**

- `@file.ts#123` - Single line 123
- `@file.ts#123-456` - Lines 123 to 456
- Encoded as URL search params: `?start=123&end=456`

**Sources:** [packages/opencode/src/cli/cmd/tui/component/prompt/autocomplete.tsx:1-100](), [packages/opencode/src/cli/cmd/tui/component/prompt/autocomplete.tsx:221-296]()

### Frecency Algorithm

The frecency system prioritizes recently and frequently used files:

```mermaid
graph LR
    Access["File Access"] --> Store["Store Entry<br/>{path, timestamp}"]
    Store --> Calc["Calculate Score<br/>Σ(1/age_factor)"]
    Calc --> Decay["Decay Old Entries<br/>Remove > 30 days"]
    Decay --> Sort["Sort Results<br/>frecency × fuzzy_score"]
```

**Formula:**

```
score = Σ(1 / (1 + days_since_access))
```

Stored in: `~/.local/state/opencode/frecency.json`

**Sources:** [packages/opencode/src/cli/cmd/tui/component/prompt/frecency.tsx:1-100]()

## Command System

The command system provides a unified registry for keybinds, slash commands, and palette entries:

```mermaid
graph TB
    subgraph CommandRegistry["Command Registry"]
        Register["command.register()<br/>Per-component registration"]
        Entries["Merged Entries<br/>63+ commands"]

        subgraph CommandProps["Command Properties"]
            Title["title: string"]
            Value["value: string (ID)"]
            Keybind["keybind?: KeybindKey"]
            Slash["slash?: {name, aliases}"]
            Category["category: string"]
            Enabled["enabled?: boolean"]
            Hidden["hidden?: boolean"]
        end
    end

    subgraph Execution["Execution Paths"]
        Keyboard["Keyboard Event<br/>useKeyboard() handler"]
        Palette["Command Palette<br/>Ctrl+P / Cmd+K"]
        SlashCmd["Slash Command<br/>/command syntax"]
        API["API Trigger<br/>TuiEvent.CommandExecute"]
    end

    subgraph Examples["Example Commands"]
        SessionShare["session.share<br/>Keybind + /share"]
        MessagesUndo["session.undo<br/>/undo"]
        ModelCycle["model.cycle_recent<br/>Keybind only"]
        SessionRename["session.rename<br/>Keybind + /rename"]
    end

    Register --> Entries
    Entries --> CommandProps

    Keyboard --> Entries
    Palette --> Entries
    SlashCmd --> Entries
    API --> Entries

    Entries --> Examples
```

### Command Registration Pattern

Commands are registered using the `command.register()` API with automatic cleanup:

```typescript
command.register(() => [
  {
    title: 'Share session',
    value: 'session.share',
    keybind: 'session_share',
    category: 'Session',
    slash: { name: 'share' },
    onSelect: async (dialog) => {
      // Implementation
    },
  },
])
```

The registration function is called reactively, allowing commands to:

- Update `enabled` status based on state
- Show/hide based on context
- Modify descriptions dynamically

**Sources:** [packages/opencode/src/cli/cmd/tui/component/dialog-command.tsx:1-120](), [packages/opencode/src/cli/cmd/tui/routes/session/index.tsx:352-963]()

### Session Commands Reference

Major session commands (sampling of 63 total):

| Command            | Keybind            | Slash       | Purpose                   |
| ------------------ | ------------------ | ----------- | ------------------------- |
| `session.share`    | `session_share`    | `/share`    | Share session via URL     |
| `session.rename`   | `session_rename`   | `/rename`   | Rename session            |
| `session.timeline` | `session_timeline` | `/timeline` | Jump to message           |
| `session.fork`     | `session_fork`     | `/fork`     | Fork from message         |
| `session.compact`  | `session_compact`  | `/compact`  | Summarize session         |
| `session.undo`     | `messages_undo`    | `/undo`     | Revert last message       |
| `session.redo`     | `messages_redo`    | `/redo`     | Restore reverted messages |
| `session.export`   | `session_export`   | `/export`   | Export transcript         |
| `messages.copy`    | `messages_copy`    | -           | Copy last assistant msg   |
| `sidebar_toggle`   | `sidebar_toggle`   | -           | Toggle sidebar            |

**Sources:** [packages/opencode/src/cli/cmd/tui/routes/session/index.tsx:352-963]()

## Real-time Synchronization

The TUI maintains real-time synchronization with the backend through the `SyncProvider`:

```mermaid
sequenceDiagram
    participant TUI as TUI (Worker Thread)
    participant Sync as SyncProvider
    participant SDK as SDKProvider
    participant SSE as EventSource (SSE)
    participant Server as HTTP Server

    TUI->>Sync: Initialize
    Sync->>SDK: Get initial data
    SDK->>Server: GET /v2/* (blocking)
    Server-->>SDK: Initial state
    SDK-->>Sync: Store in sync.data
    Sync->>SSE: Open SSE connection

    loop Real-time Updates
        Server->>SSE: Event stream
        SSE->>Sync: Parse event
        Sync->>Sync: Reconcile state
        Sync->>TUI: Reactive update
        TUI->>TUI: Re-render
    end

    TUI->>SDK: User action
    SDK->>Server: POST /v2/*
    Server-->>SDK: Response
    SDK->>SSE: SSE event
    SSE->>Sync: Update
```

### Sync Data Structure

The `sync.data` object contains all synchronized state:

```typescript
{
  session: Session[],              // All sessions
  message: Record<sessionID, Message[]>,
  part: Record<messageID, Part[]>,
  permission: Record<sessionID, Permission[]>,
  question: Record<sessionID, Question[]>,
  session_status: Record<sessionID, Status>,
  session_diff: Record<sessionID, DiffFile[]>,
  todo: Record<sessionID, Todo[]>,

  provider: Provider[],            // Available providers
  provider_default: Record<providerID, modelID>,
  agent: Agent[],                  // Available agents
  command: Command[],              // Server commands

  mcp: Record<name, MCPStatus>,    // MCP server status
  mcp_resource: Record<uri, Resource>,
  lsp: LSPServer[],                // Active LSP servers

  path: { directory: string, worktree: string },
  config: Config.Info,             // Full configuration
}
```

### Reconciliation Strategy

The sync provider uses a reconciliation strategy to handle concurrent updates:

| Update Type  | Strategy            | Reason                    |
| ------------ | ------------------- | ------------------------- |
| Session list | Replace             | Small, infrequent changes |
| Messages     | Merge by ID         | New messages append       |
| Parts        | Replace per message | Parts are immutable       |
| Permissions  | Replace per session | Low volume                |
| Providers    | Replace             | Configuration changes     |
| MCP status   | Replace             | Status changes            |

**Sources:** [packages/opencode/src/cli/cmd/tui/context/sync.tsx:1-200]()

## Rendering and Performance

The TUI uses `@opentui/solid` for efficient terminal rendering:

### Rendering Pipeline

```mermaid
graph LR
    Reactive["Reactive Update<br/>SolidJS signal change"]
    Virtual["Virtual DOM<br/>Component tree diff"]
    Layout["Layout Engine<br/>Yoga flexbox"]
    Paint["Paint Buffer<br/>Cell-based grid"]
    Terminal["Terminal Output<br/>ANSI escape codes"]

    Reactive --> Virtual
    Virtual --> Layout
    Layout --> Paint
    Paint --> Terminal
```

### Performance Optimizations

| Technique           | Implementation               | Benefit                         |
| ------------------- | ---------------------------- | ------------------------------- |
| Virtual Scrolling   | `ScrollBoxRenderable`        | Render only visible messages    |
| Memoization         | `createMemo()` everywhere    | Avoid unnecessary recalculation |
| Debounced Updates   | Scroll position tracking     | Reduce render frequency         |
| Lazy Loading        | `createResource()` for files | Non-blocking autocomplete       |
| Sticky Scroll       | `stickyScroll="bottom"`      | Auto-scroll to new messages     |
| Custom Scroll Accel | `MacOSScrollAccel`           | Smooth scrolling                |

**Configuration:**

- Target FPS: 60
- Gather stats: false (production)
- Auto-focus: false (manual control)
- Kitty keyboard: enabled

**Sources:** [packages/opencode/src/cli/cmd/tui/app.tsx:183-199]()

### Scroll Behavior

The session view implements intelligent scrolling:

**Auto-scroll to bottom:**

- New messages arrive
- Session changes
- User submits prompt

**Manual scroll:**

- Page up/down: `scroll.height / 2`
- Half page: `scroll.height / 4`
- Next/prev message: Jump to nearest message boundary
- First/last: `scrollTo(0)` / `scrollTo(scrollHeight)`

**Message boundary detection:**

- Filter for messages with non-synthetic, non-ignored text parts
- Sort by Y position
- Find nearest above/below current scroll position

**Sources:** [packages/opencode/src/cli/cmd/tui/routes/session/index.tsx:263-307]()

## Component Lifecycle

Key lifecycle management patterns used throughout the TUI:

```mermaid
graph TB
    Mount["onMount()<br/>Setup"]
    Cleanup["onCleanup()<br/>Teardown"]
    Effect["createEffect()<br/>Reactive"]
    Resource["createResource()<br/>Async"]

    subgraph Patterns["Common Patterns"]
        EventSub["Event Subscription<br/>sdk.event.on()"]
        Timer["Timers<br/>setTimeout/setInterval"]
        RefAssign["Ref Assignment<br/>ref={(r) => ...}"]
        Signal["Signal Tracking<br/>Reactive dependencies"]
    end

    Mount --> Patterns
    Patterns --> Cleanup
    Effect --> Signal
    Resource --> Signal
```

**Example pattern:**

```typescript
onMount(() => {
  const unsubscribe = sdk.event.on('message.created', handler)
  const timer = setInterval(tick, 1000)

  onCleanup(() => {
    unsubscribe()
    clearInterval(timer)
  })
})
```

**Sources:** [packages/opencode/src/cli/cmd/tui/app.tsx:287-308]()

## Error Handling

The TUI includes comprehensive error handling:

```mermaid
graph TB
    Error["Error Occurs"]
    Boundary["ErrorBoundary"]
    Component["ErrorComponent"]

    subgraph Recovery["Recovery Options"]
        Copy["Copy Error<br/>Issue URL + stack"]
        Exit["Exit<br/>Cleanup + restore"]
        Reset["Reset<br/>Attempt recovery"]
    end

    Error --> Boundary
    Boundary --> Component
    Component --> Recovery
```

**Error component features:**

- Pre-filled GitHub issue URL with stack trace
- Safe fallback colors (no theme context)
- Terminal title reset
- Input buffer flush (Windows)
- Clipboard integration for error reporting

**Sources:** [packages/opencode/src/cli/cmd/tui/app.tsx:764-826]()
