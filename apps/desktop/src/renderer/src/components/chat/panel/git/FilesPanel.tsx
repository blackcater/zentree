import { useState, useCallback, useEffect, useRef } from 'react'

import { SearchIcon } from 'lucide-react'

import { FileTreeView } from './file-tree'
import type { FileNode } from './types'

interface FilesPanelProps {
	className?: string
}

const TEST_PATH = '/Users/blackcater/Workspace/Codes/Labs/Acme'

export function FilesPanel({ className }: FilesPanelProps) {
	// TODO: Get rootPath from project context/settings
	const [rootPath] = useState(() => {
		// For now, use a placeholder - will be connected to actual project later
		return typeof process !== 'undefined' && process.env
			? (process.env['HOME'] ?? TEST_PATH)
			: TEST_PATH
	})

	const [searchQuery, setSearchQuery] = useState('')
	const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined
	)

	// Debounced search (currently not used but kept for future search functionality)
	useEffect(() => {
		clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => {
			// TODO: Implement debounced search
		}, 200)
		return () => clearTimeout(debounceRef.current)
	}, [searchQuery])

	const handleFileClick = useCallback((node: FileNode, rect: DOMRect) => {
		console.log('File clicked:', node.path, rect)
		// TODO: Implement file preview or open
	}, [])

	return (
		<div className={`flex h-full flex-col ${className ?? ''}`}>
			{/* Header with Search */}
			<div className="border-b p-3">
				<div className="relative">
					<SearchIcon
						className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2"
						size={16}
					/>
					<input
						type="text"
						placeholder="Search files..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="border-input bg-background h-8 w-full rounded-md border px-3 pl-9 text-sm"
					/>
				</div>
			</div>

			{/* File Tree */}
			<div className="flex-1 overflow-auto">
				<FileTreeView
					rootPath={rootPath}
					onFileClick={handleFileClick}
				/>
			</div>
		</div>
	)
}
