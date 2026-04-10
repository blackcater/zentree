import { AppHandler } from './app'
import { BrowserHandler } from './browser'
import { FilesHandler } from './files'
import { GitHandler } from './git'
import { WindowHandler } from './window'

export function registerHandlers() {
	AppHandler.registerHandlers()
	FilesHandler.registerHandlers()
	GitHandler.registerHandlers()
	BrowserHandler.registerHandlers()
	WindowHandler.registerHandlers()
}
