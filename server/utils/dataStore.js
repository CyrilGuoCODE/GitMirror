const fs = require('fs').promises;
const path = require('path');
const { logger } = require('./logger');

// 数据文件路径
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data');
const PLATFORMS_FILE = path.join(DATA_DIR, 'platforms.json');
const REPOSITORIES_FILE = path.join(DATA_DIR, 'repositories.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

/**
 * 确保数据目录和文件存在
 */
async function ensureDataFilesExist() {
  try {
    // 确保数据目录存在
    try {
      await fs.access(DATA_DIR);
    } catch (error) {
      await fs.mkdir(DATA_DIR, { recursive: true });
      logger.info(`创建数据目录: ${DATA_DIR}`);
    }

    // 确保平台数据文件存在
    try {
      await fs.access(PLATFORMS_FILE);
    } catch (error) {
      await fs.writeFile(PLATFORMS_FILE, JSON.stringify([], null, 2), 'utf8');
      logger.info(`创建平台数据文件: ${PLATFORMS_FILE}`);
    }

    // 确保仓库数据文件存在
    try {
      await fs.access(REPOSITORIES_FILE);
    } catch (error) {
      await fs.writeFile(REPOSITORIES_FILE, JSON.stringify([], null, 2), 'utf8');
      logger.info(`创建仓库数据文件: ${REPOSITORIES_FILE}`);
    }

    // 确保配置数据文件存在
    try {
      await fs.access(CONFIG_FILE);
    } catch (error) {
      const defaultConfig = {
        auto_sync: true,
        sync_interval: 3600,
        conflict_strategy: 'prefer_source',
        log_level: 'info',
        log_retention_days: 30
      };
      await fs.writeFile(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2), 'utf8');
      logger.info(`创建配置数据文件: ${CONFIG_FILE}`);
    }
  } catch (error) {
    logger.error(`初始化数据文件失败: ${error.message}`);
    throw error;
  }
}

/**
 * 安全读取JSON文件
 * @param {string} filePath - 文件路径
 * @param {any} defaultValue - 文件不存在或内容无效时的默认值
 */
async function safeReadJsonFile(filePath, defaultValue) {
  try {
    await fs.access(filePath);
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // 文件不存在
      logger.warn(`文件不存在，将创建: ${filePath}`);
      await fs.writeFile(filePath, JSON.stringify(defaultValue, null, 2), 'utf8');
      return defaultValue;
    } else if (error instanceof SyntaxError) {
      // JSON解析错误
      logger.error(`JSON解析错误: ${filePath}, ${error.message}`);
      logger.warn(`将重置文件: ${filePath}`);
      await fs.writeFile(filePath, JSON.stringify(defaultValue, null, 2), 'utf8');
      return defaultValue;
    }
    throw error;
  }
}

/**
 * 安全写入JSON文件
 * @param {string} filePath - 文件路径
 * @param {any} data - 要写入的数据
 */
async function safeWriteJsonFile(filePath, data) {
  try {
    // 确保目录存在
    const dir = path.dirname(filePath);
    try {
      await fs.access(dir);
    } catch (error) {
      await fs.mkdir(dir, { recursive: true });
    }
    
    // 写入数据
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    logger.error(`写入文件失败: ${filePath}, ${error.message}`);
    throw error;
  }
}

/**
 * 平台相关数据操作
 */
const platformStore = {
  async getAll() {
    try {
      return await safeReadJsonFile(PLATFORMS_FILE, []);
    } catch (error) {
      logger.error(`读取平台数据失败: ${error.message}`);
      return [];
    }
  },

  async getById(id) {
    const platforms = await this.getAll();
    return platforms.find(p => p.id === id);
  },

  async add(platform) {
    try {
      const platforms = await this.getAll();
      // 确保ID唯一
      if (platforms.some(p => p.id === platform.id)) {
        throw new Error(`平台ID '${platform.id}' 已存在`);
      }
      platforms.push(platform);
      await safeWriteJsonFile(PLATFORMS_FILE, platforms);
      return platform;
    } catch (error) {
      logger.error(`添加平台失败: ${error.message}`);
      throw error;
    }
  },

  async update(id, updateData) {
    try {
      const platforms = await this.getAll();
      const index = platforms.findIndex(p => p.id === id);
      if (index === -1) {
        throw new Error(`找不到平台: ${id}`);
      }
      platforms[index] = { ...platforms[index], ...updateData };
      await safeWriteJsonFile(PLATFORMS_FILE, platforms);
      return platforms[index];
    } catch (error) {
      logger.error(`更新平台失败: ${error.message}`);
      throw error;
    }
  },

  async delete(id) {
    try {
      const platforms = await this.getAll();
      const filteredPlatforms = platforms.filter(p => p.id !== id);
      if (filteredPlatforms.length === platforms.length) {
        throw new Error(`找不到平台: ${id}`);
      }
      await safeWriteJsonFile(PLATFORMS_FILE, filteredPlatforms);
      return { success: true };
    } catch (error) {
      logger.error(`删除平台失败: ${error.message}`);
      throw error;
    }
  }
};

