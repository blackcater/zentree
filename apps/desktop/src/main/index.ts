import { app, ipcMain } from 'electron'

import icon from '~/resources/icon.png?asset'

import {
	WindowRegistryImpl,
	ElectronRpcServer,
	type WindowRegistry,
} from '../shared/rpc'
import { log, mainLog } from './lib/logger'
import { is, platform, setAppUserModelId } from './lib/utils'
import { RpcDebugService, WindowManager } from './services'

log.initialize()

let windowManager: WindowManager | null = null
let windowRegistry: WindowRegistry | null = null
let rpcServer: ElectronRpcServer | null = null

app.on('open-url', (event, url) => {
	event.preventDefault()
	mainLog.info('Received deeplink:', url)
})

app.whenReady()
	.then(() => {
		setAppUserModelId('dev.blackcater.acme')

		if (platform.isMacOS && app.dock && is.dev) {
			app.dock.setIcon(icon)
		}

		// Initialize WindowManager
		windowManager = new WindowManager()
		mainLog.info('WindowManager initialized')

		// Initialize WindowRegistry and ElectronRpcServer
		windowRegistry = new WindowRegistryImpl()
		rpcServer = new ElectronRpcServer(windowRegistry, ipcMain)
		mainLog.info('RPC server initialized')

		// Add window:create IPC handler for BrowserWindow creation
		ipcMain.handle('window:create', async (_, groupId: string | null) => {
			const { window, clientId } = windowManager!.createDebugWindow()
			windowRegistry!.registerWindow(window, groupId ?? undefined)
			return { clientId, windowId: window.id }
		})

		// Register debug handlers
		new RpcDebugService(rpcServer, windowRegistry, windowManager)
		mainLog.info('RPC debug handlers registered')

		// Create the main window
		const mainWindow = windowManager.createWindow()
		windowRegistry.registerWindow(mainWindow)
		mainLog.info('Main window created and registered')
	})
	.catch((error) => {
		mainLog.error('Failed to initialize app:', error)
		app.quit()
	})

app.on('window-all-closed', () => {
	app.quit()
})
