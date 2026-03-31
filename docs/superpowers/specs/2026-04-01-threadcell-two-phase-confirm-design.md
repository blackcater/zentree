# ThreadCell 两阶段确认按钮设计方案

## 概述

在 ThreadCell 中为 archive 操作添加两阶段确认机制，防止误操作。

## 交互流程

1. **初始状态**：显示 archive 按钮（ghost 样式）
2. **点击 archive**：切换到确认状态，显示 Confirm 按钮（destructive 样式）
3. **点击 Confirm**：调用 `onDelete(thread.id)` 执行归档，然后重置状态
4. **点击空白处**：取消确认状态，恢复初始状态

## 状态管理

```typescript
const [isConfirming, setIsConfirming] = useState(false)
```

### 事件处理

- **archive 按钮点击**：`e.stopPropagation()` + `setIsConfirming(true)`
- **Confirm 按钮点击**：`e.stopPropagation()` + `onDelete?.(thread.id)` + `setIsConfirming(false)`
- **空白处点击**：通过 `useEffect` 监听 document click

### useEffect 实现

```typescript
useEffect(() => {
  if (!isConfirming) return
  const handleClickOutside = () => setIsConfirming(false)
  document.addEventListener('click', handleClickOutside)
  return () => document.removeEventListener('click', handleClickOutside)
}, [isConfirming])
```

## 渲染逻辑

```tsx
<CellActions>
  <span className="text-muted-foreground/60 text-xs group-hover:hidden">
    {formatDistanceToNow(thread.updatedAt, { addSuffix: true })}
  </span>
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
</CellActions>
```

## 实现文件

- `apps/desktop/src/renderer/src/components/app-shell/sidebar/cell/ThreadCell.tsx`

## 关键点

- `e.stopPropagation()` 阻止事件冒泡，避免触发父元素的 click
- 确认状态通过 document click 监听器取消
- 组件卸载时清理事件监听器
