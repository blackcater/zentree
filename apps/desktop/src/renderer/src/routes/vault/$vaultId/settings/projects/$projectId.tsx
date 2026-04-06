import { Button, Input, Separator, Textarea } from '@acme-ai/ui/foundation'
import { createFileRoute, useParams } from '@tanstack/react-router'

import { SettingsContent, SettingsSection } from '@renderer/components/settings'

export const Route = createFileRoute(
	'/vault/$vaultId/settings/projects/$projectId'
)({
	component: ProjectSettingsPage,
})

function ProjectSettingsPage() {
	const { projectId } = useParams({
		from: '/vault/$vaultId/settings/projects/$projectId',
	})

	return (
		<SettingsContent>
			<SettingsSection
				title="Project Settings"
				description={`Configure settings for project ${projectId}`}
			>
				<div className="space-y-4">
					<div className="space-y-2">
						<label className="text-sm font-medium">
							Project Name
						</label>
						<Input placeholder="Project name" />
					</div>
					<div className="space-y-2">
						<label className="text-sm font-medium">
							Description
						</label>
						<Textarea placeholder="Project description" />
					</div>
					<Separator />
					<Button variant="destructive">Archive Project</Button>
				</div>
			</SettingsSection>
		</SettingsContent>
	)
}
