const fs = require('fs').promises;
const path = require('path');
const { simpleGit } = require('simple-git');
const yaml = require('yaml');
const { logger } = require('../utils/logger');

// 配置文件路径
const CONFIG_FILE_PATH = process.env.CONFIG_FILE_PATH || path.join(__dirname, '../../.gitmirror.yml');
// 工作目录
const WORK_DIR = process.env.WORK_DIR || path.join(__dirname, '../../repos');

// 存储仓库同步状态
const repoStatusMap = new Map();

/**
 * 获取所有仓库
 */
async function getAllRepos(req, res) {
  try {
    // 确保工作目录存在
    try {
      await fs.access(WORK_DIR);
    } catch (error) {
      await fs.mkdir(WORK_DIR, { recursive: true });
    }

    // 读取配置
    const configData = await fs.readFile(CONFIG_FILE_PATH, 'utf8');
    const config = yaml.parse(configData);

    // 合并源仓库和镜像仓库
    const repos = [];
    
    if (config.sources) {
      for (const source of config.sources) {
        repos.push({
          id: `source-${source.platform}-${source.repo.replace('/', '-')}`,
          type: 'source',
          platform: source.platform,
          repo: source.repo,
          branches: source.branches || ['main', 'master'],
          status: repoStatusMap.get(`source-${source.platform}-${source.repo}`) || 'idle'
        });
      }
    }

    if (config.mirrors) {
      for (const mirror of config.mirrors) {
        repos.push({
          id: `mirror-${mirror.platform}-${mirror.repo.replace('/', '-')}`,
          type: 'mirror',
          platform: mirror.platform,
          repo: mirror.repo,
          status: repoStatusMap.get(`mirror-${mirror.platform}-${mirror.repo}`) || 'idle'
        });
      }
    }
    
    res.json(repos);
  } catch (error) {
    logger.error(`获取仓库列表失败: ${error.message}`);
    res.status(500).json({ error: '获取仓库列表失败', details: error.message });
  }
}

/**
 * 获取仓库同步状态
 */
async function getRepoStatus(req, res) {
  try {
    const { id } = req.params;
    const status = repoStatusMap.get(id) || 'idle';
    
    res.json({ id, status });
  } catch (error) {
    logger.error(`获取仓库状态失败: ${error.message}`);
    res.status(500).json({ error: '获取仓库状态失败', details: error.message });
  }
}

/**
 * 同步仓库
 */
async function syncRepo(req, res) {
  try {
    const { id } = req.params;
    const [type, platform, repoName] = id.split('-');
    
    // 更新仓库状态
    repoStatusMap.set(id, 'syncing');
    
    // 返回立即响应，异步执行同步操作
    res.json({ success: true, message: '同步任务已启动', id, status: 'syncing' });
    
    try {
      // 读取配置
      const configData = await fs.readFile(CONFIG_FILE_PATH, 'utf8');
      const config = yaml.parse(configData);
      
      // 找到对应的仓库配置
      let repoConfig;
      if (type === 'source' && config.sources) {
        repoConfig = config.sources.find(s => s.platform === platform && s.repo.replace('/', '-') === repoName);
      } else if (type === 'mirror' && config.mirrors) {
        repoConfig = config.mirrors.find(m => m.platform === platform && m.repo.replace('/', '-') === repoName);
      }
      
      if (!repoConfig) {
        throw new Error('找不到仓库配置');
      }
      
      // 执行同步操作
      await performSync(type, repoConfig, config);
      
      // 更新仓库状态为成功
      repoStatusMap.set(id, 'success');
      logger.info(`仓库 ${repoConfig.repo} 同步成功`);
    } catch (error) {
      // 更新仓库状态为失败
      repoStatusMap.set(id, 'failed');
      logger.error(`仓库 ${id} 同步失败: ${error.message}`);
    }
  } catch (error) {
    logger.error(`启动同步任务失败: ${error.message}`);
    res.status(500).json({ error: '启动同步任务失败', details: error.message });
  }
}

/**
 * 执行实际的同步操作
 */
async function performSync(type, repoConfig, fullConfig) {
  // 构建仓库路径
  const repoPath = path.join(WORK_DIR, `${repoConfig.platform}_${repoConfig.repo.replace('/', '_')}`);
  
  // 确保目录存在
  try {
    await fs.access(repoPath);
  } catch (error) {
    await fs.mkdir(repoPath, { recursive: true });
  }
  
  const git = simpleGit(repoPath);
  
  // 检查仓库是否已初始化
  const isRepo = await git.checkIsRepo();
  
  if (!isRepo) {
    // 如果仓库不存在，克隆它
    logger.info(`克隆仓库: ${repoConfig.platform}/${repoConfig.repo}`);
    
    // 组装Git URL
    const gitUrl = await getGitUrl(repoConfig);
    
    // 克隆仓库
    await git.clone(gitUrl, repoPath);
  } else {
    // 如果仓库已存在，拉取最新更改
    logger.info(`拉取仓库: ${repoConfig.platform}/${repoConfig.repo}`);
    await git.pull();
  }
  
  // 如果是源仓库，推送到所有镜像
  if (type === 'source' && fullConfig.mirrors) {
    for (const mirror of fullConfig.mirrors) {
      try {
        // 添加镜像作为远程仓库
        const mirrorUrl = await getGitUrl(mirror);
        const remoteName = `mirror-${mirror.platform}`;
        
        // 检查远程仓库是否已存在
        const remotes = await git.getRemotes();
        const remoteExists = remotes.some(r => r.name === remoteName);
        
        if (!remoteExists) {
          await git.addRemote(remoteName, mirrorUrl);
        }
        
        // 推送到镜像
        logger.info(`推送到镜像: ${mirror.platform}/${mirror.repo}`);
        await git.push(remoteName, 'master');
        
        // 也推送所有分支（如果配置了特定分支）
        if (repoConfig.branches) {
          for (const branch of repoConfig.branches) {
            try {
              await git.push(remoteName, branch);
            } catch (branchError) {
              logger.warn(`推送分支 ${branch} 失败: ${branchError.message}`);
            }
          }
        }
      } catch (mirrorError) {
        logger.error(`推送到镜像 ${mirror.platform}/${mirror.repo} 失败: ${mirrorError.message}`);
      }
    }
  }
}

/**
 * 获取Git URL
 */
async function getGitUrl(repoConfig) {
  // 根据不同平台构建不同的URL
  switch (repoConfig.platform) {
    case 'github':
      return `https://github.com/${repoConfig.repo}.git`;
    case 'gitee':
      return `https://gitee.com/${repoConfig.repo}.git`;
    case 'gitlab':
      return `https://gitlab.com/${repoConfig.repo}.git`;
    case 'gitcode':
      return `https://gitcode.net/${repoConfig.repo}.git`;
    default:
      throw new Error(`不支持的平台: ${repoConfig.platform}`);
  }
}

module.exports = {
  getAllRepos,
  getRepoStatus,
  syncRepo
}; 