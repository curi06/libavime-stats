-- =====================================================================
-- Quinteto Pro · 003 · Configuración por liga y limpieza de equipos
--
-- * ligas.configuracion (jsonb): contenido propio de cada liga que antes
--   estaba escrito en el código (campeón defensor, inauguración, fecha
--   de inicio de la temporada, ...).
-- * Corrige los equipos de LIBAVIME para que el sitio pueda tomarlos de
--   la base de datos en vez de la lista fija data/equipos.ts.
-- Segura para producción: solo agrega una columna y ajusta 4 equipos.
-- =====================================================================

begin;

alter table public.ligas
  add column if not exists configuracion jsonb not null default '{}'::jsonb;

-- Las ligas pueden editar su propia configuración (estado/plan siguen
-- reservados a la plataforma).
grant update (configuracion) on public.ligas to authenticated;

update public.ligas
set configuracion = configuracion || jsonb_build_object(
  'temporada', '2026',
  'campeon_defensor', jsonb_build_object('equipo', 'Vikingos', 'temporada', '2025'),
  'inauguracion', jsonb_build_object(
    'fecha', '2026-09-18T18:00:00-04:00',
    'lugar', 'Club San Carlos'
  ),
  'inicio_temporada', '2026-09-05',
  'logo_compartir', '/logos/libavime-compartir.png',
  'redes', jsonb_build_object(
    'instagram', 'https://www.instagram.com/libavime',
    'youtube', 'https://www.youtube.com/channel/UCUkCUSmljiIn-gO1KFJNVeg'
  )
)
where id = '00000000-0000-0000-0000-00000000a001';

-- Equipos de LIBAVIME: slugs sin espacios, rutas de logo válidas y
-- colores en formato hexadecimal.
update public.equipos e
set
  slug = v.slug,
  logo = v.logo,
  color = v.color
from (values
  ('Gladiadores', 'gladiadores', '/logos/gladiadores.png', '#16a34a'),
  ('Espartanos',  'espartanos',  '/logos/espartanos.png',  '#facc15'),
  ('Vikingos',    'vikingos',    '/logos/vikingos.jpg',    '#7c3aed'),
  ('Titanes',     'titanes',     '/logos/titanes.jpg',     '#dc2626')
) as v(nombre, slug, logo, color)
where e.liga_id = '00000000-0000-0000-0000-00000000a001'
  and trim(e.nombre) = v.nombre;

commit;
