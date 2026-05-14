import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import "./assets/index.css";
import { initTauriWindowChrome } from "./tauri-window-chrome";

initTauriWindowChrome();

createApp(App).use(createPinia()).mount("#app");
