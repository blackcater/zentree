import { implement, type ClientContext, type RouterClient } from '@orpc/server'

import { contracts } from '~/contracts'

/**
 * Create an oRPC implementer from the contract.
 * This ensures all procedures adhere to the contract specification.
 */
const os = implement(contracts)

/**
 * Ping handler - Returns "pong" for health checks.
 */
export const ping = os.ping.handler(async () => 'pong')

/**
 * GetAppInfo handler - Returns application metadata.
 */
export const getAppInfo = os.getAppInfo.handler(async () => ({
	name: 'desktop',
	version: '0.1.0',
	platform: process.platform,
}))

/**
 * Greet handler - Returns a personalized greeting.
 */
export const greet = os.greet.handler(
	async ({ input }) => `Hello, ${input.name}!`
)

/**
 * Divide handler - Performs division with error handling.
 */
export const divide = os.divide.handler(async ({ input }) => {
	if (input.b === 0) {
		throw new Error('Cannot divide by zero')
	}
	return input.a / input.b
})

/**
 * Main router that aggregates all procedure handlers.
 * Uses flat structure matching the contract.
 */
export const router = os.router({
	ping,
	getAppInfo,
	greet,
	divide,
})

export type Router = typeof router

export type ORPCClient<Context extends ClientContext = Record<never, never>> =
	RouterClient<Router, Context>
