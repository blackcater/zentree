import type { Turn as TurnType } from '@/shared/types'

import { AssistantParts } from './AssistantParts'
import { DiffView } from './DiffView'
import { ThinkingIndicator } from './ThinkingIndicator'
import { UserMessage } from './UserMessage'

interface TurnProps {
	turn: TurnType
}

export function Turn({ turn }: TurnProps) {
	// Find user message and assistant message from turn
	const userMessage = turn.messages.find((m) => m.role === 'user')
	const assistantMessage = turn.messages.find((m) => m.role === 'assistant')

	// Extended turn type with optional status and diffs for UI purposes
	const extendedTurn = turn as TurnType & {
		status?: 'in_progress' | 'completed'
		diffs?: Array<{ file_id: string; filename: string; diff: string }>
	}

	const isInProgress = extendedTurn.status === 'in_progress'
	const hasDiffs = extendedTurn.diffs && extendedTurn.diffs.length > 0

	return (
		<div className="flex flex-col gap-4">
			{userMessage && <UserMessage message={userMessage} />}

			{isInProgress ? (
				<ThinkingIndicator />
			) : (
				<>
					{assistantMessage && (
						<AssistantParts parts={assistantMessage.parts} />
					)}
					{hasDiffs && <DiffView diffs={extendedTurn.diffs!} />}
				</>
			)}
		</div>
	)
}
