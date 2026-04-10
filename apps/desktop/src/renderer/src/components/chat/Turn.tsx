import type { Turn as TurnType } from '@/shared/types'

import { AssistantParts } from './AssistantParts'
import { DiffView } from './DiffView'
import { ThinkingIndicator } from './ThinkingIndicator'
import { UserMessage } from './UserMessage'

interface TurnProps {
	turn: TurnType
}

export function Turn({ turn }: TurnProps) {
	const isInProgress = turn.status === 'in_progress'

	return (
		<div className="flex flex-col gap-4">
			<UserMessage message={turn.userMessage} />

			{isInProgress ? (
				<ThinkingIndicator />
			) : (
				<>
					<AssistantParts parts={turn.assistantParts} />
					{turn.diffs && turn.diffs.length > 0 && (
						<DiffView diffs={turn.diffs} />
					)}
				</>
			)}
		</div>
	)
}
