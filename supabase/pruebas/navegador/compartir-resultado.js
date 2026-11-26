const { chromium } = require('playwright-core');
const B = 'http://localhost:3931';
const OUT = process.env.SALIDA;
const check = (d, ok, x = '') => console.log(ok ? '✅' : '❌', d, ok ? '' : '→ ' + String(x).slice(0, 400));
const textoWhatsapp = async (p) => decodeURIComponent((await p.getAttribute('a[href^="https://wa.me/?text="]', 'href')).split('text=')[1]);
(async () => {
  const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errores = [];
  // Página pública del resultado
  const pub = await ctx.newPage();
  pub.on('pageerror', e => errores.push(e.message));
  await pub.goto(`${B}/liga-nueva/resultados/${process.env.PARTIDO}`); await pub.waitForTimeout(7000);
  await pub.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  const t1 = await textoWhatsapp(pub);
  console.log('--- Mensaje desde el box score ---\n' + t1 + '\n---');
  check('Box score: marcador, ganador y anotadores', t1.includes('Halcones 8 - 5 Tiburones') && t1.includes('Ganó Halcones') && t1.includes('Ana Pérez (Halcones): 6 pts') && t1.includes('Marta Díaz (Tiburones): 4 pts'));
  check('Box score: enlace correcto', t1.includes(`${B}/liga-nueva/resultados/${process.env.PARTIDO}`), t1);
  await pub.locator('button', { hasText: 'Compartir resultado' }).scrollIntoViewIfNeeded();
  await pub.screenshot({ path: OUT + '/32-compartir-box-score.png' });
  // Planilla con el partido terminado
  const p = await ctx.newPage();
  p.on('pageerror', e => errores.push(e.message));
  await p.goto(B + '/liga-nueva/planilla'); await p.waitForTimeout(4000);
  await p.fill('input[type=email]', process.env.CORREO); await p.fill('input[type=password]', process.env.CLAVE);
  await p.click('button[type=submit]'); await p.waitForTimeout(6000);
  const opciones = await p.$$eval('select option', os => os.map(o => ({ v: o.value, t: o.textContent })));
  const elegido = opciones.find(o => o.v === process.env.PARTIDO);
  check('La planilla ofrece el partido terminado', !!elegido, JSON.stringify(opciones));
  if (elegido) {
    await p.selectOption('select', process.env.PARTIDO); await p.waitForTimeout(6000);
    const t2 = await textoWhatsapp(p);
    check('Planilla: mismo mensaje con marcador y anotadores', t2.includes('Halcones 8 - 5 Tiburones') && t2.includes('Ana Pérez (Halcones): 6 pts'), t2);
  }
  console.log('errores JS:', errores.length ? errores : 'ninguno');
  await b.close();
})().catch(e => { console.error('FALLO:', e.message); process.exit(1); });
