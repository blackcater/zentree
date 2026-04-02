import { useState, useEffect } from 'react'

import { cn } from '@acme-ai/ui'
import { Button } from '@acme-ai/ui/foundation'
import { Archive04Icon, PinIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { formatRelativeTime } from '@renderer/lib/time'
import type { Thread } from '@renderer/types'

import { Cell, CellIcon, CellName, CellActions } from './Cell'

export interface ThreadCellProps {
	className?: string
	thread: Thread
	isPinned?: boolean
	onTogglePin?: (id: string) => void
	onArchive?: (id: string) => void
}

export function ThreadCell({
	className,
	thread,
	isPinned = false,
	onTogglePin,
	onArchive,
}: Readonly<ThreadCellProps>) {
	const [isConfirming, setIsConfirming] = useState(false)

	useEffect(() => {
		if (!isConfirming) return

		const handleClickOutside = () => setIsConfirming(false)
		document.addEventListener('click', handleClickOutside)

		return () => document.removeEventListener('click', handleClickOutside)
	}, [isConfirming])

	return (
		<Cell
			className={cn(
				'text-left select-none',
				'hover:bg-black/10 dark:hover:bg-white/10',
				className
			)}
			onClick={(e) => e.stopPropagation()}
			onMouseLeave={() => isConfirming && setIsConfirming(false)}
		>
			{/* Left icon area: show pin icon */}
			<CellIcon
				className="cursor-pointer"
				onClick={(e) => {
					e.stopPropagation()
					onTogglePin?.(thread.id)
				}}
			>
				<HugeiconsIcon
					icon={PinIcon}
					className={cn(
						'text-muted-foreground size-3.5 transition-opacity',
						isPinned
							? 'opacity-100'
							: 'opacity-0 group-hover:opacity-100'
					)}
				/>
			</CellIcon>

			{/* Name */}
			<CellName className="text-foreground">{thread.title}</CellName>

			{/* Tail: time + hover actions */}
			<div className="flex items-center gap-2">
				<CellActions>
					<span className="text-muted-foreground/60 text-xs group-hover:hidden">
						{formatRelativeTime(thread.updatedAt)}
					</span>
					{isConfirming ? (
						<Button
							className="rounded-full"
							variant="destructive"
							size="xs"
							onClick={(e) => {
								e.stopPropagation()
								onArchive?.(thread.id)
								setIsConfirming(false)
							}}
						>
							Confirm
						</Button>
					) : (
						<Button
							className="hidden group-hover:inline-flex"
							variant="ghost"
							size="icon-sm"
							onClick={(e) => {
								e.stopPropagation()
								setIsConfirming(true)
							}}
						>
							<HugeiconsIcon
								icon={Archive04Icon}
								className="size-3"
							/>
						</Button>
					)}
				</CellActions>
			</div>
		</Cell>
	)
}
