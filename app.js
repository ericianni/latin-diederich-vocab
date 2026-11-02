/* Latin 1400 — Diederich vocabulary trainer. Everything lives in localStorage; no backend. */
(function () {
  'use strict';
  const KEY = 'latin1400.v1';
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const today = () => { const d = new Date(); return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000); };
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const POS_SHORT = { noun: 'noun', verb: 'verb', adjective: 'adj.', adverb: 'adv.', conjunction: 'conj.', preposition: 'prep.', pronoun: 'pron.', indeclinable: 'indecl.', interjection: 'interj.' };
  const REVIEW_CAP = 60, DRILL_CAP = 15;

  // ---------- state ----------
  let S = load();
  function load() { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.cards) return fix(s); } catch (e) { /* fresh */ } return fix({}); }
  function fix(s) { s.cards = s.cards || {}; s.set = Object.assign({ newPerDay: 10, drillNew: 3 }, s.set || {}); s.day = s.day || {}; return s; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage full or private mode */ } }
  function day() { const t = today(); if (S.day.d !== t) S.day = { d: t, nv: 0, nd: 0, extra: 0 }; return S.day; }

  // ---------- SM-2 ----------
  function sched(c, g) {
    const t = today();
    if (g === 0) { c.reps = 0; c.ivl = 0; c.lap = (c.lap || 0) + 1; c.ef = Math.max(1.3, c.ef - 0.2); c.due = t; return c; }
    let iv;
    if (g === 1) { iv = c.reps === 0 ? 1 : Math.max(c.ivl + 1, Math.round(c.ivl * 1.2)); c.ef = Math.max(1.3, c.ef - 0.15); }
    else if (g === 2) iv = c.reps === 0 ? 1 : c.reps === 1 ? 3 : Math.round(c.ivl * c.ef);
    else { iv = c.reps === 0 ? 3 : c.reps === 1 ? 5 : Math.round(c.ivl * c.ef * 1.3); c.ef += 0.15; }
    c.ivl = Math.max(1, iv); c.reps++; c.due = t + c.ivl; return c;
  }
  const newCard = () => ({ ef: 2.5, ivl: 0, reps: 0, due: today(), lap: 0 });
  const ivlText = (k, g) => { const c = sched(Object.assign(newCard(), S.cards[k] || {}), g); return g === 0 ? 'now' : c.ivl === 1 ? '1 day' : c.ivl < 31 ? c.ivl + ' days' : Math.round(c.ivl / 30) + ' mo'; };

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

  function buildUnits() {
    const u = [];
    for (const w of W) {
      const a = an(w); if (a.skip) continue;
      if (a.kind === 'verb') { if (a.tbl['pres.2s']) u.push('d:' + w.id + ':p'); if (a.tbl['perf.2s']) u.push('d:' + w.id + ':f'); }
      else u.push('d:' + w.id + ':' + (a.kind === 'noun' ? 'n' : 'a'));
    }
    return u;
  }

  // ---------- queues ----------
  function dueKeys(prefixRe, cap) {
    const t = today();
    return Object.keys(S.cards).filter(k => prefixRe.test(k) && S.cards[k].due <= t).sort((a, b) => S.cards[a].due - S.cards[b].due).slice(0, cap);
  }
  function newWords(n) { const out = []; for (const w of W) { if (out.length >= n) break; if (!S.cards['r:' + w.id]) out.push('r:' + w.id); } return out; }
  function newUnits(n) {
    if (n <= 0) return [];
    const fresh = UNITS.filter(k => !S.cards[k]);
    const seen = fresh.filter(k => S.cards['r:' + k.split(':')[1]]);
    return seen.concat(fresh.filter(k => !seen.includes(k))).slice(0, n);
  }
  function counts() {
    const d = day();
    const newLeft = Math.max(0, S.set.newPerDay + (d.extra || 0) - d.nv);
    return {
      vDue: dueKeys(/^[rp]:/, REVIEW_CAP).length,
      vNew: newWords(newLeft).length,
      dDue: dueKeys(/^d:/, DRILL_CAP).length,
      dNew: newUnits(Math.max(0, S.set.drillNew - d.nd)).length,
    };
  }

  let Q = null; // current session {phase, items:[{k,isNew}], done, total}
  function startSession(which) {
    const d = day();
    const items = [];
    if (which !== 'drill') {
      const rev = dueKeys(/^[rp]:/, REVIEW_CAP).map(k => ({ k }));
      const nw = newWords(Math.max(0, S.set.newPerDay + (d.extra || 0) - d.nv)).map(k => ({ k, isNew: true }));
      // weave one new card after every two reviews
      while (rev.length || nw.length) { if (rev.length) items.push(rev.shift()); if (rev.length) items.push(rev.shift()); if (nw.length) items.push(nw.shift()); }
    }
    if (which !== 'vocab') {
      dueKeys(/^d:/, DRILL_CAP).forEach(k => items.push({ k }));
      newUnits(Math.max(0, S.set.drillNew - d.nd)).forEach(k => items.push({ k, isNew: true }));
    }
    Q = { items, done: 0, total: items.length };
    next();
  }
  function grade(item, g) {
    const d = day();
    const k = item.k;
    const first = !S.cards[k];
    const c = sched(S.cards[k] || newCard(), g);
    S.cards[k] = c;
    if (first && item.isNew) { if (k[0] === 'd') d.nd++; else d.nv++; }
    if (k[0] === 'r' && g >= 2 && !S.cards['p' + k.slice(1)]) { const p = newCard(); p.due = today() + 1; S.cards['p' + k.slice(1)] = p; }
    save();
    Q.done++;
    if (g === 0) { Q.items.splice(Math.min(3, Q.items.length), 0, { k }); Q.total++; }
    next();
  }
  function next() {
    const it = Q && Q.items.shift();
    if (!it) { Q = null; return renderToday(); }
    if (it.k[0] === 'd') renderDrill(it); else renderVocab(it);
  }

  // ---------- views ----------
  const V = () => $('#view');
  function setTab(t) {
    document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
    if (t !== 'today') Q = null;
    ({ today: renderToday, quiz: renderQuiz, list: renderList, about: renderAbout })[t]();
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
  function bindStop() { const b = $('#stop'); if (b) b.onclick = () => { Q = null; renderToday(); }; }

  function renderToday() {
    $('#sub').textContent = 'Diederich\u2019s high-frequency list';
    const c = counts();
    const vTot = c.vDue + c.vNew, dTot = c.dDue + c.dNew;
    const mins = Math.max(1, Math.round((c.vDue * 8 + c.vNew * 15 + (c.dDue + c.dNew) * 15) / 60));
    if (vTot + dTot === 0) {
      V().innerHTML = `<div class="card done"><div class="check">✓</div><h2>Done for today</h2>
        <p class="muted">Nice work. Everything due is reviewed. Come back tomorrow — new cards and reviews will be waiting.</p>
        ${progressBar()}</div>
        <div class="card"><div class="row wrap"><button class="grow" id="more">Learn 5 more words</button><button class="grow" id="goquiz">Quick quiz</button></div></div>`;
      $('#more').onclick = () => { day().extra = (day().extra || 0) + 5; save(); startSession('vocab'); };
      $('#goquiz').onclick = () => setTab('quiz');
      return;
    }
    V().innerHTML = `<div class="card">
      <div class="prompt-kind">Today · about ${mins} min</div>
      <div class="stats" style="margin:12px 0 14px">
        <div class="stat"><b>${c.vNew}</b><span>new words</span></div>
        <div class="stat"><b>${c.vDue}</b><span>reviews</span></div>
        <div class="stat"><b>${dTot}</b><span>form drills</span></div>
      </div>
      <button class="primary big" id="go">Start</button>
      <div class="row" style="margin-top:8px"><button class="grow" id="gov" ${vTot ? '' : 'disabled'}>Vocab only</button><button class="grow" id="god" ${dTot ? '' : 'disabled'}>Drills only</button></div>
      <p class="small muted center" style="margin:10px 0 0">Stop whenever you like — every answer is saved.</p></div>
      <div class="card">${progressBar()}</div>`;
    $('#go').onclick = () => startSession('all');
    $('#gov').onclick = () => startSession('vocab');
    $('#god').onclick = () => startSession('drill');
  }

  function gradeButtons(k) {
    return `<div class="grades">${['Again', 'Hard', 'Good', 'Easy'].map((n, g) => `<button class="g${g}" data-g="${g}">${n}<small>${ivlText(k, g)}</small></button>`).join('')}</div>`;
  }
  function bindGrades(it) { document.querySelectorAll('.grades button').forEach(b => b.onclick = () => grade(it, +b.dataset.g)); }

  function renderVocab(it) {
    const [dir, id] = it.k.split(':'); const w = BY[id];
    const pills = `<span class="pill">${POS_SHORT[w.pos] || w.pos}</span><span class="pill">rank ${rankTxt(w)}</span>${it.isNew ? '<span class="pill">new</span>' : ''}`;
    if (dir === 'r') {
      V().innerHTML = `${sessionHead()}<div class="card" id="vc"><div class="prompt-kind">Latin → English</div>
        <div class="latin">${esc(w.la)}</div>${pills}
        <div id="ans"><button class="primary big" id="show" style="margin-top:18px">Show answer</button></div></div>`;
      $('#show').onclick = () => { $('#ans').innerHTML = `<div class="answer"><div class="english">${esc(w.en)}</div>${gradeButtons(it.k)}</div>`; bindGrades(it); };
    } else {
      const hs = heads(w.la);
      V().innerHTML = `${sessionHead()}<div class="card" id="vc"><div class="prompt-kind">English → Latin</div>
        <div class="english">${esc(w.en)}</div>${pills}
        <div id="ans"><input type="text" id="typed" placeholder="Type the Latin word (optional)" autocomplete="off" autocapitalize="off" spellcheck="false" style="margin-top:14px">
        <button class="primary big" id="show" style="margin-top:10px">Check</button></div></div>`;
      const go = () => {
        const v = $('#typed').value.trim();
        const verdict = v ? (Morph.check(v, hs) ? '<div class="ok">✓ Correct</div>' : `<div class="no">✗ You typed “${esc(v)}”</div>`) : '';
        $('#ans').innerHTML = `<div class="answer">${verdict}<div class="latin">${esc(w.la)}</div><div class="small muted">Grade yourself:</div>${gradeButtons(it.k)}</div>`;
        bindGrades(it);
      };
      $('#show').onclick = go; $('#typed').onkeydown = e => { if (e.key === 'Enter') go(); };
      setTimeout(() => { const t = $('#typed'); if (t && matchMedia('(hover:hover)').matches) t.focus(); }, 0);
    }
    bindStop();
  }

  function drillKeys(unit, a) {
    const ks = Object.keys(a.tbl);
    if (unit === 'p') return ks.filter(k => /^(pres|impf|fut)\./.test(k) && k !== 'pres.1s');
    if (unit === 'f') return ks.filter(k => /^(perf|plup|fperf)\./.test(k));
    if (unit === 'n') return ks.filter(k => k !== 'nom.sg');
    return ks.filter(k => k !== 'm.nom.sg');
  }
  function promptLabel(a, key) {
    if (a.kind === 'verb') { const t = key.split('.')[0]; const who = Morph.label('verb', key).replace(' ' + Morph.TENSES[t], ''); return `${who} · ${Morph.TENSES[t]} ${a.voice === 'dep' ? 'indicative (deponent)' : 'active indicative'}`; }
    return Morph.label(a.kind === 'noun' ? 'noun' : 'adj', key);
  }
  function miniTable(a, key) {
    const parts = key.split('.');
    let rows;
    if (a.kind === 'verb') rows = ['1s', '2s', '3s', '1p', '2p', '3p'].map(p => [p.replace('s', ' sg').replace('p', ' pl'), parts[0] + '.' + p]);
    else if (a.kind === 'noun') rows = Morph.CASES.map(c => [c, c + '.' + parts[1]]);
    else rows = Morph.CASES.map(c => [c, parts[0] + '.' + c + '.' + parts[2]]);
    return `<table>${rows.filter(r => a.tbl[r[1]]).map(([l, k]) => `<tr${k === key ? ' style="font-weight:700"' : ''}><th>${l}</th><td>${esc(a.tbl[k].join(' / '))}</td></tr>`).join('')}</table>`;
  }
  function renderDrill(it) {
    const [, id, unit] = it.k.split(':'); const w = BY[id]; const a = an(w);
    const keys = drillKeys(unit, a); const key = keys[Math.floor(Math.random() * keys.length)];
    const answers = a.tbl[key];
    const kindTxt = a.kind === 'verb' ? (unit === 'p' ? 'Conjugate · present system' : 'Conjugate · perfect system') : a.kind === 'noun' ? 'Decline' : 'Decline the adjective';
    V().innerHTML = `${sessionHead()}<div class="card"><div class="prompt-kind">${kindTxt}${it.isNew ? ' · <span class="pill">new</span>' : ''}</div>
      <div class="latin">${esc(w.la.replace(/\s\([^)]*\)$/, ''))}</div><div class="small muted">${esc(w.en.slice(0, 90))}</div>
      <div class="english" style="margin-top:14px"><b>${esc(promptLabel(a, key))}</b>?</div>
      <div id="ans"><input type="text" id="typed" placeholder="Type the form" autocomplete="off" autocapitalize="off" spellcheck="false" style="margin-top:8px">
      <div class="small muted" style="margin-top:6px">Macrons optional.</div>
      <button class="primary big" id="chk" style="margin-top:10px">Check</button></div></div>`;
    const go = () => {
      const v = $('#typed').value.trim();
      const ok = v && Morph.check(v, answers);
      $('#ans').innerHTML = `<div class="answer">${ok ? '<div class="ok">✓ Correct</div>' : `<div class="no">✗ ${v ? 'You typed “' + esc(v) + '”' : 'Not answered'}</div>`}
        <div class="latin">${esc(answers.join(' / '))}</div>${a.flag ? `<div class="small muted">Note: ${esc(a.flag)}</div>` : ''}
        <div class="forms">${miniTable(a, key)}</div>
        <div class="row" style="margin-top:14px">${ok ? '<button class="primary big" data-g="2">Next</button>' : '<button class="grow" data-g="2">Count as correct</button><button class="primary grow" data-g="0">Next</button>'}</div></div>`;
      document.querySelectorAll('#ans button[data-g]').forEach(b => b.onclick = () => grade(it, +b.dataset.g));
    };
    $('#chk').onclick = go; $('#typed').onkeydown = e => { if (e.key === 'Enter') go(); };
    setTimeout(() => { const t = $('#typed'); if (t && matchMedia('(hover:hover)').matches) t.focus(); }, 0);
    bindStop();
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
      const P = ['1s', '2s', '3s', '1p', '2p', '3p'];
      if (a.kind === 'verb') forms = ['pres', 'impf', 'fut', 'perf', 'plup', 'fperf'].filter(t => a.tbl[t + '.3s']).map(t => `<div class="small muted" style="margin-top:6px">${Morph.TENSES[t]}</div>` + `<table><tr>${P.map(p => `<td>${esc(a.tbl[t + '.' + p].join('/'))}</td>`).join('')}</tr></table>`).join('');
      else if (a.kind === 'noun') forms = T(['sg', 'pl'].filter(n => a.tbl['nom.' + n] || a.tbl['gen.' + n]), Morph.CASES, (r, c) => a.tbl[r + '.' + c]);
      else forms = ['sg', 'pl'].map(n => T(['m', 'f', 'n'].filter(g => a.tbl[g + '.nom.' + n]), Morph.CASES, (r, g) => a.tbl[g + '.' + r + '.' + n])).join('<div style="height:6px"></div>');
    }
    return `<div class="answer small"><div>Diederich section ${w.s || '–'}.${w.ss || ''} · frequency ${w.f != null ? w.f : '–'} · ${POS_SHORT[w.pos]}</div>
      <div>Latin→English: ${status('r:' + w.id)} · English→Latin: ${status('p:' + w.id)}</div>
      ${a.skip ? `<div class="muted">Not in form drills: ${esc(a.skip)}</div>` : `<div class="forms">${forms}</div>`}
      ${a.flag ? `<div class="muted">Note: ${esc(a.flag)}</div>` : ''}</div>`;
  }

  // ---------- about / settings ----------
  function renderAbout() {
    $('#sub').textContent = 'About';
    const drillWords = new Set(UNITS.map(u => u.split(':')[1])).size;
    V().innerHTML = `<div class="card"><h2 style="margin-top:0">Settings</h2>
      <div class="small muted">New words per day</div><div class="seg" id="snew">${[5, 10, 20].map(n => `<button data-n="${n}" class="${S.set.newPerDay === n ? 'on' : ''}">${n}</button>`).join('')}</div>
      <div class="small muted" style="margin-top:10px">New form drills per day</div><div class="seg" id="sdr">${[0, 3, 5].map(n => `<button data-n="${n}" class="${S.set.drillNew === n ? 'on' : ''}">${n}</button>`).join('')}</div>
      <div class="row wrap" style="margin-top:14px"><button class="grow" id="exp">Export progress</button><button class="grow" id="imp">Import</button><button class="grow" id="rst">Reset</button></div>
      <input type="file" id="impf" accept="application/json" hidden></div>
      <div class="card"><h2 style="margin-top:0">How it works</h2>
      <p>Each day you get a few new words plus whatever is due. Cards use SM‑2 spaced repetition: <b>Again</b> brings a card back in a minute, <b>Good</b> spaces it out further each time. Latin→English and English→Latin are scheduled separately; the English→Latin card unlocks the day after you first get a word right.</p>
      <p>Form drills ask for one verb, noun, or adjective form at a time (macrons optional). Forms are generated from the dictionary entry using standard paradigms; ${drillWords} of ${W.length} words are drillable. Words that can’t be generated reliably (defective, impersonal, indeclinable verbs and nouns, some irregulars) are left out of drills and say so in the word list.</p>
      <p>Your progress stays on this device (localStorage). No account, no tracking; works offline once installed.</p></div>
      <div class="card"><h2 style="margin-top:0">Sources &amp; credits</h2>
      <p class="small">Word list: <b>Paul B. Diederich</b>, <i>The Frequency of Latin Words and Their Endings</i> (University of Chicago, 1939) — the basic vocabulary of about 1,500 words grouped by topic.</p>
      <p class="small">Entries and English glosses: the “Lodge edition” of Diederich’s list compiled by <b>Carolus Raeticus</b> (<a href="https://hiberna-cr.wikidot.com/" rel="noopener">Hiberna Caroli Raetici</a>), with meanings from Gonzalez Lodge, <i>The Vocabulary of High School Latin</i> (1922) and J. T. White (1904). Licensed <a href="https://creativecommons.org/licenses/by-sa/3.0/" rel="noopener">CC BY‑SA 3.0</a>; this app’s word data is shared under the same license. Frequency ranks come from Diederich’s frequency counts (DWF.csv) published on the same site.</p>
      <p class="small">List size cross-checked against <b>John Muccigrosso</b>’s <a href="https://github.com/Jmuccigr/Latin_vocabulary" rel="noopener">Latin_vocabulary</a> data (Diederich: 1,474 items).</p>
      <p class="small muted">Made by Eric Ianni. Source code: <a href="https://github.com/ericianni/latin-diederich-vocab" rel="noopener">github.com/ericianni/latin-diederich-vocab</a>.</p></div>`;
    document.querySelectorAll('#snew button').forEach(b => b.onclick = () => { S.set.newPerDay = +b.dataset.n; save(); renderAbout(); });
    document.querySelectorAll('#sdr button').forEach(b => b.onclick = () => { S.set.drillNew = +b.dataset.n; save(); renderAbout(); });
    $('#exp').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(S)], { type: 'application/json' })); a.download = 'latin1400-progress.json'; a.click(); };
    $('#imp').onclick = () => $('#impf').click();
    $('#impf').onchange = e => { const f = e.target.files[0]; if (!f) return; f.text().then(t => { try { const s = JSON.parse(t); if (!s.cards) throw 0; S = fix(s); save(); alert('Progress imported.'); renderAbout(); } catch (x) { alert('That file is not a Latin 1400 progress export.'); } }); };
    $('#rst').onclick = () => { if (confirm('Erase all progress on this device?')) { S = fix({}); save(); renderAbout(); } };
  }

  // ---------- boot ----------
  document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => setTab(b.dataset.tab));
  fetch('data/words.json').then(r => r.json()).then(all => {
    W = all.filter(w => !w.d).sort((a, b) => (a.r || 1e9) - (b.r || 1e9) || a.id - b.id);
    W.forEach(w => { BY[w.id] = w; });
    UNITS = buildUnits();
    const t = (location.hash || '').slice(1);
    setTab(['quiz', 'list', 'about'].includes(t) ? t : 'today');
  }).catch(() => { V().innerHTML = '<p class="card">Could not load the word list. Check your connection and reload.</p>'; });
  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
})();
