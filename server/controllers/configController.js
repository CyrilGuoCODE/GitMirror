const fs = require('fs').promises;
const path = require('path');
const { logger } = require('../utils/logger');
const { configStore, platformStore, repositoryStore, ensureDataFilesExist } = require('../utils/dataStore');

/**
 * 获取同步配置
 */
async function getSyncConfig(req, res) {
  try {
    const config = await configStore.get();
    
    // 确保返回的配置不包含仓库信息
    // 如果配置中存在旧的sources或mirrors字段，将其过滤掉
    const sanitizedConfig = {
      auto_sync: config.auto_sync,
      sync_interval: config.sync_interval,
      conflict_strategy: config.conflict_strategy,
      log_level: config.log_level,
      log_retention_days: config.log_retention_days
    };
    
    res.json(sanitizedConfig);
  } catch (error) {
    logger.error(`获取配置失败: ${error.message}`);
    res.status(500).json({ error: '获取配置失败', details: error.message });
  }
}

/**
 * 更新同步配置
 */
async function updateSyncConfig(req, res) {
  try {
    const newConfig = req.body;
    
    // 验证必要字段
    if (typeof newConfig !== 'object') {
      return res.status(400).json({ error: '无效的配置格式' });
    }
    
    // 创建一个新的配置对象，只包含允许的配置字段
    const sanitizedConfig = {
      auto_sync: newConfig.auto_sync,
      sync_interval: newConfig.sync_interval,
      conflict_strategy: newConfig.conflict_strategy,
      log_level: newConfig.log_level,
      log_retention_days: newConfig.log_retention_days
    };
    
    // 验证特定字段类型
    if (sanitizedConfig.auto_sync !== undefined && typeof sanitizedConfig.auto_sync !== 'boolean') {
      return res.status(400).json({ error: 'auto_sync 必须是布尔值' });
    }
    
    if (sanitizedConfig.sync_interval !== undefined && (typeof sanitizedConfig.sync_interval !== 'number' || sanitizedConfig.sync_interval < 60)) {
      return res.status(400).json({ error: 'sync_interval 必须是大于60的数字（秒）' });
    }
    
    if (sanitizedConfig.conflict_strategy !== undefined && 
        !['prefer_source', 'prefer_destination', 'manual'].includes(sanitizedConfig.conflict_strategy)) {
      return res.status(400).json({ error: 'conflict_strategy 必须是以下之一: prefer_source, prefer_destination, manual' });
    }
    
    if (sanitizedConfig.log_level !== undefined && 
        !['error', 'warn', 'info', 'debug'].includes(sanitizedConfig.log_level)) {
      return res.status(400).json({ error: 'log_level 必须是以下之一: error, warn, info, debug' });
    }
    
    if (sanitizedConfig.log_retention_days !== undefined && 
        (typeof sanitizedConfig.log_retention_days !== 'number' || sanitizedConfig.log_retention_days < 1)) {
      return res.status(400).json({ error: 'log_retention_days 必须是大于0的整数' });
    }
    
    // 更新配置
    const updatedConfig = await configStore.update(sanitizedConfig);
    
    logger.info('配置已更新');
    res.json({
      success: true,
      ...updatedConfig
    });
  } catch (error) {
    logger.error(`更新配置失败: ${error.message}`);
    res.status(500).json({ error: '更新配置失败', details: error.message });
  }
}

/**
 * 重置配置为默认值
 */
async function resetConfig(req, res) {
  try {
    const defaultConfig = {
      auto_sync: true,
      sync_interval: 3600,
      conflict_strategy: 'prefer_source',
      log_level: 'info',
      log_retention_days: 30
    };
    
    const newConfig = await configStore.update(defaultConfig);
    
    logger.info('配置已重置为默认值');
    res.json({ 
      success: true, 
      message: '配置已重置为默认值', 
      config: {
        auto_sync: newConfig.auto_sync,
        sync_interval: newConfig.sync_interval,
        conflict_strategy: newConfig.conflict_strategy,
        log_level: newConfig.log_level,
        log_retention_days: newConfig.log_retention_days
      }
    });
  } catch (error) {
    logger.error(`重置配置失败: ${error.message}`);
    res.status(500).json({ error: '重置配置失败', details: error.message });
  }
}

/**
 * 重置整个系统（清空所有数据并重新初始化）
 */
