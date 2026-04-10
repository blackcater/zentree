export namespace FS {
	export interface Node {
		name: string
		path: string
		type: 'directory' | 'file'
		extension?: string
	}

	export interface SearchResult {
		name: string
		path: string
		type: 'file' | 'directory'
	}
}
