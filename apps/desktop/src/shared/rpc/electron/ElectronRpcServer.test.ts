import { describe, it, expect, vi } from 'bun:test'

import type { IpcMain } from 'electron'

import type { WebContentsManager } from './ElectronRpcServer'
import { ElectronRpcServer } from './ElectronRpcServer'

const createMockManager = (): WebContentsManager => ({
	send: vi.fn(),
	getWebContents: vi.fn(),
})

const createMockIpcMain = (): IpcMain =>
	({
		on: vi.fn(),
		handle: vi.fn(),
	}) as unknown as IpcMain

describe('ElectronRpcServer', () => {
	it('should register handler with ipcMain.on', async () => {
		const mockManager = createMockManager()
		const mockIpcMain = createMockIpcMain()

		const server = new ElectronRpcServer(mockManager, mockIpcMain)

		server.handle('test/echo', async (_ctx, msg) => {
			return { echoed: msg }
		})

		// Should listen on rpc:invoke:test/echo
		expect(mockIpcMain.on).toHaveBeenCalledWith(
			'rpc:invoke:test/echo',
			expect.any(Function)
		)
	})

	it('should support router for namespace organization', async () => {
		const mockManager = createMockManager()
		const mockIpcMain = createMockIpcMain()

		const server = new ElectronRpcServer(mockManager, mockIpcMain)

		server.router('conversation').handle('create', async (_ctx, params) => {
			return { id: 'conv-1', ...(params as object) }
		})

		expect(mockIpcMain.on).toHaveBeenCalledWith(
			'rpc:invoke:conversation/create',
			expect.any(Function)
		)
	})

	it('should normalize event paths', async () => {
		const mockManager = createMockManager()
		const mockIpcMain = createMockIpcMain()

		const server = new ElectronRpcServer(mockManager, mockIpcMain)

		// Test with leading/trailing slashes
		server.handle('/test/path/', async (_ctx) => 'ok')

		expect(mockIpcMain.on).toHaveBeenCalledWith(
			'rpc:invoke:test/path',
			expect.any(Function)
		)
	})

	it('should push event to broadcast', async () => {
		const mockManager = createMockManager()
		const mockIpcMain = createMockIpcMain()

		const server = new ElectronRpcServer(mockManager, mockIpcMain)

		server.push('test/event', { type: 'broadcast' }, { data: 'test' })

		expect(mockManager.send).toHaveBeenCalledWith(
			'*',
			'rpc:event:test/event',
			{ data: 'test' }
		)
	})

	it('should push event to specific client', async () => {
		const mockManager = createMockManager()
		const mockIpcMain = createMockIpcMain()

		const server = new ElectronRpcServer(mockManager, mockIpcMain)

		server.push(
			'test/event',
			{ type: 'client', clientId: 'client-123' },
			{ data: 'test' }
		)

		expect(mockManager.send).toHaveBeenCalledWith(
			'client-123',
			'rpc:event:test/event',
			{ data: 'test' }
		)
	})

	it('should push event to group', async () => {
		const mockManager = createMockManager()
		const mockIpcMain = createMockIpcMain()

		const server = new ElectronRpcServer(mockManager, mockIpcMain)

		server.push(
			'test/event',
			{ type: 'group', groupId: 'group-456' },
			{ data: 'test' }
		)

		expect(mockManager.send).toHaveBeenCalledWith(
			'group:group-456',
			'rpc:event:test/event',
			{ data: 'test' }
		)
	})
})
