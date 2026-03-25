import { extractRpcErrorMsg } from './utils'

export interface IRpcErrorDefinition<Data = unknown> {
	readonly code: string
	readonly message: string
	readonly data?: Data
}

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

	static fromJSON(json: IRpcErrorDefinition): RpcError {
		return new RpcError(json.code, json.message, json.data)
	}
}

export namespace RpcError {
	export const INTERNAL_ERROR = 'INTERNAL_ERROR'
	export const UNKNOWN_ERROR = 'UNKNOWN_ERROR'
	export const NOT_FOUND = 'NOT_FOUND'
	export const INVALID_PARAMS = 'INVALID_PARAMS'
	export const ABORTED = 'ABORTED'
	export const TIMEOUT = 'TIMEOUT'
	export const UNAUTHORIZED = 'UNAUTHORIZED'
	export const FORBIDDEN = 'FORBIDDEN'
}
