# Sandboxing Implementation

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [codex-rs/Cargo.lock](codex-rs/Cargo.lock)
- [codex-rs/Cargo.toml](codex-rs/Cargo.toml)
- [codex-rs/README.md](codex-rs/README.md)
- [codex-rs/cli/Cargo.toml](codex-rs/cli/Cargo.toml)
- [codex-rs/cli/src/main.rs](codex-rs/cli/src/main.rs)
- [codex-rs/config.md](codex-rs/config.md)
- [codex-rs/core/Cargo.toml](codex-rs/core/Cargo.toml)
- [codex-rs/core/src/codex_tests.rs](codex-rs/core/src/codex_tests.rs)
- [codex-rs/core/src/codex_tests_guardian.rs](codex-rs/core/src/codex_tests_guardian.rs)
- [codex-rs/core/src/flags.rs](codex-rs/core/src/flags.rs)
- [codex-rs/core/src/lib.rs](codex-rs/core/src/lib.rs)
- [codex-rs/core/src/model_provider_info.rs](codex-rs/core/src/model_provider_info.rs)
- [codex-rs/core/src/state/service.rs](codex-rs/core/src/state/service.rs)
- [codex-rs/core/src/tools/handlers/mod.rs](codex-rs/core/src/tools/handlers/mod.rs)
- [codex-rs/core/src/tools/spec.rs](codex-rs/core/src/tools/spec.rs)
- [codex-rs/core/tests/suite/code_mode.rs](codex-rs/core/tests/suite/code_mode.rs)
- [codex-rs/core/tests/suite/request_permissions.rs](codex-rs/core/tests/suite/request_permissions.rs)
- [codex-rs/exec/Cargo.toml](codex-rs/exec/Cargo.toml)
- [codex-rs/exec/src/cli.rs](codex-rs/exec/src/cli.rs)
- [codex-rs/exec/src/lib.rs](codex-rs/exec/src/lib.rs)
- [codex-rs/tui/Cargo.toml](codex-rs/tui/Cargo.toml)
- [codex-rs/tui/src/cli.rs](codex-rs/tui/src/cli.rs)
- [codex-rs/tui/src/lib.rs](codex-rs/tui/src/lib.rs)

</details>

This page documents the implementation of Codex's sandboxing system, which provides platform-specific process isolation by wrapping commands with OS-specific sandbox mechanisms. The system transforms high-level `SandboxPolicy` specifications into platform-specific sandbox wrappers (Seatbelt on macOS, Landlock+seccomp on Linux, Restricted Token on Windows) or no sandboxing (`SandboxType::None`).

For approval policy integration, see page 5.5. For the overall tool execution pipeline, see page 5.3.

---

## Overview

The sandboxing implementation consists of three layers:

1. **Policy Layer**: High-level `SandboxPolicy` enum defined in the protocol (ReadOnly, WorkspaceWrite, DangerFullAccess, ExternalSandbox)
2. **Writable Roots Computation**: Logic to compute which directories are writable, including special handling for `.git` protection
3. **Platform Sandbox Layer**: OS-specific `SandboxType` selection and command wrapping

**Core Data Flow:**

```mermaid
graph TB
    SandboxPolicy["SandboxPolicy<br/>(protocol.rs)"]
    GetWritableRoots["get_writable_roots_with_cwd()"]
    WritableRoot["WritableRoot<br/>{root, read_only_subpaths}"]
    SandboxManager["SandboxManager"]
    SandboxType["SandboxType<br/>(None, MacosSeatbelt,<br/>LinuxSeccomp, WindowsRestrictedToken)"]
    Transform["transform()"]
    ExecEnv["ExecEnv"]

    SandboxPolicy --> GetWritableRoots
    GetWritableRoots --> WritableRoot
    SandboxPolicy --> SandboxManager
    SandboxManager --> SandboxType
    SandboxType --> Transform
    WritableRoot --> Transform
    Transform --> ExecEnv
```

Sources: [codex-rs/protocol/src/protocol.rs:379-426](), [codex-rs/protocol/src/protocol.rs:433-457]()

---

## SandboxPolicy Enum

The `SandboxPolicy` enum is defined in `protocol.rs` and represents the high-level security policy:

```mermaid
graph TB
    SandboxPolicy["enum SandboxPolicy"]
    DangerFullAccess["DangerFullAccess"]
    ReadOnly["ReadOnly"]
    ExternalSandbox["ExternalSandbox<br/>{network_access}"]
    WorkspaceWrite["WorkspaceWrite<br/>{writable_roots,<br/>network_access,<br/>exclude_tmpdir_env_var,<br/>exclude_slash_tmp}"]

    SandboxPolicy --> DangerFullAccess
    SandboxPolicy --> ReadOnly
    SandboxPolicy --> ExternalSandbox
    SandboxPolicy --> WorkspaceWrite
```

