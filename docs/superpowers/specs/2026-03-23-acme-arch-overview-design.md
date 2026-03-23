# Acme 架构总览设计

**日期**: 2026-03-23
**状态**: Approved
**版本**: 1.0

---

## 1. Monorepo 包结构

```
apps/
  desktop/          # Electron 桌面应用（不拆分）
    src/
      main/         # Electron Main 进程
      preload/      # Preload 脚本
      renderer/     # React 渲染进程
packages/
  acp/              # ACP (Agent Client Protocol) 协议相关
  agent/            # Agent 实现（Claude Code SDK、OpenAI SDK、自研 Acmex）
  core/             # 核心类型定义和接口
  runtime/          # AgentRuntime 核心运行时
  schemas/          # JSON Schema 等
  shared/           # 共享工具库
  ui/               # UI 组件库
```

### 1.1 调整说明

| 决策 | 说明 |
|------|------|
| agent + runtime 保持独立 | agent 专注第一方 Agent 支持，runtime 专注运行时依赖 |
| 不新增 electron/desktop 包 | 相关代码直接写入 apps/desktop |
| apps/desktop 内部结构 | 按 main/preload/renderer 组织，不拆分 |

---

## 2. 核心模块边界

| 模块 | 职责 | 外部依赖 |
|------|------|---------|
| `@acme-ai/core` | 核心类型定义、接口、枚举、Event 类型 | 无 |
| `@acme-ai/agent` | Agent 实现（ClaudeCodeAgent、CodexAgent、AcmexAgent） | core |
| `@acme-ai/runtime` | AgentRuntime 核心：配置管理、Skill/MCP/Plugin/Command 运行时 | core, agent |
| `@acme-ai/acp` | ACP 协议编解码、消息处理 | core |
| `@acme-ai/ui` | React UI 组件（基于 shadcn/ui） | core |
| `@acme-ai-app/desktop` | Electron 应用：IPC、窗口管理、Tray、文件系统 | runtime, ui, core |

---

## 3. 配置文件结构

### 3.1 全局配置

```
~/.acme/
  settings.json          # 全局配置（Provider、MCP Servers、UI 样式等）
  keybindings.json       # 全局快捷键配置
  vaults/                # Vault 存储根目录
```

### 3.2 Vault 结构

```
~/.acme/vaults/<vaultId>/
  settings.json          # Vault 配置（覆盖全局配置）
  skills/                # Vault 本地 Skills（仅在该 Vault 生效）
  agents/                # Vault 本地 Agents
  plugins/               # Vault 本地 Plugins
  commands/              # Vault 本地 Commands
  threads/               # Thread 数据存储
```

### 3.3 配置优先级

> Vault 配置 > 全局配置

---

## 4. Agent 类型架构

### 4.1 统一接口

```typescript
interface Agent {
  id: string
  name: string
  type: 'claude-code' | 'codex' | 'acmex'

  start(): Promise<void>
  stop(): Promise<void>
  sendMessage(message: Message): Promise<void>
  onEvent(handler: (event: AgentEvent) => void): void
}
```

### 4.2 Agent 实现

| Agent 类型 | 实现方式 | 说明 |
|-----------|---------|------|
| ClaudeCodeAgent | Claude Code Agent SDK | 官方支持 |
| CodexAgent | OpenAI Agent SDK | 官方支持 |
| AcmexAgent | 自研（vercel/ai + 仿 pi-mono） | 类似 opencode 的 Code Agent |

- 核心接口统一，但各自可扩展
- 因 ACP Agent 能力可能有限，采用混合架构

---

## 5. Thread 模型

### 5.1 Thread 类型

| 类型 | 说明 |
|------|------|
| Local | 直接修改本地文件 |
| Worktree | 自动创建 git worktree，修改文件 |

### 5.2 Thread 数据结构

```typescript
interface Thread {
  id: string
  type: 'local' | 'worktree'
  vaultId: string
  agentId: string
  title: string
  messages: Message[]
  toolCalls: ToolCall[]
  worktreePath?: string        // Worktree 模式下有效
  createdAt: Date
  updatedAt: Date
}

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: Date
}

interface ToolCall {
  id: string
  toolName: string
  input: Record<string, unknown>
  output?: string
  createdAt: Date
}
```

### 5.3 Worktree 模式说明

- 每个 Thread 创建独立的 git worktree
- Thread 结束时，worktree 由用户决定删除或保留
- MVP 阶段不支持共享 worktree

---

## 6. IPC 通信设计

### 6.1 通信架构

```
Renderer (React) ←→ Preload (contextBridge) ←→ Main (AgentRuntime)
```

### 6.2 API 暴露

Main 通过 `contextBridge` 暴露 `window.acme` API：

