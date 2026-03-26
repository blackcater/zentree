# Testing Infrastructure

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [.changeset/pre.json](.changeset/pre.json)
- [client-sdks/client-js/CHANGELOG.md](client-sdks/client-js/CHANGELOG.md)
- [client-sdks/client-js/package.json](client-sdks/client-js/package.json)
- [client-sdks/react/package.json](client-sdks/react/package.json)
- [deployers/cloudflare/CHANGELOG.md](deployers/cloudflare/CHANGELOG.md)
- [deployers/cloudflare/package.json](deployers/cloudflare/package.json)
- [deployers/netlify/CHANGELOG.md](deployers/netlify/CHANGELOG.md)
- [deployers/netlify/package.json](deployers/netlify/package.json)
- [deployers/vercel/CHANGELOG.md](deployers/vercel/CHANGELOG.md)
- [deployers/vercel/package.json](deployers/vercel/package.json)
- [examples/dane/CHANGELOG.md](examples/dane/CHANGELOG.md)
- [examples/dane/package.json](examples/dane/package.json)
- [package.json](package.json)
- [packages/cli/CHANGELOG.md](packages/cli/CHANGELOG.md)
- [packages/cli/package.json](packages/cli/package.json)
- [packages/core/CHANGELOG.md](packages/core/CHANGELOG.md)
- [packages/core/package.json](packages/core/package.json)
- [packages/create-mastra/CHANGELOG.md](packages/create-mastra/CHANGELOG.md)
- [packages/create-mastra/package.json](packages/create-mastra/package.json)
- [packages/deployer/CHANGELOG.md](packages/deployer/CHANGELOG.md)
- [packages/deployer/package.json](packages/deployer/package.json)
- [packages/mcp-docs-server/CHANGELOG.md](packages/mcp-docs-server/CHANGELOG.md)
- [packages/mcp-docs-server/package.json](packages/mcp-docs-server/package.json)
- [packages/mcp/CHANGELOG.md](packages/mcp/CHANGELOG.md)
- [packages/mcp/package.json](packages/mcp/package.json)
- [packages/playground-ui/CHANGELOG.md](packages/playground-ui/CHANGELOG.md)
- [packages/playground-ui/package.json](packages/playground-ui/package.json)
- [packages/playground/CHANGELOG.md](packages/playground/CHANGELOG.md)
- [packages/playground/package.json](packages/playground/package.json)
- [packages/server/CHANGELOG.md](packages/server/CHANGELOG.md)
- [packages/server/package.json](packages/server/package.json)
- [pnpm-lock.yaml](pnpm-lock.yaml)

</details>

## Purpose and Scope

The testing infrastructure in Mastra provides comprehensive integration and unit testing capabilities across all packages. This document covers vitest configuration, test organization, multi-version AI SDK testing, storage provider validation, worker-based isolation patterns, and reusable test utilities. For information about monorepo tooling and CI/CD pipelines, see section 12.3. For information about the actual memory system implementations being tested, see section 7.

## Test Framework and Version Management

Mastra uses Vitest 4.0.18 as the primary test runner across all packages. Test dependencies are managed through pnpm's catalog feature to ensure version consistency.

### Catalog-Based Dependency Management

The root `pnpm-lock.yaml` defines a catalog for shared test dependencies:

```yaml
catalogs:
  default:
    vitest:
      specifier: 4.0.18
      version: 4.0.18
    '@vitest/coverage-v8':
      specifier: 4.0.18
      version: 4.0.18
    '@vitest/ui':
      specifier: 4.0.18
      version: 4.0.18
```

Packages reference these catalog entries in their `package.json`:

```json
{
  "devDependencies": {
    "vitest": "catalog:",
    "@vitest/coverage-v8": "catalog:",
    "@vitest/ui": "catalog:"
  }
}
```

**Benefits:**

- Single source of truth for test framework versions
- Automatic version synchronization across all packages
- Simplified upgrades (change once, apply everywhere)

