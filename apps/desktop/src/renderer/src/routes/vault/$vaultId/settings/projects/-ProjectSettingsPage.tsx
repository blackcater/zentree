import { Button } from '@acme-ai/ui/foundation'
import { Input } from '@acme-ai/ui/foundation'
import { Textarea } from '@acme-ai/ui/foundation'
import { Separator } from '@acme-ai/ui/foundation'

import {
	SettingsContent,
	SettingsSection,
} from '@renderer/components/settings/SettingsContent'

interface ProjectSettingsPageProps {
	projectId: string
}

export function ProjectSettingsPage({
	projectId,
}: ProjectSettingsPageProps): React.JSX.Element {
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
