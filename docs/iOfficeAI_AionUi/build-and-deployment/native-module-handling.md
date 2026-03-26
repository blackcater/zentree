# Native Module Handling

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

This document explains how AionUi handles native Node.js modules (modules with C/C++ bindings) during the build and packaging process. It covers platform-specific rebuild strategies, ASAR unpacking requirements, and the configuration that ensures native modules work correctly in the packaged Electron application.

For information about the overall build pipeline and CI/CD workflow, see [Build Pipeline](#11.1). For details on the two-phase build process using electron-vite and electron-builder, see [Two-Phase Build Process](#11.2).

## Overview of Native Modules

AionUi uses several native modules that require compilation for the target platform and Electron version:

| Module              | Purpose                                   | Critical Path              |
| ------------------- | ----------------------------------------- | -------------------------- |
| `better-sqlite3`    | SQLite database for conversation history  | Must be unpacked from ASAR |
| `bcrypt`/`bcryptjs` | Password hashing for WebUI authentication | Must be unpacked from ASAR |
| `node-pty`          | Pseudo-terminal for MCP stdio connections | Must be unpacked from ASAR |
| `sharp`             | Image processing (via `@mapbox/sharp-*`)  | Optional dependency        |

These modules contain compiled `.node` binaries that must match both the target operating system/architecture and the Electron version used by AionUi.

**Sources:** [package.json:103-180](), [electron-builder.yml:29-36]()

## Platform-Specific Rebuild Strategies

AionUi employs different native module rebuild strategies based on the platform to optimize build times and reliability:

```mermaid
graph TB
    subgraph "Build Process Entry"
        START["build-with-builder.js"]
        START --> VITE["electron-vite build"]
        VITE --> PLATFORM{Platform}
    end

    subgraph "Windows Strategy"
        PLATFORM -->|Windows| WIN_STRATEGY["prebuild-install strategy"]
        WIN_STRATEGY --> PREBUILD["prebuild-install checks"]
        PREBUILD --> PREBUILT{Prebuilt binary<br/>available?}
        PREBUILT -->|Yes| WIN_DOWNLOAD["Download prebuilt .node"]
        PREBUILT -->|No| WIN_FALLBACK["electron-rebuild fallback"]
        WIN_DOWNLOAD --> WIN_DONE["Windows natives ready"]
        WIN_FALLBACK --> WIN_REBUILD["Rebuild from source<br/>with node-gyp"]
        WIN_REBUILD --> WIN_DONE
    end

    subgraph "macOS/Linux Strategy"
        PLATFORM -->|macOS/Linux| UNIX_STRATEGY["electron-builder strategy"]
        UNIX_STRATEGY --> INSTALL_DEPS["electron-builder<br/>install-app-deps"]
        INSTALL_DEPS --> UNIX_REBUILD["Rebuild all native modules<br/>for Electron"]
        UNIX_REBUILD --> UNIX_DONE["macOS/Linux natives ready"]
    end

    WIN_DONE --> BUILDER["electron-builder package"]
    UNIX_DONE --> BUILDER
    BUILDER --> OUTPUT["Platform distributables"]

    style WIN_STRATEGY fill:#f9f9f9
    style UNIX_STRATEGY fill:#f9f9f9
    style PREBUILD fill:#fff4e6
    style INSTALL_DEPS fill:#fff4e6
```

**Sources:** [scripts/build-with-builder.js:1-511](), [.github/workflows/build-and-release.yml:19-33]()

### Windows: prebuild-install with Fallback

Windows builds use a two-tier strategy to minimize compilation requirements:

1. **Primary: prebuild-install** - Attempts to download pre-compiled binaries from GitHub releases
   - Modules like `better-sqlite3` publish prebuilt `.node` files for common platforms
   - Fast and reliable when prebuilts are available
   - Configured via `node_modules/prebuild-install` in the dependency tree

2. **Fallback: electron-rebuild** - Compiles from source when prebuilts are unavailable
   - Requires MSVC toolchain (installed via windows-2022 runner)
   - Uses `node-gyp` to compile C++ addons
   - Configured via `electronRebuild` section in package.json

The fallback mechanism is implicit - if `prebuild-install` fails to find a compatible binary, the module's `postinstall` script triggers compilation.

**Sources:** [package.json:185-187](), [.github/workflows/build-and-release.yml:29-30]()

### macOS and Linux: electron-builder install-app-deps

macOS and Linux builds use `electron-builder`'s built-in native module handling:

1. **install-app-deps** command rebuilds all native modules for the target Electron version
2. Triggered automatically by `electron-builder` during the packaging phase
3. Handles cross-compilation (e.g., ARM64 builds on x64 macOS-14 runners)
4. Requires platform-specific toolchains (Xcode on macOS, build-essential on Linux)

This approach is more reliable for Unix-like platforms where native compilation is standardized.

**Sources:** [electron-builder.yml:177-179](), [.github/workflows/build-and-release.yml:27-28]()

### Architecture-Specific Builds

The build system supports cross-compilation for multiple architectures:

```mermaid
graph LR
    subgraph "Build Matrix Configuration"
        MATRIX["Build Matrix<br/>5 configurations"]
        MATRIX --> MAC_ARM["macOS-14 + ARM64"]
        MATRIX --> MAC_X64["macOS-14 + x64"]
        MATRIX --> WIN_X64["windows-2022 + x64"]
        MATRIX --> WIN_ARM["windows-2022 + ARM64"]
        MATRIX --> LINUX["ubuntu-latest<br/>x64 + ARM64"]
    end

    subgraph "Architecture Detection"
        MAC_ARM --> ARCH_FLAG_1["--arm64"]
        MAC_X64 --> ARCH_FLAG_2["--x64"]
        WIN_X64 --> ARCH_FLAG_3["--x64"]
        WIN_ARM --> ARCH_FLAG_4["--arm64 + MSVC ARM64"]
        LINUX --> ARCH_FLAG_5["--x64 --arm64"]
    end

    subgraph "Build Script"
        ARCH_FLAG_1 --> BUILD_SCRIPT["build-with-builder.js"]
        ARCH_FLAG_2 --> BUILD_SCRIPT
        ARCH_FLAG_3 --> BUILD_SCRIPT
        ARCH_FLAG_4 --> BUILD_SCRIPT
        ARCH_FLAG_5 --> BUILD_SCRIPT
        BUILD_SCRIPT --> TARGET_ARCH["ELECTRON_BUILDER_ARCH env var"]
    end

    subgraph "Native Module Compilation"
        TARGET_ARCH --> REBUILD["Native module rebuild<br/>for target architecture"]
        REBUILD --> VERIFY["Verify .node binaries<br/>match target arch"]
    end
```

The `ELECTRON_BUILDER_ARCH` environment variable is set during the vite build phase to ensure native modules are compiled for the correct architecture.

**Sources:** [scripts/build-with-builder.js:328-361](), [scripts/build-with-builder.js:386-393](), [.github/workflows/build-and-release.yml:26-32]()

## ASAR Unpacking Requirements

Electron packages application files into an ASAR archive for integrity and performance. However, native modules cannot be loaded directly from within ASAR and must be unpacked to the filesystem.

### ASAR Configuration

The `electron-builder.yml` configuration specifies which modules must be unpacked:

```mermaid
graph TB
    subgraph "ASAR Packing Process"
        FILES["Application Files"]
        FILES --> ASAR["app.asar archive"]
        FILES --> UNPACKED["app.asar.unpacked/<br/>directory"]
    end

    subgraph "Native Modules - Must Unpack"
        UNPACKED --> SQLITE["better-sqlite3/**/*<br/>.node binaries"]
        UNPACKED --> BCRYPT["bcrypt/**/*<br/>.node binaries"]
        UNPACKED --> PTY["node-pty/**/*<br/>pty.node binaries"]
        UNPACKED --> DEPS["Supporting modules<br/>prebuild-install<br/>node-gyp-build<br/>bindings"]
    end

    subgraph "Special Cases"
        UNPACKED --> OPEN["open/**/*<br/>Windows ASAR compat"]
        UNPACKED --> TREESITTER["web-tree-sitter/**/*<br/>WASM files for fs.readFile"]
        UNPACKED --> BUILTIN["rules/ skills/<br/>fs.readdir with withFileTypes"]
    end

    subgraph "Runtime Access"
        SQLITE --> RUNTIME["Electron runtime"]
        BCRYPT --> RUNTIME
        PTY --> RUNTIME
        DEPS --> RUNTIME
        OPEN --> RUNTIME
        TREESITTER --> RUNTIME
        BUILTIN --> RUNTIME
    end

    style ASAR fill:#f9f9f9
    style UNPACKED fill:#fff4e6
```

**Key unpacking rules:**

1. **Native modules** - Cannot be loaded from ASAR due to dynamic loading requirements
2. **WASM files** - Must be unpacked for `fs.readFile` access (tree-sitter)
3. **Directory enumeration** - Directories scanned with `fs.readdir(..., {withFileTypes: true})` must be unpacked
4. **Platform-specific utilities** - The `open` library requires unpacking on Windows for executable spawning

**Sources:** [electron-builder.yml:181-203](), [electron-builder.yml:29-58]()

### File Configuration vs ASAR Unpacking

The `files` and `asarUnpack` sections work together:

```
files:                          # What gets packaged
  - node_modules/better-sqlite3/**/*
  - node_modules/bcrypt/**/*
  - node_modules/node-pty/**/*

asarUnpack:                    # What gets unpacked from ASAR
  - "**/node_modules/better-sqlite3/**/*"
  - "**/node_modules/bcrypt/**/*"
  - "**/node_modules/node-pty/**/*"
```

**Why both are needed:**

- `files` includes the module in the package
- `asarUnpack` extracts it to `app.asar.unpacked/` at package time
- Electron runtime resolves native modules from unpacked directory

**Sources:** [electron-builder.yml:18-98](), [electron-builder.yml:181-203]()

## Build Configuration Details

### package.json Configuration

```json
{
  "electronRebuild": {
    "electronVersion": "^37.3.1"
  }
}
```

This section ensures native modules are rebuilt against the correct Electron version when fallback compilation is needed.

**Sources:** [package.json:185-187]()

### electron-builder.yml Directives

```yaml
npmRebuild: false # Skip npm rebuild
buildDependenciesFromSource: false # Don't recompile all deps
nodeGypRebuild: false # Disable global node-gyp rebuild
```

These flags disable electron-builder's default rebuild behavior because:

- Windows uses `prebuild-install` strategy (handled by npm postinstall)
- macOS/Linux use explicit `install-app-deps` when needed
- Global rebuilds are inefficient and can cause issues with mixed architectures

**Sources:** [electron-builder.yml:177-179]()

### Compression Settings

The build script sets ASAR compression level based on environment:

```javascript
// CI: maximum compression (level 9) for smallest size
// Local: normal compression (level 7) for 30-50% faster builds
process.env.ELECTRON_BUILDER_COMPRESSION_LEVEL = isCI ? '9' : '7'
```

Native modules in `app.asar.unpacked/` are not compressed, ensuring optimal loading performance.

**Sources:** [scripts/build-with-builder.js:431-439]()

## Dependency Resolution

### Runtime Dependencies for Native Modules

Native modules require supporting packages to be included:

```mermaid
graph TB
    subgraph "better-sqlite3 Dependencies"
        SQLITE["better-sqlite3"]
        SQLITE --> BINDINGS["bindings"]
        SQLITE --> PREBUILD["prebuild-install"]
        SQLITE --> NODE_GYP["node-gyp-build"]
        SQLITE --> DETECT_LIBC["detect-libc"]
    end

    subgraph "bcrypt Dependencies"
        BCRYPT["bcrypt"]
        BCRYPT --> BINDINGS2["bindings"]
        BCRYPT --> NODE_GYP2["node-gyp-build"]
    end

    subgraph "node-pty Dependencies"
        PTY["node-pty"]
        PTY --> BINDINGS3["bindings"]
        PTY --> NODE_GYP3["node-gyp-build"]
    end

    subgraph "sharp Dependencies"
        SHARP["sharp"]
        SHARP --> MAPBOX["@mapbox/sharp-*"]
        SHARP --> DETECT_LIBC2["detect-libc"]
    end

    subgraph "Packaging"
        BINDINGS --> FILES["electron-builder.yml<br/>files section"]
        PREBUILD --> FILES
        NODE_GYP --> FILES
        DETECT_LIBC --> FILES
        MAPBOX --> FILES
    end
```

The `files` section in `electron-builder.yml` explicitly includes these support modules to ensure the native module loaders function correctly in the packaged application.

**Sources:** [electron-builder.yml:29-37]()

## Common Issues and Solutions

### Issue: Module Not Found After Packaging

**Symptom:** Native module loads in dev but fails in packaged app with `Cannot find module` error.

**Solution:** Ensure the module is listed in both `files` and `asarUnpack` sections of `electron-builder.yml`.

**Sources:** [electron-builder.yml:18-98](), [electron-builder.yml:181-203]()

### Issue: Wrong Architecture Binary

**Symptom:** Native module loads but crashes with architecture mismatch error.

**Solution:** Verify `ELECTRON_BUILDER_ARCH` is set correctly during build. Check build matrix configuration for cross-compilation requirements.

**Sources:** [scripts/build-with-builder.js:386-393](), [.github/workflows/build-and-release.yml:26-32]()

### Issue: Windows Build Fails with Compilation Errors

**Symptom:** Windows builds fail with "MSBuild not found" or "Python not found" errors.

**Solution:** Ensure MSVC toolchain and Python 3.11+ are installed (handled automatically by windows-2022 runner in CI). For ARM64 builds, verify MSVC ARM64 toolchain is installed.

**Sources:** [.github/workflows/build-and-release.yml:29-30]()

### Issue: macOS Notarization Fails Due to Unsigned Binaries

**Symptom:** macOS notarization rejects package due to unsigned `.node` files.

**Solution:** The `afterSign.js` script handles codesigning of native modules. Tree-sitter native binaries are explicitly excluded via electron-builder.yml to prevent signing conflicts.

**Sources:** [electron-builder.yml:56-64](), [electron-builder.yml:154]()

## Architecture Detection Scripts

For Windows installers, architecture-specific NSIS scripts prevent installation on incompatible systems:

```mermaid
graph LR
    subgraph "Installer Architecture Protection"
        INSTALLER["Windows Installer<br/>.exe"]
        INSTALLER --> VERIFY[".onVerifyInstDir function"]
        VERIFY --> CHECK{Check System<br/>Architecture}
    end

    subgraph "x64 Installer"
        CHECK -->|x64 build| X64_SCRIPT["windows-installer-x64.nsh"]
        X64_SCRIPT --> X64_CHECK_1{RunningX64?}
        X64_CHECK_1 -->|No| X64_BLOCK_32["Block: System is 32-bit"]
        X64_CHECK_1 -->|Yes| X64_CHECK_2{IsNativeARM64?}
        X64_CHECK_2 -->|Yes| X64_BLOCK_ARM["Block: System is ARM64"]
        X64_CHECK_2 -->|No| X64_ALLOW["Allow installation"]
    end

    subgraph "ARM64 Installer"
        CHECK -->|ARM64 build| ARM_SCRIPT["windows-installer-arm64.nsh"]
        ARM_SCRIPT --> ARM_CHECK{IsNativeARM64?}
        ARM_CHECK -->|No| ARM_BLOCK["Block: Not ARM64"]
        ARM_CHECK -->|Yes| ARM_ALLOW["Allow installation"]
    end
```

These scripts are automatically included during single-architecture Windows builds via the `--config.nsis.include` flag.

**Sources:** [scripts/build-with-builder.js:460-481](), [resources/windows-installer-arm64.nsh:1-20](), [resources/windows-installer-x64.nsh:1-30]()

## Verification Steps

After packaging, verify native modules are correctly handled:

1. **Check unpacked directory exists:**

   ```
   out/mac-arm64/AionUi.app/Contents/Resources/app.asar.unpacked/
   ```

2. **Verify native binaries match target architecture:**

   ```bash
   file app.asar.unpacked/node_modules/better-sqlite3/build/Release/better_sqlite3.node
   ```

3. **Test module loading in packaged app:**
   - Launch packaged application
   - Create a conversation (tests better-sqlite3)
   - Enable WebUI mode (tests bcrypt)
   - Connect to MCP stdio server (tests node-pty)

**Sources:** [electron-builder.yml:181-203]()
