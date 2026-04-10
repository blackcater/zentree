import { useState } from 'react'

import {
	SparklesIcon,
	ArrowDown01Icon,
	ArrowUp01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import type { ReasoningPart } from '@/shared/types'

interface ReasoningPartProps {
	part: ReasoningPart
	defaultExpanded?: boolean
}

// Chevron icon for expand/collapse
function ChevronIcon({ isExpanded }: { isExpanded: boolean }) {
	return (
		<HugeiconsIcon
			icon={isExpanded ? ArrowUp01Icon : ArrowDown01Icon}
			className="text-muted-foreground h-4 w-4 transition-transform"
		/>
	)
}

export function ReasoningPart({
	part,
	defaultExpanded = false,
}: ReasoningPartProps) {
	const [isExpanded, setIsExpanded] = useState(defaultExpanded)

	// Truncate reasoning for summary view
	const maxSummaryLength = 150
	const isLong = part.text.length > maxSummaryLength
	const summary = isLong
		? part.text.slice(0, maxSummaryLength) + '...'
		: part.text

	return (
		<div className="bg-muted/30 overflow-hidden rounded-lg">
			{/* Header */}
			<button
				type="button"
				onClick={() => setIsExpanded(!isExpanded)}
				className="hover:bg-muted/40 flex w-full items-center gap-2 px-3 py-2 text-left transition-colors"
			>
				<HugeiconsIcon
					icon={SparklesIcon}
					className="h-4 w-4 shrink-0 text-amber-600/70"
				/>
				<span className="text-muted-foreground text-xs font-medium">
					Reasoning
				</span>
				{isLong && <ChevronIcon isExpanded={isExpanded} />}
			</button>

			{/* Content */}
			<div className="px-3 pb-2">
				<div className="text-muted-foreground text-xs whitespace-pre-wrap">
					{isExpanded ? part.text : summary}
				</div>
				{isLong && !isExpanded && (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation()
							setIsExpanded(true)
						}}
						className="mt-1 text-xs text-blue-500 hover:text-blue-600"
					>
						Show more
					</button>
				)}
			</div>
		</div>
	)
}
