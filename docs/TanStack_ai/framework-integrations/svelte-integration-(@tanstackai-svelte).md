# Svelte Integration (@tanstack/ai-svelte)

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [.github/workflows/autofix.yml](.github/workflows/autofix.yml)
- [.github/workflows/release.yml](.github/workflows/release.yml)
- [examples/ts-svelte-chat/CHANGELOG.md](examples/ts-svelte-chat/CHANGELOG.md)
- [examples/ts-svelte-chat/package.json](examples/ts-svelte-chat/package.json)
- [examples/ts-vue-chat/CHANGELOG.md](examples/ts-vue-chat/CHANGELOG.md)
- [examples/ts-vue-chat/package.json](examples/ts-vue-chat/package.json)
- [nx.json](nx.json)
- [package.json](package.json)
- [packages/typescript/ai-anthropic/package.json](packages/typescript/ai-anthropic/package.json)
- [packages/typescript/ai-gemini/CHANGELOG.md](packages/typescript/ai-gemini/CHANGELOG.md)
- [packages/typescript/ai-gemini/package.json](packages/typescript/ai-gemini/package.json)
- [packages/typescript/ai-ollama/package.json](packages/typescript/ai-ollama/package.json)
- [packages/typescript/ai-openai/CHANGELOG.md](packages/typescript/ai-openai/CHANGELOG.md)
- [packages/typescript/ai-openai/package.json](packages/typescript/ai-openai/package.json)
- [packages/typescript/ai-react-ui/package.json](packages/typescript/ai-react-ui/package.json)
- [packages/typescript/ai-react/package.json](packages/typescript/ai-react/package.json)
- [packages/typescript/ai-solid-ui/package.json](packages/typescript/ai-solid-ui/package.json)
- [packages/typescript/ai-solid/package.json](packages/typescript/ai-solid/package.json)
- [packages/typescript/ai-solid/tsdown.config.ts](packages/typescript/ai-solid/tsdown.config.ts)
- [packages/typescript/ai-svelte/package.json](packages/typescript/ai-svelte/package.json)
- [packages/typescript/ai-vue-ui/package.json](packages/typescript/ai-vue-ui/package.json)
- [packages/typescript/ai-vue/package.json](packages/typescript/ai-vue/package.json)
- [packages/typescript/smoke-tests/adapters/CHANGELOG.md](packages/typescript/smoke-tests/adapters/CHANGELOG.md)
- [packages/typescript/smoke-tests/adapters/package.json](packages/typescript/smoke-tests/adapters/package.json)
- [packages/typescript/smoke-tests/e2e/CHANGELOG.md](packages/typescript/smoke-tests/e2e/CHANGELOG.md)
- [packages/typescript/smoke-tests/e2e/package.json](packages/typescript/smoke-tests/e2e/package.json)
- [pnpm-lock.yaml](pnpm-lock.yaml)
- [scripts/generate-docs.ts](scripts/generate-docs.ts)

</details>

## Purpose and Scope

The `@tanstack/ai-svelte` package provides Svelte bindings for TanStack AI, enabling Svelte applications to build AI chat interfaces with reactive state management. This package wraps the framework-agnostic `@tanstack/ai-client` library and exposes a `useChat` binding that integrates with Svelte 5's runes-based reactivity system.

This document covers the Svelte-specific integration layer. For information about:

