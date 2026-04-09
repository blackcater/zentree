export type PanelType = 'git' | 'projectFiles' | 'browser' | 'outline' | null

export interface PanelState {
	collapsed: boolean
	width: number
	type: PanelType
}
