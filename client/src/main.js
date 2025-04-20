import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import App from './App.vue';
import router from './router';
import './assets/main.css';

const app = createApp(App);

// 使用Pinia状态管理
app.use(createPinia());

// 使用Element Plus组件库
app.use(ElementPlus);

// 使用Vue Router
app.use(router);

app.mount('#app'); 