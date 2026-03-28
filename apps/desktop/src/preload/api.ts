import { contextBridge, ipcRenderer } from 'electron'

import { IpcRendererRpcClient } from '../shared/rpc/electron'

// Create singleton RPC client instance
const rpcClient = new IpcRendererRpcClient(ipcRenderer)

// Expose API - contextBridge only copies enumerable own properties
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api: any = {
	getRpcClient: () => ({
		clientId: rpcClient.clientId,
		groupId: rpcClient.groupId,
		call: rpcClient.call.bind(rpcClient),
		stream: rpcClient.stream.bind(rpcClient),
		onEvent: rpcClient.onEvent.bind(rpcClient),
	}),
	createWindow: (groupId: string | null) =>
		ipcRenderer.invoke('window:create', groupId),
}

if (process.contextIsolated) {
	try {
		contextBridge.exposeInMainWorld('api', api)
	} catch (error) {
		console.error(error)
	}
}
