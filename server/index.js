const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const { setupRoutes } = require('./routes');
const { logger } = require('./utils/logger');
const { ensureDataFilesExist } = require('./utils/dataStore');
const { migrateRepositoriesFromConfig } = require('./utils/migrationHelper');

// 加载环境变量
dotenv.config();

// 初始化数据
async function initializeApplication() {
  try {
    // 确保数据文件存在
    await ensureDataFilesExist();
    
    // 迁移旧版仓库数据
    await migrateRepositoriesFromConfig();
    
    // 日志记录
    logger.info('应用初始化完成');
  } catch (error) {
    logger.error(`应用初始化失败: ${error.message}`);
  }
}

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 3001;

// 中间件配置
app.use(cors());
app.use(express.json());

// 日志中间件
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// 错误处理中间件
app.use((err, req, res, next) => {
  logger.error(`服务器错误: ${err.message}`);
  res.status(500).json({ error: '服务器内部错误', details: err.message });
});

// 设置API路由
setupRoutes(app);

// 提供前端静态文件（用于生产环境）
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// 初始化应用并启动服务器
initializeApplication().then(() => {
  app.listen(PORT, () => {
    logger.info(`服务器运行在端口 ${PORT}`);
    logger.info(`环境: ${process.env.NODE_ENV || 'development'}`);
    logger.info('GitMirror 服务已启动');
  });
}); 