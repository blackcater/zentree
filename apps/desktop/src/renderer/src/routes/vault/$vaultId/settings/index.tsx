import { createFileRoute, Navigate, useParams } from '@tanstack/react-router'

export const Route = createFileRoute('/vault/$vaultId/settings/')({
	component: SettingsIndex,
})

function SettingsIndex() {
	const { vaultId } = useParams({ from: '/vault/$vaultId' })

	return (
		<Navigate
			to="/vault/$vaultId/settings/general"
			params={{ vaultId }}
			replace
		/>
	)
}
