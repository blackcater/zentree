import { IdeaIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

export function ThinkingIndicator() {
	return (
		<div className="text-muted-foreground flex items-center gap-2">
			<HugeiconsIcon icon={IdeaIcon} className="h-4 w-4 animate-pulse" />
			<span className="text-xs">Thinking...</span>
		</div>
	)
}
