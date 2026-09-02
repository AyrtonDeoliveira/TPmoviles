import 'dotenv/config';

// Unico lugar donde se leen variables de entorno.
// El resto del backend importa `config` desde aca, nunca `process.env` directo.

function leer(nombre, { obligatoria = false, porDefecto = undefined } = {}) {
  const valor = process.env[nombre];
  if (valor === undefined || valor === '') {
    if (obligatoria) {
      throw new Error(`Falta la variable de entorno obligatoria: ${nombre}`);
    }
    return porDefecto;
  }
  return valor;
}

export const config = {
  puerto: Number(leer('PORT', { porDefecto: 4000 })),
  entorno: leer('NODE_ENV', { porDefecto: 'development' }),

  // Supabase: todavia no se usa. Se completa en la Semana 1-2.
  // Cuando exista la integracion, pasar estas a { obligatoria: true }.
  supabase: {
    url: leer('SUPABASE_URL'),
    serviceRoleKey: leer('SUPABASE_SERVICE_ROLE_KEY'),
  },

  // Proveedor de IA: a definir.
  ia: {
    apiKey: leer('IA_API_KEY'),
  },
};

// Aviso (sin cortar el arranque) si falta configuracion que mas adelante sera necesaria.
const pendientes = [];
if (!config.supabase.url) pendientes.push('SUPABASE_URL');
if (!config.supabase.serviceRoleKey) pendientes.push('SUPABASE_SERVICE_ROLE_KEY');
if (pendientes.length > 0) {
  console.warn(`[config] Sin configurar todavia: ${pendientes.join(', ')}`);
}
