-- =====================================================================
-- Quinteto Pro · 002 · Conversión a plataforma multi-liga
--
-- Diseñada para correr también en PRODUCCIÓN sin romper el sitio actual:
--   * Todos los datos existentes quedan asignados a la liga LIBAVIME.
--   * liga_id tiene, por ahora, LIBAVIME como valor por defecto, así el
--     código actual (que no envía liga_id) sigue funcionando. Cuando el
--     código ya envíe liga_id, la migración 003 quitará ese valor.
--   * Los permisos antiguos (admin_usuarios / es_administrador) siguen
--     valiendo para LIBAVIME durante la transición.
--   * El módulo de tesorería (admin_cuotas, admin_pagos, ...) no se toca.
--
-- Todo corre en una transacción: si algo falla, no se aplica nada.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Tablas de la plataforma
-- ---------------------------------------------------------------------
create table if not exists public.ligas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nombre text not null check (length(nombre) between 3 and 120),
  nombre_corto text check (length(nombre_corto) <= 30),
  descripcion text check (length(descripcion) <= 600),
  ciudad text,
  logo_url text,
  banner_url text,
  color_primario text not null default '#1e3a8a',
  color_secundario text not null default '#dc2626',
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'activa', 'suspendida')),
  plan text not null default 'gratis',
  creada_en timestamptz not null default now(),
  aprobada_en timestamptz,
  -- slug: minúsculas, números y guiones; sin chocar con rutas del sitio.
  constraint ligas_slug_formato check (
    slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 3 and 40
  ),
  constraint ligas_slug_reservado check (
    slug not in (
      'admin', 'api', 'login', 'logout', 'registro', 'plataforma', 'ligas',
      'planilla', 'calendario', 'clasificacion', 'equipos', 'estadisticas',
      'jugadores', 'mvp', 'partidos', 'resultados', 'galeria', 'ayuda',
      'precios', 'contacto', 'terminos', 'privacidad', 'static', 'public'
    )
  )
);

create table if not exists public.administradores_plataforma (
  usuario_id uuid primary key references auth.users (id) on delete cascade,
  creado_en timestamptz not null default now()
);

create table if not exists public.miembros_liga (
  liga_id uuid not null references public.ligas (id) on delete cascade,
  usuario_id uuid not null references auth.users (id) on delete cascade,
  rol text not null default 'Consulta'
    check (rol in ('Administrador', 'Planilla', 'Consulta')),
  puede_planilla boolean not null default false,
  activo boolean not null default true,
  nombre text,
  correo text,
  creado_en timestamptz not null default now(),
  primary key (liga_id, usuario_id)
);
create index if not exists miembros_liga_usuario_idx on public.miembros_liga (usuario_id);

create table if not exists public.solicitudes_liga (
  id uuid primary key default gen_random_uuid(),
  nombre_liga text not null check (length(nombre_liga) between 3 and 120),
  slug_deseado text,
  ciudad text,
  contacto_nombre text not null check (length(contacto_nombre) between 2 and 120),
  contacto_correo text not null check (contacto_correo ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  contacto_telefono text,
  mensaje text check (length(mensaje) <= 1000),
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'aprobada', 'rechazada')),
  liga_id uuid references public.ligas (id) on delete set null,
  creada_en timestamptz not null default now(),
  revisada_en timestamptz
);

-- ---------------------------------------------------------------------
-- 2. LIBAVIME, primera liga de la plataforma (id fijo)
-- ---------------------------------------------------------------------
insert into public.ligas (
  id, slug, nombre, nombre_corto, descripcion, ciudad,
  logo_url, banner_url, color_primario, color_secundario, estado, aprobada_en
) values (
  '00000000-0000-0000-0000-00000000a001',
  'libavime',
  'Liga de Baloncesto de Visitadores a Médicos',
  'LIBAVIME',
  'Liga de baloncesto de visitadores a médicos de Santo Domingo.',
  'Santo Domingo',
  '/logos/LIBAVIME.png',
  '/banners/libavime-banner-2026.png',
  '#1e3a8a',
  '#dc2626',
  'activa',
  now()
) on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 3. liga_id en todas las tablas de la liga
-- ---------------------------------------------------------------------
do $$
declare
  t text;
  libavime constant uuid := '00000000-0000-0000-0000-00000000a001';
