# Pruebas de aislamiento entre ligas. SOLO para el proyecto de PRUEBAS
# (lee .env.pruebas y se niega a correr contra otro proyecto).
# Uso: python3 -I supabase/pruebas/aislamiento.py
import json, urllib.request, urllib.error, secrets, sys
def env(p):
    d={}
    for l in open(p):
        l=l.strip()
        if l and not l.startswith('#') and '=' in l: k,v=l.split('=',1); d[k]=v
    return d
E=env('.env.pruebas'); assert E['PRUEBAS_SUPABASE_REF']=='nhqupfhsilhvrzvgjdoo'
URL=E['PRUEBAS_SUPABASE_URL']; PUB=E['PRUEBAS_SUPABASE_ANON_KEY']; SEC=E['PRUEBAS_SUPABASE_SERVICE_ROLE_KEY']
LIB='00000000-0000-0000-0000-00000000a001'
def req(method, path, body=None, token=None, key=PUB, extra=None):
    h={'apikey':key,'Content-Type':'application/json','Prefer':'return=representation'}
    if token: h['Authorization']='Bearer '+token
    if extra: h.update(extra)
    r=urllib.request.Request(URL+path, data=json.dumps(body).encode() if body is not None else None, headers=h, method=method)
    try:
        resp=urllib.request.urlopen(r, timeout=60); t=resp.read().decode(); return resp.status, (json.loads(t) if t else None)
    except urllib.error.HTTPError as e:
        t=e.read().decode(); return e.code, t
def sql(q):
    b=json.dumps({'query':q,'read_only':False}).encode()
    r=urllib.request.Request(f"https://api.supabase.com/v1/projects/{E['PRUEBAS_SUPABASE_REF']}/database/query",data=b,headers={'Authorization':'Bearer '+E['SUPABASE_ACCESS_TOKEN'],'Content-Type':'application/json','User-Agent':'quinteto-pruebas'})
    return json.load(urllib.request.urlopen(r,timeout=120))
# Usuarios de prueba
claves={}; ids={}
for nombre in ['admin_lib','admin_demo','planilla_demo','plataforma']:
    correo=f'{nombre}@pruebas.quinteto.invalid'; pw=secrets.token_urlsafe(18); claves[nombre]=(correo,pw)
    s,r=req('POST','/auth/v1/admin/users',{'email':correo,'password':pw,'email_confirm':True},key=SEC, extra={'Authorization':'Bearer '+SEC})
    if s>=300:
        # ya existe: buscarlo y cambiar contraseña
        u=sql(f"select id from auth.users where email='{correo}'")[0]['id']
        s,r=req('PUT',f'/auth/v1/admin/users/{u}',{'password':pw},key=SEC, extra={'Authorization':'Bearer '+SEC}); ids[nombre]=u
    else: ids[nombre]=r['id']
sql(f"""
insert into ligas (id, slug, nombre, estado) values
 ('00000000-0000-0000-0000-0000000d3e01','liga-demo','Liga Demo de Pruebas','activa'),
 ('00000000-0000-0000-0000-0000000d3e02','liga-pendiente','Liga Pendiente de Pruebas','pendiente')
on conflict (id) do nothing;
insert into miembros_liga (liga_id, usuario_id, rol, puede_planilla) values
 ('{LIB}','{ids['admin_lib']}','Administrador',true),
 ('00000000-0000-0000-0000-0000000d3e01','{ids['admin_demo']}','Administrador',true),
 ('00000000-0000-0000-0000-0000000d3e01','{ids['planilla_demo']}','Planilla',false)
on conflict do nothing;
insert into administradores_plataforma (usuario_id) values ('{ids['plataforma']}') on conflict do nothing;
insert into admin_temporadas (nombre, liga_id) select 'Temporada Pendiente','00000000-0000-0000-0000-0000000d3e02'
 where not exists (select 1 from admin_temporadas where liga_id='00000000-0000-0000-0000-0000000d3e02');
insert into equipos (nombre, slug, liga_id) values ('Equipo Oculto','oculto','00000000-0000-0000-0000-0000000d3e02') on conflict do nothing;
""")
tok={}
for n,(c,p) in claves.items():
    s,r=req('POST','/auth/v1/token?grant_type=password',{'email':c,'password':p}); tok[n]=r['access_token']
res=[]
def check(desc, ok):
    res.append(ok); print(('✅' if ok else '❌'), desc)
