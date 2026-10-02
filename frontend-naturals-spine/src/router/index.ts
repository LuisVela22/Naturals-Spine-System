import { createRouter, createWebHistory } from 'vue-router';

import LoginView from '../views/LoginView.vue';
import RegistroView from '../views/RegistroView.vue';
import ResetPasswordView from '../views/ResetPasswordView.vue';

import ClienteLayout from '../layouts/ClienteLayout.vue';
import ClienteDashboardView from '../views/cliente/ClienteDashboard.vue';
import ClienteNuevaOrdenView from '../views/cliente/ClienteNuevaOrden.vue';
import ClienteHistorialView from '../views/cliente/ClienteHistorial.vue';

import AdminLayout from '../layouts/AdminLayout.vue';
import AdminDashboardView from '../views/admin/AdminDashboard.vue';
import AdminClientesView from '../views/admin/AdminClientes.vue';
import AdminOrdenesView from '../views/admin/AdminOrdenes.vue';

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

    // Portal del cliente institucional
    {
      path: '/cliente',
      component: ClienteLayout,
      meta: { requiresAuth: true, role: 'CLIENTE' },
      children: [
        {
          path: 'dashboard',
          name: 'cliente-dashboard',
          component: ClienteDashboardView,
        },
        {
          path: 'nueva-orden',
          name: 'cliente-nueva-orden',
          component: ClienteNuevaOrdenView,
        },
        {
          path: 'historial',
          name: 'cliente-historial',
          component: ClienteHistorialView,
        },
      ],
    },

    // Portal del personal de la empresa
    {
      path: '/admin',
      component: AdminLayout,
      meta: { requiresAuth: true, role: 'ADMIN' },
      children: [
        {
          path: 'dashboard',
          name: 'admin-dashboard',
          component: AdminDashboardView,
        },
        {
          path: 'clientes',
          name: 'admin-clientes',
          component: AdminClientesView,
        },
        {
          path: 'ordenes',
          name: 'admin-ordenes',
          component: AdminOrdenesView,
        },
      ],
    },
  ],
});

router.beforeEach((to) => {
  const token = localStorage.getItem('token');
  const userRaw = localStorage.getItem('user');
  const user = userRaw ? JSON.parse(userRaw) : null;

  if (to.meta.public) {
    return true;
  }

  if (to.meta.requiresAuth && !token) {
    return { name: 'login' };
  }

  const requiredRole = to.meta.role as string | undefined;
  if (requiredRole && user?.rol !== requiredRole) {
    return user?.rol === 'ADMIN'
      ? { name: 'admin-dashboard' }
      : { name: 'cliente-dashboard' };
  }

  return true;
});

export default router;
