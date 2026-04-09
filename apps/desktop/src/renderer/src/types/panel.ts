export type PanelType =
	| 'git'
	| 'files'
	| 'browser'
	| 'preview'
	| 'outline'
	| 'projectFiles'
	| null

export interface PanelState {
	collapsed: boolean
	width: number
	type: PanelType
}
