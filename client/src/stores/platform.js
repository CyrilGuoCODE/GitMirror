import { defineStore } from 'pinia';
import axios from 'axios';

export const usePlatformStore = defineStore('platform', {
  state: () => ({
    platforms: [],
    loading: false,
    error: null
  }),
  
  getters: {
    platformCount: (state) => {
      return state.platforms.length;
    },
    
    getPlatformById: (state) => (id) => {
      return state.platforms.find(platform => platform.id === id);
    }
  },
  
  actions: {
    async fetchPlatforms() {
      this.loading = true;
      this.error = null;
      
      try {
        const response = await axios.get('/api/platforms');
        this.platforms = response.data;
      } catch (error) {
        this.error = error.response?.data?.error || '获取平台列表失败';
        console.error('Error fetching platforms:', error);
      } finally {
        this.loading = false;
      }
    },
    
    async addPlatform(platform) {
      this.loading = true;
      this.error = null;
      
      try {
        const response = await axios.post('/api/platforms', platform);
        this.platforms.push(response.data);
        return true;
      } catch (error) {
        this.error = error.response?.data?.error || '添加平台失败';
        console.error('Error adding platform:', error);
        return false;
      } finally {
        this.loading = false;
      }
    },

    async updatePlatform(platform) {
      this.loading = true;
      this.error = null;
      
      try {
        const response = await axios.put(`/api/platforms/${platform.id}`, platform);
        
        // 更新本地平台数据
        const index = this.platforms.findIndex(p => p.id === platform.id);
        if (index !== -1) {
          this.platforms[index] = response.data;
        }
        
        return true;
      } catch (error) {
        this.error = error.response?.data?.error || '更新平台失败';
        console.error('Error updating platform:', error);
        return false;
      } finally {
        this.loading = false;
      }
    },
    
    async deletePlatform(platformId) {
      this.loading = true;
      this.error = null;
      
      try {
        await axios.delete(`/api/platforms/${platformId}`);
        
        // 从本地移除平台
        this.platforms = this.platforms.filter(platform => platform.id !== platformId);
        
        return true;
      } catch (error) {
        this.error = error.response?.data?.error || '删除平台失败';
        console.error('Error deleting platform:', error);
        return false;
      } finally {
        this.loading = false;
      }
    }
  }
}); 