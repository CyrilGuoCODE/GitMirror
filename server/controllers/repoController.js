const fs = require('fs').promises;
const path = require('path');
const { simpleGit } = require('simple-git');
const { logger } = require('../utils/logger');
const { repositoryStore, platformStore } = require('../utils/dataStore');

// 工作目录
const WORK_DIR = process.env.WORK_DIR || path.join(__dirname, '../../repos');

/**
 * 获取所有仓库
 */
async function getAllRepos(req, res) {
  try {
    const repos = await repositoryStore.getAll();
    res.json(repos);
  } catch (error) {
    logger.error(`获取仓库列表失败: ${error.message}`);
    res.status(500).json({ error: '获取仓库列表失败', details: error.message });
  }
}

/**
 * 获取仓库详情
 */
async function getRepo(req, res) {
  try {
    const { id } = req.params;
    const repo = await repositoryStore.getById(id);
    
    if (!repo) {
      return res.status(404).json({ error: `找不到仓库: ${id}` });
    }
    
    res.json(repo);
  } catch (error) {
    logger.error(`获取仓库详情失败: ${error.message}`);
    res.status(500).json({ error: '获取仓库详情失败', details: error.message });
  }
}

/**
 * 添加新仓库
 */
async function addRepo(req, res) {
  try {
    const { type, platform, repo, branches } = req.body;
    
    // 验证必填字段
    if (!type || !platform || !repo) {
      return res.status(400).json({ error: '缺少必要参数: type, platform, repo 为必填项' });
    }
    
    // 验证类型
    if (!['source', 'mirror'].includes(type)) {
      return res.status(400).json({ error: '无效的仓库类型，必须是 source 或 mirror' });
    }
    
    // 验证平台是否存在
    const platformExists = await platformStore.getById(platform);
    if (!platformExists) {
      return res.status(400).json({ error: `平台不存在: ${platform}` });
    }
    
    // 生成ID
    const id = `${type}-${platform}-${repo.replace('/', '-')}`;
    
    // 检查仓库是否已存在
    const existingRepo = await repositoryStore.getById(id);
    if (existingRepo) {
      return res.status(400).json({ error: `仓库已存在: ${repo}` });
    }
    
    // 创建新仓库
    const newRepo = await repositoryStore.add({
      id,
      type,
      platform,
      repo,
      branches: branches || ['main', 'master'],
      status: 'idle'
    });
    
    logger.info(`添加仓库: ${type} ${platform}/${repo}`);
    res.status(201).json(newRepo);
  } catch (error) {
    logger.error(`添加仓库失败: ${error.message}`);
    res.status(500).json({ error: '添加仓库失败', details: error.message });
  }
}

/**
 * 更新仓库
 */
async function updateRepo(req, res) {
  try {
    const { id } = req.params;
    const repo = await repositoryStore.getById(id);
    
    if (!repo) {
      return res.status(404).json({ error: `找不到仓库: ${id}` });
    }
    
    const { platform, repo: repoPath, branches } = req.body;
    const updateData = {
      ...(platform && { platform }),
      ...(repoPath && { repo: repoPath }),
      ...(branches && { branches })
    };
    
    // 更新仓库
    const updatedRepo = await repositoryStore.update(id, updateData);
    
    logger.info(`更新仓库: ${id}`);
    res.json(updatedRepo);
  } catch (error) {
    logger.error(`更新仓库失败: ${error.message}`);
    res.status(500).json({ error: '更新仓库失败', details: error.message });
  }
}

/**
 * 删除仓库
 */
async function deleteRepo(req, res) {
  try {
    const { id } = req.params;
    const repo = await repositoryStore.getById(id);
    
    if (!repo) {
      return res.status(404).json({ error: `找不到仓库: ${id}` });
    }
    
    // 删除仓库
    await repositoryStore.delete(id);
    
    logger.info(`删除仓库: ${id}`);
    res.json({ success: true, message: `仓库 ${id} 已删除` });
  } catch (error) {
    logger.error(`删除仓库失败: ${error.message}`);
    res.status(500).json({ error: '删除仓库失败', details: error.message });
  }
}

/**
 * 获取仓库状态
 */
async function getRepoStatus(req, res) {
  try {
    const { id } = req.params;
    const repo = await repositoryStore.getById(id);
    
    if (!repo) {
      return res.status(404).json({ error: `找不到仓库: ${id}` });
    }
    
    res.json({ 
      id, 
      status: repo.status || 'idle',
      lastSynced: repo.statusUpdatedAt
    });
  } catch (error) {
    logger.error(`获取仓库状态失败: ${error.message}`);
    res.status(500).json({ error: '获取仓库状态失败', details: error.message });
  }
}

/**
 * 同步单个仓库
 */
