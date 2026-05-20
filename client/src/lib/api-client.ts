export class ApiError extends Error {
  readonly status: number
  readonly detail: string
  readonly url: string

  constructor(status: number, detail: string, url: string) {
    super(detail)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
    this.url = url
  }

  /** True when fetch failed before a response (e.g. server not running). */
  get isNetworkFailure(): boolean {
    return this.status === 0
  }
}

function parseFastApiDetail(body: unknown, status: number): string {
  if (body && typeof body === 'object' && 'detail' in body) {
    const detail = (body as { detail: unknown }).detail
    if (typeof detail === 'string') {
      return detail
    }
    if (Array.isArray(detail) && detail[0] && typeof detail[0] === 'object' && 'msg' in detail[0]) {
      return String((detail[0] as { msg: unknown }).msg)
    }
  }
  return `Request failed (${status})`
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, init)
  } catch {
    throw new ApiError(0, 'Network error', path)
  }

  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    throw new ApiError(response.status, parseFastApiDetail(body, response.status), path)
  }

  return body as T
}

export const api = {
  get: <T>(path: string, init?: RequestInit) =>
    request<T>(path, { ...init, method: 'GET' }),
}
