# IPC Communication Layer

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [apps/electron/src/renderer/components/onboarding/CredentialsStep.tsx](apps/electron/src/renderer/components/onboarding/CredentialsStep.tsx)
- [apps/electron/src/renderer/components/onboarding/OnboardingWizard.tsx](apps/electron/src/renderer/components/onboarding/OnboardingWizard.tsx)
- [apps/electron/src/renderer/components/right-sidebar/SessionFilesSection.tsx](apps/electron/src/renderer/components/right-sidebar/SessionFilesSection.tsx)
- [apps/electron/src/transport/__tests__/channel-map-parity.test.ts](apps/electron/src/transport/__tests__/channel-map-parity.test.ts)
- [apps/electron/src/transport/channel-map.ts](apps/electron/src/transport/channel-map.ts)
- [apps/electron/src/transport/client.ts](apps/electron/src/transport/client.ts)
- [packages/shared/src/protocol/channels.ts](packages/shared/src/protocol/channels.ts)
- [packages/shared/src/protocol/dto.ts](packages/shared/src/protocol/dto.ts)
- [packages/shared/src/protocol/routing.ts](packages/shared/src/protocol/routing.ts)

</details>



The IPC Communication Layer is the bidirectional message passing system that connects Electron's isolated processes (main, preload, renderer) in a secure, type-safe manner. This layer enables the React UI to invoke backend operations and receive real-time streaming updates from AI agents without breaking Electron's security model.

This page covers the IPC channel definitions, handler registration, the preload bridge, and event streaming patterns. For the broader Electron application architecture, see [Electron Application Architecture](). For session lifecycle and message processing details, see [Session Lifecycle]().

---

## Architecture Overview

The IPC layer implements a three-tier architecture separating concerns across process boundaries. The system uses a `CHANNEL_MAP` to drive the generation of the `window.electronAPI` object exposed to the renderer.

**IPC Architecture**
```mermaid
graph TB
    subgraph "Renderer Process (React)"
        [App.tsx] -- "Calls" --> [window.electronAPI]
        [Hooks] -- "useSession" --> [window.electronAPI]
    end
    
    subgraph "Preload Bridge (Isolated)"
        [window.electronAPI] -- "Generated from" --> [CHANNEL_MAP]
        [CHANNEL_MAP] -- "Uses" --> [ipcRenderer.invoke]
        [CHANNEL_MAP] -- "Uses" --> [ipcRenderer.on]
    end
    
    subgraph "Main Process (Node.js)"
        [ipcMain.handle] -- "Routes to" --> [SessionManager]
        [ipcMain.handle] -- "Routes to" --> [ConfigManager]
        [SessionManager] -- "Emits" --> [RPC_CHANNELS.sessions.EVENT]
    end
    
    [ipcRenderer.invoke] -. "IPC Message" .-> [ipcMain.handle]
    [ipcMain.handle] -. "Reply" .-> [ipcRenderer.invoke]
    
    style [window.electronAPI] fill:#fff4e1
    style [CHANNEL_MAP] fill:#ffe1f5
    style [RPC_CHANNELS.sessions.EVENT] fill:#e1f5ff
```

Sources: [apps/electron/src/transport/channel-map.ts:19-155](), [apps/electron/src/transport/client.ts:104-166](), [packages/shared/src/protocol/channels.ts:6-210]()

---

## IPC Channel Types

All IPC channels are defined in the `RPC_CHANNELS` constant [packages/shared/src/protocol/channels.ts:6-210]() and are categorized by their routing logic in `routing.ts` [packages/shared/src/protocol/routing.ts:1-205]().

### Request/Response (Invoke)

These channels use `ipcRenderer.invoke()` to return a Promise to the renderer. In the `CHANNEL_MAP`, they are marked as `type: 'invoke'` [apps/electron/src/transport/channel-map.ts:11-13]().

| Domain | Example Channel | Code Reference | Return Type |
| :--- | :--- | :--- | :--- |
| **Sessions** | `sessions:get` | [packages/shared/src/protocol/channels.ts:21]() | `Session[]` |
| **Files** | `file:read` | [packages/shared/src/protocol/channels.ts:75]() | `string` |
| **Workspaces** | `workspaces:get` | [packages/shared/src/protocol/channels.ts:55]() | `Workspace[]` |
| **Auth** | `onboarding:getAuthState` | [packages/shared/src/protocol/channels.ts:160]() | `AuthState` |

### Event Listeners

Event channels allow the Main process to push updates to the Renderer. They are defined as `type: 'listener'` in the `CHANNEL_MAP` [apps/electron/src/transport/channel-map.ts:15-17]().

**Common Event Streams:**
*   **Session Events**: `session:event` carries all agent deltas and tool states [packages/shared/src/protocol/channels.ts:36]().
*   **Theme Changes**: `theme:systemChanged` notifies the UI of OS-level appearance shifts [packages/shared/src/protocol/channels.ts:93]().
*   **Update Progress**: `update:downloadProgress` streams auto-updater status [packages/shared/src/protocol/channels.ts:120]().

