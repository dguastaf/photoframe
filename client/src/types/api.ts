/** Keep in sync with server PhotoMetadata / HealthResponse */

export type PhotoMetadata = {
  id: string
  taken_at: string
  folder: string
}

export type HealthResponse = {
  ok: boolean
}
