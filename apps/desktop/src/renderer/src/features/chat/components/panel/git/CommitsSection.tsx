import { Time01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useAtomValue } from 'jotai'

import { gitLogAtom } from '@renderer/stores/git.atoms'

export function CommitsSection() {
	const log = useAtomValue(gitLogAtom)

	const formatDate = (dateStr: string) => {
		const date = new Date(dateStr)
		const now = new Date()
		const diffMs = now.getTime() - date.getTime()
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

		if (diffDays === 0) return 'Today'
		if (diffDays === 1) return 'Yesterday'
		if (diffDays < 7) return `${diffDays} days ago`
		return date.toLocaleDateString()
	}

	if (!log || log.length === 0) {
		return (
			<div className="flex flex-1 items-center justify-center">
				<p className="text-muted-foreground/50 text-[10px]">
					No commits yet
				</p>
			</div>
		)
	}

	return (
		<div className="flex flex-1 flex-col overflow-auto">
			<ul className="space-y-2 px-3 py-2">
				{log.map((entry, index) => (
					<li
						key={`${entry.hash}-${index}`}
						className="hover:bg-foreground/[0.02] flex gap-2 rounded-md px-2 py-1.5 transition-colors"
					>
						<div className="flex h-5 w-5 shrink-0 items-center justify-center">
							<HugeiconsIcon
								icon={Time01Icon}
								className="text-muted-foreground/50 h-3 w-3"
							/>
						</div>
						<div className="flex min-w-0 flex-1 flex-col">
							<div className="flex items-center gap-2">
								<span className="text-muted-foreground/70 font-mono text-[10px]">
									{entry.hash.substring(0, 7)}
								</span>
								<span className="text-muted-foreground/50 text-[10px]">
									{formatDate(entry.date)}
								</span>
							</div>
							<p
								className="text-foreground/80 mt-0.5 truncate text-xs"
								title={entry.message}
							>
								{entry.message}
							</p>
							<span className="text-muted-foreground/50 mt-0.5 text-[10px]">
								{entry.author_name}
							</span>
						</div>
					</li>
				))}
			</ul>
		</div>
	)
}
