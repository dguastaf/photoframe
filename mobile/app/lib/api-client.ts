export const BASE_URL = process.env.EXPO_PUBLIC_PHOTOFRAME_SERVER_URL ?? '';

export class ApiError extends Error {
  readonly status: number;
  readonly detail: string;
  readonly url: string;

  constructor(status: number, detail: string, url: string) {
    super(detail);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
    this.url = url;
  }

  get isNetworkFailure(): boolean {
    return this.status === 0;
  }
}

function parseFastApiDetail(body: unknown, status: number): string {
  if (body && typeof body === 'object' && 'detail' in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === 'string') {
      return detail;
    }
    if (Array.isArray(detail) && detail[0] && typeof detail[0] === 'object' && 'msg' in detail[0]) {
      return String((detail[0] as { msg: unknown }).msg);
    }
  }
  return `Request failed (${status})`;
}

async function get<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    const response = await fetch(BASE_URL + path, { method: 'GET', ...init });
    if (!response.ok) {
      const body = await response.json();
      throw new ApiError(response.status, parseFastApiDetail(body, response.status), path);
    }
    const data = await response.json();
    return data as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof Error && err.name === 'AbortError') throw err;
    throw new ApiError(0, 'Network error', path);
  }
}

export const api = { get };
