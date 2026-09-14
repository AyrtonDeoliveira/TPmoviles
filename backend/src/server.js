import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { meRouter } from './routes/me.js';
import { workspacesRouter } from './routes/workspaces.js';
import { enviarError } from './lib/respuestas.js';
import { ensureBucket } from './db/storage.js';
import { supabaseConfigurado } from './db/supabase.js';

const app = express();

// La app movil corre en otro origen (Expo), asi que habilitamos CORS.
app.use(cors());
app.use(express.json());

// Ruta raiz, solo para no ver un 404 al abrir el backend en el navegador.
app.get('/', (req, res) => {
  res.json({ mensaje: 'Backend del MVP. Ver /health, /health/db, /auth/*, /me, /workspaces' });
});

app.use('/health', healthRouter);
app.use('/auth', authRouter);
app.use('/me', meRouter);
app.use('/workspaces', workspacesRouter);

// 404
app.use((req, res) => {
  enviarError(res, 404, 'no_encontrado', `Ruta no encontrada: ${req.method} ${req.path}`);
});

// Manejador de errores: cualquier throw en un handler cae acá.
// Multer devuelve errores con .code (p. ej. LIMIT_FILE_SIZE).
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return enviarError(res, 413, 'archivo_grande', 'El archivo es demasiado grande.');
  }
  console.error('[error]', err);
  enviarError(res, 500, 'error_interno', 'Ocurrió un error inesperado.');
});

app.listen(config.puerto, async () => {
  console.log(`Backend escuchando en http://localhost:${config.puerto}`);
  console.log(`Probar: http://localhost:${config.puerto}/health`);
  if (supabaseConfigurado()) {
    try {
      await ensureBucket();
    } catch (e) {
      console.warn('[storage] no se pudo verificar el bucket:', e.message);
    }
  }
});
