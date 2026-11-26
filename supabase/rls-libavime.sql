-- =====================================================================
-- LIBAVIME · Políticas de seguridad (RLS)
-- Ejecutar en Supabase → SQL Editor.
--
-- ANTES DE EJECUTAR:
--   1. Reemplaza TU_CORREO_ADMIN@ejemplo.com (paso 1) por el correo de
--      LIBAVIME_ADMIN_EMAIL.
--   2. Ejecuta primero el PASO 0 (solo lectura) y guarda el resultado,
--      por si necesitas comparar o revertir.
--
-- Qué hace:
--   - Todos pueden LEER (las páginas públicas lo necesitan).
--   - Solo la administradora escribe en equipos y jugadores.
--   - Administradora o usuarios de planilla (usuario_puede_planilla())
--     escriben en partidos y estadisticas_partido.
--   - libavime_disenos y libavime_configuracion: nadie escribe desde el
--     navegador; las rutas /api usan la service role (que ignora RLS).
--   - Buckets Equipos y Jugadores: solo la administradora sube/borra.
--
-- Las políticas "restrictivas" se combinan con AND con las que ya
-- existan, así que cierran el acceso aunque haya políticas viejas
-- más permisivas.
-- =====================================================================


-- ---------------------------------------------------------------------
-- PASO 0 · Diagnóstico (solo lectura)
-- ---------------------------------------------------------------------
-- select tablename, rowsecurity from pg_tables
--  where schemaname = 'public'
--    and tablename in ('equipos','jugadores','partidos','estadisticas_partido',
--                      'libavime_disenos','libavime_configuracion');
--
-- select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
--   from pg_policies
--  where schemaname in ('public','storage')
--  order by tablename, policyname;


-- ---------------------------------------------------------------------
-- PASO 1 · Función que identifica a la administradora
-- ---------------------------------------------------------------------
create or replace function public.es_admin_libavime()
returns boolean
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''))
       = lower('TU_CORREO_ADMIN@ejemplo.com');
$$;


-- ---------------------------------------------------------------------
-- PASO 2 · Tablas
-- ---------------------------------------------------------------------
do $$
declare
  t record;
  cond text;
begin
  for t in
    select * from (values
      ('equipos',                'public.es_admin_libavime()'),
      ('jugadores',              'public.es_admin_libavime()'),
      ('partidos',               'public.es_admin_libavime() or public.usuario_puede_planilla()'),
      ('estadisticas_partido',   'public.es_admin_libavime() or public.usuario_puede_planilla()'),
      ('libavime_disenos',       'false'),
      ('libavime_configuracion', 'false')
    ) as v(tabla, condicion)
  loop
    cond := t.condicion;

    execute format('alter table public.%I enable row level security', t.tabla);

    -- Lectura pública (no aplica a configuración ni diseños: los sirve /api)
    execute format('drop policy if exists libavime_lectura on public.%I', t.tabla);
    if t.tabla not in ('libavime_disenos', 'libavime_configuracion') then
      execute format(
        'create policy libavime_lectura on public.%I for select using (true)',
        t.tabla);
    end if;

    -- Permisivas: conceden la escritura a quien corresponde
    execute format('drop policy if exists libavime_insertar on public.%I', t.tabla);
    execute format('drop policy if exists libavime_actualizar on public.%I', t.tabla);
    execute format('drop policy if exists libavime_borrar on public.%I', t.tabla);
    execute format('create policy libavime_insertar on public.%I for insert to authenticated with check (%s)', t.tabla, cond);
    execute format('create policy libavime_actualizar on public.%I for update to authenticated using (%s) with check (%s)', t.tabla, cond, cond);
    execute format('create policy libavime_borrar on public.%I for delete to authenticated using (%s)', t.tabla, cond);

    -- Restrictivas: bloquean a todos los demás aunque existan políticas viejas
    execute format('drop policy if exists libavime_solo_insertar on public.%I', t.tabla);
    execute format('drop policy if exists libavime_solo_actualizar on public.%I', t.tabla);
    execute format('drop policy if exists libavime_solo_borrar on public.%I', t.tabla);
    execute format('create policy libavime_solo_insertar on public.%I as restrictive for insert with check (%s)', t.tabla, cond);
    execute format('create policy libavime_solo_actualizar on public.%I as restrictive for update using (%s) with check (%s)', t.tabla, cond, cond);
    execute format('create policy libavime_solo_borrar on public.%I as restrictive for delete using (%s)', t.tabla, cond);
  end loop;
end $$;


-- ---------------------------------------------------------------------
-- PASO 3 · Storage (logos de equipos y fotos de jugadores)
-- ---------------------------------------------------------------------
drop policy if exists libavime_storage_insertar on storage.objects;
drop policy if exists libavime_storage_actualizar on storage.objects;
drop policy if exists libavime_storage_borrar on storage.objects;

create policy libavime_storage_insertar on storage.objects
  as restrictive for insert
  with check (bucket_id not in ('Equipos', 'Jugadores') or public.es_admin_libavime());

create policy libavime_storage_actualizar on storage.objects
  as restrictive for update
  using (bucket_id not in ('Equipos', 'Jugadores') or public.es_admin_libavime());

create policy libavime_storage_borrar on storage.objects
  as restrictive for delete
  using (bucket_id not in ('Equipos', 'Jugadores') or public.es_admin_libavime());


-- ---------------------------------------------------------------------
-- REVERTIR (si algo deja de funcionar)
-- ---------------------------------------------------------------------
-- Borra solo las políticas restrictivas de una tabla, p. ej. partidos:
--   drop policy libavime_solo_insertar   on public.partidos;
--   drop policy libavime_solo_actualizar on public.partidos;
--   drop policy libavime_solo_borrar     on public.partidos;
-- Storage:
--   drop policy libavime_storage_insertar   on storage.objects;
--   drop policy libavime_storage_actualizar on storage.objects;
--   drop policy libavime_storage_borrar     on storage.objects;
