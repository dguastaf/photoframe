import { api } from '../../lib/api-client'
import type { HealthResponse } from '../../types/api'

export const getHealth = (): Promise<HealthResponse> => {
  return api.get<HealthResponse>('/health')
}