| Variant            | File Access                              | Network      | Writable Roots                               |
| ------------------ | ---------------------------------------- | ------------ | -------------------------------------------- |
| `DangerFullAccess` | Unrestricted                             | Enabled      | N/A (no sandbox)                             |
| `ReadOnly`         | Read-only everywhere                     | Disabled     | Empty                                        |
| `ExternalSandbox`  | Full (assumes external sandbox)          | Configurable | Empty                                        |
| `WorkspaceWrite`   | Read everywhere, write in computed roots | Configurable | Computed via `get_writable_roots_with_cwd()` |

**Key Methods:**

- `has_full_disk_read_access()` - Always returns `true` (read access not restricted)
- `has_full_disk_write_access()` - Returns `true` for `DangerFullAccess` and `ExternalSandbox`
- `has_full_network_access()` - Checks policy variant and `network_access` field
- `get_writable_roots_with_cwd(cwd)` - Computes `Vec<WritableRoot>` for the given working directory

Sources: [codex-rs/protocol/src/protocol.rs:379-426](), [codex-rs/protocol/src/protocol.rs:486-622]()

---

## Writable Roots Computation

The `get_writable_roots_with_cwd()` method computes which directories are writable under `WorkspaceWrite` policy, including special subpaths that must remain read-only even when the root is writable.

**Computation Algorithm:**

```mermaid
graph TB
    Start["get_writable_roots_with_cwd(cwd)"]
    Start --> InitRoots["roots = writable_roots.clone()"]
    InitRoots --> AddCwd["roots.push(cwd)"]

    AddCwd --> CheckSlashTmp{exclude_slash_tmp?}
    CheckSlashTmp -->|false| AddSlashTmp["roots.push('/tmp')<br/>(Unix only)"]
    CheckSlashTmp -->|true| CheckTmpdir
    AddSlashTmp --> CheckTmpdir

    CheckTmpdir{exclude_tmpdir_env_var?}
    CheckTmpdir -->|false| AddTmpdir["roots.push($TMPDIR)<br/>(if set)"]
    CheckTmpdir -->|true| MapRoots
    AddTmpdir --> MapRoots

    MapRoots["For each root:"]
    MapRoots --> ComputeSubpaths["Compute read_only_subpaths"]

    ComputeSubpaths --> CheckGit{".git exists?"}
    CheckGit -->|dir| AddGitDir["subpaths.push(root/.git)"]
    CheckGit -->|file| ResolveGitdir["resolve_gitdir_from_file()"]
    CheckGit -->|no| CheckAgents

    ResolveGitdir --> AddResolvedGit["subpaths.push(resolved_gitdir)"]
    AddResolvedGit --> AddGitFile["subpaths.push(root/.git)"]
    AddGitFile --> CheckAgents
    AddGitDir --> CheckAgents

    CheckAgents{".agents or<br/>.codex exists?}
    CheckAgents -->|yes| AddCodexDirs["subpaths.push(root/.agents)<br/>subpaths.push(root/.codex)"]
    CheckAgents -->|no| BuildWritableRoot
    AddCodexDirs --> BuildWritableRoot

    BuildWritableRoot["WritableRoot<br/>{root, read_only_subpaths}"]
    BuildWritableRoot --> Return["Vec<WritableRoot>"]
```

**Default Writable Roots** (for `WorkspaceWrite`):

1. **Current Working Directory** (`cwd`): Always included
2. **`/tmp`** (Unix): Included unless `exclude_slash_tmp = true`
3. **`$TMPDIR`**: Included unless `exclude_tmpdir_env_var = true`
4. **Explicit `writable_roots`**: From config, always included

**Exclusion Flags:**

- `exclude_slash_tmp`: When `true`, do not include `/tmp` in writable roots (Linux/macOS)
- `exclude_tmpdir_env_var`: When `true`, do not include `$TMPDIR` in writable roots

Sources: [codex-rs/protocol/src/protocol.rs:511-622]()

---

## .git Protection

A critical security feature is preventing the agent from modifying `.git` directories, which could allow privilege escalation (e.g., modifying `.git/hooks`). The `get_writable_roots_with_cwd()` method automatically identifies `.git` directories and adds them to `read_only_subpaths`.

**Protection Logic:**

```mermaid
graph TB
    Start["For each writable_root"]
    Start --> CheckPath["Check root/.git"]

    CheckPath --> IsFile{".git is file?"}
    CheckPath --> IsDir{".git is dir?"}
    CheckPath --> NotExists["Does not exist"]

    IsFile -->|yes| ReadPointer["Read 'gitdir:' pointer"]
    IsDir -->|yes| AddDir["read_only_subpaths.push<br/>(root/.git)"]
    NotExists --> Done

    ReadPointer --> ParseGitdir["Parse gitdir path"]
    ParseGitdir --> ResolveGitdir["Resolve against root<br/>AbsolutePathBuf::resolve_path_against_base()"]
    ResolveGitdir --> AddResolved["read_only_subpaths.push<br/>(resolved_gitdir)"]
    AddResolved --> AddFile["read_only_subpaths.push<br/>(root/.git)"]

    AddDir --> CheckOther
    AddFile --> CheckOther

    CheckOther["Check .agents and .codex"]
    CheckOther --> AddOther["read_only_subpaths.push<br/>(root/.agents)<br/>(root/.codex)"]

    AddOther --> Done["Return WritableRoot"]
```

