import json, secrets, urllib.request, urllib.error, http.cookiejar
E = {}
for l in open('.env.pruebas'):
    l = l.strip()
    if l and not l.startswith('#') and '=' in l: k, v = l.split('=', 1); E[k] = v
assert E['PRUEBAS_SUPABASE_REF'] == 'nhqupfhsilhvrzvgjdoo'
SUPA, SEC = E['PRUEBAS_SUPABASE_URL'], E['PRUEBAS_SUPABASE_SERVICE_ROLE_KEY']
H = {'apikey': SEC, 'Authorization': 'Bearer ' + SEC, 'Content-Type': 'application/json'}

def admin(metodo, ruta, cuerpo=None):
    r = urllib.request.Request(SUPA + ruta, data=json.dumps(cuerpo).encode() if cuerpo else None, method=metodo, headers=H)
    return json.load(urllib.request.urlopen(r, timeout=60))

usuarios = admin('GET', '/auth/v1/admin/users?per_page=200')['users']
por_correo = {u['email']: u['id'] for u in usuarios}
# Limpia una corrida anterior
nuevo = 'nuevo.miembro@pruebas.quinteto.invalid'
if nuevo in por_correo:
    admin('DELETE', f'/auth/v1/admin/users/{por_correo[nuevo]}')
# Contraseña temporal para la administradora de la liga demo
pw = secrets.token_urlsafe(18)
admin('PUT', f"/auth/v1/admin/users/{por_correo['admin_demo@pruebas.quinteto.invalid']}", {'password': pw})

class SinRedireccion(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k): return None
nav = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()), SinRedireccion())
def pedir(metodo, ruta, cuerpo=None):
    r = urllib.request.Request('http://localhost:3931' + ruta, data=json.dumps(cuerpo).encode() if cuerpo else None, method=metodo, headers={'Content-Type': 'application/json'})
    try:
        resp = nav.open(r, timeout=120); return resp.status, json.loads(resp.read().decode() or '{}')
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

print('login:', pedir('POST', '/api/auth/login', {'email': 'admin_demo@pruebas.quinteto.invalid', 'password': pw})[0])
s, d = pedir('POST', '/api/ligas/miembros?liga=liga-demo', {'nombre': 'Nuevo Miembro', 'correo': nuevo, 'rol': 'Planilla'})
print('invitar:', s, {k: (v[:70] + '…' if isinstance(v, str) and len(v) > 70 else v) for k, v in (d.items() if isinstance(d, dict) else [])} if isinstance(d, dict) else d)
ok_enlace = isinstance(d, dict) and d.get('enlace', '').startswith(SUPA)
print(('✅' if ok_enlace else '❌'), 'El correo no salió y el panel devolvió un enlace de invitación')
if ok_enlace:
    try:
        nav.open(d['enlace'], timeout=60); destino = '(sin redirección)'
    except urllib.error.HTTPError as e:
        destino = e.headers.get('Location', '')
    valido = 'access_token=' in destino or 'code=' in destino or 'token_hash' in destino
    print(('✅' if valido else '❌'), 'El enlace es válido: Supabase redirige con la sesión de la persona invitada')
    print('   destino:', destino.split('#')[0])
s, d = pedir('GET', '/api/ligas/miembros?liga=liga-demo')
fila = [m for m in d.get('miembros', []) if m['correo'] == nuevo] if isinstance(d, dict) else []
print(('✅' if fila and fila[0]['rol'] == 'Planilla' else '❌'), 'La persona quedó como miembro (Planilla) de la liga')
