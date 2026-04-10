import { BrowserView, BrowserWindow } from 'electron'

import { Container } from '@/shared/di'
import { ElectronRpcServer } from '@/shared/rpc/electron'
import type { API } from '@/types'

interface BrowserInstance {
	id: string
	window: BrowserWindow
	view: BrowserView
}

export class BrowserHandler implements API.BrowserAPI {
	readonly #instances: Map<string, BrowserInstance> = new Map()

	#generateId(): string {
		return `browser-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
	}

	async create(
		url?: string,
		options?: { width?: number; height?: number }
	): Promise<{ id: string }> {
		const id = this.#generateId()

		const window = new BrowserWindow({
			width: options?.width || 1200,
			height: options?.height || 800,
			show: false,
		})

		const view = new BrowserView()
		window.setBrowserView(view)

		if (url) {
			await view.webContents.loadURL(url)
		}

		this.#instances.set(id, { id, window, view })

		window.on('closed', () => {
			this.#instances.delete(id)
		})

		return { id }
	}

	async destroy(id: string): Promise<void> {
		const instance = this.#instances.get(id)
		if (!instance) return

		instance.window.destroy()
		this.#instances.delete(id)
	}

	async list(): Promise<API.BrowserInfo[]> {
		const result: API.BrowserInfo[] = []
		for (const [id, instance] of this.#instances) {
			const webContents = instance.view.webContents
			result.push({
				id,
				title: webContents.getTitle(),
				url: webContents.getURL(),
				canGoBack: webContents.canGoBack(),
				canGoForward: webContents.canGoForward(),
			})
		}
		return result
	}

	async navigate(id: string, url: string): Promise<void> {
		const instance = this.#instances.get(id)
		if (!instance) return
		await instance.view.webContents.loadURL(url)
	}

	async goBack(id: string): Promise<void> {
		const instance = this.#instances.get(id)
		if (!instance) return
		const webContents = instance.view.webContents
		if (webContents.canGoBack()) {
			webContents.goBack()
		}
	}

	async goForward(id: string): Promise<void> {
		const instance = this.#instances.get(id)
		if (!instance) return
		const webContents = instance.view.webContents
		if (webContents.canGoForward()) {
			webContents.goForward()
		}
	}

	async reload(id: string): Promise<void> {
		const instance = this.#instances.get(id)
		if (!instance) return
		instance.view.webContents.reload()
	}

	async stop(id: string): Promise<void> {
		const instance = this.#instances.get(id)
		if (!instance) return
		instance.view.webContents.stop()
	}

	async focus(id: string): Promise<void> {
		const instance = this.#instances.get(id)
		if (!instance) return
		instance.window.focus()
	}

	async screenshot(id: string): Promise<string> {
		const instance = this.#instances.get(id)
		if (!instance) return ''

		const webContents = instance.view.webContents
		const image = await webContents.capturePage()
		return image.toDataURL()
	}

	// CDP operations
	async getAccessibilitySnapshot(
		id: string
	): Promise<Record<string, unknown> | null> {
		const instance = this.#instances.get(id)
		if (!instance) return null

		const webContents = instance.view.webContents

		// Accessibility snapshot via CDP
		const result = await webContents.executeJavaScript(`
			(function() {
				function serializeNode(node) {
					if (!node) return null;
					return {
						role: node.role,
						name: node.name,
						value: node.value,
						description: node.description,
						children: node.children ? node.children.map(serializeNode) : []
					};
				}

				if (window.automation && window.automation.getSnapshot) {
					return window.automation.getSnapshot();
				}
				return null;
			})()
		`)
		return result
	}

	async clickElement(id: string, selector: string): Promise<void> {
		const instance = this.#instances.get(id)
		if (!instance) return

		await instance.view.webContents.executeJavaScript(`
			(function() {
				const el = document.querySelector('${selector}')
				if (el) el.click()
			})()
		`)
	}

	async fillElement(
		id: string,
		selector: string,
		value: string
	): Promise<void> {
		const instance = this.#instances.get(id)
		if (!instance) return

		await instance.view.webContents.executeJavaScript(`
			(function() {
				const el = document.querySelector('${selector}')
				if (el) {
					el.value = '${value}'
					el.dispatchEvent(new Event('input', { bubbles: true }))
					el.dispatchEvent(new Event('change', { bubbles: true }))
				}
			})()
		`)
	}

	async selectOption(
		id: string,
		selector: string,
		value: string
	): Promise<void> {
		const instance = this.#instances.get(id)
		if (!instance) return

		await instance.view.webContents.executeJavaScript(`
			(function() {
				const el = document.querySelector('${selector}')
				if (el) {
					el.value = '${value}'
					el.dispatchEvent(new Event('change', { bubbles: true }))
				}
			})()
		`)
	}

	// -----------------------------------------------------------------------
	// Registration
	// -----------------------------------------------------------------------

	static registerHandlers(): void {
		const server = Container.inject(ElectronRpcServer)
		const router = server.router('browser')
		const handler = new BrowserHandler()

		router.handle('create', (url, options) => handler.create(url, options))
		router.handle('destroy', (id) => handler.destroy(id))
		router.handle('list', () => handler.list())
		router.handle('navigate', (id, url) => handler.navigate(id, url))
		router.handle('goBack', (id) => handler.goBack(id))
		router.handle('goForward', (id) => handler.goForward(id))
		router.handle('reload', (id) => handler.reload(id))
		router.handle('stop', (id) => handler.stop(id))
		router.handle('focus', (id) => handler.focus(id))
		router.handle('screenshot', (id) => handler.screenshot(id))
		router.handle('getAccessibilitySnapshot', (id) =>
			handler.getAccessibilitySnapshot(id)
		)
		router.handle('clickElement', (id, selector) =>
			handler.clickElement(id, selector)
		)
		router.handle('fillElement', (id, selector, value) =>
			handler.fillElement(id, selector, value)
		)
		router.handle('selectOption', (id, selector, value) =>
			handler.selectOption(id, selector, value)
		)
	}
}
