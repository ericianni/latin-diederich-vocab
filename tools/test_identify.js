// Identify-the-form drills: parsing and syncretism checks (node tools/test_identify.js)
const M = require('../morph.js'); globalThis.Morph = M;
const I = require('../identify.js'); const W = require('../data/words.json').filter(x => !x.d);
const find = h => { const w = W.find(x => M.plain(x.la.split(/[ ,]/)[0]) === M.plain(h)); if (!w) throw new Error('missing ' + h); return [w, M.analyze(w)]; };
let pass = 0, fail = 0;
const ok = (c, ...msg) => { c ? pass++ : fail++; if (!c) console.log('FAIL', ...msg); };
const ALL = { types: ['verb', 'noun', 'adj', 'pron'], moods: ['ind', 'sub', 'imp', 'inf', 'ptc', 'ger', 'gdv', 'sup'], voices: ['act', 'pas', 'dep'], tenses: ['pres', 'impf', 'fut', 'perf', 'plup', 'fperf'],
  conj: ['1', '2', '3', '3io', '4', 'irr'], cases: ['nom', 'gen', 'dat', 'acc', 'abl', 'voc', 'loc'], nums: ['sg', 'pl'], decl: ['1', '2', '3', '4', '5', 'irr'] };
const DEF = { types: ['verb', 'noun', 'adj', 'pron'], moods: ['ind'], voices: ['act', 'dep'], tenses: ALL.tenses, conj: ALL.conj, cases: ['nom', 'gen', 'dat', 'acc', 'abl'], nums: ['sg', 'pl'], decl: ALL.decl };
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

// deponents: voice is identified by form (passive-looking -> Passive; hortāns, hortātūrus -> Active)
{ const [w, a] = find('hortor'); const v = (f, df) => I.parses(a, w, f, df).map(p => p.at.voice + (p.dep ? '*' : '')).join();
  ok(v('hortāris', DEF) === 'pas*', 'hortāris passive form', v('hortāris', DEF)); ok(v('hortātur', DEF) === 'pas*', 'hortātur');
  ok(/^(act\*,)*act\*$/.test(v('hortāns', ALL)), 'hortāns active form', v('hortāns', ALL)); ok(v('hortātus', ALL) === 'pas*', 'hortātus passive form', v('hortātus', ALL));
  ok(v('hortātūrus', ALL) === 'act*', 'hortātūrus', v('hortātūrus', ALL));
  ok(I.grade({ mood: 'ind', tense: 'pres', voice: 'pas', person: '2', num: 'sg' }, I.parses(a, w, 'hortāris', DEF)).ok, 'hortāris graded passive');
  ok(!I.grade({ mood: 'ind', tense: 'pres', voice: 'act', person: '2', num: 'sg' }, I.parses(a, w, 'hortāris', DEF)).ok, 'hortāris active is wrong');
  const only = Object.assign({}, ALL, { voices: ['dep'] }), r = m => Object.fromEntries(I.rows(a, only, m)).voice.map(x => x[0]).join();
  ok(r('ind') === 'pas' && r('ptc') === 'act,pas' && r('inf') === 'act,pas', 'deponent-only voice rows', r('ind'), r('ptc'));
  for (const df of [only, DEF]) ok(!I.rows(a, df, 'ind').some(([k, v]) => v.some(x => x[0] === 'dep')), 'no Deponent chip'); }

