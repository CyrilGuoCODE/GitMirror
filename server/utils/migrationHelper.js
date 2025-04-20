/**
 * 数据迁移辅助工具
 * 用于将旧版本中保存在config.json的仓库信息迁移到repositories.json
 */
const fs = require('fs').promises;
const path = require('path');
const { logger } = require('./logger');
const { repositoryStore, configStore } = require('./dataStore');

/**
 * 迁移配置文件中的仓库数据到仓库数据文件
 */
async function migrateRepositoriesFromConfig() {
  try {
    logger.info('检查是否需要迁移仓库数据...');
    
    // 获取配置数据
    const config = await configStore.get();
    
    // 检查配置中是否有仓库信息
    if (!config.sources && !config.mirrors) {
      logger.info('无需迁移：配置中没有仓库信息');
      return;
    }
    
    // 获取现有仓库
    const existingRepos = await repositoryStore.getAll();
    
    // 如果仓库不为空，且配置中有仓库信息，可能是两个系统共存
    // 为避免冲突，我们记录但不自动迁移
    if (existingRepos.length > 0) {
      logger.warn('仓库数据已存在，但配置中也有仓库信息。为避免冲突，请手动迁移或选择一个数据源。');
      return;
    }
    
    logger.info('开始迁移仓库数据...');
    let migratedCount = 0;
    
    // 迁移源仓库
    if (config.sources && Array.isArray(config.sources)) {
      for (const source of config.sources) {
        if (source.platform && source.repo) {
          // 生成ID
          const id = `source-${source.platform}-${source.repo.replace('/', '-')}`;
          
          // 添加到仓库数据
          await repositoryStore.add({
            id,
            type: 'source',
            platform: source.platform,
            repo: source.repo,
            branches: source.branches || ['main', 'master'],
            status: 'idle',
            createdAt: new Date().toISOString()
          });
          
          migratedCount++;
        }
      }
    }
    
    // 迁移镜像仓库
    if (config.mirrors && Array.isArray(config.mirrors)) {
      for (const mirror of config.mirrors) {
        if (mirror.platform && mirror.repo) {
          // 生成ID
          const id = `mirror-${mirror.platform}-${mirror.repo.replace('/', '-')}`;
          
          // 添加到仓库数据
          await repositoryStore.add({
            id,
            type: 'mirror',
            platform: mirror.platform,
            repo: mirror.repo,
            status: 'idle',
            createdAt: new Date().toISOString()
          });
          
          migratedCount++;
        }
      }
    }
    
    // 从配置中删除仓库信息
    const newConfig = { ...config };
    delete newConfig.sources;
    delete newConfig.mirrors;
    await configStore.update(newConfig);
    
    logger.info(`仓库数据迁移完成，共迁移 ${migratedCount} 个仓库`);
  } catch (error) {
    logger.error(`仓库数据迁移失败: ${error.message}`);
  }
}

module.exports = {
  migrateRepositoriesFromConfig
}; 