**Cases Handled:**

1. **Directory `.git`**: Standard repository
   - Action: Add `root/.git` to `read_only_subpaths`

2. **File `.git`**: Git worktree or submodule
   - Action: Parse `gitdir: <path>` pointer, resolve path, add both the file and resolved directory to `read_only_subpaths`
   - Example: `.git` contains `gitdir: ../.git/modules/mysubmodule`

3. **No `.git`**: Not a git repository
   - Action: No protection needed

**Additional Protected Paths:**

- `.agents/` directory (if exists): Prevents modification of agent skills
- `.codex/` directory (if exists): Prevents modification of Codex configuration

**Helper Functions:**

- `is_git_pointer_file(path)` - Checks if path is a file named `.git`
- `resolve_gitdir_from_file(dot_git)` - Parses `gitdir:` line and resolves the path

Sources: [codex-rs/protocol/src/protocol.rs:575-611](), [codex-rs/protocol/src/protocol.rs:624-679]()

---

## WritableRoot Struct

The `WritableRoot` struct encapsulates a writable root directory and its read-only subpaths:

```rust
pub struct WritableRoot {
    pub root: AbsolutePathBuf,
    pub read_only_subpaths: Vec<AbsolutePathBuf>,
}
```

**Method: `is_path_writable(path)`**

Determines if a given path is writable under this `WritableRoot`:

1. Check if `path` starts with `root` - if not, return `false`
2. For each `subpath` in `read_only_subpaths`:
   - If `path` starts with `subpath`, return `false`
3. Return `true`

This allows the sandbox to grant write access to a root directory while carving out read-only exceptions for sensitive subdirectories.

Sources: [codex-rs/protocol/src/protocol.rs:433-457]()

---

## Platform-Specific Implementations

### macOS: Seatbelt (sandbox-exec)

**Implementation:** `create_seatbelt_command_args()` generates Sandbox Profile Language (SBPL) and wraps the command with `/usr/bin/sandbox-exec`.

```mermaid
graph TB
    SandboxPermissions["SandboxPermissions<br/>{writable_roots,<br/>network_access}"]
    CreateArgs["create_seatbelt_command_args()"]

    SandboxPermissions --> CreateArgs
    CreateArgs --> BuildProfile["Build SBPL profile string"]

    BuildProfile --> AddBase["(version 1)<br/>(deny default)"]
    AddBase --> AddRead["(allow file-read*<br/>(subpath '/'))"]
    AddRead --> AddProcess["(allow process*)"]
    AddProcess --> CheckWrite{writable_roots<br/>empty?}

    CheckWrite -->|no| AddWrite["For each root:<br/>(allow file-write*<br/>(subpath 'root'))<br/>(deny file-write*<br/>(subpath 'subpath'))"]
    CheckWrite -->|yes| AddTmp["(allow file-write*<br/>(subpath '/tmp'))"]

    AddWrite --> CheckNetwork
    AddTmp --> CheckNetwork

    CheckNetwork{network_access?}
    CheckNetwork -->|false| DenyNetwork["(deny network*)"]
    CheckNetwork -->|true| AllowNetwork["(allow network*)"]

    DenyNetwork --> WrapCommand
    AllowNetwork --> WrapCommand

    WrapCommand["Wrap command:<br/>['/usr/bin/sandbox-exec',<br/>'-p', profile,<br/>program, ...args]"]
```

**Environment Variables Set:**

- `CODEX_SANDBOX=seatbelt`
- `CODEX_SANDBOX_NETWORK_DISABLED=1` (if network disabled)

**Debug Command:**

```bash
codex sandbox macos [--full-auto] [--log-denials] -- COMMAND
```

The `--log-denials` flag captures sandbox violations via `log stream` for debugging.

Sources: [codex-rs/cli/src/lib.rs:9-24]()

---

### Linux: Landlock + Seccomp Integration

**Implementation:** Codex uses Landlock (a Linux Security Module) for filesystem access control and seccomp-bpf for system call filtering. The implementation is pure Rust and requires no external dependencies or setuid binaries.

**Architecture:**

Title: **Linux Sandbox Components**