/**
 * 仓库相关数据操作
 */
const repositoryStore = {
  async getAll() {
    try {
      return await safeReadJsonFile(REPOSITORIES_FILE, []);
    } catch (error) {
      logger.error(`读取仓库数据失败: ${error.message}`);
      return [];
    }
  },

  async getById(id) {
    const repos = await this.getAll();
    return repos.find(r => r.id === id);
  },

  async add(repo) {
    try {
      const repos = await this.getAll();
      // 确保ID唯一
      if (!repo.id) {
        // 生成ID如果没有提供
        repo.id = `${repo.type}-${repo.platform}-${repo.repo.replace('/', '-')}`;
      }
      if (repos.some(r => r.id === repo.id)) {
        throw new Error(`仓库ID '${repo.id}' 已存在`);
      }
      repo.status = repo.status || 'idle';
      repo.createdAt = new Date().toISOString();
      repos.push(repo);
      await safeWriteJsonFile(REPOSITORIES_FILE, repos);
      return repo;
    } catch (error) {
      logger.error(`添加仓库失败: ${error.message}`);
      throw error;
    }
  },

  async update(id, updateData) {
    try {
      const repos = await this.getAll();
      const index = repos.findIndex(r => r.id === id);
      if (index === -1) {
        throw new Error(`找不到仓库: ${id}`);
      }
      repos[index] = { ...repos[index], ...updateData, updatedAt: new Date().toISOString() };
      await safeWriteJsonFile(REPOSITORIES_FILE, repos);
      return repos[index];
    } catch (error) {
      logger.error(`更新仓库失败: ${error.message}`);
      throw error;
    }
  },

  async delete(id) {
    try {
      const repos = await this.getAll();
      const filteredRepos = repos.filter(r => r.id !== id);
      if (filteredRepos.length === repos.length) {
        throw new Error(`找不到仓库: ${id}`);
      }
      await safeWriteJsonFile(REPOSITORIES_FILE, filteredRepos);
      return { success: true };
    } catch (error) {
      logger.error(`删除仓库失败: ${error.message}`);
      throw error;
    }
  },

  async updateStatus(id, status) {
    try {
      return await this.update(id, { 
        status, 
        statusUpdatedAt: new Date().toISOString() 
      });
    } catch (error) {
      logger.error(`更新仓库状态失败: ${error.message}`);
      throw error;
    }
  }
};

/**
 * 配置相关数据操作
 */
const configStore = {
  async get() {
    try {
      const defaultConfig = {
        auto_sync: true,
        sync_interval: 3600,
        conflict_strategy: 'prefer_source',
        log_level: 'info',
        log_retention_days: 30
      };
      return await safeReadJsonFile(CONFIG_FILE, defaultConfig);
    } catch (error) {
      logger.error(`读取配置数据失败: ${error.message}`);
      return {
        auto_sync: true,
        sync_interval: 3600,
        conflict_strategy: 'prefer_source',
        log_level: 'info',
        log_retention_days: 30
      };
    }
  },

  async update(configData) {
    try {
      const currentConfig = await this.get();
      const newConfig = { ...currentConfig, ...configData };
      await safeWriteJsonFile(CONFIG_FILE, newConfig);
      return newConfig;
    } catch (error) {
      logger.error(`更新配置失败: ${error.message}`);
      throw error;
    }
  }
};

// 初始化数据存储
ensureDataFilesExist().catch(error => {
  logger.error(`初始化数据存储失败: ${error.message}`);
});

module.exports = {
  platformStore,
  repositoryStore,
  configStore,
  ensureDataFilesExist
}; 