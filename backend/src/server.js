import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 4000;

// La app movil corre en otro origen (Expo), asi que habilitamos CORS.
app.use(cors());
app.use(express.json());

// Momento en que arranco el proceso, para calcular hace cuanto esta vivo el server.
const arrancadoEn = new Date();

// Endpoint de salud: sirve para verificar desde la app que el backend responde.
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    servicio: 'backend-mvp',
    hora: new Date().toISOString(),
    arrancadoEn: arrancadoEn.toISOString(),
    uptimeSegundos: Math.round(process.uptime()),
  });
});

// Ruta raiz, solo para no ver un 404 al abrir el backend en el navegador.
app.get('/', (req, res) => {
  res.json({ mensaje: 'Backend del MVP. Probar GET /health' });
});

app.listen(PORT, () => {
  console.log(`Backend escuchando en http://localhost:${PORT}`);
  console.log(`Probar: http://localhost:${PORT}/health`);
});