```mermaid
graph TB
    SandboxType["SandboxType::LinuxSeccomp"]
    LandlockMod["codex_core::landlock module"]
    SeccompMod["seccompiler crate"]

    SandboxType --> LandlockMod
    SandboxType --> SeccompMod

    LandlockMod --> LandlockAPI["Landlock Ruleset<br/>landlock::Ruleset"]
    SeccompMod --> SeccompFilter["Seccomp Filter<br/>SeccompFilter"]

    LandlockAPI --> FSRules["Filesystem Rules"]
    FSRules --> ReadRules["Read access:<br/>PathBeneath on root (/)"]
    FSRules --> WriteRules["Write access:<br/>PathBeneath on writable_roots"]

    SeccompFilter --> Syscalls["System Call Filter"]
    Syscalls --> Allow["Allow: standard operations"]
    Syscalls --> Deny["Deny: dangerous syscalls<br/>(e.g., kernel module loading)"]

    ReadRules --> Apply["Apply to process"]
    WriteRules --> Apply
    Allow --> Apply
    Deny --> Apply

    Apply --> Exec["exec(target_command)"]
```

**Landlock Filesystem Policy:**

Landlock creates a filesystem ruleset that restricts what the process can access:

1. **Read Access**: Grant `PathBeneath` access for root `/` (read-only by default)
2. **Write Access**: For each `WritableRoot`, grant `PathBeneath` access with write permissions
3. **Subpath Exclusions**: Remove write permissions for `read_only_subpaths` (e.g., `.git`)
4. **Ruleset Application**: Call `landlock::Ruleset::restrict_self()` before exec

| Landlock Access      | Applied When                                   |
| -------------------- | ---------------------------------------------- | -------------------------- | ---------- | ------------------------- |
| `AccessFs::ReadFile  | ReadDir`                                       | Always (entire filesystem) |
| `AccessFs::WriteFile | MakeDir                                        | RemoveFile                 | RemoveDir` | Only for `writable_roots` |
| (no access)          | For `read_only_subpaths` within writable roots |

**Seccomp System Call Filtering:**

The `seccompiler` crate generates a BPF filter that blocks dangerous system calls while allowing normal operations:

- **Allowed**: `read`, `write`, `open`, `close`, `stat`, `fork`, `exec`, etc.
- **Blocked**: `ptrace`, `init_module`, `delete_module`, `reboot`, etc.

**Debug Command:**

```bash
codex sandbox linux [--full-auto] -- COMMAND
```

**Kernel Version Requirements:**

- Landlock requires Linux kernel 5.13+ (stable in 5.13, improved in 5.15+)
- Seccomp requires Linux kernel 3.5+ (widely available)
- If Landlock is unavailable, falls back to `SandboxType::None` with a warning

**Key Functions:**

- `codex_core::landlock::apply_landlock_policy()` - Applies Landlock ruleset
- `get_platform_sandbox()` - Returns `SandboxType::LinuxSeccomp` on Linux

Sources: [codex-rs/core/Cargo.toml:120-124](), [codex-rs/core/src/lib.rs:47](), [codex-rs/cli/src/main.rs:243-244]()

---

### Windows: Restricted Token

**Implementation:** In-process sandboxing via `codex-windows-sandbox` crate using Windows Restricted Token API.

```mermaid
graph TB
    SandboxType["SandboxType::WindowsRestrictedToken"]
    ExecEnv["ExecEnv"]
    Execute["execute_exec_env()"]

    SandboxType --> ExecEnv
    ExecEnv --> Execute

    Execute --> CheckType{sandbox type?}
    CheckType -->|WindowsRestrictedToken| CreateRestricted["CreateProcessAsUser<br/>with restricted token"]
    CheckType -->|None| NormalSpawn["Normal spawn"]

    CreateRestricted --> StripPrivileges["Strip privileges:<br/>- SeDebugPrivilege<br/>- SeImpersonatePrivilege<br/>- etc."]
    StripPrivileges --> SpawnRestricted["Spawn process<br/>with restricted token"]

    SpawnRestricted --> Process["Sandboxed Process"]
    NormalSpawn --> Process
```

**Feature Flags:**

- `Feature::WindowsSandbox` - Enables standard restricted token sandbox (experimental)
- `Feature::WindowsSandboxElevated` - Enables two-phase elevated sandbox (experimental)

Both features are currently in `UnderDevelopment` stage and disabled by default.

**Debug Command:**

```bash
codex sandbox windows [--full-auto] -- COMMAND
```

Sources: [codex-rs/core/src/features.rs:479-489](), [codex-rs/cli/src/lib.rs:40-52]()

---

## SandboxType Enum and Selection

The `SandboxType` enum represents the actual platform-specific sandbox mechanism to use:

```rust
pub enum SandboxType {
    None,
    MacosSeatbelt,
    LinuxSeccomp,
    WindowsRestrictedToken,
}
```

**Selection Logic (`get_platform_sandbox`):**

```mermaid
graph TB
    GetPlatform["get_platform_sandbox(features)"]

    GetPlatform --> CheckOS{Operating System?}

    CheckOS -->|macOS| MacOS["SandboxType::MacosSeatbelt"]
    CheckOS -->|Linux| Linux["SandboxType::LinuxSeccomp"]
    CheckOS -->|Windows| CheckWindowsFeature{WindowsSandbox<br/>feature?}
    CheckOS -->|Other| None1["SandboxType::None"]

    CheckWindowsFeature -->|enabled| Windows["SandboxType::WindowsRestrictedToken"]
    CheckWindowsFeature -->|disabled| None2["SandboxType::None"]

    MacOS --> Return
    Linux --> Return
    Windows --> Return
    None1 --> Return
    None2 --> Return

    Return["Return SandboxType"]
```

