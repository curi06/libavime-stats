-- =====================================================================
-- LIBAVIME · Restricción de escrituras (RLS)
--
-- Las políticas existentes permitían a CUALQUIER usuario autenticado
-- crear, editar y borrar equipos, jugadores, partidos y estadísticas.
-- Con el registro público abierto, eso incluía a desconocidos.
--
-- Estas políticas son RESTRICTIVAS: se combinan con AND con las
-- existentes, así que no cambian las lecturas y solo limitan quién
-- escribe. Usan el sistema de roles ya existente (admin_usuarios):
--   es_administrador()        → rol 'Administrador' activo
--   usuario_puede_planilla()  → puede_planilla = true y activo
--
-- Las rutas /api usan la service role, que ignora RLS.
-- Aplicado el 2026-11-26.
-- =====================================================================

begin;

-- ----- equipos y jugadores: solo administradores ---------------------
do $$
declare t text;
begin
  foreach t in array array['equipos', 'jugadores'] loop
    execute format('drop policy if exists libavime_solo_insertar on public.%I', t);
    execute format('drop policy if exists libavime_solo_actualizar on public.%I', t);
    execute format('drop policy if exists libavime_solo_borrar on public.%I', t);
    execute format('create policy libavime_solo_insertar on public.%I as restrictive for insert to public with check ((select public.es_administrador()))', t);
    execute format('create policy libavime_solo_actualizar on public.%I as restrictive for update to public using ((select public.es_administrador())) with check ((select public.es_administrador()))', t);
    execute format('create policy libavime_solo_borrar on public.%I as restrictive for delete to public using ((select public.es_administrador()))', t);
  end loop;
end $$;

-- ----- partidos: crear/borrar admin; actualizar admin o planilla ------
drop policy if exists libavime_solo_insertar on public.partidos;
drop policy if exists libavime_solo_actualizar on public.partidos;
drop policy if exists libavime_solo_borrar on public.partidos;
create policy libavime_solo_insertar on public.partidos as restrictive for insert
  with check ((select public.es_administrador()));
create policy libavime_solo_actualizar on public.partidos as restrictive for update
  using ((select public.es_administrador()) or (select public.usuario_puede_planilla()))
  with check ((select public.es_administrador()) or (select public.usuario_puede_planilla()));
create policy libavime_solo_borrar on public.partidos as restrictive for delete
  using ((select public.es_administrador()));

-- ----- estadisticas_partido: escribir admin o planilla; borrar admin --
drop policy if exists libavime_solo_insertar on public.estadisticas_partido;
drop policy if exists libavime_solo_actualizar on public.estadisticas_partido;
drop policy if exists libavime_solo_borrar on public.estadisticas_partido;
create policy libavime_solo_insertar on public.estadisticas_partido as restrictive for insert
  with check ((select public.es_administrador()) or (select public.usuario_puede_planilla()));
create policy libavime_solo_actualizar on public.estadisticas_partido as restrictive for update
  using ((select public.es_administrador()) or (select public.usuario_puede_planilla()))
  with check ((select public.es_administrador()) or (select public.usuario_puede_planilla()));
create policy libavime_solo_borrar on public.estadisticas_partido as restrictive for delete
  using ((select public.es_administrador()));

-- ----- Storage: fotos, logos y diseños solo administradores -----------
drop policy if exists libavime_storage_insertar on storage.objects;
drop policy if exists libavime_storage_actualizar on storage.objects;
drop policy if exists libavime_storage_borrar on storage.objects;
create policy libavime_storage_insertar on storage.objects as restrictive for insert
  with check (bucket_id not in ('Equipos', 'Jugadores', 'jugadores', 'libavime-disenos')
              or (select public.es_administrador()));
create policy libavime_storage_actualizar on storage.objects as restrictive for update
  using (bucket_id not in ('Equipos', 'Jugadores', 'jugadores', 'libavime-disenos')
         or (select public.es_administrador()));
create policy libavime_storage_borrar on storage.objects as restrictive for delete
  using (bucket_id not in ('Equipos', 'Jugadores', 'jugadores', 'libavime-disenos')
         or (select public.es_administrador()));

commit;

-- ---------------------------------------------------------------------
-- REVERTIR: borra las políticas restrictivas y todo vuelve a como estaba.
-- ---------------------------------------------------------------------
-- do $$ declare t text; begin
--   foreach t in array array['equipos','jugadores','partidos','estadisticas_partido'] loop
--     execute format('drop policy if exists libavime_solo_insertar on public.%I', t);
--     execute format('drop policy if exists libavime_solo_actualizar on public.%I', t);
--     execute format('drop policy if exists libavime_solo_borrar on public.%I', t);
--   end loop; end $$;
-- drop policy if exists libavime_storage_insertar   on storage.objects;
-- drop policy if exists libavime_storage_actualizar on storage.objects;
-- drop policy if exists libavime_storage_borrar     on storage.objects;
