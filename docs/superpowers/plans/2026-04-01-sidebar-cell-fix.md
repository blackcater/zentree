# Sidebar Cell UI Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 sidebar 中 FolderCell 和 ThreadCell 的三个 UI 问题

**Architecture:** 三个独立修复，分别针对 FolderCell 的 DropdownMenu 焦点问题、ThreadCell 两阶段确认按钮、FolderCell 拖拽指针样式

**Tech Stack:** React, jotai, @acme-ai/ui/foundation

---

## File Structure

- Modify: `apps/desktop/src/renderer/src/components/app-shell/sidebar/cell/ThreadCell.tsx`
- Modify: `apps/desktop/src/renderer/src/components/app-shell/sidebar/cell/FolderCell.tsx`

---

## Task 1: FolderCell DropdownMenu 失焦修复

**Files:**
- Modify: `apps/desktop/src/renderer/src/components/app-shell/sidebar/cell/FolderCell.tsx:97-120`

**Root Cause:** DropdownMenu 打开时获取焦点，导致 Cell 的 `:group-hover` CSS 状态丢失。

**Solution:** 使用 DropdownMenu 的 `modal={false}` 属性，防止菜单获取焦点。

- [ ] **Step 1: 检查 DropdownMenu 是否支持 modal 属性**

查看 `@acme-ai/ui/foundation` 的 DropdownMenu 组件，确认 `modal` 属性可用。

- [ ] **Step 2: 添加 modal={false} 到 DropdownMenu**

```tsx
<DropdownMenu modal={false}>
  <DropdownMenuTrigger asChild>
    <Button
      variant="ghost"
      size="icon-sm"
      className="h-6 w-6"
    >
      <HugeiconsIcon
        icon={MoreHorizontalIcon}
        className="size-3.5"
      />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={() => onRename?.(id)}>
      Rename
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => onDelete?.(id)}>
      Delete
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

- [ ] **Step 3: 验证修复**

运行应用，点击 FolderCell 的 more 按钮，确认：
1. DropdownMenu 正常弹出
2. Cell 保持 hover 高亮状态（不闪烁）

- [ ] **Step 4: 提交**

```bash
git add apps/desktop/src/renderer/src/components/app-shell/sidebar/cell/FolderCell.tsx
git commit -m "fix(desktop): prevent FolderCell focus loss when dropdown opens"
```

---

## Task 2: ThreadCell 两阶段确认按钮

**Files:**
- Modify: `apps/desktop/src/renderer/src/components/app-shell/sidebar/cell/ThreadCell.tsx`
- 设计文档: `docs/superpowers/specs/2026-04-01-threadcell-two-phase-confirm-design.md`

**Reference:** 使用设计文档中的实现方案

- [ ] **Step 1: 添加 isConfirming 状态和 useEffect**

在 ThreadCell 组件中添加：

```tsx
import { useState, useEffect } from 'react'

// 在组件内部添加状态
const [isConfirming, setIsConfirming] = useState(false)

// 添加 useEffect
useEffect(() => {
  if (!isConfirming) return

  const handleClickOutside = () => setIsConfirming(false)
  document.addEventListener('click', handleClickOutside)

  return () => document.removeEventListener('click', handleClickOutside)
}, [isConfirming])
```

- [ ] **Step 2: 修改 Cell 组件添加 onMouseLeave**

在 Cell 组件上添加：

```tsx
<Cell
  className={cn(
    'text-left',
    'hover:bg-black/10 dark:hover:bg-white/10',
    className
  )}
  onMouseLeave={() => isConfirming && setIsConfirming(false)}
>
```

- [ ] **Step 3: 修改 archive 按钮渲染逻辑**

将原来的：

```tsx
<Button
  className="hidden group-hover:inline-flex"
  variant="ghost"
  size="icon-sm"
  onClick={(e) => {
    e.stopPropagation()
    onDelete?.(thread.id)
  }}
>
  <HugeiconsIcon icon={Archive04Icon} className="h-3 w-3" />
</Button>
```

改为条件渲染：

```tsx
{isConfirming ? (
  <Button
    variant="destructive"
    size="icon-sm"
    onClick={(e) => {
      e.stopPropagation()
      onDelete?.(thread.id)
      setIsConfirming(false)
    }}
  >
    Confirm
  </Button>
) : (
  <Button
    className="hidden group-hover:inline-flex"
    variant="ghost"
    size="icon-sm"
    onClick={(e) => {
      e.stopPropagation()
      setIsConfirming(true)
    }}
  >
    <HugeiconsIcon icon={Archive04Icon} className="h-3 w-3" />
  </Button>
)}
```

- [ ] **Step 4: 验证修复**

运行应用，测试：
1. hover ThreadCell 显示 archive 按钮
2. 点击 archive 按钮显示 Confirm 按钮（红色）
3. 点击 Confirm 按钮执行归档
4. 点击空白处取消确认状态
5. 鼠标离开 Cell 取消确认状态

- [ ] **Step 5: 提交**

```bash
git add apps/desktop/src/renderer/src/components/app-shell/sidebar/cell/ThreadCell.tsx
git commit -m "feat(desktop): add two-phase confirm for ThreadCell archive action"
```

---

## Task 3: FolderCell 拖拽指针样式修复

**Files:**
- Modify: `apps/desktop/src/renderer/src/components/app-shell/sidebar/cell/FolderCell.tsx:67-74`

**Root Cause:** `cursor-grab` → `cursor-grabbing` 的切换发生在 `dragstart` 事件之后，视觉上有延迟。

**Solution:** 使用 CSS 强制在 drag 开始时立即显示 grabbing 指针，通过 `:active` 伪类或 JavaScript 即时切换。

- [ ] **Step 1: 检查当前指针样式实现**

当前 FolderCell 的 Cell className：

```tsx
className={cn(
  'hover:bg-black/10 dark:hover:bg-white/10',
  isDragging && 'cursor-grabbing opacity-50',
  draggable && !isDragging && 'cursor-grab',
  className
)}
```

问题：`isDragging` 状态更新滞后。

- [ ] **Step 2: 添加 `:active` 伪类处理**

修改 className，在 draggable 且未 dragging 时添加 `active:cursor-grabbing`：

```tsx
className={cn(
  'hover:bg-black/10 dark:hover:bg-white/10',
  isDragging && 'cursor-grabbing opacity-50',
  draggable && !isDragging && 'cursor-grab active:cursor-grabbing',
  className
)}
```

- [ ] **Step 3: 验证修复**

运行应用：
1. hover FolderCell 显示 grab 光标
2. 按下鼠标开始拖拽，光标立即变为 grabbing
3. 拖拽过程中保持 grabbing
4. 释放鼠标，光标恢复

- [ ] **Step 4: 提交**

```bash
git add apps/desktop/src/renderer/src/components/app-shell/sidebar/cell/FolderCell.tsx
git commit -m "fix(desktop): add active:cursor-grabbing for drag start feedback"
```

---

## 验证清单

所有任务完成后，运行以下验证：

```bash
# 1. TypeScript 检查
cd apps/desktop && bunx tsc --noEmit

# 2. Lint 检查
cd apps/desktop && bunx oxlint

# 3. 格式化检查
cd apps/desktop && bunx oxfmt
```

---

## 依赖关系

- Task 1 和 Task 3 可以并行进行（修改不同的行区域）
- Task 2 独立进行
