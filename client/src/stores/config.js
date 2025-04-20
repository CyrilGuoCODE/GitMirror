import { defineStore } from 'pinia';
import axios from 'axios';

export const useConfigStore = defineStore('config', {
  state: () => ({
    config: {
      sources: [],
      mirrors: [],
      auto_sync: true,
      sync_interval: 3600,
      conflict_strategy: 'prefer_source'
    },
    loading: false,
    error: null
  }),
  
  getters: {
    hasConfig: (state) => {
      return state.config.sources.length > 0 || state.config.mirrors.length > 0;
    }
  },
  
  actions: {
    async fetchConfig() {
      this.loading = true;
      this.error = null;
      
      try {
        const response = await axios.get('/api/config');
        this.config = response.data;
      } catch (error) {
        this.error = error.response?.data?.error || '获取配置失败';
        console.error('Error fetching config:', error);
      } finally {
        this.loading = false;
      }
    },
    
    async updateConfig(config) {
      this.loading = true;
      this.error = null;
      
      try {
        const response = await axios.post('/api/config', config);
        if (response.data.success) {
          this.config = config;
          return true;
        }
        return false;
      } catch (error) {
        this.error = error.response?.data?.error || '更新配置失败';
        console.error('Error updating config:', error);
        return false;
      } finally {
        this.loading = false;
      }
    }
  }
}); 