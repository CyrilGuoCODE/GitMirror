/**
 * 设置应用的API路由
 * @param {express.Application} app - Express应用实例
 */
function setupRoutes(app) {
  // 导入控制器
  const { 
    getSyncConfig, 
    updateSyncConfig, 
    resetConfig,
    resetSystem,
    systemDiagnostic
  } = require('./controllers/configController');
  
  const { 
    getAllRepos, 
    getRepo,
    addRepo, 
    updateRepo,
    deleteRepo,
    getRepoStatus, 
    syncRepo,
    syncAllRepos
  } = require('./controllers/repoController');
  
  const { 
    getGitPlatforms, 
    getGitPlatform,
    addGitPlatform,
    updateGitPlatform,
    deleteGitPlatform,
    validatePlatformToken
  } = require('./controllers/platformController');

  // 健康检查
  app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // 系统相关路由
  app.get('/api/system/diagnostic', systemDiagnostic);
  app.post('/api/system/reset', resetSystem);
  
  // 配置相关路由
  app.get('/api/config', getSyncConfig);
  app.post('/api/config', updateSyncConfig);
  app.post('/api/config/reset', resetConfig);

  // 仓库相关路由
  app.get('/api/repos', getAllRepos);
  app.get('/api/repos/:id', getRepo);
  app.post('/api/repos', addRepo);
  app.put('/api/repos/:id', updateRepo);
  app.delete('/api/repos/:id', deleteRepo);
  app.get('/api/repos/:id/status', getRepoStatus);
  app.post('/api/repos/:id/sync', syncRepo);
  app.post('/api/repos/sync-all', syncAllRepos);

  // Git平台相关路由
  app.get('/api/platforms', getGitPlatforms);
  app.get('/api/platforms/:id', getGitPlatform);
  app.post('/api/platforms', addGitPlatform);
  app.put('/api/platforms/:id', updateGitPlatform);
  app.delete('/api/platforms/:id', deleteGitPlatform);
  app.get('/api/platforms/:id/validate', validatePlatformToken);
}

module.exports = { setupRoutes }; 