- Core AI functionality and adapters, see [Core Library (@tanstack/ai)](#3)
- Client-side state management implementation, see [Client Libraries](#4)
- React, Solid, Vue, or Preact integrations, see pages [#6.1](#6.1), [#6.2](#6.2), [#6.3](#6.3), or [#6.5](#6.5)

Unlike the React, Solid, and Vue integrations which have companion UI component libraries, the Svelte integration currently has no pre-built UI components package. The example application demonstrates manual markdown rendering using third-party libraries.

**Sources**: [packages/typescript/ai-svelte/package.json:1-64](), [pnpm-lock.yaml:913-949](), [examples/ts-svelte-chat/package.json:1-41]()

## Package Architecture

### Dependency Structure

```mermaid
graph TB
    subgraph "Application Layer"
        APP["Svelte Application<br/>using @tanstack/ai-svelte"]
    end

    subgraph "Framework Integration"
        SVELTE_PKG["@tanstack/ai-svelte<br/>version: 0.2.2<br/>useChat binding<br/>Svelte 5 runes"]
    end

    subgraph "Core Libraries"
        CLIENT["@tanstack/ai-client<br/>workspace dependency<br/>ChatClient class<br/>State management"]
        AI["@tanstack/ai<br/>workspace peer dependency<br/>Types and utilities"]
    end

    subgraph "Framework Runtime"
        SVELTE["svelte<br/>^5.0.0 peer dependency<br/>Runes reactivity"]
    end

    APP --> SVELTE_PKG
    SVELTE_PKG --> CLIENT
    SVELTE_PKG -.peer.-> AI
    SVELTE_PKG -.peer.-> SVELTE

    style SVELTE_PKG fill:#f9f9f9
    style CLIENT fill:#e8e8e8
```

**Dependency Analysis**:

| Dependency Type | Package                        | Version Constraint | Purpose                               |
| --------------- | ------------------------------ | ------------------ | ------------------------------------- |
| Direct          | `@tanstack/ai-client`          | `workspace:*`      | Chat state management and streaming   |
| Peer            | `@tanstack/ai`                 | `workspace:^`      | Core types and interfaces             |
| Peer            | `svelte`                       | `^5.0.0`           | Svelte 5 framework runtime with runes |
| Dev             | `@sveltejs/package`            | `^2.3.10`          | Package building tool                 |
| Dev             | `@sveltejs/vite-plugin-svelte` | `^5.1.1`           | Vite integration for development      |
| Dev             | `svelte-check`                 | `^4.2.0`           | Type checking (replaces tsc)          |

The package has a minimal dependency footprint, relying primarily on `@tanstack/ai-client` for all core functionality. The Svelte 5 peer dependency is strict, requiring version 5.0.0 or higher to leverage the runes reactivity system.

**Sources**: [packages/typescript/ai-svelte/package.json:1-64](), [pnpm-lock.yaml:913-949]()

### File Structure and Build System

```mermaid
graph LR
    subgraph "Source Directory"
        SRC["src/<br/>TypeScript source"]
    end

    subgraph "Build Process"
        SVELTE_PKG_TOOL["svelte-package command<br/>@sveltejs/package<br/>-i src -o dist"]
    end

    subgraph "Output Directory"
        DIST["dist/<br/>index.js<br/>index.d.ts<br/>Svelte-optimized"]
    end

    subgraph "Package Exports"
        EXPORTS["exports field<br/>types: ./dist/index.d.ts<br/>svelte: ./dist/index.js<br/>import: ./dist/index.js"]
    end

    SRC --> SVELTE_PKG_TOOL
    SVELTE_PKG_TOOL --> DIST
    DIST --> EXPORTS

    style SVELTE_PKG_TOOL fill:#f9f9f9
```

**Build Configuration Details**:

The package uses a Svelte-specific build toolchain distinct from other framework integrations:

- **Build Tool**: `@sveltejs/package` (via `svelte-package` command) instead of Vite or tsdown
- **Build Command**: `svelte-package -i src -o dist` [packages/typescript/ai-svelte/package.json:35]()
- **Type Checking**: `svelte-check` instead of `tsc` [packages/typescript/ai-svelte/package.json:33]()
- **Export Configuration**: Uses `svelte` export condition for Svelte-specific optimizations [packages/typescript/ai-svelte/package.json:16-22]()

The `svelte` export condition allows Svelte tooling (like SvelteKit and Vite) to consume the package differently than generic JavaScript consumers, enabling optimizations like component HMR and better tree-shaking.

**Comparison with Other Framework Integrations**:

| Framework  | Build Tool            | Type Checker     | Output Format              |
| ---------- | --------------------- | ---------------- | -------------------------- |
| React      | Vite                  | tsc              | ESM                        |
| Solid      | tsdown                | tsc              | ESM (unbundled)            |
| Vue        | tsdown                | tsc              | ESM (unbundled)            |
| **Svelte** | **@sveltejs/package** | **svelte-check** | **ESM (Svelte-optimized)** |
| Preact     | Vite                  | tsc              | ESM                        |

**Sources**: [packages/typescript/ai-svelte/package.json:27-35](), [packages/typescript/ai-solid/package.json:31](), [packages/typescript/ai-vue/package.json:31](), [packages/typescript/ai-react/package.json:33]()

## Core API: useChat Binding

### API Surface

While the actual implementation source code is not provided in the files, based on the package structure and example usage, the `useChat` binding provides a Svelte-idiomatic wrapper around `ChatClient`:

```mermaid
graph TB
    subgraph "useChat Binding"
        USECHAT["useChat(options)<br/>Svelte 5 binding"]
    end

    subgraph "Returned State (Runes)"
        MESSAGES["$state messages<br/>UIMessage array"]
        STATUS["$state status<br/>ConnectionStatus"]
        ERROR["$state error<br/>Error | undefined"]
        LOADING["$derived isLoading<br/>boolean"]
    end

    subgraph "Returned Methods"
        SEND["sendMessage(content)<br/>Send user message"]
        STOP["stop()<br/>Abort current request"]
        RELOAD["reload()<br/>Regenerate last response"]
        CLEAR["clear()<br/>Clear conversation"]
    end

    subgraph "ChatClient Integration"
        CLIENT["ChatClient instance<br/>from @tanstack/ai-client"]
    end

    USECHAT --> MESSAGES
    USECHAT --> STATUS
    USECHAT --> ERROR
    USECHAT --> LOADING
    USECHAT --> SEND
    USECHAT --> STOP
    USECHAT --> RELOAD
    USECHAT --> CLEAR

    USECHAT -.wraps.-> CLIENT

    style USECHAT fill:#f9f9f9
    style MESSAGES fill:#e8e8e8
    style SEND fill:#e8e8e8
```

**Expected Options Interface**:

The `useChat` binding likely accepts configuration options similar to other framework integrations:

| Option              | Type                | Purpose                               |
| ------------------- | ------------------- | ------------------------------------- |
| `api`               | `string`            | API endpoint URL (e.g., `/api/chat`)  |
| `conversationId`    | `string?`           | Optional conversation identifier      |
| `connectionAdapter` | `ConnectionAdapter` | Streaming protocol (SSE or HTTP)      |
| `onToolCall`        | `Function?`         | Client-side tool execution handler    |
| `body`              | `object?`           | Additional data to send with requests |
| `headers`           | `object?`           | Custom HTTP headers                   |

**Sources**: [packages/typescript/ai-svelte/package.json:1-64](), [packages/typescript/ai-react/package.json:1-60](), [packages/typescript/ai-client/package.json:1-49]()

## Svelte 5 Runes Integration

### Reactivity Model

```mermaid
graph TB
    subgraph "Svelte 5 Runes System"
        STATE["$state rune<br/>Reactive state primitive"]
        DERIVED["$derived rune<br/>Computed values"]
        EFFECT["$effect rune<br/>Side effects"]
    end

    subgraph "useChat Implementation"
        CHAT_STATE["ChatClient state<br/>wrapped in $state"]
        IS_LOADING["isLoading<br/>$derived from status"]
        STREAM_EFFECT["Stream processing<br/>$effect for updates"]
    end

    subgraph "Component Usage"
        TEMPLATE["Svelte template<br/>{#each messages}<br/>{message.text}"]
        REACTIVITY["Auto-updates on state change<br/>Fine-grained reactivity"]
    end

    STATE --> CHAT_STATE
    DERIVED --> IS_LOADING
    EFFECT --> STREAM_EFFECT

    CHAT_STATE --> TEMPLATE
    IS_LOADING --> TEMPLATE
    TEMPLATE --> REACTIVITY

    style CHAT_STATE fill:#f9f9f9
    style TEMPLATE fill:#e8e8e8
```

**Svelte 5 Runes vs. Other Framework Primitives**:

| Framework    | Reactive Primitive | Computed Values | Side Effects   | Auto-tracking |
| ------------ | ------------------ | --------------- | -------------- | ------------- |
| React        | `useState`         | `useMemo`       | `useEffect`    | Manual deps   |
| Solid        | `createSignal`     | `createMemo`    | `createEffect` | Auto          |
| Vue          | `ref` / `reactive` | `computed`      | `watchEffect`  | Auto          |
| **Svelte 5** | **`$state`**       | **`$derived`**  | **`$effect`**  | **Auto**      |
| Preact       | `useState`         | `useMemo`       | `useEffect`    | Manual deps   |

Svelte 5's runes provide compile-time reactivity guarantees, eliminating the need for dependency arrays (unlike React/Preact) and providing automatic tracking similar to Solid and Vue but with compile-time optimization.

**Sources**: [packages/typescript/ai-svelte/package.json:48-51](), [pnpm-lock.yaml:937-939]()

## Usage Patterns

### Basic Chat Implementation

The typical usage pattern in a Svelte component:

```svelte
<script>
  import { useChat } from '@tanstack/ai-svelte'

  const { messages, sendMessage, isLoading } = useChat({
    api: '/api/chat'
  })

  let input = ''

  function handleSubmit() {
    sendMessage(input)
    input = ''
  }
</script>

<div class="chat-container">
  {#each messages as message}
    <div class="message">
      {message.text}
    </div>
  {/each}

  <form on:submit|preventDefault={handleSubmit}>
    <input bind:value={input} disabled={isLoading} />
    <button disabled={isLoading}>Send</button>
  </form>
</div>
```

**Key Differences from React/Preact**:

- No need to destructure with array syntax (e.g., `const [messages, setMessages] = useState(...)`)
- `$state` runes are mutable - can assign directly (e.g., `input = ''`)
- Template syntax uses `{#each}` blocks instead of `Array.map()`
- Event handling uses `on:submit` directives instead of `onSubmit` props

**Sources**: [examples/ts-svelte-chat/package.json:14-26]()

### Connection Adapter Configuration

```mermaid
graph LR
    subgraph "useChat Configuration"
        CONFIG["useChat options<br/>connectionAdapter"]
    end

    subgraph "Adapter Choices"
        SSE["fetchServerSentEvents<br/>from @tanstack/ai-client<br/>Server-Sent Events"]
        HTTP["fetchHttpStream<br/>from @tanstack/ai-client<br/>NDJSON streaming"]
    end

    subgraph "Server Endpoint"
        API["/api/chat<br/>Returns streaming response"]
    end

    CONFIG --> SSE
    CONFIG --> HTTP
    SSE --> API
    HTTP --> API

    style CONFIG fill:#f9f9f9
```

Both connection adapters can be imported from `@tanstack/ai-client` and passed to `useChat`:

```typescript
import { useChat } from '@tanstack/ai-svelte'
import { fetchServerSentEvents } from '@tanstack/ai-client'

const chat = useChat({
  api: '/api/chat',
  connectionAdapter: fetchServerSentEvents(),
})
```

For details on connection adapters, see [Connection Adapters](#4.2).

**Sources**: [packages/typescript/ai-svelte/package.json:45-47](), [packages/typescript/ai-client/package.json:1-49]()

## Example Application: ts-svelte-chat

### Application Architecture

```mermaid
graph TB
    subgraph "SvelteKit Application"
        APP["ts-svelte-chat<br/>Port 3000"]
    end

    subgraph "Frontend Components"
        PAGES["Svelte pages<br/>+page.svelte files"]
        CHAT_COMP["Chat components<br/>useChat() usage"]
        MARKDOWN["Markdown rendering<br/>marked + marked-highlight"]
    end

    subgraph "Server Routes"
        API_ROUTES["+server.ts routes<br/>SvelteKit endpoints"]
        CHAT_HANDLER["chat() function<br/>from @tanstack/ai"]
    end

    subgraph "AI Provider Adapters"
        OPENAI["@tanstack/ai-openai<br/>openaiText()"]
        ANTHROPIC["@tanstack/ai-anthropic<br/>anthropicText()"]
        GEMINI["@tanstack/ai-gemini<br/>geminiText()"]
        OLLAMA["@tanstack/ai-ollama<br/>ollamaText()"]
    end

    subgraph "Styling"
        TAILWIND["TailwindCSS<br/>@tailwindcss/vite"]
        ICONS["lucide-svelte<br/>UI icons"]
    end

    APP --> PAGES
    PAGES --> CHAT_COMP
    CHAT_COMP --> MARKDOWN
    CHAT_COMP --> ICONS
    PAGES --> TAILWIND

    CHAT_COMP -.HTTP.-> API_ROUTES
    API_ROUTES --> CHAT_HANDLER

    CHAT_HANDLER --> OPENAI
    CHAT_HANDLER --> ANTHROPIC
    CHAT_HANDLER --> GEMINI
    CHAT_HANDLER --> OLLAMA

    style CHAT_COMP fill:#f9f9f9
    style API_ROUTES fill:#e8e8e8
```

**Key Dependencies**:

| Category   | Package                  | Version      | Purpose                     |
| ---------- | ------------------------ | ------------ | --------------------------- |
| Framework  | `@sveltejs/kit`          | ^2.15.10     | SvelteKit meta-framework    |
| Framework  | `@sveltejs/adapter-auto` | ^3.3.1       | Deployment adapter          |
| AI Core    | `@tanstack/ai`           | workspace:\* | Core chat functionality     |
| AI Client  | `@tanstack/ai-svelte`    | workspace:\* | Svelte bindings             |
| Adapters   | `@tanstack/ai-openai`    | workspace:\* | OpenAI provider             |
| Adapters   | `@tanstack/ai-anthropic` | workspace:\* | Anthropic provider          |
| Adapters   | `@tanstack/ai-gemini`    | workspace:\* | Gemini provider             |
| Adapters   | `@tanstack/ai-ollama`    | workspace:\* | Ollama provider             |
| Markdown   | `marked`                 | ^15.0.6      | Markdown parsing            |
| Markdown   | `marked-highlight`       | ^2.2.0       | Code highlighting           |
| Styling    | `@tailwindcss/vite`      | ^4.1.18      | TailwindCSS v4 Vite plugin  |
| Icons      | `lucide-svelte`          | ^0.468.0     | Icon components             |
| Syntax     | `highlight.js`           | ^11.11.1     | Code syntax highlighting    |
| Validation | `zod`                    | ^4.2.0       | Schema validation for tools |

**Sources**: [examples/ts-svelte-chat/package.json:1-41](), [pnpm-lock.yaml:441-512]()

### Markdown Rendering Approach

Unlike React (`@tanstack/ai-react-ui`), Solid (`@tanstack/ai-solid-ui`), and Vue (`@tanstack/ai-vue-ui`) which have dedicated UI component libraries with built-in markdown rendering, the Svelte example uses third-party libraries directly:

```mermaid
graph LR
    subgraph "Message Content"
        TEXT["message.text<br/>Markdown string"]
    end

    subgraph "Markdown Processing"
        MARKED["marked library<br/>Parse markdown to HTML"]
        HIGHLIGHT["marked-highlight<br/>Code block highlighting"]
        HLJS["highlight.js<br/>Syntax highlighting"]
    end

    subgraph "Rendered Output"
        HTML["HTML output<br/>{@html parsed}"]
    end

    TEXT --> MARKED
    MARKED --> HIGHLIGHT
    HIGHLIGHT --> HLJS
    HLJS --> HTML

    style MARKED fill:#f9f9f9
    style HTML fill:#e8e8e8
```

**Markdown Library Comparison Across Examples**:

| Example            | Markdown Library       | Highlighting         | Plugins                | UI Package            |
| ------------------ | ---------------------- | -------------------- | ---------------------- | --------------------- |
| ts-react-chat      | react-markdown         | rehype-highlight     | rehype-raw, remark-gfm | @tanstack/ai-react-ui |
| ts-solid-chat      | solid-markdown         | rehype-highlight     | rehype-raw, remark-gfm | @tanstack/ai-solid-ui |
| ts-vue-chat        | @crazydos/vue-markdown | rehype-highlight     | rehype-raw, remark-gfm | @tanstack/ai-vue-ui   |
| **ts-svelte-chat** | **marked**             | **marked-highlight** | **none**               | **none (manual)**     |

The Svelte example uses a simpler, more lightweight approach with `marked` + `marked-highlight` instead of the unified/remark/rehype ecosystem used by React, Solid, and Vue. This is likely because there is no `@tanstack/ai-svelte-ui` package yet.

**Sources**: [examples/ts-svelte-chat/package.json:22-25](), [examples/ts-react-chat/package.json:258-272](), [examples/ts-solid-chat/package.json:394-396](), [examples/ts-vue-chat/package.json:540-542]()

## Development Workflow

### NPM Scripts

```mermaid
graph LR
    subgraph "Development"
        DEV["pnpm dev<br/>vite dev --port 3000"]
        CHECK["pnpm check<br/>svelte-check"]
        WATCH["pnpm check:watch<br/>Watch mode type checking"]
    end

    subgraph "Build"
        BUILD["pnpm build<br/>vite build"]
        PREVIEW["pnpm preview<br/>Preview production build"]
    end

    subgraph "Testing"
        TEST["pnpm test<br/>exit 0 (placeholder)"]
    end

    style DEV fill:#f9f9f9
    style BUILD fill:#e8e8e8
```

**Script Definitions** [examples/ts-svelte-chat/package.json:6-12]():

| Script        | Command                                                              | Purpose                       |
| ------------- | -------------------------------------------------------------------- | ----------------------------- |
| `dev`         | `vite dev --port 3000`                                               | Start dev server on port 3000 |
| `build`       | `vite build`                                                         | Build for production          |
| `preview`     | `vite preview`                                                       | Preview production build      |
| `check`       | `svelte-kit sync && svelte-check --tsconfig ./tsconfig.json`         | Type check Svelte components  |
| `check:watch` | `svelte-kit sync && svelte-check --tsconfig ./tsconfig.json --watch` | Type check in watch mode      |
| `test`        | `exit 0`                                                             | Placeholder for tests         |

The `svelte-kit sync` command generates type definitions for SvelteKit routes and ensures type safety across the application.

**Sources**: [examples/ts-svelte-chat/package.json:6-12]()

### Build System Integration

```mermaid
graph TB
    subgraph "Development Tools"
        VITE["Vite 7.2.7<br/>Build tool"]
        SVELTE_PLUGIN["@sveltejs/vite-plugin-svelte<br/>Svelte compilation"]
        TAILWIND_PLUGIN["@tailwindcss/vite<br/>TailwindCSS v4 integration"]
    end

    subgraph "SvelteKit Tooling"
        KIT["@sveltejs/kit<br/>SvelteKit framework"]
        ADAPTER["@sveltejs/adapter-auto<br/>Deployment adapter"]
        CHECK["svelte-check<br/>Type checker"]
    end

    subgraph "Output"
        BUILD_DIR[".svelte-kit/output<br/>Production build"]
    end

    VITE --> SVELTE_PLUGIN
    VITE --> TAILWIND_PLUGIN
    VITE --> BUILD_DIR

    KIT --> ADAPTER
    KIT --> CHECK

    SVELTE_PLUGIN --> KIT

    style VITE fill:#f9f9f9
    style BUILD_DIR fill:#e8e8e8
```

The example uses modern tooling:

- **Vite 7.2.7**: Latest major version with enhanced performance [examples/ts-svelte-chat/package.json:39]()
- **@sveltejs/vite-plugin-svelte 5.1.1**: Latest plugin for Svelte 5 support [examples/ts-svelte-chat/package.json:31-32]()
- **TailwindCSS v4**: Uses the new Vite plugin architecture [examples/ts-svelte-chat/package.json:32]()
- **TypeScript 5.9.3**: Consistent with monorepo-wide TypeScript version [examples/ts-svelte-chat/package.json:38]()

**Sources**: [examples/ts-svelte-chat/package.json:28-39](), [pnpm-lock.yaml:480-512]()

## Comparison with Other Framework Integrations

### API Surface Comparison

```mermaid
graph TB
    subgraph "Framework Bindings API"
        REACT["useChat()<br/>React hook<br/>Returns object"]
        SOLID["useChat()<br/>Solid primitive<br/>Returns reactive object"]
        VUE["useChat()<br/>Vue composable<br/>Returns reactive object"]
        SVELTE["useChat()<br/>Svelte binding<br/>Returns object with runes"]
        PREACT["useChat()<br/>Preact hook<br/>Returns object"]
    end

    subgraph "Common Features"
        MESSAGES["messages array<br/>UIMessage[]"]
        SEND["sendMessage()<br/>Send user input"]
        STATUS["status tracking<br/>ConnectionStatus"]
        TOOLS["Client tools<br/>onToolCall handler"]
    end

    REACT --> MESSAGES
    SOLID --> MESSAGES
    VUE --> MESSAGES
    SVELTE --> MESSAGES
    PREACT --> MESSAGES

    REACT --> SEND
    SOLID --> SEND
    VUE --> SEND
    SVELTE --> SEND
    PREACT --> SEND

    style SVELTE fill:#f9f9f9
    style MESSAGES fill:#e8e8e8
```

### Feature Parity Matrix

| Feature           | React     | Solid  | Vue    | **Svelte**            | Preact |
| ----------------- | --------- | ------ | ------ | --------------------- | ------ |
| `useChat` binding | ✅        | ✅     | ✅     | ✅                    | ✅     |
| SSE streaming     | ✅        | ✅     | ✅     | ✅                    | ✅     |
| HTTP streaming    | ✅        | ✅     | ✅     | ✅                    | ✅     |
| Client-side tools | ✅        | ✅     | ✅     | ✅                    | ✅     |
| Type inference    | ✅        | ✅     | ✅     | ✅                    | ✅     |
| UI components     | ✅        | ✅     | ✅     | ❌                    | ❌     |
| Devtools          | ✅        | ✅     | ❌     | ❌                    | ✅     |
| Build tool        | Vite      | tsdown | tsdown | **@sveltejs/package** | Vite   |
| Framework version | 18+ / 19+ | 1.9.7+ | 3.5.0+ | **5.0.0+**            | 10.26+ |

**Notable Differences**:

1. **Build System**: Svelte is the only integration using `@sveltejs/package` instead of Vite or tsdown
2. **Framework Version**: Svelte requires version 5.0.0+, making it incompatible with Svelte 4 and earlier
3. **UI Components**: No `@tanstack/ai-svelte-ui` package exists yet (unlike React, Solid, Vue)
4. **Devtools**: No `@tanstack/svelte-ai-devtools` package exists yet (unlike React, Solid, Preact)
5. **Type Checker**: Uses `svelte-check` instead of `tsc` for type checking
6. **Reactivity**: Uses Svelte 5 runes (`$state`, `$derived`, `$effect`) instead of hooks or signals

**Sources**: [packages/typescript/ai-svelte/package.json:1-64](), [packages/typescript/ai-react/package.json:1-60](), [packages/typescript/ai-solid/package.json:1-59](), [packages/typescript/ai-vue/package.json:1-59](), [packages/typescript/ai-preact/package.json:1-76]()

## Version History and Changelog

### Release Timeline

```mermaid
graph LR
    V001["0.0.1<br/>Initial release"]
    V011["0.1.0<br/>First stable"]
    V021["0.2.1<br/>Standard schema"]
    V022["0.2.2<br/>Current<br/>Latest updates"]

    V001 --> V011
    V011 --> V021
    V021 --> V022

    style V022 fill:#f9f9f9
```

**Recent Releases** (from [examples/ts-svelte-chat/CHANGELOG.md:1-84]()):

| Version       | Changes                           | Dependencies Updated                                                            |
| ------------- | --------------------------------- | ------------------------------------------------------------------------------- |
| 0.2.2         | Latest updates                    | ai@0.2.2, ai-gemini@0.3.2, ai-anthropic@0.2.0, ai-ollama@0.3.0, ai-openai@0.2.1 |
| 0.2.1         | Ollama improvements, OpenAI fixes | ai@0.2.1, ai-ollama@0.3.0, ai-openai@0.2.1, ai-gemini@0.3.0                     |
| 0.2.0 (1.0.0) | Standard schema support           | Major version bump for ai-client@0.2.0                                          |
| 0.1.0         | First stable release              | Adapter split for tree-shaking                                                  |

The package maintains lockstep versioning with other framework integrations and follows semantic versioning. All framework integration packages share the same version numbers for consistency.

**Sources**: [examples/ts-svelte-chat/CHANGELOG.md:1-84](), [packages/typescript/ai-svelte/package.json:3]()

## Future Roadmap and Missing Features

Based on analysis of the package ecosystem:

### Potential Future Additions

```mermaid
graph TB
    subgraph "Current State"
        CURRENT["@tanstack/ai-svelte 0.2.2<br/>useChat binding only"]
    end

    subgraph "Missing Components (Compared to React/Solid/Vue)"
        UI_PKG["@tanstack/ai-svelte-ui<br/>Pre-built chat components<br/>Markdown rendering"]
        DEV_PKG["@tanstack/svelte-ai-devtools<br/>Debug panel<br/>Message inspection"]
    end

    subgraph "Implementation Approach"
        MARKDOWN_LIB["Choose markdown library<br/>unified/remark/rehype?<br/>or keep marked?"]
        DEV_CORE["Integrate with<br/>@tanstack/ai-devtools-core"]
    end

    CURRENT -.planned?.-> UI_PKG
    CURRENT -.planned?.-> DEV_PKG

    UI_PKG --> MARKDOWN_LIB
    DEV_PKG --> DEV_CORE

    style UI_PKG fill:#f9f9f9
    style DEV_PKG fill:#f9f9f9
```

**Missing Features Analysis**:

1. **UI Components Package**: React, Solid, and Vue all have companion UI packages with:
   - Pre-built message components
   - Markdown rendering with syntax highlighting
   - Rehype and remark plugins for GFM, sanitization, etc.
   - Consistent API across frameworks

2. **Devtools Package**: React, Solid, and Preact have devtools integrations:
   - Real-time message inspection
   - Tool call monitoring
   - Performance metrics
   - Integration with `@tanstack/ai-devtools-core`

3. **Svelte 4 Compatibility**: Current package requires Svelte 5.0.0+, which may limit adoption until Svelte 5 becomes more widespread.

For UI components, see [React UI Components](#7.1), [Solid UI Components](#7.2), [Vue UI Components](#7.3), and [Markdown Processing Pipeline](#7.4) to understand patterns that could be adapted for Svelte.

**Sources**: [packages/typescript/ai-react-ui/package.json:1-63](), [packages/typescript/ai-solid-ui/package.json:1-62](), [packages/typescript/ai-vue-ui/package.json:1-59](), [packages/typescript/react-ai-devtools/package.json:1-60](), [packages/typescript/solid-ai-devtools/package.json:1-59]()
