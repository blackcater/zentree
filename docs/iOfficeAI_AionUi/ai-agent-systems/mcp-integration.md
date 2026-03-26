# MCP Integration

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [src/agent/codex/core/ErrorService.ts](src/agent/codex/core/ErrorService.ts)
- [src/agent/codex/handlers/CodexEventHandler.ts](src/agent/codex/handlers/CodexEventHandler.ts)
- [src/agent/codex/handlers/CodexFileOperationHandler.ts](src/agent/codex/handlers/CodexFileOperationHandler.ts)
- [src/agent/codex/handlers/CodexSessionManager.ts](src/agent/codex/handlers/CodexSessionManager.ts)
- [src/agent/codex/handlers/CodexToolHandlers.ts](src/agent/codex/handlers/CodexToolHandlers.ts)
- [src/agent/codex/messaging/CodexMessageProcessor.ts](src/agent/codex/messaging/CodexMessageProcessor.ts)
- [src/agent/gemini/cli/atCommandProcessor.ts](src/agent/gemini/cli/atCommandProcessor.ts)
- [src/agent/gemini/cli/config.ts](src/agent/gemini/cli/config.ts)
- [src/agent/gemini/cli/errorParsing.ts](src/agent/gemini/cli/errorParsing.ts)
- [src/agent/gemini/cli/tools/web-fetch.ts](src/agent/gemini/cli/tools/web-fetch.ts)
- [src/agent/gemini/cli/tools/web-search.ts](src/agent/gemini/cli/tools/web-search.ts)
- [src/agent/gemini/cli/types.ts](src/agent/gemini/cli/types.ts)
- [src/agent/gemini/cli/useReactToolScheduler.ts](src/agent/gemini/cli/useReactToolScheduler.ts)
- [src/agent/gemini/index.ts](src/agent/gemini/index.ts)
- [src/agent/gemini/utils.ts](src/agent/gemini/utils.ts)
- [src/common/codex/types/eventData.ts](src/common/codex/types/eventData.ts)
- [src/common/codex/types/eventTypes.ts](src/common/codex/types/eventTypes.ts)
- [src/common/ipcBridge.ts](src/common/ipcBridge.ts)
- [src/common/storage.ts](src/common/storage.ts)
- [src/process/services/mcpServices/McpOAuthService.ts](src/process/services/mcpServices/McpOAuthService.ts)
- [src/renderer/pages/guid/index.tsx](src/renderer/pages/guid/index.tsx)

</details>

## Purpose and Scope

This document describes the Model Context Protocol (MCP) server integration system in AionUi. MCP enables AI agents to access external tools and resources through a standardized protocol. The integration supports four transport types (stdio, SSE, HTTP, streamable_http), OAuth authentication for remote servers, and configuration management across multiple sources.

