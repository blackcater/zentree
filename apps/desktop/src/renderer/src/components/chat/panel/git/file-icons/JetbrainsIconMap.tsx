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

// Pre-load icon URLs using Vite's glob import
// This gives us actual URLs like /assets/icons/file/typeScript_dark.svg?v=xxx
const darkFileIcons = import.meta.glob('@renderer/assets/icons/file/*_dark.svg', {
	as: 'url',
	eager: true,
}) as Record<string, string>

const lightFileIcons = import.meta.glob('@renderer/assets/icons/file/*_light.svg', {
	as: 'url',
	eager: true,
}) as Record<string, string>

const darkFolderIcons = import.meta.glob('@renderer/assets/icons/folder/*_dark.svg', {
	as: 'url',
	eager: true,
}) as Record<string, string>

const lightFolderIcons = import.meta.glob('@renderer/assets/icons/folder/*_light.svg', {
	as: 'url',
	eager: true,
}) as Record<string, string>

// Build reverse lookup: iconKey (e.g., "fileTypeScript_dark") -> URL
function buildReverseMap(icons: Record<string, string>): Record<string, string> {
	const result: Record<string, string> = {}
	for (const [fullPath, url] of Object.entries(icons)) {
		// fullPath looks like: /src/renderer/src/assets/icons/file/typeScript_dark.svg
		// Extract "typeScript_dark" from the path
		const fileName = fullPath.split('/').pop()?.replace('.svg', '') ?? ''
		result[fileName] = url
	}
	return result
}

const darkFileIconUrls = buildReverseMap(darkFileIcons)
const lightFileIconUrls = buildReverseMap(lightFileIcons)
const darkFolderIconUrls = buildReverseMap(darkFolderIcons)
const lightFolderIconUrls = buildReverseMap(lightFolderIcons)

// Load themes
let darkTheme: IconTheme | null = null
let lightTheme: IconTheme | null = null
let themesLoaded = false

export async function loadIconThemes(): Promise<void> {
	if (themesLoaded) return

	const [dark, light] = await Promise.all([
		import('@renderer/assets/dark-jetbrains-icon-theme.json'),
		import('@renderer/assets/light-jetbrains-icon-theme.json'),
	])
	darkTheme = dark.default
	lightTheme = light.default
	themesLoaded = true
}

export function getIconUrl(
	node: FileNodeData,
	theme: 'dark' | 'light'
): string | null {
	const iconMap = theme === 'dark' ? darkTheme : lightTheme
	if (!iconMap) return null

	let iconKey: string | undefined

	// 1. Check fileNames (exact match for special files like .gitignore, Dockerfile)
	if (iconMap.fileNames[node.name]) {
		iconKey = iconMap.fileNames[node.name]
	} else if (node.type === 'directory' && iconMap.folderNames[node.name]) {
		// 2. Check folderNames (for directories like src, lib, test)
		iconKey = iconMap.folderNames[node.name]
	} else if (node.extension && iconMap.fileExtensions[node.extension]) {
		// 3. Check fileExtensions (for regular files like .ts, .tsx, .json)
		iconKey = iconMap.fileExtensions[node.extension]
	} else {
		// 4. Default icon
		iconKey = node.type === 'directory' ? iconMap.folder : iconMap.file
	}

	if (!iconKey) return null

	// Look up the URL using the icon key
	const fileIconUrls = theme === 'dark' ? darkFileIconUrls : lightFileIconUrls
	const folderIconUrls = theme === 'dark' ? darkFolderIconUrls : lightFolderIconUrls

	const iconUrls = node.type === 'directory' ? folderIconUrls : fileIconUrls
	return iconUrls[iconKey] ?? null
}
