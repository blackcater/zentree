# Application Modes

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

AionUi supports three distinct operational modes that determine how the application runs and what interfaces it exposes. Each mode serves a specific use case and follows different initialization paths.

This page documents the mode detection logic, configuration resolution, and initialization flow for each mode. For details on the Electron window management and system tray integration used in Desktop mode, see [Electron Framework](#3.2). For information on the Express server implementation used in WebUI mode, see [WebUI Server Architecture](#3.5).

---

## Mode Overview

AionUi determines its operational mode at startup based on command-line arguments. The three modes are mutually exclusive:

| Mode        | Trigger               | Primary Use Case              | Process Type         |
| ----------- | --------------------- | ----------------------------- | -------------------- |
| **Desktop** | Default (no flags)    | Standard GUI application      | Main + Renderer      |
| **WebUI**   | `--webui` flag        | Remote access via web browser | Main only (headless) |
| **CLI**     | `--resetpass` command | Password reset utility        | Main only (headless) |

The mode detection happens early in the application lifecycle, before the Electron `ready` event, to ensure proper Chromium configuration.

**Sources:** [src/index.ts:256-258]()

---

## Mode Detection and Selection

### Detection Logic

```mermaid
graph TB
    START["Application Start"]
    PARSE["Parse Command-Line Arguments<br/>(process.argv)"]

    CHECK_RESET{"--resetpass<br/>present?"}
    CHECK_WEBUI{"--webui<br/>present?"}

    MODE_CLI["isResetPasswordMode = true"]
    MODE_WEBUI["isWebUIMode = true"]
    MODE_DESKTOP["Desktop Mode<br/>(default)"]

    REMOTE_CHECK{"--remote<br/>present?"}
    SET_REMOTE["isRemoteMode = true"]

    START --> PARSE
    PARSE --> CHECK_RESET
    CHECK_RESET -->|Yes| MODE_CLI
    CHECK_RESET -->|No| CHECK_WEBUI
    CHECK_WEBUI -->|Yes| MODE_WEBUI
    CHECK_WEBUI -->|No| MODE_DESKTOP

    MODE_WEBUI --> REMOTE_CHECK
    REMOTE_CHECK -->|Yes| SET_REMOTE
    REMOTE_CHECK -->|No| MODE_WEBUI
```

**Mode Detection Implementation**

The mode is determined by scanning `process.argv` for specific flags:

- `isResetPasswordMode`: Detected by `hasCommand('--resetpass')` - exact match in argv
- `isWebUIMode`: Detected by `hasSwitch('webui')` - matches `--webui` with or without value
- `isRemoteMode`: Detected by `hasSwitch('remote')` - enables remote network access for WebUI

**Sources:** [src/index.ts:167-186](), [src/index.ts:256-258]()

---

## Desktop Mode

Desktop mode is the default operational mode, providing a standard Electron-based GUI application with a BrowserWindow and optional system tray integration.

### Desktop Mode Initialization Flow

```mermaid
sequenceDiagram
    participant App as "Electron app"
    participant Init as "initializeProcess()"
    participant ACP as "initializeAcpDetector()"
    participant Window as "createWindow()"
    participant Tray as "System Tray"
    participant Bridge as "IPC Bridge"

    App->>App: "app.whenReady()"
    App->>Init: "Initialize storage, config, agents"

    Note over ACP: "Pre-window initialization<br/>prevents SWR caching race"
    App->>ACP: "Detect available ACP CLIs"
    ACP-->>App: "Detection complete"

    App->>Window: "Create BrowserWindow"
    Window->>Window: "Calculate window size<br/>(80% of screen)"
    Window->>Window: "Load renderer HTML"
    Window->>Bridge: "Register IPC handlers"

    App->>Tray: "Load closeToTray setting"
    alt closeToTray enabled
        App->>Tray: "createOrUpdateTray()"
    end

    Window-->>App: "Window ready"
    App->>App: "Handle pending deep links"
```

### Window Creation

The `createWindow()` function creates a `BrowserWindow` with platform-specific titlebar configuration:

- **macOS**: Uses `titleBarStyle: 'hidden'` with traffic light positioning
- **Windows/Linux**: Uses frameless window (`frame: false`) with custom titlebar

Window dimensions are calculated as 80% of the primary display's work area to ensure visibility on high-resolution displays.

**Sources:** [src/index.ts:353-472](), [src/index.ts:575-618]()

### System Tray Integration

Desktop mode supports optional "close to tray" behavior:

1. Configuration loaded from `ConfigStorage` at `system.closeToTray`
2. If enabled, `createOrUpdateTray()` creates a system tray icon
3. Window close events are intercepted to hide instead of quit
4. Tray provides context menu for "Show Window" and "Quit"

**Sources:** [src/index.ts:264-351](), [src/index.ts:583-607]()

### ACP Detector Pre-initialization

Desktop mode initializes the ACP detector **before** creating the window to prevent a race condition:

```typescript
// Initialize ACP detector BEFORE creating the window to prevent a race
// condition where the renderer fetches getAvailableAgents before detection
// finishes, caching an empty result via SWR.
await initializeAcpDetector()

createWindow()
```

This ensures the renderer's SWR cache has valid ACP agent data when the window loads.

**Sources:** [src/index.ts:577-581]()

---

## WebUI Mode

WebUI mode runs AionUi as a headless web server, allowing remote access via a web browser. This mode is designed for deployment scenarios like Docker containers, Linux servers without a display, or remote development environments.

### WebUI Configuration Resolution

```mermaid
graph TB
    CLI["CLI Arguments<br/>--port, --webui-port"]
    ENV["Environment Variables<br/>AIONUI_PORT, PORT"]
    CONFIG["Configuration File<br/>webui.config.json"]
    DEFAULT["Default Value<br/>SERVER_CONFIG.DEFAULT_PORT"]

    RESOLVE_PORT["resolveWebUIPort()"]
    RESOLVE_REMOTE["resolveRemoteAccess()"]

    CLI -->|"Highest priority"| RESOLVE_PORT
    ENV -->|"Medium priority"| RESOLVE_PORT
    CONFIG -->|"Low priority"| RESOLVE_PORT
    DEFAULT -->|"Fallback"| RESOLVE_PORT

    ENV_REMOTE["AIONUI_ALLOW_REMOTE<br/>AIONUI_REMOTE"]
    ENV_HOST["AIONUI_HOST<br/>(0.0.0.0 / ::)"]
    CONFIG_REMOTE["config.allowRemote"]
    REMOTE_FLAG["--remote flag"]

    ENV_REMOTE -->|"Priority 1"| RESOLVE_REMOTE
    ENV_HOST -->|"Priority 2"| RESOLVE_REMOTE
    CONFIG_REMOTE -->|"Priority 3"| RESOLVE_REMOTE
    REMOTE_FLAG -->|"Priority 4"| RESOLVE_REMOTE

    RESOLVE_PORT --> PORT_VAL["Final Port Number"]
    RESOLVE_REMOTE --> REMOTE_VAL["allowRemote: boolean"]
```

### Configuration File Structure

The `webui.config.json` file is stored in the application's `userData` directory:

```typescript
interface WebUIUserConfig {
  port?: number | string
  allowRemote?: boolean
}
```

**Configuration Priority (highest to lowest):**

1. **CLI Arguments**: `--port=8080` or `--webui-port=8080`
2. **Environment Variables**: `AIONUI_PORT` or `PORT`
3. **Configuration File**: `webui.config.json` in userData directory
4. **Default**: `SERVER_CONFIG.DEFAULT_PORT`

**Sources:** [src/index.ts:188-237]()

### Remote Access Resolution

Remote access determines whether the server binds to `0.0.0.0` (allowing external connections) or `127.0.0.1` (localhost only):

```typescript
const resolveRemoteAccess = (config: WebUIUserConfig): boolean => {
  const envRemote = parseBooleanEnv(
    process.env.AIONUI_ALLOW_REMOTE || process.env.AIONUI_REMOTE
  )
  const hostHint = process.env.AIONUI_HOST?.trim()
  const hostRequestsRemote = hostHint
    ? ['0.0.0.0', '::', '::0'].includes(hostHint)
    : false
  const configRemote = config.allowRemote === true

  return (
    isRemoteMode || hostRequestsRemote || envRemote === true || configRemote
  )
}
```

**Sources:** [src/index.ts:247-254]()

### WebUI Mode Initialization Flow

```mermaid
sequenceDiagram
    participant App as "app.whenReady()"
    participant Init as "initializeProcess()"
    participant Config as "loadUserWebUIConfig()"
    participant Resolve as "Configuration Resolution"
    participant Server as "startWebServer()"
    participant ACP as "initializeAcpDetector()"
    participant Quit as "Quit Prevention"

    App->>Init: "Initialize storage, agents"
    Init-->>App: "Complete"

    App->>Config: "Load webui.config.json"
    Config-->>App: "Return { config, exists }"

    App->>Resolve: "resolveWebUIPort(config)"
    Resolve-->>App: "Final port number"

    App->>Resolve: "resolveRemoteAccess(config)"
    Resolve-->>App: "allowRemote boolean"

    App->>Server: "startWebServer(port, allowRemote)"
    Note over Server: "Creates Express server<br/>Configures routes<br/>Starts listening"
    Server-->>App: "Server running"

    Note over ACP: "Initialize after server<br/>for remote agent access"
    App->>ACP: "initializeAcpDetector()"
    ACP-->>App: "Detection complete"

    App->>Quit: "Register will-quit handler"
    Note over Quit: "Prevents unexpected exit<br/>when no windows exist"
```

**Sources:** [src/index.ts:556-623]()

### Quit Prevention in WebUI Mode

WebUI mode prevents automatic application exit when running headless on Linux:

```typescript
// Keep the process alive in WebUI mode by preventing default quit behavior.
// On Linux headless (systemd), Electron may attempt to quit when no windows exist.
app.on('will-quit', (event) => {
  // Only prevent quit if this is an unexpected exit (server still running).
  // Explicit app.exit() calls bypass will-quit, so they are unaffected.
  if (!isExplicitQuit) {
    event.preventDefault()
    console.warn('[WebUI] Prevented unexpected quit — server is still running')
  }
})
```

The `isExplicitQuit` flag is set in the `before-quit` event handler to distinguish intentional shutdowns from unexpected exit attempts.

**Sources:** [src/index.ts:260-261](), [src/index.ts:567-574](), [src/index.ts:728-730]()

---

## CLI Mode (Password Reset)

CLI mode provides a command-line utility for resetting user passwords. This mode runs headless, performs the password reset operation, and exits.

### CLI Mode Flow

```mermaid
graph TB
    START["Application Start"]
    DETECT["Detect --resetpass flag"]
    READY["app.whenReady()"]
    INIT["initializeProcess()"]

    PARSE_ARGS["Parse username argument"]
    DEFAULT["Default to 'admin'"]

    IMPORT["import resetPasswordCLI"]
    EXECUTE["resetPasswordCLI(username)"]

    SUCCESS["Password reset successful"]
    FAILURE["Password reset failed"]

    QUIT_SUCCESS["app.quit() - exit 0"]
    QUIT_FAILURE["app.exit(1)"]

    START --> DETECT
    DETECT --> READY
    READY --> INIT
    INIT --> PARSE_ARGS

    PARSE_ARGS --> DEFAULT
    DEFAULT --> IMPORT
    IMPORT --> EXECUTE

    EXECUTE -->|Success| SUCCESS
    EXECUTE -->|Error| FAILURE

    SUCCESS --> QUIT_SUCCESS
    FAILURE --> QUIT_FAILURE
```

### Username Argument Parsing

The username is extracted from command-line arguments after the `--resetpass` flag:

```typescript
// Get username argument, filtering out flags (--xxx)
const resetPasswordIndex = process.argv.indexOf('--resetpass')
const argsAfterCommand = process.argv.slice(resetPasswordIndex + 1)
const username =
  argsAfterCommand.find((arg) => !arg.startsWith('--')) || 'admin'
```

**Example usage:**

```bash
# Reset password for 'admin' (default)
aionui --resetpass

# Reset password for specific user
aionui --resetpass john.doe
```

**Sources:** [src/index.ts:539-555](), [src/index.ts:542-546]()

---

## Chromium Configuration by Mode

Different modes require different Chromium configurations, particularly for headless operation.

### Configuration Matrix

```mermaid
graph TB
    subgraph "Mode Detection"
        IS_WEBUI["isWebUI = hasSwitch('webui')"]
        IS_RESET["isResetPassword = includes('--resetpass')"]
    end

    subgraph "Platform Detection"
        IS_LINUX{"platform === 'linux'"}
        NO_DISPLAY{"!process.env.DISPLAY"}
        IS_ROOT{"getuid() === 0"}
    end

    subgraph "Chromium Flags"
        OZONE["--ozone-platform=headless"]
        DISABLE_GPU["--disable-gpu"]
        DISABLE_SW["--disable-software-rasterizer"]
        NO_SANDBOX["--no-sandbox"]
    end

    IS_WEBUI --> IS_LINUX
    IS_RESET --> IS_LINUX

    IS_LINUX -->|Yes| NO_DISPLAY
    NO_DISPLAY -->|Yes| OZONE
    OZONE --> DISABLE_GPU
    DISABLE_GPU --> DISABLE_SW

    IS_LINUX -->|Yes| IS_ROOT
    IS_ROOT -->|Yes| NO_SANDBOX
```

### Headless Configuration for Linux

When running in WebUI or CLI mode on Linux without a display server:

```typescript
// For Linux without DISPLAY, use headless Ozone platform
if (process.platform === 'linux' && !process.env.DISPLAY) {
  app.commandLine.appendSwitch('ozone-platform', 'headless')
  app.commandLine.appendSwitch('disable-gpu')
  app.commandLine.appendSwitch('disable-software-rasterizer')
}
```

**Important:** The code uses `--ozone-platform=headless` instead of `--headless` because:

- `--headless`: Browser automation mode that causes auto-exit
- `--ozone-platform=headless`: Provides a display backend without requiring a display server, keeping the process alive

**Sources:** [src/utils/configureChromium.ts:16-38]()

### Root User Sandbox Disabling

When running as root (UID 0), the sandbox is disabled to prevent crashes:

```typescript
// For root user, disable sandbox to prevent crash
if (typeof process.getuid === 'function' && process.getuid() === 0) {
  app.commandLine.appendSwitch('no-sandbox')
}
```

**Sources:** [src/utils/configureChromium.ts:33-37]()

---

## Single Instance Lock

AionUi enforces single-instance behavior across all modes using `app.requestSingleInstanceLock()`:

```mermaid
sequenceDiagram
    participant First as "First Instance"
    participant Lock as "Single Instance Lock"
    participant Second as "Second Instance"
    participant DeepLink as "Deep Link Handler"

    First->>Lock: "requestSingleInstanceLock({ deepLinkUrl })"
    Lock-->>First: "true (lock acquired)"
    First->>First: "Continue initialization"

    Second->>Lock: "requestSingleInstanceLock({ deepLinkUrl })"
    Lock-->>Second: "false (lock denied)"
    Second->>Second: "app.quit()"

    Note over Lock: "Before quitting, sends data to first instance"
    Lock->>First: "second-instance event<br/>(argv, additionalData)"
    First->>DeepLink: "Extract deepLinkUrl"
    DeepLink->>First: "handleDeepLinkUrl(url)"
    First->>First: "Focus existing window"
```

**Lock Acquisition Flow:**

1. First instance requests lock with `additionalData: { deepLinkUrl }`
2. Lock is acquired, application continues normally
3. Second instance attempts to launch (e.g., user clicks a protocol link)
4. Second instance requests lock but is denied
5. Second instance's `additionalData` is sent to first instance via `second-instance` event
6. Second instance calls `app.quit()`
7. First instance receives deep link data and focuses its window

**Sources:** [src/index.ts:95-116]()

---

## Mode-Specific Features

| Feature            | Desktop | WebUI           | CLI             |
| ------------------ | ------- | --------------- | --------------- |
| BrowserWindow      | ✓       | ✗               | ✗               |
| System Tray        | ✓       | ✗               | ✗               |
| Deep Link Handling | ✓       | ✗               | ✗               |
| Express Server     | ✗       | ✓               | ✗               |
| Remote Access      | ✗       | ✓ (optional)    | ✗               |
| Auto-Update        | ✓       | ✓               | ✗               |
| ACP Detection      | ✓       | ✓               | ✗               |
| Password Reset     | ✗       | ✗               | ✓               |
| Headless Chromium  | ✗       | ✓ (Linux)       | ✓ (Linux)       |
| Sandbox Disabled   | ✗       | ✗ (unless root) | ✗ (unless root) |

**Sources:** [src/index.ts:514-665]()

---

## Environment Variables Summary

The following environment variables affect mode behavior:

| Variable              | Mode      | Purpose                                                        |
| --------------------- | --------- | -------------------------------------------------------------- |
| `AIONUI_PORT`         | WebUI     | Override server port                                           |
| `PORT`                | WebUI     | Fallback port variable                                         |
| `AIONUI_ALLOW_REMOTE` | WebUI     | Enable remote access (true/false)                              |
| `AIONUI_REMOTE`       | WebUI     | Alias for AIONUI_ALLOW_REMOTE                                  |
| `AIONUI_HOST`         | WebUI     | Bind host (0.0.0.0 enables remote)                             |
| `DISPLAY`             | WebUI/CLI | Linux display server (triggers headless if unset)              |
| `AIONUI_CDP_PORT`     | All       | Chrome DevTools Protocol port (see [Electron Framework](#3.2)) |

**Sources:** [src/index.ts:226-254](), [src/utils/configureChromium.ts:223-230]()
