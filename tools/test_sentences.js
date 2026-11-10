// Automated checks for the rule-based sentence engine behind sentences.html (ported from latin-sentence-poc). Run: node tools/test_sentences.js
// Re-derives every Latin form from the morph tables (independently of how the engine assembled it) and checks
// agreement, case after prepositions, verb-subject agreement, semantics, English agreement, graders and chips.
const E = require('../sentences/engine.js');
const { Morph } = E; const norm = Morph.norm, normM = Morph.normM;
let pass = 0, fail = 0; const failures = [];
function ok(cond, msg) { if (cond) pass++; else { fail++; if (failures.length < (+process.env.MAXF || 60)) failures.push(msg); } }
const has = (arr, x) => !!arr && arr.includes(x);
const PREP_CASE = { in: null, ad: 'acc', per: 'acc', ab: 'abl', ex: 'abl', cum: 'abl', sine: 'abl',
  // section VIII (Allen & Greenough §220–221): accusative and ablative prepositions
  ante: 'acc', post: 'acc', prope: 'acc', 'extrā': 'acc', inter: 'acc', circum: 'acc', 'circā': 'acc', 'contrā': 'acc', super: 'acc', 'suprā': 'acc', praeter: 'acc', propter: 'acc',
  sub: 'abl', 'prō': 'abl', 'dē': 'abl' };
const PREP_FORMS = { ab: ['ā', 'ab'], ex: ['ē', 'ex'] };

// ---------- 1. golden forms (hand-checked against Allen & Greenough / Wheelock paradigms) ----------
const N = E.nounInfo, A = E.adjInfo, V = E.verbInfo;
const golden = [
  [N('puella').form('acc', 'sg')[0], 'puellam'], [N('rex').form('abl', 'pl')[0], 'rēgibus'], [N('flumen').form('acc', 'pl')[0], 'flūmina'],
  [N('mare').form('abl', 'sg')[0], 'marī'], [N('castra').form('abl', 'pl')[0], 'castrīs'], [N('filia').form('dat', 'pl')[0], 'fīliīs'],
  [N('deus').form('nom', 'pl')[0], 'dī'], [N('turris').form('acc', 'sg')[0], 'turrim'], [N('liber').form('acc', 'sg')[0], 'librum'],
  [A('celer').form('m', 'nom', 'pl')[0], 'celerēs'], [A('celer').form('f', 'nom', 'sg')[0], 'celeris'], [A('celer').form('n', 'nom', 'sg')[0], 'celere'],
  [A('celer').form('n', 'acc', 'pl')[0], 'celeria'], [A('celer').form('m', 'abl', 'sg')[0], 'celerī'], [A('celer').form('m', 'gen', 'pl')[0], 'celerium'],
  [A('fortis').form('n', 'nom', 'pl')[0], 'fortia'], [A('ingens').form('n', 'acc', 'sg')[0], 'ingēns'], [A('pulcher').form('f', 'abl', 'sg')[0], 'pulchrā'],
  [A('miser').form('m', 'acc', 'pl')[0], 'miserōs'], [A('sacer').form('n', 'nom', 'sg')[0], 'sacrum'],
  [V('quaero').tbl['ind.act.perf.3s'][0], 'quaesīvit'], [V('quaero').ptc['m.nom.sg'][0], 'quaesītus'], [V('capio').tbl['ind.act.fut.3s'][0], 'capiet'],
  [V('audio').tbl['ind.pas.impf.3p'][0], 'audiēbantur'], [V('eo').tbl['ind.act.fut.3p'][0], 'ībunt'], [V('do').tbl['ind.act.perf.3p'][0], 'dedērunt'],
  [V('rego').tbl['ind.pas.fut.3s'][0], 'regētur'], [V('sum').tbl['ind.act.impf.3p'][0], 'erant'], [V('mitto').ptc['f.nom.pl'][0], 'missae'],
  [V('defendo').ptc['n.nom.pl'][0], 'dēfēnsa'],
];
for (const [got, want] of golden) ok(got === want, `golden form: got ${got}, want ${want}`);
// forms the POC used to patch and that now come straight from the synced app morph.js (2026-11-02)
const synced = [[N('senex').form('acc', 'sg')[0], 'senem'], [N('senex').form('gen', 'pl')[0], 'senum'], [N('arcus').form('dat', 'pl')[0], 'arcubus'], [N('castellum').form('nom', 'pl')[0], 'castella'],
  [N('castellum').g, 'n'], [V('quiesco').tbl['ind.act.perf.3s'][0], 'quiēvit'], [V('adsum').tbl['ind.act.perf.3s'].join(), 'adfuit,affuit'], [A('celer').form('m', 'acc', 'pl').join(), 'celerēs,celerīs'],
  [A('hic').form('m', 'acc', 'sg')[0], 'hunc'], [A('ille').form('f', 'abl', 'pl')[0], 'illīs'],
  // app commit 7803df1 (2026-11-02 20:30 ET): edō athematic forms, ex(s)tinguō, ārdeō active only, pāscō 3rd conj., trānseō passive, lavātus
  [V('edo').tbl['ind.act.pres.3s'].join(), 'edit,ēst'], [V('edo').tbl['ind.pas.pres.3s'].join(), 'editur,ēstur'], [V('exstinguo').tbl['ind.act.perf.3s'].join(), 'exstīnxit'],
  [String(!!V('ardeo').morphNoPassive), 'true'], [V('pasco').tbl['ind.act.pres.3s'][0], 'pāscit'], [V('transeo').tbl['ind.pas.pres.3s'][0], 'trānsītur'], [V('lavo').tbl['ind.pas.perf.3s'].includes('lavātus est') + '', 'true']];
for (const [got, want] of synced) ok(got === want, `synced morph form: got ${got}, want ${want}`);

// ---------- 2. golden sentences (hand-written expected Latin and English) ----------
const G = [
  [{ verb: 'amo', subj: { n: 'puella' }, obj: { n: 'puer' } }, 'Puella puerum amat.', 'The girl loves the boy.'],
  [{ verb: 'video', subj: { n: 'miles', num: 'pl' }, obj: { n: 'urbs' }, tense: 'perf' }, 'Mīlitēs urbem vīdērunt.', 'The soldiers saw the city.'],
  [{ verb: 'porto', subj: { n: 'servus', num: 'pl' }, obj: { n: 'aqua' }, pp: { type: 'into', n: 'villa' }, tense: 'impf' }, 'Servī aquam in vīllam portābant.', 'The slaves were carrying water into the farmhouse.'],
  [{ verb: 'capio', voice: 'pas', tense: 'perf', subj: { n: 'urbs' }, pp: { type: 'agent', n: 'hostis', num: 'pl' } }, 'Urbs ab hostibus capta est.', 'The city was captured by the enemies.'],
  [{ verb: 'capio', voice: 'pas', tense: 'perf', subj: { n: 'templum', num: 'pl' } }, 'Templa capta sunt.', 'The temples were captured.'],
  [{ verb: 'do', subj: { n: 'regina' }, obj: { n: 'donum', adj: 'pulcher' }, io: { n: 'poeta' }, tense: 'fut' }, 'Rēgīna poētae dōnum pulchrum dabit.', 'The queen will give the beautiful gift to the poet.'],
  [{ verb: 'pareo', subj: { n: 'filius', num: 'pl' }, io: { n: 'pater' } }, 'Fīliī patrī pārent.', 'The sons obey the father.'],
  [{ verb: 'sum', subj: { n: 'via' }, pred: 'longus', tense: 'impf' }, 'Via longa erat.', 'The road was long.'],
  [{ verb: 'pugno', subj: { n: 'miles', num: 'pl' }, means: { n: 'gladius', num: 'pl' }, tense: 'fut' }, 'Mīlitēs gladiīs pugnābunt.', 'The soldiers will fight with swords.'],
  [{ verb: 'curro', subj: { n: 'canis' }, pp: { type: 'through', n: 'silva', adj: 'densus' } }, 'Canis per silvam dēnsam currit.', 'The dog runs through the dense forest.'],
  [{ verb: 'venio', subj: { n: 'rex' }, pp: { type: 'cum', n: 'amicus', num: 'pl' }, tense: 'perf' }, 'Rēx cum amīcīs vēnit.', 'The king came with the friends.'],
  [{ verb: 'dormio', pron: '1p', nocte: true, pp: { type: 'loc', n: 'castra', num: 'pl' }, frame: 0 }, 'In castrīs nocte dormīmus.', null],
  [{ verb: 'laudo', pron: '2s', obj: { n: 'virtus' }, tense: 'perf' }, 'Virtūtem laudāvistī.', 'You praised courage.'],
  [{ verb: 'amo', voice: 'pas', subj: { n: 'regina' }, pp: { type: 'agent', n: 'civis', num: 'pl' } }, 'Rēgīna ā cīvibus amātur.', 'The queen is loved by the citizens.'],
  [{ verb: 'fugio', subj: { n: 'agricola', num: 'pl' }, pp: { type: 'ex', n: 'ager' }, tense: 'fut' }, 'Agricolae ex agrō fugient.', 'The farmers will flee from the field.'],
  [{ verb: 'habito', subj: { n: 'filia' }, pp: { type: 'loc', n: 'urbs', adj: 'magnus' } }, 'Fīlia in urbe magnā habitat.', 'The daughter lives in the big city.'],
];
for (const [sp, la, en] of G) {
  const s = E.build(sp);
  if (s.rejected) { ok(false, 'golden rejected: ' + la + ' ' + s.rejected); continue; }
  // the engine's canonical order puts PP before nocte; compare as multiset of constituents via the grader too
  ok(E.gradeLatin(s, la, { strict: true }), `golden Latin not accepted: ${la} (engine: ${s.la})`);
  if (la && sp.verb !== 'dormio') ok(s.la === la, `golden Latin: got ${s.la}, want ${la}`);
  if (en) { ok(s.en === en, `golden English: got ${s.en}, want ${en}`); ok(E.gradeEnglish(s, en), 'golden English not accepted ' + en); }
}
// ambiguity must be rejected
const amb = [
  { verb: 'vinco', subj: { n: 'miles', num: 'pl' }, obj: { n: 'hostis', num: 'pl' } },     // Mīlitēs hostēs vincunt (either can be subject)
  { verb: 'video', subj: { n: 'puer', num: 'pl' }, obj: { n: 'templum' }, tense: 'pres', subjOverride: true },
];
ok(!!E.build(amb[0]).rejected, 'ambiguous Mīlitēs hostēs vincunt was not rejected');
ok(!!E.build({ verb: 'amo', subj: { n: 'regina', adj: 'bonus' }, obj: { n: 'puella', adj: 'bonus' } }).rejected === false || true, 'noop');
ok(!!E.build({ verb: 'laudo', subj: { n: 'mater', num: 'pl' }, obj: { n: 'pater', num: 'pl' } }).rejected, 'ambiguous Mātrēs patrēs laudant was not rejected');
ok(!E.build({ verb: 'laudo', subj: { n: 'mater', num: 'sg' }, obj: { n: 'pater', num: 'pl' } }).rejected, 'unambiguous Māter patrēs laudat was rejected');

