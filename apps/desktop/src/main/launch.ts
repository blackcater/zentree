import { app, ipcMain } from 'electron'

import {
	WindowRegistryImpl,
	ElectronRpcServer,
	type WindowRegistry,
} from '@/shared/rpc'
import icon from '~/resources/icon.png?asset'

import { mainLog } from './lib/logger'
import { is, platform, setAppUserModelId } from './lib/utils'
import { RpcDebugService, WindowManager } from './services'

// Store references to main window and services
let windowManager: WindowManager | null = null
let windowRegistry: WindowRegistry | null = null
let rpcServer: ElectronRpcServer | null = null
let mainWindow: Electron.BrowserWindow | null = null

// Function to ensure main window exists and is visible
async function ensureMainWindow() {
	if (!windowManager) {
		windowManager = new WindowManager()
		mainLog.info('WindowManager initialized')
	}

	if (!mainWindow || mainWindow.isDestroyed()) {
		mainWindow = windowManager.createWindow()
		if (windowRegistry) {
			windowRegistry.registerWindow(mainWindow)
			mainLog.info('Main window created and registered')
		}
	}

	return mainWindow
}

// Function to initialize and show main window
async function initAndShowMainWindow() {
	const mainWindow = await ensureMainWindow()

	if (is.dev) {
		// Do not gain focus in dev mode (similar to AFFiNE)
		mainWindow.showInactive()
	} else {
		// Show window normally
		mainWindow.show()
	}

	return mainWindow
}

export async function launch() {
	setAppUserModelId('dev.blackcater.acme')

	if (platform.isMacOS && app.dock && is.dev) {
		app.dock.setIcon(icon)
	}

	// Initialize WindowManager if not already initialized
	if (!windowManager) {
		windowManager = new WindowManager()
		mainLog.info('WindowManager initialized')
	}

	// Initialize WindowRegistry and ElectronRpcServer if not already initialized
	if (!windowRegistry || !rpcServer) {
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
	}

	// Initialize and show main window
	await initAndShowMainWindow()
}

// Handle app activation (for macOS Dock click)
app.on('activate', () => {
	mainLog.info('App activated')
	if (app.isReady()) {
		launch().catch((e) => mainLog.error('Failed to launch on activate:', e))
	}
})

// Handle window-all-closed event
app.on('window-all-closed', () => {
	app.quit()
})
