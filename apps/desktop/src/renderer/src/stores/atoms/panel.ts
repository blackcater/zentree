import { atomWithStorage } from 'jotai/utils'

import type { PanelState } from '@renderer/types/panel'

export const panelAtom = atomWithStorage<PanelState>('panel-state', {
	collapsed: false,
	width: 350,
	type: 'files',
})
