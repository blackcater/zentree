# Code Quality Tools

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [.github/workflows/autofix.yml](.github/workflows/autofix.yml)
- [.github/workflows/release.yml](.github/workflows/release.yml)
- [nx.json](nx.json)
- [package.json](package.json)
- [packages/typescript/ai-anthropic/package.json](packages/typescript/ai-anthropic/package.json)
- [packages/typescript/ai-gemini/package.json](packages/typescript/ai-gemini/package.json)
- [packages/typescript/ai-ollama/package.json](packages/typescript/ai-ollama/package.json)
- [packages/typescript/ai-openai/package.json](packages/typescript/ai-openai/package.json)
- [packages/typescript/ai-react-ui/package.json](packages/typescript/ai-react-ui/package.json)
- [packages/typescript/ai-react/package.json](packages/typescript/ai-react/package.json)
- [packages/typescript/ai-solid-ui/package.json](packages/typescript/ai-solid-ui/package.json)
- [packages/typescript/ai-solid/package.json](packages/typescript/ai-solid/package.json)
- [packages/typescript/ai-solid/tsdown.config.ts](packages/typescript/ai-solid/tsdown.config.ts)
- [packages/typescript/ai-svelte/package.json](packages/typescript/ai-svelte/package.json)
- [packages/typescript/ai-vue-ui/package.json](packages/typescript/ai-vue-ui/package.json)
- [packages/typescript/ai-vue/package.json](packages/typescript/ai-vue/package.json)
- [pnpm-lock.yaml](pnpm-lock.yaml)
- [scripts/generate-docs.ts](scripts/generate-docs.ts)

</details>

