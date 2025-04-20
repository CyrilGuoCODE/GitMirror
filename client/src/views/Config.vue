<template>
  <div class="config">
    <h1 class="page-title">高级配置</h1>
    
    <!-- 主要内容区 -->
    <el-card v-loading="loading">
      <template #header>
        <div class="card-header">
          <h2>同步配置</h2>
          <el-button 
            type="primary" 
            @click="saveConfig"
            :loading="saving"
            :disabled="!hasChanges"
          >
            <el-icon><Check /></el-icon> 保存设置
          </el-button>
        </div>
      </template>
      
      <el-form :model="configForm" label-width="180px" ref="configFormRef">
        <el-form-item label="自动同步">
          <el-switch v-model="configForm.auto_sync" />
          <div class="form-tip">
            <el-icon><InfoFilled /></el-icon>
            <span>启用后，系统将按照指定的时间间隔自动同步仓库</span>
          </div>
        </el-form-item>
        
        <el-form-item 
          label="同步间隔（秒）" 
          :rules="[{ type: 'number', min: 300, message: '同步间隔不能小于300秒' }]"
          :class="{ 'is-disabled': !configForm.auto_sync }"
        >
          <el-input-number 
            v-model="configForm.sync_interval" 
            :min="300" 
            :step="300" 
            :disabled="!configForm.auto_sync"
          />
          <div class="form-tip">
            <el-icon><InfoFilled /></el-icon>
            <span>建议设置在300秒（5分钟）以上，以避免过于频繁的API调用</span>
          </div>
        </el-form-item>
        
        <el-divider content-position="left">冲突处理</el-divider>
        
        <el-form-item label="冲突解决策略">
          <el-radio-group v-model="configForm.conflict_strategy">
            <el-radio label="prefer_source">优先使用源仓库</el-radio>
            <el-radio label="prefer_destination">优先使用目标仓库</el-radio>
            <el-radio label="manual">手动解决</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <el-divider content-position="left">安全设置</el-divider>
        
        <el-form-item label="日志级别">
          <el-select v-model="configForm.log_level">
            <el-option label="调试" value="debug" />
            <el-option label="信息" value="info" />
            <el-option label="警告" value="warning" />
            <el-option label="错误" value="error" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="保留日志天数">
          <el-input-number v-model="configForm.log_retention_days" :min="1" :max="90" />
        </el-form-item>
        
        <el-divider content-position="left">高级选项</el-divider>
        
        <el-form-item label="仓库清理">
          <el-button type="danger" @click="showCleanupDialog">
            <el-icon><Delete /></el-icon> 清理临时文件
          </el-button>
          <div class="form-tip">
            <el-icon><WarningFilled /></el-icon>
            <span>清理过程中产生的临时仓库和缓存文件</span>
          </div>
        </el-form-item>
        
        <el-form-item label="重置应用">
          <el-button type="danger" @click="showResetDialog">
            <el-icon><RefreshRight /></el-icon> 重置所有设置
          </el-button>
          <div class="form-tip warning-tip">
            <el-icon><WarningFilled /></el-icon>
            <span>将删除所有配置数据，包括平台和仓库设置！此操作不可恢复。</span>
          </div>
        </el-form-item>
      </el-form>
    </el-card>
    
    <!-- 清理确认对话框 -->
    <el-dialog
      v-model="cleanupDialogVisible"
      title="清理确认"
      width="30%"
    >
      <p>确定要清理所有临时文件和缓存吗？</p>
      <p>此操作不会影响您的配置和同步设置。</p>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="cleanupDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="cleanupTemporaryFiles" :loading="cleaning">
            确认清理
          </el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 重置确认对话框 -->
    <el-dialog
      v-model="resetDialogVisible"
      title="重置确认"
      width="30%"
    >
      <p>确定要重置所有设置吗？</p>
      <p class="warning-text">
        <el-icon><WarningFilled /></el-icon>
        <span>此操作将删除所有平台、仓库配置和同步设置，且无法恢复！</span>
      </p>
      
      <el-form :model="resetForm">
        <el-form-item>
          <el-input 
            v-model="resetForm.confirmText" 
            placeholder="请输入 'RESET' 确认操作"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="resetDialogVisible = false">取消</el-button>
          <el-button 
            type="danger" 
            @click="resetAllSettings" 
            :loading="resetting"
            :disabled="resetForm.confirmText !== 'RESET'"
          >
            确认重置
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useConfigStore } from '../stores/config';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Check, InfoFilled, WarningFilled, Delete, RefreshRight } from '@element-plus/icons-vue';
import axios from 'axios';

