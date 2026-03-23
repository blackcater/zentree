import { contextBridge, ipcRenderer } from 'electron'

import { electronAPI } from '@electron-toolkit/preload'

// Message types for IPC communication
interface IpcRequest {
	type: 'request'
	channel: string
	requestId: string
	payload: unknown
}

interface IpcResponse {
	type: 'response'
	requestId: string
	payload?: unknown
	error?: string
}

interface IpcMessage {
	type: 'message'
	channel: string
	data?: unknown
}

type IpcIncomingMessage = IpcRequest | IpcResponse | IpcMessage

// API interface
interface PreloadApi {
	invoke<T>(channel: string, data?: unknown): Promise<T>
	send(channel: string, data?: unknown): void
	on(channel: string, handler: (data: unknown) => void): () => void
}

// Store the MessagePort for communication
let messagePort: MessagePort | null = null
let requestIdCounter = 0

// Pending requests map
const pendingRequests = new Map<string, { resolve: (value: unknown) => void; reject: (error: Error) => void }>()

// Subscription handlers map
const subscriptionHandlers = new Map<string, Set<(data: unknown) => void>>()

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
	return `req_${Date.now()}_${++requestIdCounter}`
}

/**
 * Handle incoming messages from the main process
 */
function handleMessage(event: MessageEvent): void {
	const data = event.data as IpcIncomingMessage

	switch (data.type) {
		case 'response': {
			const { requestId, payload, error } = data
			const pending = pendingRequests.get(requestId)
			if (pending) {
				pendingRequests.delete(requestId)
				if (error) {
					pending.reject(new Error(error))
				} else {
					pending.resolve(payload)
				}
			}
			break
		}

		case 'message': {
			const { channel, data: messageData } = data
			const handlers = subscriptionHandlers.get(channel)
			if (handlers) {
				handlers.forEach((handler) => handler(messageData))
			}
			break
		}

		default:
			console.warn('Unknown message type:', data.type)
	}
}

/**
 * Initialize the MessagePort when received from main process
 */
ipcRenderer.on('ipc-port', (event) => {
	const [port] = event.ports
	if (port) {
		messagePort = port
		messagePort.onmessage = handleMessage
		messagePort.start()
	}
})

/**
 * Invoke a handler on main process and wait for response
 */
function invoke<T>(channel: string, data?: unknown): Promise<T> {
	return new Promise((resolve, reject) => {
		if (!messagePort) {
			reject(new Error('MessagePort not initialized'))
			return
		}

		const requestId = generateRequestId()
		pendingRequests.set(requestId, { resolve: resolve as (value: unknown) => void, reject })

		const request: IpcRequest = {
			type: 'request',
			channel,
			requestId,
			payload: data,
		}

		messagePort.postMessage(request)

		// Timeout after 30 seconds
		setTimeout(() => {
			if (pendingRequests.has(requestId)) {
				pendingRequests.delete(requestId)
				reject(new Error(`Request ${requestId} timed out`))
			}
		}, 30000)
	})
}

/**
 * Send a fire-and-forget message to main process
 */
function send(channel: string, data?: unknown): void {
	if (!messagePort) {
		console.warn('MessagePort not initialized')
		return
	}

	const message: IpcMessage = {
		type: 'message',
		channel,
		data,
	}

	messagePort.postMessage(message)
}

/**
 * Subscribe to messages from main process
 */
function on(channel: string, handler: (data: unknown) => void): () => void {
	if (!subscriptionHandlers.has(channel)) {
		subscriptionHandlers.set(channel, new Set())
	}

	const handlers = subscriptionHandlers.get(channel)!
	handlers.add(handler)

	// Return unsubscribe function
	return () => {
		handlers.delete(handler)
		if (handlers.size === 0) {
			subscriptionHandlers.delete(channel)
		}
	}
}

// Custom APIs for renderer
const api: PreloadApi = {
	invoke,
	send,
	on,
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
	try {
		contextBridge.exposeInMainWorld('electron', electronAPI)
		contextBridge.exposeInMainWorld('api', api)
	} catch (error) {
		console.error(error)
	}
} else {
	// @ts-ignore (define in dts)
	window.electron = electronAPI
	// @ts-ignore (define in dts)
	window.api = api
}
