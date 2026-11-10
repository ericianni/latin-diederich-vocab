// Sentences mixed into Drills: defaults, mix ratio, pool, tiers, weak-spot bias, daily-goal count.
// Run: node tools/test_drill_sentences.js
const P = require('../drillpick.js');
const E = require('../sentences/engine.js');
const WORDS = require('../data/words.json');
const byId = [];
for (const w of WORDS) byId[w.id] = w;

let pass = 0, fail = 0;
const failures = [];
function ok(cond, msg) { if (cond) pass++; else { fail++; failures.push(msg); console.log('FAIL', msg); } }
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

const DF = {
  types: ['verb', 'noun', 'adj', 'pron'],
  moods: ['ind', 'sub', 'imp', 'inf', 'ptc', 'ger', 'gdv', 'sup'],
  voices: ['act', 'pas', 'dep'],
  tenses: ['pres', 'impf', 'fut', 'perf', 'plup', 'fperf'],
  persons: ['1', '2', '3'], vnums: ['sg', 'pl'],
  conj: ['1', '2', '3', '3io', '4', 'irr'],
  cases: ['nom', 'gen', 'dat', 'acc', 'abl', 'voc', 'loc'],
  nums: ['sg', 'pl'],
  decl: ['1', '2', '3', '4', '5', 'irr'],
  sent: true, stype: 'both', sdir: 'le',
};
const index = P.lexiconIndex(E, byId);
const ALL = [...index.contentIds];

// ---------- off by default ----------
ok(P.SENT_DF.sent === false && P.sentenceSettings({}).on === false && P.sentenceSettings().on === false, 'sentences off when the setting is absent');
ok(P.sentenceSettings({ sent: false }).on === false, 'explicit off stays off');
ok(P.sentenceSettings({ types: DF.types }).on === false, 'drill chip settings do not turn sentences on');
const both = P.sentenceSettings({ sent: true });
ok(both.on && both.type === 'both' && both.dir === 'le', 'on: type defaults to Both, direction to Latin → English');
ok(P.sentenceSettings({ sent: true, stype: 'tr', sdir: 'el' }).type === 'tr' && P.sentenceSettings({ sent: true, stype: 'id', sdir: 'both' }).dir === 'both', 'type and direction settings are kept');
let offTakes = 0;
{
  let st = P.sentenceMixStart(rng(1));
  for (let i = 0; i < 1000; i++) { const r = P.sentenceMixNext(st, false, rng(2)); st = r.state; if (r.take) offTakes++; }
}
ok(offTakes === 0, 'mix never selects a sentence while the setting is off');

// ---------- mix ratio, no back-to-back ----------
{
  const R = rng(7);
  let st = P.sentenceMixStart(R), nSent = 0, prev = false, pairs = 0;
  for (let i = 0; i < 1000; i++) {
    const r = P.sentenceMixNext(st, true, R); st = r.state;
    if (r.take) { nSent++; if (prev) pairs++; prev = true; } else prev = false;
  }
  const ratio = nSent / 1000;
  ok(ratio >= 0.10 && ratio <= 0.20, 'sentence share over 1000 picks is ' + ratio.toFixed(3) + ' (want 0.10–0.20)');
  ok(pairs === 0, 'no back-to-back sentences');
  ok(P.SENT_GAPS.every(g => g >= 4) && Math.min(...P.SENT_GAPS.map(g => 1 / (g + 1))) >= 0.10 - 1e-9 && Math.max(...P.SENT_GAPS.map(g => 1 / (g + 1))) <= 0.20 + 1e-9, 'each gap is a 10–20% stretch');
}

// ---------- tiers grow with the seen-content count ----------
{
  const all = E.TEMPLATES;
  const t0 = P.sentenceTemplates(0, all), t39 = P.sentenceTemplates(39, all), t40 = P.sentenceTemplates(40, all);
  const t79 = P.sentenceTemplates(79, all), t80 = P.sentenceTemplates(80, all), t139 = P.sentenceTemplates(139, all), t140 = P.sentenceTemplates(140, all);
  ok(t0.join() === t39.join() && t0.includes('SV') && t0.includes('COPULA') && t0.includes('PRONOUN') && !t0.includes('SOV') && !t0.includes('PASSIVE'), 'under 40 seen: shortest templates only');
  ok(t40.includes('SOV') && t40.includes('SV_PP') && !t40.includes('PASSIVE') && !t40.includes('COORD') && t40.length > t0.length, '40 seen unlocks a longer tier');
  ok(t79.join() === t40.join() && t80.includes('PASSIVE') && t80.includes('SOV_ADJ') && !t80.includes('ADV') && !t80.includes('COORD'), '80 seen unlocks passives and adjectives');
  ok(t139.join() === t80.join() && t140.length === all.length && t140.includes('COORD') && t140.includes('ADV') && t140.includes('DET'), '140 seen unlocks every template');
  ok(P.sentenceTier(10) < P.sentenceTier(50) && P.sentenceTier(50) < P.sentenceTier(100) && P.sentenceTier(100) < P.sentenceTier(200), 'tier index grows with the count');
}

