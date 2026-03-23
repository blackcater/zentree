# Acme - 本地优先多智能体协作应用设计

## 概述

Acme 是一款基于 Electron 开发的本地优先多智能体协作桌面应用。用户可以在本地同时运行多个 Code Agent（如 Claude Code、Codex），每个 Agent 运行在独立进程中，通过统一的聊天界面进行交互。

## 设计决策

### 1. 使用场景

- **个人 AI 助手**：单用户，多个 AI 智能体并行协作，帮助完成编程任务
- **混合协作模式**：根据任务复杂度，Code Agent 内部处理多智能体协作（Subagent），Acme 平台负责并行运行多个独立的 Code Agent

### 2. 架构设计

#### 进程模型

```
┌─────────────────────────────────────────────────────────────┐
│                      Main Process                            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              AgentRuntime (Manager)                 │    │
│  │  - 管理多个 Agent 进程                               │    │
│  │  - 路由消息到对应的 Agent                            │    │
│  │  - 维护 Agent 状态                                  │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                  │
│         ┌─────────────────┼─────────────────┐               │
│         ▼                 ▼                 ▼               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Claude Code │  │    Codex    │  │   Acmex     │        │
│  │   Process   │  │   Process   │  │   Process   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
                           │
                    Electron IPC
                           │
┌─────────────────────────────────────────────────────────────┐
│                    Renderer Process                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                    React UI                          │    │
│  │  - 树形导航 (Vault/Project/Folder/Thread)           │    │
│  │  - 聊天界面                                         │    │
│  │  - 工具栏                                          │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

#### IPC 机制

- 使用 Electron 原生 IPC (`ipcRenderer/ipcMain`)
- 通过 `contextBridge` 暴露安全 API
- 使用 Zod schema 定义消息类型，确保类型安全

### 3. 数据存储

#### 目录结构

```
~/.acme/vaults/<vaultId>/
├── config.json          # Vault 配置（全局 Agent 配置）
└── projects/
    └── <projectId>/     # 对应一个 Git 仓库
        ├── config.json  # Project 配置
        └── threads/
            └── <threadId>/
                ├── config.json   # Thread 配置（绑定的 Agent 类型）
                └── messages.jsonl # 对话记录（JSONL 格式）
```

#### 存储格式

- **JSONL**：对话记录使用 JSON Lines 格式，便于追加写入
- **后续扩展**：可能引入 SQLite 做全文搜索索引

### 4. 核心概念

| 概念 | 说明 |
|------|------|
| Vault | 工作区配置单元，存储在 `~/.acme/vaults/<vaultId>`，可包含多个 Project |
| Project | 对应一个 Git 仓库，一个 Vault 下可存在多个 Project |
| Folder | 线程分组，用于组织线程（可选） |
| Thread | 一次对话，只绑定一个 Code Agent，存储在 `threads/<threadId>/` |
| AgentRuntime | 运行在主进程，管理多个 Agent 进程的核心管理器 |

### 5. UI 布局

```
┌────────────────────────────────────────────────────────────────────────┐
│  Acme                                                                    │
├──────────────┬─────────────────────────────────────────┬───────────────┤
│  VAULT: 默认 │  修复登录 Bug  [Claude Code]    ●运行中  │               │
│              │                                          │    📁         │
│  📁 my-proj  │  ┌──────────────────────────────────┐  │               │
│   📂 前端开发│  │                                  │  │    ⎇         │
│    💬 修复Bug│  │    你好，帮我看看登录问题         │  │               │
│    💬 主页布局│  │                      10:30 ────┼──│  │    🌐         │
│              │  │  ┌──────────────────────────────│  │               │
│  📁 backend  │  │  │ 我来检查一下代码...           │  │    👁         │
│   📂 API     │  │  │                              │  │               │
│    💬 API设计│  │  └──────────────────────────────│  │    ⚙         │
│              │  │                         10:31 ─┘  │               │
│              │  │                                  │  │               │
│              │  └──────────────────────────────────┘  │               │
│              │                                          │               │
│  [+ 新建线程] │  ┌──────────────────────────────────┐  │               │
│              │  │ 输入消息...                    [发送]│               │
│              │  └──────────────────────────────────┘  │               │
└──────────────┴─────────────────────────────────────────┴───────────────┘
```

#### 布局说明

| 区域 | 说明 |
|------|------|
| 左侧边栏 | 树形结构：Vault → Project → Folder → Thread |
| 主聊天区 | 统一空间，用户消息右对齐（蓝色气泡），Agent 回答左对齐（绿色气泡） |
| 右侧工具栏 | 用户导航工具：文件浏览器、Git、浏览器、预览、设置 |
| 顶部 Header | 显示当前线程绑定的 Agent 类型 |

#### 聊天气泡规则

- **用户消息**：蓝色背景（`#3b82f6`），右对齐，圆角 `12px 12px 4px 12px`
- **Agent 消息**：浅绿色背景（`#f0fdf4`），左对齐，圆角 `4px 12px 12px 12px`
- 仅显示时间戳，无头像、无用户名

### 6. 关键组件

| 组件 | 职责 | 位置 |
|------|------|------|
| AgentRuntime | 管理多个 Agent 进程，路由消息 | Main Process |
| CodeAgentProcess | 单个 Code Agent 的进程管理 | Child Process |
| ThreadStore | 线程元数据管理（内存 + 文件） | Main Process |
| MessageStore | 对话记录读写（JSONL） | Main Process |
| IPCBridge | Renderer 与 Main 通信桥接 | Preload |
| VaultSelector | Vault 切换组件 | Renderer |
| ProjectTree | 树形导航组件 | Renderer |
| ChatView | 聊天界面组件 | Renderer |
| Toolbar | 右侧工具栏组件 | Renderer |

### 7. 全局配置

Vault 的 `config.json` 存储全局 Agent 配置：

```json
{
  "agents": [
    {
      "id": "claude-code",
      "type": "claude-code",
      "name": "Claude Code",
      "config": {
        "apiKey": "...",
        "model": "claude-3-5-sonnet-20241022"
      }
    },
    {
      "id": "codex",
      "type": "codex",
      "name": "Codex",
      "config": {
        "apiKey": "..."
      }
    }
  ]
}
```

Thread 的 `config.json` 指定使用的 Agent：

```json
{
  "agentId": "claude-code",
  "createdAt": "2026-03-23T10:00:00Z"
}
```

### 8. 实现优先级

#### Phase 1 - 核心框架
1. Electron 项目结构搭建
2. AgentRuntime 核心逻辑
3. CodeAgentProcess 进程管理
4. IPC 通信层

#### Phase 2 - 数据存储
1. Vault/Project/Folder/Thread 数据结构
2. JSONL 消息存储
3. Thread 创建/切换

#### Phase 3 - UI 实现
1. 树形导航组件
2. 聊天界面
3. 工具栏
4. Agent 绑定

#### Phase 4 - 工具集成
1. 文件浏览器
2. Git 状态
3. 浏览器预览
