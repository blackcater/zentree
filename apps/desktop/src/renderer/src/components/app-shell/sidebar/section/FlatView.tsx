import { useAtomValue } from 'jotai'

import { threadsAtom } from '@renderer/stores'

import { ThreadCell } from '../cell/ThreadCell'

export function FlatView() {
	const threads = useAtomValue(threadsAtom)

	// Sort threads by updatedAt descending
	const sortedThreads = [...threads]
		.filter((t) => !t.isPinned)
		.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())

	return (
		<div className="flex max-w-full flex-col gap-0.5">
			{sortedThreads.map((thread) => (
				<ThreadCell key={thread.id} thread={thread} />
			))}
		</div>
	)
}
