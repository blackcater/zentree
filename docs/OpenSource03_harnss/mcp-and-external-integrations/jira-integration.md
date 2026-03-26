# Jira Integration

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [electron/src/ipc/jira.ts](electron/src/ipc/jira.ts)
- [electron/src/lib/**tests**/logger.test.ts](electron/src/lib/__tests__/logger.test.ts)
- [electron/src/lib/jira-oauth-store.ts](electron/src/lib/jira-oauth-store.ts)
- [electron/src/lib/jira-store.ts](electron/src/lib/jira-store.ts)
- [electron/src/lib/logger.ts](electron/src/lib/logger.ts)
- [shared/types/jira.ts](shared/types/jira.ts)
- [src/components/JiraBoardPanel.tsx](src/components/JiraBoardPanel.tsx)
- [src/components/SidebarSearch.tsx](src/components/SidebarSearch.tsx)
- [src/components/mcp-renderers/jira.tsx](src/components/mcp-renderers/jira.tsx)

</details>

The Jira integration in Harnss provides a bidirectional bridge between the AI development environment and Atlassian Jira. It enables developers to browse boards, transition issues, and view detailed issue cards directly within the chat interface. The system uses a dual-layer storage approach for project-specific configurations and secure OAuth/API token persistence.

## 1. Authentication and Persistence

Jira connectivity is managed through the `ipcMain` handlers in the Electron process, which interface with two specialized storage modules.

### Data Storage Architecture

- **jira-store**: Persists project-specific configurations (e.g., which board is linked to a specific Harnss project) in `userData/jira/[projectId].json` [[electron/src/lib/jira-store.ts:12-25]]().
- **jira-oauth-store**: Persists sensitive credentials (access tokens and emails) in `userData/jira-oauth/[sanitized-url].json` [[electron/src/lib/jira-oauth-store.ts:12-26]](). This store uses secure file permissions (`0o600`) to ensure only the owner can read/write the tokens [[electron/src/lib/jira-oauth-store.ts:55-56]]().

### Authentication Flow

The system supports both Jira Cloud (API Tokens) and Jira Server/OAuth (Bearer tokens). For Jira Cloud, the `buildAuthHeader` function constructs a `Basic` authentication string using `base64(email:apiToken)` [[electron/src/ipc/jira.ts:37-50]]().

| Method        | Implementation                                      | Storage Entity                                   |
| :------------ | :-------------------------------------------------- | :----------------------------------------------- |
| **API Token** | Email + Token provided by user via `JiraAuthDialog` | `JiraOAuthData` [[shared/types/jira.ts:71-78]]() |
| **OAuth**     | (Planned) Standard flow similar to MCP OAuth        | `JiraOAuthData`                                  |

**Persistence and Logic Flow**
Title: Jira Authentication and Storage Flow

```mermaid
graph TD
    subgraph "Renderer Process"
        A["JiraAuthDialog.tsx"] -- "invoke('jira:authenticate')" --> B["ipcMain.handle"]
    end

    subgraph "Main Process (electron/src/ipc/jira.ts)"
        B --> C{"Auth Method?"}
        C -- "apitoken" --> D["saveJiraOAuthData()"]
        D --> E["jira-oauth-store.ts"]
    end

    subgraph "Filesystem (userData)"
        E --> F["/jira-oauth/domain_atlassian_net.json"]
        G["jira-store.ts"] --> H["/jira/project-123.json"]
    end

    I["JiraBoardPanel.tsx"] -- "get-config" --> J["loadJiraConfig()"]
    J --> G
```

Sources: [[electron/src/ipc/jira.ts:91-137]](), [[electron/src/lib/jira-oauth-store.ts:12-26]](), [[electron/src/lib/jira-store.ts:20-22]]()

## 2. JiraBoardPanel and Issue Management

The `JiraBoardPanel` is the primary UI for interacting with Jira. It fetches issues via the `jira:get-issues` IPC handle and organizes them into columns based on the Jira board configuration [[src/components/JiraBoardPanel.tsx:113-114]]().

### Column Derivation

Issues are sorted and grouped into `BoardColumn` objects. If the Jira board has defined columns, the system maps issue `statusId` to those columns [[src/components/JiraBoardPanel.tsx:130-140]](). If no configuration exists, it infers columns from the unique statuses present in the issue list [[src/components/JiraBoardPanel.tsx:160-182]]().

### Key Functions

- **`buildColumns`**: Organizes a flat list of `JiraIssue` objects into a board layout [[src/components/JiraBoardPanel.tsx:113-182]]().
- **`sortIssues`**: Provides client-side sorting by Rank, Status, Priority, Type, Assignee, or Key [[src/components/JiraBoardPanel.tsx:184-215]]().
- **`jira:transition-issue`**: An IPC handler that allows the user to move an issue through the Jira workflow [[electron/src/ipc/jira.ts:21-22]]().

Sources: [[src/components/JiraBoardPanel.tsx:113-215]](), [[electron/src/ipc/jira.ts:161-208]]()

## 3. MCP Jira Renderer

Harnss includes a specialized renderer for Jira issues when they appear as tool outputs or context in the chat. This is implemented in `src/components/mcp-renderers/jira.tsx`.

### Data Unwrapping

The renderer uses `unwrapJiraIssues` to normalize different Atlassian MCP response formats, such as flat issue objects or nested nodes (`{ issues: { nodes: [...] } }`) [[src/components/mcp-renderers/jira.tsx:87-98]]().

### Visual Components

- **`JiraIssueRow`**: A compact view used in lists, displaying the issue type icon, key, summary, priority icon, and status badge [[src/components/mcp-renderers/jira.tsx:139-185]]().
- **`JiraIssueDetailView`**: A full card view including the description (rendered via `ReactMarkdown`), assignee avatars, and creation dates [[src/components/mcp-renderers/jira.tsx:189-201]]().

**Jira Renderer Data Flow**
Title: MCP Jira Data Normalization and Rendering

```mermaid
graph LR
    subgraph "MCP Server Output"
        A["JSON Data (Atlassian Format)"]
    end

    subgraph "src/components/mcp-renderers/jira.tsx"
        B["unwrapJiraIssues(data)"]
        C["JiraIssueListView"]
        D["JiraIssueRow"]
        E["JiraIssueDetailView"]
    end

    A --> B
    B -- "Array<JiraIssue>" --> C
    C --> D
    B -- "Single Issue" --> E
```

Sources: [[src/components/mcp-renderers/jira.tsx:87-133]](), [[src/components/mcp-renderers/jira.tsx:189-201]]()

## 4. Security and Logging

Because Jira integration involves sensitive tokens, the `logger` utility in the main process is configured to redact credentials.

- **Redaction Regex**: The `SENSITIVE_KEY_RE` identifies keys like `api-key`, `token`, and `access_token` [[electron/src/lib/logger.ts:14-15]]().
- **String Sanitization**: The `sanitizeString` function uses regex to scrub `Authorization: Bearer ...` patterns and credentials embedded in URLs (e.g., `https://user:pass@domain`) [[electron/src/lib/logger.ts:17-22]]().
- **Recursive Sanitization**: The `sanitizeValue` function traverses objects and arrays to ensure nested tokens are replaced with `[REDACTED]` before being written to the log file [[electron/src/lib/logger.ts:24-56]]().

Sources: [[electron/src/lib/logger.ts:13-61]](), [[electron/src/lib/__tests__/logger.test.ts:33-72]]()
