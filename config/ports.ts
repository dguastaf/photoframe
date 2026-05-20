import ports from './ports.json'

export const SERVER_PORT = ports.serverPort
export const CLIENT_DEV_PORT = ports.clientDevPort
export const CLIENT_DEV_HOST = ports.clientDevHost
export const CLIENT_DEV_ORIGIN = `http://${CLIENT_DEV_HOST}:${CLIENT_DEV_PORT}`
export const SERVER_ORIGIN = `http://${CLIENT_DEV_HOST}:${SERVER_PORT}`
