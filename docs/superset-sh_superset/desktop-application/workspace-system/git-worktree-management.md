# Git Worktree Management

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [apps/desktop/src/lib/trpc/routers/changes/git-operations.ts](apps/desktop/src/lib/trpc/routers/changes/git-operations.ts)
- [apps/desktop/src/lib/trpc/routers/changes/utils/pull-request-url.ts](apps/desktop/src/lib/trpc/routers/changes/utils/pull-request-url.ts)
- [apps/desktop/src/lib/trpc/routers/workspaces/utils/git.test.ts](apps/desktop/src/lib/trpc/routers/workspaces/utils/git.test.ts)
- [apps/desktop/src/lib/trpc/routers/workspaces/utils/git.ts](apps/desktop/src/lib/trpc/routers/workspaces/utils/git.ts)
- [apps/desktop/src/lib/trpc/routers/workspaces/utils/github/github.test.ts](apps/desktop/src/lib/trpc/routers/workspaces/utils/github/github.test.ts)
- [apps/desktop/src/lib/trpc/routers/workspaces/utils/github/github.ts](apps/desktop/src/lib/trpc/routers/workspaces/utils/github/github.ts)
- [apps/desktop/src/lib/trpc/routers/workspaces/utils/github/types.ts](apps/desktop/src/lib/trpc/routers/workspaces/utils/github/types.ts)
- [apps/desktop/src/lib/trpc/routers/workspaces/utils/upstream-ref.test.ts](apps/desktop/src/lib/trpc/routers/workspaces/utils/upstream-ref.test.ts)
- [apps/desktop/src/lib/trpc/routers/workspaces/utils/upstream-ref.ts](apps/desktop/src/lib/trpc/routers/workspaces/utils/upstream-ref.ts)
- [apps/desktop/src/renderer/screens/main/components/PRIcon/PRIcon.tsx](apps/desktop/src/renderer/screens/main/components/PRIcon/PRIcon.tsx)
- [apps/desktop/src/renderer/screens/main/components/PRIcon/index.ts](apps/desktop/src/renderer/screens/main/components/PRIcon/index.ts)
- [apps/desktop/src/renderer/screens/main/components/WorkspaceSidebar/WorkspaceListItem/components/WorkspaceHoverCard/WorkspaceHoverCard.tsx](apps/desktop/src/renderer/screens/main/components/WorkspaceSidebar/WorkspaceListItem/components/WorkspaceHoverCard/WorkspaceHoverCard.tsx)
- [apps/desktop/src/renderer/screens/main/components/WorkspaceSidebar/WorkspaceListItem/components/WorkspaceHoverCard/components/ReviewStatus/ReviewStatus.tsx](apps/desktop/src/renderer/screens/main/components/WorkspaceSidebar/WorkspaceListItem/components/WorkspaceHoverCard/components/ReviewStatus/ReviewStatus.tsx)
- [apps/desktop/src/renderer/screens/main/hooks/usePRStatus/index.ts](apps/desktop/src/renderer/screens/main/hooks/usePRStatus/index.ts)
- [apps/desktop/src/renderer/screens/main/hooks/usePRStatus/usePRStatus.ts](apps/desktop/src/renderer/screens/main/hooks/usePRStatus/usePRStatus.ts)
- [packages/host-service/src/git/createGitFactory/createGitFactory.ts](packages/host-service/src/git/createGitFactory/createGitFactory.ts)
- [scripts/check-desktop-git-env.sh](scripts/check-desktop-git-env.sh)

</details>

## Purpose and Scope

This document describes the Git worktree management system in Superset. Worktrees enable multiple working directories for the same repository, allowing parallel development on different branches without the overhead of full repository clones. This is essential for Superset's core use case: running multiple CLI coding agents in parallel, each in its own isolated worktree.

