import Constants from 'expo-constants';

// URL del backend que consume la app.
//
// Prioridad:
// 1. EXPO_PUBLIC_API_URL (definida en mobile/.env) si esta seteada.
// 2. Si no, se deduce la IP de la PC a partir del host de Expo (Metro).
//    Esto hace que funcione en Expo Go sin hardcodear la IP, siempre que
//    el celular y la PC esten en la misma red Wi-Fi.
//
// Nota: en la app movil solo van configuraciones publicas (una URL).
// Las claves privadas (Supabase service role, IA) viven SOLO en el backend.

const PUERTO_BACKEND = 4000;

function resolverApiUrl(): string {
  const desdeEnv = process.env.EXPO_PUBLIC_API_URL;
  if (desdeEnv && desdeEnv.length > 0) {
    return desdeEnv.replace(/\/$/, '');
  }

  const hostDeExpo = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${hostDeExpo ?? 'localhost'}:${PUERTO_BACKEND}`;
}

export const API_URL = resolverApiUrl();