**Sources:** [pnpm-lock.yaml:8-23](), [packages/core/package.json:290-303](), [packages/cli/package.json:84-92]()

### Test Script Patterns

Test scripts follow consistent patterns across packages:

| Script             | Purpose                 | Example Usage           |
| ------------------ | ----------------------- | ----------------------- |
| `test`             | Run all tests once      | `pnpm test`             |
| `test:watch`       | Run tests in watch mode | `pnpm test:watch`       |
| `test:unit`        | Run unit tests only     | `pnpm test:unit`        |
| `test:integration` | Run integration tests   | `pnpm test:integration` |
| `test:e2e`         | Run end-to-end tests    | `pnpm test:e2e`         |

**Package-Specific Scripts:**

```json
// packages/core/package.json
{
  "scripts": {
    "test:unit": "vitest run --exclude '**/tool-builder/**'",
    "test:types:zod": "node test-zod-compat.mjs",
    "test": "npm run test:unit"
  }
}
```

```json
// packages/cli/package.json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest watch"
  }
}
```

**Sources:** [packages/core/package.json:208-220](), [packages/cli/package.json:28-32](), [packages/deployer/package.json:86-91]()

---

## Test Organization and Structure

Mastra's test infrastructure is organized around both unit tests (co-located with source files) and integration tests (in dedicated `integration-tests` directories). Integration tests validate cross-cutting concerns across multiple packages and external dependencies.

### Directory Structure

```mermaid
graph TB
    ROOT["packages/"]
    MEMORY["memory/"]
    CORE["core/"]

    MEM_INT["integration-tests/"]
    MEM_SRC["src/"]

    TESTS["Test Files"]
    SHARED["shared/"]
    WORKER["worker/"]
    V4["v4/"]
    V5["v5/"]
    V6["v6/"]

    ROOT --> MEMORY
    ROOT --> CORE

    MEMORY --> MEM_INT
    MEM_INT --> MEM_SRC

    MEM_SRC --> TESTS
    MEM_SRC --> SHARED
    MEM_SRC --> WORKER
    MEM_SRC --> V4
    MEM_SRC --> V5
    MEM_SRC --> V6

    TESTS -.->|"working-memory.test.ts"| TF1["Version-specific tests"]
    TESTS -.->|"streaming-memory.test.ts"| TF2["Streaming tests"]
    TESTS -.->|"processors.test.ts"| TF3["Processor tests"]
    TESTS -.->|"with-pg-storage.test.ts"| TF4["Storage provider tests"]

    SHARED -.->|"Reusable suites"| RS1["getWorkingMemoryTests"]
    SHARED -.->|"Reusable suites"| RS2["getPgStorageTests"]
    SHARED -.->|"Reusable suites"| RS3["getResuableTests"]

    WORKER -.->|"generic-memory-worker.ts"| WK["Worker isolation"]
```

**Sources:** [packages/memory/integration-tests/src/working-memory.test.ts:1-24](), [packages/memory/integration-tests/src/with-pg-storage.test.ts:1-35]()

### Test File Naming Conventions

| Pattern             | Purpose                                         | Example                           | Location          |
| ------------------- | ----------------------------------------------- | --------------------------------- | ----------------- |
| `*.test.ts`         | Top-level test files that import and run suites | `working-memory.test.ts`          | Anywhere          |
| `*.spec.ts`         | Alternative test file extension                 | `agent.spec.ts`                   | Anywhere          |
| `shared/*.ts`       | Reusable test suites exported as functions      | `shared/working-memory.ts`        | Integration tests |
| `with-*.test.ts`    | Storage provider-specific test files            | `with-pg-storage.test.ts`         | Integration tests |
| `worker/*.ts`       | Worker thread implementations for isolation     | `worker/generic-memory-worker.ts` | Integration tests |
| `v4/`, `v5/`, `v6/` | Version-specific fixtures and test data         | `v4/mastra/agents/weather.ts`     | Integration tests |
| `__tests__/`        | Co-located test directory                       | `src/__tests__/`                  | Some packages     |

