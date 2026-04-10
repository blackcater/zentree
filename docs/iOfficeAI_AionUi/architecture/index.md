# Architecture

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [.claude/skills/architecture/SKILL.md](.claude/skills/architecture/SKILL.md)
- [.claude/skills/architecture/references/process.md](.claude/skills/architecture/references/process.md)
- [.claude/skills/architecture/references/project-layout.md](.claude/skills/architecture/references/project-layout.md)
- [.claude/skills/architecture/references/renderer.md](.claude/skills/architecture/references/renderer.md)
- [.claude/skills/i18n/SKILL.md](.claude/skills/i18n/SKILL.md)
- [.claude/skills/testing/SKILL.md](.claude/skills/testing/SKILL.md)
- [.github/workflows/build-and-release.yml](.github/workflows/build-and-release.yml)
- [CLAUDE.md](CLAUDE.md)
- [bun.lock](bun.lock)
- [docs/tech/architecture.md](docs/tech/architecture.md)
- [electron-builder.yml](electron-builder.yml)
- [package.json](package.json)
- [scripts/README.md](scripts/README.md)
- [scripts/afterPack.js](scripts/afterPack.js)
- [scripts/afterSign.js](scripts/afterSign.js)
- [scripts/build-with-builder.js](scripts/build-with-builder.js)
- [scripts/rebuildNativeModules.js](scripts/rebuildNativeModules.js)
- [src/common/platform/ElectronPlatformServices.ts](src/common/platform/ElectronPlatformServices.ts)
- [src/common/platform/IPlatformServices.ts](src/common/platform/IPlatformServices.ts)
- [src/common/platform/NodePlatformServices.ts](src/common/platform/NodePlatformServices.ts)
- [src/common/platform/index.ts](src/common/platform/index.ts)
- [src/index.ts](src/index.ts)
- [src/process/index.ts](src/process/index.ts)
- [src/process/utils/configureChromium.ts](src/process/utils/configureChromium.ts)
- [src/process/utils/initBridgeStandalone.ts](src/process/utils/initBridgeStandalone.ts)
- [tests/unit/platform/platformRegistry.test.ts](tests/unit/platform/platformRegistry.test.ts)
- [tests/unit/process/utils/configureChromium.test.ts](tests/unit/process/utils/configureChromium.test.ts)

</details>



## Purpose and Scope

This document describes the high-level architecture of AionUi, including its component relationships, operational modes, process structure, and core design patterns. It provides a technical overview of how the major subsystems interact to deliver a unified interface for multiple AI agent backends.

