export const is = {
	electron:
		typeof window !== 'undefined' &&
		typeof window.__appInfo !== 'undefined' &&
		window.__appInfo.electron === true,
	macOS:
		typeof window !== 'undefined' &&
		typeof window.__appInfo !== 'undefined' &&
		window.__appInfo.platform === 'darwin',
}
