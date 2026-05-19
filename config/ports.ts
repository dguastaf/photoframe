import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const configDir = dirname(fileURLToPath(import.meta.url))

export interface Ports {
  serverPort: number
  clientPort: number
  clientHost: string
  clientOrigin: string
  serverOrigin: string
}

function parsePortsEnv(text: string): Record<string, string> {
  const values: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    values[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return values
}

export function loadPorts(repoRoot = resolve(configDir, '..')): Ports {
  const path = resolve(repoRoot, 'config/ports.env')
  const fileValues = existsSync(path) ? parsePortsEnv(readFileSync(path, 'utf8')) : {}

  const serverPort = Number(
    process.env.PHOTOFRAME_SERVER_PORT ?? fileValues.PHOTOFRAME_SERVER_PORT,
  )
  const clientPort = Number(
    process.env.PHOTOFRAME_CLIENT_PORT ?? fileValues.PHOTOFRAME_CLIENT_PORT,
  )
  const clientHost =
    process.env.PHOTOFRAME_CLIENT_HOST ?? fileValues.PHOTOFRAME_CLIENT_HOST ?? 'localhost'

  if (!Number.isFinite(serverPort) || !Number.isFinite(clientPort)) {
    throw new Error(`Invalid or missing ports in ${path}`)
  }

  return {
    serverPort,
    clientPort,
    clientHost,
    clientOrigin: `http://${clientHost}:${clientPort}`,
    serverOrigin: `http://${clientHost}:${serverPort}`,
  }
}
