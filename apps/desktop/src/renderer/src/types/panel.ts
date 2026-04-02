export type PanelType = 'git' | 'files' | 'outline' | null

export interface PanelState {
  collapsed: boolean
  width: number
  type: PanelType
}