begin
  foreach t in array array[
    'admin_temporadas', 'equipos', 'jugadores', 'partidos',
    'estadisticas_partido', 'libavime_disenos', 'libavime_configuracion'
  ] loop
    execute format('alter table public.%I add column if not exists liga_id uuid', t);
    execute format('update public.%I set liga_id = %L where liga_id is null', t, libavime);
    -- Transitorio (ver encabezado): el código actual no envía liga_id.
    execute format('alter table public.%I alter column liga_id set default %L', t, libavime);
    execute format('alter table public.%I alter column liga_id set not null', t);

    if not exists (
      select 1 from pg_constraint
      where conname = t || '_liga_fk' and conrelid = ('public.' || t)::regclass
    ) then
      -- restrict: borrar una liga exige borrar antes sus datos a propósito.
      execute format(
        'alter table public.%I add constraint %I foreign key (liga_id) references public.ligas (id) on delete restrict',
        t, t || '_liga_fk'
      );
    end if;

    execute format('create index if not exists %I on public.%I (liga_id)', t || '_liga_idx', t);
  end loop;
end $$;

-- Slugs únicos dentro de cada liga (dos ligas pueden tener "titanes").
create unique index if not exists equipos_liga_slug_unico
  on public.equipos (liga_id, slug) where slug is not null;
create unique index if not exists jugadores_liga_slug_unico
  on public.jugadores (liga_id, slug) where slug is not null;

-- ---------------------------------------------------------------------
-- 4. Funciones de permisos por liga
-- ---------------------------------------------------------------------
create or replace function public.es_admin_plataforma()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.administradores_plataforma where usuario_id = auth.uid());
$$;

