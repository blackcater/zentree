# Angular and Solid Integrations

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [packages/ai/CHANGELOG.md](packages/ai/CHANGELOG.md)
- [packages/ai/package.json](packages/ai/package.json)
- [packages/angular/CHANGELOG.md](packages/angular/CHANGELOG.md)
- [packages/angular/package.json](packages/angular/package.json)
- [packages/react/CHANGELOG.md](packages/react/CHANGELOG.md)
- [packages/react/package.json](packages/react/package.json)
- [packages/rsc/CHANGELOG.md](packages/rsc/CHANGELOG.md)
- [packages/rsc/package.json](packages/rsc/package.json)
- [packages/rsc/tests/e2e/next-server/CHANGELOG.md](packages/rsc/tests/e2e/next-server/CHANGELOG.md)
- [packages/svelte/CHANGELOG.md](packages/svelte/CHANGELOG.md)
- [packages/svelte/package.json](packages/svelte/package.json)
- [packages/vue/CHANGELOG.md](packages/vue/CHANGELOG.md)
- [packages/vue/package.json](packages/vue/package.json)

</details>



This page documents the Angular and Solid.js framework integrations for the AI SDK. These packages provide reactive UI components and services for building AI-powered chat interfaces using framework-specific patterns. Angular integration leverages Angular's signals and dependency injection system, while Solid integration uses Solid's reactive primitives.

