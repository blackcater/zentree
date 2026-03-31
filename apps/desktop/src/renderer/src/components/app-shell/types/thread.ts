export interface Thread {
  id: string
  title: string
  updatedAt: Date
  isPinned: boolean
  folderId: string | null
}

export interface Folder {
  id: string
  title: string
  order: number
}

export type TreeNode =
  | { type: 'folder'; id: string; name: string; order: number }
  | { type: 'thread'; id: string; name: string; folderId: string | null; updatedAt: Date; isPinned: boolean }

export type ViewMode = 'folder' | 'flat'
