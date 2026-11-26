-- =====================================================================
-- Quinteto Pro · 005 · Plataforma: logos/banners de liga, miembros y
-- rutas reservadas.
-- Segura para producción: solo agrega objetos nuevos.
-- =====================================================================

begin;

-- Rutas propias de la plataforma que no pueden usarse como slug de liga.
alter table public.ligas drop constraint if exists ligas_slug_reservado;
alter table public.ligas add constraint ligas_slug_reservado check (
  slug not in (
    'admin', 'api', 'login', 'logout', 'registro', 'plataforma', 'ligas',
    'bienvenida', 'cuenta', 'quinteto', 'quinteto-pro',
    'planilla', 'calendario', 'clasificacion', 'equipos', 'estadisticas',
    'jugadores', 'mvp', 'partidos', 'resultados', 'galeria', 'ayuda',
    'precios', 'contacto', 'terminos', 'privacidad', 'static', 'public'
  )
);

-- Bucket para logos y banners de cada liga (carpeta <liga_id>/...).
insert into storage.buckets (id, name, public)
values ('Ligas', 'Ligas', true)
on conflict (id) do nothing;

create or replace function public.puede_administrar_archivo(bucket text, nombre text)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when bucket not in ('Equipos', 'Jugadores', 'jugadores', 'libavime-disenos', 'Ligas') then true
    when public.es_admin_plataforma() then true
    when public.liga_de_archivo(nombre) is not null
      then public.es_admin_liga(public.liga_de_archivo(nombre))
    -- En "Ligas" no hay archivos antiguos en la raíz.
    when bucket = 'Ligas' then false
    else public.es_admin_liga('00000000-0000-0000-0000-00000000a001')
  end;
$$;

drop policy if exists liga_storage_escribir on storage.objects;
drop policy if exists liga_storage_modificar on storage.objects;
drop policy if exists liga_storage_eliminar on storage.objects;
drop policy if exists liga_storage_lectura on storage.objects;
create policy liga_storage_escribir on storage.objects for insert to authenticated
  with check (bucket_id in ('Equipos', 'Jugadores', 'Ligas') and public.puede_administrar_archivo(bucket_id, name));
create policy liga_storage_modificar on storage.objects for update to authenticated
  using (bucket_id in ('Equipos', 'Jugadores', 'Ligas') and public.puede_administrar_archivo(bucket_id, name));
create policy liga_storage_eliminar on storage.objects for delete to authenticated
  using (bucket_id in ('Equipos', 'Jugadores', 'Ligas') and public.puede_administrar_archivo(bucket_id, name));
create policy liga_storage_lectura on storage.objects for select
  using (bucket_id in ('Equipos', 'Jugadores', 'libavime-disenos', 'Ligas'));

-- Buscar un usuario por correo (solo para el servidor: invitar miembros).
create or replace function public.usuario_por_correo(p_correo text)
returns uuid language sql stable security definer set search_path = public, auth as $$
  select id from auth.users where lower(email) = lower(trim(p_correo)) limit 1;
$$;
revoke all on function public.usuario_por_correo(text) from public, anon, authenticated;
grant execute on function public.usuario_por_correo(text) to service_role;

-- Rol de la persona en una liga (para la interfaz; RLS sigue decidiendo).
create or replace function public.mi_rol_en_liga(p_liga uuid)
returns text language sql stable security definer set search_path = public as $$
  select case
    when public.es_admin_liga(p_liga) then 'Administrador'
    when public.puede_planilla_liga(p_liga) then 'Planilla'
    when public.es_miembro_liga(p_liga) then 'Consulta'
    else null
  end;
$$;

commit;
