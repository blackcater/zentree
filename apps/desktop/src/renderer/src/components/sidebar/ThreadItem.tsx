import type { Thread } from '@/shared/ipc/types'

interface ThreadItemProps {
	thread: Thread
	isSelected: boolean
	onClick: () => void
}

export function ThreadItem({
	thread,
	isSelected,
	onClick,
}: Readonly<ThreadItemProps>): React.JSX.Element {
	const agentType = thread.agentId.split('-')[0] ?? 'claude'

	return (
		<button
			type="button"
			onClick={onClick}
			className={`flex h-8 w-full items-center gap-2 rounded-md px-3 text-sm ${
				isSelected
					? 'bg-primary text-primary-foreground'
					: 'hover:bg-accent'
			}`}
		>
			<span
				className={`flex h-5 w-5 items-center justify-center rounded text-xs font-bold ${
					isSelected
						? 'bg-primary-foreground/20 text-primary-foreground'
						: 'bg-accent text-accent-foreground'
				}`}
			>
				{agentType.charAt(0).toUpperCase()}
			</span>
			<span className="truncate">{thread.title}</span>
		</button>
	)
}
