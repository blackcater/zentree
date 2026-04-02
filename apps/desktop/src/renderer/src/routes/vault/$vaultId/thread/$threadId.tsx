import { createFileRoute } from '@tanstack/react-router'

import { Chat } from '@renderer/components/chat/Chat'

export const Route = createFileRoute('/vault/$vaultId/thread/$threadId')({
	component: ThreadPage,
})

export function ThreadPage() {
	const { threadId } = Route.useParams()

	if (!threadId) {
		return null
	}

	return <Chat threadId={threadId} />
}
