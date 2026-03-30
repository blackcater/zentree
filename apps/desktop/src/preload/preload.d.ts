import type { RpcClient } from '@/shared/rpc'
import type { IpcRendererRpcClient } from '@/shared/rpc/electron'

interface StoreAPI {
	get: (key: 'firstLaunchDone') => Promise<boolean>
	set: (key: 'firstLaunchDone', value: boolean) => Promise<void>
	getLocale: () => Promise<string>
	setLocale: (locale: string) => Promise<void>
}

interface API {
	rpc: RpcClient
	store: StoreAPI
}

declare global {
	interface Window {
		api: API
	}
}
