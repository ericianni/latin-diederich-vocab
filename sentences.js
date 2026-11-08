/* Latin 1400 — Sentences (beta). Short sessions of generated Latin sentences: translate them into English, or identify
   the case/number of a highlighted noun or the tense/person/voice of the verb. Everything is rule-based (sentences/engine.js
   + morph.js): no AI, no network after the first load. Reads the app's progress (read-only) for the "words I've seen" pool. */
(function () {
  'use strict';
  const E = window.LatinEngine, LEX = E.LEX;
  const $ = s => document.querySelector(s);
  const V = () => $('#view');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const APP_KEY = 'latin1400.v1', KEY = 'latin1400.sent.v1';

  const TPL_NAMES = {
    SV: 'Subject + verb', SV_PP: 'With a preposition', SOV: 'Subject, object, verb', SOV_ADJ: 'With an adjective',
    PP_ADJ: 'Preposition + adjective', PASSIVE: 'Passive voice', DAT_IO: 'Indirect object (dative)', DAT_VERB: 'Verbs that take a dative',
    COPULA: 'sum + adjective', MEANS: 'Ablative of means', PRONOUN: 'Pronoun subjects (I, you, we)', PRON_OBJ: 'Pronouns as objects (mē, tibi…)',
    DET: 'Possessives & this/that', ADV: 'Adverbs', COORD: 'and / or / neither…nor',
  };
  const CASES = [['nom', 'Nom.'], ['gen', 'Gen.'], ['dat', 'Dat.'], ['acc', 'Acc.'], ['abl', 'Abl.']];
  const NUMS = [['sg', 'Singular'], ['pl', 'Plural']];
  const TENSES = [['pres', 'Present'], ['impf', 'Imperfect'], ['perf', 'Perfect'], ['fut', 'Future']];
  const PERS = [['1s', '1st sg.'], ['2s', '2nd sg.'], ['3s', '3rd sg.'], ['1p', '1st pl.'], ['2p', '2nd pl.'], ['3p', '3rd pl.']];
  const VOICES = [['act', 'Active'], ['pas', 'Passive']];
  const LBL = Object.fromEntries([].concat(CASES, NUMS, TENSES, PERS, VOICES));
  const CASE_FULL = { nom: 'nominative', gen: 'genitive', dat: 'dative', acc: 'accusative', abl: 'ablative' };
  const TENSE_FULL = { pres: 'present', impf: 'imperfect', perf: 'perfect', fut: 'future' };

  // ---------- settings (own key; the app's progress is only read) ----------
  const DEF = { ex: 'translate', ans: 'typed', pool: 'seen', len: 10, tpl: E.TEMPLATES.slice() };
  let set = DEF;
  try { set = Object.assign({}, DEF, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { set = Object.assign({}, DEF); }
  set.tpl = (set.tpl || []).filter(t => E.TEMPLATES.includes(t)); if (!set.tpl.length) set.tpl = E.TEMPLATES.slice();
  const saveSet = () => { try { localStorage.setItem(KEY, JSON.stringify(set)); } catch (e) { /* private mode */ } };

  // content words the engine can use (prepositions, personal pronouns and sum are always allowed and not counted)
  const CONTENT = (() => { const ids = new Set();
    for (const g of ['nouns', 'verbs', 'adjs', 'advs', 'conjs']) for (const k of Object.keys(LEX[g] || {})) { const x = LEX[g][k];
      if (typeof x.id === 'number' && k !== 'sum') ids.add(x.id); for (const a of x.alt || []) if (typeof a.id === 'number') ids.add(a.id); }
    if (LEX.extras && LEX.extras.nox) ids.add(LEX.extras.nox.id); return ids; })();
  // "seen" = has a flashcard (either direction) or has come up in a form drill
  function seenIds() {
    let S = {}; try { S = JSON.parse(localStorage.getItem(APP_KEY) || '{}') || {}; } catch (e) { S = {}; }
    const ids = new Set();
    for (const k of Object.keys(S.cards || {})) { const m = k.match(/^[rp]:(\d+)$/); if (m) ids.add(+m[1]); }
    for (const k of Object.keys((S.ds && S.ds.w) || {})) if (S.ds.w[k]) ids.add(+k);
    return [...ids].filter(id => CONTENT.has(id));
  }

  // Test mode (from the app's word list): sentences.html?word=ID shows only sentences that use that word, from all words.
  const TW = +(new URLSearchParams(location.search).get('word')) || null;

  // ---------- session ----------
  let ses = null;
  function makeSentence(rng, seen) {
    for (let tries = 0; tries < (TW ? 3000 : 40) && ses.tpls.length; tries++) {
      const tpl = ses.tpls[Math.floor(rng() * ses.tpls.length)];
      let s;
      try { s = E.generate(rng, { template: tpl }); } catch (e) { ses.tpls = ses.tpls.filter(t => t !== tpl); continue; } // this template can't be built from the pool
      if (seen.has(s.la)) continue;
      if (TW && !E.sentenceIds(s).includes(TW)) continue;
      if (set.ex === 'identify') {
        const ts = E.identifyTargets(s); if (!ts.length) continue;
        const verbs = ts.filter(t => t.kind === 'verb'), nouns = ts.filter(t => t.kind === 'noun');
        s.target = (verbs.length && (!nouns.length || rng() < 0.45)) ? verbs[0] : nouns[Math.floor(rng() * nouns.length)];
      }
      seen.add(s.la); return s;
    }
    return null;
  }
  function start() {
    E.setPool(TW ? null : set.pool === 'seen' ? seenIds() : null);
    const seed = (Date.now() % 2147483647) >>> 0;
    ses = { rng: E.mulberry32(seed), tpls: set.tpl.slice(), items: [], i: 0, right: 0, missed: [], picked: [], chips: null, checked: false, sel: {} };
    const seen = new Set();
    for (let n = 0; n < set.len; n++) { const s = makeSentence(ses.rng, seen); if (!s) break; ses.items.push(s); }
    if (!ses.items.length) { renderHome(TW ? 'No sentences with this word in the chosen sentence types. Choose more types; some words aren’t used by the sentence engine yet.' : set.pool === 'seen'
      ? 'Not enough of your words fit these sentence types yet. Learn a few more words, choose more sentence types, or switch to All words.'
      : 'No sentences could be made with these sentence types. Choose more types.'); return; }
    ses.short = ses.items.length < set.len;
    showQ();
  }

  function sentenceHtml(s, hl) {
    const toks = s.laTokens.map((t, k) => k === 0 ? cap(t) : t);
    return toks.map((t, k) => hl && hl.includes(k) ? `<mark class="tgt">${esc(t)}</mark>` : esc(t)).join(' ') + '.';
  }
  function seg(id, opts, cur, disabled) {
    return `<div class="chips idc" data-g="${id}">${opts.map(([v, l]) => `<button data-v="${v}" class="${cur === v ? 'on' : ''}" aria-pressed="${cur === v}"${disabled ? ' disabled' : ''}>${esc(l)}</button>`).join('')}</div>`;
  }
  function idRows(t, locked) {
    const r = [];
    if (t.kind === 'noun') { r.push(['case', 'Case', CASES], ['num', 'Number', NUMS]); }
    else { r.push(['tense', 'Tense', TENSES], ['person', 'Person & number', PERS]); if (t.hasVoice) r.push(['voice', 'Voice', VOICES]); }
    return r.map(([g, title, opts]) => `<div class="idrow${locked ? ' locked' : ''}"><div class="small muted chiph">${title}</div>${seg(g, opts, ses.sel[g], locked)}</div>`).join('');
  }
  const idAnswer = t => t.kind === 'noun' ? `${CASE_FULL[t.case]} ${t.num === 'sg' ? 'singular' : 'plural'}`
    : t.accept.map(a => `${TENSE_FULL[a.tense]} ${LBL[a.person]}${t.hasVoice ? ' ' + (a.voice === 'act' ? 'active' : 'passive') : ''}`).filter((x, i, arr) => arr.indexOf(x) === i).join(' or ');
  const idWho = t => t.kind === 'noun' ? (t.pron ? 'pronoun' : 'noun') : 'verb';

  function showQ() {
    const s = ses.items[ses.i]; ses.checked = false; ses.picked = []; ses.sel = {};
    if (set.ex === 'identify' && s.target.kind === 'verb' && !s.target.hasVoice) ses.sel.voice = 'act';
    if (set.ex === 'translate' && set.ans === 'chips') ses.chips = E.chipsLaEn(s, E.mulberry32(Math.floor(ses.rng() * 1e9)));
    renderQ();
    if (set.ex === 'translate' && set.ans === 'typed' && window.matchMedia('(min-width: 700px)').matches) $('#ans').focus();
  }
  function renderQ(fb) {
    const s = ses.items[ses.i], tr = set.ex === 'translate', t = s.target;
    const head = `<div class="row"><div class="prompt-kind grow">${tr ? 'Translate into English' : 'Identify the highlighted ' + idWho(t)}</div><div class="small muted">${ses.i + 1} / ${ses.items.length}</div></div>
      <div class="bar"><i style="width:${(ses.i / ses.items.length) * 100}%"></i></div>
      <p class="latin" lang="la" id="la">${sentenceHtml(s, tr ? null : t.idx)}</p>`;
    let body = '';
    if (tr && set.ans === 'typed') body = `<input type="text" id="ans" lang="en" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Type the English"${ses.checked ? ' disabled' : ''} value="${esc(ses.typed || '')}"><p class="small muted" style="margin:6px 0 0">Articles (a, the) are optional.</p>`;
    else if (tr) {
      body = `<div class="chips sline" id="aline" lang="en">${ses.picked.map((bi, k) => `<button data-k="${k}"${ses.checked ? ' disabled' : ''}>${esc(ses.chips.bank[bi])}</button>`).join('') || '<span class="small muted">Tap the words in order</span>'}</div>
        <div class="chips sbank" id="bank" lang="en">${ses.chips.bank.map((w, bi) => `<button data-b="${bi}" class="${ses.picked.includes(bi) ? 'used' : ''}"${ses.checked || ses.picked.includes(bi) ? ' disabled' : ''}>${esc(w)}</button>`).join('')}</div>`;
    } else body = idRows(t, ses.checked);
    const ready = tr ? (set.ans === 'typed' ? true : ses.picked.length > 0) : (t.kind === 'noun' ? ses.sel.case && ses.sel.num : ses.sel.tense && ses.sel.person && ses.sel.voice);
    const btn = ses.checked ? `<button class="primary big" id="next">${ses.i + 1 < ses.items.length ? 'Next' : 'See results'}</button>`
      : `<button class="primary big" id="check"${ready ? '' : ' disabled'}>Check</button>`;
    V().innerHTML = `<div class="card">${head}${body}${fb || ''}<div style="margin-top:14px">${btn}</div></div>
      <div class="center"><button class="link" id="quit">End session</button></div>`;
    wireQ();
  }
  function wireQ() {
    const s = ses.items[ses.i];
    if ($('#ans')) { $('#ans').oninput = e => { ses.typed = e.target.value; };
      $('#ans').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); ses.checked ? next() : check(); } }; }
    document.querySelectorAll('#bank button').forEach(b => b.onclick = () => { if (ses.checked) return; ses.picked.push(+b.dataset.b); renderQ(); });
    document.querySelectorAll('#aline button').forEach(b => b.onclick = () => { if (ses.checked) return; ses.picked.splice(+b.dataset.k, 1); renderQ(); });
    document.querySelectorAll('.idc button').forEach(b => b.onclick = () => { if (ses.checked) return; ses.sel[b.parentNode.dataset.g] = b.dataset.v; renderQ(); });
    if ($('#check')) $('#check').onclick = check;
    if ($('#next')) { $('#next').onclick = next; $('#next').focus(); }
    $('#quit').onclick = () => { if (ses.checked) ses.i++; finish(); };
    window.__sent = { ses, s }; // for automated UI tests
  }
  function check() {
    if (ses.checked) return;
    const s = ses.items[ses.i], t = s.target; let ok, yours, want;
    if (set.ex === 'translate') {
      yours = set.ans === 'typed' ? ($('#ans').value || '').trim() : ses.picked.map(i => ses.chips.bank[i]).join(' ');
      if (!yours) return;
      ok = E.gradeEnglish(s, yours); want = s.en;
    } else {
      if (t.kind === 'noun') { ok = ses.sel.case === t.case && ses.sel.num === t.num; yours = `${CASE_FULL[ses.sel.case]} ${ses.sel.num === 'sg' ? 'singular' : 'plural'}`; }
      else { ok = t.accept.some(a => a.tense === ses.sel.tense && a.person === ses.sel.person && a.voice === ses.sel.voice);
        yours = `${TENSE_FULL[ses.sel.tense]} ${LBL[ses.sel.person]}${t.hasVoice ? ' ' + (ses.sel.voice === 'act' ? 'active' : 'passive') : ''}`; }
      want = idAnswer(t);
    }
    ses.checked = true; ses.typed = set.ans === 'typed' ? yours : '';
    if (ok) ses.right++; else ses.missed.push({ s, yours, want });
    s.result = ok;
    const extra = set.ex === 'identify' ? `<div class="small" style="margin-top:6px"><span lang="la"><i>${esc(t.token)}</i></span>: ${esc(want)}</div><div class="small muted" style="margin-top:4px">${esc(s.en)}</div>`
      : `<div class="small" style="margin-top:6px">${ok ? 'Model answer' : 'Answer'}: ${esc(s.en)}</div>`;
    renderQ(`<div class="answer" id="fb"><div class="${ok ? 'ok' : 'no'}">${ok ? '✓ Right' : '✗ Wrong'}</div>${extra}</div>`);
  }
  function next() { ses.i++; ses.typed = ''; if (ses.i >= ses.items.length) finish(); else showQ(); }
  function finish() {
    const n = Math.min(ses.i, ses.items.length);
    V().innerHTML = `<div class="card done"><div class="prompt-kind">Session done</div><h2 id="score" style="margin:6px 0">${ses.right} of ${n} right</h2>
      ${ses.short ? '<p class="small muted">Fewer sentences than asked for: your word pool and sentence types allow only these.</p>' : ''}
      <button class="primary big" id="again">Another session</button><div style="margin-top:8px"><button class="link" id="home">Change options</button></div></div>
      ${ses.missed.length ? `<div class="card"><h2 style="margin-top:0">To review</h2>${ses.missed.map(m => `<div class="lex"><div class="latin" lang="la">${sentenceHtml(m.s, set.ex === 'identify' ? m.s.target.idx : null)}</div>
        <div class="small">${set.ex === 'identify' ? `<i lang="la">${esc(m.s.target.token)}</i>: ` : ''}${esc(m.want)}</div><div class="small muted">You: ${esc(m.yours || '—')}</div>${set.ex === 'identify' ? `<div class="small muted">${esc(m.s.en)}</div>` : ''}</div>`).join('')}</div>` : ''}`;
    $('#again').onclick = start; $('#home').onclick = () => renderHome();
  }

  // ---------- home / options ----------
  function renderHome(msg) {
    const nSeen = seenIds().length;
    const opt = (g, v, l) => `<button data-g="${g}" data-v="${v}" class="${String(set[g]) === String(v) ? 'on' : ''}" aria-pressed="${String(set[g]) === String(v)}">${l}</button>`;
    V().innerHTML = `${msg ? `<div class="card small no" id="msg">${esc(msg)}</div>` : ''}
      ${TW ? `<div class="card" id="tword"><div class="prompt-kind">Test mode · only sentences with <span lang="la">${esc((self.LatinWords[TW] || {}).la || TW)}</span></div><a class="link small" href="./#list">‹ Back to the word list</a></div>` : ''}
      <div class="card"><div class="prompt-kind">Sentences · beta</div>
        <p class="small muted" style="margin:6px 0 12px">Short Latin sentences built from the Diederich words by fixed grammar rules (no AI). Translate them, or identify one word’s form.</p>
        <button class="primary big" id="go">Start ${set.len} sentences</button></div>
      <div class="card"><div class="small muted chiph" style="margin-top:0">Exercise</div><div class="seg" id="o-ex">${opt('ex', 'translate', 'Translate')}${opt('ex', 'identify', 'Identify forms')}</div>
        ${set.ex === 'translate' ? `<div class="small muted chiph">Answer by</div><div class="seg" id="o-ans">${opt('ans', 'typed', 'Typing')}${opt('ans', 'chips', 'Word chips')}</div>` : ''}
        ${TW ? '' : `<div class="small muted chiph">Words</div><div class="seg" id="o-pool">${opt('pool', 'seen', `Words I’ve seen (${nSeen})`)}${opt('pool', 'all', `All (${CONTENT.size})`)}</div>
        <p class="small muted" style="margin:6px 0 0">“Seen” means words you have a flashcard for or have met in drills. Prepositions, egō/tū/nōs/vōs and sum are always used.</p>`}
        <div class="small muted chiph">Sentences per session</div><div class="seg" id="o-len">${opt('len', 10, '10')}${opt('len', 20, '20')}</div>
        <div class="row" style="margin-top:14px"><div class="small muted grow">Sentence types (${set.tpl.length} of ${E.TEMPLATES.length})</div><button class="link small" id="tall">${set.tpl.length === E.TEMPLATES.length ? 'None' : 'All'}</button></div>
        <div class="chips" id="o-tpl">${E.TEMPLATES.map(t => `<button data-t="${t}" class="${set.tpl.includes(t) ? 'on' : ''}" aria-pressed="${set.tpl.includes(t)}">${esc(TPL_NAMES[t] || t)}</button>`).join('')}</div></div>`;
    document.querySelectorAll('.seg button[data-g]').forEach(b => b.onclick = () => { const g = b.dataset.g; set[g] = g === 'len' ? +b.dataset.v : b.dataset.v; saveSet(); renderHome(); });
    document.querySelectorAll('#o-tpl button').forEach(b => b.onclick = () => { const t = b.dataset.t; set.tpl = set.tpl.includes(t) ? set.tpl.filter(x => x !== t) : E.TEMPLATES.filter(x => x === t || set.tpl.includes(x)); saveSet(); renderHome(); });
    $('#tall').onclick = () => { set.tpl = set.tpl.length === E.TEMPLATES.length ? [] : E.TEMPLATES.slice(); saveSet(); renderHome(); };
    $('#go').disabled = !set.tpl.length;
    $('#go').onclick = start;
  }

  fetch('data/words.json').then(r => r.json()).then(all => {
    const byId = []; for (const w of all) byId[w.id] = w; self.LatinWords = byId;
    renderHome();
  }).catch(() => { V().innerHTML = '<p class="card">Could not load the word list. Check your connection and reload.</p>'; });
  if ('serviceWorker' in navigator && !window.Capacitor) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
})();