**Test Discovery:**
Vitest automatically discovers files matching these patterns:

- `**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}`
- `**/__tests__/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}`

**Sources:** [packages/memory/integration-tests/src/working-memory.test.ts:1-24](), [packages/core/package.json:218-220]()

---

## Multi-Version Testing Strategy

Mastra tests against multiple AI SDK versions (v4, v5, v6) to ensure backward compatibility and identify version-specific behavior. The strategy uses reusable test suites that accept version-specific configurations.

### Version Testing Architecture

```mermaid
graph TB
    TEST_FILE["working-memory.test.ts"]

    SUITE_FN["getWorkingMemoryTests()"]
    SUITE_FN_ADD["getWorkingMemoryAdditiveTests()"]

    V4_CONFIG["V4 Config"]
    V5_CONFIG["V5 Config"]
    V6_CONFIG["V6 Config"]

    V4_SDK["@ai-sdk/openai<br/>openai('gpt-4o')"]
    V5_SDK["Model Router<br/>'openai/gpt-4o'"]
    V6_SDK["@ai-sdk/openai-v6<br/>openaiV6('gpt-4o')"]

    V4_DESC["describe('V4')"]
    V5_DESC["describe('V5')"]
    V6_DESC["describe('V6')"]

    TEST_FILE --> V4_DESC
    TEST_FILE --> V5_DESC
    TEST_FILE --> V6_DESC

    V4_DESC --> SUITE_FN
    V4_DESC --> SUITE_FN_ADD
    V5_DESC --> SUITE_FN
    V5_DESC --> SUITE_FN_ADD
    V6_DESC --> SUITE_FN
    V6_DESC --> SUITE_FN_ADD

    SUITE_FN -.->|"passes model"| V4_SDK
    SUITE_FN -.->|"passes model"| V5_SDK
    SUITE_FN -.->|"passes model"| V6_SDK

    V4_CONFIG --> V4_SDK
    V5_CONFIG --> V5_SDK
    V6_CONFIG --> V6_SDK
```

**Sources:** [packages/memory/integration-tests/src/working-memory.test.ts:1-24]()

### Version-Specific Test Invocation

The test files invoke reusable suites with version-specific configurations:

```typescript
// V4 Tests
describe('V4', () => {
  getWorkingMemoryTests(openai('gpt-4o'))
  getWorkingMemoryAdditiveTests(openai('gpt-4o'))
})

// V5 Tests (using Model Router)
describe('V5', () => {
  getWorkingMemoryTests('openai/gpt-4o')
  getWorkingMemoryAdditiveTests('openai/gpt-5.2')
})

// V6 Tests
describe('V6', () => {
  getWorkingMemoryTests(openaiV6('gpt-4o'))
  getWorkingMemoryAdditiveTests(openaiV6('gpt-5.2'))
})
```

**Model Selection Strategy:** V5 and V6 use `gpt-5.2` for additive tests because `gpt-4o` consistently fails the "Large Real-World Schema" test. This demonstrates version-specific model behavior and the need for flexible model configuration.

**Sources:** [packages/memory/integration-tests/src/working-memory.test.ts:8-23]()

### Processor Version Testing

Processor tests use mock language models and stream converters that are version-specific:

