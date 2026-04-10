import { Container } from '@/shared/di'
import { ElectronRpcServer } from '@/shared/rpc/electron'
import type { API } from '@/types'

import { store } from '../lib/store'

/**
 * Application-level settings and state management.
 * Implements the AppAPI interface.
 */
export class AppHandler implements API.AppAPI {
	async getLocale(): Promise<string> {
		return store.get('locale') as string
	}

	async setLocale(locale: string): Promise<{ ok: boolean }> {
		store.set('locale', locale)
		return { ok: true }
	}

	async getBoolValue(key: 'firstLaunchDone'): Promise<boolean> {
		return store.get(key)
	}

	async setBoolValue(key: 'firstLaunchDone', value: boolean): Promise<void> {
		store.set(key, value)
	}

	// -----------------------------------------------------------------------
	// Registration
	// -----------------------------------------------------------------------

	static registerHandlers(): void {
		const server = Container.inject(ElectronRpcServer)
		const router = server.router('app')
		const handler = new AppHandler()

		router.handle('getLocale', () => handler.getLocale())
		router.handle('setLocale', (locale) => handler.setLocale(locale))
		router.handle('getBoolValue', (key) =>
			handler.getBoolValue(key as 'firstLaunchDone')
		)
		router.handle('setBoolValue', (key, value) =>
			handler.setBoolValue(key as 'firstLaunchDone', value)
		)
	}
}
