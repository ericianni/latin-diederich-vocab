// Spot-check generated forms against standard paradigms (Allen & Greenough / Wheelock).
const M = require('../morph.js'); const W = require('../data/words.json');
const find = h => { const e = W.find(x => M.plain(x.la.split(/[ ,]/)[0]) === M.plain(h)); if (!e) throw new Error('missing ' + h); return [e, M.analyze(e)]; };
let pass = 0, fail = 0;
function t(h, key, exp) {
  const [e, a] = find(h);
  if (a.kind === 'verb' && key.split('.').length === 2) key = 'ind.' + a.voice + '.' + key;   // short form: indicative, word's own voice
  const got = a.tbl && a.tbl[key];
  const ok = got && got[0] === exp;
  ok ? pass++ : fail++;
  if (!ok) console.log('FAIL', e.la, key, 'expected', exp, 'got', got, a.skip || '');
}
const V = [
  ['amō', 'pres.3s', 'amat'], ['amō', 'impf.2p', 'amābātis'], ['amō', 'fut.3p', 'amābunt'], ['amō', 'perf.2s', 'amāvistī'], ['amō', 'plup.1p', 'amāverāmus'], ['amō', 'fperf.3p', 'amāverint'],
  ['videō', 'pres.1s', 'videō'], ['videō', 'pres.1p', 'vidēmus'], ['videō', 'impf.3s', 'vidēbat'], ['videō', 'fut.2s', 'vidēbis'], ['videō', 'perf.3s', 'vīdit'],
  ['dūcō', 'pres.3p', 'dūcunt'], ['dūcō', 'fut.1s', 'dūcam'], ['dūcō', 'fut.2s', 'dūcēs'], ['dūcō', 'perf.3p', 'dūxērunt'], ['dūcō', 'impf.1s', 'dūcēbam'],
  ['capiō', 'pres.3p', 'capiunt'], ['capiō', 'pres.2s', 'capis'], ['capiō', 'impf.1p', 'capiēbāmus'], ['capiō', 'fut.3s', 'capiet'], ['capiō', 'perf.1s', 'cēpī'],
  ['audiō', 'pres.2s', 'audīs'], ['audiō', 'pres.3p', 'audiunt'], ['audiō', 'fut.1p', 'audiēmus'], ['audiō', 'perf.3s', 'audīvit'],
  ['sum', 'pres.2s', 'es'], ['sum', 'impf.3p', 'erant'], ['sum', 'fut.3p', 'erunt'], ['sum', 'perf.1p', 'fuimus'], ['sum', 'fperf.3s', 'fuerit'],
  ['possum', 'pres.3s', 'potest'], ['possum', 'pres.3p', 'possunt'], ['possum', 'impf.1s', 'poteram'], ['possum', 'perf.1s', 'potuī'],
  ['prōsum', 'pres.3s', 'prōdest'], ['prōsum', 'pres.1p', 'prōsumus'], ['absum', 'perf.1s', 'āfuī'],
  ['eō', 'pres.3p', 'eunt'], ['eō', 'pres.2s', 'īs'], ['eō', 'impf.1s', 'ībam'], ['eō', 'fut.3s', 'ībit'], ['eō', 'perf.1s', 'iī'], ['redeō', 'pres.3p', 'redeunt'], ['redeō', 'pres.3s', 'redit'],
  ['ferō', 'pres.2s', 'fers'], ['ferō', 'pres.3s', 'fert'], ['ferō', 'pres.2p', 'fertis'], ['ferō', 'fut.1s', 'feram'], ['ferō', 'perf.1s', 'tulī'], ['referō', 'pres.3s', 'refert'],
  ['volō', 'pres.2s', 'vīs'], ['volō', 'pres.3s', 'vult'], ['volō', 'pres.1p', 'volumus'], ['volō', 'perf.1s', 'voluī'], ['nōlō', 'pres.3p', 'nōlunt'], ['nōlō', 'pres.2s', 'nōn vīs'], ['mālō', 'pres.2s', 'māvīs'],
  ['fīō', 'pres.3s', 'fit'], ['fīō', 'pres.3p', 'fīunt'], ['fīō', 'perf.3s', 'factus est'],
  ['dō', 'pres.1p', 'damus'], ['dō', 'impf.1s', 'dabam'], ['dō', 'perf.1s', 'dedī'],
  ['hortor', 'pres.2s', 'hortāris'], ['hortor', 'fut.3s', 'hortābitur'], ['loquor', 'pres.3s', 'loquitur'], ['loquor', 'fut.2s', 'loquēris'], ['loquor', 'perf.1s', 'locūtus sum'],
  ['patior', 'pres.3p', 'patiuntur'], ['vereor', 'pres.1s', 'vereor'], ['vereor', 'impf.3s', 'verēbātur'], ['orior', 'pres.3s', 'oritur'],
  ['audeō', 'pres.3s', 'audet'], ['audeō', 'perf.1s', 'ausus sum'], ['incēdō', 'pres.3s', 'incēdit'],
  ['volō', 'pres.3s', 'vult'], ['dēcernō', 'perf.1s', 'dēcrēvī'], ['retineō', 'perf.1s', 'retinuī'], ['vertō', 'perf.1s', 'vertī'], ['occīdō', 'perf.1s', 'occīdī'], ['inveniō', 'perf.1s', 'invēnī'],
];
// passive, subjunctive, imperative, infinitives, participles
const V2 = [
  // 1st amō
  ['amō', 'ind.pas.pres.1s', 'amor'], ['amō', 'ind.pas.pres.2s', 'amāris'], ['amō', 'ind.pas.impf.3p', 'amābantur'], ['amō', 'ind.pas.fut.2s', 'amāberis'], ['amō', 'ind.pas.perf.3s', 'amātus est'], ['amō', 'ind.pas.plup.3p', 'amātī erant'], ['amō', 'ind.pas.fperf.1s', 'amātus erō'],
  ['amō', 'sub.act.pres.1s', 'amem'], ['amō', 'sub.act.pres.3p', 'ament'], ['amō', 'sub.act.impf.2s', 'amārēs'], ['amō', 'sub.act.perf.3s', 'amāverit'], ['amō', 'sub.act.plup.1p', 'amāvissēmus'],
  ['amō', 'sub.pas.pres.3s', 'amētur'], ['amō', 'sub.pas.impf.3p', 'amārentur'], ['amō', 'sub.pas.perf.1s', 'amātus sim'], ['amō', 'sub.pas.plup.3s', 'amātus esset'],
  ['amō', 'imp.act.pres.2s', 'amā'], ['amō', 'imp.act.pres.2p', 'amāte'], ['amō', 'imp.pas.pres.2p', 'amāminī'],
  ['amō', 'inf.act.pres', 'amāre'], ['amō', 'inf.act.perf', 'amāvisse'], ['amō', 'inf.act.fut', 'amātūrus esse'], ['amō', 'inf.pas.pres', 'amārī'], ['amō', 'inf.pas.perf', 'amātus esse'],
  ['amō', 'ptc.act.pres', 'amāns'], ['amō', 'ptc.pas.perf', 'amātus'], ['amō', 'ptc.act.fut', 'amātūrus'],
  // 2nd moneō / videō
  ['moneō', 'ind.pas.pres.2s', 'monēris'], ['moneō', 'ind.pas.fut.3s', 'monēbitur'], ['moneō', 'sub.act.pres.1s', 'moneam'], ['moneō', 'sub.pas.pres.3p', 'moneantur'], ['moneō', 'sub.act.impf.3s', 'monēret'],
  ['moneō', 'imp.act.pres.2s', 'monē'], ['moneō', 'imp.act.pres.2p', 'monēte'], ['moneō', 'inf.pas.pres', 'monērī'], ['moneō', 'ind.pas.perf.1s', 'monitus sum'], ['videō', 'ind.pas.pres.3s', 'vidētur'], ['videō', 'ptc.pas.perf', 'vīsus'],
  // 3rd regō / dūcō / mittō
  ['regō', 'ind.pas.pres.2s', 'regeris'], ['regō', 'ind.pas.pres.3s', 'regitur'], ['regō', 'ind.pas.pres.3p', 'reguntur'], ['regō', 'ind.pas.fut.1s', 'regar'], ['regō', 'ind.pas.fut.2s', 'regēris'], ['regō', 'ind.pas.impf.1p', 'regēbāmur'],
  ['regō', 'sub.act.pres.3s', 'regat'], ['regō', 'sub.act.impf.1s', 'regerem'], ['regō', 'sub.pas.pres.1p', 'regāmur'], ['regō', 'sub.pas.impf.3s', 'regerētur'], ['regō', 'sub.act.perf.1s', 'rēxerim'], ['regō', 'sub.act.plup.3s', 'rēxisset'],
  ['regō', 'imp.act.pres.2s', 'rege'], ['regō', 'imp.act.pres.2p', 'regite'], ['regō', 'imp.pas.pres.2s', 'regere'], ['regō', 'imp.pas.pres.2p', 'regiminī'], ['regō', 'inf.pas.pres', 'regī'], ['regō', 'ind.pas.perf.3p', 'rēctī sunt'],
  ['dūcō', 'imp.act.pres.2s', 'dūc'], ['dīcō', 'imp.act.pres.2s', 'dīc'], ['dūcō', 'ptc.act.pres', 'dūcēns'], ['mittō', 'ind.pas.perf.3s', 'missus est'], ['mittō', 'inf.act.fut', 'missūrus esse'],
  // 3rd -iō capiō / faciō
  ['capiō', 'ind.pas.pres.1s', 'capior'], ['capiō', 'ind.pas.pres.2s', 'caperis'], ['capiō', 'ind.pas.pres.3p', 'capiuntur'], ['capiō', 'ind.pas.fut.3s', 'capiētur'], ['capiō', 'sub.act.pres.2s', 'capiās'], ['capiō', 'sub.act.impf.3p', 'caperent'],
  ['capiō', 'sub.pas.pres.3s', 'capiātur'], ['capiō', 'imp.act.pres.2s', 'cape'], ['capiō', 'imp.act.pres.2p', 'capite'], ['capiō', 'inf.pas.pres', 'capī'], ['capiō', 'ptc.act.pres', 'capiēns'], ['capiō', 'ind.pas.perf.1s', 'captus sum'],
  ['faciō', 'imp.act.pres.2s', 'fac'], ['faciō', 'imp.act.pres.2p', 'facite'], ['faciō', 'sub.act.pres.1s', 'faciam'],
  // 4th audiō
  ['audiō', 'ind.pas.pres.2s', 'audīris'], ['audiō', 'ind.pas.pres.3p', 'audiuntur'], ['audiō', 'ind.pas.impf.3s', 'audiēbātur'], ['audiō', 'ind.pas.fut.1p', 'audiēmur'], ['audiō', 'sub.act.pres.3s', 'audiat'], ['audiō', 'sub.act.impf.1s', 'audīrem'],
  ['audiō', 'sub.pas.pres.2p', 'audiāminī'], ['audiō', 'imp.act.pres.2s', 'audī'], ['audiō', 'imp.act.pres.2p', 'audīte'], ['audiō', 'inf.pas.pres', 'audīrī'], ['audiō', 'ptc.act.pres', 'audiēns'], ['audiō', 'sub.pas.perf.3p', 'audītī sint'],
  // deponents
  ['hortor', 'sub.dep.pres.3s', 'hortētur'], ['hortor', 'sub.dep.impf.1s', 'hortārer'], ['hortor', 'imp.dep.pres.2s', 'hortāre'], ['hortor', 'imp.dep.pres.2p', 'hortāminī'], ['hortor', 'inf.dep.pres', 'hortārī'], ['hortor', 'inf.dep.perf', 'hortātus esse'],
  ['hortor', 'ptc.dep.pres', 'hortāns'], ['hortor', 'ptc.dep.perf', 'hortātus'], ['hortor', 'ptc.dep.fut', 'hortātūrus'], ['hortor', 'ind.dep.perf.3s', 'hortātus est'], ['hortor', 'sub.dep.plup.3p', 'hortātī essent'],
  ['vereor', 'sub.dep.pres.1s', 'verear'], ['vereor', 'imp.dep.pres.2s', 'verēre'], ['loquor', 'sub.dep.pres.3s', 'loquātur'], ['loquor', 'imp.dep.pres.2s', 'loquere'], ['loquor', 'inf.dep.pres', 'loquī'], ['loquor', 'sub.dep.impf.3s', 'loquerētur'],
  ['patior', 'sub.dep.pres.3s', 'patiātur'], ['patior', 'inf.dep.pres', 'patī'], ['patior', 'imp.dep.pres.2s', 'patere'], ['morior', 'ptc.dep.fut', 'moritūrus'], ['orior', 'ptc.dep.fut', 'oritūrus'],
  ['audeō', 'sub.act.perf.3s', 'ausus sit'], ['audeō', 'sub.act.pres.1s', 'audeam'],
  // irregulars
  ['sum', 'sub.act.pres.1s', 'sim'], ['sum', 'sub.act.pres.3p', 'sint'], ['sum', 'sub.act.impf.3s', 'esset'], ['sum', 'sub.act.perf.1s', 'fuerim'], ['sum', 'sub.act.plup.3p', 'fuissent'], ['sum', 'imp.act.pres.2s', 'es'], ['sum', 'imp.act.pres.2p', 'este'],
  ['sum', 'inf.act.pres', 'esse'], ['sum', 'inf.act.perf', 'fuisse'], ['sum', 'inf.act.fut', 'futūrus esse'], ['sum', 'ptc.act.fut', 'futūrus'],
  ['possum', 'sub.act.pres.1s', 'possim'], ['possum', 'sub.act.impf.3s', 'posset'], ['possum', 'sub.act.perf.3s', 'potuerit'], ['possum', 'inf.act.pres', 'posse'], ['possum', 'inf.act.perf', 'potuisse'],
  ['prōsum', 'sub.act.impf.1s', 'prōdessem'], ['prōsum', 'inf.act.pres', 'prōdesse'], ['absum', 'sub.act.pres.3s', 'absit'], ['absum', 'imp.act.pres.2s', 'abes'],
  ['eō', 'sub.act.pres.1s', 'eam'], ['eō', 'sub.act.impf.3s', 'īret'], ['eō', 'sub.act.perf.1s', 'ierim'], ['eō', 'sub.act.plup.3s', 'īsset'], ['eō', 'imp.act.pres.2s', 'ī'], ['eō', 'imp.act.pres.2p', 'īte'], ['eō', 'inf.act.pres', 'īre'],
  ['eō', 'ptc.act.pres', 'iēns'], ['eō', 'ptc.act.fut', 'itūrus'], ['redeō', 'sub.act.pres.3p', 'redeant'], ['redeō', 'imp.act.pres.2s', 'redī'],
  ['ferō', 'sub.act.pres.1s', 'feram'], ['ferō', 'sub.act.impf.3s', 'ferret'], ['ferō', 'sub.act.perf.1s', 'tulerim'], ['ferō', 'imp.act.pres.2s', 'fer'], ['ferō', 'imp.act.pres.2p', 'ferte'], ['ferō', 'inf.act.pres', 'ferre'], ['ferō', 'inf.act.perf', 'tulisse'],
  ['ferō', 'ind.pas.pres.2s', 'ferris'], ['ferō', 'ind.pas.pres.3s', 'fertur'], ['ferō', 'ind.pas.pres.2p', 'feriminī'], ['ferō', 'ind.pas.impf.1s', 'ferēbar'], ['ferō', 'ind.pas.fut.3s', 'ferētur'], ['ferō', 'ind.pas.perf.3s', 'lātus est'],
  ['ferō', 'sub.pas.pres.3s', 'ferātur'], ['ferō', 'sub.pas.impf.3s', 'ferrētur'], ['ferō', 'inf.pas.pres', 'ferrī'], ['ferō', 'ptc.pas.perf', 'lātus'], ['ferō', 'ptc.act.fut', 'lātūrus'],
  ['referō', 'ind.pas.pres.3s', 'refertur'], ['referō', 'ind.act.perf.1s', 'rettulī'], ['trānsferō', 'ind.pas.perf.3s', 'trānslātus est'],
  ['volō', 'sub.act.pres.1s', 'velim'], ['volō', 'sub.act.pres.3s', 'velit'], ['volō', 'sub.act.impf.1s', 'vellem'], ['volō', 'sub.act.perf.1s', 'voluerim'], ['volō', 'inf.act.pres', 'velle'], ['volō', 'ptc.act.pres', 'volēns'],
  ['nōlō', 'sub.act.pres.3s', 'nōlit'], ['nōlō', 'sub.act.impf.3s', 'nōllet'], ['nōlō', 'imp.act.pres.2s', 'nōlī'], ['nōlō', 'imp.act.pres.2p', 'nōlīte'], ['nōlō', 'inf.act.pres', 'nōlle'],
  ['mālō', 'sub.act.pres.1s', 'mālim'], ['mālō', 'sub.act.impf.3p', 'māllent'], ['mālō', 'inf.act.pres', 'mālle'], ['mālō', 'ind.act.pres.3s', 'māvult'],
  ['fīō', 'sub.act.pres.3s', 'fīat'], ['fīō', 'sub.act.impf.3s', 'fieret'], ['fīō', 'sub.act.perf.3s', 'factus sit'], ['fīō', 'imp.act.pres.2s', 'fī'], ['fīō', 'inf.act.pres', 'fierī'], ['fīō', 'ind.act.impf.3s', 'fīēbat'],
  ['dō', 'sub.act.pres.1s', 'dem'], ['dō', 'sub.act.impf.3s', 'daret'], ['dō', 'imp.act.pres.2s', 'dā'], ['dō', 'imp.act.pres.2p', 'date'], ['dō', 'inf.act.pres', 'dare'], ['dō', 'ind.act.pres.2s', 'dās'],
  ['dō', 'ind.pas.pres.3s', 'datur'], ['dō', 'ind.pas.pres.2s', 'daris'], ['dō', 'ind.pas.impf.3s', 'dabātur'], ['dō', 'sub.pas.impf.3s', 'darētur'], ['dō', 'inf.pas.pres', 'darī'], ['dō', 'ind.pas.perf.3s', 'datus est'], ['dō', 'ptc.act.pres', 'dāns'], ['respiciō', 'ind.act.perf.1s', 'respexī'], ['respiciō', 'ptc.pas.perf', 'respectus'], ['peragō', 'ptc.pas.perf', 'perāctus'], ['adiciō', 'ptc.pas.perf', 'adiectus'], ['statuō', 'ptc.pas.perf', 'statūtus'], ['orior', 'sub.dep.impf.3s', 'orīrētur'], ['orior', 'inf.dep.pres', 'orīrī'], ['intellegō', 'ind.pas.perf.3s', 'intellēctus est'],
];
// forms that must NOT be generated (no passive for intransitive irregulars etc.)
const NONE = [
  ['sum', 'ind.pas.pres.3s'], ['possum', 'imp.act.pres.2s'], ['possum', 'ind.pas.pres.3s'], ['eō', 'ind.pas.pres.3s'], ['redeō', 'ind.pas.pres.3s'], ['volō', 'ind.pas.pres.3s'], ['volō', 'imp.act.pres.2s'],
  ['nōlō', 'ind.pas.pres.3s'], ['mālō', 'imp.act.pres.2s'], ['mālō', 'ind.pas.pres.3s'], ['fīō', 'ind.pas.pres.3s'], ['audeō', 'ind.pas.pres.3s'], ['veniō', 'ind.pas.pres.3s'], ['stō', 'ind.pas.pres.3s'],
  ['hortor', 'ind.act.pres.3s'], ['hortor', 'ind.pas.pres.3s'], ['cadō', 'ind.pas.pres.3s'], ['sum', 'sub.act.fut.3s'],
];
// alternatives accepted by the checker
const ALT = [
  ['amō', 'ind.pas.pres.2s', 'amāre'], ['regō', 'ind.pas.fut.2s', 'regēre'], ['amō', 'ind.pas.perf.3s', 'amāta est'], ['amō', 'ind.pas.perf.3p', 'amātae sunt'], ['amō', 'ind.pas.perf.3p', 'amāta sunt'],
  ['amō', 'ind.act.perf.3p', 'amāvēre'], ['sum', 'inf.act.fut', 'fore'], ['eō', 'sub.act.plup.3s', 'iisset'], ['amō', 'ind.act.pres.3s', 'AMAT'], ['amō', 'inf.pas.perf', 'amatum esse'],
];
const N = [
  ['puella', 'gen.sg', 'puellae'], ['puella', 'abl.sg', 'puellā'], ['terra', 'acc.pl', 'terrās'],
  ['dominus', 'dat.sg', 'dominō'], ['dominus', 'gen.pl', 'dominōrum'], ['ager', 'gen.sg', 'agrī'], ['ager', 'acc.pl', 'agrōs'], ['puer', 'dat.pl', 'puerīs'], ['vir', 'acc.sg', 'virum'],
  ['bellum', 'nom.pl', 'bella'], ['templum', 'abl.pl', 'templīs'],
  ['rēx', 'gen.sg', 'rēgis'], ['rēx', 'dat.pl', 'rēgibus'], ['rēx', 'gen.pl', 'rēgum'], ['rēx', 'acc.sg', 'rēgem'],
  ['tempus', 'nom.pl', 'tempora'], ['tempus', 'gen.sg', 'temporis'], ['corpus', 'abl.sg', 'corpore'], ['nōmen', 'gen.pl', 'nōminum'],
  ['cīvis', 'gen.pl', 'cīvium'], ['nox', 'gen.pl', 'noctium'], ['urbs', 'gen.pl', 'urbium'], ['mare', 'abl.sg', 'marī'], ['mare', 'nom.pl', 'maria'], ['animal', 'nom.pl', 'animālia'],
  ['pater', 'gen.pl', 'patrum'], ['homō', 'gen.sg', 'hominis'], ['mīles', 'acc.pl', 'mīlitēs'], ['virtūs', 'gen.sg', 'virtūtis'], ['iter', 'gen.sg', 'itineris'],
  ['manus', 'gen.sg', 'manūs'], ['manus', 'dat.sg', 'manuī'], ['manus', 'gen.pl', 'manuum'], ['cornū', 'nom.pl', 'cornua'],
  ['diēs', 'gen.sg', 'diēī'], ['rēs', 'gen.sg', 'reī'], ['rēs', 'gen.pl', 'rērum'], ['spēs', 'acc.sg', 'spem'],
  ['vīs', 'acc.sg', 'vim'], ['vīs', 'nom.pl', 'vīrēs'], ['domus', 'gen.sg', 'domūs'], ['deus', 'nom.pl', 'dī'], ['castra', 'gen.pl', 'castrōrum'], ['arma', 'acc.pl', 'arma'], ['moenia', 'gen.pl', 'moenium'],
  ['canis', 'gen.pl', 'canum'], ['iuvenis', 'gen.pl', 'iuvenum'],
];
const A = [
  ['bonus', 'f.dat.pl', 'bonīs'], ['bonus', 'n.nom.pl', 'bona'], ['bonus', 'm.gen.sg', 'bonī'], ['līber', 'f.nom.sg', 'lībera'], ['sinister', 'f.nom.sg', 'sinistra'], ['integer', 'm.gen.sg', 'integrī'],
  ['omnis', 'n.nom.pl', 'omnia'], ['omnis', 'm.abl.sg', 'omnī'], ['omnis', 'f.gen.pl', 'omnium'], ['ācer', 'f.nom.sg', 'ācris'], ['ācer', 'n.nom.sg', 'ācre'],
  ['ingēns', 'm.gen.sg', 'ingentis'], ['ingēns', 'n.nom.pl', 'ingentia'], ['fēlīx', 'f.acc.sg', 'fēlīcem'], ['vetus', 'm.abl.sg', 'vetere'], ['dīves', 'm.gen.pl', 'dīvitum'],
  ['tōtus', 'f.gen.sg', 'tōtīus'], ['ūnus', 'm.dat.sg', 'ūnī'], ['nūllus', 'n.gen.sg', 'nūllīus'], ['māior', 'n.nom.sg', 'māius'], ['māior', 'm.gen.sg', 'māiōris'], ['melior', 'n.nom.pl', 'meliōra'],
];
for (const x of [...V, ...V2, ...N, ...A]) { try { t(...x); } catch (err) { fail++; console.log('ERR', x, err.message); } }
for (const [h, key] of NONE) { const [e, a] = find(h); const ok = !(a.tbl && a.tbl[key]); ok ? pass++ : fail++; if (!ok) console.log('FAIL should not exist', e.la, key, a.tbl[key]); }
for (const [h, key, inp] of ALT) { const [e, a] = find(h); const ok = !!(a.tbl && a.tbl[key] && M.check(inp, a.tbl[key])); ok ? pass++ : fail++; if (!ok) console.log('FAIL alt not accepted', e.la, key, inp, a.tbl && a.tbl[key]); }
// every drillable word: no empty / undefined forms, labels resolve
let words = 0;
for (const e of W.filter(x => !x.d)) { const a = M.analyze(e); if (a.skip || !a.tbl) continue; words++;
  for (const k in a.tbl) { const bad = !a.tbl[k].length || a.tbl[k].some(f => !f || /undefined|null|NaN/.test(f)) || /undefined/.test(M.label(a.kind, k)); if (bad) { fail++; console.log('FAIL bad cell', e.la, k, a.tbl[k]); } } }
pass++;
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
