/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE: string
  readonly VITE_API_URL: string
  readonly VITE_GOOGLE_CLOUD_PROJECT_ID: string
  readonly VITE_GOOGLE_CLOUD_REGION: string
  readonly VITE_APP_TITLE: string
  readonly VITE_APP_VERSION: string
  readonly VITE_AUTH_ENABLED: string
  readonly VITE_GCLOUD_AUTH_ENABLED: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
