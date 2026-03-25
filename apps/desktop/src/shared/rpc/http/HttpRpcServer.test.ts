import { describe, it, expect } from 'bun:test'

import { Hono } from 'hono'

import { HttpRpcServer } from './HttpRpcServer'

describe('HttpRpcServer', () => {
	it('should register handler and invoke it via HTTP', async () => {
		const app = new Hono()
		const server = new HttpRpcServer(app)

		server.handle('test/echo', async (_ctx, ...args) => {
			return { echoed: args[0] }
		})

		// Test the endpoint
		const response = await app.request('/rpc/test/echo', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(['hello']),
		})

		expect(response.status).toBe(200)
		const json = await response.json()
		expect(json).toEqual({ result: { echoed: 'hello' } })
	})

	it('should support router for namespace', async () => {
		const app = new Hono()
		const server = new HttpRpcServer(app)

		server.router('conversation').handle('create', async (_ctx, params) => {
			return { id: 'conv-1', ...(params as object) }
		})

		const response = await app.request('/rpc/conversation/create', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify([{ title: 'Test' }]),
		})

		expect(response.status).toBe(200)
		const json = await response.json()
		expect(json.result.id).toBe('conv-1')
	})

	it('should return 404 for unregistered handler', async () => {
		const app = new Hono()
		new HttpRpcServer(app)

		const response = await app.request('/rpc/unknown/path', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify([]),
		})

		expect(response.status).toBe(404)
	})
})
