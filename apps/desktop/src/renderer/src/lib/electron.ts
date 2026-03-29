/**
 * 检测当前是否运行在 Electron 环境中
 * 使用 navigator.userAgent 检测而非 window.electron
 */
export const isElectron = typeof window !== 'undefined' &&
  typeof navigator !== 'undefined' &&
  navigator.userAgent.includes('Electron')
