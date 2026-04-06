import type { PanelType } from '@renderer/types/panel'

import { BrowserPanel } from './BrowserPanel'
import { GitPanel } from './GitPanel'
import { PreviewPanel } from './PreviewPanel'
import { FilesPanel } from './git'

interface PanelRouterProps {
	type?: PanelType
}

export function PanelRouter({ type }: Readonly<PanelRouterProps>) {
	switch (type) {
		case 'git':
			return <GitPanel />
		case 'files':
			return <FilesPanel />
		case 'browser':
			return <BrowserPanel />
		case 'preview':
			return <PreviewPanel />
		default:
			return null
	}
}
