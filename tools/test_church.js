'use strict';
// Church Latin tier 1: every Mass token has a lemma, every new entry declines,
// and turning Church mode on or off does not rewrite Leitner cards.
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const Morph = require('../morph.js');
const Church = require('../church.js');
const root = path.join(__dirname, '..');
const classical = JSON.parse(fs.readFileSync(path.join(root, 'data/words.json'), 'utf8')).filter(w => !w.d);
const pack = JSON.parse(fs.readFileSync(path.join(root, 'data/church/tier1.json'), 'utf8'));
const plain = s => Morph.plain(s).toLowerCase();
const key = la => Church.headKey(la, Morph.plain);

let n = 0;
const ok = (cond, msg) => { assert(cond, msg); n++; };

const POS = new Set(['noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition', 'conjunction', 'interjection', 'indeclinable', 'prefix']);
const INFLECTED = new Set(['noun', 'verb', 'adjective', 'pronoun']);

ok(Array.isArray(pack.words) && pack.words.length > 0, 'church words');
ok(Array.isArray(pack.overlays) && pack.overlays.length > 0, 'overlays');
ok(Array.isArray(pack.texts) && pack.texts.length >= 8, 'texts');
ok(Array.isArray(pack.lessons) && pack.lessons.length >= 6 && pack.lessons.length <= 10, 'lesson count');
ok(pack.about && /Missale Romanum/.test(pack.about.sources), 'missal credit');
ok(/Clementine/.test(pack.about.sources) && /Nunn/.test(pack.about.sources) && /Beeson/.test(pack.about.sources) && /Harden/.test(pack.about.sources), 'other credits');
ok(/Ecclesiastical/.test(pack.about.pronunciation) && /tsi/.test(pack.about.pronunciation), 'pronunciation note');

const ids = new Set();
const churchKeys = new Map();
for (const w of pack.words) {
  ok(Number.isInteger(w.id) && w.id >= 10000, 'church id ' + w.id);
  ok(!ids.has(w.id), 'duplicate church id ' + w.id);
  ids.add(w.id);
  ok(typeof w.la === 'string' && w.la.trim(), 'la ' + w.id);
  ok(typeof w.en === 'string' && w.en.trim(), 'en ' + w.id);
  ok(POS.has(w.pos), 'pos ' + w.la);
  ok(w.church === true, 'church flag ' + w.la);
  const k = key(w.la);
  ok(!churchKeys.has(k), 'duplicate church lemma ' + k);
  churchKeys.set(k, w);
  const a = Morph.analyze(w);
  ok(!a.skip || !/error|not recognized|could not|unrecognized|unusual|Greek/.test(a.skip), 'analyze ' + w.la + ' ' + a.skip);
  if (INFLECTED.has(w.pos)) {
    ok(a.tbl && !a.skip, 'paradigm ' + w.la + ' ' + (a.skip || ''));
    for (const cell of Object.keys(a.tbl)) {
      const forms = [].concat(a.tbl[cell]);
      ok(forms.length && forms.every(f => typeof f === 'string' && f.trim()), 'empty form ' + w.la + ' ' + cell);
    }
  }
}

const classicalIds = new Set(classical.map(w => w.id));
const classicalKeys = new Map();
for (const w of classical) {
  ok(!ids.has(w.id), 'church id collides with ' + w.id);
  const k = key(w.la);
  if (!classicalKeys.has(k)) classicalKeys.set(k, []);
  classicalKeys.get(k).push(w);
}
for (const [k, w] of churchKeys) {
  if (classicalKeys.has(k)) ok(w.homograph === true, 'church lemma duplicates Diederich without homograph: ' + k);
  else ok(!w.homograph, 'homograph flag on a new lemma ' + k);
}

const overlayKeys = new Set();
for (const o of pack.overlays) {
  const k = plain(o.lemma);
  ok(!overlayKeys.has(k), 'duplicate overlay ' + k);
  overlayKeys.add(k);
  ok(classicalKeys.has(k), 'overlay is not a Diederich lemma ' + k);
  ok(!churchKeys.has(k), 'overlay is also a new church word ' + k);
  ok(typeof o.en === 'string' && o.en.trim(), 'overlay gloss ' + k);
  if (o.la) ok(key(o.la) === k, 'overlay spelling changes the lemma ' + k);
}

