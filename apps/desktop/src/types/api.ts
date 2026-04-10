/**
 * Central type definitions for all IPC APIs exposed to the renderer.
 * Each API interface represents the public contract of a handler.
 * Handlers must implement their corresponding API interface.
 */

import type { RpcClient } from '@/shared/rpc'

export interface AppInfo {
	releaseVersion: string
	releaseChannel: string
	electron: boolean
	platform: string
}

/**
 * Combined API interface representing the full api object exposed to renderer.
 */
export interface API {
	files: API.FilesAPI
	git: API.GitAPI
	browser: API.BrowserAPI
	window: API.WindowAPI
	app: API.AppAPI
	rpc: RpcClient
}

export namespace API {
	// ---------------------------------------------------------------------------
	// Files API - Types
	// ---------------------------------------------------------------------------

	/** Represents a file or directory node. */
	export interface FileNode {
		name: string
		path: string
		type: 'file' | 'directory'
		extension?: string
	}

	/** Search result for file queries. */
	export interface SearchResult {
		name: string
		path: string
		type: 'file' | 'directory'
	}

	/**
	 * File system operations for browsing and searching files.
	 */
	export interface FilesAPI {
		list(dirPath: string): Promise<{ files: FileNode[]; error?: string }>
		search(
			query: string,
			rootPath: string
		): Promise<{
			results: SearchResult[]
			skippedCount: number
		}>
	}

	// ---------------------------------------------------------------------------
	// Git API - Types
	// ---------------------------------------------------------------------------

	/** Git repository status. */
	export interface GitStatus {
		current: string | null
		tracking: string | null
		staged: string[]
		unstaged: string[]
		untracked: string[]
		conflicted: string[]
	}

	/** Git branch information. */
	export interface GitBranch {
		name: string
		current: boolean
	}

	/** Git log entry. */
	export interface GitLogEntry {
		hash: string
		date: string
		message: string
		author_name: string
		author_email: string
	}

	/**
	 * Git version control operations.
	 */
	export interface GitAPI {
		status(repoPath: string): Promise<GitStatus>
		branches(repoPath: string): Promise<GitBranch[]>
		currentBranch(repoPath: string): Promise<string>
		log(repoPath: string, count?: number): Promise<GitLogEntry[]>
		diffStat(
			repoPath: string
		): Promise<{ additions: number; deletions: number }>
		stage(repoPath: string, files: string[]): Promise<void>
		unstage(repoPath: string, files: string[]): Promise<void>
		stageAll(repoPath: string): Promise<void>
		unstageAll(repoPath: string): Promise<void>
		discard(repoPath: string, files: string[]): Promise<void>
		commit(repoPath: string, message: string): Promise<{ hash: string }>
		checkout(
			repoPath: string,
			branch: string
		): Promise<{ success: boolean }>
		createBranch(repoPath: string, name: string): Promise<void>
		push(repoPath: string): Promise<{ success: boolean; message?: string }>
		pull(repoPath: string): Promise<{ success: boolean; message?: string }>
		fetch(repoPath: string): Promise<void>
		generateCommitMessage(repoPath: string): Promise<string>
	}

	// ---------------------------------------------------------------------------
	// Browser API - Types
	// ---------------------------------------------------------------------------

	/** Information about a browser instance. */
	export interface BrowserInfo {
		id: string
		title: string
		url: string
		canGoBack: boolean
		canGoForward: boolean
	}

	/**
	 * Browser view management for embedded web content.
	 */
	export interface BrowserAPI {
		create(
			url?: string,
			options?: { width?: number; height?: number }
		): Promise<{ id: string }>
		destroy(id: string): Promise<void>
		list(): Promise<BrowserInfo[]>
		navigate(id: string, url: string): Promise<void>
		goBack(id: string): Promise<void>
		goForward(id: string): Promise<void>
		reload(id: string): Promise<void>
		stop(id: string): Promise<void>
		focus(id: string): Promise<void>
		screenshot(id: string): Promise<string>
		getAccessibilitySnapshot(
			id: string
		): Promise<Record<string, unknown> | null>
		clickElement(id: string, selector: string): Promise<void>
		fillElement(id: string, selector: string, value: string): Promise<void>
		selectOption(id: string, selector: string, value: string): Promise<void>
	}

	// ---------------------------------------------------------------------------
	// Window API
	// ---------------------------------------------------------------------------

	/**
	 * Window lifecycle management.
	 */
	export interface WindowAPI {
		createVault(vaultId: string): Promise<{ ok: boolean }>
		createPopup(threadId: string): Promise<{ ok: boolean }>
		close(windowName: string): Promise<{ ok: boolean }>
	}

	// ---------------------------------------------------------------------------
	// App API
	// ---------------------------------------------------------------------------

	/**
	 * Application-level settings and state management.
	 */
	export interface AppAPI {
		getLocale(): Promise<string>
		setLocale(locale: string): Promise<{ ok: boolean }>
		getBoolValue(key: 'firstLaunchDone'): Promise<boolean>
		setBoolValue(key: 'firstLaunchDone', value: boolean): Promise<void>
	}
}
