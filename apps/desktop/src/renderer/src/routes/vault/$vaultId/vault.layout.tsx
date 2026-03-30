// apps/desktop/src/renderer/src/routes/vault/$vaultId/vault.layout.tsx
import { Outlet } from '@tanstack/react-router'
import { VaultSidebar } from '../../../components/vault/VaultSidebar'

function VaultLayout() {
  return (
    <div className="flex flex-1 overflow-hidden">
      <VaultSidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}

export { VaultLayout }
