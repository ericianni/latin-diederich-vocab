/* Latin form generator for the Diederich list.
   Generates standard paradigms from the dictionary entry (principal parts / genitive + gender).
   Anything it cannot generate reliably returns {skip: reason} and is excluded from drills. */
(function (root) {
  'use strict';
  const MAC = { 'ā': 'a', 'ē': 'e', 'ī': 'i', 'ō': 'o', 'ū': 'u', 'ȳ': 'y', 'Ā': 'a', 'Ē': 'e', 'Ī': 'i', 'Ō': 'o', 'Ū': 'u' };
  const plain = s => s.replace(/[āēīōūȳĀĒĪŌŪ]/g, c => MAC[c]).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const norm = s => plain(String(s).toLowerCase().trim()).replace(/j/g, 'i').replace(/v/g, 'u').replace(/\s+/g, ' ');
  // Strict (macrons required): keep macrons, drop any other accents; j=i, v=u, case-insensitive.
  const normM = s => String(s).toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u0303\u0305-\u036f]/g, '').normalize('NFC').replace(/j/g, 'i').replace(/v/g, 'u').replace(/\s+/g, ' ');
  const isV = c => /[aeiouyāēīōūȳ]/i.test(c);
  const ends = (s, e) => s.endsWith(e);
  const cut = (s, n) => s.slice(0, s.length - n);

  // ---------- entry cleaning ----------
  function clean(la) {
    const notes = [];
    let s = la.replace(/\s\(([^)]*)\)/g, (m, x) => { notes.push(x); return ''; });
    s = s.replace(/^ex\(s\)/, 'exs');                 // ex(s)tinguō -> exstinguō (L&S headword; ext- accepted in check)
    s = s.replace(/^c\(h\)arta/, 'charta');         // c(h)arta -> charta (L&S headword; carta kept as a variant)
    s = s.replace(/(\S)\(([^)\s]*)\)/g, '$1');      // dex-t(e)ra -> -tra, hiem(p)s -> hiems
    s = s.replace(/^\(([^)]*)\)/, '');
    const parts = s.split(/,\s*/).map(p => p.trim().split(/\s+or\s+|\//)[0].trim()).filter(p => p !== '');
    return { parts, notes: notes.join('; ') };
  }
  // expand an abbreviated principal part ("-āvī", "-crēvī") against the first form
  // principal parts the source abbreviates ambiguously or without a hyphen
  const PERF_FIX = { 'quiēscō': 'quiēvī', 'quaerō': 'quaesīvī', 'requīrō': 'requīsīvī', 'contemnō': 'contempsī', 'adsum': 'adfuī', 'resistō': 'restitī', 'convertō': 'convertī', 'dēsinō': 'dēsiī', 'cōnsistō': 'cōnstitī', 'exsistō': 'exstitī', 'īnsistō': 'īnstitī', 'persistō': 'perstitī', 'subsistō': 'substitī', 'respiciō': 'respexī' };
  const PURE = /^(āvī|ātum|ātus|āre|ēre|ere|īre|ārī|āri|ērī|ēri|ī|īrī|īri|ēvī|ētum|uī|itum|ītum|īvī|iī|ūtum|ūtus|itūrus|ātūrus|ūrus|ātus|itus|ae|ī|is|ūs|ārum|ōrum|a|um|e|ius|era|erum|eris|ere)$/;
  function expandPart(base, stem, suf) {
    if (!suf || suf === '--' || suf === '-') return null;
    if (suf[0] !== '-') return suf;
    const s = suf.slice(1);
    if (PURE.test(s)) return stem + s;
    const nb = plain(base), ns = plain(s);
    let j = 0; while (j < ns.length && isV(ns[j])) j++;          // leading vowels of the suffix
    let best = -1, bestScore = 0;
    // match inside the stem, not the 1st-person ending (exorior, -ortus -> exortus, not exoriortus)
    const lim = stem && plain(stem).length >= j + 1 && nb.startsWith(plain(stem)) ? plain(stem).length : nb.length;
    for (let i = j; i < lim; i++) {
      if (nb[i] !== ns[j]) continue;
      let k = 0; while (j + k < ns.length && i + k < nb.length && nb[i + k] === ns[j + k]) k++;
      const score = 2 * k + (nb.slice(i - j, i) === ns.slice(0, j) ? 1 : 0);
      if (score >= bestScore) { bestScore = score; best = i; }   // ties: rightmost (accipiō -cēpī -> accēpī)
    }
    return best >= 0 ? base.slice(0, best - j) + s : stem + s;
  }

  // ---------- verbs ----------
  // Table keys: finite  mood.voice.tense.person  (ind|sub, act|pas|dep, pres..fperf, 1s..3p)
  //             imperative imp.voice.pres.2s|2p, infinitive inf.voice.tense, participle ptc.voice.tense
  const P = ['1s', '2s', '3s', '1p', '2p', '3p'];
  const PERS = { '1s': '1st sg', '2s': '2nd sg', '3s': '3rd sg', '1p': '1st pl', '2p': '2nd pl', '3p': '3rd pl' };
  const TENSES = { pres: 'present', impf: 'imperfect', fut: 'future', perf: 'perfect', plup: 'pluperfect', fperf: 'future perfect' };
  const MOODS = { ind: 'indicative', sub: 'subjunctive', imp: 'imperative', inf: 'infinitive', ptc: 'participle', ger: 'gerund', gdv: 'gerundive', sup: 'supine' };
  const VOICES = { act: 'active', pas: 'passive', dep: 'deponent' };
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
  const SUB_A = { 1: ['em', 'ēs', 'et', 'ēmus', 'ētis', 'ent'], 2: ['eam', 'eās', 'eat', 'eāmus', 'eātis', 'eant'], 3: ['am', 'ās', 'at', 'āmus', 'ātis', 'ant'], '3io': ['iam', 'iās', 'iat', 'iāmus', 'iātis', 'iant'], 4: ['iam', 'iās', 'iat', 'iāmus', 'iātis', 'iant'] };
  const SUB_P = { 1: ['er', 'ēris', 'ētur', 'ēmur', 'ēminī', 'entur'], 2: ['ear', 'eāris', 'eātur', 'eāmur', 'eāminī', 'eantur'], 3: ['ar', 'āris', 'ātur', 'āmur', 'āminī', 'antur'], '3io': ['iar', 'iāris', 'iātur', 'iāmur', 'iāminī', 'iantur'], 4: ['iar', 'iāris', 'iātur', 'iāmur', 'iāminī', 'iantur'] };
  const IMPF_SUB_A = ['em', 'ēs', 'et', 'ēmus', 'ētis', 'ent'];   // added to the infinitive minus -e: amār-em
  const IMPF_SUB_P = ['er', 'ēris', 'ētur', 'ēmur', 'ēminī', 'entur'];
  const INF_A = { 1: 'āre', 2: 'ēre', 3: 'ere', '3io': 'ere', 4: 'īre' };
  const INF_P = { 1: 'ārī', 2: 'ērī', 3: 'ī', '3io': 'ī', 4: 'īrī' };
  const IMP_A = { 1: ['ā', 'āte'], 2: ['ē', 'ēte'], 3: ['e', 'ite'], '3io': ['e', 'ite'], 4: ['ī', 'īte'] };
  const GER = { 1: 'and', 2: 'end', 3: 'end', '3io': 'iend', 4: 'iend' };          // gerund / gerundive stem
  const FIMP_A = { 1: ['ātō', 'ātō', 'ātōte', 'antō'], 2: ['ētō', 'ētō', 'ētōte', 'entō'], 3: ['itō', 'itō', 'itōte', 'untō'], '3io': ['itō', 'itō', 'itōte', 'iuntō'], 4: ['ītō', 'ītō', 'ītōte', 'iuntō'] };
  const FIMP_P = { 1: ['ātor', 'ātor', 'antor'], 2: ['ētor', 'ētor', 'entor'], 3: ['itor', 'itor', 'untor'], '3io': ['itor', 'itor', 'iuntor'], 4: ['ītor', 'ītor', 'iuntor'] };
  const PTC_PRES = { 1: 'āns', 2: 'ēns', 3: 'ēns', '3io': 'iēns', 4: 'iēns' };
  const impfAct = b => { const s = cut(b, 2); return [s + 'am', s + 'ās', s + 'at', s + 'āmus', s + 'ātis', s + 'ant']; };  // 'ābam' -> ābam ābās ...
  const impfPas = b => { const s = cut(b, 2); return [s + 'ar', s + 'āris', s + 'ātur', s + 'āmur', s + 'āminī', s + 'antur']; };
  const PERF = ['ī', 'istī', 'it', 'imus', 'istis', 'ērunt'];
  const PLUP = ['eram', 'erās', 'erat', 'erāmus', 'erātis', 'erant'];
  const FPERF = ['erō', 'eris', 'erit', 'erimus', 'eritis', 'erint'];
  const PERF_SUB = ['erim', 'erīs', 'erit', 'erīmus', 'erītis', 'erint'];
  const PLUP_SUB = ['issem', 'issēs', 'isset', 'issēmus', 'issētis', 'issent'];
  const SUM = { pres: ['sum', 'es', 'est', 'sumus', 'estis', 'sunt'], impf: ['eram', 'erās', 'erat', 'erāmus', 'erātis', 'erant'], fut: ['erō', 'eris', 'erit', 'erimus', 'eritis', 'erunt'],
    spres: ['sim', 'sīs', 'sit', 'sīmus', 'sītis', 'sint'], simpf: ['essem', 'essēs', 'esset', 'essēmus', 'essētis', 'essent'] };
  const map6 = (stem, arr) => arr.map(e => stem + e);
  // periphrastic perfect-system forms: amātus sum ... amātī sunt
  const peri = (ppl, aux) => { const pl = cut(ppl, 2) + 'ī'; return aux.map((s, i) => (i < 3 ? ppl : pl) + ' ' + s); };
  const PERI = { ind: { perf: SUM.pres, plup: SUM.impf, fperf: FPERF }, sub: { perf: SUM.spres, plup: SUM.simpf } };

  function Forms() {
    const T = {};
    return {
      T,
      six(mood, voice, tense, arr) { arr.forEach((f, i) => { if (f != null) T[`${mood}.${voice}.${tense}.${P[i]}`] = [].concat(f); }); },
      one(key, f) { if (f) T[key] = [].concat(f); },
      perfAct(pst, voice = 'act') {          // perfect system from the 3rd principal part
        if (!pst) return;
        this.six('ind', voice, 'perf', map6(pst, PERF).map((f, i) => i === 5 ? [f, pst + 'ēre'] : f));
        this.six('ind', voice, 'plup', map6(pst, PLUP)); this.six('ind', voice, 'fperf', map6(pst, FPERF));
        this.six('sub', voice, 'perf', map6(pst, PERF_SUB)); this.six('sub', voice, 'plup', map6(pst, PLUP_SUB));
        this.one(`inf.${voice}.perf`, pst + 'isse');
      },
      fimp(voice, arr) {                        // future imperative: 2s 3s 2p 3p (passive: 2s 3s 3p)
        const ks = arr.length === 4 ? ['2s', '3s', '2p', '3p'] : ['2s', '3s', '3p'];
        arr.forEach((f, i) => { if (f) T[`imp.${voice}.fut.${ks[i]}`] = [].concat(f); });
      },
      ger(g, gdv) {                              // gerund (gen dat acc abl) and gerundive (nom. sg. m f n)
        if (!g) return;
        this.one('ger.gen', g + 'ī'); this.one('ger.dat', g + 'ō'); this.one('ger.acc', g + 'um'); this.one('ger.abl', g + 'ō');
        if (gdv) { this.one('gdv.m', g + 'us'); this.one('gdv.f', g + 'a'); this.one('gdv.n', g + 'um'); }
      },
      sup(x, futPas) {                           // supine in -um / -ū; future passive infinitive = supine + īrī
        if (!x || !/um$/.test(x) || /ūrum$/.test(x)) return;
        this.one('sup.um', x); this.one('sup.u', cut(x, 2) + 'ū');
        if (futPas) this.one('inf.pas.fut', x + ' īrī');
      },
      perfPeri(ppl, voice) {
        if (!ppl) return;
        for (const m of ['ind', 'sub']) for (const t in PERI[m]) this.six(m, voice, t, peri(ppl, PERI[m][t]));
        this.one(`inf.${voice}.perf`, ppl + ' esse'); this.one(`ptc.${voice}.perf`, ppl);
      },
    };
  }
  function alt2s(T) {   // passive 2nd sg: -ris or -re
    for (const k in T) if (/^(ind|sub)\.(pas|dep)\.(pres|impf|fut)\.2s$/.test(k)) T[k] = T[k].concat(T[k].filter(f => /ris$/.test(f)).map(f => f.replace(/ris$/, 're')));
    return T;
  }
  // regular verbs (all four conjugations, active / passive / deponent)
  function regular(o) {
    const F = Forms(); const { conj, stem } = o; const infA = o.infA || stem + INF_A[conj];
    if (o.voice === 'act') {
      F.six('ind', 'act', 'pres', ACT[conj].pres.map(f => stem + f));
      F.six('ind', 'act', 'impf', impfAct(ACT[conj].impf).map(f => stem + f));
      F.six('ind', 'act', 'fut', ACT[conj].fut.map(f => stem + f));
      F.six('sub', 'act', 'pres', SUB_A[conj].map(f => stem + f));
      F.six('sub', 'act', 'impf', IMPF_SUB_A.map(f => cut(infA, 1) + f));
      let imp = stem + IMP_A[conj][0];
      if (/(dīc|dūc)[ōo]$/.test(o.p1)) imp = cut(o.p1, 1);
      if (o.p1 === 'faciō') imp = 'fac';
      F.one('imp.act.pres.2s', imp); F.one('imp.act.pres.2p', stem + IMP_A[conj][1]);
      F.fimp('act', FIMP_A[conj].map(f => stem + f));
      F.one('inf.act.pres', infA); F.one('ptc.act.pres', stem + PTC_PRES[conj]);
      F.ger(stem + GER[conj], o.gdv);
      if (o.sup) F.sup(o.sup, !!o.passive);
      if (o.pst) F.perfAct(o.pst);
      else if (o.semi) {   // semi-deponent: audeō, ausus sum
        for (const m of ['ind', 'sub']) for (const t in PERI[m]) F.six(m, 'act', t, peri(o.semi, PERI[m][t]));
        F.one('inf.act.perf', o.semi + ' esse'); F.one('ptc.act.perf', o.semi);
      }
      if (o.futp) { F.one('inf.act.fut', o.futp + ' esse'); F.one('ptc.act.fut', o.futp); }
    }
    if (o.voice === 'dep' || o.passive) {
      const v = o.voice === 'dep' ? 'dep' : 'pas';
      F.six('ind', v, 'pres', PAS[conj].pres.map(f => stem + f));
      F.six('ind', v, 'impf', impfPas(PAS[conj].impf).map(f => stem + f));
      F.six('ind', v, 'fut', PAS[conj].fut.map(f => stem + f));
      F.six('sub', v, 'pres', SUB_P[conj].map(f => stem + f));
      F.six('sub', v, 'impf', IMPF_SUB_P.map(f => cut(infA, 1) + f));
      F.one(`imp.${v}.pres.2s`, infA); F.one(`imp.${v}.pres.2p`, stem + PAS[conj].pres[4]);
      F.fimp(v, FIMP_P[conj].map(f => stem + f));
      if (v === 'dep') { F.ger(stem + GER[conj], o.gdv); if (o.ppp && /us$/.test(o.ppp) && !/uus$/.test(o.ppp)) F.sup(cut(o.ppp, 2) + 'um', false); }
      F.one(`inf.${v}.pres`, o.infA ? cut(o.infA, 1) + 'ī' : stem + INF_P[conj]);
      F.perfPeri(o.ppp, v);
      if (v === 'dep') { F.one('ptc.dep.pres', stem + PTC_PRES[conj]); if (o.futp) { F.one('inf.dep.fut', o.futp + ' esse'); F.one('ptc.dep.fut', o.futp); } }
    }
    return alt2s(F.T);
  }
  // verbs that take no personal passive (intransitive), even though the source gives a supine
  const INTRANS = new Set(('labōrō quiēscō errō properō festīnō currō concurrō occurrō accurrō fluō veniō adveniō conveniō ēveniō perveniō cēdō accēdō dēcēdō discēdō excēdō prōcēdō incēdō recēdō succēdō ēvādō incumbō surgō stō sedeō resīdō maneō remaneō exsistō crēscō vacō dormiō serviō pūgnō taceō vigilō rīdeō studeō faveō noceō pāreō placeō displiceō careō valeō lateō iaceō pateō ārdeō lūceō pendeō appāreō ambulō nāvigō cēnō natō volō convolō vīvō ēmineō obstō īnstō exeō ' +
    'occidō cadō dēsistō resistō cōnsistō īnsistō persistō assurgō cōnsurgō ēnītor nūbō pareō').split(' '));
  const FUT_FIX = { 'adsum': 'adfutūrus', 'orior': 'oritūrus', 'exorior': 'exoritūrus', 'morior': 'moritūrus', 'nāscor': 'nāscitūrus', 'iuvō': 'iuvātūrus', 'pariō': 'paritūrus', 'ruō': 'ruitūrus', 'secō': 'secātūrus', 'sonō': 'sonātūrus', 'fruor': 'fruitūrus', 'adiuvō': 'adiūtūrus' };
  const SUP_FIX = { 'quiēscō': 'quiētum', 'quaerō': 'quaesītum', 'requīrō': 'requīsītum', 'contemnō': 'contemptum', 'neglegō': 'neglēctum', 'intellegō': 'intellēctum', 'dēsinō': 'dēsitum' };   // source drops the prefix
  const CONJ_FIX = {};   // pāscō: the source's -āre is corrected in data/words.json (L&S: pasco, 3)
  // intransitive deponents: gerund yes, but no personal gerundive
  const DEP_INTRANS = new Set('īrāscor lābor morior orior exorior ēgredior revertor nāscor'.split(' '));
  // transitive verbs whose entry lacks a supine, but whose gerundive is standard
  const GDV_EXTRA = new Set('timeō metuō discō bibō urgeō fugiō'.split(' '));
  // eō compounds used transitively, with a personal passive (A&G §203.a; L&S: "v. n. and a.", e.g. Rhodanus vado transitur, Caes. B. G. 1, 6)
  const EO_PAS = new Set('adeō ineō obeō praetereō subeō trānseō'.split(' '));
  // extra accepted forms, appended after the regular ones
  const addAlt = (T, k, ...fs) => { if (T[k]) for (const f of fs) if (!T[k].includes(f)) T[k].push(f); };
  const ALT_FORMS = {
    // A&G §201: edō also has root forms without the thematic vowel (ēs, ēst, ēstis, ēsse, ēssem ...; pass. ēstur, ēssētur)
    'edō': T => {
      addAlt(T, 'ind.act.pres.2s', 'ēs'); addAlt(T, 'ind.act.pres.3s', 'ēst'); addAlt(T, 'ind.act.pres.2p', 'ēstis');
      ['ēssem', 'ēssēs', 'ēsset', 'ēssēmus', 'ēssētis', 'ēssent'].forEach((f, i) => addAlt(T, 'sub.act.impf.' + P[i], f));
      addAlt(T, 'imp.act.pres.2s', 'ēs'); addAlt(T, 'imp.act.pres.2p', 'ēste');
      addAlt(T, 'imp.act.fut.2s', 'ēstō'); addAlt(T, 'imp.act.fut.3s', 'ēstō'); addAlt(T, 'imp.act.fut.2p', 'ēstōte');
      addAlt(T, 'inf.act.pres', 'ēsse'); addAlt(T, 'ind.pas.pres.3s', 'ēstur'); addAlt(T, 'sub.pas.impf.3s', 'ēssētur');
    },
    // L&S: ad-sum (assum), adfuī (aff-); adfore for adfutūrum esse. adfuī stays the main answer
    'adsum': T => {
      addAlt(T, 'ind.act.pres.1s', 'assum'); addAlt(T, 'ind.act.pres.1p', 'assumus');
      for (const k in T) T[k] = T[k].concat(T[k].filter(f => /^adfu/.test(f)).map(f => 'aff' + f.slice(3)).filter(f => !T[k].includes(f)));
      addAlt(T, 'inf.act.fut', 'adfore', 'affore');
    },
    // L&S: lavō, lāvī, lautum, lavātum (class. prose: sup. always lavātum; perf. part. lautus)
    'lavō': T => {
      for (const k in T) T[k] = T[k].concat(T[k].filter(f => /^laut/.test(f)).map(f => f.replace(/^laut/, 'lavāt')).filter(f => !T[k].includes(f)));
      for (const k of ['sup.um', 'sup.u', 'inf.pas.fut']) if (T[k]) T[k].reverse();   // supine: lavātum first
    },
  };
  const DEFECTIVE = ['meminī', 'ōdī', 'coepī', 'inquam', 'aiō', 'salvē', 'quaesō', 'apage', 'ave', 'avē'];
  const pppFrom = x => x && /um$/.test(x) ? cut(x, 2) + 'us' : null;
  const futFrom = (p1, x) => FUT_FIX[p1] || (x && /ūrus$/.test(x) ? x : x && /ūrum$/.test(x) ? cut(x, 2) + 'us' : x && /(um|us)$/.test(x) ? cut(x, 2) + 'ūrus' : null);
  function verb(e) {
    const { parts } = clean(e.la);
    const p1 = parts[0];
    if (DEFECTIVE.includes(p1) || ends(p1, 'ī') && /isse/.test(parts[1] || '')) return { skip: 'defective verb' };
    if (/et$/.test(p1) && /uit|^-?ēre/.test(parts.slice(1).join(' '))) return { skip: 'impersonal verb' };
    const infRaw = parts[1] || '';
    const stem0 = /^-?ār[eiī]$/.test(infRaw) ? p1.replace(/(or|ō|o)$/, '') : p1.replace(/(ior|eor|or|iō|eō|ō|io|eo|o|m)$/, '');   // 1st conj. keeps its i/e: creō, -āre, -āvī
    let inf = expandPart(p1, stem0, infRaw) || '';
    let pp3 = PERF_FIX[p1] || (parts[2] ? expandPart(p1, stem0, parts[2]) : null);
    if (parts[2] === '-uī' && /u$/.test(stem0)) pp3 = stem0 + 'ī';                       // īnstituō -uī -> īnstituī
    if (parts[2] === '-iēcī' && /ici[oō]$/.test(p1)) pp3 = p1.replace(/ici[oō]$/, 'iēcī'); // adiciō -> adiēcī
    const pp3full = (parts[2] || '').includes(' sum') ? parts[2] : null;
    let pp4 = SUP_FIX[p1] || (parts[3] ? expandPart(p1, stem0, parts[3]) : null);
    // compound supine: reuse the prefix found for the perfect (peragō -ēgī -āctum -> per|ēgī -> perāctum)
    if (!SUP_FIX[p1] && parts[3] && parts[3][0] === '-' && parts[2] && parts[2][0] === '-' && pp3 && ends(pp3, parts[2].slice(1))) pp4 = cut(pp3, parts[2].length - 1) + parts[3].slice(1);
    const done = (o, T) => Object.assign({ kind: 'verb' }, o, { tbl: T });
    // --- irregulars ---
    if ((ends(inf, 'esse') || inf === 'posse') && ends(p1, 'sum')) {
      const F = Forms();
      const pst = pp3 ? cut(pp3, 1) : null;
      if (p1 === 'possum') {
        F.six('ind', 'act', 'pres', ['possum', 'potes', 'potest', 'possumus', 'potestis', 'possunt']);
        F.six('ind', 'act', 'impf', map6('pot', SUM.impf)); F.six('ind', 'act', 'fut', map6('pot', SUM.fut));
        F.six('sub', 'act', 'pres', map6('pos', SUM.spres)); F.six('sub', 'act', 'impf', SUM.simpf.map(f => 'po' + f.slice(1)));
        F.one('inf.act.pres', 'posse');
      } else {
        const pre = cut(p1, 3);
        const add = f => (pre === 'prō' && f[0] === 'e') ? 'prōd' + f : (pre === 'dē' && f[0] === 'e') ? 'de' + f : pre + f;   // prōdest; deest, deesse (vowel before vowel is short)
        F.six('ind', 'act', 'pres', SUM.pres.map(add)); F.six('ind', 'act', 'impf', SUM.impf.map(add)); F.six('ind', 'act', 'fut', SUM.fut.map(add));
        F.six('sub', 'act', 'pres', SUM.spres.map(add)); F.six('sub', 'act', 'impf', SUM.simpf.map(add));
        F.one('imp.act.pres.2s', add('es')); F.one('imp.act.pres.2p', add('este'));
        F.fimp('act', ['estō', 'estō', 'estōte', 'suntō'].map(add));
        F.one('inf.act.pres', add('esse'));
        const fp = futFrom(p1, pp4);
        if (fp) { F.one('inf.act.fut', p1 === 'sum' ? [fp + ' esse', 'fore'] : fp + ' esse'); F.one('ptc.act.fut', fp); }
      }
      F.perfAct(pst);
      if (ALT_FORMS[p1]) ALT_FORMS[p1](F.T);
      return done({ conj: 'irr', irr: p1 === 'possum' ? 'possum' : 'sum', voice: 'act', noPassive: true }, F.T);
    }
    if (ends(p1, 'eō') && /īre$/.test(inf)) {          // eō and compounds
      const pre = cut(p1, 2), F = Forms(), A = f => pre + f;
      F.six('ind', 'act', 'pres', ['eō', 'īs', 'it', 'īmus', 'ītis', 'eunt'].map(A));
      F.six('ind', 'act', 'impf', impfAct('ībam').map(A)); F.six('ind', 'act', 'fut', ['ībō', 'ībis', 'ībit', 'ībimus', 'ībitis', 'ībunt'].map(A));
      F.six('ind', 'act', 'perf', [['iī'], ['īstī', 'iistī'], ['iit'], ['iimus'], ['īstis', 'iistis'], ['iērunt', 'iēre']].map(a => a.map(A)));
      F.six('ind', 'act', 'plup', map6(pre + 'i', PLUP)); F.six('ind', 'act', 'fperf', map6(pre + 'i', FPERF));
      F.six('sub', 'act', 'pres', ['eam', 'eās', 'eat', 'eāmus', 'eātis', 'eant'].map(A));
      F.six('sub', 'act', 'impf', ['īrem', 'īrēs', 'īret', 'īrēmus', 'īrētis', 'īrent'].map(A));
      F.six('sub', 'act', 'perf', map6(pre + 'i', PERF_SUB));
      F.six('sub', 'act', 'plup', PLUP_SUB.map(f => [pre + 'ī' + f.slice(1), pre + 'i' + f]));
      F.one('imp.act.pres.2s', A('ī')); F.one('imp.act.pres.2p', A('īte'));
      F.fimp('act', ['ītō', 'ītō', 'ītōte', 'euntō'].map(A));
      const pas = EO_PAS.has(p1);                           // A&G §203.a: adeō, ineō and other transitive compounds have a passive
      F.ger(A('eund'), pas); F.sup(A('itum'), pas);       // eō itself and intransitive compounds: no gerundive / personal passive
      if (pas) {
        F.six('ind', 'pas', 'pres', ['eor', 'īris', 'ītur', 'īmur', 'īminī', 'euntur'].map(A));
        F.six('ind', 'pas', 'impf', impfPas('ībar').map(A)); F.six('ind', 'pas', 'fut', ['ībor', 'īberis', 'ībitur', 'ībimur', 'ībiminī', 'ībuntur'].map(A));
        F.six('sub', 'pas', 'pres', ['ear', 'eāris', 'eātur', 'eāmur', 'eāminī', 'eantur'].map(A));
        F.six('sub', 'pas', 'impf', ['īrer', 'īrēris', 'īrētur', 'īrēmur', 'īrēminī', 'īrentur'].map(A));
        F.one('inf.pas.pres', A('īrī')); F.perfPeri(A('itus'), 'pas');
        alt2s(F.T);
      }
      F.one('inf.act.pres', A('īre')); F.one('inf.act.perf', [A('īsse'), A('iisse')]); F.one('inf.act.fut', A('itūrus esse'));
      F.one('ptc.act.pres', A('iēns')); F.one('ptc.act.fut', A('itūrus'));
      return done({ conj: 'irr', irr: 'eō', voice: 'act', noPassive: !pas }, F.T);
    }
    if (/ferre$/.test(inf) && ends(p1, 'ferō')) {
      const pre = cut(p1, 4), F = Forms(), A = f => pre + f;
      const full = (x, def) => !x ? null : x[0] === '-' ? pre + x.slice(1) : x;
      const pst = full(parts[2]) ? cut(full(parts[2]), 1) : null;
      const sup = full(parts[3]);
      F.six('ind', 'act', 'pres', ['ferō', 'fers', 'fert', 'ferimus', 'fertis', 'ferunt'].map(A));
      F.six('ind', 'act', 'impf', impfAct('ēbam').map(f => A('fer' + f))); F.six('ind', 'act', 'fut', ACT[3].fut.map(f => A('fer' + f)));
      F.six('sub', 'act', 'pres', SUB_A[3].map(f => A('fer' + f))); F.six('sub', 'act', 'impf', IMPF_SUB_A.map(f => A('ferr' + f)));
      F.one('imp.act.pres.2s', A('fer')); F.one('imp.act.pres.2p', A('ferte'));
      F.fimp('act', ['fertō', 'fertō', 'fertōte', 'feruntō'].map(A));
      F.one('inf.act.pres', A('ferre')); F.one('ptc.act.pres', A('ferēns'));
      F.perfAct(pst);
      const ppp = pppFrom(sup), fp = futFrom(p1, sup);
      if (fp) { F.one('inf.act.fut', fp + ' esse'); F.one('ptc.act.fut', fp); }
      if (ppp) {
        F.six('ind', 'pas', 'pres', ['feror', 'ferris', 'fertur', 'ferimur', 'feriminī', 'feruntur'].map(A));
        F.six('ind', 'pas', 'impf', impfPas('ēbar').map(f => A('fer' + f))); F.six('ind', 'pas', 'fut', PAS[3].fut.map(f => A('fer' + f)));
        F.six('sub', 'pas', 'pres', SUB_P[3].map(f => A('fer' + f))); F.six('sub', 'pas', 'impf', IMPF_SUB_P.map(f => A('ferr' + f)));
        F.one('imp.pas.pres.2s', A('ferre')); F.one('imp.pas.pres.2p', A('feriminī'));
        F.one('inf.pas.pres', A('ferrī')); F.perfPeri(ppp, 'pas');
        F.fimp('pas', ['fertor', 'fertor', 'feruntor'].map(A));
      }
      F.ger(A('ferend'), !!ppp); F.sup(sup, !!ppp);
      return done({ conj: 'irr', irr: 'ferō', voice: 'act' }, alt2s(F.T));
    }
    const VNM = {
      'volō': [['volō', 'vīs', 'vult', 'volumus', 'vultis', 'volunt'], 'vol', 'vel', 'vell', 'volēns'],
      'nōlō': [['nōlō', 'nōn vīs', 'nōn vult', 'nōlumus', 'nōn vultis', 'nōlunt'], 'nōl', 'nōl', 'nōll', 'nōlēns'],
      'mālō': [['mālō', 'māvīs', 'māvult', 'mālumus', 'māvultis', 'mālunt'], 'māl', 'māl', 'māll', null],
    };
    if (VNM[p1] && /lle$/.test(inf)) {
      const [pr, st, ss, si, ptc] = VNM[p1], F = Forms();
      F.six('ind', 'act', 'pres', pr); F.six('ind', 'act', 'impf', impfAct('ēbam').map(f => st + f)); F.six('ind', 'act', 'fut', ACT[3].fut.map(f => st + f));
      F.six('sub', 'act', 'pres', ['im', 'īs', 'it', 'īmus', 'ītis', 'int'].map(f => ss + f)); F.six('sub', 'act', 'impf', IMPF_SUB_A.map(f => si + f));
      if (p1 === 'nōlō') { F.one('imp.act.pres.2s', 'nōlī'); F.one('imp.act.pres.2p', 'nōlīte'); F.fimp('act', ['nōlītō', 'nōlītō', 'nōlītōte', 'nōluntō']); }
      if (p1 === 'volō') F.ger('volend', false);          // nōlō / mālō: no gerund in normal use
      F.one('inf.act.pres', si + 'e'); F.one('ptc.act.pres', ptc);
      F.perfAct(st + 'u');
      return done({ conj: 'irr', irr: p1, voice: 'act', noPassive: true }, F.T);
    }
    if (p1 === 'fīō') {
      const F = Forms();
      F.six('ind', 'act', 'pres', ['fīō', 'fīs', 'fit', 'fīmus', 'fītis', 'fīunt']); F.six('ind', 'act', 'impf', impfAct('ēbam').map(f => 'fī' + f)); F.six('ind', 'act', 'fut', ACT[3].fut.map(f => 'fī' + f));
      F.six('sub', 'act', 'pres', SUB_A[3].map(f => 'fī' + f)); F.six('sub', 'act', 'impf', IMPF_SUB_A.map(f => 'fier' + f));
      F.one('imp.act.pres.2s', 'fī'); F.one('imp.act.pres.2p', 'fīte'); F.one('inf.act.pres', 'fierī');
      for (const m of ['ind', 'sub']) for (const t in PERI[m]) F.six(m, 'act', t, peri('factus', PERI[m][t]));
      F.one('inf.act.perf', 'factus esse'); F.one('ptc.act.perf', 'factus');
      return done({ conj: 'irr', irr: 'fīō', voice: 'act', noPassive: true, note: 'fīō serves as the passive of faciō' }, F.T);
    }
    if (p1 === 'dō' || /^-?dare$/.test(infRaw) && ends(p1, 'dō') && !/dere/.test(inf)) {   // dō and circumdō: short a except dās, dā, dāns
      const pre = cut(p1, 2);
      const T = regular({ conj: 1, stem: pre + 'd', p1, voice: 'act', pst: pp3 ? cut(pp3, 1) : null, ppp: pppFrom(pp4), futp: futFrom(p1, pp4), passive: !!pppFrom(pp4), gdv: !!pppFrom(pp4), sup: pp4 });
      const keep = new Set([pre + 'dās', pre + 'dā', pre + 'dāns']);
      for (const k in T) T[k] = T[k].map(f => keep.has(f) ? f : f.replace(new RegExp('^' + pre + 'dā'), pre + 'da'));
      return done({ conj: 'irr', irr: 'dō', voice: 'act' }, T);
    }
    // --- regular ---
    const dep = /(or)$/.test(p1);
    let flag = null, conj = null, o_inf = null;
    if (CONJ_FIX[p1]) inf = CONJ_FIX[p1][1];
    if (dep) {
      if (/ār[iī]$/.test(inf)) conj = 1; else if (/ēr[iī]$/.test(inf)) conj = 2; else if (/īr[iī]$/.test(inf)) conj = 4;
      else if (/[iī]$/.test(inf)) conj = ends(p1, 'ior') ? '3io' : 3;
      if (p1 === 'orior') conj = '3io';
      if (/rī$/.test(inf) && conj !== 3 && conj !== '3io' || p1 === 'orior') o_inf = cut(inf, 1) + 'e';   // orior: orīrī -> orīre-r
    } else {
      if (/āre$/.test(inf)) conj = 1;
      else if (/ēre$/.test(inf)) conj = ends(p1, 'eō') ? 2 : (flag = 'source has -ēre; treated as 3rd conj.', 3);
      else if (/ere$/.test(inf)) conj = ends(p1, 'eō') ? (flag = 'source has -ere; treated as 2nd conj.', 2) : ends(p1, 'iō') ? '3io' : 3;
      else if (/īre$/.test(inf)) conj = 4;
      if (conj === 3 && ends(p1, 'iō')) conj = '3io';
    }
    if (CONJ_FIX[p1]) flag = CONJ_FIX[p1][0];
    if (!conj) return { skip: 'could not determine conjugation' };
    const stem = conj === 1 ? p1.replace(/(or|ō|o)$/, '') : dep ? p1.replace(/(ior|eor|or)$/, '') : p1.replace(/(iō|eō|ō|io|eo|o)$/, '');   // 1st conj. keeps its i: nūntiō, nūntiāre
    if (!stem || stem === p1) return { skip: 'unrecognized first principal part' };
    if (dep) {
      const raw = (parts[2] || '').replace(/\s*sum$/, '').trim();
      const ppl = raw && /us$/.test(raw) ? expandPart(p1, stem, raw) : null;
      const futp = FUT_FIX[p1] || (ppl && !/uus$/.test(ppl) ? cut(ppl, 2) + 'ūrus' : null);
      return done({ conj, voice: 'dep', flag }, regular({ conj, stem, p1, voice: 'dep', ppp: ppl, futp, infA: o_inf, gdv: !DEP_INTRANS.has(p1) }));
    }
    if (pp3full) {          // semi-deponent (audeō, ausus sum)
      const semi = expandPart(p1, stem, pp3full.replace(/\s*sum$/, ''));
      return done({ conj, voice: 'act', semi: true, noPassive: true, flag }, regular({ conj, stem, p1, voice: 'act', semi, futp: futFrom(p1, pp4) || cut(semi, 2) + 'ūrus', gdv: p1 === 'audeō' }));
    }
    const ppp = pppFrom(pp4);
    const passive = !!ppp && !INTRANS.has(p1);
    const T = regular({ conj, stem, p1, voice: 'act', pst: pp3 && /ī$/.test(pp3) ? cut(pp3, 1) : null, ppp, futp: futFrom(p1, pp4), passive, gdv: passive || GDV_EXTRA.has(p1), sup: pp4 });
    if (ALT_FORMS[p1]) ALT_FORMS[p1](T);
    return done({ conj, voice: 'act', flag, noPassive: !passive, noPassiveWhy: !ppp ? 'no supine/perfect passive participle in the source' : !passive ? 'intransitive' : null }, T);
  }
  // ---------- nouns ----------
  const CASES = ['nom', 'gen', 'dat', 'acc', 'abl'];
  const CASE_N = { nom: 'nominative', gen: 'genitive', dat: 'dative', acc: 'accusative', abl: 'ablative', voc: 'vocative', loc: 'locative' };
  const CASES_X = CASES.concat(['voc', 'loc']);
  // locative: hand-curated, only words on the list that take one (no city names are on Diederich's list)
  const LOC = { 'domus': ['domī'], 'rūs': ['rūrī', 'rūre'], 'humus': ['humī'], 'bellum': ['bellī'], 'mīlitia': ['mīlitiae'] };
  // vocative: 2nd-decl. -us -> -e, -ius -> -ī (fīlī); deus -> deus; everything else = nominative
  function addVoc(T, nom, decl, g) {
    if (T['nom.pl']) T['voc.pl'] = T['nom.pl'].slice();
    if (!T['nom.sg']) return T;
    let v = T['nom.sg'].slice();
    if (decl === 2 && g !== 'n' && /us$/.test(nom)) v = /ius$/.test(nom) ? (/^(fīlius|genius)$/.test(nom) ? [cut(nom, 3) + 'ī'] : [cut(nom, 3) + 'ī', cut(nom, 2) + 'e']) : [cut(nom, 2) + 'e'];
    T['voc.sg'] = v;
    if (LOC[nom]) T['loc.sg'] = LOC[nom].slice();
    return T;
  }
  const cells = (sg, pl) => { const o = {}; CASES.forEach((c, i) => { if (sg && sg[i] != null) o[c + '.sg'] = [].concat(sg[i]); if (pl && pl[i] != null) o[c + '.pl'] = [].concat(pl[i]); }); return o; };   // null cell = not drilled
  const NOUN_IRR = {
    'vīs': cells(['vīs', null, 'vī', 'vim', 'vī'],   // gen. sg. vīs is rare (A&G 79): not drilled
                  ['vīrēs', 'vīrium', 'vīribus', ['vīrēs', 'vīrīs'], 'vīribus']),
    'domus': cells(['domus', 'domūs', ['domuī', 'domō'], 'domum', ['domō', 'domū']], ['domūs', ['domuum', 'domōrum'], 'domibus', ['domōs', 'domūs'], 'domibus']),
    'deus': cells(['deus', 'deī', 'deō', 'deum', 'deō'], [['dī', 'deī', 'diī'], ['deōrum', 'deum'], ['dīs', 'deīs', 'diīs'], 'deōs', ['dīs', 'deīs', 'diīs']]),
    'bōs': cells(['bōs', 'bovis', 'bovī', 'bovem', 'bove'], ['bovēs', 'boum', ['bōbus', 'būbus'], 'bovēs', ['bōbus', 'būbus']]),
    'Iuppiter': cells(['Iuppiter', 'Iovis', 'Iovī', 'Iovem', 'Iove'], null),
    'iter': cells(['iter', 'itineris', 'itinerī', 'iter', 'itinere'], ['itinera', 'itinerum', 'itineribus', 'itinera', 'itineribus']),
  };
  const GPL_UM = ['pater', 'māter', 'frāter', 'canis', 'iuvenis', 'senex', 'sēdēs', 'vātēs', 'parēns', 'mēnsis', 'apis', 'volucris'];
  const GPL_BOTH = ['parēns', 'mēnsis', 'vātēs', 'apis', 'volucris', 'mūs', 'fraus', 'laus', 'cliēns', 'sapiēns', 'adulēscēns', 'cīvitās', 'aetās'];
  const GPL_IUM_X = ['os', 'cor', 'carō', 'imber', 'linter', 'venter', 'ūter', 'nix', 'līs', 'mās', 'glīs', 'faux', 'fauces'];
  // source corrections: the list's entry is wrong or too short to decline from
  const GEN_FIX = { 'senex': 'senis' };              // senex, senis (A&G 79): stem sen-, pl. senēs, gen. pl. senum
  const GENDER_FIX = { 'castellum': 'n' };           // the list has "m."; castellum is neuter (pl. castella)
  const UBUS = ['arcus'];                            // dat./abl. pl. arcubus (L&S; cf. A&G 68)
  const syl = s => (plain(s).match(/[aeiouy]+/g) || []).length;
  function noun(e) {
    const { parts, notes } = clean(e.la);
    const nom = parts[0];
    if (NOUN_IRR[nom]) return { kind: 'noun', decl: 'irr', irr: nom, g: 'irr', tbl: addVoc(Object.assign({}, NOUN_IRR[nom]), nom, 'irr', 'irr') };
    if (/indecl/.test(notes) || /indecl/.test(e.la)) return { skip: 'indeclinable' };
    if (parts.length === 2) { const mm = parts[1].match(/^(\S+)\s+(m|f|n|mf|c)\.$/); if (mm) parts.splice(1, 1, mm[1], mm[2] + '.'); }
    if (parts.length < 3) return { skip: 'defective / unusual entry' };
    let gender = GENDER_FIX[nom] || (parts.find((p, i) => i >= 2 && /^-?\.?(m|f|n|mf|c)\.?$/.test(p)) || '').replace(/[-.]/g, '');
    if (!gender) return { skip: 'no gender given' };
    const neut = gender === 'n';
    let gRaw = parts[1];
    const plOnly = /(^|; )pl\.($|;)/.test(notes) || /^(ārum|ōrum|um|ium|uum|ērum)$/.test(gRaw.replace(/^-/, '')) && /(ae|ī|a|ēs)$/.test(nom);
    if (/mostly|only/.test(notes) && !/gen\. pl/.test(notes)) return { skip: 'defective forms (' + notes + ')' };
    let g = gRaw.replace(/^-/, '');
    let gen, decl, stem, nomFix = null, istemOut = false;
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
      if (GEN_FIX[nom]) gen = GEN_FIX[nom];
      else if (gRaw[0] !== '-') gen = gRaw;
      else if (g === 'is') gen = (/(is|ēs|e)$/.test(nom) ? nom.replace(/(is|ēs|e)$/, '') : nom) + 'is';
      else if (isV(g[0])) gen = lastVowelStem() + g;
      else gen = expandPart(nom, nom, gRaw);
      if (!/is$/.test(gen)) return { skip: 'genitive not recognized' };
      stem = cut(gen, 2);
    }
    let sg, pl;
    if (decl === 1) { sg = [nomFix || nom, stem + 'ae', stem + 'ae', stem + 'am', stem + 'ā']; pl = [stem + 'ae', stem + 'ārum', stem + 'īs', stem + 'ās', stem + 'īs'];
      if (/ābus/.test(notes)) { pl[2] = [stem + 'īs', stem + 'ābus']; pl[4] = [stem + 'īs', stem + 'ābus']; }
      if (nom === 'dea') { pl[2] = ['deābus', 'deīs']; pl[4] = ['deābus', 'deīs']; }   // A&G 43b: deābus (deīs also found)
      if (plOnly) sg = null; }                                      // tenebrae, -ārum: no singular
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
      istemOut = istem;
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
      const dp = UBUS.includes(nom) ? stem + 'ubus' : /-ubus/.test(notes) ? [stem + 'ibus', stem + 'ubus'] : stem + 'ibus';
      sg = n ? [nom, stem + 'ūs', stem + 'ū', nom, stem + 'ū'] : [nom, stem + 'ūs', stem + 'uī', stem + 'um', stem + 'ū'];
      pl = n ? [stem + 'ua', stem + 'uum', dp, stem + 'ua', dp] : [stem + 'ūs', stem + 'uum', dp, stem + 'ūs', dp];
    }
    if (decl === 5) { sg = [nom, gen, gen, stem + 'em', stem + 'ē']; pl = [stem + 'ēs', stem + 'ērum', stem + 'ēbus', stem + 'ēs', stem + 'ēbus']; }
    const tbl = addVoc(cells(sg, pl), nom, decl, gender);
    // c(h)arta: primary forms follow L&S charta; the spelling carta is the other reading of the entry (Wiktionary: alternative form)
    if (decl === 1 && /^c\(h\)arta\b/.test(e.la)) {
      for (const k in tbl) for (const f of tbl[k].slice()) {
        const alt = f.replace(/^ch/, 'c');
        if (alt !== f && !tbl[k].includes(alt)) tbl[k].push(alt);
      }
    }
    return { kind: 'noun', decl, g: gender, istem: decl === 3 ? istemOut : false, plOnly, flag: nomFix ? 'nominative -ā shortened to -a (A&G §40)' : null, tbl };
  }
  // ---------- adjectives ----------
  const GEN = ['m', 'f', 'n'];
  const GEN_N = { m: 'masculine', f: 'feminine', n: 'neuter' };
  const IUS = ['ūnus', 'sōlus', 'tōtus', 'nūllus', 'ūllus', 'alius', 'alter', 'uter', 'neuter', 'uterque'];
  const CONS_ADJ = ['vetus', 'dīves', 'pauper', 'prīnceps', 'particeps', 'compos', 'sōspes', 'superstes', 'pūbēs', 'memor', 'dēgener'];
  function adjTbl(m, f, n) { const o = {}; for (const [gk, a] of [['m', m], ['f', f], ['n', n]]) { if (!a) continue; CASES.forEach((c, i) => { o[gk + '.' + c + '.sg'] = [].concat(a[0][i]); o[gk + '.' + c + '.pl'] = [].concat(a[1][i]); }); } return o; }
  function adjVoc(T, mv) {   // vocative = nominative, except masc. sg. of -us adjectives (bone, ēgregie, mī)
    for (const g of GEN) for (const n of ['sg', 'pl']) if (T[`${g}.nom.${n}`]) T[`${g}.voc.${n}`] = T[`${g}.nom.${n}`].slice();
    if (mv && T['m.nom.sg']) T['m.voc.sg'] = mv;
    return T;
  }
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
      const g2 = ius ? (nom === 'alter' ? [st + 'īus', st + 'ius'] : st + 'īus') : null, d2 = ius ? st + 'ī' : null;   // alterius (short i) is the usual form
      const m = [[nom, g2 || st + 'ī', d2 || st + 'ō', st + 'um', st + 'ō'], [st + 'ī', st + 'ōrum', st + 'īs', st + 'ōs', st + 'īs']];
      const f = [[st + 'a', g2 || st + 'ae', d2 || st + 'ae', st + 'am', st + 'ā'], [st + 'ae', st + 'ārum', st + 'īs', st + 'ās', st + 'īs']];
      const n = [[st + 'um', g2 || st + 'ī', d2 || st + 'ō', st + 'um', st + 'ō'], [st + 'a', st + 'ōrum', st + 'īs', st + 'a', st + 'īs']];
      const T = adjTbl(m, f, n);
      const mv = nom === 'meus' ? ['mī'] : /ius$/.test(nom) && !ius ? [cut(nom, 3) + 'ie', cut(nom, 3) + 'ī'] : /us$/.test(nom) ? [cut(nom, 2) + 'e'] : [nom];
      return { kind: 'adj', decl: '1/2', tbl: adjVoc(T, mv) };
    }
    // 3rd declension
    let mNom, fNom, nNom, st, cons = CONS_ADJ.includes(nom), comp = false;
    if (p3 && /e$/.test(p3) && /is$/.test(p2)) {          // ācer, ācris, ācre / celer, -eris, -ere
      st = p2 === '-eris' && /er$/.test(nom) ? nom : cut(expandPart(nom, nom, p2), 2); mNom = nom; fNom = st + 'is'; nNom = st + 'e';   // celer, -eris: stem celer- (not celerer-)
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
    const gpl = comp || cons || nom === 'celer' ? st + 'um' : st + 'ium';   // celer: gen. pl. celerum (A&G 115a)
    const npl = comp || cons ? st + 'a' : st + 'ia';
    const mf = nn => [[nn, st + 'is', st + 'ī', st + 'em', abl], [st + 'ēs', gpl, st + 'ibus', comp || cons ? st + 'ēs' : [st + 'ēs', st + 'īs'], st + 'ibus']];
    const n = [[nNom, st + 'is', st + 'ī', nNom, abl], [npl, gpl, st + 'ibus', npl, st + 'ibus']];
    return { kind: 'adj', decl: 3, tbl: adjVoc(adjTbl(mf(mNom), mf(fNom), memor ? null : n)) };
  }
  // ---------- pronouns ----------
  // Personal pronouns (A&G 143) take case.num keys like nouns; hic and ille (A&G 146) take g.case.num keys like
  // adjectives. No vocatives: A&G gives none. Diederich lists ego/nōs and tū/vōs as separate words, so each has one number.
  const PRON = {
    'ego': { pron: 'pers', person: 1, tbl: () => cells([['ego', 'egō'], 'meī', ['mihi', 'mī'], 'mē', 'mē'], null) },
    'nōs': { pron: 'pers', person: 1, tbl: () => cells(null, ['nōs', ['nostrum', 'nostrī'], 'nōbīs', 'nōs', 'nōbīs']) },
    'tū': { pron: 'pers', person: 2, tbl: () => cells(['tū', 'tuī', 'tibi', 'tē', 'tē'], null) },
    'vōs': { pron: 'pers', person: 2, tbl: () => cells(null, ['vōs', ['vestrum', 'vestrī'], 'vōbīs', 'vōs', 'vōbīs']) },
    'hic': { pron: 'dem', tbl: () => adjTbl(
      [['hic', 'huius', 'huic', 'hunc', 'hōc'], ['hī', 'hōrum', 'hīs', 'hōs', 'hīs']],
      [['haec', 'huius', 'huic', 'hanc', 'hāc'], ['hae', 'hārum', 'hīs', 'hās', 'hīs']],
      [['hoc', 'huius', 'huic', 'hoc', 'hōc'], ['haec', 'hōrum', 'hīs', 'haec', 'hīs']]) },
    'ille': { pron: 'dem', tbl: () => adjTbl(
      [['ille', 'illīus', 'illī', 'illum', 'illō'], ['illī', 'illōrum', 'illīs', 'illōs', 'illīs']],
      [['illa', 'illīus', 'illī', 'illam', 'illā'], ['illae', 'illārum', 'illīs', 'illās', 'illīs']],
      [['illud', 'illīus', 'illī', 'illud', 'illō'], ['illa', 'illōrum', 'illīs', 'illa', 'illīs']]) },
  };
  function pronoun(e) {
    const h = plain(e.la.split(/[ ,(]/)[0]) === 'ego' ? 'ego' : e.la.split(/[ ,(]/)[0], P0 = PRON[h];
    if (!P0) return { skip: 'pronoun (not drilled)' };
    const tbl = P0.tbl(), head = P0.pron === 'dem' ? 'm.nom.sg' : tbl['nom.sg'] ? 'nom.sg' : 'nom.pl';
    return { kind: 'pron', pron: P0.pron, person: P0.person || null, head: h, headKey: head, num: P0.pron === 'pers' ? (tbl['nom.sg'] ? 'sg' : 'pl') : null, tbl };
  }
  function analyze(e) {
    try {
      if (e.pos === 'verb') return verb(e);
      if (e.pos === 'noun') return noun(e);
      if (e.pos === 'adjective') return adj(e);
      if (e.pos === 'pronoun') return pronoun(e);
      return { skip: 'not inflected' };
    } catch (err) { if (root.DEBUG) throw err; return { skip: 'generator error: ' + err.message }; }
  }
  // human-readable label for a table key
  function label(kind, key) {
    const k = key.split('.');
    if (kind === 'verb') {
      const [mood, voice, tense, p] = k;
      const vw = voice === 'dep' ? '' : VOICES[voice] + ' ';
      const dep = voice === 'dep' ? ' (deponent)' : '';
      if (mood === 'ind' || mood === 'sub') return `${PERS[p]} · ${TENSES[tense]} ${vw}${MOODS[mood]}${dep}`;
      if (mood === 'ger') return `gerund · ${CASE_N[voice]}`;
      if (mood === 'gdv') return `gerundive · ${GEN_N[voice]} nom. sg.`;
      if (mood === 'sup') return voice === 'um' ? 'supine in -um (accusative)' : 'supine in -ū (ablative)';
      if (mood === 'imp') return `${PERS[p]} · ${TENSES[tense]} ${vw}imperative${dep}`;
      if (mood === 'inf') return `${TENSES[tense]} ${vw}infinitive${dep}`;
      return `${TENSES[tense]} ${vw}participle${dep} (nom. masc. sg.)`;
    }
    if (kind === 'noun' || k.length === 2) return `${CASE_N[k[0]]} ${k[1] === 'sg' ? 'singular' : 'plural'}`;
    return `${GEN_N[k[0]]} ${CASE_N[k[1]]} ${k[2] === 'sg' ? 'singular' : 'plural'}`;
  }
  // also accept feminine / neuter participles in compound forms (amāta est, amātum esse)
  function variants(a) {
    const out = [a];
    let m = a.match(/^(\S+)us( .+)$/); if (m) out.push(m[1] + 'a' + m[2], m[1] + 'um' + m[2]);
    m = a.match(/^(\S+)ī( .+)$/); if (m) out.push(m[1] + 'ae' + m[2], m[1] + 'a' + m[2]);
    if (/^exs/.test(a)) return out.concat(out.map(v => 'ex' + v.slice(3)));   // ex(s)-: exstinguō / extinguō, exspectō / expectō, exsistō / existō (L&S)
    return out;
  }
  function check(input, answers, strict) { const f = strict ? normM : norm, n = f(input); return answers.some(a => variants(a).some(v => f(v) === n)); }
  // Dictionary affix hyphens are notation, not letters. Normalize only answers
  // marked as affixes; ordinary words and internal punctuation stay strict.
  function checkHead(input, answers, strict) {
    const dash = s => String(s).replace(/[\u2010-\u2015\u2212\ufe63\uff0d]/g, '-').trim();
    return answers.some(a => {
      const key = dash(a), affix = /^-|-$/.test(key);
      const bare = s => s.replace(key.startsWith('-') ? /^-/ : /-$/, '');
      return check(affix ? bare(dash(input)) : input, [affix ? bare(key) : a], strict);
    });
  }
  const api = { analyze, label, check, checkHead, variants, norm, normM, plain, TENSES, CASES, CASES_X, MOODS, VOICES, PERS, P, CASE_N, GEN_N };
  root.Morph = api; if (typeof module !== 'undefined') module.exports = api;
})(typeof self !== 'undefined' ? self : this);
