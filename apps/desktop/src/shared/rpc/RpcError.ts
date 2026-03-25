import type { IRpcErrorDefinition } from './types'
import { extractRpcErrorMsg } from './utils'

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
			return new RpcError(RpcError.INTERNAL_ERROR, error.message)
		}

		return new RpcError(RpcError.UNKNOWN_ERROR, extractRpcErrorMsg(error))
	}
}

export namespace RpcError {
	export const INTERNAL_ERROR = 'INTERNAL_ERROR'
	export const UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}