**`SandboxManager::select_initial()` Method:**

```mermaid
graph TB
    SelectInitial["select_initial(policy,<br/>sandboxable_pref,<br/>features)"]

    SelectInitial --> CheckPref{sandboxable_pref?}

    CheckPref -->|Forbid| None1["SandboxType::None"]
    CheckPref -->|Require| GetPlatform1["get_platform_sandbox(features)"]
    CheckPref -->|Auto| CheckPolicy{policy?}

    CheckPolicy -->|DangerFullAccess| None2["SandboxType::None"]
    CheckPolicy -->|ExternalSandbox| None3["SandboxType::None"]
    CheckPolicy -->|ReadOnly<br/>WorkspaceWrite| GetPlatform2["get_platform_sandbox(features)"]

    GetPlatform1 --> Return
    GetPlatform2 --> Return
    None1 --> Return
    None2 --> Return
    None3 --> Return

    Return["Return SandboxType"]
```

**`SandboxablePreference` Values:**

- `Forbid` - Tool cannot be sandboxed (e.g., `apply_patch` needs direct file access)
- `Require` - Tool must be sandboxed
- `Auto` - Use sandbox based on policy

Sources: [codex-rs/protocol/src/protocol.rs:379-426]()

---

## SandboxManager Transform Pipeline

The `SandboxManager::transform()` method converts a `CommandSpec` into an `ExecEnv` by wrapping the command with platform-specific sandbox wrappers.

**Transform Flow:**

```mermaid
graph TB
    CommandSpec["CommandSpec"]
    Transform["SandboxManager::transform(spec, type)"]

    CommandSpec --> Transform

    Transform --> SetEnv["Set environment variables"]
    SetEnv --> CheckNetwork{network_access<br/>disabled?}
    CheckNetwork -->|yes| AddNetEnv["env['CODEX_SANDBOX_NETWORK_DISABLED'] = '1'"]
    CheckNetwork -->|no| WrapSwitch
    AddNetEnv --> WrapSwitch

    WrapSwitch{sandbox_type?}

    WrapSwitch -->|None| Passthrough["command = [program, ...args]"]
    WrapSwitch -->|MacosSeatbelt| CallSeatbelt["create_seatbelt_command_args()"]
    WrapSwitch -->|LinuxSeccomp| CallLinux["create_linux_sandbox_command_args()"]
    WrapSwitch -->|WindowsRestrictedToken| Passthrough2["command = [program, ...args]<br/>(handled during spawn)"]

    CallSeatbelt --> SeatbeltWrap["command = ['/usr/bin/sandbox-exec',<br/>'-p', profile, program, ...args]<br/>env['CODEX_SANDBOX'] = 'seatbelt'"]
    CallLinux --> LinuxWrap["command = [wrapper_path,<br/>...policy_args, '--',<br/>program, ...args]"]

    Passthrough --> BuildExecEnv
    Passthrough2 --> BuildExecEnv
    SeatbeltWrap --> BuildExecEnv
    LinuxWrap --> BuildExecEnv

    BuildExecEnv["ExecEnv {<br/>  command,<br/>  cwd,<br/>  env,<br/>  sandbox: sandbox_type,<br/>  permissions,<br/>  arg0<br/>}"]
```

**`CommandSpec` Structure:**

| Field                 | Type                      | Description                                |
| --------------------- | ------------------------- | ------------------------------------------ |
| `program`             | `String`                  | Executable name or path                    |
| `args`                | `Vec<String>`             | Command arguments                          |
| `cwd`                 | `PathBuf`                 | Working directory                          |
| `env`                 | `HashMap<String, String>` | Environment variables                      |
| `sandbox_permissions` | `SandboxPermissions`      | Computed writable roots and network access |
| `justification`       | `Option<String>`          | Optional execution reason                  |

**`SandboxPermissions` Structure:**

| Field            | Type                | Description                                              |
| ---------------- | ------------------- | -------------------------------------------------------- |
| `writable_roots` | `Vec<WritableRoot>` | Directories that can be written, with read-only subpaths |
| `network_access` | `bool`              | Whether network access is allowed                        |

**`ExecEnv` Structure:**

| Field                   | Type                          | Description                                       |
| ----------------------- | ----------------------------- | ------------------------------------------------- |
| `command`               | `Vec<String>`                 | Full command with sandbox wrapper (if applicable) |
| `cwd`                   | `PathBuf`                     | Working directory                                 |
| `env`                   | `HashMap<String, String>`     | Environment variables                             |
| `sandbox`               | `SandboxType`                 | Selected sandbox type                             |
| `windows_sandbox_level` | `Option<WindowsSandboxLevel>` | Windows-specific sandbox level                    |
| `arg0`                  | `Option<OsString>`            | Override for process name (used by Linux sandbox) |

