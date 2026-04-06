// IPC service wrapper - type-safe method-based API
declare const windowApi: any

export const ipc = {
  // ========== 文件操作 ==========

  /**
   * Find files
   */
  findFiles: (params: { vaultId: string; pattern: string }) =>
    (windowApi as any).rpc.call('/files/find', params),

  /**
   * Read file content
   */
  readFile: (params: { vaultId: string; path: string }) =>
    (windowApi as any).rpc.call('/files/read', params),

  /**
   * Write file
   */
  writeFile: (params: { vaultId: string; path: string; content: string }) =>
    (windowApi as any).rpc.call('/files/write', params),

  // ========== Session 操作 ==========

  /**
   * Get streaming Session events
   */
  streamSession: (sessionId: string) =>
    (windowApi as any).rpc.stream('/session/stream', sessionId),

  /**
   * Send message
   */
  sendMessage: (params: { sessionId: string; content: string; attachments?: any[] }) =>
    (windowApi as any).rpc.call('/session/send', params),

  /**
   * Get Session list
   */
  getSessions: (vaultId?: string) =>
    (windowApi as any).rpc.call('/session/list', vaultId),

  /**
   * Get single Session
   */
  getSession: (sessionId: string) =>
    (windowApi as any).rpc.call('/session/get', sessionId),

  /**
   * Create Session
   */
  createSession: (params: { vaultId: string; name?: string }) =>
    (windowApi as any).rpc.call('/session/create', params),

  /**
   * Delete Session
   */
  deleteSession: (sessionId: string) =>
    (windowApi as any).rpc.call('/session/delete', sessionId),

  // ========== Vault 操作 ==========

  /**
   * Get Vault list
   */
  getVaults: () =>
    (windowApi as any).rpc.call('/vault/list'),

  /**
   * Create Vault
   */
  createVault: (params: { name: string }) =>
    (windowApi as any).rpc.call('/vault/create', params),

  /**
   * Get Vault settings
   */
  getVaultSettings: (vaultId: string) =>
    (windowApi as any).rpc.call('/vault/settings/get', vaultId),

  // ========== Store 操作 ==========

  /**
   * Get store value
   */
  getStore: <T>(key: string) =>
    (windowApi as any).rpc.call('/system/store/get', key),

  /**
   * Set store value
   */
  setStore: <T>(key: string, value: T) =>
    (windowApi as any).rpc.call('/system/store/set', key, value),
}
