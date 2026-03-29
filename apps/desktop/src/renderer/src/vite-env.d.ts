/// <reference types="vite/client" />

import type { AppInfo } from '@/types'

declare global {
	interface Window {
		__appInfo?: AppInfo
	}
}