Sources: [apps/electron/src/transport/channel-map.ts:19-155](), [packages/shared/src/protocol/channels.ts:6-210]()

---

## Routing & Hybrid Transport

Craft Agents supports a hybrid architecture where some operations are strictly local, while others can be proxied to a remote server. This is governed by the classification in `routing.ts` [packages/shared/src/protocol/routing.ts:1-205]().

**Channel Routing Categories**
```mermaid
graph LR
    subgraph "LOCAL_ONLY_CHANNELS"
        [window:openWorkspace]
        [system:versions]
        [auth:logout]
        [shell:openUrl]
    end
    
    subgraph "REMOTE_ELIGIBLE_CHANNELS"
        [sessions:sendMessage]
        [file:read]
        [sessions:create]
        [fs:listDirectory]
    end

    [LOCAL_ONLY_CHANNELS] --> [Local Electron Main]
    [REMOTE_ELIGIBLE_CHANNELS] --> [Workspace Owner Server]
```

*   **LOCAL_ONLY**: Fundamental Electron/OS operations like window management, native dialogs, and auto-updates [packages/shared/src/protocol/routing.ts:17-200]().
*   **REMOTE_ELIGIBLE**: Data-plane operations like messaging, file access, and tool execution that can run on a remote Craft Agent server [packages/shared/src/protocol/routing.ts:203-205]().

Sources: [packages/shared/src/protocol/routing.ts:1-205](), [apps/electron/src/transport/client.ts:32-71]()

---

## The window.electronAPI Surface

The `CHANNEL_MAP` serves as the single source of truth for the API exposed to the React renderer [apps/electron/src/transport/channel-map.ts:1-6]().

### Core API Methods

*   **Session Control**: `createSession`, `sendMessage`, `cancelProcessing`, `respondToPermission` [apps/electron/src/transport/channel-map.ts:25-32]().
*   **Auth & Onboarding**: `startClaudeOAuth`, `startChatGptOAuth`, `startCopilotOAuth` [apps/electron/src/transport/channel-map.ts:128-141]().
*   **File System**: `readFile`, `readFileDataUrl`, `generateThumbnail`, `storeAttachment` [apps/electron/src/transport/channel-map.ts:72-82]().
*   **Window Management**: `openWorkspace`, `closeWindow`, `setTrafficLightsVisible` [apps/electron/src/transport/channel-map.ts:62-69]().

### Type Safety and Parity
The codebase includes a runtime contract test `channel-map-parity.test.ts` to ensure that every method in the `ElectronAPI` type definition has a corresponding entry in the `CHANNEL_MAP` [apps/electron/src/transport/__tests__/channel-map-parity.test.ts:1-58]().

Sources: [apps/electron/src/transport/channel-map.ts:19-155](), [apps/electron/src/transport/__tests__/channel-map-parity.test.ts:13-37]()

---

## Session Event DTOs

The `session:event` channel transmits a `SessionEvent` union. This is the primary data flow for the chat interface [packages/shared/src/protocol/dto.ts:160]().

| Event Type | Purpose | Payload Details |
| :--- | :--- | :--- |
| `text_delta` | Streaming LLM response | `delta: string`, `turnId: string` [packages/shared/src/protocol/dto.ts:161]() |
| `tool_start` | Agent begins tool use | `toolName`, `toolInput`, `toolDisplayMeta` [packages/shared/src/protocol/dto.ts:163]() |
| `tool_result` | Tool execution output | `result: string`, `isError: boolean` [packages/shared/src/protocol/dto.ts:164]() |
| `permission_request` | Safe-mode interruption | `request: PermissionRequest` [packages/shared/src/protocol/dto.ts:175]() |
| `complete` | Turn finalization | `tokenUsage`, `hasUnread` [packages/shared/src/protocol/dto.ts:167]() |

Sources: [packages/shared/src/protocol/dto.ts:160-180]()

---

## Security & Isolation

The IPC layer enforces strict security boundaries to prevent the renderer from accessing sensitive Node.js APIs directly.

1.  **Context Isolation**: The renderer cannot access `ipcRenderer` directly; it only sees the methods explicitly exposed via `contextBridge` in the preload script [apps/electron/src/transport/channel-map.ts:1-6]().
2.  **Path Validation**: Handlers for `file:read` and `file:readBinary` in the main process validate that requested paths are within the session or workspace boundaries.
3.  **Credential Protection**: Sensitive tokens are never sent to the renderer unless explicitly requested via specific auth flows (e.g., `getAuthState`) [apps/electron/src/transport/channel-map.ts:125]().

Sources: [apps/electron/src/transport/channel-map.ts:1-155](), [packages/shared/src/protocol/routing.ts:17-200]()