// chip rows: one allowed value -> a single option (the app pre-selects and locks it); rows follow the mood
{ const [, a] = find('amō'); const r = I.rows(a, DEF); const o = Object.fromEntries(r.map(([k, v]) => [k, v.map(x => x[0])]));
  ok(o.mood.join() === 'ind' && o.voice.join() === 'act,pas' && o.person.join() === '1,2,3', 'rows default', JSON.stringify(o));
  ok(I.rows(a, ALL).length === 1, 'mood first when several moods');
  const g = Object.fromEntries(I.rows(a, ALL, 'ger')); ok(Object.keys(g).join() === 'mood,case', 'gerund rows');
  const p = Object.fromEntries(I.rows(a, ALL, 'ptc')); ok(Object.keys(p).join() === 'mood,tense,voice,case,num,gender' && p.tense.map(x => x[0]).join() === 'pres,perf,fut', 'participle rows');
  const im = Object.fromEntries(I.rows(a, ALL, 'imp')); ok(im.person.map(x => x[0]).join() === '2,3' && im.tense.map(x => x[0]).join() === 'pres,fut', 'imperative rows');
  const one = Object.fromEntries(I.rows(a, Object.assign({}, DEF, { tenses: ['impf'] }))); ok(one.tense.length === 1, 'single tense'); }
{ const [, a] = find('bonus'); const r = Object.fromEntries(I.rows(a, Object.assign({}, DEF, { decl: ['3'] }))); ok(r.decl.map(x => x[0]).join() === '3', 'adj decl'); }

// drill settings limit every verbal noun too: gerund and supine cases follow the Case chips (all of them if none applies);
// a single allowed option leaves a one-chip row (pre-selected and locked in the app)
{ const [w, a] = find('amō'); const DAT = Object.assign({}, ALL, { moods: ['ger', 'sup', 'gdv', 'ptc'], cases: ['dat'] }), ABL = Object.assign({}, DAT, { cases: ['abl'] });
  const caseRow = (df, m) => Object.fromEntries(I.rows(a, df, m)).case.map(x => x[0]).join();
  ok(caseRow(DAT, 'ger') === 'dat', 'gerund case row: dative only', caseRow(DAT, 'ger'));
  ok(caseRow(ABL, 'sup') === 'abl', 'supine case row: ablative only', caseRow(ABL, 'sup'));
  ok(caseRow(DAT, 'sup') === 'acc,abl', 'supine case row: falls back to both when neither is on', caseRow(DAT, 'sup'));
  ok(caseRow(Object.assign({}, DAT, { cases: ['nom'] }), 'ger') === 'gen,dat,acc,abl', 'gerund case row: falls back when none of its cases is on');
  ok(caseRow(ALL, 'ger') === 'gen,dat,acc,abl' && caseRow(ALL, 'sup') === 'acc,abl', 'all cases on: full rows');
  ok(!I.allowed(a, 'ger.gen', DAT) && I.allowed(a, 'ger.dat', DAT) && !I.allowed(a, 'sup.um', ABL) && I.allowed(a, 'sup.u', ABL), 'gerund / supine keys follow the Case chips');
  ok(I.vCaseOk('ger.abl', ABL) && !I.vCaseOk('ger.acc', ABL) && I.vCaseOk('sup.um', DAT) && I.vCaseOk('gdv.m', DAT), 'vCaseOk');
  eq('amō', 'amandō', DAT, ['ger.dat', 'gdv:m.dat.sg', 'gdv:n.dat.sg']);                  // not ger.abl / gdv abl. with only dative on
  eq('amō', 'amātum', ABL, []);                                                            // supine in -um is accusative
  eq('amō', 'amātū', ABL, ['sup.u']);
  // typed drills: participles and gerundives are asked in an allowed case and number when nom. sg. is off
  ok(I.typedSub(a, 'ptc.pas.perf', ALL) === null && I.typedSub(a, 'gdv.f', DEF) === null, 'typed: nom. sg. asked as usual when allowed');
  const ABLSG = Object.assign({}, ALL, { cases: ['abl'], nums: ['sg'] });
  const t = I.typedSub(a, 'ptc.pas.perf', ABLSG); ok(t && t.key === 'ptc.pas.perf:m.abl.sg' && t.forms.join() === 'amātō', 'typed ptc abl. sg.', t);
  const g = I.typedSub(a, 'gdv.f', Object.assign({}, ALL, { cases: ['gen'], nums: ['pl'] })); ok(g && g.key === 'gdv:f.gen.pl' && g.forms.join() === 'amandārum', 'typed gerundive fem. gen. pl.', g);
  ok(I.parseLabel(a, g) === 'gerundive · feminine genitive plural', 'typed label', I.parseLabel(a, g));
  const pr = I.typedSub(a, 'ptc.act.pres', ABLSG); ok(pr && pr.forms.join() === 'amante,amantī', 'present participle abl. sg. -e (or -ī)', pr);
  for (let i = 0; i < 50; i++) { const r = I.typedSub(a, 'ptc.act.fut', Object.assign({}, ALL, { cases: ['dat', 'abl'], nums: ['pl'] })); if (!/^ptc\.act\.fut:m\.(dat|abl)\.pl$/.test(r.key)) { ok(false, 'typed sub outside settings', r.key); break; } }
  const [hw, ha] = find('hortor'); const d = I.typedSub(ha, 'ptc.dep.perf', ABLSG); ok(d && d.forms.join() === 'hortātō', 'deponent participle abl. sg.', d); }
