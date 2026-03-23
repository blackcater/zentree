import { BrowserWindow, ipcMain, MessageChannelMain, type MessagePortMain } from 'electron'

import { handlerLog } from '../lib/logger'

interface PendingRequest {
	resolve: (value: unknown) => void
	reject: (error: Error) => void
	windowId: string
}

interface HandlerEntry {
	handler: (input: unknown, windowId: string) => Promise<unknown>
}

interface IncomingMessage {
	type?: string
	channel?: string
	requestId?: string
	payload?: unknown
	data?: unknown
	error?: string
}

/**
 * MessageChannelRouter manages IPC communication between main process and renderer
 * windows using Electron's MessageChannelMain API.
 *
 * Each window gets its own MessageChannel where:
 * - port1 stays in the main process for sending/receiving messages
 * - port2 is sent to the renderer process via preload
 *
 * The router implements a request-response pattern with pending requests map.
 */
export class MessageChannelRouter {
	private windowPorts = new Map<string, MessagePortMain>()
	private windowChannels = new Map<string, MessageChannelMain>()
	private pendingRequests = new Map<string, PendingRequest>()
	private handlers = new Map<string, HandlerEntry>()
	private requestIdCounter = 0

	constructor() {
		// Listen for port messages from preload script
		ipcMain.on('ipc-port', (event) => {
			const windowId = this.getWindowIdFromWebContents(event.sender)
			if (!windowId) {
				handlerLog.error('Received port but no windowId found')
				return
			}

			const port = event.ports[0] as MessagePortMain | undefined
			if (!port) {
				handlerLog.error('Received port message but no port in event')
				return
			}

			this.handleWindowPort(windowId, port)
		})

		handlerLog.debug('MessageChannelRouter initialized')
	}

	/**
	 * Generate a unique request ID
	 */
	private generateRequestId(): string {
		return `req_${Date.now()}_${++this.requestIdCounter}`
	}

	/**
	 * Get window ID from webContents
	 */
	private getWindowIdFromWebContents(webContents: Electron.WebContents): string | undefined {
		for (const [windowId] of this.windowChannels.entries()) {
			// Check if this webContents is associated with any window we manage
			const windows = BrowserWindow.getAllWindows()
			for (const win of windows) {
				if (win.webContents === webContents) {
					return windowId
				}
			}
		}
		return undefined
	}

	/**
	 * Register a handler for a specific channel
	 */
	register<TInput, TOutput>(
		channel: string,
		handler: (input: TInput, windowId: string) => Promise<TOutput>
	): void {
		this.handlers.set(channel, { handler: handler as (input: unknown, windowId: string) => Promise<unknown> })
		handlerLog.debug(`Registered handler for channel: ${channel}`)
	}

