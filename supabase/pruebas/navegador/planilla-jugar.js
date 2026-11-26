const { chromium } = require('playwright-core');
const B = 'http://localhost:3931';
(async () => {
  const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errores = [];
  p.on('pageerror', e => errores.push(e.message));
  p.on('dialog', async d => { console.log('   [confirmación]', d.message().replace(/\s+/g, ' ').slice(0, 90)); await d.accept(); });
  await p.goto(B + '/liga-nueva/planilla'); await p.waitForTimeout(3000);
  await p.fill('input[type=email]', process.env.CORREO); await p.fill('input[type=password]', process.env.CLAVE);
  await p.click('button[type=submit]'); await p.waitForTimeout(5000);
  await p.selectOption('select', { index: 1 }); await p.waitForTimeout(5000);

  const fila = (nombre) => p.locator('div, tr').filter({ hasText: nombre }).filter({ has: p.locator('button:text-is("+3")') }).last();
  const tocar = async (nombre, boton, veces = 1) => {
    for (let i = 0; i < veces; i++) { await fila(nombre).locator(`button:text-is("${boton}")`).first().click(); await p.waitForTimeout(1200); }
  };
  await tocar('Ana Pérez', '+3', 2);   // 6
  await tocar('Luis Gómez', '+2', 1);  // 2  → Halcones 8
  await tocar('Ana Pérez', '+', 1);    // primer "+" = rebote
  // Cambiar al otro equipo
  const cambio = p.locator('button').filter({ hasText: 'REB' }).nth(1);
  await cambio.click(); await p.waitForTimeout(2500);
  await tocar('Marta Díaz', '+2', 2);  // 4
  await tocar('Pedro Ruiz', '+1', 1);  // 1  → Tiburones 5
  await p.waitForTimeout(3000);
  console.log('Marcador en la planilla:', (await p.innerText('body')).replace(/\s+/g, ' ').match(/Halcones \d+ VS Tiburones \d+/)?.[0]);
  await p.click('button:has-text("FINALIZAR PARTIDO")'); await p.waitForTimeout(6000);
  console.log('Mensaje:', (await p.innerText('body')).replace(/\s+/g, ' ').match(/🏁[^.]*\./)?.[0] ?? '(sin mensaje)');
  console.log('errores JS:', errores.length ? errores : 'ninguno');
  await b.close();
})().catch(e => { console.error('FALLO:', e.message); process.exit(1); });
