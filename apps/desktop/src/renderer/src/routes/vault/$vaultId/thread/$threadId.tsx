import { createFileRoute } from '@tanstack/react-router'

import { Chat } from '@renderer/components/chat/Chat'

export const Route = createFileRoute('/vault/$vaultId/thread/$threadId')({
	component: ThreadPage,
})

function ThreadPage() {
	const { threadId } = Route.useParams()

	return <Chat threadId={threadId} />
}
