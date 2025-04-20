const fs = require('fs');
const axios = require('axios');

// API基础URL
const API_BASE = 'http://localhost:3001/api';

// 创建一个简单的日志函数
function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

// 测试函数：重置系统
async function resetSystem() {
  try {
    log('正在重置系统...');
    const response = await axios.post(`${API_BASE}/system/reset`);
    log(`系统重置成功: ${JSON.stringify(response.data)}`);
    return true;
  } catch (error) {
    log(`系统重置失败: ${error.message}`);
    if (error.response) {
      log(`错误详情: ${JSON.stringify(error.response.data)}`);
    }
    return false;
  }
}

// 测试函数：获取系统诊断信息
async function getSystemDiagnostic() {
  try {
    log('正在获取系统诊断信息...');
    const response = await axios.get(`${API_BASE}/system/diagnostic`);
    log(`系统诊断信息: ${JSON.stringify(response.data, null, 2)}`);
    return response.data;
  } catch (error) {
    log(`获取系统诊断信息失败: ${error.message}`);
    if (error.response) {
      log(`错误详情: ${JSON.stringify(error.response.data)}`);
    }
    return null;
  }
}

// 测试函数：添加平台
async function addPlatform(platform) {
  try {
    log(`正在添加平台: ${platform.name}...`);
    const response = await axios.post(`${API_BASE}/platforms`, platform);
    log(`平台添加成功: ${JSON.stringify(response.data)}`);
    return response.data;
  } catch (error) {
    log(`平台添加失败: ${error.message}`);
    if (error.response) {
      log(`错误详情: ${JSON.stringify(error.response.data)}`);
    }
    return null;
  }
}

// 测试函数：获取所有平台
async function getAllPlatforms() {
  try {
    log('正在获取所有平台...');
    const response = await axios.get(`${API_BASE}/platforms`);
    log(`获取到 ${response.data.length} 个平台`);
    return response.data;
  } catch (error) {
    log(`获取平台失败: ${error.message}`);
    if (error.response) {
      log(`错误详情: ${JSON.stringify(error.response.data)}`);
    }
    return [];
  }
}

// 测试函数：删除平台
async function deletePlatform(id) {
  try {
    log(`正在删除平台: ${id}...`);
    const response = await axios.delete(`${API_BASE}/platforms/${id}`);
    log(`平台删除成功: ${JSON.stringify(response.data)}`);
    return true;
  } catch (error) {
    log(`平台删除失败: ${error.message}`);
    if (error.response) {
      log(`错误详情: ${JSON.stringify(error.response.data)}`);
    }
    return false;
  }
}

// 测试函数：添加仓库
async function addRepository(repo) {
  try {
    log(`正在添加仓库: ${repo.type} ${repo.platform}/${repo.repo}...`);
    const response = await axios.post(`${API_BASE}/repos`, repo);
    log(`仓库添加成功: ${JSON.stringify(response.data)}`);
    return response.data;
  } catch (error) {
    log(`仓库添加失败: ${error.message}`);
    if (error.response) {
      log(`错误详情: ${JSON.stringify(error.response.data)}`);
    }
    return null;
  }
}

// 测试函数：获取所有仓库
async function getAllRepositories() {
  try {
    log('正在获取所有仓库...');
    const response = await axios.get(`${API_BASE}/repos`);
    log(`获取到 ${response.data.length} 个仓库`);
    return response.data;
  } catch (error) {
    log(`获取仓库失败: ${error.message}`);
    if (error.response) {
      log(`错误详情: ${JSON.stringify(error.response.data)}`);
    }
    return [];
  }
}

// 主测试函数
async function runTests() {
  log('开始系统测试...');
  
  // 1. 重置系统
  await resetSystem();
  
  // 2. 检查系统状态
  const diagnostic = await getSystemDiagnostic();
  if (!diagnostic) {
    log('系统诊断失败，测试终止');
    return;
  }
  
  // 3. 获取所有平台
  const initialPlatforms = await getAllPlatforms();
  log(`系统初始有 ${initialPlatforms.length} 个平台`);
  
  // 4. 添加自定义平台
  const customPlatform = {
    id: 'test-platform',
    name: '测试平台',
    url: 'https://test-git.example.com',
    token: 'test-token'
  };
  const addedPlatform = await addPlatform(customPlatform);
  
  // 5. 再次获取平台列表确认添加成功
  const updatedPlatforms = await getAllPlatforms();
  log(`添加后系统有 ${updatedPlatforms.length} 个平台`);
  
  // 6. 添加仓库
  if (addedPlatform) {
    const repo = {
      type: 'source',
      platform: addedPlatform.id,
      repo: 'test/test-repo',
      branches: ['main']
    };
    const addedRepo = await addRepository(repo);
    
    // 7. 获取所有仓库
    const repos = await getAllRepositories();
    log(`系统中有 ${repos.length} 个仓库`);
    
    // 8. 删除自定义平台
    await deletePlatform(addedPlatform.id);
  }
  
  // 9. 最终检查系统状态
  const finalDiagnostic = await getSystemDiagnostic();
  
  log('测试完成!');
}

// 执行测试
runTests().catch(error => {
  log(`测试过程中出错: ${error.message}`);
}); 