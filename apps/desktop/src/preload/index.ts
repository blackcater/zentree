import { contextBridge } from 'electron'

import { electronAPI } from '@electron-toolkit/preload'

import { ElectronRpcClient } from '../shared/rpc'

// Lazy-initialized RPC client
let rpcClient: ElectronRpcClient | null = null

const api = {
	// Factory function to create/retrieve RPC client
	// window.webContents is available in preload context (main world)
	getRpcClient: () => {
		if (!rpcClient) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			rpcClient = new ElectronRpcClient(window.webContents as any)
		}
		return rpcClient
	},
}

if (process.contextIsolated) {
	try {
		contextBridge.exposeInMainWorld('electron', electronAPI)
		contextBridge.exposeInMainWorld('api', api)
	} catch (error) {
		console.error(error)
	}
}
