import { createPinia } from "pinia";
import { createApp } from "vue";
import App from "./app/App.vue";
import { router } from "./app/router";
import { i18n } from "./shared/i18n";
import "./style.css";

createApp(App).use(createPinia()).use(router).use(i18n).mount("#app");
