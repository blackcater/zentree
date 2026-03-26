# API Key Rotation

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [src/agent/gemini/cli/atCommandProcessor.ts](src/agent/gemini/cli/atCommandProcessor.ts)
- [src/agent/gemini/cli/config.ts](src/agent/gemini/cli/config.ts)
- [src/agent/gemini/cli/errorParsing.ts](src/agent/gemini/cli/errorParsing.ts)
- [src/agent/gemini/cli/tools/web-fetch.ts](src/agent/gemini/cli/tools/web-fetch.ts)
- [src/agent/gemini/cli/tools/web-search.ts](src/agent/gemini/cli/tools/web-search.ts)
- [src/agent/gemini/cli/types.ts](src/agent/gemini/cli/types.ts)
- [src/agent/gemini/cli/useReactToolScheduler.ts](src/agent/gemini/cli/useReactToolScheduler.ts)
- [src/agent/gemini/index.ts](src/agent/gemini/index.ts)
- [src/agent/gemini/utils.ts](src/agent/gemini/utils.ts)
- [src/process/services/mcpServices/McpOAuthService.ts](src/process/services/mcpServices/McpOAuthService.ts)

</details>

## Purpose and Scope

This document describes the API Key Rotation system in AionUi, which provides automatic failover across multiple API keys when quota errors or rate limits are encountered. The system detects quota exhaustion, rotates to an alternative API key, and retries the request automatically to maintain uninterrupted service.

The rotation mechanism is tightly integrated with `aioncli-core`'s `FallbackModelHandler` interface, which orchestrates the retry flow. This system only applies to API-key based authentication methods (`USE_GEMINI`, `USE_OPENAI`, `USE_ANTHROPIC`) and does not support OAuth or credential-based auth types.

For model configuration and provider setup, see page 4.7. For stream error handling, see page 12.3.

---

## System Overview

The API Key Rotation system consists of three core components working together:

| Component                                 | Responsibility                                    | Location                                   |
| ----------------------------------------- | ------------------------------------------------- | ------------------------------------------ |
| `ApiKeyManager`                           | Key pool management, rotation logic, blacklisting | `src/common/ApiKeyManager.ts`              |
| `GeminiAgent.initializeMultiKeySupport()` | Multi-key detection and initialization            | [src/agent/gemini/index.ts:257-267]()      |
| `fallbackModelHandler`                    | Integration with aioncli-core retry system        | [src/agent/gemini/cli/config.ts:295-332]() |

The system integrates with `aioncli-core`'s `FallbackModelHandler` mechanism, which is invoked when API calls fail. The handler rotates the API key by updating `process.env`, then signals `aioncli-core` to retry with the new credentials.

**Sources:** [src/agent/gemini/index.ts:257-267](), [src/agent/gemini/cli/config.ts:295-332]()

---

## Architecture

### Component Interaction Flow

