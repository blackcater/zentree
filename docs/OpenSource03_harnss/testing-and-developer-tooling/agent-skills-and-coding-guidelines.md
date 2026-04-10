# Agent Skills & Coding Guidelines

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [.agents/skills/vercel-react-best-practices/AGENTS.md](.agents/skills/vercel-react-best-practices/AGENTS.md)
- [.agents/skills/vercel-react-best-practices/SKILL.md](.agents/skills/vercel-react-best-practices/SKILL.md)
- [.claude/skills/release/SKILL.md](.claude/skills/release/SKILL.md)
- [.gitignore](.gitignore)

</details>



The Harnss codebase utilizes a structured system of AI "Skills" and persistent memory to guide agents (like Claude or Codex) in maintaining high code quality, following specialized workflows, and retaining context across sessions. These instructions are stored within the `.agents/` and `.claude/` directories, providing a machine-readable set of heuristics and step-by-step procedures.

## Skill Infrastructure Overview

Skills in Harnss are defined as Markdown-based instruction sets that AI agents ingest to modify their behavior or gain domain-specific capabilities. These are categorized into performance-oriented coding standards and operational workflows.

### Directory Structure
- `.agents/skills/`: Contains general-purpose skills applicable across different AI engines.
- `.claude/skills/`: Contains skills specific to the Claude engine, often involving complex terminal-based workflows.
- `.claude/agent-memory/`: A persistent storage area for the agent to record project-specific context and "learnings" [ .gitignore:9-9 ]().

## Vercel React Best Practices Skill

The primary coding guideline for the frontend is the **Vercel React Best Practices** skill. It consists of 62 rules designed to optimize performance and maintainability in React and Next.js environments [ .agents/skills/vercel-react-best-practices/SKILL.md:12-12 ]().

### Rule Categories and Impact
Rules are prioritized by their impact on application performance, ranging from "Critical" (network and bundle size) to "Low" (micro-optimizations).

| Priority | Category | Impact | Prefix | Focus Area |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Eliminating Waterfalls | **CRITICAL** | `async-` | Parallelizing `await` and using Suspense [ .agents/skills/vercel-react-best-practices/SKILL.md:38-44 ](). |
| 2 | Bundle Size Optimization | **CRITICAL** | `bundle-` | Avoiding barrel files and using dynamic imports [ .agents/skills/vercel-react-best-practices/SKILL.md:46-52 ](). |
| 3 | Server-Side Performance | **HIGH** | `server-` | React.cache() deduplication and RSC serialization [ .agents/skills/vercel-react-best-practices/SKILL.md:54-63 ](). |
| 4 | Client-Side Data Fetching | **MEDIUM-HIGH** | `client-` | SWR usage and passive event listeners [ .agents/skills/vercel-react-best-practices/SKILL.md:65-70 ](). |
| 5 | Re-render Optimization | **MEDIUM** | `rerender-` | Functional `setState` and memoization strategies [ .agents/skills/vercel-react-best-practices/SKILL.md:72-86 ](). |
| 6 | Rendering Performance | **MEDIUM** | `rendering-` | Content-visibility and hydration mismatch prevention [ .agents/skills/vercel-react-best-practices/SKILL.md:88-100 ](). |
| 7 | JavaScript Performance | **LOW-MEDIUM** | `js-` | O(1) lookups via Map/Set and hoisting RegEx [ .agents/skills/vercel-react-best-practices/SKILL.md:102-116 ](). |
| 8 | Advanced Patterns | **LOW** | `advanced-` | Stable callback refs and app-level initialization [ .agents/skills/vercel-react-best-practices/SKILL.md:118-122 ](). |

### Data Flow: Skill Ingestion to Code Execution
The following diagram illustrates how an agent applies these rules during a refactoring task.