```mermaid
graph LR
    PROC_TEST["processors.test.ts"]

    V5_BLOCK["describe('V5')"]
    V6_BLOCK["describe('V6')"]

    V5_CONFIG["V5 Config Object"]
    V6_CONFIG["V6 Config Object"]

    V5_MOCK["MockLanguageModelV2"]
    V6_MOCK["MockLanguageModelV3"]

    V5_STREAM["convertArrayToReadableStreamV5"]
    V6_STREAM["convertArrayToReadableStreamV6"]

    SUITE1["getProcessorsTests"]
    SUITE2["getInputProcessorsTests"]
    SUITE3["getOutputProcessorMemoryTests"]

    PROC_TEST --> V5_BLOCK
    PROC_TEST --> V6_BLOCK

    V5_BLOCK --> V5_CONFIG
    V6_BLOCK --> V6_CONFIG

    V5_CONFIG --> V5_MOCK
    V5_CONFIG --> V5_STREAM
    V6_CONFIG --> V6_MOCK
    V6_CONFIG --> V6_STREAM

    V5_BLOCK --> SUITE1
    V5_BLOCK --> SUITE2
    V5_BLOCK --> SUITE3
    V6_BLOCK --> SUITE1
    V6_BLOCK --> SUITE2
    V6_BLOCK --> SUITE3
```

**Sources:** [packages/memory/integration-tests/src/processors.test.ts:16-39]()

---

## Storage Provider Testing

Mastra validates storage implementations across PostgreSQL, LibSQL, and Upstash. Each provider has dedicated test files that set up infrastructure, run reusable test suites, and tear down resources.

### Storage Test Architecture

```mermaid
graph TB
    subgraph "PostgreSQL Tests"
        PG_TEST["with-pg-storage.test.ts"]
        PG_DOCKER["docker compose up postgres"]
        PG_SUITE["getPgStorageTests()"]
        PG_POOL["PostgresStore + PgVector"]
        PG_TEARDOWN["pool.close() + disconnect()"]
    end

    subgraph "LibSQL Tests"
        LIBSQL_TEST["with-libsql-storage.test.ts"]
        LIBSQL_FILE["file:test.db"]
        LIBSQL_SUITE["getResuableTests()"]
        LIBSQL_STORE["LibSQLStore + LibSQLVector"]
        LIBSQL_TEARDOWN["rm -rf dbStoragePath"]
    end

    subgraph "Upstash Tests"
        UPSTASH_TEST["with-upstash-storage.test.ts"]
        UPSTASH_DOCKER["docker compose up<br/>serverless-redis-http"]
        UPSTASH_SUITE["getResuableTests()"]
        UPSTASH_STORE["UpstashStore + LibSQLVector"]
        UPSTASH_TEARDOWN["docker compose down + unlink"]
    end

    PG_TEST --> PG_DOCKER
    PG_DOCKER --> PG_SUITE
    PG_SUITE --> PG_POOL
    PG_POOL --> PG_TEARDOWN

    LIBSQL_TEST --> LIBSQL_FILE
    LIBSQL_FILE --> LIBSQL_SUITE
    LIBSQL_SUITE --> LIBSQL_STORE
    LIBSQL_STORE --> LIBSQL_TEARDOWN

    UPSTASH_TEST --> UPSTASH_DOCKER
    UPSTASH_DOCKER --> UPSTASH_SUITE
    UPSTASH_SUITE --> UPSTASH_STORE
    UPSTASH_STORE --> UPSTASH_TEARDOWN
```

**Sources:** [packages/memory/integration-tests/src/with-pg-storage.test.ts:1-35](), [packages/memory/integration-tests/src/with-libsql-storage.test.ts:1-124](), [packages/memory/integration-tests/src/with-upstash-storage.test.ts:1-146]()

### PostgreSQL Test Setup

PostgreSQL tests use Docker Compose for infrastructure management:

**Setup Phase:**

- `beforeAll`: Starts PostgreSQL container with `docker compose up -d postgres --wait`
- Connection string defaults to `postgres://postgres:password@localhost:5434/mastra`
- Can be overridden with `DB_URL` environment variable

**Teardown Phase:**

- Pool cleanup handled by `getPgStorageTests` via nested `afterAll`
- Outer `afterAll` runs last (Vitest executes in reverse registration order)
- Tears down Docker container: `docker compose down --volumes postgres`

**Sources:** [packages/memory/integration-tests/src/with-pg-storage.test.ts:7-34]()

### LibSQL Test Configuration

