-- =====================================================================
-- Quinteto Pro · 006 · Temporada en las estadísticas
--
-- Cada fila de estadisticas_partido guarda la temporada de su partido
-- (igual que ya guarda la liga), para que las páginas públicas puedan
-- mostrar una temporada a la vez. Las vistas de promedios se calculan
-- por jugador, liga y temporada.
--
-- Compatible con el código actual: mientras una liga tenga una sola
-- temporada, las vistas devuelven una fila por jugador, como hoy.
-- =====================================================================

begin;

alter table public.estadisticas_partido add column if not exists temporada_id bigint;

update public.estadisticas_partido e
set temporada_id = p.temporada_id
from public.partidos p
where p.id = e.partido_id
  and e.temporada_id is distinct from p.temporada_id;

alter table public.estadisticas_partido alter column temporada_id set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'estadisticas_partido_temporada_fk') then
    alter table public.estadisticas_partido
      add constraint estadisticas_partido_temporada_fk
      foreign key (temporada_id) references public.admin_temporadas (id);
  end if;
end $$;
create index if not exists estadisticas_partido_temporada_idx
  on public.estadisticas_partido (temporada_id);
create index if not exists partidos_temporada_idx on public.partidos (temporada_id);

-- La estadística hereda liga y temporada del partido (amplía el trigger de 002).
create or replace function public.estadistica_misma_liga()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  liga_partido uuid;
  temporada_partido bigint;
  liga_jugador uuid;
begin
  select liga_id, temporada_id into liga_partido, temporada_partido
  from public.partidos where id = new.partido_id;
  select liga_id into liga_jugador from public.jugadores where id = new.jugador_id;
  if liga_partido is null or liga_jugador is null or liga_partido <> liga_jugador then
    raise exception 'El jugador y el partido deben pertenecer a la misma liga';
  end if;
  new.liga_id := liga_partido;
  new.temporada_id := temporada_partido;
  return new;
end $$;

drop trigger if exists estadistica_misma_liga on public.estadisticas_partido;
create trigger estadistica_misma_liga
  before insert or update of partido_id, jugador_id, liga_id, temporada_id on public.estadisticas_partido
  for each row execute function public.estadistica_misma_liga();

-- Si un partido cambia de temporada, sus estadísticas lo siguen.
create or replace function public.partido_propaga_temporada()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.estadisticas_partido
  set temporada_id = new.temporada_id
  where partido_id = new.id and temporada_id is distinct from new.temporada_id;
  return new;
end $$;

drop trigger if exists partido_propaga_temporada on public.partidos;
create trigger partido_propaga_temporada
  after update of temporada_id on public.partidos
  for each row execute function public.partido_propaga_temporada();

-- Vistas de promedios por temporada (columna nueva al final).
create or replace view public.estadisticas_jugadores_calculadas
with (security_invoker = true) as
select
  e.jugador_id,
  count(*)::bigint as partidos_jugados,
  coalesce(sum(e.puntos), 0)::bigint as puntos_totales,
  coalesce(sum(e.rebotes), 0)::bigint as rebotes_totales,
  coalesce(sum(e.asistencias), 0)::bigint as asistencias_totales,
  round(avg(e.puntos), 1) as ppg,
  round(avg(e.rebotes), 1) as rpg,
  round(avg(e.asistencias), 1) as apg,
  e.liga_id,
  e.temporada_id
from public.estadisticas_partido e
group by e.jugador_id, e.liga_id, e.temporada_id;

create or replace view public.estadisticas_jugadores
with (security_invoker = true) as
select
  e.jugador_id,
  round(avg(e.puntos) filter (where (coalesce(e.puntos, 0) <> 0 or coalesce(e.rebotes, 0) <> 0 or coalesce(e.asistencias, 0) <> 0)), 1) as ppg,
  round(avg(e.rebotes) filter (where (coalesce(e.puntos, 0) <> 0 or coalesce(e.rebotes, 0) <> 0 or coalesce(e.asistencias, 0) <> 0)), 1) as rpg,
  round(avg(e.asistencias) filter (where (coalesce(e.puntos, 0) <> 0 or coalesce(e.rebotes, 0) <> 0 or coalesce(e.asistencias, 0) <> 0)), 1) as apg,
  count(*) filter (where (coalesce(e.puntos, 0) <> 0 or coalesce(e.rebotes, 0) <> 0 or coalesce(e.asistencias, 0) <> 0))::bigint as partidos_jugados,
  e.liga_id,
  e.temporada_id
from public.estadisticas_partido e
group by e.jugador_id, e.liga_id, e.temporada_id;

commit;