Sources: [codex-rs/protocol/src/protocol.rs:379-426]()

---

## Execution and Denial Detection

### Execution Pipeline

Once an `ExecEnv` is constructed, it is passed to the execution layer (Unified Exec or Shell handler). The execution flow differs based on `SandboxType`:

```mermaid
sequenceDiagram
    participant Tool as Tool Handler
    participant Orchestrator as ToolOrchestrator
    participant SandboxMgr as SandboxManager
    participant Exec as execute_exec_env()
    participant Spawn as Spawn Process

    Tool->>Orchestrator: Execute tool
    Orchestrator->>SandboxMgr: select_initial()
    SandboxMgr-->>Orchestrator: SandboxType

    Orchestrator->>SandboxMgr: transform(CommandSpec)
    SandboxMgr-->>Orchestrator: ExecEnv

    Orchestrator->>Exec: execute_exec_env(ExecEnv)

    alt Windows + RestrictedToken
        Exec->>Spawn: CreateProcessAsUser<br/>(restricted token)
    else macOS + MacosSeatbelt
        Exec->>Spawn: spawn([sandbox-exec, -p, profile, program, args])
    else Linux + LinuxSeccomp
        Exec->>Spawn: spawn([wrapper, ...policy, --, program, args])
    else None
        Exec->>Spawn: spawn([program, args])
    end

    Spawn-->>Exec: Process + output
    Exec-->>Orchestrator: ExecToolCallOutput

    Orchestrator->>SandboxMgr: denied(sandbox, output)?
    SandboxMgr-->>Orchestrator: bool

    alt Is denial + on-failure policy
        Orchestrator->>Tool: Escalate for approval
    else Normal execution
        Orchestrator->>Tool: Return output
    end
```

Sources: [codex-rs/protocol/src/protocol.rs:379-426]()

---

## Sandbox Denial Detection and Retry Logic

The sandboxing system includes automatic detection of sandbox-related failures and a retry mechanism that can escalate to user approval.

### Detection Implementation

Title: **Sandbox Denial Detection Flow**

```mermaid
graph TB
    ExecOutput["ExecToolCallOutput"]
    CheckDenied["sandbox_manager.denied()?"]

    ExecOutput --> CheckDenied

    CheckDenied --> AnalyzeExit{exit_code == 1?}
    AnalyzeExit -->|no| NotDenied["Return false"]
    AnalyzeExit -->|yes| AnalyzeStderr["Analyze stderr patterns"]

    AnalyzeStderr --> CheckMacOS{macOS patterns?}
    AnalyzeStderr --> CheckLinux{Linux patterns?}
    AnalyzeStderr --> CheckWindows{Windows patterns?}

    CheckMacOS -->|match| MacOSPatterns["'Operation not permitted'<br/>'Sandbox:'<br/>'sandbox-exec:'"]
    CheckLinux -->|match| LinuxPatterns["'Permission denied'<br/>'EACCES'<br/>'EPERM'<br/>'Landlock'"]
    CheckWindows -->|match| WindowsPatterns["'Access is denied'<br/>Win32 error codes"]

    MacOSPatterns --> Denied["Return true"]
    LinuxPatterns --> Denied
    WindowsPatterns --> Denied

    CheckMacOS -->|no match| NotDenied
    CheckLinux -->|no match| NotDenied
    CheckWindows -->|no match| NotDenied
```

**Detection Heuristics by Platform:**

| Platform       | Exit Code | stderr Patterns                                              | Additional Checks                  |
| -------------- | --------- | ------------------------------------------------------------ | ---------------------------------- |
| macOS Seatbelt | 1 or 126  | `"Operation not permitted"`, `"Sandbox:"`, `"sandbox-exec:"` | Check for Seatbelt-specific errors |
| Linux Landlock | 1         | `"Permission denied"`, `"EACCES"`, `"EPERM"`, `"Landlock"`   | Check for filesystem access errors |
| Windows Token  | 1         | `"Access is denied"`, Win32 error codes                      | Check for security token errors    |

### Retry and Escalation Flow

Title: **Sandbox Retry with Approval Flow**

```mermaid
sequenceDiagram
    participant Tool as Tool Handler
    participant Orch as ToolOrchestrator
    participant Sandbox as SandboxManager
    participant Exec as Execution Layer
    participant User as User Approval

    Tool->>Orch: Execute tool call
    Orch->>Sandbox: select_initial(policy)
    Sandbox-->>Orch: SandboxType::LinuxSeccomp

    Orch->>Sandbox: transform(CommandSpec)
    Sandbox-->>Orch: ExecEnv (sandboxed)

    Orch->>Exec: execute(ExecEnv)
    Exec-->>Orch: ExecToolCallOutput (exit_code=1)

    Orch->>Sandbox: denied(sandbox_type, output)?
    Sandbox-->>Orch: true

    alt approval_policy == OnFailure
        Orch->>User: ExecApprovalRequestEvent
        Note over User: Show command + error + context
        User-->>Orch: ReviewDecision::Approved

        Orch->>Sandbox: transform(CommandSpec, force_none=true)
        Sandbox-->>Orch: ExecEnv (no sandbox)

        Orch->>Exec: execute(ExecEnv)
        Exec-->>Orch: ExecToolCallOutput (success)
    else approval_policy == Never
        Note over Orch: Return original failure
    end

    Orch-->>Tool: ExecToolCallOutput
```