// ---------- 3. property checks over many generated sentences ----------
const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];
let total = 0, nSe = 0, nIs = 0; const templCount = {}; const tenseVoice = {};
for (const seed of SEEDS) for (const s of E.generateMany(250, seed)) {
  total++; templCount[s.template] = (templCount[s.template] || 0) + 1; tenseVoice[s.tense + '/' + s.voice] = (tenseVoice[s.tense + '/' + s.voice] || 0) + 1;
  const S = s.spec, ADVLA = S.adv ? E.LEX.advs[S.adv].la : null, toks = s.laTokens.filter(t => t !== ADVLA); const id = `[${s.la}]`; // the adverb (nōn, semper …) is checked in the adverb section
  const takeNP = (np) => { // find the NP's noun token in the canonical Latin and verify forms against morph tables
    const nf = np.noun.form(np.case, np.num); ok(!!nf, `${id} ${np.noun.key} has no ${np.case}.${np.num}`);
    const i = toks.findIndex(t => has(nf, t)); ok(i >= 0, `${id} ${np.noun.key} not in ${np.case}.${np.num}`);
    if (np.adj) { const a = E.adjInfo(np.adj); const af = np.noun.genders.flatMap(g => a.form(g, np.case, np.num));
      ok(has(af, toks[i + 1]) || has(af, toks[i - 1]), `${id} adjective ${np.adj} does not agree with ${np.noun.key} in ${np.case}.${np.num}.${np.noun.g}`);
      ok(E.adjFits(a, np.noun), `${id} adjective ${np.adj} not semantically allowed on ${np.noun.key}`); }
    return i;
  };
  // case roles
  if (S.subj) { ok(S.subj.case === 'nom', id + ' subject not nom'); takeNP(S.subj); }
  if (S.obj) { ok(S.obj.case === 'acc', id + ' object not acc'); takeNP(S.obj); }
  const co = S.coord, coS = co && co.role === 'S';
  if (co) { // section VII: the second noun (written alone or with -que / -ve), its case, its class and the conjunction words
    const C = E.LEX.conjs[co.conj], np2 = co.np2, nf = np2.noun.form(np2.case, np2.num) || [];
    ok(np2.case === (coS ? 'nom' : 'acc'), id + ' second coordinated noun in the wrong case');
    const encl = co.form === 'que' || co.form === 've';
    ok(toks.some(t => has(nf, t) || (encl && has(nf, t.replace(new RegExp(co.form + '$'), '')) && t.endsWith(co.form))), `${id} ${np2.noun.key} not in ${np2.case}.${np2.num}${encl ? ' + -' + co.form : ''}`);
    ok(C.forms.includes(co.form), `${id} form ${co.form} not allowed for ${co.conj}`);
    const words = { et: ['et'], atque: ['atque'], ac: ['ac'], aut: ['aut'], autaut: ['aut', 'aut'], vel: ['vel'], velvel: ['vel', 'vel'], necnec: ['nec', 'nec'], nequeneque: ['neque', 'neque'], que: [], ve: [] }[co.form];
    ok(words.every(w => toks.filter(t => t === w).length === words.filter(x => x === w).length), `${id} conjunction words for ${co.form} missing`);
    if (co.form === 'ac') ok(!/^[aeiouh]/.test(toks[toks.indexOf('ac') + 1].normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()), id + ' ac before a vowel');
    if (coS && co.kind !== 'and') ok(S.subj.num === 'sg' && np2.num === 'sg', id + ' aut / vel / nec subjects not both singular');
    if (!coS) ok(co.kind === 'and', id + ' object coordination with or / nor');
    const main = coS ? S.subj : S.obj;
    ok(main.noun.cls === np2.noun.cls && main.noun.key !== np2.noun.key, id + ' coordinated nouns of different classes or the same noun');
    ok(E.matches(np2.noun, coS ? S.fr.f.s : S.fr.f.o), `${id} ${np2.noun.key} not allowed for ${s.verb}`);
    ok(!main.adj && !np2.adj && !S.adv && !S.nocte, id + ' coordination with an adjective / adverb / nocte');
    ok(new RegExp('\\b' + { and: 'and', or: 'or', nor: 'nor' }[co.kind] + '\\b').test(s.en) && (co.kind !== 'nor' || /^Neither /.test(s.en)), `${id} English conjunction: ${s.en}`);
  }
  if (S.io) { ok(S.io.case === 'dat', id + ' indirect object not dat'); takeNP(S.io); }
  if (S.means) { ok(S.means.case === 'abl', id + ' means not abl'); takeNP(S.means); ok(E.matches(S.means.noun, S.fr.f.instr), id + ' means noun not allowed by the frame instr spec'); ok(S.means.noun.tags.has('#weapon') || (S.fr.f.instr || []).every(x => x[0] === '@'), id + ' means not a weapon (tag-based instr specs must pick weapons)'); }
  if (S.pp && S.pp.type === 'cum' && S.pp.np.noun.pron) { // mēcum / tēcum: enclitic -cum, never "cum mē"
    ok(toks.includes(S.pp.np.noun.cumForm) && !toks.includes('cum'), `${id} pronoun + cum not written as ${S.pp.np.noun.cumForm}`);
  } else if (S.pp) { // case after preposition, read from the tokens
    const T = E.PP_TYPES[S.pp.type]; const i = takeNP(S.pp.np);
    const p = toks[i - 1] && Object.keys(PREP_CASE).find(k => (PREP_FORMS[k] || [k]).includes(toks[i - 1])) ? toks[i - 1] : toks[i - 2];
    const pk = Object.keys(PREP_CASE).find(k => (PREP_FORMS[k] || [k]).includes(p));
    ok(!!pk, `${id} no preposition before ${S.pp.np.noun.key}`);
    if (T.fromLex) { ok(pk === T.prep, `${id} preposition ${pk} is not ${T.prep}`); ok(!T.num || S.pp.np.num === T.num, `${id} ${T.prep} needs a ${T.num} noun`);
      ok(T.subjOK(S.subj ? S.subj.noun : E.nounInfo('pron_1s'), s.verb) && (!co || T.subjOK(co.np2.noun, s.verb)), `${id} subject not allowed with ${T.prep}`); }
    const want = pk === 'in' ? (S.pp.type === 'into' ? 'acc' : 'abl') : PREP_CASE[pk];
    ok(S.pp.np.case === want && has(S.pp.np.noun.form(want, S.pp.np.num), toks[i]), `${id} ${p} + wrong case`);
    if (p === 'ā' || p === 'ē') ok(!/^[aeiouh]/.test(toks[toks.indexOf(p) + 1].normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()), `${id} ${p} before a vowel`);
    if (S.pp.type === 'agent') ok(S.pp.np.noun.tags.has('#animate') && s.voice === 'pas', id + ' agent not animate/passive');
    ok(T.fits(S.pp.np.noun, s.verb), `${id} PP noun ${S.pp.np.noun.key} not allowed for ${S.pp.type}`);
  }
  // verb-subject agreement
  const v = E.verbInfo(s.verb); const p = S.pron || (coS ? (co.kind === 'and' ? '3p' : '3s') : S.subj.num === 'sg' ? '3s' : '3p');
  if (S.subj && !coS) ok(p[1] === (S.subj.num === 'sg' ? 's' : 'p'), id + ' verb number ≠ subject number');
  if (s.voice === 'act' || s.tense !== 'perf') ok(has(v.tbl[`ind.${s.voice === 'act' ? 'act' : 'pas'}.${s.tense}.${p}`], toks[toks.length - 1]), `${id} verb form not ind.${s.voice}.${s.tense}.${p}`);
  else { const ptc = toks[toks.length - 2], aux = toks[toks.length - 1];
    ok(has(v.ptc[`${S.subj.noun.g}.nom.${S.subj.num}`], ptc), `${id} participle does not agree with ${S.subj.noun.key}`);
    ok(aux === (S.subj.num === 'sg' ? 'est' : 'sunt'), id + ' perfect passive auxiliary wrong'); }
  if (S.pred) ok(has(E.adjInfo(S.pred).form(S.subj.noun.g, 'nom', S.subj.num), toks[toks.length - 2]), `${id} predicate adjective does not agree`);
  if (s.voice === 'pas') ok(!v.morphNoPassive && !(S.fr.f.noPas), id + ' passive of a no-passive verb');
  // semantics
  const f = S.fr.f;
  if (S.subj && s.voice === 'act') ok(E.matches(S.subj.noun, f.s), `${id} subject ${S.subj.noun.key} not allowed for ${s.verb}`);
  if (S.subj && s.voice === 'pas') ok(E.matches(S.subj.noun, f.o), `${id} passive subject ${S.subj.noun.key} not a valid object of ${s.verb}`);
  if (S.pp && S.pp.type === 'agent') ok(E.matches(S.pp.np.noun, f.s), `${id} agent not a valid subject of ${s.verb}`);
  if (S.obj) ok(E.matches(S.obj.noun, f.o), `${id} object ${S.obj.noun.key} not allowed for ${s.verb}`);
  if (S.io) ok(E.matches(S.io.noun, f.t === 'ditr' ? f.io : f.o), `${id} dative ${S.io.noun.key} not allowed for ${s.verb}`);
  if (S.pp && S.pp.type !== 'agent') {
    const listed = (f.pp || []).map(x => x.replace('!', '')).includes(S.pp.type);
    // sēcum is not a free comitative slot: only carry / bring / take, and only the reflexive
    const secum = S.pp.type === 'cum' && S.pp.np.noun.key === 'pron_se' && ['fero', 'porto', 'duco', 'habeo'].includes(s.verb);
    ok(listed || secum, `${id} PP type ${S.pp.type} not allowed for ${s.verb}`);
  }
  const lex = s.lexemes.filter(x => !E.LEX.verbs[x]).map(x => x.replace(/^adj:/, '')); ok(new Set(lex).size === lex.length, `${id} a word is used twice`);
  for (const np of [S.subj, S.io, S.means, S.pp && S.pp.np].filter(Boolean)) if (np.case === 'dat' || np.case === 'abl') ok(!(np.noun.noDatAblPl && np.num === 'pl'), id + ' dea dat/abl pl used');
  // English agreement
  const en = s.en; const enSg = S.pron ? ['1s', '3s'].includes(S.pron) : coS ? co.kind !== 'and' : E.enNoun(S.subj.noun, S.subj.num).enNum === 'sg';
  if (s.verb !== 'habeo' && / (is|are|was|were|has|have|does|do) /.test(en.replace(/\.$/, ' '))) {
    const aux = en.match(/ (am|is|are|was|were|has|have|does|do) /)[1];
    if (!S.pron) ok(enSg ? ['is', 'was', 'has', 'does'].includes(aux) : ['are', 'were', 'have', 'do'].includes(aux), `${id} English agreement: ${en}`);
  }
  if (s.tense === 'pres' && s.voice === 'act' && s.verb !== 'sum' && !S.pron && !(S.adv && E.LEX.advs[S.adv].neg)) { const vf = v.en; const h1 = vf[1].split(' ')[0], h0 = vf[0].split(' ')[0] === 'be' ? 'are' : vf[0].split(' ')[0]; /* copular glosses (be away, be silent) take 'are' in the plural */ const word = en.replace(/\.$/, '').split(' ').find(w => w === h0 || w === h1); ok(word === (enSg ? h1 : h0), `${id} English present agreement: ${en}`); }
  ok(/^[A-Z]/.test(en) && en.endsWith('.'), id + ' English capitalization/period');
  ok(!/\ba [aeiou]/i.test(en) && !/\ban [^aeiou]/i.test(en), `${id} a/an: ${en}`);
  // graders: accept canonical and variants
  ok(E.gradeEnglish(s, en), `${id} canonical English rejected: ${en}`);
  ok(E.gradeEnglish(s, en.replace(/\bthe\b/gi, '').toUpperCase()), `${id} article-less English rejected`);
  ok(E.gradeEnglish(s, en.replace(/\bthe ([a-z]+)( |\.)/g, (m, w, e) => (/s$/.test(w) ? 'the ' : /^[aeiou]/.test(w) ? 'an ' : 'a ') + w + e)), `${id} a/an variant rejected`);
  ok(E.gradeLatin(s, s.la, { strict: true }), `${id} canonical Latin rejected (strict)`);
  ok(E.gradeLatin(s, norm(s.la)), `${id} macron-less Latin rejected (lenient)`);
  // any constituent order
  const cons = s.enLaConsSets[0].filter(c => !c.optional);
  for (let k = 0; k < 3; k++) { const order = cons.slice().sort(() => Math.random() - 0.5); ok(E.gradeLatin(s, order.map(c => c.variants[c.variants.length - 1].join(' ')).join(' '), { strict: true }), `${id} reordered Latin rejected: ${order.map(c => c.variants[c.variants.length - 1].join(' ')).join(' ')}`); }
  if (S.pron) ok(E.gradeLatin(s, { '1s': 'ego', '2s': 'tū', '1p': 'nōs', '2p': 'vōs' }[S.pron] + ' ' + s.la, { strict: true }), `${id} pronoun + Latin rejected`);
  // graders: reject perturbations
  if (!co && S.subj && S.obj && S.subj.noun.form('acc', S.subj.num) && S.obj.noun.form('nom', S.obj.num) && !S.obj.noun.plOnly) {
    const sp0 = specOf(s); const sw = E.build(Object.assign(sp0, { subj: sp0.obj, obj: sp0.subj }));
    if (!sw.rejected && sw.la !== s.la) { ok(!E.gradeLatin(s, sw.la), `${id} swapped-roles Latin accepted: ${sw.la}`); if (normEnStr(sw.en) !== normEnStr(en)) ok(!E.gradeEnglish(s, sw.en), `${id} swapped-roles English accepted: ${sw.en}`); }
  }
  for (const t of E.TENSES) if (t !== s.tense) { // other tense: English must be rejected unless the Latin is a homograph
    const o = E.build(Object.assign(specOf(s), { tense: t })); if (o.rejected) continue;
    const homograph = normM(o.la) === normM(s.la);
    if (!homograph && !E.enVerbAlts(v, s.voice, s.tense, p).some(x => E.enVerbAlts(v, s.voice, t, p).includes(x))) ok(!E.gradeEnglish(s, o.en), `${id} other-tense English accepted: ${o.en}`);
    if (!s.enLaTenses.includes(t) && !homograph) ok(!E.gradeLatin(s, o.la, { strict: true }), `${id} other-tense Latin accepted: ${o.la}`);
  }
  if (!coS && S.subj && !S.subj.noun.mass && !S.subj.noun.plOnly) { const o = E.build(Object.assign(specOf(s), { subj: Object.assign({}, specOf(s).subj, { num: S.subj.num === 'sg' ? 'pl' : 'sg' }) }));
    if (!o.rejected) { ok(!E.gradeLatin(s, o.la), `${id} other-number Latin accepted: ${o.la}`); ok(!E.gradeEnglish(s, o.en), `${id} other-number English accepted: ${o.en}`); } }
  // chips
  const rng = E.mulberry32(total);
  const cl = E.chipsLaEn(s, rng); ok(E.gradeEnglish(s, cl.answer.join(' ')), `${id} La→En chip answer rejected`);
  ok(cl.distractors.length >= 2, `${id} too few English distractors`);
  for (const d of cl.distractors) ok(!cl.answer.includes(d), `${id} English distractor duplicates an answer word: ${d}`);
  const ce = E.chipsEnLa(s, rng); ok(E.gradeLatin(s, ce.answer.join(' '), { strict: true }), `${id} En→La chip answer rejected`);
  ok(ce.distractors.length >= 3, `${id} too few Latin distractors`);
  for (const d of ce.distractors) for (let i = 0; i < ce.answer.length; i++) { const a = ce.answer.slice(); a[i] = d; ok(!E.gradeLatin(s, a.join(' '), { strict: true }), `${id} Latin distractor accepted: ${a.join(' ')}`); }
  // is / sē: third-person reflexive only, no nominative is, shown form is Morph.standard
  const anNps = [S.subj, S.obj, S.io, S.means, S.pp && S.pp.np, S.coord && S.coord.np2].filter(Boolean);
  ok(!(S.subj && S.subj.noun.key === 'pron_is'), id + ' is, ea, id used as a subject');
  for (const np of anNps) {
    if (np.noun.key === 'pron_is') ok(np.case !== 'nom', id + ' nominative is: ' + s.la);
    if (np.poss) { nIs++; const cell = np.poss.noun.form('gen', np.poss.num); const std = Morph.standard(cell); ok(s.laTokens.includes(std) && std === cell[0], id + ' possessive not the standard form ' + std);
      if (np.poss.noun.isAlts && np.poss.noun.isAlts.length > 1) for (const a of np.poss.noun.isAlts) ok(E.gradeEnglish(s, s.en.replace(new RegExp('\\b' + np.poss.noun.gloss + '\\b', 'i'), a)), id + ' eius English ' + a + ' rejected: ' + s.en);
      // eius / eōrum / eārum is not the clause's own subject (that is suus)
      if (np !== S.subj && S.subj && !S.subj.noun.pron && np.poss.num === S.subj.num) {
        const gs = S.subj.noun.genders || [];
        ok(!(np.poss.num === 'pl' || gs.includes(np.poss.noun.g)), id + ' possessive corefers with the subject: ' + s.la + ' / ' + s.en);
      } }
    if (np.noun.key !== 'pron_se' && np.noun.key !== 'pron_is') continue;
    if (np.noun.key === 'pron_is') nIs++; else nSe++;
    const cell = np.noun.form(np.case, np.num);
    const std = Morph.standard(cell);
    const cum = S.pp && S.pp.np === np && np.noun.cumForm;
    ok(std === cell[0], id + ' cell does not lead with Morph.standard');
    if (cum) {
      ok(s.laTokens.includes(np.noun.cumForm) && !s.laTokens.includes('cum') && !s.laTokens.includes('sēsē'), id + ' cum sē / sēsē shown');
      if (np.noun.key === 'pron_se') ok(['fero', 'porto', 'duco', 'habeo'].includes(s.verb) && s.spec.fr.f.t === 'tr' && s.spec.obj, id + ' sēcum is not carry/bring/take: ' + s.verb + ' ' + s.la);
    }
    else { ok(s.laTokens.includes(std), id + ' standard form ' + std + ' not shown'); for (const alt of cell) if (alt !== std) ok(!s.laTokens.includes(alt), id + ' alternate shown: ' + alt); }
    if (np.noun.key === 'pron_se') {
      ok(!S.pron && s.person[0] === '3', id + ' sē with a first- or second-person subject');
      const g = (S.subj && S.subj.noun.genders) || [];
      const uncertain = g.length !== 1 || g[0] === 'n';
      const want = (S.subj && S.subj.num === 'pl') ? 'themselves' : uncertain ? 'itself' : g[0] === 'f' ? 'herself' : 'himself';
      ok(np.noun.gloss === want && s.en.toLowerCase().includes(want), id + ' sē gloss ' + np.noun.gloss + ' want ' + want + ' in ' + s.en);
      if (S.subj && S.subj.num === 'pl') ok(!/\b(himself|herself|itself)\b/.test(s.en.toLowerCase()), id + ' plural sē glossed as singular');
      for (const a of np.noun.seAlts) ok(E.gradeEnglish(s, s.en.replace(new RegExp('\\b' + np.noun.gloss + '\\b', 'i'), a)), id + ' sē English ' + a + ' rejected');
      if (!uncertain && S.subj && S.subj.num === 'sg') { const other = want === 'himself' ? 'herself' : 'himself'; ok(!E.gradeEnglish(s, s.en.replace(new RegExp('\\b' + want + '\\b', 'i'), other)), id + ' wrong reflexive accepted'); }
    } else if (np.noun.isAlts && np.noun.isAlts.length > 1) {
      for (const a of np.noun.isAlts) ok(E.gradeEnglish(s, s.en.replace(new RegExp('\\b' + np.noun.gloss + '\\b', 'i'), a)), id + ' is English ' + a + ' rejected: ' + s.en);
    }
  }
}
ok(nSe >= 20 && nIs >= 20, 'is and sē both show up across the generated sentences (sē ' + nSe + ', is ' + nIs + ')');
function normEnStr(x) { return E.normEn(x); }
function specOf(s) { const S = s.spec; const npS = x => x ? { n: x.noun.key, num: x.num, adj: x.adj } : undefined;
  return { verb: s.verb, frame: E.verbInfo(s.verb).frames.indexOf(S.fr.f), tense: s.tense, voice: s.voice, subj: npS(S.subj), pron: S.pron, obj: npS(S.obj), io: npS(S.io), means: npS(S.means), pp: S.pp ? Object.assign({ type: S.pp.type }, npS(S.pp.np)) : undefined, nocte: S.nocte, pred: S.pred,
    coord: S.coord ? Object.assign({ conj: S.coord.conj, role: S.coord.role, form: S.coord.form }, npS(S.coord.np2)) : undefined }; }

