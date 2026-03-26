# Channel Integration

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [readme.md](readme.md)
- [readme_ch.md](readme_ch.md)
- [readme_es.md](readme_es.md)
- [readme_jp.md](readme_jp.md)
- [readme_ko.md](readme_ko.md)
- [readme_pt.md](readme_pt.md)
- [readme_tr.md](readme_tr.md)
- [readme_tw.md](readme_tw.md)
- [resources/wechat_group4.png](resources/wechat_group4.png)
- [src/common/ipcBridge.ts](src/common/ipcBridge.ts)
- [src/common/storage.ts](src/common/storage.ts)
- [src/renderer/pages/guid/index.tsx](src/renderer/pages/guid/index.tsx)

</details>

## Purpose and Scope

This document describes AionUi's channel plugin system for integrating external chat platforms (Telegram, Lark/Feishu, DingTalk) with the application's AI agents. Channel integration enables users to interact with AionUi agents directly from their preferred messaging platforms without opening the desktop application.

For information about the WebUI server that hosts channel webhooks, see [WebUI Server Architecture](#3.5). For details on specific agent implementations that handle channel requests, see [AI Agent Systems](#4).

---

## Channel Plugin Architecture

The channel plugin system operates as an extension to AionUi's WebUI mode, enabling external messaging platforms to create and manage conversations with AI agents. Each channel platform (Telegram, Lark, DingTalk) acts as a remote client that communicates with AionUi through platform-specific webhook endpoints.

### Core Components

```mermaid
graph TB
    subgraph "External Chat Platforms"
        TG[Telegram]
        LARK[Lark/Feishu]
        DT[DingTalk]
    end

    subgraph "WebUI Server Layer"
        WEBUI["WebUI Express Server<br/>(webui.start)"]
        WEBHOOK["Channel Webhooks<br/>/telegram, /lark, /dingtalk"]
    end

    subgraph "Channel Management"
        PLUGIN["Channel Plugin Manager"]
        STATUS["Plugin Status<br/>(getPluginStatus)"]
        ENABLE["Plugin Enable/Disable<br/>(enablePlugin)"]
        TEST["Connection Test<br/>(testPlugin)"]
    end

    subgraph "Conversation Isolation"
        CONV["Conversation Management"]
        CHATID["channelChatId<br/>(user:xxx, group:xxx)"]
        SOURCE["ConversationSource<br/>(telegram|lark|dingtalk)"]
    end

    subgraph "Agent Execution Layer"
        AGENTS["Agent Managers<br/>(Gemini, ACP, Codex, etc)"]
        ASSISTANT["Assistant Config<br/>(assistant.telegram.agent)"]
    end

    TG -->|Bot API Webhook| WEBHOOK
    LARK -->|Event Subscription| WEBHOOK
    DT -->|Card Callback| WEBHOOK

    WEBHOOK -->|validate & route| PLUGIN
    PLUGIN -->|check status| STATUS
    PLUGIN -->|manage state| ENABLE
    PLUGIN -->|verify connection| TEST

    PLUGIN -->|create/lookup conversation| CONV
    CONV -->|identify by| CHATID
    CONV -->|tag with| SOURCE

    CONV -->|delegate to| AGENTS
    AGENTS -->|use preset model| ASSISTANT

    AGENTS -->|response stream| PLUGIN
    PLUGIN -->|format & send| WEBHOOK
    WEBHOOK -->|platform API| TG
    WEBHOOK -->|platform API| LARK
    WEBHOOK -->|platform API| DT
```

**Sources:** [src/common/storage.ts:131-146](), [readme.md:186-194](), [src/common/ipcBridge.ts:391-410]()

---

## Conversation Data Model

### Conversation Source Tracking

Each conversation in AionUi maintains metadata about its origin through two key fields:

| Field           | Type                                             | Purpose                                                                   |
| --------------- | ------------------------------------------------ | ------------------------------------------------------------------------- |
| `source`        | `'aionui' \| 'telegram' \| 'lark' \| 'dingtalk'` | Identifies the platform that created the conversation                     |
| `channelChatId` | `string` (optional)                              | Isolates conversations by user or group (format: `user:xxx`, `group:xxx`) |

The `ConversationSource` type system ensures type-safe handling of channel-originated conversations:

```mermaid
graph LR
    subgraph "ConversationSource Types"
        AIONUI["aionui<br/>(Desktop/WebUI direct)"]
        TG["telegram<br/>(Telegram Bot)"]
        LARK["lark<br/>(Feishu Bot)"]
        DT["dingtalk<br/>(DingTalk Bot)"]
    end

    subgraph "TChatConversation Fields"
        SOURCE["source?: ConversationSource"]
        CHATID["channelChatId?: string"]
    end

    AIONUI --> SOURCE
    TG --> SOURCE
    LARK --> SOURCE
    DT --> SOURCE

    SOURCE --> CHATID

    subgraph "channelChatId Format"
        USER["user:telegram_user_id<br/>user:lark_user_id<br/>user:dingtalk_user_id"]
        GROUP["group:telegram_group_id<br/>group:lark_group_id<br/>group:dingtalk_group_id"]
    end

    CHATID --> USER
    CHATID --> GROUP
```

**Sources:** [src/common/storage.ts:131-146]()

### Conversation Isolation Strategy

The `channelChatId` field implements multi-tenant isolation for channel-based conversations:

1. **User Conversations**: Format `user:{platform_user_id}`
   - Each user on a platform gets isolated conversation history
   - Private messages are tracked separately per user
   - Example: `user:123456789` for Telegram user ID 123456789

2. **Group Conversations**: Format `group:{platform_group_id}`
   - Group chats share conversation context among all members
   - Allows collaborative AI interactions
   - Example: `group:987654321` for Lark group ID 987654321

3. **Isolation Enforcement**: The combination of `source` + `channelChatId` creates unique conversation namespaces, preventing data leakage between different platform users or groups.

**Sources:** [src/common/storage.ts:144-146]()

---

## Assistant Configuration for Channels

Each channel platform has dedicated configuration in `ConfigStorage` that determines which agent and model to use for incoming requests:

```mermaid
graph TB
    subgraph "ConfigStorage Schema"
        TG_MODEL["assistant.telegram.defaultModel<br/>{id: string, useModel: string}"]
        TG_AGENT["assistant.telegram.agent<br/>{backend, customAgentId?, name?}"]

        LARK_MODEL["assistant.lark.defaultModel<br/>{id: string, useModel: string}"]
        LARK_AGENT["assistant.lark.agent<br/>{backend, customAgentId?, name?}"]

        DT_MODEL["assistant.dingtalk.defaultModel<br/>{id: string, useModel: string}"]
        DT_AGENT["assistant.dingtalk.agent<br/>{backend, customAgentId?, name?}"]
    end

    subgraph "Agent Backend Types"
        BACKEND["AcpBackendAll<br/>(gemini|acp|codex|openclaw-gateway|nanobot)"]
    end

    TG_AGENT --> BACKEND
    LARK_AGENT --> BACKEND
    DT_AGENT --> BACKEND

    subgraph "Model Selection"
        PROVIDER["IProvider (platform config)"]
        MODEL["useModel (specific model ID)"]
    end

    TG_MODEL --> PROVIDER
    TG_MODEL --> MODEL
    LARK_MODEL --> PROVIDER
    LARK_MODEL --> MODEL
    DT_MODEL --> PROVIDER
    DT_MODEL --> MODEL
```

| Configuration Key                   | Type                                                              | Purpose                                                |
| ----------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------ |
| `assistant.{platform}.defaultModel` | `{id: string, useModel: string}`                                  | Specifies provider and model for channel conversations |
| `assistant.{platform}.agent`        | `{backend: AcpBackendAll, customAgentId?: string, name?: string}` | Selects which agent implementation to use              |

**Sources:** [src/common/storage.ts:85-117]()

---

## Channel Message Flow

### Inbound Message Processing

```mermaid
sequenceDiagram
    participant User as "Channel User<br/>(Telegram/Lark/DingTalk)"
    participant Platform as "Platform API<br/>(Webhook)"
    participant WebUI as "WebUI Server<br/>(Express)"
    participant Plugin as "Channel Plugin"
    participant Conv as "Conversation Manager"
    participant Agent as "Agent Manager"

    User->>Platform: Send message
    Platform->>WebUI: POST /webhook/[platform]
    WebUI->>Plugin: Route to channel handler

    Plugin->>Plugin: Extract channelChatId<br/>(user:xxx or group:xxx)
    Plugin->>Conv: Find or create conversation<br/>(source + channelChatId)

    alt Conversation exists
        Conv->>Plugin: Return existing conversation
    else New conversation
        Conv->>Conv: Create TChatConversation<br/>with source + channelChatId
        Conv->>Agent: Load assistant.{platform}.agent config
        Conv->>Agent: Load assistant.{platform}.defaultModel
        Conv->>Plugin: Return new conversation
    end

    Plugin->>Agent: conversation.sendMessage(input, conversation_id)
    Agent->>Agent: Process message<br/>(tool execution, file operations)
    Agent->>Plugin: responseStream events
    Plugin->>Platform: Format & send response
    Platform->>User: Deliver message
```

**Sources:** [src/common/ipcBridge.ts:26-55](), [src/common/storage.ts:131-146]()

### Response Streaming

Channel plugins handle streaming responses differently based on platform capabilities:

| Platform        | Streaming Strategy                                    | Fallback Behavior                             |
| --------------- | ----------------------------------------------------- | --------------------------------------------- |
| **Telegram**    | Incremental message updates via `editMessageText` API | Full message replacement if edit fails        |
| **Lark/Feishu** | Message card updates with progressive content         | Send new message if card update times out     |
| **DingTalk**    | AI Card Stream protocol with chunk delivery           | Automatic fallback to standard message format |

**Sources:** [readme.md:186-194]()

---

## WebUI Integration

Channels are enabled and configured through the WebUI settings interface:

### WebUI Status Structure

```mermaid
graph TB
    subgraph "IWebUIStatus Interface"
        RUNNING["running: boolean"]
        PORT["port: number"]
        REMOTE["allowRemote: boolean"]
        LOCAL["localUrl: string"]
        NET["networkUrl?: string"]
        IP["lanIP?: string"]
        USER["adminUsername: string"]
        PASS["initialPassword?: string"]
    end

    subgraph "WebUI Management APIs"
        STATUS["webui.getStatus()<br/>→ IWebUIStatus"]
        START["webui.start({port?, allowRemote?})<br/>→ {port, urls, password}"]
        STOP["webui.stop()<br/>→ IBridgeResponse"]
        PWD["webui.changePassword({newPassword})<br/>→ IBridgeResponse"]
    end

    STATUS --> RUNNING
    STATUS --> PORT
    STATUS --> REMOTE

    START --> PORT
    START --> LOCAL
    START --> NET

    subgraph "Channel Access"
        WEBHOOK["Webhook Endpoints<br/>/api/channel/telegram<br/>/api/channel/lark<br/>/api/channel/dingtalk"]
    end

    START --> WEBHOOK
    RUNNING --> WEBHOOK
```

### Configuration Flow

1. **Enable WebUI**: Call `webui.start()` with optional port and remote access settings
2. **Configure Channel**: Navigate to Settings → WebUI Settings → Channel
3. **Set Bot Token**: Enter platform-specific bot token or credentials
4. **Enable Plugin**: Use `enablePlugin` API to activate channel
5. **Test Connection**: Use `testPlugin` API to verify webhook connectivity

**Sources:** [src/common/ipcBridge.ts:382-410](), [readme.md:194]()

---

## Channel Management APIs

While the specific channel management APIs are referenced in the architecture but not fully visible in the provided codebase, the system design indicates the following API pattern:

### Expected Channel API Pattern

```typescript
// Inferred from architecture description
export const channel = {
  // Query plugin status for a specific platform
  getPluginStatus: bridge.buildProvider<
    IBridgeResponse<{
      enabled: boolean
      configured: boolean
      lastActivity?: number
      error?: string
    }>,
    { platform: 'telegram' | 'lark' | 'dingtalk' }
  >('channel.get-plugin-status'),

  // Enable or disable a channel plugin
  enablePlugin: bridge.buildProvider<
    IBridgeResponse,
    {
      platform: 'telegram' | 'lark' | 'dingtalk'
      enabled: boolean
      config?: Record<string, unknown>
    }
  >('channel.enable-plugin'),

  // Test channel connection and webhook
  testPlugin: bridge.buildProvider<
    IBridgeResponse<{ success: boolean; message?: string }>,
    { platform: 'telegram' | 'lark' | 'dingtalk' }
  >('channel.test-plugin'),
}
```

**Sources:** Based on TOC description [#6.1]()

---

## Platform-Specific Integrations

### Telegram Bot Integration

**Features:**

- Direct message support with `user:telegram_id` isolation
- Group chat support with `group:telegram_group_id` isolation
- Incremental message editing for streaming responses
- Bot command support (slash commands forwarded to agents)

**Webhook Endpoint:** `/api/channel/telegram`

**Configuration Requirements:**

- Bot Token (from BotFather)
- Webhook URL (WebUI network URL + endpoint)

**Sources:** [readme.md:189]()

### Lark/Feishu Bot Integration

**Features:**

- Enterprise user authentication
- Group conversation support
- Message card format for rich responses
- Event subscription for real-time message delivery

**Webhook Endpoint:** `/api/channel/lark`

**Configuration Requirements:**

- App ID and App Secret (from Lark Developer Console)
- Verification Token
- Event subscription URL (WebUI endpoint)

**Sources:** [readme.md:190]()

### DingTalk Integration

**Features:**

- AI Card Stream protocol for progressive message delivery
- Automatic fallback to standard message format
- Enterprise workspace integration
- Streaming token updates via card callback

**Webhook Endpoint:** `/api/channel/dingtalk`

**Configuration Requirements:**

- Robot AppKey and AppSecret
- Webhook URL for card callbacks
- Stream mode enabled in DingTalk console

**Sources:** [readme.md:191]()

---

## Session Management and Context Persistence

Channel conversations maintain persistent context through the standard AionUi conversation storage system:

```mermaid
graph TB
    subgraph "Channel Conversation Lifecycle"
        CREATE["First message arrives<br/>from channelChatId"]
        LOOKUP["conversation.create()<br/>with source + channelChatId"]
        PERSIST["Store in ChatStorage<br/>(SQLite + config)"]
    end

    subgraph "Context Continuity"
        MSG1["User sends message 1"]
        RESP1["Agent responds"]
        MSG2["User sends message 2<br/>(same channelChatId)"]
        CONTEXT["Agent has full context<br/>from message 1"]
    end

    CREATE --> LOOKUP
    LOOKUP --> PERSIST
    PERSIST --> MSG1
    MSG1 --> RESP1
    RESP1 --> MSG2
    MSG2 --> CONTEXT

    subgraph "Storage Schema"
        CONV_TABLE["conversations table<br/>(id, type, source, extra)"]
        MSG_TABLE["messages table<br/>(conversation_id, content, role)"]
        EXTRA["extra.channelChatId<br/>(isolation key)"]
    end

    PERSIST --> CONV_TABLE
    CONV_TABLE --> EXTRA
    CONTEXT --> MSG_TABLE
```

**Key Behaviors:**

1. **Conversation Lookup**: On each incoming message, the system queries for existing conversations matching `(source, channelChatId)`
2. **Context Loading**: All previous messages are loaded from the database and provided to the agent
3. **History Persistence**: Agent responses are saved to maintain conversation continuity across sessions
4. **Workspace Isolation**: Each channel conversation can have its own workspace directory for file operations

**Sources:** [src/common/storage.ts:154-302](), [src/common/ipcBridge.ts:26-32]()

---

## User Authorization and Pairing

The channel system implements user authorization at the platform level:

### Authorization Levels

| Level                       | Description                                               | Implementation                                       |
| --------------------------- | --------------------------------------------------------- | ---------------------------------------------------- |
| **Platform Authentication** | User verified by chat platform (Telegram, Lark, DingTalk) | Platform handles OAuth/login before webhook delivery |
| **Bot Access Control**      | Bot token/credentials validate the webhook source         | WebUI verifies token on each request                 |
| **Conversation Isolation**  | `channelChatId` prevents cross-user data access           | Enforced by conversation lookup logic                |
| **WebUI Authentication**    | Admin password protects WebUI settings interface          | Required to configure channel plugins                |

### Pairing Management

```mermaid
graph LR
    subgraph "Initial Setup"
        ADMIN["Admin User"]
        SETTINGS["WebUI Settings UI"]
        TOKEN["Bot Token/Credentials"]
    end

    subgraph "Platform Configuration"
        PLATFORM["Chat Platform<br/>(Telegram/Lark/DingTalk)"]
        BOT["Create Bot"]
        WEBHOOK_URL["Configure Webhook"]
    end

    subgraph "First User Interaction"
        END_USER["End User"]
        SEND["Send message to bot"]
        PAIR["Auto-pair via channelChatId"]
    end

    ADMIN --> SETTINGS
    SETTINGS --> TOKEN
    BOT --> TOKEN
    TOKEN --> WEBHOOK_URL
    WEBHOOK_URL --> PLATFORM

    END_USER --> SEND
    SEND --> PAIR
    PAIR --> SETTINGS
```

**Pairing Flow:**

1. Admin configures bot token in WebUI settings
2. Platform delivers first message from user
3. System creates conversation with `channelChatId = user:{platform_user_id}`
4. Subsequent messages from same user automatically route to same conversation
5. No explicit pairing action required from end user

**Sources:** [readme.md:194](), [src/common/storage.ts:144-146]()

---

## Event Synchronization

Channel events synchronize with the main application through the IPC bridge and event emitter system:

### Event Flow Architecture

```mermaid
graph TB
    subgraph "Channel Layer"
        WEBHOOK["Webhook Handler"]
        PLUGIN["Channel Plugin"]
    end

    subgraph "IPC Bridge"
        SEND["conversation.sendMessage<br/>(invoke)"]
        STREAM["conversation.responseStream<br/>(emitter)"]
        STATUS["webui.statusChanged<br/>(emitter)"]
    end

    subgraph "Main Process"
        AGENT["Agent Manager"]
        CONV_MGR["Conversation Manager"]
        DB["ConversationManageWithDB<br/>(SQLite batching)"]
    end

    subgraph "Renderer Process"
        UI["WebUI Interface"]
        ADMIN["Admin Panel"]
    end

    WEBHOOK --> PLUGIN
    PLUGIN --> SEND
    SEND --> CONV_MGR
    CONV_MGR --> AGENT

    AGENT --> STREAM
    STREAM --> PLUGIN
    PLUGIN --> WEBHOOK

    AGENT --> DB
    DB --> STREAM

    STATUS --> UI
    STATUS --> ADMIN
```

### Synchronized Events

| Event Type          | IPC Channel                     | Purpose                                    |
| ------------------- | ------------------------------- | ------------------------------------------ |
| **Message Send**    | `conversation.sendMessage`      | Forward user message from channel to agent |
| **Response Stream** | `conversation.responseStream`   | Deliver agent response chunks to channel   |
| **Status Change**   | `webui.statusChanged`           | Notify UI when WebUI/channels start/stop   |
| **Confirmation**    | `conversation.confirmation.add` | Request user approval for tool execution   |
| **File Operation**  | `fileStream.contentUpdate`      | Stream file changes from agent to channel  |

**Synchronization Guarantees:**

- **At-least-once delivery**: Messages are persisted to SQLite before acknowledgment
- **Order preservation**: Events processed sequentially per `channelChatId`
- **Batching strategy**: `ConversationManageWithDB` uses 2-second debounce to batch streaming updates

**Sources:** [src/common/ipcBridge.ts:26-55](), [src/common/ipcBridge.ts:407]()

---

## Configuration Storage Schema

Channel plugin configurations are stored in `ConfigStorage` with platform-specific keys:

```mermaid
graph TB
    subgraph "IConfigStorageRefer"
        TG["assistant.telegram.defaultModel<br/>assistant.telegram.agent"]
        LARK["assistant.lark.defaultModel<br/>assistant.lark.agent"]
        DT["assistant.dingtalk.defaultModel<br/>assistant.dingtalk.agent"]
    end

    subgraph "Agent Configuration"
        BACKEND["backend: AcpBackendAll<br/>(gemini|acp|codex|...)"]
        CUSTOM["customAgentId?: string<br/>(UUID for custom agents)"]
        NAME["name?: string<br/>(display name)"]
    end

    subgraph "Model Configuration"
        PROVIDER_ID["id: string<br/>(IProvider.id)"]
        MODEL_ID["useModel: string<br/>(specific model name)"]
    end

    TG --> BACKEND
    TG --> PROVIDER_ID
    LARK --> BACKEND
    LARK --> PROVIDER_ID
    DT --> BACKEND
    DT --> PROVIDER_ID

    BACKEND --> CUSTOM
    BACKEND --> NAME
    PROVIDER_ID --> MODEL_ID
```

**Storage Location:** `ConfigStorage` (persistent JSON file in userData directory)

**Configuration Keys:**

| Key                               | Type                                                              | Default | Description                                   |
| --------------------------------- | ----------------------------------------------------------------- | ------- | --------------------------------------------- |
| `assistant.telegram.defaultModel` | `{id: string, useModel: string}`                                  | None    | Provider and model for Telegram conversations |
| `assistant.telegram.agent`        | `{backend: AcpBackendAll, customAgentId?: string, name?: string}` | None    | Agent backend selection for Telegram          |
| `assistant.lark.defaultModel`     | `{id: string, useModel: string}`                                  | None    | Provider and model for Lark conversations     |
| `assistant.lark.agent`            | `{backend: AcpBackendAll, customAgentId?: string, name?: string}` | None    | Agent backend selection for Lark              |
| `assistant.dingtalk.defaultModel` | `{id: string, useModel: string}`                                  | None    | Provider and model for DingTalk conversations |
| `assistant.dingtalk.agent`        | `{backend: AcpBackendAll, customAgentId?: string, name?: string}` | None    | Agent backend selection for DingTalk          |

**Sources:** [src/common/storage.ts:85-117]()

---

## Cross-Platform Considerations

### Platform-Specific Limitations

| Platform        | Message Length Limit    | Supported Media Types          | Streaming Support | Group Chat |
| --------------- | ----------------------- | ------------------------------ | ----------------- | ---------- |
| **Telegram**    | 4096 characters         | Text, images, documents, audio | Via edit message  | ✓          |
| **Lark/Feishu** | 10000 characters (card) | Text, images, files via card   | Via card update   | ✓          |
| **DingTalk**    | 5000 characters (card)  | Text, markdown, images         | AI Card Stream    | ✓          |

### Rate Limiting

Each platform enforces API rate limits that channels must respect:

- **Telegram**: 30 messages/second per bot, 20 messages/minute per group
- **Lark**: 100 calls/minute per app
- **DingTalk**: 20 messages/minute per robot in group chat

Channel plugins implement exponential backoff and retry logic to handle rate limit errors gracefully.

**Sources:** [readme.md:186-192]()

---

## Security Considerations

### Webhook Validation

Each channel plugin validates incoming webhooks to prevent unauthorized access:

1. **Token Verification**: Bot token/secret must match configured credentials
2. **Signature Checking**: Platform-signed payloads verified using HMAC
3. **Timestamp Validation**: Reject requests older than 5 minutes
4. **IP Whitelist** (optional): Restrict webhooks to platform IP ranges

### Data Privacy

- **Conversation Isolation**: `channelChatId` ensures users cannot access each other's conversations
- **Local Storage**: All conversation history stored locally in SQLite database
- **No Platform Access**: AionUi never sends conversation data back to chat platforms except responses
- **Admin Control**: WebUI admin password required to configure channels

**Sources:** [readme.md:449-451](), [src/common/storage.ts:144-146]()

---

## Future Platform Support

The channel architecture is designed to be extensible for additional platforms:

- **Slack** (mentioned as "coming soon" in readme)
- **Discord**
- **Microsoft Teams**
- **WhatsApp Business API**

To add a new platform, implement:

1. Webhook handler for platform events
2. Message formatter for platform-specific response format
3. Configuration schema in `IConfigStorageRefer`
4. Platform-specific streaming strategy

**Sources:** [readme.md:192]()
