<template>
  <div class="platforms">
    <h1 class="page-title">平台设置</h1>
    
    <!-- 主要内容区 -->
    <el-card v-loading="loading">
      <template #header>
        <div class="card-header">
          <h2>Git平台列表</h2>
          <el-button type="primary" @click="showAddPlatformDialog">
            <el-icon><Plus /></el-icon> 添加平台
          </el-button>
        </div>
      </template>
      
      <div v-if="platformStore.platforms.length > 0">
        <el-table :data="platformStore.platforms" style="width: 100%" border>
          <el-table-column prop="name" label="平台名称" width="150" />
          <el-table-column prop="url" label="平台URL" min-width="200" />
          <el-table-column prop="token" label="访问令牌" width="220">
            <template #default="scope">
              <span>{{ hideToken(scope.row.token) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="120">
            <template #default="scope">
              <el-tag :type="scope.row.status === 'active' ? 'success' : 'info'">
                {{ scope.row.status === 'active' ? '已连接' : '未连接' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200">
            <template #default="scope">
              <el-button 
                size="small" 
                type="primary" 
                @click="editPlatform(scope.row)"
              >
                <el-icon><Edit /></el-icon> 编辑
              </el-button>
              <el-button 
                size="small" 
                type="danger" 
                @click="confirmDeletePlatform(scope.row)"
              >
                <el-icon><Delete /></el-icon> 删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      
      <el-empty v-else description="暂无Git平台配置" />
    </el-card>
    
    <!-- 添加/编辑平台对话框 -->
    <el-dialog
      v-model="platformDialogVisible"
      :title="isEdit ? '编辑平台' : '添加平台'"
      width="50%"
    >
      <el-form :model="platformForm" :rules="platformRules" ref="platformFormRef" label-width="100px">
        <el-form-item label="平台名称" prop="name">
          <el-input v-model="platformForm.name" placeholder="例如：GitHub, GitLab, Gitee" />
        </el-form-item>
        
        <el-form-item label="平台URL" prop="url">
          <el-input v-model="platformForm.url" placeholder="例如：https://github.com, https://gitlab.com" />
        </el-form-item>
        
        <el-form-item label="访问令牌" prop="token">
          <el-input 
            v-model="platformForm.token" 
            placeholder="在平台上创建的个人访问令牌"
            type="password"
            show-password
          />
          <div class="form-tip">
            <el-icon><InfoFilled /></el-icon>
            <span>访问令牌用于授权应用访问Git平台上的仓库</span>
          </div>
        </el-form-item>
        
        <el-form-item v-if="isEdit" label="状态" prop="status">
          <el-select v-model="platformForm.status" placeholder="请选择状态">
            <el-option label="已连接" value="active" />
            <el-option label="未连接" value="inactive" />
          </el-select>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="platformDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="savePlatform" :loading="savingPlatform">
            {{ isEdit ? '保存' : '添加' }}
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
      <p>确定要删除以下Git平台吗？</p>
      <p v-if="platformToDelete">
        <strong>{{ platformToDelete.name }}</strong> ({{ platformToDelete.url }})
      </p>
      <p class="warning-text">
        <el-icon><Warning /></el-icon>
        <span>删除平台将移除所有依赖于此平台的仓库配置！</span>
      </p>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="deleteDialogVisible = false">取消</el-button>
          <el-button type="danger" @click="deletePlatform" :loading="deletingPlatform">
            确认删除
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { usePlatformStore } from '../stores/platform';
import { ElMessage } from 'element-plus';
import { Plus, Edit, Delete, InfoFilled, Warning } from '@element-plus/icons-vue';

// 获取平台存储
const platformStore = usePlatformStore();

// 状态变量
const loading = ref(false);
const savingPlatform = ref(false);
const deletingPlatform = ref(false);
const platformDialogVisible = ref(false);
const deleteDialogVisible = ref(false);
const isEdit = ref(false);
const platformToDelete = ref(null);
const platformFormRef = ref(null);

// 平台表单
const platformForm = reactive({
  id: '',
  name: '',
  url: '',
  token: '',
  status: 'inactive'
});

// 表单验证规则
const platformRules = {
  name: [
    { required: true, message: '请输入平台名称', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在2到20个字符之间', trigger: 'blur' }
  ],
  url: [
    { required: true, message: '请输入平台URL', trigger: 'blur' },
    { pattern: /^https?:\/\/.+/i, message: 'URL必须以http://或https://开头', trigger: 'blur' }
  ],
  token: [
    { required: true, message: '请输入访问令牌', trigger: 'blur' }
  ]
};

// 隐藏访问令牌
const hideToken = (token) => {
  if (!token) return '';
  if (token.length <= 8) return '********';
  return token.substring(0, 4) + '************************' + token.substring(token.length - 4);
};

// 显示添加平台对话框
const showAddPlatformDialog = () => {
  isEdit.value = false;
  Object.assign(platformForm, {
    id: '',
    name: '',
    url: '',
    token: '',
    status: 'inactive'
  });
  platformDialogVisible.value = true;
};

// 编辑平台
const editPlatform = (platform) => {
  isEdit.value = true;
  Object.assign(platformForm, {
    id: platform.id,
    name: platform.name,
    url: platform.url,
    token: platform.token,
    status: platform.status || 'inactive'
  });
  platformDialogVisible.value = true;
};

// 确认删除平台
const confirmDeletePlatform = (platform) => {
  platformToDelete.value = platform;
  deleteDialogVisible.value = true;
};

// 保存平台
const savePlatform = async () => {
  await platformFormRef.value.validate(async (valid) => {
    if (!valid) return;
    
    savingPlatform.value = true;
    
    try {
      let success;
      
      if (isEdit.value) {
        // 更新现有平台
        success = await platformStore.updatePlatform({
          id: platformForm.id,
          name: platformForm.name,
          url: platformForm.url,
          token: platformForm.token,
          status: platformForm.status
        });
        
        if (success) {
          ElMessage.success('平台更新成功');
          platformDialogVisible.value = false;
        } else {
          ElMessage.error('更新平台失败');
        }
      } else {
        // 添加新平台
        success = await platformStore.addPlatform({
          name: platformForm.name,
          url: platformForm.url,
          token: platformForm.token,
          status: 'inactive'
        });
        
        if (success) {
          ElMessage.success('平台添加成功');
          platformDialogVisible.value = false;
        } else {
          ElMessage.error('添加平台失败');
        }
      }
    } catch (error) {
      console.error('Failed to save platform:', error);
      ElMessage.error('操作失败，请检查网络连接');
    } finally {
      savingPlatform.value = false;
    }
  });
};

// 删除平台
const deletePlatform = async () => {
  if (!platformToDelete.value) return;
  
  deletingPlatform.value = true;
  
  try {
    const success = await platformStore.deletePlatform(platformToDelete.value.id);
    
    if (success) {
      ElMessage.success('平台已删除');
      deleteDialogVisible.value = false;
    } else {
      ElMessage.error('删除平台失败');
    }
  } catch (error) {
    console.error('Failed to delete platform:', error);
    ElMessage.error('删除失败，请检查网络连接');
  } finally {
    deletingPlatform.value = false;
  }
};

// 组件挂载后获取数据
onMounted(async () => {
  loading.value = true;
  
  try {
    await platformStore.fetchPlatforms();
  } catch (error) {
    console.error('Failed to fetch platforms:', error);
    ElMessage.error('获取平台列表失败');
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.platforms {
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

.form-tip {
  margin-top: 5px;
  color: #909399;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.warning-text {
  color: #f56c6c;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 5px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style> 