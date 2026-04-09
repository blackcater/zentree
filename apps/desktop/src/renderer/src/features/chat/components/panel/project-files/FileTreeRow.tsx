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
	ArrowRight01Icon,
	File02Icon,
	Folder02Icon,
	Edit02Icon,
	File01Icon,
	Folder01Icon,
	Link01Icon,
	FolderOpenIcon as ShowInFinderIcon,
	Delete02Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import type { FileNode, FileOperationCallbacks } from './types'

const EXTENSION_COLORS: Record<string, string> = {
	// JavaScript/TypeScript
	js: 'text-yellow-500',
	jsx: 'text-yellow-500',
	ts: 'text-blue-500',
	tsx: 'text-blue-500',
	mjs: 'text-yellow-500',
	cts: 'text-blue-500',

	// Web
	html: 'text-orange-500',
	htm: 'text-orange-500',
	css: 'text-purple-500',
	scss: 'text-pink-500',
	sass: 'text-pink-500',
	less: 'text-blue-400',

	// Data/Config
	json: 'text-green-500',
	yaml: 'text-red-400',
	yml: 'text-red-400',
	toml: 'text-orange-400',
	xml: 'text-orange-400',

	// Shell/Build
	sh: 'text-green-400',
	bash: 'text-green-400',
	zsh: 'text-green-400',
	makefile: 'text-purple-400',

	// Images
	png: 'text-pink-400',
	jpg: 'text-pink-400',
	jpeg: 'text-pink-400',
	gif: 'text-pink-400',
	svg: 'text-pink-400',
	webp: 'text-pink-400',
	ico: 'text-pink-400',

	// Documents
	md: 'text-blue-400',
	markdown: 'text-blue-400',
	txt: 'text-gray-400',
	pdf: 'text-red-500',
	doc: 'text-blue-500',
	docx: 'text-blue-500',

	// Code
	py: 'text-green-500',
	rb: 'text-red-500',
	go: 'text-cyan-500',
	rs: 'text-orange-500',
	java: 'text-red-500',
	kt: 'text-purple-500',
	swift: 'text-orange-500',
	c: 'text-blue-400',
	cpp: 'text-blue-400',
	h: 'text-blue-400',
	hpp: 'text-blue-400',
	cs: 'text-purple-500',
	php: 'text-purple-500',
	lua: 'text-purple-400',
	r: 'text-blue-500',

	// Shell/CLI
	ps1: 'text-blue-400',
	cmd: 'text-green-400',
	bat: 'text-green-400',
	exe: 'text-green-400',

	// Archives
	zip: 'text-yellow-500',
	tar: 'text-yellow-500',
	gz: 'text-yellow-500',
	rar: 'text-yellow-500',
	'7z': 'text-yellow-500',

	// Database
	sql: 'text-blue-400',
	db: 'text-green-400',
	sqlite: 'text-green-400',

	// Other
	gitignore: 'text-gray-400',
	lock: 'text-gray-400',
}

function getExtensionColor(extension?: string): string {
	if (!extension) return 'text-gray-400'
	return EXTENSION_COLORS[extension.toLowerCase()] || 'text-gray-400'
}

export interface FileTreeRowProps extends FileOperationCallbacks {
	node: FileNode
	depth: number
	isExpanded: boolean
	isCreating?: boolean
	creatingType?: 'file' | 'folder'
	isRenaming?: boolean
	renamedName?: string
	onToggle: (node: FileNode) => void
	onFileClick: (node: FileNode) => void
	onCommitCreate?: (name: string, type: 'file' | 'folder') => void
	onCancelCreate?: () => void
	onStartRename?: (node: FileNode) => void
	onCommitRename?: (oldName: string, newName: string) => void
	onCancelRename?: () => void
}

