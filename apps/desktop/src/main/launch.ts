import { app } from 'electron'

import { Container } from '@/shared/di'
import icon from '~/resources/icon.png?asset'

import { AppStore } from './lib/store'
import { is, platform, setAppUserModelId } from './lib/utils'
import { WindowManager } from './services'

export async function launch() {
	setAppUserModelId('dev.blackcater.acme')

	if (platform.isMacOS && app.dock && is.dev) {
		app.dock.setIcon(icon)
	}

	const windowManager = Container.inject(WindowManager)
	const store = Container.inject(AppStore)

	if (store.firstLaunchDone) {
		windowManager.createVaultWindow('default-vault')
	} else {
		windowManager.createWelcomeWindow()
	}
}
