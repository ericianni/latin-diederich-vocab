// Rule-based Latin sentence engine (Sentences beta page). No AI at runtime: templates + hand-reviewed semantic tags (lexicon*.js)
// + the app's own morphology engine (../morph.js) and word list (../data/words.json). Ported from the latin-sentence-poc project.
(function (root) {
  const isNode = typeof module !== 'undefined' && module.exports;
  const Morph = isNode ? require('../morph.js') : root.Morph;
  // the app's data/words.json (array indexed by id); in the browser the page sets self.LatinWords before the first sentence is built
  const WORDS = () => isNode ? require('../data/words.json') : root.LatinWords;
  const LEX = isNode ? require('./lexicon.js') : root.LatinLex;
  const norm = Morph.norm, normM = Morph.normM;

  // ---------- RNG ----------
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
  const shuffle = (rng, arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // ---------- morphology layer (with documented overrides for morph.js bugs) ----------
  const CASES = ['nom', 'gen', 'dat', 'acc', 'abl'];
  const NUMS = ['sg', 'pl'];
  // No per-word form overrides: every form comes from the app's morph.js as is. ex(s)tinguō's ext- spelling is
  // accepted by grading through Morph.variants, the same rule the app's own check() uses. The sentence shows
  // Morph.standard (the first form of the cell). Other forms stay in the table and gradeLatin still accepts them.
  const OVERRIDES = {};
  const GENDER_OVERRIDES = {};
  // Personal pronouns used as object / indirect object / agent (ā mē) / with (mēcum). No nominative here: the subject pronoun is the PRONOUN template's
  // optional ego/tū/nōs/vōs, and leaving nōs/vōs out of the nominative keeps the case check from counting a reading the verb's person already rules out.
  // "with us/you (pl.)" would be nōbīscum/vōbīscum, which are not Diederich entries, so only mēcum/tēcum are used.
  const PRON_NP = {
    '1s': { acc: 'mē', dat: 'mihi', abl: 'mē', cum: 'mēcum', en: 'me', num: 'sg' }, '2s': { acc: 'tē', dat: 'tibi', abl: 'tē', cum: 'tēcum', en: 'you', num: 'sg', label: 'you (sg.)' },
    '1p': { acc: 'nōs', dat: 'nōbīs', abl: 'nōbīs', en: 'us', num: 'pl' }, '2p': { acc: 'vōs', dat: 'vōbīs', abl: 'vōbīs', en: 'you', num: 'pl', label: 'you (pl.)', alts: ['you all'] },
  };
  const PRON_KEYS = Object.keys(PRON_NP).map(p => 'pron_' + p);
  function pronInfo(key) {
    const p = key.slice(5), d = PRON_NP[p]; const tbl = {};
    for (const c of ['acc', 'dat', 'abl']) tbl[c + '.' + d.num] = [d[c]];
    const info = { key, pron: p, id: null, cls: 'human', g: 'm', genders: ['m'], tbl, en: [d.en, d.en], alts: [[d.en].concat(d.alts || []), [d.en].concat(d.alts || [])],
      sgOnly: d.num === 'sg', plOnly: d.num === 'pl', nums: [d.num], tags: new Set(['human', '@' + key, '#animate', '#concrete', '#count', '#pron']), label: d.label, cumForm: d.cum };
    info.form = (c, n) => tbl[c + '.' + n] || null;
    return info;
  }
  const cache = {};
  function nounInfo(key) {
    if (cache['n:' + key]) return cache['n:' + key];
    if (key.startsWith('pron_')) return (cache['n:' + key] = pronInfo(key));
    const lx = LEX.nouns[key]; if (!lx) throw new Error('no noun ' + key);
    const r = Morph.analyze(WORDS()[lx.id]); const tbl = JSON.parse(JSON.stringify(r.tbl));
    const g0 = GENDER_OVERRIDES[key] || r.g;
    const genders = g0 === 'mf' ? ['m', 'f'] : g0 === 'irr' ? ['m'] : [g0];
    const tags = new Set([lx.cls, '@' + key, ...lx.tags]);
    if (lx.cls !== 'abstract') tags.add('#concrete');
    if (!lx.mass) tags.add('#count');
    if (lx.cls === 'human' && genders[0] === 'm') tags.add('mhuman');
    if (['human', 'deity', 'animal'].includes(lx.cls)) tags.add('#animate');
    if (['puer', 'puella'].includes(key)) tags.add('#child');
    if (lx.cls !== 'human' && !lx.mass) tags.add('#countNonHuman');
    const info = Object.assign({}, lx, { key, tbl, g: genders[0], genders, tags });
    info.form = (c, n) => tbl[c + '.' + n] || null;
    info.nums = lx.mass || lx.sgOnly ? ['sg'] : lx.plOnly ? ['pl'] : NUMS;
    return (cache['n:' + key] = info);
  }
  function adjInfo(key) {
    if (cache['a:' + key]) return cache['a:' + key];
    const lx = LEX.adjs[key]; const r = Morph.analyze(WORDS()[lx.id]);
    const tbl = OVERRIDES['adj_' + key] ? OVERRIDES['adj_' + key] : r.tbl;
    const info = Object.assign({ key, tbl }, lx);
    info.form = (g, c, n) => tbl[g + '.' + c + '.' + n] || [];   // a defective cell (dīves has no neuter plural) is no forms, not a missing array
    return (cache['a:' + key] = info);
  }
  function verbInfo(key) {
    if (cache['v:' + key]) return cache['v:' + key];
    const lx = LEX.verbs[key]; const r = Morph.analyze(WORDS()[lx.id]);
    let tbl = JSON.parse(JSON.stringify(r.tbl));
    if (OVERRIDES['verb_' + key]) tbl = OVERRIDES['verb_' + key](tbl);
    const info = Object.assign({ key, tbl, morphNoPassive: !!r.noPassive }, lx);
    if (tbl['ptc.pas.perf']) { const p = tbl['ptc.pas.perf'][0]; info.ptc = Morph.analyze({ pos: 'adjective', la: p + ', -a, -um' }).tbl; }
    return (cache['v:' + key] = info);
  }
  const SUM = () => verbInfo('sum');
  // Latin verb: returns list of alternative token arrays. Perfect passive returns {ptc:[...], aux:[...]} pieces.
  function latinVerb(v, voice, tense, pn, g) {
    if (voice === 'act') {
      // A synthetic perfect (placuī) is the sentence form. A periphrastic alternate (placitus sum) agrees in gender, which this slot does not inflect.
      let fs = v.tbl['ind.act.' + tense + '.' + pn];
      const syn = fs.filter(f => !/\s/.test(f));
      if (syn.length) fs = syn;
      return fs.map(f => [f]);
    }
    if (tense !== 'perf') return v.tbl['ind.pas.' + tense + '.' + pn].map(f => [f]);
    const num = pn[1] === 's' ? 'sg' : 'pl';
    return { ptc: g.map(gg => v.ptc[gg + '.nom.' + num][0]), aux: SUM().tbl['ind.act.pres.' + pn] };
  }

  // ---------- spec matching ----------
  function matches(info, specs) {
    if (!specs) return false;
    const neg = specs.filter(s => s[0] === '!').map(s => s.slice(1));
    if (neg.some(s => info.tags.has(s))) return false;
    return specs.some(s => s[0] !== '!' && info.tags.has(s));
  }
  // ---------- word pool (Sentences page: "words I've seen" option) ----------
  // POOL = null: all lexicon words. Otherwise a Set of Diederich ids (data/words.json) that content words must come from.
  // Always allowed, whatever the pool: prepositions, personal pronouns (egō, tū, nōs, vōs) and sum (also the perfect-passive helper).
  let POOL = null;
  function setPool(ids) { POOL = ids ? new Set([...ids].map(Number)) : null; }
  const inPool = id => !POOL || POOL.has(id);
  const nounOK = k => /^pron_/.test(k) || inPool(LEX.nouns[k].id);
  // every Diederich id a sentence uses as a content word (exempt words left out)
  function sentenceIds(sent) {
    const ids = [];
    for (const x of sent.lexemes) {
      if (/^pron[:_]/.test(x)) continue;
      if (x.startsWith('adj:')) ids.push(LEX.adjs[x.slice(4)].id);
      else if (x.startsWith('adv:')) ids.push(LEX.advs[x.slice(4)].id);
      else if (x.startsWith('conj:')) { const C = LEX.conjs[x.slice(5)], f = sent.spec.coord && sent.spec.coord.form; const alt = (C.alt || []).find(a => a.form === f); ids.push(alt ? alt.id : C.id); }
      else if (LEX.nouns[x]) ids.push(LEX.nouns[x].id);
      else if (LEX.verbs[x]) { if (x !== 'sum') ids.push(LEX.verbs[x].id); }
      else throw new Error('unknown lexeme ' + x);
    }
    if (sent.spec.nocte) ids.push(LEX.extras.nox.id);
    return ids;
  }
  const ALL_NOUNS = () => Object.keys(LEX.nouns).filter(nounOK).map(nounInfo);
  const adjFits = (a, n) => matches(n, a.on);
  function adjEnglish(a, n) { for (const k of Object.keys(a.en)) if (k !== 'default' && n.tags.has(k)) return a.en[k]; return a.en.default; }

  // ---------- English morphology ----------
  const beF = (t, p) => t === 'pres' ? (p === '1s' ? 'am' : p === '3s' ? 'is' : 'are') : (p === '1s' || p === '3s' ? 'was' : 'were');
  const haveF = p => p === '3s' ? 'has' : 'have';
  const doF = p => p === '3s' ? 'does' : 'do';
  function enVPforms(f, tense, p, stative) {
    if (f[0].startsWith('be ')) { const r = f[0].slice(3);
      return { pres: [beF('pres', p) + ' ' + r], impf: ['used to be ' + r, beF('past', p) + ' ' + r], perf: [beF('past', p) + ' ' + r, haveF(p) + ' been ' + r], fut: ['will be ' + r, beF('pres', p) + ' going to be ' + r] }[tense]; }
    const [base, s3, past, pp, ing] = f;
    switch (tense) {
      case 'pres': return [p === '3s' ? s3 : base, beF('pres', p) + ' ' + ing, doF(p) + ' ' + base];
      case 'impf': return stative ? ['used to ' + base, past, beF('past', p) + ' ' + ing, 'kept ' + ing] : [beF('past', p) + ' ' + ing, 'used to ' + base, 'kept ' + ing];
      case 'perf': return [past, haveF(p) + ' ' + pp, 'did ' + base];
      case 'fut': return ['will ' + base, beF('pres', p) + ' going to ' + base].concat(p[0] === '1' ? ['shall ' + base] : []);
    }
  }
  function enPassive(f, tense, p) {
    const pp = f[3];
    return { pres: [beF('pres', p) + ' ' + pp, beF('pres', p) + ' being ' + pp], impf: [beF('past', p) + ' being ' + pp, 'used to be ' + pp],
      perf: [beF('past', p) + ' ' + pp, haveF(p) + ' been ' + pp], fut: ['will be ' + pp, beF('pres', p) + ' going to be ' + pp] }[tense];
  }
  function enCopula(tense, p) {
    return { pres: [beF('pres', p)], impf: [beF('past', p), 'used to be'], perf: [beF('past', p), haveF(p) + ' been'], fut: ['will be', beF('pres', p) + ' going to be'] }[tense];
  }
  // all English alternatives for a verb in a tense/voice/person; first = canonical
  function enVerbAlts(v, voice, tense, p) {
    if (v.key === 'sum') return enCopula(tense, p);
    const glosses = [v.en].concat(v.alts || []);
    const out = [];
    for (const f of glosses) for (const s of (voice === 'act' ? enVPforms(f, tense, p, v.stative) : enPassive(f, tense, p))) if (!out.includes(s)) out.push(s);
    return out;
  }

  // ---------- adverbs (section V) ----------
  // An adverb is either an edge adverbial (own English slot at the end or the front: "now", "tomorrow", "there") or a mid adverb placed
  // inside the English verb phrase ("always runs", "has always run", "is always long"); nōn is a mid adverb with do-support ("does not run").
  const AUXW = /^(am|is|are|was|were|has|have|will|shall|does|do|did)$/;
  function advInVP(s, f, m, neg, p, tense) {
    const w = s.split(' ');
    if (w[0] === 'kept') return [];                                        // *"kept always running"
    if (neg) {
      if (AUXW.test(w[0])) return [[w[0], m].concat(w.slice(1)).join(' ')];
      if (w[0] === 'used' && w[1] === 'to') return ['did ' + m + ' use to ' + w.slice(2).join(' ')];
      if (!f) return [];
      const simple = f[0].startsWith('be ') ? null : tense === 'pres' ? doF(p) : 'did';
      return simple ? [simple + ' ' + m + ' ' + f[0]] : [];
    }
    if (/^(does|do|did)$/.test(w[0])) return [];                           // no emphatic do with a mid adverb
    if (AUXW.test(w[0])) return [[w[0], m].concat(w.slice(1)).join(' ')];
    return [m + ' ' + s];
  }
  function enVerbAltsAdv(v, voice, tense, p, A) {
    const out = [], add = x => { if (!out.includes(x)) out.push(x); };
    const words = A.neg ? [A.neg] : A.mid || [];
    const order = xs => { let r = xs.slice();
      if (A.preferHave && tense === 'perf') r = r.filter(x => /^(has|have) /.test(x)).concat(r.filter(x => !/^(has|have) /.test(x)));
      if (A.impfUsedTo && tense === 'impf') r = r.filter(x => x.startsWith('used to')).concat(r.filter(x => !x.startsWith('used to')));
      return r; };
    const glosses = v.key === 'sum' ? [null] : [v.en].concat(v.alts || []);
    for (const m of words) for (const f of glosses) {
      let forms = f === null ? enCopula(tense, p) : voice === 'act' ? enVPforms(f, tense, p, v.stative) : enPassive(f, tense, p);
      if (A.impfSimple && tense === 'impf') forms = simplePast(v, voice, p, f).concat(forms); // habitual adverbs: saepe labōrābat = "often worked"

      for (const s of order(forms)) for (const x of advInVP(s, voice === 'act' ? f : null, m, !!A.neg, p, tense)) add(x);
    }
    return out;
  }
  // simple past forms ("worked", "was seen", "was") for the imperfect next to a habitual adverb (A.impfSimple: saepe, semper, plērumque)
  function simplePast(v, voice, p, f) { const forms = f === null ? enCopula('perf', p) : voice === 'act' ? enVPforms(f, 'perf', p, v.stative) : enPassive(f, 'perf', p); return forms.filter(x => !/^(has|have) /.test(x)); }
  const ADV_KEYS = () => Object.keys(LEX.advs || {}).filter(k => inPool(LEX.advs[k].id));
  const MOTION_PP = ['goal', 'into', 'ex', 'from'];
  // can adverb A go with this sentence? (tense, copula, passive, verb class, static place adverbs only with intransitive verbs of being somewhere)
  function advFits(A, x) {
    if (!A.tenses.includes(x.tense)) return false;
    if (x.v.key === 'sum') return !!A.cop;
    if (x.voice === 'pas' && A.pas === false) return false;
    if (A.noStative && x.v.stative) return false;
    if (A.verbs && !A.verbs.includes(x.v.key)) return false;
    if (A.notVerbs && A.notVerbs.includes(x.v.key)) return false;
    if (A.place) { const pp = (x.fr.f.pp || []).map(t => t.replace('!', ''));
      if (x.voice !== 'act' || x.fr.f.t !== 'intr' || x.pp || x.means || !pp.includes('loc') || pp.some(t => MOTION_PP.includes(t))) return false; }
    return true;
  }

  // ---------- noun phrases ----------
  const PRON = { '1s': ['ego', 'I'], '2s': ['tū', 'you'], '1p': ['nōs', 'we'], '2p': ['vōs', 'you'] };
  function enNoun(n, num) {
    const i = (n.enNum === 'sg' || num === 'sg' || n.mass) ? 0 : 1;
    const canon = n.en[i] || n.en[0];
    let alts = [canon].concat((n.alts && n.alts[i]) || []);
    if (n.plOnly && n.enNum === 'sg') alts = alts.concat([n.en[1]], (n.alts && n.alts[1]) || []);
    return { canon, alts: [...new Set(alts)], enNum: n.mass ? 'sg' : n.enNum || num };
  }
  // NP: {noun, num, case, adj}. Returns latin variants and English pieces
  function buildNP(np) {
    const n = np.noun, forms = n.form(np.case, np.num);
    const a = np.adj ? adjInfo(np.adj) : null;
    const en = enNoun(n, np.num);
    const det = a && a.kind; // 'poss' (meus …) or 'dem' (hic, ille): English determiner replaces "the"
    // this/these, that/those follow the English number (haec castra = "this camp"); plural-only nouns then accept only their singular English
    if (det === 'dem' && n.plOnly && en.enNum === 'sg') en.alts = [en.canon].concat((n.alts && n.alts[0]) || []);
    const adjEn = !a ? null : det === 'dem' ? (en.enNum === 'pl' ? a.en.pl : a.en.default) : adjEnglish(a, n);
    const art = n.mass || n.pron || det ? '' : 'the';
    const enCanon = [art, adjEn ? adjEn[0] : '', en.canon].filter(Boolean).join(' ');
    const enAlts = (adjEn || ['']).flatMap(ae => en.alts.map(na => (ae ? ae + ' ' : '') + na));
    const label = n.label || (det === 'poss' && a.person[0] === '2' ? 'your (' + (a.person[1] === 's' ? 'sg.' : 'pl.') + ')' : null);
    const enPrompt = n.label ? n.label : label ? enCanon.replace(/^your\b/, label) : enCanon;
    const variants = [];
    const aforms = [];
    if (!a) for (const f of forms) variants.push([f]);
    else {
      for (const g of n.genders) for (const af of a.form(g, np.case, np.num)) if (!aforms.includes(af)) aforms.push(af);
      const nFirst = [], aFirst = [];
      for (const f of forms) for (const af of aforms) { nFirst.push([f, af]); aFirst.push([af, f]); }
      // canonical (first) order: demonstratives precede the noun (hic canis); other adjectives and possessives follow it (pater meus)
      variants.push(...(det === 'dem' ? aFirst.concat(nFirst) : nFirst.concat(aFirst)));
    }
    return { variants, enCanon, enPrompt, enAlts, enNum: en.enNum, adjForms: a ? a.form(n.g, np.case, np.num) : null, adjFormsAll: aforms, nounTok: forms[0], adjTok: a ? aforms[0] : null };
  }
  // preposition variants. kind: in/ad/per/sine/cum/ab/ex
  const plain = w => w.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); // keeps v as a consonant (norm() maps v→u)
  const startsVowelH = w => /^[aeiouyh]/.test(plain(w));
  function prepForms(kind, next) {
    if (kind === 'ab') return startsVowelH(next) ? (plain(next)[0] === 'h' ? ['ab', 'ā'] : ['ab']) : ['ā', 'ab'];
    if (kind === 'ex') return startsVowelH(next) ? (plain(next)[0] === 'h' ? ['ex', 'ē'] : ['ex']) : ['ē', 'ex'];
    return [kind];
  }
  function ppVariants(kind, npVariants, kinds, adjForms) {
    const out = [];
    for (const k of (kinds || [kind])) for (const v of npVariants) {
      if (v.length === 1) { for (const p of prepForms(k, v[0])) out.push([p, v[0]]); continue; }
      const [x, y] = v; // either [N,A] or [A,N]; preposition first, or between A and N when A first
      for (const p of prepForms(k, x)) out.push([p, x, y]);
    }
    // A prep N order (only for NP variants that start with the adjective → put adj first then prep then noun)
    // (bug fix, found in section II review: this used to accept N prep A too, e.g. "urbe in magnā"; only A prep N, e.g. "magnā in urbe", "hāc in urbe", is standard)
    for (const k of (kinds || [kind])) for (const v of npVariants) if (v.length === 2 && (!adjForms || adjForms.includes(v[0]))) {
      for (const p of prepForms(k, v[1])) { const cand = [v[0], p, v[1]]; out.push(cand); }
    }
    // dedupe
    const seen = new Set(); return out.filter(v => { const s = v.join(' '); if (seen.has(s)) return false; seen.add(s); return true; });
  }
  const PP_TYPES = {
    loc: { prep: 'in', case: 'abl', en: n => n.enIn || ['in'], fits: n => n.cls === 'place' && n.tags.has('#land') && !n.tags.has('#goalonly') },
    goal: { prep: 'ad', case: 'acc', en: () => ['to', 'toward', 'towards'], fits: n => n.cls === 'place' },
    into: { prep: 'in', case: 'acc', en: () => ['into'], fits: n => n.tags.has('#enclosure') },
    ex: { prep: 'ex', case: 'abl', en: () => ['out of', 'from'], fits: n => n.tags.has('#enclosure') },
    from: { prep: 'ab', case: 'abl', en: () => ['from', 'away from'], fits: n => n.cls === 'place', enLaAlso: ['ex'] },
    through: { prep: 'per', case: 'acc', en: () => ['through', 'across'], fits: n => n.tags.has('#passable') },
    cum: { prep: 'cum', case: 'abl', en: () => ['with', 'along with', 'together with'], fits: n => n.cls === 'human' || n.key === 'canis' || n.key === 'equus' },
    sine: { prep: 'sine', case: 'abl', en: () => ['without'], fits: n => ['gladius', 'arma', 'cibus', 'aqua', 'equus', 'canis', 'amicus', 'dux', 'navis'].includes(n.key) },
    agent: { prep: 'ab', case: 'abl', en: () => ['by'], fits: n => n.tags.has('#animate') },
  };
  // Section VIII: hand-reviewed prepositional phrase types from the lexicon (ante, post, prope, sub, inter …). Each lists the verbs it goes with
  // and the nouns it takes (per verb when nounsByVerb is set); en may depend on the verb (dē: "fell from the wall", "ran down from the hill")
  for (const [ty, X] of Object.entries(LEX.ppTypes || {})) {
    const nounsFor = vk => X.nouns ? X.nouns : vk ? (X.nounsByVerb[vk] || []) : [].concat(...Object.values(X.nounsByVerb));
    PP_TYPES[ty] = { prep: X.prep, case: X.case, num: X.num || null, enLaAlso: X.enLaAlso || [], fromLex: true,
      en: (n, vk) => (X.enByVerb && X.enByVerb[vk]) || X.en,
      fits: (n, vk) => (!vk || X.verbs.includes(vk)) && nounsFor(vk).includes(n.key),
      subjOK: (n, vk) => { const sp = (X.subjByVerb && X.subjByVerb[vk]) || X.subj; return !sp || matches(n, sp); } };
  }

  // ---------- ambiguity (case/number readings) ----------
  function nounReadings(n, tok) {
    const r = []; for (const c of ['nom', 'dat', 'acc', 'abl']) for (const nu of NUMS) { const f = n.form(c, nu); if (f && f.length && norm(Morph.standard(f)) === norm(tok)) r.push(c + '.' + nu); } return r;
  }
  function adjReadings(a, tok) {
    const r = []; for (const g of ['m', 'f', 'n']) for (const c of ['nom', 'dat', 'acc', 'abl']) for (const nu of NUMS) { const f = a.form(g, c, nu); if (f && f.length && norm(Morph.standard(f)) === norm(tok)) r.push(g + '.' + c + '.' + nu); } return r;
  }
  // nps: [{np, role}] roles: S (needs nom + verb number), O (acc), IO (dat), MEANS (abl). Returns problem string or null.
  function ambiguity(nps, verbNum, hasExplicitSubject) {
    const R = { S: c => c.startsWith('nom.') && c.endsWith('.' + verbNum), SC: c => c.startsWith('nom.'), O: c => c.startsWith('acc.'), IO: c => c.startsWith('dat.'), MEANS: c => c.startsWith('abl.') };
    const reads = nps.map(x => {
      const n = x.np.noun;
      let rd = nounReadings(n, x.built.nounTok);
      if (x.np.adj) { const a = adjInfo(x.np.adj); const ar = adjReadings(a, x.built.adjTok); rd = rd.filter(c => n.genders.some(g => ar.includes(g + '.' + c))); }
      return rd;
    });
    const roles = nps.map(x => x.role);
    // count assignments of NPs to the multiset of roles
    let count = 0; const used = roles.map(() => false);
    (function rec(i) { if (i === nps.length) { count++; return; } for (let j = 0; j < roles.length; j++) if (!used[j] && reads[i].some(R[roles[j]])) { if (j > 0 && roles[j] === roles[j - 1] && !used[j - 1]) continue; used[j] = true; rec(i + 1); used[j] = false; } })(0);
    if (count !== 1) return 'role ambiguity (' + count + ' readings)';
    // adjective attachment: an adjective must not also agree with another role NP
    for (let i = 0; i < nps.length; i++) if (nps[i].np.adj) {
      const a = adjInfo(nps[i].np.adj); const ar = adjReadings(a, nps[i].built.adjTok);
      for (let j = 0; j < nps.length; j++) if (j !== i) { const o = nps[j].np; if (o.noun.genders.some(g => ar.includes(g + '.' + o.case + '.' + o.num))) return 'adjective could attach to ' + o.noun.key; }
    }
    return null;
  }

  // ---------- English regex helpers ----------
  function normEn(s) {
    return (' ' + s.toLowerCase() + ' ').replace(/\((sg|pl)\.?\)/g, ' ').replace(/[’`]/g, "'")
      .replace(/\bwon't\b/g, 'will not').replace(/\bshan't\b/g, 'shall not').replace(/\bcan't\b/g, 'can not').replace(/n't\b/g, ' not')
      .replace(/\bi'm\b/g, 'i am').replace(/\b(you|we|they)'re\b/g, '$1 are').replace(/'ll\b/g, ' will').replace(/\b(i|you|we|they)'ve\b/g, '$1 have')
      .replace(/\b(he|she|it)'s been\b/g, '$1 has been')
      .replace(/our\b/g, m => m).replace(/\b(fav|val|lab|hon|arm)our/g, '$1or').replace(/\bwoods\b/g, 'woods')
      .replace(/[^a-z' -]/g, ' ').replace(/-/g, ' ').replace(/\b(a|an|the)\b/g, ' ').replace(/\s+/g, ' ').trim();
  }
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const altRe = alts => '(?:' + [...new Set(alts.map(normEn))].sort((a, b) => b.length - a.length).map(esc).join('|') + ')';
  function permutations(arr) { if (arr.length <= 1) return [arr.slice()]; const out = []; arr.forEach((x, i) => { for (const p of permutations(arr.slice(0, i).concat(arr.slice(i + 1)))) out.push([x].concat(p)); }); return out; }

  // ---------- sentence assembly ----------
  const TENSES = ['pres', 'impf', 'perf', 'fut'];
  const TEMPLATES = ['SV', 'SV_PP', 'SOV', 'SOV_ADJ', 'PP_ADJ', 'PASSIVE', 'DAT_IO', 'DAT_VERB', 'COPULA', 'MEANS', 'PRONOUN', 'PRON_OBJ', 'DET'].concat(Object.keys(LEX.advs || {}).length ? ['ADV'] : [], Object.keys(LEX.conjs || {}).length ? ['COORD'] : []);

  function chooseNoun(rng, specs, used, extraFilter) {
    const c = ALL_NOUNS().filter(n => !used.has(n.key) && matches(n, specs) && (!extraFilter || extraFilter(n)));
    return c.length ? pick(rng, c) : null;
  }
  function chooseNum(rng, n, pPl) { if (n.mass || n.sgOnly) return 'sg'; if (n.plOnly) return 'pl'; return rng() < (pPl == null ? 0.4 : pPl) ? 'pl' : 'sg'; }
  // forPred: predicate adjective after 'sum' — attributive-only adjectives (proximus, propinquus, ultimus: *"The city is nearest") are left out
  const predOK = k => !LEX.adjs[k].kind && !LEX.adjs[k].attr;
  function chooseAdj(rng, n, used, num, kase, forPred) {
    const c = Object.keys(LEX.adjs).filter(k => !LEX.adjs[k].kind && inPool(LEX.adjs[k].id) && (!forPred || predOK(k)) && !used.has('adj:' + k) && !used.has(k) && adjFits(adjInfo(k), n)
      && (!num || !kase || n.genders.some(g => adjInfo(k).form(g, kase, num).length)));
    if (!c.length) return null; const k = pick(rng, c); used.add('adj:' + k); return k;
  }
  function frameList(pred) { const out = []; for (const k of Object.keys(LEX.verbs)) if (k === 'sum' || inPool(LEX.verbs[k].id)) LEX.verbs[k].frames.forEach((f, i) => { if (pred(f, k)) out.push({ k, f, i }); }); return out; }
  const verbNumOf = p => p[1] === 's' ? 'sg' : 'pl';

  // Section II: verbs whose 'human' object makes no sense with a speaker/addressee object (*"The farmer buries me")
  const NO_PRON_OBJ = ['sepelio'];
  const PRON_PROTO = () => nounInfo('pron_1s'); // all personal-pronoun pseudo-nouns share their tags
  const DET_KEYS = () => Object.keys(LEX.adjs).filter(k => LEX.adjs[k].kind && inPool(LEX.adjs[k].id));
  function generateOne(rng, template, opts) {
    opts = opts || {};
    const tense = opts.tense || pick(rng, TENSES);
    const used = new Set();
    let voice = 'act', fr, v, subj = null, pron = null, obj = null, io = null, means = null, pp = null, nocte = false, pred = null;
    // PRON_OBJ: a personal pronoun as object, indirect object, dative object, "with me/you" or passive agent; DET: a possessive or demonstrative determiner
    let tpl = template, forcePron = null, forceDet = false, coord = null;
    if (template === 'PRON_OBJ') { forcePron = pick(rng, ['O', 'O', 'IO', 'DAT', 'CUM', 'AGENT']); tpl = { O: 'SOV', IO: 'DAT_IO', DAT: 'DAT_VERB', CUM: 'SV_PP', AGENT: 'PASSIVE' }[forcePron]; }
    if (template === 'ADV') tpl = pick(rng, ['SV', 'SV', 'SV_PP', 'SOV', 'SOV', 'PASSIVE', 'COPULA', 'DAT_VERB', 'DAT_IO', 'PRONOUN', 'MEANS']);
    if (template === 'DET') { forceDet = true; tpl = pick(rng, ['SV', 'SOV', 'SOV', 'PASSIVE', 'COPULA', 'SV_PP', 'DAT_IO']); }
    const pP = forcePron ? 0 : tpl === 'PRONOUN' ? 0.3 : 0.08;
    const addAdj = (np, p) => { if (np && !np.adj && !np.noun.pron && rng() < p) { const a = chooseAdj(rng, np.noun, used, np.num, np.case); if (a) np.adj = a; } return np; };
    // one determiner or adjective per NP; with a subject pronoun, no clash like *"We love my father" / *"You (sg.) love your (pl.) father"
    const detOK = k => { const a = LEX.adjs[k]; if (a.kind !== 'poss' || !pron) return true; return a.person === pron || a.person[0] !== pron[0]; };
    const addDet = (np, p) => { if (!np || np.adj || np.noun.pron || rng() >= p) return false;
      const c = DET_KEYS().filter(k => !used.has('adj:' + k) && detOK(k) && adjFits(adjInfo(k), np.noun)); if (!c.length) return false;
      const k = pick(rng, c); used.add('adj:' + k); np.adj = k; return true; };
    const mkNP = (n, kase, num) => ({ noun: n, case: kase, num: num || chooseNum(rng, n) });
    // at most one pronoun NP per sentence, and never the subject's own person (*ego mē, *nōs mē)
    const pronOK = k => !used.has('pronNP') && (!pron || k[5] !== pron[0]);
    const pickPron = (specs, kase, keys) => { const c = (keys || PRON_KEYS).filter(k => pronOK(k) && matches(nounInfo(k), specs)); if (!c.length) return null;
      used.add('pronNP'); return mkNP(nounInfo(pick(rng, c)), kase); };
    const pickPP = (types, forced) => {
      const t = types.filter(x => x !== 'nocte');
      if (!t.length) return null;
      const ty = forcePron === 'CUM' ? 'cum' : pick(rng, t).replace('!', ''); const T = PP_TYPES[ty];
      if (ty === 'cum' && (forcePron === 'CUM' || rng() < pP * 2)) { const c = ['pron_1s', 'pron_2s'].filter(pronOK); if (c.length) { used.add('pronNP'); return { type: 'cum', np: mkNP(nounInfo(pick(rng, c)), 'abl') }; } }
      if (forcePron === 'CUM') return null;
      if (T.subjOK && ![subj ? subj.noun : P0].concat(coord ? [coord.np2.noun] : []).every(n => T.subjOK(n, fr.k))) return null;
      const specFilter = n => T.fits(n, fr.k) && (!fr.f.locSpec || ty !== 'loc' || matches(n, fr.f.locSpec)) && !(n.noDatAblPl && T.case === 'abl');
      const n = chooseNoun(rng, ['human', 'deity', 'animal', 'place', 'thing', 'abstract'], used, specFilter); if (!n) return null; used.add(n.key);
      let num = chooseNum(rng, n, n.cls === 'place' ? (ty === 'loc' || ty === 'into' || ty === 'ex' ? 0 : 0.2) : 0.35); if (n.noDatAblPl && T.case === 'abl') num = 'sg'; if (T.num) num = T.num;
      if (T.fromLex && !T.num && n.key === 'carcer') num = 'sg'; // carcerēs = the starting gates of a race course
      return { type: ty, np: mkNP(n, T.case, num) };
    };
    const subjFilter = n => !n.plOnly;
    // one soldier fights with a sword, soldiers with swords (arma is plural-only)
    const meansNum = (m, sn) => m.plOnly ? 'pl' : m.mass || m.sgOnly ? 'sg' : sn;
    const P0 = PRON_PROTO();
    if (tpl === 'COPULA') {
      v = verbInfo('sum'); fr = { k: 'sum', f: v.frames[0] };
      const n = chooseNoun(rng, fr.f.s, used, n => subjFilter(n) && Object.keys(LEX.adjs).some(k => predOK(k) && adjFits(adjInfo(k), n))); used.add(n.key);
      subj = mkNP(n, 'nom');
      // a person 'is small/huge/big' is odd as a statement: human predicates are character/state adjectives only
      if (n.cls === 'human') for (const k of ['parvus', 'ingens', 'magnus']) used.add('adj:' + k);
      pred = chooseAdj(rng, n, used, subj.num, 'nom', true); if (!pred) return null;
      if (!addDet(subj, forceDet ? 1 : 0.2) && forceDet) return null;
    } else if (tpl === 'PASSIVE') {
      voice = 'pas';
      const frames = frameList((f, k) => f.t === 'tr' && !f.noPas && !verbInfo(k).morphNoPassive && verbInfo(k).ptc && (forcePron !== 'AGENT' || matches(P0, f.s)));
      fr = pick(rng, frames); v = verbInfo(fr.k); used.add(v.key);
      const n = chooseNoun(rng, fr.f.o, used, subjFilter); if (!n) return null; used.add(n.key);
      subj = mkNP(n, 'nom');
      if (!addDet(subj, forceDet ? 1 : 0.15)) { if (forceDet) return null; addAdj(subj, 0.25); }
      const r = rng();
      if (forcePron === 'AGENT' || (r >= 0.45 && r < 0.85 && rng() < pP * 2)) { const a = pickPron(fr.f.s, 'abl'); if (!a) return null; pp = { type: 'agent', np: a }; }
      else if (fr.f.instr && r < 0.45) { const m = chooseNoun(rng, fr.f.instr, used); used.add(m.key); means = mkNP(m, 'abl', meansNum(m, subj.num)); }
      else if (r < 0.85) { const a = chooseNoun(rng, fr.f.s, used, x => x.tags.has('#animate') && !x.noDatAblPl); if (a) { used.add(a.key); pp = { type: 'agent', np: mkNP(a, 'abl') }; } }
    } else if (tpl === 'COORD') {
      // Section VII: two nouns joined by et / -que / atque (ac) / aut / vel (-ve) / nec … nec; as subject (verb plural after 'and', singular after or / nor) or object ('and' only)
      const role = rng() < 0.7 ? 'S' : 'O';
      const ks = Object.keys(LEX.conjs).filter(k => LEX.conjs[k].roles.includes(role) && inPool(LEX.conjs[k].id)); if (!ks.length) return null;
      let r = rng() * ks.reduce((a, k) => a + LEX.conjs[k].w, 0), ck = ks[ks.length - 1];
      for (const k of ks) { r -= LEX.conjs[k].w; if (r < 0) { ck = k; break; } }
      const C = LEX.conjs[ck];
      fr = pick(rng, frameList(f => role === 'S' ? (f.t === 'intr' || f.t === 'tr') : f.t === 'tr')); v = verbInfo(fr.k); used.add(v.key);
      const ok = n => !n.plOnly && !n.mass && !n.pron && !n.enNum;
      const specs = role === 'S' ? fr.f.s : fr.f.o, kase = role === 'S' ? 'nom' : 'acc';
      const n1 = chooseNoun(rng, specs, used, ok); if (!n1) return null; used.add(n1.key);
      const n2 = chooseNoun(rng, specs, used, n => ok(n) && n.cls === n1.cls); if (!n2) return null; used.add(n2.key);
      const numOf = n => role === 'S' && C.kind !== 'and' ? 'sg' : chooseNum(rng, n, 0.3);
      const np1 = mkNP(n1, kase, numOf(n1)), np2 = mkNP(n2, kase, numOf(n2));
      const forms = C.forms.filter(f => (f !== 'ac' || !startsVowelH(n2.form(kase, np2.num)[0])) && (!(C.alt || []).some(a => a.form === f) || inPool(C.alt.find(a => a.form === f).id)));
      coord = { conj: ck, kind: C.kind, role, np2, form: pick(rng, forms) };
      if (role === 'S') { subj = np1; if (fr.f.t === 'tr') { const n = chooseNoun(rng, fr.f.o, used); if (!n) return null; used.add(n.key); obj = mkNP(n, 'acc'); } }
      else { const n = chooseNoun(rng, fr.f.s, used, subjFilter); if (!n) return null; used.add(n.key); subj = mkNP(n, 'nom'); obj = np1; }
      const ppT = fr.f.t === 'intr' ? (fr.f.pp || []).filter(t => t !== 'nocte' && t.replace('!', '') !== 'cum') : [];
      const forced = ppT.some(t => t.endsWith('!'));
      if (ppT.length && (forced || rng() < 0.3)) { pp = pickPP(ppT); if (forced && !pp) return null; }
    } else {
      let frames;
      if (tpl === 'SV' || tpl === 'SV_PP' || tpl === 'PP_ADJ') frames = frameList(f => f.t === 'intr' && (forcePron !== 'CUM' || (f.pp || []).some(t => t.replace('!', '') === 'cum')));
      else if (tpl === 'SOV' || tpl === 'SOV_ADJ') frames = frameList((f, k) => f.t === 'tr' && (forcePron !== 'O' || (matches(P0, f.o) && !NO_PRON_OBJ.includes(k))));
      else if (tpl === 'DAT_IO') frames = frameList(f => f.t === 'ditr' && (forcePron !== 'IO' || matches(P0, f.io)));
      else if (tpl === 'DAT_VERB') frames = frameList(f => f.t === 'dat' && (forcePron !== 'DAT' || matches(P0, f.o)));
      else if (tpl === 'MEANS') frames = frameList(f => !!f.instr);
      else if (tpl === 'PRONOUN') frames = frameList(f => (f.t === 'tr' || f.t === 'intr') && f.s.includes('human'));
      fr = pick(rng, frames); v = verbInfo(fr.k); used.add(v.key);
      if (tpl === 'PRONOUN') pron = pick(rng, ['1s', '2s', '1p', '2p']);
      else { const n = chooseNoun(rng, fr.f.s, used, subjFilter); if (!n) return null; used.add(n.key); subj = mkNP(n, 'nom'); }
      if (fr.f.t === 'tr' || fr.f.t === 'ditr') {
        if (fr.f.t === 'tr' && !NO_PRON_OBJ.includes(v.key) && (forcePron === 'O' || rng() < pP)) obj = pickPron(fr.f.o, 'acc');
        if (!obj && forcePron === 'O') return null;
        if (!obj) { const n = chooseNoun(rng, fr.f.o, used); if (!n) return null; used.add(n.key); obj = mkNP(n, 'acc'); } }
      if (fr.f.t === 'ditr' || fr.f.t === 'dat') {
        const specs = fr.f.t === 'ditr' ? fr.f.io : fr.f.o;
        if (forcePron === 'IO' || forcePron === 'DAT' || rng() < pP) io = pickPron(specs, 'dat');
        if (!io && (forcePron === 'IO' || forcePron === 'DAT')) return null;
        if (!io) { const n = chooseNoun(rng, specs, used, x => !x.noDatAblPl); if (!n) return null; used.add(n.key); io = mkNP(n, 'dat'); } }
      if (tpl === 'MEANS') { const m = chooseNoun(rng, fr.f.instr, used); used.add(m.key); means = mkNP(m, 'abl', meansNum(m, subj ? subj.num : (pron[1] === 's' ? 'sg' : 'pl'))); }
      const ppTypes = fr.f.pp || [];
      const forcePP = tpl === 'SV_PP' || tpl === 'PP_ADJ' || ppTypes.some(t => t.endsWith('!'));
      if (ppTypes.length && (forcePP || rng() < (tpl === 'SV' ? 0.35 : 0.3))) {
        if (!forcePP && ppTypes.includes('nocte') && inPool(LEX.extras.nox.id) && rng() < 0.3) nocte = true; else pp = pickPP(ppTypes);
        if (forcePP && !pp) return null;
      } else if (ppTypes.includes('nocte') && inPool(LEX.extras.nox.id) && rng() < 0.15) nocte = true;
      if (tpl === 'SOV_ADJ') { if (rng() < 0.5) addAdj(subj, 1); else addAdj(obj, 1); if (!(subj && subj.adj) && !(obj && obj.adj)) return null; }
      else if (tpl === 'PP_ADJ') { if (!pp) return null; addAdj(pp.np, 1); if (!pp.np.adj) return null; }
      else if (forceDet) { const nps = shuffle(rng, [subj, obj, io, pp && pp.np].filter(x => x && !x.noun.pron)); if (!nps.some(np => addDet(np, 1))) return null; }
      else { for (const np of [subj, obj, io, pp && pp.np]) addDet(np, 0.07); addAdj(subj, 0.15); addAdj(obj, 0.15); }
    }
    // ADV: one adverb that fits the tense and the verb; no "at night" next to it
    let adv = null;
    if (template === 'ADV') { nocte = false; const c = ADV_KEYS().filter(k => advFits(LEX.advs[k], { tense, voice, v, fr, pp, means })); if (!c.length) return null;
      // balance: aim at one adverb allowed in this tense (otherwise nōn / semper / saepe, which fit almost everything, would crowd out statim or subitō); generate() retries
      const want = pick(rng, ADV_KEYS().filter(k => LEX.advs[k].tenses.includes(tense)));
      if (c.includes(want)) adv = want; else if (rng() < 0.2) adv = pick(rng, c); else return null; }
    return assemble({ template, tense, voice, v, fr, subj, pron, obj, io, means, pp, nocte, pred, adv, coord });
  }

  // ---------- coordination (section VII) ----------
  const CONJ_FORMS = { and: ['et', 'atque', 'ac', 'que'], or: ['aut', 'autaut', 'vel', 'velvel', 've'], nor: ['necnec', 'nequeneque'] };
  // a, b: token arrays of the two noun phrases. Returns null when the form does not fit (ac only before a consonant)
  function joinConj(form, a, b) {
    const encl = s => a.concat(b.slice(0, -1), [b[b.length - 1] + s]); // puer puellaque
    switch (form) {
      case 'et': case 'atque': case 'aut': case 'vel': return a.concat([form], b);
      case 'ac': return startsVowelH(b[0]) ? null : a.concat(['ac'], b);
      case 'que': return encl('que');
      case 've': return encl('ve');
      case 'autaut': return ['aut'].concat(a, ['aut'], b);
      case 'velvel': return ['vel'].concat(a, ['vel'], b);
      case 'necnec': return ['nec'].concat(a, ['nec'], b);
      case 'nequeneque': return ['neque'].concat(a, ['neque'], b);
    }
    throw new Error('unknown conjunction form ' + form);
  }
  function coordEnglish(co, a, b) {
    const corr = ['autaut', 'velvel'].includes(co.form);
    const pre = co.kind === 'nor' ? 'neither ' : corr ? 'either ' : '';
    const mid = co.kind === 'and' ? ' and ' : co.kind === 'or' ? ' or ' : ' nor ';
    const pres = co.kind === 'or' ? ['', 'either '] : [pre];
    const alts = [];
    for (const [x, y] of [[a, b], [b, a]]) for (const p of pres) for (const xa of x.enAlts) for (const ya of y.enAlts) alts.push(p + xa + mid + ya);
    return { canon: pre + a.enCanon + mid + b.enCanon, alts, prompt: pre + a.enPrompt + mid + b.enPrompt };
  }

  function assemble(S) {
    const { tense, voice, v } = S;
    const co = S.coord || null, coS = co && co.role === 'S';
    const person = S.pron || (coS ? (co.kind === 'and' ? '3p' : '3s') : S.subj.num === 'sg' ? '3s' : '3p');
    const subjEn = S.subj ? buildNP(S.subj) : null;
    const enPerson = S.pron || (coS ? person : subjEn.enNum === 'sg' ? '3s' : '3p');
    const parts = {}; // role -> built
    const nps = [];
    if (S.subj) { parts.S = subjEn; nps.push({ np: S.subj, built: subjEn, role: coS ? 'SC' : 'S' }); }
    if (coS) { parts.S2 = buildNP(co.np2); nps.push({ np: co.np2, built: parts.S2, role: 'SC' }); }
    if (S.obj) { parts.O = buildNP(S.obj); nps.push({ np: S.obj, built: parts.O, role: 'O' }); }
    if (co && !coS) { parts.O2 = buildNP(co.np2); nps.push({ np: co.np2, built: parts.O2, role: 'O' }); }
    // coordinated nouns: the verb no longer shows their number, so a form that is the same in singular and plural (rēs, manūs …) is refused
    if (co) for (const x of nps.filter(x => x.np === co.np2 || x.np === (coS ? S.subj : S.obj))) { const rd = nounReadings(x.np.noun, x.built.nounTok).filter(c => c.startsWith(x.np.case + '.'));
      if (new Set(rd).size > 1) return { rejected: 'number of ' + x.np.noun.key + ' unclear in coordination' }; }
    if (S.io) { parts.IO = buildNP(S.io); nps.push({ np: S.io, built: parts.IO, role: 'IO' }); }
    if (S.means) { parts.MEANS = buildNP(S.means); nps.push({ np: S.means, built: parts.MEANS, role: 'MEANS' }); }
    const amb = ambiguity(nps, verbNumOf(person));
    if (amb) return { rejected: amb };
    // an adjective the verb already implies ("fill the full cup") is refused; set by notWith in the lexicon
    const redundant = nps.find(x => x.np.adj && (LEX.adjs[x.np.adj].notWith || []).includes(S.v.key));
    if (redundant) return { rejected: 'adjective ' + redundant.np.adj + ' is redundant with ' + S.v.key };
    // ---- Latin constituents (for one tense) ----
    const subjGenders = S.subj ? S.subj.noun.genders : ['m'];
    const A = S.adv ? Object.assign({ key: S.adv }, LEX.advs[S.adv]) : null;
    const ng = A && A.neg ? A.la : null;
    // nōn stands right before the verb; with a periphrastic perfect passive or a predicate adjective it may also stand before est / the adjective (alt)
    function verbCons(t, alt) {
      const lv = latinVerb(v, voice, t, person, subjGenders);
      if (Array.isArray(lv)) return [{ role: 'V', variants: ng && alt !== 'pred' ? lv.map(x => [ng].concat(x)) : lv }];
      return [{ role: 'PTC', variants: lv.ptc.map(x => ng && alt !== 'aux' ? [ng, x] : [x]) }, { role: 'AUX', variants: lv.aux.map(x => ng && alt === 'aux' ? [ng, x] : [x]) }];
    }
    function ppCons(extraKinds) {
      if (!S.pp) return null; const T = PP_TYPES[S.pp.type]; const b = buildNP(S.pp.np);
      if (S.pp.type === 'cum' && S.pp.np.noun.pron) return { role: 'PP', variants: [[S.pp.np.noun.cumForm]], built: b }; // mēcum, never *cum mē
      return { role: 'PP', variants: ppVariants(T.prep, b.variants, extraKinds ? [T.prep].concat(T.enLaAlso || []) : null, b.adjFormsAll), built: b };
    }
    // shown Latin: the chosen form, in order; En→La: every form of the same kind (et / atque / ac / -que …), either noun first
    function coordVariants(a, b, forEnLa) {
      const out = [], seen = new Set();
      const add = v => { const k = v.join(' '); if (!seen.has(k)) { seen.add(k); out.push(v); } };
      const forms = forEnLa ? CONJ_FORMS[co.kind] : [co.form];
      for (const [x, y] of forEnLa ? [[a, b], [b, a]] : [[a, b]]) for (const f of forms) for (const va of x.variants) for (const vb of y.variants) { const j = joinConj(f, va, vb); if (j) add(j); }
      return out;
    }
    function latinConsSets(t, forEnLa) {
      const alts = [null]; if (ng && S.pred) alts.push('pred'); if (ng && voice === 'pas' && t === 'perf') alts.push('aux');
      return alts.map(a => latinCons(t, forEnLa, a));
    }
    function latinCons(t, forEnLa, alt) {
      const c = [];
      if (S.pron) c.push({ role: 'PRON', variants: [[PRON[S.pron][0]]], optional: true });
      if (parts.S) c.push({ role: 'S', variants: coS ? coordVariants(parts.S, parts.S2, forEnLa) : parts.S.variants });
      if (parts.IO) c.push({ role: 'IO', variants: parts.IO.variants });
      if (parts.O) c.push({ role: 'O', variants: co && !coS ? coordVariants(parts.O, parts.O2, forEnLa) : parts.O.variants });
      if (parts.MEANS) c.push({ role: 'MEANS', variants: parts.MEANS.variants });
      const p = ppCons(forEnLa); if (p) c.push(p);
      if (S.nocte) c.push({ role: 'NOCTE', variants: [['nocte']] });
      if (A && !ng) c.push({ role: 'ADV', variants: [[A.la]].concat(forEnLa ? (A.alt || []).map(x => [x.la]) : []) }); // synonyms (repente for subitō …) accepted En→La only
      if (S.pred) { const a = adjInfo(S.pred); const fs = []; for (const g of subjGenders) for (const f of a.form(g, 'nom', S.subj.num)) if (!fs.includes(f)) fs.push(f); c.push({ role: 'PRED', variants: fs.map(f => alt === 'pred' ? [ng, f] : [f]) }); }
      return c.concat(verbCons(t, alt));
    }
    const cons = latinCons(tense, false);
    const laTokens = cons.filter(c => !c.optional).flatMap(c => c.variants[0]);
    const la = cap(laTokens.join(' ')) + '.';
    // ---- English slots ----
    const vAlts = enVerbAlts(v, voice, tense, enPerson);
    const slots = {};
    // slot.prompt (when set) is the English shown to the learner: "you (sg.)", "your (pl.) …"; normEn strips the labels when grading
    slots.S = S.pron ? { canon: PRON[S.pron][1], alts: S.pron === '2p' ? ['you', 'you all'] : [PRON[S.pron][1]], prompt: S.pron === '2s' ? 'you (sg.)' : S.pron === '2p' ? 'you (pl.)' : null }
      : { canon: subjEn.enCanon, alts: subjEn.enAlts, prompt: subjEn.enPrompt };
    slots.V = { canon: vAlts[0], alts: vAlts };
    if (parts.O) slots.O = { canon: parts.O.enCanon, alts: parts.O.enAlts, prompt: parts.O.enPrompt };
    if (co) slots[coS ? 'S' : 'O'] = coordEnglish(co, coS ? subjEn : parts.O, coS ? parts.S2 : parts.O2);
    if (S.io && S.fr.f.t === 'dat') slots.O = { canon: parts.IO.enCanon, alts: parts.IO.enAlts, prompt: parts.IO.enPrompt };
    if (S.io && S.fr.f.t === 'ditr') { slots.IOto = { canon: 'to ' + parts.IO.enCanon, alts: parts.IO.enAlts.map(x => 'to ' + x), prompt: 'to ' + parts.IO.enPrompt }; slots.IO = { canon: parts.IO.enCanon, alts: parts.IO.enAlts, prompt: parts.IO.enPrompt }; }
    if (S.pred) { const a = adjInfo(S.pred); const ae = adjEnglish(a, S.subj.noun); slots.PRED = { canon: ae[0], alts: ae }; }
    if (parts.MEANS) { const b = parts.MEANS; const mc = b.enNum === 'sg' && !S.means.noun.mass ? b.enCanon.replace(/^the (?=[aeiou])/i, 'an ').replace(/^the /, 'a ') : b.enCanon.replace(/^the /, '');
      slots.MEANS = { canon: 'with ' + mc, alts: ['with', 'by means of', 'using'].flatMap(p => b.enAlts.map(x => p + ' ' + x)) }; }
    if (S.pp) { const T = PP_TYPES[S.pp.type]; const b = buildNP(S.pp.np); let preps = T.en(S.pp.np.noun, v.key); if (S.pp.type === 'ex' && ['discedo', 'fugio', 'redeo', 'venio'].includes(v.key)) preps = ['from', 'out of'];
      slots.PP = { canon: preps[0] + ' ' + b.enCanon, alts: preps.flatMap(p => b.enAlts.map(x => p + ' ' + x)), prompt: preps[0] + ' ' + b.enPrompt }; }
    if (S.nocte) slots.NOCTE = { canon: 'at night', alts: ['at night', 'by night', 'during the night', 'in the night'] };
    const midOK = !!(A && (A.neg || (A.mid && A.mid.length))), edgeOK = !!(A && !A.neg && A.en && A.en.length);
    const advAltsFor = t => enVerbAltsAdv(v, voice, t, enPerson, A);
    const vAltsM = midOK ? advAltsFor(tense) : null;
    if (midOK) slots.VM = { canon: vAltsM[0], alts: vAltsM };
    if (edgeOK) slots.ADV = { canon: A.en[0], alts: A.en };
    if (A && A.impfSimple && tense === 'impf') for (const f of v.key === 'sum' ? [null] : [v.en].concat(v.alts || [])) for (const x of simplePast(v, voice, enPerson, f)) if (!vAlts.includes(x)) vAlts.push(x);
    // orders
    let cores;
    if (S.fr.f.t === 'ditr') cores = [['S', 'V', 'O', 'IOto'], ['S', 'V', 'IO', 'O']];
    else if (S.pred) cores = [['S', 'V', 'PRED']];
    else cores = [['S', 'V'].concat(slots.O ? ['O'] : [])];
    const adv = ['MEANS', 'PP', 'NOCTE'].filter(k => slots[k]);
    const mkOrders = (cs, advs) => { const o = []; for (const core of cs) { for (const p of permutations(advs)) o.push(core.concat(p)); for (const a of advs) for (const p of permutations(advs.filter(x => x !== a))) o.push([a].concat(core, p)); } return o; };
    let orders;
    if (!A) orders = mkOrders(cores, adv);
    else { // canonical order first: A.canon = 'end' | 'front' | 'mid'
      const edge = edgeOK ? mkOrders(cores, adv.concat('ADV')).filter(o => (A.front !== false || o[0] !== 'ADV') && (A.end !== false || o[0] === 'ADV')) : [];
      const mid = midOK ? mkOrders(cores.map(c => c.map(k => k === 'V' ? 'VM' : k)), adv) : [];
      const edgeSorted = A.canon === 'front' ? edge.filter(o => o[0] === 'ADV').concat(edge.filter(o => o[0] !== 'ADV')) : edge;
      orders = A.canon === 'mid' ? mid.concat(edgeSorted) : edgeSorted.concat(mid);
    }
    const enCanon = cap(orders[0].map(k => slots[k].canon).join(' ')) + '.';
    // tense equivalences
    // with an adverb, only the tenses the adverb allows (nunc: present only, so "Puer nunc venit" is never "came now")
    const laEnVerbAlts = vAlts.slice(), laEnVerbAltsM = vAltsM ? vAltsM.slice() : []; // La→En: tenses whose Latin form is identical (homographs)
    const enLaTenses = [tense];               // En→La: tenses whose English includes the canonical English verb
    const canonV = JSON.stringify(verbCons(tense).map(c => c.variants[0].map(normM)));
    const useMid = !!(A && A.canon === 'mid');
    for (const t of TENSES) if (t !== tense && (!A || A.tenses.includes(t))) {
      if (JSON.stringify(verbCons(t).map(c => c.variants[0].map(normM))) === canonV) {
        for (const x of enVerbAlts(v, voice, t, enPerson)) if (!laEnVerbAlts.includes(x)) laEnVerbAlts.push(x);
        if (midOK) for (const x of advAltsFor(t)) if (!laEnVerbAltsM.includes(x)) laEnVerbAltsM.push(x); }
      if (useMid ? advAltsFor(t).includes(vAltsM[0]) : enVerbAlts(v, voice, t, enPerson).includes(vAlts[0])) enLaTenses.push(t);
    }
    const mkRe = (vAltsUsed, vAltsUsedM) => new RegExp('^(?:' + orders.map(o => o.map(k => k === 'V' ? altRe(vAltsUsed) : k === 'VM' ? altRe(vAltsUsedM) : altRe(slots[k].alts)).join(' ')).join('|') + ')$');
    // the verb phrase as it appears in the canonical English, per tense and for the wrong person (word-chip distractors)
    const vpFor = (t, p) => (useMid ? enVerbAltsAdv(v, voice, t, p, A) : enVerbAlts(v, voice, t, p))[0] || '';
    const sent = {
      template: S.template, tense, voice, person, verb: v.key, la, en: enCanon,
      enPrompt: cap(orders[0].map(k => slots[k].prompt || slots[k].canon).join(' ')) + '.',
      laTokens, enTokens: tokensEn(enCanon),
      laConsSets: latinConsSets(tense, false),                       // for strict La answers matching the shown Latin
      enLaConsSets: enLaTenses.flatMap(t => latinConsSets(t, true)), // En→La accepted answers
      enRe: mkRe(laEnVerbAlts, laEnVerbAltsM), enLaTenses, adv: A ? A.key : null,
      vp: { canon: vpFor(tense, enPerson), byTense: Object.fromEntries(TENSES.map(t => [t, vpFor(t, enPerson)])), wrongP: vpFor(tense, enPerson === '3s' ? '3p' : '3s') },
      lexemes: [S.pron && 'pron:' + S.pron, S.subj && S.subj.noun.key, co && co.np2.noun.key, co && 'conj:' + co.conj, S.obj && S.obj.noun.key, S.io && S.io.noun.key, S.means && S.means.noun.key, S.pp && S.pp.np.noun.key, v.key].concat([S.subj && S.subj.adj, S.obj && S.obj.adj, S.io && S.io.adj, S.pp && S.pp.np.adj, S.pred].filter(Boolean).map(a => 'adj:' + a), A ? ['adv:' + A.key] : []).filter(Boolean),
      spec: S,
    };
    return sent;
  }
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const tokensEn = s => s.replace(/[.,!?]/g, '').split(/\s+/).filter(Boolean).map(t => t === 'I' ? t : t.toLowerCase());

  function generate(rng, opts) {
    opts = opts || {};
    for (let tries = 0; tries < 200; tries++) {
      const tpl = opts.template || pick(rng, TEMPLATES);
      let s;
      // with a small word pool a template may find no candidate at some step (empty pick): that attempt is simply retried
      try { s = generateOne(rng, tpl, opts); } catch (e) { if (!POOL) throw e; s = null; }
      if (s && !s.rejected && POOL && !sentenceIds(s).every(inPool)) s = null; // belt and braces: never show a word outside the pool
      if (s && !s.rejected) return s;
      if (s && s.rejected && opts.onReject) opts.onReject(tpl, s.rejected);
    }
    throw new Error('could not generate');
  }
  function generateMany(n, seed, opts) {
    const rng = mulberry32(seed == null ? 1 : seed); const out = []; const seen = new Set();
    let i = 0;
    while (out.length < n && i++ < n * 50) {
      const tpl = (opts && opts.template) || TEMPLATES[out.length % TEMPLATES.length];
      const s = generate(rng, Object.assign({}, opts, { template: tpl, tense: (opts && opts.tense) || TENSES[Math.floor(out.length / TEMPLATES.length) % 4] }));
      if (seen.has(s.la)) continue; seen.add(s.la); out.push(s);
    }
    return out;
  }

  // ---------- graders ----------
  function gradeEnglish(sent, answer) { return sent.enRe.test(normEn(answer)); }
  function tokLatin(answer, strict) { return answer.replace(/[.,!?;:"“”]/g, ' ').split(/\s+/).filter(Boolean).map(strict ? normM : norm); }
  function matchCons(tokens, cons, strict) {
    const N = strict ? normM : norm;
    // each expected token also accepts the spellings the app's own Morph.check() accepts (ex(s)-: exstinguit / extinguit, L&S)
    const cv = cons.map(c => c.variants.map(v => v.map(t => new Set(Morph.variants(t).map(N)))));
    const used = cons.map(() => false);
    function rec(pos) {
      if (pos === tokens.length) return cons.every((c, i) => used[i] || c.optional);
      for (let i = 0; i < cons.length; i++) if (!used[i]) for (const v of cv[i]) {
        if (v.length + pos <= tokens.length && v.every((t, j) => t.has(tokens[pos + j]))) { used[i] = true; if (rec(pos + v.length)) { used[i] = false; return true; } used[i] = false; }
      }
      return false;
    }
    return rec(0);
  }
  function gradeLatin(sent, answer, opts) { const strict = !!(opts && opts.strict); const toks = tokLatin(answer, strict); return sent.enLaConsSets.some(c => matchCons(toks, c, strict)); }
  // Same acceptance as gradeLatin, plus whether a token was a non-standard form of a word in the sentence.
  function gradeLatinReport(sent, answer, opts) {
    const strict = !!(opts && opts.strict);
    const ok = gradeLatin(sent, answer, opts);
    if (!ok) return { ok: false, alternate: false, standard: '' };
    const S = sent.spec, cells = [];
    const addNP = np => {
      if (!np) return;
      const fs = np.noun.form(np.case, np.num); if (fs && fs.length) cells.push(fs);
      if (np.adj) { const a = adjInfo(np.adj); for (const g of np.noun.genders) { const af = a.form(g, np.case, np.num); if (af && af.length) cells.push(af); } }
    };
    addNP(S.subj); addNP(S.obj); addNP(S.io); addNP(S.means); if (S.pp) addNP(S.pp.np); if (S.coord) addNP(S.coord.np2);
    if (S.pred && S.subj) { const a = adjInfo(S.pred); for (const g of S.subj.noun.genders) { const af = a.form(g, 'nom', S.subj.num); if (af && af.length) cells.push(af); } }
    const v = verbInfo(sent.verb), voice = sent.voice === 'act' ? 'act' : 'pas';
    for (const t of sent.enLaTenses || [sent.tense]) {
      const key = 'ind.' + voice + '.' + t + '.' + sent.person;
      if (v.tbl[key]) cells.push(v.tbl[key]);
      if (voice === 'pas' && t === 'perf' && v.ptc) {
        const num = sent.person[1] === 's' ? 'sg' : 'pl';
        for (const g of (S.subj ? S.subj.noun.genders : ['m', 'f', 'n'])) if (v.ptc[g + '.nom.' + num]) cells.push(v.ptc[g + '.nom.' + num]);
      }
    }
    let alt = '';
    for (const tok of tokLatin(answer, strict)) for (const c of cells) {
      const g = Morph.grade(tok, c, strict);
      if (g.ok && g.alternate) { alt = g.standard; break; }
    }
    return { ok: true, alternate: !!alt, standard: alt };
  }

  // ---------- word chips ----------
  function chipsLaEn(sent, rng, nDistract) {
    nDistract = nDistract || 5;
    const bank = sent.enTokens.slice(); const S = sent.spec; const cands = [];
    const nounsIn = [S.subj, S.coord && S.coord.np2, S.obj, S.io, S.means, S.pp && S.pp.np].filter(Boolean);
    if (S.coord) cands.push({ swap: { and: ['and', 'or'], or: ['or', 'and'], nor: ['nor', 'or'] }[S.coord.kind] });
    for (const np of nounsIn) { const n = np.noun; if (!n.mass && !n.plOnly && !n.sgOnly) { const other = enNoun(n, np.num === 'sg' ? 'pl' : 'sg').canon; cands.push({ swap: [enNoun(n, np.num).canon, other] }); } }
    const vk = sent.verb; const vp = sent.en.match(new RegExp(esc(sent.vp.canon)))?.[0];
    for (const t of TENSES) if (t !== sent.tense) cands.push({ swap: [vp, sent.vp.byTense[t]] });
    if (sent.voice === 'act' && vk !== 'sum') cands.push({ swap: [vp, sent.vp.wrongP] });
    if (S.pp) { const T = PP_TYPES[S.pp.type]; const pe = T.en(S.pp.np.noun, vk);
      // section VIII types: no 'on' / 'by' / 'at' distractors, which can be fair English for prope, sub, praeter …
      const wrong = pick(rng, (T.fromLex ? ['to', 'from', 'into', 'with', 'without', 'through', 'in'] : ['to', 'from', 'into', 'with', 'without', 'through', 'in', 'on', 'by']).filter(p => !pe.includes(p)));
      cands.push({ swap: [pe[0], wrong] }); }
    for (const np of nounsIn) if (!np.noun.pron) { const o = chooseNoun(rng, [np.noun.cls], new Set(sent.lexemes)); if (o) cands.push({ swap: [enNoun(np.noun, np.num).canon, enNoun(o, np.num).canon] }); }
    // section II: other pronouns (me ↔ us/you), other possessives (my ↔ our/your), this ↔ that
    for (const np of nounsIn) {
      if (np.noun.pron) for (const o of ['me', 'us', 'you']) if (o !== np.noun.en[0]) cands.push({ swap: [np.noun.en[0], o] });
      const a = np.adj && adjInfo(np.adj);
      if (a && a.kind === 'poss') for (const o of ['my', 'our', 'your']) if (o !== a.en.default[0]) cands.push({ swap: [a.en.default[0], o] });
      if (a && a.kind === 'dem') { const w = buildNP(np).enCanon.split(' ')[0]; cands.push({ swap: [w, { this: 'that', that: 'this', these: 'those', those: 'these' }[w]] }); }
    }
    const out = [];
    for (const c of shuffle(rng, cands)) {
      if (out.length >= nDistract || !c.swap[0] || !c.swap[1]) continue;
      const wrongSent = (' ' + sent.en.replace(/\.$/, '') + ' ').replace(' ' + c.swap[0] + ' ', ' ' + c.swap[1] + ' ');
      if (wrongSent.trim() === sent.en.replace(/\.$/, '') || gradeEnglish(sent, wrongSent)) continue; // never offer a distractor that yields an accepted answer
      for (const t of tokensEn(c.swap[1])) if (!bank.includes(t) && !out.includes(t)) out.push(t);
    }
    return { answer: sent.enTokens, bank: shuffle(rng, bank.concat(out)), distractors: out };
  }
  function enPersonOf(sent) { const S = sent.spec; if (S.pron) return S.pron; if (S.coord && S.coord.role === 'S') return S.coord.kind === 'and' ? '3p' : '3s'; return buildNP(S.subj).enNum === 'sg' ? '3s' : '3p'; }
  function chipsEnLa(sent, rng, nDistract) {
    nDistract = nDistract || 5;
    const accepted = new Set(); for (const set of sent.enLaConsSets) for (const c of set) for (const v of c.variants) for (const t of v) for (const x of Morph.variants(t)) accepted.add(normM(x));
    const S = sent.spec; const cands = [];
    const addNoun = np => { const n = np.noun; for (const c of ['nom', 'dat', 'acc', 'abl']) for (const nu of n.nums) { const f = n.form(c, nu); if (f) cands.push(f[0]); } };
    const addAdj = (k, np) => { const a = adjInfo(k); for (const g of ['m', 'f', 'n']) for (const c of ['nom', 'acc', 'abl', 'dat']) { const f = a.form(g, c, np.num)[0]; if (f) cands.push(f); } };
    if (S.coord) for (const f of shuffle(rng, ['et', 'aut', 'vel', 'nec', 'neque', 'atque', 'sed'])) cands.push(f); // other conjunctions (accepted ones are filtered below)
    for (const np of [S.subj, S.coord && S.coord.np2, S.obj, S.io, S.means, S.pp && S.pp.np].filter(Boolean)) {
      if (np.noun.pron) { for (const d of Object.values(PRON_NP)) cands.push(d[np.case] || d.acc); cands.push(np.noun.form('acc', np.num) ? np.noun.form('acc', np.num)[0] : np.noun.form('dat', np.num)[0], 'cum', 'mēcum', 'tēcum'); continue; }
      addNoun(np); if (np.adj) { addAdj(np.adj, np); const a = LEX.adjs[np.adj]; if (a.kind) for (const k of DET_KEYS()) if (k !== np.adj && LEX.adjs[k].kind === a.kind) addAdj(k, np); } }
    if (S.pred) addAdj(S.pred, S.subj);
    const v = verbInfo(sent.verb);
    for (const t of TENSES) for (const p of ['1s', '2s', '3s', '1p', '3p']) { const lv = latinVerb(v, sent.voice, t, p, ['m']); if (Array.isArray(lv)) cands.push(lv[0][0]); else { cands.push(lv.ptc[0], lv.aux[0]); } }
    if (sent.voice === 'pas' && sent.tense !== 'perf') for (const p of ['3s', '3p']) cands.push(v.tbl['ind.act.' + sent.tense + '.' + p][0]);
    if (S.adv) for (const k of shuffle(rng, ADV_KEYS().filter(k => k !== S.adv)).slice(0, 3)) cands.push(LEX.advs[k].la); // other adverbs (nunc ↔ mox …)
    const out = [];
    for (const f of shuffle(rng, [...new Set(cands)])) { if (out.length >= nDistract) break; if (!accepted.has(normM(f))) out.push(f); }
    const answer = sent.laTokens.map(t => t);
    return { answer, bank: shuffle(rng, answer.concat(out)), distractors: out };
  }

  // Build a sentence from an explicit spec (used by golden tests). spec: {verb, frame, tense, voice, subj:{n,num,adj}, pron, obj, io, means, pp:{type,n,num,adj}, nocte, pred}
  function build(sp) {
    const v = verbInfo(sp.verb); const fr = { k: sp.verb, f: v.frames[sp.frame || 0] };
    const np = (x, c) => x ? { noun: nounInfo(x.n), case: c, num: x.num || 'sg', adj: x.adj } : null;
    return assemble({ template: sp.template || 'GOLDEN', tense: sp.tense || 'pres', voice: sp.voice || 'act', v, fr, subj: np(sp.subj, 'nom'), pron: sp.pron || null,
      obj: np(sp.obj, 'acc'), io: np(sp.io, 'dat'), means: np(sp.means, 'abl'), pp: sp.pp ? { type: sp.pp.type, np: np(sp.pp, PP_TYPES[sp.pp.type].case) } : null, nocte: !!sp.nocte, pred: sp.pred || null, adv: sp.adv || null,
      coord: sp.coord ? { conj: sp.coord.conj, kind: LEX.conjs[sp.coord.conj].kind, role: sp.coord.role || 'S', form: sp.coord.form || LEX.conjs[sp.coord.conj].forms[0], np2: np(sp.coord, sp.coord.role === 'O' ? 'acc' : 'nom') } : null });
  }
  // ---------- Identify mode ----------
  // Targets the learner can be asked about in a sentence: nouns (case + number of their role) and the verb (tense, person, voice).
  // A noun is a target only when its token occurs once in the sentence; the answer is the case/number the sentence's syntax
  // gives it (ambiguity() has already refused sentences where another reading of the roles is possible).
  // For the verb, every (voice, tense, person) that has exactly the same form (macrons included) is accepted, e.g. ostendit,
  // which is both present and perfect 3s; forms that differ only by a macron (venit / vēnit) are kept apart.
  const PERSONS = ['1s', '2s', '3s', '1p', '2p', '3p'];
  function verbForms(v, voice, tense, pn) {
    try {
      const lv = latinVerb(v, voice, tense, pn, ['m', 'f', 'n']);
      if (Array.isArray(lv)) return lv.length ? [lv[0].join(' ')] : [];   // the standard form only
      if (!lv.ptc.length || !lv.aux.length) return [];
      const aux = lv.aux[0];
      return lv.ptc.map(p => p + ' ' + aux);
    } catch (e) { return []; }
  }
  function identifyTargets(sent) {
    const S = sent.spec, toks = sent.laTokens, out = [];
    const nps = [];
    if (S.subj) nps.push({ np: S.subj, role: 'S' });
    if (S.coord) nps.push({ np: S.coord.np2, role: S.coord.role, enclitic: ['que', 've'].includes(S.coord.form) ? S.coord.form : null });
    if (S.obj) nps.push({ np: S.obj, role: 'O' });
    if (S.io) nps.push({ np: S.io, role: 'IO' });
    if (S.means) nps.push({ np: S.means, role: 'MEANS' });
    if (S.pp && !(S.pp.type === 'cum' && S.pp.np.noun.pron)) nps.push({ np: S.pp.np, role: 'PP' });
    const built = nps.map(x => buildNP(x.np).nounTok);
    nps.forEach((x, i) => {
      const t = built[i]; if (!t) return;
      if (built.some((u, j) => j !== i && normM(u) === normM(t))) return;
      const idx = []; toks.forEach((tk, k) => { if (tk === t || (x.enclitic && tk === t + x.enclitic)) idx.push(k); });
      if (idx.length !== 1) return;
      out.push({ kind: 'noun', idx, token: toks[idx[0]], form: t, key: x.np.noun.key, role: x.role, case: x.np.case, num: x.np.num, pron: !!x.np.noun.pron });
    });
    // the verb: its tokens are the last one or two, after an optional nōn
    const vt = verbForms(S.v, S.voice, S.tense, sent.person).find(f => { const w = f.split(' '); return w.every((x, j) => toks[toks.length - w.length + j] === x); });
    if (vt) {
      const n = vt.split(' ').length, idx = []; for (let k = toks.length - n; k < toks.length; k++) idx.push(k);
      const accept = [];
      const voices = S.v.key === 'sum' ? ['act'] : ['act', 'pas'];
      for (const vc of voices) for (const t of TENSES) for (const pn of PERSONS) if (verbForms(S.v, vc, t, pn).some(f => normM(f) === normM(vt))) accept.push({ voice: vc, tense: t, person: pn });
      out.push({ kind: 'verb', idx, token: vt, key: S.v.key, voice: S.voice, tense: S.tense, person: sent.person, accept, hasVoice: S.v.key !== 'sum' });
    }
    return out;
  }

  const api = { setPool, sentenceIds, identifyTargets, verbForms, PERSONS, advFits, enVerbAltsAdv, ADV_KEYS, build, mulberry32, nounInfo, adjInfo, verbInfo, latinVerb, enVerbAlts, enNoun, buildNP, generate, generateOne, generateMany, gradeEnglish, gradeLatin, gradeLatinReport, chipsLaEn, chipsEnLa, normEn, TEMPLATES, TENSES, PP_TYPES, CONJ_FORMS, joinConj, enPersonOf, OVERRIDES, matches, adjFits, adjEnglish, ambiguity, nounReadings, adjReadings, LEX, Morph };
  root.LatinEngine = api; if (isNode) module.exports = api;
})(typeof self !== 'undefined' ? self : this);
