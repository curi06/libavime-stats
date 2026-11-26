const { chromium } = require('playwright-core');
const B = 'http://localhost:3931', L = '/liga-nueva';
(async () => {
  const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errores = [];
  p.on('pageerror', e => errores.push(e.message));
  p.on('dialog', async d => { console.log('   [aviso del sitio]', d.message().slice(0, 120)); await d.accept(); });
  await p.goto(B + '/login');
  await p.fill('input[type=email]', process.env.CORREO); await p.fill('input[type=password]', process.env.CLAVE);
  await p.click('button[type=submit]'); await p.waitForURL(/admin/, { timeout: 60000 });

  for (const [nombre, slug, color] of [['Halcones', 'halcones', 'Azul'], ['Tiburones', 'tiburones', 'Gris']]) {
    await p.goto(B + L + '/admin/equipos'); await p.waitForTimeout(2500);
    await p.fill('input[placeholder="Nombre"]', nombre); await p.fill('input[placeholder="Slug"]', slug);
    await p.setInputFiles('input[type=file]', 'public/logos/gladiadores.png'); await p.waitForTimeout(4000);
    await p.fill('input[placeholder="Color Principal"]', color);
    await p.click('button:has-text("Guardar Equipo")'); await p.waitForTimeout(3000);
    console.log('equipo', nombre, '→', (await p.innerText('main')).includes(nombre) ? 'aparece en la lista' : 'NO aparece');
  }
  for (const [nombre, slug, num, equipo] of [['Ana Pérez', 'ana-perez', 7, 'Halcones'], ['Luis Gómez', 'luis-gomez', 10, 'Halcones'], ['Marta Díaz', 'marta-diaz', 4, 'Tiburones'], ['Pedro Ruiz', 'pedro-ruiz', 23, 'Tiburones']]) {
    await p.goto(B + L + '/admin/jugadores'); await p.waitForTimeout(2500);
    await p.fill('input[placeholder="Nombre completo"]', nombre); await p.fill('input[placeholder^="Slug"]', slug);
    await p.fill('input[placeholder="Número"]', String(num)); await p.fill('input[placeholder="Posición"]', 'Base');
    await p.selectOption('select[aria-label="Equipo"]', { label: equipo });
    await p.click('button:has-text("Guardar Jugador")'); await p.waitForTimeout(3000);
    console.log('jugador', nombre, '→', (await p.innerText('main')).includes(nombre) ? 'aparece' : 'NO aparece');
  }
  await p.goto(B + L + '/admin/partidos'); await p.waitForTimeout(3000);
  const opciones = await p.$$eval('select:first-of-type option', os => os.map(o => o.textContent));
  console.log('opciones de equipo local:', opciones.join(', '));
  const sel = await p.$$('select');
  await sel[0].selectOption({ label: 'Halcones' }); await sel[1].selectOption({ label: 'Tiburones' });
  await p.fill('input[type=date]', '2026-11-22'); await p.fill('input[placeholder^="Hora"]', '7:00 PM'); await p.fill('input[placeholder="Cancha"]', 'Polideportivo Central');
  await p.click('button:has-text("Guardar Partido")'); await p.waitForTimeout(3500);
  console.log('partido →', (await p.innerText('main')).includes('Halcones') ? 'aparece en la lista' : 'NO aparece');
  console.log('errores JS:', errores.length ? errores : 'ninguno');
  await b.close();
})().catch(e => { console.error('FALLO:', e.message); process.exit(1); });