For React integration patterns, see [React Integration](#4.2). For Vue and Svelte integrations, see [Vue and Svelte Integrations](#4.3). For the underlying framework-agnostic architecture, see [Framework-Agnostic Chat Architecture](#4.1).

---

## Package Overview

The Angular and Solid integrations exist as separate packages in the monorepo structure:

| Package | Version | Peer Dependencies | Purpose |
|---------|---------|-------------------|---------|
| `@ai-sdk/angular` | 3.0.0-beta.7 | `@angular/core >=16.0.0` | Angular services and components using signals and DI |
| `@ai-sdk/solid` | (Not in provided files) | TBD | Solid.js reactive primitives integration |

**Sources:** [packages/angular/package.json:1-60]()

---

## Angular Integration Architecture

### Package Structure

```mermaid
graph TB
    subgraph "Angular Package"
        ANGULAR_PKG["@ai-sdk/angular<br/>version: 3.0.0-beta.7"]
        ANGULAR_DIST["dist/<br/>index.cjs, index.mjs, index.d.ts"]
        ANGULAR_SRC["src/<br/>Implementation files"]
    end
    
    subgraph "Dependencies"
        AI_CORE["ai<br/>workspace:*"]
        PROVIDER_UTILS["@ai-sdk/provider-utils<br/>workspace:*"]
    end
    
    subgraph "Peer Dependencies"
        ANGULAR_CORE["@angular/core<br/>>=16.0.0"]
    end
    
    subgraph "Build System"
        TSUP["tsup<br/>Bundle tool"]
        VITEST["vitest<br/>Testing"]
    end
    
    ANGULAR_PKG --> ANGULAR_DIST
    ANGULAR_SRC --> ANGULAR_DIST
    ANGULAR_PKG --> AI_CORE
    ANGULAR_PKG --> PROVIDER_UTILS
    ANGULAR_PKG -.requires.-> ANGULAR_CORE
    ANGULAR_SRC --> TSUP
    ANGULAR_SRC --> VITEST
```

**Sources:** [packages/angular/package.json:1-60]()

---

### Angular-Specific Patterns

Angular integration differs from other framework integrations in several key ways:

| Feature | Angular Pattern | React/Vue Pattern |
|---------|----------------|-------------------|
| Reactivity | Signals (`signal()`, `computed()`) | Hooks/Refs (`useState`, `ref()`) |
| Dependency Management | Dependency Injection (`@Injectable`) | Import/Context |
| Lifecycle | Services (singleton/scoped) | Hooks lifecycle |
| State Management | RxJS + Signals | State hooks |
| Minimum Version | Angular 16.0.0+ (signals support) | React 18+ / Vue 3.3.4+ |

The requirement for `@angular/core >=16.0.0` indicates that the integration leverages Angular's signals API, introduced in Angular 16 as a first-class reactive primitive.

**Sources:** [packages/angular/package.json:54-56]()

---

### Build Configuration

```mermaid
graph LR
    subgraph "Build Scripts"
        BUILD["build<br/>pnpm clean && tsup"]
        WATCH["build:watch<br/>tsup --watch"]
        CLEAN["clean<br/>del-cli dist"]
    end
    
    subgraph "Quality Scripts"
        LINT["lint<br/>eslint"]
        TYPE["type-check<br/>tsc --build"]
        PRETTIER["prettier-check"]
    end
    
    subgraph "Test Scripts"
        TEST["test<br/>vitest --run"]
        TEST_WATCH["test:watch<br/>vitest"]
        TEST_UPDATE["test:update<br/>vitest -u"]
    end
    
    subgraph "Output"
        DIST_CJS["dist/index.cjs"]
        DIST_MJS["dist/index.mjs"]
        DIST_DTS["dist/index.d.ts"]
    end
    
    BUILD --> DIST_CJS
    BUILD --> DIST_MJS
    BUILD --> DIST_DTS
```

**Sources:** [packages/angular/package.json:9-18]()

---

## Expected Integration Patterns

Based on the Angular package structure and peer dependencies, the integration likely provides:

### Service-Based Architecture

Angular services would inject the core AI SDK functionality:

```mermaid
graph TB
    subgraph "Angular Application"
        COMPONENT["ChatComponent<br/>@Component"]
        TEMPLATE["Template<br/>HTML with signals"]
    end
    
    subgraph "Angular Services"
        CHAT_SERVICE["ChatService<br/>@Injectable"]
        SIGNALS["Signals<br/>messages(), status()"]
    end
    
    subgraph "Core AI SDK"
        ABSTRACT_CHAT["AbstractChat<br/>Base implementation"]
        CHAT_TRANSPORT["ChatTransport<br/>HTTP communication"]
    end
    
    subgraph "Framework Integration"
        DI_CONTAINER["DI Container<br/>Angular Injector"]
    end
    
    COMPONENT --> CHAT_SERVICE
    COMPONENT --> SIGNALS
    CHAT_SERVICE --> ABSTRACT_CHAT
    CHAT_SERVICE --> CHAT_TRANSPORT
    CHAT_SERVICE --> SIGNALS
    DI_CONTAINER --> CHAT_SERVICE
    
    TEMPLATE -.binds to.-> SIGNALS
```

**Sources:** [packages/angular/package.json:38-41]()

---

### Signal-Based Reactivity

Angular 16+ signals would provide reactive state management:

| State Property | Signal Type | Purpose |
|----------------|-------------|---------|
| `messages()` | `Signal<UIMessage[]>` | Readonly message list |
| `input()` | `WritableSignal<string>` | User input binding |
| `status()` | `Signal<ChatStatus>` | Chat state (ready/submitted/streaming) |
| `error()` | `Signal<Error \| undefined>` | Error state |
| `isLoading()` | `Computed<boolean>` | Derived from status |

This pattern aligns with Angular's shift toward signals as the primary reactivity mechanism, replacing RxJS Observables for simpler use cases.

**Sources:** [packages/angular/package.json:54-56]()

---

## Package Exports and Module Resolution

### Export Configuration

```mermaid
graph LR
    subgraph "Export Map"
        PKG_JSON["./package.json"]
        DEFAULT[".<br/>Main export"]
    end
    
    subgraph "Module Formats"
        TYPES["types<br/>./dist/index.d.ts"]
        IMPORT["import<br/>./dist/index.mjs"]
        REQUIRE["require<br/>./dist/index.js"]
    end
    
    subgraph "Bundlers"
        ESM_BUNDLER["ESM Bundler<br/>Vite, Webpack 5+"]
        CJS_BUNDLER["CJS Bundler<br/>Node.js, older tools"]
    end
    
    DEFAULT --> TYPES
    DEFAULT --> IMPORT
    DEFAULT --> REQUIRE
    
    IMPORT --> ESM_BUNDLER
    REQUIRE --> CJS_BUNDLER
```

The package provides dual module format support (CJS and ESM) to ensure compatibility across different Angular project configurations and build tools.

**Sources:** [packages/angular/package.json:20-27]()

---

## Dependency Chain

```mermaid
graph TB
    subgraph "Application Layer"
        APP["Angular App<br/>@angular/core >=16.0.0"]
    end
    
    subgraph "@ai-sdk/angular"
        ANGULAR_PKG["@ai-sdk/angular<br/>3.0.0-beta.7"]
    end
    
    subgraph "Workspace Dependencies"
        AI_CORE["ai<br/>7.0.0-beta.7"]
        PROVIDER_UTILS["@ai-sdk/provider-utils<br/>5.0.0-beta.1"]
    end
    
    subgraph "Core Dependencies"
        PROVIDER["@ai-sdk/provider<br/>Provider interfaces"]
        GATEWAY["@ai-sdk/gateway<br/>Model routing"]
    end
    
    APP --> ANGULAR_PKG
    ANGULAR_PKG --> AI_CORE
    ANGULAR_PKG --> PROVIDER_UTILS
    AI_CORE --> PROVIDER
    AI_CORE --> GATEWAY
    PROVIDER_UTILS --> PROVIDER
```

All workspace dependencies use `workspace:*` protocol, ensuring version alignment across the monorepo during development and replaced with actual versions during publishing.

**Sources:** [packages/angular/package.json:38-41](), [packages/ai/package.json:62-67]()

---

## Version Coordination

### Beta Release Synchronization

The Angular package follows the same beta versioning strategy as the core AI SDK:

```mermaid
graph LR
    subgraph "v7 Beta Series"
        AI_7["ai@7.0.0-beta.7"]
        ANGULAR_3["@ai-sdk/angular@3.0.0-beta.7"]
        PROVIDER_5["@ai-sdk/provider-utils@5.0.0-beta.1"]
    end
    
    subgraph "Previous Stable"
        AI_6["ai@6.0.116"]
        ANGULAR_2["@ai-sdk/angular@2.0.116"]
    end
    
    AI_7 -.coordinated release.-> ANGULAR_3
    AI_7 -.coordinated release.-> PROVIDER_5
    
    AI_6 -.previous version.-> AI_7
    ANGULAR_2 -.previous version.-> ANGULAR_3
```

Version bumps are coordinated through Changesets (`.changeset/pre.json` indicates beta pre-release mode), ensuring all packages move together during major version transitions.

**Sources:** [packages/angular/package.json:3](), [packages/ai/package.json:3](), [packages/ai/CHANGELOG.md:1-7]()

---

## Testing and Quality Infrastructure

### Test Configuration

The Angular package uses Vitest for testing, configured with:

| Script | Command | Purpose |
|--------|---------|---------|
| `test` | `vitest --config vitest.config.ts --run` | Run tests once |
| `test:watch` | `vitest --config vitest.config.ts` | Watch mode for development |
| `test:update` | `vitest --config vitest.config.ts --run -u` | Update snapshots |

The use of `jsdom` as a dev dependency suggests browser environment testing for DOM interactions.

**Sources:** [packages/angular/package.json:16-18](), [packages/angular/package.json:48]()

---

## Solid Integration Status

Based on the provided files, the Solid integration package (`@ai-sdk/solid`) is not present in the monorepo structure shown. However, the table of contents indicates it should exist.

### Expected Solid Architecture

If implemented, the Solid integration would likely follow this pattern:

```mermaid
graph TB
    subgraph "Solid Application"
        SOLID_COMPONENT["Solid Component<br/>JSX"]
    end
    
    subgraph "@ai-sdk/solid (Expected)"
        CREATE_CHAT["createChat()<br/>Reactive hook"]
        SOLID_SIGNALS["Solid Signals<br/>createSignal, createMemo"]
    end
    
    subgraph "Core AI SDK"
        ABSTRACT_CHAT["AbstractChat<br/>Base implementation"]
    end
    
    SOLID_COMPONENT --> CREATE_CHAT
    CREATE_CHAT --> SOLID_SIGNALS
    CREATE_CHAT --> ABSTRACT_CHAT
```

Solid's reactive primitives (`createSignal`, `createMemo`, `createEffect`) would provide fine-grained reactivity similar to Svelte 5's runes or Vue's composition API.

**Sources:** Based on pattern analysis from [packages/react/package.json](), [packages/vue/package.json](), [packages/svelte/package.json]()

---

## Comparison with Other Framework Integrations

### Package Size and Complexity

| Framework | Package Version | Key Dependencies | Reactivity Model |
|-----------|----------------|------------------|------------------|
| React | `@ai-sdk/react@4.0.0-beta.7` | `swr`, `throttleit` | Hooks + External state (SWR) |
| Vue | `@ai-sdk/vue@4.0.0-beta.7` | `swrv` | Composables + Reactive refs |
| Svelte | `@ai-sdk/svelte@5.0.0-beta.7` | None (uses $state runes) | Built-in reactivity |
| Angular | `@ai-sdk/angular@3.0.0-beta.7` | None | Signals (Angular 16+) |

Angular and Svelte integrations are unique in not requiring external state management libraries, relying entirely on framework-native reactivity systems.

**Sources:** [packages/angular/package.json:38-41](), [packages/react/package.json:39-43](), [packages/vue/package.json:39-42](), [packages/svelte/package.json:51-53]()

---

### Version Numbering Divergence

```mermaid
graph LR
    subgraph "Current Versions (Beta 7)"
        SVELTE["Svelte: 5.0.0-beta.7"]
        REACT["React: 4.0.0-beta.7"]
        VUE["Vue: 4.0.0-beta.7"]
        ANGULAR["Angular: 3.0.0-beta.7"]
        RSC["RSC: 3.0.0-beta.7"]
    end
    
    subgraph "Core SDK"
        AI["ai: 7.0.0-beta.7"]
    end
    
    AI -.coordinates.-> SVELTE
    AI -.coordinates.-> REACT
    AI -.coordinates.-> VUE
    AI -.coordinates.-> ANGULAR
    AI -.coordinates.-> RSC
```

The major version numbers differ across framework packages:
- Svelte: v5 (aligns with Svelte 5 requirement)
- React/Vue: v4
- Angular/RSC: v3

This suggests different breaking change histories for each framework integration, though all track with the core `ai` package's v7 beta cycle.

**Sources:** [packages/svelte/package.json:3](), [packages/react/package.json:3](), [packages/vue/package.json:3](), [packages/angular/package.json:3](), [packages/rsc/package.json:3]()

---

## Development Workflow

### Local Development Setup

For developers working with the Angular integration:

```mermaid
graph TB
    subgraph "Development Commands"
        INSTALL["pnpm install<br/>Install dependencies"]
        BUILD_WATCH["pnpm build:watch<br/>Watch mode compilation"]
        TEST_WATCH["pnpm test:watch<br/>Test watch mode"]
    end
    
    subgraph "Quality Checks"
        LINT["pnpm lint<br/>ESLint check"]
        TYPE_CHECK["pnpm type-check<br/>TypeScript validation"]
        PRETTIER["pnpm prettier-check<br/>Code formatting"]
    end
    
    subgraph "Output"
        DIST["dist/ directory<br/>Compiled outputs"]
    end
    
    INSTALL --> BUILD_WATCH
    BUILD_WATCH --> DIST
    BUILD_WATCH --> TEST_WATCH
    
    LINT -.validation.-> DIST
    TYPE_CHECK -.validation.-> DIST
    PRETTIER -.validation.-> DIST
```

**Sources:** [packages/angular/package.json:9-18]()

---

## Publish Configuration

### NPM Package Settings

```mermaid
graph TB
    subgraph "Package Files"
        DIST["dist/**/*<br/>Compiled code"]
        SRC["src<br/>(Excluding tests)"]
        CHANGELOG["CHANGELOG.md"]
        README["README.md"]
    end
    
    subgraph "Excluded Files"
        TESTS["src/**/*.test.ts"]
        SNAPSHOTS["src/**/__snapshots__"]
        FIXTURES["src/**/__fixtures__"]
    end
    
    subgraph "NPM Registry"
        PUBLISHED["@ai-sdk/angular<br/>Public package"]
    end
    
    DIST --> PUBLISHED
    SRC --> PUBLISHED
    CHANGELOG --> PUBLISHED
    README --> PUBLISHED
    
    TESTS -.-x PUBLISHED
    SNAPSHOTS -.-x PUBLISHED
    FIXTURES -.-x PUBLISHED
```

The package is configured for public access on NPM with `"publishConfig": { "access": "public" }`.

**Sources:** [packages/angular/package.json:28-37](), [packages/angular/package.json:57-59]()

---

## Integration with Core Architecture

Both Angular and Solid integrations consume the framework-agnostic `AbstractChat` class from the core AI SDK:

```mermaid
graph TB
    subgraph "Framework Implementations"
        REACT_HOOK["React<br/>useChat hook<br/>useSyncExternalStore"]
        VUE_COMPOSABLE["Vue<br/>useChat composable<br/>watch/computed"]
        SVELTE_CLASS["Svelte<br/>Chat class<br/>$state runes"]
        ANGULAR_SERVICE["Angular<br/>ChatService (expected)<br/>signals"]
    end
    
    subgraph "Shared Base"
        ABSTRACT["AbstractChat<br/>Framework-agnostic logic"]
        CHAT_STATE["ChatState interface<br/>messages, status, error"]
        TRANSPORT["ChatTransport<br/>HTTP/custom"]
    end
    
    REACT_HOOK --> ABSTRACT
    VUE_COMPOSABLE --> ABSTRACT
    SVELTE_CLASS --> ABSTRACT
    ANGULAR_SERVICE --> ABSTRACT
    
    ABSTRACT --> CHAT_STATE
    ABSTRACT --> TRANSPORT
```

This shared architecture ensures consistent behavior across all framework integrations while allowing framework-specific reactive patterns.

**Sources:** Based on architectural patterns from provided package.json files and changelog references