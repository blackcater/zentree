# Electron Framework

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

This page covers how AionUi uses Electron: the main process entry point, window creation, `BrowserWindow` configuration, app lifecycle events, and the split between the main and renderer processes. For information about inter-process communication between the main and renderer, see [3.3](#3.3). For the WebUI server that replaces the window in headless mode, see [3.5](#3.5). For build packaging configuration, see [11](#11).

---

## Process Architecture

AionUi follows the standard Electron three-process model.

**App Entry Point: BrowserWindow and Process Architecture**

```mermaid
graph TD
  pkg["package.json\
main: ./out/main/index.js"]
  main["src/index.ts\
(main process)"]
  preload["out/preload/index.js\
(preload script)"]
  renderer["out/renderer/index.html\
(React renderer)"]

  pkg --> main
  main -->|"new BrowserWindow(webPreferences.preload)"| preload
  main -->|"loadFile / loadURL"| renderer
  preload -->|"contextBridge / ipcRenderer"| renderer
  renderer -->|"ipcBridge invoke/on"| preload
  preload -->|"ipcMain channels"| main
```

| Layer          | Source          | Output                    | Role                                      |
| -------------- | --------------- | ------------------------- | ----------------------------------------- |
| Main process   | `src/index.ts`  | `out/main/index.js`       | App lifecycle, native APIs, IPC providers |
| Preload script | `src/preload/`  | `out/preload/index.js`    | Secure bridge between renderer and main   |
| Renderer       | `src/renderer/` | `out/renderer/index.html` | React UI, runs in Chromium                |

Sources: [src/index.ts:1-20](), [package.json:6-6](), [electron-builder.yml:13-17]()

---

## Application Lifecycle

The lifecycle is controlled entirely from `src/index.ts`. The central async function `handleAppReady` runs after `app.whenReady()` resolves and forks into three modes based on CLI flags.

**`handleAppReady` Flow with Code Entities**

```mermaid
flowchart TD
  ready["app.whenReady()"]
  handle["handleAppReady()"]
  initProc["initializeProcess()"]

  modeCheck{"Mode flags"}
  resetpass["isResetPasswordMode\
--resetpass flag"]
  webui["isWebUIMode\
--webui flag"]
  desktop["default (GUI mode)"]

  resetpassFn["resetPasswordCLI(username)\
then app.quit()"]
  webuiFn["startWebServer(resolvedPort, allowRemote)"]
  createWin["createWindow()"]

  postInit["initializeAcpDetector()\
loadShellEnvironmentAsync()\
powerMonitor.on('resume', ...)"]

  ready --> handle
  handle --> initProc
  initProc --> modeCheck
  modeCheck --> resetpass --> resetpassFn
  modeCheck --> webui --> webuiFn
  modeCheck --> desktop --> createWin
  resetpassFn -.->|"skipped"| postInit
  webuiFn --> postInit
  createWin --> postInit
```

Sources: [src/index.ts:268-340]()

### CLI Flag Parsing

Two helpers parse flags from both `process.argv` and `app.commandLine`:

- `hasSwitch(flag)` — checks for `--flag` in argv or via `app.commandLine.hasSwitch`
- `getSwitchValue(flag)` — reads `--flag=value` or `--flag value` form

[src/index.ts:75-93]()

The three mode flags derived from these helpers:

| Variable              | Flag          | Effect                                       |
| --------------------- | ------------- | -------------------------------------------- |
| `isWebUIMode`         | `--webui`     | Starts Express+WS server instead of a window |
| `isRemoteMode`        | `--remote`    | Binds server to `0.0.0.0`                    |
| `isResetPasswordMode` | `--resetpass` | Runs `resetPasswordCLI` then quits           |

Sources: [src/index.ts:164-166]()

---

## Window Creation

`createWindow()` is called only in standard GUI mode. It creates a single `BrowserWindow` named `mainWindow`.

**`createWindow()` — Key Calls and Side Effects**

```mermaid
sequenceDiagram
  participant main as "src/index.ts"
  participant screen as "electron.screen"
  participant BW as "BrowserWindow"
  participant adapter as "initMainAdapterWithWindow"
  participant menu as "setupApplicationMenu"
  participant zoom as "applyZoomToWindow"
  participant wmaxl as "registerWindowMaximizeListeners"
  participant updater as "autoUpdaterService.initialize"

  main->>screen: "getPrimaryDisplay().workAreaSize"
  screen-->>main: "screenWidth, screenHeight"
  main->>BW: "new BrowserWindow({width: 80%, height: 80%, ...})"
  BW-->>main: "mainWindow"
  main->>adapter: "initMainAdapterWithWindow(mainWindow)"
  main->>menu: "setupApplicationMenu()"
  main->>zoom: "applyZoomToWindow(mainWindow)"
  main->>wmaxl: "registerWindowMaximizeListeners(mainWindow)"
  main->>updater: "dynamic import + initialize(statusBroadcast)"
```

Sources: [src/index.ts:170-256]()

### `BrowserWindow` Configuration

```mermaid
graph LR
  bw["BrowserWindow config"]
  size["width: screenWidth × 0.8\
height: screenHeight × 0.8"]
  menu["autoHideMenuBar: true"]
  mac["macOS:\
titleBarStyle: hidden\
trafficLightPosition: x=10 y=10"]
  other["Windows / Linux:\
frame: false"]
  wp["webPreferences"]
  preload["preload: out/preload/index.js"]
  wv["webviewTag: true"]

  bw --> size
  bw --> menu
  bw --> mac
  bw --> other
  bw --> wp
  wp --> preload
  wp --> wv
```

| Property                | Value                                            | Reason                                                 |
| ----------------------- | ------------------------------------------------ | ------------------------------------------------------ |
| `width` / `height`      | 80% of `screen.getPrimaryDisplay().workAreaSize` | Comfortable default on high-DPI displays               |
| `autoHideMenuBar`       | `true`                                           | Cleaner look; menu accessible via Alt key              |
| `titleBarStyle` (macOS) | `'hidden'`                                       | Custom title bar with traffic lights at `{x:10, y:10}` |
| `frame` (Windows/Linux) | `false`                                          | Custom frameless window                                |
| `webviewTag`            | `true`                                           | Required for the HTML preview panel                    |
| `preload`               | `path.join(__dirname, '../preload/index.js')`    | Exposes `ipcBridge` safely to renderer                 |

Sources: [src/index.ts:197-214]()

---

## URL Loading — Development vs Production

After the window is created, the renderer content is loaded differently depending on whether the app is packaged:

```mermaid
flowchart LR
  check{"app.isPackaged &&\
ELECTRON_RENDERER_URL"}
  dev["mainWindow.loadURL(\
  process.env.ELECTRON_RENDERER_URL\
)"]
  prod["mainWindow.loadFile(\
  out/renderer/index.html\
)"]
  devtools["mainWindow.webContents.openDevTools()\
(dev only)"]

  check -->|"dev"| dev --> devtools
  check -->|"production"| prod
```

- In development, `electron-vite dev` injects `ELECTRON_RENDERER_URL` pointing to the Vite HMR server.
- In production, `loadFile` reads from the built `out/renderer/index.html`.
- DevTools are opened automatically only when `!app.isPackaged`.

Sources: [src/index.ts:241-256]()

---

## App Lifecycle Events

Three global `app` events are registered in `src/index.ts`:

| Event               | Handler behavior                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------ |
| `window-all-closed` | Calls `app.quit()` on non-macOS, unless `isWebUIMode` is active (server must keep running) |
| `activate`          | Re-creates the window on macOS if no windows are open and not in WebUI mode                |
| `before-quit`       | Calls `WorkerManage.clear()` to stop AI workers; calls `getChannelManager().shutdown()`    |

[src/index.ts:354-380]()

A `powerMonitor.on('resume', ...)` handler is also registered after `handleAppReady` to trigger cron recovery when the system wakes from sleep. See [4.8](#4.8) for cron details.

---

## Global Error Handling

Two Node.js process-level handlers are registered to prevent Electron from showing its default crash dialog:

- `process.on('uncaughtException', ...)` — suppresses the Electron error dialog in production
- `process.on('unhandledRejection', ...)` — catches unhandled Promise rejections

[src/index.ts:60-73]()

---

## PATH Correction (macOS / Linux)

GUI apps launched from a dock or file manager on macOS and Linux inherit a limited `PATH` that excludes shell-initialized entries (`.bashrc`, `.zshrc`). AionUi corrects this with two steps:

1. `fixPath()` from the `fix-path` package — sourced from the login shell
2. Manual NVM path injection — reads `NVM_DIR/versions/node/*/bin` and prepends missing paths

This ensures that AI agent subprocesses spawned from the main process (e.g., `gemini`, `claude`) can be found on `PATH`.

[src/index.ts:28-49]()

---

## Windows Installer Startup Handling

```ts
import electronSquirrelStartup from 'electron-squirrel-startup'
if (electronSquirrelStartup) {
  app.quit()
}
```

`electron-squirrel-startup` handles Squirrel events during Windows installation and uninstallation (creating/removing shortcuts). When these events are active, the app quits immediately without initializing anything.

[src/index.ts:52-54]()

---

## Auto-Updater Initialization

The auto-updater is initialized inside `createWindow()` using a dynamic import to avoid loading it until a window exists. The sequence:

1. Dynamic imports of `autoUpdaterService` and `createAutoUpdateStatusBroadcast`
2. `createAutoUpdateStatusBroadcast()` creates a pure emitter callback that calls `ipcBridge.autoUpdate.status.emit`
3. `autoUpdaterService.initialize(statusBroadcast)` wires the callback
4. After a 3-second delay, `autoUpdaterService.checkForUpdatesAndNotify()` runs

The `AutoUpdaterService` class (in `src/process/services/autoUpdaterService.ts`) wraps `electron-updater`'s `autoUpdater` singleton. `autoDownload` is disabled so the user explicitly controls when the download begins.

For full update UI and IPC detail, see [14](#14).

Sources: [src/index.ts:222-236](), [src/process/services/autoUpdaterService.ts:42-51]()

---

## IPC Bridge Registration at Window Level

One IPC provider is registered directly in `src/index.ts` rather than in the `process/bridge` directory — the `openDevTools` provider:

```
ipcBridge.application.openDevTools.provider(() => {
  mainWindow.webContents.openDevTools();
  return Promise.resolve();
});
```

This is done here rather than in a bridge module because it needs direct access to the `mainWindow` reference. All other IPC providers are initialized inside `initializeProcess()`. See [3.3](#3.3) for the full ipcBridge reference.

[src/index.ts:261-266]()

---

## Packaging Configuration Summary

`electron-builder.yml` controls how the compiled output is packaged into distributable installers.

| Setting              | Value                                          |
| -------------------- | ---------------------------------------------- |
| `appId`              | `com.aionui.app`                               |
| `productName`        | `AionUi`                                       |
| `directories.output` | `out/`                                         |
| `asar.smartUnpack`   | `true`                                         |
| macOS targets        | `dmg`, `zip`                                   |
| Windows targets      | `nsis`, `zip`                                  |
| Linux targets        | `deb`, `AppImage` (x64 + arm64)                |
| `afterPack` hook     | `scripts/afterPack.js` (native module rebuild) |
| `afterSign` hook     | `scripts/afterSign.js` (macOS notarization)    |
| `publish.provider`   | `github` (iOfficeAI/AionUi)                    |

Native modules (`better-sqlite3`, `bcrypt`, `node-pty`) are listed under `asarUnpack` so they remain on disk as real files instead of being embedded in the asar archive — required because they are `.node` binaries that must be loaded by path.

Sources: [electron-builder.yml:1-210]()
