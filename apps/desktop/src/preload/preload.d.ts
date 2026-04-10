import type { AppInfo } from '@/types'
import type { API } from '@/types/api'

export type { API }

declare global {
	interface Window {
		api: API
		__appInfo: AppInfo
	}
}