async function resetSystem(req, res) {
  try {
    // 定义数据文件路径
    const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data');
    const PLATFORMS_FILE = path.join(DATA_DIR, 'platforms.json');
    const REPOSITORIES_FILE = path.join(DATA_DIR, 'repositories.json');
    const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
    
    // 确保目录存在
    try {
      await fs.access(DATA_DIR);
    } catch (error) {
      await fs.mkdir(DATA_DIR, { recursive: true });
    }
    
    // 重置平台数据
    await fs.writeFile(PLATFORMS_FILE, JSON.stringify([], null, 2), 'utf8');
    logger.info('平台数据已重置');
    
    // 重置仓库数据
    await fs.writeFile(REPOSITORIES_FILE, JSON.stringify([], null, 2), 'utf8');
    logger.info('仓库数据已重置');
    
    // 重置配置数据
    const defaultConfig = {
      auto_sync: true,
      sync_interval: 3600,
      conflict_strategy: 'prefer_source',
      log_level: 'info',
      log_retention_days: 30
    };
    await fs.writeFile(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2), 'utf8');
    logger.info('配置数据已重置');
    
    // 重新初始化内置平台
    await require('../controllers/platformController').initBasePlatforms();
    
    // 重新初始化数据文件
    await ensureDataFilesExist();
    
    res.json({
      success: true,
      message: '系统已重置，所有数据已清空并重新初始化'
    });
  } catch (error) {
    logger.error(`重置系统失败: ${error.message}`);
    res.status(500).json({ error: '重置系统失败', details: error.message });
  }
}

/**
 * 系统诊断
 */
async function systemDiagnostic(req, res) {
  try {
    // 定义数据文件路径
    const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data');
    const PLATFORMS_FILE = path.join(DATA_DIR, 'platforms.json');
    const REPOSITORIES_FILE = path.join(DATA_DIR, 'repositories.json');
    const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
    const REPOS_DIR = process.env.WORK_DIR || path.join(__dirname, '../../repos');
    
    // 确保数据文件存在
    await ensureDataFilesExist();
    
    // 检查数据目录
    let dataDir = { exists: false, writable: false };
    try {
      await fs.access(DATA_DIR);
      dataDir.exists = true;
      try {
        // 尝试写入测试文件
        const testFile = path.join(DATA_DIR, 'test.tmp');
        await fs.writeFile(testFile, 'test');
        await fs.unlink(testFile);
        dataDir.writable = true;
      } catch (e) {}
    } catch (e) {}
    
    // 检查仓库目录
    let reposDir = { exists: false, writable: false };
    try {
      await fs.access(REPOS_DIR);
      reposDir.exists = true;
      try {
        // 尝试写入测试文件
        const testFile = path.join(REPOS_DIR, 'test.tmp');
        await fs.writeFile(testFile, 'test');
        await fs.unlink(testFile);
        reposDir.writable = true;
      } catch (e) {}
    } catch (e) {}
    
    // 检查平台数据文件
    let platformsFile = { exists: false, valid: false, count: 0 };
    try {
      await fs.access(PLATFORMS_FILE);
      platformsFile.exists = true;
      try {
        const content = await fs.readFile(PLATFORMS_FILE, 'utf8');
        const data = JSON.parse(content);
        platformsFile.valid = Array.isArray(data);
        platformsFile.count = data.length;
      } catch (e) {}
    } catch (e) {}
    
    // 检查仓库数据文件
    let repositoriesFile = { exists: false, valid: false, count: 0 };
    try {
      await fs.access(REPOSITORIES_FILE);
      repositoriesFile.exists = true;
      try {
        const content = await fs.readFile(REPOSITORIES_FILE, 'utf8');
        const data = JSON.parse(content);
        repositoriesFile.valid = Array.isArray(data);
        repositoriesFile.count = data.length;
      } catch (e) {}
    } catch (e) {}
    
    // 检查配置数据文件
    let configFile = { exists: false, valid: false };
    try {
      await fs.access(CONFIG_FILE);
      configFile.exists = true;
      try {
        const content = await fs.readFile(CONFIG_FILE, 'utf8');
        const data = JSON.parse(content);
        configFile.valid = typeof data === 'object' && !Array.isArray(data);
        configFile.data = data;
      } catch (e) {}
    } catch (e) {}
    
    // 返回诊断结果
    res.json({
      timestamp: new Date().toISOString(),
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        env: process.env.NODE_ENV || 'development'
      },
      directories: {
        dataDir,
        reposDir
      },
      files: {
        platformsFile,
        repositoriesFile,
        configFile
      }
    });
  } catch (error) {
    logger.error(`系统诊断失败: ${error.message}`);
    res.status(500).json({ error: '系统诊断失败', details: error.message });
  }
}

module.exports = {
  getSyncConfig,
  updateSyncConfig,
  resetConfig,
  resetSystem,
  systemDiagnostic
}; 