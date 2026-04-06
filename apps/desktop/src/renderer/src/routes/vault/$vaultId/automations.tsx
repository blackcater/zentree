import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/vault/$vaultId/automations')({
	component: AutomationsPage,
})

function AutomationsPage() {
	return (
		<div className="flex h-full items-center justify-center">
			Automations (Placeholder)
		</div>
	)
}
