const { chromium } = require('playwright-core');
const B = 'http://localhost:3931';
(async () => {
  const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const a = await b.newPage();
  a.on('dialog', d => d.accept());
  await a.goto(B + '/login');
  await a.fill('input[type=email]', process.env.CORREO); await a.fill('input[type=password]', process.env.CLAVE);
  await a.click('button[type=submit]'); await a.waitForURL(/admin/, { timeout: 60000 });
  for (const temporada of ['Temporada 2027', 'Temporada 2026']) {
    await a.goto(B + '/liga-nueva/admin/temporadas'); await a.waitForTimeout(4000);
    const boton = a.locator('li', { hasText: temporada }).locator('button:has-text("Activar")');
    if (await boton.count()) { await boton.click(); await a.waitForTimeout(5000); }
    console.log('   activada:', temporada);
  }
  const p = await b.newPage();
  await p.goto(B + '/liga-nueva'); await p.waitForTimeout(8000);
  const t = (await p.innerText('body')).replace(/\s+/g, ' ');
  const record = t.match(/Halcones Récord \d+-\d+/)?.[0];
  console.log((record === 'Halcones Récord 1-0' ? '✅' : '❌'), 'Tras volver a 2026, la portada muestra', record);
  console.log((/Halcones 8|8 .{0,40}Tiburones/.test(t) ? '✅' : '❌'), 'y el resultado 8-5 en "Últimos resultados"');
  await b.close();
})().catch(e => { console.error('FALLO:', e.message); process.exit(1); });
