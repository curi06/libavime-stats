# Ensayo del pase a producción: comprueba que el CÓDIGO ACTUAL de LIBAVIME
# (que no envía liga_id ni temporada_id) sigue funcionando sobre la base
# ya migrada (002–006), con una cuenta que solo existe en admin_usuarios
# (el sistema de permisos antiguo). SOLO contra el proyecto de PRUEBAS.
# Uso: python3 -I supabase/pruebas/compatibilidad.py
import json, secrets, urllib.request, urllib.error

def env(p):
    d = {}
    for l in open(p):
        l = l.strip()
        if l and not l.startswith('#') and '=' in l:
            k, v = l.split('=', 1); d[k] = v
    return d

E = env('.env.pruebas'); assert E['PRUEBAS_SUPABASE_REF'] == 'nhqupfhsilhvrzvgjdoo'
URL = E['PRUEBAS_SUPABASE_URL']; PUB = E['PRUEBAS_SUPABASE_ANON_KEY']; SEC = E['PRUEBAS_SUPABASE_SERVICE_ROLE_KEY']
LIB = '00000000-0000-0000-0000-00000000a001'

def sql(q):
    b = json.dumps({'query': q, 'read_only': False}).encode()
    r = urllib.request.Request(f"https://api.supabase.com/v1/projects/{E['PRUEBAS_SUPABASE_REF']}/database/query", data=b,
        headers={'Authorization': 'Bearer ' + E['SUPABASE_ACCESS_TOKEN'], 'Content-Type': 'application/json', 'User-Agent': 'quinteto-pruebas'})
    return json.load(urllib.request.urlopen(r, timeout=120))

def api(metodo, ruta, cuerpo=None, token=None, extra=None, datos=None, tipo='application/json'):
    h = {'apikey': PUB, 'Content-Type': tipo, 'Prefer': 'return=representation'}
    if token: h['Authorization'] = 'Bearer ' + token
    if extra: h.update(extra)
    data = datos if datos is not None else (json.dumps(cuerpo).encode() if cuerpo is not None else None)
    r = urllib.request.Request(URL + ruta, data=data, method=metodo, headers=h)
    try:
        resp = urllib.request.urlopen(r, timeout=60); t = resp.read().decode(); return resp.status, (json.loads(t) if t else None)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

res = []
def check(d, ok, x=''):
    res.append(bool(ok)); print(('✅' if ok else '❌'), d, '' if ok else f'→ {str(x)[:200]}')

# Cuenta "antigua": Administrador con planilla, SOLO en admin_usuarios.
correo = 'legado@pruebas.quinteto.invalid'; pw = secrets.token_urlsafe(18)
s, r = api('POST', '/auth/v1/admin/users', {'email': correo, 'password': pw, 'email_confirm': True}, extra={'apikey': SEC, 'Authorization': 'Bearer ' + SEC})
uid = r['id'] if s < 300 else sql(f"select id from auth.users where email='{correo}'")[0]['id']
if s >= 300:
    api('PUT', f'/auth/v1/admin/users/{uid}', {'password': pw}, extra={'apikey': SEC, 'Authorization': 'Bearer ' + SEC})
sql(f"delete from miembros_liga where usuario_id='{uid}'; insert into admin_usuarios (id,nombre,correo,rol,activo,puede_planilla) values ('{uid}','Legado','{correo}','Administrador',true,true) on conflict (id) do update set rol='Administrador', activo=true, puede_planilla=true;")
s, r = api('POST', '/auth/v1/token?grant_type=password', {'email': correo, 'password': pw}); tok = r['access_token']

print('— Lecturas del código actual (sin filtro de liga)')
for tabla, minimo in [('jugadores', 44), ('partidos', 21), ('estadisticas_partido', 417), ('estadisticas_jugadores', 44)]:
    s, r = api('GET', f'/rest/v1/{tabla}?select=*')
    check(f'Visitante lee {tabla} ({len(r) if isinstance(r, list) else r})', s == 200 and isinstance(r, list) and len(r) >= minimo, r)
