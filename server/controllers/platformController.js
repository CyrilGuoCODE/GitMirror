const { logger } = require('../utils/logger');
const { platformStore } = require('../utils/dataStore');

// 支持的Git平台列表（预定义平台）
const SUPPORTED_PLATFORMS = [
  {
    id: 'github',
    name: 'GitHub',
    url: 'https://github.com',
    apiUrl: 'https://api.github.com',
    description: 'GitHub是全球最大的代码托管平台',
    tokenUrl: 'https://github.com/settings/tokens',
    icon: 'github'
  },
  {
    id: 'gitee',
    name: 'Gitee',
    url: 'https://gitee.com',
    apiUrl: 'https://gitee.com/api/v5',
    description: '国内领先的代码托管平台',
    tokenUrl: 'https://gitee.com/profile/personal_access_tokens',
    icon: 'gitee'
  },
  {
    id: 'gitlab',
    name: 'GitLab',
    url: 'https://gitlab.com',
    apiUrl: 'https://gitlab.com/api/v4',
    description: '开源的DevOps平台',
    tokenUrl: 'https://gitlab.com/-/profile/personal_access_tokens',
    icon: 'gitlab'
  },
  {
    id: 'gitcode',
    name: 'GitCode',
    url: 'https://gitcode.net',
    apiUrl: 'https://gitcode.net/api/v4',
    description: 'CSDN旗下的代码托管平台',
    tokenUrl: 'https://gitcode.net/-/profile/personal_access_tokens',
    icon: 'gitcode'
  }
];

/**
 * 初始化基础平台
 */
async function initBasePlatforms() {
  try {
    const existingPlatforms = await platformStore.getAll();
    
    if (existingPlatforms.length === 0) {
      logger.info('初始化基础平台数据');
      
      // 遍历预定义平台并添加
      for (const platform of SUPPORTED_PLATFORMS) {
        await platformStore.add({
          ...platform,
          token: '',
          status: 'inactive',
          isBuiltIn: true
        });
      }
    }
    
    return true;
  } catch (error) {
    logger.error(`初始化基础平台失败: ${error.message}`);
    throw error;
  }
}

// 初始化
initBasePlatforms().catch(error => {
  logger.error(`初始化平台数据失败: ${error.message}`);
});

/**
 * 获取所有Git平台
 */
async function getGitPlatforms(req, res) {
  try {
    const platforms = await platformStore.getAll();
    res.json(platforms);
  } catch (error) {
    logger.error(`获取Git平台列表失败: ${error.message}`);
    res.status(500).json({ error: '获取Git平台列表失败', details: error.message });
  }
}

/**
 * 获取单个Git平台
 */
async function getGitPlatform(req, res) {
  try {
    const { id } = req.params;
    const platform = await platformStore.getById(id);
    
    if (!platform) {
      return res.status(404).json({ error: `找不到平台: ${id}` });
    }
    
    res.json(platform);
  } catch (error) {
    logger.error(`获取Git平台失败: ${error.message}`);
    res.status(500).json({ error: '获取Git平台失败', details: error.message });
  }
}

/**
 * 添加Git平台
 */
async function addGitPlatform(req, res) {
  try {
    const { id, name, url, apiUrl, description, token, tokenUrl, icon } = req.body;
    
    // 验证必要字段
    if (!id || !name || !url) {
      return res.status(400).json({ error: '缺少必要参数: id, name, url 为必填项' });
    }
    
    // 添加平台
    const newPlatform = await platformStore.add({
      id, 
      name, 
      url, 
      apiUrl: apiUrl || url,
      description: description || `${name} Git平台`,
      token: token || '',
      tokenUrl: tokenUrl || `${url}/settings/tokens`,
      icon: icon || 'git',
      status: token ? 'active' : 'inactive',
      isBuiltIn: false,
      createdAt: new Date().toISOString()
    });
    
    logger.info(`添加Git平台: ${name}`);
    res.status(201).json(newPlatform);
  } catch (error) {
    logger.error(`添加Git平台失败: ${error.message}`);
    res.status(500).json({ error: '添加Git平台失败', details: error.message });
  }
}

/**
 * 更新Git平台
 */
async function updateGitPlatform(req, res) {
  try {
    const { id } = req.params;
    const platform = await platformStore.getById(id);
    
    if (!platform) {
      return res.status(404).json({ error: `找不到平台: ${id}` });
    }
    
    // 更新平台数据
    const { name, url, apiUrl, description, token, tokenUrl, icon } = req.body;
    const updateData = {
      ...(name && { name }),
      ...(url && { url }),
      ...(apiUrl && { apiUrl }),
      ...(description && { description }),
      ...(tokenUrl && { tokenUrl }),
      ...(icon && { icon })
    };
    
    // 特殊处理token，因为可能需要更新状态
    if (token !== undefined) {
      updateData.token = token;
      updateData.status = token ? 'active' : 'inactive';
    }
    
    // 添加更新时间
    updateData.updatedAt = new Date().toISOString();
    
    const updatedPlatform = await platformStore.update(id, updateData);
    
    logger.info(`更新Git平台: ${id}`);
    res.json(updatedPlatform);
  } catch (error) {
    logger.error(`更新Git平台失败: ${error.message}`);
    res.status(500).json({ error: '更新Git平台失败', details: error.message });
  }
}

/**
 * 删除Git平台
 */
async function deleteGitPlatform(req, res) {
  try {
    const { id } = req.params;
    const platform = await platformStore.getById(id);
    
    if (!platform) {
      return res.status(404).json({ error: `找不到平台: ${id}` });
    }
    
    // 不允许删除内置平台
    if (platform.isBuiltIn) {
      return res.status(403).json({ error: `不允许删除内置平台: ${id}` });
    }
    
    await platformStore.delete(id);
    
    logger.info(`删除Git平台: ${id}`);
    res.json({ success: true, message: `平台 ${id} 已删除` });
  } catch (error) {
    logger.error(`删除Git平台失败: ${error.message}`);
    res.status(500).json({ error: '删除Git平台失败', details: error.message });
  }
}

/**
 * 验证平台令牌
 */
async function validatePlatformToken(req, res) {
  try {
    const { id } = req.params;
    const platform = await platformStore.getById(id);
    
    if (!platform) {
      return res.status(404).json({ error: `找不到平台: ${id}` });
    }
    
    // 这里应该实现实际的令牌验证逻辑，例如调用对应平台的API
    // 为简单起见，我们假设令牌非空就是有效的
    const valid = !!platform.token;
    
    res.json({ 
      valid, 
      message: valid ? '令牌有效' : '令牌无效或未设置' 
    });
  } catch (error) {
    logger.error(`验证平台令牌失败: ${error.message}`);
    res.status(500).json({ error: '验证平台令牌失败', details: error.message });
  }
}

module.exports = {
  getGitPlatforms,
  getGitPlatform,
  addGitPlatform,
  updateGitPlatform,
  deleteGitPlatform,
  validatePlatformToken,
  initBasePlatforms
}; 