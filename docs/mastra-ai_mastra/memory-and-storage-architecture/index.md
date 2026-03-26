# Memory and Storage Architecture

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [packages/agent-builder/integration-tests/.gitignore](packages/agent-builder/integration-tests/.gitignore)
- [packages/agent-builder/integration-tests/README.md](packages/agent-builder/integration-tests/README.md)
- [packages/agent-builder/integration-tests/docker-compose.yml](packages/agent-builder/integration-tests/docker-compose.yml)
- [packages/agent-builder/integration-tests/src/fixtures/minimal-mastra-project/.gitignore](packages/agent-builder/integration-tests/src/fixtures/minimal-mastra-project/.gitignore)
- [packages/agent-builder/integration-tests/src/fixtures/minimal-mastra-project/env.example](packages/agent-builder/integration-tests/src/fixtures/minimal-mastra-project/env.example)
- [packages/core/src/memory/memory.ts](packages/core/src/memory/memory.ts)
- [packages/core/src/memory/types.ts](packages/core/src/memory/types.ts)
- [packages/memory/CHANGELOG.md](packages/memory/CHANGELOG.md)
- [packages/memory/integration-tests/docker-compose.yml](packages/memory/integration-tests/docker-compose.yml)
- [packages/memory/integration-tests/src/agent-memory.test.ts](packages/memory/integration-tests/src/agent-memory.test.ts)
- [packages/memory/integration-tests/src/processors.test.ts](packages/memory/integration-tests/src/processors.test.ts)
- [packages/memory/integration-tests/src/streaming-memory.test.ts](packages/memory/integration-tests/src/streaming-memory.test.ts)
- [packages/memory/integration-tests/src/test-utils.ts](packages/memory/integration-tests/src/test-utils.ts)
- [packages/memory/integration-tests/src/with-libsql-storage.test.ts](packages/memory/integration-tests/src/with-libsql-storage.test.ts)
- [packages/memory/integration-tests/src/with-pg-storage.test.ts](packages/memory/integration-tests/src/with-pg-storage.test.ts)
- [packages/memory/integration-tests/src/with-upstash-storage.test.ts](packages/memory/integration-tests/src/with-upstash-storage.test.ts)
- [packages/memory/integration-tests/src/worker/generic-memory-worker.ts](packages/memory/integration-tests/src/worker/generic-memory-worker.ts)
- [packages/memory/integration-tests/src/working-memory.test.ts](packages/memory/integration-tests/src/working-memory.test.ts)
- [packages/memory/integration-tests/vitest.config.ts](packages/memory/integration-tests/vitest.config.ts)
- [packages/memory/package.json](packages/memory/package.json)
- [packages/memory/src/index.test.ts](packages/memory/src/index.test.ts)
- [packages/memory/src/index.ts](packages/memory/src/index.ts)
- [packages/memory/src/tools/working-memory.ts](packages/memory/src/tools/working-memory.ts)
- [stores/pg/CHANGELOG.md](stores/pg/CHANGELOG.md)
- [stores/pg/package.json](stores/pg/package.json)

</details>

## Purpose and Scope

This page provides an overview of Mastra's memory and storage architecture, which enables agents to maintain conversation context, persist data, and retrieve relevant information across sessions. The architecture separates concerns between:

- **Memory abstraction layer**: High-level APIs for working with threads, messages, and memory types
- **Storage layer**: Pluggable adapters for persisting data (PostgreSQL, LibSQL, Upstash)
- **Vector layer**: Embedding generation and semantic search capabilities

