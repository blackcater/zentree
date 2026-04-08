import type { HTMLAttributes } from 'react'

import * as icons from './assets'
import { folderIcons, type FolderIconKey } from './icons'

interface FolderProps extends Omit<HTMLAttributes<HTMLImageElement>, 'src'> {
	name: string
	dark?: boolean
	folderNames?: Record<string, string>
	defaultIcon?: React.ReactNode
}

function getIconSrc(iconKey: FolderIconKey, dark: boolean): string | null {
	const iconDef = folderIcons.icons[iconKey]
	if (!iconDef) return null

	const iconName = dark ? iconDef.dark : iconDef.light
	return icons[iconName] ?? null
}

function getIconKey(
	name: string,
	folderNames: Record<string, string>
): FolderIconKey | null {
	// Check folderNames
	if (folderNames[name]) {
		return folderNames[name] as FolderIconKey
	}
	return null
}

function GenericFolderIcon({
	className,
	...props
}: Readonly<React.SVGProps<SVGSVGElement>>) {
	return (
		<svg
			{...props}
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

export function Folder({
	name,
	dark = false,
	folderNames,
	defaultIcon,
	className,
	...props
}: Readonly<FolderProps>) {
	// Merge default config with user-provided overrides
	const mergedFolderNames = { ...folderIcons.folderNames, ...folderNames }

	// Try to find matching icon
	const iconKey = getIconKey(name, mergedFolderNames)

	// If no match found, use default icon
	const finalIconKey = iconKey ?? (folderIcons.default as FolderIconKey)
	const iconSrc = getIconSrc(finalIconKey, dark)

	if (!iconSrc) {
		return defaultIcon ? (
			<>{defaultIcon}</>
		) : (
			<GenericFolderIcon className={className} />
		)
	}

	return (
		<img
			src={iconSrc}
			alt={name}
			className={className}
			style={{ width: '16px', height: '16px' }}
			{...props}
		/>
	)
}
