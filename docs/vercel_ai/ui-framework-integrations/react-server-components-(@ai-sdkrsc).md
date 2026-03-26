# React Server Components (@ai-sdk/rsc)

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [packages/ai/CHANGELOG.md](packages/ai/CHANGELOG.md)
- [packages/ai/package.json](packages/ai/package.json)
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

## Purpose and Scope

The `@ai-sdk/rsc` package provides React Server Components (RSC) integration for the AI SDK, enabling server-side streaming of AI-generated content directly to React Server Components in Next.js applications. This package differs from `@ai-sdk/react` (see [4.2](#4.2)) by executing AI generation on the server rather than through API routes, allowing seamless integration with Next.js App Router's server component architecture.

This document covers the dual-build architecture, server-side streaming APIs, streamable UI patterns, and integration mechanisms specific to RSC environments. For client-side React hooks and browser-based streaming, refer to [4.2](#4.2).

**Sources:** [packages/rsc/package.json:1-102]()

---

## Package Architecture

### Dual Build System

The `@ai-sdk/rsc` package employs a conditional exports strategy to provide separate implementations for server and client environments:

```mermaid
graph TB
    subgraph "Package Exports"
        EXPORTS["@ai-sdk/rsc"]
    end

    subgraph "Server Environment"
        SERVER["rsc-server.mjs<br/>react-server condition"]
        SERVER_API["Server-Side APIs<br/>• createStreamableUI<br/>• createStreamableValue<br/>• createAI"]
    end

    subgraph "Client Environment"
        CLIENT["rsc-client.mjs<br/>default import"]
        CLIENT_API["Client-Side APIs<br/>• readStreamableValue<br/>• useStreamableValue<br/>• useActions"]
    end

    subgraph "Build Configuration"
        TSUP["tsup build tool"]
        SERVER_BUILD["dist/rsc-server.mjs"]
        CLIENT_BUILD["dist/rsc-client.mjs"]
        TYPES["dist/index.d.ts"]
    end

    EXPORTS -->|"react-server"| SERVER
    EXPORTS -->|"import/module"| CLIENT
    SERVER --> SERVER_API
    CLIENT --> CLIENT_API

    TSUP --> SERVER_BUILD
    TSUP --> CLIENT_BUILD
    TSUP --> TYPES

    SERVER_BUILD -.maps to.-> SERVER
    CLIENT_BUILD -.maps to.-> CLIENT
```

**Sources:** [packages/rsc/package.json:27-34]()

| Export Condition  | File                  | Environment       | APIs Provided                  |
| ----------------- | --------------------- | ----------------- | ------------------------------ |
| `react-server`    | `dist/rsc-server.mjs` | Server Components | Streaming creation, AI actions |
| `import`/`module` | `dist/rsc-client.mjs` | Client Components | Stream consumption, hooks      |
| `types`           | `dist/index.d.ts`     | Both              | TypeScript definitions         |

**Sources:** [packages/rsc/package.json:27-34]()

---

## Server-Side Streaming Architecture

### Core Server Components

The server-side build provides APIs for creating streamable content that can be consumed by React Server Components:

```mermaid
graph LR
    subgraph "Server Action"
        ACTION["Server Action<br/>async function"]
        STREAM_TEXT["streamText()<br/>from ai package"]
        CREATE_UI["createStreamableUI()"]
        CREATE_VALUE["createStreamableValue()"]
    end

    subgraph "AI SDK Core"
        MODEL["LanguageModelV3"]
        TEXT_STREAM["TextStream"]
        UI_STREAM["UIMessageStream"]
    end

    subgraph "Streamable Primitives"
        UI_STREAMABLE["StreamableUI<br/>React elements"]
        VALUE_STREAMABLE["StreamableValue<br/>Typed data"]
        STATE["Internal state<br/>jsondiffpatch"]
    end

    subgraph "Client Components"
        USE_VALUE["useStreamableValue()"]
        RENDER["React render"]
    end

    ACTION --> STREAM_TEXT
    ACTION --> CREATE_UI
    ACTION --> CREATE_VALUE

    STREAM_TEXT --> MODEL
    STREAM_TEXT --> TEXT_STREAM
    TEXT_STREAM --> UI_STREAM

    CREATE_UI --> UI_STREAMABLE
    CREATE_VALUE --> VALUE_STREAMABLE

    UI_STREAMABLE --> STATE
    VALUE_STREAMABLE --> STATE

    UI_STREAMABLE -.serialized.-> USE_VALUE
    VALUE_STREAMABLE -.serialized.-> USE_VALUE
    USE_VALUE --> RENDER
```

**Sources:** [packages/rsc/package.json:47-52](), [packages/ai/package.json:1-117]()

### State Synchronization with jsondiffpatch

The package uses `jsondiffpatch` version `0.7.3` to efficiently synchronize state between server and client:

```mermaid
sequenceDiagram
    participant Server as Server Component
    participant Streamable as StreamableUI/Value
    participant Diff as jsondiffpatch
    participant Wire as RSC Wire Protocol
    participant Client as Client Component

    Server->>Streamable: Initial state
    Streamable->>Diff: Compute baseline
    Diff->>Wire: Send initial payload
    Wire->>Client: Hydrate

    Server->>Streamable: Update state
    Streamable->>Diff: Compute delta
    Diff->>Wire: Send patch
    Wire->>Client: Apply patch

    Server->>Streamable: Update state
    Streamable->>Diff: Compute delta
    Diff->>Wire: Send patch
    Wire->>Client: Apply patch

    Server->>Streamable: done()
    Streamable->>Wire: Send completion
    Wire->>Client: Finalize
```

The incremental patching mechanism reduces bandwidth by transmitting only state changes rather than full snapshots on each update.

**Sources:** [packages/rsc/package.json:51](), [packages/rsc/CHANGELOG.md:879]()

---

## Integration with Next.js App Router

### Server Actions and RSC Flow

```mermaid
graph TB
    subgraph "Client Component (page.tsx)"
        UI["UI Component<br/>use client"]
        ACTIONS["useActions()<br/>from @ai-sdk/rsc"]
        INVOKE["actions.generateResponse()"]
    end

    subgraph "Server Action (actions.ts)"
        ACTION["async generateResponse()<br/>use server"]
        AI["createAI()<br/>provider context"]
        STREAM["streamText()<br/>+ createStreamableUI()"]
    end

    subgraph "RSC Runtime"
        SERIALIZER["RSC Serialization<br/>react-server-dom-webpack"]
        TRANSPORT["Server->Client Transport"]
    end

    subgraph "Client Hydration"
        HOOK["useStreamableValue()"]
        RENDER["Progressive Rendering"]
    end

    UI --> ACTIONS
    ACTIONS --> INVOKE
    INVOKE -->|Server Action call| ACTION

    ACTION --> AI
    ACTION --> STREAM

    STREAM --> SERIALIZER
    SERIALIZER --> TRANSPORT
    TRANSPORT --> HOOK
    HOOK --> RENDER
    RENDER -.updates.-> UI
```

**Sources:** [packages/rsc/package.json:63](), [packages/rsc/package.json:74-75]()

### createAI Provider Pattern

The `createAI()` function establishes a provider context for server actions, enabling stateful AI interactions across component boundaries:

| Feature           | Description                        | Use Case                    |
| ----------------- | ---------------------------------- | --------------------------- |
| Action Context    | Wraps server actions with AI state | Multi-turn conversations    |
| State Persistence | Maintains conversation history     | Chat continuity             |
| Streaming Support | Enables progressive updates        | Real-time AI responses      |
| Type Safety       | TypeScript generics for state      | Strongly-typed interactions |

**Sources:** [packages/rsc/package.json:96-101]()

---

## Streamable UI Pattern

### createStreamableUI() Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Created: createStreamableUI()
    Created --> Streaming: update(element)
    Streaming --> Streaming: update(element)
    Streaming --> Appending: append(element)
    Appending --> Appending: append(element)
    Appending --> Streaming: update(element)
    Streaming --> Done: done(element)
    Appending --> Done: done(element)
    Done --> [*]

    Created --> Error: error(message)
    Streaming --> Error: error(message)
    Appending --> Error: error(message)
    Error --> [*]
```

**StreamableUI Methods:**

| Method     | Signature                    | Behavior               |
| ---------- | ---------------------------- | ---------------------- |
| `update()` | `update(element: ReactNode)` | Replaces current UI    |
| `append()` | `append(element: ReactNode)` | Adds to existing UI    |
| `done()`   | `done(element?: ReactNode)`  | Finalizes stream       |
| `error()`  | `error(message: string)`     | Emits error state      |
| `value`    | `Promise<ReactNode>`         | Resolves when complete |

**Sources:** Inferred from package architecture and RSC streaming patterns

---

## Client-Side Consumption

### Hook-Based Stream Reading

The client-side build provides hooks for consuming server-streamed content:

```mermaid
graph TB
    subgraph "Server Stream Source"
        STREAMABLE["StreamableUI/Value"]
    end

    subgraph "Client Component"
        USE_STREAMABLE["useStreamableValue()<br/>React hook"]
        STATE["Local state<br/>[data, error, pending]"]
        EFFECT["useEffect<br/>Subscribe to updates"]
    end

    subgraph "Rendering Pipeline"
        CONDITIONAL["Conditional rendering<br/>pending ? loading : data"]
        ERROR_UI["Error boundary<br/>if error"]
        FINAL_UI["Final UI"]
    end

    STREAMABLE -.RSC payload.-> USE_STREAMABLE
    USE_STREAMABLE --> STATE
    STATE --> EFFECT
    EFFECT -.updates.-> STATE

    STATE --> CONDITIONAL
    STATE --> ERROR_UI
    CONDITIONAL --> FINAL_UI
    ERROR_UI --> FINAL_UI
```

**Return Value Structure:**

```typescript
// useStreamableValue() returns tuple:
[
  data: T | undefined,      // Current value
  error: Error | undefined, // Error if failed
  pending: boolean          // Stream incomplete
]
```

**Sources:** Inferred from client-side API patterns

---

## Dependency Architecture

### Package Dependencies

```mermaid
graph TB
    subgraph "@ai-sdk/rsc"
        RSC["@ai-sdk/rsc<br/>v3.0.0-beta.7"]
    end

    subgraph "Core Dependencies"
        AI["ai<br/>workspace:*"]
        PROVIDER["@ai-sdk/provider<br/>workspace:*"]
        UTILS["@ai-sdk/provider-utils<br/>workspace:*"]
        DIFF["jsondiffpatch<br/>0.7.3"]
    end

    subgraph "Peer Dependencies"
        REACT["react<br/>^18 || ~19.0.1 || ~19.1.2 || ^19.2.1"]
        ZOD["zod (optional)<br/>^3.25.76 || ^4.1.8"]
    end

    subgraph "Dev Dependencies (RSC Protocol)"
        WEBPACK["react-server-dom-webpack<br/>18.3.0-canary"]
    end

    RSC --> AI
    RSC --> PROVIDER
    RSC --> UTILS
    RSC --> DIFF

    RSC -.peer.-> REACT
    RSC -.peer optional.-> ZOD

    RSC -.dev.-> WEBPACK
```

**Dependency Rationale:**

| Package                    | Version   | Purpose                            |
| -------------------------- | --------- | ---------------------------------- |
| `ai`                       | workspace | Core text generation, streaming    |
| `@ai-sdk/provider`         | workspace | Model interfaces (LanguageModelV3) |
| `@ai-sdk/provider-utils`   | workspace | Shared utilities, validation       |
| `jsondiffpatch`            | 0.7.3     | Incremental state synchronization  |
| `react`                    | 18/19     | RSC runtime, peer dependency       |
| `react-server-dom-webpack` | canary    | Dev/test RSC protocol              |

**Sources:** [packages/rsc/package.json:47-76]()

---

## Build and Testing Infrastructure

### Multi-Environment Testing

The package employs comprehensive testing across multiple runtime environments:

```mermaid
graph LR
    subgraph "Test Suites"
        NODE["vitest.node.config.js<br/>Node.js runtime"]
        EDGE["vitest.edge.config.js<br/>Edge runtime"]
        REACT["vitest.ui.react.config.js<br/>React components"]
        E2E["playwright test<br/>End-to-end"]
    end

    subgraph "Test Execution"
        UNIT["Unit tests<br/>src/**/*.test.ts"]
        INTEGRATION["Integration tests<br/>RSC protocol"]
        BROWSER["Browser tests<br/>Component rendering"]
    end

    NODE --> UNIT
    EDGE --> UNIT
    REACT --> BROWSER
    E2E --> INTEGRATION
    E2E --> BROWSER
```

**Test Scripts:**

| Script          | Configuration               | Environment        |
| --------------- | --------------------------- | ------------------ |
| `test:node`     | `vitest.node.config.js`     | Node.js runtime    |
| `test:edge`     | `vitest.edge.config.js`     | Edge runtime       |
| `test:ui:react` | `vitest.ui.react.config.js` | React/jsdom        |
| `test:e2e`      | `playwright.config.ts`      | Browser automation |

**Sources:** [packages/rsc/package.json:16-25]()

---

## Version Coordination

### Beta Release Synchronization

The package follows coordinated versioning with the core AI SDK:

```mermaid
graph TB
    subgraph "Current Versions (v7 Beta)"
        RSC_V["@ai-sdk/rsc<br/>3.0.0-beta.7"]
        AI_V["ai<br/>7.0.0-beta.7"]
        PROVIDER_V["@ai-sdk/provider<br/>4.0.0-beta.0"]
        UTILS_V["@ai-sdk/provider-utils<br/>5.0.0-beta.1"]
    end

    subgraph "Pre-Release Mode"
        PRE_JSON[".changeset/pre.json<br/>beta mode"]
        CHANGESETS["Changesets workflow"]
    end

    PRE_JSON --> RSC_V
    PRE_JSON --> AI_V
    PRE_JSON --> PROVIDER_V
    PRE_JSON --> UTILS_V

    CHANGESETS --> PRE_JSON
```

The package is currently in **v7 pre-release mode** (major version 3.0.0-beta.7), coordinated via changesets to ensure breaking changes across `ai`, `@ai-sdk/provider`, and `@ai-sdk/provider-utils` remain synchronized.

**Version Mapping:**

| Package                  | Stable (v6) | Beta (v7)    | Change Scope       |
| ------------------------ | ----------- | ------------ | ------------------ |
| `ai`                     | 6.0.x       | 7.0.0-beta.x | Core API changes   |
| `@ai-sdk/rsc`            | 2.0.x       | 3.0.0-beta.x | RSC API updates    |
| `@ai-sdk/provider`       | 3.0.x       | 4.0.0-beta.x | Provider interface |
| `@ai-sdk/provider-utils` | 4.0.x       | 5.0.0-beta.x | Utility functions  |

**Sources:** [packages/rsc/package.json:3](), [packages/rsc/CHANGELOG.md:3-62]()

---

## Comparison with @ai-sdk/react

### Architectural Differences

| Aspect                | @ai-sdk/rsc                      | @ai-sdk/react            |
| --------------------- | -------------------------------- | ------------------------ |
| **Execution Context** | Server Components                | Client-side hooks        |
| **Network Model**     | RSC serialization                | HTTP API routes          |
| **State Management**  | Server-side streaming            | Client-side state (SWR)  |
| **Build Outputs**     | Dual (server/client)             | Single (client)          |
| **Primary APIs**      | `createStreamableUI`, `createAI` | `useChat`, `useObject`   |
| **Transport**         | RSC wire protocol                | `ChatTransport` (HTTP)   |
| **Rendering**         | Progressive server updates       | Client-side incremental  |
| **Use Case**          | App Router, server actions       | Pages Router, API routes |

**Sources:** [packages/rsc/package.json:1-102](), [packages/react/package.json:1-84]()

### When to Use Each Package

```mermaid
graph TD
    START{Next.js Architecture?}

    START -->|App Router| APP_ROUTER{Server Actions?}
    START -->|Pages Router| PAGES

    APP_ROUTER -->|Yes| RSC["Use @ai-sdk/rsc<br/>Server Components"]
    APP_ROUTER -->|No| API_ROUTE["Use @ai-sdk/react<br/>+ API routes"]

    PAGES -->|API routes| REACT["Use @ai-sdk/react<br/>Client-side hooks"]

    RSC --> RSC_BENEFITS["• Server-side execution<br/>• No API route needed<br/>• Direct model access"]

    REACT --> REACT_BENEFITS["• Browser compatibility<br/>• Traditional REST<br/>• Stateful client UI"]
```

**Sources:** [packages/rsc/package.json:96-101](), [packages/react/package.json:80-83]()