s, r = api('GET', '/rest/v1/estadisticas_jugadores?select=jugador_id')
check('La vista de promedios sigue dando una fila por jugador (una temporada)', isinstance(r, list) and len(r) == len({x['jugador_id'] for x in r}), len(r))

print('— Permisos antiguos')
s, r = api('POST', '/rest/v1/rpc/es_administrador', {}, tok); check('rpc es_administrador (usada por /api actual) = true', r is True, r)
s, r = api('POST', '/rest/v1/rpc/usuario_puede_planilla', {}, tok); check('rpc usuario_puede_planilla (usada por la planilla actual) = true', r is True, r)

print('— Escrituras del código actual (sin liga_id ni temporada_id)')
s, r = api('POST', '/rest/v1/equipos', {'nombre': 'Equipo Ensayo', 'slug': 'equipo-ensayo'}, tok)
check('Admin antiguo crea un equipo (queda en LIBAVIME)', s == 201 and r[0]['liga_id'] == LIB, (s, r))
s, r = api('PATCH', '/rest/v1/equipos?slug=eq.equipo-ensayo', {'color': '#123456'}, tok); check('…y lo edita', s == 200 and len(r) == 1, (s, r))
s, r = api('POST', '/rest/v1/jugadores', {'nombre': 'Jugador Ensayo', 'slug': 'jugador-ensayo', 'equipo': 'Equipo Ensayo'}, tok)
jid = r[0]['id'] if s == 201 else None; check('Admin antiguo crea un jugador', s == 201, (s, r))
temp = sql(f"select id from admin_temporadas where liga_id='{LIB}' limit 1")[0]['id']
# Igual que admin/partidos del código actual: SIN temporada_id.
s, r = api('POST', '/rest/v1/partidos', {'equipo_local': 'Equipo Ensayo', 'equipo_visitante': 'Titanes', 'fecha': '2026-12-31', 'estado': 'Programado'}, tok)
pid = r[0]['id'] if s == 201 else None; check('Admin antiguo crea un partido SIN temporada (se asigna la activa)', s == 201 and r[0]['temporada_id'] == temp, (s, r))
s, r = api('POST', '/rest/v1/estadisticas_partido?on_conflict=partido_id,jugador_id',
           [{'partido_id': pid, 'jugador_id': jid, 'puntos': 7, 'rebotes': 2, 'asistencias': 1, 'estado': 'jugó'}], tok,
           extra={'Prefer': 'resolution=merge-duplicates,return=representation'})
check('Planilla antigua registra estadística (upsert); liga y temporada se asignan solas',
      s in (200, 201) and r[0]['liga_id'] == LIB and r[0]['temporada_id'] == temp, (s, r))
s, r = api('PATCH', f'/rest/v1/partidos?id=eq.{pid}', {'puntos_local': 7, 'puntos_visitante': 0, 'estado': 'Finalizado'}, tok)
check('Planilla antigua actualiza marcador y finaliza', s == 200 and len(r) == 1, (s, r))
s, r = api('POST', '/storage/v1/object/Jugadores/ensayo-raiz.png', datos=b'\x89PNG ensayo', token=tok, tipo='image/png', extra={'x-upsert': 'true'})
check('Admin antiguo sube una foto a la raíz del bucket (como hoy)', s == 200, (s, r))
s, r = api('POST', '/rest/v1/equipos', {'nombre': 'Intruso', 'slug': 'intruso'})
check('Un visitante sigue sin poder escribir', s in (401, 403), s)

# Limpieza de los datos del ensayo
sql(f"delete from estadisticas_partido where partido_id={pid or 0}; delete from partidos where id={pid or 0}; "
    f"delete from jugadores where id={jid or 0}; delete from equipos where slug='equipo-ensayo';")
api('DELETE', '/storage/v1/object/Jugadores/ensayo-raiz.png', token=tok)
print(f"\nResultado: {sum(res)}/{len(res)} pruebas superadas")
