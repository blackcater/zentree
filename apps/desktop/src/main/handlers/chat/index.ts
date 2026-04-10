import { ChatHandler } from './chat-handler'
import { PermissionHandler } from './permission-handler'

export function registerChatHandlers(): void {
	const chatHandler = new ChatHandler()
	chatHandler.register()

	const permissionHandler = new PermissionHandler()
	permissionHandler.register()
}
