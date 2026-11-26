const { chromium } = require('playwright-core');
const B = 'http://localhost:3931';
const S = process.env.SALIDA;
(async () => {
  const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errores = [];
  p.on('pageerror', e => errores.push(e.message));
  // Metadatos al compartir
  for (const ruta of ['/quinteto', '/ligas', '/libavime', '/libavime/estadisticas', '/libavime/equipos/gladiadores', '/libavime/resultados/31', '/liga-demo']) {
    await p.goto(B + ruta); await p.waitForTimeout(2500);
    const meta = await p.evaluate(() => ({
      titulo: document.title,
      og: document.querySelector('meta[property="og:image"]')?.content ?? '(sin og:image)',
      desc: document.querySelector('meta[property="og:description"]')?.content ?? '',
    }));
    console.log(`${ruta}\n   título: ${meta.titulo}\n   imagen: ${meta.og.replace(/^https?:\/\/[^/]+/, '')}\n   texto:  ${meta.desc.slice(0, 90)}`);
  }
  // Capturas
  await p.goto(B + '/quinteto'); await p.waitForTimeout(2500);
  await p.screenshot({ path: S + '/quinteto.png', fullPage: false });
  for (const [ruta, archivo] of [['/opengraph-image', 'og-plataforma.png'], ['/libavime/opengraph-image', 'og-libavime.png'], ['/liga-demo/opengraph-image', 'og-demo.png']]) {
    const r = await p.goto(B + ruta); await p.waitForTimeout(1500);
    console.log(`${ruta} → ${r.status()} ${r.headers()['content-type']}`);
    await p.screenshot({ path: S + '/' + archivo });
  }
  console.log('errores JS:', errores.length ? errores : 'ninguno');
  await b.close();
})().catch(e => { console.error('FALLO:', e.message); process.exit(1); });
