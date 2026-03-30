import { i18n } from '@/i18n'

export async function initRendererI18n(locale: string): Promise<void> {
	// Dynamic import to avoid bundling all locales in main
	const { default: en } = await import('@/i18n/locales/en.json')
	const { default: zhCN } = await import('@/i18n/locales/zh-CN.json')
	const { default: zhTW } = await import('@/i18n/locales/zh-TW.json')

	await i18n.init({
		resources: {
			en: { translation: en },
			'zh-CN': { translation: zhCN },
			'zh-TW': { translation: zhTW },
		},
		lng: locale,
		fallbackLng: 'en',
		interpolation: {
			escapeValue: false,
		},
	})
}

export { i18n }