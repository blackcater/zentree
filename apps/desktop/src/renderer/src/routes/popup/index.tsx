// apps/desktop/src/renderer/src/routes/popup/index.tsx
import { PopupThreadView } from '../../components/popup/PopupThreadView'

interface PopupIndexProps {
  threadId: string
}

function PopupIndex({ threadId }: PopupIndexProps) {
  return <PopupThreadView threadId={threadId} />
}

export { PopupIndex }