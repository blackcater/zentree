import { useEffect, useRef } from 'react'

import type { Session, Turn } from '@/shared/types'

import { Turn as TurnComponent } from './Turn'

interface MessageListProps {
	session: Session
}

export function MessageList({ session }: MessageListProps) {
	const containerRef = useRef<HTMLDivElement>(null)

	// Auto-scroll to bottom on new turns
	useEffect(() => {
		if (containerRef.current) {
			containerRef.current.scrollTop = containerRef.current.scrollHeight
		}
	}, [(session as unknown as { turns?: Turn[] }).turns?.length ?? 0])

	// Get turns from session - extended Session type with turns
	const turns = (session as unknown as { turns: Turn[] }).turns ?? []

	if (turns.length === 0) {
		return (
			<div className="flex-1 overflow-auto" ref={containerRef}>
				<div className="text-muted-foreground flex h-full items-center justify-center text-sm">
					Start a conversation by typing a message below.
				</div>
			</div>
		)
	}

	return (
		<div className="flex-1 overflow-auto px-4 py-4" ref={containerRef}>
			<div className="flex flex-col gap-4">
				{turns.map((turn) => (
					<TurnComponent key={turn.id} turn={turn} />
				))}
			</div>
		</div>
	)
}