const known = new Set([...classicalKeys.keys(), ...churchKeys.keys()]);
let tokens = 0;
for (const tok of Church.tokensOf(pack)) {
  tokens++;
  ok(known.has(tok.lemma), 'unresolved ' + tok.section + ' ' + tok.surface + ' -> ' + tok.lemma);
}
ok(tokens > 400, 'token count');

for (const l of pack.lessons) {
  ok(l.id && l.title && l.sum && l.sec === 'The Mass', 'lesson shape ' + l.id);
  ok(Array.isArray(l.sections) && l.sections.length, 'lesson sections ' + l.id);
  for (const sid of l.sections) ok(pack.texts.some(t => t.id === sid), 'missing section ' + sid);
  for (const k of l.words || []) ok(known.has(k), 'lesson word ' + l.id + ' ' + k);
  ok(l.quiz && l.quiz.t === 'mc' && l.quiz.qs.length >= 3, 'quiz ' + l.id);
}

// Progress: toggling the mode hides Church-only cards and does not rewrite any card.
const shared = classical[0];
const church = pack.words[0];
const cards = {};
cards['r:' + shared.id] = { box: 3, due: 10 };
cards['p:' + shared.id] = { box: 2, due: 11 };
cards['r:' + church.id] = { box: 4, due: 0 };
cards['p:' + church.id] = { box: 1, due: 0 };
const before = JSON.stringify(cards);
const overlays = Church.overlayMap(pack, Morph.plain);
const off = Church.activeWords(classical, pack.words, overlays, false, Morph.plain);
const on = Church.activeWords(classical, pack.words, overlays, true, Morph.plain);
ok(off.some(w => w.id === shared.id) && !off.some(w => w.id === church.id), 'church word hidden when off');
ok(on.some(w => w.id === shared.id) && on.some(w => w.id === church.id), 'church word visible when on');
const dueOff = Church.dueCardKeys(cards, off, 10);
const dueOn = Church.dueCardKeys(cards, on, 10);
ok(dueOff.includes('r:' + shared.id) && !dueOff.some(k => k.endsWith(':' + church.id)), 'church card not due when off');
ok(dueOn.includes('r:' + church.id) && dueOn.includes('p:' + church.id), 'church card due when on');
ok(JSON.stringify(cards) === before, 'toggle rewrote a card');
ok(cards['r:' + shared.id].box === 3 && cards['r:' + church.id].box === 4, 'boxes kept');

const original = classical.find(w => key(w.la) === 'gratia');
const faced = Church.faceWord(original, overlays, true, Morph.plain);
ok(faced !== original && /grace/.test(faced.en) && original.en === classical.find(w => w.id === original.id).en, 'overlay copy');
ok(Church.faceWord(original, overlays, false, Morph.plain) === original, 'no overlay when off');

// New Church words enter under the same daily cap, a few at a time, not as a dump.
const sampleC = classical.slice(0, 20).map(w => Object.assign({}, w));
const sampleH = pack.words.slice(0, 10);
const deck = sampleC.concat(sampleH);
const keys = Church.newWordKeys(deck, {}, 6, true);
ok(keys.length === 6, 'daily cap');
ok(keys.filter(k => Number(k.slice(2)) >= 10000).length >= 1, 'a church word in the first day');
ok(keys.filter(k => Number(k.slice(2)) >= 10000).length <= 2, 'church words stay a minority of a day');
ok(Church.newWordKeys(sampleC, {}, 6, false).every(k => Number(k.slice(2)) < 10000), 'classical queue unchanged');

// --- approved fixes ---
const Identify = require('../identify.js');
const dex = classical.find(w => key(w.la) === 'dexter');
const dexC = Morph.analyze(dex);
const dexH = Morph.analyze(dex, { church: true });
ok(dexC.tbl['f.nom.sg'][0] === 'dextra' && dexC.tbl['f.acc.sg'][0] === 'dextram', 'classical dextra');
ok(dexC.tbl['f.nom.sg'].includes('dextera') && Morph.grade('dextera', dexC.tbl['f.nom.sg'], true).alternate, 'classical dextera is the alternate');
ok(dexH.tbl['f.nom.sg'][0] === 'dextera' && dexH.tbl['f.acc.sg'][0] === 'dexteram', 'church dextera / dexteram');
ok(Morph.grade('dextram', dexH.tbl['f.acc.sg'], true).alternate && Morph.grade('dexteram', dexH.tbl['f.acc.sg'], true).alternate === false, 'church dextram is the alternate');
ok(dexH.tbl['m.gen.sg'][0] === 'dextrī', 'church leaves the masculine on dextr-');

