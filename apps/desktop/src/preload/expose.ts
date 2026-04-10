import { contextBridge, ipcRenderer } from 'electron'

import { IpcRendererRpcClient } from '@/shared/rpc/electron'
import type { API } from '@/types'

import type { AppInfo } from '../types'
import { buildCallApi, createRpc } from './utils'

const appInfo: AppInfo = {
	releaseVersion: '0.0.1',
	releaseChannel: 'alpha',
	electron: true,
	platform: process.platform,
}

const client = new IpcRendererRpcClient(ipcRenderer)
const rpc = createRpc(client)

const api: API = {
	files: buildCallApi<API.FilesAPI>('files', ['list', 'search'], rpc),
	git: buildCallApi<API.GitAPI>(
		'git',
		[
			'status',
			'branches',
			'currentBranch',
			'log',
			'diffStat',
			'stage',
			'unstage',
			'stageAll',
			'unstageAll',
			'discard',
			'commit',
			'checkout',
			'createBranch',
			'push',
			'pull',
			'fetch',
			'generateCommitMessage',
		],
		rpc
	),
	browser: buildCallApi<API.BrowserAPI>(
		'browser',
		[
			'create',
			'destroy',
			'list',
			'navigate',
			'goBack',
			'goForward',
			'reload',
			'stop',
			'focus',
			'screenshot',
			'getAccessibilitySnapshot',
			'clickElement',
			'fillElement',
			'selectOption',
		],
		rpc
	),
	window: buildCallApi<API.WindowAPI>(
		'window',
		['createVault', 'createPopup', 'close'],
		rpc
	),
	app: buildCallApi<API.AppAPI>(
		'app',
		['getLocale', 'setLocale', 'getBoolValue', 'setBoolValue'],
		rpc
	),
	rpc,
}

if (process.contextIsolated) {
	try {
		contextBridge.exposeInMainWorld('__appInfo', appInfo)
		contextBridge.exposeInMainWorld('api', api)
	} catch (error) {
		console.error(error)
	}
}
