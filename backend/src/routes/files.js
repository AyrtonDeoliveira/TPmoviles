import { Router } from 'express';
import multer from 'multer';
import { getSupabase } from '../db/supabase.js';
import { nuevaClave, subirArchivo, borrarArchivo } from '../db/storage.js';
import { asyncHandler, enviarError } from '../lib/respuestas.js';
import {
  getPlanDeUsuario,
  puedeSubirArchivo,
  bytesUsados,
  mbAmenosBytes,
  BYTES_POR_MB,
  FORMATOS_ARCHIVO,
} from '../plans/limites.js';

export const filesRouter = Router({ mergeParams: true });

// 12 MB de tope duro en multer (el límite real por plan se valida después).
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024 } });

const EXT_POR_MIME = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt',
  'text/csv': 'csv',
  'application/csv': 'csv',
};

function extDe(file) {
  const porNombre = (file.originalname.split('.').pop() || '').toLowerCase();
  if (FORMATOS_ARCHIVO.includes(porNombre)) return porNombre;
  return EXT_POR_MIME[file.mimetype] || porNombre;
}

function serializar(f) {
  return {
    id: f.id,
    nombre: f.name,
    tipo: f.mime_type,
    tamanioBytes: Number(f.size_bytes),
    estado: f.process_status,
    creadoEn: f.created_at,
  };
}

// GET /workspaces/:id/files
filesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const db = getSupabase();
    const { data, error } = await db
      .from('files')
      .select('*')
      .eq('workspace_id', req.workspace.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ archivos: data.map(serializar) });
  })
);

// POST /workspaces/:id/files — sube un archivo (campo "archivo").
filesRouter.post(
  '/',
  upload.single('archivo'),
  asyncHandler(async (req, res) => {
    if (!req.file) return enviarError(res, 400, 'sin_archivo', 'Adjuntá un archivo en el campo "archivo".');
    if (req.file.size === 0) return enviarError(res, 400, 'archivo_vacio', 'El archivo está vacío.');

    const ext = extDe(req.file);
    const tamanioMb = req.file.size / BYTES_POR_MB;

    const plan = await getPlanDeUsuario(req.usuario.id);
    const usadoMb = (await bytesUsados(req.usuario.id)) / BYTES_POR_MB;
    const check = puedeSubirArchivo(plan, { tamanioMb, storageUsadoMb: usadoMb, extension: ext });
    if (!check.permitido) {
      const map = {
        formato_no_admitido: [415, `Formato no admitido. Se aceptan: ${FORMATOS_ARCHIVO.join(', ')}.`],
        archivo_grande: [413, `El archivo supera el máximo de ${check.max_file_mb} MB.`],
        storage_lleno: [403, `No hay espacio: tu plan permite ${check.max_storage_mb} MB en total.`],
      };
      const [status, msg] = map[check.motivo] ?? [400, 'No se pudo subir el archivo.'];
      return res.status(status).json({ error: msg, codigo: check.motivo, ...check });
    }

    const clave = nuevaClave(req.workspace.id, ext);
    await subirArchivo(clave, req.file.buffer, req.file.mimetype);

    // Sin extracción de texto todavía (Semana 3): se guarda como "procesado".
    const db = getSupabase();
    const { data, error } = await db
      .from('files')
      .insert({
        workspace_id: req.workspace.id,
        uploaded_by: req.usuario.id,
        name: req.file.originalname,
        mime_type: req.file.mimetype,
        size_bytes: req.file.size,
        storage_path: clave,
        process_status: 'procesado',
      })
      .select('*')
      .single();
    if (error) {
      await borrarArchivo(clave);
      throw error;
    }
    res.status(201).json({ archivo: serializar(data) });
  })
);

// DELETE /workspaces/:id/files/:fileId — quita del contexto y libera cuota.
filesRouter.delete(
  '/:fileId',
  asyncHandler(async (req, res) => {
    const db = getSupabase();
    const { data: file } = await db
      .from('files')
      .select('*')
      .eq('id', req.params.fileId)
      .eq('workspace_id', req.workspace.id)
      .maybeSingle();
    if (!file) return enviarError(res, 404, 'no_encontrado', 'Archivo no encontrado.');

    await borrarArchivo(file.storage_path);
    const { error } = await db.from('files').delete().eq('id', file.id);
    if (error) throw error;
    res.json({ ok: true });
  })
);