async function syncRepo(req, res) {
  try {
    const { id } = req.params;
    const repo = await repositoryStore.getById(id);
    
    if (!repo) {
      return res.status(404).json({ error: `找不到仓库: ${id}` });
    }
    
    // 更新仓库状态为同步中
    await repositoryStore.updateStatus(id, 'syncing');
    
    // 立即返回响应，异步执行同步操作
    res.json({ success: true, message: '同步任务已启动', id, status: 'syncing' });
    
    // 异步执行同步
    performSync(repo).catch(error => {
      logger.error(`仓库 ${id} 同步失败: ${error.message}`);
    });
  } catch (error) {
    logger.error(`启动同步任务失败: ${error.message}`);
    res.status(500).json({ error: '启动同步任务失败', details: error.message });
  }
}

/**
 * 同步所有仓库
 */
async function syncAllRepos(req, res) {
  try {
    const repos = await repositoryStore.getAll();
    
    if (repos.length === 0) {
      return res.json({ message: '没有可同步的仓库' });
    }
    
    // 更新所有仓库状态为同步中
    for (const repo of repos) {
      await repositoryStore.updateStatus(repo.id, 'syncing');
    }
    
    // 立即返回响应，异步执行同步操作
    res.json({ 
      success: true, 
      message: `已启动 ${repos.length} 个仓库的同步任务`, 
      count: repos.length 
    });
    
    // 异步执行所有同步
    for (const repo of repos) {
      performSync(repo).catch(error => {
        logger.error(`仓库 ${repo.id} 同步失败: ${error.message}`);
      });
    }
  } catch (error) {
    logger.error(`启动全部同步任务失败: ${error.message}`);
    res.status(500).json({ error: '启动全部同步任务失败', details: error.message });
  }
}

/**
 * 执行实际的同步操作
 */
