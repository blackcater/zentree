import { app } from 'electron'

import { registerHandlers } from './handlers'
import { launch } from './launch'
import { mainLog } from './lib/logger'
import { is } from './lib/utils'

app.enableSandbox()

if (is.dev) {
	// In electron the dev server will be resolved to 0.0.0.0, but it
	// might be blocked by electron.
	// See https://github.com/webpack/webpack-dev-server/pull/384
	app.commandLine.appendSwitch('host-resolver-rules', 'MAP 0.0.0.0 127.0.0.1')
}

// https://github.com/electron/electron/issues/43556
// `CalculateNativeWinOcclusion` - Disable native window occlusion tracker (https://groups.google.com/a/chromium.org/g/embedder-dev/c/ZF3uHHyWLKw/m/VDN2hDXMAAAJ)
const disabledFeatures = [
	'PlzDedicatedWorker',
	'CalculateNativeWinOcclusion',
	// Disable Chrome autofill and password save prompts
	'AutofillServerCommunication',
	'AutofillProfileCleanup',
	'AutofillAddressProfileSavePrompt',
	'AutofillPaymentCards',
	'AutofillEnableAccountWalletStorage',
	'SavePasswordBubble',
].join(',')
app.commandLine.appendSwitch('disable-features', disabledFeatures)
app.commandLine.appendSwitch('disable-blink-features', 'Autofill')

// Following features are enabled from the runtime:
// `DocumentPolicyIncludeJSCallStacksInCrashReports` - https://www.electronjs.org/docs/latest/api/web-frame-main#framecollectjavascriptcallstack-experimental
// `EarlyEstablishGpuChannel` - Refs https://issues.chromium.org/issues/40208065
// `EstablishGpuChannelAsync` - Refs https://issues.chromium.org/issues/40208065
const enabledFeatures = [
	'DocumentPolicyIncludeJSCallStacksInCrashReports',
	'EarlyEstablishGpuChannel',
	'EstablishGpuChannelAsync',
].join(',')
app.commandLine.appendSwitch('enable-features', enabledFeatures)
const enabledBlinkFeatures = ['CSSTextAutoSpace', 'WebCodecs'].join(',')
app.commandLine.appendSwitch('enable-blink-features', enabledBlinkFeatures)
app.commandLine.appendSwitch('force-color-profile', 'srgb')

/**
 * Prevent multiple instances
 */
const isSingleInstance = app.requestSingleInstanceLock()
if (!isSingleInstance) {
	mainLog.info(
		'Another instance is running or responding deep link, exiting...'
	)
	app.quit()
	process.exit(0)
}

/**
 * Shout down background process if all windows was closed
 */
app.on('window-all-closed', () => {
	app.quit()
})

app.whenReady()
	.then(registerHandlers)
	.then(launch)
	.catch((error) => {
		mainLog.error('Failed to launch app:', error)
		app.quit()
	})
