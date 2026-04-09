import { FolderOpenIcon, RefreshIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { PanelHeader } from '../shared/PanelHeader'
import { SearchBar } from '../shared/SearchBar'

interface ProjectFilesPanelHeaderProps {
	totalFiles: number
	onSearch: (value: string) => void
	onRefresh: () => void
	loading?: boolean
}

export function ProjectFilesPanelHeader({
	totalFiles,
	onSearch,
	onRefresh,
	loading = false,
}: ProjectFilesPanelHeaderProps) {
	return (
		<div className="flex flex-col">
			<PanelHeader
				iconNode={
					<HugeiconsIcon
						icon={FolderOpenIcon}
						className="h-3 w-3 shrink-0 text-teal-600/70"
					/>
				}
				label="Project Files"
			>
				<span className="text-muted-foreground text-[10px] font-medium">
					{totalFiles} {totalFiles === 1 ? 'file' : 'files'}
				</span>
				<button
					type="button"
					onClick={onRefresh}
					disabled={loading}
					className="text-muted-foreground hover:text-foreground/75 rounded p-0.5 disabled:cursor-not-allowed disabled:opacity-50"
				>
					<HugeiconsIcon
						icon={RefreshIcon}
						className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`}
					/>
				</button>
			</PanelHeader>
			<SearchBar
				value=""
				onChange={onSearch}
				placeholder="Search files..."
			/>
		</div>
	)
}
