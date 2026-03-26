# Framework-Specific Devtools

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [docs/getting-started/devtools.md](docs/getting-started/devtools.md)
- [examples/vanilla-chat/package.json](examples/vanilla-chat/package.json)
- [packages/typescript/ai-client/package.json](packages/typescript/ai-client/package.json)
- [packages/typescript/ai-devtools/package.json](packages/typescript/ai-devtools/package.json)
- [packages/typescript/ai/package.json](packages/typescript/ai/package.json)
- [packages/typescript/preact-ai-devtools/CHANGELOG.md](packages/typescript/preact-ai-devtools/CHANGELOG.md)
- [packages/typescript/preact-ai-devtools/README.md](packages/typescript/preact-ai-devtools/README.md)
- [packages/typescript/preact-ai-devtools/package.json](packages/typescript/preact-ai-devtools/package.json)
- [packages/typescript/preact-ai-devtools/src/AiDevtools.tsx](packages/typescript/preact-ai-devtools/src/AiDevtools.tsx)
- [packages/typescript/preact-ai-devtools/src/index.ts](packages/typescript/preact-ai-devtools/src/index.ts)
- [packages/typescript/preact-ai-devtools/src/plugin.tsx](packages/typescript/preact-ai-devtools/src/plugin.tsx)
- [packages/typescript/react-ai-devtools/package.json](packages/typescript/react-ai-devtools/package.json)
- [packages/typescript/solid-ai-devtools/package.json](packages/typescript/solid-ai-devtools/package.json)

</details>

## Purpose and Scope

