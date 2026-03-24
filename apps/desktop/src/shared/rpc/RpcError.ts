import type { IRpcErrorDefinition } from './types'

export class RpcError extends Error {
	constructor(
		public readonly code: string,
		message: string,
		public readonly data?: unknown
	) {
		super(message)
		this.name = 'RpcError'
	}

	toJSON(): IRpcErrorDefinition {
		return {
			code: this.code,
			message: this.message,
			data: this.data,
		}
	}

	static from(error: unknown): RpcError {
		if (error instanceof RpcError) {
			return error
		}
		if (error instanceof Error) {
			return new RpcError('INTERNAL_ERROR', error.message)
		}
		return new RpcError('UNKNOWN_ERROR', 'An unknown error occurred')
	}
}
