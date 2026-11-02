# Latin 1400 — Diederich vocabulary trainer

A free, offline-capable web app (PWA) for learning **Paul Diederich's high-frequency Latin vocabulary**: right/wrong flashcards in both directions, separate form drills you can tailor, a cheat sheet of endings, a quick multiple-choice quiz, and a searchable word list.

**Live app:** https://ericianni.github.io/latin-diederich-vocab/

- **Cards (daily flashcards):** 10 new words (5/10/20 configurable) + due reviews, then “Done for today”. Answer **Right** or **Wrong** (or type the Latin on English→Latin cards and it's checked). Latin→English and English→Latin are scheduled separately; English→Latin unlocks the day after you first get a word right.
- **Simple Leitner spacing:** right moves a card up a box (1, 3, 7, 14, 30, 60, 120 days); wrong sends it back to the start and repeats it a few cards later.
- **Learn (lessons):** 21 short lessons: the cases; the five noun declensions (neuters, i-stems); 1st/2nd- and 3rd-declension adjectives; tense, voice and mood; the four conjugations plus 3rd -iō; and *sum/possum, eō, ferō, volō/nōlō/mālō*. Each one explains what the forms do and how to spot them, shows generated tables and examples from the word list, ends with a 4–5 question quick check (doesn't affect your card schedule), and has a **Practice this in Drills** button that sets the drill filters for you. Finished lessons get a check mark. Every Latin form quoted in a lesson is checked against the generator by `tools/test_morph.js`.
- **Drills (own tab, free practice):** e.g. *amō: 3rd sg · imperfect passive subjunctive?* or *rēx, rēgis m.: dative plural?* Pick moods/forms (indicative, subjunctive, imperative incl. future imperative, infinitive incl. future passive -um īrī, participle, gerund, gerundive, supine), voices (active, passive, deponent), tenses, verb person (1st/2nd/3rd) and number (singular/plural) for finite forms (imperatives have only 2nd/3rd person; infinitives, participles, gerunds, gerundives and supines ignore them), conjugations, cases (incl. vocative and locative; also applied to participles, gerunds, gerundives and supines), numbers and declensions. Settings apply immediately to free practice and weak spots. New form types are off by default; turn them on in drill settings. Answers are typed and auto-checked, ignoring case, j/i and u/v and (by default) macrons, with a “Count as correct” override. Turn on **Require macrons** in Settings to make macrons count; ā ē ī ō ū keys then appear under the answer box. The answer box is focused automatically on each new card.
- **How drills pick questions:** no schedule, no due pile and no daily cap. Practice in short sets (5, 10 or 20 questions; **Keep going** for another; stop anytime). The app tracks accuracy per form combination: paradigm group + form, e.g. 3rd declension · dative plural (`n3|dat.pl`), 1st conjugation · 3rd sg imperfect passive subjunctive (`v1|sub.pas.impf.3s`), 1st/2nd-declension adjective · masculine ablative singular (`a12|m.abl.sg`). Each combination keeps a recent-weighted right/wrong score (each older answer counts 0.75× the next) and when it was last asked. Questions are drawn at random, weighted toward low accuracy, never-tried and not-recently-asked combinations, with each word type getting an equal share. Then a word with that form is chosen at random, slightly favoring frequent words and words you've already met as flashcards. Get one wrong and the same combination comes back with a different word three questions later. **Weak spots** (Drills tab) lists your lowest-accuracy combinations (recent accuracy under 85%) with attempt counts, with **Practice weak spots** and **Reset drill stats**. Stats are saved with the rest of your progress and included in Export/Import. Flashcards keep their own Leitner schedule.
- **Identify the form (Drills → How to answer):** choose *Type the form*, *Identify the form* or *Mix*. Identify shows a generated form (from your drill settings) with its dictionary entry, and you tap chips for case, number, gender and declension, or mood, tense, voice, person and number (participles also take case/number/gender; infinitives, gerunds, gerundives and supines show only the rows that apply). A row with only one possible value under your settings is filled in and locked. Voice is judged by form: the chips are just Active / Passive, so a deponent's passive-looking forms (*hortāris*) are Passive and its present/future participles and future infinitive (*hortāns, hortātūrus*) are Active; the feedback notes that the verb is deponent. Nouns and adjectives show only the headword (*homō*, not *homō, -inis, m.*) until you answer, so the entry doesn't give away gender or declension; the full entry appears in the feedback. Ambiguous forms accept any valid parse (*rēgēs* = nominative or accusative plural), and the feedback lists every valid parse and marks the rows you got wrong. Right/wrong feeds the same review schedule as typed drills. Parsing and syncretism are tested by `tools/test_identify.js`; drill settings are checked end to end in headless Chrome by `tools/test_drills_browser.js` (needs `puppeteer-core`; set `PUPPETEER_DIR` and `CHROME` if not installed locally).
- **New tags in drills:** a question shows **New word** if that word has never come up in a drill, and **New form** if you've never tried that form in that paradigm (e.g. ablative singular of a 1st/2nd-declension adjective). A new form comes with a quick pointer to the matching cheat-sheet table and lesson (in Identify mode the pointer appears with the answer, so it doesn't give the answer away). The Drills tab shows how many words and forms you've seen in drills.
- **Cheat sheet:** endings for the five declensions (with i-stems and neuters), vocative & locative, adjective classes, gerund/gerundive/supine/future-imperative summary, all four conjugations (plus 3rd -iō and a deponent) in every drilled tense/voice/mood, and *sum, possum, eō, ferō, volō, nōlō, mālō, fīō*. Each drill question links straight to the relevant table.
- **Words tab:** search, and sort by frequency rank, A–Z or Diederich's order. In Diederich's order the list has sticky headers with his own section and sub-section titles (e.g. *I. Nouns and Related Words · 9. Animals*, *III. Verbs and Related Words · 8. Vocal Activities*, as listed in the Hiberna Caroli Raetici edition) and a word count for each.
- Forms are generated from principal parts / genitive + gender with standard paradigms. Passives are generated only for verbs whose dictionary entry has a supine and that aren't intransitive; impersonal passives and impersonal gerundives of intransitive verbs aren't drilled. Gerundives are given for verbs with a passive, transitive deponents (passive in meaning) and a few transitive verbs without a supine (timeō, metuō, discō, bibō, urgeō, fugiō, audeō); sum/possum have no gerund or supine, eō no gerundive. Locatives come from a hand-curated list (domī, rūrī/rūre, humī, bellī, mīlitiae) — the list has no city names. Adjectives in -ius take vocative -ie (ēgregie, -ī also accepted); meus → mī. Words that can't be generated reliably are skipped and marked in the word list.
- **No account, no backend.** Progress lives in your browser's localStorage (export/import in About). Progress from v1 is migrated automatically.

## Install on your phone
- **iPhone (Safari):** open the link → Share button → **Add to Home Screen** → Add.
- **Android (Chrome):** open the link → ⋮ menu → **Install app** (or **Add to Home screen**).

## Data & credits
- Word list: Paul B. Diederich, *The Frequency of Latin Words and Their Endings* (University of Chicago, 1939).
- Entries and English glosses: the “Lodge edition” of Diederich's list compiled by **Carolus Raeticus**, [Hiberna Caroli Raetici](https://hiberna-cr.wikidot.com/) (glosses from Gonzalez Lodge, *The Vocabulary of High School Latin*, 1922, and J. T. White, 1904), licensed **CC BY-SA 3.0**. Frequency ranks are from Diederich's counts (DWF.csv) on the same site.
- List size cross-checked against John Muccigrosso's [Latin_vocabulary](https://github.com/Jmuccigr/Latin_vocabulary) (Diederich: 1,474 items).

`data/words.json` is a derivative of the Hiberna data and is shared under **CC BY-SA 3.0**. The app code is MIT-licensed.

The study deck has 1,470 entries: the 1,518 lines of the Lodge edition minus 48 “d.” cross-references, which repeat entries listed elsewhere so learners can tell similar words apart.

## Development
```
python3 tools/build_data.py /path/to/src   # lodge.txt + DWF.csv -> data/words.json
node tools/test_morph.js                   # paradigm checks (385) + sweep of every word
python3 -m http.server                     # serve locally
```

## Android app (Capacitor)

The same app is wrapped as a native Android app (`io.github.ericianni.latin1400`) with Capacitor. The web files are bundled into the APK, so it works fully offline from first launch; the service worker is skipped inside the app.

Download the APK from [Releases](https://github.com/ericianni/latin-diederich-vocab/releases) and install it (allow "install unknown apps"). Progress is stored on the phone, separately from the browser version.

Build it yourself (Node, JDK 21, Android SDK with platform 36):

```sh
npm install
npm run android:debug   # copies the web app into www/, syncs, runs ./gradlew assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

Launcher icons and splash come from `icons/icon-512-maskable.png` via `node tools/make_android_assets.js && npx capacitor-assets generate --android`.
