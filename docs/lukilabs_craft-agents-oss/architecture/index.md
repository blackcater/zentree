# Architecture

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [apps/electron/package.json](apps/electron/package.json)
- [package.json](package.json)
- [packages/shared/package.json](packages/shared/package.json)

</details>



## Purpose and Scope

This document provides a high-level overview of the Craft Agents OSS system architecture, covering the monorepo structure, Electron multi-process design, agent backend integration, and core data flow patterns. It serves as an entry point to understand how the major components of the system fit together.

For detailed information about specific subsystems, see:
- Package dependencies and workspace structure: [Package Structure](#2.1)
- Electron process communication and window management: [Electron Application Architecture](#2.2)
- Agent backend implementations and tool execution: [Agent System](#2.3)
- External API and MCP server integration: [External Service Integration](#2.4)
- UI components and application shell layout: [UI Components & Layout](#2.5)
- IPC channel definitions and communication: [IPC Communication Layer](#2.6)
- Session persistence and lifecycle: [Session Lifecycle](#2.7)
- Storage hierarchy and configuration management: [Storage & Configuration](#2.8)
- In-app documentation management: [Documentation System](#2.9)
- Standalone web viewer application: [Web Viewer Application](#2.10)
- Mermaid diagram rendering pipeline: [Mermaid Diagram Rendering](#2.11)
- Browser-based thin client: [Web UI Application](#2.12)

**Sources:** [package.json:1-21](), [apps/electron/package.json:1-6]()

---

## System Overview

Craft Agents is an Electron desktop application that provides a multi-session AI agent interface with support for three primary agent backends: **Claude** (via `@anthropic-ai/claude-agent-sdk`), **Codex** (via OpenAI app-server), and **Copilot** (via `@github/copilot-sdk`). The application is built as a monorepo using Bun workspaces, with shared business logic extracted into reusable packages.

The system architecture follows a layered design:

| Layer | Purpose | Primary Components |
|-------|---------|-------------------|
| **Desktop Application** | User interface and window management | `apps/electron` (main, preload, renderer) |
| **Web Clients** | Browser-based access and sharing | `apps/webui`, `apps/viewer` |
| **AI Backend** | Agent execution and streaming responses | Claude SDK, Codex app-server, Copilot SDK |
| **Integration** | External data sources and tool execution | MCP servers, API bridges, OAuth flows |
| **Core Infrastructure** | Shared types, business logic, UI components | `packages/core`, `packages/shared`, `packages/ui` |
| **Data & Configuration** | Persistent storage and workspace management | `~/.craft-agent/`, workspace folders |

**Sources:** [package.json:17-21](), [apps/electron/package.json:38-42](), [packages/shared/package.json:2-5]()

---

## Architectural Layers Diagram

**Figure 1: System Layers and Component Relationships**

```mermaid
graph TB
    subgraph Desktop["Desktop & Web Applications"]
        ElectronApp["apps/electron<br/>Main + Preload + Renderer"]
        WebUIApp["apps/webui<br/>Browser-based client"]
        ViewerApp["apps/viewer<br/>Session viewer (web)"]
        CLIApp["apps/cli<br/>Terminal client"]
    end
    
    subgraph AIBackend["AI Backend Layer"]
        ClaudeSDK["@anthropic-ai/claude-agent-sdk<br/>CraftAgent"]
        CodexServer["codex app-server<br/>JSON-RPC stdio"]
        CopilotSDK["@github/copilot-sdk<br/>CopilotAgent"]
    end
    
    subgraph Integration["Integration Layer"]
        MCPServers["MCP Servers<br/>stdio/http/sse"]
        BridgeMCP["bridge-mcp-server<br/>API to Codex bridge"]
        SessionMCP["session-mcp-server<br/>SubmitPlan, validate"]
        APILayer["api-tools.ts<br/>OAuth + REST"]
    end
    
    subgraph CoreInfra["Core Infrastructure"]
        CorePkg["packages/core<br/>Types, interfaces"]
        SharedPkg["packages/shared<br/>Agent, auth, config,<br/>credentials, sessions"]
        UIPkg["packages/ui<br/>ChatDisplay, TurnCard,<br/>Markdown, Overlays"]
        SessionToolsPkg["packages/session-tools-core<br/>Tool implementations"]
    end
    
    subgraph DataConfig["Data & Configuration"]
        GlobalConfig["~/.craft-agent/<br/>config.json, credentials.enc"]
        WorkspaceDir["workspace folders<br/>config, sources, skills,<br/>sessions, hooks"]
    end
    
    ElectronApp --> ClaudeSDK
    ElectronApp --> CodexServer
    ElectronApp --> CopilotSDK
    
    ElectronApp --> CorePkg
    ElectronApp --> SharedPkg
    ElectronApp --> UIPkg
    
    WebUIApp --> SharedPkg
    WebUIApp --> UIPkg
    
    ViewerApp --> CorePkg
    ViewerApp --> UIPkg
    
    CLIApp --> SharedPkg
    
    ClaudeSDK --> MCPServers
    ClaudeSDK --> SessionMCP
    CodexServer --> BridgeMCP
    CodexServer --> SessionMCP
    CopilotSDK --> MCPServers
    
    BridgeMCP --> APILayer
    
    SharedPkg --> CorePkg
    SharedPkg --> SessionToolsPkg
    UIPkg --> CorePkg
    
    SessionMCP --> SessionToolsPkg
    
    ElectronApp --> GlobalConfig
    ElectronApp --> WorkspaceDir
    
    SharedPkg -.reads/writes.-> GlobalConfig
    SharedPkg -.reads/writes.-> WorkspaceDir
```

**Sources:** [package.json:17-21](), [apps/electron/package.json:38-42](), [packages/shared/package.json:64-66]()

---

## Monorepo Organization

The repository uses Bun workspaces to organize code into applications and reusable packages. The monorepo structure is defined in the root `package.json`:

```json
"workspaces": [
  "packages/*",
  "apps/*",
  "!apps/online-docs"
]
```

### Workspace Layout

| Type | Path | Purpose |
|------|------|---------|
| **Applications** | `apps/electron` | Primary Electron desktop application |
| | `apps/webui` | Browser-based client connecting to a remote server |
| | `apps/viewer` | Standalone web viewer for session transcripts |
| | `apps/cli` | Terminal client for interacting with the server |
| **Core Packages** | `packages/core` | Shared TypeScript types and interfaces |
| | `packages/shared` | Business logic (agent, auth, config, sessions, sources) |
| | `packages/ui` | React components (ChatDisplay, TurnCard, AppShell) |
| **Tool Packages** | `packages/session-tools-core` | Built-in tools (SubmitPlan, validate) |
| | `packages/mermaid` | Mermaid diagram rendering integration |
| **MCP Servers** | `packages/bridge-mcp-server` | API-to-Codex protocol bridge |
| | `packages/session-mcp-server` | Session tools MCP server binary |

**Dependency Pattern:** Applications depend on packages via `workspace:*` references. Packages declare AI SDKs as peer dependencies to ensure version consistency across the monorepo.

For detailed package dependency graphs, see [Package Structure](#2.1).

**Sources:** [package.json:17-21](), [apps/electron/package.json:39-42](), [packages/shared/package.json:64-66]()

---

## Electron Multi-Process Architecture

The Electron desktop application follows a three-process architecture with strict isolation between the UI and system-level operations.

**Figure 2: Electron Process Architecture and IPC Communication**

```mermaid
graph TB
    subgraph MainProcess["Main Process (Node.js)"]
        MainIndex["src/main/index.ts<br/>App initialization"]
        IPCHandlers["src/main/ipc.ts<br/>IPC channel handlers"]
        SessionManager["src/main/sessions.ts<br/>SessionManager class"]
        CredManager["src/main/credentials.ts<br/>Encrypted storage"]
        
        MainIndex --> IPCHandlers
        IPCHandlers --> SessionManager
        IPCHandlers --> CredManager
    end
    
    subgraph PreloadBridge["Preload Bridge (Context Isolation)"]
        PreloadIndex["src/preload/bootstrap.ts<br/>electronAPI exposure"]
    end
    
    subgraph RendererProcess["Renderer Process (React)"]
        AppShell["components/AppShell.tsx<br/>Layout + routing"]
        ChatDisplay["components/ChatDisplay.tsx<br/>Message stream"]
        FreeFormInput["components/FreeFormInput.tsx<br/>Input & Attachments"]
        
        AppShell --> ChatDisplay
        AppShell --> FreeFormInput
    end
    
    subgraph AgentInstances["Agent Instances (Main Process)"]
        CraftAgent["CraftAgent<br/>Claude SDK instance"]
        CodexBackend["CodexBackend<br/>app-server subprocess"]
        CopilotAgent["CopilotAgent<br/>Copilot SDK instance"]
    end
    
    RendererProcess -->|"IPC calls via<br/>window.electronAPI"| PreloadIndex
    PreloadIndex -->|"contextBridge<br/>exposes API"| IPCHandlers
    
    IPCHandlers -->|"SESSION_EVENT<br/>streaming"| PreloadIndex
    PreloadIndex -->|"onSessionEvent<br/>callback"| RendererProcess
    
    SessionManager --> CraftAgent
    SessionManager --> CodexBackend
    SessionManager --> CopilotAgent
```

### Process Responsibilities

| Process | Runtime | Primary Responsibilities | Key Scripts |
|---------|---------|-------------------------|-----------|
| **Main** | Node.js | System integration, session management, agent lifecycle | `build:main` |
| **Preload** | Node.js (isolated) | Secure IPC bridge via `contextBridge` | `build:preload` |
| **Renderer** | Chromium | React UI, user interactions, markdown rendering | `build:renderer` |

For detailed IPC channel definitions and communication patterns, see [IPC Communication Layer](#2.6). For the build pipeline details, see [Electron Application Architecture](#2.2).

**Sources:** [apps/electron/package.json:18-23](), [apps/electron/package.json:5-6]()

---

## Agent System Architecture

Craft Agents supports multiple AI backend systems through a unified `BaseAgent` abstraction, allowing the application to route requests to different providers based on user configuration.

**Figure 3: Agent Backend Implementations and Communication Protocols**

```mermaid
graph LR
    subgraph SessionManager["SessionManager"]
        SendMessage["sendMessage()"]
        AgentLoader["Agent lazy loading"]
    end
    
    subgraph ClaudePath["Claude Path"]
        CraftAgentClass["CraftAgent class"]
        ClaudeSDK["@anthropic-ai/claude-agent-sdk"]
        AnthropicAPI["Anthropic / OpenRouter / Ollama"]
        
        CraftAgentClass --> ClaudeSDK
        ClaudeSDK --> AnthropicAPI
    end
    
    subgraph CodexPath["Codex Path"]
        CodexBackendClass["CodexBackend class"]
        AppServer["app-server binary<br/>JSON-RPC stdio"]
        
        CodexBackendClass --> AppServer
    end
    
    subgraph CopilotPath["Copilot Path"]
        CopilotAgentClass["CopilotAgent class"]
        CopilotSDK["@github/copilot-sdk"]
        
        CopilotAgentClass --> CopilotSDK
    end
    
    SendMessage --> AgentLoader
    AgentLoader --> CraftAgentClass
    AgentLoader --> CodexBackendClass
    AgentLoader --> CopilotAgentClass
```

### Agent Backend Comparison

| Backend | SDK | Primary Transport | Custom Providers |
|---------|-----|-------------------|------------------|
| **Claude** | `@anthropic-ai/claude-agent-sdk` | HTTP | Anthropic, OpenRouter, Ollama |
| **Codex** | Custom app-server fork | JSON-RPC stdio | OpenAI |
| **Copilot** | `@github/copilot-sdk` | HTTP | GitHub |

For detailed agent lifecycle management, tool execution flow, and permission system integration, see [Agent System](#2.3).

**Sources:** [packages/shared/package.json:16-19](), [packages/shared/package.json:74-81]()

---

## Configuration & Storage Architecture

The system uses a hierarchical configuration model with global settings at `~/.craft-agent/` and workspace-specific overrides in project folders.

**Figure 4: Configuration Hierarchy and Storage Locations**

```mermaid
graph TB
    subgraph GlobalConfig["~/.craft-agent/ (Global)"]
        ConfigJson["config.json<br/>workspaces[], llmConnections[]"]
        CredsEnc["credentials.enc<br/>AES-256-GCM encrypted"]
        PrefsJson["preferences.json<br/>UI preferences"]
    end
    
    subgraph Workspace1["Workspace Folder"]
        WS1Config["config.json<br/>name, defaultLLM"]
        WS1Sources["sources/<br/>MCP + API configs"]
        WS1Skills["skills/<br/>Agent instructions"]
        WS1Sessions["sessions/<br/>JSONL files"]
        WS1Hooks["automations.json<br/>v2 automation rules"]
    end
    
    ConfigJson -.defines.-> Workspace1
    WS1Config -.inherits defaults.-> ConfigJson
    CredsEnc -.stores keys for.-> WS1Sources
```

### Storage Locations

| File | Location | Format | Purpose |
|------|----------|--------|---------|
| `config.json` | `~/.craft-agent/` | JSON | Workspace registry, LLM connections |
| `credentials.enc` | `~/.craft-agent/` | Encrypted binary | API keys, OAuth tokens (AES-256-GCM) |
| `sessions/*.jsonl` | Workspace folder | JSONL | Complete session transcripts |
| `automations.json` | Workspace folder | JSON | Event-driven automation rules |

For detailed configuration file schemas and credential encryption, see [Storage & Configuration](#2.8). For session persistence details, see [Session Lifecycle](#2.7).

**Sources:** [packages/shared/package.json:23-27](), [packages/shared/package.json:60-62]()

---

## Build and Distribution

The application uses a multi-stage build process producing artifacts for macOS, Windows, and Linux.

### Build Scripts

| Script | Purpose |
|--------|---------|
| `electron:build` | Runs full build pipeline (main, preload, renderer, resources, assets) |
| `electron:dist` | Packages the application for distribution using `electron-builder` |
| `server:build` | Produces a headless server bundle for remote deployments |
| `webui:build` | Builds the browser-based client application |

**Sources:** [package.json:50-55](), [package.json:66-69](), [package.json:80-83]()

For detailed build configuration and platform-specific packaging, see [Building & Distribution](#6). For server deployment details, see [Server Deployment](#6.4).