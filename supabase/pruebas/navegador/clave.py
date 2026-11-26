import json, secrets, sys, urllib.request
E={}
for l in open('.env.pruebas'):
    l=l.strip()
    if l and not l.startswith('#') and '=' in l: k,v=l.split('=',1); E[k]=v
assert E['PRUEBAS_SUPABASE_REF']=='nhqupfhsilhvrzvgjdoo'
correo=sys.argv[1]
q=json.dumps({'query':f"select id from auth.users where email='{correo}'",'read_only':True}).encode()
r=urllib.request.Request(f"https://api.supabase.com/v1/projects/{E['PRUEBAS_SUPABASE_REF']}/database/query",data=q,headers={'Authorization':'Bearer '+E['SUPABASE_ACCESS_TOKEN'],'Content-Type':'application/json','User-Agent':'quinteto-pruebas'})
uid=json.load(urllib.request.urlopen(r,timeout=60))[0]['id']
pw=secrets.token_urlsafe(18)
r=urllib.request.Request(f"{E['PRUEBAS_SUPABASE_URL']}/auth/v1/admin/users/{uid}",data=json.dumps({'password':pw}).encode(),method='PUT',headers={'apikey':E['PRUEBAS_SUPABASE_SERVICE_ROLE_KEY'],'Authorization':'Bearer '+E['PRUEBAS_SUPABASE_SERVICE_ROLE_KEY'],'Content-Type':'application/json'})
urllib.request.urlopen(r,timeout=60); print(pw)
