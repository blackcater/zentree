/**
 * HTTP service wrapper - type-safe method-based API
 */

// Placeholder types - define in actual feature or a shared types file
interface User {
  id: string
  name: string
  email: string
}

interface CreateUserInput {
  name: string
  email: string
}

interface UpdateUserInput {
  name?: string
  email?: string
}

interface RequestOptions {
  params?: Record<string, string>
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  body?: unknown
  headers?: Record<string, string>
}

async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const { params, method = 'GET', body, headers = {} } = options

  // Build URL with params
  const urlWithParams = params
    ? `${url}?${new URLSearchParams(params as Record<string, string>).toString()}`
    : url

  const fetchOptions: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  }

  if (body && method !== 'GET') {
    fetchOptions.body = JSON.stringify(body)
  }

  const response = await fetch(urlWithParams, fetchOptions)

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  return response.json() as Promise<T>
}

export const http = {
  // ========== User API ==========

  /**
   * Get users list
   */
  getUsers: (params?: { page?: number; limit?: number }) => {
    const queryParams = params
      ? Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v ?? '')]))
      : undefined
    return request<User[]>(`/api/users`, { params: queryParams })
  },

  /**
   * Get single user
   */
  getUser: (id: string) =>
    request<User>(`/api/users/${id}`),

  /**
   * Create user
   */
  createUser: (data: CreateUserInput) =>
    request<User>('/api/users', { method: 'POST', body: data }),

  /**
   * Update user
   */
  updateUser: (id: string, data: UpdateUserInput) =>
    request<User>(`/api/users/${id}`, { method: 'PUT', body: data }),

  /**
   * Delete user
   */
  deleteUser: (id: string) =>
    request<void>(`/api/users/${id}`, { method: 'DELETE' }),

  // ========== Upload API ==========

  /**
   * Upload file
   */
  uploadFile: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return request<{ path: string }>('/api/upload', {
      method: 'POST',
      body: formData,
      headers: {}, // Let fetch set Content-Type automatically for FormData
    })
  },
}