This document describes the automated code quality enforcement tools used in the TanStack AI monorepo. These tools ensure consistent code style, detect unused code, validate package dependencies, and catch type errors before they reach production. For information about the CI/CD pipelines that run these tools, see [CI/CD and Release Process](#9.6). For details about testing infrastructure, see [Testing Infrastructure](#9.3).

## Quality Tool Ecosystem

The TanStack AI monorepo employs five primary code quality tools, each serving a distinct purpose:

```mermaid
graph TB
    subgraph "Code Quality Layer"
        ESLINT["ESLint<br/>────────<br/>Code Linting<br/>@tanstack/eslint-config"]
        TSC["TypeScript Compiler<br/>────────<br/>Type Checking<br/>tsc --noEmit"]
        KNIP["Knip<br/>────────<br/>Dead Code Detection<br/>Unused dependencies"]
        SHERIF["Sherif<br/>────────<br/>Package Consistency<br/>Workspace integrity"]
        PRETTIER["Prettier<br/>────────<br/>Code Formatting<br/>prettier --write"]
        PUBLINT["Publint<br/>────────<br/>Package Validation<br/>Export checks"]
    end

    subgraph "Source Code"
        SRC["packages/**/*.ts<br/>examples/**/*.ts<br/>*.config.ts"]
        PKG["**/package.json<br/>pnpm-workspace.yaml"]
        DOCS["docs/**/*<br/>README.md"]
    end

    subgraph "CI/CD Integration"
        NX["Nx Orchestration<br/>────────<br/>Caching & Parallelization<br/>Affected detection"]
        GH_ACTIONS["GitHub Actions<br/>────────<br/>release.yml<br/>autofix.yml"]
    end

    SRC --> ESLINT
    SRC --> TSC
    SRC --> KNIP
    SRC --> PRETTIER
    PKG --> KNIP
    PKG --> SHERIF
    PKG --> PUBLINT

    ESLINT --> NX
    TSC --> NX
    KNIP --> NX
    SHERIF --> NX
    PRETTIER --> NX

    NX --> GH_ACTIONS

    GH_ACTIONS -.autofix.-> PRETTIER
```

**Roles**: `ESLint` enforces coding standards and catches common errors, `TypeScript` performs static type checking, `Knip` detects unused files/dependencies/exports, `Sherif` validates workspace package consistency, `Prettier` enforces consistent formatting, and `Publint` validates package exports for NPM publishing. All tools integrate with `Nx` for intelligent caching and affected project detection.

**Sources**: [package.json:15-46](), [pnpm-lock.yaml:23-67](), [nx.json:27-73]()

---

## ESLint Configuration

ESLint provides code linting with a shared configuration package maintained by the TanStack organization:

| Configuration Aspect | Value                                                    | Location                 |
| -------------------- | -------------------------------------------------------- | ------------------------ |
| Config Package       | `@tanstack/eslint-config@0.3.3`                          | [pnpm-lock.yaml:23-25]() |
| ESLint Version       | `9.39.1`                                                 | [pnpm-lock.yaml:35-37]() |
| Plugin               | `eslint-plugin-unused-imports@4.3.0`                     | [pnpm-lock.yaml:38-40]() |
| Execution Command    | `nx affected --target=test:eslint --exclude=examples/**` | [package.json:20]()      |
| Nx Cache Strategy    | `true`                                                   | [nx.json:40-44]()        |

The linting workflow runs only on packages (not examples) and utilizes Nx's affected detection to lint only changed projects:

```mermaid
sequenceDiagram
    participant DEV as "Developer"
    participant CLI as "pnpm test:eslint"
    participant NX as "Nx Engine"
    participant ESLINT as "ESLint"
    participant CACHE as "Nx Cache"

    DEV->>CLI: "Run linting"
    CLI->>NX: "nx affected --target=test:eslint"
    NX->>NX: "Calculate affected projects"
    NX->>NX: "Check .eslintcache & Nx cache"

    alt "Cache Hit"
        NX->>CACHE: "Retrieve cached results"
        CACHE-->>DEV: "✓ Linting passed (cached)"
    else "Cache Miss"
        NX->>ESLINT: "Run ESLint on affected projects"
        ESLINT->>ESLINT: "Load eslint.config.js"
        ESLINT->>ESLINT: "Apply @tanstack/eslint-config"
        ESLINT->>ESLINT: "Check unused imports"
        ESLINT-->>NX: "Lint results"
        NX->>CACHE: "Store results in cache"
        NX-->>DEV: "✓ Linting results"
    end
```

**Dependencies Configuration**: The `test:eslint` target depends on the `^build` target of parent packages ([nx.json:40-44]()), ensuring that dependent packages are built before linting runs. This is necessary because ESLint may need to resolve types from built packages.

**Inputs**: The linting task considers three input categories: `default` (all project files except markdown), `^production` (production files from dependencies), and the workspace-level `eslint.config.js` ([nx.json:40-44]()).

**Sources**: [package.json:20](), [nx.json:40-44](), [pnpm-lock.yaml:23-40]()

---

## TypeScript Type Checking

TypeScript provides static type analysis across all packages in the monorepo:

```mermaid
graph LR
    subgraph "Type Checking Flow"
        CMD["pnpm test:types"]
        NX_TYPES["nx affected<br/>--targets=test:types"]
        TSC["tsc --noEmit"]
    end

    subgraph "Package-Level tsconfig"
        AI["packages/typescript/ai/<br/>tsconfig.json"]
        CLIENT["packages/typescript/ai-client/<br/>tsconfig.json"]
        REACT["packages/typescript/ai-react/<br/>tsconfig.json"]
        ADAPTERS["Provider Adapters<br/>tsconfig.json"]
    end

    subgraph "Build Output Validation"
        BUILD_TEST["test:build"]
        PUBLINT_CHECK["publint validation"]
    end

    CMD --> NX_TYPES
    NX_TYPES --> AI
    NX_TYPES --> CLIENT
    NX_TYPES --> REACT
    NX_TYPES --> ADAPTERS

    AI --> TSC
    CLIENT --> TSC
    REACT --> TSC
    ADAPTERS --> TSC

    TSC -.validates.-> BUILD_TEST
    BUILD_TEST --> PUBLINT_CHECK
```

**Execution**: Type checking runs via `nx affected --targets=test:types --exclude=examples/**` ([package.json:26]()), excluding example applications. The Nx configuration specifies that type checking depends on `^build` ([nx.json:45-49]()), ensuring parent packages are built before type checking their consumers.

**TypeScript Version**: The monorepo standardizes on TypeScript `5.9.3` ([pnpm-lock.yaml:71-73]()), locked across all packages to prevent version conflicts.

**Caching Strategy**: Type checking results are cached based on `default` and `^production` inputs ([nx.json:45-49]()), meaning the cache invalidates when source files change or when production dependencies are modified.

**Sources**: [package.json:26](), [nx.json:45-49](), [pnpm-lock.yaml:71-73]()

---

## Knip: Dead Code Detection

Knip analyzes the codebase to detect unused files, dependencies, exports, and configuration:

### Knip Detection Capabilities

| Detection Type       | Description                               | Impact                              |
| -------------------- | ----------------------------------------- | ----------------------------------- |
| Unused Files         | Files not imported by any entry point     | Build size, maintenance burden      |
| Unused Dependencies  | `package.json` dependencies not imported  | Installation time, security surface |
| Unused Exports       | Exported members never imported elsewhere | API surface clarity                 |
| Unused Configuration | Config files for tools not in use         | Configuration complexity            |

**Execution**: Knip runs via `knip` command ([package.json:27]()) and is included in the CI test suite ([package.json:19]()). Unlike other tools, Knip does not use `nx affected` but instead analyzes the entire workspace ([nx.json:65-68]()).

**Configuration**: Knip is configured at version `5.73.4` ([pnpm-lock.yaml:44-46]()) and requires `@types/node` and `typescript` as peer dependencies, indicating it performs type-aware analysis.

**Nx Integration**: The `test:knip` target uses cache but includes `{workspaceRoot}/**/*` as inputs ([nx.json:65-68]()), meaning it re-runs when any file in the workspace changes. This is necessary because Knip needs a holistic view of the codebase.

**CI Integration Flow**:

```mermaid
graph TB
    START["CI Pipeline Triggered"]
    SETUP["Setup pnpm + Node.js"]
    TEST_CI["pnpm run test:ci"]

    subgraph "Parallel Quality Checks"
        SHERIF["test:sherif"]
        KNIP["test:knip"]
        DOCS["test:docs"]
        ESLINT["test:eslint"]
        LIB["test:lib"]
        TYPES["test:types"]
        BUILD["test:build"]
    end

    FINAL_BUILD["build"]
    SUCCESS["✓ All Checks Passed"]
    FAIL["✗ Check Failed"]

    START --> SETUP
    SETUP --> TEST_CI
    TEST_CI --> SHERIF
    TEST_CI --> KNIP
    TEST_CI --> DOCS
    TEST_CI --> ESLINT
    TEST_CI --> LIB
    TEST_CI --> TYPES
    TEST_CI --> BUILD

    SHERIF --> FINAL_BUILD
    KNIP --> FINAL_BUILD
    DOCS --> FINAL_BUILD
    ESLINT --> FINAL_BUILD
    LIB --> FINAL_BUILD
    TYPES --> FINAL_BUILD
    BUILD --> FINAL_BUILD

    FINAL_BUILD --> SUCCESS
    SHERIF -.failure.-> FAIL
    KNIP -.failure.-> FAIL
    DOCS -.failure.-> FAIL
    ESLINT -.failure.-> FAIL
    LIB -.failure.-> FAIL
    TYPES -.failure.-> FAIL
    BUILD -.failure.-> FAIL
    FINAL_BUILD -.failure.-> FAIL
```

**Sources**: [package.json:27](), [nx.json:65-68](), [pnpm-lock.yaml:44-46](), [.github/workflows/release.yml:31-32]()

---

## Sherif: Package Consistency Validation

Sherif enforces consistency rules across the monorepo's `package.json` files:

```mermaid
graph TB
    subgraph "Sherif Validation Scope"
        ROOT_PKG["Root package.json"]
        WORKSPACE_PKGS["packages/**/package.json<br/>examples/**/package.json"]
        PNPM_LOCK["pnpm-lock.yaml"]
    end

    subgraph "Sherif Checks"
        VERSION_SYNC["Dependency Version Consistency<br/>────────<br/>Same dep = same version"]
        PEER_DEPS["Peer Dependency Validation<br/>────────<br/>Satisfy peer requirements"]
        WORKSPACE_PROTO["Workspace Protocol Usage<br/>────────<br/>workspace:* for internal deps"]
        UNUSED_DEPS["Unused Dependencies<br/>────────<br/>Listed but not imported"]
    end

    subgraph "Execution"
        CMD["pnpm test:sherif"]
        SHERIF_CLI["sherif"]
        NX_CACHE["Nx Cache<br/>────────<br/>Cached by package.json inputs"]
    end

    ROOT_PKG --> VERSION_SYNC
    WORKSPACE_PKGS --> VERSION_SYNC
    WORKSPACE_PKGS --> PEER_DEPS
    WORKSPACE_PKGS --> WORKSPACE_PROTO
    PNPM_LOCK --> UNUSED_DEPS

    VERSION_SYNC --> SHERIF_CLI
    PEER_DEPS --> SHERIF_CLI
    WORKSPACE_PROTO --> SHERIF_CLI
    UNUSED_DEPS --> SHERIF_CLI

    CMD --> SHERIF_CLI
    SHERIF_CLI --> NX_CACHE
```

**Version**: Sherif `1.9.0` is used ([pnpm-lock.yaml:65-67]()).

**Execution**: Runs via `sherif` command ([package.json:21]()) and is included in all CI checks ([package.json:19]()).

**Nx Caching**: The `test:sherif` target caches results based on `{workspaceRoot}/**/package.json` inputs ([nx.json:69-72]()), re-running only when any `package.json` file changes in the workspace.

**Workspace Protocol**: Sherif validates that internal dependencies use `workspace:*` or `workspace:^` protocol. Examples from the codebase:

- [pnpm-lock.yaml:98-100](): `@tanstack/ai: workspace:*` in examples
- [pnpm-lock.yaml:637-639](): `@tanstack/ai: workspace:*` in ai-client
- [pnpm-lock.yaml:754-756](): `@tanstack/ai: workspace:^` in ai-preact

**Sources**: [package.json:21](), [nx.json:69-72](), [pnpm-lock.yaml:65-67]()

---

## Prettier: Automated Code Formatting

Prettier enforces consistent code formatting across the entire codebase:

### Prettier Configuration

```mermaid
graph LR
    subgraph "Prettier Toolchain"
        PRETTIER["prettier@3.7.4"]
        SVELTE_PLUGIN["prettier-plugin-svelte@3.4.0"]
    end

    subgraph "Execution Modes"
        MANUAL["Manual Format<br/>────────<br/>pnpm format"]
        AUTOFIX["Autofix Workflow<br/>────────<br/>GitHub Actions"]
        CHANGESET["Changeset Version<br/>────────<br/>Post-version hook"]
    end

    subgraph "File Coverage"
        TS["TypeScript Files<br/>*.ts, *.tsx"]
        JS["JavaScript Files<br/>*.js, *.mjs"]
        SVELTE["Svelte Files<br/>*.svelte"]
        JSON["Config Files<br/>*.json"]
        MD["Markdown Files<br/>*.md"]
    end

    MANUAL --> PRETTIER
    AUTOFIX --> PRETTIER
    CHANGESET --> PRETTIER

    PRETTIER --> SVELTE_PLUGIN

    PRETTIER -.formats.-> TS
    PRETTIER -.formats.-> JS
    SVELTE_PLUGIN -.formats.-> SVELTE
    PRETTIER -.formats.-> JSON
    PRETTIER -.formats.-> MD
```

**Format Command**: `prettier --experimental-cli --ignore-unknown '**/*' --write` ([package.json:33]()) formats all files, ignoring unknown file types.

**Svelte Support**: The `prettier-plugin-svelte@3.4.0` ([pnpm-lock.yaml:59-61]()) enables Prettier to format Svelte components in the monorepo.

**Autofix Workflow**: The repository includes an automated fix workflow that runs on pull requests and pushes:

```mermaid
sequenceDiagram
    participant DEV as "Developer"
    participant PR as "Pull Request"
    participant GH as "GitHub Actions"
    participant AUTOFIX as "autofix-ci/action"

    DEV->>PR: "Push code changes"
    PR->>GH: "Trigger autofix.yml"
    GH->>GH: "Checkout code"
    GH->>GH: "Setup pnpm + Node"
    GH->>GH: "pnpm format"

    alt "Formatting Changes Needed"
        GH->>AUTOFIX: "Apply fixes"
        AUTOFIX->>PR: "Commit: 'ci: apply automated fixes'"
        PR-->>DEV: "✓ Auto-formatted"
    else "No Changes"
        GH-->>DEV: "✓ Already formatted"
    end
```

**Changeset Integration**: After version bumps via Changesets, the workflow runs `pnpm format` to ensure `package.json` and `CHANGELOG.md` files are properly formatted ([package.json:39]()).

**Sources**: [package.json:33](), [pnpm-lock.yaml:56-61](), [.github/workflows/autofix.yml:1-30]()

---

## Publint: Package Export Validation

Publint validates that package exports are correctly configured for NPM publishing:

**Version**: `publint@0.3.16` ([pnpm-lock.yaml:62-64]())

**Purpose**: Publint checks that:

- Package `exports` field is correctly configured
- TypeScript types are properly exposed
- ESM/CJS dual publishing works correctly
- Entry points resolve correctly

**Integration**: Some packages use Publint through build tools. For example, `ai-solid` uses `tsdown` with Publint integration:

```typescript
// packages/typescript/ai-solid/tsdown.config.ts
publint: {
  strict: true,
}
```

This configuration ([packages/typescript/ai-solid/tsdown.config.ts:12-14]()) runs Publint validation during the build process with strict mode enabled.

**Sources**: [pnpm-lock.yaml:62-64](), [packages/typescript/ai-solid/tsdown.config.ts:12-14]()

---

## Quality Tool Integration Summary

The following table summarizes how each quality tool integrates with the build system:

| Tool       | Nx Target     | Depends On | Inputs                                                       | Outputs | Exclusions    |
| ---------- | ------------- | ---------- | ------------------------------------------------------------ | ------- | ------------- |
| ESLint     | `test:eslint` | `^build`   | `default`, `^production`, `{workspaceRoot}/eslint.config.js` | None    | `examples/**` |
| TypeScript | `test:types`  | `^build`   | `default`, `^production`                                     | None    | `examples/**` |
| Knip       | `test:knip`   | None       | `{workspaceRoot}/**/*`                                       | None    | None          |
| Sherif     | `test:sherif` | None       | `{workspaceRoot}/**/package.json`                            | None    | None          |
| Build Test | `test:build`  | `build`    | `production`                                                 | None    | `examples/**` |

**Parallel Execution**: Nx runs multiple targets in parallel with a limit of 5 concurrent tasks ([nx.json:6]()). The CI pipeline executes all quality checks concurrently before proceeding to the final build:

```
test:sherif ─┐
test:knip   ─┤
test:docs   ─┼──> (Parallel) ──> Final build
test:eslint ─┤
test:lib    ─┤
test:types  ─┤
test:build  ─┘
```

**Caching**: All quality tool targets have `cache: true` ([nx.json:29-72]()), enabling Nx to skip redundant checks when inputs haven't changed. The cache is shared across CI runs via Nx Cloud ([nx.json:4]()).

**Sources**: [nx.json:27-73](), [package.json:18-27](), [.github/workflows/release.yml:31-32]()
