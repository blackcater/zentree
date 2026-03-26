import { describe, it, expect, vi, beforeEach } from 'bun:test'
import { IpcRendererRpcClient } from './IpcRendererRpcClient'
import { RpcError } from '../RpcError'

describe('IpcRendererRpcClient', () => {
	let mockIpcRenderer: any
	let client: IpcRendererRpcClient

	beforeEach(() => {
		mockIpcRenderer = {
			send: vi.fn(),
			on: vi.fn(),
			removeListener: vi.fn(),
		}
	})

	it('should have clientId and groupId', () => {
		client = new IpcRendererRpcClient(mockIpcRenderer, 'test-group')
		expect(client.clientId).toBe('ipc-renderer-client')
		expect(client.groupId).toBe('test-group')
	})

	it('should send rpc:invoke on call()', async () => {
		let responseHandler: Function
		mockIpcRenderer.on = vi.fn((channel: string, cb: Function) => {
			if (channel === 'rpc:response') {
				responseHandler = cb
			}
		})

		client = new IpcRendererRpcClient(mockIpcRenderer)

		// Start the call but don't await - we just want to verify send was called
		const callPromise = client.call('/test', {}, 'arg1')

		// Verify send was called with correct channel
		expect(mockIpcRenderer.send).toHaveBeenCalledWith('rpc:invoke:test', {
			invokeId: expect.stringContaining('invoke-'),
			args: ['arg1'],
		})

		// Now simulate response to resolve the promise
		responseHandler(null, {
			channel: 'rpc:response:invoke-1',
			result: { message: 'success' },
		})

		await callPromise
	})

	it('should handle successful call response', async () => {
		let responseHandler: Function
		mockIpcRenderer.on = vi.fn((channel: string, cb: Function) => {
			if (channel === 'rpc:response') {
				responseHandler = cb
			}
		})

		client = new IpcRendererRpcClient(mockIpcRenderer)

		const resultPromise = client.call<{ message: string }>('/test', {}, 'arg1')

		// Simulate successful response
		responseHandler(null, {
			channel: 'rpc:response:invoke-1',
			result: { message: 'success' },
		})

		const result = await resultPromise
		expect(result).toEqual({ message: 'success' })
	})

	it('should handle error response', async () => {
		let responseHandler: Function
		mockIpcRenderer.on = vi.fn((channel: string, cb: Function) => {
			if (channel === 'rpc:response') {
				responseHandler = cb
			}
		})

		client = new IpcRendererRpcClient(mockIpcRenderer)

		const resultPromise = client.call('/test', {})

		// Simulate error response
		responseHandler(null, {
			channel: 'rpc:response:invoke-1',
			error: { code: 'ERR_SERVER', message: 'Server error' },
		})

		await expect(resultPromise).rejects.toThrow('Server error')
	})

	it('should handle AbortSignal abort', async () => {
		client = new IpcRendererRpcClient(mockIpcRenderer)

		const controller = new AbortController()
		controller.abort()

		await expect(client.call('/test', { signal: controller.signal })).rejects.toThrow(
			'Request was aborted'
		)
	})

	it('should handle AbortSignal timeout', async () => {
		client = new IpcRendererRpcClient(mockIpcRenderer)

		await expect(
			client.call('/test', { signal: AbortSignal.timeout(100) })
		).rejects.toThrow()
	})

	it('should register event listener', () => {
		let eventHandler: Function
		mockIpcRenderer.on = vi.fn((channel: string, cb: Function) => {
			if (channel === 'rpc:event') {
				eventHandler = cb
			}
		})

		client = new IpcRendererRpcClient(mockIpcRenderer)

		const listener = vi.fn()
		client.onEvent('my-event', listener)

		// Simulate event
		eventHandler(null, {
			channel: 'rpc:event:my-event',
			data: ['arg1', 'arg2'],
		})

		expect(listener).toHaveBeenCalledWith('arg1', 'arg2')
	})

	it('should return cancel function for event listener', () => {
		let eventHandler: Function
		mockIpcRenderer.on = vi.fn((channel: string, cb: Function) => {
			if (channel === 'rpc:event') {
				eventHandler = cb
			}
		})

		client = new IpcRendererRpcClient(mockIpcRenderer)

		const listener = vi.fn()
		const cancel = client.onEvent('my-event', listener)
		cancel()

		// After cancel, event should not be called
		eventHandler(null, {
			channel: 'rpc:event:my-event',
			data: ['arg1'],
		})

		expect(listener).not.toHaveBeenCalled()
	})

	it('should handle stream chunks', async () => {
		let streamHandler: Function
		mockIpcRenderer.on = vi.fn((channel: string, cb: Function) => {
			if (channel === 'rpc:stream') {
				streamHandler = cb
			}
		})

		client = new IpcRendererRpcClient(mockIpcRenderer)

		const streamResult = client.stream<number>('/stream-test', {})

		// Simulate stream chunks
		streamHandler(null, {
			channel: 'rpc:stream:stream-test:invoke-1',
			chunk: 1,
			done: false,
		})
		streamHandler(null, {
			channel: 'rpc:stream:stream-test:invoke-1',
			chunk: 2,
			done: false,
		})
		streamHandler(null, {
			channel: 'rpc:stream:stream-test:invoke-1',
			chunk: null,
			done: true,
		})

		const chunks: number[] = []
		for await (const chunk of streamResult) {
			chunks.push(chunk)
		}

		expect(chunks).toEqual([1, 2])
	})
})
