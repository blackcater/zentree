import { useState, useCallback } from 'react'

import { useGitStatus } from '@renderer/hooks/chat/useGitStatus'
import { TabBar } from '../shared'
import { ChangesSection } from './ChangesSection'
import { CommitsSection } from './CommitsSection'
import { GitPanelHeader } from './GitPanelHeader'

type GitTabId = 'changes' | 'commits'

const TABS = [
	{ id: 'changes' as const, label: 'Changes' },
	{ id: 'commits' as const, label: 'Commits' },
]

export function GitPanel() {
	const [activeTabId, setActiveTabId] = useState<GitTabId>('changes')
	const { refresh, currentBranch } = useGitStatus()

	const handleRefresh = useCallback(() => {
		refresh()
	}, [refresh])

	const handleTabSelect = useCallback((tabId: string) => {
		setActiveTabId(tabId as GitTabId)
	}, [])

	return (
		<div className="flex h-full flex-col">
			<GitPanelHeader branch={currentBranch} onRefresh={handleRefresh} />
			<TabBar
				tabs={TABS}
				activeTabId={activeTabId}
				onSelectTab={handleTabSelect}
			/>
			<div className="flex-1 overflow-hidden">
				{activeTabId === 'changes' ? (
					<ChangesSection />
				) : (
					<CommitsSection />
				)}
			</div>
		</div>
	)
}
