import type { FileNodeData } from '../types'

// Import all dark theme file icons
import cssDark from '@renderer/assets/icons/file/css.svg'
import dockerDark from '@renderer/assets/icons/file/docker_dark.svg'
import gitignoreDark from '@renderer/assets/icons/file/gitignore.svg'
import goDark from '@renderer/assets/icons/file/go_dark.svg'
import htmlDark from '@renderer/assets/icons/file/html_dark.svg'
import ignoredDark from '@renderer/assets/icons/file/ignored_dark.svg'
import imageDark from '@renderer/assets/icons/file/image_dark.svg'
import javascriptDark from '@renderer/assets/icons/file/javaScript_dark.svg'
import javaDark from '@renderer/assets/icons/file/java_dark.svg'
import jsonDark from '@renderer/assets/icons/file/json_dark.svg'
import lockDark from '@renderer/assets/icons/file/lock_dark.svg'
import makefileDark from '@renderer/assets/icons/file/makefile_dark.svg'
import markdownDark from '@renderer/assets/icons/file/markdown_dark.svg'
import pythonDark from '@renderer/assets/icons/file/python_dark.svg'
import rustDark from '@renderer/assets/icons/file/rustFile_dark.svg'
import textDark from '@renderer/assets/icons/file/text_dark.svg'
import typescriptDark from '@renderer/assets/icons/file/typeScript_dark.svg'
import yamlDark from '@renderer/assets/icons/file/yaml_dark.svg'
import folderAndroidDark from '@renderer/assets/icons/folder/folder_android_dark.svg'
import folderDark from '@renderer/assets/icons/folder/folder_dark.svg'
import folderDatabaseDark from '@renderer/assets/icons/folder/folder_database_dark.svg'
import folderDocsDark from '@renderer/assets/icons/folder/folder_docs_dark.svg'
import folderFrameworkDark from '@renderer/assets/icons/folder/folder_framework_dark.svg'
import folderGitDark from '@renderer/assets/icons/folder/folder_git_dark.svg'
import folderHelpersDark from '@renderer/assets/icons/folder/folder_helpers_dark.svg'
import folderIdeaDark from '@renderer/assets/icons/folder/folder_idea_dark.svg'
import folderIosDark from '@renderer/assets/icons/folder/folder_ios_dark.svg'
import folderMigrationsDark from '@renderer/assets/icons/folder/folder_migrations_dark.svg'
import folderModuleDark from '@renderer/assets/icons/folder/folder_module_dark.svg'
import folderPackageDark from '@renderer/assets/icons/folder/folder_package_dark.svg'
import folderProjectDark from '@renderer/assets/icons/folder/folder_project_dark.svg'
import folderResourcesDark from '@renderer/assets/icons/folder/folder_resources_dark.svg'
import folderRunDark from '@renderer/assets/icons/folder/folder_run_dark.svg'
import folderServerDark from '@renderer/assets/icons/folder/folder_server_dark.svg'
import folderSettingsDark from '@renderer/assets/icons/folder/folder_settings_dark.svg'
import folderTemplatesDark from '@renderer/assets/icons/folder/folder_templates_dark.svg'
import folderTestDark from '@renderer/assets/icons/folder/folder_test_dark.svg'
import folderVendorDark from '@renderer/assets/icons/folder/folder_vendor_dark.svg'
import folderWindowsDark from '@renderer/assets/icons/folder/folder_windows_dark.svg'
import folderWwwDark from '@renderer/assets/icons/folder/folder_www_dark.svg'

