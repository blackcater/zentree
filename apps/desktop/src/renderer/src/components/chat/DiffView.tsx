import { FileIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import type { FileDiff } from '@/shared/types'

interface DiffViewProps {
	diffs: FileDiff[]
}

export function DiffView({ diffs }: DiffViewProps) {
	if (!diffs || diffs.length === 0) return null

	return (
		<div className="flex flex-col gap-2">
			{diffs.map((diff) => (
				<div
					key={diff.path}
					className="border-border/50 flex flex-col overflow-hidden rounded-lg border"
				>
					<div className="bg-muted/30 flex items-center gap-2 px-3 py-1.5">
						<HugeiconsIcon
							icon={FileIcon}
							className="text-muted-foreground h-3 w-3"
						/>
						<span className="text-xs font-medium">{diff.path}</span>
						<span className="text-muted-foreground ml-auto text-xs">
							{diff.status}
						</span>
					</div>
					<pre className="bg-background max-h-64 overflow-auto px-3 py-2 font-mono text-xs">
						<code>{diff.after || diff.before || ''}</code>
					</pre>
				</div>
			))}
		</div>
	)
}
