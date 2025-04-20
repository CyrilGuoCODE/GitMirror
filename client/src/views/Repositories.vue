<template>
  <div class="repositories">
    <h1 class="page-title">仓库管理</h1>
    
    <!-- 主要内容区 -->
    <el-card v-loading="loading">
      <template #header>
        <div class="card-header">
          <h2>仓库列表</h2>
          <el-button type="primary" @click="showAddRepoDialog">
            <el-icon><Plus /></el-icon> 添加仓库
          </el-button>
        </div>
      </template>
      
      <el-tabs v-model="activeTab" type="border-card">
        <el-tab-pane label="源仓库" name="source">
          <div v-if="repositoryStore.sourceRepos.length > 0">
            <el-table :data="repositoryStore.sourceRepos" style="width: 100%" border>
              <el-table-column prop="platform" label="平台" width="120" />
              <el-table-column prop="repo" label="仓库" min-width="200" />
              <el-table-column prop="branches" label="分支" width="150">
                <template #default="scope">
                  <el-tag v-for="branch in scope.row.branches" :key="branch" size="small" style="margin-right: 5px;">
                    {{ branch }}
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
              <el-table-column label="操作" width="200">
                <template #default="scope">
                  <el-button 
                    size="small" 
                    type="primary" 
                    @click="syncRepository(scope.row.id)"
                    :loading="repositoryStore.syncingRepos.has(scope.row.id)"
                  >
                    <el-icon><Refresh /></el-icon> 同步
                  </el-button>
                  <el-button size="small" type="danger" @click="confirmDeleteRepo(scope.row)">
                    <el-icon><Delete /></el-icon> 删除
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
          <el-empty v-else description="暂无源仓库配置" />
        </el-tab-pane>
        
        <el-tab-pane label="镜像仓库" name="mirror">
          <div v-if="repositoryStore.mirrorRepos.length > 0">
            <el-table :data="repositoryStore.mirrorRepos" style="width: 100%" border>
              <el-table-column prop="platform" label="平台" width="120" />
              <el-table-column prop="repo" label="仓库" min-width="200" />
              <el-table-column prop="status" label="状态" width="120">
                <template #default="scope">
                  <el-tag :type="getStatusType(scope.row.status)">
                    {{ getStatusText(scope.row.status) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="200">
                <template #default="scope">
                  <el-button 
                    size="small" 
                    type="primary" 
                    @click="syncRepository(scope.row.id)"
                    :loading="repositoryStore.syncingRepos.has(scope.row.id)"
                  >
                    <el-icon><Refresh /></el-icon> 同步
                  </el-button>
                  <el-button size="small" type="danger" @click="confirmDeleteRepo(scope.row)">
                    <el-icon><Delete /></el-icon> 删除
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
          <el-empty v-else description="暂无镜像仓库配置" />
        </el-tab-pane>
      </el-tabs>
    </el-card>
    
    <!-- 添加仓库对话框 -->
    <el-dialog
      v-model="addRepoDialogVisible"
      title="添加仓库"
      width="50%"
    >
      <el-form :model="newRepo" :rules="repoRules" ref="repoFormRef" label-width="100px">
        <el-form-item label="仓库类型" prop="type">
          <el-radio-group v-model="newRepo.type">
            <el-radio label="source">源仓库</el-radio>
            <el-radio label="mirror">镜像仓库</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <el-form-item label="Git平台" prop="platform">
          <el-select v-model="newRepo.platform" placeholder="选择Git平台" style="width: 100%">
            <el-option
              v-for="platform in platforms"
              :key="platform.id"
              :label="platform.name"
              :value="platform.id"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="仓库路径" prop="repo">
          <el-input v-model="newRepo.repo" placeholder="格式：用户名/仓库名">
            <template #prepend>{{ getPlatformUrl(newRepo.platform) }}</template>
          </el-input>
        </el-form-item>
        
        <el-form-item label="仓库分支" prop="branches" v-if="newRepo.type === 'source'">
          <el-select
            v-model="newRepo.branches"
            multiple
            allow-create
            filterable
            default-first-option
            placeholder="添加需要同步的分支（默认：main,master）"
            style="width: 100%"
          >
            <el-option value="main" label="main" />
            <el-option value="master" label="master" />
            <el-option value="develop" label="develop" />
          </el-select>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="addRepoDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="addRepository" :loading="savingRepo">
            添加
          </el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 删除确认对话框 -->
    <el-dialog
      v-model="deleteDialogVisible"
      title="删除确认"
      width="30%"
    >
      <p>确定要删除以下仓库吗？</p>
      <p v-if="repoToDelete">{{ repoToDelete.platform }}/{{ repoToDelete.repo }}</p>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="deleteDialogVisible = false">取消</el-button>
          <el-button type="danger" @click="deleteRepository" :loading="deletingRepo">
            确认删除
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRepositoryStore } from '../stores/repository';
import { useConfigStore } from '../stores/config';
import { usePlatformStore } from '../stores/platform';
import { ElMessage } from 'element-plus';
import { Plus, Delete, Refresh } from '@element-plus/icons-vue';

// 获取存储
const repositoryStore = useRepositoryStore();
const configStore = useConfigStore();
const platformStore = usePlatformStore();

// 状态
const loading = ref(false);
const savingRepo = ref(false);
const deletingRepo = ref(false);
const activeTab = ref('source');
const addRepoDialogVisible = ref(false);
const deleteDialogVisible = ref(false);
const repoToDelete = ref(null);
const repoFormRef = ref(null);

// 新仓库表单
const newRepo = reactive({
  type: 'source',
  platform: '',
  repo: '',
  branches: ['main', 'master']
});

// 表单校验规则
const repoRules = {
  type: [{ required: true, message: '请选择仓库类型', trigger: 'change' }],
  platform: [{ required: true, message: '请选择Git平台', trigger: 'change' }],
  repo: [{ required: true, message: '请输入仓库路径', trigger: 'blur' }],
  branches: [{ type: 'array', required: false }]
};

// 获取所有平台
const platforms = computed(() => platformStore.platforms);

// 获取平台URL
const getPlatformUrl = (platformId) => {
  const platform = platformStore.platforms.find(p => p.id === platformId);
  return platform ? platform.url : '';
};

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

// 显示添加仓库对话框
const showAddRepoDialog = () => {
  Object.assign(newRepo, {
    type: 'source',
    platform: '',
    repo: '',
    branches: ['main', 'master']
  });
  addRepoDialogVisible.value = true;
};

// 同步仓库
const syncRepository = async (repoId) => {
  try {
    await repositoryStore.syncRepository(repoId);
    ElMessage.success('同步任务已启动');
  } catch (error) {
    ElMessage.error('启动同步任务失败');
  }
};

// 确认删除仓库
const confirmDeleteRepo = (repo) => {
  repoToDelete.value = repo;
  deleteDialogVisible.value = true;
};

// 删除仓库
const deleteRepository = async () => {
  if (!repoToDelete.value) return;
  
  deletingRepo.value = true;
  
  try {
    // 获取当前配置
    const config = { ...configStore.config };
    
    // 根据类型从配置中移除仓库
    if (repoToDelete.value.type === 'source' && config.sources) {
      config.sources = config.sources.filter(
        source => !(source.platform === repoToDelete.value.platform && source.repo === repoToDelete.value.repo)
      );
    } else if (repoToDelete.value.type === 'mirror' && config.mirrors) {
      config.mirrors = config.mirrors.filter(
        mirror => !(mirror.platform === repoToDelete.value.platform && mirror.repo === repoToDelete.value.repo)
      );
    }
    
    // 更新配置
    const success = await configStore.updateConfig(config);
    
    if (success) {
      ElMessage.success('仓库已删除');
      // 重新获取仓库列表
      await repositoryStore.fetchRepositories();
    } else {
      ElMessage.error('删除仓库失败');
    }
  } catch (error) {
    console.error('Failed to delete repository:', error);
    ElMessage.error('删除仓库失败');
  } finally {
    deletingRepo.value = false;
    deleteDialogVisible.value = false;
  }
};

// 添加仓库
const addRepository = async () => {
  await repoFormRef.value.validate(async (valid) => {
    if (!valid) return;
    
    savingRepo.value = true;
    
    try {
      // 获取当前配置
      const config = { ...configStore.config };
      
      // 准备新仓库对象
      const repo = {
        platform: newRepo.platform,
        repo: newRepo.repo
      };
      
      // 根据类型添加到配置
      if (newRepo.type === 'source') {
        if (!config.sources) config.sources = [];
        
        // 添加分支（如果有）
        if (newRepo.branches && newRepo.branches.length > 0) {
          repo.branches = newRepo.branches;
        }
        
        config.sources.push(repo);
      } else {
        if (!config.mirrors) config.mirrors = [];
        config.mirrors.push(repo);
      }
      
      // 更新配置
      const success = await configStore.updateConfig(config);
      
      if (success) {
        ElMessage.success('仓库添加成功');
        addRepoDialogVisible.value = false;
        
        // 重新获取仓库列表
        await repositoryStore.fetchRepositories();
      } else {
        ElMessage.error('添加仓库失败');
      }
    } catch (error) {
      console.error('Failed to add repository:', error);
      ElMessage.error('添加仓库失败');
    } finally {
      savingRepo.value = false;
    }
  });
};

// 组件挂载后获取数据
onMounted(async () => {
  loading.value = true;
  
  try {
    // 获取平台列表
    await platformStore.fetchPlatforms();
    
    // 获取配置
    await configStore.fetchConfig();
    
    // 获取仓库列表
    await repositoryStore.fetchRepositories();
  } catch (error) {
    console.error('Failed to fetch data:', error);
    ElMessage.error('获取数据失败');
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.repositories {
  min-height: 100%;
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

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

:deep(.el-tabs__item) {
  font-size: 16px;
  padding: 0 25px;
}
</style> 