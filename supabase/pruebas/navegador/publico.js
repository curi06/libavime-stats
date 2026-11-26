const { chromium } = require('playwright-core');
const B = 'http://localhost:3931/liga-nueva';
const esperado = {
  '': ['Halcones', 'Tiburones', '8'],
  '/clasificacion': ['Halcones', 'Tiburones'],
  '/resultados': ['Halcones', '8', 'Tiburones', '5'],
  ['/resultados/' + process.env.PARTIDO]: ['Ana Pérez', '6'],
  '/estadisticas': ['Ana Pérez', 'Marta Díaz'],
  '/equipos/halcones': ['Halcones', 'Ana Pérez', 'Luis Gómez'],
  '/jugadores': ['Ana Pérez', 'Pedro Ruiz'],
  '/calendario': ['Liga Nueva de Pruebas'],
  '/mvp': ['Ana Pérez'],
};
(async () => {
  const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errores = [];
  p.on('pageerror', e => errores.push(e.message));
  let ok = 0, total = 0;
  for (const [ruta, textos] of Object.entries(esperado)) {
    total++;
    await p.goto(B + ruta); await p.waitForTimeout(4500);
    const t = (await p.innerText('body')).replace(/\s+/g, ' ');
    const faltan = textos.filter(x => !t.includes(x));
    const intrusos = ['LIBAVIME', 'Gladiadores', 'Espartanos', 'Vikingos'].filter(x => t.includes(x));
    const bien = faltan.length === 0 && intrusos.length === 0;
    ok += bien;
    console.log(bien ? '✅' : '❌', ruta || '/', bien ? '' : `faltan: [${faltan}]  datos de LIBAVIME: [${intrusos}]  · ${t.slice(0, 160)}`);
    if (ruta === '/clasificacion') console.log('     ', t.match(/Halcones[^A-Z]{0,40}/)?.[0]);
  }
  console.log(`\n${ok}/${total} páginas correctas · errores JS: ${errores.length ? errores.join(' | ') : 'ninguno'}`);
  await b.close();
})().catch(e => { console.error('FALLO:', e.message); process.exit(1); });