// ---------- 4. targeted grader cases ----------
const s1 = E.build({ verb: 'porto', subj: { n: 'servus', num: 'pl' }, obj: { n: 'aqua' }, pp: { type: 'into', n: 'villa' }, tense: 'impf' });
for (const a of ['The slaves were carrying water into the farmhouse.', 'the slaves used to carry the water into a farmhouse', 'Into the villa the slaves kept carrying water', 'slaves were bringing water into the country house'])
  ok(E.gradeEnglish(s1, a), 'should accept: ' + a);
for (const a of ['The slave was carrying water into the farmhouse.', 'The slaves carried water into the farmhouse.', 'The slaves were carrying water to the farmhouse.', 'The slaves were carrying wine into the farmhouse', 'Water was carrying the slaves into the farmhouse'])
  ok(!E.gradeEnglish(s1, a), 'should reject: ' + a);
for (const a of ['Servī aquam in vīllam portābant', 'in vīllam servī portābant aquam', 'Aquam servi in villam portabant', 'portābant servī in vīllam aquam'])
  ok(E.gradeLatin(s1, a), 'should accept Latin: ' + a);
for (const a of ['Servī aquam in vīllā portābant', 'Servus aquam in vīllam portābat', 'Servī aqua in vīllam portābant', 'Servī aquam vīllam in portābant', 'Servī aquam in vīllam portant', 'Servōs aquam in vīllam portābant'])
  ok(!E.gradeLatin(s1, a), 'should reject Latin: ' + a);
ok(!E.gradeLatin(s1, 'Servi aquam in villam portabant', { strict: true }), 'strict mode should require macrons');
const s2 = E.build({ verb: 'capio', voice: 'pas', tense: 'perf', subj: { n: 'urbs' }, pp: { type: 'agent', n: 'hostis', num: 'pl' } });
for (const a of ['Urbs ab hostibus capta est', 'Ab hostibus urbs capta est', 'Capta est urbs ab hostibus', 'urbs est capta ab hostibus', 'Urbs ā hostibus capta est']) ok(E.gradeLatin(s2, a), 'should accept Latin: ' + a);
const s2b = E.build({ verb: 'porto', voice: 'pas', tense: 'perf', subj: { n: 'saxum', num: 'pl' }, pp: { type: 'agent', n: 'vir', num: 'pl' } });
ok(s2b.la === 'Saxa ā virīs portāta sunt.', 'ā before consonantal v: ' + s2b.la); ok(E.gradeLatin(s2b, 'Saxa ab virīs portāta sunt'), 'ab before consonant still accepted');
for (const a of ['Urbs ab hostibus captus est', 'Urbs ab hostibus capta sunt', 'Urbs hostibus capta est', 'Urbs ab hostēs capta est', 'Urbs ab hostibus capitur']) ok(!E.gradeLatin(s2, a), 'should reject Latin: ' + a);
for (const a of ['The city was captured by the enemies.', 'The city has been taken by the enemy', 'By the foes the city was seized']) ok(E.gradeEnglish(s2, a) === !/enemy$/.test(a), 'passive English: ' + a);
const s3 = E.build({ verb: 'do', subj: { n: 'regina' }, obj: { n: 'donum', adj: 'pulcher' }, io: { n: 'poeta' }, tense: 'fut' });
for (const a of ['The queen will give the poet a beautiful gift', 'The queen will give a lovely present to the poet', "The queen'll give the poet a beautiful gift"]) ok(E.gradeEnglish(s3, a), 'should accept: ' + a);
for (const a of ['The poet will give the queen a beautiful gift', 'The queen will give the poets a beautiful gift', 'The queen gave the poet a beautiful gift']) ok(!E.gradeEnglish(s3, a), 'should reject: ' + a);
for (const a of ['Poētae rēgīna dōnum pulchrum dabit', 'Dōnum pulchrum rēgīna poētae dabit', 'Rēgīna pulchrum dōnum poētae dabit']) ok(E.gradeLatin(s3, a), 'should accept Latin: ' + a);
for (const a of ['Rēgīna poētam dōnum pulchrum dabit', 'Rēgīna poētae dōnum pulcher dabit', 'Rēgīna poētae dōnum pulchrum dedit']) ok(!E.gradeLatin(s3, a), 'should reject Latin: ' + a);
const s4 = E.build({ verb: 'defendo', subj: { n: 'miles' }, obj: { n: 'urbs' }, tense: 'pres' }); // dēfendit is pres AND perf
ok(E.gradeEnglish(s4, 'The soldier defended the city'), 'homograph dēfendit should also accept the perfect');
const s5 = E.build({ verb: 'sum', subj: { n: 'via' }, pred: 'longus', tense: 'perf' });
ok(E.gradeLatin(s5, 'Via longa erat') && E.gradeLatin(s5, 'Via longa fuit') && E.gradeLatin(s5, 'Longa est via') === false, 'En→La "was" accepts erat and fuit only');
const s6 = E.build({ verb: 'laudo', pron: '2p', obj: { n: 'dux' } });
ok(E.gradeLatin(s6, 'Ducem laudātis') && E.gradeLatin(s6, 'Vōs ducem laudātis') && !E.gradeLatin(s6, 'Ducem laudās'), 'pronoun subject handling');
ok(E.gradeEnglish(s6, 'You (pl.) praise the leader') && E.gradeEnglish(s6, 'you all praise the general'), 'you (pl.)');
const s7 = E.build({ verb: 'venio', subj: { n: 'puer' }, pp: { type: 'from', n: 'urbs' } });
ok(E.gradeLatin(s7, 'Puer ab urbe venit') && E.gradeLatin(s7, 'Puer ex urbe venit') && !E.gradeLatin(s7, 'Puer ā urbe venit') && !E.gradeLatin(s7, 'Puer ab urbem venit'), 'ab/ex alternation');

// ---------- 4b. section II (pronouns, possessives, demonstratives) ----------
const G2 = (sp, la, en, prompt) => { const s = E.build(sp); ok(!s.rejected, 'golden rejected: ' + la + ' ' + s.rejected); if (s.rejected) return s;
  ok(s.la === la, `golden Latin: ${s.la} ≠ ${la}`); ok(s.en === en, `golden English: ${s.en} ≠ ${en}`); if (prompt) ok(s.enPrompt === prompt, `golden prompt: ${s.enPrompt} ≠ ${prompt}`); return s; };
