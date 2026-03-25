import { describe, it, expect } from 'bun:test'

import { HttpRpcClient } from './HttpRpcClient'

describe('HttpRpcClient', () => {
	it('should have clientId after construction', () => {
		const client = new HttpRpcClient('http://localhost:3000')
		expect(client.clientId).toBeDefined()
	})

	it('should accept custom clientId', () => {
		const client = new HttpRpcClient('http://localhost:3000', 'my-client')
		expect(client.clientId).toBe('my-client')
	})

	it('should accept groupId', () => {
		const client = new HttpRpcClient(
			'http://localhost:3000',
			'my-client',
			'my-group'
		)
		expect(client.groupId).toBe('my-group')
	})
})
