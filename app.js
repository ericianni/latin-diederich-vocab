/* Latin 1400 — Diederich vocabulary trainer. Everything lives in localStorage; no backend. */
(function () {
  'use strict';
  const KEY = 'latin1400.v1';
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const today = () => { const d = new Date(); return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000); };
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const POS_SHORT = { noun: 'noun', verb: 'verb', adjective: 'adj.', adverb: 'adv.', conjunction: 'conj.', preposition: 'prep.', pronoun: 'pron.', indeclinable: 'indecl.', interjection: 'interj.', prefix: 'prefix' };
  const REVIEW_CAP = 60;

  // ---------- state ----------
  // Cards: { box: 0-7, due: local day number }. Leitner boxes: right moves a card up one box, wrong sends it to box 0.
  const INT = [0, 1, 3, 7, 14, 30, 60, 120];   // days until the next review after reaching box n
  const DF = { types: ['verb', 'noun', 'adj', 'pron'], moods: ['ind'], voices: ['act', 'dep'], tenses: ['pres', 'impf', 'fut', 'perf', 'plup', 'fperf'], persons: ['1', '2', '3'], vnums: ['sg', 'pl'], conj: ['1', '2', '3', '3io', '4', 'irr'],
    cases: ['nom', 'gen', 'dat', 'acc', 'abl'], nums: ['sg', 'pl'], decl: ['1', '2', '3', '4', '5', 'irr'] };
  let S = load();
  function load() { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.cards) return fix(s); } catch (e) { /* fresh */ } return fix({}); }
  function boxFromIvl(c) { const i = c.ivl || 0; if (i <= 0) return c.reps > 0 ? 1 : 0; return i <= 2 ? 1 : i <= 6 ? 2 : i <= 13 ? 3 : i <= 29 ? 4 : i <= 59 ? 5 : i <= 119 ? 6 : 7; }
  function fix(s) {
    s.cards = s.cards || {}; s.day = s.day || {};
    s.set = Object.assign({ newPerDay: 10, strictMac: false, dmode: 'type', dlen: 10, andMore: true }, s.set || {});
    if (!s.v || s.v < 2) {                     // v1 (SM-2, combined drills) -> v2 (Leitner, separate drills)
      for (const k of Object.keys(s.cards)) {
        const c = s.cards[k];
        if (c.box == null) s.cards[k] = { box: boxFromIvl(c), due: c.due != null ? c.due : today() };
        const m = k.match(/^d:(\d+):[pf]$/);    // verb drills were split into present / perfect units; now one unit per verb
        if (m) { const nk = 'd:' + m[1] + ':v', o = s.cards[nk], n = s.cards[k]; s.cards[nk] = o ? { box: Math.min(o.box, n.box), due: Math.min(o.due, n.due) } : n; delete s.cards[k]; }
      }
      s.v = 2;
    }
    s.set.df = Object.assign({}, DF, DrillPick.SENT_DF, s.set.df || {});
    s.lessons = s.lessons || {};
    if (!s.ds) s.ds = { w: {} };        // words seen in drills (id -> times); s.ds.f was v9's form list
    s.dst = s.dst || {};                       // drill stats per form combination: see drillpick.js
    s.dq = s.dq || 0;                          // drill answers so far (for "not asked recently")
    if (!s.v || s.v < 3) {                     // v3: drills are free practice; the old per-word drill schedule (d: cards) goes
      for (const k of Object.keys(s.cards)) { const m = k.match(/^d:(\d+):/); if (m) { s.ds.w[m[1]] = s.ds.w[m[1]] || 1; delete s.cards[k]; } }
      for (const [k, n] of Object.entries(s.ds.f || {})) { const c = k.split(':')[0]; if (!s.dst[c]) s.dst[c] = { r: 0, n: 0, a: n, ok: 0, t: Date.now() }; }   // seen, accuracy unknown
      delete s.set.drillNew; s.v = 3;
    }
    if (s.v < 4) {                              // v4: pronouns added; on wherever nouns or adjectives already were
      const t = s.set.df.types; if (!t.includes('pron') && (t.includes('noun') || t.includes('adj'))) t.push('pron');
      s.v = 4;
    }
    delete s.ds.f;
    return s;
  }
  let TEST = null;   // Test mode: { id, snap }. Nothing is saved while it is on; leaving it restores the progress snapshot.
  function save() { if (TEST) return; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage full or private mode */ } }
  function day() { const t = today(); if (S.day.d !== t) S.day = { d: t, nv: 0, nd: 0, extra: 0, dx: 0, dn: 0 }; return S.day; }
  function sched(c, right) {
    const t = today();
    if (!right) { c.box = 0; c.due = t; } else { c.box = Math.min(7, (c.box || 0) + 1); c.due = t + INT[c.box]; }
    return c;
  }
  const newCard = () => ({ box: 0, due: today() });
  const nextTxt = k => { const b = Math.min(7, ((S.cards[k] || {}).box || 0) + 1), n = INT[b]; return n === 1 ? 'tomorrow' : n < 31 ? 'in ' + n + ' days' : 'in ' + Math.round(n / 30) + ' mo'; };

  // ---------- data ----------
  let W = [], BY = {}, UNITS = new Map();
  const AN = {};
  const an = w => AN[w.id] || (AN[w.id] = ['verb', 'noun', 'adjective', 'pronoun'].includes(w.pos) ? Morph.analyze(w) : { skip: 'not drilled (' + w.pos + ')' });
  const rankTxt = w => w.r ? '#' + w.r : '—';

  function heads(la) {
    const h = la.split(',')[0];
    const out = new Set();
    const noNotes = h.replace(/\s+\([^)]*\)/g, '');
    for (const alt of noNotes.split(/\s+or\s+|\//)) { out.add(alt.replace(/\([^)]*\)/g, '')); out.add(alt.replace(/[()]/g, '')); }
    const m = h.match(/\s\((?:or\s+)?([^)]*)\)/); if (m && !/\s/.test(m[1].trim())) out.add(m[1]);
    return [...out].map(s => s.trim()).filter(Boolean);
  }
  // Dictionary line with alternate spellings removed. Principal parts stay; (or honōs), (assum), c(h)arta do not.
  function shownLa(la) {
    let s = String(la).replace(/^c\(h\)arta/, 'charta').replace(/^prosper\(us\)/, 'prosperus');
    s = s.replace(/\s+\([^)]*\)/g, (m) => {
      const inner = m.slice(m.indexOf('(') + 1, -1).trim();
      if (/^or\s+/.test(inner) || !/\s/.test(inner) || /pl\.\s+\S+$/.test(inner)) return '';
      return m;
    });
    s = s.replace(/^(\S+)\s+or\s+\S+/, '$1');
    return s.replace(/\s{2,}/g, ' ').replace(/\s+,/g, ',').trim();
  }
  function headStandard(w) {
    const a = an(w);
    if (a && a.tbl) {
      const k = a.kind === 'verb' ? (a.voice === 'dep' ? 'ind.dep.pres.1s' : 'ind.act.pres.1s')
        : a.tbl['nom.sg'] ? 'nom.sg' : a.tbl['m.nom.sg'] ? 'm.nom.sg' : a.tbl['nom.pl'] ? 'nom.pl' : a.tbl['m.nom.pl'] ? 'm.nom.pl' : a.headKey;
      if (k && a.tbl[k]) return Morph.standard(a.tbl[k]);
    }
    return shownLa(w.la).split(/[ ,]/)[0];
  }

  // ---------- drill filters ----------
  const conjKey = a => a.conj === 'irr' ? 'irr' : String(a.conj);
  function keyOk(a, key, df) {
    const k = key.split('.');
    if (a.kind === 'verb') {
      const [mood, voice, tense] = k;
      if (key === 'ind.act.pres.1s' || key === 'ind.dep.pres.1s') return false;      // that's the headword
      if (mood === 'ger' || mood === 'gdv' || mood === 'sup') return df.moods.includes(mood) && Identify.vCaseOk(key, df);   // no voice / tense choice; gerund & supine cases follow the Case chips
      return df.moods.includes(mood) && df.voices.includes(voice) && df.tenses.includes(tense) && Identify.finiteOk(key, df);   // person & number: finite forms only
    }
    if (a.kind === 'noun') return key !== 'nom.sg' && df.cases.includes(k[0]) && df.nums.includes(k[1]);
    if (a.kind === 'pron' && a.pron === 'pers') return key !== a.headKey && df.cases.includes(k[0]) && df.nums.includes(k[1]);
    return key !== 'm.nom.sg' && df.cases.includes(k[1]) && df.nums.includes(k[2]);
  }
  function wordOk(a, df) {
    if (a.skip) return false;
    if (a.kind === 'verb') return df.types.includes('verb') && df.conj.includes(conjKey(a));
    if (a.kind === 'noun') return df.types.includes('noun') && df.decl.includes(String(a.decl));
    if (a.kind === 'pron') return df.types.includes('pron');      // pronouns follow Case and Number, not Declension
    return df.types.includes('adj') && (a.decl === 3 ? df.decl.includes('3') : df.decl.includes('1') || df.decl.includes('2'));
  }
  const drillKeys = a => Object.keys(a.tbl).filter(k => keyOk(a, k, S.set.df));
  // UNITS: every form combination the settings allow ("paradigm|key", e.g. "n3|dat.pl") -> the words that have it
  function buildUnits() {
    const u = new Map();
    for (const w of W) { const a = an(w); if (!wordOk(a, S.set.df)) continue; const g = pdg(a);
      for (const k of drillKeys(a)) { const c = g + '|' + k; if (!u.has(c)) u.set(c, []); u.get(c).push(w.id); } }
    return u;
  }
  const kindOfC = c => ({ v: 'verb', n: 'noun', a: 'adj', p: 'pron' })[c[0]];
  // drill share: personal pronouns count with the nouns, hic / ille with the adjectives (each pronoun paradigm is one small group)
  const shareKind = c => c[0] === 'p' ? (c[1] === 'p' ? 'noun' : 'adj') : kindOfC(c);
  const groupWords = () => { const g = {}; for (const [c, ids] of UNITS) { const k = c.split('|')[0]; (g[k] = g[k] || new Set()); ids.forEach(i => g[k].add(i)); } return g; };
  function entries(only) {
    const gw = groupWords(), out = [];
    for (const c of UNITS.keys()) if (!only || only.has(c)) { const g = c.split('|')[0]; out.push({ c, kind: shareKind(c), g, nw: gw[g].size }); }
    return out;
  }
  // next drill question: a combo (weighted toward weak, unseen and not-recent), then a word that has it
  function drillQ(only, avoidC, avoidW) {
    const es = entries(only); if (!es.length) return null;
    const c = DrillPick.pickCombo(es, S.dst, { q: S.dq, exclude: avoidC });
    const ids = UNITS.get(c);
    const id = DrillPick.pickWord(ids.map(i => ({ id: i, r: BY[i].r, fc: !!S.cards['r:' + i] })), avoidW);
    return { c, id, key: c.slice(c.indexOf('|') + 1) };
  }

  // ---------- queues ----------
  function dueKeys(prefixRe, cap, allow) {
    const t = today();
    return Object.keys(S.cards).filter(k => prefixRe.test(k) && S.cards[k].due <= t && (!allow || allow.has(k))).sort((a, b) => S.cards[a].due - S.cards[b].due).slice(0, cap);
  }
  function newWords(n) { const out = []; for (const w of W) { if (out.length >= n) break; if (!S.cards['r:' + w.id]) out.push('r:' + w.id); } return out; }
  const vNewLeft = () => { const d = day(); return Math.max(0, S.set.newPerDay + (d.extra || 0) - d.nv); };
  function counts() { return { vDue: dueKeys(/^[rp]:/, REVIEW_CAP).length, vNew: newWords(vNewLeft()).length }; }

  let Q = null; // current session: vocab {kind, items:[{k,isNew}], done, total}; drill {kind, len, done, total, asked, ok, redo:[{c, at, avoid}], only}
  function startDrills(only) {
    Q = { kind: 'drill', len: S.set.dlen, done: 0, total: S.set.dlen, asked: 0, ok: 0, redo: [], only: only || null, recent: [], mix: DrillPick.sentenceMixStart(Math.random) };
    if (DrillPick.sentenceSettings(S.set.df).on && !window.LatinEngine) loadSentences().then(() => { if (Q && Q.kind === 'drill') next(); }, () => { if (Q && Q.kind === 'drill') next(); });
    else next();
  }
  function startSession(kind) {
    if (kind === 'drill') return startDrills();
    const items = [];
    if (kind === 'vocab') {
      const rev = dueKeys(/^[rp]:/, REVIEW_CAP).map(k => ({ k }));
      const nw = newWords(vNewLeft()).map(k => ({ k, isNew: true }));
      // weave one new card after every two reviews
      while (rev.length || nw.length) { if (rev.length) items.push(rev.shift()); if (rev.length) items.push(rev.shift()); if (nw.length) items.push(nw.shift()); }
    }
    Q = { kind, items, done: 0, total: items.length };
    next();
  }
  function grade(item, right) {
    const d = day();
    if (item.sent) {                           // one sentence is one drill answer; identify writes the asked form back
      const st = DrillPick.applySentenceGrade({ dn: d.dn || 0, dq: S.dq || 0, dst: S.dst }, item, right);
      d.dn = st.dn; S.dq = st.dq;
      save(); Q.done++; if (right) Q.ok++;
      return next();
    }
    if (item.c) {                              // drill: update the combo's stats; a wrong answer comes back with another word
      S.dq++; S.dst[item.c] = DrillPick.record(S.dst[item.c], right, Date.now(), S.dq);
      S.ds.w[item.id] = (S.ds.w[item.id] || 0) + 1; d.dn = (d.dn || 0) + 1;
      save(); Q.done++; if (right) Q.ok++;
      if (!right && !item.redo) { Q.redo.push({ c: item.c, at: Q.done + 3, avoid: item.id }); Q.total++; }   // one re-ask per miss, so a set always ends
      return next();
    }
    const k = item.k;
    const first = !S.cards[k];
    S.cards[k] = sched(S.cards[k] || newCard(), right);
    if (first && item.isNew) d.nv++;
    if (k[0] === 'r' && right && !S.cards['p' + k.slice(1)]) { const p = newCard(); p.due = today() + 1; S.cards['p' + k.slice(1)] = p; }
    save();
    Q.done++;
    if (!right && !TEST) { Q.items.splice(Math.min(3, Q.items.length), 0, { k }); Q.total++; }
    next();
  }
  function next() {
    if (Q && Q.kind === 'drill') return nextDrill();
    const it = Q && Q.items.shift();
    if (!it) { Q = null; return TEST ? renderTest() : renderToday(); }
    renderVocab(it);
  }
  function nextDrill() {
    let i = Q.redo.findIndex(r => r.at <= Q.done), it = null;
    if (i < 0 && Q.asked >= Q.len && Q.redo.length) i = 0;           // finish re-asks before the set ends
    if (i >= 0) { const r = Q.redo.splice(i, 1)[0]; const ids = UNITS.get(r.c);
      if (ids) { const id = DrillPick.pickWord(ids.map(x => ({ id: x, r: BY[x].r, fc: !!S.cards['r:' + x] })), new Set([r.avoid])); it = { c: r.c, id, key: r.c.slice(r.c.indexOf('|') + 1), redo: true }; }
      else Q.total--; }
    if (!it && Q.asked < Q.len) {
      const sentOn = DrillPick.sentenceSettings(S.set.df).on && !!window.LatinEngine;
      const mix = DrillPick.sentenceMixNext(Q.mix, sentOn, Math.random);
      Q.mix = mix.state;
      if (mix.take) {
        const made = DrillPick.pickDrillSentence(LatinEngine, { wordsById: self.LatinWords, seen: DrillPick.seenWordIds(S), df: S.set.df, stats: S.dst, allow: Q.only, rnd: Math.random, q: S.dq });
        if (made) { it = made; Q.asked++; }
      }
      if (!it) { const q = drillQ(Q.only, new Set(Q.recent.map(x => x.c)), new Set(Q.recent.map(x => x.id))); if (q) { it = q; Q.asked++; } }
    }
    if (!it) { if (Q.redo.length) return nextDrill(); const fin = { n: Q.done, ok: Q.ok, only: Q.only }; Q = null; if (TEST) return renderTest(fin); drillEnd = fin; return renderDrills(); }
    if (!it.sent) Q.recent = Q.recent.concat({ c: it.c, id: it.id }).slice(-3);
    renderDrill(it);
  }

  // ---------- views ----------
  const V = () => $('#view');
  let TAB = 'today';
  function setTab(t) {
    TAB = t;
    document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === (t === 'quiz' ? 'today' : t)));
    Q = null; closeSheet(); exitTest();
    ({ today: renderToday, learn: renderLearn, drills: renderDrills, cheat: renderCheat, quiz: renderQuiz, list: renderList, about: renderAbout })[t]();
    window.scrollTo(0, 0);
  }

  function progressBar() {
    const started = W.filter(w => S.cards['r:' + w.id]).length;
    return `<div class="small muted">Words started: <b>${started}</b> / ${W.length}</div><div class="bar"><i style="width:${(100 * started / W.length).toFixed(1)}%"></i></div>`;
  }
  function sessionHead() {
    if (!Q) return '';
    const pct = Q.total ? 100 * Q.done / Q.total : 0;
    return `<div class="row small muted"><span class="grow">${Q.done} / ${Q.total}</span>${TEST ? '<span class="tag" style="margin-right:8px">Test mode</span><button class="link" id="stop">Stop</button>' : '<button class="link" id="stop">Stop — progress is saved</button>'}</div><div class="bar"><i style="width:${pct}%"></i></div>`;
  }
  function bindStop() { const b = $('#stop'); if (b) b.onclick = () => { const kind = Q && Q.kind; Q = null; TEST ? renderTest() : kind === 'drill' ? renderDrills() : renderToday(); }; }

  function renderToday() {
    $('#sub').textContent = 'Flashcards';
    const c = counts();
    const vTot = c.vDue + c.vNew;
    const mins = Math.max(1, Math.round((c.vDue * 8 + c.vNew * 15) / 60));
    const drillNote = `<div class="row"><span class="grow small muted">Form drills: practice anytime, weighted toward your weak spots</span><button id="godr">Drills ›</button></div>`;
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

  // Typed answers: macron keys (strict mode only), autofocus, and grading text.
  const macKeys = () => S.set.strictMac ? `<div class="mac" id="mac">${'āēīōū'.split('').map(c => `<button type="button" data-c="${c}" aria-label="type ${c}">${c}</button>`).join('')}</div>` : '';
  const macHint = () => S.set.strictMac ? 'Macrons required.' : 'Macrons optional.';
  function bindTyped(go) {
    const t = $('#typed'); if (!t) return;
    t.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); go(); } };
    document.querySelectorAll('#mac button').forEach(b => {
      b.onpointerdown = e => e.preventDefault();          // keep focus (and the phone keyboard) on the input
      b.onclick = () => { const a = t.selectionStart ?? t.value.length, z = t.selectionEnd ?? a; t.setRangeText(b.dataset.c, a, z, 'end'); t.dispatchEvent(new Event('input')); t.focus({ preventScroll: true }); };
    });
    t.focus({ preventScroll: true });                     // synchronous, so a tap on Next/Start also brings up the mobile keyboard
  }
  const wrongMsg = (v, answers, head) => `<div class="no">✗ Wrong${v ? ' — you typed “' + esc(v) + '”' : ''}</div>${v && S.set.strictMac && (head ? Morph.checkHead(v, answers) : Morph.check(v, answers)) ? '<div class="small muted">Right letters, but the macrons don’t match.</div>' : ''}`;
  const answerNote = g => g.alternate ? `<div class="alt">Accepted alternate — standard form: ${esc(g.standard)}</div>` : `<div class="ok">✓ Right</div>`;
  const focusNext = () => { const b = $('#ans .primary'); if (b && matchMedia('(hover:hover)').matches) b.focus({ preventScroll: true }); };

  function renderVocab(it) {
    const [dir, id] = it.k.split(':'); const w = BY[id];
    const pills = `<span class="pill">${POS_SHORT[w.pos] || w.pos}</span><span class="pill">rank ${rankTxt(w)}</span>${it.isNew ? '<span class="pill">new</span>' : ''}`;
    if (dir === 'r') {
      V().innerHTML = `${sessionHead()}<div class="card" id="vc"><div class="prompt-kind">Latin → English</div>
        <div class="latin">${esc(shownLa(w.la))}</div>${pills}
        <div id="ans"><button class="primary big" id="show" style="margin-top:18px">Show answer</button></div></div>`;
      $('#show').onclick = () => { $('#ans').innerHTML = `<div class="answer"><div class="english">${esc(w.en)}</div><div class="small muted">Did you know it?</div>${rwButtons(it.k)}</div>`; bindRW(it); };
    } else {
      const std = headStandard(w), hs = [std].concat(heads(w.la).filter(h => Morph.normM(h) !== Morph.normM(std)));
      V().innerHTML = `${sessionHead()}<div class="card" id="vc"><div class="prompt-kind">English → Latin</div>
        <div class="english">${esc(w.en)}</div>${pills}
        <div id="ans"><input type="text" id="typed" placeholder="Optional: type the Latin to check yourself" aria-label="Optional: type the Latin to check yourself" autocomplete="off" autocapitalize="off" spellcheck="false" style="margin-top:14px">${macKeys()}
        <button class="primary big" id="show" style="margin-top:10px">Show answer</button></div></div>`;
      const go = () => {
        const v = $('#typed').value.trim();
        if (!v) { $('#ans').innerHTML = `<div class="answer"><div class="latin">${esc(shownLa(w.la))}</div><div class="small muted">Did you know it?</div>${rwButtons(it.k)}</div>`; return bindRW(it); }
        const g = Morph.gradeHead(v, hs, S.set.strictMac);
        $('#ans').innerHTML = `<div class="answer">${g.ok ? answerNote(g) : wrongMsg(v, hs, true)}<div class="latin">${esc(shownLa(w.la))}</div>
          <div class="row" style="margin-top:14px">${g.ok ? '<button class="primary big" data-r="1">Next</button>' : '<button class="grow" data-r="1">Count as correct</button><button class="primary grow" data-r="0">Next</button>'}</div></div>`;
        bindRW(it); focusNext();
      };
      $('#show').onclick = go; bindTyped(go);
      // the button says what it will do: Show answer while the box is empty, Check once something is typed
      const lbl = () => { $('#show').textContent = $('#typed').value.trim() ? 'Check' : 'Show answer'; };
      $('#typed').addEventListener('input', lbl);
    }
    bindStop();
  }

  // ---------- drills ----------
  const CHIPS = {
    types: [['verb', 'Verbs'], ['noun', 'Nouns'], ['adj', 'Adjectives'], ['pron', 'Pronouns']],
    moods: [['ind', 'Indicative'], ['sub', 'Subjunctive'], ['imp', 'Imperative'], ['inf', 'Infinitive'], ['ptc', 'Participle'], ['ger', 'Gerund'], ['gdv', 'Gerundive'], ['sup', 'Supine']],
    voices: [['act', 'Active'], ['pas', 'Passive'], ['dep', 'Deponent']],
    tenses: [['pres', 'Present'], ['impf', 'Imperfect'], ['fut', 'Future'], ['perf', 'Perfect'], ['plup', 'Pluperfect'], ['fperf', 'Fut. perfect']],
    persons: [['1', '1st'], ['2', '2nd'], ['3', '3rd']],
    vnums: [['sg', 'Singular'], ['pl', 'Plural']],
    conj: [['1', '1st'], ['2', '2nd'], ['3', '3rd'], ['3io', '3rd -iō'], ['4', '4th'], ['irr', 'Irregular']],
    cases: [['nom', 'Nom.'], ['gen', 'Gen.'], ['dat', 'Dat.'], ['acc', 'Acc.'], ['abl', 'Abl.'], ['voc', 'Voc.'], ['loc', 'Loc.']],
    nums: [['sg', 'Singular'], ['pl', 'Plural']],
    decl: [['1', '1st'], ['2', '2nd'], ['3', '3rd'], ['4', '4th'], ['5', '5th'], ['irr', 'Irregular']],
  };
  const chipRow = (g, title) => `<div class="small muted chiph">${title}</div><div class="chips" data-g="${g}">${CHIPS[g].map(([v, l]) => `<button data-v="${v}" class="${S.set.df[g].includes(v) ? 'on' : ''}" aria-pressed="${S.set.df[g].includes(v)}">${l}</button>`).join('')}</div>`;
  let showSet = false, drillMsg = '';
  function renderDrills() {
    $('#sub').textContent = 'Form drills';
    const d = day(), fin = drillEnd; drillEnd = null;
    const tried = [...UNITS.keys()].filter(c => S.dst[c]).length, weak = DrillPick.weakest(S.dst, WEAK_N, new Set(UNITS.keys()), WEAK_MAX);
    const head = UNITS.size === 0
      ? `<div class="card"><div class="prompt-kind">Form drills</div><p class="no">Nothing matches your choices.</p><p class="small muted">Turn on at least one mood, voice, tense, person, case, or number below (imperatives need present or future).</p></div>`
      : `<div class="card">${fin ? `<div class="prompt-kind">Set done</div><h2 style="margin:4px 0 0">${fin.ok} of ${fin.n} right</h2>` : '<div class="prompt-kind">Form drills · free practice</div>'}
          <div class="stats two" style="margin:12px 0 14px"><div class="stat"><b>${tried}</b><span>of ${UNITS.size} forms tried</span></div><div class="stat"><b>${d.dn || 0}</b><span>answered today</span></div></div>
          <button class="primary big" id="dgo">${fin ? 'Keep going' : `Start a set of ${S.set.dlen}`}</button>
          <p class="small muted center" style="margin:10px 0 0">Questions lean toward forms you miss, haven’t tried, or haven’t seen lately. Stop anytime; every answer is saved. ${modeTxt()}${DrillPick.sentenceSettings(S.set.df).on ? ' About one in seven is a short sentence.' : ''}</p></div>
        <div class="card"><div class="row"><h2 class="grow" style="margin:0">Weak spots</h2><button class="link" id="gweak">View ›</button></div>
          <div class="small muted" style="margin-top:4px">${weak.length ? weak.slice(0, 3).map(c => esc(comboLabel(c)) + ' · ' + pct(S.dst[c])).join('<br>') : (Object.keys(S.dst).length ? 'None right now: every form you’ve tried is at 85% or better.' : 'Your lowest-accuracy forms will show up here once you’ve answered a few.')}</div></div>`;
    const msg = drillMsg ? `<div class="card small" id="dmsg">${esc(drillMsg)}</div>` : ''; drillMsg = '';
    const modeCard = `<div class="card"><div class="small muted chiph" style="margin-top:0">How to answer</div><div class="seg" id="dmode">${MODES.map(([m, l]) => `<button data-m="${m}" class="${S.set.dmode === m ? 'on' : ''}" aria-pressed="${S.set.dmode === m}">${l}</button>`).join('')}</div></div>`;
    V().innerHTML = msg + head + modeCard + `<div class="card"><div class="row"><h2 class="grow" style="margin:0">What to drill</h2><button class="link" id="tset">${showSet ? 'Hide' : 'Change'}</button></div>
      <div class="small muted" style="margin-top:4px">${esc(dfSummary())} · <b>${UNITS.size}</b> forms, <b>${new Set([].concat(...UNITS.values())).size}</b> words match</div>
      <div class="small muted" style="margin-top:2px">Seen in drills so far: ${plur(Object.keys(S.ds.w).length, 'word')} · ${plur(Object.keys(S.dst).length, 'form')}</div>
      ${showSet ? `<div id="dset">${chipRow('types', 'Word types')}
        <h3>Verbs</h3>${chipRow('moods', 'Mood / form')}${chipRow('voices', 'Voice')}${chipRow('tenses', 'Tense')}${chipRow('persons', 'Person')}${chipRow('vnums', 'Number')}${chipRow('conj', 'Conjugation')}
        <h3>Nouns, adjectives &amp; pronouns</h3>${chipRow('cases', 'Case')}${chipRow('nums', 'Number')}${chipRow('decl', 'Declension')}
        <h3>Sentences</h3>
        <div class="small muted chiph">Sentences in drills</div><div class="seg" id="dsent"><button data-v="0" class="${DrillPick.sentenceSettings(S.set.df).on ? '' : 'on'}" aria-pressed="${!DrillPick.sentenceSettings(S.set.df).on}">Off</button><button data-v="1" class="${DrillPick.sentenceSettings(S.set.df).on ? 'on' : ''}" aria-pressed="${DrillPick.sentenceSettings(S.set.df).on}">On</button></div>
        <div class="small muted chiph">Sentence type</div><div class="seg" id="dstype">${[['tr', 'Translate'], ['id', 'Identify'], ['both', 'Both']].map(([v, l]) => `<button data-v="${v}" class="${DrillPick.sentenceSettings(S.set.df).type === v ? 'on' : ''}" aria-pressed="${DrillPick.sentenceSettings(S.set.df).type === v}">${l}</button>`).join('')}</div>
        <div class="small muted chiph">Translate direction</div><div class="seg sentset" id="dsdir">${[['le', 'Latin → English'], ['el', 'English → Latin'], ['both', 'Both']].map(([v, l]) => `<button data-v="${v}" class="${DrillPick.sentenceSettings(S.set.df).dir === v ? 'on' : ''}" aria-pressed="${DrillPick.sentenceSettings(S.set.df).dir === v}">${l}</button>`).join('')}</div>
        <p class="small muted">About one question in seven is a short sentence made from words you have already seen. Helper words you have not studied yet, such as in, sum, and mē, show a short gloss. This stays off until you turn it on.</p>
        <div class="small muted chiph">Questions per set</div><div class="seg" id="sdr">${[5, 10, 20].map(n => `<button data-n="${n}" class="${S.set.dlen === n ? 'on' : ''}">${n}</button>`).join('')}</div>
        <button class="primary big" id="tdone" style="margin-top:16px">Done</button>
        <p class="small muted center" style="margin:8px 0 0">Your choices are saved automatically.</p></div>` : ''}
      </div>
      <div class="card"><button class="big" id="opencs">📖 Cheat sheet — endings tables</button></div>`;
    if ($('#dgo')) $('#dgo').onclick = () => startDrills(fin && fin.only && [...fin.only].some(c => UNITS.has(c)) ? fin.only : null);
    if ($('#gweak')) $('#gweak').onclick = renderWeak;
    $('#tset').onclick = () => { showSet = !showSet; renderDrills(); };
    if ($('#tdone')) $('#tdone').onclick = () => { showSet = false; renderDrills(); window.scrollTo(0, 0); };
    $('#opencs').onclick = () => setTab('cheat');
    document.querySelectorAll('.chips button').forEach(b => b.onclick = () => {
      const g = b.parentNode.dataset.g, v = b.dataset.v, arr = S.set.df[g];
      S.set.df[g] = arr.includes(v) ? arr.filter(x => x !== v) : arr.concat(v);
      save(); UNITS = buildUnits(); renderDrills();
    });
    document.querySelectorAll('#sdr button').forEach(b => b.onclick = () => { S.set.dlen = +b.dataset.n; save(); renderDrills(); });
    document.querySelectorAll('#dmode button').forEach(b => b.onclick = () => { S.set.dmode = b.dataset.m; save(); renderDrills(); });
    const bindSeg = (id, fn) => { const n = $('#' + id); if (!n) return; n.querySelectorAll('button').forEach(b => b.onclick = () => { fn(b.dataset.v); save(); if (S.set.df.sent) loadSentences(); renderDrills(); }); };
    bindSeg('dsent', v => { S.set.df.sent = v === '1'; });
    bindSeg('dstype', v => { S.set.df.stype = v; });
    bindSeg('dsdir', v => { S.set.df.sdir = v; });
    if (DrillPick.sentenceSettings(S.set.df).on) loadSentences();
  }
  let drillEnd = null;
  const WEAK_N = 12, WEAK_MAX = 0.85;   // weak spot = recent accuracy under 85%
  const GROUP = { v1: '1st conj.', v2: '2nd conj.', v3: '3rd conj.', v3io: '3rd conj. -iō', v4: '4th conj.', vsum: 'sum', vpossum: 'possum', veo: 'eō', vfero: 'ferō', vvolo: 'volō/nōlō/mālō', vfio: 'fīō',
    n1: '1st decl.', n2: '2nd decl.', n3: '3rd decl.', n3i: '3rd decl. i-stem', n4: '4th decl.', n5: '5th decl.', nirr: 'irregular noun', pp: 'personal pronoun', pd: 'hic / ille', a12: '1st/2nd-decl. adj.', a3: '3rd-decl. adj.' };
  const comboLabel = c => { const i = c.indexOf('|'), g = c.slice(0, i); return (GROUP[g] || g) + ' · ' + Morph.label(kindOfC(c), c.slice(i + 1)); };
  const pct = st => st && st.n > 0 ? Math.round(100 * DrillPick.acc(st)) + '%' : '—';
  function renderWeak() {
    $('#sub').textContent = 'Weak spots';
    const allow = new Set(UNITS.keys()), weak = DrillPick.weakest(S.dst, WEAK_N, allow, WEAK_MAX);
    const outside = DrillPick.weakest(S.dst, 1e9, null, WEAK_MAX).filter(c => !allow.has(c)).length;
    V().innerHTML = `<div class="row"><button class="link" id="wback">‹ Drills</button></div>
      <div class="card"><h2 style="margin-top:0">Weak spots</h2><p class="small muted" style="margin-top:0">Your lowest-accuracy forms (under 85%) within your current drill choices. Accuracy counts recent answers more than old ones.</p>
      ${weak.length ? `<table class="weak"><tr><th>Form</th><th>Recent</th><th>Tries</th></tr>${weak.map(c => { const st = S.dst[c]; return `<tr><td>${esc(comboLabel(c))}</td><td>${pct(st)}</td><td>${st.a}<span class="muted"> (${st.ok} ✓)</span></td></tr>`; }).join('')}</table>
        <button class="primary big" id="wgo" style="margin-top:12px">Practice weak spots</button>` : `<p>${Object.keys(S.dst).length ? 'No weak spots right now: every form you’ve tried is at 85% or better.' : 'Nothing yet. Answer a few drills first.'}</p>`}
      ${outside ? `<p class="small muted">${outside} more weak form${outside === 1 ? ' is' : 's are'} outside your current drill choices.</p>` : ''}</div>
      <div class="card"><button class="big" id="wrst">Reset drill stats</button><p class="small muted" style="margin:8px 0 0">Clears drill accuracy and which words and forms you’ve seen. Flashcard progress is not affected.</p></div>`;
    $('#wback').onclick = renderDrills;
    if ($('#wgo')) $('#wgo').onclick = () => startDrills(new Set(weak));
    $('#wrst').onclick = () => { if (confirm('Reset all drill stats on this device? Flashcards are not affected.')) { S.dst = {}; S.ds = { w: {} }; S.dq = 0; save(); renderWeak(); } };
  }
  const MODES = [['type', 'Type the form'], ['id', 'Identify the form'], ['mix', 'Mix']];
  const modeTxt = () => S.set.dmode === 'id' ? 'Tap what each form is: case, number, gender… or person, tense, voice, mood.'
    : (S.set.dmode === 'mix' ? 'Some forms to type, some to identify; ' : 'Type the form; ') + (S.set.strictMac ? 'macrons required.' : 'macrons optional.');
  function dfSummary() {
    const df = S.set.df, names = (g) => CHIPS[g].filter(([v]) => df[g].includes(v)).map(x => x[1].toLowerCase());
    const all = g => df[g].length === CHIPS[g].length;
    const parts = [];
    if (df.types.includes('verb')) parts.push(`verbs: ${names('moods').join(', ') || 'no mood'}; ${names('voices').join('/') || 'no voice'}; ${all('tenses') ? 'all tenses' : names('tenses').join(', ') || 'no tense'}${all('persons') && all('vnums') ? '' : '; ' + (all('persons') ? 'all persons' : names('persons').join(', ') || 'no person') + ' ' + (all('vnums') ? '' : names('vnums').join('/') || 'no number')}`);
    const nt = [['noun', 'nouns'], ['adj', 'adjectives'], ['pron', 'pronouns']].filter(x => df.types.includes(x[0])).map(x => x[1]);
    if (nt.length) parts.push(`${nt.length < 3 ? nt.join(' & ') : nt.slice(0, 2).join(', ') + ' & ' + nt[2]}: ${all('cases') ? 'all cases' : names('cases').join(' ')}${all('nums') ? '' : ', ' + names('nums').join(' ')}`);
    const ss = DrillPick.sentenceSettings(df);
    const ty = ss.type === 'tr' ? 'translate' : ss.type === 'id' ? 'identify' : 'translate and identify';
    const dir = ss.type === 'id' ? '' : (ss.dir === 'el' ? ', English → Latin' : ss.dir === 'both' ? ', both directions' : ', Latin → English');
    return (parts.join(' · ') || 'nothing selected') + (ss.on ? ' · sentences on (' + ty + dir + ')' : '');
  }
  function miniTable(a, key) {
    const k = key.split('.');
    let rows;
    if (a.kind === 'verb') {
      const pre = ['ger', 'gdv', 'sup'].includes(k[0]) ? k[0] + '.' : k[0] === 'inf' || k[0] === 'ptc' ? k[0] + '.' + k[1] + '.' : k.slice(0, 3).join('.') + '.';
      const NM = { m: 'masc.', f: 'fem.', n: 'neut.', um: '-um', u: '-ū' };
      rows = Object.keys(a.tbl).filter(x => x.startsWith(pre)).map(x => { const r = x.slice(pre.length); return [NM[r] || r.replace(/^(\d)s$/, '$1 sg').replace(/^(\d)p$/, '$1 pl'), x]; });
    } else if (a.kind === 'noun' || k.length === 2) rows = Morph.CASES_X.map(c => [c, c + '.' + k[1]]);
    else rows = Morph.CASES_X.map(c => [c, k[0] + '.' + c + '.' + k[2]]);
    return `<table>${rows.filter(r => a.tbl[r[1]]).map(([l, x]) => `<tr${x === key ? ' class="hl"' : ''}><th>${l}</th><td>${esc(Morph.standard(a.tbl[x]))}</td></tr>`).join('')}</table>`;
  }
  const S_CASE = [['nom', 'Nom.'], ['gen', 'Gen.'], ['dat', 'Dat.'], ['acc', 'Acc.'], ['abl', 'Abl.']];
  const S_NUM = [['sg', 'Singular'], ['pl', 'Plural']];
  const S_TENSE = [['pres', 'Present'], ['impf', 'Imperfect'], ['perf', 'Perfect'], ['fut', 'Future']];
  const S_PERS = [['1s', '1st sg.'], ['2s', '2nd sg.'], ['3s', '3rd sg.'], ['1p', '1st pl.'], ['2p', '2nd pl.'], ['3p', '3rd pl.']];
  const S_VOICE = [['act', 'Active'], ['pas', 'Passive']];
  const CASE_FULL = { nom: 'nominative', gen: 'genitive', dat: 'dative', acc: 'accusative', abl: 'ablative' };
  const TENSE_FULL = { pres: 'present', impf: 'imperfect', perf: 'perfect', fut: 'future' };
  function sentenceLine(s, hints, hl) {
    const hintAt = new Map((hints || []).map(h => [h.i, h.en]));
    const last = s.laTokens.length - 1;
    return s.laTokens.map((t, k) => {
      const show = k === 0 ? t.charAt(0).toUpperCase() + t.slice(1) : t;
      const word = hl && hl.includes(k) ? `<mark class="tgt">${esc(show)}</mark>` : esc(show);
      const g = hintAt.get(k);
      return `<span class="stok">${word}${k === last ? '.' : ''}${g ? `<small class="sgloss">${esc(g)}</small>` : ''}</span>`;
    }).join('');
  }
  function idAnswerText(t) {
    if (t.kind === 'noun') return CASE_FULL[t.case] + ' ' + (t.num === 'sg' ? 'singular' : 'plural');
    const L = Object.fromEntries(S_PERS);
    return t.accept.map(a => TENSE_FULL[a.tense] + ' ' + L[a.person] + (t.hasVoice ? ' ' + (a.voice === 'act' ? 'active' : 'passive') : '')).filter((x, i, arr) => arr.indexOf(x) === i).join(' or ');
  }
  function renderSentence(it) {
    const s = it.sentence, tr = it.ex === 'tr', le = tr && it.dir !== 'el', t = it.target;
    const kind = tr ? (le ? 'Translate into English' : 'Translate into Latin') : 'Identify the highlighted ' + (t.kind === 'verb' ? 'verb' : t.pron ? 'pronoun' : 'noun');
    const prompt = tr && !le ? `<div class="english">${esc(s.enPrompt || s.en)}</div>` : `<div class="latin sentline" lang="la">${sentenceLine(s, it.hints, t && t.idx)}</div>`;
    const note = tr && le ? '<div class="small muted" style="margin-top:6px">Articles (a, the) are optional.</div>' : '';
    const rows = !tr && t ? (t.kind === 'noun'
      ? [['case', 'Case', S_CASE], ['num', 'Number', S_NUM]]
      : [['tense', 'Tense', S_TENSE], ['person', 'Person and number', S_PERS]].concat(t.hasVoice ? [['voice', 'Voice', S_VOICE]] : [])) : [];
    V().innerHTML = `${sessionHead()}<div class="card"><div class="prompt-kind">${kind}</div>${prompt}
      ${tr ? `<div id="ans"><input type="text" id="typed" lang="${le ? 'en' : 'la'}" placeholder="${le ? 'Type the English' : 'Type the Latin'}" autocomplete="off" autocapitalize="off" spellcheck="false" style="margin-top:8px">${le ? '' : macKeys()}${note}
      <button class="primary big" id="chk" style="margin-top:10px">Check</button></div>` : `<div id="idrows"></div><div id="ans"><button class="primary big" id="chk" style="margin-top:14px" disabled>Check</button><div class="small muted center" id="idhint" style="margin-top:6px">Pick one in each row.</div></div>`}
      </div>`;
    if (tr) {
      const go = () => {
        const v = $('#typed').value.trim(); if (!v) return;
        const g = le ? { ok: LatinEngine.gradeEnglish(s, v), alternate: false, standard: '' } : LatinEngine.gradeLatinReport(s, v, { strict: S.set.strictMac });
        const mac = !g.ok && !le && S.set.strictMac && LatinEngine.gradeLatin(s, v, { strict: false }) ? '<div class="small muted">Right letters, but the macrons don’t match.</div>' : '';
        const model = le ? `<div class="english">${esc(s.en)}</div>` : `<div class="latin sentline" lang="la">${sentenceLine(s, it.hints, null)}</div>`;
        $('#ans').innerHTML = `<div class="answer">${g.ok ? answerNote(g) : `<div class="no">✗ Wrong${v ? ' — you typed “' + esc(v) + '”' : ''}</div>`}${mac}
          <div class="small muted">${g.ok ? 'Answer' : 'Model answer'}</div>${model}
          <div class="row" style="margin-top:14px">${g.ok ? '<button class="primary big" data-r="1">Next</button>' : '<button class="grow" data-r="1">Count as correct</button><button class="primary grow" data-r="0">Next</button>'}</div></div>`;
        bindRW(it); focusNext();
      };
      $('#chk').onclick = go; bindTyped(go); bindStop();
      return;
    }
    const sel = {}; if (t.kind === 'verb' && !t.hasVoice) sel.voice = 'act';
    const draw = () => {
      $('#idrows').innerHTML = rows.map(([attr, title, op]) => `<div class="idrow" data-a="${attr}"><div class="small muted chiph">${title}</div><div class="chips idc">${op.map(([v, l]) => `<button type="button" data-v="${v}" class="${sel[attr] === v ? 'on' : ''}" aria-pressed="${sel[attr] === v}">${l}</button>`).join('')}</div></div>`).join('');
      document.querySelectorAll('#idrows button').forEach(b => b.onclick = () => { sel[b.closest('.idrow').dataset.a] = b.dataset.v; draw(); });
      const full = rows.every(([attr]) => sel[attr]);
      $('#chk').disabled = !full; $('#idhint').style.visibility = full ? 'hidden' : '';
    };
    const go = () => {
      if ($('#chk').disabled) return;
      const ok = t.kind === 'noun' ? sel.case === t.case && sel.num === t.num : t.accept.some(a => a.tense === sel.tense && a.person === sel.person && a.voice === sel.voice);
      const yours = t.kind === 'noun' ? CASE_FULL[sel.case] + ' ' + (sel.num === 'sg' ? 'singular' : 'plural') : TENSE_FULL[sel.tense] + ' ' + Object.fromEntries(S_PERS)[sel.person] + (t.hasVoice ? ' ' + (sel.voice === 'act' ? 'active' : 'passive') : '');
      document.querySelectorAll('#idrows .idrow').forEach(r => {
        const attr = r.dataset.a;
        const wanted = t.kind === 'noun' ? t[attr] : (attr === 'tense' ? t.tense : attr === 'person' ? t.person : t.voice);
        const selOk = t.kind === 'verb' ? t.accept.some(a => a.tense === sel.tense && a.person === sel.person && a.voice === sel.voice) : sel[attr] === wanted;
        r.querySelectorAll('button').forEach(b => { b.disabled = true; if (b.dataset.v === sel[attr]) b.classList.add(selOk ? 'right' : 'wrong'); else if (!ok && b.dataset.v === wanted) b.classList.add('want'); });
      });
      $('#ans').innerHTML = `<div class="answer">${ok ? '<div class="ok">✓ Right</div>' : '<div class="no">✗ Wrong</div>'}
        <div class="small" style="margin-top:6px"><span lang="la"><i>${esc(t.token)}</i></span>: ${esc(idAnswerText(t))}</div>
        ${ok ? '' : `<div class="small muted">You said: ${esc(yours)}</div>`}
        <div class="small muted" style="margin-top:4px">${esc(s.en)}</div>
        <div class="row" style="margin-top:10px"><button class="primary big" data-r="${ok ? 1 : 0}">Next</button></div></div>`;
      bindRW(it); focusNext();
    };
    draw(); $('#chk').onclick = go; bindStop();
  }
  function renderDrill(it) {
    if (it.sent) return renderSentence(it);
    if (S.set.dmode === 'id' || S.set.dmode === 'mix' && Math.random() < 0.5) { if (renderIdentify(it)) return; }
    const w = BY[it.id], a = an(w), key = it.key;
    const sub = Identify.typedSub(a, key, S.set.df);   // participle / gerundive in an allowed case and number when nom. sg. is off
    const answers = sub ? sub.forms : a.tbl[key];
    const std = Morph.standard(answers);
    const kindTxt = a.kind === 'verb' ? 'Conjugate' : a.kind === 'noun' ? 'Decline' : a.kind === 'pron' ? 'Decline the pronoun' : 'Decline the adjective';
    const ctx = csTarget(a, key);
    V().innerHTML = `${sessionHead()}<div class="card"><div class="row"><div class="prompt-kind grow">${kindTxt}</div><button class="link small" id="cs">📖 ${esc(ctx.label)}</button></div>${newTags(it, w)}
      <div class="latin">${esc(shownLa(w.la))}</div><div class="small muted">${esc(w.en.slice(0, 90))}</div>
      <div class="english" style="margin-top:14px"><b>${esc(sub ? Identify.parseLabel(a, sub) : Morph.label(a.kind, key))}</b>?</div>
      <div id="ans"><input type="text" id="typed" placeholder="Type the form" autocomplete="off" autocapitalize="off" spellcheck="false" style="margin-top:8px">${macKeys()}
      <div class="small muted" style="margin-top:6px">${macHint()}${/ (sum|es|est|sumus|estis|sunt|sim|sīs|sit|sīmus|sītis|sint|eram|erās|erat|erāmus|erātis|erant|essem|essēs|esset|essēmus|essētis|essent|erō|eris|erit|erimus|eritis|erunt|esse|īrī)$/.test(std) ? ' Two words, e.g. “amātus est”.' : ''}</div>
      <button class="primary big" id="chk" style="margin-top:10px">Check</button></div>${newTip(it, a, ctx)}</div>`;
    $('#cs').onclick = () => openSheet(ctx.id); bindTip(ctx);
    const go = () => {
      const v = $('#typed').value.trim();
      const g = Morph.grade(v, answers, S.set.strictMac);
      $('#ans').innerHTML = `<div class="answer">${g.ok ? answerNote(g) : wrongMsg(v, answers)}
        <div class="latin">${esc(std)}</div>${a.flag ? `<div class="small muted">Note: ${esc(a.flag)}</div>` : ''}
        <div class="forms">${miniTable(a, key)}</div>
        <div class="row" style="margin-top:14px">${g.ok ? '<button class="primary big" data-r="1">Next</button>' : '<button class="grow" data-r="1">Count as correct</button><button class="primary grow" data-r="0">Next</button>'}</div></div>`;
      bindRW(it); focusNext();
    };
    $('#chk').onclick = go; bindStop(); bindTyped(go);
  }

  // ---------- "new" tags: a word never drilled, or a form (paradigm + attributes) never attempted ----------
  const plur = (n, x) => `<b>${n}</b> ${x}${n === 1 ? '' : 's'}`;
  const pdg = a => DrillPick.paradigmOf(a);
  const LESSON_ID = { vpossum: 'sum', vsum: 'sum', veo: 'eo', vfero: 'fero', vvolo: 'volo', a12: 'a12', a3: 'a3' };
  const lessonOf = a => { const p = pdg(a), id = LESSON_ID[p] || (/^(n[1-5]|n3i|v[1-4]|v3io)$/.test(p) ? p : null); return LS.find(l => l.id === id) || null; };
  function newTags(it, w) {
    it.nw = !S.ds.w[w.id]; it.nf = !S.dst[it.c];
    return it.nw || it.nf ? `<div class="newtags">${it.nw ? '<span class="pill">New word</span>' : ''}${it.nf ? '<span class="pill">New form</span>' : ''}</div>` : '';
  }
  function newTip(it, a, ctx) {
    if (!it.nf) return '';
    const l = lessonOf(a);
    return `<div class="newtip small">New form for you. Quick refresher: <button class="link" data-tip="cs">📖 ${esc(ctx.label)}</button>${l ? ` · <button class="link" data-tip="${l.id}">Lesson: ${esc(l.title)}</button> <span class="muted">(leaves the drill; progress is saved)</span>` : ''}</div>`;
  }
  const bindTip = ctx => document.querySelectorAll('[data-tip]').forEach(b => b.onclick = () => b.dataset.tip === 'cs' ? openSheet(ctx.id) : (setTab('learn'), openLesson(b.dataset.tip)));

  // ---------- identify the form ----------
  // Show a generated form; the user taps one chip per attribute. Any valid parse is accepted (rēgēs: nom. or acc. pl.).
  // After a right answer on an ambiguous form, the optional "And…?" step asks for the other readings (Settings toggle).
  // It is never graded: the card / drill score uses the first answer only; naming every reading just earns a note.
  function renderIdentify(it) {
    const w = BY[it.id], a = an(w), df = S.set.df;
    const q = Identify.pick(a, [it.key], df); if (!q) return false;
    const ps = Identify.parses(a, w, q.form, df); if (!ps.length) return false;
    const base = q.key.split(':')[0], tkey = base === 'gdv' ? 'gdv.m' : base, ctx = csTarget(a, tkey);
    const sel = {}; let done = false, phase = 'ask', first = null, guesses = 0; const found = [];   // guesses: And…? tries left (one per remaining reading)
    const entry = shownLa(w.la);   // nouns/adjectives show only the headword until answered (genitive/gender would give it away)
    V().innerHTML = `${sessionHead()}<div class="card"><div class="prompt-kind">Identify the form</div>${newTags(it, w)}
      <div class="latin">${esc(q.form)}</div><div class="small muted">from <b>${esc(a.kind === 'verb' ? entry : entry.split(/[ ,]/)[0])}</b> · ${esc(w.en.slice(0, 80))}</div>
      <div id="idrows"></div><div id="ans"><button class="primary big" id="chk" style="margin-top:14px" disabled>Check</button>
      <div class="small muted center" id="idhint" style="margin-top:6px">Pick one in each row.</div></div>${it.nf ? '<div class="newtip small" id="pretip">New form for you: take your best guess. A refresher link comes with the answer.</div>' : ''}</div>`;
    const draw = () => {
      const rows = Identify.rows(a, df, sel.mood), keep = new Set(rows.map(r => r[0]));
      for (const k of Object.keys(sel)) if (!keep.has(k)) delete sel[k];
      for (const [attr, op] of rows) { if (op.length === 1) sel[attr] = op[0][0]; else if (sel[attr] && !op.some(o => o[0] === sel[attr])) delete sel[attr]; }
      $('#idrows').innerHTML = rows.map(([attr, op]) => { const lock = op.length === 1;
        return `<div class="idrow${lock ? ' locked' : ''}" data-a="${attr}"><div class="small muted chiph">${Identify.TITLE[attr]}${lock ? ' · set by your drill choices' : ''}</div>
          <div class="chips idc">${op.map(([v, l]) => `<button type="button" data-v="${v}" class="${sel[attr] === v ? 'on' : ''}" aria-pressed="${sel[attr] === v}"${lock ? ' disabled' : ''}>${l}</button>`).join('')}</div></div>`; }).join('');
      document.querySelectorAll('#idrows .idrow:not(.locked) button').forEach(b => b.onclick = () => { if (done) return; sel[b.closest('.idrow').dataset.a] = b.dataset.v; draw(); });
      const full = rows.every(([attr]) => sel[attr] != null) && (a.kind !== 'verb' || sel.mood);
      $('#chk').disabled = !full; $('#idhint').style.visibility = full ? 'hidden' : '';
      if (matchMedia('(hover:hover)').matches) { const nx = full ? $('#chk') : document.querySelector('#idrows .idrow:not(.locked) .chips:not(:has(.on)) button'); if (nx) nx.focus({ preventScroll: true }); }
    };
    const lbl = p => `<b>${esc(q.form)}</b> = ${esc(Identify.parseLabel(a, p))}`;
    // the "And…?" step: chips stay live (pre-set to the first answer); Check names one more reading, Skip / Done ends it
    const andStep = msg => {
      const left = ps.length - found.length, gl = guesses;
      $('#ans').innerHTML = `<div class="answer"><div class="ok">✓ Right</div><ul class="parses">${found.map(p => `<li class="got">✓ ${lbl(p)}</li>`).join('')}</ul>
        <div class="andq"><b>And…?</b> This form has ${plur(left, 'more reading')} in your drill settings. Change the chips to name ${left === 1 ? 'it' : 'one'}, or skip (no penalty). <span id="andleft">${plur(gl, 'guess')} left.</span></div>
        ${msg ? `<div class="small andmsg">${msg}</div>` : ''}
        <div class="row" style="margin-top:10px"><button class="grow" id="andskip">Skip</button><button class="primary grow" id="chk">Check</button></div>
        <div class="small muted center" id="idhint" style="margin-top:6px;visibility:hidden">Pick one in each row.</div></div>`;
      $('#chk').onclick = go; $('#andskip').onclick = () => finish();
      document.querySelectorAll('#idrows button').forEach(b => { b.classList.remove('right', 'wrong', 'want'); });
      done = false; draw();
    };
    const go = () => {
      if (done || $('#chk').disabled) return;
      if (phase === 'and') {
        const r = Identify.andGrade(sel, ps, found);
        if (r.kind === 'dup') return andStep('You already named that one.');
        guesses--;
        if (r.kind === 'new') { found.push(r.p); return found.length === ps.length || guesses <= 0 ? finish() : andStep('✓ Yes, that’s another one.'); }
        return guesses <= 0 ? finish() : andStep('✗ Wrong — that isn’t a reading of this form. Try again, or skip (no penalty).');
      }
      done = true;
      const g = Identify.grade(sel, ps); if ($('#pretip')) $('#pretip').remove();
      first = g;
      if (g.ok && ps.length > 1 && S.set.andMore) { phase = 'and'; found.push(g.best); guesses = ps.length - 1; return andStep(''); }
      finish();
    };
    const finish = () => {
      done = true; const g = first, off = new Set(g.off), andDone = phase === 'and'; phase = 'end';
      if (andDone) document.querySelectorAll('#idrows button').forEach(b => b.classList.remove('right', 'wrong', 'want'));
      document.querySelectorAll('#idrows .idrow').forEach(r => { const attr = r.dataset.a, want = g.best.at[attr];
        r.querySelectorAll('button').forEach(b => { b.disabled = true; if (andDone) return; const v = b.dataset.v;
          if (v === sel[attr]) b.classList.add(off.has(attr) ? 'wrong' : 'right'); else if (off.has(attr) && want != null && Identify.hit(want, v)) b.classList.add('want'); }); });
      const many = ps.length > 1, lex = a.kind === 'noun' ? `<div class="small muted"><b>${esc(entry)}</b>: ${Identify.genders(w, a).map(x => ({ m: 'masculine', f: 'feminine', n: 'neuter' })[x]).join(' or ')}, ${a.decl === 'irr' ? 'irregular' : ORD[a.decl] + ' declension'}</div>`
        : a.kind === 'adj' ? `<div class="small muted"><b>${esc(entry)}</b>: ${a.decl === 3 ? '3rd' : '1st/2nd'}-declension adjective</div>`
        : a.kind === 'pron' ? `<div class="small muted"><b>${esc(entry)}</b>: ${a.pron === 'pers' ? ORD[a.person] + '-person personal pronoun, ' + (a.num === 'sg' ? 'singular' : 'plural') : 'demonstrative pronoun / adjective'}</div>`
        : ps.some(p => p.dep) ? `<div class="small muted"><b>${esc(entry)}</b> is deponent: passive forms, active meaning. Voice is judged by the form${ps.some(p => p.dep && p.at.voice === 'act') ? ' (its present and future participles and future infinitive look active)' : ''}.</div>` : '';
      const offTxt = g.off.map(x => Identify.TITLE[x].toLowerCase().replace('mood / form', 'mood')).join(', ');
      $('#ans').innerHTML = `<div class="answer">${g.ok ? '<div class="ok">✓ Right</div>' : `<div class="no">✗ Wrong${offTxt ? ' — check the ' + esc(offTxt) : ''}</div>`}
        ${andDone ? (found.length === ps.length ? `<div class="small andall">★ All ${ps.length} readings. Nice!</div>`
          : `<div class="small muted">You named ${found.length} of ${ps.length} readings. The others are below.</div>`) : ''}
        <div class="small muted chiph">${many ? `${ps.length} valid answers (any one counts)` : 'The answer'}</div>
        <ul class="parses">${ps.map(p => andDone ? `<li class="${found.includes(p) ? 'got' : 'missed'}">${found.includes(p) ? '✓' : '○'} ${lbl(p)}${found.includes(p) ? '' : ' <span class="muted">(missed)</span>'}</li>`
          : `<li${!g.ok && p === g.best ? ' class="near"' : ''}>${lbl(p)}</li>`).join('')}</ul>${lex}
        ${a.tbl[tkey] ? `<div class="forms">${miniTable(a, tkey)}</div>` : ''}
        ${it.nf ? '' : `<div class="row" style="margin-top:10px"><button class="link small" id="cs">📖 ${esc(ctx.label)}</button></div>`}
        ${newTip(it, a, ctx)}<div class="row" style="margin-top:10px"><button class="primary big" data-r="${g.ok ? 1 : 0}">Next</button></div></div>`;
      if ($('#cs')) $('#cs').onclick = () => openSheet(ctx.id); bindTip(ctx);
      bindRW(it); focusNext();
    };
    draw(); $('#chk').onclick = go; bindStop();
    return true;
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
    if (a.kind === 'pron') return { id: a.pron === 'pers' ? 'cs-p-pers' : 'cs-p-dem', label: a.pron === 'pers' ? 'personal pronouns' : 'hic / ille' };
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
    const st = stems.filter(s => s && form.startsWith(s) && form.length > s.length).sort((x, y) => y.length - x.length)[0];
    return st ? esc(st) + '<b>' + esc(form.slice(st.length)) + '</b>' : esc(form);
  }
  const cell = (a, k, stems) => a.tbl[k] ? (stems ? hl(Morph.standard(a.tbl[k]), stems) : esc(Morph.standard(a.tbl[k]))) : '–';
  function nounTable(h, note) {
    const w = findW(h); if (!w) return ''; const a = an(w); if (a.skip) return '';
    const g = Morph.standard(a.tbl['gen.sg'] || a.tbl['gen.pl']);
    const stem = a.decl === 'irr' ? null : [g.replace(/(ae|ī|is|ūs|ēī|eī)$/, '')];
    const nums = ['sg', 'pl'].filter(n => Morph.CASES_X.some(c => a.tbl[c + '.' + n]));
    return `<div class="cst"><div class="csh">${esc(w.la.split(',').slice(0, 2).join(','))} <span class="muted">${esc(note || '')}</span></div><table><tr><th></th>${nums.map(n => `<th>${n === 'sg' ? 'singular' : 'plural'}</th>`).join('')}</tr>
      ${Morph.CASES_X.filter(c => nums.some(n => a.tbl[c + '.' + n])).map(c => `<tr><th>${c}.</th>${nums.map(n => `<td>${cell(a, c + '.' + n, stem)}</td>`).join('')}</tr>`).join('')}</table></div>`;
  }
  // ego / nōs, tū / vōs side by side (Diederich lists each number as its own word)
  function persTable() {
    const P = ['ego', 'nōs', 'tū', 'vōs'].map(h => { const w = findW(h); return w ? an(w) : null; });
    if (P.some(a => !a || a.skip)) return '';
    return `<div class="cst"><div class="forms"><table><tr><th></th><th>I</th><th>we</th><th>you (sg.)</th><th>you (pl.)</th></tr>
      ${Morph.CASES.map(k => `<tr><th>${k}.</th>${P.map(a => `<td>${a.tbl[k + '.' + a.num] ? esc(Morph.standard(a.tbl[k + '.' + a.num])) : '–'}</td>`).join('')}</tr>`).join('')}</table></div></div>`;
  }
  function adjTable(h, note) {
    const w = findW(h); if (!w) return ''; const a = an(w); if (a.skip) return '';
    const g = Morph.standard(a.tbl['m.gen.sg']), stem = a.kind === 'pron' ? (h === 'ille' ? ['ill'] : null) : [g.replace(/(īus|ī|is)$/, '')];
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
  function verbStems(a) {
    const T = a.tbl, ind = a.voice === 'dep' ? 'dep' : 'act';
    const p1 = Morph.standard(T[`ind.${ind}.pres.1s`] || ['']);
    return a.conj === 'irr' ? null : [p1.replace(/(iō|eō|ō|ior|eor|or)$/, ''), T['ind.act.perf.1s'] ? Morph.standard(T['ind.act.perf.1s']).replace(/ī$/, '') : null, Morph.standard(T['ptc.pas.perf'] || T['ptc.dep.perf'] || ['']).replace(/us$/, '')];
  }
  function verbBlock(h, id, title, note) {
    const w = findW(h); if (!w) return ''; const a = an(w); if (a.skip) return '';
    const stems = verbStems(a);
    return `<details class="cs" id="${id}"><summary><b>${esc(title)}</b> <span class="muted">${esc(shownLa(w.la))}</span></summary>${note ? `<p class="small muted">${note}</p>` : ''}${verbGroups(a, stems, id)}</details>`;
  }
  const det = (id, title, body, note) => `<details class="cs" id="${id}"><summary><b>${title}</b></summary>${note ? `<p class="small muted">${note}</p>` : ''}${body}</details>`;
  function vocLocHTML() {
    const rows = [['dominus'], ['fīlius'], ['puer'], ['deus'], ['puella'], ['rēx']].map(([h]) => { const w = findW(h); if (!w) return ''; const a = an(w); if (a.skip) return '';
      return `<tr><th>${esc(h)}</th><td>${esc(Morph.standard(a.tbl['voc.sg']))}</td><td>${a.tbl['voc.pl'] ? esc(Morph.standard(a.tbl['voc.pl'])) : '–'}</td></tr>`; }).join('');
    const adjs = ['bonus', 'ēgregius', 'meus'].map(h => { const w = findW(h); if (!w) return ''; const a = an(w); return a.skip ? '' : `<tr><th>${esc(h)}</th><td>${esc(Morph.standard(a.tbl['m.voc.sg']))}</td><td>${esc(Morph.standard(a.tbl['m.voc.pl']))}</td></tr>`; }).join('');
    const locs = ['domus', 'rūs', 'humus', 'bellum', 'mīlitia'].map(h => { const w = findW(h); if (!w) return ''; const a = an(w); return a.skip || !a.tbl['loc.sg'] ? '' : `<tr><th>${esc(h)}</th><td>${esc(Morph.standard(a.tbl['loc.sg']))}</td></tr>`; }).join('');
    return `<div class="cst"><div class="csh">Vocative</div><table><tr><th></th><th>singular</th><th>plural</th></tr>${rows}${adjs}</table></div>
      <div class="cst"><div class="csh">Locative <span class="muted">(“at / in”; only these words on the list take it)</span></div><table>${locs}</table>
      <p class="small muted">Rule: 1st/2nd-decl. singular = genitive (Rōmae, bellī); plural and 3rd decl. = ablative (Athēnīs, rūre / rūrī). Diederich’s list has no city names, so city locatives aren’t drilled.</p></div>`;
  }
  function gxSummary() {
    const L = [['amō', '1st'], ['moneō', '2nd'], ['regō', '3rd'], ['capiō', '3rd -iō'], ['audiō', '4th'], ['hortor', 'deponent']];
    const rows = L.map(([h, l]) => { const w = findW(h); if (!w) return []; const a = an(w), T = a.tbl, v = a.voice === 'dep' ? 'dep' : 'act', g = k => T[k] ? esc(Morph.standard(T[k])) : '–';
      return [`<tr><th>${l}</th><td>${g('ger.gen')}</td><td>${g('gdv.m')}</td><td>${g('sup.um')}</td></tr>`, `<tr><th>${l}</th><td>${g(`imp.${v}.fut.2s`)}</td><td>${g(`imp.${v}.fut.3p`)}</td></tr>`]; });
    return `<div class="cst"><table><tr><th></th><th>gerund (gen.)</th><th>gerundive</th><th>supine</th></tr>${rows.map(r => r[0] || '').join('')}</table></div>
      <div class="cst"><div class="csh">Future imperative</div><table><tr><th></th><th>2nd sg</th><th>3rd pl</th></tr>${rows.map(r => r[1] || '').join('')}</table>
      <p class="small muted">Future imperative active: -tō, -tō, -tōte, -ntō (amātō, amantō); passive: -tor, -tor, -ntor. Irregular: estō / suntō, ītō / euntō, fertō / feruntō, nōlītō / nōluntō. No gerund or supine for sum, possum, nōlō, mālō, fīō; eō has a gerund (eundī) and supine (itum) but no gerundive; ferō has ferendus.</p></div>`;
  }
  let CHEAT = null;
  function cheatHTML() {
    if (CHEAT) return CHEAT;
    CHEAT = `<p class="small muted">Endings are in <b>bold</b>. Tap a heading to open it.</p>
    <div class="chips jump"><a href="#cs-nouns">Nouns</a><a href="#cs-adjs">Adjectives</a><a href="#cs-prons">Pronouns</a><a href="#cs-verbs">Verbs</a><a href="#cs-irr">Irregular verbs</a></div>
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
    <h2 id="cs-prons">Pronouns</h2>
    ${det('cs-p-pers', 'Personal pronouns', persTable(), 'No vocative in A&amp;G. Gen. plural: nostrum / vestrum are partitive (ūnus nostrum “one of us”), nostrī / vestrī objective (memor nostrī “mindful of us”). With cum: mēcum, tēcum, nōbīscum, vōbīscum.')}
    ${det('cs-p-dem', 'hic, haec, hoc · ille, illa, illud', adjTable('hic', 'this') + adjTable('ille', 'that'), 'Gen. sg. huius / illīus and dat. sg. huic / illī in all genders; otherwise ille is like bonus except nom. sg. ille, illud. hōc (abl.) has a long ō; hoc (nom./acc. neut.) is short. No vocative.')}
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
  // cheat-sheet chip bar: sticky at the top of its scroller (the page, or the overlay over a drill), scrolls sideways when it
  // overflows; tapping a chip smooth-scrolls to its section (scroll-margin-top keeps it clear of the bar), and the chip of
  // the section being read is highlighted as you scroll
  function bindJump(root) {
    const bar = root.querySelector('.jump'); if (!bar) return;
    const sc = root.classList.contains('ovbody') ? root : window, links = [...bar.querySelectorAll('a')];
    const tg = links.map(a => root.querySelector('#' + CSS.escape(a.getAttribute('href').slice(1))));
    let lock = null, lockT = 0, raf = 0;
    const setH = () => root.style.setProperty('--jh', bar.offsetHeight + 'px');
    const mark = a => {
      if (a && a.classList.contains('on')) return;
      links.forEach(x => { x.classList.toggle('on', x === a); if (x === a) x.setAttribute('aria-current', 'location'); else x.removeAttribute('aria-current'); });
      if (a && bar.scrollWidth > bar.clientWidth) bar.scrollTo({ left: Math.max(0, a.offsetLeft - (bar.clientWidth - a.offsetWidth) / 2), behavior: 'smooth' });
    };
    const spy = () => {
      if (!bar.isConnected) return off();
      if (lock && Date.now() < lockT) return mark(lock);
      lock = null;
      const y = bar.getBoundingClientRect().bottom + 12, last = tg.length - 1;
      let cur = links[0];
      tg.forEach((t, i) => { if (t && t.getBoundingClientRect().top <= y) cur = links[i]; });
      const end = sc === window ? innerHeight + scrollY >= document.documentElement.scrollHeight - 4 : sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 4;
      if (end && tg[last] && tg[last].getBoundingClientRect().top < (sc === window ? innerHeight : sc.getBoundingClientRect().bottom)) cur = links[last];   // a short last section can't reach the top
      mark(cur);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; spy(); }); };
    // a tapped chip stays current until its section has arrived under the bar (or the page can't scroll further), so a
    // stray scrollend or a long smooth scroll can't flash another chip
    const reached = () => {
      const t = tg[links.indexOf(lock)]; if (!t) return true;
      const d = t.getBoundingClientRect().top - bar.getBoundingClientRect().bottom;
      const end = sc === window ? innerHeight + scrollY >= document.documentElement.scrollHeight - 4 : sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 4;
      return Math.abs(d - 8) < 16 || (end && d > 0);
    };
    const onEnd = () => { if (lock && reached()) { lockT = 0; spy(); } };
    const onResize = () => { setH(); onScroll(); };
    function off() { sc.removeEventListener('scroll', onScroll); sc.removeEventListener('scrollend', onEnd); removeEventListener('resize', onResize); }
    sc.addEventListener('scroll', onScroll, { passive: true }); sc.addEventListener('scrollend', onEnd); addEventListener('resize', onResize);
    links.forEach((a, i) => a.onclick = e => {
      e.preventDefault(); const t = tg[i]; if (!t) return;
      for (let p = t; p && p !== root; p = p.parentElement) if (p.tagName === 'DETAILS') p.open = true;   // a collapsed section opens
      lock = a; lockT = Date.now() + 3000; mark(a);
      t.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    });
    setH(); spy();
  }
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


  // ---------- lessons ----------
  // Prose lives in lessons.js; every table and quick-check question here comes from the generator.
  const LS = window.LESSONS || [];
  const lessonDone = id => !!S.lessons[id];
  const isFin = a => a.kind === 'verb' && a.conj !== 'irr';
  function specOk(a, sp) {
    if (a.skip || a.flag || a.kind !== sp.kind) return false;
    if (a.kind === 'noun') return !a.plOnly && a.decl === sp.decl && (sp.istem == null || a.istem === sp.istem);
    if (a.kind === 'adj') return a.decl === sp.decl;
    return sp.irr ? sp.irr.includes(a.irr) : a.conj === sp.conj;
  }
  const lessonHeads = l => l.tables.flatMap(t => [t.h, ...(t.rows || []).map(r => r[1]), ...(t.cols || []).map(c => c[0])]).filter(Boolean).map(Morph.plain);
  function lessonExamples(l) {
    if (l.ex) return l.ex.map(findW).filter(Boolean);
    const used = lessonHeads(l), all = W.filter(w => specOk(an(w), l.pick));
    const fresh = all.filter(w => !used.includes(Morph.plain(w.la.split(/[ ,]/)[0])));
    return (fresh.length >= 2 ? fresh : all).slice(0, 3);
  }
  function lessonVerb(h) {
    const w = findW(h); if (!w) return ''; const a = an(w); if (a.skip) return '';
    const st = verbStems(a), v = a.voice === 'dep' ? 'dep' : 'act';
    const fin = ts => `<table><tr><th></th>${ts.map(t => `<th>${Morph.TENSES[t]}</th>`).join('')}</tr>${Morph.P.map(p => `<tr><th>${p}</th>${ts.map(t => `<td>${cell(a, `ind.${v}.${t}.${p}`, st)}</td>`).join('')}</tr>`).join('')}</table>`;
    const ex = [['infinitive', `inf.${v}.pres`], ['imperative', `imp.${v}.pres.2s`], ['imperative pl.', `imp.${v}.pres.2p`]].filter(r => a.tbl[r[1]]);
    return `<div class="cst"><div class="csh">${esc(shownLa(w.la))} <span class="muted">indicative ${v === 'dep' ? 'deponent' : 'active'}</span></div><div class="forms">${fin(['pres', 'impf', 'fut'])}<div style="height:6px"></div>${fin(['perf', 'plup', 'fperf'])}</div>
      <table style="margin-top:6px">${ex.map(([l, k]) => `<tr><th>${l}</th><td>${cell(a, k, st)}</td></tr>`).join('')}</table></div>`;
  }
  function lessonTable(t) {
    if (t.t === 'noun') return nounTable(t.h, t.note);
    if (t.t === 'adj') return adjTable(t.h, t.note);
    if (t.t === 'verb') return lessonVerb(t.h);
    const A = h => an(findW(h)), F = (h, k) => { const a = A(h); return a.tbl[k] ? esc(Morph.standard(a.tbl[k])) : '–'; };
    if (t.t === 'cmp') return `<div class="cst"><div class="csh">${esc(t.title)}</div><div class="forms"><table><tr><th></th>${t.cols.map(c => `<th>${esc(c[2])}</th>`).join('')}</tr>${Morph.P.map(p => `<tr><th>${p}</th>${t.cols.map(c => `<td>${F(c[0], c[1] + '.' + p)}</td>`).join('')}</tr>`).join('')}</table></div></div>`;
    return `<div class="cst"><div class="csh">${esc(t.title)}</div><div class="forms"><table>${t.rows.map(r => `<tr><th>${esc(r[0])}</th><td>${F(r[1], r[2])}</td>${r[3] ? `<td class="en">${esc(r[3])}</td>` : ''}</tr>`).join('')}</table></div></div>`;
  }
  function renderLearn() {
    $('#sub').textContent = 'Grammar lessons';
    const n = LS.filter(l => lessonDone(l.id)).length;
    const secs = [...new Set(LS.map(l => l.sec))];
    V().innerHTML = `<div class="card"><div class="prompt-kind">Lessons · about 5–10 minutes each</div>
      <p class="small muted" style="margin:6px 0 10px">What each case, declension, and conjugation does and how to spot it, with endings tables and a short quick check. <b>${n}</b> of ${LS.length} done.</p>
      <div class="bar"><i style="width:${(100 * n / LS.length).toFixed(1)}%"></i></div></div>
      ${secs.map(sec => `<h3>${esc(sec)}</h3><div class="card llist">${LS.filter(l => l.sec === sec).map(l => `<button class="lrow" data-l="${l.id}"><span class="lck${lessonDone(l.id) ? ' on' : ''}" aria-label="${lessonDone(l.id) ? 'done' : 'not done'}">${lessonDone(l.id) ? '✓' : LS.indexOf(l) + 1}</span><span class="grow"><b>${esc(l.title)}</b><br><span class="small muted">${esc(l.sum)}</span></span><span class="muted">›</span></button>`).join('')}</div>`).join('')}`;
    document.querySelectorAll('.lrow').forEach(b => b.onclick = () => openLesson(b.dataset.l));
  }
  function markLesson(id, score, total) {
    const o = S.lessons[id] || {};
    S.lessons[id] = { d: today(), s: score != null ? Math.max(score, o.s || 0) : o.s, n: total || o.n };
    save();
  }
  function openLesson(id) {
    const i = LS.findIndex(l => l.id === id), l = LS[i]; if (!l) return renderLearn();
    const nx = LS[i + 1], st = S.lessons[id];
    $('#sub').textContent = 'Lesson ' + (i + 1) + ' of ' + LS.length;
    const ex = lessonExamples(l);
    V().innerHTML = `<div class="row"><button class="link" id="lback">‹ All lessons</button><span class="grow"></span>${st ? '<span class="ok small">✓ Done</span>' : ''}</div>
      <div class="card lesson"><div class="prompt-kind">${esc(l.sec)}</div><h2 style="margin:4px 0 8px">${esc(l.title)}</h2>${l.body}</div>
      <div class="card"><h3 style="margin-top:0">${l.tables[0].t === 'rows' || l.tables[0].t === 'cmp' ? 'Forms' : 'Endings'}</h3>${['noun', 'adj', 'verb'].includes(l.tables[0].t) ? '<p class="small muted" style="margin:2px 0 0">Endings are in <b>bold</b>.</p>' : ''}${l.tables.map(lessonTable).join('')}</div>
      <div class="card"><h3 style="margin-top:0">From your word list</h3>${ex.map(w => `<div class="lex"><span class="latin">${esc(shownLa(w.la))}</span><div class="small muted">${esc(w.en.length > 80 ? w.en.slice(0, 78) + '…' : w.en)}</div></div>`).join('')}</div>
      <div class="card"><button class="primary big" id="lq">Quick check · ${quizItems(l).length} questions</button>
        ${l.drill ? '<button class="big" id="ldr" style="margin-top:10px">Practice this in Drills</button>' : ''}
        <div class="row" style="margin-top:10px">${st ? '' : '<button class="grow" id="lmark">Mark as done</button>'}${nx ? `<button class="grow" id="lnext">Next: ${esc(nx.title)} ›</button>` : ''}</div>
        <p class="small muted center" style="margin:8px 0 0">The quick check doesn’t change your review schedule.</p></div>`;
    $('#lback').onclick = renderLearn;
    $('#lq').onclick = () => runLessonQuiz(l, quizItems(l));
    if ($('#ldr')) $('#ldr').onclick = () => practiceLesson(l);
    if ($('#lmark')) $('#lmark').onclick = () => { markLesson(id); openLesson(id); };
    if ($('#lnext')) $('#lnext').onclick = () => { openLesson(nx.id); window.scrollTo(0, 0); };
  }
  function practiceLesson(l) {
    const df = S.set.df;
    Object.assign(df, JSON.parse(JSON.stringify(l.drill)));
    for (const g of ['cases', 'nums', 'tenses', 'voices', 'persons', 'vnums']) if (!df[g].length) df[g] = DF[g].slice();
    save(); UNITS = buildUnits();
    drillMsg = `Drills now show ${l.drill.conj && l.drill.conj[0] === 'irr' ? 'all irregular verbs' : l.title.replace(/ i-stems$/, '') + (l.drill.types[0] === 'verb' ? ' verbs (indicative)' : l.drill.types[0] === 'noun' ? ' nouns' : '')}. Change this any time under “What to drill.”`;
    setTab('drills');
  }
  // Quick-check questions. Typed forms reuse the drill check; the verb-basics lessons ask multiple choice.
  function quizItems(l) {
    const q = l.quiz, N = 4, out = [];
    if (q.t === 'mc') return shuffle(q.qs.map(([p, o, ans]) => ({ t: 'mc', prompt: esc(p), opts: o, ans: o[ans] })));
    if (q.t === 'form') {
      const pool = shuffle(W.filter(w => specOk(an(w), l.pick)).slice(0, 30));
      const keysOf = a => Object.keys(a.tbl).filter(k => {
        const p = k.split('.');
        if (a.kind === 'noun') return k !== 'nom.sg' && Morph.CASES.includes(p[0]) && (!q.keys || q.keys.includes(k));
        if (a.kind === 'adj') return k !== 'm.nom.sg' && Morph.CASES.includes(p[1]);
        return p[0] === 'ind' && (p[1] === 'act' || p[1] === 'dep') && ['pres', 'impf', 'fut', 'perf'].includes(p[2]) && !(p[2] === 'pres' && p[3] === '1s');
      });
      for (let i = 0; out.length < N && i < pool.length * 3; i++) {
        const w = pool[i % pool.length], a = an(w), ks = keysOf(a); if (!ks.length) continue;
        const key = ks[Math.floor(Math.random() * ks.length)];
        if (out.some(x => x.w === w && x.key === key) || (pool.length >= N && i < pool.length && out.some(x => x.w === w))) continue;
        out.push({ t: 'form', w, a, key });
      }
      return out;
    }
    // tense / voice / mood: show a generated form, ask which one it is; skip forms that are ambiguous
    const verbs = W.filter(w => { const a = an(w); return isFin(a) && !a.skip && !a.flag && a.voice === 'act' && (q.t !== 'voice' || !a.noPassive) && a.tbl['ind.act.perf.1s']; }).slice(0, 40);
    const C = {
      tense: { opts: Object.keys(Morph.TENSES), name: t => Morph.TENSES[t], keys: a => Object.keys(a.tbl).filter(k => /^ind\.act\./.test(k)), of: k => k.split('.')[2], cmp: (a, k) => Object.keys(a.tbl).filter(x => /^ind\.act\./.test(x)) },
      voice: { opts: ['act', 'pas'], name: v => Morph.VOICES[v], keys: a => Object.keys(a.tbl).filter(k => /^ind\.(act|pas)\.(pres|impf|fut|perf)\./.test(k)), of: k => k.split('.')[1], cmp: a => Object.keys(a.tbl).filter(x => /^(ind|sub|imp|inf)\./.test(x)) },
      mood: { opts: ['ind', 'sub', 'imp', 'inf'], name: m => Morph.MOODS[m], keys: a => Object.keys(a.tbl).filter(k => /^(ind\.act\.(pres|impf|fut)\.|sub\.act\.(pres|impf)\.|imp\.act\.pres\.2|inf\.act\.pres)/.test(k)), of: k => k.split('.')[0], cmp: a => Object.keys(a.tbl).filter(x => x.split('.')[0] !== 'ptc') },
    }[q.t];
    for (let i = 0; out.length < N && i < 200; i++) {
      const w = verbs[Math.floor(Math.random() * verbs.length)], a = an(w);
      const want = C.opts[Math.floor(Math.random() * C.opts.length)];
      const ks = C.keys(a).filter(k => C.of(k) === want); if (!ks.length) continue;
      const key = ks[Math.floor(Math.random() * ks.length)], form = Morph.standard(a.tbl[key]);
      if (C.cmp(a).some(k => C.of(k) !== want && Morph.standard(a.tbl[k]) === form)) continue;   // ambiguous among standard forms
      if (out.some(x => x.form === form)) continue;
      out.push({ t: 'mc', form, w, key, prompt: `Which ${q.t} is <span class="latin">${esc(form)}</span>?<div class="small muted" style="margin-top:4px">from ${esc(w.la.split(',')[0])} — ${esc(w.en.slice(0, 50))}</div>`, opts: C.opts.map(C.name), ans: C.name(want) });
    }
    return out;
  }
  function runLessonQuiz(l, qs) {
    let i = 0, score = 0;
    const head = () => `<div class="row small muted"><span class="grow">${esc(l.title)} · quick check ${Math.min(i + 1, qs.length)} / ${qs.length}</span><button class="link" id="lqstop">Back to lesson</button></div>`;
    const nextBtn = () => `<button class="primary big" style="margin-top:12px" id="qnext">${i + 1 < qs.length ? 'Next' : 'Finish'}</button>`;
    const bindNext = () => { $('#qnext').onclick = () => { i++; ask(); }; focusNext(); };
    const ask = () => {
      if (i >= qs.length) {
        markLesson(l.id, score, qs.length);
        const nx = LS[LS.indexOf(l) + 1];
        V().innerHTML = `<div class="card done"><div class="check">✓</div><h2>${score} / ${qs.length}</h2><p class="muted">${esc(l.title)} is marked done.${score < qs.length ? ' Look over the table once more, then try again.' : ''}</p>
          <button class="big" id="lagain">Try another quick check</button><button class="big" id="lback2" style="margin-top:10px">Back to lesson</button>
          ${l.drill ? '<button class="big" id="ldr" style="margin-top:10px">Practice this in Drills</button>' : ''}
          ${nx ? `<button class="primary big" id="lnext" style="margin-top:10px">Next: ${esc(nx.title)} ›</button>` : '<button class="primary big" id="lall" style="margin-top:10px">All lessons</button>'}</div>`;
        $('#lagain').onclick = () => runLessonQuiz(l, quizItems(l));
        $('#lback2').onclick = () => openLesson(l.id);
        if ($('#ldr')) $('#ldr').onclick = () => practiceLesson(l);
        if ($('#lnext')) $('#lnext').onclick = () => openLesson(nx.id);
        if ($('#lall')) $('#lall').onclick = renderLearn;
        window.scrollTo(0, 0); return;
      }
      const it = qs[i];
      if (it.t === 'mc') {
        V().innerHTML = `${head()}<div class="card"><div class="english">${it.prompt}</div><div class="opts">${it.opts.map(o => `<button data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div><div id="ans"></div></div>`;
        document.querySelectorAll('.opts button').forEach(b => b.onclick = () => {
          const right = b.dataset.o === it.ans; if (right) score++;
          document.querySelectorAll('.opts button').forEach(x => { x.disabled = true; if (x.dataset.o === it.ans) x.classList.add('right'); });
          if (!right) b.classList.add('wrong');
          $('#ans').innerHTML = `${it.key ? `<p class="small muted" style="margin:10px 0 0"><b>${esc(it.form)}</b>: ${esc(Morph.label('verb', it.key))}</p>` : ''}${nextBtn()}`;
          bindNext();
        });
      } else {
        const { w, a, key } = it, answers = a.tbl[key], std = Morph.standard(answers);
        V().innerHTML = `${head()}<div class="card"><div class="prompt-kind">${a.kind === 'verb' ? 'Conjugate' : a.kind === 'noun' ? 'Decline' : 'Decline the adjective'}</div>
          <div class="latin">${esc(shownLa(w.la))}</div><div class="small muted">${esc(w.en.slice(0, 90))}</div>
          <div class="english" style="margin-top:14px"><b>${esc(Morph.label(a.kind, key))}</b>?</div>
          <div id="ans"><input type="text" id="typed" placeholder="Type the form" autocomplete="off" autocapitalize="off" spellcheck="false" style="margin-top:8px">${macKeys()}
          <div class="small muted" style="margin-top:6px">${macHint()}</div><button class="primary big" id="chk" style="margin-top:10px">Check</button></div></div>`;
        const go = () => {
          const v = $('#typed').value.trim(), g = Morph.grade(v, answers, S.set.strictMac); if (g.ok) score++;
          $('#ans').innerHTML = `<div class="answer">${g.ok ? answerNote(g) : wrongMsg(v, answers)}<div class="latin">${esc(std)}</div><div class="forms">${miniTable(a, key)}</div>${nextBtn()}</div>`;
          bindNext();
        };
        $('#chk').onclick = go; bindTyped(go);
      }
      $('#lqstop').onclick = () => openLesson(l.id);
    };
    ask();
  }

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
        <div class="card"><div class="latin">${esc(shownLa(w.la))}</div><span class="pill">${POS_SHORT[w.pos]}</span>
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
  // Diederich's own section titles, as listed in the Hiberna Caroli Raetici 'Lodge' edition (sections I–VIII and sub-sections)
  const SECT = ['I. Nouns and Related Words', 'II. Pronouns', 'III. Verbs and Related Words', 'IV. Adjectives and Related Words', 'V. Adverbs', 'VI. Interjections', 'VII. Conjunctions', 'VIII. Prepositions and Prefixes'];
  const SUBSECT = { 1: ['Gods', 'Time', 'Sky', 'Fire', 'Water', 'Earth', 'Plants', 'Food', 'Animals', 'People', 'Body', 'Mind', 'Feelings', 'Talk', 'Writing', 'Work and Play', 'City and Buildings', 'Military', 'Government', 'Social Approval', 'Evil', 'Death', 'Abstractions and Unclassified'],
    3: ['Verbs Which Express or Affect the Location of the Subject', 'Verbs Which Affect the Location of the Object', 'Verbs Which Express or Affect the State of the Subject', 'Verbs Which Affect the State of the Object', 'Constructive Activities', 'Destructive Activities', 'Verbs Affecting Other Verbs', 'Vocal Activities', 'Mental and Sensory Operations', 'Favor', 'Disfavor'],
    4: ['Size', 'Number', 'Texture – Density', 'Appearance', 'Position', 'Time', 'Favorable', 'Unfavorable', 'Unclassified'], 5: ['Time', 'Place', 'Cause – Manner', 'Adversative'] };
  function secHead(sec, n, first) {
    const [a, b] = sec.split('.').map(Number), subs = SUBSECT[a];
    return `<li class="sec">${first && subs ? `<span class="sec1">${esc(SECT[a - 1])}</span>` : ''}<span class="sec2">${subs ? esc(b + '. ' + subs[b - 1]) : esc(SECT[a - 1])}</span><span class="secn">${n} word${n === 1 ? '' : 's'}</span></li>`;
  }
  function fill() {
    const q = listQ.trim(), nq = Morph.norm(q), lq = q.toLowerCase();
    let rows = q ? W.filter(w => Morph.norm(w.la).includes(nq) || Morph.norm(shownLa(w.la)).includes(nq) || w.en.toLowerCase().includes(lq)) : W.slice();
    if (listSort === 'az') rows.sort((a, b) => Morph.norm(a.la).localeCompare(Morph.norm(b.la)));
    else if (listSort === 'diederich') rows.sort((a, b) => a.id - b.id);
    const cnt = {}; if (listSort === 'diederich') rows.forEach(w => { cnt[w.sec] = (cnt[w.sec] || 0) + 1; });
    let prev = null;
    $('#ul').innerHTML = rows.slice(0, listN).map(w => { let h = '';
      if (listSort === 'diederich' && w.sec !== prev) { h = secHead(w.sec, cnt[w.sec], !prev || prev.split('.')[0] !== w.sec.split('.')[0]); prev = w.sec; }
      return h + `<li data-id="${w.id}"><span class="rk">${rankTxt(w)}</span><div class="la">${esc(shownLa(w.la))}</div><div class="en">${esc(w.en)}</div><div class="det"></div></li>`; }).join('') || '<li class="muted">No matches.</li>';
    const bar = $('#ul').previousElementSibling; if (bar) $('#ul').style.setProperty('--lt', bar.offsetHeight + 'px');
    $('#moreBox').innerHTML = rows.length > listN ? `<button class="big" id="lm" style="margin-top:10px">Show more (${rows.length - listN})</button>` : '';
    if ($('#lm')) $('#lm').onclick = () => { listN += 200; fill(); };
    document.querySelectorAll('#ul li[data-id]').forEach(li => li.onclick = e => {
      if (e.target.closest('.det')) return;
      const d = li.querySelector('.det'); d.innerHTML = d.innerHTML ? '' : detail(BY[li.dataset.id]);
      const tb = d.querySelector('.tbtn'); if (tb) tb.onclick = ev => { ev.stopPropagation(); enterTest(+tb.dataset.t); };
    });
  }
  function status(k) { const c = S.cards[k]; if (!c) return 'not started'; const n = c.due - today(); return n <= 0 ? 'due now' : 'next in ' + n + (n === 1 ? ' day' : ' days'); }
  function detail(w) {
    const a = an(w);
    let forms = '';
    if (!a.skip) {
      const T = (cols, rows, get) => `<table><tr><th></th>${cols.map(c => `<th>${c}</th>`).join('')}</tr>${rows.map(r => `<tr><th>${r}</th>${cols.map(c => { const cell = get(r, c); return `<td>${cell && cell.length ? esc(Morph.standard(cell)) : '–'}</td>`; }).join('')}</tr>`).join('')}</table>`;
      if (a.kind === 'verb') forms = verbGroups(a, null, null) + (a.noPassiveWhy ? `<div class="small muted">No passive: ${esc(a.noPassiveWhy)}.</div>` : '') + (a.note ? `<div class="small muted">${esc(a.note)}</div>` : '');
      else if (a.kind === 'noun' || a.pron === 'pers') forms = T(['sg', 'pl'].filter(n => Morph.CASES_X.some(c => a.tbl[c + '.' + n])), Morph.CASES_X.filter(r => a.tbl[r + '.sg'] || a.tbl[r + '.pl']), (r, c) => a.tbl[r + '.' + c]);
      else forms = ['sg', 'pl'].map(n => T(['m', 'f', 'n'].filter(g => a.tbl[g + '.nom.' + n]), Morph.CASES_X.filter(r => a.tbl['m.' + r + '.' + n] || a.tbl['f.' + r + '.' + n]), (r, g) => a.tbl[g + '.' + r + '.' + n])).join('<div style="height:6px"></div>');
    }
    return `<div class="answer small"><div>Diederich section ${w.s || '–'}.${w.ss || ''} · frequency ${w.f != null ? w.f : '–'} · ${POS_SHORT[w.pos]}</div>
      <div>Latin→English: ${status('r:' + w.id)} · English→Latin: ${status('p:' + w.id)}${a.skip ? '' : ' · drills: ' + (S.ds.w[w.id] ? 'seen ' + S.ds.w[w.id] + '×' : 'not yet')}</div>
      ${a.skip ? `<div class="muted">Not in form drills: ${esc(a.skip)}</div>` : `<div class="forms">${forms}</div>`}
      ${a.flag ? `<div class="muted">Note: ${esc(a.flag)}</div>` : ''}
      <button class="link small tbtn" data-t="${w.id}" style="margin-top:6px">Test this word ›</button></div>`;
  }

  // ---------- Test mode (debugging): every feature on one chosen word, progress untouched ----------
  function enterTest(id) { if (!TEST) TEST = { id, snap: JSON.stringify(S) }; else TEST.id = id; Q = null; renderTest(); window.scrollTo(0, 0); }
  function exitTest() { if (!TEST) return; S = fix(JSON.parse(TEST.snap)); TEST = null; UNITS = buildUnits(); }
  function testUnits(id) { const u = new Map(), all = buildUnits(); for (const [c, ids] of all) if (ids.includes(id)) u.set(c, [id]); return u; }
  function renderTest(fin) {
    const w = BY[TEST.id], a = an(w);
    S = fix(JSON.parse(TEST.snap)); UNITS = testUnits(w.id);   // every test run starts from the real progress
    $('#sub').textContent = 'Test mode';
    const why = a.skip ? 'Not in form drills: ' + a.skip : UNITS.size ? '' : 'No forms of this word match your drill settings (Drills › What to drill).';
    V().innerHTML = `<div class="card"><div class="prompt-kind">Test mode · nothing is saved</div>
      <div class="latin" style="margin-top:6px">${esc(shownLa(w.la))}</div><div class="small muted">${esc(w.en.slice(0, 120))}</div>
      ${fin ? `<div class="small" id="tfin" style="margin-top:8px">Last set: ${fin.ok} of ${fin.n} right</div>` : ''}</div>
      <div class="card"><div class="small muted chiph" style="margin-top:0">Flashcard</div>
        <div class="row wrap"><button class="grow" id="tf-r">Latin → English</button><button class="grow" id="tf-p">English → Latin</button></div>
        <div class="small muted chiph">Form drills${UNITS.size ? ` (${UNITS.size} forms)` : ''}</div>
        ${why ? `<p class="small muted" id="tnod">${esc(why)}</p>` : `<div class="row wrap">${MODES.map(([m, l]) => `<button class="grow" data-tm="${m}">${l.replace(' the form', '')}</button>`).join('')}</div>
        <p class="small muted" style="margin:6px 0 0">Uses your drill settings and the “And…?” setting on the About tab.</p>`}
        ${window.Capacitor ? '' : `<div class="small muted chiph">Sentences</div><a class="btn" id="tsent" href="sentences.html?word=${w.id}" style="display:block;text-align:center;text-decoration:none">Sentences with this word ›</a>`}</div>
      <div class="center"><button class="link" id="texit">Exit test mode</button></div>`;
    $('#tf-r').onclick = () => { Q = { kind: 'vocab', items: [{ k: 'r:' + w.id }], done: 0, total: 1 }; next(); };
    $('#tf-p').onclick = () => { Q = { kind: 'vocab', items: [{ k: 'p:' + w.id }], done: 0, total: 1 }; next(); };
    document.querySelectorAll('[data-tm]').forEach(b => b.onclick = () => { S.set.dmode = b.dataset.tm; startDrills(); });
    $('#texit').onclick = () => setTab('list');
    window.__test = TEST;   // for automated UI tests
  }

  // ---------- about / settings ----------
  function renderAbout() {
    $('#sub').textContent = 'About';
    const drillWords = W.filter(w => !an(w).skip).length;
    V().innerHTML = `<div class="card"><h2 style="margin-top:0">Settings</h2>
      <div class="small muted">New flashcard words per day</div><div class="seg" id="snew">${[5, 10, 20].map(n => `<button data-n="${n}" class="${S.set.newPerDay === n ? 'on' : ''}">${n}</button>`).join('')}</div>
      <div class="small muted" style="margin-top:14px">Typed answers (English → Latin cards and drills)</div><div class="seg" id="smac"><button data-m="0" class="${S.set.strictMac ? '' : 'on'}">Macrons optional</button><button data-m="1" class="${S.set.strictMac ? 'on' : ''}">Require macrons</button></div>
      <p class="small muted">With <b>Require macrons</b> on, a missing or wrong macron counts as wrong, and ā ē ī ō ū keys appear under the answer box.</p>
      <div class="small muted" style="margin-top:14px">Identify drills: forms with more than one reading</div><div class="seg" id="sand"><button data-m="1" class="${S.set.andMore ? 'on' : ''}" aria-pressed="${!!S.set.andMore}">Ask “And…?”</button><button data-m="0" class="${S.set.andMore ? '' : 'on'}" aria-pressed="${!S.set.andMore}">Just show them</button></div>
      <p class="small muted">Some forms have several valid parses (puellae: genitive or dative singular, or nominative plural). Any one counts as right. With <b>Ask “And…?”</b> on, a right answer is followed by an optional prompt to name the other readings, with one guess per reading left; skipping costs nothing, and the score uses only your first answer.</p>
      <p class="small muted">Drill settings (which forms, questions per set) are on the Drills tab.</p>
      <div class="row wrap" style="margin-top:14px"><button class="grow" id="exp">Export progress</button><button class="grow" id="imp">Import</button><button class="grow" id="rst">Reset</button></div>
      <input type="file" id="impf" accept="application/json" hidden></div>
      ${window.Capacitor ? '' : '<div class="card"><a class="btn" id="sentlink" href="sentences.html" style="display:block;text-align:center;text-decoration:none">Sentences (beta) ›</a></div>'}
      <div class="card"><h2 style="margin-top:0">How it works</h2>
      <p><b>Today</b> is flashcards: a few new words each day plus whatever is due. Answer <b>Right</b> or <b>Wrong</b> (or type the Latin and it’s checked for you). Cards move through Leitner boxes: each right answer moves a card up a box and spaces it out further (1, 3, 7, 14, 30, 60, 120 days); a wrong answer sends it back to the start and shows it again in a few cards. Latin→English and English→Latin are scheduled separately; the English→Latin card unlocks the day after you first get a word right.</p>
      <p><b>Drills</b> ask for one form at a time (macrons optional unless you turn on <b>Require macrons</b>) and check your answer. Choose the moods, voices, tenses, cases and numbers you want. Forms are generated from the dictionary entry using standard paradigms; ${drillWords} of ${W.length} words are drillable. Words that can’t be generated reliably (defective, impersonal, indeclinable words, some irregulars) are left out and say so in the word list. If you think the app marked you wrong unfairly, tap <b>Count as correct</b>.</p>
      <p>Drills have no schedule: practice in short sets and stop anytime. The app keeps a recent-weighted right/wrong score for each form in each paradigm (say, dative plural in the 3rd declension) and asks more often about forms you miss, haven’t tried, or haven’t seen lately, then picks a word with that form, slightly favoring common words and words you know from flashcards. A form you miss comes back a few questions later with a different word. <b>Weak spots</b> on the Drills tab lists your lowest-accuracy forms.</p>
      <p>Turn on <b>Sentences in drills</b> and about one question in seven is a short sentence built only from words you have already seen, aimed at a form you miss. Translate it, or identify one word. Helper words you have not studied yet show a small gloss. Each sentence counts as one answer.</p>
      <p>The <b>Cheat sheet</b> has endings tables for every declension and conjugation the drills use, plus the pronouns and the main irregular verbs; open it from any drill question.</p>
      <p>Your progress stays on this device (localStorage). No account, no tracking; works offline once installed.</p></div>
      <div class="card"><h2 style="margin-top:0">Sources &amp; credits</h2>
      <p class="small">Word list: <b>Paul B. Diederich</b>, <i>The Frequency of Latin Words and Their Endings</i> (University of Chicago, 1939) — the basic vocabulary of about 1,500 words grouped by topic.</p>
      <p class="small">Entries and English glosses: the “Lodge edition” of Diederich’s list compiled by <b>Carolus Raeticus</b> (<a href="https://hiberna-cr.wikidot.com/" rel="noopener">Hiberna Caroli Raetici</a>), with meanings from Gonzalez Lodge, <i>The Vocabulary of High School Latin</i> (1922) and J. T. White (1904). Licensed <a href="https://creativecommons.org/licenses/by-sa/3.0/" rel="noopener">CC BY‑SA 3.0</a>; this app’s word data is shared under the same license. Frequency ranks come from Diederich’s frequency counts (DWF.csv) published on the same site.</p>
      <p class="small">List size cross-checked against <b>John Muccigrosso</b>’s <a href="https://github.com/Jmuccigr/Latin_vocabulary" rel="noopener">Latin_vocabulary</a> data (Diederich: 1,474 items).</p>
      <p class="small muted">Made by Eric Ianni. Source code: <a href="https://github.com/ericianni/latin-diederich-vocab" rel="noopener">github.com/ericianni/latin-diederich-vocab</a>.</p></div>`;
    document.querySelectorAll('#snew button').forEach(b => b.onclick = () => { S.set.newPerDay = +b.dataset.n; save(); renderAbout(); });
    document.querySelectorAll('#smac button').forEach(b => b.onclick = () => { S.set.strictMac = b.dataset.m === '1'; save(); renderAbout(); });
    document.querySelectorAll('#sand button').forEach(b => b.onclick = () => { S.set.andMore = b.dataset.m === '1'; save(); renderAbout(); });
    $('#exp').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(S)], { type: 'application/json' })); a.download = 'latin1400-progress.json'; a.click(); };
    $('#imp').onclick = () => $('#impf').click();
    $('#impf').onchange = e => { const f = e.target.files[0]; if (!f) return; f.text().then(t => { try { const s = JSON.parse(t); if (!s.cards) throw 0; S = fix(s); save(); UNITS = buildUnits(); alert('Progress imported.'); renderAbout(); } catch (x) { alert('That file is not a Latin 1400 progress export.'); } }); };
    $('#rst').onclick = () => { if (confirm('Erase all progress on this device?')) { S = fix({}); save(); UNITS = buildUnits(); renderAbout(); } };
  }

  // ---------- boot ----------
  document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => setTab(b.dataset.tab));
  const SENT_SRC = ['sentences/lexicon_s1.js', 'sentences/lexicon_s2.js', 'sentences/lexicon_s3.js', 'sentences/lexicon_s4.js', 'sentences/lexicon_s5.js', 'sentences/lexicon_s7.js', 'sentences/lexicon_s8.js', 'sentences/lexicon.js', 'sentences/engine.js'];
  let sentLoad = null;
  function loadSentences() {
    if (window.LatinEngine) return Promise.resolve();
    if (!sentLoad) sentLoad = SENT_SRC.reduce((p, src) => p.then(() => new Promise((res, rej) => {
      const el = document.createElement('script'); el.src = src; el.onload = () => res(); el.onerror = () => rej(new Error(src)); document.body.appendChild(el);
    })), Promise.resolve()).catch(e => { sentLoad = null; throw e; });
    return sentLoad;
  }
  fetch('data/words.json').then(r => r.json()).then(all => {
    W = all.filter(w => !w.d).sort((a, b) => (a.r || 1e9) - (b.r || 1e9) || a.id - b.id);
    W.forEach(w => { BY[w.id] = w; });
    const LW = []; all.forEach(w => { LW[w.id] = w; }); self.LatinWords = LW;
    let ps = null; all.sort((a, b) => a.id - b.id).forEach(w => { if (w.s) ps = w.s + '.' + w.ss; w.sec = ps; });   // 3 entries without a section sit inside the one before
    UNITS = buildUnits();
    const t = (location.hash || '').slice(1);
    save();   // persist any v1 -> v2 migration
    setTab(['learn', 'drills', 'cheat', 'quiz', 'list', 'about'].includes(t) ? t : 'today');
  }).catch(() => { V().innerHTML = '<p class="card">Could not load the word list. Check your connection and reload.</p>'; });
  // No service worker inside the Capacitor WebView: assets are already bundled in the APK.
  if ('serviceWorker' in navigator && !window.Capacitor) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
})();