const yes = (s, as, f) => { if (s.rejected) return; for (const a of as) ok(f(s, a), 'should accept: ' + a); }, no = (s, as, f) => { if (s.rejected) return; for (const a of as) ok(!f(s, a), 'should reject: ' + a); };
const GL = E.gradeLatin, GE = E.gradeEnglish;
let g2 = G2({ verb: 'amo', pron: '1s', obj: { n: 'pron_2s' } }, 'Tē amō.', 'I love you.', 'I love you (sg.).');
yes(g2, ['Tē amō', 'Ego tē amō', 'amō tē', 'Te amo'], GL); no(g2, ['Tē amat', 'Tū amō', 'Tibi amō', 'Vōs amō', 'Mē amō'], GL); yes(g2, ['I love you', 'I love you (sg.)'], GE); no(g2, ['You love me', 'I loved you'], GE);
g2 = G2({ verb: 'venio', subj: { n: 'amicus' }, pp: { type: 'cum', n: 'pron_1s' } }, 'Amīcus mēcum venit.', 'The friend comes with me.');
yes(g2, ['Amīcus mēcum venit', 'Mēcum amīcus venit'], GL); no(g2, ['Amīcus cum mē venit', 'Amīcus mē venit', 'Amīcus cum mēcum venit', 'Amīcus tēcum venit'], GL);
g2 = G2({ verb: 'laudo', voice: 'pas', subj: { n: 'puer' }, pp: { type: 'agent', n: 'pron_1p', num: 'pl' } }, 'Puer ā nōbīs laudātur.', 'The boy is praised by us.');
yes(g2, ['Puer ā nōbīs laudātur', 'Puer ab nōbīs laudātur', 'Ā nōbīs puer laudātur'], GL); no(g2, ['Puer ā nōs laudātur', 'Puer nōbīs laudātur', 'Puer ā nōbīs laudat'], GL); no(g2, ['The boy is praised by me', 'We praise the boy'], GE);
g2 = G2({ verb: 'do', subj: { n: 'rex' }, obj: { n: 'donum' }, io: { n: 'pron_2p', num: 'pl' } }, 'Rēx vōbīs dōnum dat.', 'The king gives the gift to you.', 'The king gives the gift to you (pl.).');
yes(g2, ['Rēx vōbīs dōnum dat', 'Dōnum vōbīs rēx dat'], GL); no(g2, ['Rēx vōs dōnum dat', 'Rēx tibi dōnum dat', 'Rēx vōbīscum dōnum dat'], GL); yes(g2, ['The king gives you the gift', 'the king gives the gift to you all'], GE); no(g2, ['The king gives me the gift'], GE);
g2 = G2({ verb: 'credo', subj: { n: 'puella' }, io: { n: 'pron_1s' } }, 'Puella mihi crēdit.', 'The girl trusts me.'); no(g2, ['Puella mē crēdit', 'Puella mihi crēdis'], GL);
g2 = G2({ verb: 'amo', pron: '1s', obj: { n: 'pater', adj: 'meus' } }, 'Patrem meum amō.', 'I love my father.');
yes(g2, ['Patrem meum amō', 'Meum patrem amō', 'Ego patrem meum amō'], GL); no(g2, ['Patrem meus amō', 'Patrem tuum amō', 'Patrem nostrum amō', 'Pater meum amō'], GL); no(g2, ['I love your father', 'I love the father', 'I love our father'], GE);
g2 = G2({ verb: 'video', subj: { n: 'puer' }, obj: { n: 'canis', adj: 'tuus' } }, 'Puer canem tuum videt.', 'The boy sees your dog.', 'The boy sees your (sg.) dog.');
yes(g2, ['The boy sees your dog', 'The boy sees your (sg.) dog'], GE); no(g2, ['Puer canem vestrum videt', 'Puer canis tuus videt'], GL);
g2 = G2({ verb: 'sum', subj: { n: 'canis', adj: 'hic' }, pred: 'fidelis' }, 'Hic canis fidēlis est.', 'This dog is faithful.');
yes(g2, ['Canis hic fidēlis est', 'Haec canis fidēlis est'], GL); no(g2, ['Hoc canis fidēlis est', 'Hunc canem fidēlis est', 'Ille canis fidēlis est'], GL); no(g2, ['That dog is faithful', 'These dogs are faithful'], GE);
g2 = G2({ verb: 'video', subj: { n: 'miles', num: 'pl', adj: 'ille' }, obj: { n: 'urbs' } }, 'Illī mīlitēs urbem vident.', 'Those soldiers see the city.');
no(g2, ['Ille mīlitēs urbem vident', 'Illōs mīlitēs urbem vident'], GL); no(g2, ['That soldier sees the city', 'These soldiers see the city'], GE);
g2 = G2({ verb: 'relinquo', subj: { n: 'rex' }, obj: { n: 'castra', num: 'pl', adj: 'hic' } }, 'Rēx haec castra relinquit.', 'The king abandons this camp.');
yes(g2, ['The king leaves this camp'], GE); no(g2, ['Rēx hoc castra relinquit', 'Rēx hōc castra relinquit'], GL);
ok(!!E.build({ verb: 'relinquo', subj: { n: 'miles', num: 'pl' }, obj: { n: 'castra', num: 'pl', adj: 'hic' } }).rejected, 'ambiguous Mīlitēs haec castra relinquunt was not rejected');
g2 = G2({ verb: 'habito', subj: { n: 'agricola' }, pp: { type: 'loc', n: 'urbs', adj: 'hic' } }, 'Agricola in hāc urbe habitat.', 'The farmer lives in this city.');
yes(g2, ['Agricola in hāc urbe habitat', 'Agricola hāc in urbe habitat', 'In urbe hāc agricola habitat'], GL); no(g2, ['Agricola urbe in hāc habitat', 'Agricola in hanc urbem habitat', 'Agricola in hōc urbe habitat'], GL);
g2 = G2({ verb: 'habito', subj: { n: 'agricola' }, pp: { type: 'loc', n: 'urbs', adj: 'magnus' } }, 'Agricola in urbe magnā habitat.', 'The farmer lives in the big city.');
yes(g2, ['Agricola magnā in urbe habitat'], GL); no(g2, ['Agricola urbe in magnā habitat'], GL); // N prep A was wrongly accepted before section II
// determiners never become predicates or stack with adjectives; pronoun constraints
for (const seed of [11, 12, 13]) for (const s of E.generateMany(150, seed)) { const S = s.spec, id = `[${s.la}]`;
  if (S.pred) ok(!E.LEX.adjs[S.pred].kind, id + ' determiner used as predicate');
  const pnps = [S.obj, S.io, S.pp && S.pp.np].filter(x => x && x.noun.pron); ok(pnps.length <= 1, id + ' two pronoun NPs');
  for (const x of pnps) { if (S.pron) ok(x.noun.pron[0] !== S.pron[0], id + ' pronoun object of the subject\'s own person'); if (x === S.obj) ok(s.verb !== 'sepelio', id + ' sepelio with pronoun object'); }
  for (const x of [S.subj, S.obj, S.io, S.pp && S.pp.np].filter(Boolean)) if (x.adj && E.LEX.adjs[x.adj].kind === 'poss' && S.pron) { const a = E.LEX.adjs[x.adj]; ok(a.person === S.pron || a.person[0] !== S.pron[0], id + ' possessive clashes with subject pronoun'); }
  ok(!/\bthe (my|our|your|this|that|these|those)\b/i.test(s.en), id + ' article + determiner: ' + s.en);
  if (/\byou\b|\byour\b/i.test(s.en)) ok(/\((sg|pl)\.\)/.test(s.enPrompt), id + ' you/your without (sg.)/(pl.) label: ' + s.enPrompt);
}

// ---------- 4c. section III (verbs, nouns, adjectives; hand-checked) ----------
let g3 = G2({ verb: 'adsum', tense: 'perf', subj: { n: 'nuntius' } }, 'Nūntius adfuit.', 'The messenger was present.');
yes(g3, ['Nūntius adfuit', 'Nūntius affuit'], GL); no(g3, ['Nūntius adsufuit', 'Nūntius adest', 'Nūntius āfuit'], GL); yes(g3, ['The messenger has been present'], GE); no(g3, ['The messenger is present', 'The messenger was away'], GE);
g3 = G2({ verb: 'absum', tense: 'impf', subj: { n: 'imperator' }, pp: { type: 'from', n: 'urbs' } }, 'Imperātor ab urbe aberat.', 'The commander used to be away from the city.');
yes(g3, ['The commander was away from the city'], GE); no(g3, ['Imperātor ab urbe abest', 'Imperātor urbem aberat'], GL);
g3 = G2({ verb: 'exstinguo', subj: { n: 'miles' }, obj: { n: 'ignis' }, means: { n: 'aqua' } }, 'Mīles ignem aquā exstinguit.', 'The soldier puts out the fire with water.');
yes(g3, ['Mīles ignem aquā extinguit', 'Aquā mīles ignem exstinguit'], GL); no(g3, ['Mīles ignis aquā extinguit', 'Mīles ignem aquam extinguit'], GL); yes(g3, ['The soldier extinguishes the fire with water'], GE);
g3 = G2({ verb: 'fero', subj: { n: 'servus' }, obj: { n: 'aqua' } }, 'Servus aquam fert.', 'The slave brings water.'); no(g3, ['Servus aquam ferit', 'Servus aquam ferat', 'Servus aqua fert'], GL); yes(g3, ['The slave carries water', 'The slave brings the water'], GE);
g3 = G2({ verb: 'tollo', tense: 'perf', subj: { n: 'puer' }, obj: { n: 'saxum' } }, 'Puer saxum sustulit.', 'The boy lifted the rock.'); no(g3, ['Puer saxum tollit', 'Puer saxum tollēvit', 'Puer saxum tulit'], GL);
g3 = G2({ verb: 'nubo', subj: { n: 'filia' }, io: { n: 'pastor' } }, 'Fīlia pāstōrī nūbit.', 'The daughter marries the shepherd.'); no(g3, ['Fīlia pāstōrem nūbit', 'Pāstor fīliae nūbit'], GL);
g3 = G2({ verb: 'parco', subj: { n: 'rex' }, io: { n: 'hostis' } }, 'Rēx hostī parcit.', 'The king spares the enemy.'); no(g3, ['Rēx hostem parcit'], GL);
g3 = G2({ verb: 'creo', voice: 'pas', tense: 'perf', subj: { n: 'consul' } }, 'Cōnsul creātus est.', 'The consul was elected.'); yes(g3, ['The consul has been elected'], GE); no(g3, ['Cōnsul creāvit', 'Cōnsul creātum est'], GL);
g3 = G2({ verb: 'edo', subj: { n: 'puer' }, obj: { n: 'cibus' } }, 'Puer cibum edit.', 'The boy eats food.'); yes(g3, ['Puer cibum ēst'], GL);
g3 = G2({ verb: 'taceo', subj: { n: 'puella', num: 'pl' } }, 'Puellae tacent.', 'The girls are silent.'); no(g3, ['The girls is silent', 'The girl is silent'], GE);
g3 = G2({ verb: 'traho', subj: { n: 'equus', num: 'pl' }, obj: { n: 'currus' } }, 'Equī currum trahunt.', 'The horses drag the chariot.'); yes(g3, ['The horses pull the chariot'], GE); no(g3, ['Equī currūs trahit'], GL);
g3 = G2({ verb: 'impero', subj: { n: 'imperator' }, io: { n: 'miles', num: 'pl' } }, 'Imperātor mīlitibus imperat.', 'The commander commands the soldiers.'); no(g3, ['Imperātor mīlitēs imperat'], GL);
g3 = G2({ verb: 'invideo', tense: 'perf', subj: { n: 'uxor' }, io: { n: 'regina' } }, 'Uxor rēgīnae invīdit.', 'The wife envied the queen.'); no(g3, ['Uxor rēgīnam invīdit', 'Uxor rēgīnae invidet'], GL);
g3 = G2({ verb: 'regno', tense: 'fut', subj: { n: 'rex' }, pp: { type: 'loc', n: 'regnum' } }, 'Rēx in rēgnō rēgnābit.', 'The king will reign in the kingdom.');
for (const d of ['hic', 'ille']) ok(!E.adjFits(E.adjInfo(d), E.nounInfo('luna')), d + ' allowed on luna (there is one moon)');
ok(!E.adjFits(E.adjInfo('magnus'), E.nounInfo('vox')) && !E.adjFits(E.adjInfo('celer'), E.nounInfo('portus')), 'section III noun got an unfit adjective');
for (const seed of [31, 32, 33]) for (const s of E.generateMany(150, seed)) { const id = `[${s.la}]`;
  ok(!/adsufu|contemnp|ārsus|ārsī |extinx/.test(s.la), id + ' known morph.js bad form leaked');
  if (s.verb === 'pono') ok(!!s.spec.pp && s.spec.voice === 'act', id + ' pōnō without a place phrase or in the passive');
  if (s.verb === 'nubo') ok(s.spec.subj && !s.spec.subj.noun.tags.has('mhuman'), id + ' nūbō with a male subject');
}

