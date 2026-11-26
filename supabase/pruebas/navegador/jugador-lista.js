const { chromium } = require('playwright-core');
const B = 'http://localhost:3931/liga-nueva';
(async () => {
  const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errores = [];
  p.on('pageerror', e => errores.push(e.message));
  p.on('dialog', d => d.accept());
  await p.goto('http://localhost:3931/login');
  await p.fill('input[type=email]', process.env.CORREO); await p.fill('input[type=password]', process.env.CLAVE);
  await p.click('button[type=submit]'); await p.waitForURL(/admin/, { timeout: 60000 });
  // Crear un equipo nuevo y, sin recargar, ir a jugadores: debe aparecer en la lista.
  await p.goto(B + '/admin/equipos'); await p.waitForTimeout(2500);
  await p.fill('input[placeholder="Nombre"]', 'Pumas'); await p.fill('input[placeholder="Slug"]', 'pumas');
  await p.click('button:has-text("Guardar Equipo")'); await p.waitForTimeout(3500);
  await p.click('a:has-text("Jugadores")'); await p.waitForTimeout(3500);
  const opciones = await p.$$eval('select[aria-label="Equipo"] option', os => os.map(o => o.textContent));
  console.log((opciones.includes('Pumas') ? '✅' : '❌'), 'La lista de equipos incluye el recién creado sin recargar:', opciones.join(', '));
  await p.fill('input[placeholder="Nombre completo"]', 'Sofía Reyes'); await p.fill('input[placeholder^="Slug"]', 'sofia-reyes');
  await p.fill('input[placeholder="Número"]', '12'); await p.fill('input[placeholder="Posición"]', 'Alero');
  await p.selectOption('select[aria-label="Equipo"]', { label: 'Pumas' });
  await p.click('button:has-text("Guardar Jugador")'); await p.waitForTimeout(3500);
  console.log(((await p.innerText('main')).includes('Sofía Reyes') ? '✅' : '❌'), 'Jugador creado eligiendo el equipo de la lista');
  console.log('errores JS:', errores.length ? errores : 'ninguno');
  await b.close();
})().catch(e => { console.error('FALLO:', e.message); process.exit(1); });
