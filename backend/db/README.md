# Base de datos

Modelo de datos del MVP en PostgreSQL (Supabase).

| Archivo        | Qué es                                                        |
|----------------|-------------------------------------------------------------|
| `schema.sql`   | Esquema completo: tablas, índices, RLS, triggers, planes.   |
| `seed.sql`     | Datos de ejemplo para desarrollo (opcional).               |

La descripción tabla por tabla y el diagrama están en
[`../../docs/modelo-de-datos.md`](../../docs/modelo-de-datos.md).

Tablas: `plans`, `users`, `subscriptions`, `workspaces`, `files`, `metrics`,
`analyses`, `actions`. Alineado con la especificación funcional de Semana 1
(`docs/semana_1_matu_producto_investigacion_qa.pdf`).

## Cómo aplicar el esquema

1. Entrar a **Supabase Studio → SQL Editor**.
2. Pegar el contenido de `schema.sql` y ejecutar.
3. Listo. Es idempotente: se puede volver a correr sin romper nada.

Cuando esté el proyecto de Supabase creado, esto se puede pasar a migraciones
versionadas con el CLI de Supabase (`supabase/migrations/`). Por ahora alcanza
con el SQL Editor.

## Datos de ejemplo

1. Registrar un usuario (desde la app o Supabase Studio → Authentication).
2. Copiar su UID.
3. En `seed.sql`, reemplazar el UUID placeholder por ese UID.
4. Ejecutar `seed.sql` en el SQL Editor.

## Notas

- El backend se conecta con la **service role key** y saltea RLS; hace su
  propia autorización en Express. Las políticas RLS son una segunda barrera.
- Alta de usuario: un trigger sobre `auth.users` crea el perfil en
  `public.users` y una suscripción `free` activa automáticamente.
- Plan efectivo de un usuario: vista `public.user_current_plan`.
