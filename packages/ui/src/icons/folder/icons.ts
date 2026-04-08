// Folder icon configuration that mirrors JetbrainsIconTheme format

export const folderIcons = {
	// Default fallback
	default: 'folder',

	// Icon definitions with dark/light variants
	icons: {
		folder: { dark: 'folder_dark', light: 'folder_light' },
		folder_android: {
			dark: 'folder_android_dark',
			light: 'folder_android_light',
		},
		folder_database: {
			dark: 'folder_database_dark',
			light: 'folder_database_light',
		},
		folder_docs: { dark: 'folder_docs_dark', light: 'folder_docs_light' },
		folder_framework: {
			dark: 'folder_framework_dark',
			light: 'folder_framework_light',
		},
		folder_git: { dark: 'folder_git_dark', light: 'folder_git_light' },
		folder_helpers: {
			dark: 'folder_helpers_dark',
			light: 'folder_helpers_light',
		},
		folder_idea: { dark: 'folder_idea_dark', light: 'folder_idea_light' },
		folder_ios: { dark: 'folder_ios_dark', light: 'folder_ios_light' },
		folder_migrations: {
			dark: 'folder_migrations_dark',
			light: 'folder_migrations_light',
		},
		folder_module: {
			dark: 'folder_module_dark',
			light: 'folder_module_light',
		},
		folder_package: {
			dark: 'folder_package_dark',
			light: 'folder_package_light',
		},
		folder_project: {
			dark: 'folder_project_dark',
			light: 'folder_project_light',
		},
		folder_resources: {
			dark: 'folder_resources_dark',
			light: 'folder_resources_light',
		},
		folder_run: { dark: 'folder_run_dark', light: 'folder_run_light' },
		folder_server: {
			dark: 'folder_server_dark',
			light: 'folder_server_light',
		},
		folder_settings: {
			dark: 'folder_settings_dark',
			light: 'folder_settings_light',
		},
		folder_templates: {
			dark: 'folder_templates_dark',
			light: 'folder_templates_light',
		},
		folder_test: { dark: 'folder_test_dark', light: 'folder_test_light' },
		folder_vendor: {
			dark: 'folder_vendor_dark',
			light: 'folder_vendor_light',
		},
		folder_windows: {
			dark: 'folder_windows_dark',
			light: 'folder_windows_light',
		},
		folder_www: { dark: 'folder_www_dark', light: 'folder_www_light' },
	},

	// folderNames mapping: folder name -> icon key
	folderNames: {
		android: 'folder_android',
		ios: 'folder_ios',
		macos: 'folder_ios',
		database: 'folder_database',
		db: 'folder_database',
		docs: 'folder_docs',
		lib: 'folder_framework',
		components: 'folder_framework',
		helpers: 'folder_helpers',
		migrations: 'folder_migrations',
		internal: 'folder_module',
		pkg: 'folder_package',
		assets: 'folder_resources',
		resources: 'folder_resources',
		scripts: 'folder_run',
		run: 'folder_run',
		server: 'folder_server',
		config: 'folder_settings',
		configs: 'folder_settings',
		settings: 'folder_settings',
		tests: 'folder_test',
		test: 'folder_test',
		testdata: 'folder_test',
		vendor: 'folder_vendor',
		windows: 'folder_windows',
		web: 'folder_www',
		www: 'folder_www',
		src: 'folder_project',
		cmd: 'folder_project',
		git: 'folder_git',
		'.git': 'folder_git',
		'.github': 'folder_git',
		'.gitlab': 'folder_git',
		templates: 'folder_templates',
		'.idea': 'folder_idea',
		'.vscode': 'folder_idea',
	},
} as const

export type FolderIconKey = keyof typeof folderIcons.icons
