import type { UIMessage } from '../../hooks/useOutline'
import type { PanelType } from '@renderer/types/panel'

import { BrowserPanel } from './BrowserPanel'
import { GitPanel } from './git/GitPanel'
import { PreviewPanel } from './PreviewPanel'
import { FilesPanel } from './files'
import { OutlinePanel } from './outline/OutlinePanel'
import { ProjectFilesPanel } from './project-files/ProjectFilesPanel'

interface PanelRouterProps {
	type?: PanelType
	messages?: Array<{ id: string; role: string; content: unknown; tool_calls?: unknown[] }>
	onNavigateToMessage?: (messageId: string) => void
}

export function PanelRouter({ type, messages, onNavigateToMessage }: Readonly<PanelRouterProps>) {
	switch (type) {
		case 'git':
			return <GitPanel />
		case 'files':
			return <FilesPanel />
		case 'browser':
			return <BrowserPanel />
		case 'preview':
			return <PreviewPanel />
		case 'outline':
			if (onNavigateToMessage) {
				return (
					<OutlinePanel
						messages={messages as UIMessage[]}
						onNavigate={(node) => onNavigateToMessage?.(node.messageId)}
					/>
				)
			}
			return (
				<div className="text-muted-foreground p-4 text-xs">
					Outline Panel requires onNavigateToMessage
				</div>
			)
		case 'projectFiles':
			return <ProjectFilesPanel />
		default:
			return null
	}
}
