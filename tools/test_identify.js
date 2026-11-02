// Identify-the-form drills: parsing and syncretism checks (node tools/test_identify.js)
const M = require('../morph.js'); globalThis.Morph = M;
const I = require('../identify.js'); const W = require('../data/words.json').filter(x => !x.d);
const find = h => { const w = W.find(x => M.plain(x.la.split(/[ ,]/)[0]) === M.plain(h)); if (!w) throw new Error('missing ' + h); return [w, M.analyze(w)]; };
let pass = 0, fail = 0;
const ok = (c, ...msg) => { c ? pass++ : fail++; if (!c) console.log('FAIL', ...msg); };
const ALL = { types: ['verb', 'noun', 'adj'], moods: ['ind', 'sub', 'imp', 'inf', 'ptc', 'ger', 'gdv', 'sup'], voices: ['act', 'pas', 'dep'], tenses: ['pres', 'impf', 'fut', 'perf', 'plup', 'fperf'],
  conj: ['1', '2', '3', '3io', '4', 'irr'], cases: ['nom', 'gen', 'dat', 'acc', 'abl', 'voc', 'loc'], nums: ['sg', 'pl'], decl: ['1', '2', '3', '4', '5', 'irr'] };
const DEF = { types: ['verb', 'noun', 'adj'], moods: ['ind'], voices: ['act', 'dep'], tenses: ALL.tenses, conj: ALL.conj, cases: ['nom', 'gen', 'dat', 'acc', 'abl'], nums: ['sg', 'pl'], decl: ALL.decl };
const keysOf = (h, form, df) => { const [w, a] = find(h); return I.parses(a, w, form, df).map(p => p.key).sort().join(' '); };
const eq = (h, form, df, exp) => { const got = keysOf(h, form, df); ok(got === exp.slice().sort().join(' '), h, form, 'got', got, 'expected', exp.join(' ')); };

// syncretism: every valid parse in the word's own paradigm
eq('mare', 'marī', DEF, ['dat.sg', 'abl.sg']);
eq('mare', 'maria', DEF, ['nom.pl', 'acc.pl']);
eq('mare', 'maria', ALL, ['nom.pl', 'acc.pl', 'voc.pl']);
eq('bellum', 'bellum', DEF, ['nom.sg', 'acc.sg']);
eq('puella', 'puellīs', DEF, ['dat.pl', 'abl.pl']);
eq('puella', 'puellae', DEF, ['gen.sg', 'dat.sg', 'nom.pl']);
eq('rēx', 'rēgī', DEF, ['dat.sg']);
eq('rēx', 'rēgēs', DEF, ['nom.pl', 'acc.pl']);
eq('bonus', 'bonī', DEF, ['m.gen.sg', 'n.gen.sg', 'm.nom.pl']);
eq('bonus', 'bonīs', DEF, ['m.dat.pl', 'm.abl.pl', 'f.dat.pl', 'f.abl.pl', 'n.dat.pl', 'n.abl.pl']);
eq('amō', 'amāris', DEF, ['ind.act.pres.2s'].slice(0, 0));                       // passive off by default: no parse
eq('amō', 'amāris', ALL, ['ind.pas.pres.2s']);
eq('amō', 'amāre', ALL, ['inf.act.pres', 'imp.pas.pres.2s', 'ind.pas.pres.2s']);   // amāre is also the alternative 2nd sg passive
eq('amō', 'amāre', Object.assign({}, ALL, { voices: ['act'] }), ['inf.act.pres']);
eq('regō', 'regam', ALL, ['ind.act.fut.1s', 'sub.act.pres.1s']);
eq('regō', 'regam', DEF, ['ind.act.fut.1s']);                                          // subjunctive off: only the future
eq('dēfendō', 'dēfendit', DEF, ['ind.act.pres.3s', 'ind.act.perf.3s']);
eq('amō', 'amandum', ALL, ['ger.acc', 'gdv:m.acc.sg', 'gdv:n.nom.sg', 'gdv:n.acc.sg']);
eq('amō', 'amātum', ALL, ['sup.um', 'ptc.pas.perf:m.acc.sg', 'ptc.pas.perf:n.nom.sg', 'ptc.pas.perf:n.acc.sg']);
eq('amō', 'amante', ALL, ['ptc.act.pres:m.abl.sg', 'ptc.act.pres:f.abl.sg', 'ptc.act.pres:n.abl.sg']);
eq('amō', 'amantia', ALL, ['ptc.act.pres:n.nom.pl', 'ptc.act.pres:n.acc.pl']);
eq('redeō', 'redeuntium', ALL, ['ptc.act.pres:m.gen.pl', 'ptc.act.pres:f.gen.pl', 'ptc.act.pres:n.gen.pl']);
eq('sum', 'est', DEF, ['ind.act.pres.3s']);
eq('amō', 'amō', DEF, ['ind.act.pres.1s']);                                             // the headword itself is a valid parse
eq('mare', 'marī', Object.assign({}, DEF, { cases: ['dat'] }), ['dat.sg']);           // restricted to enabled settings

