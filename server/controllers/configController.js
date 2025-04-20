const fs = require('fs').promises;
const path = require('path');
const yaml = require('yaml');
const { logger } = require('../utils/logger');

// 配置文件路径
const CONFIG_FILE_PATH = process.env.CONFIG_FILE_PATH || path.join(__dirname, '../../.gitmirror.yml');

/**
 * 获取同步配置
 */
async function getSyncConfig(req, res) {
  try {
    // 检查配置文件是否存在
    try {
      await fs.access(CONFIG_FILE_PATH);
    } catch (error) {
      // 如果不存在，返回空配置
      return res.json({
        sources: [],
        mirrors: [],
        auto_sync: true,
        sync_interval: 3600
      });
    }

    // 读取配置文件
    const configData = await fs.readFile(CONFIG_FILE_PATH, 'utf8');
    const config = yaml.parse(configData);
    
    res.json(config);
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
    
    // 将配置转换为YAML并保存
    const yamlStr = yaml.stringify(newConfig);
    await fs.writeFile(CONFIG_FILE_PATH, yamlStr, 'utf8');
    
    logger.info(`配置已更新: ${CONFIG_FILE_PATH}`);
    res.json({ success: true, message: '配置已更新' });
  } catch (error) {
    logger.error(`更新配置失败: ${error.message}`);
    res.status(500).json({ error: '更新配置失败', details: error.message });
  }
}

module.exports = {
  getSyncConfig,
  updateSyncConfig
}; 