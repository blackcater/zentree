import type { HTMLAttributes } from 'react'

import * as icons from './assets'
import { fileIcons, type IconKey } from './icons'

interface FileProps extends Omit<HTMLAttributes<HTMLImageElement>, 'src'> {
	name: string
	dark?: boolean
	fileNames?: Record<string, string>
	fileExtensions?: Record<string, string>
	defaultIcon?: React.ReactNode
}

function getIconSrc(iconKey: IconKey, dark: boolean): string | null {
	const iconDef = fileIcons.icons[iconKey]
	if (!iconDef) return null

	const iconName = dark ? iconDef.dark : iconDef.light
	return icons[iconName as keyof typeof icons] ?? null
}

function getIconKey(
	name: string,
	fileNames: Record<string, string>,
	fileExtensions: Record<string, string>
): IconKey | null {
	// 1. Check fileNames (exact match)
	if (fileNames[name]) {
		return fileNames[name] as IconKey
	}

	// 2. Check extension
	const ext = name.split('.').pop()?.toLowerCase()
	if (ext && fileExtensions[ext]) {
		return fileExtensions[ext] as IconKey
	}

	return null
}

function GenericFileIcon({
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
			<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
			<polyline points="14 2 14 8 20 8" />
		</svg>
	)
}

export function File({
	name,
	dark = false,
	fileNames,
	fileExtensions,
	defaultIcon,
	className,
	...props
}: Readonly<FileProps>) {
	// Merge default configs with user-provided overrides
	const mergedFileNames = { ...fileIcons.fileNames, ...fileNames }
	const mergedFileExtensions = {
		...fileIcons.fileExtensions,
		...fileExtensions,
	}

	// Try to find matching icon
	const iconKey = getIconKey(name, mergedFileNames, mergedFileExtensions)

	// If no match found, use default icon
	const finalIconKey = iconKey ?? (fileIcons.default as IconKey)
	const iconSrc = getIconSrc(finalIconKey, dark)

	if (!iconSrc) {
		return defaultIcon ? (
			<>{defaultIcon}</>
		) : (
			<GenericFileIcon className={className} />
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
