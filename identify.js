/* Latin 1400 — "Identify the form" drills: parse a generated form into its attributes.
   Pure logic (no DOM), shared by app.js and tools/test_identify.js.
   A form can have several valid parses (syncretism); parses() finds every key in the word's own
   paradigm, limited to the current drill settings, whose form matches, and any one of them is accepted. */
(function (root) {
  'use strict';
  const M = root.Morph || (typeof require !== 'undefined' ? require('./morph.js') : null);
  const C5 = ['nom', 'gen', 'dat', 'acc', 'abl'], CX = ['nom', 'gen', 'dat', 'acc', 'abl', 'voc', 'loc'];
  const L = {
    mood: { ind: 'Indicative', sub: 'Subjunctive', imp: 'Imperative', inf: 'Infinitive', ptc: 'Participle', ger: 'Gerund', gdv: 'Gerundive', sup: 'Supine' },
    voice: { act: 'Active', pas: 'Passive' },
    tense: { pres: 'Present', impf: 'Imperfect', fut: 'Future', perf: 'Perfect', plup: 'Pluperfect', fperf: 'Fut. perfect' },
    person: { 1: '1st', 2: '2nd', 3: '3rd' },
    num: { sg: 'Singular', pl: 'Plural' },
    case: { nom: 'Nom.', gen: 'Gen.', dat: 'Dat.', acc: 'Acc.', abl: 'Abl.', voc: 'Voc.', loc: 'Loc.' },
    gender: { m: 'Masc.', f: 'Fem.', n: 'Neut.' },
    decl: { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th', irr: 'Irregular', '1/2': '1st/2nd' },
  };
  const TITLE = { mood: 'Mood / form', voice: 'Voice', tense: 'Tense', person: 'Person', num: 'Number', case: 'Case', gender: 'Gender', decl: 'Declension' };
  const MOOD_T = { ind: ['pres', 'impf', 'fut', 'perf', 'plup', 'fperf'], sub: ['pres', 'impf', 'perf', 'plup'], imp: ['pres', 'fut'], inf: ['pres', 'perf', 'fut'], ptc: ['pres', 'perf', 'fut'] };
  const ORDER = { mood: Object.keys(L.mood), voice: Object.keys(L.voice), tense: Object.keys(L.tense) };

  // noun gender: from the analysis, or read from the entry for irregular nouns (deus m., domus f., bōs mf.)
  function genders(w, a) {
    if (a.g === 'm' || a.g === 'f' || a.g === 'n') return [a.g];
    if (a.g === 'mf') return ['m', 'f'];
    const m = (w && w.la || '').match(/[ ,](mf|m|f|n)\./); return m ? (m[1] === 'mf' ? ['m', 'f'] : [m[1]]) : ['m', 'f', 'n'];
  }
  // participles and gerundives are declined like adjectives: amātus, -a, -um; amāns, amantis (abl. sg. -e as a participle, -ī as an adjective)
  function decline(base, a) {
    if (/us$/.test(base)) { const t = M.analyze({ la: base + ', -a, -um', pos: 'adjective', en: '' }); return t.tbl; }
    if (/ns$/.test(base)) {
      const gen = a.irr === 'eō' && /iēns$/.test(base) ? base.replace(/iēns$/, 'euntis') : base.replace(/([āēae])ns$/, (m, v) => ({ ā: 'a', ē: 'e' }[v] || v) + 'ntis');   // vowel is short before -nt-: amāns, amantis
      const t = M.analyze({ la: base + ', ' + gen, pos: 'adjective', en: '' }); if (!t.tbl) return null;
      const stem = gen.slice(0, -2), o = Object.assign({}, t.tbl);
      for (const g of 'mfn') o[g + '.abl.sg'] = [stem + 'e', stem + 'ī'];
      return o;
    }
    return null;
  }
  // full table: the word's own table, with participles / gerundives expanded to every gender, case and number
  function expand(a) {
    if (a._x) return a._x;
    const x = {};
    for (const k in a.tbl) {
      if (a.kind === 'verb' && (k.startsWith('ptc.') || k === 'gdv.m')) {
        const d = decline(a.tbl[k][0], a); if (!d) { x[k] = a.tbl[k]; continue; }
        const base = k === 'gdv.m' ? 'gdv' : k;
        for (const s in d) { const c = s.split('.')[1]; if (C5.includes(c)) x[base + ':' + s] = d[s]; }
      } else if (!(a.kind === 'verb' && k.startsWith('gdv.'))) x[k] = a.tbl[k];
    }
    Object.defineProperty(a, '_x', { value: x, enumerable: false });
    return x;
  }
  // voice is identified by form: deponents count as passive, except their active-looking forms
  // (present & future participle, future infinitive: hortāns, hortātūrus, hortātūrus esse)
  const formVoice = (v, mood, tense) => v !== 'dep' ? v : (mood === 'ptc' && tense !== 'perf') || (mood === 'inf' && tense === 'fut') ? 'act' : 'pas';
  const isDep = key => key.split('.')[1] === 'dep';
  function attrs(a, w, key) {
    if (a.kind === 'noun') { const [c, n] = key.split('.'); return { case: c, num: n, gender: genders(w, a), decl: String(a.decl) }; }
    if (a.kind === 'adj') { const [g, c, n] = key.split('.'); return { case: c, num: n, gender: [g], decl: a.decl === 3 ? '3' : '1/2' }; }
    const [base, sub] = key.split(':'), p = base.split('.'), mood = p[0];
    const decl = sub ? (([g, c, n]) => ({ case: c, num: n, gender: [g] }))(sub.split('.')) : {};
    if (mood === 'ger') return { mood, case: p[1] };
    if (mood === 'sup') return { mood, case: p[1] === 'um' ? 'acc' : 'abl' };
    if (mood === 'gdv') return Object.assign({ mood }, decl);
    const voice = formVoice(p[1], mood, p[2]);
    if (mood === 'inf') return { mood, voice, tense: p[2] };
    if (mood === 'ptc') return Object.assign({ mood, voice, tense: p[2] }, decl);
    return { mood, voice, tense: p[2], person: p[3][0], num: p[3][1] === 's' ? 'sg' : 'pl' };
  }
  const pCases = df => { const c = C5.filter(x => df.cases.includes(x)); return c.length ? c : C5; };
  const pNums = df => df.nums.length ? ['sg', 'pl'].filter(x => df.nums.includes(x)) : ['sg', 'pl'];
  // finite verbs: indicative / subjunctive follow the verb Person and Number chips; imperatives ignore Person
  // (every imperative person that exists: present 2nd, future 2nd / 3rd) but follow Number. Older saved settings: all
  const vPers = df => df.persons || ['1', '2', '3'], vNums = df => df.vnums || ['sg', 'pl'];
  const PERS_M = { ind: ['1', '2', '3'], sub: ['1', '2', '3'], imp: ['2', '3'] };
  function finiteOk(key, df) {
    const p = key.split('.'); if (!PERS_M[p[0]] || !p[3]) return true;
    return (p[0] === 'imp' || vPers(df).includes(p[3][0])) && vNums(df).includes(p[3][1] === 's' ? 'sg' : 'pl');
  }
  // can this mood produce any form under the settings? (imperative + only perfect tense: no; Person doesn't matter for it)
  function moodPossible(m, df) {
    if (MOOD_T[m] && !MOOD_T[m].some(t => df.tenses.includes(t))) return false;
    if (PERS_M[m] && ((m !== 'imp' && !PERS_M[m].some(x => vPers(df).includes(x))) || !vNums(df).length)) return false;
    return true;
  }
  // gerund and supine: limited by the Case chips too (if none of their cases is on, all of them are drilled)
  const GER_C = ['gen', 'dat', 'acc', 'abl'], SUP_C = ['acc', 'abl'];
  const vCases = (df, cs) => { const c = cs.filter(x => df.cases.includes(x)); return c.length ? c : cs; };
  function vCaseOk(key, df) {
    const [mood, c] = key.split('.');
    if (mood === 'ger') return vCases(df, GER_C).includes(c);
    if (mood === 'sup') return vCases(df, SUP_C).includes(c === 'um' ? 'acc' : 'abl');
    return true;
  }
  // is this key inside the current drill settings? (like the typed drills' filter, but the headword itself counts too)
  function allowed(a, key, df) {
    const at = attrs(a, null, key);
    if (a.kind !== 'verb') return df.cases.includes(at.case) && df.nums.includes(at.num);
    if (!df.moods.includes(at.mood)) return false;
    if (at.voice && !df.voices.includes(isDep(key) ? 'dep' : at.voice)) return false;   // the settings still say active / passive / deponent
    if (at.tense && !df.tenses.includes(at.tense)) return false;
    if (at.person && !finiteOk(key, df)) return false;
    if ((at.mood === 'ptc' || at.mood === 'gdv') && at.gender) return pCases(df).includes(at.case) && pNums(df).includes(at.num);
    if (at.mood === 'ger' || at.mood === 'sup') return vCaseOk(key, df);
    return true;
  }
  function index(a) {      // normalized form -> every key that produces it
    if (a._ix) return a._ix;
    const x = expand(a), ix = new Map();
    for (const k in x) for (const f of x[k]) { const n = M.normM(f); if (!ix.has(n)) ix.set(n, []); if (!ix.get(n).includes(k)) ix.get(n).push(k); }
    Object.defineProperty(a, '_ix', { value: ix, enumerable: false });
    return ix;
  }
  function parses(a, w, form, df) {
    return (index(a).get(M.normM(form)) || []).filter(k => allowed(a, k, df)).map(k => ({ key: k, at: attrs(a, w, k), dep: a.kind === 'verb' && isDep(k) }));
  }
  // choose a question from one of the typed drills' keys: participles and gerundives get a random gender / case / number
  function pick(a, keys, df, rnd) {
    rnd = rnd || Math.random;
    const key = keys[Math.floor(rnd() * keys.length)], x = expand(a);
    let k = key;
    if (a.kind === 'verb' && (key.startsWith('ptc.') || key.startsWith('gdv.'))) {
      const base = key.startsWith('gdv.') ? 'gdv' : key, subs = Object.keys(x).filter(s => s.startsWith(base + ':') && allowed(a, s, df));
      if (subs.length) k = subs[Math.floor(rnd() * subs.length)]; else if (!x[key]) return null;
    }
    return { key: k, form: x[k][0] };
  }
  // typed drills: a participle or gerundive is asked in its nom. sg. (amātus, amanda) when the settings allow that;
  // otherwise in an allowed case and number of the same gender (amātō, amandārum). null = ask the table form as is.
  function typedSub(a, key, df, rnd) {
    if (a.kind !== 'verb' || !(key.startsWith('ptc.') || key.startsWith('gdv.'))) return null;
    if (pCases(df).includes('nom') && pNums(df).includes('sg')) return null;
    rnd = rnd || Math.random;
    const gdv = key.startsWith('gdv.'), pre = (gdv ? 'gdv' : key) + ':' + (gdv ? key.split('.')[1] : 'm') + '.', x = expand(a);
    const subs = Object.keys(x).filter(s => s.startsWith(pre) && allowed(a, s, df));
    if (!subs.length) return null;
    const k = subs[Math.floor(rnd() * subs.length)];
    return { key: k, forms: x[k] };
  }
  const opts = (attr, vals) => vals.map(v => [v, L[attr][v]]);
  const or = (f, all) => f.length ? f : all;   // never an empty row (a mood picked by mistake still gets answerable rows)
  // the chip rows to show; for verbs they depend on the mood picked (or locked)
  function rows(a, df, mood) {
    if (a.kind === 'noun') return [['case', opts('case', CX.filter(c => df.cases.includes(c)))], ['num', opts('num', ['sg', 'pl'].filter(n => df.nums.includes(n)))],
      ['gender', opts('gender', ['m', 'f', 'n'])], ['decl', opts('decl', ['1', '2', '3', '4', '5', 'irr'].filter(d => df.decl.includes(d)))]];
    if (a.kind === 'adj') return [['case', opts('case', CX.filter(c => df.cases.includes(c)))], ['num', opts('num', ['sg', 'pl'].filter(n => df.nums.includes(n)))],
      ['gender', opts('gender', ['m', 'f', 'n'])], ['decl', opts('decl', [df.decl.includes('1') || df.decl.includes('2') ? '1/2' : null, df.decl.includes('3') ? '3' : null].filter(Boolean))]];
    const on = ORDER.mood.filter(m => df.moods.includes(m)), moods = or(on.filter(m => moodPossible(m, df)), on), r = [['mood', opts('mood', moods)]];
    const m = mood || (moods.length === 1 ? moods[0] : null);
    if (!m) return r;
    const tenses = MOOD_T[m] && opts('tense', or(MOOD_T[m].filter(t => df.tenses.includes(t)), MOOD_T[m])), dep = df.voices.includes('dep'),
      voices = opts('voice', ['act', 'pas'].filter(v => df.voices.includes(v) || dep && (v === 'pas' || m === 'ptc' || m === 'inf')));
    // imperative: only the persons this verb has under the other settings (present only -> 2nd, locked)
    const iPers = m === 'imp' && Object.keys(a.tbl).filter(k => k.startsWith('imp.') && allowed(a, k, df)).map(k => k.split('.')[3][0]);
    const pers = m === 'imp' ? PERS_M.imp.filter(x => iPers.includes(x)) : PERS_M[m] && PERS_M[m].filter(x => vPers(df).includes(x));
    if (PERS_M[m]) r.push(['tense', tenses], ['voice', voices], ['person', opts('person', or(pers, PERS_M[m]))], ['num', opts('num', or(['sg', 'pl'].filter(x => vNums(df).includes(x)), ['sg', 'pl']))]);
    else if (m === 'inf') r.push(['tense', tenses], ['voice', voices]);
    else if (m === 'ptc') r.push(['tense', tenses], ['voice', voices], ['case', opts('case', pCases(df))], ['num', opts('num', pNums(df))], ['gender', opts('gender', ['m', 'f', 'n'])]);
    else if (m === 'ger') r.push(['case', opts('case', vCases(df, GER_C))]);
    else if (m === 'gdv') r.push(['case', opts('case', pCases(df))], ['num', opts('num', pNums(df))], ['gender', opts('gender', ['m', 'f', 'n'])]);
    else if (m === 'sup') r.push(['case', opts('case', vCases(df, SUP_C))]);
    return r;
  }
  const hit = (v, s) => Array.isArray(v) ? v.includes(s) : v === s;
  // whole answer right or wrong; `off` = the attributes that differ from the closest valid parse
  function grade(sel, ps) {
    let best = null, off = null;
    for (const p of ps) { const d = Object.keys(p.at).filter(k => !hit(p.at[k], sel[k])); if (!off || d.length < off.length) { best = p; off = d; } }
    return { ok: !!off && off.length === 0, best, off: off || [] };
  }
  function parseLabel(a, p) {
    const [base, sub] = p.key.split(':');
    if (a.kind === 'noun') return M.label('noun', p.key);
    if (a.kind === 'adj') return M.label('adj', p.key);
    if (sub) return (base === 'gdv' ? 'gerundive' : M.label('verb', base).replace(/\s*\(nom\. masc\. sg\.\)/, '')) + ' · ' + M.label('adj', sub);
    return M.label('verb', p.key);
  }
  const api = { expand, attrs, allowed, vCaseOk, finiteOk, moodPossible, typedSub, parses, pick, rows, grade, parseLabel, genders, L, TITLE, hit };
  root.Identify = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
