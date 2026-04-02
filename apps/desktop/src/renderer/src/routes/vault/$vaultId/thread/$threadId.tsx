import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/vault/$vaultId/thread/$threadId')({
	component: ThreadPage,
})

export function ThreadPage() {
	const { threadId } = Route.useParams()

	if (!threadId) {
		return (
			<div className="flex h-full items-center justify-center">
				New Thread (no threadId)
			</div>
		)
	}

	return <div>Thread View: {threadId}</div>
}