	/**
	 * Setup a new window with MessageChannel
	 * Creates a new channel and returns the windowId
	 */
	setupWindow(window: BrowserWindow): string {
		const windowId = `window_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

		// Create a new MessageChannel for this window
		const channel = new MessageChannelMain()
		this.windowChannels.set(windowId, channel)

		// Store port1 (main process side)
		this.windowPorts.set(windowId, channel.port1)

		// Set up port1 listener
		channel.port1.on('message', (event) => {
			this.handleMessage(windowId, event.data)
		})
		channel.port1.start()

		// Send port2 to the renderer via the window's webContents
		window.webContents.postMessage('ipc-port', null, [channel.port2])

		handlerLog.debug(`Setup window with MessageChannel: ${windowId}`)
		return windowId
	}

	/**
	 * Handle incoming message from a window's port
	 */
	private async handleMessage(windowId: string, data: unknown): Promise<void> {
		if (!data || typeof data !== 'object') {
			handlerLog.warn(`Received invalid message from ${windowId}:`, data)
			return
		}

		const message = data as IncomingMessage

		switch (message.type) {
			case 'request': {
				const { channel, requestId, payload } = message
				if (!channel || !requestId) {
					handlerLog.warn(`Invalid request message from ${windowId}:`, message)
					return
				}

				const handler = this.handlers.get(channel)
				if (!handler) {
					handlerLog.warn(`No handler registered for channel: ${channel}`)
					this.sendToWindow(windowId, 'response', {
						requestId,
						error: `No handler registered for channel: ${channel}`,
					})
					return
				}

				try {
					const result = await handler.handler(payload, windowId)
					this.sendToWindow(windowId, 'response', {
						requestId,
						payload: result,
					})
				} catch (error) {
					handlerLog.error(`Handler error for channel ${channel}:`, error)
					this.sendToWindow(windowId, 'response', {
						requestId,
						error: error instanceof Error ? error.message : String(error),
					})
				}
				break
			}

			case 'response': {
				const { requestId, payload, error } = message
				if (!requestId) {
					handlerLog.warn(`Invalid response message from ${windowId}:`, message)
					return
				}

				const pending = this.pendingRequests.get(requestId)
				if (pending) {
					this.pendingRequests.delete(requestId)
					if (error) {
						pending.reject(new Error(error))
					} else {
						pending.resolve(payload)
					}
				} else {
					handlerLog.warn(`Received response for unknown request: ${requestId}`)
				}
				break
			}

			case 'message': {
				// Handle one-way messages sent via sendToWindow
				// These are notifications without expecting a response
				const { channel, data } = message
				if (!channel) {
					handlerLog.warn(`Invalid message from ${windowId}: missing channel`)
					return
				}

				const handler = this.handlers.get(channel)
				if (handler) {
					// Fire and forget - handlers can async but we don't wait for response
					handler.handler(data, windowId).catch((error) => {
						handlerLog.error(`Handler error for channel ${channel}:`, error)
					})
				}
				break
			}

			default:
				handlerLog.warn(`Unknown message type from ${windowId}:`, message.type)
		}
	}

	/**
	 * Handle port connection from a window
	 */
	private handleWindowPort(windowId: string, port: MessagePortMain): void {
		this.windowPorts.set(windowId, port)

		port.on('message', (event) => {
			this.handleMessage(windowId, event.data)
		})
		port.start()

		handlerLog.debug(`Port connected for window: ${windowId}`)
	}

	/**
	 * Send message to specific window
	 */
	sendToWindow(windowId: string, channel: string, data: unknown): void {
		const port = this.windowPorts.get(windowId)
		if (!port) {
			handlerLog.warn(`Cannot send to window ${windowId}: port not found`)
			return
		}

		port.postMessage({ type: 'message', channel, data })
	}

	/**
	 * Invoke a handler on a specific window and wait for response
	 * Used when main process needs to call renderer
	 */
	async invoke<TInput, TOutput>(
		windowId: string,
		channel: string,
		input: TInput
	): Promise<TOutput> {
		const port = this.windowPorts.get(windowId)
		if (!port) {
			throw new Error(`Cannot invoke on window ${windowId}: port not found`)
		}

		const requestId = this.generateRequestId()

		return new Promise((resolve, reject) => {
			this.pendingRequests.set(requestId, { resolve: resolve as (value: unknown) => void, reject, windowId })

			port.postMessage({
				type: 'request',
				channel,
				requestId,
				payload: input,
			})

			// Timeout after 30 seconds
			setTimeout(() => {
				if (this.pendingRequests.has(requestId)) {
					this.pendingRequests.delete(requestId)
					reject(new Error(`Request ${requestId} timed out`))
				}
			}, 30000)
		}) as Promise<TOutput>
	}

	/**
	 * Remove window and clean up its resources
	 */
	removeWindow(windowId: string): void {
		const channel = this.windowChannels.get(windowId)
		if (channel) {
			channel.port1.close()
			this.windowChannels.delete(windowId)
		}

		const port = this.windowPorts.get(windowId)
		if (port) {
			port.close()
			this.windowPorts.delete(windowId)
		}

		// Clean up pending requests for this window to prevent memory leaks
		for (const [requestId, pending] of this.pendingRequests.entries()) {
			if (pending.windowId === windowId) {
				pending.reject(new Error(`Window ${windowId} removed`))
				this.pendingRequests.delete(requestId)
			}
		}

		handlerLog.debug(`Removed window: ${windowId}`)
	}

	/**
	 * Get all registered channel names
	 */
	getRegisteredChannels(): string[] {
		return Array.from(this.handlers.keys())
	}

	/**
	 * Get all managed window IDs
	 */
	getWindowIds(): string[] {
		return Array.from(this.windowChannels.keys())
	}
}

// Singleton instance
let routerInstance: MessageChannelRouter | null = null

export function getRouter(): MessageChannelRouter {
	if (!routerInstance) {
		routerInstance = new MessageChannelRouter()
	}
	return routerInstance
}
