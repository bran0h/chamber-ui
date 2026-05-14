import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import "./assets/index.css";
import { initTauriWindowChrome } from "./tauri-window-chrome";
import { logMockBanner } from "./mocks/chamberMock";

initTauriWindowChrome();
logMockBanner();

createApp(App).use(createPinia()).mount("#app");