// Import all light theme file icons
import cssLight from '@renderer/assets/icons/file/css.svg'
import dockerLight from '@renderer/assets/icons/file/docker.svg'
import gitignoreLight from '@renderer/assets/icons/file/gitignore.svg'
import goLight from '@renderer/assets/icons/file/go.svg'
import htmlLight from '@renderer/assets/icons/file/html.svg'
import ignoredLight from '@renderer/assets/icons/file/ignored.svg'
import imageLight from '@renderer/assets/icons/file/image.svg'
import javaLight from '@renderer/assets/icons/file/java.svg'
import javascriptLight from '@renderer/assets/icons/file/javaScript.svg'
import jsonLight from '@renderer/assets/icons/file/json.svg'
import lockLight from '@renderer/assets/icons/file/lock.svg'
import makefileLight from '@renderer/assets/icons/file/makefile.svg'
import markdownLight from '@renderer/assets/icons/file/markdown.svg'
import pythonLight from '@renderer/assets/icons/file/python.svg'
import rustLight from '@renderer/assets/icons/file/rustFile.svg'
import textLight from '@renderer/assets/icons/file/text.svg'
import typescriptLight from '@renderer/assets/icons/file/typeScript.svg'
import yamlLight from '@renderer/assets/icons/file/yaml.svg'
import folderAndroidLight from '@renderer/assets/icons/folder/folder_android_light.svg'
import folderDatabaseLight from '@renderer/assets/icons/folder/folder_database_light.svg'
import folderDocsLight from '@renderer/assets/icons/folder/folder_docs_light.svg'
import folderFrameworkLight from '@renderer/assets/icons/folder/folder_framework_light.svg'
import folderGitLight from '@renderer/assets/icons/folder/folder_git_light.svg'
import folderHelpersLight from '@renderer/assets/icons/folder/folder_helpers_light.svg'
import folderIdeaLight from '@renderer/assets/icons/folder/folder_idea_light.svg'
import folderIosLight from '@renderer/assets/icons/folder/folder_ios_light.svg'
import folderLight from '@renderer/assets/icons/folder/folder_light.svg'
import folderMigrationsLight from '@renderer/assets/icons/folder/folder_migrations_light.svg'
import folderModuleLight from '@renderer/assets/icons/folder/folder_module_light.svg'
import folderPackageLight from '@renderer/assets/icons/folder/folder_package_light.svg'
import folderProjectLight from '@renderer/assets/icons/folder/folder_project_light.svg'
import folderResourcesLight from '@renderer/assets/icons/folder/folder_resources_light.svg'
import folderRunLight from '@renderer/assets/icons/folder/folder_run_light.svg'
import folderServerLight from '@renderer/assets/icons/folder/folder_server_light.svg'
import folderSettingsLight from '@renderer/assets/icons/folder/folder_settings_light.svg'
import folderTemplatesLight from '@renderer/assets/icons/folder/folder_templates_light.svg'
import folderTestLight from '@renderer/assets/icons/folder/folder_test_light.svg'
import folderVendorLight from '@renderer/assets/icons/folder/folder_vendor_light.svg'
import folderWindowsLight from '@renderer/assets/icons/folder/folder_windows_light.svg'
import folderWwwLight from '@renderer/assets/icons/folder/folder_www_light.svg'

interface IconTheme {
	fileNames: Record<string, string>
	fileExtensions: Record<string, string>
	folderNames: Record<string, string>
	folder: string
	file: string
}

// Static URL map for dark theme - maps filename key to imported SVG URL
const darkIconUrls: Record<string, string> = {
	file_markdown: markdownDark,
	file_json: jsonDark,
	file_lock: lockDark,
	file_text: textDark,
	file_typescript: typescriptDark,
	file_javascript: javascriptDark,
	file_css: cssDark,
	file_html: htmlDark,
	file_image: imageDark,
	file_yaml: yamlDark,
	file_python: pythonDark,
	file_go: goDark,
	file_rust: rustDark,
	file_java: javaDark,
	file_docker: dockerDark,
	folder: folderDark,
	folder_project: folderProjectDark,
	folder_framework: folderFrameworkDark,
	folder_docs: folderDocsDark,
	folder_test: folderTestDark,
	folder_resources: folderResourcesDark,
	folder_git: folderGitDark,
	folder_package: folderPackageDark,
	folder_module: folderModuleDark,
	folder_www: folderWwwDark,
	folder_server: folderServerDark,
	folder_database: folderDatabaseDark,
	folder_android: folderAndroidDark,
	folder_ios: folderIosDark,
	folder_windows: folderWindowsDark,
	folder_idea: folderIdeaDark,
	folder_vendor: folderVendorDark,
	folder_run: folderRunDark,
	folder_settings: folderSettingsDark,
	folder_templates: folderTemplatesDark,
	folder_migrations: folderMigrationsDark,
	folder_helpers: folderHelpersDark,
	file_gitignore: gitignoreDark,
	file_ignored: ignoredDark,
	file_makefile: makefileDark,
}

