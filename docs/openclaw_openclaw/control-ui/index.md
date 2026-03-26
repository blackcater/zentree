# Control UI

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [AGENTS.md](AGENTS.md)
- [docs/help/testing.md](docs/help/testing.md)
- [docs/reference/test.md](docs/reference/test.md)
- [scripts/e2e/parallels-macos-smoke.sh](scripts/e2e/parallels-macos-smoke.sh)
- [scripts/e2e/parallels-windows-smoke.sh](scripts/e2e/parallels-windows-smoke.sh)
- [scripts/test-parallel.mjs](scripts/test-parallel.mjs)
- [src/gateway/hooks-test-helpers.ts](src/gateway/hooks-test-helpers.ts)
- [src/shared/config-ui-hints-types.ts](src/shared/config-ui-hints-types.ts)
- [test/setup.ts](test/setup.ts)
- [test/test-env.ts](test/test-env.ts)
- [ui/src/ui/controllers/nodes.ts](ui/src/ui/controllers/nodes.ts)
- [ui/src/ui/controllers/skills.ts](ui/src/ui/controllers/skills.ts)
- [ui/src/ui/views/agents-panels-status-files.ts](ui/src/ui/views/agents-panels-status-files.ts)
- [ui/src/ui/views/agents-panels-tools-skills.ts](ui/src/ui/views/agents-panels-tools-skills.ts)
- [ui/src/ui/views/agents-utils.test.ts](ui/src/ui/views/agents-utils.test.ts)
- [ui/src/ui/views/agents-utils.ts](ui/src/ui/views/agents-utils.ts)
- [ui/src/ui/views/agents.ts](ui/src/ui/views/agents.ts)
- [ui/src/ui/views/channel-config-extras.ts](ui/src/ui/views/channel-config-extras.ts)
- [ui/src/ui/views/chat.test.ts](ui/src/ui/views/chat.test.ts)
- [ui/src/ui/views/login-gate.ts](ui/src/ui/views/login-gate.ts)
- [ui/src/ui/views/skills.ts](ui/src/ui/views/skills.ts)
- [vitest.channels.config.ts](vitest.channels.config.ts)
- [vitest.config.ts](vitest.config.ts)
- [vitest.e2e.config.ts](vitest.e2e.config.ts)
- [vitest.extensions.config.ts](vitest.extensions.config.ts)
- [vitest.gateway.config.ts](vitest.gateway.config.ts)
- [vitest.live.config.ts](vitest.live.config.ts)
- [vitest.scoped-config.ts](vitest.scoped-config.ts)
- [vitest.unit.config.ts](vitest.unit.config.ts)

</details>

The Control UI is the browser-based single-page application (SPA) that provides a dashboard for the OpenClaw Gateway. It runs in a standard web browser and communicates with the Gateway exclusively over a WebSocket connection. This page covers the SPA's component architecture, state management, Gateway client, view routing, settings persistence, and theming system.

