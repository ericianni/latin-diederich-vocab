/* Church Latin helpers shared by the app and tools/test_church.js.
   Tier 1 (the Ordinary) is data/church/tier1.json. Tier 2 (the basic prayers) is data/church/tier2.json.
   The app merges the packs and shows both only while Church mode is on. */
(function (root) {
  'use strict';
  function headKey(la, plain) {
    return plain(String(la).split(/[ ,]/)[0]).toLowerCase();
  }
  function overlayMap(pack, plain) {
    const m = new Map();
    for (const o of (pack && pack.overlays) || []) m.set(plain(o.lemma).toLowerCase(), o);
    return m;
  }
  // A copy with the Church dictionary line and gloss, when Church mode is on.
  // The original object is left alone, so turning the mode off restores it.
  function faceWord(word, overlays, on, plain) {
    if (!on || !word) return word;
    const o = overlays.get(headKey(word.la, plain));
    if (!o) return word;
    const la = o.la || word.la, en = o.en || word.en;
    if (la === word.la && en === word.en) return word;
    return Object.assign({}, word, { la: la, en: en });
  }
  function activeWords(classical, churchWords, overlays, on, plain) {
    const list = (on ? classical.concat(churchWords) : classical.slice()).map(w => faceWord(w, overlays, on, plain));
    return list.sort((a, b) => (a.r || 1e9) - (b.r || 1e9) || a.id - b.id);
  }
  // Same daily cap as the classical deck. In Church mode, one new Church word
  // is offered after every two new classical words, so the Mass vocabulary
  // arrives in small amounts instead of waiting until the whole Diederich list is started.
  function newWordKeys(words, cards, n, on) {
    const unseen = words.filter(w => !cards['r:' + w.id]);
    if (!on) return unseen.slice(0, n).map(w => 'r:' + w.id);
    const c = unseen.filter(w => !w.church), h = unseen.filter(w => w.church);
    const out = [];
    let i = 0, j = 0;
    while (out.length < n && (i < c.length || j < h.length)) {
      if (i < c.length) out.push(c[i++]);
      if (out.length < n && i < c.length) out.push(c[i++]);
      if (out.length < n && j < h.length) out.push(h[j++]);
    }
    return out.map(w => 'r:' + w.id);
  }
  // Review cards whose word is in the active deck. Church-only cards stay in
  // storage when the mode is off; they are simply not due until it is on again.
  function dueCardKeys(cards, words, today) {
    const live = new Set(words.map(w => String(w.id)));
    return Object.keys(cards).filter(k => /^[rp]:/.test(k) && cards[k] && cards[k].due <= today && live.has(k.slice(2)))
      .sort((a, b) => cards[a].due - cards[b].due);
  }
  function tokensOf(pack) {
    const out = [];
    for (const sec of pack.texts || []) for (const line of sec.lines) for (const word of line.words) {
      const ls = Array.isArray(word.l) ? word.l : [word.l];
      for (const l of ls) out.push({ section: sec.id, surface: word.t, lemma: l });
    }
    return out;
  }
  // Later packs append: Mass lessons stay first, then the prayers. A repeated overlay lemma keeps the later gloss.
  function merge(packs) {
    const list = (packs || []).filter(Boolean);
    const about = {};
    const pron = list.map(p => p.about && p.about.pronunciation).filter(Boolean);
    const src = list.map(p => p.about && p.about.sources).filter(Boolean);
    if (pron.length) about.pronunciation = pron.join('');
    if (src.length) about.sources = src.join('');
    return {
      about,
      overlays: list.flatMap(p => p.overlays || []),
      words: list.flatMap(p => p.words || []),
      texts: list.flatMap(p => p.texts || []),
      lessons: list.flatMap(p => p.lessons || []),
    };
  }
  const api = { headKey, overlayMap, faceWord, activeWords, newWordKeys, dueCardKeys, tokensOf, merge };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Church = api;
})(typeof window !== 'undefined' ? window : globalThis);
