import { Ionicons } from '@expo/vector-icons';
import { Metrica, TipoMetrica } from './api';
import { PuntoGrafico } from './GraficoArea';

export const INFO_METRICA: Record<TipoMetrica, { etiqueta: string; icono: keyof typeof Ionicons.glyphMap }> = {
  seguidores: { etiqueta: 'Seguidores', icono: 'people' },
  alcance: { etiqueta: 'Alcance', icono: 'megaphone-outline' },
  interacciones: { etiqueta: 'Interacciones', icono: 'heart-outline' },
  visitas_perfil: { etiqueta: 'Visitas al perfil', icono: 'person-outline' },
  vistas: { etiqueta: 'Vistas', icono: 'eye-outline' },
  consultas: { etiqueta: 'Consultas', icono: 'chatbubble-outline' },
  clientes: { etiqueta: 'Clientes', icono: 'people-outline' },
  pedidos: { etiqueta: 'Ventas', icono: 'cart-outline' },
  ventas_importe: { etiqueta: 'Ingresos', icono: 'cash-outline' },
};

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function fechaCorta(iso: string | null | undefined) {
  if (!iso) return '';
  const f = new Date(iso);
  if (Number.isNaN(f.getTime())) return '';
  return `${f.getDate()} ${MESES[f.getMonth()]}`;
}

// 12400 -> "12,4K", 1250000 -> "1,25M", 380 -> "380".
export function formatoCompacto(n: number) {
  const abs = Math.abs(n);
  const cortar = (v: number, dec: number) => {
    const t = v.toFixed(dec);
    return (t.includes('.') ? t.replace(/\.?0+$/, '') : t).replace('.', ',');
  };
  if (abs >= 1_000_000) return `${cortar(n / 1_000_000, 2)}M`;
  if (abs >= 10_000) return `${cortar(n / 1_000, 1)}K`;
  if (abs >= 1_000) return `${cortar(n / 1_000, 2)}K`;
  return cortar(n, Number.isInteger(n) ? 0 : 1);
}

export function formatoMetrica(m: { tipo: TipoMetrica; moneda?: string | null }, valor: number) {
  if (m.tipo === 'ventas_importe') {
    const simbolo = !m.moneda || ['ARS', 'USD', 'MXN', 'CLP', 'COP', 'UYU'].includes(m.moneda) ? '$' : m.moneda;
    return `${simbolo}${formatoCompacto(valor)}`;
  }
  return formatoCompacto(valor);
}

const validas = (m: Metrica) => m.estado === 'ok' && m.valor !== null;

function fechaDe(m: Metrica) {
  return new Date(m.periodo.fin ?? m.registradoEn ?? 0).getTime();
}

// Registros de un tipo, del más viejo al más nuevo.
export function serieDeTipo(historial: Metrica[], tipo: TipoMetrica): Metrica[] {
  return historial.filter((m) => m.tipo === tipo && validas(m)).sort((a, b) => fechaDe(a) - fechaDe(b));
}

export function puntosDeSerie(serie: Metrica[]): PuntoGrafico[] {
  return serie.map((m) => ({ valor: m.valor as number, etiqueta: fechaCorta(m.periodo.fin ?? m.registradoEn) }));
}

// Variación % entre los dos últimos registros (null si no se puede calcular).
export function variacion(serie: Metrica[]): number | null {
  if (serie.length < 2) return null;
  const prev = serie[serie.length - 2].valor as number;
  const ult = serie[serie.length - 1].valor as number;
  if (prev <= 0) return null;
  return ((ult - prev) / prev) * 100;
}

export function textoVariacion(v: number) {
  const signo = v > 0 ? '+' : '';
  return `${signo}${v.toFixed(1).replace('.', ',')}%`;
}

export const ETIQUETA_ORIGEN: Record<Metrica['origen'], string> = {
  manual: 'Carga manual',
  instagram: 'Instagram',
  calculada: 'Calculada',
  analysis: 'Análisis',
  import: 'Importada',
  simulada: 'Datos simulados (demo)',
};
