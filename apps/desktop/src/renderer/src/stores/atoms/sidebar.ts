import { atomWithStorage } from 'jotai/utils'

import type { SidebarState } from '@renderer/types/sidebar'

export const sidebarAtom = atomWithStorage<SidebarState>('sidebar-state', {
	collapsed: false,
	width: 256,
	organizeMode: 'folder',
	sortBy: 'updatedAt',
	showMode: 'all',
})