**Retry Policy Conditions:**

The retry mechanism activates when:

1. **Denial Detected**: `sandbox_manager.denied()` returns `true`
2. **Policy Allows**: `approval_policy` is `AskForApproval::OnFailure` or `AskForApproval::OnRequest`
3. **First Attempt**: This is the initial sandboxed execution (prevents infinite retry loops)

**Approval Request Contents:**

When escalating to the user, the `ExecApprovalRequestEvent` includes:

| Field           | Description                     |
| --------------- | ------------------------------- |
| `command`       | Full command that was executed  |
| `cwd`           | Working directory               |
| `exit_code`     | Exit code from failed execution |
| `stderr`        | Error output showing denial     |
| `sandbox_type`  | Which sandbox caused the denial |
| `justification` | Optional explanation from agent |

**Re-execution Behavior:**

If user approves:

1. Set `sandbox_type = SandboxType::None` for this execution only
2. Add `CODEX_ESCALATED=1` to environment variables (for auditing)
3. Execute command without sandbox restrictions
4. Return output to model
5. **Do not** change session-level sandbox policy (next command still sandboxed)

This temporary escalation approach ensures:

- Security by default (most operations sandboxed)
- User control (explicit approval required)
- No permanent policy degradation (each command evaluated independently)

**Key Implementation Functions:**

- `ToolOrchestrator::execute_with_approval()` - Orchestrates retry logic
- `SandboxManager::denied()` - Detects sandbox denials
- `SandboxManager::transform(..., force_none)` - Disables sandbox for retry

Sources: [codex-rs/core/src/tools/handlers/mod.rs:1-148](), [codex-rs/protocol/src/protocol.rs:379-426]()

---

## Environment Variables

The sandbox implementation uses environment variables for configuration and introspection:

| Variable                         | Value        | Purpose                                    | Set By                                        |
| -------------------------------- | ------------ | ------------------------------------------ | --------------------------------------------- |
| `CODEX_SANDBOX`                  | `"seatbelt"` | Indicates macOS Seatbelt sandbox is active | `create_seatbelt_command_args()`              |
| `CODEX_SANDBOX_NETWORK_DISABLED` | `"1"`        | Signals network access is disabled         | `SandboxManager::transform()` (all platforms) |
| `CODEX_CI`                       | `"1"`        | Indicates execution in CI-like environment | Unified exec environment setup                |
| `NO_COLOR`                       | `"1"`        | Disable color output                       | Unified exec environment setup                |
| `TERM`                           | `"dumb"`     | Set terminal to dumb mode                  | Unified exec environment setup                |

**Unified Exec Environment:**

The `UNIFIED_EXEC_ENV` constant in `codex-rs/core/src/unified_exec/process_manager.rs` defines a standard environment for PTY-based processes:

```rust
const UNIFIED_EXEC_ENV: [(&str, &str); 10] = [
    ("NO_COLOR", "1"),
    ("TERM", "dumb"),
    ("LANG", "C.UTF-8"),
    ("LC_CTYPE", "C.UTF-8"),
    ("LC_ALL", "C.UTF-8"),
    ("COLORTERM", ""),
    ("PAGER", "cat"),
    ("GIT_PAGER", "cat"),
    ("GH_PAGER", "cat"),
    ("CODEX_CI", "1"),
];
```

These variables ensure consistent, parseable output from commands executed in sandboxed environments.

**Usage:**

Processes can check these variables to detect they are running in a Codex sandbox and adapt behavior accordingly (e.g., skip network-dependent features, use alternative temp directories, disable colored output).

Sources: [codex-rs/core/src/unified_exec/process_manager.rs:56-67]()

---

## Build Pipeline and Cross-Platform Validation

The sandboxing implementation is validated across multiple platforms in CI/CD:

**CI Validation Matrix:**

```mermaid
graph TB
    CI["rust-ci.yml"]

    CI --> MacOS["macOS builds<br/>aarch64-apple-darwin<br/>x86_64-apple-darwin"]
    CI --> Linux["Linux builds<br/>x86_64-unknown-linux-gnu/musl<br/>aarch64-unknown-linux-gnu/musl"]
    CI --> Windows["Windows builds<br/>x86_64-pc-windows-msvc<br/>aarch64-pc-windows-msvc"]

    MacOS --> SeatbeltTest["Test: Seatbelt sandbox"]
    Linux --> BwrapTest["Test: Vendored bubblewrap"]
    Windows --> TokenTest["Test: Restricted token"]

    SeatbeltTest --> ClippyTest["cargo clippy"]
    BwrapTest --> ClippyTest
    TokenTest --> ClippyTest

    ClippyTest --> NexTest["cargo nextest run"]
```

