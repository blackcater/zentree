import type { IpcRendererRpcClient } from '../shared/rpc/electron'

interface API {
	getRpcClient(): IpcRendererRpcClient
}

declare global {
	interface Window {
		api: API
	}
}
