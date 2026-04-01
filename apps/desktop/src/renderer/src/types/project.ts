import type { Thread } from './thread'

export interface Project {
  id: string
  title: string
}

export interface ProjectTreeNode {
  project: Project
  threads: Thread[]
}

export type ProjectTree = ProjectTreeNode[]
