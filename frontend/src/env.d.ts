/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MAP_PROVIDER?: string;
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
  readonly VITE_GOOGLE_MAPS_MAP_ID?: string;
  readonly VITE_MRT_LIVEBOARD_SOURCE?: string;
  readonly VITE_TDX_PROXY_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
