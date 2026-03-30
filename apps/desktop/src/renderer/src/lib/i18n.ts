import i18next from 'i18next'
import type { i18n as I18nInstance } from 'i18next'

import { checkLocale, DEFAULT_LOCALE, RESOURCES } from '@/i18n'

export const i18n: I18nInstance = i18next.createInstance()

export async function initRendererI18n(locale: string): Promise<I18nInstance> {
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
