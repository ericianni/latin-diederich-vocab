// Tests for drill weighting and selection (drillpick.js). Run: node tools/test_drillpick.js
const P = require('../drillpick.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const NOW = Date.UTC(2026, 10, 2), DAY = 864e5;
const hist = (seq, q0) => seq.reduce((st, r, i) => P.record(st, r, NOW, (q0 || 0) + i + 1), null);

// record: decayed counts, raw counts, last seen
let st = hist([1, 1, 1, 0]);
ok(st.a === 4 && st.ok === 3 && st.q === 4 && st.t === NOW, 'raw counts and last seen');
ok(Math.abs(st.n - (1 + .75 + .5625 + .421875)) < 1e-9, 'decayed attempts');
ok(P.acc(st) < 0.75, 'recent miss weighs more than raw 3/4: ' + P.acc(st).toFixed(3));
ok(P.acc(hist([0, 1, 1, 1])) > 0.75, 'old miss weighs less than raw 3/4');
ok(P.acc(null) === null && P.acc({ n: 0 }) === null, 'no accuracy before any attempt');

// weight: low accuracy > high; unseen > mastered; recently asked down; long unseen up
const q = 100, old = (seq) => hist(seq, 0);   // last seen ~90+ answers ago
const wWeak = P.weight(old([0, 0, 1, 0]), NOW, q), wStrong = P.weight(old([1, 1, 1, 1, 1, 1]), NOW, q), wNew = P.weight(undefined, NOW, q);
ok(wWeak > wNew && wNew > wStrong, `weak ${wWeak.toFixed(2)} > unseen ${wNew.toFixed(2)} > strong ${wStrong.toFixed(2)}`);
ok(P.weight(old([1]), NOW, q) > wStrong, 'one right answer is not mastered');
const recent = hist([0, 0], 98);
ok(P.weight(recent, NOW, 100) < 0.2 * P.weight(recent, NOW, 200), 'just-asked combo is held back');
ok(P.weight(recent, NOW, 108) > P.weight(recent, NOW, 101) && P.weight(recent, NOW, 108) < P.weight(recent, NOW, 200), 'recency penalty fades');
const s1 = old([1, 1, 1]);
ok(P.weight(s1, NOW + 40 * DAY, q) > P.weight(s1, NOW, q), 'not seen for weeks gets a bump');
ok(wStrong > 0, 'nothing drops to zero');
ok(P.weight({ r: 0, n: 0, a: 3, q: 99 }, NOW, 100) < wNew, 'migrated "seen" combo still held back right after asking');

// masses: equal share per word type, sqrt split per paradigm group, even within a group
const ents = [];
for (let i = 0; i < 300; i++) ents.push({ c: 'v1|k' + i, kind: 'verb', g: 'v1', nw: 400 });
for (let i = 0; i < 300; i++) ents.push({ c: 'vsum|k' + i, kind: 'verb', g: 'vsum', nw: 4 });
for (let i = 0; i < 10; i++) ents.push({ c: 'n3|k' + i, kind: 'noun', g: 'n3', nw: 100 });
const m = P.masses(ents), sum = pre => [...m].filter(([c]) => c.startsWith(pre)).reduce((a, [, x]) => a + x, 0);
ok(Math.abs(sum('v') - 0.5) < 1e-9 && Math.abs(sum('n') - 0.5) < 1e-9, 'verbs and nouns get equal shares');
ok(Math.abs(sum('v1|') / sum('vsum|') - 10) < 1e-9, 'big paradigm outweighs small one by sqrt(words)');

// pronouns: app.js files personal pronouns (pp) under the noun share and hic / ille (pd) under the adjective share,
// so turning pronouns on doesn't add a fourth equal slice; each pronoun group is small (sqrt of 4 or 2 words)
{ const e2 = [];
  for (let i = 0; i < 12; i++) e2.push({ c: 'n1|k' + i, kind: 'noun', g: 'n1', nw: 100 }, { c: 'a12|k' + i, kind: 'adj', g: 'a12', nw: 100 }, { c: 'v1|k' + i, kind: 'verb', g: 'v1', nw: 100 });
  const base = P.masses(e2);
  for (let i = 0; i < 10; i++) e2.push({ c: 'pp|k' + i, kind: 'noun', g: 'pp', nw: 4 }, { c: 'pd|k' + i, kind: 'adj', g: 'pd', nw: 2 });
  const m2 = P.masses(e2), s2 = pre => [...m2].filter(([c]) => c.startsWith(pre)).reduce((a, [, x]) => a + x, 0);
  ok(Math.abs(s2('v1|') - [...base].filter(([c]) => c.startsWith('v1|')).reduce((a, [, x]) => a + x, 0)) < 1e-9, 'pronouns leave the verb share unchanged');
  ok(Math.abs(s2('pp|') / s2('n1|') - 2 / 10) < 1e-9 && Math.abs(s2('pd|') / s2('a12|') - Math.SQRT2 / 10) < 1e-9, 'pronoun groups weighted by sqrt(words) inside their share'); }

// pickCombo distribution
function freq(entries, stats, n, opts) { const f = {}, r = rng(7); for (let i = 0; i < n; i++) { const c = P.pickCombo(entries, stats, Object.assign({ now: NOW, q, rnd: r }, opts)); f[c] = (f[c] || 0) + 1; } return f; }
const E = ['n3|dat.pl', 'n3|gen.sg', 'n3|acc.pl', 'n3|abl.sg'].map(c => ({ c, kind: 'noun', g: 'n3', nw: 50 }));
const stats = { 'n3|dat.pl': old([0, 0, 1, 0]), 'n3|gen.sg': old([1, 1, 1, 1, 1, 1, 1]), 'n3|abl.sg': old([1, 1, 0, 1]) };
let f = freq(E, stats, 20000);
ok(f['n3|dat.pl'] > f['n3|acc.pl'] && f['n3|acc.pl'] > f['n3|gen.sg'], 'weak > unseen > strong: ' + JSON.stringify(f));
ok(f['n3|gen.sg'] > 200, 'strong combos still come up sometimes (randomness)');
ok(f['n3|abl.sg'] > f['n3|gen.sg'], 'one miss raises a combo');
f = freq(E, stats, 2000, { exclude: new Set(['n3|dat.pl']) });
ok(!f['n3|dat.pl'], 'exclude skips recent combos');
f = freq(E.slice(0, 1), stats, 50, { exclude: new Set(['n3|dat.pl']) });
ok(f['n3|dat.pl'] === 50, 'exclude falls back when nothing else is allowed');
ok(P.pickCombo([], {}, {}) === null, 'empty pool');
// kind balance: 100 verb combos vs 10 noun combos, all unseen -> about half nouns
const KB = [];
for (let i = 0; i < 100; i++) KB.push({ c: 'v1|k' + i, kind: 'verb', g: 'v1', nw: 100 });
for (let i = 0; i < 10; i++) KB.push({ c: 'n1|k' + i, kind: 'noun', g: 'n1', nw: 100 });
f = freq(KB, {}, 10000); const nouns = Object.keys(f).filter(c => c[0] === 'n').reduce((a, c) => a + f[c], 0);
ok(nouns > 4500 && nouns < 5500, 'nouns get about half despite fewer combos: ' + nouns);

// pickWord: avoids, mild preference
const W = [{ id: 1, r: 5, fc: true }, { id: 2, r: 1400, fc: false }, { id: 3, r: 700, fc: false }];
const wf = {}, r2 = rng(3); for (let i = 0; i < 30000; i++) { const id = P.pickWord(W, null, r2); wf[id] = (wf[id] || 0) + 1; }
ok(wf[1] > wf[3] && wf[3] > wf[2], 'frequent / flashcard words preferred: ' + JSON.stringify(wf));
ok(wf[2] > 30000 / 3 / 3, 'preference is mild (rare words still common)');
let avoided = true; for (let i = 0; i < 500; i++) if (P.pickWord(W, new Set([1, 3]), r2) !== 2) avoided = false;
ok(avoided, 'avoid set respected');
ok(P.pickWord([{ id: 9 }], new Set([9])) === 9, 'avoid falls back when only one word');

// weakest
const ws = P.weakest(Object.assign({ 'n3|nom.sg': { r: 0, n: 0, a: 2, ok: 0 } }, stats), 2);
ok(ws[0] === 'n3|dat.pl' && ws[1] === 'n3|abl.sg', 'weakest sorted by accuracy, untried-stats skipped: ' + ws);
ok(P.weakest(stats, 5, new Set(['n3|gen.sg'])).join() === 'n3|gen.sg', 'weakest limited to allowed combos');

ok(P.weakest(stats, 5, null, 0.9).join() === 'n3|dat.pl,n3|abl.sg', 'weakest can drop well-known combos');
console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