LibSQL tests use temporary file-based databases:

| Configuration | Value                      | Purpose                   |
| ------------- | -------------------------- | ------------------------- |
| Storage URL   | `file:${tmpdir()}/test.db` | Temporary SQLite database |
| Vector URL    | `file:libsql-test.db`      | Vector storage database   |
| Embedder      | `fastembed`                | Local embedding model     |
| Cleanup       | `rm -rf dbStoragePath`     | Remove temporary files    |

**Sources:** [packages/memory/integration-tests/src/with-libsql-storage.test.ts:24-43]()

### Upstash Test Configuration

Upstash tests use Docker for Redis HTTP interface:

**Infrastructure:**

- Service: `serverless-redis-http` (Docker Compose)
- URL: `http://localhost:8079`
- Token: `test_token` (development token)

**Storage Combination:**

- Memory storage: `UpstashStore` (Redis HTTP)
- Vector storage: `LibSQLVector` (file-based, TODO: use Upstash Vector)

**Sources:** [packages/memory/integration-tests/src/with-upstash-storage.test.ts:21-78]()

### Reusable Test Suite Pattern

Storage tests use a factory function pattern to provide test configuration:

```typescript
getResuableTests(() => {
  return {
    memory: memoryInstance,
    workerTestConfig: {
      storageTypeForWorker: StorageType.LibSQL,
      storageConfigForWorker: { url: '...', id: randomUUID() },
      memoryOptionsForWorker: memoryOptions,
      vectorConfigForWorker: { url: '...', id: randomUUID() },
    },
  }
})
```

The factory function returns:

1. **memory**: Configured `Memory` instance for direct tests
2. **workerTestConfig**: Configuration for worker-based isolation tests

**Sources:** [packages/memory/integration-tests/src/with-libsql-storage.test.ts:45-58]()

---

## Worker-Based Isolation

Worker threads provide process isolation for tests that would otherwise interfere with each other due to shared state, connection pools, or singleton instances.

### Worker Test Flow

```mermaid
sequenceDiagram
    participant Test as "Test Suite"
    participant Factory as "getResuableTests()"
    participant WorkerAPI as "Worker Thread API"
    participant Worker as "generic-memory-worker.ts"
    participant Storage as "Storage Provider"

    Test->>Factory: Call with config factory
    Factory->>WorkerAPI: Spawn worker with data
    WorkerAPI->>Worker: Pass workerData

    Worker->>Worker: Import storage module
    Worker->>Storage: Initialize store + vector

    loop For each message
        Worker->>Storage: saveMessages()
    end

    Worker->>Storage: Teardown (close/disconnect)
    Worker->>WorkerAPI: postMessage({ success: true })
    WorkerAPI->>Factory: Promise resolves
    Factory->>Test: Assertions
```

**Sources:** [packages/memory/integration-tests/src/worker/generic-memory-worker.ts:1-98]()

### Worker Data Structure

The worker receives serialized configuration via `workerData`:

```typescript
interface WorkerData {
  messages: MessageToProcess[]
  storageType: 'libsql' | 'pg' | 'upstash'
  storageConfig: LibSQLConfig | PostgresStoreConfig | UpstashConfig
  vectorConfig?: LibSQLVectorConfig
  memoryOptions?: SharedMemoryConfig['options']
}
```

**Sources:** [packages/memory/integration-tests/src/worker/generic-memory-worker.ts:32-37]()

### Storage-Specific Initialization

The worker dynamically imports storage modules based on `storageType`:

| Storage Type | Imports                        | Teardown                               |
| ------------ | ------------------------------ | -------------------------------------- |
| `libsql`     | `LibSQLStore`, `LibSQLVector`  | None (file-based)                      |
| `upstash`    | `UpstashStore`, `LibSQLVector` | None                                   |
| `pg`         | `PostgresStore`, `PgVector`    | `store.close()`, `vector.disconnect()` |

