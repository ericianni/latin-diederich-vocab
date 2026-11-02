/* Latin form generator for the Diederich list.
   Generates standard paradigms from the dictionary entry (principal parts / genitive + gender).
   Anything it cannot generate reliably returns {skip: reason} and is excluded from drills. */
(function (root) {
  'use strict';
  const MAC = { 'ā': 'a', 'ē': 'e', 'ī': 'i', 'ō': 'o', 'ū': 'u', 'ȳ': 'y', 'Ā': 'a', 'Ē': 'e', 'Ī': 'i', 'Ō': 'o', 'Ū': 'u' };
  const plain = s => s.replace(/[āēīōūȳĀĒĪŌŪ]/g, c => MAC[c]).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const norm = s => plain(String(s).toLowerCase().trim()).replace(/j/g, 'i').replace(/v/g, 'u').replace(/\s+/g, ' ');
  const isV = c => /[aeiouyāēīōūȳ]/i.test(c);
  const ends = (s, e) => s.endsWith(e);
  const cut = (s, n) => s.slice(0, s.length - n);

  // ---------- entry cleaning ----------
  function clean(la) {
    const notes = [];
    let s = la.replace(/\s\(([^)]*)\)/g, (m, x) => { notes.push(x); return ''; });
    s = s.replace(/(\S)\(([^)\s]*)\)/g, '$1');      // dex-t(e)ra -> -tra, hiem(p)s -> hiems
    s = s.replace(/^\(([^)]*)\)/, '');
    const parts = s.split(/,\s*/).map(p => p.trim().split(/\s+or\s+|\//)[0].trim()).filter(p => p !== '');
    return { parts, notes: notes.join('; ') };
  }
  // expand an abbreviated principal part ("-āvī", "-crēvī") against the first form
  // principal parts the source abbreviates ambiguously or without a hyphen
  const PERF_FIX = { 'resistō': 'restitī', 'convertō': 'convertī', 'dēsinō': 'dēsiī', 'cōnsistō': 'cōnstitī', 'exsistō': 'exstitī', 'īnsistō': 'īnstitī', 'persistō': 'perstitī', 'subsistō': 'substitī' };
  const PURE = /^(āvī|ātum|ātus|āre|ēre|ere|īre|ārī|āri|ērī|ēri|ī|īrī|īri|ēvī|ētum|uī|itum|ītum|īvī|iī|ūtum|ūtus|itūrus|ātūrus|ūrus|ātus|itus|ae|ī|is|ūs|ārum|ōrum|a|um|e|ius|era|erum|eris|ere)$/;
  function expandPart(base, stem, suf) {
    if (!suf || suf === '--' || suf === '-') return null;
    if (suf[0] !== '-') return suf;
    const s = suf.slice(1);
    if (PURE.test(s)) return stem + s;
    const nb = plain(base), ns = plain(s);
    let j = 0; while (j < ns.length && isV(ns[j])) j++;          // leading vowels of the suffix
    let best = -1, bestScore = 0;
    for (let i = j; i < nb.length; i++) {
      if (nb[i] !== ns[j]) continue;
      let k = 0; while (j + k < ns.length && i + k < nb.length && nb[i + k] === ns[j + k]) k++;
      const score = 2 * k + (nb.slice(i - j, i) === ns.slice(0, j) ? 1 : 0);
      if (score >= bestScore) { bestScore = score; best = i; }   // ties: rightmost (accipiō -cēpī -> accēpī)
    }
    return best >= 0 ? base.slice(0, best - j) + s : stem + s;
  }

  // ---------- verbs ----------
  const P = ['1s', '2s', '3s', '1p', '2p', '3p'];
  const PERS = { '1s': '1st sg', '2s': '2nd sg', '3s': '3rd sg', '1p': '1st pl', '2p': '2nd pl', '3p': '3rd pl' };
  const TENSES = { pres: 'present', impf: 'imperfect', fut: 'future', perf: 'perfect', plup: 'pluperfect', fperf: 'future perfect' };
  const ACT = {
    1: { pres: ['ō', 'ās', 'at', 'āmus', 'ātis', 'ant'], impf: 'ābam', fut: ['ābō', 'ābis', 'ābit', 'ābimus', 'ābitis', 'ābunt'] },
    2: { pres: ['eō', 'ēs', 'et', 'ēmus', 'ētis', 'ent'], impf: 'ēbam', fut: ['ēbō', 'ēbis', 'ēbit', 'ēbimus', 'ēbitis', 'ēbunt'] },
    3: { pres: ['ō', 'is', 'it', 'imus', 'itis', 'unt'], impf: 'ēbam', fut: ['am', 'ēs', 'et', 'ēmus', 'ētis', 'ent'] },
    '3io': { pres: ['iō', 'is', 'it', 'imus', 'itis', 'iunt'], impf: 'iēbam', fut: ['iam', 'iēs', 'iet', 'iēmus', 'iētis', 'ient'] },
    4: { pres: ['iō', 'īs', 'it', 'īmus', 'ītis', 'iunt'], impf: 'iēbam', fut: ['iam', 'iēs', 'iet', 'iēmus', 'iētis', 'ient'] },
  };
  const PAS = {
    1: { pres: ['or', 'āris', 'ātur', 'āmur', 'āminī', 'antur'], impf: 'ābar', fut: ['ābor', 'āberis', 'ābitur', 'ābimur', 'ābiminī', 'ābuntur'] },
    2: { pres: ['eor', 'ēris', 'ētur', 'ēmur', 'ēminī', 'entur'], impf: 'ēbar', fut: ['ēbor', 'ēberis', 'ēbitur', 'ēbimur', 'ēbiminī', 'ēbuntur'] },
    3: { pres: ['or', 'eris', 'itur', 'imur', 'iminī', 'untur'], impf: 'ēbar', fut: ['ar', 'ēris', 'ētur', 'ēmur', 'ēminī', 'entur'] },
    '3io': { pres: ['ior', 'eris', 'itur', 'imur', 'iminī', 'iuntur'], impf: 'iēbar', fut: ['iar', 'iēris', 'iētur', 'iēmur', 'iēminī', 'ientur'] },
    4: { pres: ['ior', 'īris', 'ītur', 'īmur', 'īminī', 'iuntur'], impf: 'iēbar', fut: ['iar', 'iēris', 'iētur', 'iēmur', 'iēminī', 'ientur'] },
  };
  const impfAct = b => { const s = cut(b, 2); return [s + 'am', s + 'ās', s + 'at', s + 'āmus', s + 'ātis', s + 'ant']; };  // 'ābam' -> ābam ābās ...
  const impfPas = b => { const s = cut(b, 2); return [s + 'ar', s + 'āris', s + 'ātur', s + 'āmur', s + 'āminī', s + 'antur']; };
  const PERF = ['ī', 'istī', 'it', 'imus', 'istis', 'ērunt'];
  const PLUP = ['eram', 'erās', 'erat', 'erāmus', 'erātis', 'erant'];
  const FPERF = ['erō', 'eris', 'erit', 'erimus', 'eritis', 'erint'];
  const SUM = { pres: ['sum', 'es', 'est', 'sumus', 'estis', 'sunt'], impf: ['eram', 'erās', 'erat', 'erāmus', 'erātis', 'erant'], fut: ['erō', 'eris', 'erit', 'erimus', 'eritis', 'erunt'] };
  const map6 = (stem, arr) => arr.map(e => stem + e);
  function table(cells) { const o = {}; for (const t in cells) cells[t].forEach((f, i) => { o[t + '.' + P[i]] = Array.isArray(f) ? f : [f]; }); return o; }
  function perfSys(pstem, out) {
    out.perf = map6(pstem, PERF).map((f, i) => i === 5 ? [f, pstem + 'ēre'] : f);
    out.plup = map6(pstem, PLUP); out.fperf = map6(pstem, FPERF);
  }
  function depPerf(ppl, out) {
    const pl = cut(ppl, 2) + 'ī';
    const mk = arr => arr.map((s, i) => (i < 3 ? ppl : pl) + ' ' + s);
    out.perf = mk(SUM.pres); out.plup = mk(SUM.impf); out.fperf = mk(['erō', 'eris', 'erit', 'erimus', 'eritis', 'erint']);
  }
  const DEFECTIVE = ['meminī', 'ōdī', 'coepī', 'inquam', 'aiō', 'salvē', 'quaesō', 'apage', 'ave', 'avē'];
  function verb(e) {
    const { parts, notes } = clean(e.la);
    const p1 = parts[0];
    if (DEFECTIVE.includes(p1) || ends(p1, 'ī') && /isse/.test(parts[1] || '')) return { skip: 'defective verb' };
    if (/et$/.test(p1) && /uit|^-?ēre/.test(parts.slice(1).join(' '))) return { skip: 'impersonal verb' };
    const out = {}; let kind = '', conj = null, voice = 'act';
    let infRaw = parts[1] || '';
    const stem0 = p1.replace(/(ior|eor|or|iō|eō|ō|io|eo|o|m)$/, '');
    const inf = expandPart(p1, stem0, infRaw) || '';
    let pp3 = PERF_FIX[p1] || (parts[2] ? expandPart(p1, stem0, parts[2]) : null);
    if (parts[2] === '-uī' && /u$/.test(stem0)) pp3 = stem0 + 'ī';                       // īnstituō -uī -> īnstituī
    if (parts[2] === '-iēcī' && /ici[oō]$/.test(p1)) pp3 = p1.replace(/ici[oō]$/, 'iēcī'); // adiciō -> adiēcī
    const pp3full = (parts[2] || '').includes(' sum') ? parts[2] : null;
    // --- irregulars ---
    if ((ends(inf, 'esse') || inf === 'posse') && ends(p1, 'sum')) {
      if (p1 === 'possum') {
        Object.assign(out, { pres: ['possum', 'potes', 'potest', 'possumus', 'potestis', 'possunt'], impf: map6('pot', SUM.impf), fut: map6('pot', SUM.fut) });
      } else {
        const pre = cut(p1, 3);
        const add = f => (pre === 'prō' && f[0] === 'e') ? 'prōd' + f : pre + f;
        out.pres = SUM.pres.map(add); out.impf = SUM.impf.map(add); out.fut = SUM.fut.map(add);
      }
      if (pp3) perfSys(cut(pp3, 1), out);
      return { kind: 'verb', conj: 'irr', irr: 'sum', tbl: table(out) };
    }
    if (ends(p1, 'eō') && /īre$/.test(inf)) {          // eō and compounds
      const pre = cut(p1, 2);
      out.pres = ['eō', 'īs', 'it', 'īmus', 'ītis', 'eunt'].map(f => pre + f);
      out.impf = impfAct('ībam').map(f => pre + f); out.fut = ['ībō', 'ībis', 'ībit', 'ībimus', 'ībitis', 'ībunt'].map(f => pre + f);
      out.perf = [['iī'], ['īstī', 'iistī'], ['iit'], ['iimus'], ['īstis', 'iistis'], ['iērunt', 'iēre']].map(a => a.map(f => pre + f));
      out.plup = map6(pre + 'i', PLUP); out.fperf = map6(pre + 'i', FPERF);
      return { kind: 'verb', conj: 'irr', irr: 'eō', tbl: table(out) };
    }
    if (/ferre$/.test(inf) && ends(p1, 'ferō')) {
      const pre = cut(p1, 4);
      out.pres = ['ferō', 'fers', 'fert', 'ferimus', 'fertis', 'ferunt'].map(f => pre + f);
      out.impf = impfAct('ēbam').map(f => pre + 'fer' + f); out.fut = ACT[3].fut.map(f => pre + 'fer' + f);
      const p3f = parts[2] && parts[2][0] === '-' ? pre + parts[2].slice(1) : pp3;
      if (p3f) perfSys(cut(p3f, 1), out);
      return { kind: 'verb', conj: 'irr', irr: 'ferō', tbl: table(out) };
    }
    const VNM = {
      'volō': [['volō', 'vīs', 'vult', 'volumus', 'vultis', 'volunt'], 'vol'],
      'nōlō': [['nōlō', 'nōn vīs', 'nōn vult', 'nōlumus', 'nōn vultis', 'nōlunt'], 'nōl'],
      'mālō': [['mālō', 'māvīs', 'māvult', 'mālumus', 'māvultis', 'mālunt'], 'māl'],
    };
    if (VNM[p1] && /lle$/.test(inf)) {
      const [pr, st] = VNM[p1];
      out.pres = pr; out.impf = impfAct('ēbam').map(f => st + f); out.fut = ACT[3].fut.map(f => st + f);
      perfSys(st + 'u', out);
      return { kind: 'verb', conj: 'irr', irr: p1, tbl: table(out) };
    }
    if (p1 === 'fīō') {
      out.pres = ['fīō', 'fīs', 'fit', 'fīmus', 'fītis', 'fīunt']; out.impf = impfAct('ēbam').map(f => 'fī' + f); out.fut = ACT[3].fut.map(f => 'fī' + f);
      depPerf('factus', out);
      return { kind: 'verb', conj: 'irr', irr: 'fīō', tbl: table(out) };
    }
    if (p1 === 'dō' || /^-?dare$/.test(infRaw) && ends(p1, 'dō') && !/dere/.test(inf)) {   // dō and circumdō: short a
      const pre = cut(p1, 2);
      out.pres = ['dō', 'dās', 'dat', 'damus', 'datis', 'dant'].map(f => pre + f);
      out.impf = ['dabam', 'dabās', 'dabat', 'dabāmus', 'dabātis', 'dabant'].map(f => pre + f);
      out.fut = ['dabō', 'dabis', 'dabit', 'dabimus', 'dabitis', 'dabunt'].map(f => pre + f);
      if (pp3) perfSys(cut(pp3, 1), out);
      return { kind: 'verb', conj: 1, irr: 'dō', tbl: table(out) };
    }
    // --- regular ---
    const dep = /(or)$/.test(p1);
    let flag = null;
    if (dep) {
      voice = 'dep';
      if (/ār[iī]$/.test(inf)) conj = 1; else if (/ēr[iī]$/.test(inf)) conj = 2; else if (/īr[iī]$/.test(inf)) conj = 4;
      else if (/[iī]$/.test(inf)) conj = ends(p1, 'ior') ? '3io' : 3;
      if (p1 === 'orior') conj = '3io';
    } else {
      if (/āre$/.test(inf)) conj = 1;
      else if (/ēre$/.test(inf)) conj = ends(p1, 'eō') ? 2 : (flag = 'source has -ēre; treated as 3rd conj.', 3);
      else if (/ere$/.test(inf)) conj = ends(p1, 'eō') ? (flag = 'source has -ere; treated as 2nd conj.', 2) : ends(p1, 'iō') ? '3io' : 3;
      else if (/īre$/.test(inf)) conj = 4;
      if (conj === 3 && ends(p1, 'iō')) conj = '3io';
    }
    if (!conj) return { skip: 'could not determine conjugation' };
    const C = dep ? PAS[conj] : ACT[conj];
    const stem = dep ? p1.replace(/(ior|eor|or)$/, '') : p1.replace(/(iō|eō|ō|io|eo|o)$/, '');
    if (!stem || stem === p1) return { skip: 'unrecognized first principal part' };
    out.pres = C.pres.map(f => stem + f);
    out.impf = dep ? impfPas(C.impf).map(f => stem + f) : impfAct(C.impf).map(f => stem + f);
    out.fut = C.fut.map(f => stem + f);
    let semi = false;
    if (dep) {
      const ppl = (parts[2] || '').replace(/\s*sum$/, '').trim();
      if (ppl && /us$/.test(ppl)) depPerf(expandPart(p1, stem, ppl), out);
    } else if (pp3full) {          // semi-deponent (audeō, ausus sum)
      semi = true; depPerf(expandPart(p1, stem, pp3full.replace(/\s*sum$/, '')), out);
    } else if (pp3 && /ī$/.test(pp3)) perfSys(cut(pp3, 1), out);
    return { kind: 'verb', conj, voice, semi, flag, tbl: table(out) };
  }
  // ---------- nouns ----------
  const CASES = ['nom', 'gen', 'dat', 'acc', 'abl'];
  const CASE_N = { nom: 'nominative', gen: 'genitive', dat: 'dative', acc: 'accusative', abl: 'ablative' };
  const cells = (sg, pl) => { const o = {}; CASES.forEach((c, i) => { if (sg) o[c + '.sg'] = [].concat(sg[i]); if (pl) o[c + '.pl'] = [].concat(pl[i]); }); return o; };
  const NOUN_IRR = {
    'vīs': cells(['vīs', 'vīs', 'vī', 'vim', 'vī'], ['vīrēs', 'vīrium', 'vīribus', ['vīrēs', 'vīrīs'], 'vīribus']),
    'domus': cells(['domus', 'domūs', ['domuī', 'domō'], 'domum', ['domō', 'domū']], ['domūs', ['domuum', 'domōrum'], 'domibus', ['domōs', 'domūs'], 'domibus']),
    'deus': cells(['deus', 'deī', 'deō', 'deum', 'deō'], [['dī', 'deī', 'diī'], ['deōrum', 'deum'], ['dīs', 'deīs', 'diīs'], 'deōs', ['dīs', 'deīs', 'diīs']]),
    'bōs': cells(['bōs', 'bovis', 'bovī', 'bovem', 'bove'], ['bovēs', 'boum', ['bōbus', 'būbus'], 'bovēs', ['bōbus', 'būbus']]),
    'Iuppiter': cells(['Iuppiter', 'Iovis', 'Iovī', 'Iovem', 'Iove'], null),
    'iter': cells(['iter', 'itineris', 'itinerī', 'iter', 'itinere'], ['itinera', 'itinerum', 'itineribus', 'itinera', 'itineribus']),
  };
  const GPL_UM = ['pater', 'māter', 'frāter', 'canis', 'iuvenis', 'senex', 'sēdēs', 'vātēs', 'parēns', 'mēnsis', 'apis', 'volucris'];
  const GPL_BOTH = ['parēns', 'mēnsis', 'vātēs', 'apis', 'volucris', 'mūs', 'fraus', 'laus', 'cliēns', 'sapiēns', 'adulēscēns', 'cīvitās', 'aetās'];
  const GPL_IUM_X = ['os', 'cor', 'carō', 'imber', 'linter', 'venter', 'ūter', 'nix', 'līs', 'mās', 'glīs', 'faux', 'fauces'];
  const syl = s => (plain(s).match(/[aeiouy]+/g) || []).length;
  function noun(e) {
    const { parts, notes } = clean(e.la);
    const nom = parts[0];
    if (NOUN_IRR[nom]) return { kind: 'noun', decl: 'irr', g: 'irr', tbl: NOUN_IRR[nom] };
    if (/indecl/.test(notes) || /indecl/.test(e.la)) return { skip: 'indeclinable' };
    if (parts.length === 2) { const mm = parts[1].match(/^(\S+)\s+(m|f|n|mf|c)\.$/); if (mm) parts.splice(1, 1, mm[1], mm[2] + '.'); }
    if (parts.length < 3) return { skip: 'defective / unusual entry' };
    let gender = (parts.find((p, i) => i >= 2 && /^-?\.?(m|f|n|mf|c)\.?$/.test(p)) || '').replace(/[-.]/g, '');
    if (!gender) return { skip: 'no gender given' };
    const neut = gender === 'n';
    let gRaw = parts[1];
    const plOnly = /(^|; )pl\.($|;)/.test(notes) || /^(ārum|ōrum|um|ium|uum|ērum)$/.test(gRaw.replace(/^-/, '')) && /(ae|ī|a|ēs)$/.test(nom);
    if (/mostly|only/.test(notes) && !/gen\. pl/.test(notes)) return { skip: 'defective forms (' + notes + ')' };
    let g = gRaw.replace(/^-/, '');
    let gen, decl, stem, nomFix = null;
    const lastVowelStem = () => { // tempus,-oris -> temp
      const fv = g[0]; let i = nom.length - 1;
      while (i >= 0 && !isV(nom[i])) i--;
      return nom.slice(0, Math.max(i, 0));
    };
    if (plOnly) {
      if (/ārum$/.test(g)) { decl = 1; stem = cut(nom, 2); }
      else if (/ōrum$/.test(g)) { decl = 2; stem = cut(nom, 1); }
      else if (/ium$|um$/.test(g)) { decl = 3; stem = nom.replace(/(ia|a|ēs)$/, ''); }
      else return { skip: 'plural-only noun not parsed' };
    } else if (g === 'ae') { decl = 1; stem = nom.replace(/[aā]$/, ''); if (stem === nom) return { skip: 'Greek 1st-decl. noun' }; if (/ā$/.test(nom)) { nomFix = stem + 'a'; } gen = stem + 'ae'; }
    else if (/^(ēī|eī)$/.test(g) || /ēs$/.test(nom) && /eī$|ēī$/.test(g)) { decl = 5; stem = cut(nom, 2); gen = gRaw[0] === '-' ? stem + g : gRaw; }
    else if (g === 'ī') {
      decl = 2;
      if (/(us|um|os)$/.test(nom)) stem = cut(nom, 2); else if (/(er|ir)$/.test(nom)) stem = nom; else return { skip: 'unusual 2nd-decl. noun' };
    }
    else if (/ī$/.test(g) && /(us|um|er|ir)$/.test(nom)) { decl = 2; stem = cut(gRaw[0] === '-' ? expandPart(nom, nom, gRaw) : gRaw, 1); }
    else if (g === 'ūs') { decl = 4; stem = nom.replace(/(us|ū)$/, ''); }
    else {
      decl = 3;
      if (gRaw[0] !== '-') gen = gRaw;
      else if (g === 'is') gen = (/(is|ēs|e)$/.test(nom) ? nom.replace(/(is|ēs|e)$/, '') : nom) + 'is';
      else if (isV(g[0])) gen = lastVowelStem() + g;
      else gen = expandPart(nom, nom, gRaw);
      if (!/is$/.test(gen)) return { skip: 'genitive not recognized' };
      stem = cut(gen, 2);
    }
    let sg, pl;
    if (decl === 1) { sg = [nomFix || nom, stem + 'ae', stem + 'ae', stem + 'am', stem + 'ā']; pl = [stem + 'ae', stem + 'ārum', stem + 'īs', stem + 'ās', stem + 'īs'];
      if (/ābus/.test(notes)) { pl[2] = [stem + 'īs', stem + 'ābus']; pl[4] = [stem + 'īs', stem + 'ābus']; } }
    if (decl === 2) {
      if (neut) { sg = [nom, stem + 'ī', stem + 'ō', nom, stem + 'ō']; pl = [stem + 'a', stem + 'ōrum', stem + 'īs', stem + 'a', stem + 'īs']; }
      else { sg = [nom, stem + 'ī', stem + 'ō', stem + 'um', stem + 'ō']; pl = [stem + 'ī', stem + 'ōrum', stem + 'īs', stem + 'ōs', stem + 'īs']; }
      if (/iī$/.test(sg[1])) sg[1] = [sg[1], cut(sg[1], 1)];        // fīliī / fīlī
      if (/pl\. -a/.test(notes)) { pl[0] = [pl[0], stem + 'a']; pl[3] = [pl[3], stem + 'a']; }
      if (plOnly) sg = null;
    }
    if (decl === 3) {
      let istem = false, neutI = neut && /(e|al|ar)$/.test(nom);
      if (neutI) istem = true;
      else if (!neut && /(is|ēs)$/.test(nom) && syl(nom) === syl(gen || stem + 'is')) istem = true;
      else if (/[sx]$/.test(nom) && /[^aeiouyāēīōū][^aeiouyāēīōū]$/.test(plain(stem)) && !/qu$/.test(stem)) istem = true;
      if (GPL_IUM_X.includes(nom)) istem = true;
      if (GPL_UM.includes(nom)) istem = false;
      if (/gen\. pl\. -um|gen\. pl\. \w+um\b/.test(notes) && !/-ium/.test(notes)) istem = false;
      if (/gen\. pl\. -ium/.test(notes)) istem = true;
      if (plOnly && /ium$/.test(g)) istem = true;
      let gpl = istem ? stem + 'ium' : stem + 'um';
      if (GPL_BOTH.includes(nom)) gpl = [stem + 'um', stem + 'ium'];
      const acc = neut ? nom : stem + 'em';
      let abl = neutI ? stem + 'ī' : stem + 'e';
      if (/abl\. sg\. -i/.test(notes)) abl = [stem + 'ī', stem + 'e'];
      const accS = /acc\. sg\. -im/.test(notes) ? [stem + 'im', stem + 'em'] : acc;
      sg = [nom, gen || stem + 'is', stem + 'ī', accS, abl];
      if (neut) pl = [stem + (neutI ? 'ia' : 'a'), gpl, stem + 'ibus', stem + (neutI ? 'ia' : 'a'), stem + 'ibus'];
      else pl = [stem + 'ēs', gpl, stem + 'ibus', istem ? [stem + 'ēs', stem + 'īs'] : stem + 'ēs', stem + 'ibus'];
      if (plOnly) { sg = null; pl[0] = nom; pl[3] = neut ? nom : [nom].concat(pl[3]).filter((v, i, a) => a.indexOf(v) === i); }
    }
    if (decl === 4) {
      const n = /ū$/.test(nom);
      const dp = /-ubus/.test(notes) ? [stem + 'ibus', stem + 'ubus'] : stem + 'ibus';
      sg = n ? [nom, stem + 'ūs', stem + 'ū', nom, stem + 'ū'] : [nom, stem + 'ūs', stem + 'uī', stem + 'um', stem + 'ū'];
      pl = n ? [stem + 'ua', stem + 'uum', dp, stem + 'ua', dp] : [stem + 'ūs', stem + 'uum', dp, stem + 'ūs', dp];
    }
    if (decl === 5) { sg = [nom, gen, gen, stem + 'em', stem + 'ē']; pl = [stem + 'ēs', stem + 'ērum', stem + 'ēbus', stem + 'ēs', stem + 'ēbus']; }
    return { kind: 'noun', decl, g: gender, plOnly, flag: nomFix ? 'source has rēgīnā; corrected to rēgīna' : null, tbl: cells(sg, pl) };
  }
  // ---------- adjectives ----------
  const GEN = ['m', 'f', 'n'];
  const GEN_N = { m: 'masculine', f: 'feminine', n: 'neuter' };
  const IUS = ['ūnus', 'sōlus', 'tōtus', 'nūllus', 'ūllus', 'alius', 'alter', 'uter', 'neuter', 'uterque'];
  const CONS_ADJ = ['vetus', 'dīves', 'pauper', 'prīnceps', 'particeps', 'compos', 'sōspes', 'superstes', 'pūbēs', 'memor', 'dēgener'];
  function adjTbl(m, f, n) { const o = {}; for (const [gk, a] of [['m', m], ['f', f], ['n', n]]) { if (!a) continue; CASES.forEach((c, i) => { o[gk + '.' + c + '.sg'] = [].concat(a[0][i]); o[gk + '.' + c + '.pl'] = [].concat(a[1][i]); }); } return o; }
  function adj(e) {
    const { parts, notes } = clean(e.la);
    const nom = parts[0];
    if (/indecl/.test(e.la) || parts.length < 2) return { skip: 'indeclinable / defective' };
    if (/only|class\. only/.test(notes) && !/comp\./.test(notes)) return { skip: 'defective adjective (' + notes + ')' };
    if (['duo', 'trēs', 'mīlle', 'plūs', 'necesse', 'potis'].includes(nom)) return { skip: 'irregular adjective' };
    const p2 = parts[1], p3 = parts[2];
    // 1st/2nd declension
    if (p3 && /(um|um)$/.test(p3) && /a$/.test(p2)) {
      const fem = expandPart(nom, nom.replace(/us$/, ''), p2.startsWith('-') && isV(p2[1]) && /er$/.test(nom) ? '-' + p2.slice(1) : p2);
      let st = /us$/.test(nom) ? cut(nom, 2) : (p2.startsWith('-') && isV(p2[1]) && /er$/.test(nom)) ? cut(nom, 2) + cut(p2.slice(1), 1) : cut(fem, 1);
      if (/er$/.test(nom) && p2 === '-a') st = nom;      // e.g. līber, -a, -um
      if (/er$/.test(nom) && p2 === '-era') st = nom;
      const ius = IUS.includes(nom);
      const g2 = ius ? st + 'īus' : null, d2 = ius ? st + 'ī' : null;
      const m = [[nom, g2 || st + 'ī', d2 || st + 'ō', st + 'um', st + 'ō'], [st + 'ī', st + 'ōrum', st + 'īs', st + 'ōs', st + 'īs']];
      const f = [[st + 'a', g2 || st + 'ae', d2 || st + 'ae', st + 'am', st + 'ā'], [st + 'ae', st + 'ārum', st + 'īs', st + 'ās', st + 'īs']];
      const n = [[st + 'um', g2 || st + 'ī', d2 || st + 'ō', st + 'um', st + 'ō'], [st + 'a', st + 'ōrum', st + 'īs', st + 'a', st + 'īs']];
      return { kind: 'adj', decl: '1/2', tbl: adjTbl(m, f, n) };
    }
    // 3rd declension
    let mNom, fNom, nNom, st, cons = CONS_ADJ.includes(nom), comp = false;
    if (p3 && /e$/.test(p3) && /is$/.test(p2)) {          // ācer, ācris, ācre / celer, -eris, -ere
      st = cut(expandPart(nom, nom, p2), 2); mNom = nom; fNom = st + 'is'; nNom = st + 'e';
    } else if (p2 === '-e') { st = nom.replace(/is$/, ''); mNom = fNom = nom; nNom = st + 'e'; }
    else if ((p2 === '-ius' && /ior$/.test(nom)) || (/or$/.test(nom) && /us$/.test(p2) && !p3)) { comp = true; mNom = fNom = nom; nNom = p2[0] === '-' ? cut(nom, 3) + p2.slice(1) : p2; st = nom.replace(/or$/, 'ōr'); }
    else if (!p3 || /^\(?gen/.test(p3)) {                  // one termination with genitive
      const gen = p2[0] === '-' ? (p2 === '-is' ? nom + 'is' : !isV(p2[1]) ? expandPart(nom, nom, p2) : (() => { let i = nom.length - 1; while (i >= 0 && !isV(nom[i])) i--; return nom.slice(0, i) + p2.slice(1); })()) : p2;
      if (!/is$/.test(gen)) return { skip: 'genitive not recognized' };
      st = cut(gen, 2); mNom = fNom = nNom = nom;
    } else return { skip: 'adjective pattern not recognized' };
    if (/gen\. pl\. -um/.test(notes)) cons = true;
    const memor = nom === 'memor';
    const abl = comp || (cons && !memor) ? st + 'e' : st + 'ī';
    const gpl = comp || cons ? st + 'um' : st + 'ium';
    const npl = comp || cons ? st + 'a' : st + 'ia';
    const mf = nn => [[nn, st + 'is', st + 'ī', st + 'em', abl], [st + 'ēs', gpl, st + 'ibus', comp || cons ? st + 'ēs' : [st + 'ēs', st + 'īs'], st + 'ibus']];
    const n = [[nNom, st + 'is', st + 'ī', nNom, abl], [npl, gpl, st + 'ibus', npl, st + 'ibus']];
    return { kind: 'adj', decl: 3, tbl: adjTbl(mf(mNom), mf(fNom), memor ? null : n) };
  }
  function analyze(e) {
    try {
      if (e.pos === 'verb') return verb(e);
      if (e.pos === 'noun') return noun(e);
      if (e.pos === 'adjective') return adj(e);
      return { skip: 'not inflected / pronoun (not drilled)' };
    } catch (err) { if (root.DEBUG) throw err; return { skip: 'generator error: ' + err.message }; }
  }
  // human-readable label for a table key
  function label(kind, key) {
    const k = key.split('.');
    if (kind === 'verb') return `${PERS[k[1]]} ${TENSES[k[0]]}`;
    if (kind === 'noun') return `${CASE_N[k[0]]} ${k[1] === 'sg' ? 'singular' : 'plural'}`;
    return `${GEN_N[k[0]]} ${CASE_N[k[1]]} ${k[2] === 'sg' ? 'singular' : 'plural'}`;
  }
  function check(input, answers) { const n = norm(input); return answers.some(a => norm(a) === n); }
  const api = { analyze, label, check, norm, plain, TENSES, CASES };
  root.Morph = api; if (typeof module !== 'undefined') module.exports = api;
})(typeof self !== 'undefined' ? self : this);
