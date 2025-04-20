const { logger } = require('../utils/logger');

// 支持的Git平台列表
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

// 额外的自定义平台
const customPlatforms = [];

/**
 * 获取所有支持的Git平台
 */
function getGitPlatforms(req, res) {
  try {
    const allPlatforms = [...SUPPORTED_PLATFORMS, ...customPlatforms];
    res.json(allPlatforms);
  } catch (error) {
    logger.error(`获取Git平台列表失败: ${error.message}`);
    res.status(500).json({ error: '获取Git平台列表失败', details: error.message });
  }
}

/**
 * 添加自定义Git平台
 */
function addGitPlatform(req, res) {
  try {
    const { id, name, url, apiUrl, description, tokenUrl, icon } = req.body;
    
    // 验证必要字段
    if (!id || !name || !url) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    
    // 验证ID是否已存在
    const exists = [...SUPPORTED_PLATFORMS, ...customPlatforms].some(p => p.id === id);
    if (exists) {
      return res.status(400).json({ error: `平台ID '${id}' 已存在` });
    }
    
    // 添加自定义平台
    const newPlatform = { id, name, url, apiUrl, description, tokenUrl, icon };
    customPlatforms.push(newPlatform);
    
    logger.info(`添加自定义Git平台: ${name}`);
    res.status(201).json(newPlatform);
  } catch (error) {
    logger.error(`添加Git平台失败: ${error.message}`);
    res.status(500).json({ error: '添加Git平台失败', details: error.message });
  }
}

module.exports = {
  getGitPlatforms,
  addGitPlatform
}; 