// ---------- pool: only seen content words, plus helpers ----------
{
  const held = new Set([194, 1044]); // puella, amo — common, so a missing setPool would show them
  const seen = new Set(ALL.filter(id => !held.has(id)));
  const df = Object.assign({}, DF, { stype: 'tr', sdir: 'le' });
  let outside = 0, n = 0;
  for (let i = 0; i < 12; i++) {
    const item = P.pickDrillSentence(E, { wordsById: byId, seen, df, stats: {}, rnd: rng(100 + i * 97) });
    if (!item) continue;
    n++;
    const ids = E.sentenceIds(item.sentence);
    for (const id of ids) if (!seen.has(id) || held.has(id)) outside++;
    ok(JSON.stringify(item.hints) === JSON.stringify(P.helperHints(item.sentence, seen, E)), 'picker attaches helper glosses');
    ok(item.template && P.sentenceTemplates(seen.size, E.TEMPLATES).includes(item.template), 'generated template stays in the tier for ' + seen.size + ' words: ' + item.template);
  }
  E.setPool([...seen]);
  let ppSent = null;
  for (let i = 0; i < 20 && !ppSent; i++) {
    try { const s = E.generate(rng(500 + i * 13), { template: 'SV_PP' }); if (s && s.spec && s.spec.pp) ppSent = s; } catch (e) { /* keep looking */ }
  }
  E.setPool(null);
  const hints = ppSent ? P.helperHints(ppSent, seen, E) : [];
  const prepHint = hints.find(h => h.en && ppSent.laTokens[h.i]);
  ok(n >= 8, 'a full seen-pool still builds sentences (' + n + ')');
  ok(outside === 0, 'every content word is in the seen pool; held-out words stayed out');
  ok(!!prepHint, 'an unseen helper preposition is shown with a gloss' + (ppSent ? ' (' + ppSent.la + ')' : ''));
}

// ---------- fallback when almost no words have been seen ----------
{
  const df = Object.assign({}, DF);
  ok(P.pickDrillSentence(E, { wordsById: byId, seen: [], df, rnd: rng(3) }) == null, 'no seen words: no sentence');
  ok(P.pickDrillSentence(E, { wordsById: byId, seen: [194], df, rnd: rng(4) }) == null, 'one seen word: no sentence');
  const onlyAdj = index.adjs.filter(a => a.par && a.par[0] === 'a').slice(0, 6).map(a => a.id);
  ok(P.pickDrillSentence(E, { wordsById: byId, seen: onlyAdj, df, rnd: rng(5) }) == null, 'adjectives alone cannot build a sentence');
}

// ---------- tier actually used when the pool is small ----------
{
  const nouns = index.nouns.filter(n => n.par && n.par[0] === 'n').slice(0, 12).map(n => n.id);
  const verbs = index.verbs.filter(v => v.key !== 'sum' && v.par).slice(0, 8).map(v => v.id);
  const seen = new Set(nouns.concat(verbs));
  ok(seen.size < 40, 'small pool is under the first threshold (' + seen.size + ')');
  const df = Object.assign({}, DF, { stype: 'tr' });
  let bad = 0, n = 0;
  for (let i = 0; i < 8; i++) {
    const item = P.pickDrillSentence(E, { wordsById: byId, seen, df, rnd: rng(40 + i) });
    if (!item) continue;
    n++;
    if (!['SV', 'COPULA', 'PRONOUN'].includes(item.template)) bad++;
    for (const id of E.sentenceIds(item.sentence)) if (!seen.has(id)) bad++;
    const S = item.sentence.spec || {};
    for (const np of [S.subj, S.obj, S.io, S.pp && S.pp.np].filter(Boolean)) if (np.noun && (np.noun.key === 'pron_is' || np.noun.key === 'pron_se' || np.poss)) bad++;
  }
  ok(n >= 4 && bad === 0, 'small pool stays on the shortest templates and inside the pool (' + n + ' sentences)');
}

