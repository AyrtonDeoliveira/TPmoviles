import { API_URL } from './config';

export type Plan = {
  id: string;
  nombre: string;
  almacenamientoMb: number;
  workspaces: number | null;
};

export type Sesion = {
  accessToken: string;
  usuario: { id: string; email: string; nombre: string };
  plan: Plan;
  usoAlmacenamientoMb: number;
};

// Error con el mensaje que manda el backend (ya viene en español y apto para mostrar).
export class ApiError extends Error {
  codigo?: string;
  detalles?: string[];
  constructor(mensaje: string, codigo?: string, detalles?: string[]) {
    super(mensaje);
    this.codigo = codigo;
    this.detalles = detalles;
  }
}

async function pedir(ruta: string, opciones: { metodo?: string; cuerpo?: object; token?: string } = {}) {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${ruta}`, {
      method: opciones.metodo ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(opciones.token ? { Authorization: `Bearer ${opciones.token}` } : {}),
      },
      body: opciones.cuerpo ? JSON.stringify(opciones.cuerpo) : undefined,
    });
  } catch {
    throw new ApiError('No se pudo conectar con el servidor. Revisá tu conexión.', 'sin_conexion');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detalles = Array.isArray(data?.detalles) ? data.detalles.map(String) : undefined;
    throw new ApiError(data?.error ?? `Error ${res.status}`, data?.codigo, detalles);
  }
  return data;
}

// Completa la sesión con nombre, plan y uso desde GET /me (fuente de verdad).
async function armarSesion(accessToken: string): Promise<Sesion> {
  const me = await pedir('/me', { token: accessToken });
  return {
    accessToken,
    usuario: { id: me.usuario.id, email: me.usuario.email, nombre: me.usuario.nombre ?? '' },
    plan: {
      id: me.plan.id,
      nombre: me.plan.nombre,
      almacenamientoMb: me.plan.limites.almacenamientoMb,
      workspaces: me.plan.limites.workspaces,
    },
    usoAlmacenamientoMb: me.uso?.almacenamientoMb ?? 0,
  };
}

export async function iniciarSesion(email: string, password: string): Promise<Sesion> {
  const data = await pedir('/auth/login', { metodo: 'POST', cuerpo: { email, password } });
  return armarSesion(data.sesion.accessToken);
}

export async function registrarUsuario(nombre: string, email: string, password: string): Promise<Sesion> {
  const data = await pedir('/auth/register', { metodo: 'POST', cuerpo: { nombre, email, password } });
  if (!data.sesion) {
    throw new ApiError(data.aviso ?? 'Cuenta creada. Iniciá sesión para continuar.', 'sin_sesion');
  }
  return armarSesion(data.sesion.accessToken);
}

// Pago simulado (sin datos bancarios): activa el plan Pro y devuelve la sesión
// actualizada con el plan nuevo.
export async function activarPlanPro(accessToken: string): Promise<Sesion> {
  await pedir('/subscription/activate-demo', { metodo: 'POST', cuerpo: { planId: 'pro' }, token: accessToken });
  return armarSesion(accessToken);
}

export async function cerrarSesionEnServidor(accessToken: string): Promise<void> {
  try {
    await pedir('/auth/logout', { metodo: 'POST', token: accessToken });
  } catch {
    // best-effort: igual se descarta la sesión local.
  }
}

// ---------------------------------------------------------------------------
// Proyectos (workspaces)
// ---------------------------------------------------------------------------

export type Etapa = 'idea' | 'lanzamiento' | 'ventas' | 'crecimiento';
export type Objetivo = 'ventas' | 'alcance' | 'consultas' | 'clientes' | 'validacion' | 'otro';

export type Proyecto = {
  id: string;
  nombre: string;
  pais: string;
  ciudad: string;
  categoria: string;
  etapa: Etapa;
  oferta: string;
  clienteObjetivo: string;
  objetivo90d: Objetivo;
  objetivo90dNota: string | null;
  sitioWeb: string | null;
  instagramHandle: string | null;
  creadoEn: string;
  actualizadoEn: string;
};

export type DatosProyecto = {
  nombre: string;
  pais: string;
  ciudad: string;
  categoria: string;
  etapa: Etapa;
  oferta: string;
  clienteObjetivo: string;
  objetivo90d: Objetivo;
  objetivo90dNota?: string;
  sitioWeb?: string;
  instagramHandle?: string;
};

export async function listarProyectos(token: string): Promise<Proyecto[]> {
  const data = await pedir('/workspaces', { token });
  return data.workspaces;
}

export async function crearProyecto(token: string, datos: DatosProyecto): Promise<Proyecto> {
  const data = await pedir('/workspaces', { metodo: 'POST', cuerpo: datos, token });
  return data.workspace;
}

export async function editarProyecto(token: string, id: string, datos: DatosProyecto): Promise<Proyecto> {
  const data = await pedir(`/workspaces/${id}`, { metodo: 'PATCH', cuerpo: datos, token });
  return data.workspace;
}

export async function eliminarProyecto(token: string, id: string): Promise<void> {
  await pedir(`/workspaces/${id}`, { metodo: 'DELETE', token });
}

// ---------------------------------------------------------------------------
// Dashboard por proyecto: métricas + último análisis
// ---------------------------------------------------------------------------

export type TipoMetrica =
  | 'seguidores'
  | 'alcance'
  | 'interacciones'
  | 'visitas_perfil'
  | 'vistas'
  | 'consultas'
  | 'clientes'
  | 'pedidos'
  | 'ventas_importe';

export type Metrica = {
  id?: string;
  tipo: TipoMetrica;
  valor: number | null;
  moneda: string | null;
  periodo: { inicio: string | null; fin: string | null };
  origen: 'manual' | 'instagram' | 'calculada' | 'analysis' | 'import' | 'simulada';
  estado: 'ok' | 'sin_datos' | 'permiso_faltante' | 'error';
  registradoEn?: string;
};

export type MetricasProyecto = {
  ultimas: Metrica[];
  historial: Metrica[];
  conversion: { valor: number | null; calculable: boolean } | null;
};

export type Nivel = 'alto' | 'medio' | 'bajo';

export type Analisis = {
  id: string;
  fecha: string;
  calidadContexto: 'completo' | 'parcial' | 'insuficiente' | null;
  resumen: string | null;
  escenario90d: { nivel: 'bajo' | 'base' | 'alto'; supuestos: string[]; limitaciones: string[] } | null;
  bloqueado: boolean;
  // Solo plan gratuito (vista previa)
  vistaPrevia?: {
    fortaleza: { texto: string } | null;
    riesgo: { texto: string } | null;
    oportunidad: { texto: string } | null;
  };
  // Solo plan Pro
  fortalezas?: { texto: string; evidencia: string }[];
  riesgos?: { texto: string; probabilidad: string; impacto: string; mitigacion: string }[];
  oportunidades?: { texto: string; relevancia: string; fuente: string }[];
  acciones?: { id: string; titulo: string; motivo: string | null; impacto: Nivel | null; esfuerzo: Nivel | null; metrica: string | null }[];
  advertencias?: string[];
};

export type DashboardProyecto = {
  sinAnalisis: boolean;
  analisis: Analisis | null;
};

export async function obtenerMetricas(token: string, proyectoId: string): Promise<MetricasProyecto> {
  const data = await pedir(`/workspaces/${proyectoId}/metrics?historial=1`, { token });
  return { ultimas: data.metricas ?? [], historial: data.historial ?? [], conversion: data.conversion ?? null };
}

export async function obtenerDashboard(token: string, proyectoId: string): Promise<DashboardProyecto> {
  const data = await pedir(`/workspaces/${proyectoId}/dashboard`, { token });
  return { sinAnalisis: !!data.sinAnalisis, analisis: data.analisis ?? null };
}

// ---------------------------------------------------------------------------
// Onboarding (después del registro)
// ---------------------------------------------------------------------------

export type Rango = { minimo: number; maximo: number };

export type ProyeccionInicial = {
  ventas: Rango;
  seguidores: Rango;
  supuestos: string[];
  advertencia: string;
};

// Sugiere 5 nombres con IA a partir de la idea. `evitar` = ya sugeridos.
export async function sugerirNombres(token: string, idea: string, evitar: string[] = []): Promise<string[]> {
  const data = await pedir('/onboarding/nombres', { metodo: 'POST', cuerpo: { idea, evitar }, token });
  return data.nombres;
}

// Ventas acumuladas hasta hoy, cargadas como métrica "pedidos" (cantidad de ventas).
export async function guardarVentasIniciales(token: string, proyectoId: string, cantidad: number): Promise<void> {
  const ahora = new Date().toISOString();
  await pedir(`/workspaces/${proyectoId}/metrics`, {
    metodo: 'POST',
    cuerpo: { metricas: [{ tipo: 'pedidos', valor: cantidad, periodo: { inicio: ahora, fin: ahora } }] },
    token,
  });
}

export async function obtenerProyeccionInicial(token: string, proyectoId: string): Promise<ProyeccionInicial> {
  const data = await pedir(`/onboarding/proyeccion/${proyectoId}`, { metodo: 'POST', token });
  return { ...data.proyeccion, advertencia: data.advertencia };
}