const lightIconUrls: Record<string, string> = {
	file_markdown: markdownLight,
	file_json: jsonLight,
	file_lock: lockLight,
	file_text: textLight,
	file_typescript: typescriptLight,
	file_javascript: javascriptLight,
	file_css: cssLight,
	file_html: htmlLight,
	file_image: imageLight,
	file_yaml: yamlLight,
	file_python: pythonLight,
	file_go: goLight,
	file_rust: rustLight,
	file_java: javaLight,
	file_docker: dockerLight,
	folder: folderLight,
	folder_project: folderProjectLight,
	folder_framework: folderFrameworkLight,
	folder_docs: folderDocsLight,
	folder_test: folderTestLight,
	folder_resources: folderResourcesLight,
	folder_git: folderGitLight,
	folder_package: folderPackageLight,
	folder_module: folderModuleLight,
	folder_www: folderWwwLight,
	folder_server: folderServerLight,
	folder_database: folderDatabaseLight,
	folder_android: folderAndroidLight,
	folder_ios: folderIosLight,
	folder_windows: folderWindowsLight,
	folder_idea: folderIdeaLight,
	folder_vendor: folderVendorLight,
	folder_run: folderRunLight,
	folder_settings: folderSettingsLight,
	folder_templates: folderTemplatesLight,
	folder_migrations: folderMigrationsLight,
	folder_helpers: folderHelpersLight,
	file_gitignore: gitignoreLight,
	file_ignored: ignoredLight,
	file_makefile: makefileLight,
}

// Icon theme definitions
const darkTheme: IconTheme = {
	fileNames: {
		'.gitignore': 'file_gitignore',
		'.dockerignore': 'file_ignored',
		Dockerfile: 'file_docker',
		Makefile: 'file_makefile',
		README: 'file_markdown',
	},
	fileExtensions: {
		md: 'file_markdown',
		json: 'file_json',
		lock: 'file_lock',
		ts: 'file_typescript',
		tsx: 'file_typescript',
		js: 'file_javascript',
		jsx: 'file_javascript',
		css: 'file_css',
		html: 'file_html',
		jpg: 'file_image',
		jpeg: 'file_image',
		png: 'file_image',
		gif: 'file_image',
		svg: 'file_image',
		yaml: 'file_yaml',
		yml: 'file_yaml',
		py: 'file_python',
		go: 'file_go',
		rs: 'file_rust',
		java: 'file_java',
	},
	folderNames: {
		src: 'folder_project',
		lib: 'folder_framework',
		docs: 'folder_docs',
		test: 'folder_test',
		tests: 'folder_test',
		assets: 'folder_resources',
		resources: 'folder_resources',
		components: 'folder_framework',
	},
	folder: 'folder',
	file: 'file_text',
}

const lightTheme: IconTheme = {
	...darkTheme,
}

export async function loadIconThemes(): Promise<void> {
	// Static imports are always ready
}

export function getIconUrl(
	node: FileNodeData,
	theme: 'dark' | 'light'
): string | null {
	const iconMap = theme === 'dark' ? darkTheme : lightTheme
	const iconUrls = theme === 'dark' ? darkIconUrls : lightIconUrls

	let iconKey: string | undefined

	// 1. Check fileNames (exact match)
	if (iconMap.fileNames[node.name]) {
		iconKey = iconMap.fileNames[node.name]
	} else if (node.type === 'directory' && iconMap.folderNames[node.name]) {
		// 2. Check folderNames
		iconKey = iconMap.folderNames[node.name]
	} else if (node.extension && iconMap.fileExtensions[node.extension]) {
		// 3. Check fileExtensions
		iconKey = iconMap.fileExtensions[node.extension]
	} else {
		// 4. Default icon
		iconKey = node.type === 'directory' ? iconMap.folder : iconMap.file
	}

	if (!iconKey) return null

	return iconUrls[iconKey] ?? null
}
