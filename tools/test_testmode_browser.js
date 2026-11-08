// Headless-browser check of Test mode (node tools/test_testmode_browser.js).
// Words list › word › "Test this word": both flashcards, Type / Identify / Mix drills (with "And…?") restricted to that word,
// and Sentences restricted to it. Progress (Leitner boxes, stats, seen, daily goals) in localStorage must be byte-identical afterward.
// Needs puppeteer-core (npm i --no-save puppeteer-core, or set PUPPETEER_DIR) and Chrome (CHROME=/path/to/chrome).
let puppeteer; try { puppeteer = require(process.env.PUPPETEER_DIR || 'puppeteer-core'); } catch (e) { console.log('SKIPPED: puppeteer-core not installed'); process.exit(0); }
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const srv = http.createServer((q, r) => { if (q.url === '/favicon.ico') { r.writeHead(204); return r.end(); }
  const p = path.join(ROOT, decodeURIComponent(q.url.split(/[?#]/)[0]).replace(/\/$/, '/index.html'));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
let bad = 0, checks = 0; const ok = (c, m) => { checks++; if (!c) { bad++; console.log('FAIL', m); } };
const t = () => { const d = new Date(); return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000); };
(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r)); const URL = 'http://127.0.0.1:' + srv.address().port + '/';
  const br = await puppeteer.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
  const WORDS = [[1044, 'amō'], [194, 'puella'], [840, 'rēx']];
  for (const [id, q] of WORDS) {
    const pg = await br.newPage(), errs = []; pg.on('pageerror', e => errs.push(String(e))); pg.on('dialog', d => d.dismiss());
    await pg.goto(URL + 'manifest.webmanifest');
    const prog = { v: 3, cards: { ['r:' + id]: { box: 2, due: t() + 3, reps: 2, ivl: 3 }, 'r:1': { box: 1, due: t(), reps: 1, ivl: 1 } }, ds: { w: { 5: 3 } }, dst: {}, dq: 7,
      day: { d: t(), nv: 2, nd: 0, extra: 0, dx: 0, dn: 4 }, set: { dmode: 'type', dlen: 5, andMore: true } };
    await pg.evaluate(p => { localStorage.clear(); localStorage.setItem('latin1400.v1', JSON.stringify(p)); }, prog);
    await pg.goto(URL + '#list'); await pg.waitForSelector('#ul li[data-id]');
    const before = await pg.evaluate(() => localStorage.getItem('latin1400.v1'));   // after the app's own load-time save
    await pg.type('#q', q); await pg.waitForFunction(i => document.querySelector(`#ul li[data-id="${i}"]`), {}, id);
    await pg.evaluate(i => document.querySelector(`#ul li[data-id="${i}"]`).click(), id);
    await pg.waitForSelector('.tbtn'); await pg.evaluate(() => document.querySelector('.tbtn').click()); await pg.waitForSelector('#texit');
    ok(await pg.$eval('.prompt-kind', e => /Test mode/.test(e.textContent)), q + ' test panel');
    const same = async lbl => ok(await pg.evaluate(() => localStorage.getItem('latin1400.v1')) === before, `${q} progress changed after ${lbl}`);
    // play until we are back on the test panel; returns the words asked about
    async function play(lbl, right) {
      const seenIds = new Set(); let n = 0;
      for (let step = 0; step < 300; step++) {
        if (await pg.$('#texit')) break;
        const r = await pg.evaluate(right => { const q = s => document.querySelector(s);
          const lt = document.querySelector('#vc .latin, .card .latin'); const tag = q('.tag') ? q('.tag').textContent : '';
          if (q('#andskip')) { q('#andskip').click(); return { a: 'and' }; }
          const rb = q(`#ans button[data-r="${right ? 1 : 0}"]`) || q('#ans button[data-r]'); if (rb) { rb.click(); return { a: 'rw' }; }
          if (q('#idrows')) { q('#idrows').querySelectorAll('.idrow').forEach(row => { const b = row.querySelector('button:not([disabled])'); if (b && !row.querySelector('button.on')) b.click(); }); }
          if (q('#typed') && q('#chk')) q('#typed').value = right ? '' : 'zzz';
          const b = q('#chk') || q('#show'); if (b) { b.click(); return { a: 'q', w: lt && lt.textContent, tag }; } return { a: 'none' }; }, right);
        if (r.a === 'q') { n++; seenIds.add(r.w); if (!/Test mode/.test(r.tag) && lbl.startsWith('drill')) ok(false, `${q} ${lbl}: no Test mode tag`); }
        if (r.a === 'none') await new Promise(x => setTimeout(x, 30));
      }
      ok(await pg.$('#texit'), `${q} ${lbl}: back to test panel`); ok(n > 0, `${q} ${lbl}: asked something`);
      await same(lbl); return seenIds;
    }
    await pg.click('#tf-r'); await play('flashcard L→E', true);
    await pg.click('#tf-p'); await play('flashcard E→L', true);
    await pg.click('#tf-r'); await play('flashcard L→E wrong', false);
    for (const m of ['type', 'id', 'mix']) {
      const btn = await pg.$(`[data-tm="${m}"]`); ok(btn, `${q} drill button ${m}`); if (!btn) continue;
      await btn.click(); const ws = await play('drill ' + m, m !== 'type');
      ok([...ws].every(w => w && w.startsWith(q.replace(/,.*/, '').slice(0, 2))), `${q} drill ${m} other words: ${[...ws]}`);
    }
    // sentences restricted to the word
    const href = await pg.$eval('#tsent', a => a.getAttribute('href')); ok(href === 'sentences.html?word=' + id, q + ' sentence link ' + href);
    await pg.goto(URL + href); await pg.waitForSelector('#go'); ok(await pg.$('#tword') && !(await pg.$('#o-pool')), q + ' sentences test banner');
    await pg.click('#go'); await pg.waitForFunction(() => window.__sent || document.querySelector('#msg'));
    const ids = await pg.evaluate(() => window.__sent ? window.__sent.ses.items.map(s => window.LatinEngine.sentenceIds(s)) : null);
    ok(ids && ids.length > 0, q + ' has sentences'); if (ids) ids.forEach((x, k) => ok(x.includes(id), `${q} sentence ${k} lacks word`));
    await same('sentences');
    await pg.goto(URL + '#list'); await pg.waitForSelector('#ul'); await same('exit');
    ok(!errs.length, q + ' page errors: ' + errs.join(' | ')); await pg.close();
  }
  // tab switch leaves test mode and restores the real progress in memory
  { const pg = await br.newPage(); await pg.goto(URL + 'manifest.webmanifest'); await pg.evaluate(() => localStorage.clear()); await pg.goto(URL + '#list'); await pg.waitForSelector('#ul li[data-id]');
    await pg.evaluate(() => document.querySelector('#ul li[data-id]').click()); await pg.evaluate(() => document.querySelector('.tbtn').click()); await pg.waitForSelector('#texit');
    await pg.click('#tf-r'); await pg.click('#show'); await pg.evaluate(() => document.querySelector('#ans button[data-r="1"]').click());
    await pg.evaluate(() => document.querySelector('#tabs [data-tab="today"]').click());
    const s = await pg.evaluate(() => JSON.parse(localStorage.getItem('latin1400.v1')).cards); ok(Object.keys(s).length === 0, 'tab switch: no cards saved');
    await pg.close(); }
  await br.close(); srv.close();
  console.log(bad ? `${bad} FAILED of ${checks}` : `Test mode browser checks: all ${checks} OK`); process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
