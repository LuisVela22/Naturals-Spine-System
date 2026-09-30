import { defineStore } from 'pinia';
import api from '../api/axios';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    token: localStorage.getItem('token') || '',
  }),
  getters: {
    isAuthenticated: (state) => !!state.token,
    isAdmin: (state) => state.user?.rol === 'ADMIN',
    isCliente: (state) => state.user?.rol === 'CLIENTE',
  },
  actions: {
    async login(correo_electronico: string, password: string) {
      const { data } = await api.post('/auth/login', { correo_electronico, password });
      this.token = data.access_token;
      this.user = { ...data.usuario, rol: data.rol };
      localStorage.setItem('token', this.token);
      localStorage.setItem('user', JSON.stringify(this.user));
      return data;
    },
    logout() {
      this.token = '';
      this.user = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
  },
});