async function performSync(repoConfig) {
  try {
    // 确保工作目录存在
    try {
      await fs.access(WORK_DIR);
    } catch (error) {
      await fs.mkdir(WORK_DIR, { recursive: true });
      logger.info(`创建工作目录: ${WORK_DIR}`);
    }
    
    // 构建仓库路径
    const repoPath = path.join(WORK_DIR, `${repoConfig.platform}_${repoConfig.repo.replace('/', '_')}`);
    
    // 确保目录存在
    try {
      await fs.access(repoPath);
    } catch (error) {
      await fs.mkdir(repoPath, { recursive: true });
    }
    
    const git = simpleGit(repoPath);
    
    // 获取平台信息，用于构建Git URL
    const platform = await platformStore.getById(repoConfig.platform);
    if (!platform) {
      throw new Error(`找不到平台: ${repoConfig.platform}`);
    }
    
    // 检查平台令牌是否设置
    if (!platform.token) {
      throw new Error(`平台 ${platform.name} 没有设置访问令牌`);
    }
    
    // 检查仓库是否已初始化
    const isRepo = await git.checkIsRepo();
    
    if (!isRepo) {
      // 如果仓库不存在，克隆它
      logger.info(`克隆仓库: ${platform.name}/${repoConfig.repo}`);
      
      // 组装Git URL (使用令牌认证)
      const gitUrl = getGitUrl(platform, repoConfig.repo);
      
      // 克隆仓库
      await git.clone(gitUrl, repoPath);
      logger.info(`仓库克隆完成: ${repoConfig.repo}`);
    } else {
      // 如果仓库已存在，拉取最新更改
      logger.info(`拉取仓库更新: ${platform.name}/${repoConfig.repo}`);
      
      // 确保远程仓库设置正确
      const remoteUrl = getGitUrl(platform, repoConfig.repo);
      const remotes = await git.getRemotes(true);
      const originRemote = remotes.find(r => r.name === 'origin');
      
      if (!originRemote || originRemote.refs.fetch !== remoteUrl) {
        // 如果远程不存在或URL不匹配，重新设置
        if (originRemote) {
          await git.removeRemote('origin');
        }
        await git.addRemote('origin', remoteUrl);
        logger.info(`更新远程仓库地址: ${remoteUrl}`);
      }
      
      // 拉取更新
      await git.fetch('origin');
      
      // 切换到主分支并拉取
      const branches = repoConfig.branches || ['main', 'master'];
      let branchSwitched = false;
      
      for (const branch of branches) {
        try {
          // 检查分支是否存在于远程
          const remoteBranches = await git.branch(['-r']);
          if (remoteBranches.all.includes(`origin/${branch}`)) {
            // 检查本地分支是否存在
            const localBranches = await git.branchLocal();
            if (!localBranches.all.includes(branch)) {
              // 创建本地分支
              await git.checkout(['-b', branch, `origin/${branch}`]);
            } else {
              await git.checkout(branch);
            }
            branchSwitched = true;
            await git.pull('origin', branch);
            logger.info(`拉取分支 ${branch} 完成`);
            break;
          }
        } catch (branchError) {
          logger.warn(`切换到分支 ${branch} 失败: ${branchError.message}`);
        }
      }
      
      // 如果没有成功切换到任何分支，尝试使用当前分支
      if (!branchSwitched) {
        const currentBranch = await git.revparse(['--abbrev-ref', 'HEAD']);
        await git.pull('origin', currentBranch);
        logger.info(`拉取当前分支 ${currentBranch} 完成`);
      }
    }
    
    // 如果是源仓库，推送到镜像仓库
    if (repoConfig.type === 'source') {
      // 查找所有镜像仓库
      const allRepos = await repositoryStore.getAll();
      const mirrorRepos = allRepos.filter(r => 
        r.type === 'mirror' && 
        r.repo === repoConfig.repo && 
        r.platform !== repoConfig.platform
      );
      
      if (mirrorRepos.length > 0) {
        logger.info(`为 ${repoConfig.repo} 找到 ${mirrorRepos.length} 个镜像仓库`);
        
        for (const mirrorRepo of mirrorRepos) {
          try {
            const mirrorPlatform = await platformStore.getById(mirrorRepo.platform);
            if (!mirrorPlatform || !mirrorPlatform.token) {
              logger.warn(`镜像平台 ${mirrorRepo.platform} 没有设置访问令牌，跳过同步`);
              continue;
            }
            
            // 添加镜像作为远程仓库
            const mirrorUrl = getGitUrl(mirrorPlatform, mirrorRepo.repo);
            const remoteName = `mirror-${mirrorRepo.platform}`;
            
            // 检查远程仓库是否已存在
            const remotes = await git.getRemotes();
            const remoteExists = remotes.some(r => r.name === remoteName);
            
            if (!remoteExists) {
              await git.addRemote(remoteName, mirrorUrl);
              logger.info(`添加镜像远程仓库: ${remoteName} ${mirrorUrl}`);
            } else {
              // 更新远程URL
              await git.removeRemote(remoteName);
              await git.addRemote(remoteName, mirrorUrl);
              logger.info(`更新镜像远程仓库地址: ${mirrorUrl}`);
            }
            
            // 推送到镜像
            logger.info(`推送到镜像: ${mirrorPlatform.name}/${mirrorRepo.repo}`);
            
            // 推送所有分支
            const branches = repoConfig.branches || ['main', 'master'];
            for (const branch of branches) {
              try {
                // 检查本地分支是否存在
                const localBranches = await git.branchLocal();
                if (localBranches.all.includes(branch)) {
                  await git.push(remoteName, branch);
                  logger.info(`推送分支 ${branch} 到 ${mirrorPlatform.name} 完成`);
                }
              } catch (branchError) {
                logger.warn(`推送分支 ${branch} 到 ${mirrorPlatform.name} 失败: ${branchError.message}`);
              }
            }
            
            // 更新镜像仓库状态
            await repositoryStore.updateStatus(mirrorRepo.id, 'success');
          } catch (mirrorError) {
            logger.error(`推送到镜像 ${mirrorRepo.platform}/${mirrorRepo.repo} 失败: ${mirrorError.message}`);
            await repositoryStore.updateStatus(mirrorRepo.id, 'failed');
          }
        }
      } else {
        logger.info(`没有找到 ${repoConfig.repo} 的镜像仓库`);
      }
    }
    
    // 更新仓库状态为成功
    await repositoryStore.updateStatus(repoConfig.id, 'success');
    logger.info(`仓库 ${repoConfig.repo} 同步成功`);
    
    return true;
  } catch (error) {
    // 更新仓库状态为失败
    await repositoryStore.updateStatus(repoConfig.id, 'failed');
    logger.error(`仓库 ${repoConfig.id} 同步失败: ${error.message}`);
    throw error;
  }
}

/**
 * 获取Git URL (带认证)
 */
function getGitUrl(platform, repo) {
  // 分析平台类型，使用适当的URL格式
  const token = platform.token;
  const baseUrl = platform.url.replace(/^https?:\/\//, '');
  
  switch (platform.id) {
    case 'github':
      return `https://${token}:x-oauth-basic@${baseUrl}/${repo}.git`;
    case 'gitee':
      return `https://${token}@${baseUrl}/${repo}.git`;
    case 'gitlab':
    case 'gitcode':
      return `https://oauth2:${token}@${baseUrl}/${repo}.git`;
    default:
      // 对于自定义平台，使用通用格式
      return `https://${token}@${baseUrl}/${repo}.git`;
  }
}

module.exports = {
  getAllRepos,
  getRepo,
  addRepo,
  updateRepo,
  deleteRepo,
  getRepoStatus,
  syncRepo,
  syncAllRepos
}; 