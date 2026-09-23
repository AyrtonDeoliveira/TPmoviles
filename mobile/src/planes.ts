// Textos de los planes para el paywall. Espejo de los límites CONGELADOS del
// backend (backend/src/plans/limites.js): si cambian allá, cambian acá.

export type Caracteristica = { texto: string; incluida: boolean };

export const PLAN_GRATUITO = {
  nombre: 'Plan Gratuito',
  lema: 'Ideal para empezar',
  precio: '$0',
  periodo: 'para siempre',
  caracteristicas: [
    { texto: '1 proyecto', incluida: true },
    { texto: 'Almacenamiento (50 MB)', incluida: true },
    { texto: '1 análisis de prueba por mes', incluida: true },
    { texto: 'Historial de 1 mes', incluida: true },
    { texto: 'Análisis completos con IA', incluida: false },
    { texto: 'Hasta 5 proyectos', incluida: false },
    { texto: 'Historial de 12 meses', incluida: false },
  ] as Caracteristica[],
};

export const PLAN_PRO = {
  nombre: 'Plan Pro',
  lema: 'Todo para hacer crecer tu idea',
  precio: '$9.99',
  periodo: '/ mes',
  caracteristicas: [
    { texto: 'Hasta 5 proyectos', incluida: true },
    { texto: '20 análisis completos por mes', incluida: true },
    { texto: 'Análisis de redes y mercado con IA', incluida: true },
    { texto: 'Almacenamiento en la nube (1 GB)', incluida: true },
    { texto: 'Historial de 12 meses', incluida: true },
  ] as Caracteristica[],
};
