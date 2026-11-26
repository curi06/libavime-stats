const { chromium } = require('playwright-core');
const B = 'http://localhost:3931';
const OUT = process.env.SALIDA;
const check = (d, ok, x = '') => console.log(ok ? '✅' : '❌', d, ok ? '' : '→ ' + x);
const LISTA = [
  'Roberto Díaz, 5, Base, Halcones',
  'tiburones; #14; mario santos; pívot',
  'Jorge Peña\t9\tEscolta\tPumas',
  '1. Kelvin Rosario - 21',
  '- Wilson Tavárez, 33',
  'Félix Mora, 2, alero, halcones',
  'Ana Pérez, 7, Halcones',          // ya existe en la liga
  'Pedro Malo, 8, Base, Halcone',    // equipo mal escrito
  'Roberto Diaz, 6, Tiburones',      // repetido en la misma lista (sin acento)
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
  await p.goto(B + '/liga-nueva/admin/jugadores'); await p.waitForTimeout(7000);
  await p.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  await p.locator('button', { hasText: 'Cargar varios jugadores' }).tap(); await p.waitForTimeout(500);
  await p.selectOption('section select', { label: 'Halcones' });   // equipo para líneas sin equipo
  await p.fill('textarea[aria-label="Lista de jugadores"]', LISTA); await p.waitForTimeout(800);
  const resumen = await p.locator('text=Vista previa').innerText();
  check('Vista previa: 6 listos y 3 con problemas', /6 listos.*3 con problemas/.test(resumen), resumen);
  const seccion = p.locator('section', { hasText: 'Cargar varios jugadores' });
  await seccion.scrollIntoViewIfNeeded();
  await seccion.screenshot({ path: OUT + '/30-carga-masiva-vista-previa.png' });
  await p.locator('button', { hasText: 'Guardar 6 jugadores' }).tap(); await p.waitForTimeout(5000);
  const estado = await p.locator('[role=status]').innerText().catch(() => '');
  check('Guarda 6 y avisa que quedan 3 por corregir', estado.includes('6 jugadores agregados') && estado.includes('3 líneas'), estado);
  const restante = await p.inputValue('textarea[aria-label="Lista de jugadores"]');
  check('En el cuadro quedan solo las 3 líneas con problemas', restante.split('\n').length === 3 && restante.includes('Halcone'), restante);
  const lista = await p.innerText('body');
  check('La lista de jugadores ya muestra a los nuevos', ['Roberto Díaz', 'Mario Santos', 'Jorge Peña', 'Kelvin Rosario', 'Wilson Tavárez', 'Félix Mora'].every(n => lista.includes(n)));
  console.log('errores JS:', errores.length ? errores : 'ninguno');
  await b.close();
})().catch(e => { console.error('FALLO:', e.message); process.exit(1); });
