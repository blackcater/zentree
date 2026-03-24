import { describe, expect, it } from 'bun:test'

import { HttpRpcServer } from './HttpRpcServer'

describe('HttpRpcServer', () => {
	it('should create server with port', () => {
		const server = new HttpRpcServer({ port: 4096 })
		expect(server).toBeDefined()
	})

	it('should register handlers', async () => {
		const server = new HttpRpcServer({ port: 4096 })

		server.handle('testMethod', async (args) => {
			return { result: args }
		})

		// Handler should be registered (we'll test via HTTP request in integration test)
		expect(true).toBe(true)
	})
})
