# Pruebas de la Fase 3 (plataforma, miembros, acceso al panel) a través del
# sitio en local. SOLO contra el proyecto de PRUEBAS.
# Requisitos: haber corrido aislamiento.py (crea ligas/usuarios de prueba) y
# tener el sitio corriendo en http://localhost:3931 apuntando a pruebas.
# Uso: python3 -I supabase/pruebas/plataforma.py
import json, secrets, urllib.request, urllib.error, http.cookiejar

def env(p):
    d = {}
    for l in open(p):
        l = l.strip()
        if l and not l.startswith('#') and '=' in l:
            k, v = l.split('=', 1); d[k] = v
    return d

E = env('.env.pruebas'); assert E['PRUEBAS_SUPABASE_REF'] == 'nhqupfhsilhvrzvgjdoo'
SUPA = E['PRUEBAS_SUPABASE_URL']; SEC = E['PRUEBAS_SUPABASE_SERVICE_ROLE_KEY']
SITIO = 'http://localhost:3931'

def sql(q):
    b = json.dumps({'query': q, 'read_only': False}).encode()
    r = urllib.request.Request(f"https://api.supabase.com/v1/projects/{E['PRUEBAS_SUPABASE_REF']}/database/query", data=b,
        headers={'Authorization': 'Bearer ' + E['SUPABASE_ACCESS_TOKEN'], 'Content-Type': 'application/json', 'User-Agent': 'quinteto-pruebas'})
    return json.load(urllib.request.urlopen(r, timeout=120))

def nueva_clave(correo):
    uid = sql(f"select id from auth.users where email='{correo}'")[0]['id']
    pw = secrets.token_urlsafe(18)
    r = urllib.request.Request(f'{SUPA}/auth/v1/admin/users/{uid}', data=json.dumps({'password': pw}).encode(), method='PUT',
        headers={'apikey': SEC, 'Authorization': 'Bearer ' + SEC, 'Content-Type': 'application/json'})
    urllib.request.urlopen(r, timeout=60)
    return uid, pw

class Navegador:
    """Sesión con cookies, como un navegador."""
    def __init__(self):
        self.op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()), SinRedireccion())
    def pedir(self, metodo, ruta, cuerpo=None):
        r = urllib.request.Request(SITIO + ruta, data=json.dumps(cuerpo).encode() if cuerpo is not None else None, method=metodo,
            headers={'Content-Type': 'application/json'})
        try:
            resp = self.op.open(r, timeout=120); t = resp.read().decode(); s = resp.status
        except urllib.error.HTTPError as e:
            t = e.read().decode(); s = e.code
        try: return s, json.loads(t)
        except Exception: return s, t
    def entrar(self, correo, pw):
        s, _ = self.pedir('POST', '/api/auth/login', {'email': correo, 'password': pw}); assert s == 200, (correo, s)

class SinRedireccion(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k): return None

res = []
def check(desc, ok, extra=''):
    res.append(bool(ok)); print(('✅' if ok else '❌'), desc, ('' if ok else f'  → {extra}'))

C = {n: f'{n}@pruebas.quinteto.invalid' for n in ['admin_lib', 'admin_demo', 'planilla_demo', 'plataforma']}
U = {}; N = {}
for n, c in C.items():
    uid, pw = nueva_clave(c); U[n] = uid; N[n] = Navegador(); N[n].entrar(c, pw)
anon = Navegador()

# Limpieza de corridas anteriores
sql("delete from miembros_liga where liga_id in (select id from ligas where slug in ('liga-nueva'));"
    "delete from admin_temporadas where liga_id in (select id from ligas where slug='liga-nueva');"
    "delete from ligas where slug='liga-nueva';"
    "delete from solicitudes_liga where contacto_correo like '%pruebas.quinteto.invalid';"
    f"delete from miembros_liga where liga_id='00000000-0000-0000-0000-0000000d3e01' and usuario_id='{U['admin_lib']}';")

print('— Solicitudes públicas')
s, _ = anon.pedir('GET', '/registro'); check('Formulario público /registro abre sin sesión', s == 200)
s, _ = anon.pedir('GET', '/ligas'); check('Directorio público /ligas abre sin sesión', s == 200)
sol = {'nombre_liga': 'Liga Nueva de Pruebas', 'slug_deseado': 'liga-nueva', 'ciudad': 'Santiago',
       'contacto_nombre': 'Persona Planilla', 'contacto_correo': C['planilla_demo'], 'mensaje': 'Somos 6 equipos.'}
s, _ = anon.pedir('POST', '/api/solicitudes', sol); check('Visitante envía una solicitud', s == 201, s)
s, _ = anon.pedir('POST', '/api/solicitudes', {**sol, 'sitio_web': 'spam'})
n_trampa = sql("select count(*) c from solicitudes_liga where contacto_correo like '%pruebas.quinteto.invalid'")[0]['c']
check('El campo trampa descarta robots sin guardar nada', s == 201 and n_trampa == 1, n_trampa)
s, _ = anon.pedir('POST', '/api/solicitudes', {**sol, 'contacto_correo': 'no-es-correo'}); check('Correo inválido rechazado', s == 400, s)
anon.pedir('POST', '/api/solicitudes', sol); anon.pedir('POST', '/api/solicitudes', sol)
s, _ = anon.pedir('POST', '/api/solicitudes', sol); check('Máximo 3 solicitudes pendientes por correo', s == 429, s)