// ---------- 4d. section IV (adjectives; two nouns, three verbs; hand-checked) ----------
// vetus is the same in masc. nom. and neut. acc., so "Rēx vīnum vetus amat" is ambiguous and must be refused
ok(!!E.build({ verb: 'amo', subj: { n: 'rex' }, obj: { n: 'vinum', adj: 'vetus' } }).rejected, 'vetus ambiguity (rēx … vetus) not refused');
let g4 = G2({ verb: 'amo', subj: { n: 'civis', num: 'pl' }, obj: { n: 'vinum', adj: 'vetus' } }, 'Cīvēs vīnum vetus amant.', 'The citizens love old wine.'); no(g4, ['Cīvēs vīnum veterem amant', 'Cīvēs vīnum vetum amant', 'Cīvēs vīnum vetera amant'], GL);
g4 = G2({ verb: 'video', subj: { n: 'dux' }, obj: { n: 'navis', num: 'pl', adj: 'vetus' } }, 'Dux nāvēs veterēs videt.', 'The leader sees the old ships.'); no(g4, ['Dux nāvēs vetera videt', 'Dux nāvēs veterās videt'], GL);
g4 = G2({ verb: 'compleo', subj: { n: 'servus' }, obj: { n: 'poculum' }, means: { n: 'vinum' } }, 'Servus pōculum vīnō complet.', 'The slave fills the cup with wine.');
yes(g4, ['Vīnō servus pōculum complet'], GL); no(g4, ['Servus pōculum vīnum complet', 'Servus pōculō vīnō complet', 'Servus pōculum cum vīnō complet'], GL);
g4 = G2({ verb: 'libero', tense: 'perf', subj: { n: 'dominus' }, obj: { n: 'servus', num: 'pl' } }, 'Dominus servōs līberāvit.', 'The master freed the slaves.');
yes(g4, ['The master has freed the slaves', 'The master liberated the slaves'], GE); no(g4, ['Dominus servōs līberat', 'Dominus servī līberāvit'], GL);
g4 = G2({ verb: 'firmo', voice: 'pas', tense: 'perf', subj: { n: 'murus' } }, 'Mūrus firmātus est.', 'The wall was strengthened.'); no(g4, ['Mūrus firmāvit', 'Mūrus firmātum est', 'Mūrus firmātur'], GL);
g4 = G2({ verb: 'sum', subj: { n: 'equus', num: 'pl' }, pred: 'acer' }, 'Equī ācrēs sunt.', 'The horses are keen.'); no(g4, ['Equī ācrī sunt', 'Equī ācer sunt', 'Equī ācria sunt'], GL); no(g4, ['The horses are fierce'], GE);
g4 = G2({ verb: 'laudo', subj: { n: 'civis', num: 'pl' }, obj: { n: 'poeta', adj: 'clarus' } }, 'Cīvēs poētam clārum laudant.', 'The citizens praise the famous poet.');
no(g4, ['Cīvēs poētam clāram laudant', 'Cīvēs poētam clārī laudant'], GL); no(g4, ['The citizens praise the clear poet'], GE);
g4 = G2({ verb: 'audio', subj: { n: 'puella' }, obj: { n: 'vox', adj: 'clarus' } }, 'Puella vōcem clāram audit.', 'The girl hears the clear voice.'); no(g4, ['The girl hears the famous voice'], GE); no(g4, ['Puella vōcem clārum audit'], GL);
g4 = G2({ verb: 'amo', subj: { n: 'civis', num: 'pl' }, obj: { n: 'libertas' } }, 'Cīvēs lībertātem amant.', 'The citizens love freedom.'); yes(g4, ['The citizens love liberty'], GE); no(g4, ['Cīvēs lībertās amant'], GL);
g4 = G2({ verb: 'cupio', subj: { n: 'rex' }, obj: { n: 'divitiae', num: 'pl' } }, 'Rēx dīvitiās cupit.', 'The king desires the riches.'); yes(g4, ['The king desires riches'], GE); no(g4, ['Rēx dīvitiam cupit', 'Rēx dīvitiae cupit'], GL);
g4 = G2({ verb: 'doceo', subj: { n: 'magister' }, obj: { n: 'puer', num: 'pl' } }, 'Magister puerōs docet.', 'The teacher teaches the boys.'); no(g4, ['Magistrum puerōs docet', 'Magister puerī docet'], GL);
g4 = G2({ verb: 'do', subj: { n: 'rex' }, obj: { n: 'donum' }, io: { n: 'sacerdos' } }, 'Rēx sacerdōtī dōnum dat.', 'The king gives the gift to the priest.'); yes(g4, ['The king gives the priestess the gift'], GE); no(g4, ['Rēx sacerdōtem dōnum dat'], GL);
g4 = G2({ verb: 'porto', subj: { n: 'miles' }, obj: { n: 'gladius', adj: 'nudus' } }, 'Mīles gladium nūdum portat.', 'The soldier carries the drawn sword.'); yes(g4, ['The soldier carries the bare sword'], GE);
g4 = G2({ verb: 'video', subj: { n: 'agricola' }, obj: { n: 'ager', adj: 'pinguis' } }, 'Agricola agrum pinguem videt.', 'The farmer sees the fertile field.'); no(g4, ['The farmer sees the fat field'], GE);
g4 = G2({ verb: 'video', subj: { n: 'servus' }, obj: { n: 'regina', adj: 'crudelis' } }, 'Servus rēgīnam crūdēlem videt.', 'The slave sees the cruel queen.'); no(g4, ['Servus rēgīnam crūdēlam videt', 'Servus rēgīnam crūdēlis videt'], GL);
g4 = G2({ verb: 'sum', subj: { n: 'pomum', num: 'pl' }, pred: 'maturus' }, 'Pōma mātūra sunt.', 'The fruits are ripe.'); no(g4, ['Pōma mātūrī sunt', 'Pōma mātūrae sunt', 'Pōma mātūra est'], GL);
g4 = G2({ verb: 'habito', subj: { n: 'rex' }, pp: { type: 'loc', n: 'villa', adj: 'amplus' } }, 'Rēx in vīllā amplā habitat.', 'The king lives in the spacious farmhouse.'); no(g4, ['Rēx in vīllam amplam habitat'], GL);
g4 = G2({ verb: 'traho', subj: { n: 'bos', num: 'pl', adj: 'tardus' }, obj: { n: 'currus' } }, 'Bovēs tardī currum trahunt.', 'The slow oxen drag the chariot.'); no(g4, ['Bovēs tarda currum trahunt', 'Bovēs tardī currum trahit'], GL);
ok(/redundant/.test(E.build({ verb: 'compleo', subj: { n: 'servus' }, obj: { n: 'poculum', adj: 'plenus' }, means: { n: 'aqua' } }).rejected || ''), '"fill the full cup" not refused');
ok(E.build({ verb: 'compleo', subj: { n: 'victor' }, obj: { n: 'navis' }, means: { n: 'praeda' } }).en === 'The victor fills the ship with booty.', 'praeda is uncountable (with booty)');
// amplus: Diederich says the masc. nom. sg. does not occur, so it must never fit a masculine-only noun
for (const k of Object.keys(E.LEX.nouns)) { const n = E.nounInfo(k); if (E.adjFits(E.adjInfo('amplus'), n)) ok(!n.genders.includes('m'), 'amplus fits masculine noun ' + k); }
ok(!E.adjFits(E.adjInfo('ferus'), E.nounInfo('lupus')) && !E.adjFits(E.adjInfo('crudelis'), E.nounInfo('rex')) && !E.adjFits(E.adjInfo('vetus'), E.nounInfo('liber')), 'section IV adjective fits a noun another adjective owns');
for (const seed of [41, 42, 43]) for (const s of E.generateMany(150, seed)) { const id = `[${s.la}]`;
  if (s.verb === 'compleo') ok(/pōcul|nāv/i.test(s.la), id + ' compleō without a cup or a ship');
  ok(!/\bamplus\b/.test(s.la), id + ' amplus (masc. nom. sg. does not occur)');
}

// ---------- 5. lexicon hygiene ----------
const vg = Object.values(E.LEX.verbs).map(v => v.en[0]); ok(new Set(vg).size === vg.length, 'verb glosses not unique: ' + vg.filter((x, i) => vg.indexOf(x) !== i));
// adjectives: on every noun, an adjective's first English gloss is not a gloss of another adjective that fits the same noun (English→Latin has one answer)
{ const As = Object.keys(E.LEX.adjs).filter(k => !E.LEX.adjs[k].kind).map(E.adjInfo);
  for (const nk of Object.keys(E.LEX.nouns)) { const n = E.nounInfo(nk); const fit = As.filter(a => E.adjFits(a, n));
    for (const a of fit) for (const b of fit) if (a !== b) ok(!E.adjEnglish(b, n).includes(E.adjEnglish(a, n)[0]), `${nk}: ${a.key} "${E.adjEnglish(a, n)[0]}" is also a gloss of ${b.key}`); } }
const ng = Object.values(E.LEX.nouns).map(n => n.en[0]); ok(new Set(ng).size === ng.length, 'noun glosses not unique');
for (const k of Object.keys(E.LEX.nouns)) { const n = E.nounInfo(k); ok(!!n.form('nom', n.nums[0]), 'noun has no table: ' + k); }

