import { useMemo } from 'react'

import { getFullIconUrl, getIconPath, loadIconThemes } from '../file-icons'
import type { FileNodeData } from '../types'

interface FileIconProps {
	node: FileNodeData
	theme?: 'dark' | 'light'
	className?: string
}

// Load themes once at module level
loadIconThemes()

export function FileIcon({ node, theme = 'dark', className }: FileIconProps) {
	const iconPath = useMemo(() => {
		// Use hugeicons for directory expand/collapse icons
		if (node.type === 'directory') {
			return null // We'll use lucide for folder icons
		}

		// Import dynamically to get the correct path
		const relativePath = getIconPath(node, theme)
		if (!relativePath) return null

		return getFullIconUrl(relativePath, theme)
	}, [node, theme])

	if (node.type === 'directory') {
		// Use hugeicons folder icon
		return <FolderIcon className={className} />
	}

	if (!iconPath) {
		// Fallback to generic file icon
		return <GenericFileIcon className={className} />
	}

	return (
		<img
			src={iconPath}
			alt={node.name}
			className={className}
			style={{ width: '16px', height: '16px' }}
		/>
	)
}

function FolderIcon({ className }: { className?: string | undefined }) {
	// Use hugeicons/FolderIcon
	return (
		<svg
			className={className}
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
		>
			<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
		</svg>
	)
}

function GenericFileIcon({ className }: { className?: string | undefined }) {
	// Fallback file icon using hugeicons
	return (
		<svg
			className={className}
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
		>
			<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
			<polyline points="14 2 14 8 20 8" />
		</svg>
	)
}
