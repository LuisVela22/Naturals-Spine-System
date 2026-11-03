import { ref } from 'vue';
import { useAuthStore } from '../stores/auth';

const activado = ref(false);
let usuarioAplicado: string | null | undefined;

export function useDarkMode() {
  const auth = useAuthStore();
  const aplicar = (enabled: boolean) => {
    activado.value = enabled;
    document.documentElement.classList.toggle('dark-mode', enabled);
    document.documentElement.style.colorScheme = enabled ? 'dark' : 'light';
  };
  const usuarioActual = auth.user?.id || null;
  if (usuarioAplicado !== usuarioActual && typeof window !== 'undefined') {
    aplicar(auth.user?.modo_oscuro ?? window.matchMedia('(prefers-color-scheme: dark)').matches);
    usuarioAplicado = usuarioActual;
  }
  const alternar = async () => {
    const nuevoEstado = !activado.value;
    aplicar(nuevoEstado);
    try { await auth.setDarkMode(nuevoEstado); }
    catch { aplicar(!nuevoEstado); }
  };
  return { activado, alternar };
}
