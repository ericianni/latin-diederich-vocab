// Drill picking: free practice weighted toward weak spots (no schedule).
// Stats are kept per form combination ("paradigm|key", e.g. "n3|dat.pl", "v1|sub.pas.impf.3s", "a12|m.abl.sg").
(function (root, factory) {
  const P = factory();
  if (typeof module === 'object' && module.exports) module.exports = P; else root.DrillPick = P;
})(typeof self !== 'undefined' ? self : this, function () {
  const DECAY = 0.75;            // each new attempt counts fully; older ones fade (0.75, 0.56, 0.42…)
  const DAY = 864e5;
  // st = { r: decayed right, n: decayed attempts, a: attempts, ok: right answers, t: last seen (ms), q: answer counter when last seen }
  function record(st, right, now, q) {
    st = Object.assign({ r: 0, n: 0, a: 0, ok: 0 }, st || {});
    st.r = st.r * DECAY + (right ? 1 : 0); st.n = st.n * DECAY + 1; st.a++; if (right) st.ok++;
    st.t = now; st.q = q;
    return st;
  }
  const acc = st => st && st.n > 0 ? st.r / st.n : null;
  // how much a combo wants to be asked: low accuracy and unseen up, just-asked down, long-unseen slightly up
  function weight(st, now, q) {
    if (!st || !(st.n > 0)) return st && st.q != null && q - st.q < 4 ? 0.2 : 2;   // unseen (or tried only before stats existed)
    const p = (st.r + 0.5) / (st.n + 1);                       // smoothed: one right answer isn't "mastered"
    let w = 0.25 + 3 * (1 - p) * (1 - p) + 1.5 * (1 - p);
    const since = q - (st.q == null ? -1e9 : st.q);
    if (since < 4) w *= 0.1; else if (since < 15) w *= 0.3 + 0.7 * (since - 4) / 11;
    const days = (now - (st.t || 0)) / DAY;
    w *= 1 + 0.5 * Math.min(1, Math.max(0, days) / 30);
    return w;
  }
  // base share of each combo, so verbs (hundreds of combos) don't crowd out nouns and adjectives, and small irregular
  // paradigms don't get as much as the big conjugations: each word type gets an equal share, split among paradigm
  // groups by sqrt(number of words), then equally among that group's combos. entries: [{ c, kind, g, nw }]
  function masses(entries) {
    const kinds = {}, m = new Map();
    for (const e of entries) { const k = kinds[e.kind] = kinds[e.kind] || { g: {}, tot: 0 }; if (!k.g[e.g]) { k.g[e.g] = { n: 0, s: Math.sqrt(e.nw || 1) }; k.tot += k.g[e.g].s; } k.g[e.g].n++; }
    const nk = Object.keys(kinds).length;
    for (const e of entries) { const k = kinds[e.kind], g = k.g[e.g]; m.set(e.c, (1 / nk) * (g.s / k.tot) / g.n); }
    return m;
  }
  function wpick(items, wf, rnd) {
    let tot = 0; const ws = items.map(x => { const w = Math.max(0, wf(x)); tot += w; return w; });
    if (!(tot > 0)) return items.length ? items[Math.floor(rnd() * items.length)] : null;
    let r = rnd() * tot;
    for (let i = 0; i < items.length; i++) { r -= ws[i]; if (r < 0) return items[i]; }
    return items[items.length - 1];
  }
  // entries as for masses(); stats: { combo: st }; opts: { now, q, rnd, exclude: Set }
  function pickCombo(entries, stats, opts) {
    const o = Object.assign({ now: Date.now(), q: 0, rnd: Math.random }, opts || {});
    const m = masses(entries), list = entries.filter(e => !(o.exclude && o.exclude.has(e.c)));
    const e = wpick(list.length ? list : entries, x => m.get(x.c) * weight(stats[x.c], o.now, o.q), o.rnd);
    return e ? e.c : null;
  }
  // a word for the combo: mild preference for frequent words and words already met as flashcards; avoid recent ones
  // cands: [{ id, r: frequency rank or null, fc: seen as flashcard }]
  function pickWord(cands, avoid, rnd) {
    rnd = rnd || Math.random;
    const ok = avoid && avoid.size ? cands.filter(c => !avoid.has(c.id)) : cands;
    const c = wpick(ok.length ? ok : cands, x => (x.fc ? 2 : 1) * (1 + 1 / (1 + (x.r || 2000) / 250)), rnd);
    return c ? c.id : null;
  }
  // lowest-accuracy combos that have been tried (below maxAcc, if given); ties -> more attempts first
  function weakest(stats, n, allow, maxAcc) {
    return Object.keys(stats).filter(c => stats[c].n > 0 && (!allow || allow.has(c)) && !(acc(stats[c]) >= maxAcc))
      .sort((x, y) => acc(stats[x]) - acc(stats[y]) || stats[y].a - stats[x].a || (x < y ? -1 : 1)).slice(0, n);
  }

  // ---------- sentences mixed into drills ----------
  // Settings live on S.set.df. Off until the learner turns them on. No mix %, length, or pattern setting:
  // the share and the template tier are fixed here.
  const SENT_DF = { sent: false, stype: 'both', sdir: 'le' };
  // Ordinary drill items between sentences. Each stretch is 1 sentence + k drills, so the sentence's share of
  // that stretch is 1/(k+1): 20%, 17%, 17%, 14%, 14%, 13%, 10%. Mean gap is 6, so a long run is 1/7 ≈ 14%.
  const SENT_GAPS = [4, 5, 5, 6, 6, 7, 9];
  // Seen lexicon content words (helpers do not count). Under 40: shortest templates only.
  const SENT_TIERS = [
    { min: 0, tpls: ['SV', 'COPULA', 'PRONOUN'] },
    { min: 40, tpls: ['SV', 'COPULA', 'PRONOUN', 'SOV', 'DAT_VERB', 'SV_PP', 'MEANS'] },
    { min: 80, tpls: ['SV', 'COPULA', 'PRONOUN', 'SOV', 'DAT_VERB', 'SV_PP', 'MEANS', 'PASSIVE', 'SOV_ADJ', 'DAT_IO', 'PP_ADJ', 'PRON_OBJ'] },
    { min: 140, tpls: null },
  ];
  const IRR_PAR = { sum: 'sum', possum: 'possum', 'eō': 'eo', 'ferō': 'fero', 'volō': 'volo', 'nōlō': 'volo', 'mālō': 'volo', 'fīō': 'fio', 'dō': '1' };

  function sentenceSettings(df) {
    df = df || {};
    const type = df.stype === 'tr' || df.stype === 'id' || df.stype === 'both' ? df.stype : 'both';
    const dir = df.sdir === 'le' || df.sdir === 'el' || df.sdir === 'both' ? df.sdir : 'le';
    return { on: df.sent === true, type, dir };
  }
  function sentenceTier(n) {
    let i = 0;
    for (let k = 0; k < SENT_TIERS.length; k++) if (n >= SENT_TIERS[k].min) i = k;
    return i;
  }
  function sentenceTemplates(n, all) {
    const t = SENT_TIERS[sentenceTier(n)].tpls;
    if (!t) return (all || []).slice();
    return all ? t.filter(x => all.includes(x)) : t.slice();
  }
  function sentenceGap(rnd) {
    rnd = rnd || Math.random;
    return SENT_GAPS[Math.floor(rnd() * SENT_GAPS.length)];
  }
  function sentenceMixStart(rnd) { return { left: sentenceGap(rnd) }; }
  // on: sentences enabled. A take is never followed by another take (the next state always has left >= 4).
  function sentenceMixNext(state, on, rnd) {
    state = state && state.left != null ? state : sentenceMixStart(rnd || Math.random);
    if (!on) return { take: false, state: state };
    if (state.left > 0) return { take: false, state: { left: state.left - 1 } };
    return { take: true, state: { left: sentenceGap(rnd || Math.random) } };
  }
  // Flashcard (r: / p:) or drill history. Helpers are not added here; the engine allows them on its own.
  function seenWordIds(progress) {
    const ids = new Set();
    const cards = (progress && progress.cards) || {};
    const dw = (progress && progress.ds && progress.ds.w) || {};
    for (const k of Object.keys(cards)) { const m = /^[rp]:(\d+)$/.exec(k); if (m) ids.add(+m[1]); }
    for (const k of Object.keys(dw)) if (dw[k]) ids.add(+k);
    return ids;
  }
  function paradigmOf(a) {
    if (!a || a.skip || !a.kind) return null;
    if (a.kind === 'verb') return 'v' + (a.conj === 'irr' ? (IRR_PAR[a.irr] || 'irr') : String(a.conj));
    if (a.kind === 'noun') return 'n' + (a.decl === 3 && a.istem ? '3i' : a.decl);
    if (a.kind === 'pron') return a.par || (a.pron === 'pers' ? 'pp' : 'pd');
    return 'a' + (a.decl === 3 ? '3' : '12');
  }
  function splitCombo(c) { const i = c.indexOf('|'); return [c.slice(0, i), c.slice(i + 1)]; }
  function dfHas(df, g, v) { return !df || !df[g] || df[g].includes(v); }
  // True when this paradigm|form is inside the current drill chips. Absent chip groups are not a constraint.
  function comboFits(c, df) {
    const [par, key] = splitCombo(c);
    if (par[0] === 'v') {
      if (!dfHas(df, 'types', 'verb')) return false;
      const conj = par.slice(1);
      if (!dfHas(df, 'conj', ['1', '2', '3', '3io', '4'].includes(conj) ? conj : 'irr')) return false;
      const p = key.split('.');
      if (p[0] && !dfHas(df, 'moods', p[0])) return false;
      if (p[1] && !dfHas(df, 'voices', p[1])) return false;
      if (p[2] && !dfHas(df, 'tenses', p[2])) return false;
      if (p[3]) {
        if (!dfHas(df, 'persons', p[3][0])) return false;
        if (!dfHas(df, 'vnums', p[3][1] === 's' ? 'sg' : 'pl')) return false;
      }
      return true;
    }
    if (par[0] === 'n') {
      if (!dfHas(df, 'types', 'noun')) return false;
      if (!dfHas(df, 'decl', par === 'n3i' ? '3' : par.slice(1))) return false;
      const [kase, num] = key.split('.');
      return dfHas(df, 'cases', kase) && dfHas(df, 'nums', num);
    }
    if (par[0] === 'a') {
      if (!dfHas(df, 'types', 'adj')) return false;
      if (par === 'a3') { if (!dfHas(df, 'decl', '3')) return false; }
      else if (!dfHas(df, 'decl', '1') && !dfHas(df, 'decl', '2')) return false;
      const parts = key.split('.');
      return dfHas(df, 'cases', parts[1]) && dfHas(df, 'nums', parts[2]);
    }
    if (par[0] === 'p') {
      if (!dfHas(df, 'types', 'pron')) return false;
      const parts = key.split('.');
      const kase = parts.length === 2 ? parts[0] : parts[1];
      const num = parts.length === 2 ? parts[1] : parts[2];
      return dfHas(df, 'cases', kase) && dfHas(df, 'nums', num);
    }
    return false;
  }
  function engineCan(c) {
    const [par, key] = splitCombo(c);
    const T = { pres: 1, impf: 1, perf: 1, fut: 1 };
    if (par[0] === 'v') {
      const [mood, voice, tense, pn] = key.split('.');
      return mood === 'ind' && (voice === 'act' || voice === 'pas' || voice === 'dep') && !!T[tense] && /^[123][sp]$/.test(pn || '');
    }
    if (par[0] === 'n' || (par[0] === 'p' && key.split('.').length === 2)) {
      const [kase, num] = key.split('.');
      return (kase === 'nom' || kase === 'acc' || kase === 'dat' || kase === 'abl') && (num === 'sg' || num === 'pl');
    }
    if (par[0] === 'a' || (par[0] === 'p' && key.split('.').length === 3)) {
      const p = key.split('.');
      return p.length === 3 && (p[0] === 'm' || p[0] === 'f' || p[0] === 'n') && (p[1] === 'nom' || p[1] === 'acc' || p[1] === 'dat' || p[1] === 'abl') && (p[2] === 'sg' || p[2] === 'pl');
    }
    return false;
  }

  let _lex = null, _lexWords = null;
  function lexiconIndex(engine, wordsById) {
    if (_lex && _lexWords === wordsById) return _lex;
    const Morph = engine.Morph, LEX = engine.LEX;
    const nouns = [], verbs = [], adjs = [], contentIds = new Set();
    const take = (key, lx, bucket, content) => {
      if (!lx || typeof lx.id !== 'number' || !wordsById || !wordsById[lx.id]) return;
      let a = null; try { a = Morph.analyze(wordsById[lx.id]); } catch (e) { a = null; }
      bucket.push({ key, id: lx.id, par: paradigmOf(a), a });
      if (content) contentIds.add(lx.id);
    };
    for (const [k, lx] of Object.entries(LEX.nouns || {})) if (!String(k).startsWith('pron_')) take(k, lx, nouns, true);
    for (const [k, lx] of Object.entries(LEX.verbs || {})) take(k, lx, verbs, k !== 'sum');
    for (const [k, lx] of Object.entries(LEX.adjs || {})) take(k, lx, adjs, true);
    for (const lx of Object.values(LEX.advs || {})) if (typeof lx.id === 'number') contentIds.add(lx.id);
    for (const lx of Object.values(LEX.conjs || {})) {
      if (typeof lx.id === 'number') contentIds.add(lx.id);
      for (const alt of lx.alt || []) if (typeof alt.id === 'number') contentIds.add(alt.id);
    }
    if (LEX.extras && LEX.extras.nox && typeof LEX.extras.nox.id === 'number') contentIds.add(LEX.extras.nox.id);
    _lexWords = wordsById;
    _lex = { nouns, verbs, adjs, contentIds };
    return _lex;
  }
  function paradigmsSeen(index, seen) {
    const s = new Set(['vsum', 'pp']);
    for (const list of [index.nouns, index.verbs, index.adjs]) for (const w of list) if (seen.has(w.id) && w.par) s.add(w.par);
    return s;
  }
  function rankTargets(stats, df, allow, pars, q, rnd) {
    const pool = [];
    const src = allow ? [...allow] : Object.keys(stats || {});
    for (const c of src) {
      if (!engineCan(c) || !comboFits(c, df)) continue;
      if (pars && !pars.has(c.slice(0, c.indexOf('|')))) continue;
      pool.push(c);
    }
    if (!pool.length) return [];
    const weak = weakest(stats || {}, 5, new Set(pool), 0.85);
    if (weak.length) return weak;
    const c = wpick(pool, x => weight((stats || {})[x], Date.now(), q || 0), rnd);
    return c ? [c] : [];
  }
  function combosIn(sent, index, engine) {
    const out = [];
    const noun = new Map(index.nouns.map(n => [n.key, n]));
    const verb = new Map(index.verbs.map(v => [v.key, v]));
    const adj = new Map(index.adjs.map(a => [a.key, a]));
    let targets = [];
    try { targets = engine.identifyTargets(sent) || []; } catch (e) { targets = []; }
    for (const t of targets) {
      if (t.kind === 'noun') {
        if (t.pron) out.push({ c: 'pp|' + t.case + '.' + t.num, target: t });
        else { const n = noun.get(t.key); if (n && n.par) out.push({ c: n.par + '|' + t.case + '.' + t.num, target: t, id: n.id }); }
      } else if (t.kind === 'verb') {
        const v = verb.get(t.key); if (!v || !v.par) continue;
        const voice = v.a && v.a.voice === 'dep' ? 'dep' : (t.voice === 'pas' ? 'pas' : 'act');
        out.push({ c: v.par + '|ind.' + voice + '.' + t.tense + '.' + t.person, target: t, id: v.id });
      }
    }
    const S = sent.spec || {};
    const nps = [S.subj, S.obj, S.io, S.means, S.pp && S.pp.np, S.coord && S.coord.np2].filter(Boolean);
    for (const np of nps) if (np.adj) {
      const a = adj.get(np.adj);
      const g = (np.noun && (np.noun.g || (np.noun.genders && np.noun.genders[0]))) || 'm';
      if (a && a.par) out.push({ c: a.par + '|' + g + '.' + np.case + '.' + np.num, id: a.id, adj: true });
    }
    if (S.pred && S.subj) {
      const a = adj.get(S.pred);
      const g = (S.subj.noun && S.subj.noun.g) || 'm';
      if (a && a.par) out.push({ c: a.par + '|' + g + '.nom.' + S.subj.num, id: a.id, adj: true });
    }
    return out;
  }
  function fitsFilter(found, df, allow) {
    const ok = found.filter(x => comboFits(x.c, df) && (!allow || allow.has(x.c)));
    if (allow && !ok.length) return false;
    if (df && !ok.length) return false;
    return true;
  }
  function hintTemplates(combo, tpls) {
    if (!combo) return tpls;
    const [par, key] = splitCombo(combo);
    let names = null;
    if (par[0] === 'v') {
      const voice = key.split('.')[1], pn = key.split('.')[3];
      if (voice === 'pas') names = ['PASSIVE'];
      else if (pn && pn[0] !== '3') names = ['PRONOUN', 'PRON_OBJ'];
    } else if (par[0] === 'n' || par === 'pp') {
      const kase = key.split('.')[0];
      names = { nom: ['SV', 'COPULA', 'SOV', 'SV_PP', 'MEANS', 'PASSIVE', 'DAT_VERB', 'DAT_IO', 'SOV_ADJ'], acc: ['SOV', 'SOV_ADJ', 'PRON_OBJ', 'DET', 'ADV', 'COORD'], dat: ['DAT_IO', 'DAT_VERB', 'PRON_OBJ', 'DET', 'ADV'], abl: ['MEANS', 'SV_PP', 'PP_ADJ', 'PASSIVE', 'ADV'] }[kase];
    } else if (par[0] === 'a' || par === 'pd') {
      const kase = key.split('.')[1];
      names = { nom: ['COPULA', 'SOV_ADJ', 'PP_ADJ'], acc: ['SOV_ADJ', 'PP_ADJ'], dat: ['SOV_ADJ', 'PP_ADJ', 'DAT_IO'], abl: ['PP_ADJ', 'MEANS', 'SV_PP'] }[kase];
    }
    if (!names) return tpls;
    const pref = tpls.filter(t => names.includes(t));
    return pref.length ? pref : tpls;
  }
  function templatesForFilter(df, tpls) {
    if (!df || !df.cases || df.cases.length >= 6) return tpls;
    const want = new Set();
    for (const c of df.cases) {
      if (c === 'nom' || c === 'gen' || c === 'voc' || c === 'loc') ['SV', 'COPULA', 'SOV', 'SV_PP', 'MEANS', 'PASSIVE', 'DAT_VERB', 'DAT_IO', 'SOV_ADJ', 'PRONOUN'].forEach(t => want.add(t));
      if (c === 'acc') ['SOV', 'SOV_ADJ', 'PRON_OBJ', 'DET', 'ADV', 'COORD'].forEach(t => want.add(t));
      if (c === 'dat') ['DAT_IO', 'DAT_VERB', 'PRON_OBJ', 'DET', 'ADV'].forEach(t => want.add(t));
      if (c === 'abl') ['MEANS', 'SV_PP', 'PP_ADJ', 'PASSIVE', 'ADV'].forEach(t => want.add(t));
    }
    const pref = tpls.filter(t => want.has(t));
    return pref.length ? pref : tpls;
  }
  function chooseEx(settings, rnd) {
    let type = settings.type === 'tr' || settings.type === 'id' ? settings.type : 'both';
    if (type === 'both') type = rnd() < 0.5 ? 'id' : 'tr';
    let dir = null;
    if (type === 'tr') dir = settings.dir === 'el' || settings.dir === 'both' ? (settings.dir === 'both' ? (rnd() < 0.5 ? 'el' : 'le') : 'el') : 'le';
    return { type, dir };
  }
  function genUntil(engine, rnd, tpls, tense, pred, tries) {
    if (!tpls.length) return null;
    let fails = 0;
    for (let i = 0; i < tries; i++) {
      const tpl = tpls[Math.floor(rnd() * tpls.length)];
      let s = null;
      try { s = engine.generate(rnd, tense ? { template: tpl, tense: tense } : { template: tpl }); }
      catch (e) { if (++fails >= 2) return null; continue; }
      if (s && !s.rejected && pred(s)) return s;
    }
    return null;
  }
  function chooseTarget(found, want, df, allow, rnd) {
    const idents = found.filter(x => x.target);
    if (!idents.length) return null;
    const hit = want && idents.find(x => x.c === want);
    if (hit) return hit;
    const fit = idents.filter(x => comboFits(x.c, df) && (!allow || allow.has(x.c)));
    const pool = fit.length ? fit : idents;
    return pool[Math.floor(rnd() * pool.length)];
  }

  let _pron = null, _sumNorms = null;
  function pronMap(engine) {
    if (_pron) return _pron;
    const norm = engine.Morph.norm;
    const EN = { ego: 'I', tu: 'you', nos: 'we', uos: 'you', me: 'me', te: 'you', mihi: 'to me', tibi: 'to you', nobis: 'to us', uobis: 'to you', mecum: 'with me', tecum: 'with you' };
    const m = new Map();
    for (const g of Object.values(engine.LEX.prons || {})) for (const [form, info] of Object.entries(g.ids || {})) {
      const n = norm(form);
      m.set(n, { id: info.id, en: EN[n] || 'pronoun' });
    }
    _pron = m;
    return m;
  }
  function sumNorms(engine) {
    if (_sumNorms) return _sumNorms;
    const norm = engine.Morph.norm, set = new Set();
    const v = engine.verbInfo('sum');
    for (const cell of Object.values(v.tbl || {})) for (const f of [].concat(cell)) set.add(norm(String(f).split(' ')[0]));
    _sumNorms = set;
    return set;
  }
  function prepForms(prep) { return prep === 'ab' ? ['ā', 'ab'] : prep === 'ex' ? ['ē', 'ex'] : [prep]; }
  function prepId(LEX, prep, type) {
    const p = LEX.preps || {};
    if (p[prep] && typeof p[prep].id === 'number') return p[prep].id;
    if (type && p[type] && typeof p[type].id === 'number') return p[type].id;
    return null;
  }
  // Glosses for helper words (prepositions, personal pronouns, sum) the learner has not seen yet.
  function helperHints(sent, seen, engine) {
    const hints = [];
    const norm = engine.Morph.norm;
    const toks = sent.laTokens || [];
    const S = sent.spec || {};
    const at = i => hints.some(h => h.i === i);
    if (S.pp && !(S.pp.type === 'cum' && S.pp.np && S.pp.np.noun && S.pp.np.noun.pron)) {
      const T = engine.PP_TYPES[S.pp.type];
      if (T) {
        const forms = new Set(prepForms(T.prep).map(norm));
        const id = prepId(engine.LEX, T.prep, S.pp.type);
        const gloss = (T.en(S.pp.np.noun, sent.verb) || [''])[0];
        if (gloss && (id == null || !seen.has(id))) toks.forEach((t, i) => { if (forms.has(norm(t))) hints.push({ i, en: gloss }); });
      }
    }
    const pr = pronMap(engine);
    toks.forEach((t, i) => { if (at(i)) return; const p = pr.get(norm(t)); if (p && !seen.has(p.id)) hints.push({ i, en: p.en }); });
    const sumId = engine.LEX.verbs.sum && engine.LEX.verbs.sum.id;
    if (typeof sumId === 'number' && !seen.has(sumId)) {
      const last = toks.length - 1, n = norm(toks[last] || '');
      if (!at(last) && sumNorms(engine).has(n)) {
        if (sent.verb === 'sum') hints.push({ i: last, en: (sent.vp && sent.vp.canon) || 'be' });
        else if (sent.voice === 'pas' && sent.tense === 'perf') {
          const g = { sum: 'am', es: 'are', est: 'is', sumus: 'are', estis: 'are', sunt: 'are' }[n];
          if (g) hints.push({ i: last, en: g });
        }
      }
    }
    return hints;
  }

  // Build one drill sentence, or null when the pool / filter / engine cannot (caller serves an ordinary drill).
  function pickDrillSentence(engine, opts) {
    opts = opts || {};
    const rnd = opts.rnd || Math.random;
    const df = opts.df || {};
    const settings = sentenceSettings(df);
    const index = lexiconIndex(engine, opts.wordsById);
    const seen = opts.seen instanceof Set ? opts.seen : new Set(opts.seen || []);
    const nounN = index.nouns.filter(n => seen.has(n.id)).length;
    const verbN = index.verbs.filter(v => v.key !== 'sum' && seen.has(v.id)).length;
    if (nounN < 1 && verbN < 1) return null;
    const contentSeen = [];
    for (const id of seen) if (index.contentIds.has(id)) contentSeen.push(id);
    const tpls = sentenceTemplates(contentSeen.length, engine.TEMPLATES);
    if (!tpls.length) return null;
    const allow = opts.allow || null;
    const targets = rankTargets(opts.stats || {}, df, allow, paradigmsSeen(index, seen), opts.q || 0, rnd);
    const ex = opts.ex ? { type: opts.ex, dir: opts.dir || (opts.ex === 'tr' ? 'le' : null) } : chooseEx(settings, rnd);
    const usable = (s, want) => {
      const found = combosIn(s, index, engine);
      if (want && !found.some(x => x.c === want)) return false;
      if (!fitsFilter(found, df, allow)) return false;
      if (ex.type === 'id' && !found.some(x => x.target)) return false;
      return true;
    };
    engine.setPool(contentSeen);
    try {
      let sent = null, want = null;
      for (const c of targets) {
        const tense = c[0] === 'v' ? c.split('|')[1].split('.')[2] : null;
        sent = genUntil(engine, rnd, hintTemplates(c, tpls), tense, s => usable(s, c), 24);
        if (sent) { want = c; break; }
      }
      if (!sent) sent = genUntil(engine, rnd, templatesForFilter(df, tpls), null, s => usable(s, null), 30);
      if (!sent) return null;
      const found = combosIn(sent, index, engine);
      const chosen = ex.type === 'id' ? chooseTarget(found, want, df, allow, rnd) : null;
      if (ex.type === 'id' && !chosen) return null;
      return {
        sent: true, ex: ex.type, dir: ex.type === 'tr' ? ex.dir : null, sentence: sent,
        target: chosen ? chosen.target : null, combo: chosen ? chosen.c : null,
        hints: helperHints(sent, seen, engine), tier: sentenceTier(contentSeen.length), template: sent.template,
      };
    } finally { engine.setPool(null); }
  }
  // One sentence is one daily-drill answer. Identify writes the asked form back into drill stats; translate does not.
  function applySentenceGrade(state, item, right, now) {
    state = state || {};
    const dst = state.dst || {};
    state.dn = (state.dn || 0) + 1;
    state.dq = (state.dq || 0) + 1;
    if (item && item.ex === 'id' && item.combo) dst[item.combo] = record(dst[item.combo], !!right, now || Date.now(), state.dq);
    state.dst = dst;
    return state;
  }

  return {
    DECAY, record, acc, weight, masses, pickCombo, pickWord, weakest,
    SENT_DF, SENT_GAPS, SENT_TIERS, sentenceSettings, sentenceTier, sentenceTemplates, sentenceGap, sentenceMixStart, sentenceMixNext,
    seenWordIds, paradigmOf, engineCan, comboFits, lexiconIndex, pickDrillSentence, helperHints, applySentenceGrade,
  };
});
