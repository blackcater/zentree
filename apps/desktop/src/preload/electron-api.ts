import { contextBridge } from 'electron'

import type { AppInfo } from '../types'

const appInfo: AppInfo = {
	name: 'Acme',
	releaseVersion: '0.0.1',
	releaseChannel: 'alpha',
	electron: true,
	platform: process.platform,
}

if (process.contextIsolated) {
	try {
		contextBridge.exposeInMainWorld('__appInfo', appInfo)
	} catch (error) {
		console.error(error)
	}
}
