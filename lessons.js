/* Latin 1400 — short grammar lessons for the Learn tab.
   Tables and quick checks are built from the morphology generator (morph.js) at run time;
   this file holds only the prose, which words to show, and which drills to preset.
   `facts` lists every Latin form quoted in the prose; tools/test_morph.js checks each one against the generator. */
(function (root) {
  'use strict';
  const L = [
    // ---------- cases ----------
    { id: 'cases', sec: 'Start here', title: 'What the cases do',
      sum: 'Why Latin nouns change their endings.',
      body: `<p>In English, word order shows who does what: “the master gives the girl a rose.” Latin shows it with <b>endings</b> instead. Each ending marks a <b>case</b>, and the case tells you the word’s job in the sentence. Word order is free, so always read the endings.</p>
<p><i>Dominus puellae rosam dat.</i> “The master gives the girl a rose.” <i>dominus</i> is nominative (the subject), <i>puellae</i> is dative (to whom), <i>rosam</i> is accusative (the object), and <i>dat</i> is the verb.</p>
<ul class="ll">
<li><b>Nominative</b>: the subject (“<i>the girl</i> sings”), and a noun after “is” (“she is <i>a girl</i>”).</li>
<li><b>Genitive</b>: “of” — possession and belonging (“the house <i>of the girl</i>”, “<i>the girl’s</i> house”).</li>
<li><b>Dative</b>: “to / for” — the indirect object (“he gives a rose <i>to the girl</i>”).</li>
<li><b>Accusative</b>: the direct object (“he sees <i>the girl</i>”); also after prepositions like <i>ad</i> “to(ward)”, <i>in</i> “into”, <i>per</i> “through”.</li>
<li><b>Ablative</b>: “by / with / from / in / at” — means, manner, time, place; also after <i>cum</i> “with”, <i>ā / ab</i> “from”, <i>ē / ex</i> “out of”, <i>in</i> “in, on”, <i>dē</i> “about, down from”.</li>
<li><b>Vocative</b>: calling someone (“<i>Master</i>, come here!”). Usually the same as the nominative; 2nd-declension <i>-us</i> nouns use <i>-e</i>: <i>domine</i>.</li>
<li><b>Locative</b>: “at / in” a place, for cities and a few words such as <i>domus</i>: <i>domī</i> “at home”, <i>rūrī</i> “in the country”.</li>
</ul>
<p>Each case has a singular and a plural form, so a noun has up to 14 forms. The five <b>declensions</b> (next lessons) are five sets of endings; a noun’s genitive singular tells you which set it uses.</p>`,
      tables: [{ t: 'rows', title: 'The cases of puella (girl)', rows: [
        ['nominative', 'puella', 'nom.sg', 'the girl (subject)'], ['genitive', 'puella', 'gen.sg', 'of the girl, the girl’s'], ['dative', 'puella', 'dat.sg', 'to / for the girl'],
        ['accusative', 'puella', 'acc.sg', 'the girl (object)'], ['ablative', 'puella', 'abl.sg', 'by / with / from the girl'], ['vocative', 'puella', 'voc.sg', 'O girl!'], ['locative', 'domus', 'loc.sg', 'at home']] }],
      ex: ['puella', 'dominus', 'rosa'],
      facts: [['dominus', 'nom.sg', 'dominus'], ['puella', 'dat.sg', 'puellae'], ['rosa', 'acc.sg', 'rosam'], ['dō', 'ind.act.pres.3s', 'dat'], ['dominus', 'voc.sg', 'domine'], ['domus', 'loc.sg', 'domī'], ['rūs', 'loc.sg', 'rūrī']],
      quiz: { t: 'mc', qs: [
        ['Which case marks the subject of the sentence?', ['nominative', 'genitive', 'accusative', 'ablative'], 0],
        ['“of the girl” or “the girl’s” — which case?', ['dative', 'genitive', 'ablative', 'vocative'], 1],
        ['“to / for the girl” — which case?', ['accusative', 'ablative', 'dative', 'nominative'], 2],
        ['The direct object (“he sees the girl”) — which case?', ['nominative', 'dative', 'genitive', 'accusative'], 3],
        ['“by / with / from the girl” — which case?', ['ablative', 'genitive', 'accusative', 'dative'], 0]] } },

    // ---------- nouns ----------
    { id: 'n1', sec: 'Nouns', title: '1st declension', sum: 'Nouns in -a, genitive -ae.',
      body: `<p>The 1st declension is the <i>-a</i> family. Most of its nouns are feminine (<i>puella</i> “girl”, <i>terra</i> “land”), but nouns for men’s roles are masculine (<i>poēta</i> “poet”, <i>agricola</i> “farmer”).</p>
<p><b>How to spot it:</b> the dictionary entry ends <i>-a, -ae</i> (nominative <i>-a</i>, genitive <i>-ae</i>).</p>
<p><b>Watch out:</b> <i>-ae</i> can be genitive singular, dative singular, or nominative plural; <i>-īs</i> is both dative and ablative plural. Context (and the verb) decides. The ablative <i>-ā</i> has a long ā; the nominative <i>-a</i> is short.</p>`,
      tables: [{ t: 'noun', h: 'puella' }], pick: { kind: 'noun', decl: 1 },
      facts: [['puella', 'gen.sg', 'puellae'], ['puella', 'dat.sg', 'puellae'], ['puella', 'nom.pl', 'puellae'], ['puella', 'dat.pl', 'puellīs'], ['puella', 'abl.pl', 'puellīs'], ['puella', 'abl.sg', 'puellā'], ['poēta', 'gen.sg', 'poētae'], ['agricola', 'gen.sg', 'agricolae']],
      quiz: { t: 'form' }, drill: { types: ['noun'], decl: ['1'] } },
    { id: 'n2', sec: 'Nouns', title: '2nd declension', sum: 'Masculine -us / -er and neuter -um, genitive -ī.',
      body: `<p>The 2nd declension has masculine nouns in <i>-us</i> (<i>dominus</i> “master”) or <i>-er</i> (<i>puer</i> “boy”, <i>ager</i> “field”) and neuter nouns in <i>-um</i> (<i>bellum</i> “war”).</p>
<p><b>How to spot it:</b> genitive singular <i>-ī</i>: <i>dominus, -ī</i>; <i>bellum, -ī</i>. With <i>-er</i> nouns the genitive shows whether the e stays (<i>puer, puerī</i>) or drops (<i>ager, agrī</i>).</p>
<p><b>Neuter rule</b> (true in every declension): the nominative and accusative are the same, and the nominative/accusative plural ends in <i>-a</i>: <i>bella</i>.</p>
<p><b>Vocative:</b> <i>-us</i> nouns use <i>-e</i> (<i>domine</i>); <i>-ius</i> nouns use <i>-ī</i> (<i>fīlī</i>).</p>`,
      tables: [{ t: 'noun', h: 'dominus' }, { t: 'noun', h: 'puer', note: 'e stays' }, { t: 'noun', h: 'ager', note: 'e drops' }, { t: 'noun', h: 'bellum', note: 'neuter' }], pick: { kind: 'noun', decl: 2 },
      facts: [['dominus', 'gen.sg', 'dominī'], ['bellum', 'gen.sg', 'bellī'], ['puer', 'gen.sg', 'puerī'], ['ager', 'gen.sg', 'agrī'], ['bellum', 'nom.pl', 'bella'], ['bellum', 'acc.pl', 'bella'], ['dominus', 'voc.sg', 'domine'], ['fīlius', 'voc.sg', 'fīlī']],
      quiz: { t: 'form' }, drill: { types: ['noun'], decl: ['2'] } },
    { id: 'n3', sec: 'Nouns', title: '3rd declension', sum: 'Any nominative, genitive -is.',
      body: `<p>The 3rd declension is the biggest family and has all three genders. The nominative can look like almost anything (<i>rēx</i> “king”, <i>nōmen</i> “name”, <i>corpus</i> “body”), so always learn the genitive with it.</p>
<p><b>How to spot it:</b> genitive singular <i>-is</i>. Drop <i>-is</i> to find the stem the other endings attach to: <i>rēx, rēgis</i> → <i>rēg-</i>; <i>nōmen, nōminis</i> → <i>nōmin-</i>.</p>
<p><b>Neuters</b> follow the neuter rule: nominative = accusative (<i>nōmen</i>), and the plural ends in <i>-a</i> (<i>nōmina</i>).</p>
<p>Some 3rd-declension nouns are <b>i-stems</b> with a few different endings; they get their own lesson next.</p>`,
      tables: [{ t: 'noun', h: 'rēx' }, { t: 'noun', h: 'nōmen', note: 'neuter' }], pick: { kind: 'noun', decl: 3, istem: false },
      facts: [['rēx', 'gen.sg', 'rēgis'], ['nōmen', 'gen.sg', 'nōminis'], ['nōmen', 'acc.sg', 'nōmen'], ['nōmen', 'nom.pl', 'nōmina'], ['corpus', 'gen.sg', 'corporis']],
      quiz: { t: 'form' }, drill: { types: ['noun'], decl: ['3'] } },
    { id: 'n3i', sec: 'Nouns', title: '3rd declension i-stems', sum: 'Genitive plural -ium, and a few more i’s.',
      body: `<p>Many 3rd-declension nouns are <b>i-stems</b>: they decline like <i>rēx</i> but slip an <i>i</i> into a few endings.</p>
<p><b>How to spot them:</b></p>
<ul class="ll"><li>Nominative <i>-is</i> or <i>-ēs</i> with the same number of syllables as the genitive: <i>cīvis, cīvis</i> “citizen”.</li>
<li>One-syllable nouns whose stem ends in two consonants: <i>urbs, urbis</i> “city”; <i>mōns, montis</i> “mountain”.</li>
<li>Neuters in <i>-e, -al, -ar</i>: <i>mare</i> “sea”, <i>animal</i> “animal”.</li></ul>
<p><b>What changes:</b> genitive plural <i>-ium</i> (<i>cīvium, urbium</i>); masculine and feminine nouns may have accusative plural <i>-īs</i> as well as <i>-ēs</i>. Neuter i-stems also have ablative singular <i>-ī</i> and nominative/accusative plural <i>-ia</i> (<i>marī, maria</i>; <i>animālī, animālia</i>).</p>
<p><b>Exceptions:</b> <i>pater</i>, <i>māter</i>, <i>frāter</i> look like they should be i-stems but are not: <i>patrum</i>.</p>`,
      tables: [{ t: 'noun', h: 'cīvis' }, { t: 'noun', h: 'urbs' }, { t: 'noun', h: 'mare', note: 'neuter' }], pick: { kind: 'noun', decl: 3, istem: true },
      facts: [['cīvis', 'gen.sg', 'cīvis'], ['cīvis', 'gen.pl', 'cīvium'], ['urbs', 'gen.pl', 'urbium'], ['mōns', 'gen.sg', 'montis'], ['cīvis', 'acc.pl', 'cīvīs'], ['cīvis', 'acc.pl', 'cīvēs'], ['mare', 'abl.sg', 'marī'], ['mare', 'nom.pl', 'maria'], ['animal', 'abl.sg', 'animālī'], ['animal', 'nom.pl', 'animālia'], ['pater', 'gen.pl', 'patrum']],
      quiz: { t: 'form' }, drill: { types: ['noun'], decl: ['3'] } },
    { id: 'n4', sec: 'Nouns', title: '4th declension', sum: 'Nouns in -us with genitive -ūs, and neuters in -ū.',
      body: `<p>The 4th declension is the <i>u</i> family. Most of its nouns are masculine in <i>-us</i> (<i>exercitus</i> “army”); a few are feminine (<i>manus</i> “hand”), and a few neuters end in <i>-ū</i> (<i>cornū</i> “horn”).</p>
<p><b>How to spot it:</b> genitive singular <i>-ūs</i>. That is how you tell <i>manus, -ūs</i> (4th) from <i>dominus, -ī</i> (2nd): the nominatives look alike.</p>
<p>Several endings share <i>-ūs</i> (genitive singular, nominative and accusative plural), so check the vowel length and context. <i>domus</i> “house” mixes 2nd and 4th endings (ablative <i>domō</i>, locative <i>domī</i>).</p>`,
      tables: [{ t: 'noun', h: 'manus' }, { t: 'noun', h: 'cornū', note: 'neuter' }], pick: { kind: 'noun', decl: 4 },
      facts: [['manus', 'gen.sg', 'manūs'], ['manus', 'nom.pl', 'manūs'], ['manus', 'acc.pl', 'manūs'], ['exercitus', 'gen.sg', 'exercitūs'], ['cornū', 'nom.sg', 'cornū'], ['domus', 'abl.sg', 'domō'], ['domus', 'loc.sg', 'domī']],
      quiz: { t: 'form' }, drill: { types: ['noun'], decl: ['4'] } },
    { id: 'n5', sec: 'Nouns', title: '5th declension', sum: 'Nouns in -ēs, genitive -eī / -ēī.',
      body: `<p>The 5th declension is small but contains some very common words: <i>rēs</i> “thing, matter”, <i>diēs</i> “day”, <i>spēs</i> “hope”, <i>fidēs</i> “trust”. They are feminine except <i>diēs</i>, which is usually masculine.</p>
<p><b>How to spot it:</b> nominative <i>-ēs</i> with genitive <i>-eī</i> (<i>rēs, reī</i>) or <i>-ēī</i> after a vowel (<i>diēs, diēī</i>). The <i>e</i> runs through every ending.</p>
<p><b>Watch out:</b> <i>rēs</i> is also the nominative and accusative plural. <i>rēs</i> takes its meaning from context: <i>rēs pūblica</i> “the state”, <i>rēs gestae</i> “deeds”.</p>`,
      tables: [{ t: 'noun', h: 'rēs' }, { t: 'noun', h: 'diēs' }], pick: { kind: 'noun', decl: 5 },
      facts: [['rēs', 'gen.sg', 'reī'], ['diēs', 'gen.sg', 'diēī'], ['rēs', 'nom.pl', 'rēs'], ['rēs', 'acc.pl', 'rēs'], ['spēs', 'gen.sg', 'speī']],
      quiz: { t: 'form' }, drill: { types: ['noun'], decl: ['5'] } },

    // ---------- adjectives ----------
    { id: 'a12', sec: 'Adjectives', title: '1st/2nd-declension adjectives', sum: 'bonus, bona, bonum.',
      body: `<p>An adjective <b>agrees</b> with its noun in gender, number, and case. To do that it needs all three genders. <i>bonus, bona, bonum</i> “good” uses 2nd-declension endings for masculine and neuter, and 1st-declension endings for feminine.</p>
<p><b>How to spot it:</b> the dictionary lists three nominatives: <i>-us, -a, -um</i>, or <i>-er, -(e)ra, -(e)rum</i>: <i>līber, lībera</i> “free” keeps the e; <i>pulcher, pulchra</i> “beautiful” drops it.</p>
<p><b>Agreement is not rhyme:</b> <i>agricola bonus</i> “a good farmer” — <i>agricola</i> is a masculine 1st-declension noun, so the adjective is masculine.</p>
<p><b>A few pronoun-like adjectives</b> (<i>tōtus, sōlus, ūnus, nūllus</i> and others) have genitive <i>-īus</i> and dative <i>-ī</i> in the singular: <i>tōtīus, tōtī</i>.</p>`,
      tables: [{ t: 'adj', h: 'bonus' }], pick: { kind: 'adj', decl: '1/2' },
      facts: [['bonus', 'f.nom.sg', 'bona'], ['bonus', 'n.nom.sg', 'bonum'], ['līber', 'f.nom.sg', 'lībera'], ['pulcher', 'f.nom.sg', 'pulchra'], ['tōtus', 'm.gen.sg', 'tōtīus'], ['tōtus', 'm.dat.sg', 'tōtī']],
      quiz: { t: 'form' }, drill: { types: ['adj'], decl: ['1', '2'] } },
    { id: 'a3', sec: 'Adjectives', title: '3rd-declension adjectives', sum: 'omnis, omne; ingēns, ingentis.',
      body: `<p>3rd-declension adjectives use 3rd-declension endings in all genders. Masculine and feminine are almost always the same.</p>
<p><b>How to spot them:</b> by the dictionary entry —</p>
<ul class="ll"><li>two endings: <i>omnis, omne</i> “all, every” (m./f. <i>omnis</i>, n. <i>omne</i>)</li>
<li>three endings: <i>ācer, ācris, ācre</i> “sharp”</li>
<li>one ending + genitive: <i>ingēns, ingentis</i> “huge”</li></ul>
<p><b>They are i-stems:</b> ablative singular <i>-ī</i>, genitive plural <i>-ium</i>, neuter plural <i>-ia</i> (<i>omnī, omnium, omnia</i>). Comparatives like <i>melior, melius</i> “better” are the exception: ablative <i>meliōre</i>, genitive plural <i>meliōrum</i>, neuter plural <i>meliōra</i>.</p>`,
      tables: [{ t: 'adj', h: 'omnis' }, { t: 'adj', h: 'ingēns' }], pick: { kind: 'adj', decl: 3 },
      facts: [['omnis', 'n.nom.sg', 'omne'], ['ācer', 'f.nom.sg', 'ācris'], ['ācer', 'n.nom.sg', 'ācre'], ['ingēns', 'm.gen.sg', 'ingentis'], ['omnis', 'm.abl.sg', 'omnī'], ['omnis', 'm.gen.pl', 'omnium'], ['omnis', 'n.nom.pl', 'omnia'], ['melior', 'n.nom.sg', 'melius'], ['melior', 'm.abl.sg', 'meliōre'], ['melior', 'm.gen.pl', 'meliōrum'], ['melior', 'n.nom.pl', 'meliōra']],
      quiz: { t: 'form' }, drill: { types: ['adj'], decl: ['3'] } },

    // ---------- verb basics ----------
    { id: 'tense', sec: 'Verb basics', title: 'Person, number, and tense', sum: 'Who is acting, and when.',
      body: `<p>A Latin verb’s ending tells you <b>who</b> is acting (person and number), so the pronoun is usually left out: <i>amō</i> “I love”, <i>amās</i> “you love”, <i>amat</i> “he / she / it loves”, <i>amāmus</i> “we love”, <i>amātis</i> “you (all) love”, <i>amant</i> “they love”.</p>
<p>Memorize the personal endings: <b>-ō / -m, -s, -t, -mus, -tis, -nt</b>. They appear in almost every tense.</p>
<p><b>Tense</b> tells you <b>when</b>, and whether the action is ongoing or completed. There are six:</p>
<ul class="ll"><li><b>Present system</b> (built on the present stem, <i>amā-</i>): present, imperfect (<i>-ba-</i>: ongoing or repeated past), future (<i>-bi-</i> in the 1st and 2nd conjugations; <i>-a- / -e-</i> in the others).</li>
<li><b>Perfect system</b> (built on the perfect stem from the 3rd principal part, <i>amāv-</i>): perfect (completed past), pluperfect (<i>-era-</i>: “had”), future perfect (<i>-eri-</i>: “will have”). These endings are the same for every verb.</li></ul>`,
      tables: [{ t: 'rows', title: 'amō, 3rd person singular', rows: [
        ['present', 'amō', 'ind.act.pres.3s', 'she loves, is loving'], ['imperfect', 'amō', 'ind.act.impf.3s', 'she was loving, used to love'], ['future', 'amō', 'ind.act.fut.3s', 'she will love'],
        ['perfect', 'amō', 'ind.act.perf.3s', 'she loved, has loved'], ['pluperfect', 'amō', 'ind.act.plup.3s', 'she had loved'], ['future perfect', 'amō', 'ind.act.fperf.3s', 'she will have loved']] }],
      ex: ['amō', 'videō', 'faciō'],
      facts: [['amō', 'ind.act.pres.1s', 'amō'], ['amō', 'ind.act.pres.2s', 'amās'], ['amō', 'ind.act.pres.3s', 'amat'], ['amō', 'ind.act.pres.1p', 'amāmus'], ['amō', 'ind.act.pres.2p', 'amātis'], ['amō', 'ind.act.pres.3p', 'amant'], ['amō', 'ind.act.perf.1s', 'amāvī']],
      quiz: { t: 'tense' } },
    { id: 'voice', sec: 'Verb basics', title: 'Voice: active, passive, deponent', sum: 'Doing the action, or receiving it.',
      body: `<p><b>Active</b>: the subject does the action. <i>amat</i> “she loves”.</p>
<p><b>Passive</b>: the subject receives the action. <i>amātur</i> “she is loved”. The doer, if named, is in the ablative with <i>ā / ab</i>: <i>ā patre amātur</i> “she is loved by her father”.</p>
<p><b>How to spot the passive:</b> in the present system the personal endings change to <b>-r, -ris, -tur, -mur, -minī, -ntur</b> (<i>amor, amāris, amātur, amāmur, amāminī, amantur</i>). In the perfect system it is two words: the perfect passive participle + a form of <i>sum</i> (<i>amātus est</i> “he was loved, has been loved”).</p>
<p><b>Deponent verbs</b> have passive forms but active meanings: <i>hortor</i> “I encourage”, <i>hortātur</i> “he encourages”, <i>hortātus est</i> “he encouraged”. You can recognize them in the dictionary because their principal parts are passive: <i>hortor, hortārī, hortātus sum</i>.</p>`,
      tables: [{ t: 'cmp', title: 'amō, present', cols: [['amō', 'ind.act.pres', 'active'], ['amō', 'ind.pas.pres', 'passive']] }],
      ex: ['amō', 'hortor', 'sequor'],
      facts: [['amō', 'ind.act.pres.3s', 'amat'], ['amō', 'ind.pas.pres.1s', 'amor'], ['amō', 'ind.pas.pres.2s', 'amāris'], ['amō', 'ind.pas.pres.3s', 'amātur'], ['amō', 'ind.pas.pres.1p', 'amāmur'], ['amō', 'ind.pas.pres.2p', 'amāminī'], ['amō', 'ind.pas.pres.3p', 'amantur'], ['amō', 'ind.pas.perf.3s', 'amātus est'], ['hortor', 'ind.dep.pres.1s', 'hortor'], ['hortor', 'ind.dep.pres.3s', 'hortātur'], ['hortor', 'ind.dep.perf.3s', 'hortātus est'], ['hortor', 'inf.dep.pres', 'hortārī']],
      quiz: { t: 'voice' } },
    { id: 'mood', sec: 'Verb basics', title: 'Mood', sum: 'Fact, possibility, or command.',
      body: `<p><b>Mood</b> tells you how the speaker presents the action.</p>
<ul class="ll"><li><b>Indicative</b>: facts and real questions. <i>amat</i> “she loves”. This is the mood of the main verb in most sentences.</li>
<li><b>Subjunctive</b>: wishes, possibilities, commands to a third person, and many kinds of “that / so that / if / since / when” clauses. <i>amet</i> “may she love, let her love”; <i>ut amet</i> “so that she may love”. <b>Spot it</b> by the vowel change in the present (1st conj. <i>-e-</i>: <i>amet</i>; others <i>-a-</i>: <i>moneat, regat, audiat</i>) or the infinitive + ending in the imperfect (<i>amāret, regeret</i>).</li>
<li><b>Imperative</b>: direct commands. <i>amā!</i> “love!” (to one person), <i>amāte!</i> (to several).</li></ul>
<p><b>Not moods, strictly:</b> the <b>infinitive</b> (<i>amāre</i> “to love”) and the <b>participle</b>, a verbal adjective (<i>amāns</i> “loving”, <i>amātus</i> “loved”). They show no person.</p>`,
      tables: [{ t: 'rows', title: 'amō in each mood', rows: [
        ['indicative', 'amō', 'ind.act.pres.3s', 'she loves'], ['subjunctive', 'amō', 'sub.act.pres.3s', 'may she love, let her love'], ['subjunctive (impf.)', 'amō', 'sub.act.impf.3s', 'she would love'],
        ['imperative', 'amō', 'imp.act.pres.2s', 'love! (one person)'], ['imperative', 'amō', 'imp.act.pres.2p', 'love! (several)'], ['infinitive', 'amō', 'inf.act.pres', 'to love'], ['participle', 'amō', 'ptc.act.pres', 'loving']] }],
      ex: ['amō', 'regō', 'audiō'],
      facts: [['amō', 'sub.act.pres.3s', 'amet'], ['moneō', 'sub.act.pres.3s', 'moneat'], ['regō', 'sub.act.pres.3s', 'regat'], ['audiō', 'sub.act.pres.3s', 'audiat'], ['amō', 'sub.act.impf.3s', 'amāret'], ['regō', 'sub.act.impf.3s', 'regeret'], ['amō', 'imp.act.pres.2s', 'amā'], ['amō', 'imp.act.pres.2p', 'amāte'], ['amō', 'inf.act.pres', 'amāre'], ['amō', 'ptc.act.pres', 'amāns'], ['amō', 'ptc.pas.perf', 'amātus']],
      quiz: { t: 'mood' } },

    // ---------- conjugations ----------
    { id: 'v1', sec: 'Verbs', title: '1st conjugation', sum: 'Infinitive -āre: amō, amāre.',
      body: `<p>The 1st conjugation is the <i>ā</i> family, and the most regular.</p>
<p><b>How to spot it:</b> infinitive <i>-āre</i>. Most have principal parts like <i>amō, amāre, amāvī, amātum</i> “love”.</p>
<p>The <i>ā</i> shows in most present forms (<i>amās, amat</i>), except <i>amō</i> and <i>amant</i>. Imperfect <i>-ābam</i>, future <i>-ābō, -ābis, -ābit</i>. The perfect is usually <i>-āvī</i>, but check: <i>dō, dare, dedī</i> (short a) and <i>stō, stāre, stetī</i>.</p>`,
      tables: [{ t: 'verb', h: 'amō' }], pick: { kind: 'verb', conj: 1 },
      facts: [['amō', 'inf.act.pres', 'amāre'], ['amō', 'ind.act.pres.2s', 'amās'], ['amō', 'ind.act.pres.3p', 'amant'], ['amō', 'ind.act.impf.1s', 'amābam'], ['amō', 'ind.act.fut.1s', 'amābō'], ['amō', 'ind.act.fut.2s', 'amābis'], ['amō', 'ind.act.fut.3s', 'amābit'], ['dō', 'inf.act.pres', 'dare'], ['dō', 'ind.act.perf.1s', 'dedī'], ['stō', 'ind.act.perf.1s', 'stetī']],
      quiz: { t: 'form' }, drill: { types: ['verb'], conj: ['1'], moods: ['ind'], voices: ['act', 'dep'] } },
    { id: 'v2', sec: 'Verbs', title: '2nd conjugation', sum: 'Infinitive -ēre: moneō, monēre.',
      body: `<p>The 2nd conjugation is the <i>ē</i> family.</p>
<p><b>How to spot it:</b> first principal part <i>-eō</i> and infinitive <i>-ēre</i> (long e): <i>moneō, monēre, monuī, monitum</i> “warn”.</p>
<p>The <i>e</i> stays in every present-system form: <i>moneō, monēs, monet … monent</i>; imperfect <i>monēbam</i>; future <i>monēbō</i> (with <i>-b-</i>, like the 1st). Perfects vary: <i>monuī</i>, but <i>videō, vīdī</i>; <i>maneō, mānsī</i>. Learn the principal parts.</p>`,
      tables: [{ t: 'verb', h: 'moneō' }], pick: { kind: 'verb', conj: 2 },
      facts: [['moneō', 'inf.act.pres', 'monēre'], ['moneō', 'ind.act.pres.2s', 'monēs'], ['moneō', 'ind.act.pres.3s', 'monet'], ['moneō', 'ind.act.pres.3p', 'monent'], ['moneō', 'ind.act.impf.1s', 'monēbam'], ['moneō', 'ind.act.fut.1s', 'monēbō'], ['moneō', 'ind.act.perf.1s', 'monuī'], ['videō', 'ind.act.perf.1s', 'vīdī'], ['maneō', 'ind.act.perf.1s', 'mānsī']],
      quiz: { t: 'form' }, drill: { types: ['verb'], conj: ['2'], moods: ['ind'], voices: ['act', 'dep'] } },
    { id: 'v3', sec: 'Verbs', title: '3rd conjugation', sum: 'Infinitive -ere (short e): regō, regere.',
      body: `<p>The 3rd conjugation is the largest group, and its perfects are the least predictable.</p>
<p><b>How to spot it:</b> first principal part <i>-ō</i> and infinitive <i>-ere</i> with a short e: <i>regō, regere, rēxī, rēctum</i> “rule”. (Compare 2nd <i>monēre</i>.)</p>
<p>The present uses a short <i>i</i> (<i>regis, regit, regimus, regitis</i>) and <i>u</i> in <i>regunt</i>. <b>The future has no -b-:</b> <i>regam, regēs, reget</i> (compare imperfect <i>regēbam</i>). Imperative <i>rege, regite</i>; <i>dīcō, dūcō, faciō</i> and <i>ferō</i> have short ones: <i>dīc, dūc, fac, fer</i>.</p>`,
      tables: [{ t: 'verb', h: 'regō' }], pick: { kind: 'verb', conj: 3 },
      facts: [['regō', 'inf.act.pres', 'regere'], ['regō', 'ind.act.perf.1s', 'rēxī'], ['regō', 'ind.act.pres.2s', 'regis'], ['regō', 'ind.act.pres.3s', 'regit'], ['regō', 'ind.act.pres.1p', 'regimus'], ['regō', 'ind.act.pres.2p', 'regitis'], ['regō', 'ind.act.pres.3p', 'regunt'], ['regō', 'ind.act.fut.1s', 'regam'], ['regō', 'ind.act.fut.2s', 'regēs'], ['regō', 'ind.act.fut.3s', 'reget'], ['regō', 'ind.act.impf.1s', 'regēbam'], ['regō', 'imp.act.pres.2s', 'rege'], ['regō', 'imp.act.pres.2p', 'regite'], ['dīcō', 'imp.act.pres.2s', 'dīc'], ['dūcō', 'imp.act.pres.2s', 'dūc'], ['faciō', 'imp.act.pres.2s', 'fac'], ['ferō', 'imp.act.pres.2s', 'fer']],
      quiz: { t: 'form' }, drill: { types: ['verb'], conj: ['3'], moods: ['ind'], voices: ['act', 'dep'] } },
    { id: 'v3io', sec: 'Verbs', title: '3rd conjugation -iō', sum: 'capiō, capere: 3rd with an extra i.',
      body: `<p>A handful of very common verbs mix the 3rd and 4th conjugations: <i>capiō</i> “take”, <i>faciō</i> “do, make”, <i>fugiō</i> “flee”, <i>iaciō</i> “throw”, and their compounds.</p>
<p><b>How to spot it:</b> first principal part <i>-iō</i> like the 4th, but infinitive <i>-ere</i> like the 3rd: <i>capiō, capere, cēpī, captum</i>. (A 4th-conjugation verb has <i>-īre</i>: <i>audiō, audīre</i>.)</p>
<p>It follows <i>regō</i>, but keeps the <i>i</i> wherever <i>audiō</i> has <i>i</i> before a vowel: <i>capiunt, capiēbam, capiam, capiēs</i>; and no <i>i</i> elsewhere: <i>capis, capit, capere</i>. Imperative <i>cape</i> (<i>faciō</i>: <i>fac</i>).</p>`,
      tables: [{ t: 'verb', h: 'capiō' }], pick: { kind: 'verb', conj: '3io' },
      facts: [['capiō', 'inf.act.pres', 'capere'], ['capiō', 'ind.act.perf.1s', 'cēpī'], ['audiō', 'inf.act.pres', 'audīre'], ['capiō', 'ind.act.pres.3p', 'capiunt'], ['capiō', 'ind.act.impf.1s', 'capiēbam'], ['capiō', 'ind.act.fut.1s', 'capiam'], ['capiō', 'ind.act.fut.2s', 'capiēs'], ['capiō', 'ind.act.pres.2s', 'capis'], ['capiō', 'ind.act.pres.3s', 'capit'], ['capiō', 'imp.act.pres.2s', 'cape'], ['faciō', 'imp.act.pres.2s', 'fac']],
      quiz: { t: 'form' }, drill: { types: ['verb'], conj: ['3io'], moods: ['ind'], voices: ['act', 'dep'] } },
    { id: 'v4', sec: 'Verbs', title: '4th conjugation', sum: 'Infinitive -īre: audiō, audīre.',
      body: `<p>The 4th conjugation is the <i>ī</i> family.</p>
<p><b>How to spot it:</b> first principal part <i>-iō</i> and infinitive <i>-īre</i>: <i>audiō, audīre, audīvī, audītum</i> “hear”.</p>
<p>The present has long <i>ī</i> (<i>audīs, audīmus, audītis</i>) except <i>audit</i>, and <i>-iunt</i> in the 3rd plural (<i>audiunt</i>). Like the 3rd conjugation, the future uses <i>-a- / -e-</i> without <i>-b-</i>: <i>audiam, audiēs, audiet</i>; imperfect <i>audiēbam</i>. Imperative <i>audī, audīte</i>.</p>`,
      tables: [{ t: 'verb', h: 'audiō' }], pick: { kind: 'verb', conj: 4 },
      facts: [['audiō', 'inf.act.pres', 'audīre'], ['audiō', 'ind.act.perf.1s', 'audīvī'], ['audiō', 'ind.act.pres.2s', 'audīs'], ['audiō', 'ind.act.pres.1p', 'audīmus'], ['audiō', 'ind.act.pres.2p', 'audītis'], ['audiō', 'ind.act.pres.3s', 'audit'], ['audiō', 'ind.act.pres.3p', 'audiunt'], ['audiō', 'ind.act.fut.1s', 'audiam'], ['audiō', 'ind.act.fut.2s', 'audiēs'], ['audiō', 'ind.act.fut.3s', 'audiet'], ['audiō', 'ind.act.impf.1s', 'audiēbam'], ['audiō', 'imp.act.pres.2s', 'audī'], ['audiō', 'imp.act.pres.2p', 'audīte']],
      quiz: { t: 'form' }, drill: { types: ['verb'], conj: ['4'], moods: ['ind'], voices: ['act', 'dep'] } },

    // ---------- irregular verbs ----------
    { id: 'sum', sec: 'Irregular verbs', title: 'sum and possum', sum: '“be” and “be able”.',
      body: `<p><i>sum, esse, fuī, futūrum</i> “be” is the most common verb in Latin. Its present must be memorized: <i>sum, es, est, sumus, estis, sunt</i>. Imperfect <i>eram</i>, future <i>erō</i>. The perfect system is regular, built on <i>fu-</i>: <i>fuī, fueram, fuerō</i>.</p>
<p><i>sum</i> also builds the perfect passive of every verb (<i>amātus est</i>), and its compounds (<i>adsum</i> “be present”, <i>absum</i> “be away”) conjugate the same way.</p>
<p><i>possum, posse, potuī</i> “be able, can” is <i>pot-</i> + <i>sum</i>: <i>pot-</i> before a vowel, <i>pos-</i> before s: <i>possum, potes, potest, possumus, potestis, possunt</i>; <i>poteram, poterō</i>. It usually takes an infinitive: <i>possum vidēre</i> “I can see”.</p>`,
      tables: [{ t: 'verb', h: 'sum', short: true }, { t: 'verb', h: 'possum', short: true }], pick: { kind: 'verb', irr: ['sum', 'possum'] },
      facts: [['sum', 'inf.act.pres', 'esse'], ['sum', 'ind.act.perf.1s', 'fuī'], ['sum', 'ind.act.pres.1s', 'sum'], ['sum', 'ind.act.pres.2s', 'es'], ['sum', 'ind.act.pres.3s', 'est'], ['sum', 'ind.act.pres.1p', 'sumus'], ['sum', 'ind.act.pres.2p', 'estis'], ['sum', 'ind.act.pres.3p', 'sunt'], ['sum', 'ind.act.impf.1s', 'eram'], ['sum', 'ind.act.fut.1s', 'erō'], ['sum', 'ind.act.plup.1s', 'fueram'], ['sum', 'ind.act.fperf.1s', 'fuerō'],
        ['possum', 'inf.act.pres', 'posse'], ['possum', 'ind.act.perf.1s', 'potuī'], ['possum', 'ind.act.pres.1s', 'possum'], ['possum', 'ind.act.pres.2s', 'potes'], ['possum', 'ind.act.pres.3s', 'potest'], ['possum', 'ind.act.pres.1p', 'possumus'], ['possum', 'ind.act.pres.2p', 'potestis'], ['possum', 'ind.act.pres.3p', 'possunt'], ['possum', 'ind.act.impf.1s', 'poteram'], ['possum', 'ind.act.fut.1s', 'poterō'], ['videō', 'inf.act.pres', 'vidēre'], ['amō', 'ind.pas.perf.3s', 'amātus est']],
      quiz: { t: 'form' }, drill: { types: ['verb'], conj: ['irr'], moods: ['ind'], voices: ['act', 'dep'] } },
    { id: 'eo', sec: 'Irregular verbs', title: 'eō, īre', sum: '“go”.',
      body: `<p><i>eō, īre, iī (īvī), itum</i> “go”. The stem is <i>i-</i>, which becomes <i>e-</i> before a, o, or u: <i>eō, īs, it, īmus, ītis, eunt</i>.</p>
<p>Imperfect <i>ībam</i>, future <i>ībō, ībis … ībunt</i> (with <i>-b-</i>, like the 1st conjugation). Perfect <i>iī</i>, <i>iit</i>. Imperative <i>ī, īte</i> “go!”.</p>
<p>Many common compounds conjugate the same way: <i>redeō</i> “go back”, <i>exeō</i> “go out”, <i>pereō</i> “perish”, <i>abeō</i> “go away”, <i>adeō</i> “approach”.</p>`,
      tables: [{ t: 'verb', h: 'eō', short: true }], pick: { kind: 'verb', irr: ['eō'] },
      facts: [['eō', 'inf.act.pres', 'īre'], ['eō', 'ind.act.pres.1s', 'eō'], ['eō', 'ind.act.pres.2s', 'īs'], ['eō', 'ind.act.pres.3s', 'it'], ['eō', 'ind.act.pres.1p', 'īmus'], ['eō', 'ind.act.pres.2p', 'ītis'], ['eō', 'ind.act.pres.3p', 'eunt'], ['eō', 'ind.act.impf.1s', 'ībam'], ['eō', 'ind.act.fut.1s', 'ībō'], ['eō', 'ind.act.fut.2s', 'ībis'], ['eō', 'ind.act.fut.3p', 'ībunt'], ['eō', 'ind.act.perf.1s', 'iī'], ['eō', 'ind.act.perf.3s', 'iit'], ['eō', 'imp.act.pres.2s', 'ī'], ['eō', 'imp.act.pres.2p', 'īte']],
      quiz: { t: 'form' }, drill: { types: ['verb'], conj: ['irr'], moods: ['ind'], voices: ['act', 'dep'] } },
    { id: 'fero', sec: 'Irregular verbs', title: 'ferō, ferre', sum: '“carry, bring, bear”.',
      body: `<p><i>ferō, ferre, tulī, lātum</i> “carry, bring, bear, endure”. The principal parts look unrelated, so learn all four.</p>
<p>It is a 3rd-conjugation verb that drops the connecting vowel in a few present forms: <i>fers, fert, fertis</i>; infinitive <i>ferre</i>; imperative <i>fer</i>. Everything else is regular 3rd: <i>ferimus, ferunt, ferēbam, feram, ferēs</i>. The passive does the same: <i>ferris, fertur</i>.</p>
<p>Compounds are very common: <i>referō</i> “bring back, report”, <i>cōnferō</i> “bring together, compare”, <i>auferō</i> “carry off”, <i>afferō</i> “bring to”.</p>`,
      tables: [{ t: 'verb', h: 'ferō' }], pick: { kind: 'verb', irr: ['ferō'] },
      facts: [['ferō', 'inf.act.pres', 'ferre'], ['ferō', 'ind.act.perf.1s', 'tulī'], ['ferō', 'sup.um', 'lātum'], ['ferō', 'ind.act.pres.2s', 'fers'], ['ferō', 'ind.act.pres.3s', 'fert'], ['ferō', 'ind.act.pres.2p', 'fertis'], ['ferō', 'imp.act.pres.2s', 'fer'], ['ferō', 'ind.act.pres.1p', 'ferimus'], ['ferō', 'ind.act.pres.3p', 'ferunt'], ['ferō', 'ind.act.impf.1s', 'ferēbam'], ['ferō', 'ind.act.fut.1s', 'feram'], ['ferō', 'ind.act.fut.2s', 'ferēs'], ['ferō', 'ind.pas.pres.2s', 'ferris'], ['ferō', 'ind.pas.pres.3s', 'fertur']],
      quiz: { t: 'form' }, drill: { types: ['verb'], conj: ['irr'], moods: ['ind'], voices: ['act', 'dep'] } },
    { id: 'volo', sec: 'Irregular verbs', title: 'volō, nōlō, mālō', sum: '“want”, “not want”, “prefer”.',
      body: `<p><i>volō, velle, voluī</i> “want, be willing”. Present: <i>volō, vīs, vult, volumus, vultis, volunt</i>. Imperfect <i>volēbam</i>, future <i>volam, volēs</i> (like the 3rd conjugation).</p>
<p><i>nōlō, nōlle, nōluī</i> “not want, be unwilling” is <i>nē</i> + <i>volō</i>; some forms are two words: <i>nōn vīs, nōn vult</i>. <i>mālō, mālle, māluī</i> “prefer” is <i>magis</i> “more” + <i>volō</i>: <i>māvīs, māvult</i>.</p>
<p>All three usually take an infinitive. <b>nōlī / nōlīte + infinitive</b> is the normal way to say “don’t!”: <i>nōlī timēre</i> “don’t be afraid”. Present subjunctive: <i>velim, nōlim, mālim</i>.</p>`,
      tables: [{ t: 'cmp', title: 'Present indicative', cols: [['volō', 'ind.act.pres', 'volō'], ['nōlō', 'ind.act.pres', 'nōlō'], ['mālō', 'ind.act.pres', 'mālō']] },
        { t: 'rows', title: 'Infinitives', rows: [['want', 'volō', 'inf.act.pres', ''], ['not want', 'nōlō', 'inf.act.pres', ''], ['prefer', 'mālō', 'inf.act.pres', '']] }],
      pick: { kind: 'verb', irr: ['volō', 'nōlō', 'mālō'] },
      facts: [['volō', 'inf.act.pres', 'velle'], ['volō', 'ind.act.perf.1s', 'voluī'], ['volō', 'ind.act.pres.2s', 'vīs'], ['volō', 'ind.act.pres.3s', 'vult'], ['volō', 'ind.act.pres.1p', 'volumus'], ['volō', 'ind.act.pres.2p', 'vultis'], ['volō', 'ind.act.pres.3p', 'volunt'], ['volō', 'ind.act.impf.1s', 'volēbam'], ['volō', 'ind.act.fut.1s', 'volam'], ['volō', 'ind.act.fut.2s', 'volēs'],
        ['nōlō', 'inf.act.pres', 'nōlle'], ['nōlō', 'ind.act.perf.1s', 'nōluī'], ['nōlō', 'ind.act.pres.2s', 'nōn vīs'], ['nōlō', 'ind.act.pres.3s', 'nōn vult'], ['mālō', 'inf.act.pres', 'mālle'], ['mālō', 'ind.act.perf.1s', 'māluī'], ['mālō', 'ind.act.pres.2s', 'māvīs'], ['mālō', 'ind.act.pres.3s', 'māvult'],
        ['nōlō', 'imp.act.pres.2s', 'nōlī'], ['nōlō', 'imp.act.pres.2p', 'nōlīte'], ['timeō', 'inf.act.pres', 'timēre'], ['volō', 'sub.act.pres.1s', 'velim'], ['nōlō', 'sub.act.pres.1s', 'nōlim'], ['mālō', 'sub.act.pres.1s', 'mālim']],
      quiz: { t: 'form' }, drill: { types: ['verb'], conj: ['irr'], moods: ['ind'], voices: ['act', 'dep'] } },
  ];
  root.LESSONS = L;
  if (typeof module !== 'undefined') module.exports = L;
})(typeof window !== 'undefined' ? window : globalThis);
