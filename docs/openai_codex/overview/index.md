# Overview

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [README.md](README.md)
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
- [codex-rs/tui/src/cli.rs](codex-rs/tui/src/cli.rs)
- [codex-rs/tui/src/lib.rs](codex-rs/tui/src/lib.rs)

</details>

Codex CLI is an AI coding agent from OpenAI that runs locally on your computer. It provides an interactive terminal interface, non-interactive automation modes, and IDE integration capabilities for executing coding tasks with AI assistance. The system is implemented in Rust as a Cargo workspace and supports multiple execution modes, configurable sandboxing, tool extensibility via the Model Context Protocol (MCP), and multi-agent workflows.

For detailed information about installation procedures, see [Installation and Setup](#1.1). For configuration options, see [Configuration System](#2.2). For IDE integration details, see [App Server and IDE Integration](#4.5).

## Project Purpose and Architecture

Codex is designed as a zero-dependency native executable that coordinates AI model interactions, executes tools in sandboxed environments, and manages conversation state across multiple sessions. The codebase is organized as a Rust workspace with clear separation between core business logic, user interfaces, and integration points.

```mermaid
graph TB
    subgraph "Entry Points"
        codex_bin["codex binary<br/>(cli/src/main.rs)"]
        tui_entry["Interactive TUI"]
        exec_entry["Non-Interactive Exec"]
        app_server_entry["App Server (IDE)"]
        mcp_server_entry["MCP Server"]
    end

    subgraph "Core Engine (codex-core)"
        ThreadManager["ThreadManager<br/>(thread_manager.rs)"]
        CodexThread["CodexThread<br/>(codex_thread.rs)"]
        Session["Session (internal)"]
        ContextManager["ContextManager<br/>(context_manager.rs)"]
        ModelClient["ModelClient<br/>(client.rs)"]
    end

    subgraph "Tool Execution"
        ToolRouter["ToolRouter<br/>(tools/router.rs)"]
        UnifiedExec["UnifiedExecProcessManager<br/>(unified_exec.rs)"]
        McpConnectionManager["McpConnectionManager<br/>(mcp_connection_manager.rs)"]
        Sandbox["Platform Sandboxes<br/>(sandboxing/)"]
    end

    subgraph "Configuration & State"
        ConfigBuilder["ConfigBuilder<br/>(config/mod.rs)"]
        RolloutRecorder["RolloutRecorder<br/>(rollout/mod.rs)"]
        StateDb["SQLite StateDb<br/>(state_db/)"]
    end

    codex_bin --> tui_entry
    codex_bin --> exec_entry
    codex_bin --> app_server_entry
    codex_bin --> mcp_server_entry

    tui_entry --> ThreadManager
    exec_entry --> ThreadManager
    app_server_entry --> ThreadManager

    ThreadManager --> CodexThread
    CodexThread --> Session
    Session --> ContextManager
    Session --> ModelClient
    Session --> ToolRouter
    Session --> ConfigBuilder

    ToolRouter --> UnifiedExec
    ToolRouter --> McpConnectionManager
    ToolRouter --> Sandbox

    CodexThread --> RolloutRecorder
    ThreadManager --> StateDb
```

**Sources:** [codex-rs/cli/src/main.rs:1-150](), [codex-rs/core/src/lib.rs:1-178](), [codex-rs/core/src/thread_manager.rs](), [README.md:1-60]()

## Execution Modes

Codex supports four primary execution modes, each serving different use cases. All modes converge on the same core `ThreadManager` infrastructure but differ in how they present events and handle user interaction.

### Execution Mode Comparison

| Mode           | Entry Point        | Use Case                | Session Persistence        | User Interaction       |
| -------------- | ------------------ | ----------------------- | -------------------------- | ---------------------- |
| **TUI**        | `codex` (default)  | Interactive development | Yes (rollout files)        | Full interactive UI    |
| **Exec**       | `codex exec`       | Automation/CI           | Yes (unless `--ephemeral`) | None (non-interactive) |
| **App Server** | `codex app-server` | IDE integration         | Yes                        | JSON-RPC protocol      |
| **MCP Server** | `codex mcp-server` | Tool delegation         | Yes                        | MCP protocol (stdio)   |

```mermaid
graph LR
    subgraph "Installation"
        npm["npm install -g<br/>@openai/codex"]
        brew["brew install<br/>--cask codex"]
        binary["GitHub Releases<br/>Platform Binaries"]
    end

    subgraph "Commands"
        interactive["codex<br/>(TUI)"]
        exec["codex exec 'task'<br/>(Non-interactive)"]
        app_server["codex app-server<br/>(JSON-RPC)"]
        mcp_server["codex mcp-server<br/>(MCP stdio)"]
        review["codex review<br/>(Code Review)"]
    end

    subgraph "Core Runtime"
        thread_mgr["ThreadManager::new()"]
        config_load["ConfigBuilder::build()"]
        auth_mgr["AuthManager::shared()"]
    end

    npm --> interactive
    brew --> interactive
    binary --> interactive

    interactive --> config_load
    exec --> config_load
    app_server --> config_load
    mcp_server --> config_load
    review --> config_load

    config_load --> auth_mgr
    auth_mgr --> thread_mgr
```

**Sources:** [codex-rs/cli/src/main.rs:83-149](), [codex-rs/exec/src/lib.rs:161-466](), [codex-rs/tui/src/lib.rs:230-530](), [README.md:13-46]()

## Core Crate Organization

The Codex workspace is organized into focused crates with clear responsibilities. The core business logic resides in `codex-core`, while UI implementations and integration points are separate crates.

### Primary Crates

| Crate                       | Path                   | Purpose                                                                |
| --------------------------- | ---------------------- | ---------------------------------------------------------------------- |
| `codex-core`                | `core/`                | Core agent logic, session management, model client, tool orchestration |
| `codex-tui`                 | `tui/`                 | Interactive terminal UI built with Ratatui                             |
| `codex-exec`                | `exec/`                | Non-interactive headless CLI with JSONL output mode                    |
| `codex-cli`                 | `cli/`                 | Multitool dispatcher, subcommand routing, feature toggles              |
| `codex-app-server`          | `app-server/`          | JSON-RPC server for VS Code, Cursor, and other IDE clients             |
| `codex-app-server-protocol` | `app-server-protocol/` | Protocol definitions for app server communication                      |
| `codex-mcp-server`          | `mcp-server/`          | MCP server implementation exposing Codex as tools                      |
| `codex-protocol`            | `protocol/`            | Shared protocol types for events, config, tool specs                   |
| `codex-config`              | `config/`              | Configuration parsing, validation, layer merging                       |

```mermaid
graph TB
    subgraph "User-Facing Binaries"
        cli_bin["codex<br/>(cli/src/main.rs)"]
    end

    subgraph "Interface Crates"
        tui["codex-tui<br/>(tui/src/lib.rs)"]
        exec["codex-exec<br/>(exec/src/lib.rs)"]
        app_server["codex-app-server<br/>(app-server/src/lib.rs)"]
        mcp_server["codex-mcp-server<br/>(mcp-server/src/lib.rs)"]
    end

    subgraph "Core Library"
        core["codex-core<br/>(core/src/lib.rs)"]
    end

    subgraph "Shared Infrastructure"
        protocol["codex-protocol<br/>(protocol types)"]
        config["codex-config<br/>(config parsing)"]
        app_server_protocol["codex-app-server-protocol<br/>(JSON-RPC types)"]
    end

    cli_bin --> tui
    cli_bin --> exec
    cli_bin --> app_server
    cli_bin --> mcp_server

    tui --> core
    exec --> core
    app_server --> core
    mcp_server --> core

    core --> protocol
    core --> config
    tui --> protocol
    exec --> protocol
    app_server --> protocol
    app_server --> app_server_protocol
```

**Sources:** [codex-rs/Cargo.toml:1-395](), [codex-rs/core/Cargo.toml:1-183](), [codex-rs/tui/Cargo.toml:1-145](), [codex-rs/cli/Cargo.toml:1-69]()

## Core Architecture Components

The core engine implements a layered architecture where the `ThreadManager` manages thread lifecycles, `CodexThread` coordinates session execution, and internal `Session` structs handle turn-by-turn model interactions.

### Thread and Session Lifecycle

```mermaid
sequenceDiagram
    participant UI as "UI Layer<br/>(TUI/Exec/AppServer)"
    participant TM as "ThreadManager<br/>(thread_manager.rs)"
    participant CT as "CodexThread<br/>(codex_thread.rs)"
    participant Sess as "Session<br/>(internal)"
    participant CM as "ContextManager<br/>(context_manager.rs)"
    participant MC as "ModelClient<br/>(client.rs)"

    UI->>TM: NewThread{config, cwd}
    TM->>CT: spawn()
    CT->>Sess: new()
    Sess->>CM: new()
    Sess->>MC: new(session_id)

    UI->>CT: submit(UserInput)
    CT->>Sess: process_user_turn()
    Sess->>CM: add_user_message()
    Sess->>CM: build_prompt()
    CM-->>Sess: Prompt with cache

    Sess->>MC: stream_responses(prompt)
    loop SSE Events
        MC-->>Sess: ResponseEvent
        Sess->>CM: record_event()
        Sess->>CT: emit(EventMsg)
        CT-->>UI: Event
    end

    Sess->>Sess: execute_tools()
    Sess->>CM: update_token_usage()
    Sess->>CT: TurnComplete
    CT-->>UI: TurnComplete
```

**Sources:** [codex-rs/core/src/thread_manager.rs](), [codex-rs/core/src/codex_thread.rs](), [codex-rs/core/src/client.rs:1-200](), [codex-rs/core/src/context_manager.rs]()

### Key Component Responsibilities

| Component            | File                          | Primary Responsibilities                                               |
| -------------------- | ----------------------------- | ---------------------------------------------------------------------- |
| `ThreadManager`      | `core/src/thread_manager.rs`  | Thread spawning/resuming, state database interaction, thread switching |
| `CodexThread`        | `core/src/codex_thread.rs`    | Submission queue, event emission, task management, rollout recording   |
| `Session` (internal) | `core/src/codex.rs`           | Turn orchestration, prompt building, model streaming, tool routing     |
| `ContextManager`     | `core/src/context_manager.rs` | Message history, token tracking, compaction triggers, cached prefixes  |
| `ModelClient`        | `core/src/client.rs`          | HTTP/WebSocket transport, SSE parsing, retry logic, auth headers       |
| `ToolRouter`         | `core/src/tools/`             | Tool registration, approval checks, sandbox selection, execution       |
| `RolloutRecorder`    | `core/src/rollout/mod.rs`     | Session persistence, event filtering, thread indexing                  |

**Sources:** [codex-rs/core/src/lib.rs:1-178](), [codex-rs/core/src/codex.rs](), [codex-rs/core/src/client.rs]()

## Configuration System

Configuration is assembled from multiple layers with CLI arguments taking highest priority, followed by environment variables, project config, global config, and defaults. The `ConfigBuilder` merges these layers and validates against `requirements.toml` constraints.

```mermaid
graph TB
    subgraph "Configuration Sources (Priority Order)"
        cli["CLI Arguments<br/>-c key=value, --enable/--disable"]
        features["Feature Toggles<br/>(features.*)"]
        profile["Profile Selection<br/>--profile name"]
        env["Environment Variables<br/>(CODEX_*, OPENAI_*)"]
        project[".codex/config.toml<br/>(Project)"]
        global["~/.codex/config.toml<br/>(Global)"]
        defaults["Built-in Defaults<br/>(hardcoded)"]
    end

    subgraph "Configuration Builder"
        builder["ConfigBuilder::build()<br/>(config/mod.rs)"]
        validator["Validation & Constraints<br/>(requirements.toml)"]
    end

    subgraph "Final Configuration"
        config["Config struct<br/>(config/types.rs)"]
        model_provider["model_provider<br/>(ModelProviderInfo)"]
        permissions["permissions<br/>(sandbox, approval)"]
        mcp_servers["mcp_servers<br/>(server configs)"]
    end

    cli --> builder
    features --> builder
    profile --> builder
    env --> builder
    project --> builder
    global --> builder
    defaults --> builder

    builder --> validator
    validator --> config

    config --> model_provider
    config --> permissions
    config --> mcp_servers
```

**Sources:** [codex-rs/core/src/config/mod.rs](), [codex-rs/tui/src/lib.rs:271-310](), [codex-rs/exec/src/lib.rs:237-367]()

## Tool Ecosystem

Codex provides built-in tools for shell execution, file patching, and web search, while supporting external tools via MCP server integration. All tool calls flow through the `ToolRouter` which enforces layered approval policies and sandbox selection.

### Tool Architecture

| Tool Type   | Implementation                    | Examples                                                     |
| ----------- | --------------------------------- | ------------------------------------------------------------ |
| Built-in    | Compiled into `codex-core`        | `shell_command`, `exec_command`, `apply_patch`, `web_search` |
| MCP (stdio) | External process via stdin/stdout | User-defined MCP servers                                     |
| MCP (HTTP)  | Remote HTTP endpoints             | Cloud-based tool servers                                     |
| Code Mode   | JavaScript REPL with yield/resume | Long-running scripts                                         |

```mermaid
graph TB
    subgraph "Tool Sources"
        builtin["Built-in Tools<br/>(tools/)"]
        mcp_stdio["MCP stdio Servers<br/>(command-based)"]
        mcp_http["MCP HTTP Servers<br/>(remote)"]
    end

    subgraph "Tool Registration"
        registry["ToolRegistryBuilder<br/>(tools/registry.rs)"]
        router["ToolRouter<br/>(tools/router.rs)"]
    end

    subgraph "Approval & Execution"
        orchestrator["ToolOrchestrator<br/>(tools/orchestrator.rs)"]
        approval["Approval Pipeline<br/>(policy + execpolicy)"]
        sandbox["Sandbox Selection<br/>(platform-specific)"]
        executor["Tool Executor<br/>(unified_exec, etc)"]
    end

    builtin --> registry
    mcp_stdio --> registry
    mcp_http --> registry

    registry --> router
    router --> orchestrator

    orchestrator --> approval
    approval --> sandbox
    sandbox --> executor
```

**Sources:** [codex-rs/core/src/tools/](), [codex-rs/core/src/mcp_connection_manager.rs](), [codex-rs/core/src/unified_exec.rs]()

## Model Provider System

Codex supports multiple model providers through a unified `ModelProviderInfo` registry. Providers can be OpenAI (default), ChatGPT-authenticated, or custom OSS providers (LM Studio, Ollama) with OpenAI-compatible APIs.

### Provider Configuration

| Provider Type | Authentication                    | Base URL                                | Wire Protocol |
| ------------- | --------------------------------- | --------------------------------------- | ------------- |
| OpenAI        | API Key (`OPENAI_API_KEY`)        | `https://api.openai.com/v1`             | `responses`   |
| ChatGPT       | OAuth token (stored in auth.json) | `https://chatgpt.com/backend-api/codex` | `responses`   |
| LM Studio     | None (local)                      | `http://localhost:1234/v1`              | `responses`   |
| Ollama        | None (local)                      | `http://localhost:11434/v1`             | `responses`   |
| Custom        | Configurable env var              | User-defined                            | `responses`   |

```mermaid
graph LR
    subgraph "Provider Registry"
        builtin_providers["Built-in Providers<br/>(model_provider_info.rs)"]
        user_providers["User-Defined Providers<br/>(config.toml)"]
    end

    subgraph "Authentication"
        api_key["API Key<br/>(env vars)"]
        chatgpt_oauth["ChatGPT OAuth<br/>(AuthManager)"]
    end

    subgraph "Model Client"
        provider_config["ModelProviderInfo::to_api_provider()"]
        api_provider["ApiProvider<br/>(codex-api)"]
        http_client["HTTP Client<br/>(reqwest)"]
        ws_client["WebSocket Client<br/>(tokio-tungstenite)"]
    end

    builtin_providers --> provider_config
    user_providers --> provider_config
    api_key --> provider_config
    chatgpt_oauth --> provider_config

    provider_config --> api_provider
    api_provider --> http_client
    api_provider --> ws_client
```

**Sources:** [codex-rs/core/src/model_provider_info.rs:1-250](), [codex-rs/core/src/auth/mod.rs](), [codex-rs/core/src/client.rs]()

## Session Persistence and Replay

Sessions are persisted as rollout files containing event streams that can be replayed to resume or fork conversations. The `RolloutRecorder` filters events based on persistence mode and writes them to timestamped files.

### Rollout File Structure

```
~/.codex/sessions/
├── 2025-01-20/
│   ├── 2025-01-20T14-30-45Z-<uuid>.jsonl.zst
│   └── 2025-01-20T15-10-22Z-<uuid>.jsonl.zst
└── archived/
    └── 2025-01-15T10-05-30Z-<uuid>.jsonl.zst
```

Each rollout file contains:

- `RolloutLine::Meta`: Session metadata (thread_id, cwd, model, etc.)
- `RolloutLine::Item`: Persisted events (user messages, agent messages, tool calls)

```mermaid
graph LR
    subgraph "Event Stream"
        events["Events<br/>(protocol::Event)"]
    end

    subgraph "Rollout Recording"
        recorder["RolloutRecorder<br/>(rollout/mod.rs)"]
        policy["EventPersistenceMode<br/>(Full/Minimal/None)"]
        writer["Rollout Writer<br/>(JSONL + zstd)"]
    end

    subgraph "Persistence"
        sessions_dir["~/.codex/sessions/<br/>YYYY-MM-DD/<br/>timestamp-uuid.jsonl.zst"]
        state_db["SQLite StateDb<br/>(thread index)"]
    end

    subgraph "Replay"
        reader["Rollout Reader"]
        event_replay["Event Replay<br/>(resume/fork)"]
    end

    events --> recorder
    recorder --> policy
    policy --> writer
    writer --> sessions_dir
    recorder --> state_db

    sessions_dir --> reader
    reader --> event_replay
```

**Sources:** [codex-rs/core/src/rollout/mod.rs](), [codex-rs/core/src/rollout/policy.rs](), [codex-rs/core/src/state_db/mod.rs]()

## Multi-Agent Support

Codex supports spawning specialized sub-agents for tasks like code review, permission analysis (Guardian), or custom workflows. Each thread has its own `ThreadEventStore` buffering up to 32,768 events for state preservation during thread switching.

### Sub-Agent Types

| Agent Type | ThreadId Pattern      | Purpose                  | Configuration                                         |
| ---------- | --------------------- | ------------------------ | ----------------------------------------------------- |
| Primary    | User-provided or UUID | Main conversation        | User config                                           |
| Review     | `review-*`            | Code analysis            | Restricted (no web search, `approval_policy = Never`) |
| Guardian   | Internal              | Permission auto-approval | Specialized prompts                                   |
| Custom     | `task-*`              | Arbitrary sub-tasks      | Forked from primary                                   |

**Sources:** [codex-rs/core/src/thread_manager.rs](), [codex-rs/core/src/guardian.rs](), [codex-rs/core/src/review_prompts.rs]()

## Distribution and Build Pipeline

Codex is distributed through multiple channels: npm (cross-platform), Homebrew (macOS), WinGet (Windows), and direct GitHub Release downloads. The CI pipeline builds for 6 platform targets with platform-specific code signing.

### Build Targets

| Platform            | Target Triple                | Code Signing                     |
| ------------------- | ---------------------------- | -------------------------------- |
| macOS (arm64)       | `aarch64-apple-darwin`       | Apple certificate + notarization |
| macOS (x86_64)      | `x86_64-apple-darwin`        | Apple certificate + notarization |
| Linux GNU (x86_64)  | `x86_64-unknown-linux-gnu`   | Cosign (Sigstore)                |
| Linux GNU (arm64)   | `aarch64-unknown-linux-gnu`  | Cosign (Sigstore)                |
| Linux MUSL (x86_64) | `x86_64-unknown-linux-musl`  | Cosign (Sigstore)                |
| Linux MUSL (arm64)  | `aarch64-unknown-linux-musl` | Cosign (Sigstore)                |
| Windows (x86_64)    | `x86_64-pc-windows-msvc`     | Azure Trusted Signing            |
| Windows (arm64)     | `aarch64-pc-windows-msvc`    | Azure Trusted Signing            |

**Sources:** [README.md:13-60](), [codex-rs/README.md:1-103](), [Cargo.toml:367-375]()
