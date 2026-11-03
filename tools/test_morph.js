// Spot-check generated forms against standard paradigms (Allen & Greenough / Wheelock).
const M = require('../morph.js'); const W = require('../data/words.json');
const find = h => { const e = W.find(x => M.plain(x.la.split(/[ ,]/)[0]) === M.plain(h)); if (!e) throw new Error('missing ' + h); return [e, M.analyze(e)]; };
let pass = 0, fail = 0;
function t(h, key, exp) {
  const [e, a] = find(h);
  if (a.kind === 'verb' && key.split('.').length === 2 && !/^(ger|gdv|sup)\./.test(key)) key = 'ind.' + a.voice + '.' + key;   // short form: indicative, word's own voice
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
// ---- v3: gerund, gerundive, supine, future imperative, future passive infinitive, vocative, locative ----
const V3 = [
  ['amō', 'ger.gen', 'amandī'], ['amō', 'ger.dat', 'amandō'], ['amō', 'ger.acc', 'amandum'], ['amō', 'ger.abl', 'amandō'], ['amō', 'gdv.m', 'amandus'], ['amō', 'gdv.f', 'amanda'], ['amō', 'gdv.n', 'amandum'],
  ['amō', 'sup.um', 'amātum'], ['amō', 'sup.u', 'amātū'], ['amō', 'inf.pas.fut', 'amātum īrī'],
  ['amō', 'imp.act.fut.2s', 'amātō'], ['amō', 'imp.act.fut.3s', 'amātō'], ['amō', 'imp.act.fut.2p', 'amātōte'], ['amō', 'imp.act.fut.3p', 'amantō'],
  ['amō', 'imp.pas.fut.2s', 'amātor'], ['amō', 'imp.pas.fut.3p', 'amantor'],
  ['moneō', 'ger.gen', 'monendī'], ['moneō', 'gdv.m', 'monendus'], ['moneō', 'sup.um', 'monitum'], ['moneō', 'imp.act.fut.2s', 'monētō'], ['moneō', 'imp.act.fut.3p', 'monentō'], ['moneō', 'imp.pas.fut.3s', 'monētor'],
  ['regō', 'ger.gen', 'regendī'], ['regō', 'gdv.f', 'regenda'], ['regō', 'sup.um', 'rēctum'], ['regō', 'sup.u', 'rēctū'], ['regō', 'inf.pas.fut', 'rēctum īrī'], ['regō', 'imp.act.fut.2s', 'regitō'], ['regō', 'imp.act.fut.3p', 'reguntō'], ['regō', 'imp.pas.fut.3p', 'reguntor'],
  ['capiō', 'ger.gen', 'capiendī'], ['capiō', 'gdv.m', 'capiendus'], ['capiō', 'sup.um', 'captum'], ['capiō', 'imp.act.fut.2s', 'capitō'], ['capiō', 'imp.act.fut.3p', 'capiuntō'], ['capiō', 'imp.pas.fut.3p', 'capiuntor'],
  ['audiō', 'ger.abl', 'audiendō'], ['audiō', 'gdv.n', 'audiendum'], ['audiō', 'sup.u', 'audītū'], ['audiō', 'imp.act.fut.2p', 'audītōte'], ['audiō', 'imp.act.fut.3p', 'audiuntō'], ['audiō', 'imp.pas.fut.2s', 'audītor'],
  ['dīcō', 'sup.u', 'dictū'], ['faciō', 'gdv.m', 'faciendus'], ['faciō', 'sup.um', 'factum'], ['dūcō', 'imp.act.fut.2s', 'dūcitō'],
  ['dō', 'ger.gen', 'dandī'], ['dō', 'gdv.m', 'dandus'], ['dō', 'sup.um', 'datum'], ['dō', 'imp.act.fut.2s', 'datō'], ['dō', 'imp.act.fut.3p', 'dantō'], ['dō', 'inf.pas.fut', 'datum īrī'],
  ['veniō', 'ger.gen', 'veniendī'], ['veniō', 'sup.um', 'ventum'], ['veniō', 'imp.act.fut.3p', 'veniuntō'],
  ['hortor', 'ger.gen', 'hortandī'], ['hortor', 'gdv.m', 'hortandus'], ['hortor', 'sup.um', 'hortātum'], ['hortor', 'imp.dep.fut.2s', 'hortātor'], ['hortor', 'imp.dep.fut.3p', 'hortantor'],
  ['vereor', 'gdv.m', 'verendus'], ['loquor', 'ger.gen', 'loquendī'], ['loquor', 'sup.um', 'locūtum'], ['loquor', 'imp.dep.fut.3s', 'loquitor'], ['patior', 'gdv.m', 'patiendus'], ['experior', 'ger.gen', 'experiendī'],
  ['ūtor', 'gdv.m', 'ūtendus'], ['ūtor', 'sup.um', 'ūsum'], ['sequor', 'gdv.m', 'sequendus'], ['morior', 'ger.gen', 'moriendī'], ['orior', 'ger.gen', 'oriendī'], ['nāscor', 'ger.gen', 'nāscendī'],
  ['audeō', 'ger.gen', 'audendī'], ['audeō', 'gdv.m', 'audendus'], ['gaudeō', 'ger.gen', 'gaudendī'], ['timeō', 'gdv.m', 'timendus'], ['fugiō', 'gdv.m', 'fugiendus'],
  ['sum', 'imp.act.fut.2s', 'estō'], ['sum', 'imp.act.fut.2p', 'estōte'], ['sum', 'imp.act.fut.3p', 'suntō'], ['adsum', 'imp.act.fut.2s', 'adestō'], ['prōsum', 'imp.act.fut.2s', 'prōdestō'],
  ['eō', 'imp.act.fut.2s', 'ītō'], ['eō', 'imp.act.fut.3p', 'euntō'], ['eō', 'ger.gen', 'eundī'], ['eō', 'sup.um', 'itum'], ['eō', 'sup.u', 'itū'], ['redeō', 'ger.gen', 'redeundī'], ['redeō', 'imp.act.fut.3p', 'redeuntō'],
  ['ferō', 'imp.act.fut.2s', 'fertō'], ['ferō', 'imp.act.fut.3p', 'feruntō'], ['ferō', 'imp.pas.fut.2s', 'fertor'], ['ferō', 'imp.pas.fut.3p', 'feruntor'], ['ferō', 'ger.gen', 'ferendī'], ['ferō', 'gdv.m', 'ferendus'],
  ['ferō', 'sup.um', 'lātum'], ['ferō', 'sup.u', 'lātū'], ['ferō', 'inf.pas.fut', 'lātum īrī'], ['referō', 'sup.um', 'relātum'],
  ['volō', 'ger.gen', 'volendī'], ['nōlō', 'imp.act.fut.2s', 'nōlītō'], ['nōlō', 'imp.act.fut.2p', 'nōlītōte'], ['nōlō', 'imp.act.fut.3p', 'nōluntō'],
  // vocative / locative
  ['dominus', 'voc.sg', 'domine'], ['dominus', 'voc.pl', 'dominī'], ['fīlius', 'voc.sg', 'fīlī'], ['socius', 'voc.sg', 'socī'], ['deus', 'voc.sg', 'deus'], ['deus', 'voc.pl', 'dī'],
  ['puer', 'voc.sg', 'puer'], ['puella', 'voc.sg', 'puella'], ['rēx', 'voc.sg', 'rēx'], ['rēx', 'voc.pl', 'rēgēs'], ['bellum', 'voc.sg', 'bellum'], ['manus', 'voc.sg', 'manus'],
  ['domus', 'loc.sg', 'domī'], ['rūs', 'loc.sg', 'rūrī'], ['humus', 'loc.sg', 'humī'], ['bellum', 'loc.sg', 'bellī'], ['mīlitia', 'loc.sg', 'mīlitiae'],
  ['bonus', 'm.voc.sg', 'bone'], ['bonus', 'f.voc.sg', 'bona'], ['bonus', 'n.voc.sg', 'bonum'], ['bonus', 'm.voc.pl', 'bonī'], ['meus', 'm.voc.sg', 'mī'], ['ēgregius', 'm.voc.sg', 'ēgregie'],
  ['pulcher', 'm.voc.sg', 'pulcher'], ['omnis', 'm.voc.sg', 'omnis'], ['ācer', 'm.voc.sg', 'ācer'], ['ingēns', 'n.voc.pl', 'ingentia'],
];
const NONE3 = [
  ['sum', 'ger.gen'], ['sum', 'sup.um'], ['sum', 'gdv.m'], ['adsum', 'ger.gen'], ['possum', 'ger.gen'], ['possum', 'imp.act.fut.2s'],
  ['eō', 'gdv.m'], ['eō', 'inf.pas.fut'], ['eō', 'imp.pas.fut.2s'], ['nōlō', 'ger.gen'], ['mālō', 'ger.gen'], ['mālō', 'imp.act.fut.2s'], ['fīō', 'ger.gen'], ['fīō', 'sup.um'], ['volō', 'gdv.m'],
  ['veniō', 'gdv.m'], ['veniō', 'inf.pas.fut'], ['veniō', 'imp.pas.fut.2s'], ['gaudeō', 'gdv.m'], ['gaudeō', 'sup.um'],
  ['morior', 'gdv.m'], ['morior', 'sup.um'], ['orior', 'gdv.m'], ['nāscor', 'gdv.m'], ['īrāscor', 'gdv.m'], ['hortor', 'inf.pas.fut'], ['hortor', 'imp.dep.fut.2p'],
  ['timeō', 'sup.um'], ['dominus', 'loc.sg'], ['rēx', 'loc.sg'], ['amō', 'imp.pas.fut.2p'],
];
const ALT3 = [['socius', 'voc.sg', 'socie'], ['ēgregius', 'm.voc.sg', 'ēgregī'], ['deus', 'voc.pl', 'deī'], ['rūs', 'loc.sg', 'rūre'], ['amō', 'inf.pas.fut', 'amatum iri']];
for (const x of V3) { try { t(...x); } catch (err) { fail++; console.log('ERR', x, err.message); } }
for (const [h, key] of NONE3) { const [e, a] = find(h); const ok = !(a.tbl && a.tbl[key]); ok ? pass++ : fail++; if (!ok) console.log('FAIL should not exist', e.la, key, a.tbl[key]); }
for (const [h, key, inp] of ALT3) { const [e, a] = find(h); const ok = !!(a.tbl && a.tbl[key] && M.check(inp, a.tbl[key])); ok ? pass++ : fail++; if (!ok) console.log('FAIL alt not accepted', e.la, key, inp, a.tbl && a.tbl[key]); }
// 1st-conjugation verbs whose stem ends in -i / -e keep it (were nūntō / crāvit)
for (const [h, k, f] of [['nūntiō', 'pres.3s', 'nūntiat'], ['nūntiō', 'perf.1s', 'nūntiāvī'], ['nūntiō', 'ptc.act.pres', 'nūntiāns'], ['creō', 'pres.1p', 'creāmus'], ['creō', 'perf.3s', 'creāvit'], ['creō', 'sub.act.pres.3s', 'creet'], ['creō', 'ptc.pas.perf', 'creātus']]) t(h, k, f);
// strict (macrons required) vs lenient comparison
for (const [inp, ans, strict, exp] of [['amabatis', ['amābātis'], false, true], ['amabatis', ['amābātis'], true, false], ['amābatis', ['amābātis'], true, false],
  ['amābātis', ['amābātis'], true, true], ['AMĀBĀTIS ', ['amābātis'], true, true], ['iūs', ['jūs'], true, true], ['amāta est', ['amātus est'], true, true], ['amata est', ['amātus est'], true, false],
  ['amā\u0304', ['amā'], true, false], ['ama\u0304', ['amā'], true, true], ['amáre', ['amāre'], true, false]]) {
  const ok = M.check(inp, ans, strict) === exp; ok ? pass++ : fail++; if (!ok) console.log('FAIL strict check', inp, ans, strict, 'expected', exp); }
// labels for the new keys
for (const [k, exp] of [['ger.gen', 'gerund · genitive'], ['gdv.f', 'gerundive · feminine nom. sg.'], ['sup.u', 'supine in -ū (ablative)'], ['imp.act.fut.3p', 'future']]) { const l = M.label('verb', k); const ok = l.includes(exp); ok ? pass++ : fail++; if (!ok) console.log('FAIL label', k, l); }
for (const [kind, k, exp] of [['noun', 'voc.sg', 'vocative'], ['noun', 'loc.sg', 'locative'], ['adj', 'm.voc.sg', 'vocative']]) { const l = M.label(kind, k); const ok = l.includes(exp); ok ? pass++ : fail++; if (!ok) console.log('FAIL label', k, l); }
// Learn tab: every Latin form quoted in a lesson's prose, and every table / example word, must match the generator
{ const L = require('../lessons.js'), WL = W.filter(x => !x.d), fw = h => WL.find(x => M.plain(x.la.split(/[ ,]/)[0]) === M.plain(h));
  for (const l of L) {
    for (const [h, k, v] of l.facts) { const w = fw(h), a = w && M.analyze(w), ok = !!(a && a.tbl && a.tbl[k] && a.tbl[k].includes(v)); ok ? pass++ : fail++; if (!ok) console.log('FAIL lesson fact', l.id, h, k, v, a && a.tbl && a.tbl[k]); }
    for (const h of [...l.tables.flatMap(t => [t.h, ...(t.rows || []).map(r => r[1]), ...(t.cols || []).map(c => c[0])]), ...(l.ex || [])].filter(Boolean)) { const w = fw(h), ok = !!(w && !M.analyze(w).skip); ok ? pass++ : fail++; if (!ok) console.log('FAIL lesson word', l.id, h); }
    const tk = l.tables.flatMap(t => (t.rows || []).map(r => [r[1], r[2]]).concat((t.cols || []).flatMap(c => M.P.map(p => [c[0], c[1] + '.' + p]))));
    for (const [h, k] of tk) { const a = M.analyze(fw(h)), ok = !!(a.tbl && a.tbl[k]); ok ? pass++ : fail++; if (!ok) console.log('FAIL lesson table cell', l.id, h, k); }
    if (l.pick) { const n = WL.filter(w => { const a = M.analyze(w); if (a.skip || a.flag || a.kind !== l.pick.kind) return false; if (a.kind === 'noun') return a.decl === l.pick.decl && (l.pick.istem == null || a.istem === l.pick.istem); if (a.kind === 'adj') return a.decl === l.pick.decl; return l.pick.irr ? l.pick.irr.includes(a.irr) : a.conj === l.pick.conj; }).length;
      const ok = n >= 3; ok ? pass++ : fail++; if (!ok) console.log('FAIL lesson pool too small', l.id, n); }
  }
}
// every drillable word: no empty / undefined forms, labels resolve
let words = 0;
for (const e of W.filter(x => !x.d)) { const a = M.analyze(e); if (a.skip || !a.tbl) continue; words++;
  for (const k in a.tbl) { const bad = !a.tbl[k].length || a.tbl[k].some(f => !f || /undefined|null|NaN/.test(f)) || /undefined/.test(M.label(a.kind, k)); if (bad) { fail++; console.log('FAIL bad cell', e.la, k, a.tbl[k]); } } }
pass++;
t('exorior', 'ptc.dep.perf', 'exortus'); t('exorior', 'sup.um', 'exortum');   // "-ortus sum" matches the stem, not the -or ending
// accuracy fixes (v15): prefix-glued principal parts, dea, alterius, vīs, dēsum
t('quaerō', 'perf.1s', 'quaesīvī'); t('quaerō', 'sup.um', 'quaesītum'); t('quaerō', 'ptc.pas.perf', 'quaesītus'); t('quaerō', 'ptc.act.fut', 'quaesītūrus');
t('requīrō', 'perf.1s', 'requīsīvī'); t('requīrō', 'ptc.pas.perf', 'requīsītus');
t('contemnō', 'perf.1s', 'contempsī'); t('contemnō', 'plup.3s', 'contempserat'); t('contemnō', 'ptc.pas.perf', 'contemptus');
t('adsum', 'perf.1s', 'adfuī'); t('adsum', 'ptc.act.fut', 'adfutūrus'); t('adsum', 'pres.3s', 'adest');
t('dēsum', 'pres.3s', 'deest'); t('dēsum', 'impf.1s', 'deeram'); t('dēsum', 'inf.act.pres', 'deesse'); t('dēsum', 'pres.1s', 'dēsum'); t('dēsum', 'perf.1s', 'dēfuī');
t('dea', 'dat.pl', 'deābus'); t('dea', 'abl.pl', 'deābus');
{ const [, a] = find('dea'); const ok = a.tbl['dat.pl'].includes('deīs') && a.tbl['abl.pl'].includes('deīs'); ok ? pass++ : fail++; if (!ok) console.log('FAIL dea keeps deīs', a.tbl['dat.pl']); }
{ const [, a] = find('alter'); const ok = ['m', 'f', 'n'].every(g => a.tbl[g + '.gen.sg'].join() === 'alterīus,alterius'); ok ? pass++ : fail++; if (!ok) console.log('FAIL alter gen.sg', a.tbl['m.gen.sg']); }
{ const [, a] = find('vīs'); const ok = !a.tbl['gen.sg'] && a.tbl['nom.sg'][0] === 'vīs' && a.tbl['acc.sg'][0] === 'vim'; ok ? pass++ : fail++; if (!ok) console.log('FAIL vīs gen.sg hidden', a.tbl['gen.sg']); }
// v16: personal pronouns (A&G 143), hic / ille (A&G 146), and the senex / arcus / castellum fixes
const PR = [
  ['egō', 'nom.sg', 'ego'], ['egō', 'gen.sg', 'meī'], ['egō', 'dat.sg', 'mihi'], ['egō', 'acc.sg', 'mē'], ['egō', 'abl.sg', 'mē'],
  ['tū', 'nom.sg', 'tū'], ['tū', 'gen.sg', 'tuī'], ['tū', 'dat.sg', 'tibi'], ['tū', 'acc.sg', 'tē'], ['tū', 'abl.sg', 'tē'],
  ['nōs', 'nom.pl', 'nōs'], ['nōs', 'gen.pl', 'nostrum'], ['nōs', 'dat.pl', 'nōbīs'], ['nōs', 'acc.pl', 'nōs'], ['nōs', 'abl.pl', 'nōbīs'],
  ['vōs', 'nom.pl', 'vōs'], ['vōs', 'gen.pl', 'vestrum'], ['vōs', 'dat.pl', 'vōbīs'], ['vōs', 'acc.pl', 'vōs'], ['vōs', 'abl.pl', 'vōbīs'],
  ['senex', 'gen.sg', 'senis'], ['senex', 'acc.sg', 'senem'], ['senex', 'abl.sg', 'sene'], ['senex', 'nom.pl', 'senēs'], ['senex', 'gen.pl', 'senum'], ['senex', 'dat.pl', 'senibus'], ['senex', 'acc.pl', 'senēs'],
  ['arcus', 'gen.sg', 'arcūs'], ['arcus', 'dat.pl', 'arcubus'], ['arcus', 'abl.pl', 'arcubus'], ['arcus', 'gen.pl', 'arcuum'],
  ['castellum', 'nom.pl', 'castella'], ['castellum', 'acc.pl', 'castella'], ['castellum', 'voc.pl', 'castella'], ['castellum', 'gen.pl', 'castellōrum'], ['castellum', 'acc.sg', 'castellum'],
];
const DEM = {
  hic: { m: [['hic', 'huius', 'huic', 'hunc', 'hōc'], ['hī', 'hōrum', 'hīs', 'hōs', 'hīs']], f: [['haec', 'huius', 'huic', 'hanc', 'hāc'], ['hae', 'hārum', 'hīs', 'hās', 'hīs']], n: [['hoc', 'huius', 'huic', 'hoc', 'hōc'], ['haec', 'hōrum', 'hīs', 'haec', 'hīs']] },
  ille: { m: [['ille', 'illīus', 'illī', 'illum', 'illō'], ['illī', 'illōrum', 'illīs', 'illōs', 'illīs']], f: [['illa', 'illīus', 'illī', 'illam', 'illā'], ['illae', 'illārum', 'illīs', 'illās', 'illīs']], n: [['illud', 'illīus', 'illī', 'illud', 'illō'], ['illa', 'illōrum', 'illīs', 'illa', 'illīs']] },
};
for (const h in DEM) for (const g of ['m', 'f', 'n']) DEM[h][g].forEach((row, i) => row.forEach((f, j) => PR.push([h, `${g}.${M.CASES[j]}.${i ? 'pl' : 'sg'}`, f])));
for (const x of PR) { try { t(...x); } catch (err) { fail++; console.log('ERR', x, err.message); } }
for (const [h, key, inp] of [['nōs', 'gen.pl', 'nostrī'], ['vōs', 'gen.pl', 'vestrī'], ['egō', 'dat.sg', 'mī'], ['egō', 'nom.sg', 'egō']]) { const [e, a] = find(h); const ok = !!(a.tbl && a.tbl[key] && M.check(inp, a.tbl[key], true)); ok ? pass++ : fail++; if (!ok) console.log('FAIL pronoun alt', e.la, key, inp); }
// what must not exist: other numbers of the personal pronouns, vocatives, arcibus, a masculine castellī plural, senexēs
for (const [h, key] of [['egō', 'nom.pl'], ['nōs', 'nom.sg'], ['tū', 'voc.sg'], ['vōs', 'voc.pl'], ['egō', 'voc.sg'], ['hic', 'm.voc.sg'], ['ille', 'n.voc.pl'], ['tū', 'loc.sg']]) { const [e, a] = find(h); const ok = !a.tbl[key]; ok ? pass++ : fail++; if (!ok) console.log('FAIL should not exist', e.la, key, a.tbl[key]); }
{ const [, a] = find('arcus'); const ok = !a.tbl['dat.pl'].includes('arcibus') && !a.tbl['abl.pl'].includes('arcibus'); ok ? pass++ : fail++; if (!ok) console.log('FAIL arcibus', a.tbl['dat.pl']); }
{ const [, a] = find('castellum'); const ok = a.g === 'n' && !Object.values(a.tbl).flat().some(f => /castellī$|castellōs$/.test(f) && f !== 'castellī'); ok ? pass++ : fail++; if (!ok) console.log('FAIL castellum neuter', a.g, a.tbl); }
{ const [, a] = find('senex'); const ok = !Object.values(a.tbl).flat().some(f => /^senex./.test(f)); ok ? pass++ : fail++; if (!ok) console.log('FAIL senex stem', a.tbl); }
{ const [, a] = find('hic'); const ok = a.kind === 'pron' && a.pron === 'dem' && a.headKey === 'm.nom.sg'; ok ? pass++ : fail++; if (!ok) console.log('FAIL hic analysis', a); }
for (const [h, p, n] of [['egō', 1, 'sg'], ['tū', 2, 'sg'], ['nōs', 1, 'pl'], ['vōs', 2, 'pl']]) { const [, a] = find(h); const ok = a.kind === 'pron' && a.pron === 'pers' && a.person === p && a.num === n && a.headKey === 'nom.' + n; ok ? pass++ : fail++; if (!ok) console.log('FAIL pronoun analysis', h, a); }
for (const h of ['mē', 'is', 'quī', 'ipse', 'sē']) { const [, a] = find(h); const ok = !!a.skip; ok ? pass++ : fail++; if (!ok) console.log('FAIL other pronouns stay undrilled', h); }
for (const [k, exp] of [['dat.sg', 'dative singular'], ['n.abl.sg', 'neuter ablative singular']]) { const l = M.label('pron', k); const ok = l === exp; ok ? pass++ : fail++; if (!ok) console.log('FAIL pronoun label', k, l); }
// v19 accuracy release (A&G §201, §203.a; Lewis & Short)
const ok19 = (cond, ...msg) => { cond ? pass++ : fail++; if (!cond) console.log('FAIL v19', ...msg); };
const tb = h => find(h)[1].tbl;
// ex(s)tinguō: L&S headword exstinguō (ext-); both spellings accepted, for exs- words generally
for (const [k, f] of [['ind.act.pres.1s', 'exstinguō'], ['ind.act.perf.1s', 'exstīnxī'], ['ptc.pas.perf', 'exstīnctus'], ['ind.pas.pres.3s', 'exstinguitur'], ['inf.act.pres', 'exstinguere']]) t('ex(s)tinguō', k, f);
for (const [h, k, inp, strict] of [['ex(s)tinguō', 'ind.act.pres.1s', 'extinguō', true], ['ex(s)tinguō', 'ind.act.pres.1s', 'exstinguo', false], ['ex(s)tinguō', 'ind.pas.perf.3p', 'extīnctae sunt', true], ['ex(s)tinguō', 'ind.act.perf.1s', 'extinxi', false],
  ['exsistō', 'ind.act.pres.1s', 'existō', true], ['exspectō', 'ind.act.pres.1s', 'expectō', true]]) ok19(M.check(inp, tb(h)[k], strict), 'exs- variant', h, k, inp);
ok19(!M.check('exspellō', tb('expellō')['ind.act.pres.1s']), 'no s added to expellō');
// edō: A&G §201 root forms
for (const [k, f] of [['ind.act.pres.2s', 'ēs'], ['ind.act.pres.3s', 'ēst'], ['ind.act.pres.2p', 'ēstis'], ['ind.pas.pres.3s', 'ēstur'], ['sub.pas.impf.3s', 'ēssētur'], ['inf.act.pres', 'ēsse'], ['sub.act.impf.1s', 'ēssem'], ['sub.act.impf.3p', 'ēssent'], ['imp.act.pres.2s', 'ēs'], ['imp.act.pres.2p', 'ēste'], ['imp.act.fut.2s', 'ēstō'], ['imp.act.fut.2p', 'ēstōte']])
  ok19(M.check(f, tb('edō')[k], true), 'edō alt', k, f, tb('edō')[k]);
for (const [k, f] of [['ind.act.pres.2s', 'edis'], ['ind.act.pres.3s', 'edit'], ['ind.pas.pres.3s', 'editur'], ['inf.act.pres', 'edere'], ['ptc.pas.perf', 'ēsus'], ['ptc.act.fut', 'ēsūrus']]) t('edō', k, f);
ok19(!M.check('es', tb('edō')['ind.act.pres.2s'], true) && !M.check('est', tb('edō')['ind.act.pres.3s'], true), 'edō ēs/ēst keep the long e in strict mode');
// ārdeō: intransitive (L&S v. n.); future participle ārsūrus attested (Ov. M. 2, 620; Verg. A. 11, 77)
{ const a = find('ārdeō')[1]; ok19(a.noPassive && !Object.keys(a.tbl).some(k => /\.pas\.|^gdv\./.test(k)), 'ārdeō has no passive / gerundive', Object.keys(a.tbl).filter(k => /\.pas\.|^gdv\./.test(k)));
  ok19(!Object.values(a.tbl).flat().some(f => /^ārsus|^ārs[aī] /.test(f)), 'ārdeō: no ārsus'); }
t('ārdeō', 'ptc.act.fut', 'ārsūrus'); t('ārdeō', 'inf.act.fut', 'ārsūrus esse'); t('ārdeō', 'ind.act.perf.1s', 'ārsī'); t('ārdeō', 'sup.um', 'ārsum');
// pāscō: 3rd conjugation (L&S pasco, 3), no flag
{ const [e, a] = find('pāscō'); ok19(e.la === 'pāscō, -ere, pāvī, pāstum' && a.conj === 3 && !a.flag, 'pāscō 3rd conj', e.la, a.conj, a.flag); }
for (const [k, f] of [['ind.act.pres.2s', 'pāscis'], ['inf.act.pres', 'pāscere'], ['ind.act.fut.1s', 'pāscam'], ['ind.pas.pres.3s', 'pāscitur'], ['ptc.pas.perf', 'pāstus']]) t('pāscō', k, f);
// eō compounds: transitive ones have a passive (A&G §203.a; L&S transeo: Rhodanus vado transitur, Caes. B. G. 1, 6)
for (const [k, f] of [['ind.pas.pres.1s', 'trānseor'], ['ind.pas.pres.2s', 'trānsīris'], ['ind.pas.pres.3s', 'trānsītur'], ['ind.pas.pres.1p', 'trānsīmur'], ['ind.pas.pres.3p', 'trānseuntur'], ['ind.pas.impf.3s', 'trānsībātur'], ['ind.pas.fut.3s', 'trānsībitur'], ['ind.pas.fut.2s', 'trānsīberis'],
  ['sub.pas.pres.3s', 'trānseātur'], ['sub.pas.impf.3s', 'trānsīrētur'], ['inf.pas.pres', 'trānsīrī'], ['ind.pas.perf.3s', 'trānsitus est'], ['ptc.pas.perf', 'trānsitus'], ['inf.pas.fut', 'trānsitum īrī'], ['gdv.m', 'trānseundus']]) t('trānseō', k, f);
for (const [k, f] of [['ind.pas.pres.1s', 'adeor'], ['ind.pas.pres.3s', 'adītur'], ['ind.pas.impf.1s', 'adībar'], ['ind.pas.fut.1s', 'adībor'], ['sub.pas.impf.1s', 'adīrer'], ['ind.pas.perf.1s', 'aditus sum'], ['inf.pas.pres', 'adīrī'], ['gdv.m', 'adeundus']]) t('adeō', k, f);
for (const h of ['ineō', 'obeō', 'praetereō', 'subeō']) ok19(!find(h)[1].noPassive && !!tb(h)['ind.pas.pres.3s'], 'passive for', h);
for (const h of ['eō', 'abeō', 'exeō', 'pereō', 'redeō']) ok19(find(h)[1].noPassive && !tb(h)['ind.pas.pres.3s'] && !tb(h)['gdv.m'], 'no personal passive for', h);
t('trānseō', 'ind.act.pres.3s', 'trānsit'); t('trānseō', 'ind.act.perf.1s', 'trānsiī');
// lavō: L&S lautum, lavātum (class. prose: sup. always lavātum; perf. part. lautus)
t('lavō', 'ptc.pas.perf', 'lautus'); t('lavō', 'ind.pas.perf.3s', 'lautus est'); t('lavō', 'sup.um', 'lavātum');
for (const [k, f] of [['ptc.pas.perf', 'lavātus'], ['ind.pas.perf.3s', 'lavātus est'], ['ind.pas.perf.3p', 'lavātī sunt'], ['inf.pas.perf', 'lavātus esse'], ['sup.um', 'lautum'], ['ptc.act.fut', 'lavātūrus'], ['inf.pas.fut', 'lavātum īrī'], ['ind.pas.perf.3s', 'lavāta est']])
  ok19(M.check(f, tb('lavō')[k], true), 'lavō alt', k, f, tb('lavō')[k]);
// unchanged: adsum, contemnō
for (const [k, f] of [['ind.act.pres.1s', 'adsum'], ['ind.act.pres.3s', 'adest'], ['inf.act.pres', 'adesse'], ['ind.act.perf.1s', 'adfuī'], ['ptc.act.fut', 'adfutūrus'], ['ind.act.impf.1s', 'aderam'], ['sub.act.pres.1s', 'adsim'], ['sub.act.impf.1s', 'adessem']]) t('adsum', k, f);
ok19(find('adsum')[1].noPassive, 'adsum no passive');
for (const [k, f] of [['ind.act.pres.1s', 'contemnō'], ['ind.act.perf.1s', 'contempsī'], ['sup.um', 'contemptum'], ['ptc.pas.perf', 'contemptus'], ['ind.pas.pres.3s', 'contemnitur'], ['gdv.m', 'contemnendus']]) t('contemnō', k, f);
// v20: adsum variants (L&S ad-sum (assum), adfuī (aff-), adfore)
for (const [k, f] of [['ind.act.pres.1s', 'assum'], ['ind.act.pres.1p', 'assumus'], ['ind.act.perf.1s', 'affuī'], ['ind.act.perf.3s', 'affuit'], ['ind.act.perf.3p', 'affuērunt'], ['ind.act.plup.3s', 'affuerat'], ['ind.act.fperf.1s', 'affuerō'], ['sub.act.perf.3s', 'affuerit'], ['sub.act.plup.3s', 'affuisset'], ['inf.act.perf', 'affuisse'], ['inf.act.fut', 'adfore'], ['inf.act.fut', 'affore'], ['inf.act.fut', 'affutūrus esse'], ['ptc.act.fut', 'affutūrus']])
  ok19(M.check(f, tb('adsum')[k], true), 'adsum alt', k, f, tb('adsum')[k]);
for (const [k, f] of [['ind.act.pres.1s', 'adsum'], ['ind.act.pres.1p', 'adsumus'], ['ind.act.perf.1s', 'adfuī'], ['ind.act.plup.3s', 'adfuerat'], ['inf.act.perf', 'adfuisse'], ['inf.act.fut', 'adfutūrus esse'], ['ptc.act.fut', 'adfutūrus']]) t('adsum', k, f);
ok19(!M.check('assum', tb('sum')['ind.act.pres.1s']) && !M.check('affuī', tb('absum')['ind.act.perf.1s'] || []), 'variants stay on adsum');
// v21: part of speech follows the word, not the Diederich section (s/ss unchanged)
{ const fs = require('fs'), HEAD = process.env.WORDS_HEAD, OLD = HEAD && fs.existsSync(HEAD) ? require(HEAD) : null;   // optional: words.json from before v21
  const SECT = { 1496: '8.1', 1494: '8.1', 1506: '8.1', 1475: '8.1', 1478: '8.1', 1510: '8.1', 1511: '8.1', 1514: '8.1', 1515: '8.1', 1516: '8.1', 1517: '8.1', 1453: '7.1', 464: '1.23', 784: '3.3', 1125: '4.1', 1140: '4.1', 1152: '4.2', 1178: '4.2', 1251: '4.7', 1280: '4.7', 1314: '4.8', 604: '3.1', 470: '1.23', 501: '2.1', 1420: '5.4', 1421: '5.4', 1435: '6.1', 1436: '6.1', 1452: '7.1' };   // Diederich section.subsection, unchanged
  const POS = { 1496: 'verb', 1494: 'adjective', 1506: 'adjective', 1475: 'adverb', 1478: 'adverb', 1510: 'adverb', 1511: 'conjunction', 1514: 'prefix', 1515: 'prefix', 1516: 'prefix', 1517: 'prefix', 1453: 'pronoun',
    464: 'adverb', 784: 'adverb', 1125: 'adverb', 1140: 'adverb', 1152: 'adverb', 1178: 'adverb', 1251: 'adverb', 1280: 'adverb', 1314: 'adverb', 604: 'preposition', 470: 'pronoun', 501: 'adverb', 1420: 'conjunction', 1421: 'conjunction', 1435: 'adverb', 1436: 'adverb', 1452: 'adverb' };
  for (const [id, p] of Object.entries(POS)) ok19(W[id].pos === p, 'pos', id, W[id].la, W[id].pos, p);
  for (const [id, x] of Object.entries(SECT)) ok19(W[id].s + '.' + W[id].ss === x, 'section kept', id, W[id].la, W[id].s, W[id].ss);
  if (OLD) for (const e of W) { const o = OLD[e.id]; ok19(o && o.s === e.s && o.ss === e.ss && o.la === e.la && o.en === e.en && (POS[e.id] || o.pos) === e.pos, 'only pos changed', e.id, e.la); }
  const drilled = e => ['verb', 'noun', 'adjective', 'pronoun'].includes(e.pos) && !M.analyze(e).skip;
  for (const id of [1494, 1496, 1506]) ok19(drilled(W[id]), 'now drilled', W[id].la);
  ok19(W[1453].pos === W[517].pos, 'quīdam matches its section-2 entry');
  const by = id => M.analyze(W[id]).tbl, tt = (id, k, f) => ok19((by(id)[k] || [])[0] === f, W[id].la, k, f, by(id)[k]);
  ok19(M.analyze(W[1496]).conj === 1 && !M.analyze(W[1496]).noPassive && !M.analyze(W[1496]).flag, 'superō 1st conj, transitive');
  for (const [k, f] of [['ind.act.pres.1s', 'superō'], ['ind.act.pres.3s', 'superat'], ['inf.act.pres', 'superāre'], ['ind.act.perf.1s', 'superāvī'], ['sup.um', 'superātum'], ['ind.act.impf.3p', 'superābant'], ['ind.act.fut.3s', 'superābit'],
    ['ind.pas.pres.3s', 'superātur'], ['ind.pas.perf.3s', 'superātus est'], ['ptc.pas.perf', 'superātus'], ['sub.act.pres.3s', 'superet'], ['gdv.m', 'superandus']]) tt(1496, k, f);
  // comparatives, A&G §120: -ior, -ius; gen. -iōris; abl. -iōre; n. pl. -iōra; gen. pl. -iōrum
  for (const [id, st] of [[1494, 'superi'], [1506, 'ulteri']]) {
    ok19(M.analyze(W[id]).kind === 'adj', 'comparative adj', W[id].la);
    for (const [k, end] of [['m.nom.sg', 'or'], ['f.nom.sg', 'or'], ['n.nom.sg', 'us'], ['n.acc.sg', 'us'], ['m.acc.sg', 'ōrem'], ['m.gen.sg', 'ōris'], ['m.dat.sg', 'ōrī'], ['m.abl.sg', 'ōre'],
      ['m.nom.pl', 'ōrēs'], ['m.acc.pl', 'ōrēs'], ['n.nom.pl', 'ōra'], ['n.acc.pl', 'ōra'], ['m.gen.pl', 'ōrum'], ['f.dat.pl', 'ōribus']]) tt(id, k, st + end);
    ok19(!M.check(st + 'ius', by(id)['m.nom.sg']) && !M.check(st + 'ōrium', by(id)['m.gen.pl']), 'comparative not i-stem', W[id].la);
  }
}
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
