# Settings, Data Storage & Analytics

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [electron/src/ipc/jira.ts](electron/src/ipc/jira.ts)
- [electron/src/lib/**tests**/logger.test.ts](electron/src/lib/__tests__/logger.test.ts)
- [electron/src/lib/app-settings.ts](electron/src/lib/app-settings.ts)
- [electron/src/lib/jira-oauth-store.ts](electron/src/lib/jira-oauth-store.ts)
- [electron/src/lib/jira-store.ts](electron/src/lib/jira-store.ts)
- [electron/src/lib/logger.ts](electron/src/lib/logger.ts)
- [electron/src/lib/posthog.ts](electron/src/lib/posthog.ts)
- [shared/types/jira.ts](shared/types/jira.ts)
- [src/components/ChatHeader.tsx](src/components/ChatHeader.tsx)
- [src/components/SettingsView.tsx](src/components/SettingsView.tsx)
- [src/components/settings/AboutSettings.tsx](src/components/settings/AboutSettings.tsx)
- [src/components/settings/AdvancedSettings.tsx](src/components/settings/AdvancedSettings.tsx)
- [src/components/settings/AnalyticsSettings.tsx](src/components/settings/AnalyticsSettings.tsx)
- [src/components/settings/PlaceholderSection.tsx](src/components/settings/PlaceholderSection.tsx)
- [src/hooks/useSettings.ts](src/hooks/useSettings.ts)
- [src/types/ui.ts](src/types/ui.ts)
- [tsup.electron.config.ts](tsup.electron.config.ts)

</details>

This section details the persistence layer, configuration management, and telemetry systems of Harnss. The application utilizes a dual-process synchronization pattern where UI-specific preferences reside in the renderer's `localStorage`, while system-level configurations (binary paths, update policies, and analytics) are managed by the Electron main process and persisted to a dedicated JSON file.

## 1. AppSettings Persistence & Schema

Harnss maintains a primary configuration file, `settings.json`, located in the application's `userData` directory [electron/src/lib/app-settings.ts:8-12](). This file is critical because it must be readable at startup—before any `BrowserWindow` or renderer context exists—to configure features like the `autoUpdater` and binary resolution [electron/src/lib/app-settings.ts:4-6]().

### The `AppSettings` Interface

The `AppSettings` interface defines the schema for system-level configuration, including binary sources for AI engines, notification triggers, and analytics identifiers [src/types/ui.ts:29-60]().

| Key                      | Type                   | Description                                                           |
| :----------------------- | :--------------------- | :-------------------------------------------------------------------- |
| `allowPrereleaseUpdates` | `boolean`              | Toggles inclusion of beta releases in update checks.                  |
| `preferredEditor`        | `PreferredEditor`      | Target editor (Cursor, VS Code, Zed) for "Open in Editor" actions.    |
| `claudeBinarySource`     | `ClaudeBinarySource`   | Strategy for finding the Claude CLI (`auto`, `managed`, or `custom`). |
| `notifications`          | `NotificationSettings` | Per-event configuration for OS alerts and sounds.                     |
| `analyticsEnabled`       | `boolean`              | Opt-in flag for anonymous usage tracking.                             |

### Dual-Process Synchronization

Settings are managed through an optimistic update pattern. When a user modifies a setting in the `SettingsView` [src/components/SettingsView.tsx:89-114](), the renderer updates its local state immediately and dispatches an IPC call to the main process to persist the change to disk [src/components/SettingsView.tsx:127-131]().

**Settings Data Flow**

```mermaid
graph TD
    subgraph "Renderer Process"
        SV["SettingsView.tsx"] -- "setAppSettings()" --> IPC_INVOKE["window.claude.settings.set"]
        US["useSettings.ts"] -- "localStorage" --> UI_PREFS["UI Layout/Theme Prefs"]
    end

    subgraph "Main Process"
        IPC_INVOKE -- "IPC Handle" --> AS_LIB["app-settings.ts"]
        AS_LIB -- "fs.writeFileSync" --> DISK["userData/settings.json"]
        AS_LIB -- "getAppSettings()" --> CACHE["In-Memory Cache"]
    end

    DISK -- "Startup Read" --> CACHE
    CACHE -- "Initial Load" --> SV
```

