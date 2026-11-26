const { chromium } = require('playwright-core');
const B = 'http://localhost:3931';
const res = [];
const check = (d, ok, x = '') => { res.push(!!ok); console.log(ok ? '✅' : '❌', d, ok ? '' : '→ ' + String(x).slice(0, 220)); };
const texto = async (p) => (await p.innerText('body')).replace(/\s+/g, ' ');
(async () => {
  const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errores = [];
  p.on('pageerror', e => errores.push(e.message));

  // Liga con dos temporadas: 2026 (Halcones 8-5 Tiburones) y 2027 (activa, sin resultados)
  await p.goto(B + '/liga-nueva/clasificacion'); await p.waitForTimeout(4000);
  let t = await texto(p);
  check('Clasificación abre en la temporada activa (2027, sin el 8-5 de 2026)', !/Halcones 1 1 0 8 5/.test(t), t.match(/Halcones[^A-Z]{0,30}/)?.[0]);
  check('El selector de temporada aparece', (await p.$('select option:has-text("Temporada 2026")')) !== null);

  await p.selectOption('nav select', { label: 'Temporada 2026' }); await p.waitForTimeout(5000);
  check('Elegir 2026 cambia la dirección a ?temporada=' + process.env.T2026 + '', p.url().includes('temporada=' + process.env.T2026 + ''), p.url());
  t = await texto(p);
  check('…y muestra la clasificación de 2026 (Halcones 1-0, 8-5)', /Halcones 1 1 0 8 5/.test(t), t.match(/Halcones[^A-Z]{0,30}/)?.[0]);
  const enlaceEquipo = await p.getAttribute('a[href*="/equipos/halcones"]', 'href');
  check('Los enlaces conservan la temporada elegida', (enlaceEquipo || '').includes('temporada=' + process.env.T2026 + ''), enlaceEquipo);

  await p.goto(B + '/liga-nueva/estadisticas?temporada=' + process.env.T2026 + ''); await p.waitForTimeout(6000);
  t = await texto(p);
  check('Estadísticas de 2026 muestran a Ana Pérez', t.includes('Ana Pérez'));
  await p.goto(B + '/liga-nueva/estadisticas'); await p.waitForTimeout(6000);
  t = await texto(p);
  check('Estadísticas de 2027 (activa) no muestran los puntos de 2026', !t.includes('Ana Pérez') || /0 jugadores|No hay/.test(t), t.slice(0, 200));

  await p.goto(B + '/liga-nueva/resultados?temporada=' + process.env.T2026 + ''); await p.waitForTimeout(4000);
  check('Resultados de 2026 muestran el 8-5', (await texto(p)).includes('Halcones'));
  await p.goto(B + '/liga-nueva/calendario'); await p.waitForTimeout(4000);
  t = await texto(p);
  check('Calendario de 2027 muestra Tiburones vs Pumas', t.toUpperCase().includes('PUMAS'), t.slice(0, 200));
  await p.goto(B + '/liga-nueva?temporada=' + process.env.T2026 + ''); await p.waitForTimeout(6000);
  t = await texto(p);
  check('Portada de 2026 muestra el récord de Halcones 1-0', /Halcones Récord 1-0/.test(t), t.match(/Halcones Récord \d+-\d+/)?.[0]);
  await p.goto(B + '/liga-nueva/resultados/' + process.env.PARTIDO + ''); await p.waitForTimeout(4000);
  check('El detalle de un partido de 2026 abre desde 2027 (enlaces viejos)', (await texto(p)).includes('Ana Pérez'));

  // Liga con una sola temporada: sin selector y con sus datos de siempre
  await p.goto(B + '/libavime'); await p.waitForTimeout(7000);
  t = await texto(p);
  check('LIBAVIME (una temporada): sin selector', (await p.$('select option:has-text("(actual)")')) === null);
  check('LIBAVIME conserva sus récords (Vikingos 3-6)', t.includes('Vikingos Récord 3-6'), t.match(/Vikingos Récord \d+-\d+/)?.[0]);
  await p.goto(B + '/libavime/jugadores'); await p.waitForTimeout(5000);
  check('LIBAVIME: jugadores con promedios', /PPG \d/.test(await texto(p)));

  console.log(`\n${res.filter(Boolean).length}/${res.length} pruebas superadas · errores JS: ${errores.length ? errores.slice(0, 3).join(' | ') : 'ninguno'}`);
  await b.close();
})().catch(e => { console.error('FALLO:', e.message); process.exit(1); });