print('— Panel de plataforma')
s, _ = anon.pedir('GET', '/plataforma'); check('Panel /plataforma exige iniciar sesión', s in (302, 307), s)
s, _ = N['admin_demo'].pedir('GET', '/api/plataforma'); check('Un admin de liga NO entra a la API de plataforma', s == 403, s)
s, d = N['plataforma'].pedir('GET', '/api/plataforma')
pend = [x for x in d.get('solicitudes', []) if x['estado'] == 'pendiente' and x['contacto_correo'] == C['planilla_demo']] if s == 200 else []
check('La administradora de plataforma ve las solicitudes', s == 200 and len(pend) >= 1, s)
sid = pend[0]['id']
s, d = N['plataforma'].pedir('POST', '/api/plataforma', {'accion': 'aprobar', 'solicitud_id': sid, 'slug': 'admin'})
check('No permite usar una dirección reservada (/admin)', s == 409, (s, d))
s, d = N['plataforma'].pedir('POST', '/api/plataforma', {'accion': 'aprobar', 'solicitud_id': sid, 'slug': 'libavime'})
check('No permite una dirección ya usada (/libavime)', s == 409, (s, d))
s, d = N['admin_demo'].pedir('POST', '/api/plataforma', {'accion': 'aprobar', 'solicitud_id': sid, 'slug': 'liga-nueva'})
check('Un admin de liga NO puede aprobar ligas', s == 403, s)
s, d = N['plataforma'].pedir('POST', '/api/plataforma', {'accion': 'aprobar', 'solicitud_id': sid, 'slug': 'liga-nueva'})
check('Aprobar crea la liga', s == 201, (s, d))
fila = sql("select l.estado, (select count(*) from admin_temporadas t where t.liga_id=l.id and t.activa) temporadas, "
           f"(select rol from miembros_liga m where m.liga_id=l.id and m.usuario_id='{U['planilla_demo']}') rol "
           "from ligas l where slug='liga-nueva'")[0]
check('…activa, con su primera temporada y el contacto como Administrador', fila == {'estado': 'activa', 'temporadas': 1, 'rol': 'Administrador'}, fila)
s, _ = anon.pedir('GET', '/liga-nueva'); check('La página pública de la liga nueva abre', s == 200, s)
s, d = N['plataforma'].pedir('POST', '/api/plataforma', {'accion': 'aprobar', 'solicitud_id': sid, 'slug': 'otra'})
check('Una solicitud no se puede aprobar dos veces', s == 409, s)
lib_id = '00000000-0000-0000-0000-00000000a001'
s, d = N['plataforma'].pedir('POST', '/api/plataforma', {'accion': 'estado', 'liga_id': lib_id, 'estado': 'suspendida'})
check('No se puede suspender la liga principal por accidente', s == 409, s)
nueva = sql("select id from ligas where slug='liga-nueva'")[0]['id']
N['plataforma'].pedir('POST', '/api/plataforma', {'accion': 'estado', 'liga_id': nueva, 'estado': 'suspendida'})
s, _ = anon.pedir('GET', '/liga-nueva'); check('Una liga suspendida deja de ser pública', s == 404, s)
N['plataforma'].pedir('POST', '/api/plataforma', {'accion': 'estado', 'liga_id': nueva, 'estado': 'activa'})

print('— Acceso al panel de cada liga')
s, t = N['admin_lib'].pedir('GET', '/liga-demo/admin')
check('Admin de LIBAVIME ve "Sin acceso" en el panel de otra liga', s == 200 and 'Sin acceso' in str(t), s)
s, t = N['admin_demo'].pedir('GET', '/liga-demo/admin')
check('Admin de la liga demo entra a su panel', s == 200 and 'Sin acceso' not in str(t), s)

print('— Miembros')
s, d = N['admin_demo'].pedir('GET', '/api/ligas/miembros?liga=liga-demo'); check('Admin lista los miembros de su liga', s == 200 and len(d.get('miembros', [])) >= 2, s)
s, _ = N['planilla_demo'].pedir('GET', '/api/ligas/miembros?liga=liga-demo'); check('Planilla NO puede ver/gestionar miembros', s == 403, s)
s, _ = N['admin_demo'].pedir('GET', '/api/ligas/miembros?liga=libavime'); check('Admin demo NO gestiona miembros de LIBAVIME', s == 403, s)
s, d = N['admin_demo'].pedir('POST', '/api/ligas/miembros?liga=liga-demo', {'nombre': 'Admin Lib', 'correo': C['admin_lib'], 'rol': 'Consulta'})
check('Invitar a alguien que ya tiene cuenta lo agrega sin correo', s == 201 and d.get('invitado') is False, (s, d))
s, d = N['admin_demo'].pedir('PATCH', '/api/ligas/miembros?liga=liga-demo', {'usuario_id': U['admin_demo'], 'rol': 'Consulta'})
check('No se puede degradar al último administrador', s == 409, s)
s, d = N['admin_demo'].pedir('DELETE', f"/api/ligas/miembros?liga=liga-demo&usuario={U['admin_demo']}")
check('No se puede quitar al último administrador', s == 409, s)
s, d = N['admin_demo'].pedir('PATCH', '/api/ligas/miembros?liga=liga-demo', {'usuario_id': U['admin_lib'], 'rol': 'Planilla'})
check('Cambiar el rol de un miembro', s == 200, s)
s, t = N['admin_lib'].pedir('GET', '/liga-demo/admin')
check('…y con ese rol ya entra al panel de la liga demo', s == 200 and 'Sin acceso' not in str(t), s)
s, d = N['admin_demo'].pedir('DELETE', f"/api/ligas/miembros?liga=liga-demo&usuario={U['admin_lib']}")
check('Quitar un miembro', s == 200, s)
s, t = N['admin_lib'].pedir('GET', '/liga-demo/admin')
check('…y pierde el acceso al panel', 'Sin acceso' in str(t), s)

print(f"\nResultado: {sum(res)}/{len(res)} pruebas superadas")