```mermaid
graph TB
    subgraph "Agent Initialization"
        GeminiAgent["GeminiAgent"]
        initClientEnv["initClientEnv()"]
        initMultiKey["initializeMultiKeySupport()"]
    end

    subgraph "Key Management"
        ApiKeyManager["ApiKeyManager"]
        KeyPool["Key Pool Array<br/>(parsed from apiKey)"]
        Blacklist["Blacklist Set<br/>(failed keys)"]
        currentIndex["currentIndex: number"]
    end

    subgraph "Configuration Layer"
        Config["Config (aioncli-core)"]
        fallbackHandler["fallbackModelHandler"]
        refreshAuth["refreshAuth()"]
    end

    subgraph "Environment"
        ProcessEnv["process.env"]
        GEMINI_KEY["GEMINI_API_KEY"]
        OPENAI_KEY["OPENAI_API_KEY"]
        ANTHROPIC_KEY["ANTHROPIC_API_KEY"]
    end

    subgraph "aioncli-core Runtime"
        APICall["API Call (via GeminiClient)"]
        ErrorDetection["Error Detection<br/>(quota/rate limit)"]
        TryRotate["tryRotateApiKey()"]
        Retry["Retry Request"]
    end

    GeminiAgent -->|"calls"| initClientEnv
    initClientEnv -->|"calls"| initMultiKey
    initMultiKey -->|"creates if multi-key"| ApiKeyManager
    ApiKeyManager -->|"manages"| KeyPool
    ApiKeyManager -->|"tracks"| Blacklist
    ApiKeyManager -->|"uses"| currentIndex

    initMultiKey -->|"updates"| ProcessEnv
    ProcessEnv --> GEMINI_KEY
    ProcessEnv --> OPENAI_KEY
    ProcessEnv --> ANTHROPIC_KEY

    GeminiAgent -->|"initializes"| Config
    Config -->|"registers"| fallbackHandler

    APICall -->|"on failure"| ErrorDetection
    ErrorDetection -->|"invokes"| fallbackHandler
    fallbackHandler -->|"getCurrentGeminiAgent()"| GeminiAgent
    GeminiAgent -->|"returns"| ApiKeyManager
    fallbackHandler -->|"apiKeyManager.rotateKey()"| ApiKeyManager
    ApiKeyManager -->|"updates"| ProcessEnv
    fallbackHandler -->|"returns 'retry_once'"| TryRotate
    TryRotate -->|"calls"| refreshAuth
    refreshAuth -->|"reads new key from"| ProcessEnv
    TryRotate -->|"retries with new key"| Retry
```

**Sources:** [src/agent/gemini/index.ts:118-267](), [src/agent/gemini/cli/config.ts:295-335]()

---

## Key Management Flow

### Initialization and Multi-Key Detection

During `GeminiAgent` initialization, the system examines the `apiKey` field from `TProviderWithModel` to detect multiple keys:

```mermaid
flowchart TD
    Start["new GeminiAgent(options)"] --> Constructor["Constructor assigns<br/>this.model = options.model"]
    Constructor --> InitEnv["initClientEnv()"]
    InitEnv --> InitMulti["initializeMultiKeySupport()"]

    InitMulti --> GetKey["apiKey = this.model?.apiKey"]
    GetKey --> CheckEmpty{"apiKey exists?"}
    CheckEmpty -->|No| Return["return (no multi-key)"]

    CheckEmpty -->|Yes| CheckDelimiters{"apiKey.includes(',') ||<br/>apiKey.includes('\\
')?"}

    CheckDelimiters -->|No| Return
    CheckDelimiters -->|Yes| CheckAuthType{"authType in<br/>[USE_OPENAI, USE_GEMINI,<br/>USE_ANTHROPIC]?"}

    CheckAuthType -->|No| Return
    CheckAuthType -->|Yes| CreateManager["this.apiKeyManager =<br/>new ApiKeyManager(apiKey, authType)"]

    CreateManager --> ManagerParse["ApiKeyManager constructor:<br/>- split by comma/newline<br/>- trim whitespace<br/>- filter empty strings"]
    ManagerParse --> SetIndex["Set currentIndex = 0"]
    SetIndex --> UpdateEnv["Update process.env with first key"]
    UpdateEnv --> Ready["Multi-key mode active"]
```

**Key Detection Logic:**

The `initializeMultiKeySupport()` method at [src/agent/gemini/index.ts:257-267]() performs the following checks:

1. Extract `apiKey` from `this.model?.apiKey`
2. Return early if key is missing or doesn't contain comma/newline
3. Only create `ApiKeyManager` for supported auth types
4. `ApiKeyManager` parses the key string and initializes the pool

**Sources:** [src/agent/gemini/index.ts:118-267]()

---

### Environment Variable Setup

After detecting multiple keys, `initClientEnv()` sets up environment variables for the current auth type:

