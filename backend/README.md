# Backend — MVP

Backend propio en Node.js + Express. Acá va la lógica de negocio, la integración con IA
y las APIs externas. Supabase (PostgreSQL / Storage / Auth) se usa aparte como BaaS.

Por ahora solo tiene el endpoint de salud (`GET /health`) para verificar conectividad
desde la app.

## Requisitos

- Node.js 20 o superior
- npm

## Cómo correr

```bash
cd backend
npm install
cp .env.example .env   # en Windows: copy .env.example .env
npm run dev            # recarga al guardar (node --watch)
```

El server queda en `http://localhost:4000`.

## Endpoints

| Método | Ruta       | Descripción                          |
|--------|------------|--------------------------------------|
| GET    | `/`        | Mensaje de bienvenida.               |
| GET    | `/health`  | Estado del backend (status, hora, uptime). |

Ejemplo:

```bash
curl http://localhost:4000/health
```

```json
{
  "status": "ok",
  "servicio": "backend-mvp",
  "hora": "2026-08-29T21:00:00.000Z",
  "arrancadoEn": "2026-08-29T20:59:00.000Z",
  "uptimeSegundos": 60
}
```

## Probar desde la app móvil

Con el backend corriendo, abrí la app (`cd mobile && npm start`). La pantalla inicial
hace un `GET /health` y muestra si el backend responde.

- **Navegador / emulador:** usa `http://localhost:4000`.
- **Celular con Expo Go:** usa la IP de la PC en la red local. La app la deduce sola a
  partir del host de Expo (Metro), así que la PC y el celular tienen que estar en la
  misma red Wi-Fi.
