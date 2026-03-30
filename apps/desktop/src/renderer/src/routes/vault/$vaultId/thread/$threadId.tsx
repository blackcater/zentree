// apps/desktop/src/renderer/src/routes/vault/$vaultId/thread/$threadId.tsx
import { ThreadView } from '../../../../components/vault/ThreadView'

interface ThreadPageProps {
  threadId: string
}

function ThreadPage({ threadId }: ThreadPageProps) {
  return <ThreadView threadId={threadId} />
}

export { ThreadPage }
