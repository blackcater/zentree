# pi-coding-agent: Coding Agent CLI

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [AGENTS.md](AGENTS.md)
- [README.md](README.md)
- [packages/agent/CHANGELOG.md](packages/agent/CHANGELOG.md)
- [packages/ai/CHANGELOG.md](packages/ai/CHANGELOG.md)
- [packages/coding-agent/CHANGELOG.md](packages/coding-agent/CHANGELOG.md)
- [packages/coding-agent/README.md](packages/coding-agent/README.md)
- [packages/coding-agent/src/cli/args.ts](packages/coding-agent/src/cli/args.ts)
- [packages/coding-agent/src/main.ts](packages/coding-agent/src/main.ts)
- [packages/mom/CHANGELOG.md](packages/mom/CHANGELOG.md)
- [packages/tui/CHANGELOG.md](packages/tui/CHANGELOG.md)
- [packages/web-ui/CHANGELOG.md](packages/web-ui/CHANGELOG.md)

</details>

The `@mariozechner/pi-coding-agent` package provides an interactive terminal-based coding assistant with tool execution, session persistence, and extensibility. This page documents the overall architecture, core abstractions, and how the system components interact. It serves as the architectural overview for the coding-agent package.

For detailed information about specific subsystems, see:

- Getting started and CLI usage: [4.1](#4.1)
- Agent lifecycle and event system: [4.2](#4.2)
- Session persistence and branching: [4.3](#4.3)
- Extension development: [4.4](#4.4)
- Tool execution: [4.5](#4.5)
- Configuration management: [4.6](#4.6)
- Model selection and thinking levels: [4.7](#4.7)
- Skills and prompt templates: [4.8](#4.8)
- Theme customization: [4.9](#4.9)
- Interactive TUI mode: [4.10](#4.10)
- Print and RPC modes: [4.11](#4.11)
- Package installation: [4.12](#4.12)

---

## Architecture Overview

The coding agent is built around `AgentSession`, which orchestrates the agent lifecycle, and supports three operational modes: interactive (full TUI), print (single-shot CLI), and RPC (JSON protocol over stdio). All modes share the same core agent logic from `@mariozechner/pi-agent-core` and LLM abstraction from `@mariozechner/pi-ai`.

### Main Entry Flow

```mermaid
flowchart TD
    CLI["main.ts<br/>CLI Entry Point"]
    ParseArgs["parseArgs()<br/>cli/args.ts"]
    PackageCmd["handlePackageCommand()<br/>install/remove/update/list"]
    Auth["AuthStorage.create()<br/>core/auth-storage.js"]
    Settings["SettingsManager.create()<br/>core/settings-manager.js"]
    Registry["ModelRegistry<br/>core/model-registry.js"]
    Resources["DefaultResourceLoader<br/>core/resource-loader.js"]

    CreateSession["createAgentSession()<br/>core/sdk.js"]
    SessionMgr["SessionManager<br/>core/session-manager.js"]

    ModeRouter{"Mode Selection"}
    Interactive["InteractiveMode<br/>modes/interactive/index.ts"]
    Print["runPrintMode()<br/>modes/print.ts"]
    RPC["runRpcMode()<br/>modes/rpc/index.ts"]

    CLI --> ParseArgs
    ParseArgs --> PackageCmd
    ParseArgs --> Auth
    Auth --> Settings
    Settings --> Registry
    Registry --> Resources

    Resources --> CreateSession
    CreateSession --> SessionMgr
    SessionMgr --> ModeRouter

    ModeRouter -->|"--print"| Print
    ModeRouter -->|"--mode rpc"| RPC
    ModeRouter -->|"default"| Interactive
```

**Sources:** [packages/coding-agent/src/main.ts:1-750]()

---

## Core Abstractions

### AgentSession and Supporting Systems

The `AgentSession` class (from `@mariozechner/pi-agent-core`) is the central orchestrator. The coding-agent package wraps it with supporting infrastructure:

```mermaid
graph TB
    subgraph "Entry Point"
        CreateSession["createAgentSession()<br/>Factory function<br/>core/sdk.js"]
    end

    subgraph "Core Session State"
        AgentSession["AgentSession<br/>Agent lifecycle manager<br/>@mariozechner/pi-agent-core"]
        SessionManager["SessionManager<br/>JSONL persistence<br/>core/session-manager.js"]
        SettingsManager["SettingsManager<br/>Global & project config<br/>core/settings-manager.js"]
    end

    subgraph "Model & Auth"
        ModelRegistry["ModelRegistry<br/>Model resolution<br/>core/model-registry.js"]
        AuthStorage["AuthStorage<br/>Credential management<br/>core/auth-storage.js"]
    end

    subgraph "Extensions & Resources"
        ResourceLoader["DefaultResourceLoader<br/>Resource discovery<br/>core/resource-loader.js"]
        PackageManager["DefaultPackageManager<br/>npm/git packages<br/>core/package-manager.js"]
        ExtensionRunner["ExtensionRunner<br/>Extension execution<br/>core/extensions/runner.ts"]
        ToolRegistry["ToolRegistry<br/>Tool collection<br/>core/tools/registry.ts"]
    end

    subgraph "LLM Integration"
        AILayer["@mariozechner/pi-ai<br/>LLM providers"]
    end

    CreateSession --> AgentSession
    CreateSession --> SessionManager
    CreateSession --> SettingsManager
    CreateSession --> ModelRegistry

    AgentSession --> ExtensionRunner
    AgentSession --> ToolRegistry
    AgentSession --> AILayer

    ModelRegistry --> AuthStorage
    ModelRegistry --> AILayer

    ResourceLoader --> PackageManager
    ResourceLoader --> ExtensionRunner
    ResourceLoader --> ToolRegistry

    SessionManager -.persists to.-> "~/.pi/agent/sessions/<br/>JSONL files"
    SettingsManager -.reads/writes.-> "settings.json<br/>(global & project)"
    AuthStorage -.reads/writes.-> "auth.json"
```

**Sources:** [packages/coding-agent/src/core/sdk.js:1-300](), [packages/coding-agent/src/main.ts:500-600]()

---

### Resource Discovery Pipeline

The `DefaultResourceLoader` discovers extensions, skills, prompt templates, and themes from multiple sources:

```mermaid
flowchart LR
    subgraph "Sources"
        GlobalDir["~/.pi/agent/<br/>extensions/<br/>skills/<br/>prompts/<br/>themes/"]
        ProjectDir[".pi/<br/>extensions/<br/>skills/<br/>prompts/<br/>themes/"]
        SkillsDir[".agents/skills/<br/>Auto-discovery<br/>(cwd up to git root)"]
        Packages["Installed Packages<br/>npm, git, local"]
        CLIFlags["CLI flags<br/>-e, --skill, etc."]
    end

    subgraph "Discovery"
        Collector["collectResources()<br/>core/resource-loader.js"]
        Patterns["Pattern Filtering<br/>!exclude, +include, -exclude"]
    end

    subgraph "Loaders"
        LoadExt["loadExtensions()<br/>jiti TypeScript exec"]
        LoadSkills["loadSkills()<br/>SKILL.md parser"]
        LoadPrompts["loadPromptTemplates()<br/>.md files"]
        LoadThemes["loadThemes()<br/>theme.json"]
    end

    GlobalDir --> Collector
    ProjectDir --> Collector
    SkillsDir --> Collector
    Packages --> Collector
    CLIFlags --> Collector

    Collector --> Patterns
    Patterns --> LoadExt
    Patterns --> LoadSkills
    Patterns --> LoadPrompts
    Patterns --> LoadThemes
```

**Project-first precedence:** When resources have conflicting names, project-local (`.pi/`) resources override global (`~/.pi/agent/`) resources.

**Sources:** [packages/coding-agent/src/core/resource-loader.js:1-500](), [packages/coding-agent/src/core/package-manager.js:1-800]()

---

## Operational Modes

The coding-agent supports three modes, all using the same `AgentSession` core but with different user interfaces:

### Mode Architecture

```mermaid
graph TB
    subgraph "main.ts Router"
        Router["Mode Selection<br/>Based on CLI args"]
    end

    subgraph "Interactive Mode"
        InteractiveMode["InteractiveMode class<br/>modes/interactive/index.ts"]
        TUI["TUI instance<br/>@mariozechner/pi-tui"]
        Editor["Editor component"]
        MessageQueue["Message Queue<br/>Steering & Follow-up"]
        Commands["Command System<br/>/model, /tree, etc."]
    end

    subgraph "Print Mode"
        PrintMode["runPrintMode()<br/>modes/print.ts"]
        StdoutWriter["stdout writer<br/>Simple text output"]
    end

    subgraph "RPC Mode"
        RPCMode["runRpcMode()<br/>modes/rpc/index.ts"]
        JSONProtocol["LF-delimited JSONL<br/>stdin/stdout"]
        RPCCommands["RPC Command Handlers<br/>prompt, abort, etc."]
    end

    subgraph "Shared Core"
        AgentSessionCore["AgentSession<br/>Event-driven agent loop"]
        SessionMgrCore["SessionManager<br/>JSONL persistence"]
    end

    Router -->|"default"| InteractiveMode
    Router -->|"--print"| PrintMode
    Router -->|"--mode rpc"| RPCMode

    InteractiveMode --> TUI
    InteractiveMode --> Editor
    InteractiveMode --> MessageQueue
    InteractiveMode --> Commands

    PrintMode --> StdoutWriter

    RPCMode --> JSONProtocol
    RPCMode --> RPCCommands

    InteractiveMode --> AgentSessionCore
    PrintMode --> AgentSessionCore
    RPCMode --> AgentSessionCore

    AgentSessionCore --> SessionMgrCore
```

| Mode            | Interface                                | Session Persistence         | Use Case                          |
| --------------- | ---------------------------------------- | --------------------------- | --------------------------------- |
| **Interactive** | Full TUI with editor, commands, overlays | Yes (auto-save)             | Primary terminal workflow         |
| **Print**       | Single-shot stdout                       | Yes (unless `--no-session`) | Shell scripts, pipelines          |
| **RPC**         | JSON events over stdio                   | Yes                         | Integration with non-Node.js apps |

**Sources:** [packages/coding-agent/src/modes/interactive/index.ts:1-1500](), [packages/coding-agent/src/modes/print.ts:1-200](), [packages/coding-agent/src/modes/rpc/index.ts:1-400]()

---

## Extension Integration Points

Extensions can hook into the system at multiple levels:

```mermaid
graph LR
    subgraph "Extension Entry"
        ExtFile["extension.ts<br/>export default fn(pi)"]
        ExtAPI["ExtensionAPI interface<br/>core/extensions/api.ts"]
    end

    subgraph "Registration APIs"
        RegTool["pi.registerTool()"]
        RegCommand["pi.registerCommand()"]
        RegEvent["pi.on(event, handler)"]
        RegProvider["pi.registerProvider()"]
        RegFlag["pi.registerFlag()"]
    end

    subgraph "Runtime Integration"
        ToolExec["Tool Execution<br/>AgentSession.prompt()"]
        CmdExec["Command Execution<br/>/custom-command"]
        EventEmit["Event Emission<br/>session_start, tool_call, etc."]
        UIContext["ExtensionUIContext<br/>Overlays, widgets, editor"]
    end

    ExtFile --> ExtAPI
    ExtAPI --> RegTool
    ExtAPI --> RegCommand
    ExtAPI --> RegEvent
    ExtAPI --> RegProvider
    ExtAPI --> RegFlag

    RegTool --> ToolExec
    RegCommand --> CmdExec
    RegEvent --> EventEmit
    RegTool --> EventEmit

    ExtAPI -.provides.-> UIContext
```

**Extension contexts:** Extensions receive different contexts based on the operational mode:

- **Interactive:** `ExtensionUIContext` with full TUI capabilities (overlays, custom editors, widgets)
- **RPC:** `ExtensionUIContext` with JSON request/response protocol
- **Print:** `ExtensionUIContext` with no-op methods (extensions cannot show UI)

**Sources:** [packages/coding-agent/src/core/extensions/api.ts:1-300](), [packages/coding-agent/src/core/extensions/runner.ts:1-500]()

---

## Tool Execution Flow

Tools are executed by the agent via the `AgentSession` event loop. Built-in tools are registered in `core/tools/index.ts`, and extensions can register custom tools via `pi.registerTool()`.

```mermaid
sequenceDiagram
    participant LLM as "LLM (via pi-ai)"
    participant Agent as "AgentSession"
    participant Ext as "ExtensionRunner"
    participant Tool as "Tool Implementation"
    participant Session as "SessionManager"

    LLM->>Agent: tool_call event
    Agent->>Ext: beforeToolCall hook
    Note over Ext: Extensions can block<br/>or provide synthetic results
    Ext-->>Agent: Allow/block/modify

    Agent->>Tool: execute(params, context)
    Tool-->>Agent: ToolResult

    Agent->>Ext: afterToolCall hook
    Ext-->>Agent: Modified result

    Agent->>Session: appendMessage(toolResult)
    Session->>Session: Write to log.jsonl

    Agent->>LLM: Continue with tool results
```

**Built-in tools:** Defined in [packages/coding-agent/src/core/tools/index.ts:1-50]()

- `read` - Read file contents
- `write` - Write/overwrite files
- `edit` - Find/replace edits
- `bash` - Execute shell commands
- `grep`, `find`, `ls` - Read-only search tools (off by default)

**Tool registry:** `ToolRegistry` class in [packages/coding-agent/src/core/tools/registry.ts:1-200]() maintains the collection of available tools and handles tool resolution.

**Sources:** [packages/coding-agent/src/core/tools/index.ts:1-100](), [packages/coding-agent/src/core/sdk.js:200-400]()

---

## Session Persistence

Sessions are stored as JSONL files with a tree structure. Each entry has an `id` and `parentId`, enabling in-place branching without creating new files.

### Session File Structure

```mermaid
graph TB
    subgraph "Session File: session.jsonl"
        Header["SessionHeader<br/>{id, timestamp, cwd}"]
        EntryA["SessionEntry A<br/>parentId: null"]
        EntryB["SessionEntry B<br/>parentId: A"]
        EntryC["SessionEntry C<br/>parentId: B"]
        EntryD["SessionEntry D<br/>parentId: B<br/>(branch)"]
    end

    subgraph "In-Memory State"
        Context["buildSessionContext()<br/>Walk tree from leafId"]
        LeafId["leafId pointer<br/>Current branch tip"]
    end

    Header --> EntryA
    EntryA --> EntryB
    EntryB --> EntryC
    EntryB --> EntryD

    LeafId -.points to.-> EntryC
    Context -.reads.-> EntryC
    Context -.walks to.-> EntryB
    Context -.walks to.-> EntryA
```

**Operations:**

- `SessionManager.appendMessage()` - Adds new entries and advances `leafId`
- `SessionManager.branch(entryId)` - Repositions `leafId` to an earlier entry
- `SessionManager.buildSessionContext()` - Walks from `leafId` to root to extract active conversation path

**Compaction:** When context windows are exceeded, `SessionManager.appendCompaction()` records a summary entry. The full history remains in the file.

**Sources:** [packages/coding-agent/src/core/session-manager.js:1-1000]()

---

## Settings and Configuration

Settings are managed by `SettingsManager` with two scopes:

| Scope       | Path                        | Purpose               |
| ----------- | --------------------------- | --------------------- |
| **Global**  | `~/.pi/agent/settings.json` | User-wide defaults    |
| **Project** | `.pi/settings.json`         | Per-project overrides |

**Merge semantics:** Project settings override global settings. `SettingsManager.getSettings()` returns the merged view.

**Persistence:** Settings are written asynchronously with file locking to prevent corruption from concurrent processes. Use `SettingsManager.flush()` to wait for pending writes.

**Common settings:**

- `defaultModel` - Model reference (e.g., `"anthropic/claude-sonnet-4"`)
- `thinkingLevel` - Default thinking level (`"off"` | `"minimal"` | `"low"` | `"medium"` | `"high"` | `"xhigh"`)
- `packages` - Array of package sources for resource discovery
- `autoCompactionEnabled` - Enable/disable automatic compaction
- `steeringMode`, `followUpMode` - Message queue delivery modes

**Sources:** [packages/coding-agent/src/core/settings-manager.js:1-800]()

---

## Model Resolution

The `ModelRegistry` class resolves model references to concrete model definitions:

```mermaid
flowchart LR
    subgraph "Input Formats"
        Pattern["Model Pattern<br/>anthropic/sonnet<br/>*haiku*<br/>sonnet:high"]
    end

    subgraph "Resolution"
        Registry["ModelRegistry<br/>core/model-registry.js"]
        Catalog["models.generated.ts<br/>~100+ models<br/>@mariozechner/pi-ai"]
        Custom["models.json<br/>Custom definitions<br/>~/.pi/agent/models.json"]
    end

    subgraph "Output"
        Model["Model Object<br/>{id, provider, api, contextWindow, ...}"]
        ScopedModel["ScopedModel<br/>{model, thinking}"]
    end

    Pattern --> Registry
    Registry --> Catalog
    Registry --> Custom
    Custom -.overrides.-> Catalog

    Registry --> Model
    Registry --> ScopedModel
```

**Model resolution logic:** Implemented in [packages/coding-agent/src/core/model-resolver.ts:1-400]()

- Pattern matching: `resolveModelPattern()` supports fuzzy matching, glob patterns, and provider prefixes
- Thinking suffixes: `sonnet:high` resolves to model with thinking level `"high"`
- Scoped models: Used for Ctrl+P cycling with fixed thinking levels per model

**Sources:** [packages/coding-agent/src/core/model-registry.js:1-300](), [packages/coding-agent/src/core/model-resolver.ts:1-400]()

---

## Package Management

The `DefaultPackageManager` handles installation and discovery of npm packages, git repositories, and local paths:

```mermaid
graph TB
    subgraph "Package Sources"
        NPM["npm Package<br/>npm:@foo/bar[@version]"]
        Git["Git Repository<br/>git:github.com/user/repo[@ref]"]
        Local["Local Path<br/>./relative or /absolute"]
    end

    subgraph "Installation"
        PackageMgr["DefaultPackageManager<br/>core/package-manager.js"]
        GlobalInstall["~/.pi/agent/git/<br/>~/.pi/agent/npm/"]
        ProjectInstall[".pi/git/<br/>.pi/npm/"]
    end

    subgraph "Discovery"
        Manifest["package.json pi.* manifest<br/>or conventional dirs"]
        Resources["Extensions, Skills,<br/>Prompts, Themes"]
    end

    NPM --> PackageMgr
    Git --> PackageMgr
    Local --> PackageMgr

    PackageMgr -->|"install()"| GlobalInstall
    PackageMgr -->|"install({local:true})"| ProjectInstall

    GlobalInstall --> Manifest
    ProjectInstall --> Manifest
    Manifest --> Resources
```

**Commands:**

- `pi install npm:@foo/bar` - Install globally
- `pi install npm:@foo/bar -l` - Install project-locally
- `pi remove npm:@foo/bar` - Remove and update settings
- `pi update` - Update all unpinned packages
- `pi list` - List installed packages

**Manifest format:** Packages declare resources in `package.json`:

```json
{
  "pi": {
    "extensions": ["./extensions"],
    "skills": ["./skills"],
    "prompts": ["./prompts"],
    "themes": ["./themes"]
  }
}
```

**Sources:** [packages/coding-agent/src/core/package-manager.js:1-800](), [packages/coding-agent/src/main.ts:150-310]()

---

## CLI Entry Points

The main entry point handles three distinct flows:

| Flow                 | Trigger                          | Handler                                         |
| -------------------- | -------------------------------- | ----------------------------------------------- |
| **Package commands** | `pi install/remove/update/list`  | `handlePackageCommand()` in [main.ts:196-309]() |
| **Config command**   | `pi config`                      | `selectConfig()` in [cli/config-selector.ts]()  |
| **Agent modes**      | Default, `--print`, `--mode rpc` | Mode router in [main.ts:440-750]()              |

**Argument parsing:** `parseArgs()` in [packages/coding-agent/src/cli/args.ts:55-177]() handles CLI flags. Extensions can register custom flags via `ExtensionAPI.registerFlag()`, which are parsed during a second pass after extensions load.

**Sources:** [packages/coding-agent/src/main.ts:1-750](), [packages/coding-agent/src/cli/args.ts:1-318]()