// rows never offer a mood, tense, or case that is switched off (single-option rows included)
{ const [, a] = find('regō'); const PERF = Object.assign({}, ALL, { moods: ['ind', 'sub', 'inf', 'ptc'], tenses: ['perf'], voices: ['pas'] });
  for (const m of PERF.moods) { const r = Object.fromEntries(I.rows(a, PERF, m)); ok(r.tense.map(x => x[0]).join() === 'perf' && r.voice.map(x => x[0]).join() === 'pas', 'perfect passive only rows', m); }
  const SUB = Object.assign({}, ALL, { moods: ['sub'] }); const r = I.rows(a, SUB); ok(r[0][1].length === 1 && r[0][1][0][0] === 'sub' && r.length > 1, 'single mood: locked, and its rows shown right away'); }

// verb Person and Number chips: finite forms only; imperative has just 2nd / 3rd person
{ const [w, a] = find('amō'); const P3 = Object.assign({}, ALL, { persons: ['3'], vnums: ['pl'] });
  const ro = (df, m) => Object.fromEntries(I.rows(a, df, m).map(([k, v]) => [k, v.map(x => x[0]).join()]));
  for (const m of ['ind', 'sub']) { const r = ro(P3, m); ok(r.person === '3' && r.num === 'pl', 'person/number rows', m, JSON.stringify(r)); }
  ok(ro(P3, 'imp').person === '2,3' && ro(P3, 'imp').num === 'pl', 'imperative ignores Person, follows Number', JSON.stringify(ro(P3, 'imp')));
  ok(ro(P3, 'ptc').num === 'sg,pl' && !('person' in ro(P3, 'ptc')) && !('person' in ro(P3, 'inf')), 'non-finite forms ignore verb person / number');
  ok(I.allowed(a, 'ind.act.pres.3p', P3) && !I.allowed(a, 'ind.act.pres.3s', P3) && !I.allowed(a, 'sub.act.impf.1p', P3) && I.allowed(a, 'imp.act.fut.3p', P3), 'finite keys follow person / number');
  ok(I.allowed(a, 'inf.act.pres', P3) && I.allowed(a, 'ptc.pas.perf:m.abl.sg', P3) && I.allowed(a, 'ger.gen', P3) && I.allowed(a, 'sup.um', P3), 'non-finite keys unaffected');
  ok(I.finiteOk('ind.act.pres.3p', P3) && !I.finiteOk('ind.act.pres.2p', P3) && I.finiteOk('inf.act.pres', P3), 'finiteOk');
  eq('amō', 'amant', P3, ['ind.act.pres.3p']); eq('amō', 'amat', P3, []);
  eq('amō', 'amāte', Object.assign({}, ALL, { persons: ['2'], vnums: ['pl'] }), ['imp.act.pres.2p']);
  eq('amō', 'amāre', Object.assign({}, ALL, { persons: ['1', '3'] }), ['imp.pas.pres.2s', 'inf.act.pres']);   // not the 2nd sg pres. ind. passive; the imperative ignores Person
  eq('amō', 'amāre', Object.assign({}, ALL, { persons: ['1', '3'], vnums: ['pl'] }), ['inf.act.pres']);   // ... but follows Number
  eq('amō', 'amantō', Object.assign({}, ALL, { persons: ['1'] }), ['imp.act.fut.3p']);
  // only 1st person: imperatives still drilled in every person they have; Person chips are not changed
  const P1 = Object.assign({}, ALL, { moods: ['ind', 'imp'], persons: ['1'] });
  ok(ro(P1).mood === 'ind,imp', 'imperative stays with only 1st person', ro(P1).mood);
  ok(I.allowed(a, 'imp.act.pres.2s', P1) && I.allowed(a, 'imp.act.fut.3s', P1) && !I.allowed(a, 'ind.act.pres.2s', P1), 'imperative ignores Person; indicative follows it');
  ok(I.moodPossible('imp', P1) && I.moodPossible('ind', P1) && !I.moodPossible('ind', Object.assign({}, ALL, { persons: [] })) && I.moodPossible('imp', Object.assign({}, ALL, { persons: [] })) && !I.moodPossible('imp', Object.assign({}, ALL, { tenses: ['perf'] })), 'moodPossible');
  ok(ro(P1, 'imp').person === '2,3' && ro(P1, 'ind').person === '1', 'imperative person row: the persons it has');
  ok(ro(Object.assign({}, P1, { tenses: ['pres'] }), 'imp').person === '2', 'present imperative only: 2nd person (locked)');
  ok(ro(Object.assign({}, P1, { tenses: ['fut'] }), 'imp').person === '2,3', 'future imperative: 2nd and 3rd');
  { const [, h] = find('hortor'), pr = Object.fromEntries(I.rows(h, Object.assign({}, P1, { tenses: ['fut'], voices: ['dep'], vnums: ['pl'] }), 'imp'));
    ok(pr.person.map(x => x[0]).join() === '3', 'deponent future imperative plural: only 3rd (hortantor), locked', JSON.stringify(pr.person)); }
  ok(ro(Object.assign({}, ALL, { moods: ['ind', 'imp'], tenses: ['perf'] })).mood === 'ind', 'imperative dropped with only perfect tense');
  const S1 = Object.assign({}, ALL, { moods: ['sub'], persons: ['2'], vnums: ['sg'], tenses: ['plup'], voices: ['pas'] }), r = I.rows(a, S1);
  ok(r.length === 5 && r.every(([, v]) => v.length === 1), 'every finite row single-option (pre-selected and locked in the app)', JSON.stringify(r));
  ok(ro({ types: ALL.types, moods: ['ind'], voices: ['act'], tenses: ALL.tenses, conj: ALL.conj, cases: ALL.cases, nums: ['sg'], decl: ALL.decl }, 'ind').num === 'sg,pl', 'noun Number chips do not limit finite verbs; old settings without verb person / number: all'); }

