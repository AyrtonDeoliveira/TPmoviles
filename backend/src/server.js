import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { meRouter } from './routes/me.js';
import { enviarError } from './lib/respuestas.js';

const app = express();

// La app movil corre en otro origen (Expo), asi que habilitamos CORS.
app.use(cors());
app.use(express.json());

// Ruta raiz, solo para no ver un 404 al abrir el backend en el navegador.
app.get('/', (req, res) => {
  res.json({ mensaje: 'Backend del MVP. Ver /health, /health/db, /auth/*, /me' });
});

app.use('/health', healthRouter);
app.use('/auth', authRouter);
app.use('/me', meRouter);

// 404
app.use((req, res) => {
  enviarError(res, 404, 'no_encontrado', `Ruta no encontrada: ${req.method} ${req.path}`);
});

// Manejador de errores: cualquier throw en un handler cae acá.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[error]', err);
  enviarError(res, 500, 'error_interno', 'Ocurrió un error inesperado.');
});

app.listen(config.puerto, () => {
  console.log(`Backend escuchando en http://localhost:${config.puerto}`);
  console.log(`Probar: http://localhost:${config.puerto}/health`);
});
