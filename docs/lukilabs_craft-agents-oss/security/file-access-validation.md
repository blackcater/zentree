# File Access Validation

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [apps/electron/src/renderer/components/onboarding/CredentialsStep.tsx](apps/electron/src/renderer/components/onboarding/CredentialsStep.tsx)
- [apps/electron/src/renderer/components/onboarding/OnboardingWizard.tsx](apps/electron/src/renderer/components/onboarding/OnboardingWizard.tsx)
- [packages/shared/src/config/validators.ts](packages/shared/src/config/validators.ts)

</details>



This page documents the path validation and filename sanitization logic that protects the Craft Agents main process from path traversal attacks via the IPC layer. It covers the `validateFilePath` and `sanitizeFilename` functions in `apps/electron/src/main/ipc.ts`, which IPC handlers apply them, and the relationship between IPC-level path gating and the agent permission system.

For the broader security architecture (process isolation, renderer sandboxing), see [7.1 Security Architecture](). For credential storage protection, see [7.2 Credential Storage & Encryption](). For the IPC channel surface itself, see [2.6 IPC Communication Layer](). For the permission mode system that governs which file operations the agent may request, see [4.5 Permission System]().

---

## Why Path Validation Is Needed

The Electron renderer process is sandboxed — it has no direct Node.js filesystem access. All file I/O goes through IPC calls to the main process. This makes the IPC handlers a trust boundary: a compromised or misbehaving renderer, or a crafted agent output containing a manipulated path string, could attempt to reach files outside the intended working area by embedding `..` sequences, symlinks to sensitive locations, or absolute paths to system credential files.

The `validateFilePath` function in [apps/electron/src/main/ipc.ts:78-136]() is the single enforcement point for all renderer-initiated file reads.

---

## `validateFilePath` Implementation

`validateFilePath` is an `async` function that takes a raw path string and returns a validated, resolved absolute path, or throws with an `Access denied` message. It is called by every IPC handler that reads or opens a file.

**Validation pipeline (in order):**

| Step | What happens | Why |
|------|-------------|-----|
| Normalize | `normalize(filePath)` resolves `.` and `..` components [apps/electron/src/main/ipc.ts:88-88]() | Neutralizes simple traversal sequences |
| Tilde expand | `~` prefix replaced with `homedir()` [apps/electron/src/main/ipc.ts:81-85]() | Allows user-friendly `~/…` paths |
| Absolute check | Throws if path is not absolute after normalization [apps/electron/src/main/ipc.ts:90-92]() | Prevents relative path escapes |
| Symlink resolution | `realpath(normalizedPath)` resolves all symlinks [apps/electron/src/main/ipc.ts:95-100]() | Prevents symlink-based escape to outside allowed dirs |
| Allow-list check | Path must start with `homedir()` or `tmpdir()` [apps/electron/src/main/ipc.ts:102-116]() | Restricts access to user home and platform temp |
| Sensitive file block | Regex-matches against a list of sensitive patterns [apps/electron/src/main/ipc.ts:119-132]() | Extra protection for credential files within home |

**Allow-list logic** [apps/electron/src/main/ipc.ts:102-116]():

The check uses `path.sep` to avoid false positives where one directory name is a prefix of another:
```typescript
const isInside = allowedDirs.some(allowedDir => {
  const normalizedDir = normalize(allowedDir);
  return normalizedReal.startsWith(normalizedDir + sep) || normalizedReal === normalizedDir;
});
```

**Sensitive file blocklist** [apps/electron/src/main/ipc.ts:119-132]():

| Pattern | What it blocks |
|---------|---------------|
| `/\.ssh\//` | SSH private keys and config |
| `/\.gnupg\//` | GPG keyrings |
| `/\.aws\/credentials/` | AWS credential files |
| `/\.env$/` and `/\.env\./` | `.env` files |
| `/credentials\.json$/` | OAuth/service account credentials |
| `/secrets?\./i` | Any file named `secret(s).*` |
| `/\.pem$/` | PEM certificates |
| `/\.key$/` | Private key files |

**Validation Flow Diagram:**

Title: validateFilePath Logic Flow
```mermaid
flowchart TD
    A["Raw path from IPC call"] --> B["normalize(filePath)"]
    B --> C{"Starts with ~?"}
    C -->|"Yes"| D["Replace ~ with homedir()"]
    C -->|"No"| E["isAbsolute check"]
    D --> E
    E -->|"Not absolute"| FAIL1["throw: Only absolute paths allowed"]
    E -->|"OK"| F["realpath(normalizedPath)"]
    F -->|"ENOENT or error"| G["Use normalizedPath as fallback"]
    F -->|"Resolved"| H["Check against allowedDirs"]
    G --> H
    H -->|"Outside homedir and tmpdir"| FAIL2["throw: Access denied - outside allowed directories"]
    H -->|"Inside allowed dir"| I["Check sensitivePatterns regex"]
    I -->|"Match"| FAIL3["throw: Access denied - sensitive file"]
    I -->|"No match"| OK["Return resolved realPath"]
```
Sources: [apps/electron/src/main/ipc.ts:78-136]()

---

## `sanitizeFilename`