**Critical Detail:** PostgreSQL requires explicit connection cleanup via `close()` and `disconnect()` to prevent connection pool exhaustion. Other providers use file-based storage or HTTP APIs that don't maintain persistent connections.

**Sources:** [packages/memory/integration-tests/src/worker/generic-memory-worker.ts:46-72]()

### Error Handling in Workers

Worker errors are serialized for transmission across thread boundaries:

```typescript
catch (error: any) {
  const serializableError = {
    message: error.message,
    name: error.name,
    stack: error.stack,
  };
  await teardown();
  parentPort!.postMessage({ success: false, error: serializableError });
}
```

**Rationale:** Error objects cannot be directly transferred between threads. The serialization extracts the essential error information for debugging while ensuring the worker always attempts cleanup via `teardown()`.

**Sources:** [packages/memory/integration-tests/src/worker/generic-memory-worker.ts:86-94]()

---

## Test Infrastructure Management

Test infrastructure uses Docker Compose for external dependencies and Vitest lifecycle hooks for setup and teardown.

### Docker Compose Services

```mermaid
graph TB
    COMPOSE["docker-compose.yml"]

    PG["postgres<br/>PostgreSQL 16<br/>Port 5434"]
    REDIS["redis<br/>Redis 7<br/>Port 6379"]
    UPSTASH["serverless-redis-http<br/>Upstash Redis Mock<br/>Port 8079"]

    COMPOSE --> PG
    COMPOSE --> REDIS
    COMPOSE --> UPSTASH

    PG -.->|"DB_URL"| PG_TEST["with-pg-storage.test.ts"]
    UPSTASH -.->|"http://localhost:8079"| UPSTASH_TEST["with-upstash-storage.test.ts"]
```

**Sources:** [packages/memory/integration-tests/src/with-pg-storage.test.ts:17-21](), [packages/memory/integration-tests/src/with-upstash-storage.test.ts:24-26]()

### Lifecycle Hook Patterns

**PostgreSQL Test Lifecycle:**

```typescript
describe('PostgreSQL Storage Tests', () => {
  beforeAll(async () => {
    await $({
      cwd: join(__dirname, '..'),
      stdio: 'inherit',
      detached: true,
    })`docker compose up -d postgres --wait`
  })

  afterAll(async () => {
    return $({
      cwd: join(__dirname, '..'),
    })`docker compose down --volumes postgres`
  })

  getPgStorageTests(connectionString)
})
```

**Key Details:**

- `--wait` flag blocks until health checks pass
- `--volumes` ensures clean state between runs
- Pool cleanup happens in nested `afterAll` within `getPgStorageTests`

**Sources:** [packages/memory/integration-tests/src/with-pg-storage.test.ts:15-34]()

**Upstash Test Lifecycle:**

```typescript
beforeAll(async () => {
  dbPath = await mkdtemp(join(tmpdir(), `memory-test-`))
  return $({
    cwd: join(__dirname, '..'),
  })`docker compose up -d serverless-redis-http redis --wait`
})

afterAll(() => {
  for (const file of files) {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file)
    }
  }
  return $({
    cwd: join(__dirname, '..'),
  })`docker compose down --volumes serverless-redis-http redis`
})
```

**Sources:** [packages/memory/integration-tests/src/with-upstash-storage.test.ts:21-39]()

### Execution Order Guarantees

Vitest executes `afterAll` hooks in **reverse registration order**:

1. Test file's `afterAll` registers last → runs first
2. Nested suite's `afterAll` registers first → runs last

This ensures:

- Pool connections close before Docker containers stop
- File cleanup happens before directory removal
- No resource leaks or hanging connections

**Sources:** [packages/memory/integration-tests/src/with-pg-storage.test.ts:23-31]()

### Test Coverage Configuration

Coverage is tracked using `@vitest/coverage-v8` across all packages. The root workspace configures global coverage settings:

```json
{
  "devDependencies": {
    "@vitest/coverage-v8": "catalog:",
    "@vitest/ui": "catalog:"
  }
}
```

