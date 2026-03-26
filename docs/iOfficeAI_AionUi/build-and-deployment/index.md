# Build & Deployment

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [.github/workflows/build-and-release.yml](.github/workflows/build-and-release.yml)
- [electron-builder.yml](electron-builder.yml)
- [package.json](package.json)
- [resources/windows-installer-arm64.nsh](resources/windows-installer-arm64.nsh)
- [resources/windows-installer-x64.nsh](resources/windows-installer-x64.nsh)
- [scripts/build-with-builder.js](scripts/build-with-builder.js)

</details>

This document provides an overview of AionUi's build and deployment architecture, explaining how source code is compiled, packaged, and distributed across multiple platforms. The system uses `electron-vite` for TypeScript/React compilation and `electron-builder` for creating platform-specific installers.

For detailed information about specific aspects:

- CI/CD pipeline implementation: See [Build Pipeline](#11.1)
- Two-phase compilation process: See [Two-Phase Build Process](#11.2)
- Native module rebuild strategies: See [Native Module Handling](#11.3)
- Code signing and notarization: See [Code Signing & Notarization](#11.4)
- Release creation and tagging: See [Release Management](#11.5)
- Setting up local development: See [Development Environment](#11.6)

## Build Architecture

AionUi's build system separates concerns into two distinct phases: **compilation** (handled by `electron-vite`) and **packaging** (handled by `electron-builder`). This separation enables incremental builds, faster development iteration, and platform-specific optimizations.

### Build Toolchain

```mermaid
graph TB
    subgraph "Source Code"
        SRC_MAIN["src/main/**/*.ts<br/>Main Process"]
        SRC_PRELOAD["src/preload/**/*.ts<br/>Preload Scripts"]
        SRC_RENDERER["src/renderer/**/*.tsx<br/>React App"]
        PKG["package.json<br/>Dependencies & Scripts"]
    end

    subgraph "Phase 1: Compilation (electron-vite)"
        VITE["electron-vite build<br/>TypeScript + Vite"]
        VITE -->|transpiles| OUT_MAIN["out/main/index.js<br/>Bundled Main"]
        VITE -->|bundles| OUT_PRELOAD["out/preload/index.js<br/>Preload Bundle"]
        VITE -->|bundles| OUT_RENDERER["out/renderer/index.html<br/>React SPA"]
    end

    subgraph "Phase 2: Packaging (electron-builder)"
        BUILDER["electron-builder<br/>build-with-builder.js"]
        BUILDER -->|processes| NATIVE["Native Module Rebuild<br/>better-sqlite3<br/>bcrypt<br/>node-pty"]
        BUILDER -->|creates| ASAR["app.asar<br/>Compressed Archive"]
        BUILDER -->|bundles| ELECTRON["Electron Binary<br/>Platform-specific"]
        BUILDER -->|generates| INSTALLERS["Installers<br/>DMG/NSIS/DEB/AppImage"]
    end

    subgraph "Configuration Files"
        EBCONFIG["electron-builder.yml<br/>Package Config"]
        VITECONFIG["electron.vite.config.ts<br/>Build Config"]
    end

    SRC_MAIN --> VITE
    SRC_PRELOAD --> VITE
    SRC_RENDERER --> VITE
    PKG --> VITE

    OUT_MAIN --> BUILDER
    OUT_PRELOAD --> BUILDER
    OUT_RENDERER --> BUILDER
    PKG --> BUILDER

    EBCONFIG --> BUILDER
    VITECONFIG --> VITE

    INSTALLERS -->|uploaded to| GITHUB["GitHub Releases<br/>with auto-update metadata"]
```

**Sources:** [package.json:1-221](), [electron-builder.yml:1-218](), [scripts/build-with-builder.js:1-511]()

### Build Scripts Overview

The `package.json` defines several build entry points:

| Script       | Command                                          | Purpose                        |
| ------------ | ------------------------------------------------ | ------------------------------ |
| `package`    | `electron-vite build`                            | Compile source code only       |
| `dist`       | `node scripts/build-with-builder.js`             | Full build (compile + package) |
| `dist:mac`   | `build-with-builder.js auto --mac`               | macOS-only build               |
| `dist:win`   | `build-with-builder.js auto --win`               | Windows-only build             |
| `dist:linux` | `build-with-builder.js auto --linux`             | Linux-only build               |
| `build-mac`  | `build-with-builder.js auto --mac --arm64 --x64` | macOS universal build          |

**Sources:** [package.json:18-31]()

## Local Build Workflow

### Basic Build Process

```mermaid
graph LR
    DEV["Developer<br/>Runs Script"] --> HASH{{"computeSourceHash()<br/>Check if rebuild needed"}}
    HASH -->|Changed| VITE["bunx electron-vite build<br/>Compile TypeScript"]
    HASH -->|Unchanged| SKIP["Skip compilation<br/>Use cached out/"]
    VITE --> VALIDATE{{"Validate Output<br/>out/main/index.js exists?<br/>out/renderer/index.html exists?"}}
    SKIP --> VALIDATE
    VALIDATE -->|Valid| BUILDER["bunx electron-builder<br/>Create distributables"]
    VALIDATE -->|Invalid| ERROR["Throw Error"]
    BUILDER --> NATIVE["Rebuild Native Modules<br/>Platform-specific"]
    NATIVE --> ASAR["Create ASAR Archive<br/>Compression level 7 (local)"]
    ASAR --> INSTALLER["Generate Installer<br/>DMG/EXE/DEB"]
    INSTALLER --> DONE["Artifacts in out/<br/>Ready for testing"]
```

**Sources:** [scripts/build-with-builder.js:44-131](), [scripts/build-with-builder.js:372-424]()

### Incremental Build Optimization

The build script uses MD5 hashing to detect source changes and skip unnecessary recompilation:

**Hash Computation** includes:

- Configuration files: `package.json`, `tsconfig.json`, `electron.vite.config.ts`, `electron-builder.yml`
- Source directories: `src/`, `public/`, `scripts/`
- File metadata: size and modification time

The hash is stored in `out/.build-hash` and compared on subsequent builds. If unchanged and `out/main/index.js` exists, the Vite compilation step is skipped.

**Sources:** [scripts/build-with-builder.js:28-106](), [scripts/build-with-builder.js:118-131]()

## CI/CD Architecture

### GitHub Actions Workflow Structure

```mermaid
graph TB
    subgraph "Triggers"
        PUSH_DEV["Push to dev branch"]
        PUSH_TAG["Push tag v*<br/>(excluding -dev- tags)"]
        MANUAL["Manual dispatch<br/>(with platform matrix)"]
    end

    subgraph "Build Pipeline Job (_build-reusable.yml)"
        QUALITY["Code Quality Gates<br/>ESLint + Prettier<br/>TypeScript + Vitest"]
        MATRIX["Build Matrix<br/>5 parallel jobs"]
        MATRIX --> MAC_ARM["macos-14 ARM64<br/>build-with-builder.js arm64 --mac"]
        MATRIX --> MAC_X64["macos-14 x64<br/>build-with-builder.js x64 --mac"]
        MATRIX --> WIN_X64["windows-2022 x64<br/>build-with-builder.js x64 --win"]
        MATRIX --> WIN_ARM["windows-2022 ARM64<br/>build-with-builder.js arm64 --win"]
        MATRIX --> LINUX["ubuntu-latest<br/>bun run dist:linux"]

        MAC_ARM --> ARTIFACTS_MAC_ARM["Artifact:<br/>macos-build-arm64"]
        MAC_X64 --> ARTIFACTS_MAC_X64["Artifact:<br/>macos-build-x64"]
        WIN_X64 --> ARTIFACTS_WIN_X64["Artifact:<br/>windows-build-x64"]
        WIN_ARM --> ARTIFACTS_WIN_ARM["Artifact:<br/>windows-build-arm64"]
        LINUX --> ARTIFACTS_LINUX["Artifact:<br/>linux-build"]
    end

    subgraph "Create Tag Job"
        TAG_LOGIC["create-tag job<br/>Generate tag name"]
        TAG_LOGIC -->|dev branch| DEV_TAG["v{VERSION}-dev-{COMMIT}"]
        TAG_LOGIC -->|version collision| BUMP["Increment patch version<br/>Update package.json"]
        DEV_TAG --> PUSH_NEW_TAG["Push tag to GitHub"]
    end

    subgraph "Release Job"
        DOWNLOAD["Download all artifacts"]
        DOWNLOAD --> NORMALIZE["prepare-release-assets.sh<br/>Normalize updater metadata"]
        NORMALIZE --> CREATE_RELEASE["softprops/action-gh-release<br/>Create draft release"]
        CREATE_RELEASE -->|dev tag| PRERELEASE["Prerelease + Draft<br/>dev-release environment"]
        CREATE_RELEASE -->|prod tag| PRODRELEASE["Draft Release<br/>release environment"]
    end

    subgraph "Auto Retry Job"
        RETRY_CHECK{{"failure() &&<br/>github.run_attempt == 1"}}
        RETRY_CHECK -->|Yes| WAIT["Wait 5 minutes"]
        WAIT --> RERUN["Trigger workflow rerun<br/>POST /actions/runs/{id}/rerun"]
    end

    PUSH_DEV --> QUALITY
    PUSH_TAG --> QUALITY
    MANUAL --> QUALITY

    QUALITY --> MATRIX
    MATRIX --> TAG_LOGIC
    TAG_LOGIC --> DOWNLOAD
    MATRIX -->|failure| RETRY_CHECK
```

**Sources:** [.github/workflows/build-and-release.yml:1-260]()

### Build Matrix Configuration

The workflow defines a 5-platform build matrix in JSON format:

```json
{
  "include": [
    { "platform": "macos-arm64", "os": "macos-14", "arch": "arm64" },
    { "platform": "macos-x64", "os": "macos-14", "arch": "x64" },
    { "platform": "windows-x64", "os": "windows-2022", "arch": "x64" },
    { "platform": "windows-arm64", "os": "windows-2022", "arch": "arm64" },
    { "platform": "linux", "os": "ubuntu-latest", "arch": "x64-arm64" }
  ]
}
```

Each job runs independently with platform-specific setup:

- **macOS**: Xcode tools, Python 3.12, code signing certificates
- **Windows**: MSVC ARM64 toolchain, Python 3.12, prebuild-install
- **Linux**: Standard build tools, multi-arch support (x64 + arm64)

**Sources:** [.github/workflows/build-and-release.yml:25-32]()

## Platform-Specific Considerations

### macOS Builds

**DMG Creation Retry Logic:**
macOS builds include automatic retry for DMG creation failures. If the `.app` bundle exists but the `.dmg` is missing after a build attempt, the system automatically retries using `electron-builder --prepackaged` up to 3 times with 30-second delays.

```mermaid
graph LR
    BUILD["electron-builder build"] -->|Success| DONE["DMG created"]
    BUILD -->|Failure| CHECK{{"findAppDir(out/)<br/>.app exists?"}}
    CHECK -->|No .app| FAIL["Build failed"]
    CHECK -->|.app exists| CHECK_DMG{{"dmgExists(out/)<br/>.dmg exists?"}}
    CHECK_DMG -->|Yes| DONE
    CHECK_DMG -->|No| CLEANUP["cleanupDiskImages()<br/>hdiutil detach all"]
    CLEANUP --> RETRY["createDmgWithPrepackaged()<br/>--prepackaged {app_path}"]
    RETRY -->|Success| DONE
    RETRY -->|Failure<br/>attempt < 3| CLEANUP
    RETRY -->|Failure<br/>attempt == 3| FAIL
```

**Sources:** [scripts/build-with-builder.js:18-26](), [scripts/build-with-builder.js:133-251]()

**Code Signing:**
macOS builds use `hardenedRuntime: true` and entitlements defined in `entitlements.plist`. The `afterSign` hook in `scripts/afterSign.js` handles notarization with Apple's notary service. Notarization failures are tolerated (degraded mode) to prevent builds from blocking on temporary notary service issues.

**Sources:** [electron-builder.yml:129-132](), [electron-builder.yml:154]()

### Windows Builds

**Architecture Detection:**
Windows installers include NSIS scripts that prevent installation on mismatched architectures:

- **x64 installer**: Blocks installation on x86 (32-bit) and ARM64 systems
- **ARM64 installer**: Blocks installation on non-ARM64 systems

The detection uses `!include "x64.nsh"` and checks `${RunningX64}` and `${IsNativeARM64}` macros in the `.onVerifyInstDir` function.

**Sources:** [resources/windows-installer-x64.nsh:1-30](), [resources/windows-installer-arm64.nsh:1-20]()

**Native Module Handling:**
Windows builds use a fallback strategy:

1. Try `prebuild-install` to fetch prebuilt binaries
2. If unavailable, fall back to `electron-rebuild` to compile from source

ARM64 builds require the MSVC ARM64 toolchain for native compilation.

**Stale Output Cleanup:**
Before Windows builds, the script removes stale artifacts matching `/^win(?:-[a-z0-9]+)?-unpacked$/i` and `/-win-[^.]+\.(exe|msi|zip|7z|blockmap)$/i` patterns to prevent packaging conflicts.

**Sources:** [scripts/build-with-builder.js:254-280](), [scripts/build-with-builder.js:483-502]()

### Linux Builds

Linux builds target two formats:

- **DEB**: Debian package with desktop entry and MIME handler for `x-scheme-handler/aionui`
- **AppImage**: Self-contained executable

Both formats support `x64` and `arm64` architectures. The desktop entry includes:

```
Categories: Office;Utility;
MimeType: x-scheme-handler/aionui;
```

**Sources:** [electron-builder.yml:156-176]()

## Native Module Configuration

### ASAR Unpacking

Three native modules require unpacking from the ASAR archive for runtime loading:

| Module           | Reason                                       | Pattern                               |
| ---------------- | -------------------------------------------- | ------------------------------------- |
| `better-sqlite3` | Native binary + `.node` files                | `**/node_modules/better-sqlite3/**/*` |
| `bcrypt`         | Native binary for password hashing           | `**/node_modules/bcrypt/**/*`         |
| `node-pty`       | PTY (pseudo-terminal) support for CLI agents | `**/node_modules/node-pty/**/*`       |

Additional unpacked modules:

- `web-tree-sitter` and `tree-sitter-bash`: WASM files need `fs.readFile` access
- `rules/` and `skills/`: Built-in resources for `fs.readdir` with `withFileTypes`

**Sources:** [electron-builder.yml:181-203]()

### Excluded Native Binaries

To prevent code signing issues, all `tree-sitter-*` native binaries are excluded from packaging:

```yaml
- '!**/node_modules/tree-sitter-*/prebuilds/**'
- '!**/node_modules/tree-sitter-*/build/**'
- '!**/node_modules/tree-sitter-*/**/*.node'
```

JAR files and JNI libraries are also excluded to avoid macOS notarization failures.

**Sources:** [electron-builder.yml:56-87]()

## Distribution Artifacts

### Output Structure

After a successful build, artifacts are generated in the `out/` directory:

**macOS:**

- `AionUi-{version}-mac-arm64.dmg` - ARM64 disk image
- `AionUi-{version}-mac-arm64.zip` - ARM64 portable archive
- `AionUi-{version}-mac-x64.dmg` - x64 disk image
- `AionUi-{version}-mac-x64.zip` - x64 portable archive
- `latest-mac.yml` - Auto-update metadata

**Windows:**

- `AionUi-{version}-win-x64.exe` - x64 NSIS installer
- `AionUi-{version}-win-x64.zip` - x64 portable archive
- `AionUi-{version}-win-arm64.exe` - ARM64 NSIS installer
- `AionUi-{version}-win-arm64.zip` - ARM64 portable archive
- `latest.yml` - Auto-update metadata

**Linux:**

- `AionUi-{version}-linux-x64.deb` - x64 Debian package
- `AionUi-{version}-linux-x64.AppImage` - x64 AppImage
- `AionUi-{version}-linux-arm64.deb` - ARM64 Debian package
- `AionUi-{version}-linux-arm64.AppImage` - ARM64 AppImage
- `latest-linux.yml` - Auto-update metadata

**Sources:** [electron-builder.yml:110-120](), [electron-builder.yml:127](), [electron-builder.yml:163]()

### Auto-Update Metadata

Each platform generates a `latest.yml` (or `latest-mac.yml` / `latest-linux.yml`) file containing:

- Version number
- Release date
- File sizes and checksums (SHA512)
- Download URLs pointing to GitHub releases

These files are consumed by `electron-updater` in the running application for automatic update checks.

**Sources:** [electron-builder.yml:212-218]()

### Compression Settings

ASAR compression level is environment-aware:

- **CI builds**: Level 9 (maximum compression) for smallest download size
- **Local builds**: Level 7 (normal compression) for 30-50% faster ASAR packing

The compression level is controlled via `ELECTRON_BUILDER_COMPRESSION_LEVEL` environment variable, which takes precedence over the `compression: normal` setting in `electron-builder.yml`.

**Sources:** [scripts/build-with-builder.js:431-439](), [electron-builder.yml:207]()

## Build Orchestration Script

The `build-with-builder.js` script coordinates the entire build process:

```mermaid
graph TD
    START["build-with-builder.js<br/>Parse CLI arguments"] --> PARSE_ARCH{{"Determine target arch<br/>auto / explicit / multi"}}
    PARSE_ARCH -->|auto mode| DETECT["getTargetArchFromConfig()<br/>Read electron-builder.yml"]
    PARSE_ARCH -->|explicit| SET_ARCH["Use specified arch"]
    PARSE_ARCH -->|multiple| MULTI["Multi-arch mode<br/>Pass all --arch flags"]

    DETECT --> CHECK_SKIP{{"shouldSkipViteBuild()<br/>--skip-vite or hash match?"}}
    SET_ARCH --> CHECK_SKIP
    MULTI --> CHECK_SKIP

    CHECK_SKIP -->|Skip| CACHED["Use cached out/ directory"]
    CHECK_SKIP -->|Build| VITE["bunx electron-vite build<br/>ELECTRON_BUILDER_ARCH={arch}"]

    VITE --> SAVE_HASH["saveCurrentHash()<br/>Update out/.build-hash"]
    CACHED --> VALIDATE{{"Validate output<br/>mainIndex exists?<br/>rendererIndex exists?"}}
    SAVE_HASH --> VALIDATE

    VALIDATE -->|Invalid| ERROR["Throw Error"]
    VALIDATE -->|Valid| PACK_ONLY{{"--pack-only flag?"}}

    PACK_ONLY -->|Yes| DONE["Exit: Package only"]
    PACK_ONLY -->|No| COMPRESSION["Set ELECTRON_BUILDER_COMPRESSION_LEVEL<br/>9 (CI) or 7 (local)"]

    COMPRESSION --> WINDOWS{{"--win flag?"}}
    WINDOWS -->|Yes| CLEANUP["cleanupWindowsPackOutput()<br/>Remove stale artifacts"]
    WINDOWS -->|No| NSIS

    CLEANUP --> NSIS{{"Single-arch Windows?"}}
    NSIS -->|Yes| ARCH_DETECT["Add NSIS include script<br/>windows-installer-{arch}.nsh"]
    NSIS -->|No| BUILDER_CMD

    ARCH_DETECT --> BUILDER_CMD["buildWithDmgRetry()<br/>bunx electron-builder {args} --{arch}"]
    BUILDER_CMD -->|macOS| DMG_RETRY["DMG retry logic<br/>up to 3 attempts"]
    BUILDER_CMD -->|Other| SUCCESS["Build completed"]
    DMG_RETRY --> SUCCESS
```

**Sources:** [scripts/build-with-builder.js:1-511]()

### Command-Line Flags

| Flag                                     | Effect                                               |
| ---------------------------------------- | ---------------------------------------------------- |
| `auto`                                   | Auto-detect architecture from `electron-builder.yml` |
| `--skip-vite`                            | Skip Vite compilation if `out/` exists               |
| `--skip-native`                          | Skip native module rebuilding (reserved)             |
| `--pack-only`                            | Skip electron-builder distributable creation         |
| `--force`                                | Force full rebuild, ignore hash cache                |
| `--mac`, `--win`, `--linux`              | Target platform                                      |
| `--x64`, `--arm64`, `--ia32`, `--armv7l` | Target architecture                                  |

**Sources:** [scripts/build-with-builder.js:283-301]()
