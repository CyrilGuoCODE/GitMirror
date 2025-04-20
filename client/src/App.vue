<template>
  <div class="app-container">
    <el-container>
      <el-header>
        <div class="header-content">
          <div class="logo">
            <el-icon class="logo-icon"><Document /></el-icon>
            <h1>Git Mirror</h1>
          </div>
          <el-menu 
            :default-active="activeRoute" 
            mode="horizontal" 
            class="main-menu"
            router
          >
            <el-menu-item index="/">
              <el-icon><HomeFilled /></el-icon>
              <span>控制面板</span>
            </el-menu-item>
            <el-menu-item index="/repositories">
              <el-icon><Connection /></el-icon>
              <span>仓库管理</span>
            </el-menu-item>
            <el-menu-item index="/platforms">
              <el-icon><Service /></el-icon>
              <span>平台设置</span>
            </el-menu-item>
            <el-menu-item index="/config">
              <el-icon><Setting /></el-icon>
              <span>高级配置</span>
            </el-menu-item>
          </el-menu>
        </div>
      </el-header>
      
      <el-main>
        <div class="container main-content">
          <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </div>
      </el-main>
      
      <el-footer>
        <div class="footer-content">
          <p class="text-center">Git Mirror &copy; {{ currentYear }} - 在多个Git服务平台间同步仓库</p>
        </div>
      </el-footer>
    </el-container>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { Document, HomeFilled, Connection, Service, Setting } from '@element-plus/icons-vue';

// 获取当前路由
const route = useRoute();

// 计算当前激活的菜单项
const activeRoute = computed(() => route.path);

// 获取当前年份
const currentYear = new Date().getFullYear();

// 页面加载完成后的操作
onMounted(() => {
  console.log('Git Mirror application initialized');
});
</script>

<style scoped>
.header-content {
  display: flex;
  align-items: center;
  height: 100%;
}

.logo {
  display: flex;
  align-items: center;
  margin-right: 40px;
}

.logo-icon {
  font-size: 24px;
  margin-right: 10px;
  color: #409eff;
}

.logo h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.main-menu {
  flex: 1;
}

.el-header {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  padding: 0 20px;
  background-color: white;
  z-index: 1000;
}

.el-footer {
  padding: 20px;
  text-align: center;
  font-size: 14px;
  color: #909399;
  border-top: 1px solid #ebeef5;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
}
</style> 