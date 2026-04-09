import { atom } from 'jotai'

/**
 * Browser instance information interface
 */
export interface BrowserInstanceInfo {
	id: string
	url: string
	title: string
	favicon?: string
	isLoading: boolean
	canGoBack: boolean
	canGoForward: boolean
	boundSessionId?: string
	ownerType: 'agent' | 'user'
	ownerSessionId?: string
	isVisible: boolean
	agentControlActive: boolean
	themeColor?: string
}

/**
 * Browser instances map - stores all browser instances by id
 */
export const browserInstancesMapAtom = atom<Map<string, BrowserInstanceInfo>>(
	new Map()
)

/**
 * Browser instances array - derived from map for iteration
 */
export const browserInstancesAtom = atom((get) => {
	const map = get(browserInstancesMapAtom)
	return Array.from(map.values())
})

/**
 * Active browser instance ID
 */
export const activeBrowserInstanceIdAtom = atom<string | null>(null)

/**
 * Active browser instance - derived from active id
 */
export const activeBrowserInstanceAtom = atom((get) => {
	const activeId = get(activeBrowserInstanceIdAtom)
	if (!activeId) return null
	const map = get(browserInstancesMapAtom)
	return map.get(activeId) ?? null
})

/**
 * Update browser instance - write-only atom
 */
export const updateBrowserInstanceAtom = atom(
	null,
	(
		get,
		set,
		instanceId: string,
		updater: (prev: BrowserInstanceInfo | undefined) => BrowserInstanceInfo
	) => {
		const map = get(browserInstancesMapAtom)
		const current = map.get(instanceId)
		const updated = updater(current)
		const newMap = new Map(map)
		newMap.set(instanceId, updated)
		set(browserInstancesMapAtom, newMap)
	}
)

/**
 * Remove browser instance - write-only atom
 */
export const removeBrowserInstanceAtom = atom(
	null,
	(get, set, instanceId: string) => {
		const map = get(browserInstancesMapAtom)
		const newMap = new Map(map)
		newMap.delete(instanceId)
		set(browserInstancesMapAtom, newMap)

		// Clear active id if removed instance was active
		const activeId = get(activeBrowserInstanceIdAtom)
		if (activeId === instanceId) {
			set(activeBrowserInstanceIdAtom, null)
		}
	}
)