// attributes: nouns carry gender and declension; mf nouns accept either gender
{ const [w, a] = find('cīvis'); const p = I.parses(a, w, 'cīvem', DEF)[0];
  ok(I.grade({ case: 'acc', num: 'sg', gender: 'f', decl: '3' }, [p]).ok, 'cīvis f'); ok(I.grade({ case: 'acc', num: 'sg', gender: 'm', decl: '3' }, [p]).ok, 'cīvis m');
  ok(!I.grade({ case: 'acc', num: 'sg', gender: 'n', decl: '3' }, [p]).ok, 'cīvis n'); }
{ const [w, a] = find('domus'); ok(I.genders(w, a).join() === 'f', 'domus f'); }
{ const [w, a] = find('deus'); ok(I.genders(w, a).join() === 'm', 'deus m'); }
{ const [w, a] = find('bōs'); ok(I.genders(w, a).join() === 'm,f', 'bōs mf'); }

// grading: any valid parse is right; otherwise the closest parse decides which attributes were off
{ const [w, a] = find('mare'); const ps = I.parses(a, w, 'marī', DEF);
  ok(I.grade({ case: 'abl', num: 'sg', gender: 'n', decl: '3' }, ps).ok, 'marī abl'); ok(I.grade({ case: 'dat', num: 'sg', gender: 'n', decl: '3' }, ps).ok, 'marī dat');
  const g = I.grade({ case: 'gen', num: 'sg', gender: 'n', decl: '3' }, ps); ok(!g.ok && g.off.join() === 'case', 'marī gen off', g.off);
  const g2 = I.grade({ case: 'abl', num: 'pl', gender: 'm', decl: '2' }, ps); ok(!g2.ok && g2.off.sort().join() === 'decl,gender,num', 'marī off', g2.off); }
{ const [w, a] = find('regō'); const ps = I.parses(a, w, 'regam', ALL);
  ok(I.grade({ mood: 'sub', tense: 'pres', voice: 'act', person: '1', num: 'sg' }, ps).ok, 'regam sub');
  ok(I.grade({ mood: 'ind', tense: 'fut', voice: 'act', person: '1', num: 'sg' }, ps).ok, 'regam fut');
  const g = I.grade({ mood: 'ind', tense: 'pres', voice: 'act', person: '1', num: 'sg' }, ps); ok(!g.ok && g.off.join() === 'tense', 'regam pres off', g.off); }
{ const [w, a] = find('amō'); const ps = I.parses(a, w, 'amandum', ALL);
  ok(I.grade({ mood: 'ger', case: 'acc' }, ps).ok, 'amandum ger'); ok(I.grade({ mood: 'gdv', case: 'nom', num: 'sg', gender: 'n' }, ps).ok, 'amandum gdv');
  ok(!I.grade({ mood: 'ger', case: 'dat' }, ps).ok, 'amandum ger dat'); }

// chip rows: one allowed value -> a single option (the app pre-selects and locks it); rows follow the mood
{ const [, a] = find('amō'); const r = I.rows(a, DEF); const o = Object.fromEntries(r.map(([k, v]) => [k, v.map(x => x[0])]));
  ok(o.mood.join() === 'ind' && o.voice.join() === 'act,dep' && o.person.join() === '1,2,3', 'rows default', JSON.stringify(o));
  ok(I.rows(a, ALL).length === 1, 'mood first when several moods');
  const g = Object.fromEntries(I.rows(a, ALL, 'ger')); ok(Object.keys(g).join() === 'mood,case', 'gerund rows');
  const p = Object.fromEntries(I.rows(a, ALL, 'ptc')); ok(Object.keys(p).join() === 'mood,tense,voice,case,num,gender' && p.tense.map(x => x[0]).join() === 'pres,perf,fut', 'participle rows');
  const im = Object.fromEntries(I.rows(a, ALL, 'imp')); ok(im.person.map(x => x[0]).join() === '2,3' && im.tense.map(x => x[0]).join() === 'pres,fut', 'imperative rows');
  const one = Object.fromEntries(I.rows(a, Object.assign({}, DEF, { tenses: ['impf'] }))); ok(one.tense.length === 1, 'single tense'); }
{ const [, a] = find('bonus'); const r = Object.fromEntries(I.rows(a, Object.assign({}, DEF, { decl: ['3'] }))); ok(r.decl.map(x => x[0]).join() === '3', 'adj decl'); }

// sweep: for every drillable word and every key in the expanded table, the form's own key is among its parses,
// and every parse's attributes appear in the chip rows for its mood (so a right answer is always possible)
let n = 0;
for (const df of [DEF, ALL]) for (const w of W) {
  const a = M.analyze(w); if (a.skip || !a.tbl || !['noun', 'adj', 'verb'].includes(a.kind)) continue;
  const x = I.expand(a);
  for (const k in x) {
    if (!I.allowed(a, k, df)) continue; n++;
    const ps = I.parses(a, w, x[k][0], df);
    if (!ps.some(p => p.key === k)) { fail++; console.log('FAIL own key missing', w.la, k, x[k][0]); continue; }
    for (const p of ps) { const rows = Object.fromEntries(I.rows(a, df, p.at.mood));
      const miss = Object.keys(p.at).filter(t => !rows[t] || !rows[t].some(([v]) => I.hit(p.at[t], v)));
      if (miss.length) { fail++; console.log('FAIL not answerable', w.la, p.key, miss); } else pass++; }
  }
}
console.log(`${pass} passed, ${fail} failed (${n} forms swept)`);
process.exit(fail ? 1 : 0);