```mermaid
flowchart TD
    Start["initClientEnv()"] --> ClearEnv["clearAllAuthEnvVars():<br/>Delete all auth-related env vars"]
    ClearEnv --> CheckAuth{"this.authType?"}

    CheckAuth -->|USE_GEMINI| SetGemini["process.env.GEMINI_API_KEY = getCurrentApiKey()<br/>process.env.GOOGLE_GEMINI_BASE_URL = baseUrl"]
    CheckAuth -->|USE_VERTEX_AI| SetVertex["process.env.GOOGLE_API_KEY = getCurrentApiKey()<br/>process.env.GOOGLE_GENAI_USE_VERTEXAI = 'true'"]
    CheckAuth -->|LOGIN_WITH_GOOGLE| SetOAuth["Optional: process.env.GOOGLE_CLOUD_PROJECT<br/>(only if configured)"]
    CheckAuth -->|USE_OPENAI| SetOpenAI["process.env.OPENAI_BASE_URL = baseUrl<br/>process.env.OPENAI_API_KEY = getCurrentApiKey()"]
    CheckAuth -->|USE_ANTHROPIC| SetAnthropic["process.env.ANTHROPIC_BASE_URL = baseUrl<br/>process.env.ANTHROPIC_API_KEY = getCurrentApiKey()"]
    CheckAuth -->|USE_BEDROCK| SetBedrock["process.env.AWS_REGION<br/>+ accessKey or profile"]

    SetGemini --> Done["Environment ready"]
    SetVertex --> Done
    SetOAuth --> Done
    SetOpenAI --> Done
    SetAnthropic --> Done
    SetBedrock --> Done
```

**getCurrentApiKey() Logic:**

The method at [src/agent/gemini/index.ts:164-169]() checks if multi-key mode is active:

```typescript
const getCurrentApiKey = () => {
  if (this.apiKeyManager && this.apiKeyManager.hasMultipleKeys()) {
    return (
      process.env[this.apiKeyManager.getStatus().envKey] || this.model.apiKey
    )
  }
  return this.model.apiKey
}
```

This ensures the current rotated key from `process.env` is used, with fallback to the original key.

**Sources:** [src/agent/gemini/index.ts:150-255]()

---

### Key Rotation Algorithm

When `apiKeyManager.rotateKey()` is called, it implements the following algorithm:

```mermaid
flowchart TD
    Start["rotateKey()"] --> GetCurrent["currentKey = keys[currentIndex]"]
    GetCurrent --> Blacklist["blacklist.add(currentKey)"]
    Blacklist --> StartLoop["Loop from currentIndex + 1"]

    StartLoop --> LoopKeys["For each key in keys array"]
    LoopKeys --> CheckBlacklist{"Key in blacklist?"}

    CheckBlacklist -->|Yes| NextKey["Continue to next key"]
    CheckBlacklist -->|No| FoundKey["Set currentIndex = keyIndex"]

    NextKey --> MoreKeys{"More keys<br/>in array?"}
    MoreKeys -->|Yes| LoopKeys
    MoreKeys -->|No| AllExhausted["All keys exhausted or blacklisted"]

    FoundKey --> UpdateEnv["Update process.env[envKey]<br/>with new key"]
    UpdateEnv --> ReturnTrue["return true"]

    AllExhausted --> ReturnFalse["return false"]
```

**Environment Variable Mapping:**

| Auth Type                | Environment Variable | Used By                          |
| ------------------------ | -------------------- | -------------------------------- |
| `AuthType.USE_GEMINI`    | `GEMINI_API_KEY`     | `GeminiClient` from aioncli-core |
| `AuthType.USE_OPENAI`    | `OPENAI_API_KEY`     | OpenAI-compatible clients        |
| `AuthType.USE_ANTHROPIC` | `ANTHROPIC_API_KEY`  | Anthropic clients                |

The `envKey` is determined by the `authType` passed to `ApiKeyManager` during construction.

**Sources:** [src/agent/gemini/index.ts:257-267]() (references `ApiKeyManager.rotateKey()`)

---

## Integration with aioncli-core

### Fallback Model Handler