For detailed information on specific memory types, see [Working Memory and Tool Integration](#7.10) and [Observational Memory System](#7.9). For RAG and document processing, see [RAG System and Document Processing](#7.7). For model context protocol integration, see [Model Context Protocol (MCP) Integration](#7.8).

---

## Core Architecture Overview

The memory system is built on a layered architecture that separates the memory abstraction from storage implementation details.

### Memory Class Hierarchy

```mermaid
graph TB
    subgraph "User-Facing Memory Classes"
        Memory["Memory<br/>(packages/memory/src/index.ts)"]
    end

    subgraph "Core Abstraction Layer"
        MastraMemory["MastraMemory<br/>(packages/core/src/memory/memory.ts)"]
        MastraBase["MastraBase"]
    end

    subgraph "Configuration and Types"
        MemoryConfig["MemoryConfig<br/>MemoryConfigInternal"]
        SharedMemoryConfig["SharedMemoryConfig"]
        ThreadOMMetadata["ThreadOMMetadata"]
        WorkingMemory["WorkingMemory"]
    end

    subgraph "Storage Interfaces"
        MastraCompositeStore["MastraCompositeStore<br/>(packages/core/src/storage)"]
        MemoryStorage["MemoryStorage<br/>interface"]
    end

    subgraph "Vector Interfaces"
        MastraVector["MastraVector<br/>interface"]
        MastraEmbeddingModel["MastraEmbeddingModel"]
    end

    Memory -->|extends| MastraMemory
    MastraMemory -->|extends| MastraBase
    Memory -->|uses| MemoryConfig
    MastraMemory -->|uses| SharedMemoryConfig

    Memory -->|requires| MastraCompositeStore
    MastraCompositeStore -->|provides| MemoryStorage

    Memory -->|optional| MastraVector
    Memory -->|optional| MastraEmbeddingModel

    MemoryConfig -->|contains| WorkingMemory
    MemoryConfig -->|contains| ThreadOMMetadata
```

**Sources**: [packages/memory/src/index.ts:78-93](), [packages/core/src/memory/memory.ts:109-196](), [packages/core/src/memory/types.ts:1-114]()

---

## Storage Domain Architecture

The storage layer uses a **domain pattern** where different concerns (memory, workflows, logs, etc.) are isolated into separate storage domains. Memory operations access the `memory` domain through the `MastraCompositeStore`.

```mermaid
graph TB
    subgraph "Memory Layer"
        Memory_recall["memory.recall()"]
        Memory_saveMessages["memory.saveMessages()"]
        Memory_listThreads["memory.listThreads()"]
    end

    subgraph "Storage Abstraction"
        MastraCompositeStore["MastraCompositeStore"]
        getStore["getStore('memory')"]
    end

    subgraph "Memory Domain Interface"
        MemoryStorage["MemoryStorage interface"]
        listMessages["listMessages()"]
        saveMessages["saveMessages()"]
        getThreadById["getThreadById()"]
        listThreads["listThreads()"]
        updateThread["updateThread()"]
        saveThread["saveThread()"]
        deleteThread["deleteThread()"]
        updateResource["updateResource()"]
        getResourceById["getResourceById()"]
    end

    subgraph "Storage Adapters"
        PostgresStore["PostgresStore<br/>(stores/pg)"]
        LibSQLStore["LibSQLStore<br/>(stores/libsql)"]
        UpstashStore["UpstashStore<br/>(stores/upstash)"]
        InMemoryStore["InMemoryStore<br/>(core)"]
    end

    subgraph "Database Tables"
        threads["threads table"]
        messages["messages table"]
        resources["resources table"]
    end

    Memory_recall --> getStore
    Memory_saveMessages --> getStore
    Memory_listThreads --> getStore

    getStore --> MemoryStorage

    MemoryStorage --> listMessages
    MemoryStorage --> saveMessages
    MemoryStorage --> getThreadById
    MemoryStorage --> listThreads
    MemoryStorage --> updateThread
    MemoryStorage --> saveThread
    MemoryStorage --> deleteThread
    MemoryStorage --> updateResource
    MemoryStorage --> getResourceById

    PostgresStore -.implements.-> MemoryStorage
    LibSQLStore -.implements.-> MemoryStorage
    UpstashStore -.implements.-> MemoryStorage
    InMemoryStore -.implements.-> MemoryStorage

    PostgresStore --> threads
    PostgresStore --> messages
    PostgresStore --> resources
```

**Sources**: [packages/memory/src/index.ts:98-104](), [packages/core/src/storage/storage.ts](), [stores/pg/src/index.ts]()

---

## Memory Types and Data Flow

Mastra supports multiple memory types that work together to provide comprehensive context management.

```mermaid
graph TB
    subgraph "Agent Execution"
        Agent["Agent.generate()/.stream()"]
        InputProcessors["Input Processors"]
        OutputProcessors["Output Processors"]
    end

    subgraph "Memory Types (Runtime)"
        MessageHistory["MessageHistory<br/>Recent conversation"]
        WorkingMemory_Processor["WorkingMemory<br/>Structured state"]
        SemanticRecall["SemanticRecall<br/>Vector retrieval"]
        ObservationalMemory["ObservationalMemory<br/>Long-term context"]
    end

    subgraph "Memory Storage"
        Memory_Class["Memory class"]
        recall["recall()"]
        saveMessages["saveMessages()"]
        getWorkingMemory["getWorkingMemory()"]
        updateWorkingMemory["updateWorkingMemory()"]
    end

    subgraph "Storage Layer"
        MemoryStorage_Domain["MemoryStorage domain"]
        messages_table["messages table"]
        threads_table["threads table<br/>(metadata.workingMemory)"]
        resources_table["resources table<br/>(workingMemory field)"]
    end

    subgraph "Vector Layer"
        VectorIndex["Vector Index<br/>(memory_messages_1536)"]
        Embedder["Embedding Model"]
    end

    Agent --> InputProcessors
    InputProcessors --> MessageHistory
    InputProcessors --> WorkingMemory_Processor
    InputProcessors --> SemanticRecall
    InputProcessors --> ObservationalMemory

    MessageHistory --> recall
    WorkingMemory_Processor --> getWorkingMemory
    SemanticRecall --> recall

    Agent --> OutputProcessors
    OutputProcessors --> saveMessages
    OutputProcessors --> updateWorkingMemory

    recall --> MemoryStorage_Domain
    saveMessages --> MemoryStorage_Domain
    getWorkingMemory --> MemoryStorage_Domain
    updateWorkingMemory --> MemoryStorage_Domain

    MemoryStorage_Domain --> messages_table
    MemoryStorage_Domain --> threads_table
    MemoryStorage_Domain --> resources_table

    saveMessages --> Embedder
    Embedder --> VectorIndex
    SemanticRecall --> VectorIndex
```

**Sources**: [packages/memory/src/index.ts:151-312](), [packages/core/src/memory/memory.ts:608-852](), [packages/core/src/processors/memory/]()

---

## Vector Storage and Semantic Recall

Semantic recall enables agents to retrieve relevant messages from past conversations using vector similarity search.

### Vector Index Management

```mermaid
graph LR
    subgraph "Message Save Flow"
        saveMessages["memory.saveMessages()"]
        embedMessageContent["embedMessageContent()"]
        createEmbeddingIndex["createEmbeddingIndex()"]
    end

    subgraph "Embedding Generation"
        chunkText["chunkText()"]
        embedMany["embedMany()<br/>(AI SDK v4/v5/v6)"]
        embeddingCache["embeddingCache<br/>(xxhash keyed)"]
    end

    subgraph "Vector Store"
        vectorUpsert["vector.upsert()"]
        indexName["Index Name<br/>memory_messages_1536"]
        metadata["Metadata<br/>{message_id, thread_id, resource_id}"]
    end

    subgraph "Semantic Recall Flow"
        recall_vectorSearch["recall(vectorSearchString)"]
        vectorQuery["vector.query()"]
        includeMessages["Include surrounding messages<br/>(before/after range)"]
    end

    saveMessages --> embedMessageContent
    embedMessageContent --> chunkText
    chunkText --> embedMany
    embedMany --> embeddingCache
    embedMessageContent --> createEmbeddingIndex
    embedMessageContent --> vectorUpsert

    vectorUpsert --> indexName
    vectorUpsert --> metadata

    recall_vectorSearch --> vectorQuery
    vectorQuery --> indexName
    vectorQuery --> includeMessages
```

**Sources**: [packages/memory/src/index.ts:706-867](), [packages/memory/src/index.ts:310-348](), [packages/core/src/memory/memory.ts:269-348]()

---

## Working Memory Scopes

Working memory can be scoped at either the **resource** level (shared across threads) or **thread** level (isolated per conversation).

| Scope                | Storage Location                       | Use Case                                                  | Access Pattern                              |
| -------------------- | -------------------------------------- | --------------------------------------------------------- | ------------------------------------------- |
| `resource` (default) | `resources.workingMemory` field        | User preferences, facts that persist across conversations | Shared by all threads for same `resourceId` |
| `thread`             | `threads.metadata.workingMemory` field | Conversation-specific context                             | Isolated per thread                         |

```mermaid
graph TB
    subgraph "Resource-Scoped Working Memory"
        Resource["Resource<br/>(e.g., user-123)"]
        Thread1["Thread 1"]
        Thread2["Thread 2"]
        Thread3["Thread 3"]
        ResourceWM["resources.workingMemory<br/>{firstName, lastName, preferences}"]

        Resource --> Thread1
        Resource --> Thread2
        Resource --> Thread3
        Thread1 -.reads/writes.-> ResourceWM
        Thread2 -.reads/writes.-> ResourceWM
        Thread3 -.reads/writes.-> ResourceWM
    end

    subgraph "Thread-Scoped Working Memory"
        ThreadA["Thread A"]
        ThreadB["Thread B"]
        ThreadAWM["threads[A].metadata.workingMemory<br/>{currentTopic, conversationState}"]
        ThreadBWM["threads[B].metadata.workingMemory<br/>{currentTopic, conversationState}"]

        ThreadA --> ThreadAWM
        ThreadB --> ThreadBWM
    end
```

**Sources**: [packages/memory/src/index.ts:449-511](), [packages/core/src/memory/types.ts:173-184]()

---

## Working Memory Tool Integration

Working memory is updated via the `updateWorkingMemory` tool, which supports both template-based (Markdown) and schema-based (JSON) modes.

### Schema-Based Working Memory (Merge Semantics)

```mermaid
graph TB
    subgraph "Agent Execution"
        LLM["LLM generates tool call"]
        updateWorkingMemoryTool["updateWorkingMemory tool"]
    end

    subgraph "Tool Execution"
        getWorkingMemory["memory.getWorkingMemory()"]
        parseExisting["JSON.parse(existing)"]
        deepMergeWorkingMemory["deepMergeWorkingMemory()"]
        updateWorkingMemory["memory.updateWorkingMemory()"]
    end

    subgraph "Merge Logic"
        nullDelete["null → delete property"]
        arrayReplace["array → replace entirely"]
        objectRecurse["object → recursive merge"]
        primitiveOverwrite["primitive → overwrite"]
    end

    LLM --> updateWorkingMemoryTool
    updateWorkingMemoryTool --> getWorkingMemory
    getWorkingMemory --> parseExisting
    parseExisting --> deepMergeWorkingMemory

    deepMergeWorkingMemory --> nullDelete
    deepMergeWorkingMemory --> arrayReplace
    deepMergeWorkingMemory --> objectRecurse
    deepMergeWorkingMemory --> primitiveOverwrite

    deepMergeWorkingMemory --> updateWorkingMemory
```

**Sources**: [packages/memory/src/tools/working-memory.ts:64-230](), [packages/memory/src/tools/working-memory.ts:8-62]()

---

## Message Storage and Recall Flow

The `recall()` method retrieves messages from storage with optional semantic recall and applies pagination/ordering logic.

```mermaid
graph TB
    subgraph "Recall Parameters"
        threadId["threadId (required)"]
        resourceId["resourceId (optional)"]
        perPage["perPage (from config or arg)"]
        vectorSearchString["vectorSearchString (optional)"]
        threadConfig["threadConfig (optional)"]
    end

    subgraph "Configuration Merging"
        getMergedThreadConfig["getMergedThreadConfig()"]
        effectivePerPage["Effective perPage<br/>(arg || config.lastMessages)"]
        historyDisabled["historyDisabledByConfig<br/>(lastMessages: false)"]
    end

    subgraph "Vector Search (if enabled)"
        embedMessageContent_recall["embedMessageContent()"]
        vectorQuery_recall["vector.query()"]
        vectorResults["Vector results<br/>(ids, scores, metadata)"]
    end

    subgraph "Storage Query"
        listMessages["memoryStore.listMessages()"]
        orderByDESC["orderBy: DESC<br/>(get newest)"]
        includeVectorResults["include: vector IDs<br/>+ messageRange"]
        reverseResults["Reverse to chronological"]
    end

    subgraph "Message Processing"
        MessageList_construct["new MessageList()"]
        getAll["list.get.all.db()"]
    end

    threadId --> getMergedThreadConfig
    threadConfig --> getMergedThreadConfig
    getMergedThreadConfig --> effectivePerPage
    getMergedThreadConfig --> historyDisabled

    vectorSearchString --> embedMessageContent_recall
    embedMessageContent_recall --> vectorQuery_recall
    vectorQuery_recall --> vectorResults

    effectivePerPage --> listMessages
    vectorResults --> includeVectorResults
    includeVectorResults --> listMessages
    orderByDESC --> listMessages

    listMessages --> reverseResults
    reverseResults --> MessageList_construct
    MessageList_construct --> getAll
```

**Sources**: [packages/memory/src/index.ts:151-312](), [packages/memory/src/index.ts:176-186]()

---

## Storage Adapter Pattern

All storage adapters implement the `MemoryStorage` interface, allowing different backends to be used interchangeably.

### Adapter Implementations

| Adapter         | Package           | Database              | Vector Support            | Use Case                    |
| --------------- | ----------------- | --------------------- | ------------------------- | --------------------------- |
| `PostgresStore` | `@mastra/pg`      | PostgreSQL + pgvector | Yes (via `PgVector`)      | Production, complex queries |
| `LibSQLStore`   | `@mastra/libsql`  | LibSQL (SQLite fork)  | Yes (via `LibSQLVector`)  | Edge, serverless            |
| `UpstashStore`  | `@mastra/upstash` | Upstash Redis         | Yes (via `UpstashVector`) | Serverless, low-latency     |
| `InMemoryStore` | `@mastra/core`    | In-memory             | No                        | Testing, development        |

```mermaid
graph TB
    subgraph "Storage Adapter Interface"
        MemoryStorage_Interface["MemoryStorage interface"]
        saveMessages_sig["saveMessages(messages)"]
        listMessages_sig["listMessages(args)"]
        getThreadById_sig["getThreadById(threadId)"]
        listThreads_sig["listThreads(args)"]
        updateResource_sig["updateResource(args)"]
        getResourceById_sig["getResourceById(resourceId)"]
    end

    subgraph "PostgreSQL Adapter"
        PostgresStore_impl["PostgresStore"]
        pgPool["pg.Pool"]
        pgVector["pgvector extension"]
    end

    subgraph "LibSQL Adapter"
        LibSQLStore_impl["LibSQLStore"]
        libsqlClient["@libsql/client"]
    end

    subgraph "Upstash Adapter"
        UpstashStore_impl["UpstashStore"]
        upstashRedis["@upstash/redis"]
    end

    MemoryStorage_Interface --> saveMessages_sig
    MemoryStorage_Interface --> listMessages_sig
    MemoryStorage_Interface --> getThreadById_sig
    MemoryStorage_Interface --> listThreads_sig
    MemoryStorage_Interface --> updateResource_sig
    MemoryStorage_Interface --> getResourceById_sig

    PostgresStore_impl -.implements.-> MemoryStorage_Interface
    LibSQLStore_impl -.implements.-> MemoryStorage_Interface
    UpstashStore_impl -.implements.-> MemoryStorage_Interface

    PostgresStore_impl --> pgPool
    PostgresStore_impl --> pgVector
    LibSQLStore_impl --> libsqlClient
    UpstashStore_impl --> upstashRedis
```

**Sources**: [packages/core/src/storage/storage.ts](), [stores/pg/package.json:1-75](), [packages/memory/integration-tests/src/with-pg-storage.test.ts]()

---

## Thread and Resource Model

The storage model separates threads (conversations) from resources (users/entities) to enable multi-tenancy and resource-scoped data.

```mermaid
erDiagram
    resources ||--o{ threads : "owns"
    threads ||--o{ messages : "contains"
    resources ||--o{ messages : "created by"

    resources {
        string id PK
        string workingMemory "Resource-scoped working memory"
        timestamp createdAt
        timestamp updatedAt
    }

    threads {
        string id PK
        string resourceId FK
        string title
        jsonb metadata "Contains thread.metadata.workingMemory for thread-scoped WM"
        timestamp createdAt
        timestamp updatedAt
    }

    messages {
        string id PK
        string threadId FK
        string resourceId FK
        string role "user|assistant|system|tool"
        jsonb content "V2 format with parts array"
        timestamp createdAt
    }
```

**Sources**: [packages/core/src/memory/types.ts:38-113](), [packages/memory/src/index.ts:314-400]()

---

## Observational Memory Records

Observational Memory (OM) stores observations and reflections in a separate table with thread-level metadata for tracking state.

```mermaid
graph TB
    subgraph "Thread Metadata"
        threadMetadata["thread.metadata.mastra.om"]
        currentTask["currentTask"]
        suggestedResponse["suggestedResponse"]
        lastObservedAt["lastObservedAt"]
        lastObservedMessageCursor["lastObservedMessageCursor"]
    end

    subgraph "Resource-Level OM Record"
        omRecords["om_records table"]
        recordId["id (resourceId)"]
        activeObservations["activeObservations"]
        bufferedObservations["bufferedObservations"]
        patterns["patterns"]
        reflections["reflections"]
    end

    subgraph "Helper Functions"
        getThreadOMMetadata["getThreadOMMetadata()"]
        setThreadOMMetadata["setThreadOMMetadata()"]
    end

    threadMetadata --> currentTask
    threadMetadata --> suggestedResponse
    threadMetadata --> lastObservedAt
    threadMetadata --> lastObservedMessageCursor

    omRecords --> recordId
    omRecords --> activeObservations
    omRecords --> bufferedObservations
    omRecords --> patterns
    omRecords --> reflections

    getThreadOMMetadata --> threadMetadata
    setThreadOMMetadata --> threadMetadata
```

**Sources**: [packages/core/src/memory/types.ts:48-113]()

---

## Configuration and Options

Memory behavior is controlled through `MemoryConfig` which supports various options for different memory types.

### Configuration Structure

```typescript
// From packages/core/src/memory/types.ts
type MemoryConfig = {
  lastMessages?: number | false // Message history limit
  semanticRecall?: boolean | SemanticRecall // Vector retrieval
  generateTitle?: boolean // Auto-generate thread titles
  workingMemory?: WorkingMemory // Structured state
  observationalMemory?: boolean | ObservationalMemoryOptions // Long-term context
  readOnly?: boolean // Disable writes (for shared contexts)
}
```

### Default Configuration

| Option                  | Default Value | Description                          |
| ----------------------- | ------------- | ------------------------------------ |
| `lastMessages`          | `10`          | Number of recent messages to include |
| `semanticRecall`        | `false`       | Disabled by default                  |
| `generateTitle`         | `false`       | No auto-title generation             |
| `workingMemory.enabled` | `false`       | Working memory disabled              |
| `workingMemory.scope`   | `'resource'`  | Resource-scoped when enabled         |
| `observationalMemory`   | `undefined`   | Disabled by default                  |

**Sources**: [packages/core/src/memory/memory.ts:79-98](), [packages/memory/src/index.ts:79-93]()

---

## Processor Integration

Memory integrates with the agent system via input and output processors, which are automatically registered based on configuration.

```mermaid
graph LR
    subgraph "Agent Processor Pipeline"
        InputProcessors["Input Processors"]
        LLM["LLM Execution"]
        OutputProcessors["Output Processors"]
    end

    subgraph "Memory as ProcessorProvider"
        getInputProcessors["memory.getInputProcessors()"]
        getOutputProcessors["memory.getOutputProcessors()"]
    end

    subgraph "Auto-Registered Processors"
        MessageHistory_Input["MessageHistory<br/>(input)"]
        WorkingMemory_Input["WorkingMemory<br/>(input)"]
        SemanticRecall_Input["SemanticRecall<br/>(input)"]

        MessageHistory_Output["MessageHistory<br/>(output)"]
        SemanticRecall_Output["SemanticRecall<br/>(output)"]
    end

    getInputProcessors --> MessageHistory_Input
    getInputProcessors --> WorkingMemory_Input
    getInputProcessors --> SemanticRecall_Input

    getOutputProcessors --> MessageHistory_Output
    getOutputProcessors --> SemanticRecall_Output

    InputProcessors --> MessageHistory_Input
    InputProcessors --> WorkingMemory_Input
    InputProcessors --> SemanticRecall_Input

    MessageHistory_Input --> LLM
    WorkingMemory_Input --> LLM
    SemanticRecall_Input --> LLM

    LLM --> OutputProcessors

    OutputProcessors --> MessageHistory_Output
    OutputProcessors --> SemanticRecall_Output
```

**Sources**: [packages/core/src/memory/memory.ts:608-852]()

---

## Mutex Protection for Working Memory

To prevent race conditions when multiple concurrent agent calls update working memory, the Memory class uses in-memory mutexes.

```mermaid
graph TB
    subgraph "Concurrent Updates"
        Call1["Agent Call 1<br/>updateWorkingMemory"]
        Call2["Agent Call 2<br/>updateWorkingMemory"]
        Call3["Agent Call 3<br/>updateWorkingMemory"]
    end

    subgraph "Mutex Management"
        getMutex["Get/Create Mutex<br/>(by scope key)"]
        mutexKey["Mutex Key<br/>resource-{id} or thread-{id}"]
        updateWorkingMemoryMutexes["Map<string, Mutex>"]
    end

    subgraph "Protected Update"
        acquireLock["mutex.acquire()"]
        getExisting["getWorkingMemory()"]
        mergeOrReplace["Merge or Replace"]
        saveToStorage["updateWorkingMemory()"]
        releaseLock["release()"]
    end

    Call1 --> getMutex
    Call2 --> getMutex
    Call3 --> getMutex

    getMutex --> mutexKey
    mutexKey --> updateWorkingMemoryMutexes
    updateWorkingMemoryMutexes --> acquireLock

    acquireLock --> getExisting
    getExisting --> mergeOrReplace
    mergeOrReplace --> saveToStorage
    saveToStorage --> releaseLock
```

**Sources**: [packages/memory/src/index.ts:476-511](), [packages/memory/src/index.ts:513]()

---

## Message Format (V2)

Messages are stored in a V2 format with a `parts` array for structured content representation.

```typescript
// From packages/core/src/agent/message-list.ts
type MastraDBMessage = {
  id: string
  threadId?: string
  resourceId?: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: {
    format: 2
    content?: string // Plain text representation
    parts: Array<
      | { type: 'text'; text: string }
      | { type: 'image'; image: string | Uint8Array }
      | { type: 'tool-invocation'; toolInvocation: ToolInvocation }
      | { type: 'file'; data: string | Uint8Array; mimeType: string }
    >
    experimental_attachments?: Attachment[]
  }
  createdAt: Date
}
```

**Sources**: [packages/core/src/agent/message-list.ts](), [packages/memory/src/index.ts:869-912]()

---

## Summary

The memory and storage architecture provides:

1. **Flexible Storage**: Multiple adapter options (PostgreSQL, LibSQL, Upstash) via a unified interface
2. **Multi-Tier Memory**: Working memory, semantic recall, observational memory, and message history
3. **Thread/Resource Model**: Isolated threads with shared resource-level data
4. **Vector Integration**: Embedding generation and semantic search for RAG
5. **Processor Pattern**: Automatic integration with agent input/output pipelines
6. **Concurrency Safety**: Mutex-protected working memory updates

For implementation details on specific memory types and storage providers, see the subsections linked at the beginning of this document.
