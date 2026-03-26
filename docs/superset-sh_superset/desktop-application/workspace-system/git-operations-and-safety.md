# Git Operations and Safety

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

This document covers the safety mechanisms, error handling, and defensive programming patterns used throughout Git operations in the Desktop application. It focuses on preventing data loss, handling edge cases gracefully, and providing clear error messages to users.

For worktree creation mechanics, see [2.6.2 Git Worktree Management](#2.6.2). For GitHub PR operations and status fetching, see [2.6.5 GitHub Integration](#2.6.5). For project-level Git repository management, see [2.6.1 Projects and Git Repositories](#2.6.1).

## Safety Principles

All Git operations in Superset adhere to strict safety principles to prevent data loss and provide reliable operation even in edge cases:

**Key Safety Mechanisms:**

| Mechanism            | Purpose                           | Implementation                                      |
| -------------------- | --------------------------------- | --------------------------------------------------- |
| Lock-free status     | Prevent blocking other operations | `--no-optional-locks` flag in status checks         |
| Hook tolerance       | Continue despite hook failures    | Verify operation success independently of exit code |
| Error categorization | Provide actionable error messages | Pattern matching on stderr/exit codes               |
| Upstream validation  | Prevent divergence and conflicts  | Check ahead/behind status before operations         |
| Path validation      | Prevent arbitrary file access     | `assertRegisteredWorktree()` security check         |

```mermaid
graph TB
    UserAction["User Initiates Git Operation"]
    PathValidation["assertRegisteredWorktree()<br/>Security Check"]
    PreFlightChecks["Pre-flight Checks<br/>upstream status, locks, conflicts"]
    ExecuteOperation["Execute Git Command<br/>with shell PATH"]
    HookTolerance["Hook Tolerance<br/>verify success independently"]
    ErrorCategorization["Error Categorization<br/>network, auth, lock, conflict"]
    CacheClear["clearStatusCacheForWorktree()"]
    UserFeedback["User-Friendly Error<br/>or Success Result"]

    UserAction --> PathValidation
    PathValidation -->|Valid| PreFlightChecks
    PathValidation -->|Invalid| UserFeedback
    PreFlightChecks -->|Pass| ExecuteOperation
    PreFlightChecks -->|Fail| ErrorCategorization
    ExecuteOperation --> HookTolerance
    HookTolerance -->|Success| CacheClear
    HookTolerance -->|Failure| ErrorCategorization
    CacheClear --> UserFeedback
    ErrorCategorization --> UserFeedback
```

**Sources:** [apps/desktop/src/lib/trpc/routers/changes/git-operations.ts:16-23](), [apps/desktop/src/lib/trpc/routers/workspaces/utils/git.ts:128-172]()

## Lock-Free Status Operations

Git operations can create lock files (`.git/index.lock`, `.git/config.lock`) that block concurrent operations. To prevent blocking, all status checks use `--no-optional-locks`:

### getStatusNoLock Implementation

The `getStatusNoLock()` function performs repository status checks without acquiring locks:

```mermaid
sequenceDiagram
    participant Caller
    participant getStatusNoLock
    participant Git as git --no-optional-locks
    participant Parser as parsePortelainStatus

    Caller->>getStatusNoLock: getStatusNoLock(repoPath)
    getStatusNoLock->>Git: status --porcelain=v1 -b -z -uall

    alt Success
        Git-->>getStatusNoLock: stdout (NUL-separated entries)
        getStatusNoLock->>Parser: parse(stdout)
        Parser-->>getStatusNoLock: StatusResult
        getStatusNoLock-->>Caller: StatusResult
    else Git Not Found
        Git-->>getStatusNoLock: ENOENT
        getStatusNoLock-->>Caller: throw "Git is not installed"
    else Not a Git Repo
        Git-->>getStatusNoLock: "not a git repository"
        getStatusNoLock-->>Caller: throw NotGitRepoError
    else Other Error
        Git-->>getStatusNoLock: error
        getStatusNoLock-->>Caller: throw "Failed to get git status"
    end
```

**Key Features:**

- **NUL-terminated output** (`-z` flag): Safely handles filenames with spaces, newlines, or special characters
- **Individual untracked files** (`-uall`): Shows all files in untracked directories, not just the directory name
- **Porcelain v1 format**: Machine-parseable output with consistent format across Git versions
- **No lock acquisition**: `--no-optional-locks` prevents blocking other Git operations

**Sources:** [apps/desktop/src/lib/trpc/routers/workspaces/utils/git.ts:128-172](), [apps/desktop/src/lib/trpc/routers/workspaces/utils/git.ts:179-308]()

## Branch and Remote Verification

Before performing operations on remote branches, the system verifies their existence and categorizes errors for user-friendly feedback.

### branchExistsOnRemote Error Categorization

```mermaid
graph TB
    Call["branchExistsOnRemote(worktreePath, branchName, remoteName)"]
    Execute["git ls-remote --exit-code --heads"]

    CheckExitCode{"Exit Code?"}

    ExitCode0["Exit Code 0"]
    ExitCode2["Exit Code 2"]
    ExitCode128["Exit Code 128"]
    ExitCodeOther["Other Exit Code"]
    SystemError["System Error<br/>ENOENT, ETIMEDOUT"]

    CategoryNetwork["categorize: network<br/>'could not resolve host'<br/>'connection refused'"]
    CategoryAuth["categorize: auth<br/>'authentication'<br/>'permission denied'"]
    CategoryRemote["categorize: remote not configured<br/>'repository not found'"]

    ResultExists["{status: 'exists'}"]
    ResultNotFound["{status: 'not_found'}"]
    ResultError["{status: 'error', message: ...}"]

    Call --> Execute
    Execute --> CheckExitCode

    CheckExitCode -->|0| ExitCode0
    CheckExitCode -->|2| ExitCode2
    CheckExitCode -->|128| ExitCode128
    CheckExitCode -->|other| ExitCodeOther
    CheckExitCode -->|ENOENT/timeout| SystemError

    ExitCode0 --> ResultExists
    ExitCode2 --> ResultNotFound
    ExitCode128 --> CategoryNetwork
    ExitCode128 --> CategoryAuth
    ExitCode128 --> CategoryRemote
    ExitCodeOther --> ResultError
    SystemError --> ResultError

    CategoryNetwork --> ResultError
    CategoryAuth --> ResultError
    CategoryRemote --> ResultError
```

**Error Categories:**

| Category              | Patterns                                                    | User Message                                                         |
| --------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------- |
| Network               | `could not resolve host`, `connection refused`, `timed out` | "Cannot connect to remote. Check your network connection."           |
| Authentication        | `authentication`, `permission denied`, `403`, `401`         | "Authentication failed. Check your Git credentials."                 |
| Remote not configured | `repository not found`, `no such remote`                    | "Remote 'origin' is not configured or the repository was not found." |
| Git not installed     | `ENOENT` error code                                         | "Git is not installed or not found in PATH."                         |

**Sources:** [apps/desktop/src/lib/trpc/routers/workspaces/utils/git.ts:1035-1180](), [apps/desktop/src/lib/trpc/routers/workspaces/utils/git.ts:1045-1106]()

## Hook Tolerance in Worktree Operations

Git hooks can exit with non-zero status even after successfully performing their work. Superset tolerates hook failures by verifying operation success independently:

### runWithPostCheckoutHookTolerance Pattern

```mermaid
sequenceDiagram
    participant Caller
    participant Tolerance as runWithPostCheckoutHookTolerance
    participant GitOp as Git Operation
    participant Verify as didSucceed callback

    Caller->>Tolerance: run createWorktree
    Tolerance->>GitOp: execute git worktree add

    alt Git exits 0
        GitOp-->>Tolerance: success
        Tolerance-->>Caller: return
    else Git exits non-zero
        GitOp-->>Tolerance: error
        Tolerance->>Verify: didSucceed() - check worktree registered

        alt Worktree exists
            Verify-->>Tolerance: true
            Note over Tolerance: Warn: hook failed but worktree created
            Tolerance-->>Caller: return (success)
        else Worktree not created
            Verify-->>Tolerance: false
            Tolerance-->>Caller: throw original error
        end
    end
```

**Implementation for Worktree Creation:**

The `execWorktreeAdd()` function wraps `git worktree add` with hook tolerance:

```mermaid
graph LR
    CreateWorktree["createWorktree()"]
    MkdirParent["mkdir parent dir"]
    ExecWorktreeAdd["execWorktreeAdd()"]
    RunWithTolerance["runWithPostCheckoutHookTolerance"]
    VerifyRegistered["isWorktreeRegistered()<br/>check git worktree list"]
    SetAutoSetupRemote["git config push.autoSetupRemote true"]

    CreateWorktree --> MkdirParent
    MkdirParent --> ExecWorktreeAdd
    ExecWorktreeAdd --> RunWithTolerance
    RunWithTolerance --> VerifyRegistered
    VerifyRegistered -->|registered| SetAutoSetupRemote
    VerifyRegistered -->|not registered| ThrowError["throw error"]
```

**Why Hook Tolerance Matters:**

- Some repositories have post-checkout hooks that perform side effects (npm install, file generation) but exit non-zero on warnings
- Without tolerance, these repositories would fail to create worktrees despite successful Git operations
- Verification ensures we don't silently ignore actual failures

**Sources:** [apps/desktop/src/lib/trpc/routers/workspaces/utils/git.ts:84-103](), [apps/desktop/src/lib/trpc/routers/workspaces/utils/git.ts:48-77](), [apps/desktop/src/lib/trpc/utils/git-hook-tolerance.ts]()

## Push/Pull/Sync Safety

Push and pull operations include multiple safety checks to prevent data loss and provide clear error recovery paths.

### Upstream Tracking Status

Before push/pull operations, the system checks the relationship between the local branch and its upstream:

```mermaid
graph TB
    GetStatus["getTrackingBranchStatus(git)"]
    CheckUpstream{"Has upstream?"}

    RevList["git rev-list --left-right --count @{upstream}...HEAD"]
    ParseCounts["Parse behind/ahead counts"]

    NoUpstream["{pushCount: 0, pullCount: 0, hasUpstream: false}"]
    WithUpstream["{pushCount: N, pullCount: M, hasUpstream: true}"]

    GetStatus --> CheckUpstream
    CheckUpstream -->|no upstream ref| NoUpstream
    CheckUpstream -->|upstream exists| RevList
    RevList --> ParseCounts
    ParseCounts --> WithUpstream
```

**Sources:** [apps/desktop/src/lib/trpc/routers/changes/git-operations.ts:129-171]()

### Push Operation Flow

The `push` tRPC procedure implements defensive pushing with automatic upstream setup:

```mermaid
sequenceDiagram
    participant User
    participant PushProc as push procedure
    participant Git
    participant Fetch as fetchCurrentBranch

    User->>PushProc: push(worktreePath, setUpstream?)
    PushProc->>PushProc: assertRegisteredWorktree()
    PushProc->>Git: hasUpstreamBranch()

    alt No upstream && setUpstream=true
        PushProc->>Git: revparse --abbrev-ref HEAD
        PushProc->>Git: pushWithSetUpstream()
        Note over Git: git push --set-upstream origin HEAD:refs/heads/branch
    else Has upstream
        PushProc->>Git: git push

        alt Push fails with upstream error
            Git-->>PushProc: error: no upstream branch
            PushProc->>Git: pushWithSetUpstream() (retry)
        else Other error
            Git-->>PushProc: error
            PushProc-->>User: throw error
        end
    end

    PushProc->>Fetch: fetchCurrentBranch()
    PushProc->>PushProc: clearStatusCacheForWorktree()
    PushProc-->>User: {success: true}
```

**Push Error Patterns:**

| Pattern                    | Action                            |
| -------------------------- | --------------------------------- |
| `no upstream branch`       | Retry with `--set-upstream`       |
| `no tracking information`  | Retry with `--set-upstream`       |
| `couldn't find remote ref` | Retry with `--set-upstream`       |
| `non-fast-forward`         | Throw error (requires pull first) |

**Sources:** [apps/desktop/src/lib/trpc/routers/changes/git-operations.ts:380-413](), [apps/desktop/src/lib/trpc/routers/changes/git-operations.ts:75-102](), [apps/desktop/src/lib/trpc/routers/changes/git-operations.ts:104-127]()

### Pull Operation with Upstream Missing Detection

```mermaid
graph TB
    PullProc["pull procedure"]
    Validate["assertRegisteredWorktree()"]
    GitPull["git pull --rebase"]
    CheckError{"Error type?"}

    UpstreamMissing["isUpstreamMissingError()"]
    OtherError["Other error"]

    UserError["throw: 'No upstream branch to pull from.<br/>The remote branch may have been deleted.'"]
    ThrowOther["throw original error"]
    ClearCache["clearStatusCacheForWorktree()"]
    Success["{success: true}"]

    PullProc --> Validate
    Validate --> GitPull
    GitPull --> CheckError

    CheckError -->|upstream missing| UpstreamMissing
    CheckError -->|other| OtherError
    CheckError -->|success| ClearCache

    UpstreamMissing --> UserError
    OtherError --> ThrowOther
    ClearCache --> Success
```

**Sources:** [apps/desktop/src/lib/trpc/routers/changes/git-operations.ts:415-439](), [apps/desktop/src/lib/trpc/routers/changes/git-utils.ts]()

### Sync Operation (Pull + Push)

The `sync` procedure combines pull and push with automatic upstream setup when needed:

**Flow:**

1. Attempt `git pull --rebase`
2. If upstream missing error → `pushWithSetUpstream()` (first push to remote)
3. If pull succeeds → `git push`
4. Fetch updated remote state
5. Clear status cache

This handles the case where a workspace has local commits but no remote branch yet.

**Sources:** [apps/desktop/src/lib/trpc/routers/changes/git-operations.ts:441-469]()

## PR Creation Safety Checks

Creating a pull request requires careful validation to prevent user confusion and ensure the PR reflects the current local state.

### createPR Pre-flight Checks

```mermaid
graph TB
    CreatePR["createPR(worktreePath, allowOutOfDate)"]
    Validate["assertRegisteredWorktree()"]
    GetStatus["getTrackingBranchStatus()"]

    CheckBehind{"Behind upstream?"}
    CheckUpstream{"Has upstream?"}

    BehindNotAllowed["allowOutOfDate=false"]
    ThrowBehind["throw PRECONDITION_FAILED:<br/>'Branch is behind upstream by N commits.<br/>Pull/rebase first, or continue anyway.'"]

    PushUpstream["pushWithSetUpstream()"]
    Push["git push"]

    CheckPushError{"Push error?"}
    RetryPush["shouldRetryPushWithUpstream()?"]
    NonFastForward["isNonFastForwardPushError()?"]

    ThrowNonFastForward["throw: 'Branch has local commits but is behind.<br/>Pull/rebase first.'"]

    FindExisting["findExistingOpenPRUrl()"]
    BuildNew["buildNewPullRequestUrl()"]

    CreatePR --> Validate
    Validate --> GetStatus
    GetStatus --> CheckBehind

    CheckBehind -->|yes| BehindNotAllowed
    BehindNotAllowed -->|false| ThrowBehind
    BehindNotAllowed -->|true| CheckUpstream
    CheckBehind -->|no| CheckUpstream

    CheckUpstream -->|no| PushUpstream
    CheckUpstream -->|yes| Push

    Push --> CheckPushError
    CheckPushError -->|retry error| RetryPush
    CheckPushError -->|non-fast-forward| NonFastForward
    RetryPush --> PushUpstream
    NonFastForward --> ThrowNonFastForward

    PushUpstream --> FindExisting
    CheckPushError -->|success| FindExisting

    FindExisting -->|PR exists| ReturnExisting["return {url: existingPRUrl}"]
    FindExisting -->|no PR| BuildNew
    BuildNew --> ReturnNew["return {url: compareUrl}"]
```

**Safety Guarantees:**

1. **Upstream synchronization**: Warns if branch is behind (prevents creating PR with outdated code)
2. **Remote branch exists**: Automatically pushes before PR creation (GitHub requires remote branch)
3. **Idempotency**: Detects existing open PR and returns its URL instead of creating duplicate
4. **Fork handling**: Uses correct upstream repository for fork PRs via `getRepoContext()`

**Sources:** [apps/desktop/src/lib/trpc/routers/changes/git-operations.ts:481-569](), [apps/desktop/src/lib/trpc/routers/changes/git-operations.ts:173-214]()

### Existing PR Detection

To prevent duplicate PRs, the system checks for existing open PRs using two methods:

**Method 1: Tracking-based lookup** (`gh pr view`)

- Uses the branch's tracking ref to find PR
- Essential for fork PRs that track `refs/pull/XXX/head`
- Validates PR head branch matches local branch to avoid stale tracking refs

**Method 2: Commit-based search** (`gh pr list --search`)

- Searches for PRs with HEAD commit as `headRefOid`
- Fallback when tracking-based lookup fails or returns mismatched PR
- Handles cases where tracking ref is stale or missing

**Sources:** [apps/desktop/src/lib/trpc/routers/changes/git-operations.ts:173-263]()

## Lock Error Handling

Git lock errors occur when another process holds a lock file or a previous operation crashed without cleanup.

### Lock Error Detection

```mermaid
graph TB
    GitOp["Git Operation Fails"]
    CheckMsg["Check error.message"]

    LockPatterns{"Matches lock pattern?"}

    Pattern1["'could not lock'"]
    Pattern2["'unable to lock'"]
    Pattern3["'.lock' && 'file exists'"]

    BuildError["Build detailed error message:<br/>'Failed to create worktree: The git repository<br/>is locked by another process. This usually happens<br/>when another git operation is in progress, or a<br/>previous operation crashed. Please wait for the<br/>other operation to complete, or manually remove<br/>the lock file (e.g., .git/config.lock or .git/index.lock)<br/>if you're sure no git operations are running.'"]

    OtherError["throw generic error"]

    GitOp --> CheckMsg
    CheckMsg --> LockPatterns

    LockPatterns -->|yes| Pattern1
    LockPatterns -->|yes| Pattern2
    LockPatterns -->|yes| Pattern3
    LockPatterns -->|no| OtherError

    Pattern1 --> BuildError
    Pattern2 --> BuildError
    Pattern3 --> BuildError
    BuildError --> ThrowDetailed["throw detailed error"]
```

**Lock Error Handling in createWorktree:**

The function detects lock errors and provides actionable guidance:

- Explains the likely cause (concurrent operation or crash)
- Suggests waiting for other operations
- Provides manual recovery path (delete lock file)
- Lists specific lock file names (`.git/config.lock`, `.git/index.lock`)

**Sources:** [apps/desktop/src/lib/trpc/routers/workspaces/utils/git.ts:499-518](), [apps/desktop/src/lib/trpc/routers/workspaces/utils/git.ts:588-602]()

## Detached HEAD Safety

Operations refuse to proceed from detached HEAD state where the branch name is ambiguous:

**pushWithSetUpstream Detached HEAD Check:**

```mermaid
graph LR
    Push["pushWithSetUpstream()"]
    GetBranch["git revparse --abbrev-ref HEAD"]
    CheckBranch{"branch === 'HEAD'?"}

    ThrowError["throw BAD_REQUEST:<br/>'Cannot push from detached HEAD.<br/>Please checkout a branch and try again.'"]

    DoPush["git push --set-upstream origin HEAD:refs/heads/branch"]

    Push --> GetBranch
    GetBranch --> CheckBranch
    CheckBranch -->|yes| ThrowError
    CheckBranch -->|no| DoPush
```

**Why This Matters:**

In detached HEAD state, `git rev-parse --abbrev-ref HEAD` returns the string `"HEAD"`, not a branch name. Attempting to push would fail or create a branch named "HEAD" on the remote, which is confusing and incorrect.

**Sources:** [apps/desktop/src/lib/trpc/routers/changes/git-operations.ts:75-102]()

## Path Validation Security

All Git operations validate that the worktree path is registered before allowing file system access:

**Security Pattern:**

```mermaid
graph LR
    TRPCProc["tRPC Procedure"]
    Input["input.worktreePath"]
    Validate["assertRegisteredWorktree(worktreePath)"]
    CheckDB["Query localDb for workspace<br/>with matching worktree_path"]

    Found["Workspace exists"]
    NotFound["Workspace not found"]

    Proceed["Proceed with operation"]
    Throw["throw TRPCError:<br/>FORBIDDEN or NOT_FOUND"]

    TRPCProc --> Input
    Input --> Validate
    Validate --> CheckDB

    CheckDB --> Found
    CheckDB --> NotFound

    Found --> Proceed
    NotFound --> Throw
```

This prevents:

- Arbitrary file system access via crafted paths
- Operations on deleted/unregistered workspaces
- Race conditions between workspace deletion and ongoing operations

**Sources:** [apps/desktop/src/lib/trpc/routers/changes/security/path-validation.ts](), [apps/desktop/src/lib/trpc/routers/changes/git-operations.ts:371]()

## Test Coverage

The test suite validates safety mechanisms across various edge cases:

**Hook Tolerance Tests:**

- Post-checkout hook exits non-zero but worktree is created → operation succeeds with warning
- Worktree directory exists but Git operation fails → throws error (not silent failure)

**Branch Verification Tests:**

- Remote branch exists → returns `{status: 'exists'}`
- Remote branch doesn't exist (exit code 2) → returns `{status: 'not_found'}`
- Network error → returns `{status: 'error', message: 'Cannot connect to remote...'}`
- Auth error → returns `{status: 'error', message: 'Authentication failed...'}`

**getCurrentBranch Tests:**

- Empty repo with unborn HEAD → returns branch name (not null)
- Detached HEAD state → returns null

**Shell Environment Tests:**

- Validates that Git commands use enriched PATH from shell environment
- Ensures tools installed via Homebrew/nvm/volta are accessible
- Verifies delimiter markers don't leak into environment variables

**Sources:** [apps/desktop/src/lib/trpc/routers/workspaces/utils/git.test.ts:390-441](), [apps/desktop/src/lib/trpc/routers/workspaces/utils/git.test.ts:506-544](), [apps/desktop/src/lib/trpc/routers/workspaces/utils/git.test.ts:443-504]()
