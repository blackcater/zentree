export interface FileNodeData {
	name: string
	path: string
	type: 'file' | 'directory'
	extension?: string
}

export interface FileNode extends FileNodeData {
	id: string
	depth: number
}

export interface UseFileTreeOptions {
	rootPath: string
	onFileClick?: (node: FileNode, rect: DOMRect) => void
}

export interface ListFilesResponse {
	files: FileNodeData[]
	error?: string
}

export interface SearchFilesResponse {
	results: Array<{
		name: string
		path: string
		type: 'file' | 'directory'
	}>
	error?: string
}
