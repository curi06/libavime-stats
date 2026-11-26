const { chromium } = require('playwright-core');
const B = 'http://localhost:3931';
const OUT = process.env.SALIDA;
const check = (d, ok, x = '') => console.log(ok ? '✅' : '❌', d, ok ? '' : '→ ' + String(x).slice(0, 300));
const CALENDARIO = [
  '12/12/2026, 6:00 PM, Halcones vs Tiburones, Polideportivo Central',
  '13/12/2026, 7pm, Pumas - Halcones',
  '2026-12-19\t18:30\tTiburones\tPumas\tClub Los Prados',
  '- 20/12/2026, tiburones contra halcones',
  '27/12/2026, 5:00 PM, Pumas x Tiburones, Cancha Techada',
  '28/12/2026, 6pm, Halcones vs Leones',     // equipo inexistente
  '31/02/2027, 6pm, Pumas vs Halcones',      // fecha inválida
].join('\n');
(async () => {
  const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  const errores = [];
  p.on('pageerror', e => errores.push(e.message));
  await p.goto(B + '/login');
  await p.fill('input[type=email]', process.env.CORREO); await p.fill('input[type=password]', process.env.CLAVE);
  await p.click('button[type=submit]'); await p.waitForTimeout(6000);
  await p.goto(B + '/liga-nueva/admin/partidos'); await p.waitForTimeout(7000);
  await p.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  await p.locator('button', { hasText: 'Cargar el calendario completo' }).tap(); await p.waitForTimeout(500);
  const seccion = p.locator('section', { hasText: 'Cargar el calendario completo' });
  await seccion.locator('input[placeholder="6:00 PM"]').fill('6:00 PM');
  await seccion.locator('input[placeholder="Polideportivo Central"]').fill('Polideportivo Central');
  await p.fill('textarea[aria-label="Calendario de partidos"]', CALENDARIO); await p.waitForTimeout(800);
  const resumen = await seccion.locator('text=Vista previa').innerText();
  check('Vista previa: 5 listos y 2 con problemas', /5 listos.*2 con problemas/.test(resumen), resumen);
  const ancho = await p.evaluate(() => document.documentElement.scrollWidth);
  check('Cabe en la pantalla del celular', ancho <= 392, ancho);
  await seccion.scrollIntoViewIfNeeded();
  await seccion.screenshot({ path: OUT + '/31-carga-calendario-vista-previa.png' });
  await p.locator('button', { hasText: 'Guardar 5 partidos' }).tap(); await p.waitForTimeout(5000);
  const estado = await seccion.locator('[role=status]').innerText().catch(() => '');
  check('Guarda 5 y avisa que quedan 2 por corregir', estado.includes('5 partidos agregados') && estado.includes('2 líneas'), estado);
  const restante = await p.inputValue('textarea[aria-label="Calendario de partidos"]');
  check('En el cuadro quedan solo las 2 líneas con problemas', restante.split('\n').length === 2 && restante.includes('Leones'), restante);
  // Calendario público
  const pub = await ctx.newPage();
  await pub.goto(B + '/liga-nueva/calendario'); await pub.waitForTimeout(7000);
  const t = (await pub.innerText('body')).toUpperCase();
  check('El calendario público muestra los partidos nuevos', t.includes('12/12/2026') && t.includes('POLIDEPORTIVO CENTRAL') && t.includes('CLUB LOS PRADOS'), t.slice(0, 300));
  console.log('errores JS:', errores.length ? errores : 'ninguno');
  await b.close();
})().catch(e => { console.error('FALLO:', e.message); process.exit(1); });
