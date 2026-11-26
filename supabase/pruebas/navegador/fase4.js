const { chromium } = require('playwright-core');
const B = 'http://localhost:3931';
const res = [];
const check = (d, ok, x = '') => { res.push(!!ok); console.log(ok ? '✅' : '❌', d, ok ? '' : '→ ' + x); };
async function entrar(b, correo, clave) {
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  p.on('dialog', d => d.accept());
  await p.goto(B + '/login');
  await p.fill('input[type=email]', correo); await p.fill('input[type=password]', clave);
  await p.click('button[type=submit]'); await p.waitForURL(/admin/, { timeout: 60000 });
  return p;
}
(async () => {
  const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  // Administrador de la liga nueva
  const a = await entrar(b, process.env.CORREO_ADMIN, process.env.CLAVE_ADMIN);
  await a.goto(B + '/liga-nueva/admin'); await a.waitForTimeout(5000);
  let t = (await a.innerText('main')).replace(/\s+/g, ' ');
  check('El administrador ve "Primeros pasos"', t.includes('Primeros pasos'), t.slice(0, 120));
  check('…con el progreso real (equipos/jugadores/partidos listos; falta logo)', /\d de 5/.test(t) && t.includes('Personaliza tu liga'), t.match(/\d de 5/)?.[0]);

  await a.goto(B + '/liga-nueva/admin/temporadas'); await a.waitForTimeout(4000);
  t = (await a.innerText('main')).replace(/\s+/g, ' ');
  check('Temporadas muestra la temporada activa con sus partidos', t.includes('Temporada 2026') && t.includes('ACTIVA'), t.slice(0, 200));
  await a.fill('input[maxlength="60"]', 'Temporada 2027');
  await a.fill('input[type=date] >> nth=0', '2027-02-01');
  await a.click('button:has-text("Crear temporada")'); await a.waitForTimeout(3500);
  t = (await a.innerText('main')).replace(/\s+/g, ' ');
  check('Crear la Temporada 2027', t.includes('Temporada 2027'), t.slice(0, 200));
  await a.locator('li', { hasText: 'Temporada 2027' }).locator('button:has-text("Activar")').click(); await a.waitForTimeout(5000);
  t = (await a.innerText('main')).replace(/\s+/g, ' ');
  check('Activar 2027 (y 2026 deja de estar activa)', /Temporada 2027\s*ACTIVA/.test(t) && !/Temporada 2026\s*ACTIVA/.test(t), t.slice(0, 260));

  // La página pública muestra la nueva temporada
  const pub = await b.newPage(); await pub.goto(B + '/liga-nueva/equipos'); await pub.waitForTimeout(4000);
  check('La página pública ya dice "2027"', (await pub.innerText('body')).includes('Liga Nueva de Pruebas 2027'));

  // Un partido nuevo cae en la temporada activa
  await a.goto(B + '/liga-nueva/admin/partidos'); await a.waitForTimeout(3500);
  const sel = await a.$$('select');
  await sel[0].selectOption({ label: 'Tiburones' }); await sel[1].selectOption({ label: 'Pumas' });
  await a.fill('input[type=date]', '2027-02-10'); await a.fill('input[placeholder^="Hora"]', '6:00 PM'); await a.fill('input[placeholder="Cancha"]', 'Polideportivo Central');
  await a.click('button:has-text("Guardar Partido")'); await a.waitForTimeout(3500);
  console.log('   (temporada del partido nuevo: se verifica en la base)');

  // Alguien con rol Consulta/Planilla no ve los primeros pasos
  const c = await entrar(b, process.env.CORREO_OTRO, process.env.CLAVE_OTRO);
  await c.goto(B + '/liga-demo/admin'); await c.waitForTimeout(5000);
  t = (await c.innerText('main')).replace(/\s+/g, ' ');
  check('Un miembro de planilla NO ve "Primeros pasos"', !t.includes('Primeros pasos') && !t.includes('Sin acceso'), t.slice(0, 120));
  console.log(`\n${res.filter(Boolean).length}/${res.length} pruebas superadas`);
  await b.close();
})().catch(e => { console.error('FALLO:', e.message); process.exit(1); });
