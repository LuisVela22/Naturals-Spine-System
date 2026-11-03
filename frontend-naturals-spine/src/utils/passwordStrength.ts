export type PasswordStrength = { score: number; label: string; color: string };

export function evaluarFortaleza(password: string): PasswordStrength {
  if (!password) return { score: 0, label: 'Sin contraseña', color: 'bg-slate-200' };
  const classes = [/[a-z]/.test(password), /[A-Z]/.test(password), /\d/.test(password), /[.,/@&_$-]/.test(password)].filter(Boolean).length;
  const fuerte = password.length > 12 && classes === 4;
  const score = fuerte ? 5 : password.length >= 8 && classes >= 3 ? 4 : password.length >= 8 && classes >= 2 ? 3 : classes >= 2 ? 2 : 1;
  if (fuerte) return { score, label: 'Fuerte', color: 'bg-emerald-500' };
  if (score >= 4) return { score, label: 'Adecuada', color: 'bg-blue-500' };
  if (score >= 3) return { score, label: 'Moderada', color: 'bg-amber-500' };
  return { score, label: 'Débil', color: 'bg-red-500' };
}
