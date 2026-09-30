import { createRouter, createWebHistory } from 'vue-router';
import LoginView from '../views/LoginView.vue';
import RegistroView from '../views/RegistroView.vue';
import ResetPasswordView from '../views/ResetPasswordView.vue';
import ClienteLayout from '../layouts/ClienteLayout.vue'; // <-- Aquí está tu archivo original
import ClienteDashboardView from '../views/cliente/ClienteDashboard.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/login',
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { public: true },
    },
    {
      path: '/registro',
      name: 'registro',
      component: RegistroView,
      meta: { public: true },
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: ResetPasswordView,
      meta: { public: true },
    },
    {
      path: '/cliente',
      component: ClienteLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: 'dashboard',
          name: 'cliente-dashboard',
          component: ClienteDashboardView,
        },
      ],
    },
  ],
});

router.beforeEach((to) => {
  const token = localStorage.getItem('token');
  const isPublic = to.meta.public;

  if (!isPublic && !token) {
    return { name: 'login' };
  }
});

export default router;