The `fallbackModelHandler` at [src/agent/gemini/cli/config.ts:295-332]() bridges the API key rotation system with aioncli-core's error recovery mechanism:

```mermaid
sequenceDiagram
    participant Core as "aioncli-core<br/>(GeminiClient)"
    participant Handler as "fallbackModelHandler"
    participant GetAgent as "getCurrentGeminiAgent()"
    participant Agent as "GeminiAgent"
    participant Manager as "ApiKeyManager"
    participant Env as "process.env"

    Core->>Core: "API call fails with error<br/>(quota/rate limit)"
    Core->>Handler: "fallbackModelHandler(currentModel, fallbackModel, error)"

    Handler->>GetAgent: "getCurrentGeminiAgent()"
    Note over GetAgent: "Global registry pattern:<br/>currentGeminiAgent variable"
    GetAgent-->>Handler: "agent instance or null"

    Handler->>Agent: "getApiKeyManager()"
    Agent-->>Handler: "apiKeyManager or null"

    alt "apiKeyManager is null"
        Handler->>Handler: "Single key mode"
        Handler-->>Core: "return 'stop'"
        Note over Core: "Stop retrying - no more keys"
    else "apiKeyManager exists"
        Handler->>Manager: "hasMultipleKeys()"
        Manager-->>Handler: "true"

        Handler->>Manager: "rotateKey()"
        Manager->>Manager: "Blacklist current key"
        Manager->>Manager: "Find next available key"

        alt "Next key found"
            Manager->>Env: "Update GEMINI_API_KEY/<br/>OPENAI_API_KEY/<br/>ANTHROPIC_API_KEY"
            Manager-->>Handler: "return true"
            Handler-->>Core: "return 'retry_once'"

            Note over Core: "aioncli-core detects env change"
            Core->>Core: "tryRotateApiKey() detects change"
            Core->>Core: "config.refreshAuth()"
            Note over Core: "GeminiClient recreated with new key"
            Core->>Core: "Reset retry counter"
            Core->>Core: "Retry API call with new key"
        else "All keys exhausted"
            Manager-->>Handler: "return false"
            Handler-->>Core: "return 'stop'"
            Note over Core: "Stop retrying - all keys failed"
        end
    end
```

**FallbackIntent Return Values:**

| Return Value     | Condition                                            | Effect on aioncli-core                                   |
| ---------------- | ---------------------------------------------------- | -------------------------------------------------------- |
| `'retry_once'`   | `rotateKey()` returned `true`                        | Reset retry counter, call `refreshAuth()`, retry request |
| `'stop'`         | No `apiKeyManager` or `rotateKey()` returned `false` | Stop retry attempts, propagate error                     |
| `'retry_always'` | (Not used)                                           | Infinite retry loop                                      |
| `'retry_later'`  | (Not used)                                           | Defer retry                                              |
| `null`           | (Not used)                                           | Let aioncli-core use default logic                       |

**Global Registry Pattern:**

The handler uses `getCurrentGeminiAgent()` at [src/agent/gemini/index.ts:872-874]() to access the current agent instance:

```typescript
let currentGeminiAgent: GeminiAgent | null = null

export function getCurrentGeminiAgent(): GeminiAgent | null {
  return currentGeminiAgent
}
```

This global variable is set in the `GeminiAgent` constructor at [src/agent/gemini/index.ts:144-145]().

**Sources:** [src/agent/gemini/cli/config.ts:295-335](), [src/agent/gemini/index.ts:36-36](), [src/agent/gemini/index.ts:144-145](), [src/agent/gemini/index.ts:872-874]()

---

## Supported Authentication Types

The multi-key rotation system is only activated for API-key based authentication methods:

| Auth Type                    | Multi-Key Support | Environment Variable          | Detection Logic                       |
| ---------------------------- | ----------------- | ----------------------------- | ------------------------------------- |
| `AuthType.USE_GEMINI`        | ✓                 | `GEMINI_API_KEY`              | [src/agent/gemini/index.ts:194-197]() |
| `AuthType.USE_OPENAI`        | ✓                 | `OPENAI_API_KEY`              | [src/agent/gemini/index.ts:218-221]() |
| `AuthType.USE_ANTHROPIC`     | ✓                 | `ANTHROPIC_API_KEY`           | [src/agent/gemini/index.ts:223-226]() |
| `AuthType.USE_VERTEX_AI`     | ✗                 | (service account credentials) | [src/agent/gemini/index.ts:199-202]() |
| `AuthType.LOGIN_WITH_GOOGLE` | ✗                 | (OAuth token)                 | [src/agent/gemini/index.ts:204-216]() |
| `AuthType.USE_BEDROCK`       | ✗                 | (AWS IAM)                     | [src/agent/gemini/index.ts:228-254]() |

**Initialization Check:**

The `initializeMultiKeySupport()` method at [src/agent/gemini/index.ts:257-267]() only creates an `ApiKeyManager` when:

```typescript
if (
  this.authType === AuthType.USE_OPENAI ||
  this.authType === AuthType.USE_GEMINI ||
  this.authType === AuthType.USE_ANTHROPIC
) {
  this.apiKeyManager = new ApiKeyManager(apiKey, this.authType)
}
```

Other auth types like OAuth and IAM-based authentication bypass multi-key initialization.

**Sources:** [src/agent/gemini/index.ts:150-267]()

---

## Error Detection and Blacklisting

### Quota Error Detection

The system detects quota-related errors through the `enrichErrorMessage()` method at [src/agent/gemini/index.ts:281-298]():

```mermaid
flowchart TD
    Start["enrichErrorMessage(errorMessage)"] --> CheckKeywords{"errorMessage.toLowerCase()<br/>contains quota keywords?"}

    CheckKeywords -->|"model_capacity_exhausted"| AddSuffix["Append: 'Quota exhausted on this model.'"]
    CheckKeywords -->|"no capacity available"| AddSuffix
    CheckKeywords -->|"resource_exhausted"| AddSuffix
    CheckKeywords -->|"ratelimitexceeded"| AddSuffix

    CheckKeywords -->|No match| CheckReport{"Error contains<br/>report file path?"}

    CheckReport -->|Yes| ReadReport["Read JSON report file"]
    CheckReport -->|No| ReturnOriginal["Return original message"]

    ReadReport --> CheckReportQuota{"Report contains<br/>'quota'/'exhausted'?"}
    CheckReportQuota -->|Yes| AddSuffix
    CheckReportQuota -->|No| ReturnOriginal

    AddSuffix --> ReturnEnriched["Return enriched message"]
```

**Detected Error Patterns:**

| Pattern                    | Source            | Meaning                |
| -------------------------- | ----------------- | ---------------------- |
| `model_capacity_exhausted` | API response      | Model quota exceeded   |
| `no capacity available`    | API response      | No available capacity  |
| `resource_exhausted`       | API response      | Resource limit reached |
| `ratelimitexceeded`        | API response      | Rate limit hit         |
| `quota` in report file     | Error report JSON | Quota issue logged     |

When these patterns are detected, the error is enriched with a user-friendly message indicating quota exhaustion.

**Sources:** [src/agent/gemini/index.ts:281-298]()

---

### Blacklisting Mechanism

When `rotateKey()` is called, it blacklists the current failing key before searching for a replacement:

```mermaid
stateDiagram-v2
    [*] --> Available: "Key added to pool<br/>(ApiKeyManager construction)"
    Available --> Active: "rotateKey() selects key<br/>(updates currentIndex)"
    Active --> Blacklisted: "API fails with quota error<br/>(added to blacklist Set)"
    Active --> Available: "API call succeeds<br/>(key remains active)"
    Blacklisted --> [*]: "Session ends<br/>(agent destroyed)"

    note right of Blacklisted
        Blacklisted keys are skipped
        in all subsequent rotateKey() calls.
        No automatic recovery.
    end note

    note left of Available
        Pool size decreases as keys fail.
        When all keys blacklisted,
        rotateKey() returns false.
    end note
```