const nos = Morph.analyze(classical.find(w => key(w.la) === 'nos'));
const vos = Morph.analyze(classical.find(w => key(w.la) === 'vos'));
ok(Morph.shown(nos.tbl['gen.pl']) === 'gen. (partitive) nostrum; gen. (objective) nostrī', 'nostrum label');
ok(Morph.shown(vos.tbl['gen.pl']) === 'gen. (partitive) vestrum; gen. (objective) vestrī', 'vestrum label');
for (const [cell, form] of [[nos.tbl['gen.pl'], 'nostrum'], [nos.tbl['gen.pl'], 'nostrī'], [vos.tbl['gen.pl'], 'vestrum'], [vos.tbl['gen.pl'], 'vestrī']]) {
  const g = Morph.grade(form, cell, true);
  ok(g.ok && !g.alternate, 'genitive ' + form + ' is not an alternate');
}
const ego = Morph.analyze(classical.find(w => key(w.la) === 'ego'));
ok(Morph.grade('mī', ego.tbl['dat.sg'], true).alternate, 'mī stays an alternate of mihi');
const DEF = { types: ['verb', 'noun', 'adj', 'pron'], moods: ['ind'], voices: ['act', 'dep'], tenses: ['pres', 'impf', 'fut', 'perf', 'plup', 'fperf'], conj: ['1', '2', '3', '3io', '4', 'irr'], cases: ['nom', 'gen', 'dat', 'acc', 'abl'], nums: ['sg', 'pl'], decl: ['1', '2', '3', '4', '5', 'irr'] };
const vw = classical.find(w => key(w.la) === 'vos');
const part = Identify.parses(vos, vw, 'vestrum', DEF), obj = Identify.parses(vos, vw, 'vestrī', DEF);
ok(part.length === 1 && part[0].use === 'partitive' && Identify.parseLabel(vos, part[0]).includes('partitive'), 'identify vestrum');
ok(obj.length === 1 && obj[0].use === 'objective' && Identify.parseLabel(vos, obj[0]).includes('objective'), 'identify vestrī');
ok(Identify.others(part, part).length === 0 && Identify.others(obj, obj).length === 0, 'And…? does not ask for the other genitive');

function formsOf(la) { const a = Morph.analyze(pack.words.find(w => w.la.startsWith(la))); return a; }
for (const [la, nom] of [['Iēsus', 'Iēsus'], ['Chrīstus', 'Chrīstus'], ['Māria', 'Māria'], ['Andreās', 'Andreās'], ['Iōannēs', 'Iōannēs'], ['Paulus', 'Paulus'], ['Petrus', 'Petrus'], ['Mīchaēl', 'Mīchaēl']]) {
  const a = formsOf(la);
  ok(a.tbl['nom.sg'][0] === nom, 'capital ' + la);
  ok(Morph.grade(nom.toLowerCase(), a.tbl['nom.sg'], true).ok, 'case-insensitive ' + la);
}
ok(Morph.analyze(classical.find(w => key(w.la) === 'deus')).tbl['nom.sg'][0] === 'deus', 'deus stays lowercase');
const john = formsOf('Iōannēs'), jesus = formsOf('Iēsus'), andrew = formsOf('Andreās');
ok(!Object.keys(john.tbl).some(k => k.endsWith('.pl')) && !Object.keys(jesus.tbl).some(k => k.endsWith('.pl')) && !Object.keys(andrew.tbl).some(k => k.endsWith('.pl')), 'singular-only names');
const res = formsOf('resurgō');
ok(res.tbl['sup.um'][0] === 'resurrēctum' && res.tbl['sup.u'][0] === 'resurrēctū' && res.tbl['ptc.act.fut'][0] === 'resurrēctūrus', 'resurgō supine and future participle');
ok(res.tbl['ind.act.perf.3s'][0] === 'resurrēxit' && !Object.keys(res.tbl).some(k => k.includes('.pas.')), 'resurgō has no personal passive');
const paulN = pack.words.find(w => w.la.startsWith('Paulus'));
const paulA = classical.find(w => key(w.la) === 'paulus' && w.pos === 'adjective');
ok(paulN && paulN.pos === 'noun' && /apostle/.test(paulN.en) && paulN.la.startsWith('Paulus'), 'Paulus the apostle');
ok(paulA && paulA.la.startsWith('paulus') && /little/.test(paulA.en), 'paulus the adjective');

