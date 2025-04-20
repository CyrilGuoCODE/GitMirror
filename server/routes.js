const { getSyncConfig, updateSyncConfig } = require('./controllers/configController');
const { getAllRepos, syncRepo, getRepoStatus } = require('./controllers/repoController');
const { getGitPlatforms, addGitPlatform } = require('./controllers/platformController');

/**
 * 设置应用的API路由
 * @param {express.Application} app - Express应用实例
 */
function setupRoutes(app) {
  // 健康检查
  app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // 配置相关路由
  app.get('/api/config', getSyncConfig);
  app.post('/api/config', updateSyncConfig);

  // 仓库相关路由
  app.get('/api/repos', getAllRepos);
  app.get('/api/repos/:id/status', getRepoStatus);
  app.post('/api/repos/:id/sync', syncRepo);

  // Git平台相关路由
  app.get('/api/platforms', getGitPlatforms);
  app.post('/api/platforms', addGitPlatform);
}

module.exports = { setupRoutes }; 