import type { WebPreferences } from 'electron'

const DEFAULT_WEB_PREFERENCES: Pick<
	WebPreferences,
	'sandbox' | 'contextIsolation' | 'nodeIntegration'
> = {
	sandbox: true,
	contextIsolation: true,
	nodeIntegration: false,
}

export function buildWebPreferences(
	overrides: Partial<WebPreferences> = {}
): WebPreferences {
	return {
		...DEFAULT_WEB_PREFERENCES,
		...overrides,
	}
}