create or replace function public.es_miembro_liga(p_liga uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.es_admin_plataforma()
    or exists (
      select 1 from public.miembros_liga
      where liga_id = p_liga and usuario_id = auth.uid() and activo
    )
    -- Transición: los usuarios de admin_usuarios siguen siendo de LIBAVIME.
    or (p_liga = '00000000-0000-0000-0000-00000000a001' and exists (
      select 1 from public.admin_usuarios where id = auth.uid() and activo
    ));
$$;

create or replace function public.es_admin_liga(p_liga uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.es_admin_plataforma()
    or exists (
      select 1 from public.miembros_liga
      where liga_id = p_liga and usuario_id = auth.uid() and activo and rol = 'Administrador'
    )
    or (p_liga = '00000000-0000-0000-0000-00000000a001' and public.es_administrador());
$$;

create or replace function public.puede_planilla_liga(p_liga uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.es_admin_liga(p_liga)
    or exists (
      select 1 from public.miembros_liga
      where liga_id = p_liga and usuario_id = auth.uid() and activo
        and (puede_planilla or rol = 'Planilla')
    )
    or (p_liga = '00000000-0000-0000-0000-00000000a001' and public.usuario_puede_planilla());
$$;

-- Datos visibles al público: ligas activas. Los miembros ven también
-- su liga mientras está pendiente o suspendida.
create or replace function public.liga_visible(p_liga uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.ligas where id = p_liga and estado = 'activa')
    or public.es_miembro_liga(p_liga);
$$;

-- Copia los usuarios actuales de LIBAVIME a miembros_liga.
insert into public.miembros_liga (liga_id, usuario_id, rol, puede_planilla, activo, nombre, correo)
select
  '00000000-0000-0000-0000-00000000a001',
  u.id,
  case when u.rol = 'Administrador' then 'Administrador' else 'Consulta' end,
  u.puede_planilla,
  u.activo,
  u.nombre,
  u.correo
from public.admin_usuarios u
on conflict (liga_id, usuario_id) do nothing;

-- ---------------------------------------------------------------------
-- 5. Coherencia: las estadísticas heredan la liga del partido y el
--    jugador debe pertenecer a esa misma liga.
-- ---------------------------------------------------------------------
create or replace function public.estadistica_misma_liga()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  liga_partido uuid;
  liga_jugador uuid;
begin
  select liga_id into liga_partido from public.partidos where id = new.partido_id;
  select liga_id into liga_jugador from public.jugadores where id = new.jugador_id;
  if liga_partido is null or liga_jugador is null or liga_partido <> liga_jugador then
    raise exception 'El jugador y el partido deben pertenecer a la misma liga';
  end if;
  new.liga_id := liga_partido;
  return new;
end $$;

drop trigger if exists estadistica_misma_liga on public.estadisticas_partido;
create trigger estadistica_misma_liga
  before insert or update of partido_id, jugador_id, liga_id on public.estadisticas_partido
  for each row execute function public.estadistica_misma_liga();

create or replace function public.partido_misma_liga_temporada()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.admin_temporadas where id = new.temporada_id and liga_id = new.liga_id
  ) then
    raise exception 'La temporada no pertenece a la liga del partido';
  end if;
  return new;
end $$;

drop trigger if exists partido_misma_liga_temporada on public.partidos;
create trigger partido_misma_liga_temporada
  before insert or update of temporada_id, liga_id on public.partidos
  for each row execute function public.partido_misma_liga_temporada();

-- ---------------------------------------------------------------------
-- 6. Políticas de seguridad (RLS)
-- ---------------------------------------------------------------------
-- 6a. Tablas del sitio de estadísticas: se reemplazan todas sus
--     políticas (incluidas las de la auditoría del 2026-11-26).
do $$
declare
  pol record;
begin
  for pol in
    select tablename, policyname from pg_policies
    where schemaname = 'public'
      and tablename in ('equipos', 'jugadores', 'partidos', 'estadisticas_partido',
                        'libavime_disenos', 'libavime_configuracion')
  loop
    execute format('drop policy %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end $$;

-- Lectura pública por liga
create policy liga_lectura on public.equipos for select using (public.liga_visible(liga_id));
create policy liga_lectura on public.jugadores for select using (public.liga_visible(liga_id));
create policy liga_lectura on public.partidos for select using (public.liga_visible(liga_id));
create policy liga_lectura on public.estadisticas_partido for select using (public.liga_visible(liga_id));
create policy liga_lectura on public.libavime_disenos for select
  using ((publicado and public.liga_visible(liga_id)) or public.es_admin_liga(liga_id));
create policy liga_lectura on public.libavime_configuracion for select
  using (public.es_miembro_liga(liga_id));
-- libavime_disenos y libavime_configuracion no se escriben desde el
-- navegador: las rutas /api usan la service role.

-- Equipos y jugadores: administradores de la liga
create policy liga_insertar on public.equipos for insert to authenticated
  with check (public.es_admin_liga(liga_id));
create policy liga_actualizar on public.equipos for update to authenticated
  using (public.es_admin_liga(liga_id)) with check (public.es_admin_liga(liga_id));
create policy liga_borrar on public.equipos for delete to authenticated
  using (public.es_admin_liga(liga_id));

create policy liga_insertar on public.jugadores for insert to authenticated
  with check (public.es_admin_liga(liga_id));
create policy liga_actualizar on public.jugadores for update to authenticated
  using (public.es_admin_liga(liga_id)) with check (public.es_admin_liga(liga_id));
create policy liga_borrar on public.jugadores for delete to authenticated
  using (public.es_admin_liga(liga_id));

-- Partidos: crear/borrar admin; actualizar (marcador) también planilla
create policy liga_insertar on public.partidos for insert to authenticated
  with check (public.es_admin_liga(liga_id));
create policy liga_actualizar on public.partidos for update to authenticated
  using (public.puede_planilla_liga(liga_id)) with check (public.puede_planilla_liga(liga_id));
create policy liga_borrar on public.partidos for delete to authenticated
  using (public.es_admin_liga(liga_id));

-- Estadísticas: planilla escribe; solo admin borra
create policy liga_insertar on public.estadisticas_partido for insert to authenticated
  with check (public.puede_planilla_liga(liga_id));
create policy liga_actualizar on public.estadisticas_partido for update to authenticated
  using (public.puede_planilla_liga(liga_id)) with check (public.puede_planilla_liga(liga_id));
create policy liga_borrar on public.estadisticas_partido for delete to authenticated
  using (public.es_admin_liga(liga_id));

-- 6b. admin_temporadas la comparte el módulo de tesorería: se conservan
--     sus políticas y se agregan las de las ligas nuevas.
drop policy if exists liga_lectura on public.admin_temporadas;
drop policy if exists liga_insertar on public.admin_temporadas;
drop policy if exists liga_actualizar on public.admin_temporadas;
drop policy if exists liga_borrar on public.admin_temporadas;
drop policy if exists liga_solo_propia_insertar on public.admin_temporadas;
drop policy if exists liga_solo_propia_actualizar on public.admin_temporadas;
drop policy if exists liga_solo_propia_borrar on public.admin_temporadas;

create policy liga_lectura on public.admin_temporadas for select
  using (public.liga_visible(liga_id));
create policy liga_insertar on public.admin_temporadas for insert to authenticated
  with check (public.es_admin_liga(liga_id));
create policy liga_actualizar on public.admin_temporadas for update to authenticated
  using (public.es_admin_liga(liga_id)) with check (public.es_admin_liga(liga_id));
create policy liga_borrar on public.admin_temporadas for delete to authenticated
  using (public.es_admin_liga(liga_id));
-- Los permisos antiguos de tesorería no pueden tocar temporadas de otras ligas.
create policy liga_solo_propia_insertar on public.admin_temporadas as restrictive for insert
  with check (liga_id = '00000000-0000-0000-0000-00000000a001' or public.es_admin_liga(liga_id));
create policy liga_solo_propia_actualizar on public.admin_temporadas as restrictive for update
  using (liga_id = '00000000-0000-0000-0000-00000000a001' or public.es_admin_liga(liga_id))
  with check (liga_id = '00000000-0000-0000-0000-00000000a001' or public.es_admin_liga(liga_id));
create policy liga_solo_propia_borrar on public.admin_temporadas as restrictive for delete
  using (liga_id = '00000000-0000-0000-0000-00000000a001' or public.es_admin_liga(liga_id));

-- 6c. Tablas de la plataforma
-- Permisos de la API explícitos (RLS decide las filas).
grant select on public.ligas to anon, authenticated;
grant select, insert, update, delete on public.miembros_liga to authenticated;
grant select on public.administradores_plataforma, public.solicitudes_liga to authenticated;
grant all on public.ligas, public.miembros_liga, public.administradores_plataforma,
  public.solicitudes_liga to service_role;
alter table public.ligas enable row level security;
alter table public.miembros_liga enable row level security;
alter table public.administradores_plataforma enable row level security;
alter table public.solicitudes_liga enable row level security;

drop policy if exists ligas_lectura on public.ligas;
drop policy if exists ligas_actualizar on public.ligas;
create policy ligas_lectura on public.ligas for select
  using (estado = 'activa' or public.es_miembro_liga(id));
create policy ligas_actualizar on public.ligas for update to authenticated
  using (public.es_admin_liga(id)) with check (public.es_admin_liga(id));
-- Una liga solo puede cambiar su presentación; estado y plan los
-- cambia la plataforma desde el servidor (service role).
revoke update on public.ligas from anon, authenticated;
grant update (nombre, nombre_corto, descripcion, ciudad, logo_url, banner_url,
              color_primario, color_secundario)
  on public.ligas to authenticated;

drop policy if exists miembros_lectura on public.miembros_liga;
drop policy if exists miembros_insertar on public.miembros_liga;
drop policy if exists miembros_actualizar on public.miembros_liga;
drop policy if exists miembros_borrar on public.miembros_liga;
create policy miembros_lectura on public.miembros_liga for select to authenticated
  using (usuario_id = auth.uid() or public.es_admin_liga(liga_id));
create policy miembros_insertar on public.miembros_liga for insert to authenticated
  with check (public.es_admin_liga(liga_id));
create policy miembros_actualizar on public.miembros_liga for update to authenticated
  using (public.es_admin_liga(liga_id)) with check (public.es_admin_liga(liga_id));
create policy miembros_borrar on public.miembros_liga for delete to authenticated
  using (public.es_admin_liga(liga_id));

drop policy if exists plataforma_lectura on public.administradores_plataforma;
create policy plataforma_lectura on public.administradores_plataforma for select to authenticated
  using (usuario_id = auth.uid());
-- administradores_plataforma y solicitudes_liga se escriben solo desde
-- el servidor (service role).
drop policy if exists solicitudes_lectura on public.solicitudes_liga;
create policy solicitudes_lectura on public.solicitudes_liga for select to authenticated
  using (public.es_admin_plataforma());

-- ---------------------------------------------------------------------
-- 7. Vistas de promedios: respetan RLS y exponen la liga
-- ---------------------------------------------------------------------
create or replace view public.estadisticas_jugadores_calculadas
with (security_invoker = true) as
select
  e.jugador_id,
  count(*)::bigint as partidos_jugados,
  sum(e.puntos)::bigint as puntos_totales,
  sum(e.rebotes)::bigint as rebotes_totales,
  sum(e.asistencias)::bigint as asistencias_totales,
  round(avg(e.puntos)::numeric, 1) as ppg,
  round(avg(e.rebotes)::numeric, 1) as rpg,
  round(avg(e.asistencias)::numeric, 1) as apg,
  e.liga_id
from public.estadisticas_partido e
group by e.jugador_id, e.liga_id;

create or replace view public.estadisticas_jugadores
with (security_invoker = true) as
select
  e.jugador_id,
  round(avg(e.puntos)::numeric, 1) as ppg,
  round(avg(e.rebotes)::numeric, 1) as rpg,
  round(avg(e.asistencias)::numeric, 1) as apg,
  count(*)::bigint as partidos_jugados,
  e.liga_id
from public.estadisticas_partido e
where e.puntos > 0 or e.rebotes > 0 or e.asistencias > 0
group by e.jugador_id, e.liga_id;

commit;
