import { join } from 'node:path'

import { BrowserWindow } from 'electron'
import type { BrowserWindowConstructorOptions } from 'electron'

import { is } from '@electron-toolkit/utils'
import electronWindowState, { type State } from 'electron-window-state'

import { Container } from '@/shared/di'
import icon from '~/resources/icon.png?asset'

import { mainLog } from '../lib/logger'
import { platform } from '../lib/utils'
import { buildWebPreferences } from '../lib/web-preferences'
import { WindowRegistry } from './WindowRegistry'

interface CreateWindowOptions {
	width?: number
	height?: number
	minWidth?: number
	minHeight?: number
	defaultWidth?: number
	defaultHeight?: number
	enableStateManagement?: boolean
	enableFixedSize?: boolean
}

export class WindowManager {
	readonly #registry: WindowRegistry

	constructor() {
		this.#registry = Container.inject(WindowRegistry)
	}

	#createDefaultWindow(
		hashRoute: string,
		windowName: string,
		options: CreateWindowOptions
	): BrowserWindow {
		mainLog.info(`create window with hashRoute: ${hashRoute}`)

		let windowState: State | null = null
		const opts: BrowserWindowConstructorOptions = {
			minWidth: options.minWidth || 0,
			minHeight: options.minHeight || 0,
			show: false,
			webPreferences: buildWebPreferences({
				preload: join(__dirname, '../preload/index.js'),
				webgl: true,
			}),
		}

		if (options.enableFixedSize) {
			opts.resizable = false
		}

		if (options.enableStateManagement) {
			windowState = electronWindowState({
				defaultWidth: options.defaultWidth || 1000,
				defaultHeight: options.defaultHeight || 650,
			})

			opts.width = windowState.width
			opts.height = windowState.height
			opts.x = windowState.x
			opts.y = windowState.y
		} else {
			opts.width = options.width!
			opts.height = options.height!
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

		const win = new BrowserWindow(opts)

		this.#registry.registerWindow(win, windowName)

		windowState?.manage(win)

		win.on('ready-to-show', () => {
			mainLog.info('window ready to show')
			win.show()
		})

		if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
			win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#${hashRoute}`)
		} else {
			win.loadFile(join(__dirname, '../renderer/index.html'), {
				hash: hashRoute,
			})
		}

		return win
	}

	createWelcomeWindow(): BrowserWindow {
		return this.#createDefaultWindow('/welcome', 'welcome', {
			width: 900,
			height: 650,
			enableStateManagement: false,
		})
	}

	createVaultWindow(vaultId: string): BrowserWindow {
		return this.#createDefaultWindow(`/vault/${vaultId}`, `vault-${vaultId}`, {
			enableStateManagement: true,
			defaultWidth: 1200,
			defaultHeight: 800,
		})
	}

	createChatPopupWindow(threadId: string): BrowserWindow {
		return this.#createDefaultWindow(`/chat-popup/${threadId}`, `popup-${threadId}`, {
			width: 600,
			height: 500,
			enableStateManagement: false,
		})
	}

	closeWindow(windowName: string): void {
		this.#registry.closeWindow(windowName)
	}
}
