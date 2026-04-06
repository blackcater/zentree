import { useState } from 'react'

import { Label, Switch } from '@acme-ai/ui/foundation'
import { createFileRoute } from '@tanstack/react-router'

import { SettingsContent, SettingsSection } from '@renderer/components/settings'

export const Route = createFileRoute('/vault/$vaultId/settings/git')({
	component: GitPage,
})

function GitPage() {
	const [deleteLocalBranch, setDeleteLocalBranch] = useState(false)

	return (
		<SettingsContent>
			<SettingsSection
				title="Git & Worktrees"
				description="Configure git branch and worktree behavior"
			>
				<div className="flex items-center justify-between">
					<div className="space-y-0.5">
						<Label
							htmlFor="delete-local-branch"
							className="text-sm font-medium"
						>
							Delete Local Branch on Removal
						</Label>
						<p className="text-muted-foreground text-xs">
							Delete git branch when deleting a worktree
						</p>
					</div>
					<Switch
						id="delete-local-branch"
						checked={deleteLocalBranch}
						onCheckedChange={setDeleteLocalBranch}
					/>
				</div>
			</SettingsSection>
		</SettingsContent>
	)
}
