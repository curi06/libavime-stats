-- =====================================================================
-- Quinteto Pro · 004 · Almacenamiento (Storage) por liga
--
-- Fotos de jugadores, logos de equipos y diseños se guardan en una
-- carpeta por liga: <liga_id>/archivo. Cada administrador solo puede
-- subir, cambiar o borrar dentro de la carpeta de su liga.
--
-- Reemplaza las políticas libavime_storage_* de la auditoría del
-- 2026-11-26. Los archivos antiguos de LIBAVIME (en la raíz del bucket)
-- los siguen administrando los administradores de LIBAVIME.
-- =====================================================================

begin;

-- Buckets (en producción ya existen).
insert into storage.buckets (id, name, public) values
  ('Equipos', 'Equipos', true),
  ('Jugadores', 'Jugadores', true),
  ('libavime-disenos', 'libavime-disenos', true)
on conflict (id) do nothing;

-- uuid de la carpeta superior de un archivo, o null si no es un uuid.
create or replace function public.liga_de_archivo(nombre text)
returns uuid language plpgsql immutable as $$
begin
  return split_part(nombre, '/', 1)::uuid;
exception when others then
  return null;
end $$;

-- ¿Puede la persona administrar este archivo de Storage?
create or replace function public.puede_administrar_archivo(bucket text, nombre text)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when bucket not in ('Equipos', 'Jugadores', 'jugadores', 'libavime-disenos') then true
    when public.es_admin_plataforma() then true
    -- Archivos con carpeta de liga
    when public.liga_de_archivo(nombre) is not null
      then public.es_admin_liga(public.liga_de_archivo(nombre))
    -- Archivos antiguos en la raíz: liga principal (LIBAVIME)
    else public.es_admin_liga('00000000-0000-0000-0000-00000000a001')
  end;
$$;

-- Reemplaza las restricciones de la auditoría.
drop policy if exists libavime_storage_insertar on storage.objects;
drop policy if exists libavime_storage_actualizar on storage.objects;
drop policy if exists libavime_storage_borrar on storage.objects;
drop policy if exists liga_storage_insertar on storage.objects;
drop policy if exists liga_storage_actualizar on storage.objects;
drop policy if exists liga_storage_borrar on storage.objects;
drop policy if exists liga_storage_escribir on storage.objects;
drop policy if exists liga_storage_modificar on storage.objects;
drop policy if exists liga_storage_eliminar on storage.objects;
drop policy if exists liga_storage_lectura on storage.objects;

-- Restrictivas: aplican aunque existan políticas antiguas más abiertas.
create policy liga_storage_insertar on storage.objects as restrictive for insert
  with check (public.puede_administrar_archivo(bucket_id, name));
create policy liga_storage_actualizar on storage.objects as restrictive for update
  using (public.puede_administrar_archivo(bucket_id, name))
  with check (public.puede_administrar_archivo(bucket_id, name));
create policy liga_storage_borrar on storage.objects as restrictive for delete
  using (public.puede_administrar_archivo(bucket_id, name));

-- Permisivas para los buckets de las ligas (en proyectos nuevos no existen).
create policy liga_storage_escribir on storage.objects for insert to authenticated
  with check (bucket_id in ('Equipos', 'Jugadores') and public.puede_administrar_archivo(bucket_id, name));
create policy liga_storage_modificar on storage.objects for update to authenticated
  using (bucket_id in ('Equipos', 'Jugadores') and public.puede_administrar_archivo(bucket_id, name));
create policy liga_storage_eliminar on storage.objects for delete to authenticated
  using (bucket_id in ('Equipos', 'Jugadores') and public.puede_administrar_archivo(bucket_id, name));
create policy liga_storage_lectura on storage.objects for select
  using (bucket_id in ('Equipos', 'Jugadores', 'libavime-disenos'));

commit;
