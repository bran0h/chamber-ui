/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** When "true", chamber + AWS Rust invokes are stubbed; data comes from design/mock-app-state.json */
  readonly VITE_CHAMBER_MOCK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
