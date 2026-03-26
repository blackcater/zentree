# Update System

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [.github/workflows/\_build-reusable.yml](.github/workflows/_build-reusable.yml)
- [.github/workflows/build-manual.yml](.github/workflows/build-manual.yml)
- [bun.lock](bun.lock)
- [src/index.ts](src/index.ts)
- [src/utils/configureChromium.ts](src/utils/configureChromium.ts)
- [tests/integration/autoUpdate.integration.test.ts](tests/integration/autoUpdate.integration.test.ts)
- [tests/unit/autoUpdaterService.test.ts](tests/unit/autoUpdaterService.test.ts)
- [tests/unit/test_acp_connection_disconnect.ts](tests/unit/test_acp_connection_disconnect.ts)
- [vitest.config.ts](vitest.config.ts)

</details>

This document explains how AionUi implements automatic application updates using `electron-updater`. It covers the `autoUpdaterService`, IPC bridge for renderer communication, event-driven status broadcasts, and the distinction between production and prerelease update channels.

For information about the build pipeline that generates update artifacts, see [Build Pipeline](#11.1). For release management and metadata generation, see [Release Management](#11.5).

---

## Overview

The update system enables seamless in-app updates for AionUi across all platforms (macOS, Windows, Linux). It uses `electron-updater` to check for updates from GitHub releases, download update packages, and install them automatically on application restart.

**Key Features:**

- Automatic update checks on application launch (after 3-second delay)
- Background download with progress tracking
- Manual update checks triggered by user
- Support for prerelease/dev channels
- Status event broadcasting to renderer for UI feedback
- Platform-specific update formats (DMG/ZIP for macOS, NSIS/ZIP for Windows, DEB/AppImage for Linux)

---

## Architecture

### Component Diagram

```mermaid
graph TB
    subgraph "Renderer Process"
        UI["Update UI Component"]
        IPC_INVOKE["IPC Invoke Calls"]
        STATUS_LISTENER["Status Event Listener"]
    end

    subgraph "Main Process - IPC Bridge Layer"
        UPDATE_BRIDGE["updateBridge"]
        INIT_BRIDGE["initUpdateBridge()"]
        CREATE_BROADCAST["createAutoUpdateStatusBroadcast()"]

        CHECK_PROVIDER["autoUpdate.check.provider"]
        DOWNLOAD_PROVIDER["autoUpdate.download.provider"]
        QUIT_PROVIDER["autoUpdate.quitAndInstall.provider"]
        STATUS_EMITTER["autoUpdate.status.emit"]
    end

    subgraph "Main Process - Service Layer"
        SERVICE["autoUpdaterService"]
        INITIALIZE["initialize(statusBroadcast)"]
        CHECK["checkForUpdates()"]
        DOWNLOAD["downloadUpdate()"]
        QUIT["quitAndInstall()"]
        CHECK_NOTIFY["checkForUpdatesAndNotify()"]
        PRESET["setAllowPrerelease(bool)"]
        EVENT_EMIT["EventEmitter3 'update-status'"]
    end

    subgraph "electron-updater Library"
        AUTO_UPDATER["autoUpdater"]
        EVENTS["Event Handlers"]
        CONFIG["Configuration"]

        E_CHECK["on('checking-for-update')"]
        E_AVAILABLE["on('update-available')"]
        E_NOT_AVAIL["on('update-not-available')"]
        E_PROGRESS["on('download-progress')"]
        E_DOWNLOADED["on('update-downloaded')"]
        E_ERROR["on('error')"]
    end

    subgraph "GitHub Release Infrastructure"
        RELEASES["GitHub Releases"]
        METADATA["Update Metadata Files"]
        INSTALLERS["Platform Installers"]

        LATEST_YML["latest.yml (Windows)"]
        LATEST_MAC["latest-mac.yml (macOS)"]
        LATEST_LINUX["latest-linux.yml (Linux)"]
    end

    UI -->|invoke| IPC_INVOKE
    IPC_INVOKE -->|check update| CHECK_PROVIDER
    IPC_INVOKE -->|download| DOWNLOAD_PROVIDER
    IPC_INVOKE -->|install| QUIT_PROVIDER

    STATUS_EMITTER -->|broadcasts| STATUS_LISTENER
    STATUS_LISTENER -->|updates| UI

    INIT_BRIDGE -->|registers| CHECK_PROVIDER
    INIT_BRIDGE -->|registers| DOWNLOAD_PROVIDER
    INIT_BRIDGE -->|registers| QUIT_PROVIDER

    CREATE_BROADCAST -->|creates callback| STATUS_EMITTER

    CHECK_PROVIDER -->|calls| CHECK
    DOWNLOAD_PROVIDER -->|calls| DOWNLOAD
    QUIT_PROVIDER -->|calls| QUIT

    INITIALIZE -->|registers handlers| EVENTS
    INITIALIZE -->|stores callback| CREATE_BROADCAST

    CHECK -->|invokes| AUTO_UPDATER
    DOWNLOAD -->|invokes| AUTO_UPDATER
    QUIT -->|invokes| AUTO_UPDATER
    CHECK_NOTIFY -->|invokes| AUTO_UPDATER

    EVENTS -->|checking| E_CHECK
    EVENTS -->|available| E_AVAILABLE
    EVENTS -->|not available| E_NOT_AVAIL
    EVENTS -->|progress| E_PROGRESS
    EVENTS -->|downloaded| E_DOWNLOADED
    EVENTS -->|error| E_ERROR

    E_CHECK -->|emits| EVENT_EMIT
    E_AVAILABLE -->|emits| EVENT_EMIT
    E_NOT_AVAIL -->|emits| EVENT_EMIT
    E_PROGRESS -->|emits| EVENT_EMIT
    E_DOWNLOADED -->|emits| EVENT_EMIT
    E_ERROR -->|emits| EVENT_EMIT

    EVENT_EMIT -->|broadcasts via| STATUS_EMITTER

    AUTO_UPDATER -->|fetches| METADATA
    METADATA -->|references| INSTALLERS

    RELEASES -->|contains| LATEST_YML
    RELEASES -->|contains| LATEST_MAC
    RELEASES -->|contains| LATEST_LINUX
    RELEASES -->|contains| INSTALLERS

    PRESET -->|configures| CONFIG
    CONFIG -->|controls| AUTO_UPDATER
```

**Sources:** [src/index.ts:418-433](), [tests/integration/autoUpdate.integration.test.ts](), [tests/unit/autoUpdaterService.test.ts]()

---

## Core Components

### autoUpdaterService

The `autoUpdaterService` singleton manages all interactions with `electron-updater`'s `autoUpdater` instance. It provides a clean API for the IPC bridge layer and internal event emitter for status broadcasting.

**Key Methods:**

| Method                         | Description                                              | Returns                                            |
| ------------------------------ | -------------------------------------------------------- | -------------------------------------------------- |
| `initialize(statusBroadcast?)` | Register event handlers, store status broadcast callback | `void`                                             |
| `checkForUpdates()`            | Check for available updates                              | `Promise<{success: boolean, updateInfo?, error?}>` |
| `downloadUpdate()`             | Download available update                                | `Promise<{success: boolean, error?}>`              |
| `quitAndInstall()`             | Quit app and install downloaded update                   | `void`                                             |
| `checkForUpdatesAndNotify()`   | Check and show native notification if update available   | `Promise<void>`                                    |
| `setAllowPrerelease(enabled)`  | Enable/disable prerelease updates                        | `void`                                             |

**Properties:**

| Property          | Type      | Description                            |
| ----------------- | --------- | -------------------------------------- |
| `isInitialized`   | `boolean` | Whether service has been initialized   |
| `allowPrerelease` | `boolean` | Whether prerelease updates are enabled |

**Sources:** [tests/unit/autoUpdaterService.test.ts:51-67](), [tests/unit/autoUpdaterService.test.ts:127-164]()

---

### Initialization Flow

The update system is initialized during application startup, after the main window is created:

```mermaid
sequenceDiagram
    participant APP as src/index.ts
    participant SERVICE as autoUpdaterService
    participant BRIDGE as updateBridge
    participant IPC as ipcBridge
    participant UPDATER as electron-updater

    APP->>SERVICE: import autoUpdaterService
    APP->>BRIDGE: import updateBridge
    APP->>BRIDGE: createAutoUpdateStatusBroadcast()
    BRIDGE->>IPC: Returns callback wrapping autoUpdate.status.emit
    APP->>SERVICE: initialize(statusBroadcast)
    SERVICE->>UPDATER: Register event handlers
    Note over SERVICE: checking-for-update, update-available,<br/>update-not-available, download-progress,<br/>update-downloaded, error
    SERVICE-->>APP: Initialized

    Note over APP: Wait 3 seconds
    APP->>SERVICE: checkForUpdatesAndNotify()
    SERVICE->>UPDATER: checkForUpdatesAndNotify()
    UPDATER-->>SERVICE: Emits events
    SERVICE->>IPC: Broadcast status via callback
```

**Code Reference:**

[src/index.ts:418-433]() shows the initialization sequence:

```typescript
Promise.all([
  import('./process/services/autoUpdaterService'),
  import('./process/bridge/updateBridge'),
]).then(([{ autoUpdaterService }, { createAutoUpdateStatusBroadcast }]) => {
  // Create status broadcast callback that emits via ipcBridge (pure emitter, no window binding)
  const statusBroadcast = createAutoUpdateStatusBroadcast()
  autoUpdaterService.initialize(statusBroadcast)
  // Check for updates after 3 seconds delay
  setTimeout(() => {
    void autoUpdaterService.checkForUpdatesAndNotify()
  }, 3000)
})
```

**Sources:** [src/index.ts:418-433](), [tests/integration/autoUpdate.integration.test.ts:188-206]()

---

## IPC Bridge Layer

The IPC bridge exposes update functionality to the renderer process through three provider endpoints and one emitter for status broadcasting.

### IPC Endpoints

| Endpoint                              | Type     | Purpose                                             |
| ------------------------------------- | -------- | --------------------------------------------------- |
| `ipcBridge.autoUpdate.check`          | Provider | Check for updates (optionally including prerelease) |
| `ipcBridge.autoUpdate.download`       | Provider | Download available update                           |
| `ipcBridge.autoUpdate.quitAndInstall` | Provider | Quit and install downloaded update                  |
| `ipcBridge.autoUpdate.status`         | Emitter  | Broadcast update status events to renderer          |

### Bridge Registration

The `initUpdateBridge()` function registers all IPC providers by connecting them to corresponding `autoUpdaterService` methods:

```mermaid
graph LR
    subgraph "IPC Bridge Registration"
        INIT["initUpdateBridge()"]
        INIT -->|registers| CHECK["autoUpdate.check.provider"]
        INIT -->|registers| DOWNLOAD["autoUpdate.download.provider"]
        INIT -->|registers| QUIT["autoUpdate.quitAndInstall.provider"]
    end

    subgraph "Handler Implementation"
        CHECK -->|calls| SET_PRE["setAllowPrerelease()"]
        SET_PRE -->|then calls| SVC_CHECK["autoUpdaterService.checkForUpdates()"]
        DOWNLOAD -->|calls| SVC_DL["autoUpdaterService.downloadUpdate()"]
        QUIT -->|calls| SVC_QUIT["autoUpdaterService.quitAndInstall()"]
    end

    subgraph "Return Values"
        SVC_CHECK -->|returns| CHECK_RES["{success, updateInfo?, error?}"]
        SVC_DL -->|returns| DL_RES["{success, error?}"]
        SVC_QUIT -->|returns| VOID["void"]
    end
```

**Sources:** [tests/integration/autoUpdate.integration.test.ts:79-97](), [tests/integration/autoUpdate.integration.test.ts:130-169]()

### Status Broadcast Mechanism

The `createAutoUpdateStatusBroadcast()` function creates a pure emitter callback that forwards status updates to the renderer without requiring a `BrowserWindow` reference:

```typescript
// Pure emitter pattern - no window binding required
const statusBroadcast = createAutoUpdateStatusBroadcast()

// statusBroadcast forwards to ipcBridge.autoUpdate.status.emit
statusBroadcast({ status: 'checking' })
```

This callback is passed to `autoUpdaterService.initialize()` and called whenever an update event occurs.

**Sources:** [tests/integration/autoUpdate.integration.test.ts:99-128](), [tests/unit/autoUpdaterService.test.ts:383-398]()

---

## Update Flow

### Check for Updates

```mermaid
sequenceDiagram
    participant RENDERER as Renderer Process
    participant IPC as ipcBridge
    participant BRIDGE as updateBridge Handler
    participant SERVICE as autoUpdaterService
    participant UPDATER as electron-updater
    participant GITHUB as GitHub Releases

    RENDERER->>IPC: autoUpdate.check.invoke({includePrerelease: bool})
    IPC->>BRIDGE: check handler({includePrerelease})

    alt includePrerelease is true
        BRIDGE->>SERVICE: setAllowPrerelease(true)
        Note over SERVICE: Sets autoUpdater.allowPrerelease = true<br/>Sets autoUpdater.allowDowngrade = true
    else includePrerelease is false
        BRIDGE->>SERVICE: setAllowPrerelease(false)
        Note over SERVICE: Sets autoUpdater.allowPrerelease = false
    end

    BRIDGE->>SERVICE: checkForUpdates()

    alt Service not initialized
        SERVICE-->>BRIDGE: {success: false, error: 'not initialized'}
        BRIDGE-->>IPC: Error result
        IPC-->>RENDERER: Error result
    else Service initialized
        SERVICE->>UPDATER: autoUpdater.checkForUpdates()
        UPDATER->>GITHUB: Fetch latest.yml / latest-mac.yml / latest-linux.yml
        GITHUB-->>UPDATER: Update metadata

        alt Update available
            UPDATER->>SERVICE: 'update-available' event (updateInfo)
            SERVICE->>IPC: Emit status: 'available'
            UPDATER-->>SERVICE: UpdateCheckResult
            SERVICE-->>BRIDGE: {success: true, updateInfo}
        else No update available
            UPDATER->>SERVICE: 'update-not-available' event
            SERVICE->>IPC: Emit status: 'not-available'
            UPDATER-->>SERVICE: UpdateCheckResult
            SERVICE-->>BRIDGE: {success: true}
        else Error
            UPDATER->>SERVICE: 'error' event
            SERVICE->>IPC: Emit status: 'error'
            SERVICE-->>BRIDGE: {success: false, error}
        end

        BRIDGE-->>IPC: Result
        IPC-->>RENDERER: Result
    end
```

**Sources:** [tests/integration/autoUpdate.integration.test.ts:147-169](), [tests/unit/autoUpdaterService.test.ts:128-175]()

---

### Download Update

```mermaid
sequenceDiagram
    participant RENDERER as Renderer Process
    participant IPC as ipcBridge
    participant SERVICE as autoUpdaterService
    participant UPDATER as electron-updater
    participant GITHUB as GitHub Releases

    RENDERER->>IPC: autoUpdate.download.invoke()
    IPC->>SERVICE: downloadUpdate()

    alt Service not initialized
        SERVICE-->>IPC: {success: false, error: 'not initialized'}
        IPC-->>RENDERER: Error result
    else Service initialized
        SERVICE->>UPDATER: autoUpdater.downloadUpdate()
        UPDATER->>GITHUB: Download installer package

        loop Download progress
            GITHUB-->>UPDATER: Data chunks
            UPDATER->>SERVICE: 'download-progress' event
            Note over SERVICE: {bytesPerSecond, percent,<br/>transferred, total}
            SERVICE->>IPC: Emit status: 'downloading' + progress
            IPC->>RENDERER: Progress update
        end

        alt Download complete
            GITHUB-->>UPDATER: Complete package
            UPDATER->>SERVICE: 'update-downloaded' event (updateInfo)
            SERVICE->>IPC: Emit status: 'downloaded'
            UPDATER-->>SERVICE: Download result
            SERVICE-->>IPC: {success: true}
            IPC-->>RENDERER: Success result
        else Download error
            UPDATER->>SERVICE: 'error' event
            SERVICE->>IPC: Emit status: 'error'
            SERVICE-->>IPC: {success: false, error}
            IPC-->>RENDERER: Error result
        end
    end
```

**Sources:** [tests/unit/autoUpdaterService.test.ts:178-217](), [tests/unit/autoUpdaterService.test.ts:304-327]()

---

### Install Update

```mermaid
sequenceDiagram
    participant RENDERER as Renderer Process
    participant IPC as ipcBridge
    participant SERVICE as autoUpdaterService
    participant UPDATER as electron-updater
    participant APP as Electron App

    Note over RENDERER: User clicks "Restart and Install"
    RENDERER->>IPC: autoUpdate.quitAndInstall.invoke()
    IPC->>SERVICE: quitAndInstall()
    SERVICE->>UPDATER: autoUpdater.quitAndInstall(false, true)
    Note over UPDATER: Args: isSilent=false, isForceRunAfter=true
    UPDATER->>APP: Quit application
    Note over APP: App quits
    UPDATER->>APP: Install update
    Note over APP: Update installed
    UPDATER->>APP: Restart application
    Note over APP: App relaunches with new version
```

**Notes:**

- `quitAndInstall(false, true)` means: not silent (show installer UI), force run after installation
- On Windows, the NSIS installer runs and replaces application files
- On macOS, the DMG is mounted and the app bundle is replaced
- On Linux, the DEB/AppImage is installed

**Sources:** [tests/unit/autoUpdaterService.test.ts:219-225]()

---

## Event System

### Event Handling Architecture

The update system uses a dual event system:

1. **electron-updater events** - raw events from the library
2. **Internal EventEmitter3** - normalized status events for internal/external consumption

```mermaid
graph TB
    subgraph "electron-updater Event Source"
        E1["autoUpdater.on('checking-for-update')"]
        E2["autoUpdater.on('update-available')"]
        E3["autoUpdater.on('update-not-available')"]
        E4["autoUpdater.on('download-progress')"]
        E5["autoUpdater.on('update-downloaded')"]
        E6["autoUpdater.on('error')"]
    end

    subgraph "autoUpdaterService Event Handlers"
        H1["Handler: checking-for-update"]
        H2["Handler: update-available"]
        H3["Handler: update-not-available"]
        H4["Handler: download-progress"]
        H5["Handler: update-downloaded"]
        H6["Handler: error"]
    end

    subgraph "Normalized Status Events"
        N1["{status: 'checking'}"]
        N2["{status: 'available', version, releaseDate, releaseNotes}"]
        N3["{status: 'not-available'}"]
        N4["{status: 'downloading', progress}"]
        N5["{status: 'downloaded', version}"]
        N6["{status: 'error', error}"]
    end

    subgraph "Status Broadcast Targets"
        EMIT_INT["EventEmitter3<br/>.emit('update-status', status)"]
        EMIT_BRIDGE["statusBroadcastCallback(status)<br/>(forwarded to ipcBridge)"]
    end

    E1 -->|triggers| H1
    E2 -->|triggers| H2
    E3 -->|triggers| H3
    E4 -->|triggers| H4
    E5 -->|triggers| H5
    E6 -->|triggers| H6

    H1 -->|creates| N1
    H2 -->|creates| N2
    H3 -->|creates| N3
    H4 -->|creates| N4
    H5 -->|creates| N5
    H6 -->|creates| N6

    N1 -->|emits to| EMIT_INT
    N1 -->|broadcasts to| EMIT_BRIDGE

    N2 -->|emits to| EMIT_INT
    N2 -->|broadcasts to| EMIT_BRIDGE

    N3 -->|emits to| EMIT_INT
    N3 -->|broadcasts to| EMIT_BRIDGE

    N4 -->|emits to| EMIT_INT
    N4 -->|broadcasts to| EMIT_BRIDGE

    N5 -->|emits to| EMIT_INT
    N5 -->|broadcasts to| EMIT_BRIDGE

    N6 -->|emits to| EMIT_INT
    N6 -->|broadcasts to| EMIT_BRIDGE
```

**Sources:** [tests/unit/autoUpdaterService.test.ts:261-381](), [tests/integration/autoUpdate.integration.test.ts:207-237]()

---

### Status Event Schema

All status events follow this TypeScript interface pattern:

```typescript
type UpdateStatus =
  | { status: 'checking' }
  | {
      status: 'available'
      version: string
      releaseDate?: string
      releaseNotes?: string
    }
  | { status: 'not-available' }
  | {
      status: 'downloading'
      progress: {
        bytesPerSecond: number
        percent: number
        transferred: number
        total: number
      }
    }
  | { status: 'downloaded'; version: string }
  | { status: 'error'; error: string }
```

**Event Details:**

| Status          | Fields                                                   | Triggered By           | Description                         |
| --------------- | -------------------------------------------------------- | ---------------------- | ----------------------------------- |
| `checking`      | -                                                        | `checking-for-update`  | Update check in progress            |
| `available`     | `version`, `releaseDate?`, `releaseNotes?`               | `update-available`     | New version available for download  |
| `not-available` | -                                                        | `update-not-available` | Already on latest version           |
| `downloading`   | `progress.{bytesPerSecond, percent, transferred, total}` | `download-progress`    | Download in progress                |
| `downloaded`    | `version`                                                | `update-downloaded`    | Download complete, ready to install |
| `error`         | `error`                                                  | `error`                | Update operation failed             |

**Sources:** [tests/unit/autoUpdaterService.test.ts:262-355]()

---

## Update Channels

AionUi supports two update channels: **production** releases and **prerelease/dev** releases.

### Channel Configuration

```mermaid
graph TB
    subgraph "Update Channel Selection"
        USER_PREF["User Preference"]
        SERVICE["autoUpdaterService"]
        UPDATER["electron-updater config"]
    end

    subgraph "Channel Flags"
        ALLOW_PRE["allowPrerelease"]
        ALLOW_DOWN["allowDowngrade"]
    end

    subgraph "GitHub Release Types"
        PROD["Production Releases"]
        PREREL["Prerelease Releases"]
        DRAFT["Draft Releases"]
    end

    USER_PREF -->|includePrerelease: true| SERVICE
    USER_PREF -->|includePrerelease: false| SERVICE

    SERVICE -->|setAllowPrerelease(true)| ALLOW_PRE
    SERVICE -->|setAllowPrerelease(true)| ALLOW_DOWN

    ALLOW_PRE -->|"true"| UPDATER
    ALLOW_DOWN -->|"true (enables downgrades)"| UPDATER

    UPDATER -->|"allowPrerelease=false"| PROD
    UPDATER -->|"allowPrerelease=true"| PREREL

    Note_Draft["Draft releases are never<br/>included in update checks"]
    DRAFT -.->|excluded| Note_Draft
```

**Channel Behavior:**

| Channel        | `allowPrerelease` | `allowDowngrade` | Includes             | Typical Use Case                 |
| -------------- | ----------------- | ---------------- | -------------------- | -------------------------------- |
| **Production** | `false`           | `false`          | Stable releases only | Default for end users            |
| **Prerelease** | `true`            | `true`           | Prereleases + stable | Early access, testing dev builds |

**Notes:**

- `allowDowngrade` is set to `true` when prerelease is enabled to allow switching between dev builds
- Draft releases are excluded from both channels (only visible to maintainers)
- Users can switch channels by toggling `includePrerelease` in settings

**Sources:** [tests/unit/autoUpdaterService.test.ts:244-259](), [tests/integration/autoUpdate.integration.test.ts:147-169]()

---

### Release Tag Conventions

The build pipeline uses specific tag formats to distinguish channels:

| Tag Format                | Channel    | Description                     |
| ------------------------- | ---------- | ------------------------------- |
| `v{VERSION}`              | Production | Stable release (e.g., `v1.2.3`) |
| `v{VERSION}-dev-{COMMIT}` | Prerelease | Dev build tagged on dev branch  |

Example:

- `v1.0.0` → Production release
- `v1.0.1-dev-a1b2c3d` → Dev build from commit `a1b2c3d`

**Sources:** [.github/workflows/\_build-reusable.yml:556-566]()

---

## Build Integration

### Update Metadata Generation

The CI/CD pipeline generates platform-specific metadata files that `electron-updater` uses to check for updates:

| File               | Platform | Format | Purpose                                                     |
| ------------------ | -------- | ------ | ----------------------------------------------------------- |
| `latest.yml`       | Windows  | YAML   | Contains version, release date, file URLs, SHA512 checksums |
| `latest-mac.yml`   | macOS    | YAML   | Contains version, release date, file URLs, SHA512 checksums |
| `latest-linux.yml` | Linux    | YAML   | Contains version, release date, file URLs, SHA512 checksums |

**Generated by:** `electron-builder` automatically during the build process

**Uploaded to:** GitHub Releases alongside installer packages

**Contents Example (latest.yml):**

```yaml
version: 1.2.3
releaseDate: '2025-01-15T10:30:00.000Z'
files:
  - url: AionUi-Setup-1.2.3.exe
    sha512: abc123...
    size: 125829120
  - url: AionUi-1.2.3-win32-x64.zip
    sha512: def456...
    size: 98304000
path: AionUi-Setup-1.2.3.exe
sha512: abc123...
```

**Sources:** [.github/workflows/\_build-reusable.yml:532-543]()

---

### Artifact Upload Flow

```mermaid
graph TB
    subgraph "Build Phase"
        BUILD["electron-builder build"]
        OUT["out/ directory"]
        BUILD -->|produces| OUT
    end

    subgraph "Generated Artifacts"
        OUT -->|Windows| WIN_EXE["AionUi-Setup-{version}.exe"]
        OUT -->|Windows| WIN_ZIP["AionUi-{version}-win32-x64.zip"]
        OUT -->|Windows| WIN_YML["latest.yml"]
        OUT -->|Windows| WIN_MAP["latest.yml.blockmap"]

        OUT -->|macOS| MAC_DMG["AionUi-{version}-universal.dmg"]
        OUT -->|macOS| MAC_ZIP["AionUi-{version}-mac-universal.zip"]
        OUT -->|macOS| MAC_YML["latest-mac.yml"]

        OUT -->|Linux| LIN_DEB["AionUi-{version}-amd64.deb"]
        OUT -->|Linux| LIN_IMG["AionUi-{version}.AppImage"]
        OUT -->|Linux| LIN_YML["latest-linux.yml"]
    end

    subgraph "Upload to GitHub"
        ARTIFACTS["GitHub Actions Artifacts"]
        RELEASE["GitHub Release"]

        WIN_EXE -->|upload| ARTIFACTS
        WIN_ZIP -->|upload| ARTIFACTS
        WIN_YML -->|upload| ARTIFACTS
        WIN_MAP -->|upload| ARTIFACTS

        MAC_DMG -->|upload| ARTIFACTS
        MAC_ZIP -->|upload| ARTIFACTS
        MAC_YML -->|upload| ARTIFACTS

        LIN_DEB -->|upload| ARTIFACTS
        LIN_IMG -->|upload| ARTIFACTS
        LIN_YML -->|upload| ARTIFACTS

        ARTIFACTS -->|on tag push| RELEASE
    end

    subgraph "electron-updater Consumer"
        UPDATER["autoUpdater.checkForUpdates()"]
        FETCH["Fetch latest.yml from release"]
        COMPARE["Compare with current version"]

        RELEASE -->|provides| FETCH
        FETCH -->|parsed by| UPDATER
        UPDATER -->|performs| COMPARE
    end
```

**Sources:** [.github/workflows/\_build-reusable.yml:525-543]()

---

## Configuration

### electron-updater Settings

The `autoUpdaterService` configures `electron-updater` with these settings:

| Property               | Value          | Purpose                                        |
| ---------------------- | -------------- | ---------------------------------------------- |
| `autoDownload`         | `true`         | Automatically download updates after detection |
| `autoInstallOnAppQuit` | `true`         | Install updates when app quits                 |
| `allowPrerelease`      | Dynamic        | Controlled by `setAllowPrerelease()`           |
| `allowDowngrade`       | Dynamic        | Set to `true` when `allowPrerelease` is `true` |
| `logger`               | `electron-log` | Log update operations to file                  |

**Logger Configuration:**

```typescript
autoUpdater.logger = electronLog
autoUpdater.logger.transports.file.level = 'info'
```

Logs are written to:

- **macOS:** `~/Library/Logs/AionUi/main.log`
- **Windows:** `%USERPROFILE%\AppData\Roaming\AionUi\logs\main.log`
- **Linux:** `~/.config/AionUi/logs/main.log`

**Sources:** [tests/unit/autoUpdaterService.test.ts:18-34]()

---

## Testing

### Unit Tests

The `autoUpdaterService` has comprehensive unit tests covering:

- Initialization with/without status broadcast callback
- Check/download/install operations
- Event handling and status emission
- Prerelease channel configuration
- Error handling for non-Error exceptions
- Reset mechanisms for test isolation

**Test File:** [tests/unit/autoUpdaterService.test.ts]()

**Key Test Patterns:**

```typescript
// Testing event emission
autoUpdaterService.triggerEventForTest('update-available', { version: '2.0.0' })
expect(statusListener).toHaveBeenCalledWith({
  status: 'available',
  version: '2.0.0',
})

// Testing initialization idempotency
autoUpdaterService.initialize(mockBroadcast)
const firstCallCount = vi.mocked(autoUpdater.on).mock.calls.length
autoUpdaterService.initialize(mockBroadcast)
expect(vi.mocked(autoUpdater.on).mock.calls.length).toBe(firstCallCount)
```

**Sources:** [tests/unit/autoUpdaterService.test.ts]()

---

### Integration Tests

The integration test suite verifies the full IPC bridge wiring between renderer and service:

- IPC endpoint registration
- Status broadcast callback creation
- Handler invocation with correct parameters
- End-to-end event flow from `autoUpdater` → service → IPC → renderer

**Test File:** [tests/integration/autoUpdate.integration.test.ts]()

**Key Integration Test:**

```typescript
// Full chain test: autoUpdater event → service → ipcBridge → renderer
autoUpdaterService.initialize(createAutoUpdateStatusBroadcast())
autoUpdaterService.triggerEventForTest('update-available', { version: '2.0.0' })
expect(ipcBridge.autoUpdate.status.emit).toHaveBeenCalledWith({
  status: 'available',
  version: '2.0.0',
})
```

**Sources:** [tests/integration/autoUpdate.integration.test.ts:207-237]()

---

## Summary

The update system provides a robust, event-driven mechanism for keeping AionUi up-to-date:

1. **Service Layer:** `autoUpdaterService` wraps `electron-updater` with clean API and event handling
2. **IPC Bridge:** Three providers (check, download, quitAndInstall) + one emitter (status) for renderer communication
3. **Dual Event System:** Internal EventEmitter3 + status broadcast callback for flexible consumption
4. **Update Channels:** Production and prerelease channels controlled by `allowPrerelease` flag
5. **Build Integration:** CI/CD pipeline generates update metadata consumed by `electron-updater`
6. **Testing:** Comprehensive unit and integration tests ensure reliability

**Key Files:**

- Service: `src/process/services/autoUpdaterService.ts`
- Bridge: `src/process/bridge/updateBridge.ts`
- Initialization: [src/index.ts:418-433]()
- Tests: [tests/unit/autoUpdaterService.test.ts](), [tests/integration/autoUpdate.integration.test.ts]()
