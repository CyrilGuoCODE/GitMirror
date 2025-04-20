import { createRouter, createWebHistory } from 'vue-router';

// 懒加载路由组件
const Dashboard = () => import('../views/Dashboard.vue');
const Repositories = () => import('../views/Repositories.vue');
const Platforms = () => import('../views/Platforms.vue');
const Config = () => import('../views/Config.vue');

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: Dashboard,
    meta: { title: '控制面板' }
  },
  {
    path: '/repositories',
    name: 'Repositories',
    component: Repositories,
    meta: { title: '仓库管理' }
  },
  {
    path: '/platforms',
    name: 'Platforms',
    component: Platforms,
    meta: { title: '平台设置' }
  },
  {
    path: '/config',
    name: 'Config',
    component: Config,
    meta: { title: '高级配置' }
  },
  // 重定向和404页面
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// 路由守卫：设置页面标题
router.beforeEach((to, from, next) => {
  document.title = `${to.meta.title || '首页'} - Git Mirror`;
  next();
});

export default router; 