// --- tier 2: five prayers, seven lessons after the Mass ---
const tier2 = JSON.parse(fs.readFileSync(path.join(root, 'data/church/tier2.json'), 'utf8'));
const merged = Church.merge([pack, tier2]);
ok(merged.lessons.length === pack.lessons.length + 7, 'seven prayer lessons follow the Mass');
ok(merged.lessons.slice(0, pack.lessons.length).every(l => l.sec === 'The Mass'), 'Mass lessons stay first');
ok(merged.lessons.slice(pack.lessons.length).every(l => l.sec === 'Prayers'), 'prayer lessons are their own section');
ok(tier2.words.length === 22 && tier2.overlays.length === 3 && tier2.lessons.length === 7, 'tier 2 counts');
ok(/Compendium/.test(tier2.about.sources) && /Clementine/.test(tier2.about.sources) && /preces-latinae/.test(tier2.about.sources), 'tier 2 credits');
ok(/Regina Caeli/.test(tier2.about.sources) && !/Act of Contrition is set/.test(JSON.stringify(tier2.texts)), 'Regina Caeli is mentioned, not taught as a text');
const tier1Max = Math.max(...pack.words.map(w => w.id));
const byKey = new Map();
for (const w of classical.concat(pack.words, tier2.words)) {
  const k = key(w.la);
  if (!byKey.has(k)) byKey.set(k, []);
  byKey.get(k).push(w);
}
for (const w of tier2.words) {
  ok(w.id > tier1Max && w.id >= 10076 && !classicalIds.has(w.id) && !ids.has(w.id), 'tier 2 id ' + w.id);
  ok(w.church === true && POS.has(w.pos), 'tier 2 word ' + w.la);
  ids.add(w.id);
  const a = Morph.analyze(w, { church: true });
  ok(!a.skip || !/error|not recognized|could not|unrecognized|unusual|Greek/.test(a.skip), 'tier 2 analyze ' + w.la + ' ' + a.skip);
  if (INFLECTED.has(w.pos)) ok(a.tbl && !a.skip, 'tier 2 paradigm ' + w.la);
}
for (const o of tier2.overlays) {
  const k = plain(o.lemma);
  ok(classicalKeys.has(k) && !tier2.words.some(w => key(w.la) === k), 'tier 2 overlay ' + k);
  ok(!pack.overlays.some(x => plain(x.lemma) === k), 'tier 2 overlay collides with tier 1 ' + k);
}
function bareTok(s) { return String(s).replace(/[.,;:!?“”"«»()]/g, ''); }
function grades(form, cell) { return Morph.grade(form, cell, true).ok || Morph.grade(form, cell, false).ok; }
function ptcAdj(std) {
  if (!std) return null;
  if (/us$/.test(std)) return Morph.analyze({ pos: 'adjective', la: std + ', -a, -um' });
  if (/ēns$/.test(std)) return Morph.analyze({ pos: 'adjective', la: std + ', -entis' });
  if (/āns$/.test(std)) return Morph.analyze({ pos: 'adjective', la: std + ', -antis' });
  if (/ns$/.test(std)) return Morph.analyze({ pos: 'adjective', la: std + ', -ntis' });
  return null;
}
function dictAlts(la) {
  const out = [];
  const raw = String(la);
  out.push(raw.split(/[ ,]/)[0]);
  const m = raw.match(/\(([^)]*)\)/);
  if (m) m[1].split(/[,/]/).forEach(x => out.push(x.trim()));
  return out.filter(Boolean);
}
function formOk(word, surface) {
  const form = bareTok(surface);
  if (!form) return false;
  const a = Morph.analyze(word, { church: true });
  const cells = a && a.tbl ? Object.values(a.tbl) : [];
  if (cells.some(c => grades(form, c))) return true;
  if (a && a.tbl) for (const k of Object.keys(a.tbl)) if (String(k).startsWith('ptc.')) {
    const std = Morph.standard(a.tbl[k]);
    const adj = ptcAdj(std);
    if (adj && adj.tbl && Object.values(adj.tbl).some(c => grades(form, c))) return true;
    if (adj && adj.tbl && adj.tbl['m.abl.sg']) {
      const eform = Morph.standard(adj.tbl['m.abl.sg']).replace(/ī$/, 'e');
      if (Morph.normM(form) === Morph.normM(eform)) return true;
    }
  }
  if (dictAlts(word.la).some(h => Morph.norm(form) === Morph.norm(h) || Morph.normM(form) === Morph.normM(h))) return true;
  if (/cum$/i.test(form) && a && a.tbl) {
    for (const k of ['abl.sg', 'abl.pl']) if (a.tbl[k] && Morph.norm(form) === Morph.norm(Morph.standard(a.tbl[k]) + 'cum')) return true;
  }
  return false;
}
let t2tokens = 0;
const gloriaLemmas = new Set();
for (const tok of Church.tokensOf(tier2)) {
  t2tokens++;
  const lemmas = [].concat(tok.lemma);
  for (const lem of lemmas) {
    const hits = byKey.get(lem) || [];
    ok(hits.length > 0, 'tier 2 unresolved ' + tok.section + ' ' + tok.surface + ' -> ' + lem);
    ok(hits.some(w => formOk(w, tok.surface)), 'tier 2 form ' + tok.section + ' ' + tok.surface + ' -> ' + lem);
  }
  if (tok.section === 'gloria-patri') lemmas.forEach(l => { if (tier2.words.some(w => key(w.la) === l)) gloriaLemmas.add(l); });
}
ok(t2tokens > 200, 'tier 2 token count ' + t2tokens);
ok(gloriaLemmas.size === 0, 'Gloria Patri adds no new lemma');
const prayers = ['gloria-patri', 'ave', 'salve-a', 'salve-b', 'versicle', 'creed-a', 'creed-b', 'ang-nuntio', 'ang-ecce', 'ang-verbum', 'ang-collect'];
for (const id of prayers) ok(tier2.texts.some(t => t.id === id), 'prayer section ' + id);
ok(!JSON.stringify(tier2.texts).includes('Rogamus') && !/Deus, cuius Unigenitus/.test(JSON.stringify(tier2)), 'no long Salve collect');
for (const l of tier2.lessons) {
  ok(l.quiz && l.quiz.qs.length === 3, 'three checks ' + l.id);
  for (const sid of l.sections) ok(tier2.texts.some(t => t.id === sid), 'lesson section ' + l.id + ' ' + sid);
  for (const k of l.words) ok(byKey.has(k), 'lesson word ' + l.id + ' ' + k);
}
const eva = Morph.analyze(tier2.words.find(w => w.la.startsWith('Eva')));
ok(eva.tbl['nom.sg'][0] === 'Eva' && eva.tbl['gen.sg'][0] === 'Evae' && !eva.tbl['gen.sg'].includes('Hevae'), 'Evae is shown, Hevae is not listed');
ok(Morph.shown(eva.tbl['gen.sg']) === 'Evae', 'chart shows Evae');
const heva = Morph.grade('Hevae', eva.tbl['gen.sg'], true);
ok(heva.ok && !heva.alternate && heva.standard === 'Evae', 'Hevae is accepted and not flagged as an alternate');
ok(Morph.grade('eva', eva.tbl['nom.sg'], true).ok, 'Eva is case-insensitive');
const exsul = Morph.analyze(tier2.words.find(w => w.la.startsWith('exsul')));
const exsil = Morph.analyze(tier2.words.find(w => w.la.startsWith('exsilium')));
ok(exsul.tbl['nom.sg'][0] === 'exsul' && exsul.tbl['nom.pl'][0] === 'exsulēs', 'exsul is the shown spelling');
const exul = Morph.grade('exul', exsul.tbl['nom.sg'], true);
ok(exul.ok && !exul.alternate, 'exul is the existing exs- spelling, not a listed alternate');
ok(Morph.grade('exulēs', exsul.tbl['nom.pl'], true).ok && !Morph.grade('exulēs', exsul.tbl['nom.pl'], true).alternate, 'exulēs accepted');
ok(exsil.tbl['acc.sg'][0] === 'exsilium', 'exsilium is shown');
ok(Morph.grade('exilium', exsil.tbl['acc.sg'], true).ok && !Morph.grade('exilium', exsil.tbl['acc.sg'], true).alternate, 'exilium accepted like other exs- spellings');
const inf = Morph.analyze(classical.find(w => key(w.la) === 'inferus'), { church: true });
ok(inf.tbl['m.acc.pl'][0] === 'īnferōs', 'ad inferos is the adjective’s masculine accusative');
const facedInf = Church.faceWord(classical.find(w => key(w.la) === 'inferus'), Church.overlayMap(merged, Morph.plain), true, Morph.plain);
ok(/those below/.test(facedInf.en) && /low/.test(facedInf.en), 'inferus overlay keeps the classical sense');
const facedVerb = Church.faceWord(classical.find(w => key(w.la) === 'verbum'), Church.overlayMap(merged, Morph.plain), true, Morph.plain);
ok(/^the Word/.test(facedVerb.en), 'verbum overlay');
const caelC = Morph.analyze(classical.find(w => key(w.la) === 'caelum'));
const caelH = Morph.analyze(classical.find(w => key(w.la) === 'caelum'), { church: true });
ok(caelC.tbl['acc.pl'][0] === 'caela' && caelC.tbl['nom.pl'][0] === 'caela', 'classical caela');
ok(caelH.tbl['acc.pl'][0] === 'caelōs' && caelH.tbl['nom.pl'][0] === 'caelī', 'church caelōs / caelī');
ok(Morph.grade('caela', caelH.tbl['acc.pl'], true).alternate, 'caela stays accepted in church mode');
const creedB = tier2.texts.find(t => t.id === 'creed-b').lines[0].words.map(w => w.t).join(' ');
const creedA = tier2.texts.find(t => t.id === 'creed-a').lines.map(l => l.words.map(w => w.t).join(' ')).join(' ');
ok(creedB.startsWith('Et in Spīritum Sānctum') && /īnferōs/.test(creedA) && !/Crēdō in Spīritum/.test(JSON.stringify(tier2.texts)), 'creed wording');
const angel = tier2.words.find(w => w.la.startsWith('angelus'));
ok(Morph.analyze(angel).tbl['nom.sg'][0] === 'angelus', 'angelus is a common noun, not a capitalized name');
const off2 = Church.activeWords(classical, merged.words, Church.overlayMap(merged, Morph.plain), false, Morph.plain);
const on2 = Church.activeWords(classical, merged.words, Church.overlayMap(merged, Morph.plain), true, Morph.plain);
ok(!off2.some(w => w.id === 10076) && on2.some(w => w.id === 10076), 'tier 2 word follows church mode');
const cards2 = { 'r:10084': { box: 2, due: 0 }, 'p:10084': { box: 1, due: 0 } };
const snap = JSON.stringify(cards2);
ok(!Church.dueCardKeys(cards2, off2, 5).some(k => k.endsWith(':10084')) && Church.dueCardKeys(cards2, on2, 5).includes('r:10084'), 'tier 2 card hidden while mode is off');
ok(JSON.stringify(cards2) === snap, 'tier 2 toggle rewrote a card');
const weave = Church.newWordKeys(classical.slice(0, 12).concat(tier2.words.slice(0, 6)), {}, 6, true);
ok(weave.length === 6 && weave.filter(k => Number(k.slice(2)) >= 10076).length >= 1 && weave.filter(k => Number(k.slice(2)) >= 10076).length <= 2, 'tier 2 words use the 1:2 weave');
ok(!fs.readFileSync(path.join(root, 'sw.js'), 'utf8').includes('tier2.json') === false, 'tier 2 is in the service worker');

console.log('OK', n);
console.log('tier1 words', pack.words.length, 'overlays', pack.overlays.length, 'tokens', tokens, 'lessons', pack.lessons.length);
console.log('tier2 words', tier2.words.length, 'overlays', tier2.overlays.length, 'tokens', t2tokens, 'lessons', tier2.lessons.length);
