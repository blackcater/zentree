import { describe, it, expect } from 'bun:test'

import { Hono } from 'hono'
import { z } from 'zod'

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

	it('should validate schema and reject invalid input', async () => {
		const app = new Hono()
		const server = new HttpRpcServer(app)

		const schema = z.object({
			name: z.string(),
			age: z.number(),
		})

		server.handle('test/validate', { schema }, async (_ctx, ...args) => {
			return { valid: true, data: args[0] }
		})

		// Invalid input - age should be number
		const response = await app.request('/rpc/test/validate', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify([{ name: 'John', age: 'not-a-number' }]),
		})

		expect(response.status).toBe(500)
		const json = await response.json()
		expect(json.error.code).toBe('INVALID_PARAMS')
	})

	it('should handle SSE connections', async () => {
		const app = new Hono()
		const server = new HttpRpcServer(app)

		server.handle('test/push', async (_ctx) => {
			server.push('test/event', { type: 'broadcast' }, { msg: 'hello' })
			return { pushed: true }
		})

		// Note: Full SSE testing requires client connection
		// This just verifies the route is set up correctly
		const response = await app.request('/rpc/events', {
			method: 'GET',
			headers: { Accept: 'text/event-stream' },
		})

		expect(response.status).toBe(200)
	})
})
