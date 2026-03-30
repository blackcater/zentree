// apps/desktop/src/renderer/src/routes/popup/$threadId.layout.tsx
import { Outlet } from '@tanstack/react-router'

function PopupLayout() {
  return (
    <div className="h-screen">
      {/* TODO: 添加置顶等功能 */}
      <Outlet />
    </div>
  )
}

export { PopupLayout }