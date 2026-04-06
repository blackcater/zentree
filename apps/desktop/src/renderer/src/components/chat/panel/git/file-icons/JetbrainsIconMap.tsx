import type { FileNodeData } from '../types'

interface IconDefinition {
	iconPath: string
}

interface IconTheme {
	iconDefinitions: Record<string, IconDefinition>
	fileNames: Record<string, string>
	fileExtensions: Record<string, string>
	folderNames: Record<string, string>
	folder: string
	file: string
}

// These will be loaded dynamically in the component
let darkTheme: IconTheme | null = null
let lightTheme: IconTheme | null = null

export async function loadIconThemes() {
	const [dark, light] = await Promise.all([
		import('@renderer/assets/dark-jetbrains-icon-theme.json'),
		import('@renderer/assets/light-jetbrains-icon-theme.json'),
	])
	darkTheme = dark.default
	lightTheme = light.default
}

export function getIconPath(
	node: FileNodeData,
	theme: 'dark' | 'light'
): string {
	const iconMap = theme === 'dark' ? darkTheme : lightTheme
	if (!iconMap) return ''

	// 1. Check fileNames (exact match for special files like .gitignore, Dockerfile)
	if (iconMap.fileNames[node.name]) {
		const iconKey = iconMap.fileNames[node.name]
		return iconMap.iconDefinitions[iconKey]?.iconPath ?? ''
	}

	// 2. Check folderNames (for directories like src, lib, test)
	if (node.type === 'directory' && iconMap.folderNames[node.name]) {
		const iconKey = iconMap.folderNames[node.name]
		return iconMap.iconDefinitions[iconKey]?.iconPath ?? ''
	}

	// 3. Check fileExtensions (for regular files like .ts, .tsx, .json)
	if (node.extension && iconMap.fileExtensions[node.extension]) {
		const iconKey = iconMap.fileExtensions[node.extension]
		return iconMap.iconDefinitions[iconKey]?.iconPath ?? ''
	}

	// 4. Default icon
	return node.type === 'directory'
		? (iconMap.iconDefinitions[iconMap.folder]?.iconPath ?? '')
		: (iconMap.iconDefinitions[iconMap.file]?.iconPath ?? '')
}

export function getFullIconUrl(
	relativePath: string,
	_theme: 'dark' | 'light'
): string {
	if (!relativePath) return ''
	// Just convert to absolute path - the JSON already has theme suffix embedded
	return relativePath.replace('./icons/', `@renderer/assets/icons/`)
}
