import { atom } from 'jotai'

import type { PanelState } from '@renderer/types/panel'

export const panelAtom = atom<PanelState>({
	collapsed: false,
	width: 350,
	type: 'outline',
})
