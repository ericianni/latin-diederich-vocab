// Headless-browser check of the Sentences (beta) page (node tools/test_sentences_browser.js).
// About tab link; Translate (typed and word chips) and Identify sessions answered right / wrong with the score checked;
// every shown sentence uses only words from the "seen" pool; empty pool message; no page errors.
// Needs puppeteer-core (npm i --no-save puppeteer-core, or set PUPPETEER_DIR) and Chrome (CHROME=/path/to/chrome).
let puppeteer; try { puppeteer = require(process.env.PUPPETEER_DIR || 'puppeteer-core'); } catch (e) { console.log('SKIPPED: puppeteer-core not installed'); process.exit(0); }
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split(/[?#]/)[0]).replace(/\/$/, '/index.html'));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
let bad = 0; const fail = m => { bad++; console.log('FAIL', m); };
(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r)); const URL = 'http://127.0.0.1:' + srv.address().port + '/';
  const br = await puppeteer.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
  const E = require('../sentences/engine.js');
  const allIds = [...new Set(['nouns', 'verbs', 'adjs', 'advs', 'conjs'].flatMap(g => Object.entries(E.LEX[g]).filter(([k]) => k !== 'sum').map(([, x]) => x.id)).filter(x => typeof x === 'number'))];
  const poolIds = allIds.filter((_, i) => i % 3 === 0); // a third of the words, as flashcards / drill counts
  const prog = { cards: {}, ds: { w: {} }, v: 3, set: {} };
  poolIds.forEach((id, i) => { if (i % 2) prog.cards['r:' + id] = { box: 1, due: 0 }; else prog.ds.w[id] = 2; });
  async function page(progress, sent) {
    const pg = await br.newPage(); pg.errs = [];
    pg.on('pageerror', e => pg.errs.push(String(e))); pg.on('console', m => { if (m.type() === 'error') pg.errs.push(m.text()); });
    await pg.goto(URL + 'manifest.webmanifest');
    await pg.evaluate((p, s) => { localStorage.clear(); if (p) localStorage.setItem('latin1400.v1', JSON.stringify(p)); if (s) localStorage.setItem('latin1400.sent.v1', JSON.stringify(s)); }, progress, sent);
    return pg;
  }
  // 1. About tab link
  { const pg = await page(prog); await pg.goto(URL + '#about'); await pg.waitForSelector('#sentlink');
    const t = await pg.$eval('#sentlink', a => [a.textContent, a.getAttribute('href')]); if (!/Sentences \(beta\)/.test(t[0]) || t[1] !== 'sentences.html') fail('about link ' + t);
    await Promise.all([pg.waitForNavigation(), pg.click('#sentlink')]); await pg.waitForSelector('#go');
    if (!pg.url().endsWith('sentences.html')) fail('link target ' + pg.url());
    // drill settings panel: the long explanatory paragraph before Done is gone, the controls and Done remain
    await pg.goto(URL + '#drills'); await pg.waitForSelector('#tset'); await pg.evaluate(() => document.querySelector('#tset').click()); await pg.waitForSelector('#tdone');
    const txt = await pg.$eval('#dset', d => d.textContent); if (/Imperatives come in present/.test(txt)) fail('drill settings explanation still shown');
    if (!(await pg.$('#dset .chips[data-g="tenses"]')) || !(await pg.$('#sdr'))) fail('drill settings controls missing');
    if (pg.errs.length) fail('errors on app: ' + pg.errs.join(' | ')); await pg.close(); }
  // 2. sessions
  const runs = [
    { name: 'translate typed, seen pool', sent: { ex: 'translate', ans: 'typed', pool: 'seen', len: 10 } },
    { name: 'translate chips, seen pool', sent: { ex: 'translate', ans: 'chips', pool: 'seen', len: 10 } },
    { name: 'identify, all words, 20', sent: { ex: 'identify', pool: 'all', len: 20 } },
    { name: 'identify, seen pool', sent: { ex: 'identify', pool: 'seen', len: 10 } },
  ];
  for (const run of runs) {
    const pg = await page(prog, run.sent); await pg.goto(URL + 'sentences.html'); await pg.waitForSelector('#go'); await pg.click('#go');
    let right = 0, n = 0;
    for (let i = 0; i < run.sent.len; i++) {
      await pg.waitForSelector('#check');
      const info = await pg.evaluate(() => { const { ses, s } = window.__sent; const E = window.LatinEngine;
        return { la: s.la, shown: document.querySelector('#la').textContent, en: s.en, ids: E.sentenceIds(s), target: s.target || null, chips: ses.chips, total: ses.items.length }; });
      n++; const id = `[${run.name} #${i + 1} ${info.la}]`;
      if (info.shown !== info.la) fail(id + ' shown ' + info.shown);
      if (run.sent.pool === 'seen') for (const x of info.ids) if (!poolIds.includes(x)) fail(id + ' word outside pool ' + x);
      const answerRight = i % 3 !== 1;
      if (run.sent.ex === 'translate' && run.sent.ans === 'typed') await pg.type('#ans', answerRight ? info.en : 'the cat sat on the mat');
      else if (run.sent.ex === 'translate') {
        const words = answerRight ? info.chips.answer : [info.chips.bank.find(w => !info.chips.answer.includes(w)) || 'zzz'];
        const used = new Set();
        for (const w of words) { const bi = info.chips.bank.findIndex((b, k) => b === w && !used.has(k)); if (bi < 0) { fail(id + ' chip missing ' + w); continue; } used.add(bi); await pg.click(`#bank button[data-b="${bi}"]`); }
      } else {
        const t = info.target; let pick;
        if (t.kind === 'noun') pick = answerRight ? { case: t.case, num: t.num } : { case: t.case === 'abl' ? 'gen' : 'abl', num: t.num };
        else { const a = t.accept[0]; pick = answerRight ? { tense: a.tense, person: a.person, voice: a.voice }
          : { tense: a.tense, person: a.person, voice: a.voice, ...(t.accept.some(x => x.tense === 'fut') ? { person: a.person === '1s' ? '2p' : '1s' } : { tense: 'fut' }) }; }
        for (const [g, v] of Object.entries(pick)) { const sel = `.idc[data-g="${g}"] button[data-v="${v}"]`; if (!(await pg.$(sel))) { if (!(g === 'voice' && !t.hasVoice)) fail(id + ' option missing ' + sel); continue; } await pg.click(sel); }
      }
      await pg.click('#check'); await pg.waitForSelector('#fb');
      const ok = await pg.$eval('#fb', d => d.querySelector('.ok') ? true : d.querySelector('.no') ? false : null);
      if (ok !== answerRight) fail(id + ` graded ${ok}, expected ${answerRight}`); if (ok) right++;
      await pg.click('#next');
      if (i + 1 === info.total) break;
    }
    await pg.waitForSelector('#score'); const sc = await pg.$eval('#score', d => d.textContent);
    if (sc !== `${right} of ${n} right`) fail(run.name + ' score ' + sc + ' vs ' + right + '/' + n);
    if (n < run.sent.len) fail(run.name + ' only ' + n + ' sentences');
    const rev = await pg.$$eval('.lex', x => x.length); if (rev !== n - right) fail(run.name + ' review list ' + rev);
    if (pg.errs.length) fail(run.name + ' errors: ' + pg.errs.join(' | '));
    console.log(`${run.name}: ${n} sentences, ${right} right, review ${rev}`); await pg.close();
  }
  // 3. no progress + "seen" pool: friendly message, no error
  { const pg = await page(null, { ex: 'translate', pool: 'seen', len: 10 }); await pg.goto(URL + 'sentences.html'); await pg.waitForSelector('#go'); await pg.click('#go');
    await pg.waitForSelector('#msg'); const m = await pg.$eval('#msg', d => d.textContent); if (!/All words/.test(m)) fail('empty pool message ' + m);
    if (pg.errs.length) fail('empty pool errors: ' + pg.errs.join(' | ')); await pg.close(); }
  await br.close(); srv.close();
  console.log(bad ? bad + ' FAILED' : 'ALL OK'); process.exit(bad ? 1 : 0);
})().catch(e => { console.log('ERROR', e); process.exit(1); });