// pronouns: every reading of a form, case / number (personal) or gender / case / number (hic, ille)
eq('nōs', 'nōs', DEF, ['nom.pl', 'acc.pl']); eq('egō', 'mē', DEF, ['acc.sg', 'abl.sg']); eq('tū', 'tē', DEF, ['acc.sg', 'abl.sg']);
eq('vōs', 'vestrī', DEF, ['gen.pl']); eq('vōs', 'vōbīs', DEF, ['dat.pl', 'abl.pl']); eq('egō', 'mihi', DEF, ['dat.sg']); eq('egō', 'mī', DEF, ['dat.sg']);
eq('hic', 'huius', DEF, ['m.gen.sg', 'f.gen.sg', 'n.gen.sg']); eq('hic', 'hīs', DEF, ['m.dat.pl', 'f.dat.pl', 'n.dat.pl', 'm.abl.pl', 'f.abl.pl', 'n.abl.pl']);
eq('hic', 'haec', DEF, ['f.nom.sg', 'n.nom.pl', 'n.acc.pl']); eq('hic', 'hoc', DEF, ['n.nom.sg', 'n.acc.sg']); eq('hic', 'hōc', DEF, ['m.abl.sg', 'n.abl.sg']);
eq('ille', 'illī', DEF, ['m.dat.sg', 'f.dat.sg', 'n.dat.sg', 'm.nom.pl']); eq('ille', 'illa', DEF, ['f.nom.sg', 'n.nom.pl', 'n.acc.pl']); eq('ille', 'illud', DEF, ['n.nom.sg', 'n.acc.sg']);
eq('ille', 'illā', DEF, ['f.abl.sg']); eq('ille', 'illīs', Object.assign({}, DEF, { cases: ['dat'] }), ['m.dat.pl', 'f.dat.pl', 'n.dat.pl']);
{ const [w, a] = find('egō'); const rs = Object.fromEntries(I.rows(a, ALL)); ok(Object.keys(rs).join() === 'case,num', 'personal pronoun rows are case / number', Object.keys(rs));
  ok(I.attrs(a, w, 'gen.sg').gender === undefined, 'personal pronoun has no gender attribute'); }
{ const [, a] = find('ille'); const rs = Object.fromEntries(I.rows(a, ALL)); ok(Object.keys(rs).join() === 'case,num,gender', 'hic / ille rows are case / number / gender', Object.keys(rs)); }
{ const [w, a] = find('hic'); const ps = I.parses(a, w, 'huius', DEF); ok(I.parseLabel(a, ps[0]).includes('genitive singular'), 'hic label', I.parseLabel(a, ps[0]));
  const r = I.andGrade({ case: 'gen', num: 'sg', gender: 'f' }, ps, [ps.find(p => p.key === 'm.gen.sg')]); ok(r.kind === 'new' && r.p.key === 'f.gen.sg', 'huius: And…? feminine'); }
