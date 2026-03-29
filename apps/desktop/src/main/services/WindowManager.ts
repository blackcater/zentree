import { join } from 'node:path'

import { BrowserWindow } from 'electron'
import type { BrowserWindowConstructorOptions } from 'electron'

import { is } from '@electron-toolkit/utils'
import electronWindowState from 'electron-window-state'

import icon from '~/resources/icon.png?asset'

import { mainLog } from '../lib/logger'
import { platform } from '../lib/utils'
import { buildWebPreferences } from '../lib/web-preferences'

export class WindowManager {
	createWelcomeWindow() {}

	createVaultWindow() {}

	createChatPopupWindow() {}

	createWindow(): BrowserWindow {
		mainLog.info('create window')

		const mainWindowState = electronWindowState({
			defaultWidth: 1000,
			defaultHeight: 700,
		})

		const opts: BrowserWindowConstructorOptions = {
			x: mainWindowState.x,
			y: mainWindowState.y,
			width: mainWindowState.width,
			height: mainWindowState.height,
			minWidth: 640,
			minHeight: 480,
			show: false,
			webPreferences: buildWebPreferences({
				preload: join(__dirname, '../preload/index.js'),
				webgl: true,
			}),
		}

		if (platform.isMacOS) {
			opts.titleBarStyle = 'hiddenInset'
			opts.visualEffectState = 'active'
			opts.vibrancy = 'under-window'
		} else if (platform.isWindows) {
			opts.titleBarStyle = 'hidden'
		} else {
			opts.titleBarStyle = 'default'
			opts.autoHideMenuBar = true
			opts.icon = icon
		}

		const mainWindow = new BrowserWindow(opts)

		mainWindowState.manage(mainWindow)

		mainWindow.on('ready-to-show', () => {
			mainLog.info('window ready to show')
			mainWindow.show()
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
