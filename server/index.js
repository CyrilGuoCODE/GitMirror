const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 3001;

// 中间件配置
app.use(cors());
app.use(express.json());

// API路由
app.get('/api/platforms', (req, res) => {
  // 返回模拟数据
  res.json([
    { 
      id: 'github', 
      name: 'GitHub', 
      url: 'https://github.com',
      token: 'ghp_sampletokenXXXXXXXXXXXXXXXXXXXXXXXX',
      status: 'active'
    },
    { 
      id: 'gitee', 
      name: 'Gitee', 
      url: 'https://gitee.com',
      token: 'sampleGiteeTokenXXXXXXXXXXXXXXXXXXXXXXXX',
      status: 'active'
    }
  ]);
});

app.get('/api/repos', (req, res) => {
  // 返回模拟数据
  res.json([
    { 
      id: 'repo1',
      platform: 'GitHub',
      repo: 'user/repo1',
      type: 'source',
      branches: ['main', 'develop'],
      status: 'success'
    },
    { 
      id: 'repo2',
      platform: 'Gitee',
      repo: 'user/repo1-mirror',
      type: 'mirror',
      status: 'success'
    }
  ]);
});

app.get('/api/config', (req, res) => {
  // 返回模拟数据
  res.json({
    sources: [
      { platform: 'github', repo: 'user/repo1', branches: ['main', 'develop'] }
    ],
    mirrors: [
      { platform: 'gitee', repo: 'user/repo1-mirror' }
    ],
    auto_sync: true,
    sync_interval: 3600,
    conflict_strategy: 'prefer_source',
    log_level: 'info',
    log_retention_days: 30
  });
});

app.post('/api/config', (req, res) => {
  console.log('Received updated config:', req.body);
  res.json({ success: true });
});

// 提供前端静态文件（用于生产环境）
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// 启动服务器
app.listen(PORT, () => {
  console.log(`]: Server running on port ${PORT}`);
  console.log(`]: Environment: ${process.env.NODE_ENV || 'development'}`);
}); 