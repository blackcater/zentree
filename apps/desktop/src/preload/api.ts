import { contextBridge } from 'electron'

import type { API } from './preload'
import { createRpc } from './utils'

// Create singleton RPC client instance
const rpc = createRpc()

const store = {
	get: (key: 'firstLaunchDone'): Promise<boolean> =>
		rpc.call('store/get', key),
	set: (key: 'firstLaunchDone', value: boolean): Promise<void> =>
		rpc.call('store/set', key, value),
	getLocale: (): Promise<string> => rpc.call('locale/get'),
	setLocale: (locale: string): Promise<void> => rpc.call('locale/set', locale),
}

const api: API = {
	rpc,
	store,
}

if (process.contextIsolated) {
	try {
		contextBridge.exposeInMainWorld('api', api)
	} catch (error) {
		console.error(error)
	}
}
