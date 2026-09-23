// Tema visual de la app — EmPrendex.
// Todo lo que sea color, tipografía, espaciado y radios vive ACÁ. Las
// pantallas importan de este archivo y no hardcodean valores sueltos, así
// cambiar la identidad visual es tocar un solo lugar.

// ---------------------------------------------------------------------------
// Paleta de marca (dada por el equipo). Regla de uso:
//   · violeta   -> color principal (casi todo: chrome, tarjetas, botones)
//   · naranja   -> "folios": archivos, recursos, proyectos
//   · verde     -> cuenta, ayuda/manual, estado de conexión
// ---------------------------------------------------------------------------
export const marca = {
  violetaOscuro: '#49354f',
  violetaMalva: '#76566f',
  violetaVivo: '#6f3a86',
  naranja: '#d97845',
  dorado: '#c58a4a',
  verde: '#82b85b',
};

// Neutros derivados de la marca (no vinieron en la paleta; hacen falta para
// que haya contraste real en un tema oscuro). Si en algún momento el equipo
// define estos valores a mano, se reemplazan acá y ya está.
const neutros = {
  fondo: '#1c151f',
  fondoSuave: '#241b28',
  borde: 'rgba(255,255,255,0.08)',
  textoPrimario: '#f6f2f8',
  textoSecundario: '#c9bcce',
  textoTerciario: '#8f8093',
};

export const color = {
  ...marca,
  ...neutros,
  blanco: '#ffffff',
  peligro: '#c85a5a',
};

// Pares para expo-linear-gradient (siempre array de 2, tipado como tupla).
export const degrade = {
  hero: [color.violetaVivo, color.violetaOscuro] as [string, string],
  cta: [color.naranja, color.dorado] as [string, string],
  logo: [color.naranja, color.violetaVivo] as [string, string],
  // Botón principal de login/registro: el mockup lo lleva del naranja a un
  // rosado que no está en la paleta base (derivado, igual que los neutros).
  acceso: [color.naranja, '#c4506a'] as [string, string],
};

export const radio = { sm: 10, md: 14, lg: 18, xl: 24, pill: 999 };

export const espacio = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const tipografia = {
  h1: { fontSize: 24, fontWeight: '700' as const, color: color.textoPrimario },
  h2: { fontSize: 17, fontWeight: '700' as const, color: color.textoPrimario },
  cuerpo: { fontSize: 14, fontWeight: '400' as const, color: color.textoPrimario },
  subtitulo: { fontSize: 13, fontWeight: '400' as const, color: color.textoSecundario },
  chico: { fontSize: 12, fontWeight: '400' as const, color: color.textoTerciario },
  boton: { fontSize: 14, fontWeight: '700' as const, color: color.blanco },
};

export const sombra = {
  tarjeta: {
    boxShadow: '0px 6px 12px rgba(0,0,0,0.25)',
  },
};
