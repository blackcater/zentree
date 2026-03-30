import i18next from 'i18next'
import type { i18n as I18nInstance } from 'i18next'
import osLocale from 'os-locale'

import {
	checkLocale,
	DEFAULT_LOCALE,
	LOCALE_MAP,
	RESOURCES,
	type SupportedLocale,
} from '@/i18n'

export const i18n: I18nInstance = i18next.createInstance()

export function detectSystemLocale(): SupportedLocale {
	const rawLocale = osLocale()
	return LOCALE_MAP[rawLocale] ?? DEFAULT_LOCALE
}

export function changeLanguage(locale: string) {
	return i18n.changeLanguage(checkLocale(locale))
}

export function getCurrentLocale(): SupportedLocale {
	return i18n.language as SupportedLocale
}

export async function initI18n(locale: string): Promise<I18nInstance> {
	await i18n.init({
		resources: RESOURCES,
		lng: checkLocale(locale),
		fallbackLng: DEFAULT_LOCALE,
		interpolation: {
			escapeValue: false,
		},
	})

	return i18n
}
