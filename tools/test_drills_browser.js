// Headless-browser check that drills follow the drill settings (node tools/test_drills_browser.js).
// Plays sets in Identify and Type modes under narrow settings (one tense / voice / mood / case / number) and checks that
// every question, every valid answer and every answer chip stays inside the settings, and that one-option rows are pre-selected.
// Needs puppeteer-core (npm i --no-save puppeteer-core, or set PUPPETEER_DIR) and Chrome (CHROME=/path/to/chrome).
let puppeteer; try { puppeteer = require(process.env.PUPPETEER_DIR || 'puppeteer-core'); } catch (e) { console.log('SKIPPED: puppeteer-core not installed'); process.exit(0); }
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split(/[?#]/)[0]).replace(/\/$/, '/index.html'));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
let URL;
const ALL = { types: ['verb', 'noun', 'adj', 'pron'], moods: ['ind', 'sub', 'imp', 'inf', 'ptc', 'ger', 'gdv', 'sup'], voices: ['act', 'pas', 'dep'], tenses: ['pres', 'impf', 'fut', 'perf', 'plup', 'fperf'], persons: ['1', '2', '3'], vnums: ['sg', 'pl'],
  conj: ['1', '2', '3', '3io', '4', 'irr'], cases: ['nom', 'gen', 'dat', 'acc', 'abl', 'voc', 'loc'], nums: ['sg', 'pl'], decl: ['1', '2', '3', '4', '5', 'irr'] };
const SC = [
  { name: 'perfect passive only (verbs, all moods)', df: { types: ['verb'], tenses: ['perf'], voices: ['pas'] } },
  { name: 'subjunctive only', df: { types: ['verb'], moods: ['sub'], voices: ['act'] } },
  { name: 'pronouns only, genitive + dative', df: { types: ['pron'], cases: ['gen', 'dat'] } },
  { name: 'pronouns only, plural only', df: { types: ['pron'], nums: ['pl'] } },
  { name: 'ablative plural only (nouns+adj)', df: { types: ['noun', 'adj'], cases: ['abl'], nums: ['pl'] } },
  { name: 'ptc/ger/gdv/sup, perf, abl sg', df: { types: ['verb'], moods: ['ptc', 'ger', 'gdv', 'sup'], tenses: ['perf'], cases: ['abl'], nums: ['sg'] } },
  { name: 'gerund only, dative only', df: { types: ['verb'], moods: ['ger'], cases: ['dat'] } },
  { name: '3rd person plural only (all moods)', df: { types: ['verb'], persons: ['3'], vnums: ['pl'] } },
  { name: '1st person singular, ind + imp (imperatives ignore Person)', df: { types: ['verb'], moods: ['ind', 'imp'], persons: ['1'], vnums: ['sg'] }, needImp: true },
  { name: 'present imperative only, 3rd person checked', df: { types: ['verb'], moods: ['imp'], tenses: ['pres'], persons: ['3'] }, needImp: true },
  { name: 'imperative 2nd sg only', df: { types: ['verb'], moods: ['imp'], persons: ['2'], vnums: ['sg'] } },
];
const lab = { ind: 'indicative', sub: 'subjunctive', imp: 'imperative', inf: 'infinitive', ptc: 'participle', ger: 'gerund', gdv: 'gerundive', sup: 'supine' };
(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r)); URL = 'http://127.0.0.1:' + srv.address().port + '/';
  const br = await puppeteer.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
  let bad = 0;
  for (const mode of ['id', 'type']) for (const sc of SC) {
    const df = Object.assign({}, ALL, sc.df);
    const pg = await br.newPage();
    await pg.goto(URL + 'manifest.webmanifest'); await pg.evaluate((df, mode) => { localStorage.clear(); localStorage.setItem('latin1400.v1', JSON.stringify({ cards: {}, v: 3, set: { dmode: mode, dlen: 20, df } })); }, df, mode);
    await pg.goto(URL + '#drills'); await pg.waitForSelector('#dgo'); await pg.evaluate(() => document.querySelector('#dgo').click());
    const issues = new Set(); let n = 0, nImp = 0;
    for (let i = 0; i < 20; i++) {
      await pg.waitForSelector('.prompt-kind');
      const st = await pg.evaluate(() => {
        if (document.querySelector('#idrows')) return { id: true, form: document.querySelector('.latin').textContent, rows: [...document.querySelectorAll('#idrows .idrow')].map(r => ({ a: r.dataset.a, locked: r.classList.contains('locked'), opts: [...r.querySelectorAll('button')].map(b => ({ v: b.dataset.v, on: b.classList.contains('on') })) })) };
        const e = document.querySelector('.english b'); return e ? { id: false, label: e.textContent } : null;
      });
      if (!st) break; n++;
      const check = (label, where) => {
        const L = label.toLowerCase();
        if (df.types.length === 1 && df.types[0] === 'verb') {
          const m = Object.keys(lab).filter(k => new RegExp('\\b' + lab[k] + '\\b').test(L));
          if (!m.some(k => df.moods.includes(k))) issues.add(where + ' mood off: ' + label);
          if (!/gerund|supine/.test(L) || /gerundive/.test(L) && false) {
            const t = /future perfect/.test(L) ? 'fperf' : /pluperfect/.test(L) ? 'plup' : /\bperfect\b/.test(L) ? 'perf' : /imperfect/.test(L) ? 'impf' : /future/.test(L) ? 'fut' : /present/.test(L) ? 'pres' : null;
            if (t && !df.tenses.includes(t)) issues.add(where + ' tense off: ' + label);
            const v = /deponent/.test(L) ? 'dep' : /passive/.test(L) ? 'pas' : /active/.test(L) ? 'act' : null;
            if (v && !df.voices.includes(v) && !(where === 'parse' && df.voices.includes('dep'))) issues.add(where + ' voice off: ' + label);
          }
        }
        const pm = label.match(/^([123])(?:st|nd|rd) (sg|pl) · /);   // finite verb: "3rd pl · present active indicative"
        if (pm && /imperative/.test(L)) { if (where === 'typed') nImp++; if (pm[1] === '1' || /present/.test(L) && pm[1] !== '2') issues.add(where + ' impossible imperative person: ' + label); }   // imperatives ignore Person
        else if (pm && !df.persons.includes(pm[1])) issues.add(where + ' person off: ' + label);
        if (pm && !df.vnums.includes(pm[2])) issues.add(where + ' number off: ' + label);
        const C = { nominative: 'nom', genitive: 'gen', dative: 'dat', accusative: 'acc', ablative: 'abl', vocative: 'voc', locative: 'loc' };
        for (const [w, c] of Object.entries(C)) if (new RegExp('\\b' + w + '\\b').test(L) && !df.cases.includes(c) ) issues.add(where + ' case off: ' + label);
        if (/\bsingular\b|\bsg\b/.test(L) && !df.nums.includes('sg') && /participle|gerundive|^(?!.*\d(st|nd|rd)).*$/.test(L)) issues.add(where + ' num off: ' + label);
        if (/nom\. (masc\. )?sg\./.test(L) && (!df.cases.includes('nom') || !df.nums.includes('sg'))) issues.add(where + ' principal nom. sg. asked: ' + label);
        if (/\bplural\b/.test(L) && !df.nums.includes('pl')) issues.add(where + ' num off: ' + label);
      };
      if (st.id) {
        const ALLOW = { mood: df.moods, tense: df.tenses, case: df.cases, num: null };
        for (const r of st.rows) {
          if (r.a === 'mood' || r.a === 'tense' || r.a === 'case') { const off = r.opts.filter(o => !df[{ mood: 'moods', tense: 'tenses', case: 'cases' }[r.a]].includes(o.v)); if (off.length && !(r.a === 'case' && st.rows.some(x => x.a === 'mood' && x.opts.find(o => o.on && ['ger','sup','ptc','gdv'].includes(o.v)) && false))) issues.add('chip row ' + r.a + ' shows ' + off.map(o => o.v) + ' (form ' + st.form + ')'); }
          if (r.a === 'voice') { const okv = ['act', 'pas'].filter(v => df.voices.includes(v) || df.voices.includes('dep')); const off = r.opts.filter(o => !okv.includes(o.v)); if (off.length) issues.add('chip row voice shows ' + off.map(o => o.v)); }
          if (r.a === 'num' && (df.types.includes('noun') || df.types.includes('adj') || df.types.includes('pron') || st.rows.some(x => x.a === 'gender'))) { const off = r.opts.filter(o => !df.nums.includes(o.v)); if (off.length) issues.add('chip row num shows ' + off.map(o => o.v)); }
          if (r.opts.length === 1 && !r.opts[0].on) issues.add('single option not auto-selected: ' + r.a);
        }
        // answer: pick first in every open row until check enabled
        for (let k = 0; k < 12; k++) {
          const done = await pg.evaluate(() => { const r = document.querySelector('#idrows .idrow:not(.locked) .chips:not(:has(.on)) button'); if (r) { r.click(); return false; } return true; });
          // after mood chosen, re-check new rows
          const rows2 = await pg.evaluate(() => [...document.querySelectorAll('#idrows .idrow')].map(r => ({ a: r.dataset.a, opts: [...r.querySelectorAll('button')].map(b => ({ v: b.dataset.v, on: b.classList.contains('on') })) })));
          for (const r of rows2) {
            const g = { mood: 'moods', tense: 'tenses', case: 'cases' }[r.a];
            if (g) { const off = r.opts.filter(o => !df[g].includes(o.v)); if (off.length) issues.add('chip row ' + r.a + ' shows ' + off.map(o => o.v) + ' (form ' + st.form + ')'); }
            const imp = rows2.some(x => x.a === 'mood' && x.opts.some(o => o.v === 'imp' && o.on));
            if (r.a === 'mood' && df.moods.includes('imp') && ['pres', 'fut'].some(t => df.tenses.includes(t)) && !r.opts.some(o => o.v === 'imp')) issues.add('imperative missing from the mood row');
            if (r.a === 'person' && imp) { const has = df.tenses.includes('fut') ? ['2', '3'] : ['2'], off = r.opts.filter(o => !has.includes(o.v)); if (off.length || (!df.tenses.includes('fut') && r.opts.length !== 1)) issues.add('imperative person row ' + r.opts.map(o => o.v) + ' (form ' + st.form + ')'); if (!df.tenses.includes('fut')) nImp++; }
            else if (r.a === 'person') { const off = r.opts.filter(o => !df.persons.includes(o.v)); if (off.length) issues.add('chip row person shows ' + off.map(o => o.v) + ' (form ' + st.form + ')'); }
            if (r.a === 'num' && rows2.some(x => x.a === 'person')) { const off = r.opts.filter(o => !df.vnums.includes(o.v)); if (off.length) issues.add('verb chip row num shows ' + off.map(o => o.v) + ' (form ' + st.form + ')'); }
            else if (r.a === 'num' && r.opts.length > 1 && df.nums.length === 1) issues.add('chip row num shows both (form ' + st.form + ', ' + rows2.map(x => x.a) + ')');
            if (r.opts.length === 1 && !r.opts[0].on) issues.add('single option not auto-selected after mood: ' + r.a);
          }
          if (done) break;
        }
        await pg.evaluate(() => document.querySelector('#chk').click());
        if (await pg.$('#andskip')) await pg.evaluate(() => document.querySelector('#andskip').click());   // And…? step: skip (no penalty)
        const parses = await pg.$$eval('.parses li', ls => ls.map(l => l.textContent.split(' = ')[1].replace(/ \(missed\)$/, '')));
        for (const p of parses) check(p, 'parse');
      } else {
        check(st.label, 'typed');
        await pg.evaluate(() => document.querySelector('#chk').click());
      }
      await pg.waitForSelector('#ans [data-r]', { timeout: 3000 }).catch(async e => { console.log('STUCK', st, await pg.$eval('#view', v => v.innerHTML.slice(0, 3000))); throw e; }); await pg.evaluate(() => document.querySelector('#ans .primary[data-r], #ans [data-r]').click());
      await new Promise(r => setTimeout(r, 30));
      if (await pg.$('#dgo')) break;
    }
    if (sc.needImp && mode === 'type' && !nImp) issues.add('no imperative questions came up');
    console.log(`[${mode}] ${sc.name}: ${n} questions, ${issues.size} issue(s)`); for (const x of [...issues].slice(0, 12)) console.log('   - ' + x);
    bad += issues.size; await pg.close();
  }
  // settings UI: switch to verbs, 3rd person, plural, perfect, passive by tapping chips; Identify rows lock to those values
  {
    const pg = await br.newPage(); await pg.goto(URL + 'manifest.webmanifest'); await pg.evaluate(() => localStorage.clear());
    await pg.goto(URL + '#drills'); await pg.waitForSelector('#tset');
    const clk = s => pg.evaluate(s => document.querySelector(s).click(), s);
    await clk('#tset'); await pg.waitForSelector('#dset');
    const rowsShown = await pg.$$eval('#dset .chips', cs => cs.map(c => c.dataset.g).join());
    if (!/tenses,persons,vnums,conj/.test(rowsShown)) { bad++; console.log('   - Person / Number chip rows missing from settings: ' + rowsShown); }
    for (const [g, v] of [['types', 'noun'], ['types', 'adj'], ['types', 'pron'], ['tenses', 'pres'], ['tenses', 'impf'], ['tenses', 'fut'], ['tenses', 'plup'], ['tenses', 'fperf'], ['voices', 'act'], ['voices', 'dep'], ['voices', 'pas'], ['persons', '1'], ['persons', '2'], ['vnums', 'sg']])
      await clk(`.chips[data-g="${g}"] button[data-v="${v}"]`);
    const sum = await pg.$eval('#view', v => v.textContent); if (!/3rd plural/.test(sum)) { bad++; console.log('   - summary lacks person/number'); }
    await clk('#dmode button[data-m="id"]'); await clk('#dgo');
    let ui = 0;
    for (let i = 0; i < 10; i++) {
      await pg.waitForSelector('#idrows .idrow');
      const r = await pg.evaluate(() => [...document.querySelectorAll('#idrows .idrow')].map(r => ({ a: r.dataset.a, locked: r.classList.contains('locked'), v: [...r.querySelectorAll('button')].map(b => b.dataset.v + (b.classList.contains('on') ? '*' : '')).join('/') })));
      const want = { mood: 'ind*', tense: 'perf*', voice: 'pas*', person: '3*', num: 'pl*' };
      if (r.some(x => !x.locked || x.v !== want[x.a]) || r.length !== 5) { ui++; console.log('   - UI rows', JSON.stringify(r)); }
      await clk('#chk'); await pg.waitForSelector('#ans [data-r]'); await clk('#ans [data-r]');
    }
    console.log(`[ui] chips → 3rd pl perfect passive indicative: ${ui} issue(s)`); bad += ui; await pg.close();
  }
  // "And…?" follow-up on ambiguous forms: name every other reading with the chips; the SRS sees only the first answer
  {
    const M = require('../morph.js'); globalThis.Morph = M; const I = require('../identify.js'), WD = require('../data/words.json');
    const selOf = p => Object.fromEntries(Object.entries(p.at).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
    const parsesFor = (df, form, head) => {     // the word on screen: nouns / adjectives show the headword, verbs the entry
      for (const w of WD) { if (!(w.la.replace(/\s\([^)]*\)$/, '') === head || w.la.split(/[ ,]/)[0] === head)) continue;
        const a = M.analyze(w); if (a.skip || !a.tbl) continue; const ps = I.parses(a, w, form, df); if (ps.length) return ps; }
      return [];
    };
    const choose = (pg, sel) => pg.evaluate(sel => {   // mood first (it changes the rows), then the rest
      for (const k of ['mood', ...Object.keys(sel).filter(k => k !== 'mood')]) { if (sel[k] == null) continue;
        const b = document.querySelector(`#idrows .idrow[data-a="${k}"]:not(.locked) button[data-v="${sel[k]}"]`); if (b) b.click(); }
    }, sel);
    const SC2 = [
      { name: '1st-decl. nouns, nom/gen/dat (puellae)', df: Object.assign({}, ALL, { types: ['noun'], decl: ['1'], cases: ['nom', 'gen', 'dat'] }) },
      { name: 'pronouns, gen/dat/abl (huius, illī, hīs, nōbīs)', df: Object.assign({}, ALL, { types: ['pron'], cases: ['gen', 'dat', 'abl'] }) },
      { name: 'pres. infinitive + imperative, 1st person only (amāre: imperatives ignore Person)', df: Object.assign({}, ALL, { types: ['verb'], moods: ['inf', 'imp'], tenses: ['pres'], voices: ['act', 'pas'], persons: ['1'], conj: ['1', '3'] }) },
    ];
    for (const sc of SC2) for (const style of ['all', 'dup+wrong', 'off']) {
      const pg = await br.newPage(); await pg.goto(URL + 'manifest.webmanifest');
      await pg.evaluate((df, on) => { localStorage.clear(); localStorage.setItem('latin1400.v1', JSON.stringify({ cards: {}, v: 3, set: { dmode: 'id', dlen: 20, df, andMore: on } })); }, sc.df, style !== 'off');
      await pg.goto(URL + '#drills'); await pg.waitForSelector('#dgo'); await pg.evaluate(() => document.querySelector('#dgo').click());
      const issues = []; let amb = 0, n = 0;
      for (let i = 0; i < 20; i++) {
        if (await pg.$('#dgo')) break;
        await pg.waitForSelector('#idrows .idrow'); n++;
        const { form, head } = await pg.evaluate(() => ({ form: document.querySelector('.latin').textContent, head: document.querySelector('.latin + .small b').textContent }));
        const ps = parsesFor(sc.df, form, head); if (!ps.length) { issues.push('no parse found for ' + form + ' / ' + head); break; }
        await choose(pg, selOf(ps[0])); await pg.evaluate(() => document.querySelector('#chk').click());
        const shown = await pg.$('#andskip');
        if (ps.length > 1) amb++;
        if (style === 'off' || ps.length === 1) { if (shown) issues.push('And…? shown for ' + form + (style === 'off' ? ' with the setting off' : ' (one reading)')); }
        else if (!shown) issues.push('no And…? for ' + form);
        else if (style === 'all') {
          for (const p of ps.slice(1)) { await choose(pg, selOf(p)); await pg.evaluate(() => document.querySelector('#chk').click()); }
          if (!await pg.$('.andall')) issues.push('naming all ' + ps.length + ' readings of ' + form + ' gave no “All readings” note');
          if (await pg.$$eval('.parses li.missed', x => x.length)) issues.push('readings marked missed after naming all: ' + form);
        } else {
          await choose(pg, selOf(ps[0])); await pg.evaluate(() => document.querySelector('#chk').click());
          const dup = await pg.$eval('#ans', x => x.textContent); if (!/already named/.test(dup) || !await pg.$('#andskip')) issues.push('dup answer not caught: ' + form);
          // a non-reading: change the case / mood to a value no reading has
          const bad = await pg.evaluate(ps => { for (const r of document.querySelectorAll('#idrows .idrow:not(.locked)')) for (const b of r.querySelectorAll('button')) { const a = r.dataset.a, v = b.dataset.v;
            if (ps.every(p => p.at[a] != null && p.at[a] !== v && !(Array.isArray(p.at[a]) && p.at[a].includes(v)))) return { a, v }; } return null; }, ps);
          if (bad) { await pg.evaluate(b => document.querySelector(`#idrows .idrow[data-a="${b.a}"] button[data-v="${b.v}"]`).click(), bad); await pg.evaluate(() => document.querySelector('#chk').click()); }
          else await pg.evaluate(() => document.querySelector('#andskip').click());     // every chip fits some reading: skip instead
          const miss = await pg.$$eval('.parses li.missed', x => x.length); if (miss !== ps.length - 1) issues.push(`${bad ? 'wrong And…? guess' : 'skip'}: ${miss} missed shown, expected ${ps.length - 1} (${form})`);
        }
        const got = await pg.$$eval('.parses li', ls => ls.length); if (got !== ps.length) issues.push(`${form}: ${got} readings listed, expected ${ps.length}`);
        const r = await pg.$eval('#ans [data-r]', b => b.dataset.r); if (r !== '1') issues.push('first answer right but graded ' + r + ': ' + form);
        await pg.evaluate(() => document.querySelector('#ans [data-r]').click()); await new Promise(r => setTimeout(r, 30));
      }
      const st = await pg.evaluate(() => JSON.parse(localStorage.getItem('latin1400.v1')).dst || {});
      if (Object.values(st).some(x => x.ok !== x.a)) issues.push('a drill stat recorded a miss although every first answer was right');
      if (!amb) issues.push('no ambiguous form came up');
      console.log(`[and…?/${style}] ${sc.name}: ${n} questions, ${amb} ambiguous, ${issues.length} issue(s)`); for (const x of issues.slice(0, 12)) console.log('   - ' + x);
      bad += issues.length; await pg.close();
    }
  }
  // Settings toggle for And…?: on by default, saved when switched
  {
    const pg = await br.newPage(); await pg.goto(URL + 'manifest.webmanifest'); await pg.evaluate(() => localStorage.clear());
    await pg.goto(URL + '#about'); await pg.waitForSelector('#sand');
    const on0 = await pg.$eval('#sand .on', b => b.dataset.m);
    await pg.evaluate(() => document.querySelector('#sand button[data-m="0"]').click());
    const saved = await pg.evaluate(() => JSON.parse(localStorage.getItem('latin1400.v1')).set.andMore);
    const ok = on0 === '1' && saved === false; if (!ok) bad++;
    console.log(`[settings] And…? toggle: default ${on0 === '1' ? 'on' : 'off'}, saved off = ${saved === false} ${ok ? 'OK' : 'ISSUE'}`); await pg.close();
  }
  // weak spots: stats outside settings must not appear
  {
    const pg = await br.newPage(); await pg.goto(URL + 'manifest.webmanifest');
    const df = Object.assign({}, ALL, { types: ['noun'], cases: ['dat'], nums: ['sg'] });
    const dst = { 'n1|abl.pl': { r: 0, n: 3, a: 3, ok: 0, t: Date.now(), q: 1 }, 'n2|dat.sg': { r: 0.2, n: 3, a: 3, ok: 1, t: Date.now(), q: 2 }, 'v1|ind.act.pres.3s': { r: 0, n: 3, a: 3, ok: 0, t: Date.now(), q: 3 } };
    await pg.evaluate((df, dst) => { localStorage.clear(); localStorage.setItem('latin1400.v1', JSON.stringify({ cards: {}, v: 3, dq: 3, dst, set: { dmode: 'type', dlen: 10, df } })); }, df, dst);
    await pg.goto(URL + '#drills'); await pg.waitForSelector('#gweak'); await pg.evaluate(() => document.querySelector('#gweak').click()); await pg.waitForSelector('.weak, #wrst');
    const t = await pg.$$eval('.weak td:first-child', x => x.map(e => e.textContent)); console.log('weak spots listed:', t);
    if (t.some(x => !/dative singular/.test(x))) { bad++; console.log('   - weak spot outside settings'); }
    // verbs, 3rd person plural only: 1st sg / 3rd sg stats stay hidden
    const df2 = Object.assign({}, ALL, { types: ['verb'], moods: ['ind'], persons: ['3'], vnums: ['pl'] });
    const dst2 = { 'v1|ind.act.pres.1s': { r: 0, n: 3, a: 3, ok: 0, t: Date.now(), q: 1 }, 'v1|ind.act.pres.3s': { r: 0, n: 3, a: 3, ok: 0, t: Date.now(), q: 2 }, 'v1|ind.act.pres.3p': { r: 0.2, n: 3, a: 3, ok: 1, t: Date.now(), q: 3 } };
    await pg.goto(URL + 'manifest.webmanifest');
    await pg.evaluate((df, dst) => { localStorage.clear(); localStorage.setItem('latin1400.v1', JSON.stringify({ cards: {}, v: 3, dq: 3, dst, set: { dmode: 'type', dlen: 10, df } })); }, df2, dst2);
    await pg.goto(URL + '#drills'); await pg.waitForSelector('#gweak'); await pg.evaluate(() => document.querySelector('#gweak').click()); await pg.waitForSelector('.weak, #wrst');
    const t2 = await pg.$$eval('.weak td:first-child', x => x.map(e => e.textContent)); console.log('weak spots listed (3rd pl):', t2);
    if (!t2.length || t2.some(x => !/3rd pl/.test(x))) { bad++; console.log('   - verb weak spot outside person / number settings'); }
    await pg.close();
  }
  // cheat sheet: sticky chip bar on a phone-sized screen, in the Cheat sheet tab and in the overlay opened from a drill
  {
    const JT = async (inOverlay) => {
  const sleep = ms => new Promise(r => setTimeout(r, ms)), frames = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const root = inOverlay ? document.querySelector('#overlay .ovbody') : document.querySelector('.card.sheet');
  const bar = root && root.querySelector('.jump'); if (!bar) return 'BAD no chip bar';
  const sc = inOverlay ? root : null, bad = [], cs = getComputedStyle(bar), links = [...bar.querySelectorAll('a')];
  const top0 = () => sc ? sc.getBoundingClientRect().top : 0;
  const scrollTo = y => sc ? sc.scrollTo(0, y) : window.scrollTo(0, y), scrollY_ = () => sc ? sc.scrollTop : window.scrollY;
  if (cs.position !== 'sticky') bad.push('bar not sticky: ' + cs.position);
  if (cs.flexWrap !== 'nowrap' || !/auto|scroll/.test(cs.overflowX)) bad.push('bar does not scroll sideways: ' + cs.flexWrap + ' ' + cs.overflowX);
  const on = () => links.filter(a => a.classList.contains('on'));
  const tgt = a => root.querySelector(a.getAttribute('href'));
  scrollTo(0); await sleep(100); await frames();
  if (on().length !== 1 || on()[0] !== links[0]) bad.push('at the top, first chip not current: ' + on().map(a => a.textContent));
  const atEnd = () => sc ? sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 4 : innerHeight + scrollY >= document.documentElement.scrollHeight - 4;
  // tap each chip (last to first, then first to last): section lands just under the bar, bar stays at the top, that chip is current and visible
  const order = links.map((a, i) => i).reverse().concat(links.map((a, i) => i));
  let taps = 0;
  for (const i of order) {
    const a = links[i], t = tgt(a); if (!t) { bad.push('no target for ' + a.textContent); continue; }
    const wasShut = t.tagName === 'DETAILS' && !t.open;
    a.click(); taps++;
    for (let k = 0; k < 40; k++) { const y = scrollY_(); await sleep(60); if (Math.abs(scrollY_() - y) < 1 && k > 3) break; }
    await sleep(80); await frames();
    const bb = bar.getBoundingClientRect(), tt = t.getBoundingClientRect().top;
    if (bb.top < top0() - 2 || (!atEnd() && bb.top - top0() > 2)) bad.push(a.textContent + ': bar not at top (' + (bb.top - top0()).toFixed(0) + ')');
    if (tt < bb.bottom - 1) bad.push(a.textContent + ': section hidden under bar (' + (tt - bb.bottom).toFixed(0) + ')');
    if (!atEnd() && Math.abs(tt - bb.bottom - 8) > 4) bad.push(a.textContent + ': section not just below bar (' + (tt - bb.bottom).toFixed(0) + ')');
    if (wasShut && !t.open) bad.push(a.textContent + ': collapsed section did not open');
    if (on().length !== 1 || on()[0] !== a) bad.push(a.textContent + ': current chip is ' + on().map(x => x.textContent));
    const ab = a.getBoundingClientRect(); if (ab.left < bb.left - 1 || ab.right > bb.right + 1) bad.push(a.textContent + ': chip scrolled out of view in bar');
  }
  // scroll by hand: the chip follows the section under the bar
  let spied = 0;
  for (let i = 0; i < links.length; i++) {
    const t = tgt(links[i]); scrollTo(scrollY_() + t.getBoundingClientRect().top - bar.getBoundingClientRect().bottom - 2); await sleep(120); await frames();
    if (atEnd()) continue; spied++;
    if (on()[0] !== links[i]) bad.push('scrolled to ' + links[i].textContent + ', current chip is ' + on().map(x => x.textContent));
  }
  scrollTo(sc ? sc.scrollHeight : document.documentElement.scrollHeight); await sleep(150); await frames();
  if (on()[0] !== links[links.length - 1]) bad.push('at the bottom, last chip not current: ' + on().map(x => x.textContent));
  scrollTo(0); await sleep(100); await frames();
  if (on()[0] !== links[0]) bad.push('back at top, first chip not current');
  return (bad.length ? 'BAD ' + bad.join('; ') : 'ok') + ` (${links.length} chips, ${taps} taps, ${spied} scroll checks, overflow ${bar.scrollWidth > bar.clientWidth})`;
};
    const pg = await br.newPage(); await pg.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await pg.goto(URL + 'manifest.webmanifest'); await pg.evaluate(() => localStorage.clear());
    await pg.goto(URL + '#cheat'); await pg.waitForSelector('.sheet .jump');
    const r1 = await pg.evaluate(JT, false); console.log('[cheat] tab: ' + r1); if (!/^ok/.test(r1)) bad++;
    await pg.goto(URL + 'manifest.webmanifest'); await pg.evaluate(df => { localStorage.clear(); localStorage.setItem('latin1400.v1', JSON.stringify({ cards: {}, v: 3, set: { dmode: 'type', dlen: 10, df } })); }, ALL);
    await pg.goto(URL + '#drills'); await pg.waitForSelector('#dgo'); await pg.evaluate(() => document.querySelector('#dgo').click());
    await pg.waitForSelector('#cs'); await pg.evaluate(() => document.querySelector('#cs').click()); await pg.waitForSelector('#overlay .jump');
    await new Promise(r => setTimeout(r, 300));
    const deep = await pg.evaluate(() => { const b = document.querySelector('#overlay .jump').getBoundingClientRect(), d = [...document.querySelectorAll('#overlay details[open]')].pop(); return d ? d.getBoundingClientRect().top - b.bottom : null; });
    if (deep == null || deep < 0) { bad++; console.log('   - drill link: section hidden under the bar', deep); }
    const r2 = await pg.evaluate(JT, true); console.log('[cheat] overlay: ' + r2 + ', drill link lands ' + Math.round(deep) + 'px below the bar'); if (!/^ok/.test(r2)) bad++;
    await pg.close();
  }
  console.log(bad ? 'ISSUES: ' + bad : 'ALL OK'); await br.close(); srv.close(); process.exit(bad ? 1 : 0);
})();
