// Formato uniforme de error para toda la API: { error: "mensaje", codigo: "slug" }.
// Los mensajes son legibles para el usuario; el codigo lo usa el frontend.

export function enviarError(res, status, codigo, mensaje) {
  return res.status(status).json({ error: mensaje, codigo });
}

// Envuelve un handler async para que cualquier throw caiga en el middleware de errores.
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
