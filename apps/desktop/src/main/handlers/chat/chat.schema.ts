/* eslint-disable @typescript-eslint/no-explicit-any */
import type { StandardSchemaV1 } from '@standard-schema/spec'

export const createSessionSchema: StandardSchemaV1<unknown[], any> = {
	'~standard': {
		version: 1,
		validate: (args: unknown[]) => {
			const [engineType, engineConfig] = args as [string, Record<string, unknown>]
			if (typeof engineType !== 'string') {
				return { issues: [{ message: 'engineType must be string' }] }
			}
			return { value: [engineType, engineConfig] }
		},
	},
} as any

export const sendMessageSchema: StandardSchemaV1<unknown[], any> = {
	'~standard': {
		version: 1,
		validate: (args: unknown[]) => {
			const [sessionId, input] = args as [string, string]
			if (typeof sessionId !== 'string' || typeof input !== 'string') {
				return { issues: [{ message: 'sessionId and input must be string' }] }
			}
			return { value: [sessionId, input] }
		},
	},
} as any