For detailed information about specific subsystems:
- Application startup modes and flag handling: see [Application Modes](#3.1)
- Electron process lifecycle and window management: see [Electron Framework](#3.2)  
- IPC method registration and type-safe communication: see [Inter-Process Communication](#3.3)
- File builders, database integration, and persistence: see [Storage System](#3.4)
- Express server, WebSocket, and remote access: see [WebUI Server Architecture](#3.5)
- SQLite schema and message batching: see [Database System](#3.6)

---

## System Overview

AionUi is a cross-platform AI agent interface built on the Electron framework. The application supports a diverse range of AI agent types (Gemini, ACP, Codex, OpenClaw, Nanobot, Aionrs) and can operate in three primary modes: Desktop (standard BrowserWindow), WebUI (remote Express server), or CLI (utility modes like password reset).

**Overall System Architecture**

```mermaid
graph TB
    subgraph "Build & Deployment"
        [GH_Actions] -->|"node scripts/build-with-builder.js"| [EB_Builder]
        [EB_Builder] -->|"produces"| [DIST_Pkgs]
    end
    
    subgraph "Electron Main Process (src/process)"
        [Index_ts] -->|"manages"| [Modes_Logic]
        [Modes_Logic] -->|"Desktop"| [BrowserWindow]
        [Modes_Logic] -->|"WebUI"| [Express_Server]
        [Modes_Logic] -->|"CLI"| [ResetPass_Util]
        
        [Index_ts] -->|"initializes"| [ipcBridge]
        [Index_ts] -->|"configures"| [configureChromium]
        [Index_ts] -->|"manages"| [ExtensionRegistry]
    end
    
    subgraph "Renderer Process (src/renderer)"
        [React_Root] -->|"ContextProviders"| [Auth_Theme_Tabs]
        [React_Root] -->|"Router"| [Routes]
        [Routes] -->|"/guid"| [Guid_Page]
        [Routes] -->|"/conversation/:id"| [ChatLayout]
    end
    
    subgraph "Agent & Subsystems"
        [Agent_Managers] -->|"Orchestrates"| [Gemini_ACP_Codex_Aionrs]
        [Channel_Mgr] -->|"Integrates"| [Telegram_Lark_WeChat]
    end
    
    subgraph "Storage & Persistence"
        [initStorage] -->|"Config"| [ConfigStorage]
        [initStorage] -->|"DB"| [SQLite_DB]
    end
    
    [DIST_Pkgs] -.->|"runs"| [Index_ts]
    [ipcBridge] <-->|"IPC / Preload"| [React_Root]
    [Agent_Managers] -->|"persists"| [SQLite_DB]
```

**Key Architectural Characteristics:**

- **Multi-Process Design**: The Main process handles system-level APIs, agents, and storage; the Renderer process manages the React UI; and Worker processes isolate heavy AI tasks [package.json:11-11](), [.claude/skills/architecture/SKILL.md:59-64]().
- **Unified IPC Bridge**: All communication between the UI and backend logic is routed through a type-safe `ipcBridge` [src/index.ts:23-23]().
- **Hybrid Storage**: The system utilizes JSON-based file builders for configuration and a high-performance SQLite database for message history [src/process/index.ts:29-30](), [package.json:91-91]().
- **Extension System**: An `ExtensionRegistry` enables the loading of third-party plugins for agents, skills, and themes via a manifest-driven architecture [src/process/index.ts:32-39]().

**Sources:** [src/index.ts:1-103](), [src/process/index.ts:1-50](), [.claude/skills/architecture/SKILL.md:1-142](), [package.json:1-150]()

---

## Application Entry Points and Routing

The `src/index.ts` entry point is responsible for determining the application's operational mode by inspecting command-line switches and environment variables.

**Application Mode Routing Flow**

```mermaid
graph TB
    [App_Ready] --> [Flag_Detection]
    
    subgraph "Detection - src/index.ts"
        [Flag_Detection] -->|"hasSwitch('webui')"| [isWebUI]
        [Flag_Detection] -->|"hasCommand('--resetpass')"| [isResetPass]
    end
    
    [isWebUI] -->|"true"| [startWebServer]
    [isResetPass] -->|"true"| [Reset_CLI]
    [Flag_Detection] -->|"default"| [createWindow]
    
    subgraph "Implementation Entities"
        [startWebServer] --- [src/process/webserver/index.ts]
        [createWindow] --- [src/process/utils/mainWindowLifecycle.ts]
    end
```

**Configuration Priority Chain**

The system resolves configuration from multiple sources in strict priority order to support flexible deployment [src/index.ts:166-184]():

| Priority | Source | Implementation |
|----------|--------|----------------|
| 1 (Highest) | CLI Flags | `hasSwitch(flag)` / `getSwitchValue(flag)` |
| 2 | Environment Variables | `process.env` |
| 3 | Config File | `loadUserWebUIConfig()` |
| 4 (Lowest) | Default Constants | Internal application fallbacks |

**Sources:** [src/index.ts:65-103](), [src/index.ts:166-184](), [package.json:12-20]()

---

## Core Subsystem Initialization

The `initializeProcess()` function orchestrates the sequential bootstrap of critical services before the UI is presented to the user.

**Initialization Sequence**

1. **Storage**: `initStorage()` prepares the filesystem environment and SQLite connection [src/process/index.ts:29-30]().
2. **Extensions**: `ExtensionRegistry.getInstance().initialize()` scans the `extensions` directory and resolves plugin manifests [src/process/index.ts:34-34]().
3. **Channels**: `getChannelManager().initialize()` starts external chat platform integrations [src/process/index.ts:43-43]().
4. **Bridges**: IPC handlers are registered to expose backend services to the frontend [src/process/index.ts:20-20]().

**Sources:** [src/process/index.ts:25-49](), [src/index.ts:22-35]()

---

## Process Architecture

AionUi enforces strict process boundary rules to prevent runtime crashes and maintain security [.claude/skills/architecture/SKILL.md:55-77]().

| Process | Location | Capabilities | Restrictions |
|---------|----------|--------------|--------------|
| **Main** | `src/process/` | Node.js, Electron APIs, `fs`, `child_process` | No DOM APIs (document/window) |
| **Renderer** | `src/renderer/` | DOM APIs, React, Browser APIs | No Node.js APIs (fs/path) |
| **Worker** | `src/process/worker/` | Node.js APIs, isolated task execution | No Electron or DOM APIs |
| **Preload** | `src/preload.ts` | `contextBridge`, `ipcRenderer` | No direct DOM manipulation |

**Communication Protocols:**
- **Main ↔ Renderer**: Type-safe IPC via `ipcBridge` and `preload.ts` [.claude/skills/architecture/SKILL.md:68-68]().
- **Main ↔ Worker**: Fork-based protocol for offloading heavy computation [.claude/skills/architecture/SKILL.md:69-69]().

**Sources:** [.claude/skills/architecture/SKILL.md:55-77](), [src/index.ts:140-154]()

---

## Build and Deployment Architecture

AionUi utilizes a sophisticated build pipeline managed by `scripts/build-with-builder.js` to handle cross-platform complexities and native modules.

**Build Process Bridge**

```mermaid
graph LR
    subgraph "Source Code"
        [TS_React]
    end
    
    subgraph "Compilation Phase"
        [TS_React] -->|"electron-vite build"| [Out_Dir]
    end
    
    subgraph "Packaging Phase"
        [Out_Dir] -->|"node scripts/build-with-builder.js"| [EB_Logic]
        [EB_Logic] -->|"afterPack hook"| [Native_Rebuild]
        [Native_Rebuild] -->|"produces"| [Final_App]
    end
    
    subgraph "Native Entities"
        [Native_Rebuild] --- [better-sqlite3]
        [Native_Rebuild] --- [bcrypt]
        [Native_Rebuild] --- [node-pty]
    end
```

**Key Build Features:**
- **Incremental Builds**: Uses MD5 hashing of source files to skip unnecessary Vite compilation [scripts/build-with-builder.js:29-87]().
- **Native Module Hook**: The `afterPack.js` hook ensures native modules (like `better-sqlite3`) are rebuilt for the correct target architecture during cross-compilation [scripts/afterPack.js:17-48]().
- **DMG Resilience**: Includes a specialized retry mechanism for macOS DMG creation to handle transient CI failures [scripts/build-with-builder.js:20-27]().

**Sources:** [scripts/build-with-builder.js:1-132](), [scripts/afterPack.js:1-50](), [electron-builder.yml:1-192]()

---

## Design Patterns Summary

| Pattern | Code Entity | Purpose |
|---------|-------------|---------|
| **Singleton** | `ExtensionRegistry` | Centralized management of application extensions [src/process/index.ts:34-34](). |
| **Bridge** | `src/process/bridge/` | Standardized IPC interface for process communication [.claude/skills/architecture/SKILL.md:28-29](). |
| **Adapter** | `AcpAdapter` | Translating various AI protocols into the internal message format. |
| **Registry** | `ExtensionRegistry` | Discovery and lifecycle management of plugins [src/process/index.ts:34-34](). |

**Sources:** [src/process/index.ts:1-50](), [.claude/skills/architecture/SKILL.md:81-105]()