_Sources: [src/components/SettingsView.tsx:118-131](), [electron/src/lib/app-settings.ts:93-145](), [src/hooks/useSettings.ts:89-159]()_

## 2. Binary Source Resolution

For the Claude and Codex engines, Harnss supports a tiered resolution strategy defined by `ClaudeBinarySource` and `CodexBinarySource` [src/types/ui.ts:8-9]().

1.  **Auto Detect**: Searches the system `PATH` and known installation directories.
2.  **Managed**: Uses the version downloaded and managed by Harnss internally.
3.  **Custom**: Uses an absolute path provided by the user in `claudeCustomBinaryPath` or `codexCustomBinaryPath` [electron/src/lib/app-settings.ts:48-55]().

This configuration is managed in the "Engines" section of the `AdvancedSettings` component [src/components/settings/AdvancedSettings.tsx:124-169]().

## 3. PostHog Analytics Bridge

Harnss implements privacy-preserving analytics using PostHog to track daily active users (DAU) and basic feature engagement [electron/src/lib/posthog.ts:1-11]().

### Implementation Details

- **Anonymous Identity**: On first run, a random UUID is generated and stored in `settings.json` as `analyticsUserId` [electron/src/lib/posthog.ts:84-99]().
- **Deduplication**: To avoid over-counting, the app stores `analyticsLastDailyActiveDate`. A `daily_active_user` event is only sent if the current date differs from this stored value [electron/src/lib/posthog.ts:105-121]().
- **Opt-out**: If `analyticsEnabled` is false, the PostHog client is never initialized, and no network requests are made [electron/src/lib/posthog.ts:31-34]().

**Analytics System Architecture**

```mermaid
sequenceDiagram
    participant UI as AnalyticsSettings.tsx
    participant PH_R as posthog-js (Renderer)
    participant IPC as IPC Bridge
    participant PH_M as posthog-node (Main)

    UI->>IPC: window.claude.settings.set({ analyticsEnabled: false })
    IPC->>PH_M: reinitPostHog()
    PH_M->>PH_M: shutdownPostHog()
    UI->>PH_R: syncAnalyticsSettings()
    PH_R->>PH_R: posthog.opt_out_capturing()
```

_Sources: [electron/src/lib/posthog.ts:205-213](), [src/components/settings/AnalyticsSettings.tsx:31-39](), [electron/src/lib/app-settings.ts:61-66]()_

## 4. Redacted Logging System

The application logger, defined in `electron/src/lib/logger.ts`, provides centralized logging for both the main process and engine streams.

### Security & Redaction

The logger includes a `formatLogData` utility that recursively scans objects and strings for sensitive patterns [electron/src/lib/logger.ts](). It specifically redacts:

- **Headers**: `Authorization`, `Cookie`, `X-API-Key` [electron/src/lib/**tests**/logger.test.ts:33-50]().
- **URLs**: Credentials embedded in URLs (e.g., `https://user:pass@host`) [electron/src/lib/**tests**/logger.test.ts:52-62]().
- **Tokens**: Common patterns like `access_token=...` or `refresh_token=...`.

### Log Storage

Logs are written to a rotating file in the `logs` subdirectory of the application data folder. In production, these logs are essential for debugging engine communication failures without exposing user credentials [electron/src/lib/**tests**/logger.test.ts:64-72]().

## 5. UI Preferences (Renderer Only)

Settings that do not affect the main process startup (e.g., panel widths, active tool sets, or sidebar colors) are managed via the `useSettings` hook [src/hooks/useSettings.ts:87-159](). These are stored exclusively in the renderer's `localStorage` to reduce IPC overhead for high-frequency updates like panel resizing [src/hooks/useSettings.ts:127-132]().

| Setting Category   | Storage Location  | Logic Entity                            |
| :----------------- | :---------------- | :-------------------------------------- |
| **System/Engines** | `settings.json`   | `getAppSettings()` / `setAppSettings()` |
| **Layout/Theme**   | `localStorage`    | `useSettings()` hook                    |
| **OAuth State**    | `jira-store.json` | `JiraStore` class                       |

_Sources: [src/hooks/useSettings.ts:7-31](), [electron/src/lib/app-settings.ts:102-145]()_