// sweep: for every drillable word and every key in the expanded table, the form's own key is among its parses,
// and every parse's attributes appear in the chip rows for its mood (so a right answer is always possible)
let n = 0;
const DEP = Object.assign({}, ALL, { voices: ['dep'] }), PAS = Object.assign({}, ALL, { voices: ['pas'] });
const NARROW = Object.assign({}, ALL, { tenses: ['perf'], cases: ['dat'], nums: ['pl'], persons: ['2'], vnums: ['sg'] }), SETG = { mood: 'moods', tense: 'tenses', case: 'cases', person: 'persons' };
const PERS = Object.assign({}, ALL, { persons: ['1', '3'], vnums: ['pl'] }), IMPF = Object.assign({}, ALL, { moods: ['imp', 'inf'], persons: ['3'] });
const IMP1 = Object.assign({}, ALL, { moods: ['ind', 'imp'], persons: ['1'] }), IMPP = Object.assign({}, ALL, { moods: ['imp'], tenses: ['pres'], persons: ['3'], vnums: ['sg'] });
for (const df of [DEF, ALL, DEP, PAS, NARROW, PERS, IMPF, IMP1, IMPP]) for (const w of W) {
  const a = M.analyze(w); if (a.skip || !a.tbl || !['noun', 'adj', 'verb', 'pron'].includes(a.kind)) continue;
  const x = I.expand(a);
  for (const k in x) {
    if (!I.allowed(a, k, df)) continue; n++;
    const ps = I.parses(a, w, x[k][0], df);
    if (!ps.some(p => p.key === k)) { fail++; console.log('FAIL own key missing', w.la, k, x[k][0]); continue; }
    for (const p of ps) { const rows = Object.fromEntries(I.rows(a, df, p.at.mood));
      const miss = Object.keys(p.at).filter(t => !rows[t] || !rows[t].some(([v]) => I.hit(p.at[t], v)));
      if (miss.length) { fail++; console.log('FAIL not answerable', w.la, p.key, miss); } else pass++;
      if (p.at.mood === 'imp') { const has = Object.keys(a.tbl).filter(q => q.startsWith('imp.') && I.allowed(a, q, df)).map(q => q.split('.')[3][0]), offp = rows.person.filter(([v]) => !has.includes(v));
        if (offp.length) { fail++; console.log('FAIL imperative person chip the verb lacks', w.la, p.key, offp); } }
      if (p.at.mood !== 'imp' && rows.person && rows.person.some(([v]) => !(df.persons || ['1', '2', '3']).includes(v))) { fail++; console.log('FAIL person chip outside settings', w.la, p.key); }
      if (df === NARROW && rows.person && rows.num.some(([v]) => !df.vnums.includes(v))) { fail++; console.log('FAIL verb number chip outside settings', w.la, p.key); }
      if (df === NARROW) for (const t in SETG) if (rows[t]) {          // no chip for a switched-off value (gerund / supine fall back only when none applies)
        const offv = rows[t].filter(([v]) => !df[SETG[t]].includes(v)); if (offv.length && !(t === 'case' && ['ger', 'sup'].includes(p.at.mood))) { fail++; console.log('FAIL chip outside settings', w.la, p.key, t, offv); } } }
  }
}

