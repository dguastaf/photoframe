/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly PHOTOFRAME_SERVER_PORT: string
  readonly PHOTOFRAME_CLIENT_PORT: string
  readonly PHOTOFRAME_CLIENT_HOST: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