`sanitizeFilename` [apps/electron/src/main/ipc.ts:36-52]() is used when persisting uploaded attachments to disk. It ensures that an agent-supplied or user-supplied filename cannot escape the target attachments directory.

**Transformations applied (in order):**

| Transform | Characters affected | Replacement |
|-----------|-------------------|-------------|
| Path separators | `/`, `\` | `_` |
| Windows-forbidden chars | `< > : " \| ? *` | `_` |
| Control characters | ASCII 0–31 | Removed |
| Multiple dots | `..`, `...`, etc. | Single `.` |
| Leading/trailing dots and spaces | `.foo`, `foo.`, ` foo ` | Stripped |
| Length cap | > 200 chars | Truncated |

The sanitized name is then combined with a `randomUUID()` prefix to produce the stored filename:
`const storedFileName = \`${id}_\${safeName}\`` [apps/electron/src/main/ipc.ts:657-659]().

Sources: [apps/electron/src/main/ipc.ts:36-52](), [apps/electron/src/main/ipc.ts:657-659]()

---

## IPC Handlers and Path Validation

The following diagram maps each IPC channel constant to the handler that calls `validateFilePath`.

Title: IPC Path Validation Coverage
```mermaid
flowchart LR
    subgraph "IPC_CHANNELS (types.ts)"
        RF["READ_FILE\
'file:read'"]
        RFD["READ_FILE_DATA_URL\
'file:readDataUrl'"]
        RFB["READ_FILE_BINARY\
'file:readBinary'"]
        RFA["READ_FILE_ATTACHMENT\
'file:readAttachment'"]
        OF["OPEN_FILE\
'shell:openFile'"]
        SIF["SHOW_IN_FOLDER\
'shell:showInFolder'"]
        SA["STORE_ATTACHMENT\
'file:storeAttachment'"]
    end

    subgraph "validateFilePath"
        VP["validateFilePath(path)"]
    end

    subgraph "Node.js / Electron APIs"
        FS_READ["fs/promises readFile()"]
        SHELL_OPEN["shell.openPath()"]
        SHELL_SHOW["shell.showItemInFolder()"]
        READ_ATTACH["readFileAttachment() utility"]
        SESSION_VALIDATE["validateSessionId()"]
    end

    RF --> VP --> FS_READ
    RFD --> VP --> FS_READ
    RFB --> VP --> FS_READ
    RFA --> VP --> READ_ATTACH
    OF --> VP --> SHELL_OPEN
    SIF --> VP --> SHELL_SHOW
    SA --> SESSION_VALIDATE
```

Note: `STORE_ATTACHMENT` does not call `validateFilePath` because the destination path is constructed entirely by the main process from workspace config and a UUID. Instead it calls `validateSessionId` on the caller-supplied `sessionId` before constructing the path [apps/electron/src/main/ipc.ts:648-649]().

Sources: [apps/electron/src/main/ipc.ts:487-503](), [apps/electron/src/main/ipc.ts:507-534](), [apps/electron/src/main/ipc.ts:538-549](), [apps/electron/src/main/ipc.ts:567-592](), [apps/electron/src/main/ipc.ts:1122-1139](), [apps/electron/src/main/ipc.ts:1142-1154]()

---

## Relationship to the Agent Permission System

The `validateFilePath` IPC gate and the agent permission system are two separate, complementary layers. Even in `allow-all` mode, the IPC path validator still runs. An agent in an unrestricted session cannot read `/etc/passwd` because the IPC handler will reject the path before any I/O occurs.

Title: Security Layer Interaction
```mermaid
flowchart TD
    subgraph "Agent Layer (packages/shared/agent)"
        PERM["Pre-tool-use check\
(permission mode: safe / ask / allow-all)"]
        TOOL["Tool call e.g. read_file, bash"]
    end

    subgraph "IPC Layer (apps/electron/src/main/ipc.ts)"
        IPC_HANDLER["IPC handler\
e.g. READ_FILE handler"]
        VFP["validateFilePath()"]
    end

    subgraph "Filesystem"
        FS["Node.js fs/promises"]
    end

    USER["User / agent request"] --> PERM
    PERM -->|"safe mode: blocked"| BLOCKED["Request rejected"]
    PERM -->|"ask mode: user prompt"| APPROVED["User approves / denies"]
    PERM -->|"allow-all mode: auto-approved"| TOOL
    APPROVED -->|"Approved"| TOOL
    TOOL --> IPC_HANDLER
    IPC_HANDLER --> VFP
    VFP -->|"Outside allowed dirs or sensitive file"| DENY["throw Access denied"]
    VFP -->|"Path valid"| FS
```

| Layer | Scope | Controls |
|-------|-------|---------|
| Permission system (agent) | Which operations the agent may *attempt* | Bash commands, MCP tools, file writes — gated per `PermissionMode` |
| `validateFilePath` (IPC) | Which paths the main process will *actually read* | Enforced regardless of permission mode; cannot be bypassed by agent |

Sources: [apps/electron/src/main/ipc.ts:78-136](), [apps/electron/src/main/ipc.ts:487-503](), [apps/electron/src/shared/types.ts:130-136]()