// "And…?" follow-up: the other readings of an ambiguous form, named one at a time with the same chips
const selOf = p => Object.fromEntries(Object.entries(p.at).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
const psOf = (h, form, df) => { const [w, a] = find(h); return I.parses(a, w, form, df); };
{
  const ps = psOf('puella', 'puellae', DEF), at = k => selOf(ps.find(p => p.key === k));
  const g = I.grade(at('gen.sg'), ps); ok(g.ok && g.best.key === 'gen.sg', 'puellae first answer');
  const found = [g.best];
  ok(I.andGrade(at('gen.sg'), ps, found).kind === 'dup', 'puellae: same reading again is dup');
  ok(I.andGrade(Object.assign(at('gen.sg'), { case: 'acc' }), ps, found).kind === 'no', 'puellae: acc. sg. is not a reading');
  let r = I.andGrade(at('nom.pl'), ps, found); ok(r.kind === 'new' && r.p.key === 'nom.pl', 'puellae: nom. pl. is new'); found.push(r.p);
  ok(I.others(ps, found).map(p => p.key).join() === 'dat.sg', 'puellae: dat. sg. left');
  r = I.andGrade(at('dat.sg'), ps, found); ok(r.kind === 'new', 'puellae: dat. sg. is new'); found.push(r.p);
  ok(I.others(ps, found).length === 0, 'puellae: all named');
}
{ // amāre: infinitive or imperative (or the alternative 2nd sg. passive), depending on the settings
  const ps = psOf('amō', 'amāre', ALL), inf = ps.find(p => p.key === 'inf.act.pres'), imp = ps.find(p => p.key === 'imp.pas.pres.2s');
  ok(I.grade(selOf(imp), ps).ok, 'amāre: imperative accepted');
  const r = I.andGrade(selOf(inf), ps, [imp]); ok(r.kind === 'new' && r.p === inf, 'amāre: infinitive is the And…? answer');
  ok(I.andGrade(Object.assign(selOf(inf), { tense: 'perf' }), ps, [imp]).kind === 'no', 'amāre: perfect infinitive is not a reading');
}
// imperatives ignore the Person chips: with only 1st person on, amāre is still an imperative, but not the 2nd sg. indicative
eq('amō', 'amāre', Object.assign({}, ALL, { persons: ['1'] }), ['inf.act.pres', 'imp.pas.pres.2s']);
eq('amō', 'amāre', Object.assign({}, ALL, { moods: ['inf', 'ind'] }), ['inf.act.pres', 'ind.pas.pres.2s']);
eq('amō', 'amāre', Object.assign({}, ALL, { vnums: ['pl'] }), ['inf.act.pres']);
// vowel length: rēgī (rēx, dat. sg.) and regī (regō, pres. pass. inf.) are different forms, not homographs
eq('rēx', 'regī', ALL, []);
eq('regō', 'regī', ALL, ['inf.pas.pres']);
eq('regō', 'rēgī', ALL, []);
eq('rēx', 'rēgī', ALL, ['dat.sg']);
eq('veniō', 'venit', DEF, ['ind.act.pres.3s']);                       // venit vs. vēnit
eq('veniō', 'vēnit', DEF, ['ind.act.perf.3s']);
eq('ferō', 'ferre', ALL, ['inf.act.pres', 'imp.pas.pres.2s', 'ind.pas.pres.2s']);
eq('sum', 'es', ALL, ['ind.act.pres.2s', 'imp.act.pres.2s']);
eq('cornū', 'cornū', ALL, ['nom.sg', 'voc.sg', 'dat.sg', 'acc.sg', 'abl.sg']);
eq('agō', 'ēgerit', ALL, ['ind.act.fperf.3s', 'sub.act.perf.3s']);
// generator fixes that removed false readings
eq('celer', 'celeris', DEF, ['m.gen.sg', 'f.nom.sg', 'f.gen.sg', 'n.gen.sg']);
eq('celer', 'celerium', DEF, ['m.gen.pl', 'f.gen.pl', 'n.gen.pl']); eq('celer', 'celerum', DEF, []);
eq('celer', 'celereris', ALL, []);
eq('tenebrae', 'tenebrae', ALL, ['nom.pl', 'voc.pl']);                 // plural only: no gen. / dat. sg.
eq('tenebrae', 'tenebrā', ALL, []);
{ const [, a] = find('quiēscō'); ok(a.tbl['ind.act.perf.1s'][0] === 'quiēvī' && a.tbl['sup.um'][0] === 'quiētum', 'quiēscō: quiēvī, quiētum', a.tbl['ind.act.perf.1s']); }
// v15 accuracy fixes
eq('quaerō', 'quaesīvī', ALL, ['ind.act.perf.1s']); eq('quaerō', 'quaersīvī', ALL, []);
eq('contemnō', 'contempsit', ALL, ['ind.act.perf.3s']); eq('contemnō', 'contemnpsit', ALL, []);
eq('dea', 'deābus', ALL, ['dat.pl', 'abl.pl']); eq('dea', 'deīs', ALL, ['dat.pl', 'abl.pl']);
eq('alter', 'alterīus', ALL, ['m.gen.sg', 'f.gen.sg', 'n.gen.sg']); eq('alter', 'alterius', ALL, []);
eq('vīs', 'vīs', ALL, ['nom.sg', 'voc.sg']);                              // rare gen. sg. vīs not drilled
eq('dēsum', 'deest', ALL, ['ind.act.pres.3s']); eq('dēsum', 'dēest', ALL, []);
// sweep: in every ambiguous form, each reading can be named by chips, and no two readings share one answer
let amb = 0;
for (const df of [DEF, ALL, IMP1, PERS]) for (const w of W) {
  const a = M.analyze(w); if (a.skip || !a.tbl || !['noun', 'adj', 'verb', 'pron'].includes(a.kind)) continue;
  const x = I.expand(a), seen = new Set();
  for (const k in x) for (const f of x[k]) {
    if (!I.allowed(a, k, df) || seen.has(M.normM(f))) continue; seen.add(M.normM(f));
    const ps = I.parses(a, w, f, df); if (ps.length < 2) continue; amb++;
    for (const p of ps) { const m = ps.filter(q => I.matches(selOf(p), q)); if (m.length !== 1) { fail++; console.log('FAIL readings share an answer', w.la, f, m.map(q => q.key)); continue; }
      const r = I.andGrade(selOf(p), ps, ps.filter(q => q !== p)); r.kind === 'new' && r.p === p ? pass++ : (fail++, console.log('FAIL And…? cannot name', w.la, f, p.key)); }
  }
}
console.log(`${amb} ambiguous form/setting combinations checked for And…?`);
console.log(`${pass} passed, ${fail} failed (${n} forms swept)`);
process.exit(fail ? 1 : 0);
