import { FileIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

interface DiffViewProps {
	diffs: Array<{ file_id: string; filename: string; diff: string }>
}

export function DiffView({ diffs }: DiffViewProps) {
	if (!diffs || diffs.length === 0) return null

	return (
		<div className="flex flex-col gap-2">
			{diffs.map((diff) => (
				<div
					key={diff.file_id}
					className="border-border/50 flex flex-col overflow-hidden rounded-lg border"
				>
					<div className="bg-muted/30 flex items-center gap-2 px-3 py-1.5">
						<HugeiconsIcon
							icon={FileIcon}
							className="text-muted-foreground h-3 w-3"
						/>
						<span className="text-xs font-medium">
							{diff.filename}
						</span>
					</div>
					<pre className="bg-background max-h-64 overflow-auto px-3 py-2 font-mono text-xs">
						<code>{diff.diff}</code>
					</pre>
				</div>
			))}
		</div>
	)
}
