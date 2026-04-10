import { BrowserHandler } from './browser'
import { FilesHandler } from './files'
import { GitHandler } from './git'
import { registerChatHandlers } from './chat'
import { registerSystemHandlers } from './system'

export function registerHandlers() {
	registerSystemHandlers()
	FilesHandler.registerHandlers()
	GitHandler.registerHandlers()
	BrowserHandler.registerHandlers()
	registerChatHandlers()
}
