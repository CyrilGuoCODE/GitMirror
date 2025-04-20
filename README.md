# GitMirror - 多平台Git仓库同步工具

GitMirror是一个用于在多个Git平台之间同步仓库的工具，它提供了简单易用的Web界面，能够帮助你轻松管理多个代码仓库的同步工作。

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

## 功能特点

- 🔄 **多平台同步**：支持GitHub、GitLab、Gitee等多个Git平台之间的仓库同步
- 📊 **可视化管理**：直观的Web界面，轻松监控同步状态
- 🔍 **仓库管理**：方便地添加、配置和删除需要同步的仓库
- 🛠️ **平台设置**：灵活配置各种Git平台的访问凭证
- ⚙️ **高级选项**：自定义同步频率、冲突处理策略等
- 🔔 **状态追踪**：实时跟踪仓库同步状态，及时发现问题

## 快速开始

### 前提条件
- Node.js 14.0+
- NPM 或 Yarn
- Git

### 安装

1. 克隆仓库
```bash
git clone https://github.com/CyrilGuoCODE/GitMirror.git
cd GitMirror
```

2. 安装依赖
```bash
# 安装前端依赖
cd client
npm install

# 安装后端依赖
cd ../server
npm install
```

3. 配置环境变量

复制`.env.example`文件并重命名为`.env`，然后根据实际情况修改其中的配置项。

```bash
cp .env.example .env
```

4. 启动开发服务器
```bash
# 启动前端服务器（在client目录下）
npm run dev

# 启动后端服务器（在server目录下）
npm run dev
```

5. 访问应用
打开浏览器，访问 http://localhost:3000

## 使用指南

### 1. 添加Git平台

首先，在"平台设置"页面添加你想要同步的Git平台。每个平台需要配置以下信息：
- 平台名称（如GitHub, GitLab等）
- 平台URL
- 访问令牌（Access Token）

### 2. 配置源仓库和镜像仓库

在"仓库管理"页面：
- 添加源仓库（你想要从中同步的仓库）
- 添加镜像仓库（你想要同步到的仓库）
- 配置需要同步的分支

### 3. 执行同步操作

- 手动同步：在控制面板或仓库管理页面点击"同步"按钮
- 自动同步：在"高级配置"中设置自动同步计划

## 许可证

本项目采用 GNU 通用公共许可证 v3.0 授权 - 详见 [LICENSE](LICENSE) 文件

```
Copyright (C) 2025 GitMirror

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
```

## 联系方式

- 项目链接：[https://github.com/CyrilGuoCODE/GitMirror](https://github.com/CyrilGuoCODE/GitMirror)
- 问题反馈：[https://github.com/CyrilGuoCODE/GitMirror/issues](https://github.com/CyrilGuoCODE/GitMirror/issues)