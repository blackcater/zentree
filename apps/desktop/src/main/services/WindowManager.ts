import { join } from 'node:path'

import { BrowserWindow, shell } from 'electron'
import type { BrowserWindowConstructorOptions } from 'electron'

import { is } from '@electron-toolkit/utils'

import icon from '~/resources/icon.png?asset'

import { platform } from '../lib/utils'
import { buildWebPreferences } from '../lib/web-preferences'

export class WindowManager {
	createWelcomeWindow() {}

	createVaultWindow() {}

	createChatPopupWindow() {}

	createWindow(): BrowserWindow {
		const opts: BrowserWindowConstructorOptions = {
			width: 900,
			height: 670,
			show: false,
			transparent: true,
			webPreferences: buildWebPreferences({
				preload: join(__dirname, '../preload/index.js'),
				webgl: true,
			}),
		}

		if (platform.isMacOS) {
			opts.titleBarStyle = 'hiddenInset'
		} else if (platform.isWindows) {
			opts.titleBarStyle = 'hidden'
		} else {
			opts.titleBarStyle = 'default'
			opts.autoHideMenuBar = true
			opts.icon = icon
		}

		const mainWindow = new BrowserWindow(opts)

		mainWindow.on('ready-to-show', () => {
			mainWindow.show()
		})

		mainWindow.webContents.setWindowOpenHandler((details) => {
			shell.openExternal(details.url)
			return { action: 'deny' }
		})

		if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
			mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
		} else {
			mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
		}

		return mainWindow
	}

	createDebugWindow(): {
		window: BrowserWindow
		clientId: string
	} {
		const window = new BrowserWindow({
			width: 900,
			height: 670,
			show: false,
			autoHideMenuBar: true,
			...(process.platform === 'linux' ? { icon } : {}),
			webPreferences: {
				preload: join(__dirname, '../preload/index.js'),
				sandbox: false,
			},
			titleBarStyle: 'hidden',
		})

		window.on('ready-to-show', () => {
			window.show()
		})

		const clientId = `client-${window.id}`

		// Load the rpc-debug route via hash history
		if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
			window.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/rpc-debug`)
		} else {
			window.loadFile(join(__dirname, '../renderer/index.html'), {
				hash: '/rpc-debug',
			})
		}

		return { window, clientId }
	}
}