This document covers the framework-specific devtools packages that provide integration points for React and Solid.js applications. These packages wrap `@tanstack/ai-devtools-core` (see [Core Devtools](#8.1)) with framework-specific lifecycle management and component APIs.

Framework-specific devtools handle:

- Framework-specific component definitions for mounting the devtools UI
- Framework reactivity integration (React hooks, Solid signals)
- Production build configurations that eliminate devtools code from production bundles
- Peer dependency management for framework versions

For information about the underlying event system and devtools UI, see [Core Devtools](#8.1).

## Package Architecture

The devtools system follows a layered architecture with shared core logic and thin framework adapters:

**Diagram: Framework Devtools Architecture**

```mermaid
graph TB
    subgraph "Framework_Integrations"
        REACT_PKG["@tanstack/react-ai-devtools"]
        SOLID_PKG["@tanstack/solid-ai-devtools"]
        PREACT_PKG["@tanstack/preact-ai-devtools"]
    end

    subgraph "Core_Devtools"
        CORE_PKG["@tanstack/ai-devtools-core"]
        DEVTOOLS_UI["@tanstack/devtools-ui"]
        DEVTOOLS_UTILS["@tanstack/devtools-utils"]
    end

    subgraph "Framework_Libraries"
        REACT["react"]
        SOLID["solid-js"]
        PREACT["preact"]
    end

    subgraph "AI_System"
        AI_CORE["@tanstack/ai"]
        EVENT_CLIENT["aiEventClient"]
    end

    REACT_PKG -->|"depends on"| CORE_PKG
    SOLID_PKG -->|"depends on"| CORE_PKG
    PREACT_PKG -->|"depends on"| CORE_PKG
    REACT_PKG -->|"peer dependency"| REACT
    SOLID_PKG -->|"peer dependency"| SOLID
    PREACT_PKG -->|"peer dependency"| PREACT

    CORE_PKG -->|"depends on"| DEVTOOLS_UI
    CORE_PKG -->|"depends on"| DEVTOOLS_UTILS
    CORE_PKG -->|"depends on"| SOLID
    CORE_PKG -->|"monitors"| AI_CORE

    AI_CORE -->|"contains"| EVENT_CLIENT
    EVENT_CLIENT -->|"emits events to"| CORE_PKG
```

**Sources:** [packages/typescript/ai-devtools/package.json:1-61](), [packages/typescript/solid-ai-devtools/package.json:1-62](), [packages/typescript/react-ai-devtools/package.json:1-64]()

### Package Roles

| Package                        | Role                       | Dependencies                                               | Exports                         |
| ------------------------------ | -------------------------- | ---------------------------------------------------------- | ------------------------------- |
| `@tanstack/ai-devtools-core`   | Core UI and event handling | `@tanstack/ai`, `@tanstack/devtools-ui`, `solid-js`        | Main UI, `/production` no-op    |
| `@tanstack/react-ai-devtools`  | React integration          | `@tanstack/ai-devtools-core` (peer: `react ^17\|^18\|^19`) | React component, `/production`  |
| `@tanstack/solid-ai-devtools`  | Solid integration          | `@tanstack/ai-devtools-core` (peer: `solid-js >=1.9.7`)    | Solid component, `/production`  |
| `@tanstack/preact-ai-devtools` | Preact integration         | `@tanstack/ai-devtools-core` (peer: `preact >=10.0.0`)     | Preact component, `/production` |

**Sources:** [packages/typescript/ai-devtools/package.json:48-54](), [packages/typescript/solid-ai-devtools/package.json:49-55](), [packages/typescript/react-ai-devtools/package.json:50-56]()

## Solid Devtools Implementation

The Solid devtools package provides a thin wrapper around the core devtools UI with Solid-specific lifecycle integration.

### Package Structure

```mermaid
graph LR
    subgraph "Package Exports"
        MAIN["Main Entry<br/>./dist/esm/index.js"]
        PROD["Production Entry<br/>./dist/esm/production.js"]
    end

    subgraph "Import Patterns"
        DEV_IMPORT["import { AIDevtools } from '@tanstack/solid-ai-devtools'"]
        PROD_IMPORT["import { AIDevtools } from '@tanstack/solid-ai-devtools/production'"]
    end

    subgraph "Runtime Behavior"
        DEVTOOLS_UI["Renders devtools UI<br/>Connects to event stream"]
        NO_OP["No-op component<br/>Zero bundle impact"]
    end

    DEV_IMPORT --> MAIN
    PROD_IMPORT --> PROD
    MAIN --> DEVTOOLS_UI
    PROD --> NO_OP
```

**Sources:** [packages/typescript/solid-ai-devtools/package.json:14-26]()

### Export Configuration

The package defines two entry points:

- **Main export** (`"."`): Full devtools implementation at `./dist/esm/index.js`
- **Production export** (`"./production"`): No-op implementation at `./dist/esm/production.js`

**Sources:** [packages/typescript/solid-ai-devtools/package.json:15-25]()

### Build Configuration

The package uses `vite-plugin-solid` to compile Solid components:

```mermaid
graph LR
    SOURCE["src/**/*.tsx"]
    VITE["vite build<br/>with vite-plugin-solid"]
    OUTPUT["dist/esm/**/*.js"]

    SOURCE --> VITE
    VITE --> OUTPUT
```

**Sources:** [packages/typescript/solid-ai-devtools/package.json:32](), [packages/typescript/solid-ai-devtools/package.json:56]()

### Peer Dependencies

The package requires `solid-js >=1.9.7` as a peer dependency, ensuring compatibility with Solid's reactivity system:

[packages/typescript/solid-ai-devtools/package.json:58-60]()

## React Devtools Implementation

The React devtools package follows the same pattern as Solid devtools with React-specific lifecycle management.

**Diagram: React Devtools Package Structure**

```mermaid
graph TB
    subgraph "Package_Structure"
        REACT_SRC["src/index.tsx"]
        REACT_PROD["src/production.tsx"]
    end

    subgraph "Build_Output"
        REACT_DIST["dist/esm/index.js"]
        REACT_DIST_PROD["dist/esm/production.js"]
    end

    subgraph "Dependencies"
        REACT_CORE["@tanstack/ai-devtools-core"]
        REACT_LIB["react ^17|^18|^19"]
        REACT_TYPES["@types/react ^17|^18|^19"]
    end

    REACT_SRC --> REACT_DIST
    REACT_PROD --> REACT_DIST_PROD
    REACT_DIST --> REACT_CORE
    REACT_DIST --> REACT_LIB
    REACT_DIST --> REACT_TYPES
```

### Package Configuration

The React devtools package supports React versions 17, 18, and 19 through peer dependencies:

[packages/typescript/react-ai-devtools/package.json:54-56]()

The package exports follow the standard two-entry pattern:

[packages/typescript/react-ai-devtools/package.json:30-43]()

**Sources:** [packages/typescript/react-ai-devtools/package.json:1-64]()

## Preact Devtools Implementation

The Preact devtools package provides integration for Preact applications, following the same architectural pattern.

**Diagram: Preact Devtools Package Structure**

```mermaid
graph TB
    subgraph "Package_Structure"
        PREACT_SRC["src/index.tsx"]
        PREACT_PROD["src/production.tsx"]
    end

    subgraph "Build_Output"
        PREACT_DIST["dist/esm/index.js"]
        PREACT_DIST_PROD["dist/esm/production.js"]
    end

    subgraph "Dependencies"
        PREACT_CORE["@tanstack/ai-devtools-core"]
        PREACT_LIB["preact >=10.0.0"]
    end

    PREACT_SRC --> PREACT_DIST
    PREACT_PROD --> PREACT_DIST_PROD
    PREACT_DIST --> PREACT_CORE
    PREACT_DIST --> PREACT_LIB
```

### Peer Dependencies

The Preact package requires `preact >=10.0.0` as a peer dependency, providing compatibility with modern Preact versions.

**Sources:** Inferred from framework integration patterns

## Production Build Strategy

All framework devtools packages implement a production build strategy that eliminates devtools code from production bundles through conditional imports.

**Diagram: Production Build Strategy**

```mermaid
graph TB
    subgraph "Development_Build"
        DEV_CODE["Application Code"]
        DEV_IMPORT["import AIDevtools"]
        DEV_PATH["@tanstack/.../devtools"]
        FULL_DEVTOOLS["Full Devtools<br/>UI + Event handlers"]
    end

    subgraph "Production_Build"
        PROD_CODE["Application Code"]
        PROD_IMPORT["import AIDevtools"]
        PROD_PATH["@tanstack/.../devtools/production"]
        NO_OP_STUB["No-op Component<br/>Zero runtime overhead"]
    end

    DEV_CODE --> DEV_IMPORT
    DEV_IMPORT --> DEV_PATH
    DEV_PATH --> FULL_DEVTOOLS

    PROD_CODE --> PROD_IMPORT
    PROD_IMPORT --> PROD_PATH
    PROD_PATH --> NO_OP_STUB
```

### Implementation Pattern

Framework-specific packages expose two entry points:

1. **Main entry** (`"."`) - Contains full devtools implementation
2. **Production entry** (`"./production"`) - Contains no-op stub

**Sources:** [packages/typescript/solid-ai-devtools/package.json:15-25](), [packages/typescript/ai-devtools/package.json:15-24]()

### Usage Pattern

Applications conditionally import the appropriate entry point based on environment:

```typescript
// Recommended pattern for build-time tree shaking
import { AIDevtools } from process.env.NODE_ENV === 'production'
  ? '@tanstack/solid-ai-devtools/production'
  : '@tanstack/solid-ai-devtools';

// Alternative: Separate imports with build tool configuration
// vite.config.ts can alias production path in production builds
```

This ensures devtools code is completely excluded from production builds without runtime overhead.

## Integration Patterns

### Solid Integration

**Diagram: Solid Devtools Lifecycle**

```mermaid
sequenceDiagram
    participant App as "Solid App"
    participant Component as "AIDevtools"
    participant Core as "@tanstack/ai-devtools-core"
    participant Events as "aiEventClient"

    App->>Component: "Mount <AIDevtools />"
    Component->>Core: "Initialize UI"
    Core->>Events: "Subscribe to events"

    loop "During Chat"
        Events->>Core: "Emit chat events"
        Core->>Core: "Update signals"
        Core->>Component: "Reactive update"
        Component->>App: "Update DOM"
    end

    App->>Component: "onCleanup()"
    Component->>Core: "Dispose UI"
    Core->>Events: "Unsubscribe"
```

**Sources:** Inferred from [packages/typescript/solid-ai-devtools/package.json:49-60]() and Solid patterns

### React Integration

**Diagram: React Devtools Lifecycle**

```mermaid
sequenceDiagram
    participant App as "React App"
    participant Component as "AIDevtools"
    participant Core as "@tanstack/ai-devtools-core"
    participant Events as "aiEventClient"

    App->>Component: "Mount <AIDevtools />"
    Component->>Core: "Initialize UI"
    Core->>Events: "Subscribe to events"

    loop "During Chat"
        Events->>Core: "Emit chat events"
        Core->>Core: "Update state"
        Core->>Component: "setState()"
        Component->>App: "Re-render"
    end

    App->>Component: "useEffect cleanup"
    Component->>Core: "Dispose UI"
    Core->>Events: "Unsubscribe"
```

**Sources:** Inferred from [packages/typescript/react-ai-devtools/package.json:54-56]()

### Preact Integration

**Diagram: Preact Devtools Lifecycle**

```mermaid
sequenceDiagram
    participant App as "Preact App"
    participant Component as "AIDevtools"
    participant Core as "@tanstack/ai-devtools-core"
    participant Events as "aiEventClient"

    App->>Component: "Mount <AIDevtools />"
    Component->>Core: "Initialize UI"
    Core->>Events: "Subscribe to events"

    loop "During Chat"
        Events->>Core: "Emit chat events"
        Core->>Core: "Update state"
        Core->>Component: "setState()"
        Component->>App: "Re-render"
    end

    App->>Component: "useEffect cleanup"
    Component->>Core: "Dispose UI"
    Core->>Events: "Unsubscribe"
```

**Sources:** Inferred from Preact patterns similar to React integration

## Core Devtools Dependency

Both framework packages depend on `@tanstack/ai-devtools-core`, which provides:

### Core Capabilities

| Feature                | Implementation             | Description                                                         |
| ---------------------- | -------------------------- | ------------------------------------------------------------------- |
| **Event Subscription** | `aiEventClient`            | Connects to `@tanstack/ai` event client to receive chat events      |
| **UI Rendering**       | `@tanstack/devtools-ui`    | Provides consistent devtools interface across frameworks            |
| **Utilities**          | `@tanstack/devtools-utils` | Common devtools patterns and helpers                                |
| **Styling**            | `goober`                   | CSS-in-JS styling with zero runtime CSS overhead                    |
| **Reactivity**         | `solid-js`                 | Efficient reactive UI updates using Solid's fine-grained reactivity |

**Sources:** [packages/typescript/ai-devtools/package.json:48-54]()

### Core Dependencies

**Diagram: Core Devtools Dependencies**

```mermaid
graph TB
    CORE["@tanstack/ai-devtools-core"]

    AI["@tanstack/ai"]
    EVENT["aiEventClient"]
    UI["@tanstack/devtools-ui"]
    UTILS["@tanstack/devtools-utils"]
    GOOBER["goober"]
    SOLID["solid-js"]

    CORE --> AI
    AI --> EVENT
    CORE --> UI
    CORE --> UTILS
    CORE --> GOOBER
    CORE --> SOLID

    EVENT -.->|"emits events"| CORE
```

**Sources:** [packages/typescript/ai-devtools/package.json:48-54](), [packages/typescript/ai/package.json:24-27]()

## Build System Integration

### Vite Configuration

All devtools packages use Vite for building with framework-specific plugins where needed.

**Diagram: Vite Build Configuration**

```mermaid
graph LR
    VITE_CONFIG["vite.config.ts"]

    subgraph "Build_Targets"
        ESM["dist/esm/"]
    end

    subgraph "Framework_Plugins"
        SOLID_PLUGIN["vite-plugin-solid"]
        REACT_PLUGIN["@vitejs/plugin-react"]
    end

    VITE_CONFIG --> ESM
    VITE_CONFIG -.->|"Solid only"| SOLID_PLUGIN
    VITE_CONFIG -.->|"React only"| REACT_PLUGIN
```

**Sources:** [packages/typescript/solid-ai-devtools/package.json:32](), [packages/typescript/solid-ai-devtools/package.json:60]()

### Package Scripts

Standard build scripts across all devtools packages:

| Script        | Command                  | Purpose                       |
| ------------- | ------------------------ | ----------------------------- |
| `build`       | `vite build`             | Compile TypeScript to ESM     |
| `clean`       | `premove ./build ./dist` | Remove build artifacts        |
| `test:build`  | `publint --strict`       | Validate package.json exports |
| `test:eslint` | `eslint ./src`           | Lint source code              |
| `test:types`  | `tsc`                    | Type check without emitting   |

**Sources:** [packages/typescript/solid-ai-devtools/package.json:31-39](), [packages/typescript/ai-devtools/package.json:30-38]()

## Type Safety

Framework-specific packages maintain full type safety through:

1. **TypeScript definitions** - Each package exports `.d.ts` files alongside JavaScript
2. **Peer dependency types** - React package requires `@types/react >=18.0.0`
3. **Core devtools types** - Inherit type definitions from `@tanstack/ai-devtools-core`

```mermaid
graph TB
    subgraph "Type Flow"
        CORE_TYPES["@tanstack/ai-devtools-core<br/>dist/esm/*.d.ts"]
        FRAMEWORK_TYPES["Framework package<br/>dist/esm/*.d.ts"]
        APP_TYPES["Application<br/>TypeScript compilation"]
    end

    CORE_TYPES --> FRAMEWORK_TYPES
    FRAMEWORK_TYPES --> APP_TYPES
```

**Sources:** [packages/typescript/solid-ai-devtools/package.json:14](), [packages/typescript/ai-devtools/package.json:13]()

## Package Publishing

### Files Included in NPM Package

Both packages include only essential files in npm distributions:

```json
"files": [
  "dist",
  "src"
]
```

This ensures:

- Built outputs in `dist/` are available for runtime
- Source code in `src/` is available for source maps and debugging
- Development artifacts (tests, config) are excluded

**Sources:** [packages/typescript/solid-ai-devtools/package.json:27-30](), [packages/typescript/ai-devtools/package.json:26-29]()

### Module Resolution

All packages output ES modules only (`"type": "module"`):

```json
{
  "type": "module",
  "module": "./dist/esm/index.js",
  "types": "./dist/esm/index.d.ts"
}
```

This provides:

- Tree-shaking support in modern bundlers
- Native ES module support in Node.js 18+
- Simplified module resolution without dual packages

**Sources:** [packages/typescript/solid-ai-devtools/package.json:12-14](), [packages/typescript/ai-devtools/package.json:12-14]()

## Testing Infrastructure

### Test Configuration

Framework-specific packages use Vitest with `--passWithNoTests` flag:

```json
"test:lib": "vitest --passWithNoTests"
```

This allows packages to pass CI even without tests, which is appropriate for thin wrapper packages that primarily delegate to core devtools.

**Sources:** [packages/typescript/solid-ai-devtools/package.json:37](), [packages/typescript/ai-devtools/package.json:36]()

### Coverage

Core devtools includes coverage configuration:

```json
"test:coverage": "vitest run --coverage",
"test:coverage:watch": "vitest --coverage --watch"
```

Coverage is collected using `@vitest/coverage-v8` for accurate instrumentation of the devtools UI code.

**Sources:** Inferred from [packages/typescript/ai-devtools/package.json:55-56]() (devDependencies)
