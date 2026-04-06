import { useState } from 'react'

import { cn } from '@acme-ai/ui'
import {
	Button,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@acme-ai/ui/foundation'
import {
	Folder01Icon,
	ArrowRight01Icon,
	PlusSignIcon,
	MoreHorizontalIcon,
	Folder02Icon,
	Folder03Icon,
	SplitIcon,
	Edit03Icon,
	Archive04Icon,
	Delete01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Cell, CellIcon, CellName, CellActions } from './Cell'

export interface FolderCellProps {
	className?: string
	id: string
	title: string
	isExpanded: boolean
	isDragging?: boolean
	onToggle: (id: string) => void
	onAddThread?: (folderId: string) => void
	onMenuOpenInFinder?: (id: string) => void
	onMenuCreateWorktree?: (id: string) => void
	onMenuEditName?: (id: string) => void
	onMenuArchiveThreads?: (id: string) => void
	onMenuDelete?: (id: string) => void
}

export function FolderCell({
	className,
	id,
	title,
	isExpanded,
	isDragging,
	onToggle,
	onAddThread,
	onMenuOpenInFinder,
	onMenuCreateWorktree,
	onMenuEditName,
	onMenuArchiveThreads,
	onMenuDelete,
}: Readonly<FolderCellProps>) {
	const [isMenuOpen, setIsMenuOpen] = useState(false)

	return (
		<Cell
			className={cn(
				'group-hover:bg-black/10 dark:group-hover:bg-white/10',
				'hover:bg-black/10 dark:hover:bg-white/10',
				!isDragging && 'cursor-grab active:cursor-grabbing',
				className
			)}
			data-cell="folder"
			onClick={() => onToggle(id)}
		>
			{/* 左侧图标 */}
			<CellIcon>
				{/* 文件夹图标 - 始终显示 */}
				<HugeiconsIcon
					icon={isExpanded ? Folder02Icon : Folder01Icon}
					className={cn(
						'text-foreground size-3.5',
						'opacity-100 group-hover:opacity-0'
					)}
				/>
				{/* 展开箭头 - 仅在 hover 时显示 */}
				<HugeiconsIcon
					icon={ArrowRight01Icon}
					className={cn(
						'text-foreground absolute size-3.5 transition-all duration-200',
						'opacity-0 group-hover:opacity-100',
						isExpanded ? 'rotate-90' : 'rotate-0'
					)}
				/>
			</CellIcon>

			{/* 名称 */}
			<CellName>{title}</CellName>

			{/* 操作区 */}
			<CellActions>
				<DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
					<DropdownMenuTrigger
						asChild
						onClick={(e) => e.stopPropagation()}
					>
						<Button variant="ghost" size="icon-sm">
							<HugeiconsIcon
								icon={MoreHorizontalIcon}
								className="size-3.5"
							/>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent className="w-fit" align="end">
						<DropdownMenuItem
							onClick={(e) => {
								e.preventDefault()
								onMenuOpenInFinder?.(id)
							}}
						>
							<HugeiconsIcon icon={Folder03Icon} />
							Open in Finder
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={(e) => {
								e.preventDefault()
								onMenuCreateWorktree?.(id)
							}}
						>
							<HugeiconsIcon
								icon={SplitIcon}
								className="rotate-90"
							/>
							Create permanent worktree
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={(e) => {
								e.preventDefault()
								onMenuEditName?.(id)
							}}
						>
							<HugeiconsIcon icon={Edit03Icon} />
							Edit name
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={(e) => {
								e.preventDefault()
								onMenuArchiveThreads?.(id)
							}}
						>
							<HugeiconsIcon icon={Archive04Icon} />
							Archive threads
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							variant="destructive"
							onClick={(e) => {
								e.preventDefault()
								onMenuDelete?.(id)
							}}
						>
							<HugeiconsIcon icon={Delete01Icon} />
							Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={(e) => {
						e.stopPropagation()
						onAddThread?.(id)
					}}
				>
					<HugeiconsIcon icon={PlusSignIcon} className="size-3.5" />
				</Button>
			</CellActions>
		</Cell>
	)
}