**Coverage Commands:**

```bash
# Run tests with coverage
pnpm test -- --coverage

# Run tests with UI
pnpm test -- --ui

# Watch mode with coverage
pnpm test:watch -- --coverage
```

**Per-Package Coverage:**
Each package can override coverage settings in its vitest configuration:

- Minimum coverage thresholds
- Included/excluded files
- Reporter formats (text, html, json)

**Sources:** [package.json:8-25](), [packages/core/package.json:290-291]()

---

## Reusable Test Utilities

The test infrastructure provides utilities for generating test data, filtering messages, and creating realistic conversation histories.

### Conversation History Generator

```mermaid
graph LR
    PARAMS["generateConversationHistory()"]

    CONFIG["Configuration"]
    LOOP["Message Loop"]
    MESSAGES["Message Array"]

    USER["User Message<br/>~100 tokens"]
    ASST["Assistant Message<br/>~60 tokens"]
    TOOL["Tool Call + Result"]

    V1["V1 Format<br/>MessageList.get.all.v1()"]
    V2["V2 Format<br/>MessageList.get.all.db()"]
    CORE["Core Format<br/>CoreMessage[]"]

    PARAMS --> CONFIG
    CONFIG --> LOOP

    LOOP --> USER
    LOOP --> ASST
    LOOP --> TOOL

    USER --> MESSAGES
    ASST --> MESSAGES
    TOOL --> MESSAGES

    MESSAGES --> V1
    MESSAGES --> V2
    MESSAGES --> CORE
```

**Sources:** [packages/memory/integration-tests/src/test-utils.ts:25-145]()

### Generator Parameters

| Parameter       | Default                               | Purpose                                |
| --------------- | ------------------------------------- | -------------------------------------- |
| `threadId`      | Required                              | Thread identifier for messages         |
| `resourceId`    | `'test-resource'`                     | Resource identifier                    |
| `messageCount`  | `5`                                   | Number of turn pairs to generate       |
| `toolFrequency` | `3`                                   | Tool calls every Nth assistant message |
| `toolNames`     | `['weather', 'calculator', 'search']` | Available tools                        |

**Output Structure:**

- `messages`: V1 format (`MastraMessageV1[]`)
- `messagesV2`: V2 format (`MastraDBMessage[]`)
- `fakeCore`: Core format (`CoreMessage[]`)
- `counts`: Statistics (`{ messages, toolCalls, toolResults }`)

**Sources:** [packages/memory/integration-tests/src/test-utils.ts:25-44]()

### Token Estimation

The generator creates messages with predictable token counts:

**Word-to-Token Mapping:**

- Base words: `['apple', 'banana', 'orange', 'grape']`
- Each word ≈ 1 token

**Message Sizes:**

- User messages: 25 words × 4 base words = ~100 tokens
- Assistant messages: 15 words × 4 base words = ~60 tokens

**Sources:** [packages/memory/integration-tests/src/test-utils.ts:44-55]()

### Message Filtering Utilities

The test utilities provide type-safe message filtering for both Core and V2 message formats:

**Core Message Filters:**

```typescript
filterToolCallsByName(messages: CoreMessage[], name: string)
filterToolResultsByName(messages: CoreMessage[], name: string)
```

**V2 Message Filters:**

```typescript
filterMastraToolCallsByName(messages: MastraDBMessage[], name: string)
filterMastraToolResultsByName(messages: MastraDBMessage[], name: string)
```

**Implementation Detail:** V2 filters check `part.toolInvocation.state` to distinguish between `'call'` (tool invocation) and `'result'` (tool completion).

**Sources:** [packages/memory/integration-tests/src/test-utils.ts:147-178]()

---

## Test Patterns and Best Practices

### Sequential Test Execution

Processor tests use `{ sequential: true }` to prevent interference:

