import { randomUUID } from 'node:crypto';
import { getSupabase } from './supabase.js';

// Bucket privado para los archivos de los emprendimientos.
export const BUCKET = 'workspace-files';

let bucketOk = false;

// Crea el bucket si no existe (idempotente). Se llama al arrancar.
export async function ensureBucket() {
  if (bucketOk) return;
  const db = getSupabase();
  const { data } = await db.storage.getBucket(BUCKET);
  if (!data) {
    const { error } = await db.storage.createBucket(BUCKET, { public: false });
    if (error && !/already exists/i.test(error.message)) throw error;
  }
  bucketOk = true;
}

// Ruta no predecible: <workspaceId>/<uuid>.<ext>
export function nuevaClave(workspaceId, ext) {
  return `${workspaceId}/${randomUUID()}.${String(ext).toLowerCase()}`;
}

export async function subirArchivo(clave, buffer, mimeType) {
  const db = getSupabase();
  const { error } = await db.storage
    .from(BUCKET)
    .upload(clave, buffer, { contentType: mimeType || 'application/octet-stream', upsert: false });
  if (error) throw error;
}

export async function borrarArchivo(clave) {
  const db = getSupabase();
  await db.storage.from(BUCKET).remove([clave]);
}