// 简单深度比较函数，替代deep-equal
const deepEqual = (obj1, obj2) => {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
};

// 获取配置存储
const configStore = useConfigStore();

// 状态变量
const loading = ref(false);
const saving = ref(false);
const cleaning = ref(false);
const resetting = ref(false);
const cleanupDialogVisible = ref(false);
const resetDialogVisible = ref(false);
const configFormRef = ref(null);
const originalConfig = ref({});

// 重置表单
const resetForm = reactive({
  confirmText: ''
});

// 配置表单
const configForm = reactive({
  auto_sync: true,
  sync_interval: 3600,
  conflict_strategy: 'prefer_source',
  log_level: 'info',
  log_retention_days: 30
});

// 检查是否有更改
const hasChanges = computed(() => {
  return !deepEqual(originalConfig.value, configForm);
});

// 监听配置变化
watch(() => configStore.config, (newConfig) => {
  if (newConfig) {
    // 更新表单和原始配置
    Object.assign(configForm, {
      auto_sync: newConfig.auto_sync ?? true,
      sync_interval: newConfig.sync_interval ?? 3600,
      conflict_strategy: newConfig.conflict_strategy ?? 'prefer_source',
      log_level: newConfig.log_level ?? 'info',
      log_retention_days: newConfig.log_retention_days ?? 30
    });
    
    originalConfig.value = { ...configForm };
  }
}, { immediate: true });

// 显示清理对话框
const showCleanupDialog = () => {
  cleanupDialogVisible.value = true;
};

// 显示重置对话框
const showResetDialog = () => {
  resetDialogVisible.value = true;
  resetForm.confirmText = '';
};

// 保存配置
const saveConfig = async () => {
  if (configFormRef.value) {
    await configFormRef.value.validate(async (valid) => {
      if (!valid) return;
      
      saving.value = true;
      
      try {
        // 获取当前配置
        const currentConfig = { ...configStore.config };
        
        // 合并表单值
        const updatedConfig = {
          ...currentConfig,
          auto_sync: configForm.auto_sync,
          sync_interval: configForm.sync_interval,
          conflict_strategy: configForm.conflict_strategy,
          log_level: configForm.log_level,
          log_retention_days: configForm.log_retention_days
        };
        
        // 更新配置
        const success = await configStore.updateConfig(updatedConfig);
        
        if (success) {
          ElMessage.success('配置已保存');
          originalConfig.value = { ...configForm };
        } else {
          ElMessage.error('保存配置失败');
        }
      } catch (error) {
        console.error('Failed to save config:', error);
        ElMessage.error('保存配置失败');
      } finally {
        saving.value = false;
      }
    });
  }
};

// 清理临时文件
const cleanupTemporaryFiles = async () => {
  cleaning.value = true;
  
  try {
    // 调用API清理临时文件
    const response = await axios.post('/api/maintenance/cleanup');
    
    if (response.data.success) {
      ElMessage.success(`清理完成！释放了 ${response.data.freedSpace || 0} MB 空间`);
      cleanupDialogVisible.value = false;
    } else {
      ElMessage.error('清理操作失败');
    }
  } catch (error) {
    console.error('Failed to cleanup:', error);
    ElMessage.error('清理操作失败');
  } finally {
    cleaning.value = false;
  }
};

// 重置所有设置
const resetAllSettings = async () => {
  if (resetForm.confirmText !== 'RESET') return;
  
  resetting.value = true;
  
  try {
    // 二次确认
    await ElMessageBox.confirm(
      '此操作将永久删除所有配置数据，是否继续？',
      '警告',
      {
        confirmButtonText: '确认重置',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    // 调用API重置所有设置
    const response = await axios.post('/api/maintenance/reset');
    
    if (response.data.success) {
      ElMessage.success('所有设置已重置');
      resetDialogVisible.value = false;
      
      // 重新加载配置
      await configStore.fetchConfig();
    } else {
      ElMessage.error('重置操作失败');
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to reset settings:', error);
      ElMessage.error('重置操作失败');
    }
  } finally {
    resetting.value = false;
  }
};

// 组件挂载后获取数据
onMounted(async () => {
  loading.value = true;
  
  try {
    // 获取配置
    await configStore.fetchConfig();
  } catch (error) {
    console.error('Failed to fetch config:', error);
    ElMessage.error('获取配置失败');
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.config {
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

.warning-tip {
  color: #e6a23c;
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

.is-disabled {
  opacity: 0.6;
}

:deep(.el-divider__text) {
  font-size: 16px;
  font-weight: 600;
  color: #606266;
}
</style> 