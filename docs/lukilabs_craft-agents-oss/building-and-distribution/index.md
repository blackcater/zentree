# Building & Distribution

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [apps/electron/electron-builder.yml](apps/electron/electron-builder.yml)
- [apps/electron/package.json](apps/electron/package.json)

</details>

This page covers how to produce distributable builds of the Craft Agents Electron application — from compiling source into artifacts to packaging them for end-user delivery on macOS, Windows, and Linux. It focuses on the top-level scripts and the overall pipeline.

For details specific to each platform, see [Platform-Specific Builds](#6.1). For the `electron-builder.yml` configuration and asset bundling details, see [Electron Packaging](#6.2). For the auto-update mechanism that consumes built artifacts, see [Self-Update System](#6.3). For the underlying Vite and esbuild compilation steps, see [Build System](#5.2).

---

## Build Pipeline Overview

The full build for the Electron application is defined in [`apps/electron/package.json`](apps/electron/package.json). It consists of two phases: **compilation** and **distribution packaging**.

**Compilation** converts TypeScript source into four `dist/` artifacts, copies resources, and validates them. **Distribution packaging** invokes `electron-builder` (via platform-specific wrapper scripts) to produce a signed, installable artifact.

**Build Pipeline — Script to Output Mapping**

```mermaid
flowchart TD
    build["\"build (npm run build)\""]
    buildwin["\"build:win (Windows variant)\""]

    lint["\"lint\
(eslint src/)\""]
    buildmain["\"build:main\
(esbuild)\""]
    buildmainwin["\"build:main:win\
(esbuild, no env vars)\""]
    buildpreload["\"build:preload\
(esbuild)\""]
    buildtoolbar["\"build:preload-toolbar\
(esbuild)\""]
    buildinterceptor["\"build:interceptor\
(esbuild)\""]
    buildrenderer["\"build:renderer\
(vite build)\""]
    buildcopy["\"build:copy\
(scripts/copy-assets.ts)\""]
    buildvalidate["\"build:validate\
(scripts/validate-assets.ts)\""]

    maincjs["\"dist/main.cjs\""]
    preloadcjs["\"dist/preload.cjs\""]
    toolbarcjs["\"dist/browser-toolbar-preload.cjs\""]
    interceptorcjs["\"dist/interceptor.cjs\""]
    rendererdist["\"dist/renderer/\""]
    resources["\"dist/resources/ (docs, themes, icons)\""]

    build --> lint
    build --> buildmain --> maincjs
    build --> buildpreload --> preloadcjs
    build --> buildtoolbar --> toolbarcjs
    build --> buildinterceptor --> interceptorcjs
    build --> buildrenderer --> rendererdist
    build --> buildcopy --> resources
    build --> buildvalidate

    buildwin --> buildmainwin --> maincjs
    buildwin --> buildpreload
    buildwin --> buildtoolbar
    buildwin --> buildinterceptor
    buildwin --> buildrenderer
    buildwin --> buildcopy
    buildwin --> buildvalidate
```

Sources: [apps/electron/package.json:17-37]()

---

## OAuth Credential Injection

The macOS/Linux `build:main` script injects OAuth credentials as compile-time constants via esbuild `--define` flags. The Windows variant (`build:main:win`) omits this because environment variables are injected differently in the PowerShell wrapper.

| Script           | OAuth Injection                                | Source                            |
| ---------------- | ---------------------------------------------- | --------------------------------- |
| `build:main`     | `source ../../.env` + `--define:process.env.*` | [apps/electron/package.json:18]() |
| `build:main:win` | None (handled by `build-win.ps1`)              | [apps/electron/package.json:19]() |

Credentials injected at build time:

- `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET`
- `SLACK_OAUTH_CLIENT_ID` / `SLACK_OAUTH_CLIENT_SECRET`
- `MICROSOFT_OAUTH_CLIENT_ID`

Sources: [apps/electron/package.json:18-19]()

---

## Distribution Targets

**Platform Distribution Script and Artifact Summary**

```mermaid
flowchart LR
    distmac["\"dist:mac\
(package.json)\""]
    distmacx64["\"dist:mac:x64\
(package.json)\""]
    distwin["\"dist:win\
(package.json)\""]

    builddmg_arm["\"scripts/build-dmg.sh arm64\""]
    builddmg_x64["\"scripts/build-dmg.sh x64\""]
    buildwinps["\"scripts/build-win.ps1\""]

    eb["\"electron-builder\
(electron-builder.yml)\""]

    dmg_arm["\"release/Craft-Agent-arm64.dmg\
release/Craft-Agent-arm64.zip\""]
    dmg_x64["\"release/Craft-Agent-x64.dmg\
release/Craft-Agent-x64.zip\""]
    exe_x64["\"release/Craft-Agent-x64.exe\
(NSIS installer)\""]
    appimage["\"release/Craft-Agent-x64.AppImage\""]

    distmac --> builddmg_arm --> eb --> dmg_arm
    distmacx64 --> builddmg_x64 --> eb --> dmg_x64
    distwin --> buildwinps --> eb --> exe_x64
    eb --> appimage
```

Sources: [apps/electron/package.json:32-34](), [apps/electron/electron-builder.yml:81-219]()

### Platform Targets at a Glance

| Platform              | Script                              | Installer Format | Architecture | Output File                |
| --------------------- | ----------------------------------- | ---------------- | ------------ | -------------------------- |
| macOS (Apple Silicon) | `dist:mac` → `build-dmg.sh arm64`   | DMG + ZIP        | arm64        | `Craft-Agent-arm64.dmg`    |
| macOS (Intel)         | `dist:mac:x64` → `build-dmg.sh x64` | DMG + ZIP        | x64          | `Craft-Agent-x64.dmg`      |
| Windows               | `dist:win` → `build-win.ps1`        | NSIS (one-click) | x64          | `Craft-Agent-x64.exe`      |
| Linux                 | (direct electron-builder)           | AppImage         | x64          | `Craft-Agent-x64.AppImage` |

Sources: [apps/electron/electron-builder.yml:81-219]()

---

## Bundled Vendor Binaries

The build bundles several platform-native binaries into `vendor/` and `resources/bin/`. Each platform build excludes binaries for other platforms.

| Binary          | Location                                                        | Purpose                                  |
| --------------- | --------------------------------------------------------------- | ---------------------------------------- |
| Bun runtime     | `vendor/bun/`                                                   | JavaScript runtime for MCP servers       |
| Codex           | `vendor/codex/`                                                 | Codex agent binary                       |
| Copilot CLI     | `vendor/copilot/`                                               | GitHub Copilot CLI                       |
| `uv` (Python)   | `resources/bin/<platform>/`                                     | Python package manager for tool scripts  |
| CLI wrappers    | `resources/bin/`                                                | Shell + `.cmd` wrappers for tool scripts |
| MCP servers     | `resources/bridge-mcp-server/`, `resources/session-mcp-server/` | Bundled MCP server processes             |
| Pi agent server | `resources/pi-agent-server/`                                    | Pi SDK subprocess                        |

The `@anthropic-ai/claude-agent-sdk` package is included via `extraResources` on all platforms to work around the electron-builder automatic `node_modules` exclusion, with platform-specific ripgrep binary filtering applied per target.

Sources: [apps/electron/electron-builder.yml:14-68](), [apps/electron/electron-builder.yml:101-115](), [apps/electron/electron-builder.yml:170-186]()

---

## Key Configuration Values

These values from `electron-builder.yml` affect the installed application identity and update behavior:

| Key                | Value                                              |
| ------------------ | -------------------------------------------------- |
| `appId`            | `com.lukilabs.craft-agent`                         |
| `productName`      | `Craft Agents`                                     |
| `electronVersion`  | `39.2.7`                                           |
| `asar`             | `false` (disabled to avoid decompression overhead) |
| `output` directory | `release/`                                         |
| `publish.url`      | `https://agents.craft.do/electron/latest`          |
| `nsis.perMachine`  | `false` (installs to `%LOCALAPPDATA%\Programs\`)   |

The `publish.url` is consumed by `electron-updater` at runtime to check for new releases. See [Self-Update System](#6.3) for details.

Sources: [apps/electron/electron-builder.yml:1-8](), [apps/electron/electron-builder.yml:73-79](), [apps/electron/electron-builder.yml:188-193]()

---

## macOS Code Signing and Notarization

The `mac` section of `electron-builder.yml` enables hardened runtime and references entitlements:

- `hardenedRuntime: true`
- `gatekeeperAssess: false`
- `entitlements: build/entitlements.mac.plist`
- `entitlementsInherit: build/entitlements.mac.plist`

Notarization is commented out by default. To enable it, set `CSC_LINK`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and `APPLE_TEAM_ID` and uncomment the `notarize` block.

An `afterPack` hook at `scripts/afterPack.cjs` runs after packaging to compile the macOS 26+ Liquid Glass icon using `actool`, targeting the `AppIcon` asset catalog entry. The `CFBundleIconName: AppIcon` key is set via `extendInfo`.

Sources: [apps/electron/electron-builder.yml:81-123]()

---

## Windows NSIS Installer Behavior

The Windows NSIS installer is configured as a one-click, per-user installer:

- **One-click**: No UI shown during install.
- **Per-user**: Installs to `%LOCALAPPDATA%\Programs\` rather than `Program Files`. This is required because Bun subprocesses cannot read/write files under `Program Files` due to Windows permission restrictions.
- **Uninstall**: `deleteAppDataOnUninstall: true` removes app data on uninstall.

Additionally, `vendor/bun`, `vendor/codex`, `vendor/copilot`, and `resources/bin/win32-x64` are moved from `files` to `extraResources` on Windows to avoid an electron-builder EBUSY error caused by the npm module collector locking `.exe` files while simultaneously trying to copy them.

Sources: [apps/electron/electron-builder.yml:144-186]()