```typescript
describe('V5 Processor Tests', { sequential: true }, () => {
  getProcessorsTests(v5Config)
  getInputProcessorsTests(v5Config)
  getOutputProcessorMemoryTests(v5Config)
})
```

**Rationale:** Memory processors maintain state between test runs. Sequential execution ensures clean state boundaries and prevents race conditions in shared resources like embedding caches.

**Sources:** [packages/memory/integration-tests/src/processors.test.ts:16-26]()

### Storage-Specific Query Validation

Tests validate provider-specific behavior like message ordering:

```typescript
it('should return the LAST N messages when using lastMessages config', async () => {
  // Insert messages 1-10 with increasing timestamps
  await memoryWithLimit.saveMessages({ messages })

  // Recall with lastMessages: 3
  const result = await memoryWithLimit.recall({ threadId, resourceId })

  expect(result.messages).toHaveLength(3)

  // Verify we got messages 8, 9, 10 (not 1, 2, 3)
  expect(contents).toContain('Message 8')
  expect(contents).toContain('Message 9')
  expect(contents).toContain('Message 10')
  expect(contents).not.toContain('Message 1')

  // Verify chronological order maintained
  expect(contents[0]).toBe('Message 8')
  expect(contents[1]).toBe('Message 9')
  expect(contents[2]).toBe('Message 10')
})
```

**Critical Validation:** Tests ensure `lastMessages` returns the NEWEST N messages in chronological order, not the OLDEST N messages. This was a bug that existed before internal query order fixes.

**Sources:** [packages/memory/integration-tests/src/with-libsql-storage.test.ts:60-122](), [packages/memory/integration-tests/src/with-upstash-storage.test.ts:81-143]()

### Version-Specific Model Selection

Tests adapt model choices based on version capabilities:

| SDK Version | Standard Tests | Additive Tests | Reason                           |
| ----------- | -------------- | -------------- | -------------------------------- |
| V4          | `gpt-4o`       | `gpt-4o`       | V4 incompatible with `gpt-5.2`   |
| V5          | `gpt-4o`       | `gpt-5.2`      | `gpt-4o` fails large schema test |
| V6          | `gpt-4o`       | `gpt-5.2`      | `gpt-4o` fails large schema test |

**Comment in Code:**

```typescript
// v4 — gpt-5.2 is incompatible with AI SDK v4
// v5 — gpt-5.2 for additive tests (gpt-4o consistently fails Large Real-World Schema)
// v6 — gpt-5.2 for additive tests (gpt-4o consistently fails Large Real-World Schema)
```

**Sources:** [packages/memory/integration-tests/src/working-memory.test.ts:7-23]()

### Mock Embedder for Tests

Worker tests use a mock embedder to avoid external dependencies:

```typescript
export const mockEmbedder = {
  // Mock implementation that doesn't make real API calls
  // but provides consistent embeddings for test validation
}
```

This pattern:

- Eliminates API rate limits in CI
- Provides deterministic test results
- Reduces test execution time
- Avoids API key management in test environments

**Sources:** [packages/memory/integration-tests/src/worker/generic-memory-worker.ts:8]()

### Streaming Memory Test Configuration

Streaming tests validate memory integration with different model versions and tool definitions:

```typescript
setupStreamingMemoryTest({
  model: openai('gpt-4o'), // V4 SDK
  memory,
  tools: { get_weather: weatherToolV4 },
})

setupStreamingMemoryTest({
  model: 'openai/gpt-4o', // V5 Model Router
  memory,
  tools: { get_weather: weatherToolV5 },
})

setupStreamingMemoryTest({
  model: openaiV6('gpt-4o'), // V6 SDK
  memory,
  tools: { get_weather: weatherToolV6 },
})
```

**Key Pattern:** Each version uses its own tool definition format because tool schemas differ across AI SDK versions. The test suite validates that memory works correctly with each version's tool execution pattern.

**Sources:** [packages/memory/integration-tests/src/streaming-memory.test.ts:18-34]()