DEMO='00000000-0000-0000-0000-0000000d3e01'
# Lecturas públicas
s,r=req('GET',f'/rest/v1/jugadores?select=id&liga_id=eq.{LIB}'); check(f'Visitante ve los jugadores de LIBAVIME ({len(r)})', s==200 and len(r)==44)
s,r=req('GET','/rest/v1/equipos?select=nombre&slug=eq.oculto'); check('Visitante NO ve datos de una liga pendiente', s==200 and r==[])
s,r=req('POST','/rest/v1/equipos',{'nombre':'Intruso','liga_id':DEMO}); check('Visitante NO puede crear equipos', s in (401,403))
# Admin de liga demo
s,r=req('POST','/rest/v1/admin_temporadas',{'nombre':'Temporada Demo 2026','liga_id':DEMO},tok['admin_demo']); check('Admin demo crea temporada en su liga', s==201); temp=r[0]['id'] if s==201 else None
s,r=req('POST','/rest/v1/equipos',{'nombre':'Leones','slug':'leones','liga_id':DEMO},tok['admin_demo']); check('Admin demo crea equipo en su liga', s==201)
s,r=req('POST','/rest/v1/equipos',{'nombre':'Titanes Demo','slug':'titanes','liga_id':DEMO},tok['admin_demo']); check('Admin demo puede usar un slug que ya existe en LIBAVIME ("titanes")', s==201)
s,r=req('POST','/rest/v1/equipos',{'nombre':'Sin liga','slug':'sin-liga'},tok['admin_demo']); check('Admin demo NO puede crear sin liga (cae en LIBAVIME y se rechaza)', s in (401,403))
s,r=req('POST','/rest/v1/equipos',{'nombre':'Infiltrado','slug':'infiltrado','liga_id':LIB},tok['admin_demo']); check('Admin demo NO puede crear en LIBAVIME', s in (401,403))
s,r=req('PATCH',f'/rest/v1/equipos?liga_id=eq.{LIB}',{'nombre':'HACKEADO'},tok['admin_demo']); check('Admin demo NO puede editar equipos de LIBAVIME', s==200 and r==[])
s,r=req('DELETE',f'/rest/v1/partidos?liga_id=eq.{LIB}',None,tok['admin_demo']); check('Admin demo NO puede borrar partidos de LIBAVIME', s==200 and r==[])
s,r=req('PATCH',f'/rest/v1/equipos?slug=eq.leones&liga_id=eq.{DEMO}',{'liga_id':LIB},tok['admin_demo']); check('Admin demo NO puede mover su equipo a LIBAVIME', s in (401,403))
# Partido y estadísticas en demo
s,r=req('POST','/rest/v1/jugadores',{'nombre':'Jugador Demo','slug':'jugador-demo','equipo':'Leones','liga_id':DEMO},tok['admin_demo']); jd=r[0]['id'] if s==201 else None; check('Admin demo crea jugador', s==201)
s,r=req('POST','/rest/v1/partidos',{'equipo_local':'Leones','equipo_visitante':'Titanes Demo','fecha':'2026-12-05','hora':'6:00 PM','estado':'Programado','temporada_id':temp,'liga_id':DEMO},tok['admin_demo']); pd=r[0]['id'] if s==201 else None; check('Admin demo crea partido', s==201)
lib_temp=sql(f"select id from admin_temporadas where liga_id='{LIB}' limit 1")[0]['id']
s,r=req('POST','/rest/v1/partidos',{'equipo_local':'X','equipo_visitante':'Y','fecha':'2026-12-05','temporada_id':lib_temp,'liga_id':DEMO},tok['admin_demo']); check('NO se puede crear un partido con temporada de otra liga', s>=400)
s,r=req('POST','/rest/v1/estadisticas_partido',{'partido_id':pd,'jugador_id':jd,'puntos':12},tok['planilla_demo']); check('Planilla demo registra estadística (liga asignada sola)', s==201 and r[0]['liga_id']==DEMO)
lib_jug=sql(f"select id from jugadores where liga_id='{LIB}' limit 1")[0]['id']
s,r=req('POST','/rest/v1/estadisticas_partido',{'partido_id':pd,'jugador_id':lib_jug,'puntos':99},tok['planilla_demo']); check('NO se puede poner un jugador de LIBAVIME en un partido de demo', s>=400)
s,r=req('PATCH',f'/rest/v1/partidos?id=eq.{pd}',{'puntos_local':12},tok['planilla_demo']); check('Planilla demo actualiza marcador de su liga', s==200 and len(r)==1)
s,r=req('PATCH',f'/rest/v1/equipos?slug=eq.leones&liga_id=eq.{DEMO}',{'nombre':'X'},tok['planilla_demo']); check('Planilla demo NO puede editar equipos', s==200 and r==[])
s,r=req('PATCH',f'/rest/v1/partidos?liga_id=eq.{LIB}',{'puntos_local':0},tok['planilla_demo']); check('Planilla demo NO puede tocar marcadores de LIBAVIME', s==200 and r==[])
s,r=req('PATCH','/rest/v1/ligas?slug=eq.liga-demo',{'estado':'suspendida'},tok['admin_demo']); check('Admin demo NO puede cambiar el estado/plan de su liga', s in (401,403))
s,r=req('PATCH','/rest/v1/ligas?slug=eq.liga-demo',{'color_primario':'#0f766e'},tok['admin_demo']); check('Admin demo SÍ puede cambiar los colores de su liga', s==200 and len(r)==1)
s,r=req('POST','/rest/v1/miembros_liga',{'liga_id':LIB,'usuario_id':ids['admin_demo'],'rol':'Administrador'},tok['admin_demo']); check('Admin demo NO puede hacerse admin de LIBAVIME', s in (401,403))
# Admin LIBAVIME
s,r=req('PATCH',f'/rest/v1/equipos?liga_id=eq.{LIB}&slug=eq.titanes',{'color':'#b91c1c'},tok['admin_lib']); check('Admin LIBAVIME edita su equipo', s==200 and len(r)==1)
s,r=req('PATCH',f'/rest/v1/equipos?liga_id=eq.{DEMO}',{'nombre':'X'},tok['admin_lib']); check('Admin LIBAVIME NO puede editar la liga demo', s==200 and r==[])
# Plataforma
s,r=req('GET','/rest/v1/equipos?select=nombre&slug=eq.oculto',None,tok['plataforma']); check('Administradora de plataforma SÍ ve ligas pendientes', s==200 and len(r)==1)
# Vistas
s,r=req('GET',f'/rest/v1/estadisticas_jugadores?select=jugador_id,liga_id&liga_id=eq.{DEMO}'); check('Vista de promedios filtra por liga', s==200 and len(r)==1)
print(f"\nResultado: {sum(res)}/{len(res)} pruebas superadas")
