# Package Structure and Organization

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [.changeset/pre.json](.changeset/pre.json)
- [examples/express/package.json](examples/express/package.json)
- [examples/fastify/package.json](examples/fastify/package.json)
- [examples/hono/package.json](examples/hono/package.json)
- [examples/nest/package.json](examples/nest/package.json)
- [examples/next-fastapi/package.json](examples/next-fastapi/package.json)
- [examples/next-google-vertex/package.json](examples/next-google-vertex/package.json)
- [examples/next-langchain/package.json](examples/next-langchain/package.json)
- [examples/next-openai-kasada-bot-protection/package.json](examples/next-openai-kasada-bot-protection/package.json)
- [examples/next-openai-pages/package.json](examples/next-openai-pages/package.json)
- [examples/next-openai-telemetry-sentry/package.json](examples/next-openai-telemetry-sentry/package.json)
- [examples/next-openai-telemetry/package.json](examples/next-openai-telemetry/package.json)
- [examples/next-openai-upstash-rate-limits/package.json](examples/next-openai-upstash-rate-limits/package.json)
- [examples/node-http-server/package.json](examples/node-http-server/package.json)
- [examples/nuxt-openai/package.json](examples/nuxt-openai/package.json)
- [examples/sveltekit-openai/package.json](examples/sveltekit-openai/package.json)
- [packages/amazon-bedrock/CHANGELOG.md](packages/amazon-bedrock/CHANGELOG.md)
- [packages/amazon-bedrock/package.json](packages/amazon-bedrock/package.json)
- [packages/anthropic/CHANGELOG.md](packages/anthropic/CHANGELOG.md)
- [packages/anthropic/package.json](packages/anthropic/package.json)
- [packages/google-vertex/CHANGELOG.md](packages/google-vertex/CHANGELOG.md)
- [packages/google-vertex/package.json](packages/google-vertex/package.json)
- [packages/google/CHANGELOG.md](packages/google/CHANGELOG.md)
- [packages/google/package.json](packages/google/package.json)
- [pnpm-lock.yaml](pnpm-lock.yaml)
- [tools/tsconfig/base.json](tools/tsconfig/base.json)

</details>



