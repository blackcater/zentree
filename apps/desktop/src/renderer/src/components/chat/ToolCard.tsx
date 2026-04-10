import { useState } from 'react'

import {
	ToolsIcon,
	ArrowDown01Icon,
	ArrowUp01Icon,
	CheckmarkCircle02Icon,
	TimeIcon,
	AlertCircleIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import type { ToolPart } from '@/shared/types'

interface ToolCardProps {
	part: ToolPart
}

function ChevronIcon({ isExpanded }: { isExpanded: boolean }) {
	return (
		<HugeiconsIcon
			icon={isExpanded ? ArrowUp01Icon : ArrowDown01Icon}
			className="text-muted-foreground h-4 w-4 transition-transform"
		/>
	)
}

function StatusDot({ status }: { status: ToolPart['status'] }) {
	const colors = {
		pending: 'bg-yellow-500',
		running: 'bg-blue-500 animate-pulse',
		completed: 'bg-green-500',
		error: 'bg-red-500',
	}

	return (
		<span
			className={`h-2 w-2 rounded-full ${colors[status]}`}
			title={status}
		/>
	)
}

export function ToolCard({ part }: ToolCardProps) {
	const [isExpanded, setIsExpanded] = useState(false)

	const formatJson = (obj: Record<string, unknown>) => {
		return JSON.stringify(obj, null, 2)
	}

	return (
		<div className="border-border/50 overflow-hidden rounded-lg border">
			{/* Header */}
			<button
				type="button"
				onClick={() => setIsExpanded(!isExpanded)}
				className="bg-muted/30 hover:bg-muted/40 flex w-full items-center gap-2 px-3 py-2 text-left transition-colors"
			>
				<HugeiconsIcon
					icon={ToolsIcon}
					className="text-muted-foreground h-4 w-4 shrink-0"
				/>
				<span className="font-mono text-xs font-medium">
					{part.tool}
				</span>
				<StatusDot status={part.status} />
				<span className="flex-1" />
				<ChevronIcon isExpanded={isExpanded} />
			</button>

			{/* Expanded content */}
			{isExpanded && (
				<div className="flex flex-col gap-3 p-3">
					{/* Input */}
					<div className="flex flex-col gap-1">
						<span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
							Input
						</span>
						<pre className="bg-background overflow-auto rounded-md px-3 py-2 font-mono text-xs">
							<code>{formatJson(part.input)}</code>
						</pre>
					</div>

					{/* Output or Error */}
					{part.output && (
						<div className="flex flex-col gap-1">
							<span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
								Output
							</span>
							<pre className="bg-background overflow-auto rounded-md px-3 py-2 font-mono text-xs">
								<code>{part.output}</code>
							</pre>
						</div>
					)}

					{part.error && (
						<div className="flex flex-col gap-1">
							<span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
								Error
							</span>
							<pre className="overflow-auto rounded-md bg-red-500/10 px-3 py-2 font-mono text-xs text-red-600 dark:text-red-400">
								<code>{part.error}</code>
							</pre>
						</div>
					)}

					{/* Status badge */}
					<div className="flex items-center gap-1.5 text-xs">
						{part.status === 'completed' && (
							<>
								<HugeiconsIcon
									icon={CheckmarkCircle02Icon}
									className="h-3.5 w-3.5 text-green-500"
								/>
								<span className="text-green-600 dark:text-green-400">
									Completed
								</span>
							</>
						)}
						{part.status === 'error' && (
							<>
								<HugeiconsIcon
									icon={AlertCircleIcon}
									className="h-3.5 w-3.5 text-red-500"
								/>
								<span className="text-red-600 dark:text-red-400">
									Error
								</span>
							</>
						)}
						{part.status === 'pending' && (
							<>
								<HugeiconsIcon
									icon={TimeIcon}
									className="h-3.5 w-3.5 text-yellow-500"
								/>
								<span className="text-yellow-600 dark:text-yellow-400">
									Pending
								</span>
							</>
						)}
						{part.status === 'running' && (
							<>
								<span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
								<span className="text-blue-600 dark:text-blue-400">
									Running
								</span>
							</>
						)}
					</div>
				</div>
			)}
		</div>
	)
}
