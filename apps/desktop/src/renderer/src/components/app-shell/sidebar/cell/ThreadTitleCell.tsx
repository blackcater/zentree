import {
	Button,
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from '@acme-ai/ui/foundation'
import {
	BubbleChatAddIcon,
	Chatting01Icon,
	Clock01Icon,
	CollapseIcon,
	ExpandIcon,
	FilterMailIcon,
	Folder01Icon,
	FolderAddIcon,
	MessageEdit01Icon,
	StarIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useAtom, useAtomValue } from 'jotai'

import {
	isAllProjectsCollapsedAtom,
	isAllProjectsExpandedAtom,
} from '@renderer/stores'
import { sidebarAtom } from '@renderer/stores'
import type {
	OrganizeMode,
	ShowMode,
	SidebarState,
	SortBy,
} from '@renderer/types/sidebar'

import { TitleCell } from './TitleCell'

interface Props {
	title: string
	onSort?: () => void
	onAdd?: () => void
	onCollapseAll?: () => void
	onExpandAll?: () => void
	className?: string
}

export function ThreadTitleCell({
	title,
	onSort,
	onAdd,
	onCollapseAll,
	onExpandAll,
	...props
}: Readonly<Props>) {
	const isAllProjectsExpanded = useAtomValue(isAllProjectsExpandedAtom)
	const isAllProjectsCollapsed = useAtomValue(isAllProjectsCollapsedAtom)
	const [sidebar, setSidebar] = useAtom(sidebarAtom)

	const handleOrganizeChange = (mode: OrganizeMode) => {
		setSidebar((prev: SidebarState) => ({ ...prev, organizeMode: mode }))
	}

	const handleSortByChange = (sortBy: SortBy) => {
		setSidebar((prev: SidebarState) => ({ ...prev, sortBy }))
	}

	const handleShowModeChange = (mode: ShowMode) => {
		setSidebar((prev: SidebarState) => ({ ...prev, showMode: mode }))
	}

	return (
		<TitleCell title={title} {...props}>
			{isAllProjectsExpanded && (
				<Button
					variant="ghost"
					size="icon-sm"
					aria-label="Collapse All"
					onClick={(e) => {
						e.stopPropagation()
						onCollapseAll?.()
					}}
				>
					<HugeiconsIcon icon={CollapseIcon} className="size-3.5" />
				</Button>
			)}
			{isAllProjectsCollapsed && (
				<Button
					variant="ghost"
					size="icon-sm"
					aria-label="Expand All"
					onClick={(e) => {
						e.stopPropagation()
						onExpandAll?.()
					}}
				>
					<HugeiconsIcon icon={ExpandIcon} className="size-3.5" />
				</Button>
			)}
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={(e) => {
							e.stopPropagation()
							onSort?.()
						}}
						aria-label="Sort"
					>
						<HugeiconsIcon
							icon={FilterMailIcon}
							className="size-3.5"
						/>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent className="w-fit" align="end">
					<DropdownMenuGroup>
						<DropdownMenuLabel>Organize</DropdownMenuLabel>
						<DropdownMenuCheckboxItem
							checked={sidebar.organizeMode === 'folder'}
							onCheckedChange={() =>
								handleOrganizeChange('folder')
							}
						>
							<HugeiconsIcon icon={Folder01Icon} />
							By Project
						</DropdownMenuCheckboxItem>
						<DropdownMenuCheckboxItem
							checked={sidebar.organizeMode === 'flat'}
							onCheckedChange={() => handleOrganizeChange('flat')}
						>
							<HugeiconsIcon icon={Clock01Icon} />
							Chronological list
						</DropdownMenuCheckboxItem>
					</DropdownMenuGroup>
					<DropdownMenuGroup>
						<DropdownMenuLabel>Sort by</DropdownMenuLabel>
						<DropdownMenuCheckboxItem
							checked={sidebar.sortBy === 'createdAt'}
							onCheckedChange={() =>
								handleSortByChange('createdAt')
							}
						>
							<HugeiconsIcon icon={BubbleChatAddIcon} />
							Created
						</DropdownMenuCheckboxItem>
						<DropdownMenuCheckboxItem
							checked={sidebar.sortBy === 'updatedAt'}
							onCheckedChange={() =>
								handleSortByChange('updatedAt')
							}
						>
							<HugeiconsIcon icon={MessageEdit01Icon} />
							Updated
						</DropdownMenuCheckboxItem>
					</DropdownMenuGroup>
					<DropdownMenuGroup>
						<DropdownMenuLabel>Show</DropdownMenuLabel>
						<DropdownMenuCheckboxItem
							checked={sidebar.showMode === 'all'}
							onCheckedChange={() => handleShowModeChange('all')}
						>
							<HugeiconsIcon icon={Chatting01Icon} />
							All threads
						</DropdownMenuCheckboxItem>
						{/* Only show recent threads for the current branch, worktrees, or other threads that need your attention */}
						<DropdownMenuCheckboxItem
							checked={sidebar.showMode === 'relevant'}
							onCheckedChange={() =>
								handleShowModeChange('relevant')
							}
						>
							<HugeiconsIcon icon={StarIcon} />
							Relevant
						</DropdownMenuCheckboxItem>
					</DropdownMenuGroup>
				</DropdownMenuContent>
			</DropdownMenu>
			<Button
				variant="ghost"
				size="icon-sm"
				onClick={(e) => {
					e.stopPropagation()
					onAdd?.()
				}}
				aria-label="Add"
			>
				<HugeiconsIcon icon={FolderAddIcon} className="size-3.5" />
			</Button>
		</TitleCell>
	)
}