export function FileTreeRow({
	node,
	depth,
	isExpanded,
	isCreating = false,
	creatingType = 'file',
	isRenaming = false,
	renamedName = '',
	onToggle,
	onFileClick,
	onCommitCreate,
	onCancelCreate,
	onStartRename,
	onCommitRename,
	onCancelRename,
	onOpenInEditor,
	onNewFile,
	onNewFolder,
	onCopyPath,
	onShowInFinder,
	onMoveToTrash,
}: FileTreeRowProps) {
	const [isMenuOpen, setIsMenuOpen] = useState(false)
	const [hovered, setHovered] = useState(false)
	const [creatingName, setCreatingName] = useState('')
	const [renameValue, setRenameValue] = useState(renamedName || node.name)

	const paddingLeft = depth * 16 + 8
	const isDirectory = node.type === 'directory'

	const handleClick = (e: React.MouseEvent) => {
		e.stopPropagation()
		if (isDirectory) {
			onToggle(node)
		} else {
			onFileClick(node)
		}
	}

	const handleContextMenu = (e: React.MouseEvent) => {
		e.preventDefault()
		setIsMenuOpen(true)
	}

	const handleCreateSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		e.stopPropagation()
		if (creatingName.trim() && onCommitCreate) {
			onCommitCreate(creatingName.trim(), creatingType)
			setCreatingName('')
		}
	}

	const handleCreateCancel = (e: React.MouseEvent) => {
		e.stopPropagation()
		e.preventDefault()
		setCreatingName('')
		onCancelCreate?.()
	}

	const handleRenameSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		e.stopPropagation()
		if (renameValue.trim() && renameValue !== node.name && onCommitRename) {
			onCommitRename(node.name, renameValue.trim())
		} else {
			setRenameValue(node.name)
			onCancelRename?.()
		}
	}

	const handleRenameCancel = (e: React.MouseEvent) => {
		e.stopPropagation()
		e.preventDefault()
		setRenameValue(node.name)
		onCancelRename?.()
	}

	if (isCreating) {
		return (
			<div
				className="flex h-7 items-center gap-1 px-2 hover:bg-black/5 dark:hover:bg-white/5"
				style={{ paddingLeft }}
			>
				<HugeiconsIcon
					icon={creatingType === 'file' ? File01Icon : Folder01Icon}
					className="text-muted-foreground size-3.5 shrink-0"
				/>
				<form onSubmit={handleCreateSubmit} className="flex-1">
					<input
						type="text"
						value={creatingName}
						onChange={(e) => setCreatingName(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'Escape') {
								handleCreateCancel(
									e as unknown as React.MouseEvent
								)
							}
						}}
						onClick={(e) => e.stopPropagation()}
						placeholder={`New ${creatingType} name...`}
						className="w-full border-none bg-transparent text-xs outline-none"
						autoFocus
					/>
				</form>
				<button
					type="button"
					onClick={handleCreateCancel}
					className="text-muted-foreground hover:text-foreground p-0.5"
				>
					<XMarkIcon className="size-3" />
				</button>
			</div>
		)
	}

	return (
		<div
			className={cn(
				'group flex h-7 cursor-pointer items-center gap-1 px-2',
				'hover:bg-black/5 dark:hover:bg-white/5',
				hovered && 'bg-black/5 dark:bg-white/5'
			)}
			style={{ paddingLeft }}
			onClick={handleClick}
			onContextMenu={handleContextMenu}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
		>
			{/* Expand/Collapse Chevron */}
			<div className="w-3.5 shrink-0">
				{isDirectory && (
					<HugeiconsIcon
						icon={ArrowRight01Icon}
						className={cn(
							'text-muted-foreground size-3.5 transition-transform duration-150',
							isExpanded && 'rotate-90'
						)}
					/>
				)}
			</div>

			{/* File/Folder Icon */}
			<HugeiconsIcon
				icon={
					isDirectory
						? isExpanded
							? Folder02Icon
							: Folder01Icon
						: File02Icon
				}
				className={cn(
					'size-3.5 shrink-0',
					isDirectory
						? 'text-teal-600/70'
						: getExtensionColor(node.extension)
				)}
			/>

			{/* Name */}
			{isRenaming ? (
				<form onSubmit={handleRenameSubmit} className="flex-1">
					<input
						type="text"
						value={renameValue}
						onChange={(e) => setRenameValue(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'Escape') {
								handleRenameCancel(
									e as unknown as React.MouseEvent
								)
							}
						}}
						onClick={(e) => e.stopPropagation()}
						className="border-input w-full rounded border bg-transparent px-1 text-xs outline-none"
						autoFocus
					/>
				</form>
			) : (
				<span
					className={cn(
						'flex-1 truncate text-xs',
						isDirectory
							? 'text-foreground font-medium'
							: 'text-muted-foreground'
					)}
				>
					{node.name}
				</span>
			)}

			{/* Context Menu Trigger */}
			<div
				className={cn(
					'shrink-0 transition-opacity duration-150',
					hovered || isMenuOpen ? 'opacity-100' : 'opacity-0'
				)}
			>
				<DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
					<DropdownMenuTrigger
						asChild
						onClick={(e) => e.stopPropagation()}
					>
						<Button
							variant="ghost"
							size="icon-sm"
							className="size-5"
						>
							<MoreHorizontalIcon className="size-3.5" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent className="w-48" align="start">
						{!isDirectory && (
							<DropdownMenuItem
								onClick={(e) => {
									e.stopPropagation()
									onOpenInEditor?.(node)
								}}
							>
								<HugeiconsIcon icon={Edit02Icon} />
								Open in Editor
							</DropdownMenuItem>
						)}

						<DropdownMenuItem
							onClick={(e) => {
								e.stopPropagation()
								onNewFile?.(node)
							}}
						>
							<HugeiconsIcon icon={File01Icon} />
							New File
						</DropdownMenuItem>

						<DropdownMenuItem
							onClick={(e) => {
								e.stopPropagation()
								onNewFolder?.(node)
							}}
						>
							<HugeiconsIcon icon={Folder01Icon} />
							New Folder
						</DropdownMenuItem>

						<DropdownMenuSeparator />

						<DropdownMenuItem
							onClick={(e) => {
								e.stopPropagation()
								onCopyPath?.(node)
							}}
						>
							<HugeiconsIcon icon={Link01Icon} />
							Copy Path
						</DropdownMenuItem>

						<DropdownMenuItem
							onClick={(e) => {
								e.stopPropagation()
								onShowInFinder?.(node)
							}}
						>
							<HugeiconsIcon icon={ShowInFinderIcon} />
							Show in Finder
						</DropdownMenuItem>

						<DropdownMenuSeparator />

						<DropdownMenuItem
							onClick={(e) => {
								e.stopPropagation()
								onStartRename?.(node)
								setIsMenuOpen(false)
							}}
						>
							<HugeiconsIcon icon={Edit02Icon} />
							Rename
						</DropdownMenuItem>

						<DropdownMenuSeparator />

						<DropdownMenuItem
							variant="destructive"
							onClick={(e) => {
								e.stopPropagation()
								onMoveToTrash?.(node)
							}}
						>
							<HugeiconsIcon icon={Delete02Icon} />
							Move to Trash
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</div>
	)
}

// Helper icons not from hugeicons - using inline SVGs for consistency
function MoreHorizontalIcon({ className }: { className?: string }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
		>
			<circle cx="12" cy="12" r="1" />
			<circle cx="19" cy="12" r="1" />
			<circle cx="5" cy="12" r="1" />
		</svg>
	)
}

function XMarkIcon({ className }: { className?: string }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
		>
			<path d="M18 6 6 18" />
			<path d="m6 6 12 12" />
		</svg>
	)
}
