<template>
  <div class="dashboard">
    <h1 class="page-title">控制面板</h1>
    
    <!-- 统计卡片 -->
    <el-row :gutter="20">
      <el-col :xs="24" :sm="12" :md="8">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <el-icon class="stat-icon"><Document /></el-icon>
            <div class="stat-info">
              <h3>仓库总数</h3>
              <div class="stat-value">{{ repositoryStore.repoCount }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :sm="12" :md="8">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <el-icon class="stat-icon success-icon"><SuccessFilled /></el-icon>
            <div class="stat-info">
              <h3>成功同步</h3>
              <div class="stat-value">{{ repositoryStore.successCount }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :sm="12" :md="8">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <el-icon class="stat-icon error-icon"><WarningFilled /></el-icon>
            <div class="stat-info">
              <h3>同步失败</h3>
              <div class="stat-value">{{ repositoryStore.failedCount }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <!-- 状态概览 -->
    <el-card class="status-card" v-loading="loading">
      <template #header>
        <div class="card-header">
          <h2>同步状态</h2>
          <el-button type="primary" @click="syncAllRepositories" :disabled="loading || !hasRepositories">
            <el-icon><RefreshRight /></el-icon> 全部同步
          </el-button>
        </div>
      </template>
      
      <div v-if="hasRepositories">
        <el-table :data="repositoryStore.repositories" style="width: 100%">
          <el-table-column prop="platform" label="平台" width="120">
            <template #default="scope">
              <div class="platform-cell">
                <el-icon class="platform-icon"><Link /></el-icon>
                {{ scope.row.platform }}
              </div>
            </template>
          </el-table-column>
          
          <el-table-column prop="repo" label="仓库" min-width="200" />
          
          <el-table-column prop="type" label="类型" width="120">
            <template #default="scope">
              <el-tag :type="scope.row.type === 'source' ? 'primary' : 'success'">
                {{ scope.row.type === 'source' ? '源仓库' : '镜像仓库' }}
              </el-tag>
            </template>
          </el-table-column>
          
          <el-table-column prop="status" label="状态" width="120">
            <template #default="scope">
              <el-tag :type="getStatusType(scope.row.status)">
                {{ getStatusText(scope.row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          
          <el-table-column label="操作" width="120">
            <template #default="scope">
              <el-button 
                size="small" 
                type="primary" 
                :icon="Refresh"
                circle
                @click="syncRepository(scope.row.id)"
                :loading="repositoryStore.syncingRepos.has(scope.row.id)"
              />
            </template>
          </el-table-column>
        </el-table>
      </div>
      
      <el-empty v-else description="暂无仓库配置" />
    </el-card>
    
    <!-- 快速添加 -->
    <el-card class="action-card">
      <template #header>
        <div class="card-header">
          <h2>快速操作</h2>
        </div>
      </template>
      
      <div class="quick-actions">
        <router-link to="/repositories">
          <el-button type="primary">
            <el-icon><Plus /></el-icon> 添加仓库
          </el-button>
        </router-link>
        
        <router-link to="/config">
          <el-button type="info">
            <el-icon><Setting /></el-icon> 配置设置
          </el-button>
        </router-link>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRepositoryStore } from '../stores/repository';
import { Document, SuccessFilled, WarningFilled, RefreshRight, Link, Plus, Setting, Refresh } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

// 获取仓库存储
const repositoryStore = useRepositoryStore();

// 加载状态
const loading = ref(false);

// 计算是否有仓库
const hasRepositories = computed(() => repositoryStore.repositories.length > 0);

// 获取状态类型
const getStatusType = (status) => {
  switch (status) {
    case 'success': return 'success';
    case 'failed': return 'danger';
    case 'syncing': return 'warning';
    default: return 'info';
  }
};

// 获取状态文本
const getStatusText = (status) => {
  switch (status) {
    case 'success': return '同步成功';
    case 'failed': return '同步失败';
    case 'syncing': return '同步中';
    default: return '未同步';
  }
};

// 同步单个仓库
const syncRepository = async (repoId) => {
  try {
    await repositoryStore.syncRepository(repoId);
    ElMessage.success('同步任务已启动');
  } catch (error) {
    ElMessage.error('启动同步任务失败');
  }
};

// 同步所有仓库
const syncAllRepositories = async () => {
  if (repositoryStore.repositories.length === 0) return;
  
  try {
    loading.value = true;
    
    // 先同步源仓库
    for (const repo of repositoryStore.sourceRepos) {
      await repositoryStore.syncRepository(repo.id);
    }
    
    // 然后同步镜像仓库
    for (const repo of repositoryStore.mirrorRepos) {
      await repositoryStore.syncRepository(repo.id);
    }
    
    ElMessage.success('所有仓库同步任务已启动');
  } catch (error) {
    ElMessage.error('同步任务启动失败');
  } finally {
    loading.value = false;
  }
};

// 组件挂载后获取数据
onMounted(async () => {
  loading.value = true;
  
  try {
    await repositoryStore.fetchRepositories();
  } catch (error) {
    console.error('Failed to fetch repositories:', error);
    ElMessage.error('获取仓库信息失败');
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.dashboard {
  min-height: 100%;
}

.stat-card {
  margin-bottom: 20px;
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-5px);
}

.stat-content {
  display: flex;
  align-items: center;
}

.stat-icon {
  font-size: 40px;
  margin-right: 16px;
  color: #409eff;
}

.success-icon {
  color: #67c23a;
}

.error-icon {
  color: #f56c6c;
}

.stat-info {
  flex: 1;
}

.stat-info h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
  color: #606266;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
}

.status-card,
.action-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h2 {
  margin: 0;
  font-size: 18px;
}

.quick-actions {
  display: flex;
  gap: 10px;
}

.platform-cell {
  display: flex;
  align-items: center;
}

.platform-icon {
  margin-right: 5px;
}
</style> 