// ---------- weak combo is targeted, and a declension filter is respected ----------
{
  const seen = new Set(ALL);
  const stats = { 'v1|ind.act.pres.3s': { r: 0, n: 6, a: 8, ok: 0, t: Date.now(), q: 1 } };
  const df = Object.assign({}, DF, { stype: 'id' });
  const item = P.pickDrillSentence(E, { wordsById: byId, seen, df, stats, rnd: rng(9), q: 10 });
  ok(!!item && item.ex === 'id' && item.combo === 'v1|ind.act.pres.3s', 'weakest engine-feasible combo is the identified form' + (item ? ' (got ' + item.combo + ' / ' + item.template + ')' : ' (no sentence)'));
  const narrow = Object.assign({}, DF, { types: ['noun'], decl: ['1'], cases: ['acc'], stype: 'id' });
  let matched = 0, tried = 0;
  for (let i = 0; i < 6; i++) {
    const it = P.pickDrillSentence(E, { wordsById: byId, seen, df: narrow, stats: {}, rnd: rng(60 + i) });
    if (!it) continue;
    tried++;
    if (it.combo && it.combo.startsWith('n1|acc.')) matched++;
    else if (it.target) matched += 0;
  }
  ok(tried >= 4 && matched === tried, '1st-declension accusative filter: sentence target matches (' + matched + '/' + tried + ')');
}

// ---------- is and sē: only from the pronoun-object tier, and weak spots can ask for them ----------
{
  ok(!P.sentenceTemplates(79, E.TEMPLATES).includes('PRON_OBJ') && P.sentenceTemplates(80, E.TEMPLATES).includes('PRON_OBJ'), 'PRON_OBJ, where is and sē live, unlocks at 80 seen words');
  const seen = new Set(ALL);
  const df = Object.assign({}, DF, { stype: 'id' });
  const weak = (combo, seed) => P.pickDrillSentence(E, { wordsById: byId, seen, df, stats: { [combo]: { r: 0, n: 8, a: 8, ok: 0, t: Date.now(), q: 1 } }, rnd: rng(seed), q: 10 });
  const eum = weak('pi|m.acc.sg', 21);
  ok(!!eum && eum.combo === 'pi|m.acc.sg' && eum.sentence.laTokens.includes('eum'), 'weak spot pi|m.acc.sg is identified as eum' + (eum ? ' (' + eum.sentence.la + ' / ' + eum.combo + ')' : ''));
  const se = weak('pr|acc.sg', 22);
  ok(!!se && se.combo === 'pr|acc.sg' && se.sentence.laTokens.includes('sē') && !(se.sentence.spec && se.sentence.spec.pron), 'weak spot pr|acc.sg is identified as sē' + (se ? ' (' + se.sentence.la + ')' : ''));
  const unseen = new Set(ALL);
  unseen.delete(507); unseen.delete(495);
  let glossed = null;
  E.setPool([...seen]);
  for (let i = 0; i < 30 && !glossed; i++) {
    try { const s = E.generate(rng(800 + i), { template: 'PRON_OBJ', pronTarget: 'pi|f.acc.sg' }); if (s && s.laTokens.includes('eam')) glossed = s; } catch (e) { /* keep looking */ }
  }
  E.setPool(null);
  const hints = glossed ? P.helperHints(glossed, unseen, E) : [];
  ok(!!glossed && hints.some(h => glossed.laTokens[h.i] === 'eam' && h.en === 'her'), 'unseen is is glossed' + (glossed ? ' (' + glossed.la + ')' : ''));
  const quiet = glossed ? P.helperHints(glossed, new Set([...unseen, 507]), E) : [];
  ok(!!glossed && !quiet.some(h => glossed.laTokens[h.i] === 'eam'), 'a seen is lemma is not glossed');
}

// ---------- daily goal: one sentence, one count; identify updates that form only ----------
{
  let state = { dn: 0, dq: 0, dst: {} };
  state = P.applySentenceGrade(state, { ex: 'id', combo: 'v1|ind.act.pres.3s' }, true, 1000);
  state = P.applySentenceGrade(state, { ex: 'id', combo: 'v1|ind.act.pres.3s' }, false, 2000);
  state = P.applySentenceGrade(state, { ex: 'tr', dir: 'le' }, true, 3000);
  ok(state.dn === 3, 'three sentences add 3 to the daily count, not one per word');
  ok(state.dst['v1|ind.act.pres.3s'] && state.dst['v1|ind.act.pres.3s'].a === 2 && state.dst['v1|ind.act.pres.3s'].ok === 1, 'identify records right/wrong on the asked form');
  ok(Object.keys(state.dst).length === 1, 'translate does not write a form stat');
}

console.log(fail ? 'FAILED ' + fail + ' / ' + (pass + fail) : 'OK ' + pass);
if (failures.length) for (const f of failures) console.log(' - ' + f);
process.exit(fail ? 1 : 0);
