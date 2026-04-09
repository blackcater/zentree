import { useGitActions } from '@renderer/hooks/chat/useGitActions'
import { useGitStatus } from '@renderer/hooks/chat/useGitStatus'

export function ChangesSection() {
	const { status } = useGitStatus()
	const { stage, unstage, stageAll, unstageAll, discard } = useGitActions()

	const hasStaged = status && status.staged.length > 0
	const hasUnstaged =
		status && (status.unstaged.length > 0 || status.untracked.length > 0)

	const handleStage = async (files: string[]) => {
		await stage(files)
	}

	const handleUnstage = async (files: string[]) => {
		await unstage(files)
	}

	const handleDiscard = async (files: string[]) => {
		await discard(files)
	}

	return (
		<div className="flex flex-1 flex-col overflow-auto">
			{/* Staged files */}
			<div className="px-3 py-2">
				<div className="flex items-center justify-between">
					<span className="text-muted-foreground/70 text-[10px] font-semibold uppercase">
						Staged ({status?.staged.length || 0})
					</span>
					{hasStaged && (
						<button
							onClick={() => unstageAll()}
							className="text-muted-foreground hover:text-foreground text-[10px] transition-colors"
						>
							Unstage All
						</button>
					)}
				</div>
				{hasStaged ? (
					<ul className="mt-1 space-y-0.5">
						{status?.staged.map((file) => (
							<li
								key={file}
								className="hover:bg-foreground/[0.02] flex items-center justify-between rounded px-1.5 py-0.5"
							>
								<span
									className="truncate text-xs text-emerald-600/80"
									title={file}
								>
									{file.split('/').pop()}
								</span>
								<button
									onClick={() => handleUnstage([file])}
									className="text-muted-foreground hover:text-foreground text-[10px] transition-colors"
									title="Unstage"
								>
									×
								</button>
							</li>
						))}
					</ul>
				) : (
					<p className="text-muted-foreground/50 mt-1 text-[10px]">
						No staged files
					</p>
				)}
			</div>

			{/* Unstaged files */}
			<div className="px-3 py-2">
				<div className="flex items-center justify-between">
					<span className="text-muted-foreground/70 text-[10px] font-semibold uppercase">
						Changes ({status?.unstaged.length || 0})
					</span>
					{hasUnstaged && (
						<button
							onClick={() => stageAll()}
							className="text-muted-foreground hover:text-foreground text-[10px] transition-colors"
						>
							Stage All
						</button>
					)}
				</div>
				{hasUnstaged ? (
					<ul className="mt-1 space-y-0.5">
						{status?.unstaged.map((file) => (
							<li
								key={file}
								className="hover:bg-foreground/[0.02] flex items-center justify-between rounded px-1.5 py-0.5"
							>
								<span
									className="truncate text-xs text-orange-600/80"
									title={file}
								>
									{file.split('/').pop()}
								</span>
								<div className="flex items-center gap-1">
									<button
										onClick={() => handleStage([file])}
										className="text-muted-foreground text-[10px] transition-colors hover:text-emerald-600"
										title="Stage"
									>
										+
									</button>
									<button
										onClick={() => handleDiscard([file])}
										className="text-muted-foreground text-[10px] transition-colors hover:text-red-500"
										title="Discard"
									>
										×
									</button>
								</div>
							</li>
						))}
						{status?.untracked.map((file) => (
							<li
								key={file}
								className="hover:bg-foreground/[0.02] flex items-center justify-between rounded px-1.5 py-0.5"
							>
								<span
									className="text-muted-foreground truncate text-xs"
									title={file}
								>
									{file.split('/').pop()}
								</span>
								<div className="flex items-center gap-1">
									<button
										onClick={() => handleStage([file])}
										className="text-muted-foreground text-[10px] transition-colors hover:text-emerald-600"
										title="Add"
									>
										+
									</button>
								</div>
							</li>
						))}
					</ul>
				) : (
					<p className="text-muted-foreground/50 mt-1 text-[10px]">
						No changes
					</p>
				)}
			</div>
		</div>
	)
}
