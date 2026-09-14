// Validaciones simples de entrada. Devuelven { ok, valor } o { ok:false, mensaje }.
// Reglas de texto (Semana 2): se recortan espacios; "solo espacios" no es válido.

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN = 8;

export const ETAPAS = ['idea', 'lanzamiento', 'ventas', 'crecimiento'];
export const OBJETIVOS = ['ventas', 'alcance', 'consultas', 'clientes', 'validacion', 'otro'];

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

// Texto genérico con límites. `req` = obligatorio.
export function validarTexto(entrada, { campo, min = 1, max = 200, req = true } = {}) {
  const bruto = entrada ?? '';
  if (typeof bruto !== 'string' && typeof bruto !== 'number') {
    return { ok: false, mensaje: `${campo}: valor inválido.` };
  }
  const valor = String(bruto).trim();
  if (!valor) {
    return req
      ? { ok: false, mensaje: `${campo} es obligatorio.` }
      : { ok: true, valor: null };
  }
  if (valor.length < min || valor.length > max) {
    return { ok: false, mensaje: `${campo} debe tener entre ${min} y ${max} caracteres.` };
  }
  return { ok: true, valor };
}

export function validarNombre(entrada) {
  return validarTexto(entrada, { campo: 'El nombre', min: 1, max: 80 });
}

export function validarEnum(entrada, valores, campo, { req = true } = {}) {
  const valor = String(entrada ?? '').trim();
  if (!valor) {
    return req ? { ok: false, mensaje: `${campo} es obligatorio.` } : { ok: true, valor: null };
  }
  if (!valores.includes(valor)) {
    return { ok: false, mensaje: `${campo} inválido. Opciones: ${valores.join(', ')}.` };
  }
  return { ok: true, valor };
}

// Entero no negativo (para consultas, clientes, pedidos).
export function validarEnteroNoNegativo(entrada, campo) {
  if (entrada === null || entrada === undefined || entrada === '') {
    return { ok: true, valor: null };
  }
  const n = Number(entrada);
  if (!Number.isInteger(n) || n < 0) {
    return { ok: false, mensaje: `${campo} debe ser un entero mayor o igual a 0.` };
  }
  return { ok: true, valor: n };
}

// Número (para importes). Permite decimales, no negativos.
export function validarMonto(entrada, campo) {
  if (entrada === null || entrada === undefined || entrada === '') {
    return { ok: true, valor: null };
  }
  const n = Number(entrada);
  if (!Number.isFinite(n) || n < 0) {
    return { ok: false, mensaje: `${campo} debe ser un número mayor o igual a 0.` };
  }
  return { ok: true, valor: n };
}

// Valida el "contexto mínimo" de un emprendimiento (CU-S2-04).
// modo 'crear' exige todos los obligatorios; modo 'editar' valida solo lo presente.
export function validarContextoWorkspace(body, { modo = 'crear' } = {}) {
  const req = modo === 'crear';
  const errores = [];
  const datos = {};

  const map = [
    ['name', body.nombre, { campo: 'El nombre', min: 2, max: 80 }],
    ['country', body.pais, { campo: 'El país', min: 2, max: 100 }],
    ['city', body.ciudad, { campo: 'La ciudad/área', min: 2, max: 100 }],
    ['category', body.categoria, { campo: 'La categoría', min: 2, max: 100 }],
    ['offer', body.oferta, { campo: 'La oferta', min: 10, max: 500 }],
    ['target_audience', body.clienteObjetivo, { campo: 'El cliente objetivo', min: 10, max: 500 }],
  ];
  for (const [col, val, reglas] of map) {
    if (!req && val === undefined) continue;
    const r = validarTexto(val, { ...reglas, req });
    if (!r.ok) errores.push(r.mensaje);
    else datos[col] = r.valor;
  }

  if (req || body.etapa !== undefined) {
    const r = validarEnum(body.etapa, ETAPAS, 'La etapa', { req });
    if (!r.ok) errores.push(r.mensaje);
    else datos.stage = r.valor;
  }

  let objetivo;
  if (req || body.objetivo90d !== undefined) {
    const r = validarEnum(body.objetivo90d, OBJETIVOS, 'El objetivo a 90 días', { req });
    if (!r.ok) errores.push(r.mensaje);
    else {
      objetivo = r.valor;
      datos.objective_90d = r.valor;
    }
  }
  if (body.objetivo90dNota !== undefined) {
    const r = validarTexto(body.objetivo90dNota, {
      campo: 'La descripción del objetivo',
      min: 2,
      max: 100,
      req: false,
    });
    if (!r.ok) errores.push(r.mensaje);
    else datos.objective_90d_note = r.valor;
  }
  if (objetivo === 'otro' && !datos.objective_90d_note) {
    errores.push('Si el objetivo es "otro", hay que describirlo (objetivo90dNota).');
  }

  // Opcionales.
  if (body.sitioWeb !== undefined) {
    const r = validarTexto(body.sitioWeb, { campo: 'El sitio web', min: 0, max: 300, req: false });
    if (!r.ok) errores.push(r.mensaje);
    else datos.website_url = r.valor;
  }
  if (body.instagramHandle !== undefined) {
    const r = validarTexto(body.instagramHandle, {
      campo: 'El usuario de Instagram',
      min: 0,
      max: 100,
      req: false,
    });
    if (!r.ok) errores.push(r.mensaje);
    else datos.instagram_handle = r.valor;
  }
  if (body.ventasActuales !== undefined && body.ventasActuales !== null) {
    const v = validarMonto(body.ventasActuales.valor, 'El valor de ventas actuales');
    if (!v.ok) errores.push(v.mensaje);
    else datos.current_sales_value = v.valor;
    datos.current_sales_period = String(body.ventasActuales.periodo ?? '').trim() || null;
    datos.currency = String(body.ventasActuales.moneda ?? '').trim().toUpperCase() || null;
  }

  return errores.length ? { ok: false, errores } : { ok: true, datos };
}