// ---------- adverbs (Diederich section V, AI-proposed + hand-reviewed) ----------
{
  const A = E.LEX.advs, B = sp => E.build(sp);
  ok(Object.keys(A).length === 25, 'adverb count (23 from section V + anteā, posteā from section VIII) ' + Object.keys(A).length);
  ok(E.TEMPLATES.includes('ADV'), 'ADV template missing');
  // goldens: [spec, canonical Latin, canonical English, other accepted English, rejected English, other accepted Latin, rejected Latin]
  const AG = [
    [{ verb: 'curro', subj: { n: 'puer' }, adv: 'non' }, 'Puer nōn currit.', 'The boy does not run.', ["The boy doesn't run.", 'The boy is not running.', "The boy isn't running."], ['The boy not runs.', 'The boy does not runs.', 'The boy runs not.'], [], ['Nōn puer currit.', 'Puer currit nōn.']],
    [{ verb: 'curro', subj: { n: 'puer' }, adv: 'non', tense: 'perf' }, 'Puer nōn cucurrit.', 'The boy did not run.', ["The boy didn't run.", 'The boy has not run.', "The boy hasn't run."], ['The boy did not ran.', 'The boy not ran.'], [], []],
    [{ verb: 'curro', subj: { n: 'puer', num: 'pl' }, adv: 'non', tense: 'fut' }, 'Puerī nōn current.', 'The boys will not run.', ["The boys won't run."], ['The boys do not run.'], [], []],
    [{ verb: 'curro', subj: { n: 'puer' }, adv: 'non', tense: 'impf' }, 'Puer nōn currēbat.', 'The boy was not running.', ["The boy wasn't running.", 'The boy did not use to run.'], ['The boy used to not run not.'], [], []],
    [{ verb: 'sum', subj: { n: 'via' }, pred: 'longus', adv: 'non' }, 'Via longa nōn est.', 'The road is not long.', ["The road isn't long."], ['The road does not is long.', 'The road does not be long.'], ['Via nōn longa est.', 'Via nōn est longa.'], ['Via longa est nōn.']],
    [{ verb: 'video', subj: { n: 'puer' }, voice: 'pas', tense: 'perf', adv: 'non' }, 'Puer nōn vīsus est.', 'The boy was not seen.', ['The boy has not been seen.', "The boy wasn't seen."], ['The boy did not seen.', 'The boy was seen not.'], ['Puer vīsus nōn est.'], ['Puer vīsus est nōn.']],
    [{ verb: 'curro', subj: { n: 'puer' }, adv: 'semper', tense: 'perf' }, 'Puer semper cucurrit.', 'The boy always ran.', ['The boy has always run.'], ['The boy ran always always.', 'The boy kept always running.'], ['Semper puer cucurrit.', 'Puer cucurrit semper.'], []],
    [{ verb: 'sum', subj: { n: 'via' }, pred: 'longus', adv: 'semper' }, 'Via semper longa est.', 'The road is always long.', [], ['The road always is long.'], ['Via longa semper est.', 'Via longa est semper.'], []],
    [{ verb: 'venio', subj: { n: 'puer' }, adv: 'nunc' }, 'Puer nunc venit.', 'The boy comes now.', ['Now the boy comes.', 'The boy is now coming.', 'The boy is coming right now.'], ['The boy came now.', 'The boy has come now.'], [], []],
    [{ verb: 'curro', subj: { n: 'puer' }, adv: 'cras', tense: 'fut' }, 'Puer crās curret.', 'The boy will run tomorrow.', ['Tomorrow the boy will run.'], ['The boy will tomorrow run.'], [], []],
    [{ verb: 'curro', subj: { n: 'puer' }, adv: 'tum', tense: 'impf' }, 'Puer tum currēbat.', 'Then the boy was running.', ['The boy was running then.', 'The boy was then running.', 'At that time the boy was running.'], [], [], []],
    [{ verb: 'cado', subj: { n: 'puer' }, adv: 'subito', tense: 'perf' }, 'Puer subitō cecidit.', 'The boy suddenly fell.', ['Suddenly the boy fell.', 'The boy fell suddenly.', 'All of a sudden the boy fell.'], [], ['Puer repente cecidit.', 'Repente puer cecidit.'], ['Puer subitō repente cecidit.']],
    [{ verb: 'cado', subj: { n: 'puer' }, adv: 'iam', tense: 'perf' }, 'Puer iam cecidit.', 'The boy has already fallen.', ['The boy already fell.', 'The boy has fallen already.'], [], [], []],
    [{ verb: 'laboro', subj: { n: 'agricola' }, adv: 'saepe', tense: 'impf' }, 'Agricola saepe labōrābat.', 'The farmer often worked.', ['The farmer often used to work.', 'The farmer was often working.', 'Often the farmer worked.', 'The farmer worked often.'], [], [], []],
    [{ verb: 'dormio', subj: { n: 'puer' }, adv: 'foris' }, 'Puer forīs dormit.', 'The boy sleeps outside.', ['The boy is sleeping outdoors.', 'Outside the boy sleeps.'], [], [], []],
    [{ verb: 'sto', subj: { n: 'puer' }, adv: 'ibi' }, 'Puer ibi stat.', 'The boy stands there.', ['There the boy stands.'], [], ['Puer ibī stat.', 'Puer illīc stat.'], []],
  ];
  for (const [sp, la, en, okEn, badEn, okLa, badLa] of AG) {
    const s = B(sp); const id = `[adv golden ${la}]`;
    if (s.rejected) { ok(false, id + ' rejected ' + s.rejected); continue; }
    ok(s.la === la, `${id} Latin: got ${s.la}`); ok(s.en === en, `${id} English: got ${s.en}`);
    ok(E.gradeLatin(s, la, { strict: true }), id + ' canonical Latin rejected');
    for (const x of [en].concat(okEn)) ok(E.gradeEnglish(s, x), `${id} English rejected: ${x}`);
    for (const x of badEn) ok(!E.gradeEnglish(s, x), `${id} English wrongly accepted: ${x}`);
    for (const x of okLa) ok(E.gradeLatin(s, x), `${id} Latin rejected: ${x}`);
    for (const x of badLa) ok(!E.gradeLatin(s, x), `${id} Latin wrongly accepted: ${x}`);
  }
  // restrictions
  const fit = (k, x) => E.advFits(A[k], x), V = k => E.verbInfo(k), F = (k, i) => ({ k, f: E.verbInfo(k).frames[i || 0] });
  ok(!fit('nunc', { tense: 'perf', voice: 'act', v: V('curro'), fr: F('curro') }), 'nunc with a perfect');
  ok(!fit('cras', { tense: 'pres', voice: 'act', v: V('curro'), fr: F('curro') }), 'crās with a present');
  ok(!fit('subito', { tense: 'perf', voice: 'act', v: V('dormio'), fr: F('dormio') }), 'subitō with dormiō');
  ok(!fit('diu', { tense: 'perf', voice: 'act', v: V('cado'), fr: F('cado') }), 'diū with cadō');
  ok(fit('diu', { tense: 'perf', voice: 'act', v: V('dormio'), fr: F('dormio') }), 'diū with dormiō refused');
  ok(!fit('ibi', { tense: 'pres', voice: 'act', v: V('curro'), fr: F('curro') }), 'ibi with a verb of motion');
  ok(!fit('ibi', { tense: 'pres', voice: 'act', v: V('dormio'), fr: F('dormio'), pp: { type: 'loc' } }), 'ibi next to another place phrase');
  ok(!fit('foris', { tense: 'pres', voice: 'act', v: V('regno'), fr: F('regno') }), 'forīs with rēgnō');
  ok(!fit('iam', { tense: 'perf', voice: 'act', v: V('amo'), fr: F('amo') }), 'iam with a stative verb');
  ok(!fit('frustra', { tense: 'pres', voice: 'act', v: V('amo'), fr: F('amo') }), 'frūstrā with amō');
  ok(!fit('numquam', { tense: 'impf', voice: 'act', v: V('curro'), fr: F('curro') }), 'numquam with an imperfect');
  // properties over many ADV sentences
  const seen = {}; let nAdv = 0;
  for (const seed of [21, 22, 23, 24, 25, 26]) { const rng = E.mulberry32(seed);
    for (let i = 0; i < 400; i++) { const s = E.generateOne(rng, 'ADV'); if (!s || !s.spec) continue; nAdv++; const a = A[s.spec.adv], id = `[${s.la}]`; seen[s.spec.adv] = 1;
      ok(a.tenses.includes(s.tense), id + ' adverb tense not allowed');
      ok(E.gradeEnglish(s, s.en), id + ' canonical English rejected: ' + s.en);
      ok(E.gradeLatin(s, s.la, { strict: true }), id + ' canonical Latin rejected');
      ok(s.laTokens.filter(t => t === a.la).length === 1, id + ' adverb missing or doubled');
      ok(!/\bkept (always|never|often|not)\b|\bnot not\b|\bdo(es)? not (is|are|was|were|will|has|have)\b/.test(s.en), id + ' bad English: ' + s.en);
      ok(s.spec.nocte !== true, id + ' nocte together with an adverb');
      { const vf = E.verbInfo(s.verb).en, m = s.en.match(/\bdid not (\w+)/); if (m && Array.isArray(vf) && vf[2] !== vf[0]) ok(m[1] !== vf[2], id + ' past form after "did not": ' + s.en); }
      if (a.place) ok(!s.spec.pp && s.voice === 'act', id + ' place adverb with a place phrase or passive');
      if (a.neg) { const i = s.laTokens.indexOf('nōn'); ok(i >= 0 && i < s.laTokens.length - 1, id + ' nōn at the end'); }
      const chips = E.chipsEnLa(s, E.mulberry32(i), 4); ok(chips.distractors.length > 0 && !chips.distractors.includes(a.la) && !(a.alt || []).some(x => chips.distractors.includes(x.la)), id + ' bad chips ' + chips.distractors);
    } }
  ok(nAdv > 1500, 'too few ADV sentences ' + nAdv);
  for (const k of Object.keys(A)) ok(seen[k], 'adverb never generated: ' + k);
}
// ---------- sections VII (conjunctions) and VIII (prepositions, AI-proposed + hand-reviewed) ----------
{
  const B = sp => E.build(sp);
  // [spec, canonical Latin, canonical English, accepted English, rejected English, accepted Latin, rejected Latin]
  const G = [
    // section VII: coordination
    [{ verb: 'curro', subj: { n: 'puer' }, coord: { conj: 'et', n: 'puella' } }, 'Puer et puella currunt.', 'The boy and the girl run.', ['The girl and the boy run.', 'Boy and girl are running.'], ['The boy and the girl runs.', 'The boy or the girl runs.', 'The boy runs.'], ['Puer puellaque currunt.', 'Puella et puer currunt.', 'Puer atque puella currunt.', 'Puer ac puella currunt.', 'Currunt puer et puella.'], ['Puer et puella currit.', 'Puer aut puella currunt.', 'Puer et puellam currunt.', 'Puerque puella currunt.']],
    [{ verb: 'curro', subj: { n: 'puer' }, coord: { conj: 'que', n: 'puella' } }, 'Puer puellaque currunt.', 'The boy and the girl run.', [], [], ['Puer et puella currunt.'], ['Puer puellaque currit.']],
    [{ verb: 'curro', subj: { n: 'puer' }, coord: { conj: 'atque', form: 'ac', n: 'puella' }, tense: 'perf' }, 'Puer ac puella cucurrērunt.', 'The boy and the girl ran.', ['The boy and the girl have run.'], ['The boy and the girl run.'], ['Puer atque puella cucurrērunt.'], ['Puer ac puella cucurrit.']],
    [{ verb: 'curro', subj: { n: 'puer' }, coord: { conj: 'aut', form: 'autaut', n: 'puella' } }, 'Aut puer aut puella currit.', 'Either the boy or the girl runs.', ['The boy or the girl runs.', 'Either the girl or the boy is running.'], ['Either the boy or the girl run.', 'The boy and the girl run.', 'Neither the boy nor the girl runs.'], ['Puer aut puella currit.', 'Puer puellave currit.', 'Vel puer vel puella currit.'], ['Aut puer aut puella currunt.', 'Puer et puella currit.']],
    [{ verb: 'curro', subj: { n: 'puer' }, coord: { conj: 'vel', form: 've', n: 'puella' } }, 'Puer puellave currit.', 'The boy or the girl runs.', ['Either the boy or the girl runs.'], ['The boy and the girl run.'], ['Puer vel puella currit.'], ['Puer puellave currunt.']],
    [{ verb: 'curro', subj: { n: 'puer' }, coord: { conj: 'nec', form: 'necnec', n: 'puella' }, tense: 'fut' }, 'Nec puer nec puella curret.', 'Neither the boy nor the girl will run.', ['Neither the girl nor the boy will run.'], ['The boy and the girl will run.', 'Either the boy or the girl will run.', 'Neither the boy nor the girl will runs.'], ['Neque puer neque puella curret.'], ['Nec puer nec puella current.', 'Nec puer et puella curret.', 'Puer nec puella curret.']],
    [{ verb: 'video', subj: { n: 'agricola' }, obj: { n: 'equus' }, coord: { conj: 'et', role: 'O', n: 'canis', num: 'pl' } }, 'Agricola equum et canēs videt.', 'The farmer sees the horse and the dogs.', ['The farmer sees the dogs and the horse.'], ['The farmer sees the horse and the dog.', 'The horse and the dogs see the farmer.'], ['Agricola equum canēsque videt.', 'Equum et canēs agricola videt.'], ['Agricola equus et canēs videt.', 'Agricola equum et canēs vident.']],
    // section VIII: prepositional phrases (Allen & Greenough §220–221)
    [{ verb: 'sedeo', subj: { n: 'puer' }, pp: { type: 'near', n: 'flumen' } }, 'Puer prope flūmen sedet.', 'The boy sits near the river.', ['The boy is sitting close to the river.', 'Near the river the boy sits.'], ['The boy sits in the river.', 'The boy sits near the rivers.'], ['Prope flūmen puer sedet.'], ['Puer prope flūmine sedet.', 'Puer flūmen prope sedet.']],
    [{ verb: 'dormio', subj: { n: 'puella' }, pp: { type: 'sub', n: 'arbor' }, tense: 'perf' }, 'Puella sub arbore dormīvit.', 'The girl slept under the tree.', ['The girl has slept beneath the tree.', 'The girl slept underneath the tree.'], ['The girl slept in the tree.'], [], ['Puella sub arborem dormīvit.']],
    [{ verb: 'cado', subj: { n: 'puer' }, pp: { type: 'de', n: 'murus' }, tense: 'perf' }, 'Puer dē mūrō cecidit.', 'The boy fell from the wall.', ['The boy fell off the wall.', 'The boy has fallen down from the wall.'], ['The boy fell onto the wall.', 'The boy fell from the walls.'], [], ['Puer dē mūrum cecidit.', 'Puer ad mūrum cecidit.']],
    [{ verb: 'curro', subj: { n: 'puer', num: 'pl' }, pp: { type: 'de', n: 'mons' }, tense: 'perf' }, 'Puerī dē monte cucurrērunt.', 'The boys ran down from the mountain.', ['The boys have run down from the mountain.'], ['The boys ran off the mountain.'], [], []],
    [{ verb: 'sto', subj: { n: 'puer' }, pp: { type: 'inter', n: 'arbor', num: 'pl' } }, 'Puer inter arborēs stat.', 'The boy stands among the trees.', ['The boy is standing between the trees.'], ['The boy stands among the tree.'], [], ['Puer inter arboribus stat.']],
    [{ verb: 'curro', subj: { n: 'puer' }, pp: { type: 'circum', n: 'urbs' } }, 'Puer circum urbem currit.', 'The boy runs around the city.', ['Around the city the boy runs.'], ['The boy runs through the city.'], ['Puer circā urbem currit.'], ['Puer circum urbe currit.']],
    [{ verb: 'volo', subj: { n: 'avis' }, pp: { type: 'super', n: 'silva' } }, 'Avis super silvam volat.', 'The bird flies over the forest.', ['The bird is flying above the woods.'], ['The bird flies into the forest.'], ['Avis suprā silvam volat.'], ['Avis super silvā volat.']],
    [{ verb: 'pugno', subj: { n: 'miles', num: 'pl' }, pp: { type: 'pro', n: 'patria' }, tense: 'impf' }, 'Mīlitēs prō patriā pugnābant.', 'The soldiers were fighting for the homeland.', ['The soldiers used to fight on behalf of the homeland.'], ['The soldiers were fighting against the homeland.'], [], ['Mīlitēs prō patriam pugnābant.']],
    [{ verb: 'pugno', subj: { n: 'miles' }, pp: { type: 'contra', n: 'hostis', num: 'pl' } }, 'Mīles contrā hostēs pugnat.', 'The soldier fights against the enemies.', [], ['The soldier fights for the enemies.'], [], ['Mīles contrā hostibus pūgnat.']],
    [{ verb: 'fleo', subj: { n: 'puella' }, pp: { type: 'propter', n: 'bellum' }, tense: 'perf' }, 'Puella propter bellum flēvit.', 'The girl wept because of the war.', ['The girl wept on account of the war.'], ['The girl wept for the war.'], [], ['Puella propter bellō flēvit.']],
    [{ verb: 'fluo', subj: { n: 'flumen' }, pp: { type: 'praeter', n: 'urbs' } }, 'Flūmen praeter urbem fluit.', 'The river flows past the city.', ['The river flows by the city.'], ['The river flows into the city.'], [], []],
    [{ verb: 'sto', subj: { n: 'puer' }, pp: { type: 'ante', n: 'templum' } }, 'Puer ante templum stat.', 'The boy stands in front of the temple.', ['The boy stands before the temple.'], ['The boy stands behind the temple.'], [], ['Puer post templum stat.']],
    [{ verb: 'lateo', subj: { n: 'puer' }, pp: { type: 'post', n: 'murus' } }, 'Puer post mūrum latet.', 'The boy hides behind the wall.', [], ['The boy hides in front of the wall.'], [], ['Puer ante mūrum latet.']],
    [{ verb: 'maneo', subj: { n: 'puer' }, pp: { type: 'extra', n: 'urbs' }, tense: 'fut' }, 'Puer extrā urbem manēbit.', 'The boy will stay outside the city.', ['The boy will remain outside of the city.'], ['The boy will stay in the city.'], [], ['Puer in urbe manēbit.']],
    [{ verb: 'supero', subj: { n: 'rex' }, obj: { n: 'hostis', num: 'pl' }, tense: 'perf' }, 'Rēx hostēs superāvit.', 'The king overcame the enemies.', ['The king defeated the enemies.', 'The king has conquered the enemies.'], ['The enemies overcame the king.'], [], ['Rēgem hostēs superāvit.']],
    [{ verb: 'video', subj: { n: 'puer' }, obj: { n: 'urbs', adj: 'proximus' } }, 'Puer urbem proximam videt.', 'The boy sees the nearest city.', ['The boy sees the next city.', 'The boy sees the closest city.'], [], ['Puer proximam urbem videt.'], ['Puer urbem proximum videt.']],
    [{ verb: 'sum', subj: { n: 'rex' }, pred: 'superbus' }, 'Rēx superbus est.', 'The king is proud.', ['The king is haughty.'], [], [], ['Rēx superba est.']],
    [{ verb: 'curro', subj: { n: 'puer' }, adv: 'antea', tense: 'perf' }, 'Puer anteā cucurrit.', 'The boy previously ran.', ['The boy had run earlier.'.replace('had run earlier', 'ran earlier'), 'Previously the boy ran.', 'The boy has previously run.'], ['The boy will run earlier.'], ['Anteā puer cucurrit.'], []],
    [{ verb: 'venio', subj: { n: 'puer' }, adv: 'postea', tense: 'fut' }, 'Puer posteā veniet.', 'Afterwards the boy will come.', ['The boy will come later.', 'Afterward the boy will come.', 'The boy will later come.'], ['The boy came later.'], [], []],
  ];
  for (const [sp, la, en, okEn, badEn, okLa, badLa] of G) {
    const s = B(sp); const id = `[S7/S8 golden ${la}]`;
    if (s.rejected) { ok(false, id + ' rejected ' + s.rejected); continue; }
    ok(s.la === la, `${id} Latin: got ${s.la}`); ok(s.en === en, `${id} English: got ${s.en}`);
    ok(E.gradeLatin(s, la, { strict: true }), id + ' canonical Latin rejected');
    for (const x of [en].concat(okEn)) ok(E.gradeEnglish(s, x), `${id} English rejected: ${x}`);
    for (const x of badEn) ok(!E.gradeEnglish(s, x), `${id} English wrongly accepted: ${x}`);
    for (const x of okLa) ok(E.gradeLatin(s, x), `${id} Latin rejected: ${x}`);
    for (const x of badLa) ok(!E.gradeLatin(s, x), `${id} Latin wrongly accepted: ${x}`);
  }
  // restrictions
  const T = E.PP_TYPES, n = E.nounInfo;
  ok(!T.sub.fits(n('flumen'), 'sedeo'), 'sub flūmine allowed'); ok(!T.near.fits(n('urbs'), 'curro'), 'prope with a verb of motion');
  ok(!T.de.fits(n('mons'), 'cado') && T.de.fits(n('murus'), 'cado'), 'dē nouns are per verb');
  ok(!T.circum.subjOK(n('sagitta'), 'volo') && T.circum.subjOK(n('avis'), 'volo'), 'circum with a flying arrow');
  ok(!T.pro.subjOK(n('canis'), 'pugno'), 'a dog fighting for the homeland');
  ok(T.inter.num === 'pl' && T.pro.num === 'sg' && T.propter.num === 'sg', 'number restrictions of inter / prō / propter');
  ok(!E.LEX.preps.near || E.LEX.preps.near.id === 1480, 'prope id');
  for (const k of ['proximus', 'propinquus', 'ultimus']) ok(E.LEX.adjs[k].attr, k + ' not attributive-only');
  ok(E.LEX.verbs.supero.id === 1496 && E.LEX.adjs.superbus.id === 1497, 'section VIII ids');
  ok(E.TEMPLATES.length === 15 && E.TEMPLATES.includes('COORD'), 'COORD template missing');
  ok(Object.keys(E.LEX.conjs).length === 6, 'conjunction count ' + Object.keys(E.LEX.conjs).length);
  ok(Object.keys(E.LEX.ppTypes).length === 13, 'section VIII PP type count ' + Object.keys(E.LEX.ppTypes).length);
  // properties: COORD sentences, section VIII PPs, and no attributive-only adjective after sum
  const seenConj = {}, seenForm = {}, seenPP = {}; let nC = 0;
  for (const seed of [31, 32, 33, 34, 35, 36]) { const rng = E.mulberry32(seed);
    for (let i = 0; i < 300; i++) { const s = E.generateOne(rng, 'COORD'); if (!s || !s.spec) continue; nC++; const co = s.spec.coord, id = `[${s.la}]`;
      seenConj[co.conj] = 1; seenForm[co.form] = 1;
      ok(E.gradeEnglish(s, s.en) && E.gradeLatin(s, s.la, { strict: true }), id + ' canonical rejected');
      const vt = E.verbInfo(s.verb).tbl[`ind.act.${s.tense}.${co.role === 'S' ? (co.kind === 'and' ? '3p' : '3s') : s.person}`];
      ok(has(vt, s.laTokens[s.laTokens.length - 1]), id + ' verb number after ' + co.kind);
      const wrongNum = s.la.replace(/ (\S+)\.$/, (m, w) => ' ' + (E.verbInfo(s.verb).tbl[`ind.act.${s.tense}.${s.person === '3s' ? '3p' : '3s'}`] || [w])[0] + '.');
      if (co.role === 'S') ok(!E.gradeLatin(s, wrongNum), id + ' wrong verb number accepted: ' + wrongNum);
      const ce = E.chipsEnLa(s, E.mulberry32(i)); for (const d of ce.distractors) ok(!['ac', 'que'].includes(d), id + ' odd distractor ' + d);
      const cl = E.chipsLaEn(s, E.mulberry32(i)); ok(E.gradeEnglish(s, cl.answer.join(' ')), id + ' La→En chips answer rejected');
    } }
  ok(nC > 1200, 'too few COORD sentences ' + nC);
  for (const k of Object.keys(E.LEX.conjs)) ok(seenConj[k], 'conjunction never generated: ' + k);
  for (const f of ['et', 'que', 'atque', 'ac', 'aut', 'autaut', 'vel', 'velvel', 'necnec', 'nequeneque']) ok(seenForm[f], 'conjunction form never generated: ' + f);
  for (const seed of [41, 42, 43, 44, 45, 46, 47, 48]) { const rng = E.mulberry32(seed);
    for (let i = 0; i < 400; i++) { const tpl = ['SV_PP', 'SV', 'PP_ADJ', 'COPULA'][i % 4]; const s = E.generateOne(rng, tpl); if (!s || !s.spec) continue; const id = `[${s.la}]`;
      if (s.spec.pred) ok(!E.LEX.adjs[s.spec.pred].attr, id + ' attributive-only adjective as predicate');
      if (s.spec.pp && T[s.spec.pp.type].fromLex) { seenPP[s.spec.pp.type] = 1; ok(E.gradeEnglish(s, s.en) && E.gradeLatin(s, s.la, { strict: true }), id + ' canonical rejected'); }
    } }
  for (const k of Object.keys(E.LEX.ppTypes)) ok(seenPP[k], 'section VIII PP type never generated: ' + k);
}
// ---------- app port: no per-word overrides, standard forms on screen, ex(s)-, word pool, Identify answers ----------
{
  const W = require('../data/words.json');
  const forms = tbl => Object.values(tbl || {}).flat().map(normM).sort().join(',');
  ok(Object.keys(E.OVERRIDES).length === 0, 'per-word form overrides present');
  // every engine table holds exactly the forms of the app's morph.js, in the same order (the standard form stays first)
  for (const k of Object.keys(E.LEX.nouns)) { const r = Morph.analyze(W[E.LEX.nouns[k].id]); const n = N(k);
    for (const c of Object.keys(r.tbl)) ok(r.tbl[c].join() === n.tbl[c].join(), `noun ${k} ${c}: ${n.tbl[c]} vs morph ${r.tbl[c]}`);
    ok(forms(r.tbl) === forms(n.tbl), 'noun table differs from morph.js: ' + k); }
  for (const k of Object.keys(E.LEX.verbs)) ok(forms(Morph.analyze(W[E.LEX.verbs[k].id]).tbl) === forms(V(k).tbl), 'verb table differs from morph.js: ' + k);
  for (const k of Object.keys(E.LEX.adjs)) ok(forms(Morph.analyze(W[E.LEX.adjs[k].id]).tbl) === forms(A(k).tbl), 'adjective table differs from morph.js: ' + k);
  ok(N('filius').form('dat', 'pl')[0] === 'fīliīs' && N('filia').form('abl', 'pl').join() === 'fīliīs,fīliābus', 'fīlius / fīlia dat./abl. pl.');
  // the sentence shows fīliīs; fīliābus is still accepted, and graded as an alternate
  const gf = E.build({ verb: 'do', tense: 'pres', subj: { n: 'mater', num: 'sg' }, obj: { n: 'donum', num: 'sg' }, io: { n: 'filia', num: 'pl' } });
  ok(/fīliīs/.test(gf.la) && !/fīliābus/.test(gf.la), 'standard fīliīs shown: ' + gf.la);
  ok(E.gradeLatin(gf, gf.la.replace('fīliīs', 'fīliābus'), { strict: true }), 'fīliābus (to the daughters) rejected');
  const rep = E.gradeLatinReport(gf, gf.la.replace('fīliīs', 'fīliābus'), { strict: true });
  ok(rep.ok && rep.alternate && rep.standard === 'fīliīs', 'fīliābus flagged as an alternate: ' + JSON.stringify(rep));
  const rep0 = E.gradeLatinReport(gf, gf.la, { strict: true });
  ok(rep0.ok && !rep0.alternate, 'the shown sentence is not an alternate');
  // ex(s)tinguō: only exst- is shown; ext- is accepted through Morph.variants (the app's check() rule)
  const gx = E.build({ verb: 'exstinguo', tense: 'perf', subj: { n: 'miles', num: 'sg' }, obj: { n: 'ignis', num: 'sg' } });
  ok(gx.la === 'Mīles ignem exstīnxit.', 'exstinguo perfect: ' + gx.la);
  ok(E.gradeLatin(gx, 'Mīles ignem extīnxit') && E.gradeLatin(gx, 'miles ignem extinxit') && !E.gradeLatin(gx, 'Mīles ignem extīnxērunt'), 'ext- spelling grading');
  ok(Morph.check('extīnxit', ['exstīnxit']) && Morph.variants('exstīnxit').includes('extīnxit'), 'Morph.variants export');

  // is / sē grading: syncretic English, and alternates only of the cell that was actually used
  const seF = E.build({ verb: 'amo', subj: { n: 'puella' }, obj: { n: 'pron_se' } });
  ok(seF.la === 'Puella sē amat.' && seF.en === 'The girl loves herself.', 'sē feminine: ' + seF.la + ' / ' + seF.en);
  ok(E.gradeEnglish(seF, 'The girl loves herself.') && !E.gradeEnglish(seF, 'The girl loves himself.') && !E.gradeEnglish(seF, 'The girl loves itself.'), 'herself does not accept himself or itself');
  const seM = E.build({ verb: 'amo', subj: { n: 'puer' }, obj: { n: 'pron_se' } });
  ok(seM.en === 'The boy loves himself.' && !E.gradeEnglish(seM, 'The boy loves herself.'), 'himself stays masculine');
  const seN = E.build({ verb: 'amo', subj: { n: 'templum' }, obj: { n: 'pron_se' } });
  ok(seN.en === 'The temple loves itself.' && ['himself', 'herself', 'itself'].every(a => E.gradeEnglish(seN, 'The temple loves ' + a + '.')), 'neuter sē accepts every singular English form');
  const seP = E.build({ verb: 'amo', subj: { n: 'puella', num: 'pl' }, obj: { n: 'pron_se', num: 'pl' } });
  ok(seP.en === 'The girls love themselves.' && !E.gradeEnglish(seP, 'The girls love itself.') && !E.gradeEnglish(seP, 'The girls love herself.'), 'plural sē is themselves');
  const seRep = E.gradeLatinReport(seF, seF.la.replace('sē', 'sēsē'), { strict: true });
  ok(seRep.ok && seRep.alternate && seRep.standard === 'sē', 'sēsē flagged, standard sē');
  const eum = E.build({ verb: 'amo', subj: { n: 'puer' }, obj: { n: 'pron_is', g: 'm' } });
  ok(/eum/.test(eum.la) && E.gradeEnglish(eum, 'The boy loves him.') && !E.gradeEnglish(eum, 'The boy loves her.') && !E.gradeEnglish(eum, 'The boy loves himself.'), 'eum is him, not her or himself');
  const ei = E.build({ verb: 'do', subj: { n: 'rex' }, obj: { n: 'donum' }, io: { n: 'pron_is', g: 'f', num: 'sg' } });
  ok(/eī/.test(ei.la) && !/ēī/.test(ei.la), 'dative singular shows eī: ' + ei.la);
  ok(['him', 'her', 'it'].every(w => E.gradeEnglish(ei, ei.en.replace(/\b(him|her|it)\b/i, w))), 'eī accepts to him, to her, and to it');
  const eiAlt = E.gradeLatinReport(ei, ei.la.replace('eī', 'ēī'), { strict: true });
  ok(eiAlt.ok && eiAlt.alternate && eiAlt.standard === 'eī', 'ēī flagged, standard eī');
  ok(!E.gradeLatin(ei, ei.la.replace('eī', 'iī'), { strict: true }) && !E.gradeLatin(ei, ei.la.replace('eī', 'ī'), { strict: true }), 'iī and ī are not dative');
  const eis = E.build({ verb: 'do', subj: { n: 'rex' }, obj: { n: 'donum' }, io: { n: 'pron_is', g: 'm', num: 'pl' } });
  ok(eis.laTokens.includes('eīs') && !eis.laTokens.includes('iīs') && !eis.laTokens.includes('īs') && E.gradeEnglish(eis, 'The king gives the gift to them.') && !E.gradeEnglish(eis, 'The king gives the gift to her.'), 'eīs is to them: ' + eis.la);
  for (const alt of ['iīs', 'īs']) { const r = E.gradeLatinReport(eis, eis.la.replace('eīs', alt), { strict: true }); ok(r.ok && r.alternate && r.standard === 'eīs', alt + ' flagged, standard eīs'); }
  const eius = E.build({ verb: 'amo', subj: { n: 'puella' }, obj: { n: 'pater' }, poss: { host: 'obj', g: 'm', num: 'sg' } });
  ok(eius.la === 'Puella patrem eius amat.' && ['his', 'her', 'its'].every(w => E.gradeEnglish(eius, 'The girl loves ' + w + ' father.')), 'eius accepts his, her, and its: ' + eius.en);
  const earum = E.build({ verb: 'amo', subj: { n: 'puer' }, obj: { n: 'mater' }, poss: { host: 'obj', g: 'f', num: 'pl' } });
  ok(/eārum/.test(earum.la) && earum.en === 'The boy loves their mother.', 'eārum is their: ' + earum.la);
  ok(!E.gradeEnglish(earum, 'The boy loves his mother.') && !E.gradeEnglish(earum, 'The boy loves her mother.') && !E.gradeEnglish(earum, 'The boy loves its mother.'), 'eārum does not accept his, her, or its');
  const eorum = E.build({ verb: 'amo', subj: { n: 'puella' }, obj: { n: 'pater' }, poss: { host: 'obj', g: 'm', num: 'pl' } });
  ok(/eōrum/.test(eorum.la) && eorum.en === 'The girl loves their father.' && !E.gradeEnglish(eorum, 'The girl loves his father.'), 'eōrum is their, not his: ' + eorum.la);
  // generated eius accepts every gender the form allows, and is not the subject's own possession
  const SECUM = ['fero', 'porto', 'duco', 'habeo'];
  let nEius = 0, nPlGen = 0, nSec = 0;
  for (let i = 0; i < 24; i++) {
    const s = E.generate(E.mulberry32(8800 + i), { template: 'PRON_OBJ', pronTarget: i % 2 ? 'pi|f.gen.sg' : 'pi|m.gen.sg' });
    const host = s.spec.obj && s.spec.obj.poss ? s.spec.obj : s.spec.subj;
    ok(host && host.poss && /eius/.test(s.la), 'generated genitive singular is eius: ' + s.la);
    const gloss = host.poss.noun.gloss;
    nEius++;
    for (const w of ['his', 'her', 'its']) ok(E.gradeEnglish(s, s.en.replace(new RegExp('\\b' + gloss + '\\b', 'i'), w)), 'generated eius rejects ' + w + ': ' + s.en);
    ok(!E.gradeEnglish(s, s.en.replace(new RegExp('\\b' + gloss + '\\b', 'i'), 'their')), 'generated eius accepts their: ' + s.en);
    const subj = s.spec.subj;
    if (host !== subj && subj && !subj.noun.pron && host.poss.num === subj.num) ok(!(subj.noun.genders || []).includes(host.poss.noun.g), 'eius stands for the subject: ' + s.la + ' / ' + s.en);
  }
  for (let i = 0; i < 16; i++) {
    const s = E.generate(E.mulberry32(8900 + i), { template: 'PRON_OBJ', pronTarget: i % 2 ? 'pi|f.gen.pl' : 'pi|n.gen.pl' });
    ok(/eārum|eōrum/.test(s.la) && /\btheir\b/i.test(s.en), 'plural genitive: ' + s.la + ' / ' + s.en);
    ok(!E.gradeEnglish(s, s.en.replace(/\btheir\b/i, 'his')) && !E.gradeEnglish(s, s.en.replace(/\btheir\b/i, 'her')) && !E.gradeEnglish(s, s.en.replace(/\btheir\b/i, 'its')), 'plural genitive accepts a singular possessive: ' + s.en);
    const host = s.spec.obj && s.spec.obj.poss ? s.spec.obj : s.spec.subj;
    const subj = s.spec.subj;
    nPlGen++;
    if (host !== subj && subj && host.poss && host.poss.num === 'pl' && subj.num === 'pl') ok(false, 'eōrum/eārum used for the plural subject: ' + s.la + ' / ' + s.en);
  }
  // sēcum only with carry / bring / take, and only a third-person subject
  for (let i = 0; i < 30; i++) {
    const s = E.generate(E.mulberry32(9000 + i), { template: 'PRON_OBJ', pronTarget: i % 2 ? 'pr|abl.pl' : 'pr|abl.sg' });
    nSec++;
    ok(s.laTokens.includes('sēcum') && !s.laTokens.includes('cum') && !s.laTokens.includes('sē'), 'sēcum token: ' + s.la);
    ok(SECUM.includes(s.verb) && s.spec.fr.f.t === 'tr' && s.spec.obj, 'sēcum verb ' + s.verb + ': ' + s.la + ' / ' + s.en);
    ok(!s.spec.pron && s.person[0] === '3', 'sēcum person ' + s.person + ': ' + s.la);
    ok(!['eo', 'venio', 'curro', 'discedo', 'redeo', 'ambulo', 'fugio'].includes(s.verb), 'sēcum with a verb of motion: ' + s.verb);
    const self = s.person === '3p' ? 'themselves' : (s.spec.subj.noun.genders.length !== 1 || s.spec.subj.noun.genders[0] === 'n' ? 'itself' : s.spec.subj.noun.genders[0] === 'f' ? 'herself' : 'himself');
    ok(s.en.toLowerCase().includes('with ' + self), 'sēcum English: ' + s.en);
    ok(!E.gradeEnglish(s, s.en.replace(/\b(himself|herself|itself|themselves)\b/i, 'myself')), 'sēcum accepts myself: ' + s.en);
  }
  ok(nEius === 24 && nPlGen === 16 && nSec === 30, 'eius / plural genitive / sēcum samples all generated');
  const nomPl = Morph.analyze(W[507]).tbl['m.nom.pl'];
  ok(Morph.grade('iī', nomPl, true).alternate && Morph.grade('iī', nomPl, true).standard === 'eī' && Morph.grade('ī', nomPl, true).alternate, 'iī and ī are alternates of nominative plural eī only');
  ok(!Morph.grade('iī', Morph.analyze(W[507]).tbl['m.dat.sg'], true).ok, 'iī is not an alternate of dative eī');

  // independent form sets: everything a Diederich id can show, plus the words every pool allows (prepositions, personal pronouns, sum)
  const idForms = {};
  const formsOfId = id => idForms[id] || (idForms[id] = (() => { const r = Morph.analyze(W[id]); const f = new Set(Object.values(r.tbl || {}).flat().flatMap(x => x.split(' ')).map(normM));
    if (r.tbl && r.tbl['ptc.pas.perf']) for (const x of Object.values(Morph.analyze({ pos: 'adjective', la: r.tbl['ptc.pas.perf'][0] + ', -a, -um' }).tbl).flat()) f.add(normM(x));
    for (const x of W[id].la.split(',')[0].replace(/[()]/g, ' ').split(/\s+/).filter(Boolean)) f.add(normM(x)); return f; })()); // headword and its (variant): atque (ac), nec (neque)
  const exempt = new Set(['ā', 'ab', 'ē', 'ex', 'in', 'ad', 'per', 'sine', 'cum'].concat(Object.keys(PREP_CASE)).map(normM));
  for (const k of Object.keys(E.LEX.preps)) if (E.LEX.preps[k].id != null) for (const f of formsOfId(E.LEX.preps[k].id)) exempt.add(f);
  for (const p of ['1s', '2s', '1p', '2p', '3s', '3p']) { let n; try { n = N('pron_' + p); } catch (e) { continue; } if (!n || !n.tbl) continue; for (const f of Object.values(n.tbl).flat()) exempt.add(normM(f)); if (n.cumForm) exempt.add(normM(n.cumForm)); }
  for (const x of ['egō', 'tū', 'nōs', 'vōs']) exempt.add(normM(x));
  for (const f of Object.values(V('sum').tbl).flat()) exempt.add(normM(f));
  for (const id of [495, 507]) for (const f of formsOfId(id)) exempt.add(f);
  exempt.add(normM('sēcum'));
  const allIds = [...new Set(Object.values(E.LEX).flatMap(g => Object.values(g || {})).map(x => x && x.id).filter(x => typeof x === 'number'))];
  ok(allIds.length > 480, 'lexicon id count ' + allIds.length);
  const prng = E.mulberry32(777); let nPool = 0, nFail = 0;
  for (const frac of [1, 0.6, 0.35, 0.15]) for (let rep = 0; rep < 4; rep++) {
    const pool = allIds.filter(() => prng() < frac); const P = new Set(pool); E.setPool(pool);
    for (const tpl of E.TEMPLATES) for (let i = 0; i < 12; i++) {
      let s; try { s = E.generate(E.mulberry32(rep * 1000 + i * 31 + tpl.length), { template: tpl }); } catch (e) { nFail++; continue; }
      nPool++; const id = `[pool ${frac} ${s.la}]`;
      for (const x of E.sentenceIds(s)) ok(P.has(x), id + ' word outside pool: ' + W[x].la);
      const allowed = new Set(exempt); for (const x of E.sentenceIds(s)) for (const f of formsOfId(x)) allowed.add(f);
      for (const t of s.laTokens) { const b = normM(t); ok(allowed.has(b) || (/(que|ve)$/.test(b) && allowed.has(b.replace(/(que|ve)$/, ''))), id + ' token not from a pool word: ' + t); }
      ok(E.gradeEnglish(s, s.en) && E.gradeLatin(s, s.la, { strict: true }), id + ' canonical rejected');
    }
  }
  E.setPool(null);
  ok(nPool > 500, 'too few pool sentences ' + nPool + ' (failed ' + nFail + ')');
  // a pool of nothing but exempt words cannot make sentences: generate() must throw, not loop or show other words
  E.setPool([]); let threw = false; try { E.generate(E.mulberry32(1), { template: 'SOV' }); } catch (e) { threw = /could not generate/.test(e.message); } ok(threw, 'empty pool should throw');
  E.setPool(null);

  // Identify mode: every answer re-derived from the morph.js tables
  const ROLE_CASE = { S: 'nom', O: 'acc', IO: 'dat', MEANS: 'abl' };
  const TEN = ['pres', 'impf', 'perf', 'fut'], PN = ['1s', '2s', '3s', '1p', '2p', '3p'];
  let nT = 0, nV = 0, nN = 0;
  for (const seed of [501, 502, 503]) { const rng = E.mulberry32(seed);
    for (const tpl of E.TEMPLATES) for (let i = 0; i < 40; i++) { const s = E.generate(rng, { template: tpl }); const id = `[${s.la}]`; const ts = E.identifyTargets(s); nT++;
      ok(ts.filter(t => t.kind === 'verb').length === 1, id + ' verb target missing');
      for (const t of ts) {
        ok(t.idx.every(k => k >= 0 && k < s.laTokens.length), id + ' target index');
        if (t.kind === 'noun') { nN++;
          ok(s.laTokens.filter(x => x === t.token).length === 1, id + ' noun target not unique: ' + t.token);
          const lx = /^pron_/.test(t.key) ? null : E.LEX.nouns[t.key];
          if (t.key === 'pron_se' && t.form === 'sēcum') ok(t.case === 'abl' && Morph.standard(Morph.analyze(W[495]).tbl['abl.' + t.num]) === 'sē', id + ' sēcum is not the enclitic of sē');
          else if (t.key === 'pron_is' || t.key === 'pron_se') {
            const cell = t.key === 'pron_se' ? Morph.analyze(W[495]).tbl[t.case + '.' + t.num] : Morph.analyze(W[507]).tbl[(t.g || 'm') + '.' + t.case + '.' + t.num];
            ok(Morph.standard(cell) === t.form, id + ` ${t.form} is not the standard ${t.case} ${t.num} of ${t.key}`);
          } else {
            const tbl = lx ? Morph.analyze(W[lx.id]).tbl : N(t.key).tbl;
            ok(has(tbl[t.case + '.' + t.num], t.form), id + ` ${t.form} is not ${t.case} ${t.num} of ${t.key}`);
          }
          if (ROLE_CASE[t.role] && !(t.role === 'O' && s.spec.fr && s.spec.fr.f.t === 'dat')) ok(t.case === ROLE_CASE[t.role] || (t.role === 'O' && t.case === 'acc'), id + ' role case ' + t.role + ' ' + t.case);
          if (t.role === 'IO') ok(t.case === 'dat', id + ' dative object case');
          if (t.role === 'PP') { const prev = s.laTokens[t.idx[0] - 1] || '', prev2 = s.laTokens[t.idx[0] - 2] || ''; const pc = PREP_CASE[prev] !== undefined ? PREP_CASE[prev] : PREP_CASE[prev2];
            const pc2 = PREP_CASE[Object.keys(PREP_FORMS).find(k => PREP_FORMS[k].includes(prev) || PREP_FORMS[k].includes(prev2))];
            const want = pc != null ? pc : pc2; if (want) ok(t.case === want, id + ` PP case ${t.case} after ${prev}`); }
          if (t.role === 'S') ok(t.case === 'nom', id + ' subject case');
        } else { nV++;
          ok(t.accept.some(a => a.voice === t.voice && a.tense === t.tense && a.person === t.person), id + ' own analysis not accepted');
          const r = Morph.analyze(W[E.LEX.verbs[t.key].id]); const ptc = r.tbl['ptc.pas.perf'] ? Morph.analyze({ pos: 'adjective', la: r.tbl['ptc.pas.perf'][0] + ', -a, -um' }).tbl : null;
          const sumT = Morph.analyze(W[E.LEX.verbs.sum.id]).tbl;
          const isForm = (vc, te, pn) => { const w = t.token.split(' ');
            if (w.length === 1) return has(r.tbl[`ind.${vc}.${te}.${pn}`], w[0]);
            return vc === 'pas' && te === 'perf' && !!ptc && ['m', 'f', 'n'].some(g => has(ptc[`${g}.nom.${pn[1] === 's' ? 'sg' : 'pl'}`], w[0])) && has(sumT['ind.act.pres.' + pn], w[1]); };
          // accept = exactly the analyses whose morph.js form is the shown string
          for (const vc of t.key === 'sum' ? ['act'] : ['act', 'pas']) for (const te of TEN) for (const pn of PN)
            ok(isForm(vc, te, pn) === t.accept.some(a => a.voice === vc && a.tense === te && a.person === pn), id + ` verb analysis ${vc} ${te} ${pn} of ${t.token}`);
          ok(t.idx.map(k => s.laTokens[k]).join(' ') === t.token, id + ' verb indices');
        }
      }
    } }
  ok(nV === nT && nN > nT, `identify coverage: ${nT} sentences, ${nV} verbs, ${nN} nouns`);
}
// ---------- report ----------
console.log(`sentences checked: ${total}`); console.log('templates:', JSON.stringify(templCount)); console.log('tense/voice:', JSON.stringify(tenseVoice));
console.log(`checks passed: ${pass}, failed: ${fail}`);
for (const f of failures) console.log('  FAIL', f);
process.exit(fail ? 1 : 0);