This page covers worktree creation, branch naming, removal, and safety validation. For project-level Git operations, see [Projects and Git Repositories](#2.6.1). For workspace lifecycle management that uses worktrees, see [Workspace Creation and Lifecycle](#2.6.3). For broader Git operations like status and checkout, see [Git Operations and Safety](#2.6.4).

**Sources:** [apps/desktop/src/lib/trpc/routers/workspaces/utils/git.ts:1-1077]()

---

## Worktree Creation Process

### createWorktree Function

The `createWorktree` function creates a new Git worktree with a new branch starting from a specified commit. It uses post-checkout hook tolerance to continue even if Git hooks fail after the worktree is created.

```mermaid
graph TB
    Input["createWorktree(mainRepoPath,<br/>branch, worktreePath, startPoint)"]

    CreateDir["mkdir(parentDir)<br/>Ensure parent directory exists"]

    ExecWorktree["execWorktreeAdd()<br/>with hook tolerance"]

    BuildArgs["git -C mainRepoPath<br/>worktree add worktreePath<br/>-b branch<br/>startPoint^{commit}"]

    RunWithTolerance["runWithPostCheckoutHookTolerance()"]

    GitCommand["execGitWithShellPath(args)"]

    HookFails{"Hook exits<br/>non-zero?"}

    CheckRegistered["isWorktreeRegistered()<br/>Check git worktree list"]

    IsRegistered{"Worktree in<br/>git worktree list?"}

    ConfigAutoSetup["git config --local<br/>push.autoSetupRemote true"]

    Success["Worktree created<br/>Ready to use"]

    ThrowError["Throw original error"]

    ErrorHandler["Catch & categorize error"]
    LockError["Lock file error<br/>Suggest waiting or manual cleanup"]
    GenericError["Pass through<br/>error message"]

    Input --> CreateDir
    CreateDir --> ExecWorktree
    ExecWorktree --> BuildArgs
    BuildArgs --> RunWithTolerance
    RunWithTolerance --> GitCommand
    GitCommand -->|Success| ConfigAutoSetup
    GitCommand -->|Error| HookFails
    HookFails -->|Yes| CheckRegistered
    HookFails -->|No| ErrorHandler
    CheckRegistered --> IsRegistered
    IsRegistered -->|Yes| ConfigAutoSetup
    IsRegistered -->|No| ThrowError
    ConfigAutoSetup --> Success
    ErrorHandler --> LockError
    ErrorHandler --> GenericError
```

**Sources:** [apps/desktop/src/lib/trpc/routers/workspaces/utils/git.ts:457-519]()

### Post-Checkout Hook Tolerance

The `runWithPostCheckoutHookTolerance` helper handles a common edge case: Git's post-checkout hook can fail after successfully creating the worktree. This happens when hooks perform non-critical operations (like updating node_modules) that fail but shouldn't block worktree creation.

The tolerance mechanism:

1. Runs the Git command (e.g., `git worktree add`)
2. If the command fails, checks if the worktree was actually created successfully
3. If created, logs a warning but continues; otherwise, throws the error

```mermaid
graph TB
    Run["runWithPostCheckoutHookTolerance(config)"]

    Execute["config.run()<br/>Execute git command"]

    Success["Command succeeds"]

    Error["Command fails"]

    DidSucceed["config.didSucceed()<br/>Check if operation succeeded<br/>despite hook failure"]

    ActuallySucceeded{"Operation<br/>succeeded?"}

    LogWarn["console.warn()<br/>Log hook failure warning<br/>Continue execution"]

    ThrowError["throw error<br/>Operation truly failed"]

    Return["return void"]

    Run --> Execute
    Execute -->|No error| Success
    Execute -->|Error thrown| Error
    Success --> Return
    Error --> DidSucceed
    DidSucceed --> ActuallySucceeded
    ActuallySucceeded -->|Yes| LogWarn
    ActuallySucceeded -->|No| ThrowError
    LogWarn --> Return
```

**Sources:** [apps/desktop/src/lib/trpc/routers/utils/git-hook-tolerance.ts:1-38](), [apps/desktop/src/lib/trpc/routers/workspaces/utils/git.ts:84-122]()

### The ^{commit} Suffix Pattern

The `createWorktree` function appends `^{commit}` to the `startPoint` parameter, forcing Git to dereference it to a commit SHA rather than treating it as a branch reference.

```javascript
// From createWorktree at line 480
;`${startPoint}^{commit}`
```

This prevents automatic upstream tracking. Without this suffix, `-b newBranch origin/main` would set `origin/main` as the upstream branch, which would:

- Allow accidental pushes to protected branches
- Confuse the tracking status of the new local branch
- Bypass the explicit `push.autoSetupRemote` configuration

**Sources:** [apps/desktop/src/lib/trpc/routers/workspaces/utils/git.ts:469-480]()

### createWorktreeFromExistingBranch Function

This variant creates a worktree for an already-existing branch (local or remote) without creating a new branch:

```mermaid
graph TB
    Input["createWorktreeFromExistingBranch()<br/>mainRepoPath, branch, worktreePath"]

    CreateDir["mkdir(parentDir)"]

    GetGit["getSimpleGitWithShellPath()<br/>Get git instance"]

    ListLocal["git.branchLocal()<br/>Check if branch exists locally"]

    BranchLocal{"Branch exists<br/>locally?"}

    AddLocal["execWorktreeAdd()<br/>worktree add worktreePath branch"]

    ListRemote["git.branch(['-r'])<br/>List remote branches"]

    BranchRemote{"origin/branch<br/>exists?"}

    AddTracking["execWorktreeAdd()<br/>worktree add --track<br/>-b branch worktreePath<br/>origin/branch"]

    ThrowNotFound["throw Error:<br/>Branch does not exist<br/>locally or remotely"]

    CheckAlreadyOut{"Error:<br/>'already checked out'?"}

    ThrowAlreadyOut["throw Error:<br/>Branch already in use<br/>by another worktree"]

    ConfigAuto["git config<br/>push.autoSetupRemote true"]

    Success["Worktree created<br/>from existing branch"]

    Input --> CreateDir
    CreateDir --> GetGit
    GetGit --> ListLocal
    ListLocal --> BranchLocal
    BranchLocal -->|Yes| AddLocal
    BranchLocal -->|No| ListRemote
    ListRemote --> BranchRemote
    BranchRemote -->|Yes| AddTracking
    BranchRemote -->|No| ThrowNotFound
    AddLocal -->|Success| ConfigAuto
    AddTracking -->|Success| ConfigAuto
    AddLocal -->|Error| CheckAlreadyOut
    AddTracking -->|Error| CheckAlreadyOut
    CheckAlreadyOut -->|Yes| ThrowAlreadyOut
    CheckAlreadyOut -->|No| ThrowNotFound
    ConfigAuto --> Success
```

This function is used when opening an existing workspace or linking to a PR's branch that already exists.

**Sources:** [apps/desktop/src/lib/trpc/routers/workspaces/utils/git.ts:521-619]()

### Auto-Setup Remote Configuration

Both `createWorktree` and `createWorktreeFromExistingBranch` configure `push.autoSetupRemote` in the new worktree. This Git config option automatically runs `git push -u origin <branch>` on the first push, eliminating the need for manual upstream setup.

```bash
# Set in worktree at line 487-490 and 574-577
git config --local push.autoSetupRemote true
```

This makes the first `git push` in the worktree create the remote branch and set upstream tracking automatically.

**Sources:** [apps/desktop/src/lib/trpc/routers/workspaces/utils/git.ts:486-490](), [apps/desktop/src/lib/trpc/routers/workspaces/utils/git.ts:574-579]()

### Error Categorization

Both worktree creation functions categorize errors to provide actionable feedback:

| Error Pattern                                                  | User Message                                                                                 | When It Occurs                                                |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `could not lock`, `unable to lock`, `.lock` with `file exists` | Git repository is locked by another process. Wait for other operations or remove lock files. | Another Git command is running, or a previous command crashed |
| `already checked out`                                          | Branch is already checked out in another worktree. Each branch can only be in one worktree.  | User tries to create multiple worktrees for the same branch   |

**Sources:** [apps/desktop/src/lib/trpc/routers/workspaces/utils/git.ts:495-518](), [apps/desktop/src/lib/trpc/routers/workspaces/utils/git.ts:584-617]()

---

## Branch Name Generation

The `generateBranchName` function creates unique, human-friendly branch names using the `friendly-words` library, optionally prefixed with an author identifier.

### Branch Prefix Modes

The system supports multiple prefix modes controlled by the `BranchPrefixMode` setting:

| Mode               | Behavior                                 | Example                |
| ------------------ | ---------------------------------------- | ---------------------- |
| `"auto"` (default) | GitHub username → Git author name → none | `username/happy-dog`   |
| `"author"`         | Git author name (sanitized)              | `john-smith/happy-dog` |
| `"custom"`         | User-defined custom prefix               | `feature/happy-dog`    |
| `"none"`           | No prefix                                | `happy-dog`            |

The `getBranchPrefix` function resolves the mode to an actual prefix string:

```mermaid
graph TB
    GetPrefix["getBranchPrefix(repoPath,<br/>mode, customPrefix)"]

    CheckMode{"mode?"}

    None["return null"]
    Custom["return customPrefix || null"]

    Author["getGitAuthorName(repoPath)"]
    SanitizeAuthor["sanitizeAuthorPrefix(authorName)"]
    ReturnAuthor["return sanitized author"]

    GetGitHub["getGitHubUsername(repoPath)"]
    HasGitHub{"GitHub<br/>username?"}
    ReturnGH["return ghUsername"]

    GetGitAuthor["getGitAuthorName(repoPath)"]
    HasAuthor{"Git author<br/>name?"}
    ReturnGitAuthor["return gitAuthor"]

    ReturnNull["return null"]

    GetPrefix --> CheckMode
    CheckMode -->|"none"| None
    CheckMode -->|"custom"| Custom
    CheckMode -->|"author"| Author
    Author --> SanitizeAuthor
    SanitizeAuthor --> ReturnAuthor

    CheckMode -->|"auto" or default| GetGitHub
    GetGitHub --> HasGitHub
    HasGitHub -->|Yes| ReturnGH
    HasGitHub -->|No| GetGitAuthor
    GetGitAuthor --> HasAuthor
    HasAuthor -->|Yes| ReturnGitAuthor
    HasAuthor -->|No| ReturnNull
```

**Sources:** [apps/desktop/src/lib/trpc/routers/workspaces/utils/git.ts:363-403]()

### GitHub Username Resolution

The `getGitHubUsername` function queries the GitHub CLI (`gh`) to get the authenticated user's login:

```bash
# Executed at line 345-349
gh api user --jq .login
```

Results are cached for 5 minutes to avoid repeated API calls. If `gh` is not installed or not authenticated, the function falls back to Git author name.

**Sources:** [apps/desktop/src/lib/trpc/routers/workspaces/utils/git.ts:328-361]()

### Generation Algorithm with Prefix

```mermaid
graph TB
    Start["generateBranchName(existingBranches,<br/>authorPrefix)"]

    GetWords["friendlyWords.predicates<br/>friendlyWords.objects"]
    BuildSet["new Set(existingBranches<br/>.map(toLowerCase))"]

    CheckPrefixCollision{"authorPrefix itself<br/>already exists?"}

    UseSafePrefix["safePrefix = authorPrefix"]
    NoPrefix["safePrefix = undefined"]

    TryTwoWord["Attempt 1-10:<br/>Random predicate-object<br/>(e.g., happy-dog)"]
    AddPrefix["addPrefix(name)<br/>prefix ? prefix/name : name"]

    CheckUnique{"Unique?"}
    ReturnName["return prefixed name"]

    TrySuffix["Attempt 11-110:<br/>baseWord-n"]
    CheckSuffixed{"Suffixed<br/>unique?"}
    ReturnSuffixed["return baseWord-n"]

    Fallback["baseWord-Date.now()"]
    ReturnFallback["return timestamp fallback"]

    Start --> GetWords
    GetWords --> BuildSet
    BuildSet --> CheckPrefixCollision
    CheckPrefixCollision -->|Yes| NoPrefix
    CheckPrefixCollision -->|No| UseSafePrefix

    UseSafePrefix --> TryTwoWord
    NoPrefix --> TryTwoWord

    TryTwoWord --> AddPrefix
    AddPrefix --> CheckUnique
    CheckUnique -->|Yes| ReturnName
    CheckUnique -->|No, attempts < 10| TryTwoWord
    CheckUnique -->|No, attempts >= 10| TrySuffix

    TrySuffix --> CheckSuffixed
    CheckSuffixed -->|Yes| ReturnSuffixed
    CheckSuffixed -->|No, n < 100| TrySuffix
    CheckSuffixed -->|No, n >= 100| Fallback
    Fallback --> ReturnFallback
```

### Branch Name Sanitization

The `sanitizeBranchName` function normalizes names to be Git-safe:

- Converts to lowercase
- Replaces spaces and underscores with hyphens
- Removes non-alphanumeric characters except hyphens and slashes
- Prevents consecutive or trailing hyphens

**Sources:** [apps/desktop/src/lib/trpc/routers/workspaces/utils/git.ts:411-455](), [shared/utils/branch.ts:1-50]()

---

## Worktree Removal

### removeWorktree Function

The `removeWorktree` function uses a rename-then-background-delete strategy to safely remove worktrees without blocking the user:

```mermaid
graph TB
    Input["removeWorktree(mainRepoPath,<br/>worktreePath)"]

    GenUUID["randomUUID()<br/>Generate unique ID"]

    TempPath["tempPath =<br/>.superset-delete-{uuid}"]

    Rename["rename(worktreePath,<br/>tempPath)<br/>Atomic rename to sibling dir"]

    Prune["git -C mainRepoPath<br/>worktree prune<br/>Remove git metadata"]

    SpawnRM["spawn('/bin/rm',<br/>['-rf', tempPath])<br/>Detached background process"]

    Unref["child.unref()<br/>Don't wait for completion"]

    Success["Return immediately<br/>Deletion happens async"]

    CatchENOENT{"Error code<br/>ENOENT?"}

    PruneOnly["git worktree prune<br/>Directory already gone"]

    ThrowError["throw error"]

    Input --> GenUUID
    GenUUID --> TempPath
    TempPath --> Rename
    Rename -->|Success| Prune
    Rename -->|Error| CatchENOENT
    CatchENOENT -->|Yes| PruneOnly
    CatchENOENT -->|No| ThrowError
    Prune --> SpawnRM
    SpawnRM --> Unref
    Unref --> Success
```

**Why rename-then-background-delete?**

1. **Atomic rename**: Moving to a temp name immediately frees the worktree path for reuse
2. **Background deletion**: Large directories (e.g., `node_modules`) can take seconds to delete; spawning `/bin/rm` avoids blocking the user
3. **Same filesystem**: Renaming to a sibling directory (same parent) avoids `EXDEV` (cross-device) errors
4. **Detached process**: `child.unref()` lets the app exit without waiting for deletion to complete

The function uses `/bin/rm -rf` instead of Node's `fs.rm` because `fs.rm` can hang on macOS when encountering `.app` bundles with extended attributes.

**Sources:** [apps/desktop/src/lib/trpc/routers/workspaces/utils/git.ts:644-697]()

### Worktree Listing and Validation

The system provides functions to list and validate worktrees:

**`worktreeExists`**: Checks if a specific worktree is registered

```mermaid
graph LR
    Check["worktreeExists(mainRepoPath,<br/>worktreePath)"]

    List["git worktree list<br/>--porcelain"]

    Parse["Parse lines starting<br/>with 'worktree '"]

    Match{"Path matches<br/>worktreePath?"}

    ReturnTrue["return true"]
    ReturnFalse["return false"]

    Check --> List
    List --> Parse
    Parse --> Match
    Match -->|Yes| ReturnTrue
    Match -->|No| ReturnFalse
```

**`listExternalWorktrees`**: Returns all worktrees with their metadata

```typescript
interface ExternalWorktree {
  path: string
  branch: string | null
  isDetached: boolean
  isBare: boolean
}
```

The parser reads `git worktree list --porcelain` and extracts:

- `worktree <path>`: Worktree location
- `branch refs/heads/<name>`: Current branch
- `detached`: Worktree is in detached HEAD state
- `bare`: Worktree is a bare repository

**Sources:** [apps/desktop/src/lib/trpc/routers/workspaces/utils/git.ts:713-781]()

### Branch Worktree Path Lookup

The `getBranchWorktreePath` function checks if a branch is currently checked out in any worktree:

```mermaid
graph TB
    Input["getBranchWorktreePath(mainRepoPath,<br/>branch)"]

    List["git worktree list --porcelain"]

    ParseLines["Parse output line by line"]

    IsWorktree{"Line starts with<br/>'worktree '?"}

    SavePath["currentWorktreePath =<br/>extracted path"]

    IsBranch{"Line is<br/>'branch refs/heads/{branch}'?"}

    MatchesBranch{"branchName<br/>== branch?"}

    ReturnPath["return currentWorktreePath"]

    ResetPath["currentWorktreePath = null"]

    ContinueLoop["Continue to next line"]

    ReturnNull["return null<br/>Branch not checked out"]

    Input --> List
    List --> ParseLines
    ParseLines --> IsWorktree
    IsWorktree -->|Yes| SavePath
    IsWorktree -->|No| IsBranch
    SavePath --> ContinueLoop
    IsBranch -->|Yes| MatchesBranch
    IsBranch -->|No| ContinueLoop
    MatchesBranch -->|Yes| ReturnPath
    MatchesBranch -->|No| ResetPath
    ResetPath --> ContinueLoop
    ContinueLoop --> ParseLines
    ParseLines -->|No more lines| ReturnNull
```

This is used to prevent creating multiple worktrees for the same branch, which Git forbids.

**Sources:** [apps/desktop/src/lib/trpc/routers/workspaces/utils/git.ts:783-823]()

---

## Remote Branch Verification

### branchExistsOnRemote Function

The `branchExistsOnRemote` function checks if a branch exists on a remote (defaulting to `origin`) using `git ls-remote --exit-code`. It categorizes errors into network, authentication, and configuration issues.

```mermaid
graph TB
    Input["branchExistsOnRemote(worktreePath,<br/>branchName, remoteName='origin')"]

    GetEnv["getGitEnv()<br/>Get shell environment"]

    Exec["execGitWithShellPath()<br/>git -C worktreePath<br/>ls-remote --exit-code<br/>--heads remoteName branchName"]

    ExitCode{"Exit code?"}

    Exists["return {status: 'exists'}"]
    NotFound["return {status: 'not_found'}"]

    IsExecException{"Error is<br/>ExecFileException?"}

    CodeType{"error.code<br/>type?"}

    ENOENT["return {status: 'error',<br/>message: 'Git not found in PATH'}"]

    Timeout["return {status: 'error',<br/>message: 'Git command timed out'}"]

    SystemErr["return {status: 'error',<br/>message: 'System error: {code}'}"]

    CheckKilled{"error.killed ||<br/>error.signal?"}

    TimeoutKilled["return {status: 'error',<br/>message: 'Git command timed out'}"]

    CheckExit2{"error.code<br/>== 2?"}

    Categorize["categorizeGitError(error.stderr || error.message,<br/>remoteName)"]

    Input --> GetEnv
    GetEnv --> Exec
    Exec -->|Success| Exists
    Exec -->|Error| IsExecException
    IsExecException -->|No| GenericErr["return {status: 'error',<br/>message: error message}"]
    IsExecException -->|Yes| CodeType
    CodeType -->|string: 'ENOENT'| ENOENT
    CodeType -->|string: 'ETIMEDOUT'| Timeout
    CodeType -->|string: other| SystemErr
    CodeType -->|number or undefined| CheckKilled
    CheckKilled -->|Yes| TimeoutKilled
    CheckKilled -->|No| CheckExit2
    CheckExit2 -->|Yes| NotFound
    CheckExit2 -->|No| Categorize
```

### Git Exit Code Handling

The function uses `git ls-remote --exit-code` which returns:

| Exit Code | Meaning                                   | Result                  |
| --------- | ----------------------------------------- | ----------------------- |
| 0         | Refs found (branch exists)                | `{status: 'exists'}`    |
| 2         | No matching refs                          | `{status: 'not_found'}` |
| 128       | Fatal error (auth, network, invalid repo) | Categorize using stderr |
| Other     | Unexpected error                          | Categorize using stderr |

**Sources:** [apps/desktop/src/lib/trpc/routers/workspaces/utils/git.ts:1024-1040](), [apps/desktop/src/lib/trpc/routers/workspaces/utils/git.ts:1108-1180]()

### Error Categorization

The `categorizeGitError` function uses pattern matching on error messages:

| Pattern Group  | Patterns                                                                                                                                       | User Message                                                               |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Network        | `could not resolve host`, `unable to access`, `connection refused`, `network is unreachable`, `timed out`, `ssl`, `could not read from remote` | "Cannot connect to remote. Check your network connection."                 |
| Authentication | `authentication`, `permission denied`, `403`, `401`, `permission denied (publickey)`, `host key verification failed`                           | "Authentication failed. Check your Git credentials."                       |
| Remote Config  | `does not appear to be a git repository`, `no such remote`, `repository not found`, `remote not found`, `remote origin not found`              | "Remote '{remoteName}' is not configured or the repository was not found." |
| Generic        | All others                                                                                                                                     | "Failed to verify branch: {errorMessage}"                                  |

**Sources:** [apps/desktop/src/lib/trpc/routers/workspaces/utils/git.ts:1042-1106]()

### Tracking Remote Name Resolution

The system uses `getTrackingRemoteNameForWorktree` to determine which remote to check when the branch has an upstream tracking relationship:

```mermaid
graph LR
    Get["getTrackingRemoteNameForWorktree(worktreePath)"]

    Exec["git rev-parse<br/>--abbrev-ref @{upstream}"]

    Parse["resolveTrackingRemoteName(stdout)<br/>Extract remote name from<br/>'origin/branch' → 'origin'"]

    Fallback["return 'origin'"]

    Get --> Exec
    Exec -->|Success| Parse
    Exec -->|Error| Fallback
```

This is used in PR status checking where fork PRs may track a remote other than `origin` (e.g., `contributor-fork/feature-branch`).

**Sources:** [apps/desktop/src/lib/trpc/routers/workspaces/utils/git.ts:1182-1194](), [apps/desktop/src/lib/trpc/routers/workspaces/utils/upstream-ref.ts:20-29]()

---

## Git Status Without Locks

### getStatusNoLock Function

The `getStatusNoLock` function retrieves repository status without acquiring optional locks, preventing conflicts with other Git operations:

```mermaid
graph TB
    Input["getStatusNoLock(repoPath)"]

    GetEnv["getGitEnv()<br/>Get shell environment"]

    Exec["execGitWithShellPath()<br/>git --no-optional-locks<br/>-C repoPath status<br/>--porcelain=v1 -b -z -uall"]

    Parse["parsePortelainStatus(stdout)<br/>Parse NUL-separated entries"]

    Success["return StatusResult"]

    CatchENOENT{"error.code<br/>== 'ENOENT'?"}

    ThrowNotFound["throw Error:<br/>'Git not installed or not in PATH'"]

    CheckNotRepo{"stderr contains<br/>'not a git repository'?"}

    ThrowNotRepo["throw NotGitRepoError"]

    ThrowGeneric["throw Error:<br/>'Failed to get git status'"]

    Input --> GetEnv
    GetEnv --> Exec
    Exec -->|Success| Parse
    Parse --> Success
    Exec -->|Error| CatchENOENT
    CatchENOENT -->|Yes| ThrowNotFound
    CatchENOENT -->|No| CheckNotRepo
    CheckNotRepo -->|Yes| ThrowNotRepo
    CheckNotRepo -->|No| ThrowGeneric
```

**Why `--no-optional-locks`?**

Git normally acquires locks on `.git/index` during status operations. If another process (e.g., a background Git operation or IDE plugin) holds the lock, `git status` blocks. The `--no-optional-locks` flag tells Git to skip lock acquisition and read stale data if necessary, preventing deadlocks.

**Porcelain Format Details**

| Flag             | Purpose                                                 |
| ---------------- | ------------------------------------------------------- |
| `--porcelain=v1` | Machine-parseable output with consistent format         |
| `-b`             | Include branch information header                       |
| `-z`             | NUL-terminate entries (handles filenames with newlines) |
| `-uall`          | Show individual files in untracked directories          |

**Sources:** [apps/desktop/src/lib/trpc/routers/workspaces/utils/git.ts:128-172]()

### parsePortelainStatus Parser

The parser converts `git status --porcelain=v1 -z` output into a `StatusResult` object:

```mermaid
graph TB
    Input["parsePortelainStatus(stdout)"]

    Split["stdout.split('\\0')<br/>Split by NUL characters"]

    ProcessEntry["For each entry"]

    IsBranch{"Entry starts with<br/>'## '?"}

    ParseBranch["Extract current branch,<br/>tracking branch,<br/>detached status"]

    IsFile{"Entry length >= 3?"}

    ParseFile["indexStatus = entry[0]<br/>workingStatus = entry[1]<br/>path = entry.slice(3)"]

    IsRename{"indexStatus == 'R' ||<br/>indexStatus == 'C'?"}

    GetOriginal["from = entries[++i]<br/>Add to renamed array"]

    Categorize["Categorize into:<br/>not_added, conflicted,<br/>created, deleted, modified,<br/>renamed, staged"]

    BuildResult["return StatusResult:<br/>{files, staged, modified,<br/>deleted, created, renamed,<br/>not_added, conflicted,<br/>current, tracking, detached}"]

    Input --> Split
    Split --> ProcessEntry
    ProcessEntry --> IsBranch
    IsBranch -->|Yes| ParseBranch
    IsBranch -->|No| IsFile
    ParseBranch --> ProcessEntry
    IsFile -->|Yes| ParseFile
    IsFile -->|No| ProcessEntry
    ParseFile --> IsRename
    IsRename -->|Yes| GetOriginal
    IsRename -->|No| Categorize
    GetOriginal --> Categorize
    Categorize --> ProcessEntry
    ProcessEntry -->|No more entries| BuildResult
```

**Status Codes**

The parser interprets two-character codes (index status + working tree status):

| Code         | Meaning                  | Arrays Updated       |
| ------------ | ------------------------ | -------------------- |
| `??`         | Untracked file           | `not_added`          |
| `A `         | Added to index           | `created`, `staged`  |
| `M `         | Modified in index        | `modified`, `staged` |
| ` M`         | Modified in working tree | `modified`           |
| `MM`         | Modified in both         | `modified`, `staged` |
| `D `         | Deleted in index         | `deleted`, `staged`  |
| ` D`         | Deleted in working tree  | `deleted`            |
| `R `         | Renamed in index         | `renamed`, `staged`  |
| `U?` or `?U` | Merge conflict           | `conflicted`         |

**Sources:** [apps/desktop/src/lib/trpc/routers/workspaces/utils/git.ts:174-308]()

---

## Default Branch Detection

### getDefaultBranch Function

The `getDefaultBranch` function determines a repository's main branch through multiple fallback strategies:

```mermaid
graph TB
    Input["getDefaultBranch(mainRepoPath)"]

    HasRemote["hasOriginRemote(mainRepoPath)"]

    CheckOrigin{"Has origin<br/>remote?"}

    SymbolicRef["git symbolic-ref<br/>refs/remotes/origin/HEAD"]

    HasSymref{"Symref<br/>found?"}

    ParseSymref["Extract branch name<br/>from refs/remotes/origin/{branch}"]

    ReturnSymref["return branch"]

    ListRemote["git branch -r<br/>List remote branches"]

    CheckCommon["Check for common names:<br/>main, master, develop, trunk"]

    FoundCommon{"Common name<br/>exists?"}

    ReturnCommon["return common name"]

    LsRemote["git ls-remote<br/>--symref origin HEAD"]

    ParseLsRemote["Extract from<br/>'ref: refs/heads/{branch}'"]

    FoundLs{"Branch<br/>found?"}

    ReturnLs["return branch"]

    GetCurrent["getCurrentBranch(mainRepoPath)<br/>Use current branch"]

    HasCurrent{"Current branch<br/>exists?"}

    ReturnCurrent["return current"]

    CheckLocal["Check local branches<br/>for common names"]

    FoundLocal{"Common name<br/>exists locally?"}

    ReturnLocal["return local common name"]

    FirstLocal["return first local branch"]

    Fallback["return 'main'"]

    Input --> HasRemote
    HasRemote --> CheckOrigin
    CheckOrigin -->|Yes| SymbolicRef
    CheckOrigin -->|No| GetCurrent

    SymbolicRef --> HasSymref
    HasSymref -->|Yes| ParseSymref
    HasSymref -->|No| ListRemote
    ParseSymref --> ReturnSymref

    ListRemote --> CheckCommon
    CheckCommon --> FoundCommon
    FoundCommon -->|Yes| ReturnCommon
    FoundCommon -->|No| LsRemote

    LsRemote --> ParseLsRemote
    ParseLsRemote --> FoundLs
    FoundLs -->|Yes| ReturnLs
    FoundLs -->|No| GetCurrent

    GetCurrent --> HasCurrent
    HasCurrent -->|Yes| ReturnCurrent
    HasCurrent -->|No| CheckLocal

    CheckLocal --> FoundLocal
    FoundLocal -->|Yes| ReturnLocal
    FoundLocal -->|No| FirstLocal
    FirstLocal -->|No branches| Fallback
```

### refreshDefaultBranch Function

The `refreshDefaultBranch` function updates `origin/HEAD` to detect when the remote's default branch has changed:

```bash
# Executed at line 928
git remote set-head origin --auto
```

This command queries the remote and updates `refs/remotes/origin/HEAD` to point to the remote's current HEAD. This is necessary because Git doesn't automatically update `origin/HEAD` during `git fetch`.

**Sources:** [apps/desktop/src/lib/trpc/routers/workspaces/utils/git.ts:825-950]()

### Base Branch Detection

The `detectBaseBranch` function uses `git merge-base` to find which branch a worktree was likely branched from:

```mermaid
graph TB
    Input["detectBaseBranch(worktreePath,<br/>currentBranch, defaultBranch)"]

    BuildCandidates["candidates = [defaultBranch,<br/>'main', 'master', 'develop',<br/>'development'] (deduped)"]

    InitBest["bestCandidate = null<br/>bestAheadCount = Infinity"]

    ForEach["For each candidate"]

    IsCurrent{"candidate ==<br/>currentBranch?"}

    Skip["continue"]

    VerifyRef["git rev-parse --verify<br/>origin/candidate"]

    RefExists{"Remote ref<br/>exists?"}

    MergeBase["git merge-base<br/>HEAD origin/candidate"]

    CountAhead["git rev-list --count<br/>{mergeBase}..HEAD"]

    CompareCounts{"count <<br/>bestAheadCount?"}

    UpdateBest["bestCandidate = candidate<br/>bestAheadCount = count"]

    ContinueLoop["Continue to next"]

    ReturnBest["return bestCandidate"]

    Input --> BuildCandidates
    BuildCandidates --> InitBest
    InitBest --> ForEach
    ForEach --> IsCurrent
    IsCurrent -->|Yes| Skip
    IsCurrent -->|No| VerifyRef
    Skip --> ForEach
    VerifyRef --> RefExists
    RefExists -->|No| ContinueLoop
    RefExists -->|Yes| MergeBase
    MergeBase --> CountAhead
    CountAhead --> CompareCounts
    CompareCounts -->|Yes| UpdateBest
    CompareCounts -->|No| ContinueLoop
    UpdateBest --> ContinueLoop
    ContinueLoop --> ForEach
    ForEach -->|No more| ReturnBest
```

This is used to suggest the correct base branch when creating a PR.

**Sources:** [apps/desktop/src/lib/trpc/routers/workspaces/utils/git.ts:1196-1246]()

---

## Environment Configuration

### Shell Environment for Git Operations

All Git operations use `getGitEnv()` to ensure proper PATH configuration, particularly on macOS where GUI apps don't inherit shell environment:

```mermaid
graph LR
    GetEnv["getGitEnv()"]

    ShellEnv["getShellEnvironment()<br/>Get user's shell PATH"]

    MergeEnv["Merge process.env<br/>with shell PATH"]

    Platform{Platform?}

    WindowsPath["pathKey = 'Path'"]
    UnixPath["pathKey = 'PATH'"]

    ReturnEnv["return env object"]

    GetEnv --> ShellEnv
    ShellEnv --> MergeEnv
    MergeEnv --> Platform
    Platform -->|Windows| WindowsPath
    Platform -->|Unix| UnixPath
    WindowsPath --> ReturnEnv
    UnixPath --> ReturnEnv
```

This ensures Git and Git LFS are found even when:

- Git is installed via Homebrew on macOS
- The application is launched from the GUI (not terminal)
- Custom shell configurations modify PATH

**Sources:** [apps/desktop/src/lib/trpc/routers/workspaces/utils/git.ts:33-49]()

---

## Command Execution Details

### execFileAsync Wrapper

All Git commands use Node's `execFileAsync` instead of `simple-git` for operations requiring precise exit code handling or timeout control:

| Parameter | Value               | Purpose                     |
| --------- | ------------------- | --------------------------- |
| `command` | `"git"`             | Direct Git CLI invocation   |
| `args`    | Array of strings    | Command arguments           |
| `env`     | `await getGitEnv()` | Shell environment with PATH |
| `timeout` | 30-120 seconds      | Prevent hanging operations  |

Example from `createWorktree`:

```javascript
await execFileAsync(
  'git',
  [
    '-C',
    mainRepoPath,
    'worktree',
    'add',
    worktreePath,
    '-b',
    branch,
    `${startPoint}^{commit}`,
  ],
  { env, timeout: 120_000 }
)
```

**Sources:** [apps/desktop/src/lib/trpc/routers/workspaces/utils/git.ts:355-371]()

---

## Teardown Integration

When worktrees are removed, the system can execute optional teardown scripts defined in `.superset/config.json`. This is handled separately from Git worktree removal to allow cleanup of processes, databases, or other resources.

For details on teardown script execution, see [Setup and Teardown Scripts](#2.6.5).

**Sources:** [apps/desktop/src/lib/trpc/routers/workspaces/utils/teardown.ts:1-81]()
