/* Latin 1400 — Diederich vocabulary trainer. Everything lives in localStorage; no backend. */
(function () {
  'use strict';
  const KEY = 'latin1400.v1';
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const today = () => { const d = new Date(); return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000); };
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const POS_SHORT = { noun: 'noun', verb: 'verb', adjective: 'adj.', adverb: 'adv.', conjunction: 'conj.', preposition: 'prep.', pronoun: 'pron.', indeclinable: 'indecl.', interjection: 'interj.' };
  const REVIEW_CAP = 60, DRILL_CAP = 30;

  // ---------- state ----------
  // Cards: { box: 0-7, due: local day number }. Leitner boxes: right moves a card up one box, wrong sends it to box 0.
  const INT = [0, 1, 3, 7, 14, 30, 60, 120];   // days until the next review after reaching box n
  const DF = { types: ['verb', 'noun', 'adj'], moods: ['ind'], voices: ['act', 'dep'], tenses: ['pres', 'impf', 'fut', 'perf', 'plup', 'fperf'], conj: ['1', '2', '3', '3io', '4', 'irr'],
    cases: ['nom', 'gen', 'dat', 'acc', 'abl'], nums: ['sg', 'pl'], decl: ['1', '2', '3', '4', '5', 'irr'] };
  let S = load();
  function load() { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.cards) return fix(s); } catch (e) { /* fresh */ } return fix({}); }
  function boxFromIvl(c) { const i = c.ivl || 0; if (i <= 0) return c.reps > 0 ? 1 : 0; return i <= 2 ? 1 : i <= 6 ? 2 : i <= 13 ? 3 : i <= 29 ? 4 : i <= 59 ? 5 : i <= 119 ? 6 : 7; }
  function fix(s) {
    s.cards = s.cards || {}; s.day = s.day || {};
    s.set = Object.assign({ newPerDay: 10, drillNew: 5 }, s.set || {});
    if (!s.v || s.v < 2) {                     // v1 (SM-2, combined drills) -> v2 (Leitner, separate drills)
      for (const k of Object.keys(s.cards)) {
        const c = s.cards[k];
        if (c.box == null) s.cards[k] = { box: boxFromIvl(c), due: c.due != null ? c.due : today() };
        const m = k.match(/^d:(\d+):[pf]$/);    // verb drills were split into present / perfect units; now one unit per verb
        if (m) { const nk = 'd:' + m[1] + ':v', o = s.cards[nk], n = s.cards[k]; s.cards[nk] = o ? { box: Math.min(o.box, n.box), due: Math.min(o.due, n.due) } : n; delete s.cards[k]; }
      }
      if (!s.set.drillNew) s.set.drillNew = 5;
      s.v = 2;
    }
    s.set.df = Object.assign({}, DF, s.set.df || {});
    return s;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage full or private mode */ } }
  function day() { const t = today(); if (S.day.d !== t) S.day = { d: t, nv: 0, nd: 0, extra: 0, dx: 0, dn: 0 }; return S.day; }
  function sched(c, right) {
    const t = today();
    if (!right) { c.box = 0; c.due = t; } else { c.box = Math.min(7, (c.box || 0) + 1); c.due = t + INT[c.box]; }
    return c;
  }
  const newCard = () => ({ box: 0, due: today() });
  const nextTxt = k => { const b = Math.min(7, ((S.cards[k] || {}).box || 0) + 1), n = INT[b]; return n === 1 ? 'tomorrow' : n < 31 ? 'in ' + n + ' days' : 'in ' + Math.round(n / 30) + ' mo'; };

  // ---------- data ----------
  let W = [], BY = {}, UNITS = [];
  const AN = {};
  const an = w => AN[w.id] || (AN[w.id] = ['verb', 'noun', 'adjective'].includes(w.pos) ? Morph.analyze(w) : { skip: 'not drilled (' + w.pos + ')' });
  const rankTxt = w => w.r ? '#' + w.r : '—';

  function heads(la) {
    const h = la.split(',')[0];
    const out = new Set();
    const noNotes = h.replace(/\s+\([^)]*\)/g, '');
    for (const alt of noNotes.split(/\s+or\s+|\//)) { out.add(alt.replace(/\([^)]*\)/g, '')); out.add(alt.replace(/[()]/g, '')); }
    const m = h.match(/\s\((?:or\s+)?([^)]*)\)/); if (m && !/\s/.test(m[1].trim())) out.add(m[1]);
    return [...out].map(s => s.trim().replace(/^-|-$/g, '')).filter(Boolean);
  }

  // ---------- drill filters ----------
  const conjKey = a => a.conj === 'irr' ? 'irr' : String(a.conj);
  function keyOk(a, key, df) {
    const k = key.split('.');
    if (a.kind === 'verb') {
      const [mood, voice, tense] = k;
      if (key === 'ind.act.pres.1s' || key === 'ind.dep.pres.1s') return false;      // that's the headword
      if (mood === 'ger' || mood === 'gdv' || mood === 'sup') return df.moods.includes(mood);   // no voice / tense choice
      return df.moods.includes(mood) && df.voices.includes(voice) && df.tenses.includes(tense);
    }
    if (a.kind === 'noun') return key !== 'nom.sg' && df.cases.includes(k[0]) && df.nums.includes(k[1]);
    return key !== 'm.nom.sg' && df.cases.includes(k[1]) && df.nums.includes(k[2]);
  }
  function wordOk(a, df) {
    if (a.skip) return false;
    if (a.kind === 'verb') return df.types.includes('verb') && df.conj.includes(conjKey(a));
    if (a.kind === 'noun') return df.types.includes('noun') && df.decl.includes(String(a.decl));
    return df.types.includes('adj') && (a.decl === 3 ? df.decl.includes('3') : df.decl.includes('1') || df.decl.includes('2'));
  }
  const drillKeys = a => Object.keys(a.tbl).filter(k => keyOk(a, k, S.set.df));
  const unitOf = (w, a) => 'd:' + w.id + ':' + (a.kind === 'verb' ? 'v' : a.kind === 'noun' ? 'n' : 'a');
  function buildUnits() {
    const u = [];
    for (const w of W) { const a = an(w); if (wordOk(a, S.set.df) && drillKeys(a).length) u.push(unitOf(w, a)); }
    return u;
  }

  // ---------- queues ----------
  function dueKeys(prefixRe, cap, allow) {
    const t = today();
    return Object.keys(S.cards).filter(k => prefixRe.test(k) && S.cards[k].due <= t && (!allow || allow.has(k))).sort((a, b) => S.cards[a].due - S.cards[b].due).slice(0, cap);
  }
  function newWords(n) { const out = []; for (const w of W) { if (out.length >= n) break; if (!S.cards['r:' + w.id]) out.push('r:' + w.id); } return out; }
  function newUnits(n) {
    if (n <= 0) return [];
    const fresh = UNITS.filter(k => !S.cards[k]);
    const seen = fresh.filter(k => S.cards['r:' + k.split(':')[1]]);   // words already met as flashcards first
    return seen.concat(fresh.filter(k => !seen.includes(k))).slice(0, n);
  }
  const vNewLeft = () => { const d = day(); return Math.max(0, S.set.newPerDay + (d.extra || 0) - d.nv); };
  const dNewLeft = () => { const d = day(); return Math.max(0, S.set.drillNew + (d.dx || 0) - d.nd); };
  function counts() {
    const allow = new Set(UNITS);
    return { vDue: dueKeys(/^[rp]:/, REVIEW_CAP).length, vNew: newWords(vNewLeft()).length, dDue: dueKeys(/^d:/, DRILL_CAP, allow).length, dNew: newUnits(dNewLeft()).length };
  }

  let Q = null; // current session {kind:'vocab'|'drill', items:[{k,isNew}], done, total}
  function startSession(kind) {
    const items = [];
    if (kind === 'vocab') {
      const rev = dueKeys(/^[rp]:/, REVIEW_CAP).map(k => ({ k }));
      const nw = newWords(vNewLeft()).map(k => ({ k, isNew: true }));
      // weave one new card after every two reviews
      while (rev.length || nw.length) { if (rev.length) items.push(rev.shift()); if (rev.length) items.push(rev.shift()); if (nw.length) items.push(nw.shift()); }
    } else {
      dueKeys(/^d:/, DRILL_CAP, new Set(UNITS)).forEach(k => items.push({ k }));
      newUnits(dNewLeft()).forEach(k => items.push({ k, isNew: true }));
      shuffle(items);
    }
    Q = { kind, items, done: 0, total: items.length };
    next();
  }
  function grade(item, right) {
    const d = day();
    const k = item.k;
    const first = !S.cards[k];
    S.cards[k] = sched(S.cards[k] || newCard(), right);
    if (first && item.isNew) { if (k[0] === 'd') d.nd++; else d.nv++; }
    if (k[0] === 'd') d.dn = (d.dn || 0) + 1;
    if (k[0] === 'r' && right && !S.cards['p' + k.slice(1)]) { const p = newCard(); p.due = today() + 1; S.cards['p' + k.slice(1)] = p; }
    save();
    Q.done++;
    if (!right) { Q.items.splice(Math.min(3, Q.items.length), 0, { k }); Q.total++; }
    next();
  }
  function next() {
    const it = Q && Q.items.shift();
    if (!it) { const kind = Q && Q.kind; Q = null; return kind === 'drill' ? renderDrills() : renderToday(); }
    if (it.k[0] === 'd') renderDrill(it); else renderVocab(it);
  }

  // ---------- views ----------
  const V = () => $('#view');
  let TAB = 'today';
  function setTab(t) {
    TAB = t;
    document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === (t === 'quiz' ? 'today' : t)));
    Q = null; closeSheet();
    ({ today: renderToday, drills: renderDrills, cheat: renderCheat, quiz: renderQuiz, list: renderList, about: renderAbout })[t]();
    window.scrollTo(0, 0);
  }

  function progressBar() {
    const started = W.filter(w => S.cards['r:' + w.id]).length;
    return `<div class="small muted">Words started: <b>${started}</b> / ${W.length}</div><div class="bar"><i style="width:${(100 * started / W.length).toFixed(1)}%"></i></div>`;
  }
  function sessionHead() {
    if (!Q) return '';
    const pct = Q.total ? 100 * Q.done / Q.total : 0;
    return `<div class="row small muted"><span class="grow">${Q.done} / ${Q.total}</span><button class="link" id="stop">Stop — progress is saved</button></div><div class="bar"><i style="width:${pct}%"></i></div>`;
  }
  function bindStop() { const b = $('#stop'); if (b) b.onclick = () => { const kind = Q && Q.kind; Q = null; kind === 'drill' ? renderDrills() : renderToday(); }; }

  function renderToday() {
    $('#sub').textContent = 'Flashcards';
    const c = counts();
    const vTot = c.vDue + c.vNew;
    const mins = Math.max(1, Math.round((c.vDue * 8 + c.vNew * 15) / 60));
    const drillNote = `<div class="row"><span class="grow small muted">${c.dDue + c.dNew ? `<b>${c.dDue + c.dNew}</b> form drills waiting` : 'Form drills: done for today'}</span><button id="godr">Drills ›</button></div>`;
    if (vTot === 0) {
      V().innerHTML = `<div class="card done"><div class="check">✓</div><h2>Flashcards done for today</h2>
        <p class="muted">Nice work. Come back tomorrow — new words and reviews will be waiting.</p>
        ${progressBar()}</div>
        <div class="card"><div class="row wrap"><button class="grow" id="more">Learn 5 more words</button><button class="grow" id="goquiz">Quick quiz</button></div></div>
        <div class="card">${drillNote}</div>`;
      $('#more').onclick = () => { day().extra = (day().extra || 0) + 5; save(); startSession('vocab'); };
    } else {
      V().innerHTML = `<div class="card">
        <div class="prompt-kind">Today’s flashcards · about ${mins} min</div>
        <div class="stats two" style="margin:12px 0 14px">
          <div class="stat"><b>${c.vNew}</b><span>new words</span></div>
          <div class="stat"><b>${c.vDue}</b><span>reviews</span></div>
        </div>
        <button class="primary big" id="go">Start</button>
        <p class="small muted center" style="margin:10px 0 0">Stop whenever you like — every answer is saved.</p></div>
        <div class="card">${drillNote}</div>
        <div class="card">${progressBar()}<button class="link" id="goquiz">Quick quiz (doesn’t affect your schedule)</button></div>`;
      $('#go').onclick = () => startSession('vocab');
    }
    $('#goquiz').onclick = () => setTab('quiz');
    $('#godr').onclick = () => setTab('drills');
  }

  // Right / Wrong buttons for flashcards
  function rwButtons(k) {
    return `<div class="grades"><button class="g0" data-r="0">✗ Wrong<small>see again soon</small></button><button class="g2" data-r="1">✓ Right<small>next ${nextTxt(k)}</small></button></div>`;
  }
  function bindRW(it) { document.querySelectorAll('#ans button[data-r]').forEach(b => b.onclick = () => grade(it, b.dataset.r === '1')); }

  function renderVocab(it) {
    const [dir, id] = it.k.split(':'); const w = BY[id];
    const pills = `<span class="pill">${POS_SHORT[w.pos] || w.pos}</span><span class="pill">rank ${rankTxt(w)}</span>${it.isNew ? '<span class="pill">new</span>' : ''}`;
    if (dir === 'r') {
      V().innerHTML = `${sessionHead()}<div class="card" id="vc"><div class="prompt-kind">Latin → English</div>
        <div class="latin">${esc(w.la)}</div>${pills}
        <div id="ans"><button class="primary big" id="show" style="margin-top:18px">Show answer</button></div></div>`;
      $('#show').onclick = () => { $('#ans').innerHTML = `<div class="answer"><div class="english">${esc(w.en)}</div><div class="small muted">Did you know it?</div>${rwButtons(it.k)}</div>`; bindRW(it); };
    } else {
      const hs = heads(w.la);
      V().innerHTML = `${sessionHead()}<div class="card" id="vc"><div class="prompt-kind">English → Latin</div>
        <div class="english">${esc(w.en)}</div>${pills}
        <div id="ans"><input type="text" id="typed" placeholder="Type the Latin word (optional)" autocomplete="off" autocapitalize="off" spellcheck="false" style="margin-top:14px">
        <button class="primary big" id="show" style="margin-top:10px">Check</button></div></div>`;
      const go = () => {
        const v = $('#typed').value.trim();
        if (!v) { $('#ans').innerHTML = `<div class="answer"><div class="latin">${esc(w.la)}</div><div class="small muted">Did you know it?</div>${rwButtons(it.k)}</div>`; return bindRW(it); }
        const ok = Morph.check(v, hs);
        $('#ans').innerHTML = `<div class="answer">${ok ? '<div class="ok">✓ Right</div>' : `<div class="no">✗ Wrong — you typed “${esc(v)}”</div>`}<div class="latin">${esc(w.la)}</div>
          <div class="row" style="margin-top:14px">${ok ? '<button class="primary big" data-r="1">Next</button>' : '<button class="grow" data-r="1">Count as correct</button><button class="primary grow" data-r="0">Next</button>'}</div></div>`;
        bindRW(it);
      };
      $('#show').onclick = go; $('#typed').onkeydown = e => { if (e.key === 'Enter') go(); };
      setTimeout(() => { const t = $('#typed'); if (t && matchMedia('(hover:hover)').matches) t.focus(); }, 0);
    }
    bindStop();
  }

  // ---------- drills ----------
  const CHIPS = {
    types: [['verb', 'Verbs'], ['noun', 'Nouns'], ['adj', 'Adjectives']],
    moods: [['ind', 'Indicative'], ['sub', 'Subjunctive'], ['imp', 'Imperative'], ['inf', 'Infinitive'], ['ptc', 'Participle'], ['ger', 'Gerund'], ['gdv', 'Gerundive'], ['sup', 'Supine']],
    voices: [['act', 'Active'], ['pas', 'Passive'], ['dep', 'Deponent']],
    tenses: [['pres', 'Present'], ['impf', 'Imperfect'], ['fut', 'Future'], ['perf', 'Perfect'], ['plup', 'Pluperfect'], ['fperf', 'Fut. perfect']],
    conj: [['1', '1st'], ['2', '2nd'], ['3', '3rd'], ['3io', '3rd -iō'], ['4', '4th'], ['irr', 'Irregular']],
    cases: [['nom', 'Nom.'], ['gen', 'Gen.'], ['dat', 'Dat.'], ['acc', 'Acc.'], ['abl', 'Abl.'], ['voc', 'Voc.'], ['loc', 'Loc.']],
    nums: [['sg', 'Singular'], ['pl', 'Plural']],
    decl: [['1', '1st'], ['2', '2nd'], ['3', '3rd'], ['4', '4th'], ['5', '5th'], ['irr', 'Irregular']],
  };
  const chipRow = (g, title) => `<div class="small muted chiph">${title}</div><div class="chips" data-g="${g}">${CHIPS[g].map(([v, l]) => `<button data-v="${v}" class="${S.set.df[g].includes(v) ? 'on' : ''}" aria-pressed="${S.set.df[g].includes(v)}">${l}</button>`).join('')}</div>`;
  let showSet = false;
  function renderDrills() {
    $('#sub').textContent = 'Form drills';
    const c = counts(), d = day(), tot = c.dDue + c.dNew;
    const head = UNITS.length === 0
      ? `<div class="card"><div class="prompt-kind">Form drills</div><p class="no">Nothing matches your choices.</p><p class="small muted">Turn on at least one mood, voice, tense, case, or number below.</p></div>`
      : tot === 0
        ? `<div class="card done"><div class="check">✓</div><h2>Drills done for today</h2><p class="muted">${d.dn || 0} forms practised today.</p><button class="big" id="dmore">Drill 5 more words</button></div>`
        : `<div class="card"><div class="prompt-kind">Today’s drills · one form per word</div>
          <div class="stats two" style="margin:12px 0 14px"><div class="stat"><b>${c.dNew}</b><span>new words</span></div><div class="stat"><b>${c.dDue}</b><span>reviews</span></div></div>
          <button class="primary big" id="dgo">Start drills</button>
          <p class="small muted center" style="margin:10px 0 0">Type the form; macrons optional. ${d.dn ? d.dn + ' done today.' : ''}</p></div>`;
    V().innerHTML = head + `<div class="card"><div class="row"><h2 class="grow" style="margin:0">What to drill</h2><button class="link" id="tset">${showSet ? 'Hide' : 'Change'}</button></div>
      <div class="small muted" style="margin-top:4px">${esc(dfSummary())} · <b>${UNITS.length}</b> words match</div>
      ${showSet ? `<div id="dset">${chipRow('types', 'Word types')}
        <h3>Verbs</h3>${chipRow('moods', 'Mood / form')}${chipRow('voices', 'Voice')}${chipRow('tenses', 'Tense')}${chipRow('conj', 'Conjugation')}
        <h3>Nouns &amp; adjectives</h3>${chipRow('cases', 'Case')}${chipRow('nums', 'Number')}${chipRow('decl', 'Declension')}
        <div class="small muted chiph">New words per day</div><div class="seg" id="sdr">${[3, 5, 10].map(n => `<button data-n="${n}" class="${S.set.drillNew === n ? 'on' : ''}">${n}</button>`).join('')}</div>
        <p class="small muted">Imperatives come in present and future (use the Tense chips). Gerund, gerundive and supine ignore the voice and tense chips. Passive appears only for verbs that have one (not sum, eō, volō, intransitives); deponents always use passive forms. Locative exists only for domus, rūs, humus, bellum and mīlitia.</p></div>` : ''}
      </div>
      <div class="card"><button class="big" id="opencs">📖 Cheat sheet — endings tables</button></div>`;
    if ($('#dgo')) $('#dgo').onclick = () => startSession('drill');
    if ($('#dmore')) $('#dmore').onclick = () => { day().dx = (day().dx || 0) + 5; save(); startSession('drill'); };
    $('#tset').onclick = () => { showSet = !showSet; renderDrills(); };
    $('#opencs').onclick = () => setTab('cheat');
    document.querySelectorAll('.chips button').forEach(b => b.onclick = () => {
      const g = b.parentNode.dataset.g, v = b.dataset.v, arr = S.set.df[g];
      S.set.df[g] = arr.includes(v) ? arr.filter(x => x !== v) : arr.concat(v);
      save(); UNITS = buildUnits(); renderDrills();
    });
    document.querySelectorAll('#sdr button').forEach(b => b.onclick = () => { S.set.drillNew = +b.dataset.n; save(); renderDrills(); });
  }
  function dfSummary() {
    const df = S.set.df, names = (g) => CHIPS[g].filter(([v]) => df[g].includes(v)).map(x => x[1].toLowerCase());
    const all = g => df[g].length === CHIPS[g].length;
    const parts = [];
    if (df.types.includes('verb')) parts.push(`verbs: ${names('moods').join(', ') || 'no mood'}; ${names('voices').join('/') || 'no voice'}; ${all('tenses') ? 'all tenses' : names('tenses').join(', ') || 'no tense'}`);
    if (df.types.includes('noun') || df.types.includes('adj')) parts.push(`${df.types.includes('noun') ? 'nouns' : ''}${df.types.includes('noun') && df.types.includes('adj') ? ' & ' : ''}${df.types.includes('adj') ? 'adjectives' : ''}: ${all('cases') ? 'all cases' : names('cases').join(' ')}${all('nums') ? '' : ', ' + names('nums').join(' ')}`);
    return parts.join(' · ') || 'nothing selected';
  }
  function miniTable(a, key) {
    const k = key.split('.');
    let rows;
    if (a.kind === 'verb') {
      const pre = ['ger', 'gdv', 'sup'].includes(k[0]) ? k[0] + '.' : k[0] === 'inf' || k[0] === 'ptc' ? k[0] + '.' + k[1] + '.' : k.slice(0, 3).join('.') + '.';
      const NM = { m: 'masc.', f: 'fem.', n: 'neut.', um: '-um', u: '-ū' };
      rows = Object.keys(a.tbl).filter(x => x.startsWith(pre)).map(x => { const r = x.slice(pre.length); return [NM[r] || r.replace(/^(\d)s$/, '$1 sg').replace(/^(\d)p$/, '$1 pl'), x]; });
    } else if (a.kind === 'noun') rows = Morph.CASES_X.map(c => [c, c + '.' + k[1]]);
    else rows = Morph.CASES_X.map(c => [c, k[0] + '.' + c + '.' + k[2]]);
    return `<table>${rows.filter(r => a.tbl[r[1]]).map(([l, x]) => `<tr${x === key ? ' class="hl"' : ''}><th>${l}</th><td>${esc(a.tbl[x].join(' / '))}</td></tr>`).join('')}</table>`;
  }
  function renderDrill(it) {
    const [, id] = it.k.split(':'); const w = BY[id]; const a = an(w);
    const keys = drillKeys(a); const key = keys[Math.floor(Math.random() * keys.length)];
    const answers = a.tbl[key];
    const kindTxt = a.kind === 'verb' ? 'Conjugate' : a.kind === 'noun' ? 'Decline' : 'Decline the adjective';
    const ctx = csTarget(a, key);
    V().innerHTML = `${sessionHead()}<div class="card"><div class="row"><div class="prompt-kind grow">${kindTxt}${it.isNew ? ' · <span class="pill">new</span>' : ''}</div><button class="link small" id="cs">📖 ${esc(ctx.label)}</button></div>
      <div class="latin">${esc(w.la.replace(/\s\([^)]*\)$/, ''))}</div><div class="small muted">${esc(w.en.slice(0, 90))}</div>
      <div class="english" style="margin-top:14px"><b>${esc(Morph.label(a.kind, key))}</b>?</div>
      <div id="ans"><input type="text" id="typed" placeholder="Type the form" autocomplete="off" autocapitalize="off" spellcheck="false" style="margin-top:8px">
      <div class="small muted" style="margin-top:6px">Macrons optional.${/ (sum|es|est|sumus|estis|sunt|sim|sīs|sit|sīmus|sītis|sint|eram|erās|erat|erāmus|erātis|erant|essem|essēs|esset|essēmus|essētis|essent|erō|eris|erit|erimus|eritis|erunt|esse|īrī)$/.test(answers[0]) ? ' Two words, e.g. “amātus est”.' : ''}</div>
      <button class="primary big" id="chk" style="margin-top:10px">Check</button></div></div>`;
    $('#cs').onclick = () => openSheet(ctx.id);
    const go = () => {
      const v = $('#typed').value.trim();
      const ok = !!v && Morph.check(v, answers);
      $('#ans').innerHTML = `<div class="answer">${ok ? '<div class="ok">✓ Right</div>' : `<div class="no">✗ Wrong${v ? ' — you typed “' + esc(v) + '”' : ''}</div>`}
        <div class="latin">${esc(answers.join(' / '))}</div>${a.flag ? `<div class="small muted">Note: ${esc(a.flag)}</div>` : ''}
        <div class="forms">${miniTable(a, key)}</div>
        <div class="row" style="margin-top:14px">${ok ? '<button class="primary big" data-r="1">Next</button>' : '<button class="grow" data-r="1">Count as correct</button><button class="primary grow" data-r="0">Next</button>'}</div></div>`;
      bindRW(it);
    };
    $('#chk').onclick = go; $('#typed').onkeydown = e => { if (e.key === 'Enter') go(); };
    setTimeout(() => { const t = $('#typed'); if (t && matchMedia('(hover:hover)').matches) t.focus(); }, 0);
    bindStop();
  }

  // ---------- cheat sheet ----------
  const ORD = { 1: '1st', 2: '2nd', 3: '3rd', '3io': '3rd -iō', 4: '4th' };
  const IRR_ID = { 'sum': 'sum', 'possum': 'possum', 'eō': 'eo', 'ferō': 'fero', 'volō': 'volo', 'nōlō': 'volo', 'mālō': 'volo', 'fīō': 'fio', 'dō': '1' };
  // where a drill item lives in the cheat sheet
  function csTarget(a, key) {
    if (a.kind === 'verb') {
      const [mood, voice] = key.split('.');
      const base = a.conj === 'irr' ? IRR_ID[a.irr] || 'irr' : String(a.conj);
      if (mood === 'ger' || mood === 'gdv' || mood === 'sup') {
        const nm = a.conj === 'irr' ? (a.irr === 'dō' ? '1st conj.' : a.irr) : a.voice === 'dep' ? 'deponent' : ORD[a.conj] + ' conj.';
        return { id: a.voice === 'dep' ? 'cs-v-dep-ger-act' : `cs-v-${base}-ger-act`, label: `${nm} · ${Morph.MOODS[mood]}` };
      }
      const v = voice === 'dep' ? 'pas' : voice;
      const name = a.conj === 'irr' ? (a.irr === 'dō' ? '1st conj.' : a.irr) : ORD[a.conj] + ' conj.';
      return { id: `cs-v-${base}-${mood}-${v}`, label: `${name} · ${Morph.MOODS[mood]}${voice === 'pas' || voice === 'dep' ? ' passive' : ''}` };
    }
    const kc = key.split('.')[a.kind === 'noun' ? 0 : 1];
    if (kc === 'voc' || kc === 'loc') return { id: 'cs-vl', label: kc === 'voc' ? 'vocative' : 'locative' };
    if (a.kind === 'noun') {
      const id = a.decl === 'irr' ? 'irr' : a.decl === 3 && a.istem ? '3i' : String(a.decl);
      return { id: 'cs-n-' + id, label: a.decl === 'irr' ? 'irregular nouns' : ORD[a.decl] + ' declension' + (id === '3i' ? ' (i-stem)' : '') };
    }
    return { id: a.decl === 3 ? 'cs-a-3' : 'cs-a-12', label: a.decl === 3 ? '3rd-decl. adjectives' : '1st/2nd-decl. adjectives' };
  }
  const findW = h => W.find(w => Morph.plain(w.la.split(/[ ,]/)[0]) === Morph.plain(h));
  // bold the ending: the part after the longest stem the form starts with
  function hl(form, stems) {
    return form.split(' / ').map(f => {
      const st = stems.filter(s => s && f.startsWith(s) && f.length > s.length).sort((x, y) => y.length - x.length)[0];
      return st ? esc(st) + '<b>' + esc(f.slice(st.length)) + '</b>' : esc(f);
    }).join(' / ');
  }
  const cell = (a, k, stems) => a.tbl[k] ? (stems ? hl(a.tbl[k].join(' / '), stems) : esc(a.tbl[k].join(' / '))) : '–';
  function nounTable(h, note) {
    const w = findW(h); if (!w) return ''; const a = an(w); if (a.skip) return '';
    const g = (a.tbl['gen.sg'] || a.tbl['gen.pl'])[0];
    const stem = a.decl === 'irr' ? null : [g.replace(/(ae|ī|is|ūs|ēī|eī)$/, '')];
    const nums = ['sg', 'pl'].filter(n => a.tbl['nom.' + n]);
    return `<div class="cst"><div class="csh">${esc(w.la.split(',').slice(0, 2).join(','))} <span class="muted">${esc(note || '')}</span></div><table><tr><th></th>${nums.map(n => `<th>${n === 'sg' ? 'singular' : 'plural'}</th>`).join('')}</tr>
      ${Morph.CASES_X.filter(c => nums.some(n => a.tbl[c + '.' + n])).map(c => `<tr><th>${c}.</th>${nums.map(n => `<td>${cell(a, c + '.' + n, stem)}</td>`).join('')}</tr>`).join('')}</table></div>`;
  }
  function adjTable(h, note) {
    const w = findW(h); if (!w) return ''; const a = an(w); if (a.skip) return '';
    const g = a.tbl['m.gen.sg'][0], stem = [g.replace(/(īus|ī|is)$/, '')];
    const gs = ['m', 'f', 'n'].filter(x => a.tbl[x + '.nom.sg']);
    const one = n => `<table><tr><th>${n === 'sg' ? 'sg.' : 'pl.'}</th>${gs.map(x => `<th>${{ m: 'masc.', f: 'fem.', n: 'neut.' }[x]}</th>`).join('')}</tr>${Morph.CASES_X.filter(c => gs.some(x => a.tbl[x + '.' + c + '.' + n])).map(c => `<tr><th>${c}.</th>${gs.map(x => `<td>${cell(a, x + '.' + c + '.' + n, stem)}</td>`).join('')}</tr>`).join('')}</table>`;
    return `<div class="cst"><div class="csh">${esc(w.la.split(',').slice(0, 3).join(','))} <span class="muted">${esc(note || '')}</span></div>${one('sg')}<div style="height:6px"></div>${one('pl')}</div>`;
  }
  // full verb tables, grouped by mood and voice; `id` gives each group an anchor
  function verbGroups(a, stems, id) {
    const P = Morph.P, has = p => Object.keys(a.tbl).some(k => k.startsWith(p));
    const voices = ['act', 'pas', 'dep'].filter(v => has('ind.' + v) || has('sub.' + v) || has('inf.' + v));
    const fin = (m, v, ts) => `<table><tr><th></th>${ts.map(t => `<th>${Morph.TENSES[t]}</th>`).join('')}</tr>${P.map(p => `<tr><th>${p}</th>${ts.map(t => `<td>${cell(a, `${m}.${v}.${t}.${p}`, stems)}</td>`).join('')}</tr>`).join('')}</table>`;
    const out = [];
    for (const m of ['ind', 'sub', 'imp']) for (const v of voices) {
      if (!has(m + '.' + v)) continue;
      const vName = v === 'dep' ? 'deponent (passive forms)' : Morph.VOICES[v];
      const anchor = id ? ` id="${id}-${m}-${v === 'dep' ? 'pas' : v}"` : '';
      let body;
      if (m === 'imp') {
        const ps = ['2s', '3s', '2p', '3p'], ts = ['pres', 'fut'].filter(t => has(`imp.${v}.${t}`));
        body = `<table><tr><th></th>${ts.map(t => `<th>${Morph.TENSES[t]}</th>`).join('')}</tr>${ps.filter(p => ts.some(t => a.tbl[`imp.${v}.${t}.${p}`])).map(p => `<tr><th>${p}</th>${ts.map(t => `<td>${cell(a, `imp.${v}.${t}.${p}`, stems)}</td>`).join('')}</tr>`).join('')}</table>`;
      }
      else if (m === 'ind') body = fin(m, v, ['pres', 'impf', 'fut']) + '<div style="height:6px"></div>' + (has(`ind.${v}.perf`) ? fin(m, v, ['perf', 'plup', 'fperf']) : '');
      else body = fin(m, v, ['pres', 'impf']) + '<div style="height:6px"></div>' + (has(`sub.${v}.perf`) ? fin(m, v, ['perf', 'plup']) : '');
      out.push(`<div class="csg"${anchor}><div class="csh">${Morph.MOODS[m]} · ${vName}</div><div class="forms">${body}</div></div>`);
    }
    const nf = ['inf', 'ptc'].map(m => {
      const ks = Object.keys(a.tbl).filter(k => k.startsWith(m + '.')); if (!ks.length) return '';
      return `<div class="csg" ${id ? `id="${id}-${m}-act"` : ''}><div class="csh">${Morph.MOODS[m]}s</div><table>${ks.map(k => `<tr><th>${esc(Morph.label('verb', k).replace(/ (infinitive|participle)/, '').replace(' (nom. masc. sg.)', ''))}</th><td>${cell(a, k, stems)}</td></tr>`).join('')}</table></div>`;
    }).join('');
    let gx = '';
    if (has('ger.') || has('sup.')) {
      const row = (l, k) => a.tbl[k] ? `<tr><th>${l}</th><td>${cell(a, k, stems)}</td></tr>` : '';
      gx = `<div class="csg" ${id ? `id="${id}-ger-act"` : ''}><div class="csh">gerund · gerundive · supine</div><table>
        ${['gen', 'dat', 'acc', 'abl'].map(c => row('gerund ' + c + '.', 'ger.' + c)).join('')}
        ${a.tbl['gdv.m'] ? `<tr><th>gerundive</th><td>${['m', 'f', 'n'].map(g => cell(a, 'gdv.' + g, stems)).join(', ')}</td></tr>` : ''}
        ${row('supine -um', 'sup.um')}${row('supine -ū', 'sup.u')}</table></div>`;
    }
    return out.join('') + nf + gx;
  }
  function verbBlock(h, id, title, note) {
    const w = findW(h); if (!w) return ''; const a = an(w); if (a.skip) return '';
    const T = a.tbl, ind = a.voice === 'dep' ? 'dep' : 'act';
    const p1 = (T[`ind.${ind}.pres.1s`] || [''])[0];
    const stems = a.conj === 'irr' ? null : [p1.replace(/(iō|eō|ō|ior|eor|or)$/, ''), T['ind.act.perf.1s'] ? T['ind.act.perf.1s'][0].replace(/ī$/, '') : null, (T['ptc.pas.perf'] || T['ptc.dep.perf'] || [''])[0].replace(/us$/, '')];
    return `<details class="cs" id="${id}"><summary><b>${esc(title)}</b> <span class="muted">${esc(w.la.replace(/\s\([^)]*\)/g, ''))}</span></summary>${note ? `<p class="small muted">${note}</p>` : ''}${verbGroups(a, stems, id)}</details>`;
  }
  const det = (id, title, body, note) => `<details class="cs" id="${id}"><summary><b>${title}</b></summary>${note ? `<p class="small muted">${note}</p>` : ''}${body}</details>`;
  function vocLocHTML() {
    const rows = [['dominus'], ['fīlius'], ['puer'], ['deus'], ['puella'], ['rēx']].map(([h]) => { const w = findW(h); if (!w) return ''; const a = an(w); if (a.skip) return '';
      return `<tr><th>${esc(h)}</th><td>${esc(a.tbl['voc.sg'].join(' / '))}</td><td>${esc((a.tbl['voc.pl'] || ['–']).join(' / '))}</td></tr>`; }).join('');
    const adjs = ['bonus', 'ēgregius', 'meus'].map(h => { const w = findW(h); if (!w) return ''; const a = an(w); return a.skip ? '' : `<tr><th>${esc(h)}</th><td>${esc(a.tbl['m.voc.sg'].join(' / '))}</td><td>${esc(a.tbl['m.voc.pl'].join(' / '))}</td></tr>`; }).join('');
    const locs = ['domus', 'rūs', 'humus', 'bellum', 'mīlitia'].map(h => { const w = findW(h); if (!w) return ''; const a = an(w); return a.skip || !a.tbl['loc.sg'] ? '' : `<tr><th>${esc(h)}</th><td>${esc(a.tbl['loc.sg'].join(' / '))}</td></tr>`; }).join('');
    return `<div class="cst"><div class="csh">Vocative</div><table><tr><th></th><th>singular</th><th>plural</th></tr>${rows}${adjs}</table></div>
      <div class="cst"><div class="csh">Locative <span class="muted">(“at / in”; only these words on the list take it)</span></div><table>${locs}</table>
      <p class="small muted">Rule: 1st/2nd-decl. singular = genitive (Rōmae, bellī); plural and 3rd decl. = ablative (Athēnīs, rūre / rūrī). Diederich’s list has no city names, so city locatives aren’t drilled.</p></div>`;
  }
  function gxSummary() {
    const L = [['amō', '1st'], ['moneō', '2nd'], ['regō', '3rd'], ['capiō', '3rd -iō'], ['audiō', '4th'], ['hortor', 'deponent']];
    const rows = L.map(([h, l]) => { const w = findW(h); if (!w) return []; const a = an(w), T = a.tbl, v = a.voice === 'dep' ? 'dep' : 'act', g = k => T[k] ? esc(T[k][0]) : '–';
      return [`<tr><th>${l}</th><td>${g('ger.gen')}</td><td>${g('gdv.m')}</td><td>${g('sup.um')}</td></tr>`, `<tr><th>${l}</th><td>${g(`imp.${v}.fut.2s`)}</td><td>${g(`imp.${v}.fut.3p`)}</td></tr>`]; });
    return `<div class="cst"><table><tr><th></th><th>gerund (gen.)</th><th>gerundive</th><th>supine</th></tr>${rows.map(r => r[0] || '').join('')}</table></div>
      <div class="cst"><div class="csh">Future imperative</div><table><tr><th></th><th>2nd sg</th><th>3rd pl</th></tr>${rows.map(r => r[1] || '').join('')}</table>
      <p class="small muted">Future imperative active: -tō, -tō, -tōte, -ntō (amātō, amantō); passive: -tor, -tor, -ntor. Irregular: estō / suntō, ītō / euntō, fertō / feruntō, nōlītō / nōluntō. No gerund or supine for sum, possum, nōlō, mālō, fīō; eō has a gerund (eundī) and supine (itum) but no gerundive; ferō has ferendus.</p></div>`;
  }
  let CHEAT = null;
  function cheatHTML() {
    if (CHEAT) return CHEAT;
    CHEAT = `<p class="small muted">Endings are in <b>bold</b>. Tap a heading to open it.</p>
    <div class="chips jump"><a href="#cs-nouns">Nouns</a><a href="#cs-adjs">Adjectives</a><a href="#cs-verbs">Verbs</a><a href="#cs-irr">Irregular verbs</a></div>
    <h2 id="cs-nouns">Nouns</h2>
    ${det('cs-n-1', '1st declension', nounTable('puella', 'f.'), 'Mostly feminine. Gen. sg. -ae.')}
    ${det('cs-n-2', '2nd declension', nounTable('dominus', 'm.') + nounTable('puer', 'm., keeps e') + nounTable('ager', 'm., drops e') + nounTable('bellum', 'neuter'), 'Gen. sg. -ī. Neuters: nom. = acc., plural -a.')}
    ${det('cs-n-3', '3rd declension', nounTable('rēx', 'm.') + nounTable('nōmen', 'neuter'), 'Gen. sg. -is. Consonant stems: gen. pl. -um.')}
    ${det('cs-n-3i', '3rd declension i-stems', nounTable('cīvis', 'm./f., same syllables') + nounTable('urbs', 'f., two consonants') + nounTable('mare', 'neuter in -e') + nounTable('animal', 'neuter in -al'), 'Gen. pl. -ium. Neuter i-stems also have abl. sg. -ī and nom./acc. pl. -ia.')}
    ${det('cs-n-4', '4th declension', nounTable('manus', 'f.') + nounTable('cornū', 'neuter'), 'Gen. sg. -ūs.')}
    ${det('cs-n-5', '5th declension', nounTable('rēs', 'f.') + nounTable('diēs', 'm.'), 'Gen. sg. -eī / -ēī.')}
    ${det('cs-n-irr', 'Irregular nouns', nounTable('domus') + nounTable('vīs') + nounTable('deus'))}
    ${det('cs-vl', 'Vocative &amp; locative', vocLocHTML(), 'Vocative (calling someone): same as the nominative, except 2nd-declension masculine -us → -e (domine, bone) and -ius → -ī (fīlī; common nouns also -ie). deus → deus (pl. dī); meus → mī. Plural vocative = nominative plural.')}
    <h2 id="cs-adjs">Adjectives</h2>
    ${det('cs-a-12', '1st/2nd declension', adjTable('bonus') + adjTable('līber', '-er, keeps e') + adjTable('pulcher', '-er, drops e') + adjTable('tōtus', 'gen. -īus, dat. -ī'), 'Feminine like puella; masculine and neuter like dominus and bellum. ūnus, sōlus, tōtus, nūllus, alius etc. have gen. sg. -īus and dat. sg. -ī.')}
    ${det('cs-a-3', '3rd declension', adjTable('ācer', 'three endings') + adjTable('omnis', 'two endings') + adjTable('ingēns', 'one ending') + adjTable('melior', 'comparative (not i-stem)'), 'i-stems: abl. sg. -ī, gen. pl. -ium, neut. pl. -ia. Comparatives use -e, -um, -a.')}
    <h2 id="cs-verbs">Verbs</h2>
    <p class="small muted">Perfect passive forms (and all deponent perfects) = perfect participle + a form of <i>sum</i>; the participle agrees with the subject (amātus / amāta / amātum est).</p>
    ${det('cs-v-gx', 'At a glance: gerund, gerundive, supine, future imperative', gxSummary(), 'Gerund = verbal noun (amandī “of loving”); no nominative — use the infinitive. Gerundive = passive verbal adjective, “to be …” (amandus, -a, -um), declined like bonus; deponent gerundives are passive in meaning too (hortandus “to be encouraged”). Supine in -um after verbs of motion (vēnit spectātum), in -ū with adjectives (facile dictū). Future passive infinitive = supine + īrī (amātum īrī).')}
    ${verbBlock('amō', 'cs-v-1', '1st conjugation')}
    ${verbBlock('moneō', 'cs-v-2', '2nd conjugation')}
    ${verbBlock('regō', 'cs-v-3', '3rd conjugation', 'dīcō, dūcō and faciō have short imperatives: dīc, dūc, fac.')}
    ${verbBlock('capiō', 'cs-v-3io', '3rd conjugation -iō')}
    ${verbBlock('audiō', 'cs-v-4', '4th conjugation')}
    ${verbBlock('hortor', 'cs-v-dep', 'Deponent verbs', 'Deponents use passive endings with active meaning, in every conjugation: hortor (1st), vereor (2nd), loquor (3rd), patior (3rd -iō), experior (4th). They keep active participles (hortāns, hortātūrus) and the future active infinitive.')}
    <h2 id="cs-irr">Irregular verbs</h2>
    ${verbBlock('sum', 'cs-v-sum', 'sum — be', 'Compounds (absum, adsum, prōsum…) add a prefix; prōsum inserts d before e: prōdest.')}
    ${verbBlock('possum', 'cs-v-possum', 'possum — be able')}
    ${verbBlock('eō', 'cs-v-eo', 'eō — go', 'No personal passive. Compounds: redeō, exeō, pereō…')}
    ${verbBlock('ferō', 'cs-v-fero', 'ferō — carry')}
    ${verbBlock('volō', 'cs-v-volo', 'volō — want') + verbBlock('nōlō', 'cs-v-nolo', 'nōlō — not want') + verbBlock('mālō', 'cs-v-malo', 'mālō — prefer')}
    ${verbBlock('fīō', 'cs-v-fio', 'fīō — become, be made', 'Used as the passive of faciō in the present system.')}`;
    return CHEAT;
  }
  function gotoAnchor(root, id) {
    let el = id && root.querySelector('#' + CSS.escape(id));
    if (!el && id) el = root.querySelector('#' + CSS.escape(id.split('-').slice(0, 3).join('-')));   // fall back to the block
    if (!el) return;
    for (let p = el; p && p !== root; p = p.parentElement) if (p.tagName === 'DETAILS') p.open = true;
    if (el.tagName === 'DETAILS') el.open = true;
    el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1600);
    el.scrollIntoView({ block: 'start' });
  }
  function bindJump(root) { root.querySelectorAll('.jump a').forEach(x => x.onclick = e => { e.preventDefault(); gotoAnchor(root, x.getAttribute('href').slice(1)); }); }
  function renderCheat() {
    $('#sub').textContent = 'Cheat sheet';
    V().innerHTML = `<div class="card sheet">${cheatHTML()}</div>`;
    bindJump(V());
  }
  function openSheet(id) {
    closeSheet();
    const o = document.createElement('div'); o.id = 'overlay';
    o.innerHTML = `<div class="ovtop"><b class="grow">Cheat sheet</b><button id="ovx">Back to drill ✕</button></div><div class="ovbody sheet">${cheatHTML()}</div>`;
    document.body.appendChild(o); document.body.style.overflow = 'hidden';
    $('#ovx').onclick = closeSheet; bindJump(o.querySelector('.ovbody'));
    setTimeout(() => gotoAnchor(o.querySelector('.ovbody'), id), 0);
  }
  function closeSheet() { const o = $('#overlay'); if (o) o.remove(); document.body.style.overflow = ''; }

  // ---------- quiz ----------
  let quizPool = 250;
  function renderQuiz() {
    $('#sub').textContent = 'Multiple choice';
    V().innerHTML = `<div class="card"><div class="prompt-kind">Quick quiz · 10 questions</div><p class="muted">Pick the English meaning. Draw words from the most frequent:</p>
      <div class="seg">${[100, 250, 500, 0].map(n => `<button data-n="${n}" class="${n === quizPool ? 'on' : ''}">${n || 'All'}</button>`).join('')}</div>
      <button class="primary big" id="qs" style="margin-top:14px">Start quiz</button><p class="small muted">Quiz results don’t change your review schedule.</p></div>`;
    document.querySelectorAll('.seg button').forEach(b => b.onclick = () => { quizPool = +b.dataset.n; renderQuiz(); });
    $('#qs').onclick = () => {
      const pool = quizPool ? W.slice(0, quizPool) : W;
      runQuiz(shuffle(pool.slice()).slice(0, 10), pool);
    };
  }
  function runQuiz(qs, pool) {
    let i = 0, score = 0;
    const short = s => s.length > 90 ? s.slice(0, 88) + '…' : s;
    const ask = () => {
      if (i >= qs.length) {
        V().innerHTML = `<div class="card done"><div class="check">${score >= 8 ? '★' : '✓'}</div><h2>${score} / ${qs.length}</h2><button class="primary big" id="again">Another quiz</button></div>`;
        $('#again').onclick = renderQuiz; return;
      }
      const w = qs[i];
      let same = pool.filter(x => x.pos === w.pos && x.id !== w.id && x.en !== w.en);
      if (same.length < 3) same = pool.filter(x => x.id !== w.id);
      const opts = shuffle([w, ...shuffle(same.slice()).slice(0, 3)]);
      V().innerHTML = `<div class="row small muted"><span class="grow">Question ${i + 1} / ${qs.length}</span><span>Score ${score}</span></div>
        <div class="card"><div class="latin">${esc(w.la)}</div><span class="pill">${POS_SHORT[w.pos]}</span>
        <div class="opts">${opts.map(o => `<button data-id="${o.id}">${esc(short(o.en))}</button>`).join('')}</div><div id="qn"></div></div>`;
      document.querySelectorAll('.opts button').forEach(b => b.onclick = () => {
        const right = +b.dataset.id === w.id; if (right) score++;
        document.querySelectorAll('.opts button').forEach(x => { x.disabled = true; if (+x.dataset.id === w.id) x.classList.add('right'); });
        if (!right) b.classList.add('wrong');
        $('#qn').innerHTML = `<button class="primary big" style="margin-top:12px" id="qnext">${i + 1 < qs.length ? 'Next' : 'Finish'}</button>`;
        $('#qnext').onclick = () => { i++; ask(); };
      });
    };
    ask();
  }

  // ---------- word list ----------
  let listQ = '', listSort = 'rank', listN = 100;
  function renderList() {
    $('#sub').textContent = W.length + ' words';
    V().innerHTML = `<div style="position:sticky;top:0;background:var(--bg);padding:6px 0;z-index:2"><input type="search" id="q" placeholder="Search Latin or English" value="${esc(listQ)}">
      <div class="row" style="margin-top:8px"><select id="srt"><option value="rank">Sort: frequency rank</option><option value="az">Sort: A–Z</option><option value="diederich">Sort: Diederich’s order (by topic)</option></select></div></div>
      <ul class="list" id="ul"></ul><div id="moreBox"></div>`;
    $('#srt').value = listSort;
    $('#q').oninput = e => { listQ = e.target.value; listN = 100; fill(); };
    $('#srt').onchange = e => { listSort = e.target.value; listN = 100; fill(); };
    fill();
  }
  function fill() {
    const q = listQ.trim(), nq = Morph.norm(q), lq = q.toLowerCase();
    let rows = q ? W.filter(w => Morph.norm(w.la).includes(nq) || w.en.toLowerCase().includes(lq)) : W.slice();
    if (listSort === 'az') rows.sort((a, b) => Morph.norm(a.la).localeCompare(Morph.norm(b.la)));
    else if (listSort === 'diederich') rows.sort((a, b) => a.id - b.id);
    $('#ul').innerHTML = rows.slice(0, listN).map(w => `<li data-id="${w.id}"><span class="rk">${rankTxt(w)}</span><div class="la">${esc(w.la)}</div><div class="en">${esc(w.en)}</div><div class="det"></div></li>`).join('') || '<li class="muted">No matches.</li>';
    $('#moreBox').innerHTML = rows.length > listN ? `<button class="big" id="lm" style="margin-top:10px">Show more (${rows.length - listN})</button>` : '';
    if ($('#lm')) $('#lm').onclick = () => { listN += 200; fill(); };
    document.querySelectorAll('#ul li[data-id]').forEach(li => li.onclick = e => {
      if (e.target.closest('.det')) return;
      const d = li.querySelector('.det'); d.innerHTML = d.innerHTML ? '' : detail(BY[li.dataset.id]);
    });
  }
  function status(k) { const c = S.cards[k]; if (!c) return 'not started'; const n = c.due - today(); return n <= 0 ? 'due now' : 'next in ' + n + (n === 1 ? ' day' : ' days'); }
  function detail(w) {
    const a = an(w);
    let forms = '';
    if (!a.skip) {
      const T = (cols, rows, get) => `<table><tr><th></th>${cols.map(c => `<th>${c}</th>`).join('')}</tr>${rows.map(r => `<tr><th>${r}</th>${cols.map(c => `<td>${esc((get(r, c) || ['–']).join(' / '))}</td>`).join('')}</tr>`).join('')}</table>`;
      if (a.kind === 'verb') forms = verbGroups(a, null, null) + (a.noPassiveWhy ? `<div class="small muted">No passive: ${esc(a.noPassiveWhy)}.</div>` : '') + (a.note ? `<div class="small muted">${esc(a.note)}</div>` : '');
      else if (a.kind === 'noun') forms = T(['sg', 'pl'].filter(n => a.tbl['nom.' + n] || a.tbl['gen.' + n]), Morph.CASES_X.filter(r => a.tbl[r + '.sg'] || a.tbl[r + '.pl']), (r, c) => a.tbl[r + '.' + c]);
      else forms = ['sg', 'pl'].map(n => T(['m', 'f', 'n'].filter(g => a.tbl[g + '.nom.' + n]), Morph.CASES_X.filter(r => a.tbl['m.' + r + '.' + n] || a.tbl['f.' + r + '.' + n]), (r, g) => a.tbl[g + '.' + r + '.' + n])).join('<div style="height:6px"></div>');
    }
    return `<div class="answer small"><div>Diederich section ${w.s || '–'}.${w.ss || ''} · frequency ${w.f != null ? w.f : '–'} · ${POS_SHORT[w.pos]}</div>
      <div>Latin→English: ${status('r:' + w.id)} · English→Latin: ${status('p:' + w.id)}${a.skip ? '' : ' · drill: ' + status(unitOf(w, a))}</div>
      ${a.skip ? `<div class="muted">Not in form drills: ${esc(a.skip)}</div>` : `<div class="forms">${forms}</div>`}
      ${a.flag ? `<div class="muted">Note: ${esc(a.flag)}</div>` : ''}</div>`;
  }

  // ---------- about / settings ----------
  function renderAbout() {
    $('#sub').textContent = 'About';
    const drillWords = W.filter(w => !an(w).skip).length;
    V().innerHTML = `<div class="card"><h2 style="margin-top:0">Settings</h2>
      <div class="small muted">New flashcard words per day</div><div class="seg" id="snew">${[5, 10, 20].map(n => `<button data-n="${n}" class="${S.set.newPerDay === n ? 'on' : ''}">${n}</button>`).join('')}</div>
      <p class="small muted">Drill settings (which forms, new words per day) are on the Drills tab.</p>
      <div class="row wrap" style="margin-top:14px"><button class="grow" id="exp">Export progress</button><button class="grow" id="imp">Import</button><button class="grow" id="rst">Reset</button></div>
      <input type="file" id="impf" accept="application/json" hidden></div>
      <div class="card"><h2 style="margin-top:0">How it works</h2>
      <p><b>Today</b> is flashcards: a few new words each day plus whatever is due. Answer <b>Right</b> or <b>Wrong</b> (or type the Latin and it’s checked for you). Cards move through Leitner boxes: each right answer moves a card up a box and spaces it out further (1, 3, 7, 14, 30, 60, 120 days); a wrong answer sends it back to the start and shows it again in a few cards. Latin→English and English→Latin are scheduled separately; the English→Latin card unlocks the day after you first get a word right.</p>
      <p><b>Drills</b> ask for one form at a time (macrons optional) and check your answer. Choose the moods, voices, tenses, cases and numbers you want. Forms are generated from the dictionary entry using standard paradigms; ${drillWords} of ${W.length} words are drillable. Words that can’t be generated reliably (defective, impersonal, indeclinable words, some irregulars) are left out and say so in the word list. If you think the app marked you wrong unfairly, tap <b>Count as correct</b>.</p>
      <p>The <b>Cheat sheet</b> has endings tables for every declension and conjugation the drills use, plus the main irregular verbs; open it from any drill question.</p>
      <p>Your progress stays on this device (localStorage). No account, no tracking; works offline once installed.</p></div>
      <div class="card"><h2 style="margin-top:0">Sources &amp; credits</h2>
      <p class="small">Word list: <b>Paul B. Diederich</b>, <i>The Frequency of Latin Words and Their Endings</i> (University of Chicago, 1939) — the basic vocabulary of about 1,500 words grouped by topic.</p>
      <p class="small">Entries and English glosses: the “Lodge edition” of Diederich’s list compiled by <b>Carolus Raeticus</b> (<a href="https://hiberna-cr.wikidot.com/" rel="noopener">Hiberna Caroli Raetici</a>), with meanings from Gonzalez Lodge, <i>The Vocabulary of High School Latin</i> (1922) and J. T. White (1904). Licensed <a href="https://creativecommons.org/licenses/by-sa/3.0/" rel="noopener">CC BY‑SA 3.0</a>; this app’s word data is shared under the same license. Frequency ranks come from Diederich’s frequency counts (DWF.csv) published on the same site.</p>
      <p class="small">List size cross-checked against <b>John Muccigrosso</b>’s <a href="https://github.com/Jmuccigr/Latin_vocabulary" rel="noopener">Latin_vocabulary</a> data (Diederich: 1,474 items).</p>
      <p class="small muted">Made by Eric Ianni. Source code: <a href="https://github.com/ericianni/latin-diederich-vocab" rel="noopener">github.com/ericianni/latin-diederich-vocab</a>.</p></div>`;
    document.querySelectorAll('#snew button').forEach(b => b.onclick = () => { S.set.newPerDay = +b.dataset.n; save(); renderAbout(); });
    $('#exp').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(S)], { type: 'application/json' })); a.download = 'latin1400-progress.json'; a.click(); };
    $('#imp').onclick = () => $('#impf').click();
    $('#impf').onchange = e => { const f = e.target.files[0]; if (!f) return; f.text().then(t => { try { const s = JSON.parse(t); if (!s.cards) throw 0; S = fix(s); save(); UNITS = buildUnits(); alert('Progress imported.'); renderAbout(); } catch (x) { alert('That file is not a Latin 1400 progress export.'); } }); };
    $('#rst').onclick = () => { if (confirm('Erase all progress on this device?')) { S = fix({}); save(); UNITS = buildUnits(); renderAbout(); } };
  }

  // ---------- boot ----------
  document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => setTab(b.dataset.tab));
  fetch('data/words.json').then(r => r.json()).then(all => {
    W = all.filter(w => !w.d).sort((a, b) => (a.r || 1e9) - (b.r || 1e9) || a.id - b.id);
    W.forEach(w => { BY[w.id] = w; });
    UNITS = buildUnits();
    const t = (location.hash || '').slice(1);
    save();   // persist any v1 -> v2 migration
    setTab(['drills', 'cheat', 'quiz', 'list', 'about'].includes(t) ? t : 'today');
  }).catch(() => { V().innerHTML = '<p class="card">Could not load the word list. Check your connection and reload.</p>'; });
  // No service worker inside the Capacitor WebView: assets are already bundled in the APK.
  if ('serviceWorker' in navigator && !window.Capacitor) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
})();
