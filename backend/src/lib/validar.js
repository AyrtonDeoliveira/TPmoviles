// Validaciones simples de entrada. Devuelven { ok, valor } o { ok:false, mensaje }.

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN = 8;
const NOMBRE_MAX = 80;

export function validarEmail(entrada) {
  const valor = String(entrada ?? '').trim().toLowerCase();
  if (!valor) return { ok: false, mensaje: 'El email es obligatorio.' };
  if (!RE_EMAIL.test(valor)) return { ok: false, mensaje: 'El email no tiene un formato válido.' };
  return { ok: true, valor };
}

export function validarPassword(entrada) {
  const valor = String(entrada ?? '');
  if (!valor) return { ok: false, mensaje: 'La contraseña es obligatoria.' };
  if (valor.length < PASSWORD_MIN) {
    return { ok: false, mensaje: `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.` };
  }
  return { ok: true, valor };
}

export function validarNombre(entrada) {
  const valor = String(entrada ?? '').trim();
  if (!valor) return { ok: false, mensaje: 'El nombre es obligatorio.' };
  if (valor.length > NOMBRE_MAX) {
    return { ok: false, mensaje: `El nombre no puede superar los ${NOMBRE_MAX} caracteres.` };
  }
  return { ok: true, valor };
}