For agent-specific tool execution, see [Tool System Architecture](#4.5). For OAuth credential management, see [Authentication](#9).

---

## MCP Server Configuration Data Model

MCP servers are configured through the `IMcpServer` interface which supports multiple transport mechanisms and lifecycle states.

### Configuration Structure

```mermaid
graph TB
    subgraph "IMcpServer Interface"
        SERVER["IMcpServer"]
        SERVER -->|required| ID["id: string"]
        SERVER -->|required| NAME["name: string"]
        SERVER -->|required| ENABLED["enabled: boolean"]
        SERVER -->|required| TRANSPORT["transport: IMcpServerTransport"]
        SERVER -->|optional| TOOLS["tools?: IMcpTool[]"]
        SERVER -->|optional| STATUS["status?: connected|disconnected|error|testing"]
        SERVER -->|optional| DESC["description?: string"]
        SERVER -->|optional| ORIGINAL["originalJson: string"]
        SERVER -->|timestamps| CREATED["createdAt: number"]
        SERVER -->|timestamps| UPDATED["updatedAt: number"]
    end

    subgraph "Transport Types - Discriminated Union"
        TRANSPORT -->|type: stdio| STDIO["IMcpServerTransportStdio"]
        TRANSPORT -->|type: sse| SSE["IMcpServerTransportSSE"]
        TRANSPORT -->|type: http| HTTP["IMcpServerTransportHTTP"]
        TRANSPORT -->|type: streamable_http| STREAMABLE["IMcpServerTransportStreamableHTTP"]
    end

    subgraph "Stdio Transport"
        STDIO -->|required| CMD["command: string"]
        STDIO -->|optional| ARGS["args?: string[]"]
        STDIO -->|optional| ENV["env?: Record<string,string>"]
    end

    subgraph "Remote Transports"
        SSE -->|required| SSE_URL["url: string"]
        SSE -->|optional| SSE_HDR["headers?: Record<string,string>"]

        HTTP -->|required| HTTP_URL["url: string"]
        HTTP -->|optional| HTTP_HDR["headers?: Record<string,string>"]

        STREAMABLE -->|required| STREAM_URL["url: string"]
        STREAMABLE -->|optional| STREAM_HDR["headers?: Record<string,string>"]
    end
```

**Sources:**

- [src/common/storage.ts:390-438]()

---

## Transport Layer Architecture

The system supports four transport mechanisms for MCP server communication, each optimized for different deployment scenarios.

### Transport Type Comparison

| Transport Type    | Use Case                               | Connection Model                | Authentication        |
| ----------------- | -------------------------------------- | ------------------------------- | --------------------- |
| `stdio`           | Local CLI tools via process spawning   | Child process with stdin/stdout | Environment variables |
| `sse`             | Remote servers with server-sent events | HTTP long-polling               | Headers + OAuth       |
| `http`            | Remote REST-style endpoints            | Request-response                | Headers + OAuth       |
| `streamable_http` | Remote streaming responses             | HTTP streaming                  | Headers + OAuth       |

### Transport Selection Flow

```mermaid
graph TD
    START["MCP Server Configuration"]
    START --> CHECK_TYPE{"transport.type?"}

    CHECK_TYPE -->|stdio| STDIO_HANDLER["StdioTransportHandler"]
    CHECK_TYPE -->|sse| SSE_HANDLER["SSETransportHandler"]
    CHECK_TYPE -->|http| HTTP_HANDLER["HTTPTransportHandler"]
    CHECK_TYPE -->|streamable_http| STREAM_HANDLER["StreamableHTTPHandler"]

    STDIO_HANDLER --> SPAWN["spawn process with<br/>command + args"]
    SPAWN --> PIPE["communicate via<br/>stdin/stdout pipes"]

    SSE_HANDLER --> SSE_CONN["establish SSE connection<br/>to url"]
    SSE_CONN --> SSE_AUTH{"needs auth?"}
    SSE_AUTH -->|yes| OAUTH_CHECK["McpOAuthService<br/>.checkOAuthStatus"]
    SSE_AUTH -->|no| SSE_STREAM["stream events"]
    OAUTH_CHECK -->|authenticated| SSE_STREAM
    OAUTH_CHECK -->|not authenticated| LOGIN["McpOAuthService<br/>.loginMcpOAuth"]

    HTTP_HANDLER --> HTTP_REQ["send HTTP request<br/>with headers"]
    HTTP_REQ --> HTTP_AUTH{"401 response?"}
    HTTP_AUTH -->|yes| OAUTH_CHECK
    HTTP_AUTH -->|no| HTTP_RESP["parse response"]

    STREAM_HANDLER --> STREAM_CONN["establish streaming<br/>HTTP connection"]
    STREAM_CONN --> STREAM_AUTH{"needs auth?"}
    STREAM_AUTH -->|yes| OAUTH_CHECK
    STREAM_AUTH -->|no| STREAM_DATA["consume stream"]
```

**Sources:**

- [src/common/storage.ts:390-418]()
- [src/process/services/mcpServices/McpOAuthService.ts:46-100]()

---

## OAuth Authentication System

Remote MCP servers (SSE, HTTP, streamable_http) can require OAuth authentication. The `McpOAuthService` class manages the complete OAuth flow using `@office-ai/aioncli-core` primitives.

### OAuth Service Architecture

```mermaid
graph TB
    subgraph "McpOAuthService Class"
        SERVICE["McpOAuthService"]
        SERVICE -->|manages| PROVIDER["MCPOAuthProvider<br/>from aioncli-core"]
        SERVICE -->|manages| STORAGE["MCPOAuthTokenStorage<br/>from aioncli-core"]
        SERVICE -->|emits| EVENTS["EventEmitter<br/>OAUTH_DISPLAY_MESSAGE_EVENT"]
    end

    subgraph "OAuth Status Check Flow"
        CHECK_START["checkOAuthStatus(server)"]
        CHECK_START --> VALIDATE_TRANSPORT{"transport is<br/>http or sse?"}
        VALIDATE_TRANSPORT -->|no| SKIP["return authenticated:true"]
        VALIDATE_TRANSPORT -->|yes| FETCH_SERVER["fetch(server.url)"]

        FETCH_SERVER --> CHECK_401{"status === 401?"}
        CHECK_401 -->|no| SUCCESS["return authenticated:true"]
        CHECK_401 -->|yes| CHECK_WWW["check WWW-Authenticate<br/>header"]

        CHECK_WWW --> LOAD_CREDS["tokenStorage.getCredentials<br/>(server.name)"]
        LOAD_CREDS --> HAS_TOKEN{"has valid token?"}
        HAS_TOKEN -->|yes| EXPIRED["return authenticated:true<br/>needsLogin:false"]
        HAS_TOKEN -->|no| NEED_LOGIN["return authenticated:false<br/>needsLogin:true"]
    end

    subgraph "OAuth Login Flow"
        LOGIN_START["loginMcpOAuth(server, config)"]
        LOGIN_START --> PARSE_WWW["parse WWW-Authenticate<br/>for OAuth params"]
        PARSE_WWW --> BUILD_CONFIG["build MCPOAuthConfig<br/>authUrl, tokenUrl, etc"]
        BUILD_CONFIG --> INITIATE["oauthProvider.initiateOAuth<br/>(serverName, config)"]

        INITIATE --> OPEN_BROWSER["open browser for<br/>user authorization"]
        OPEN_BROWSER --> CALLBACK["receive callback with<br/>authorization code"]
        CALLBACK --> EXCHANGE["exchange code for<br/>access token"]
        EXCHANGE --> STORE["tokenStorage.saveCredentials<br/>(serverName, token)"]
    end
```

**Implementation Details:**

The `McpOAuthService` constructor initializes both storage and provider:

```
constructor() {
  this.tokenStorage = new MCPOAuthTokenStorage();
  this.oauthProvider = new MCPOAuthProvider(this.tokenStorage);
  this.eventEmitter = new EventEmitter();
}
```

**Sources:**

- [src/process/services/mcpServices/McpOAuthService.ts:1-179]()
- [src/common/ipcBridge.ts:279-283]()

---

## Configuration Management System

MCP server configurations are merged from three sources with defined precedence: settings files, extensions, and UI configuration. The `loadCliConfig` function orchestrates this merge for Gemini agents.

### Configuration Merge Strategy

```mermaid
graph LR
    subgraph "Configuration Sources - Precedence Order"
        SOURCE_1["1. settings.mcpServers<br/>(~/.gemini/settings.json)"]
        SOURCE_2["2. extension.mcpServers<br/>(from GeminiCLIExtension[])"]
        SOURCE_3["3. uiMcpServers<br/>(from ConfigStorage)"]
    end

    SOURCE_1 --> MERGE["mergeMcpServers()<br/>in loadCliConfig"]
    SOURCE_2 --> MERGE
    SOURCE_3 --> MERGE

    MERGE --> FILTER{"settings has<br/>allowMCPServers or<br/>excludeMCPServers?"}

    FILTER -->|allowMCPServers| WHITELIST["filter to keep only<br/>allowed server names"]
    FILTER -->|excludeMCPServers| BLACKLIST["filter to remove<br/>excluded server names"]
    FILTER -->|no filters| PASS["keep all servers"]

    WHITELIST --> FINAL["mcpServersConfig<br/>Record<string,unknown>"]
    BLACKLIST --> FINAL
    PASS --> FINAL

    FINAL --> CONFIG["new Config({<br/>mcpServers: mcpServersConfig<br/>})"]

    subgraph "Extension Processing"
        EXT["extension.mcpServers"]
        EXT --> CHECK_DUP{"key already<br/>exists?"}
        CHECK_DUP -->|yes| WARN["logger.warn + skip"]
        CHECK_DUP -->|no| ADD["add to mcpServers<br/>with extension ref"]
    end
```

**Merge Function Implementation:**

The `mergeMcpServers` function at [src/agent/gemini/cli/config.ts:339-369]() implements the precedence logic:

1. Start with `settings.mcpServers`
2. Add servers from each extension (skip if key exists)
3. Override with `uiMcpServers` (highest precedence)

**Filtering Logic:**

The configuration applies allow/exclude filters at [src/agent/gemini/cli/config.ts:175-189]():

- `allowMCPServers`: whitelist specific server names
- `excludeMCPServers`: blacklist specific server names
- If both are present, allowlist takes precedence

**Sources:**

- [src/agent/gemini/cli/config.ts:70-336]()
- [src/agent/gemini/cli/config.ts:339-379]()

---

## Agent Integration

MCP servers are integrated differently across agent types, with Gemini using aioncli-core's native MCP support, while Codex receives MCP tool invocation events.

### Gemini Agent MCP Integration

```mermaid
graph TB
    subgraph "Gemini Agent Initialization"
        INIT["GeminiAgent.initialize()"]
        INIT --> LOAD_CONFIG["loadCliConfig({<br/>mcpServers: this.mcpServers<br/>})"]
        LOAD_CONFIG --> CREATE_CONFIG["new Config({<br/>mcpServers: mcpServersConfig<br/>})"]
        CREATE_CONFIG --> CONFIG_INIT["await config.initialize()"]
    end

    subgraph "aioncli-core MCP System"
        CONFIG_INIT --> DISCOVER["Config discovers MCP<br/>servers and tools"]
        DISCOVER --> REGISTER["register MCP tools<br/>in CoreToolScheduler"]
    end

    subgraph "Tool Execution Flow"
        USER_MSG["user sends message"]
        USER_MSG --> MODEL_RESP["model returns<br/>ToolCallRequestInfo"]
        MODEL_RESP --> CHECK_MCP{"tool name has<br/>MCP prefix?"}
        CHECK_MCP -->|yes| MCP_INVOKE["CoreToolScheduler<br/>invokes MCP tool"]
        CHECK_MCP -->|no| BUILTIN["execute built-in tool"]

        MCP_INVOKE --> MCP_SERVER["connect to MCP server<br/>via transport"]
        MCP_SERVER --> EXEC_TOOL["execute tool on<br/>remote server"]
        EXEC_TOOL --> RETURN["return result to model"]
    end

    subgraph "Custom Tool Registration"
        TOOL_CONFIG["ConversationToolConfig<br/>.registerCustomTools()"]
        TOOL_CONFIG --> WEB_SEARCH["register WebSearchTool<br/>(gemini_web_search)"]
        TOOL_CONFIG --> WEB_FETCH["register WebFetchTool<br/>(aionui_web_fetch)"]
    end

    REGISTER --> TOOL_CONFIG
```

**Key Integration Points:**

1. **MCP Server Configuration:** Passed to `loadCliConfig` at [src/agent/gemini/index.ts:126]()
2. **Tool Registration:** Happens during `config.initialize()` at [src/agent/gemini/index.ts:329]()
3. **Custom Tools:** Registered via `ConversationToolConfig` at [src/agent/gemini/index.ts:393]()

**Sources:**

- [src/agent/gemini/index.ts:118-396]()
- [src/agent/gemini/cli/config.ts:222-281]()

### Codex Agent MCP Integration

```mermaid
graph TB
    subgraph "Codex MCP Event Flow"
        EVENT["CodexJsonRpcEvent<br/>{method:'codex/event'}"]
        EVENT --> HANDLER["CodexEventHandler<br/>.handleEvent()"]
        HANDLER --> CHECK_TYPE{"msg.type?"}

        CHECK_TYPE -->|mcp_tool_call_begin| BEGIN["handleMcpToolCallBegin()"]
        CHECK_TYPE -->|mcp_tool_call_end| END["handleMcpToolCallEnd()"]

        BEGIN --> INTERCEPT["NavigationInterceptor<br/>.intercept()"]
        INTERCEPT --> NAV_CHECK{"is navigation tool?"}
        NAV_CHECK -->|yes| PREVIEW["emit preview_open<br/>event"]
        NAV_CHECK -->|no| EMIT_BEGIN["emit CodexToolCall<br/>status:executing"]

        END --> FORMAT_RESULT["format tool result<br/>check for errors"]
        FORMAT_RESULT --> EMIT_END["emit CodexToolCall<br/>status:success/error"]
    end

    subgraph "MCP Tool Event Data"
        BEGIN_DATA["McpToolCallBeginData"]
        BEGIN_DATA -->|contains| INVOCATION["invocation: McpInvocation"]
        INVOCATION --> TOOL_NAME["tool: string"]
        INVOCATION --> SERVER_NAME["server: string"]
        INVOCATION --> ARGS["arguments: Record<>"]

        END_DATA["McpToolCallEndData"]
        END_DATA --> RESULT["result: unknown"]
        END_DATA --> ERROR["error?: string"]
    end
```

**Codex Event Handling:**

The `CodexEventHandler` processes MCP tool events at [src/agent/codex/handlers/CodexEventHandler.ts:129-138]():

- `mcp_tool_call_begin`: Tool invocation starts
- `mcp_tool_call_end`: Tool execution completes

**Navigation Interception:**

Chrome DevTools navigation tools are intercepted at [src/agent/codex/handlers/CodexToolHandlers.ts:198-212]() to emit `preview_open` events for URL display.

**Sources:**

- [src/agent/codex/handlers/CodexEventHandler.ts:1-350]()
- [src/agent/codex/handlers/CodexToolHandlers.ts:187-262]()
- [src/common/codex/types/eventData.ts:42-43]()

---

## IPC Bridge API

The IPC bridge provides a comprehensive API for MCP server management accessible from the renderer process.

### MCP Service API Structure

```mermaid
graph TB
    subgraph "mcpService IPC Providers"
        API["mcpService namespace"]

        API --> GET["getAgentMcpConfigs<br/>Array<{backend,name,cliPath}>"]
        GET --> RETURN_CONFIGS["returns Array<{<br/>source:McpSource<br/>servers:IMcpServer[]<br/>}>"]

        API --> TEST["testMcpConnection<br/>IMcpServer"]
        TEST --> RETURN_TEST["returns {<br/>success:boolean<br/>tools?:Array<>  <br/>needsAuth?:boolean<br/>error?:string<br/>}"]

        API --> SYNC["syncMcpToAgents<br/>{mcpServers,agents}"]
        SYNC --> RETURN_SYNC["returns {<br/>success:boolean<br/>results:Array<>  <br/>}"]

        API --> REMOVE["removeMcpFromAgents<br/>{mcpServerName,agents}"]
        REMOVE --> RETURN_REMOVE["returns {<br/>success:boolean<br/>results:Array<>  <br/>}"]
    end

    subgraph "OAuth Management API"
        API --> CHECK_OAUTH["checkOAuthStatus<br/>IMcpServer"]
        CHECK_OAUTH --> OAUTH_STATUS["returns {<br/>isAuthenticated:boolean<br/>needsLogin:boolean<br/>error?:string<br/>}"]

        API --> LOGIN_OAUTH["loginMcpOAuth<br/>{server,config}"]
        LOGIN_OAUTH --> LOGIN_RESULT["returns {<br/>success:boolean<br/>error?:string<br/>}"]

        API --> LOGOUT_OAUTH["logoutMcpOAuth<br/>serverName:string"]
        LOGOUT_OAUTH --> LOGOUT_RESULT["returns IBridgeResponse"]

        API --> GET_AUTH["getAuthenticatedServers<br/>void"]
        GET_AUTH --> AUTH_LIST["returns string[]<br/>(server names)"]
    end
```

**API Usage Pattern:**

```typescript
// Test MCP server connection
const testResult = await ipcBridge.mcpService.testMcpConnection({
  id: 'server-id',
  name: 'my-mcp-server',
  enabled: true,
  transport: { type: 'http', url: 'http://localhost:8000' },
  createdAt: Date.now(),
  updatedAt: Date.now(),
})

if (testResult.data?.needsAuth) {
  // Initiate OAuth login
  await ipcBridge.mcpService.loginMcpOAuth({
    server: mcpServer,
    config: oauthConfig,
  })
}
```

**Sources:**

- [src/common/ipcBridge.ts:273-284]()

---

## Server Lifecycle Management

MCP servers have a defined lifecycle from configuration through connection testing to tool execution.

### Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> Created: User adds server<br/>via UI or config

    Created --> Testing: testMcpConnection()<br/>invoked

    Testing --> NeedsAuth: status=401<br/>WWW-Authenticate header
    Testing --> Connected: status=200<br/>tools discovered
    Testing --> Error: connection failed

    NeedsAuth --> OAuthPending: loginMcpOAuth()<br/>initiated
    OAuthPending --> Connected: OAuth success<br/>token stored
    OAuthPending --> Error: OAuth failed

    Connected --> Enabled: user enables<br/>in settings
    Enabled --> Active: agent initialized<br/>tools registered

    Active --> Executing: tool invocation<br/>received
    Executing --> Active: tool execution<br/>completed

    Active --> Disconnected: connection lost<br/>or server stopped
    Disconnected --> Testing: reconnection<br/>attempt

    Error --> Testing: user retries<br/>connection

    Connected --> Disabled: user disables<br/>in settings
    Disabled --> Testing: user re-enables<br/>server
```

**Lifecycle Properties:**

The `IMcpServer.status` field tracks connection state at [src/common/storage.ts:427]():

- `connected`: Server is reachable and tools are available
- `disconnected`: Server was connected but is now offline
- `error`: Connection attempt failed
- `testing`: Connection test in progress

The `IMcpServer.enabled` field controls installation state at [src/common/storage.ts:424]():

- `true`: Server is installed to CLI agents
- `false`: Server is configured but not installed

**Sources:**

- [src/common/storage.ts:420-432]()
- [src/process/services/mcpServices/McpOAuthService.ts:46-100]()

---

## Configuration Storage

MCP server configurations are persisted in `ConfigStorage` and synchronized across agent configurations.

### Storage Schema

```mermaid
graph TB
    subgraph "ConfigStorage Schema"
        STORAGE["ConfigStorage<br/>agent.config"]
        STORAGE --> MCP_CONFIG["mcp.config<br/>IMcpServer[]"]
        STORAGE --> INSTALL_STATUS["mcp.agentInstallStatus<br/>Record<string,string[]>"]
        STORAGE --> AGENT_CONFIGS["agent configs<br/>(gemini, acp, codex)"]
    end

    subgraph "IMcpServer Persistence"
        MCP_CONFIG --> SERVER_LIST["Array of server configs"]
        SERVER_LIST --> INDIVIDUAL["Each server has:<br/>- id, name, description<br/>- transport config<br/>- enabled status<br/>- originalJson"]
    end

    subgraph "Install Status Tracking"
        INSTALL_STATUS --> AGENT_MAP["Maps server name to<br/>agent backend list"]
        AGENT_MAP --> EXAMPLE["e.g. {<br/>'my-server': ['claude','qwen']<br/>}"]
    end

    subgraph "UI Configuration Source"
        UI["Settings UI<br/>MCP Management"]
        UI --> SAVE["ipcBridge.mode<br/>.saveModelConfig()"]
        SAVE --> UPDATE_STORAGE["Update ConfigStorage<br/>mcp.config"]
        UPDATE_STORAGE --> SYNC["ipcBridge.mcpService<br/>.syncMcpToAgents()"]
    end
```

**Storage Keys:**

- `mcp.config`: Array of `IMcpServer` configurations at [src/common/storage.ts:58]()
- `mcp.agentInstallStatus`: Maps server names to installed agent backends at [src/common/storage.ts:59]()

**Synchronization Flow:**

1. User configures MCP server in UI
2. Configuration saved to `ConfigStorage['mcp.config']`
3. `syncMcpToAgents` called to write to agent-specific configs
4. Each agent reads from its own config source during initialization

**Sources:**

- [src/common/storage.ts:19-118]()
- [src/common/ipcBridge.ts:277-278]()