```typescript
interface AcmeAPI {
  // Vault 操作
  vault: {
    list(): Promise<Vault[]>
    create(name: string, path: string): Promise<Vault>
    open(id: string): Promise<void>
    getSettings(vaultId: string): Promise<VaultSettings>
    saveSettings(vaultId: string, settings: VaultSettings): Promise<void>
  }

  // Thread 操作
  thread: {
    create(vaultId: string, agentId: string, type: 'local' | 'worktree'): Promise<Thread>
    sendMessage(threadId: string, content: string): Promise<void>
    getMessages(threadId: string): Promise<Message[]>
  }

  // Agent 操作
  agent: {
    list(vaultId?: string): Promise<AgentInfo[]>
    start(threadId: string, agentId: string): Promise<void>
    stop(threadId: string): Promise<void>
  }

  // 窗口操作
  window: {
    openThread(threadId: string): Promise<void>
    openVaultSettings(): Promise<void>
  }
}
```

### 6.3 MVP 限制

- 仅支持本地模式（AgentRuntime 运行在 Main 进程）
- 不支持远程 AgentRuntime

---

## 7. 窗口模型

### 7.1 窗口类型

| 窗口类型 | 状态持久化 | 说明 |
|----------|-----------|------|
| Vault 窗口 | 恢复位置/大小 | 主窗口，启动后打开上次 Vault |
| Thread 窗口 | 不持久化 | 独立窗口，关闭即退出 |
| 设置窗口 | 不持久化 | 需时打开 |

### 7.2 启动流程

```
首次使用 → 欢迎向导 → 引导配置
曾使用过 → 直接打开上次 Vault
```

### 7.3 Tray 功能

- 右键菜单：新建 Thread、打开 Vault、设置、退出
- 点击图标：显示/隐藏 Vault 窗口
- 关闭窗口：最小化到 Tray

---

## 8. Skill 系统

### 8.1 规范

遵循 Claude Code Skill 规范：
- 目录结构：必须有 `SKILL.md`
- Skill 包含可用工具、指令、描述等

### 8.2 Skill 存储

| 范围 | 路径 |
|------|------|
| 全局 Skills | `~/.acme/skills/` |
| Vault 本地 Skills | `~/.acme/vaults/<vaultId>/skills/` |

### 8.3 Skill 能力

- 可调用 Tool
- 可执行 Command（slash command）
- Skill 与 Plugin、Command 是独立扩展机制

---

## 9. Plugin 系统

### 9.1 定位

Plugin 提供底层能力扩展，类似 VSCode 扩展机制：
- 与 Skill 独立，无依赖关系
- 类似 opencode、Claude Code 的插件机制

### 9.2 Plugin 存储

| 范围 | 路径 |
|------|------|
| 全局 Plugins | `~/.acme/plugins/` |
| Vault 本地 Plugins | `~/.acme/vaults/<vaultId>/plugins/` |

---

## 10. Command 系统

### 10.1 定位

Command 是 slash command，用户输入 `/command` 触发。

### 10.2 Command 存储

| 范围 | 路径 |
|------|------|
| 全局 Commands | `~/.acme/commands/` |
| Vault 本地 Commands | `~/.acme/vaults/<vaultId>/commands/` |

---

## 11. Keybindings 系统

### 11.1 作用范围

- 全局生效，不区分窗口类型
- 存储在 `~/.acme/keybindings.json`

---

## 12. 日志系统

### 12.1 日志级别

| 环境 | 输出 |
|------|------|
| 开发 | 控制台 + 文件 |
| 生产 | 仅文件 |

### 12.2 日志位置

- 文件日志存储在 `~/.acme/logs/`

---

## 13. MVP 功能范围

### P0（必须）

| 功能 | 说明 |
|------|------|
| AgentRuntime 核心 | 多 Agent 运行管理 |
| Vault/Thread 模型 | 本地文件存储 |
| Main-Renderer IPC | 进程间通信 |
| Thread 窗口 UI | 纯聊天布局 + 可折叠侧边栏 |

### P1（重要）

| 功能 | 说明 |
|------|------|
| 多窗口管理 | Vault/Thread 窗口独立 |
| 三种 Agent 支持 | Claude Code、Codex、Acmex |
| Skill 系统 | Claude Code Skill 规范 |
| Keybindings | 全局快捷键 |

### P2（后续）

| 功能 | 说明 |
|------|------|
| Worktree 模式 | git worktree 支持 |
| Tray 完整功能 | 菜单 + 最小化到 Tray |
| Provider 动态配置 | 环境变量、远程配置 |
| MCP Server 支持 | 本地/远程 MCP Servers |

---

## 14. 下一步

本设计文档聚焦 **Phase 1: 架构总览**。

后续阶段：
1. Phase 2: AgentRuntime 核心详细设计
2. Phase 3: Vault & Thread 模型详细设计
3. Phase 4: 桌面应用框架详细设计
4. Phase 5: MVP 实现计划
