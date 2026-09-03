# App para emprendedores — MVP

Aplicación móvil con IA para emprendedores. El usuario crea un espacio (workspace) para su
emprendimiento, carga información, ejecuta un análisis con IA, ve una estimación de crecimiento,
pasa por un paywall/suscripción de prueba y entra a un dashboard.

Entrega del MVP: **23/09/2026** (demo de punta a punta).

## Estructura del repositorio

| Carpeta     | Contenido                                                        |
|-------------|-----------------------------------------------------------------|
| `mobile/`   | App móvil en Expo / React Native (TypeScript).                  |
| `backend/`  | Backend propio en Node.js + Express. Ver `backend/README.md`.   |
| `docs/`     | Plan de trabajo, guía interna (PDF) y notas de diseño.         |

## Stack

- **App móvil:** Expo SDK 54 + React Native 0.81 + TypeScript
- **Backend:** Node.js + Express (pendiente)
- **Base de datos / Storage / Auth:** Supabase (PostgreSQL)
- **IA:** por definir

## Requisitos

- Node.js 20 o superior
- npm
- App **Expo Go** en el celular (compatible con **Expo SDK 54**), o un emulador Android / iOS

## Cómo correr la app móvil

```bash
git clone <URL-DEL-REPO>
cd TPmoviles/mobile
npm install
npm start
```

Se abre Expo en la terminal. Desde ahí:

- Escaneá el QR con **Expo Go** (Android) o la cámara (iOS).
- O presioná `a` para abrir en un emulador Android, `w` para abrir en el navegador.

La pantalla inicial hace un `GET /health` al backend y muestra si responde. Para verlo
conectado hay que levantar también el backend (abajo). La app deduce sola la URL del
backend; si necesitás forzarla, copiá `mobile/.env.example` a `mobile/.env` y seteá
`EXPO_PUBLIC_API_URL`.

## Cómo correr el backend

```bash
cd TPmoviles/backend
npm install
npm run dev
```

Queda en `http://localhost:4000`. Detalle completo en `backend/README.md`.

## Equipo

| Integrante | Rol                             |
|------------|---------------------------------|
| Ayrton     | Tech Lead · Backend + IA        |
| Lu         | UI/UX + Frontend                |
| Matu       | Producto · Investigación · QA   |
