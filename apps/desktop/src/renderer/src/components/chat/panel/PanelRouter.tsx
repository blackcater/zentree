import type { PanelType } from '@renderer/types/panel'

import type { UIMessage } from '@renderer/types/session'
import { BrowserWindowManagerPanel } from './browser/BrowserWindowManagerPanel'
import { GitPanel } from './git/GitPanel'
import { OutlinePanel } from './outline/OutlinePanel'
import { ProjectFilesPanel } from './project-files/ProjectFilesPanel'

interface PanelRouterProps {
	type?: PanelType
	messages?: Array<{
		id: string
		role: string
		content: unknown
		tool_calls?: unknown[]
	}>
	onNavigateToMessage?: (messageId: string) => void
}

export function PanelRouter({
	type,
	messages = [],
	onNavigateToMessage,
}: Readonly<PanelRouterProps>) {
	switch (type) {
		case 'git':
			return <GitPanel />
		case 'browser':
			return <BrowserWindowManagerPanel />
		case 'outline':
			return (
				<OutlinePanel
					messages={messages as UIMessage[]}
					onNavigate={(node) => onNavigateToMessage?.(node.messageId)}
				/>
			)
		case 'projectFiles':
			return <ProjectFilesPanel />
		default:
			return null
	}
}
