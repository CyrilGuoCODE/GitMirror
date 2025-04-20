import { defineStore } from 'pinia';
import axios from 'axios';

export const useRepositoryStore = defineStore('repository', {
  state: () => ({
    repositories: [],
    loading: false,
    syncingRepos: new Set(),
    error: null
  }),
  
  getters: {
    sourceRepos: (state) => {
      return state.repositories.filter(repo => repo.type === 'source');
    },
    
    mirrorRepos: (state) => {
      return state.repositories.filter(repo => repo.type === 'mirror');
    },
    
    repoCount: (state) => {
      return state.repositories.length;
    },
    
    successCount: (state) => {
      return state.repositories.filter(repo => repo.status === 'success').length;
    },
    
    failedCount: (state) => {
      return state.repositories.filter(repo => repo.status === 'failed').length;
    }
  },
  
  actions: {
    async fetchRepositories() {
      this.loading = true;
      this.error = null;
      
      try {
        const response = await axios.get('/api/repos');
        this.repositories = response.data;
      } catch (error) {
        this.error = error.response?.data?.error || '获取仓库列表失败';
        console.error('Error fetching repositories:', error);
      } finally {
        this.loading = false;
      }
    },
    
    async syncRepository(repoId) {
      if (this.syncingRepos.has(repoId)) {
        return; // 防止重复同步
      }
      
      this.syncingRepos.add(repoId);
      this.error = null;
      
      // 更新仓库状态为同步中
      const repoIndex = this.repositories.findIndex(repo => repo.id === repoId);
      if (repoIndex !== -1) {
        this.repositories[repoIndex].status = 'syncing';
      }
      
      try {
        await axios.post(`/api/repos/${repoId}/sync`);
        
        // 开始轮询仓库状态
        this.pollRepositoryStatus(repoId);
      } catch (error) {
        this.error = error.response?.data?.error || '同步仓库失败';
        console.error('Error syncing repository:', error);
        
        // 更新仓库状态为失败
        if (repoIndex !== -1) {
          this.repositories[repoIndex].status = 'failed';
        }
        
        this.syncingRepos.delete(repoId);
      }
    },
    
    async pollRepositoryStatus(repoId) {
      const pollInterval = 2000; // 2秒钟轮询一次
      const maxAttempts = 30; // 最多轮询30次（1分钟）
      let attempts = 0;
      
      const poll = async () => {
        try {
          const response = await axios.get(`/api/repos/${repoId}/status`);
          const { status } = response.data;
          
          // 更新仓库状态
          const repoIndex = this.repositories.findIndex(repo => repo.id === repoId);
          if (repoIndex !== -1) {
            this.repositories[repoIndex].status = status;
          }
          
          // 如果状态是正在同步，并且未达到最大尝试次数，继续轮询
          if (status === 'syncing' && attempts < maxAttempts) {
            attempts++;
            setTimeout(poll, pollInterval);
          } else {
            this.syncingRepos.delete(repoId);
          }
        } catch (error) {
          console.error('Error polling repository status:', error);
          this.syncingRepos.delete(repoId);
        }
      };
      
      // 开始轮询
      setTimeout(poll, pollInterval);
    }
  }
}); 