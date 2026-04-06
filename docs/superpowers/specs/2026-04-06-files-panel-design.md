# FilesPanel 设计方案

## 概述

FilesPanel 是一个用于展示当前项目文件结构的树形面板，支持懒加载、搜索、JetBrains 图标渲染。核心使用 `@headless-tree/core` 和 `@headless-tree/react` 实现虚拟化文件树。

## 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│  FilesPanel (主组件)                                        │
│  ├─ FileTreeView (headless-tree 包装组件)                    │
│  │   ├─ TreeNode (文件/目录节点渲染)                         │
│  │   └─ TreeNodeIndent (缩进指示器)                          │
│  ├─ FileTreeSearch (搜索框)                                 │
│  └─ useFileTree (核心 hook，管理树状态和数据加载)            │
├─────────────────────────────────────────────────────────────┤
│  packages/ui (共享组件)                                      │
│  └─ Button, Input, ScrollArea, Skeleton                     │
├─────────────────────────────────────────────────────────────┤
│  Electron IPC (shared/rpc)                                  │
│  └─ /files/list (获取目录内容)                               │
│  └─ /files/search (搜索文件)                                 │
│  └─ /files/watch (监视文件变化)                              │
└─────────────────────────────────────────────────────────────┘
```

## 组件结构

```
components/chat/panel/git/
├── FilesPanel.tsx              # 主面板入口
├── file-tree/
│   ├── index.ts
│   ├── FileTreeView.tsx        # headless-tree 包装组件
│   ├── TreeNode.tsx            # 单个节点渲染
│   ├── TreeNodeIndent.tsx      # 缩进组件
│   ├── FileIcon.tsx            # JetBrains 图标渲染
│   └── useFileTree.ts          # 核心 hook
├── hooks/
│   └── useFileOperations.ts    # 文件操作 IPC 调用
└── types/
    └── index.ts                # 类型定义
```

## 类型定义

```typescript
// types/index.ts
export interface FileNode {
  id: string           // 唯一标识（完整路径）
  name: string
  path: string         // 相对于项目根目录的路径
  type: 'file' | 'directory'
  extension?: string   // 小写扩展名，不含点
  depth: number        // 树深度
}

export interface FileTreeState {
  rootNodes: FileNode[]
  expandedPaths: Set<string>
  loadingPaths: Set<string>
  error: string | null
}

export interface UseFileTreeOptions {
  rootPath: string
  onFileClick?: (node: FileNode, rect: DOMRect) => void
}
```

## JetBrains 图标映射策略

使用 `apps/desktop/src/renderer/src/assets/dark-jetbrains-icon-theme.json` 和 `light-jetbrains-icon-theme.json` 进行图标映射。

优先级：`fileNames` > `folderNames` > `fileExtensions` > 默认图标

```typescript
// 使用 dark-jetbrains-icon-theme.json 进行映射
function getFileIcon(node: FileNode, theme: 'dark' | 'light'): string {
  const iconMap = theme === 'dark' ? darkIconMap : lightIconMap

  // 1. 检查文件名 (如 .gitignore, Dockerfile, Makefile)
  if (iconMap.fileNames[node.name]) {
    return iconMap.iconDefinitions[iconMap.fileNames[node.name]].iconPath
  }

  // 2. 检查目录名 (如 src, lib, test)
  if (node.type === 'directory' && iconMap.folderNames[node.name]) {
    return iconMap.iconDefinitions[iconMap.folderNames[node.name]].iconPath
  }

  // 3. 检查扩展名 (如 .ts, .tsx, .json)
  if (node.extension && iconMap.fileExtensions[node.extension]) {
    return iconMap.iconDefinitions[iconMap.fileExtensions[node.extension]].iconPath
  }

  // 4. 默认图标
  return node.type === 'directory'
    ? iconMap.iconDefinitions[iconMap.folder].iconPath
    : iconMap.iconDefinitions[iconMap.file].iconPath
}
```

## 懒加载流程

```
User 点击展开目录
       │
       ▼
useFileTree.onExpand(path)
       │
       ├─── 目录已在缓存中？ ──── Yes ──── 直接展开
       │
       └─── No ──── 调用 /files/list RPC
                        │
                        ▼
                  返回子节点列表
                        │
                        ▼
                  tree.addChildren(path, children)
                        │
                        ▼
                  headless-tree 自动更新
                        │
                        ▼
                  虚拟化渲染新节点
```

## IPC 接口设计

### Main Process Handlers

```typescript
// apps/desktop/src/main/handlers/files.ts
router.handle('files/list', async (_, dirPath: string) => {
  // 返回指定目录的直接子项（不递归）
  // { files: [{ name, path, type, extension }] }
})

router.handle('files/search', async (_, query: string, rootPath: string) => {
  // 搜索文件，返回匹配路径列表（最多 100 个）
  // { results: [{ name, path, type }] }
})

router.handle('files/watch', async (_, rootPath: string) => {
  // 启动文件监视，返回变化事件
})

// 文件变化事件
window.api.rpc.on('files/changed', (event) => {
  // { type: 'add' | 'change' | 'unlink', path: string }
})
```

### RPC 返回格式

```typescript
// files/list 返回
interface ListFilesResponse {
  files: Array<{
    name: string
    path: string
    type: 'file' | 'directory'
    extension?: string
  }>
}

// files/search 返回
interface SearchFilesResponse {
  results: Array<{
    name: string
    path: string
    type: 'file' | 'directory'
  }>
}
```

## 性能优化

1. **懒加载**: 只在展开目录时加载子节点
2. **虚拟化渲染**: headless-tree 只渲染可视节点
3. **搜索防抖**: 200ms 防抖避免频繁搜索
4. **缓存**: 已加载的目录节点缓存在内存中
5. **文件监视防抖**: 150ms 防抖合并文件变化事件

## 依赖

- `@headless-tree/core@^1.6.3`
- `@headless-tree/react@^1.6.3`
- `packages/ui` 组件 (Button, Input, ScrollArea, Skeleton)
- Electron IPC (shared/rpc)

## 后续步骤

1. 创建 IPC handlers (`apps/desktop/src/main/handlers/files.ts`)
2. 创建类型定义 (`components/chat/panel/git/types/`)
3. 创建图标映射工具 (`components/chat/panel/git/file-icons/`)
4. 创建 useFileOperations hook
5. 创建 useFileTree hook
6. 创建 FileIcon 组件
7. 创建 TreeNodeIndent 组件
8. 创建 TreeNode 组件
9. 创建 FileTreeView 组件
10. 创建 FilesPanel 主组件
