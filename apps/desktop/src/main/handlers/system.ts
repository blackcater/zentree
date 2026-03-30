import { Container } from '@/shared/di'
import { ElectronRpcServer } from '@/shared/rpc'

import { store } from '../lib/store'
import { WindowManager } from '../services'

export async function registerSystemHandlers() {
	const server = Container.inject(ElectronRpcServer)
	const windowManager = Container.inject(WindowManager)

	const router = server.router('system')

	router.handle('window/create-vault', (_, vaultId: string) => {
		windowManager.createVaultWindow(vaultId)
		windowManager.closeWindow('welcome')
		return { ok: true }
	})

	router.handle('window/create-popup', (_, threadId: string) => {
		windowManager.createChatPopupWindow(threadId)
		return { ok: true }
	})

	// Window close handler
	router.handle('window/close', (_, windowName: string) => {
		windowManager.closeWindow(windowName)
		return { ok: true }
	})

	// Store access handlers (for renderer process)
	router.handle('store/get', (_, key: string) => {
		return store.get(key as 'firstLaunchDone')
	})

	router.handle('store/set', (_, key: string, value: boolean) => {
		store.set(key as 'firstLaunchDone', value)
	})

	// Locale handlers
	router.handle('locale/get', () => {
		return store.get('locale')
	})

	router.handle('locale/set', (_, locale: string) => {
		store.set('locale', locale)
		return { ok: true }
	})
}
