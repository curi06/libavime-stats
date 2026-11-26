const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const p = await b.newPage();
  const errores = [];
  p.on('pageerror', e => errores.push(e.message));
  await p.goto(process.env.ENLACE); await p.waitForTimeout(6000);
  let t = (await p.innerText('body')).replace(/\s+/g, ' ');
  console.log((t.includes('Crea una contraseña') ? '✅' : '❌'), 'La invitación abre /bienvenida y reconoce a la persona →', t.slice(0, 120));
  const clave = 'Prueba-' + Math.random().toString(36).slice(2, 10) + '!';
  await p.fill('input[placeholder^="Contraseña"]', clave);
  await p.fill('input[placeholder^="Repite"]', clave);
  await p.click('button:has-text("Guardar contraseña")'); await p.waitForTimeout(4000);
  t = (await p.innerText('body')).replace(/\s+/g, ' ');
  console.log((t.includes('Tu cuenta está activa') ? '✅' : '❌'), 'Crea su contraseña');
  // Entrar con la contraseña nueva en un navegador limpio
  const c = await b.newContext(); const q = await c.newPage();
  await q.goto('http://localhost:3931/login');
  await q.fill('input[type=email]', 'nuevo.miembro@pruebas.quinteto.invalid'); await q.fill('input[type=password]', clave);
  await q.click('button[type=submit]'); await q.waitForTimeout(6000);
  await q.goto('http://localhost:3931/liga-demo/admin'); await q.waitForTimeout(5000);
  t = (await q.innerText('body')).replace(/\s+/g, ' ');
  console.log((!t.includes('Sin acceso') && t.includes('Panel') ? '✅' : '❌'), 'Inicia sesión con esa contraseña y entra al panel de su liga');
  console.log('errores JS:', errores.length ? errores : 'ninguno');
  await b.close();
})().catch(e => { console.error('FALLO:', e.message); process.exit(1); });
