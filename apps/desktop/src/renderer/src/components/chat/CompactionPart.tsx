import { SparklesIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import type { CompactionPart } from '@/shared/types'

interface CompactionPartProps {
	part: CompactionPart
}

export function CompactionPart({ part }: CompactionPartProps) {
	const message = part.message || 'Context compacted'

	return (
		<div className="flex items-center gap-3 py-2">
			<div className="border-muted-foreground/20 flex-1 border-t" />
			<div className="flex items-center gap-2 px-3 py-1">
				<HugeiconsIcon
					icon={SparklesIcon}
					className="h-3.5 w-3.5 shrink-0 text-blue-600/70"
				/>
				<span className="text-muted-foreground text-xs whitespace-nowrap">
					{message}
				</span>
			</div>
			<div className="border-muted-foreground/20 flex-1 border-t" />
		</div>
	)
}
