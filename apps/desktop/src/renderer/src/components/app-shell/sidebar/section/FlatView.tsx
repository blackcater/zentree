// apps/desktop/src/renderer/src/components/app-shell/sidebar/FlatView.tsx
import { useAtomValue } from 'jotai'

import { threadsAtom } from '../../atoms/thread-atoms'
import { ThreadCell } from '../cell/ThreadCell'

export function FlatView() {
	const threads = useAtomValue(threadsAtom)

	// Sort threads by updatedAt descending
	const sortedThreads = [...threads]
		.filter((t) => !t.isPinned)
		.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())

	return (
		<div className="flex flex-col gap-0.5">
			{sortedThreads.map((thread) => (
				<ThreadCell key={thread.id} thread={thread} />
			))}
		</div>
	)
}
