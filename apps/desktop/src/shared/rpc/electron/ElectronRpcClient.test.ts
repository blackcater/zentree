import { describe, it, expect, vi } from 'bun:test'

import type { WebContents } from 'electron'

import { ElectronRpcClient } from './ElectronRpcClient'

describe('ElectronRpcClient', () => {
	it('should have clientId based on webContents id', () => {
		const mockWebContents = {
			send: vi.fn(),
			id: 42,
			on: vi.fn(),
		}

		const client = new ElectronRpcClient(
			mockWebContents as unknown as WebContents
		)

		expect(client.clientId).toBe('client-42')
	})

	it('should accept custom groupId', () => {
		const mockWebContents = {
			send: vi.fn(),
			id: 1,
			on: vi.fn(),
		}

		const client = new ElectronRpcClient(
			mockWebContents as unknown as WebContents,
			'my-group'
		)

		expect(client.groupId).toBe('my-group')
	})

	it('should register listener for event', () => {
		const mockWebContents = {
			send: vi.fn(),
			id: 1,
			on: vi.fn(),
		}

		const client = new ElectronRpcClient(
			mockWebContents as unknown as WebContents
		)
		const listener = vi.fn()
		client.onEvent('notification', listener)

		expect(mockWebContents.on).toHaveBeenCalledWith(
			'rpc:event:notification',
			expect.any(Function)
		)
	})

	it('should return cancel function from onEvent', () => {
		const mockWebContents = {
			send: vi.fn(),
			id: 1,
			on: vi.fn(),
		}

		const client = new ElectronRpcClient(
			mockWebContents as unknown as WebContents
		)
		const listener = vi.fn()
		const cancel = client.onEvent('notification', listener)

		// Cancel should be a function
		expect(typeof cancel).toBe('function')
	})

	it('should abort pending calls', async () => {
		const mockWebContents = {
			send: vi.fn(),
			id: 1,
			on: vi.fn(),
		}

		const client = new ElectronRpcClient(
			mockWebContents as unknown as WebContents
		)

		// Manually add a pending call
		;(client as any).pendingCalls.set('test-id', {
			resolve: vi.fn(),
			reject: vi.fn(),
		})

		client.abort()

		// Pending calls should be cleared
		expect((client as any).pendingCalls.size).toBe(0)
	})

	describe('call()', () => {
		it('should send RPC call and resolve on response', async () => {
			const mockSend = vi.fn()
			const mockOn = vi.fn()
			const mockWebContents = {
				send: mockSend,
				id: 1,
				on: mockOn,
			}

			// Re-initialize to capture the handler
			const client2 = new ElectronRpcClient(
				mockWebContents as unknown as WebContents
			)

			const callPromise = client2.call<{ message: string }>(
				'/test',
				'arg1'
			)

			// Simulate receiving a response
			const invokeId = 'invoke-1'
			const responsePayload = { result: { message: 'success' } }

			// Simulate the server sending back the response
			// We need to manually trigger the internal handler
			const pending = (client2 as any).pendingCalls.get(invokeId)
			expect(pending).toBeDefined()

			// Directly resolve the pending call
			pending.resolve(responsePayload.result)

			const result = await callPromise
			expect(result).toEqual({ message: 'success' })
		})

		it('should send correct channel format for call', () => {
			const mockSend = vi.fn()
			const mockWebContents = {
				send: mockSend,
				id: 1,
				on: vi.fn(),
			}

			const client = new ElectronRpcClient(
				mockWebContents as unknown as WebContents
			)

			// Start the call but don't await
			client.call('/my/event', 'arg1', 'arg2')

			// Check the send was called with correct arguments
			expect(mockSend).toHaveBeenCalledWith('rpc:invoke:my/event', {
				invokeId: expect.stringContaining('invoke-'),
				args: ['arg1', 'arg2'],
			})
		})
	})

	describe('stream()', () => {
		it('should send RPC call for streaming', () => {
			const mockSend = vi.fn()
			const mockWebContents = {
				send: mockSend,
				id: 1,
				on: vi.fn(),
			}

			const client = new ElectronRpcClient(
				mockWebContents as unknown as WebContents
			)

			const streamResult = client.stream<number>('/stream/event', 'arg1')

			expect(mockSend).toHaveBeenCalledWith('rpc:invoke:stream/event', {
				invokeId: expect.stringContaining('invoke-'),
				args: ['arg1'],
			})

			expect(streamResult[Symbol.asyncIterator]).toBeDefined()
			expect(typeof streamResult.cancel).toBe('function')
		})

		it('should send cancel message when cancel() is called', () => {
			const mockSend = vi.fn()
			const mockWebContents = {
				send: mockSend,
				id: 1,
				on: vi.fn(),
			}

			const client = new ElectronRpcClient(
				mockWebContents as unknown as WebContents
			)

			const streamResult = client.stream<number>('/stream/event', 'arg1')

			// Get the invokeId that was used
			const invokeIdArg = mockSend.mock.calls.find(
				(call) => call[0] === 'rpc:invoke:stream/event'
			)?.[1]

			streamResult.cancel()

			// Should send cancel message
			expect(mockSend).toHaveBeenCalledWith(
				`rpc:cancel:stream/event:${invokeIdArg.invokeId}`
			)
		})
	})

	describe('error handling', () => {
		it('should handle RPC errors in call()', async () => {
			const mockSend = vi.fn()
			const mockWebContents = {
				send: mockSend,
				id: 1,
				on: vi.fn(),
			}

			const client = new ElectronRpcClient(
				mockWebContents as unknown as WebContents
			)

			const callPromise = client.call<unknown>('/error/event')

			// Get the pending call and reject it with an error
			const pending = (client as any).pendingCalls.values().next().value
			pending.reject(new Error('Server error'))

			await expect(callPromise).rejects.toThrow('Server error')
		})
	})
})
