-- LIBAVIME Stats: separar serie regular y finales por temporada administrativa.
-- Reutiliza public.admin_temporadas (tabla ya existente) para no duplicar temporadas.
-- Todos los partidos actuales se asignan a la temporada activa; sus estadísticas
-- individuales permanecen intactas y los partidos existentes quedan como serie_regular.

begin;

do $$
declare
  cantidad_activas integer;
begin
  select count(*) into cantidad_activas
  from public.admin_temporadas
  where activa is true;

  if cantidad_activas <> 1 then
    raise exception 'Se esperaba exactamente una temporada activa en admin_temporadas; se encontraron %.', cantidad_activas;
  end if;
end
$$;

alter table public.partidos
  add column if not exists temporada_id bigint;

alter table public.partidos
  add column if not exists fase text not null default 'serie_regular';

do $$
begin
  alter table public.partidos
    add constraint partidos_temporada_id_fkey
    foreign key (temporada_id) references public.admin_temporadas(id);
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.partidos
    add constraint partidos_fase_check
    check (fase in ('serie_regular', 'finales'));
exception
  when duplicate_object then null;
end
$$;

update public.partidos
set temporada_id = (
  select id
  from public.admin_temporadas
  where activa is true
  order by fecha_inicio desc nulls last, id desc
  limit 1
)
where temporada_id is null;

alter table public.partidos
  alter column temporada_id set not null;

create index if not exists partidos_temporada_fase_estado_idx
  on public.partidos (temporada_id, fase, estado);

-- La información de temporadas (solo nombre y fechas) es pública para que
-- rankings, perfiles y estadísticas puedan consultar la temporada activa.
-- La gestión administrativa sigue protegida por las políticas existentes.
grant select on public.admin_temporadas to anon, authenticated;

drop policy if exists admin_temporadas_metadata_publica on public.admin_temporadas;
create policy admin_temporadas_metadata_publica
  on public.admin_temporadas
  for select
  to anon, authenticated
  using (true);

-- Los nuevos partidos se asignan automáticamente a la temporada activa.
create or replace function public.asignar_temporada_activa_a_partido()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.temporada_id is null then
    select id
      into new.temporada_id
    from public.admin_temporadas
    where activa is true
    order by fecha_inicio desc nulls last, id desc
    limit 1;
  end if;

  if new.temporada_id is null then
    raise exception 'No existe una temporada activa para asignar el partido.';
  end if;

  if new.fase is null then
    new.fase := 'serie_regular';
  end if;

  return new;
end;
$$;

drop trigger if exists asignar_temporada_activa_a_partido
  on public.partidos;

create trigger asignar_temporada_activa_a_partido
before insert or update of temporada_id
on public.partidos
for each row
execute function public.asignar_temporada_activa_a_partido();

comment on column public.partidos.temporada_id is
  'Identificador de admin_temporadas para conservar estadísticas por temporada.';
comment on column public.partidos.fase is
  'Fase de competencia: serie_regular o finales.';

commit;