**Blacklist Lifecycle:**

1. **Initialization**: Empty blacklist Set created in `ApiKeyManager` constructor
2. **On Error**: `rotateKey()` adds `keys[currentIndex]` to blacklist
3. **Search**: Loop skips any key found in blacklist Set
4. **Exhaustion**: If all keys are blacklisted, return `false`
5. **Session Scope**: Blacklist destroyed when agent/manager is garbage collected

**Sources:** Referenced behavior from [src/agent/gemini/index.ts:257-267]() (calls `ApiKeyManager.rotateKey()`)

---

## Configuration

### API Key Format

The `ApiKeyManager` accepts multiple API keys in two formats:

**Comma-separated:**

```
sk-proj-xxxxxxxxxxxxx,sk-proj-yyyyyyyyyyyyy,sk-proj-zzzzzzzzzzzzz
```

**Newline-separated:**

```
sk-proj-xxxxxxxxxxxxx
sk-proj-yyyyyyyyyyyyy
sk-proj-zzzzzzzzzzzzz
```

**Mixed format with whitespace (automatically cleaned):**

```
sk-proj-xxxxxxxxxxxxx  ,
  sk-proj-yyyyyyyyyyyyy,

sk-proj-zzzzzzzzzzzzz
```

The `ApiKeyManager` constructor splits by both comma and newline, trims whitespace, and filters empty strings.

**Sources:** Referenced from [src/agent/gemini/index.ts:257-267]()

---

### Configuration in UI

Users configure multiple keys through the settings interface:

**Model Configuration (ModeSettings):**

1. Navigate to Settings → Models
2. Select or add a platform (e.g., OpenAI, Gemini)
3. In the "API Key" field, enter keys separated by commas or newlines
4. Save configuration

**Detection:**

The system automatically detects multiple keys when creating a conversation:

```mermaid
flowchart LR
    UI["Settings UI"] --> Save["Save TProviderWithModel<br/>(apiKey field)"]
    Save --> Storage["ConfigStorage"]
    Storage --> Create["Create Conversation"]
    Create --> Agent["new GeminiAgent(options)"]
    Agent --> Detect["initializeMultiKeySupport()"]
    Detect --> Check{"apiKey.includes(',') ||<br/>apiKey.includes('\\
')?"}
    Check -->|Yes| MultiKey["Enable multi-key rotation"]
    Check -->|No| SingleKey["Use single key"]
```

**Sources:** Related to provider configuration in page 4.7

---

## Limitations and Trade-offs

### Current Limitations

| Limitation                | Impact                        | Workaround                 |
| ------------------------- | ----------------------------- | -------------------------- |
| No automatic key recovery | Blacklisted keys stay blocked | Restart conversation/agent |
| Session-scoped blacklist  | Good keys may be exhausted    | Use more keys or restart   |
| No key health monitoring  | Can't predict failures        | Monitor usage externally   |
| Synchronous rotation      | Brief latency on rotation     | Minimal impact (< 100ms)   |

### Trade-offs

**Performance vs Reliability:**

- Extra retry attempts increase latency
- But prevent request failures from temporary issues

**Memory vs Functionality:**

- Each rotating client maintains key pool and blacklist
- But shared `ApiKeyManager` reduces overhead

**Simplicity vs Features:**

- No automatic key recovery or health checks
- But simpler implementation and fewer edge cases

**Sources:** [src/common/RotatingApiClient.ts:128-160]()

---

## Related Systems

For related functionality, see:

- [Model Configuration & API Management](#4.6) - Platform and model configuration
- [Stream Resilience](#10.3) - Connection monitoring and invalid stream recovery
- [Build Retry Mechanism](#10.2) - Retry logic for build and deployment
- [Tool System Architecture](#4.4) - Image generation and web search tools