**Build Requirements Per Platform:**

| Platform | Dependencies                                        | Purpose                                     |
| -------- | --------------------------------------------------- | ------------------------------------------- |
| Linux    | `landlock` (Rust crate), `seccompiler` (Rust crate) | Landlock + seccomp filtering (kernel 5.13+) |
| macOS    | None (uses system Seatbelt via `sandbox-exec`)      | N/A                                         |
| Windows  | MSVC toolchain                                      | Windows security token API                  |

**Target Configuration:**

All platform sandboxes are implemented in pure Rust with no external C dependencies. Linux sandboxing uses:

- `landlock` crate (v0.4.4) - Safe Rust bindings to Landlock LSM
- `seccompiler` crate (v0.5.0) - Seccomp-BPF filter generation

**musl Target Support:**

The Linux sandbox works on both glibc and musl targets (`x86_64-unknown-linux-musl`, `aarch64-unknown-linux-musl`) since it only depends on kernel features (Landlock, seccomp) rather than C libraries.

Sources: [codex-rs/core/Cargo.toml:120-124](), [codex-rs/Cargo.toml:206-246]()

---

## Testing and Debugging

Codex provides CLI subcommands to test sandbox behavior interactively:

```bash
# macOS: Run command under Seatbelt
codex sandbox macos [--full-auto] [--log-denials] -- COMMAND

# Linux: Run command under vendored bubblewrap
codex sandbox linux [--full-auto] -- COMMAND

# Windows: Run command under Restricted Token
codex sandbox windows [--full-auto] -- COMMAND
```

**`--full-auto` Flag:**

Applies a preconfigured "safe automatic" policy for testing:

- Sandbox mode: `workspace-write`
- Approval policy: `never` (auto-approve within sandbox constraints)
- Network: disabled

**`--log-denials` Flag (macOS only):**

Captures sandbox denials via `log stream` and prints them after command exits, useful for debugging unexpected permission errors.

**Integration Tests:**

The `codex-rs/core/tests/suite/unified_exec.rs` test suite validates sandbox behavior:

```mermaid
graph TB
    TestSuite["unified_exec.rs tests"]

    TestSuite --> TestApplyPatch["unified_exec_intercepts_<br/>apply_patch_exec_command"]
    TestSuite --> TestBeginEvent["unified_exec_emits_<br/>exec_command_begin_event"]
    TestSuite --> TestWorkdir["unified_exec_resolves_<br/>relative_workdir"]
    TestSuite --> TestLifecycle["unified_exec_full_lifecycle_<br/>with_background_end_event"]

    TestApplyPatch --> CheckSandbox{Skip if sandboxed?}
    TestBeginEvent --> CheckSandbox
    TestWorkdir --> CheckSandbox
    TestLifecycle --> CheckSandbox

    CheckSandbox -->|skip_if_sandbox!| SkipTest["Skip test"]
    CheckSandbox -->|not sandboxed| RunTest["Run test"]

    RunTest --> BuildRequest["Build ExecCommandRequest<br/>with SandboxPermissions"]
    BuildRequest --> Exec["Execute via unified_exec_manager"]
    Exec --> Validate["Validate output/events"]
```

The `skip_if_sandbox!()` macro conditionally skips tests when running inside a sandbox environment (detected via CI environment variables), as nested sandboxing is not supported.

**Example Command Transformations:**

| Original            | Transformed (WorkspaceWrite)                        | Platform |
| ------------------- | --------------------------------------------------- | -------- |
| `/bin/ls /tmp`      | `/usr/bin/sandbox-exec -p '<profile>' /bin/ls /tmp` | macOS    |
| `python3 script.py` | Landlock applied in-process before exec             | Linux    |
| `cmd.exe /c dir`    | Spawned with restricted security token              | Windows  |

**Note:** Unlike macOS which wraps with `sandbox-exec`, Linux's Landlock applies restrictions in the same process before calling `exec()`, so the command arguments remain unchanged.

Sources: [codex-rs/core/tests/suite/unified_exec.rs:27-30](), [codex-rs/core/tests/suite/unified_exec.rs:160-285]()

---

## Summary

The Codex sandboxing system provides a multi-layered security architecture:

1. **Policy Layer**: High-level security postures (`ReadOnly`, `WorkspaceWrite`, `DangerFullAccess`)
2. **Platform Layer**: OS-specific implementations (Seatbelt, Landlock+seccomp, Restricted Token)
3. **Management Layer**: `SandboxManager` orchestrates selection and transformation
4. **Integration Layer**: Tight coupling with approval policies and tool orchestration

This architecture enables safe AI agent operation while maintaining flexibility for users who need reduced restrictions in trusted environments.
