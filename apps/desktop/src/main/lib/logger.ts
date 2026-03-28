import { shell } from 'electron'

import log from 'electron-log/main'

import { is } from './utils'

log.transports.file.maxSize = 5 * 1024 * 1024 // 5MB

if (is.dev) {
	// Console output in debug mode with readable format
	// Note: format must return an array - electron-log's transformStyles calls .reduce() on it
	log.transports.console.format = ({ message }) => {
		const scope = message.scope ? `[${message.scope}]` : ''
		const level = message.level.toUpperCase().padEnd(5)
		const data = message.data
			.map((d: unknown) =>
				typeof d === 'object' ? JSON.stringify(d) : String(d as any)
			)
			.join(' ')
		return [`${message.date.toISOString()} ${level} ${scope} ${data}`]
	}
	log.transports.console.level = 'debug'
} else {
	log.transports.file.level = 'info'
	log.transports.console.level = 'info'
}

// Export scoped loggers for different modules
export const mainLog = log.scope('main')

/**
 * Get the path to the current log file.
 * Returns undefined if file logging is disabled.
 */
export function getLogFilePath(): string | undefined {
	if (!is.dev) return undefined
	return log.transports.file.getFile()?.path
}

/**
 * Open the log file in the default application.
 */
export async function openlogFile() {
	const filePath = getLogFilePath()
	if (!filePath) return
	await shell.openPath(filePath)
}

export { log }
