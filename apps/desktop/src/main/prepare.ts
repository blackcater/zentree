import { ipcMain } from 'electron'

import { Container } from '@/shared/di'
import { ElectronRpcServer } from '@/shared/rpc/electron'

import { detectSystemLocale, i18n, initI18n } from './lib/i18n'
import { AppStore } from './lib/store'
import { WindowManager, WindowRegistry } from './services'

export async function prepare() {
	Container.singleton(AppStore)
		.singleton(WindowRegistry)
		.singleton(WindowManager)
		.singleton(ElectronRpcServer, () => {
			const windowRegistry = Container.inject(WindowRegistry)
			return new ElectronRpcServer(windowRegistry, ipcMain)
		})

	// Initialize i18n
	await prepareI18n()
}

async function prepareI18n() {
	const store = Container.inject(AppStore)
	let storedLocale = store.locale

	if (!storedLocale) {
		storedLocale = detectSystemLocale()
		// Set locale to store
		store.locale = storedLocale
		i18n.changeLanguage(storedLocale)
	}

	await initI18n(storedLocale)
}
