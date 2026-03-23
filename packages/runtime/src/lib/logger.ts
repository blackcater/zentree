type LogLevel = 'info' | 'warn' | 'error'

const formatMessage = (
	level: LogLevel,
	message: string,
	meta?: object
): string => {
	const timestamp = new Date().toISOString()
	const metaStr = meta ? ` ${JSON.stringify(meta)}` : ''
	return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`
}

export const logger = {
	info(message: string, meta?: object): void {
		console.log(formatMessage('info', message, meta))
	},

	warn(message: string, meta?: object): void {
		console.warn(formatMessage('warn', message, meta))
	},

	error(message: string, meta?: object): void {
		console.error(formatMessage('error', message, meta))
	},
}

export const log = logger
