// apps/desktop/src/renderer/src/components/popup/PopupThreadView.tsx
interface PopupThreadViewProps {
  threadId: string
}
export function PopupThreadView({ threadId }: PopupThreadViewProps) {
  return <div>Popup Thread View: {threadId}</div>
}