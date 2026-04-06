export type PanelType = 'git' | 'files' | 'browser' | 'preview' | null

export interface PanelState {
	collapsed: boolean
	width: number
	type: PanelType
}
