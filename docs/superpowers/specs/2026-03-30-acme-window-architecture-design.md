# Acme 窗口架构与路由设计

## 概述

Acme 是一个 Electron 桌面应用，支持三种窗口类型：Welcome、Vault 和 Chat-popup。本文档定义了这三种窗口的路由结构、组件组织以及窗口间的协作模式。

## 窗口类型

| 窗口类型 | 描述 | 路由 | 窗口数量 |
|---------|------|------|---------|
| Welcome | 首次使用时展示，引导用户完成环境配置 | `#/welcome` | 单例 |
| Vault | 类似 workspace，是 Thread 的容器 | `#/vault/:vaultId/*` | 可多开 |
| Chat-popup | 从 Vault 弹出的 Thread 窗口，可置顶 | `#/popup/:threadId` | 每个 Thread 可有一个 |

### 窗口关系

1. **Welcome → Vault**：Welcome 完成后关闭，自动创建 Vault 窗口
2. **Vault → Chat-popup**：Vault 中的 Thread 可弹出为独立窗口
3. **窗口独立性**：每个窗口都是独立的 BrowserWindow 实例，但共享渲染进程代码

---

## 路由结构

```
apps/desktop/src/renderer/src/routes/
├── __root.tsx                      # 全局根布局（AppShell 背景）
├── welcome/
│   └── index.tsx                   # /welcome
├── vault/
│   └── $vaultId/
│       ├── vault.layout.tsx         # /vault/:vaultId
│       ├── index.tsx               # /vault/:vaultId（project 为空时显示空白页）
│       ├── settings.tsx             # /vault/:vaultId/settings
│       └── thread/
│           └── $threadId.tsx        # /vault/:vaultId/thread/:threadId
└── popup/
    ├── $threadId.layout.tsx         # /popup/:threadId（可置顶）
    └── index.tsx                   # /popup/:threadId
```

### 路由说明

| 路由 | 文件 | 说明 |
|------|------|------|
| `/welcome` | `welcome/index.tsx` | Welcome 页面，引导用户完成初始配置 |
| `/vault/:vaultId` | `vault/$vaultId/vault.layout.tsx` | Vault 布局，包裹所有 vault 子路由 |
| `/vault/:vaultId` | `vault/$vaultId/index.tsx` | Thread 列表页；project 为空时显示空白页引导创建 |
| `/vault/:vaultId/settings` | `vault/$vaultId/settings.tsx` | Vault 设置页面 |
| `/vault/:vaultId/thread/:threadId` | `vault/$vaultId/thread/$threadId.tsx` | Thread 详情页 |
| `/popup/:threadId` | `popup/$threadId.layout.tsx` + `index.tsx` | Chat-popup 窗口，可置顶 |

### 数据层级

- **Thread**：顶层实体，核心工作单元
- **Project**（可选）：用于组织 Thread 的目录，仅界面展示层面，不对应独立路由

---

## 组件结构

```
apps/desktop/src/renderer/src/components/
├── app-shell/                      # 共享背景组件
│   ├── AppShell.tsx               # 主布局容器
│   ├── AppHeader.tsx
│   ├── AppSidebar.tsx
│   └── NavigationButtons.tsx
├── welcome/                       # Welcome 专用组件
│   └── WelcomePage.tsx
├── vault/                          # Vault 专用组件
│   ├── VaultSidebar.tsx            # Vault 侧边栏（project 导航）
│   ├── ThreadList.tsx             # Thread 列表
│   ├── ThreadView.tsx              # Thread 内容区
│   └── ProjectNav.tsx              # Project 目录导航
└── popup/                          # Popup 专用组件
    └── PopupThreadView.tsx
```

### 组件职责

| 组件 | 所属窗口 | 职责 |
|------|---------|------|
| `AppShell` | 全局 | 共享背景设计（noise、透明等） |
| `WelcomePage` | Welcome | Onboarding 流程 |
| `VaultSidebar` | Vault | Project/Thread 导航 |
| `ThreadList` | Vault | 当前 Project 下的 Thread 列表 |
| `ThreadView` | Vault | Thread 消息展示和输入 |
| `PopupThreadView` | Popup | 独立的 Thread 视图 |

---

## 技术实现要点

### 1. Hash History

由于每个窗口都是独立的 BrowserWindow，使用 hash history 避免跨窗口路由冲突：

```typescript
// router.ts
import { createHashHistory } from '@tanstack/react-router'

export function createRouter() {
  return createTanStackRouter({
    routeTree,
    defaultPreload: 'intent',
    history: createHashHistory(),
  })
}
```

### 2. 窗口感知

Renderer 通过 `window.name` 或从 URL 解析路径参数来感知自己运行在哪个窗口：

```typescript
// 在各窗口的 layout 或 page 中
const path = window.location.hash // e.g., #/vault/abc123/thread/xyz
```

### 3. 背景设计复用

所有窗口共用 AppShell 的背景设计：

```tsx
// AppShell.tsx
<div
  className={cn(
    'relative flex h-screen flex-col',
    is.macOS ? 'bg-transparent' : 'bg-sidebar',
    is.electron && enableNoise && 'noise'
  )}
>
  {children}
</div>
```

### 4. 主进程窗口管理

`apps/desktop/src/main/services/WindowManager.ts` 负责创建不同类型的窗口：

| 方法 | 加载路由 |
|------|---------|
| `createWelcomeWindow()` | `#/welcome` |
| `createVaultWindow(vaultId)` | `#/vault/:vaultId` |
| `createChatPopupWindow(threadId)` | `#/popup/:threadId` |

---

## 文件变更摘要

### 新建目录

```
apps/desktop/src/renderer/src/
├── routes/
│   ├── welcome/
│   │   └── index.tsx
│   └── vault/
│       └── $vaultId/
│           ├── vault.layout.tsx
│           ├── index.tsx
│           ├── settings.tsx
│           └── thread/
│               └── $threadId.tsx
└── components/
    ├── welcome/
    │   └── WelcomePage.tsx
    └── popup/
        └── PopupThreadView.tsx
```

### 需调整的文件

| 文件 | 调整内容 |
|------|---------|
| `apps/desktop/src/main/services/WindowManager.ts` | 实现 `createWelcomeWindow`、`createVaultWindow`、`createChatPopupWindow` |
| `apps/desktop/src/renderer/src/router.ts` | 使用 hash history |
| `apps/desktop/src/renderer/src/routeTree.gen.ts` | 由 TanStack Router 自动生成 |

---

## 后续扩展考虑

1. **Welcome 窗口**：当前为独立设计，若后续不需要，可移除 `welcome/` 路由
2. **Project 过滤**：Vault 的 thread 列表通过 `project` 查询参数过滤，如 `#/vault/:vaultId?project=p1`
3. **多语言**：使用 i18n 框架处理 welcome 和 settings 页面的国际化
