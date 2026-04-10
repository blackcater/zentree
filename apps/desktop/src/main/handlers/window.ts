import { Container } from '@/shared/di'
import { ElectronRpcServer } from '@/shared/rpc/electron'
import type { API } from '@/types/api'

import { WindowManager } from '../services'

/**
 * Window lifecycle management.
 * Implements the WindowAPI interface.
 */
export class WindowHandler implements API.WindowAPI {
	readonly #windowManager: WindowManager

	constructor() {
		this.#windowManager = Container.inject(WindowManager)
	}

	async createVault(vaultId: string): Promise<{ ok: boolean }> {
		this.#windowManager.createVaultWindow(vaultId)
		this.#windowManager.closeWindow('welcome')
		return { ok: true }
	}

	async createPopup(threadId: string): Promise<{ ok: boolean }> {
		this.#windowManager.createChatPopupWindow(threadId)
		return { ok: true }
	}

	async close(windowName: string): Promise<{ ok: boolean }> {
		this.#windowManager.closeWindow(windowName)
		return { ok: true }
	}

	// -----------------------------------------------------------------------
	// Registration
	// -----------------------------------------------------------------------

	static registerHandlers(): void {
		const server = Container.inject(ElectronRpcServer)
		const router = server.router('window')
		const handler = new WindowHandler()

		router.handle('create-vault', (vaultId) => handler.createVault(vaultId))
		router.handle('create-popup', (threadId) =>
			handler.createPopup(threadId)
		)
		router.handle('close', (windowName) => handler.close(windowName))
	}
}
