import { useEffect, useState } from 'react'

import type { Vault } from '@/shared/ipc/types'

interface VaultSelectorProps {
	selectedVaultId: string | undefined
	onVaultSelect: (vaultId: string) => void
}

export function VaultSelector({
	selectedVaultId,
	onVaultSelect,
}: Readonly<VaultSelectorProps>): React.JSX.Element {
	const [vaults, setVaults] = useState<Vault[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [isOpen, setIsOpen] = useState(false)

	useEffect(() => {
		loadVaults()
	}, [])

	async function loadVaults(): Promise<void> {
		setIsLoading(true)
		try {
			const result = await window.api.invoke<Vault[]>('vault:list')
			setVaults(result)
		} catch (error) {
			console.error('Failed to load vaults:', error)
		} finally {
			setIsLoading(false)
		}
	}

	const selectedVault = vaults.find((v) => v.id === selectedVaultId)

	return (
		<div className="relative">
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				className="border-border bg-card hover:bg-accent flex h-10 w-full items-center justify-between rounded-lg border px-3 text-sm"
			>
				<span className="truncate">
					{isLoading ? (
						<span className="text-muted-foreground">
							Loading...
						</span>
					) : selectedVault ? (
						selectedVault.name
					) : (
						<span className="text-muted-foreground">
							Select vault
						</span>
					)}
				</span>
				<svg
					className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M19 9l-7 7-7-7"
					/>
				</svg>
			</button>

			{isOpen && (
				<>
					<div
						className="fixed inset-0 z-10"
						onClick={() => setIsOpen(false)}
					/>
					<div className="border-border bg-popover absolute top-full left-0 z-20 mt-1 w-full rounded-lg border py-1 shadow-lg">
						{vaults.length === 0 && !isLoading ? (
							<div className="text-muted-foreground px-3 py-2 text-sm">
								No vaults found
							</div>
						) : (
							vaults.map((vault) => (
								<button
									key={vault.id}
									type="button"
									onClick={() => {
										onVaultSelect(vault.id)
										setIsOpen(false)
									}}
									className={`hover:bg-accent flex w-full items-center px-3 py-2 text-sm ${
										vault.id === selectedVaultId
											? 'bg-accent'
											: ''
									}`}
								>
									<span className="truncate">
										{vault.name}
									</span>
								</button>
							))
						)}
					</div>
				</>
			)}
		</div>
	)
}
