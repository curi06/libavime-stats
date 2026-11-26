const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const p = await b.newPage();
  const errores = [];
  p.on('pageerror', e => errores.push(e.message));
  await p.goto(process.env.URL); await p.waitForTimeout(8000);
  const t = (await p.innerText('body')).replace(/\s+/g, ' ');
  console.log('Récords:', (t.match(/(Gladiadores|Vikingos|Titanes|Espartanos) Récord \d+-\d+/g) || []).join(' · '));
  console.log('Portada de finales:', t.includes('La Gran Final') ? 'presente' : 'NO');
  console.log('Errores JS:', errores.length ? errores : 'ninguno');
  await b.close();
})();
