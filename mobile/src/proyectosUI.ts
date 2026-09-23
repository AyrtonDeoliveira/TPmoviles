import { Ionicons } from '@expo/vector-icons';
import { Etapa, Objetivo } from './api';

export const ETAPAS: { id: Etapa; etiqueta: string; icono: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'idea', etiqueta: 'Idea', icono: 'bulb-outline' },
  { id: 'lanzamiento', etiqueta: 'Lanzamiento', icono: 'rocket-outline' },
  { id: 'ventas', etiqueta: 'Ventas', icono: 'cart-outline' },
  { id: 'crecimiento', etiqueta: 'Crecimiento', icono: 'trending-up-outline' },
];

export const OBJETIVOS: { id: Objetivo; etiqueta: string }[] = [
  { id: 'ventas', etiqueta: 'Ventas' },
  { id: 'alcance', etiqueta: 'Alcance' },
  { id: 'consultas', etiqueta: 'Consultas' },
  { id: 'clientes', etiqueta: 'Clientes' },
  { id: 'validacion', etiqueta: 'Validación' },
  { id: 'otro', etiqueta: 'Otro' },
];

export function etapaInfo(id: Etapa) {
  return ETAPAS.find((e) => e.id === id) ?? ETAPAS[0];
}

export function etiquetaObjetivo(id: Objetivo, nota: string | null) {
  if (id === 'otro' && nota) return nota;
  return OBJETIVOS.find((o) => o.id === id)?.etiqueta ?? id;
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function formatearFecha(iso: string) {
  const f = new Date(iso);
  if (Number.isNaN(f.getTime())) return '';
  return `${f.getDate()} ${MESES[f.getMonth()]} ${f.getFullYear()}`;
}