This document describes the physical organization of the AI SDK monorepo, including the directory structure, package categorization, workspace dependency management, and build/distribution patterns. For the layered architecture and design principles that guide this organization, see [Architecture and Design Principles](#1.1). For development workflows and contribution guidelines, see [Development and Contribution](#6).

---

## Monorepo Structure

The AI SDK uses a **pnpm workspace** monorepo with over 20 SDK packages, 50+ example applications, and supporting infrastructure. The entire repository operates in **beta pre-release mode** (v7) coordinated via changesets.

```mermaid
graph TB
    ROOT["/ (root)"]
    PACKAGES["packages/"]
    EXAMPLES["examples/"]
    TOOLS["tools/"]
    CONTENT["content/"]
    
    ROOT --> PACKAGES
    ROOT --> EXAMPLES
    ROOT --> TOOLS
    ROOT --> CONTENT
    
    PACKAGES --> CORE["Core SDK<br/>packages/ai"]
    PACKAGES --> PROVIDER_INTERFACE["Provider Interfaces<br/>packages/provider<br/>packages/provider-utils"]
    PACKAGES --> PROVIDERS["AI Providers (15+)<br/>packages/openai<br/>packages/anthropic<br/>packages/google<br/>packages/google-vertex<br/>packages/amazon-bedrock<br/>..."]
    PACKAGES --> UI_FRAMEWORKS["UI Frameworks<br/>packages/react<br/>packages/vue<br/>packages/svelte<br/>packages/angular<br/>packages/solid<br/>packages/rsc"]
    PACKAGES --> ADAPTERS["Adapters<br/>packages/langchain<br/>packages/llamaindex"]
    
    EXAMPLES --> NEXT_EXAMPLES["Next.js Examples (10+)<br/>next<br/>next-agent<br/>next-langchain<br/>next-openai-telemetry<br/>..."]
    EXAMPLES --> FRAMEWORK_EXAMPLES["Framework Examples<br/>sveltekit-openai<br/>nuxt-openai<br/>angular<br/>..."]
    EXAMPLES --> SERVER_EXAMPLES["Server Examples<br/>express<br/>fastify<br/>hono<br/>nest<br/>node-http-server"]
    
    TOOLS --> TSCONFIG["tools/tsconfig/base.json"]
    TOOLS --> ESLINT["tools/eslint-config"]
    
    CONTENT --> PROVIDER_DOCS["providers/01-ai-sdk-providers/<br/>Provider documentation MDX files"]
```

**Sources:** [pnpm-lock.yaml:1-63](), [.changeset/pre.json:1-100]()

---

## Package Categories by Layer

Packages are organized into distinct layers matching the architectural design. Each category serves a specific purpose in the SDK ecosystem.

### Core SDK Layer

| Package | Path | Purpose |
|---------|------|---------|
| `ai` | `packages/ai` | Core SDK with `generateText`, `streamText`, structured outputs, tool calling |
| `@ai-sdk/provider` | `packages/provider` | Provider-V3 specification interfaces |
| `@ai-sdk/provider-utils` | `packages/provider-utils` | Shared utilities for provider implementations |
| `@ai-sdk/gateway` | `packages/gateway` | Model routing and failover |

**Sources:** [pnpm-lock.yaml:139-141](), Diagram 1 from context

### AI Provider Packages

| Category | Packages | Description |
|----------|----------|-------------|
| **Native Implementations** | `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google` | Direct provider integrations with provider-specific features |
| **OpenAI-Compatible** | `@ai-sdk/openai-compatible`, `@ai-sdk/xai`, `@ai-sdk/fireworks`, `@ai-sdk/cerebras`, `@ai-sdk/togetherai`, `@ai-sdk/deepseek` | Providers using shared OpenAI-compatible bridge |
| **Specialized** | `@ai-sdk/azure`, `@ai-sdk/google-vertex`, `@ai-sdk/amazon-bedrock` | Providers that extend or compose other providers |
| **Additional** | `@ai-sdk/mistral`, `@ai-sdk/cohere`, `@ai-sdk/groq`, `@ai-sdk/perplexity` | Other provider implementations |

**Sources:** [packages/google-vertex/package.json:1-100](), [packages/amazon-bedrock/package.json:1-89](), [packages/anthropic/package.json:1-85](), [packages/google/package.json:1-86]()

### UI Framework Packages

| Package | Path | Peer Dependencies |
|---------|------|-------------------|
| `@ai-sdk/react` | `packages/react` | `react >= 18` |
| `@ai-sdk/vue` | `packages/vue` | `vue >= 3.5` |
| `@ai-sdk/svelte` | `packages/svelte` | `svelte >= 5` |
| `@ai-sdk/angular` | `packages/angular` | `@angular/core >= 16.0.0` |
| `@ai-sdk/solid` | `packages/solid` | `solid-js` |
| `@ai-sdk/rsc` | `packages/rsc` | `react`, `next >= 15` |

**Sources:** [examples/nuxt-openai/package.json:12-16](), [examples/sveltekit-openai/package.json:19-27](), [examples/angular/package.json:408-437]()

### Adapter Packages

- `@ai-sdk/langchain` - LangChain/LangGraph integration
- `@ai-sdk/llamaindex` - LlamaIndex integration

**Sources:** Diagram 1 from context

---

## Workspace Dependencies and Version Coordination

All packages use `workspace:*` protocol for internal dependencies, enabling synchronized development and testing.

```mermaid
graph LR
    subgraph "Version 7.0.0-beta.7"
        AI["ai<br/>7.0.0-beta.7"]
    end
    
    subgraph "Version 4.0.0-beta.x"
        REACT["@ai-sdk/react<br/>4.0.0-beta.7"]
        VUE["@ai-sdk/vue<br/>4.0.0-beta.7"]
        SVELTE["@ai-sdk/svelte<br/>5.0.0-beta.7"]
        OPENAI["@ai-sdk/openai<br/>4.0.0-beta.3"]
        ANTHROPIC["@ai-sdk/anthropic<br/>4.0.0-beta.1"]
        GOOGLE["@ai-sdk/google<br/>4.0.0-beta.3"]
    end
    
    subgraph "Version 5.0.0-beta.x"
        VERTEX["@ai-sdk/google-vertex<br/>5.0.0-beta.3"]
        BEDROCK["@ai-sdk/amazon-bedrock<br/>5.0.0-beta.1"]
        PROVIDER_UTILS["@ai-sdk/provider-utils<br/>5.0.0-beta.1"]
    end
    
    subgraph "Version 4.0.0-beta.0"
        PROVIDER["@ai-sdk/provider<br/>4.0.0-beta.0"]
    end
    
    REACT -->|workspace:*| AI
    VUE -->|workspace:*| AI
    SVELTE -->|workspace:*| AI
    
    OPENAI -->|workspace:*| PROVIDER
    OPENAI -->|workspace:*| PROVIDER_UTILS
    
    ANTHROPIC -->|workspace:*| PROVIDER
    ANTHROPIC -->|workspace:*| PROVIDER_UTILS
    
    VERTEX -->|workspace:*| GOOGLE
    VERTEX -->|workspace:*| ANTHROPIC
    VERTEX -->|workspace:*| PROVIDER_UTILS
    
    BEDROCK -->|workspace:*| ANTHROPIC
    BEDROCK -->|workspace:*| PROVIDER_UTILS
```

### Dependency Declaration Pattern

Internal dependencies are declared using the `workspace:*` protocol in `package.json`:

```json
{
  "dependencies": {
    "@ai-sdk/provider": "workspace:*",
    "@ai-sdk/provider-utils": "workspace:*"
  }
}
```

This resolves to local packages during development and is replaced with exact versions during publish.

**Sources:** [packages/google-vertex/package.json:64-69](), [packages/amazon-bedrock/package.json:52-59](), [packages/anthropic/package.json:53-56](), [pnpm-lock.yaml:1-6]()

---

## Package Export Structure

All SDK packages follow a consistent dual-format export pattern supporting both CommonJS and ESM, with TypeScript declaration files.

### Standard Export Configuration

```mermaid
graph TB
    PKG["Package Root"]
    
    PKG --> MAIN["main: ./dist/index.js"]
    PKG --> MODULE["module: ./dist/index.mjs"]
    PKG --> TYPES["types: ./dist/index.d.ts"]
    
    PKG --> EXPORTS["exports"]
    EXPORTS --> PKG_JSON["./package.json"]
    EXPORTS --> DEFAULT[". (default entry)"]
    EXPORTS --> SUBPATHS["Subpath exports"]
    
    DEFAULT --> DEFAULT_TYPES["types: ./dist/index.d.ts"]
    DEFAULT --> DEFAULT_IMPORT["import: ./dist/index.mjs"]
    DEFAULT --> DEFAULT_REQUIRE["require: ./dist/index.js"]
    
    SUBPATHS --> EDGE["./edge"]
    SUBPATHS --> INTERNAL["./internal"]
    SUBPATHS --> SPECIALIZED["Provider-specific<br/>(e.g. ./anthropic)"]
    
    EDGE --> EDGE_TYPES["types: ./dist/edge/index.d.ts"]
    EDGE --> EDGE_IMPORT["import: ./dist/edge/index.mjs"]
    EDGE --> EDGE_REQUIRE["require: ./dist/edge/index.js"]
```

### Example: Google Vertex Package Exports

The `@ai-sdk/google-vertex` package demonstrates the full export pattern:

```json
{
  "exports": {
    "./package.json": "./package.json",
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    },
    "./edge": {
      "types": "./dist/edge/index.d.ts",
      "import": "./dist/edge/index.mjs",
      "require": "./dist/edge/index.js"
    },
    "./anthropic": {
      "types": "./dist/anthropic/index.d.ts",
      "import": "./dist/anthropic/index.mjs",
      "require": "./dist/anthropic/index.js"
    },
    "./anthropic/edge": {
      "types": "./dist/anthropic/edge/index.d.ts",
      "import": "./dist/anthropic/edge/index.mjs",
      "require": "./dist/anthropic/edge/index.js"
    }
  }
}
```

This enables usage like:
- `import { vertex } from '@ai-sdk/google-vertex'` (default)
- `import { vertex } from '@ai-sdk/google-vertex/edge'` (edge runtime)
- `import { vertexAnthropic } from '@ai-sdk/google-vertex/anthropic'` (Anthropic via Vertex)

**Sources:** [packages/google-vertex/package.json:41-63](), [packages/google/package.json:39-52](), [packages/anthropic/package.json:39-52]()

---

## Package Distribution Structure

Each package includes specific files in its distribution, controlled by the `files` field in `package.json`.

### Standard Distribution Contents

| File/Directory | Purpose |
|----------------|---------|
| `dist/**/*` | Compiled JavaScript, TypeScript declarations, source maps |
| `docs/**/*` | Provider-specific documentation (copied during `prepack`) |
| `src/` | Source TypeScript files (for source map resolution) |
| `!src/**/*.test.ts` | Exclude test files |
| `!src/**/__snapshots__` | Exclude test snapshots |
| `CHANGELOG.md` | Version history |
| `README.md` | Package documentation |
| `*.d.ts` | TypeScript declaration files for subpath exports |

### Tree-Shaking Optimization

All packages set `"sideEffects": false` to enable aggressive tree-shaking by bundlers:

```json
{
  "sideEffects": false
}
```

This indicates that no module in the package has side effects when imported, allowing unused exports to be safely eliminated.

**Sources:** [packages/google-vertex/package.json:5-25](), [packages/google/package.json:5-23](), [packages/anthropic/package.json:5-23]()

---

## Build and Release Workflow

The monorepo uses a sophisticated build and release pipeline coordinated across all packages.

```mermaid
graph TB
    subgraph "Development Phase"
        SRC["Source Code<br/>TypeScript in src/"]
        BUILD["pnpm build"]
        TSUP["tsup<br/>--tsconfig tsconfig.build.json"]
    end
    
    subgraph "Pre-publish Phase"
        PREPACK["pnpm prepack"]
        COPY_DOCS["Copy provider docs<br/>content/providers/**/*.mdx → docs/"]
        DIST["dist/<br/>index.js, index.mjs, index.d.ts"]
        DOCS_DIR["docs/<br/>Provider documentation"]
    end
    
    subgraph "Publish Phase"
        PUBLISH["pnpm publish"]
        NPM["npm registry"]
        POSTPACK["pnpm postpack"]
        CLEANUP["del-cli docs"]
    end
    
    subgraph "Version Coordination"
        CHANGESET[".changeset/pre.json<br/>Beta pre-release mode"]
        VERSION["Version bump<br/>Synchronized across packages"]
        CHANGELOG["CHANGELOG.md<br/>Generated per package"]
    end
    
    SRC --> BUILD
    BUILD --> TSUP
    TSUP --> DIST
    
    DIST --> PREPACK
    PREPACK --> COPY_DOCS
    COPY_DOCS --> DOCS_DIR
    
    DOCS_DIR --> PUBLISH
    PUBLISH --> NPM
    NPM --> POSTPACK
    POSTPACK --> CLEANUP
    
    CHANGESET --> VERSION
    VERSION --> CHANGELOG
    CHANGELOG --> PUBLISH
```

### Build Script Pattern

Each package uses `tsup` for building with consistent configuration:

```json
{
  "scripts": {
    "build": "pnpm clean && tsup --tsconfig tsconfig.build.json",
    "build:watch": "pnpm clean && tsup --watch",
    "clean": "del-cli dist docs *.tsbuildinfo"
  }
}
```

The build process:
1. **Clean** - Remove previous build artifacts (`dist/`, `docs/`, `*.tsbuildinfo`)
2. **tsup** - Bundle TypeScript with `tsconfig.build.json`, generating CJS, ESM, and declarations
3. **Watch mode** - Available for development with auto-rebuild

**Sources:** [packages/google-vertex/package.json:26-29](), [packages/anthropic/package.json:25-27]()

---

## Documentation Propagation System

The monorepo implements a **documentation propagation system** that copies provider-specific documentation from the central `content/` directory into each package's distribution.

```mermaid
graph LR
    CONTENT["content/providers/<br/>01-ai-sdk-providers/"]
    
    CONTENT --> GOOGLE_VERTEX_DOC["16-google-vertex.mdx"]
    CONTENT --> BEDROCK_DOC["08-amazon-bedrock.mdx"]
    CONTENT --> ANTHROPIC_DOC["05-anthropic.mdx"]
    CONTENT --> GOOGLE_DOC["15-google-generative-ai.mdx"]
    
    GOOGLE_VERTEX_DOC -->|prepack| VERTEX_PKG["packages/google-vertex/docs/"]
    BEDROCK_DOC -->|prepack| BEDROCK_PKG["packages/amazon-bedrock/docs/"]
    ANTHROPIC_DOC -->|prepack| ANTHROPIC_PKG["packages/anthropic/docs/"]
    GOOGLE_DOC -->|prepack| GOOGLE_PKG["packages/google/docs/"]
    
    VERTEX_PKG -->|included in npm package| NPM_VERTEX["@ai-sdk/google-vertex<br/>on npm"]
    BEDROCK_PKG -->|included in npm package| NPM_BEDROCK["@ai-sdk/amazon-bedrock<br/>on npm"]
    ANTHROPIC_PKG -->|included in npm package| NPM_ANTHROPIC["@ai-sdk/anthropic<br/>on npm"]
    GOOGLE_PKG -->|included in npm package| NPM_GOOGLE["@ai-sdk/google<br/>on npm"]
    
    NPM_VERTEX -->|postpack| CLEANUP_VERTEX["del-cli docs"]
    NPM_BEDROCK -->|postpack| CLEANUP_BEDROCK["del-cli docs"]
```

### prepack/postpack Scripts

```json
{
  "scripts": {
    "prepack": "mkdir -p docs && cp ../../content/providers/01-ai-sdk-providers/16-google-vertex.mdx ./docs/",
    "postpack": "del-cli docs"
  }
}
```

This workflow ensures:
1. Documentation is centrally maintained in `content/`
2. Each published package includes its own documentation
3. Documentation is cleaned up after publishing to avoid committing generated files
4. Users can access documentation offline with the installed package

**Sources:** [packages/google-vertex/package.json:30-31](), [packages/amazon-bedrock/package.json:28-29](), [packages/anthropic/package.json:28-29](), [packages/google/package.json:28-29]()

---

## Example Applications Structure

The repository includes 50+ example applications demonstrating SDK usage across different frameworks and use cases.

### Example Categories

| Category | Count | Examples |
|----------|-------|----------|
| **Next.js** | 10+ | `next`, `next-agent`, `next-langchain`, `next-openai-telemetry`, `next-openai-kasada-bot-protection`, `next-openai-upstash-rate-limits`, `next-fastapi`, `next-google-vertex` |
| **Frontend Frameworks** | 3 | `sveltekit-openai`, `nuxt-openai`, `angular` |
| **Server Frameworks** | 5 | `express`, `fastify`, `hono`, `nest`, `node-http-server` |
| **Specialized** | 2+ | `mcp` (Model Context Protocol), `ai-functions` (comprehensive test suite) |

### Example Dependency Pattern

Examples use specific version constraints to test against beta releases:

```json
{
  "dependencies": {
    "@ai-sdk/react": "4.0.0-beta.7",
    "@ai-sdk/openai": "4.0.0-beta.3",
    "ai": "7.0.0-beta.7"
  }
}
```

vs. workspace links for development:

```json
{
  "dependencies": {
    "@ai-sdk/react": "link:../../packages/react",
    "@ai-sdk/openai": "link:../../packages/openai",
    "ai": "link:../../packages/ai"
  }
}
```

**Sources:** [examples/next/package.json:684-713](), [examples/sveltekit-openai/package.json:1-46](), [examples/nuxt-openai/package.json:1-34](), [examples/angular/package.json:408-474](), [examples/express/package.json:1-22](), [examples/fastify/package.json:1-20](), [examples/hono/package.json:1-23](), [examples/nest/package.json:1-66](), [examples/next-langchain/package.json:1-40]()

---

## Shared Development Tools

The monorepo provides shared configuration for consistent development across all packages.

### TypeScript Configuration

Base TypeScript configuration shared across all packages:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "composite": false,
    "declaration": true,
    "declarationMap": true,
    "esModuleInterop": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "skipLibCheck": true,
    "strict": true,
    "types": ["@types/node"]
  }
}
```

Individual packages extend this with `tsconfig.build.json`:

```json
{
  "extends": "../../tools/tsconfig/base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["src/**/*.test.ts"]
}
```

### ESLint Configuration

Shared ESLint configuration via `eslint-config-vercel-ai`:

```json
{
  "devDependencies": {
    "eslint-config-vercel-ai": "workspace:*"
  }
}
```

Referenced in root and individual packages as:

```json
{
  "devDependencies": {
    "eslint": "8.57.1",
    "eslint-config-vercel-ai": "workspace:*"
  }
}
```

**Sources:** [tools/tsconfig/base.json:1-23](), [pnpm-lock.yaml:22-24]()

---

## Package Metadata and Publishing

All SDK packages share consistent metadata for discovery and publishing.

### Standard Metadata Fields

```json
{
  "license": "Apache-2.0",
  "engines": {
    "node": ">=18"
  },
  "publishConfig": {
    "access": "public"
  },
  "homepage": "https://ai-sdk.dev/docs",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/vercel/ai.git"
  },
  "bugs": {
    "url": "https://github.com/vercel/ai/issues"
  },
  "keywords": ["ai"]
}
```

### Peer Dependencies

Packages declare peer dependencies for optional integrations:

```json
{
  "peerDependencies": {
    "zod": "^3.25.76 || ^4.1.8"
  }
}
```

This allows users to choose their schema validation library version while ensuring compatibility.

**Sources:** [packages/google-vertex/package.json:69-99](), [packages/amazon-bedrock/package.json:68-88](), [packages/anthropic/package.json:64-85](), [packages/google/package.json:65-85]()