**Agent Rule Application Workflow**
```mermaid
graph TD
    subgraph "Natural Language Space"
        "UserRequest"["User: 'Optimize this component'"]
        "SkillTrigger"["Skill Trigger: React/Next.js detected"]
    end

    subgraph "Skill Entity Space"
        "AGENTS.md"[".agents/.../AGENTS.md: Rule Definitions"]
        "SKILL.md"[".agents/.../SKILL.md: Metadata/Prefixes"]
    end

    subgraph "Code Entity Space"
        "ReactComponent"["frontend/src/components/..."]
        "ViteBuild"["Vite/Tsup Build Pipeline"]
    end

    "UserRequest" --> "SkillTrigger"
    "SkillTrigger" -- "Infers Context" --> "SKILL.md"
    "SKILL.md" -- "Lookup Rules" --> "AGENTS.md"
    "AGENTS.md" -- "Apply Rule (e.g., async-parallel)" --> "ReactComponent"
    "ReactComponent" -- "Reduced Bundle/Latency" --> "ViteBuild"
```
Sources: [ .agents/skills/vercel-react-best-practices/SKILL.md:1-142 ](), [ .agents/skills/vercel-react-best-practices/AGENTS.md:1-117 ]()

## Harnss Release Workflow Skill

The `release` skill is a specialized operational workflow used by agents to manage the Harnss versioning and deployment pipeline. It ensures that every release follows a strict sequence of safety checks and documentation standards [ .claude/skills/release/SKILL.md:3-8 ]().

### Release Steps
1.  **Pre-flight Checks**: The agent must run `git status` and `git diff` to inspect staged changes. It is explicitly forbidden from proceeding without reading the entire diff to ensure no debug artifacts or credentials are committed [ .claude/skills/release/SKILL.md:10-31 ]().
2.  **Version Bumping**: The agent parses `package.json`, checks for the latest git tag, and applies a `major`, `minor`, or `patch` bump [ .claude/skills/release/SKILL.md:33-44 ]().
3.  **SDK Synchronization**: The agent checks for updates to `@anthropic-ai/claude-agent-sdk` and updates the dependency if a newer version is available [ .claude/skills/release/SKILL.md:46-52 ]().
4.  **Committing**: A mandatory `Co-Authored-By` trailer must be included in the commit message. The agent uses a HEREDOC format to handle multi-line summaries [ .claude/skills/release/SKILL.md:66-107 ]().
5.  **GitHub Release**: The agent generates release notes based on a template and uses the GitHub CLI (`gh release create`) to finalize the process [ .claude/skills/release/SKILL.md:118-153 ]().

**Release Workflow Logic**
```mermaid
flowchart TD
    "Start"["Invoke Skill: release(patch)"] --> "DiffCheck"["Read git diff --cached"]
    "DiffCheck" -- "Contains .env or tmp?" --> "Cleanup"["Unstage/Remove Files"]
    "DiffCheck" -- "Clean" --> "Bump"["Read package.json Version"]
    "Bump" --> "SDKUpdate"["npm view @anthropic-ai/claude-agent-sdk"]
    "SDKUpdate" --> "Commit"["git commit with Co-Authored-By"]
    "Commit" --> "TagPush"["git tag & git push origin master"]
    "TagPush" --> "GHRelease"["gh release create"]
```
Sources: [ .claude/skills/release/SKILL.md:1-163 ]()

## Agent Memory & Persistence

Harnss allows agents to maintain a "memory" across different sessions. This is primarily used for:
-   **Project Context**: Remembering specific architectural decisions or known issues.
-   **Task Tracking**: Keeping track of progress on long-running refactors.
-   **Reviewer Persona**: Storing patterns identified during code reviews to apply them consistently in future turns.

The memory is stored in `.claude/agent-memory/`, which is excluded from version control to allow for individualized agent states [ .gitignore:9-9 ]().

## Implementation Guidelines for Developers

When adding new skills or modifying existing ones, follow these technical constraints:

-   **Atomicity**: Each rule in a skill should be granular (e.g., `async-parallel` focuses only on `Promise.all`).
-   **Verification**: Skills should include "Incorrect" vs "Correct" examples to provide the LLM with clear negative and positive constraints [ .agents/skills/vercel-react-best-practices/SKILL.md:133-137 ]().
-   **Tool Integration**: Operational skills (like `release`) must leverage existing CLI tools (e.g., `git`, `pnpm`, `gh`) rather than attempting to implement logic in pure script [ .claude/skills/release/SKILL.md:144-149 ]().

Sources: [ .agents/skills/vercel-react-best-practices/SKILL.md:1-142 ](), [ .claude/skills/release/SKILL.md:1-163 ](), [ .gitignore:1-12 ]()