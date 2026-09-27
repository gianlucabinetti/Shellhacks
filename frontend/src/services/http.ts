import type { ApiErrorBody } from '@/types/api'

const CONFIGURED_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/
// On a phone opening the laptop's network address, "localhost" would mean the phone
// itself; use same-origin requests through the Vite proxy instead.
const BASE_URL = LOCAL.test(CONFIGURED_URL) && !['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? ''
  : CONFIGURED_URL

export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

function isApiErrorBody(body: unknown): body is ApiErrorBody {
  return (
    typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof (body as ApiErrorBody).error?.message === 'string'
  )
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    })
  } catch {
    throw new ApiError(0, 'network_error', 'Could not reach the server. Check your connection.')
  }

  const body: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    if (isApiErrorBody(body)) {
      throw new ApiError(response.status, body.error.code, body.error.message)
    }
    throw new ApiError(response.status, 'http_error', `Request failed (${response.status}).`)
  }

  return body as T
}

