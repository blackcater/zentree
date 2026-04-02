import { useAtomValue, useSetAtom } from 'jotai'

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

import {
	isAllProjectsCollapsedAtom,
	isAllProjectsExpandedAtom,
} from '@renderer/atoms/project'
import { sidebarAtom } from '@renderer/atoms/sidebar'
import type { OrganizeMode, ShowMode, SortBy } from '@renderer/types/sidebar'

import { TitleCell } from './TitleCell'

interface Props {
	title: string
	onSort?: () => void
	onAdd?: () => void
	className?: string
}

export function ThreadTitleCell({
	title,
	onSort,
	onAdd,
	...props
}: Readonly<Props>) {
	const isAllProjectsExpanded = useAtomValue(isAllProjectsExpandedAtom)
	const isAllProjectsCollapsed = useAtomValue(isAllProjectsCollapsedAtom)
	const [sidebar, setSidebar] = useAtom(sidebarAtom)

	const handleOrganizeChange = (mode: OrganizeMode) => {
		setSidebar((prev) => ({ ...prev, organizeMode: mode }))
	}

	const handleSortByChange = (sortBy: SortBy) => {
		setSidebar((prev) => ({ ...prev, sortBy }))
	}

	const handleShowModeChange = (mode: ShowMode) => {
		setSidebar((prev) => ({ ...prev, showMode: mode }))
	}

	return (
		<TitleCell title={title} {...props}>
			{isAllProjectsExpanded && (
				<Button
					variant="ghost"
					size="icon-sm"
					aria-label="Collapse All"
				>
					<HugeiconsIcon icon={CollapseIcon} className="size-3.5" />
				</Button>
			)}
			{isAllProjectsCollapsed && (
				<Button variant="ghost" size="icon-sm" aria-label="Expand All">
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
							onCheckedChange={() => handleOrganizeChange('folder')}
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
							onCheckedChange={() => handleSortByChange('createdAt')}
						>
							<HugeiconsIcon icon={BubbleChatAddIcon} />
							Created
						</DropdownMenuCheckboxItem>
						<DropdownMenuCheckboxItem
							checked={sidebar.sortBy === 'updatedAt'}
							onCheckedChange={() => handleSortByChange('updatedAt')}
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
							onCheckedChange={() => handleShowModeChange('relevant')}
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
