-- =====================================================================
-- SOLO PARA EL PROYECTO DE PRUEBAS: deja la base vacía para ensayar el
-- pase a producción desde cero (001 + copia de datos + 002…006).
-- NUNCA ejecutar en producción.
-- =====================================================================
begin;

drop view if exists public.estadisticas_jugadores cascade;
drop view if exists public.estadisticas_jugadores_calculadas cascade;

drop table if exists
  public.solicitudes_liga, public.miembros_liga, public.administradores_plataforma,
  public.estadisticas_partido, public.partidos, public.jugadores, public.equipos,
  public.libavime_disenos, public.libavime_configuracion, public.admin_usuarios,
  public.admin_temporadas, public.ligas
  cascade;

drop function if exists public.es_admin_plataforma() cascade;
drop function if exists public.es_miembro_liga(uuid) cascade;
drop function if exists public.es_admin_liga(uuid) cascade;
drop function if exists public.puede_planilla_liga(uuid) cascade;
drop function if exists public.liga_visible(uuid) cascade;
drop function if exists public.mi_rol_en_liga(uuid) cascade;
drop function if exists public.usuario_por_correo(text) cascade;
drop function if exists public.estadistica_misma_liga() cascade;
drop function if exists public.partido_misma_liga_temporada() cascade;
drop function if exists public.partido_propaga_temporada() cascade;
drop function if exists public.puede_administrar_archivo(text, text) cascade;
drop function if exists public.liga_de_archivo(text) cascade;
drop function if exists public.es_administrador() cascade;
drop function if exists public.usuario_puede_planilla() cascade;

drop policy if exists liga_storage_insertar on storage.objects;
drop policy if exists liga_storage_actualizar on storage.objects;
drop policy if exists liga_storage_borrar on storage.objects;
drop policy if exists liga_storage_escribir on storage.objects;
drop policy if exists liga_storage_modificar on storage.objects;
drop policy if exists liga_storage_eliminar on storage.objects;
drop policy if exists liga_storage_lectura on storage.objects;

commit;
