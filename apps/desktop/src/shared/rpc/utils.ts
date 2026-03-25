export function extractRpcErrorMsg(error: unknown, defMsg?: string): string {
	if (error instanceof Error) {
		return error.message
	}

	if ((error as any).toJSON) {
		return (error as any).toJSON().message
	}

	return defMsg || 'An unknown error occurred'
}
