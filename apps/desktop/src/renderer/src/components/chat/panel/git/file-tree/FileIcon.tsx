import { useEffect, useState } from 'react'

import { getIconUrl, loadIconThemes } from '../file-icons'
import type { FileNodeData } from '../types'

interface FileIconProps {
	node: FileNodeData
	theme?: 'dark' | 'light'
	className?: string
}

export function FileIcon({ node, theme = 'dark', className }: FileIconProps) {
	const [iconUrl, setIconUrl] = useState<string | null>(null)
	const [themesReady, setThemesReady] = useState(false)

	useEffect(() => {
		loadIconThemes().then(() => {
			setThemesReady(true)
		})
	}, [])

	useEffect(() => {
		if (!themesReady) return
		const url = getIconUrl(node, theme)
		setIconUrl(url)
	}, [node, theme, themesReady])

	// Use JetBrains icon for directories if available
	if (node.type === 'directory') {
		if (iconUrl) {
			return (
				<img
					src={iconUrl}
					alt={node.name}
					className={className}
					style={{ width: '16px', height: '16px' }}
				/>
			)
		}
		return <FolderIcon className={className} />
	}

	if (!iconUrl) {
		return <GenericFileIcon className={className} />
	}

	return (
		<img
			src={iconUrl}
			alt={node.name}
			className={className}
			style={{ width: '16px', height: '16px' }}
		/>
	)
}

function FolderIcon({ className }: { className?: string | undefined }) {
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