For information about the Gateway WebSocket protocol the UI connects to, see [WebSocket Protocol](#2.1). For details on authentication modes used during the connect handshake, see [Authentication & Device Pairing](#2.2). For the native iOS/macOS/Android node clients (which are a distinct type of Gateway client), see [Native Clients (Nodes)](#6).

---

## Architecture Overview

The UI is a LitElement SPA served by the Gateway's HTTP server. All data flows through a single WebSocket connection managed by `GatewayBrowserClient`.

**Component and Data Flow Diagram**

```mermaid
graph TD
    subgraph "Browser"
        OCA["OpenClawApp\
(openclaw-app custom element)\
ui/src/ui/app.ts"]
        AVS["AppViewState\
(view interface)\
ui/src/ui/app-view-state.ts"]
        RA["renderApp()\
ui/src/ui/app-render.ts"]
        GBC["GatewayBrowserClient\
ui/src/ui/gateway.ts"]
        ST["UiSettings\
(localStorage)\
ui/src/ui/storage.ts"]
        Views["Per-view renderers\
ui/src/ui/views/*.ts"]
        Controllers["Controllers\
ui/src/ui/controllers/*.ts"]
    end

    subgraph "Gateway"
        GW["GatewayServer\
ws://127.0.0.1:18789"]
    end

    OCA -->|"implements"| AVS
    OCA -->|"calls"| RA
    RA -->|"delegates to"| Views
    Views -->|"call"| Controllers
    Controllers -->|"use"| GBC
    GBC -->|"WebSocket RPC"| GW
    GW -->|"events + responses"| GBC
    GBC -->|"onHello / onEvent / onClose"| OCA
    OCA -->|"reads/writes"| ST
```

Sources: [ui/src/ui/app.ts:1-616](), [ui/src/ui/app-view-state.ts:1-50](), [ui/src/ui/app-render.ts:1-100](), [ui/src/ui/gateway.ts:1-100](), [ui/src/ui/storage.ts:1-50]()

---

## `OpenClawApp` Component

`OpenClawApp` is the root LitElement custom element registered as `openclaw-app` [ui/src/ui/app.ts:110-616](). It is the single instance of the application and holds all reactive state as `@state()` decorated properties.

It **does not** use Shadow DOM — `createRenderRoot()` returns `this` [ui/src/ui/app.ts:392-394]() — so styles are applied globally.

### Lifecycle

| Lifecycle Method       | Handler                                    |
| ---------------------- | ------------------------------------------ |
| `connectedCallback`    | `handleConnected` in `app-lifecycle.ts`    |
| `firstUpdated`         | `handleFirstUpdated` in `app-lifecycle.ts` |
| `updated`              | `handleUpdated` in `app-lifecycle.ts`      |
| `disconnectedCallback` | `handleDisconnected` in `app-lifecycle.ts` |

The `firstUpdated` hook is where the Gateway connection is initiated and URL-based settings (`token`, `session`, `gatewayUrl` query params) are consumed via `applySettingsFromUrl` [ui/src/ui/app-settings.ts:89-149]().

### `AppViewState` Interface

Rather than passing `this` (the `OpenClawApp` instance) directly to rendering and controller functions, the code casts to `AppViewState` [ui/src/ui/app-view-state.ts:47-](), a structural type that describes only the fields and methods needed for rendering and data loading. This pattern decouples the view layer from the component class.

`renderApp` is called as `renderApp(this as unknown as AppViewState)` [ui/src/ui/app.ts:613-615]().

---

## State Management

### Reactive State (`@state()`)

`OpenClawApp` declares all UI state as `@state()` properties, grouped by feature domain:

| Domain            | Key Properties                                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------------------------------- |
| **Connection**    | `connected`, `hello`, `lastError`, `lastErrorCode`, `client`                                                    |
| **Chat**          | `chatMessages`, `chatStream`, `chatStreamStartedAt`, `chatSending`, `chatRunId`, `chatQueue`, `chatAttachments` |
| **Sessions**      | `sessionsResult`, `sessionsLoading`, `sessionsFilterActive`, `sessionsFilterLimit`                              |
| **Agents**        | `agentsList`, `agentsSelectedId`, `agentsPanel`, `agentFilesList`, `agentIdentityById`                          |
| **Cron**          | `cronJobs`, `cronStatus`, `cronForm`, `cronRuns`, `cronFieldErrors`                                             |
| **Config**        | `configSnapshot`, `configSchema`, `configForm`, `configFormDirty`                                               |
| **Nodes/Devices** | `nodes`, `devicesList`, `execApprovalsForm`, `execApprovalQueue`                                                |
| **Logs**          | `logsEntries`, `logsLevelFilters`, `logsAtBottom`                                                               |
| **Skills**        | `skillsReport`, `skillEdits`, `skillMessages`                                                                   |
| **Usage**         | `usageResult`, `usageCostSummary`, `usageTimeSeries`                                                            |
| **UI**            | `tab`, `theme`, `themeResolved`, `settings`, `onboarding`, `sidebarOpen`, `splitRatio`                          |

Sources: [ui/src/ui/app.ts:113-385]()

### Settings Persistence (`UiSettings`)

Settings that survive page reloads are persisted to `localStorage` under the key `openclaw.control.settings.v1`. The `UiSettings` type is:

```typescript
type UiSettings = {
  gatewayUrl: string // ws:// or wss:// URL of the Gateway
  token: string // shared auth token
  sessionKey: string // last selected chat session key
  lastActiveSessionKey: string // most recently active chat session key
  theme: ThemeMode // "dark" | "light" | "system"
  chatFocusMode: boolean // hides nav/header in chat view
  chatShowThinking: boolean // shows tool result messages
  splitRatio: number // sidebar split ratio (0.4–0.7)
  navCollapsed: boolean // whether the sidebar nav is hidden
  navGroupsCollapsed: Record<string, boolean> // per-group collapse state
  locale?: string // UI language code
}
```

`loadSettings()` is called at component construction time. `saveSettings()` is called by `applySettings()` on every settings mutation [ui/src/ui/storage.ts:20-](), [ui/src/ui/app-settings.ts:64-76]().

---

## `GatewayBrowserClient`

`GatewayBrowserClient` [ui/src/ui/gateway.ts:94-]() is the WebSocket client class. Each call to `connectGateway()` [ui/src/ui/app-gateway.ts:139-214]() creates a new instance and stops the previous one.

### Connection Lifecycle

```mermaid
sequenceDiagram
    participant "OpenClawApp" as App
    participant "GatewayBrowserClient" as GBC
    participant "Gateway WebSocket" as GW

    App->>GBC: "start()"
    GBC->>GW: "WebSocket open"
    GBC->>GBC: "queueConnect()"
    GBC->>GW: "RequestFrame {method: 'connect.challenge'}"
    GW-->>GBC: "EventFrame {event: 'connect.challenge', nonce}"
    GBC->>GW: "connect frame (token/password/device signature)"
    GW-->>GBC: "hello-ok {snapshot, features, auth}"
    GBC->>App: "onHello(hello)"
    App->>App: "applySnapshot(), load initial data"

    loop "RPC calls"
        App->>GBC: "request(method, params)"
        GBC->>GW: "RequestFrame"
        GW-->>GBC: "ResponseFrame"
        GBC-->>App: "Promise resolved"
    end

    GW-->>GBC: "EventFrame {event, payload, seq}"
    GBC->>App: "onEvent(evt)"
```

### Authentication

The client sends one of:

- **Shared token**: `auth.token` from `UiSettings.token`
- **Device token**: Rotated token derived from a browser-generated ECDSA keypair stored in `IndexedDB` (only in secure contexts where `crypto.subtle` is available)
- **Password**: `auth.password`

The device identity is managed by `loadOrCreateDeviceIdentity()` and `signDevicePayload()` [ui/src/ui/gateway.ts:161-213](). The device token received in the `hello-ok` response is stored locally via `storeDeviceAuthToken()` for future connections.

### Reconnection

`GatewayBrowserClient` reconnects automatically on close, with exponential backoff starting at 800ms and capping at 15 seconds [ui/src/ui/gateway.ts:145-152]().

Sources: [ui/src/ui/gateway.ts:94-330](), [ui/src/ui/app-gateway.ts:139-214]()

---

## Navigation and Views

Navigation is URL-path-based. The current tab is derived from `window.location.pathname` on load and updated via `history.pushState` when tabs are switched. The `onPopState` handler keeps tab state synchronized with browser history [ui/src/ui/app-settings.ts:151-170]().

**Tab-to-View Mapping**

```mermaid
graph LR
    subgraph "Tabs (Tab type)"
        T1["chat"]
        T2["overview"]
        T3["channels"]
        T4["instances"]
        T5["sessions"]
        T6["usage"]
        T7["cron"]
        T8["agents"]
        T9["skills"]
        T10["nodes"]
        T11["logs"]
        T12["debug"]
    end

    subgraph "View Renderers (ui/src/ui/views/)"
        V1["renderChat()\
chat.ts"]
        V2["renderOverview()\
overview.ts"]
        V3["renderChannels()\
channels.ts"]
        V4["renderInstances()\
instances.ts"]
        V5["renderSessions()\
sessions.ts"]
        V6["renderUsageTab()\
app-render-usage-tab.ts"]
        V7["renderCron()\
cron.ts"]
        V8["renderAgents()\
agents.ts"]
        V9["renderSkills()\
skills.ts"]
        V10["renderNodes()\
nodes.ts"]
        V11["renderLogs()\
logs.ts"]
        V12["renderDebug()\
debug.ts"]
    end

    T1 --> V1
    T2 --> V2
    T3 --> V3
    T4 --> V4
    T5 --> V5
    T6 --> V6
    T7 --> V7
    T8 --> V8
    T9 --> V9
    T10 --> V10
    T11 --> V11
    T12 --> V12
```

Sources: [ui/src/ui/app-render.ts:328-950](), [ui/src/ui/app-settings.ts:186-244]()

### Tab Groups

The navigation sidebar organizes tabs into collapsible groups via `TAB_GROUPS` from `navigation.ts`. Each group label maps to a `navGroupsCollapsed` entry in `UiSettings`, so collapse state survives page reloads [ui/src/ui/app-render.ts:259-302]().

### Data Loading on Tab Switch

When `setTab()` is called, `refreshActiveTab()` [ui/src/ui/app-settings.ts:186-244]() loads the relevant data for the newly active tab:

| Tab         | Data Loaded                                                                   |
| ----------- | ----------------------------------------------------------------------------- |
| `overview`  | `loadOverview()` (presence count, sessions count, cron status)                |
| `channels`  | `loadChannels()`                                                              |
| `instances` | `loadPresence()`                                                              |
| `sessions`  | `loadSessions()`                                                              |
| `cron`      | `loadCronStatus()`, `loadCronJobs()`, `loadCronRuns()`                        |
| `agents`    | `loadAgents()`, `loadToolsCatalog()`, `loadConfig()`, `loadAgentIdentities()` |
| `nodes`     | `loadNodes()`, `loadDevices()`, `loadConfig()`, `loadExecApprovals()`         |
| `chat`      | `refreshChat()`, scroll to bottom                                             |
| `logs`      | `loadLogs()`, starts polling interval                                         |
| `debug`     | `loadDebug()`, starts polling interval                                        |
| `skills`    | `loadSkills()`                                                                |

---

## Shell Layout

The UI uses a CSS Grid shell defined in [ui/src/styles/layout.css:1-50](). The top-level structure is:

```
┌────────────────────────────────────────────┐
│  .topbar   (56px, spans full width)        │
├───────────────┬────────────────────────────┤
│  .nav         │  .content                  │
│  (220px wide) │  (fills remaining width)   │
│               │                            │
└───────────────┴────────────────────────────┘
```

CSS class modifiers on `.shell`:

| Class                   | Effect                                           |
| ----------------------- | ------------------------------------------------ |
| `.shell--nav-collapsed` | Sets `grid-template-columns: 0px 1fr`, hides nav |
| `.shell--chat-focus`    | Collapses nav and topbar; full-screen chat       |
| `.shell--chat`          | Prevents overflow scrolling on the shell         |
| `.shell--onboarding`    | Hides topbar row (`grid-template-rows: 0 1fr`)   |

Sources: [ui/src/styles/layout.css:1-622]()

### Chat View Layout

When `tab === "chat"`, the main content area switches to a flex column layout (`.content--chat`). The chat view itself [ui/src/ui/views/chat.ts:240-480]() contains:

- **`.chat-thread`** — scrollable message history
- **`.chat-split-container`** — optional side-by-side markdown sidebar (resizable with `resizable-divider` custom element)
- **`.chat-compose`** — sticky compose area with textarea and send/abort buttons
- **Compaction/fallback indicators** — transient status toasts rendered by `renderCompactionIndicator()` and `renderFallbackIndicator()`

The sidebar split ratio is user-adjustable (range 0.4–0.7) and stored in `UiSettings.splitRatio` [ui/src/ui/app.ts:607-611]().

---

## Gateway Event Handling

Incoming events from the Gateway are handled by `handleGatewayEvent()` in `app-gateway.ts` [ui/src/ui/app-gateway.ts:216-328]().

**Event dispatch diagram:**

```mermaid
flowchart TD
    E["EventFrame from GatewayBrowserClient.onEvent()"]
    E --> BUF["Append to eventLogBuffer (capped at 250)"]
    BUF --> SWITCH{"evt.event"}

    SWITCH -->|"'agent'"| AGENT["handleAgentEvent()\
app-tool-stream.ts\
(updates tool stream state)"]
    SWITCH -->|"'chat'"| CHAT["handleChatEvent()\
controllers/chat.ts\
(updates chatMessages, chatStream)"]
    SWITCH -->|"'presence'"| PRES["host.presenceEntries = payload.presence"]
    SWITCH -->|"'cron'"| CRON["loadCron() if tab === 'cron'"]
    SWITCH -->|"'device.pair.*'"| DEV["loadDevices()"]
    SWITCH -->|"'exec.approval.requested'"| EXEC["addExecApproval()\
shows approval prompt"]
    SWITCH -->|"'exec.approval.resolved'"| EXRES["removeExecApproval()"]
    SWITCH -->|"GATEWAY_EVENT_UPDATE_AVAILABLE"| UPDATE["host.updateAvailable = payload"]
```

Sources: [ui/src/ui/app-gateway.ts:260-328]()

### Chat Event States

`handleChatEvent()` [ui/src/ui/controllers/chat.ts:220-285]() processes `ChatEventPayload` with these state values:

| `payload.state` | Effect on UI                                                   |
| --------------- | -------------------------------------------------------------- |
| `"delta"`       | Appends streamed text to `chatStream`                          |
| `"final"`       | Moves final message to `chatMessages`, clears `chatStream`     |
| `"aborted"`     | Moves aborted message content to `chatMessages`, clears stream |
| `"error"`       | Sets `lastError`, clears stream                                |

After a terminal event (`final`, `error`, `aborted`), `resetToolStream()` is called and any queued chat messages are flushed via `flushChatQueueForEvent()` [ui/src/ui/app-gateway.ts:224-244]().

---

## Theming

The theme system supports three modes defined in `ThemeMode` [ui/src/ui/theme.ts:1-](): `"dark"`, `"light"`, and `"system"`. The resolved theme (`"dark"` or `"light"`) is written as a `data-theme` attribute on `:root`, which switches between two CSS variable sets defined in `base.css` [ui/src/styles/base.css:1-]().

- Dark mode uses `--bg: #12141a`, `--accent: #ff5c5c` (red)
- Light mode overrides are declared under `:root[data-theme="light"]`

The theme toggle widget (three-button dark/light/system selector) is rendered by `renderThemeToggle()` in `app-render.helpers.ts` and displayed in the topbar. When "system" is selected, a `MediaQueryList` listener on `prefers-color-scheme` drives automatic switching [ui/src/ui/app-settings.ts:172-184]().

Theme changes are animated via `startThemeTransition()` [ui/src/ui/app-lifecycle.ts:1-]().

---

## Agents View — Sub-panel Structure

The Agents tab is more complex than other tabs: it has an internal panel switcher within the view. The `agentsPanel` state field selects among:

| Panel        | Contents                                                |
| ------------ | ------------------------------------------------------- |
| `"overview"` | Agent identity, model selection, model fallbacks        |
| `"files"`    | Agent workspace files (AGENTS.md, SOUL.md, etc.) editor |
| `"tools"`    | Tools catalog and tool policy controls                  |
| `"skills"`   | Installed skills with enable/disable toggles            |
| `"channels"` | Channel status filtered to the selected agent           |
| `"cron"`     | Cron jobs for the selected agent                        |

Config mutations from the agents view (model changes, tool profile, skill enable/disable) use `updateConfigFormValue()` / `removeConfigFormValue()` to patch `configForm` in memory, then call `saveConfig()` to persist via the Gateway's `config.patch` RPC [ui/src/ui/app-render.ts:639-869]().

Sources: [ui/src/ui/app-render.ts:513-871](), [ui/src/ui/app.ts:224-239]()

---

## Exec Approval Prompt

When an agent requests exec approval (e.g., before running a shell command), the Gateway emits `exec.approval.requested`. The UI queues these in `execApprovalQueue` [ui/src/ui/app.ts:174-175]() and renders a modal prompt via `renderExecApprovalPrompt()` [ui/src/ui/app-render.ts:74]().

The operator can respond with `allow-once`, `allow-always`, or `deny`. This calls the `exec.approval.resolve` RPC method [ui/src/ui/app.ts:543-561](). Approvals expire automatically — a `setTimeout` removes them from the queue at their `expiresAtMs` [ui/src/ui/app-gateway.ts:306-313]().

---

## URL-Based Configuration Injection

On initial load, the app reads the following query parameters (then strips them from the URL):

| Parameter      | Effect                                                  |
| -------------- | ------------------------------------------------------- |
| `token`        | Sets `UiSettings.token`                                 |
| `session`      | Sets the active session key                             |
| `gatewayUrl`   | Prompts the user to confirm switching gateway URLs      |
| `password`     | Stripped only (never persisted)                         |
| `onboarding=1` | Activates onboarding mode (hides topbar, collapses nav) |

Sources: [ui/src/ui/app-settings.ts:89-149](), [ui/src/ui/app.ts:97-108]()

---

## Key File Index

| File                            | Role                                                  |
| ------------------------------- | ----------------------------------------------------- |
| `ui/src/ui/app.ts`              | `OpenClawApp` LitElement root component               |
| `ui/src/ui/app-view-state.ts`   | `AppViewState` structural type for rendering          |
| `ui/src/ui/app-render.ts`       | `renderApp()` — top-level render function             |
| `ui/src/ui/app-gateway.ts`      | `connectGateway()`, `handleGatewayEvent()`            |
| `ui/src/ui/gateway.ts`          | `GatewayBrowserClient` WebSocket client               |
| `ui/src/ui/storage.ts`          | `UiSettings`, `loadSettings()`, `saveSettings()`      |
| `ui/src/ui/app-settings.ts`     | `setTab()`, `applySettings()`, `refreshActiveTab()`   |
| `ui/src/ui/app-lifecycle.ts`    | LitElement lifecycle handlers                         |
| `ui/src/ui/app-chat.ts`         | Chat message sending/queueing logic                   |
| `ui/src/ui/navigation.ts`       | `TAB_GROUPS`, `pathForTab()`, `tabFromPath()`         |
| `ui/src/ui/views/*.ts`          | Per-tab view renderers                                |
| `ui/src/ui/controllers/*.ts`    | Data-loading functions calling `GatewayBrowserClient` |
| `ui/src/styles/base.css`        | CSS design tokens (colors, typography, spacing)       |
| `ui/src/styles/layout.css`      | Shell grid and topbar/nav/content layout              |
| `ui/src/styles/components.css`  | Shared components (buttons, cards, forms, pills)      |
| `ui/src/styles/chat/layout.css` | Chat-specific layout                                  |
