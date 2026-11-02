// Spot-check generated forms against standard paradigms (Allen & Greenough / Wheelock).
const M = require('../morph.js'); const W = require('../data/words.json');
const find = h => { const e = W.find(x => M.plain(x.la.split(/[ ,]/)[0]) === M.plain(h)); if (!e) throw new Error('missing ' + h); return [e, M.analyze(e)]; };
let pass = 0, fail = 0;
function t(h, key, exp) {
  const [e, a] = find(h);
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
for (const x of [...V, ...N, ...A]) { try { t(...x); } catch (err) { fail++; console.log('ERR', x, err.message); } }
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
