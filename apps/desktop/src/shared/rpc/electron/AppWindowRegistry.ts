import type { BrowserWindow, WebContents } from 'electron'

import type { WindowRegistry } from '../types'

export class AppWindowRegistry implements WindowRegistry {
	private readonly _windows = new Map<string, BrowserWindow>()
	private readonly _groups = new Map<string, Set<string>>()
	private readonly _webContentsToClientId = new Map<WebContents, string>()

	registerWindow(window: BrowserWindow, group?: string): string {
		const clientId = `client-${window.id}`

		this._windows.set(clientId, window)
		this._webContentsToClientId.set(window.webContents, clientId)

		if (group) {
			this.joinGroup(clientId, group)
		}

		return clientId
	}

	unregisterWindow(window: BrowserWindow): void {
		const clientId = this._webContentsToClientId.get(window.webContents)
		if (!clientId) return

		for (const [, clientIds] of this._groups) {
			clientIds.delete(clientId)
		}

		this._windows.delete(clientId)
		this._webContentsToClientId.delete(window.webContents)
	}

	joinGroup(clientId: string, groupId: string): void {
		if (!this._groups.has(groupId)) {
			this._groups.set(groupId, new Set())
		}
		this._groups.get(groupId)!.add(clientId)
	}

	leaveGroup(clientId: string, groupId: string): void {
		this._groups.get(groupId)?.delete(clientId)
	}

	sendToClient(clientId: string, channel: string, ...args: unknown[]): void {
		const window = this._windows.get(clientId)
		if (window && !window.isDestroyed()) {
			// Original channel (for ElectronRpcClient via webContents)
			window.webContents.send(channel, ...args)
			// Generic channel (for IpcRendererRpcClient via ipcRenderer)
			// Extract eventName from channel like "rpc:event:eventName"
			if (channel.startsWith('rpc:event:')) {
				window.webContents.send('rpc:event', {
					channel,
					data: args,
				})
			}
		}
	}

	sendToGroup(groupId: string, channel: string, ...args: unknown[]): void {
		const clientIds = this._groups.get(groupId)
		if (clientIds) {
			for (const clientId of clientIds) {
				this.sendToClient(clientId, channel, ...args)
			}
		}
	}

	sendToAll(channel: string, ...args: unknown[]): void {
		for (const [clientId] of this._windows) {
			this.sendToClient(clientId, channel, ...args)
		}
	}

	getWebContentsByClientId(clientId: string): WebContents | null {
		const window = this._windows.get(clientId)
		return window && !window.isDestroyed() ? window.webContents : null
	}

	getClientIdByWebContents(webContents: WebContents): string | null {
		return this._webContentsToClientId.get(webContents) ?? null
	}
}
