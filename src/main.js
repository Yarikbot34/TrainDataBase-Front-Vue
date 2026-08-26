import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";

import "./assets/site.css";
import "./assets/sidebar.css";

createApp(App)
    .use(router)
    .mount("#app");