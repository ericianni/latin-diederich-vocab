# Latin 1400 — Diederich vocabulary trainer

A free, offline-capable web app (PWA) for learning **Paul Diederich's high-frequency Latin vocabulary**: right/wrong flashcards in both directions, separate form drills you can tailor, a cheat sheet of endings, a quick multiple-choice quiz, and a searchable word list.

**Live app:** https://ericianni.github.io/latin-diederich-vocab/

- **Cards (daily flashcards):** 10 new words (5/10/20 configurable) + due reviews, then “Done for today”. Answer **Right** or **Wrong** (or type the Latin on English→Latin cards and it's checked). Latin→English and English→Latin are scheduled separately; English→Latin unlocks the day after you first get a word right.
- **Simple Leitner spacing:** right moves a card up a box (1, 3, 7, 14, 30, 60, 120 days); wrong sends it back to the start and repeats it a few cards later.
- **Learn (lessons):** 21 short lessons: the cases; the five noun declensions (neuters, i-stems); 1st/2nd- and 3rd-declension adjectives; tense, voice and mood; the four conjugations plus 3rd -iō; and *sum/possum, eō, ferō, volō/nōlō/mālō*. Each one explains what the forms do and how to spot them, shows generated tables and examples from the word list, ends with a 4–5 question quick check (doesn't affect your card schedule), and has a **Practice this in Drills** button that sets the drill filters for you. Finished lessons get a check mark. Every Latin form quoted in a lesson is checked against the generator by `tools/test_morph.js`.
- **Drills (own tab and daily goal):** e.g. *amō: 3rd sg · imperfect passive subjunctive?* or *rēx, rēgis m.: dative plural?* Pick moods/forms (indicative, subjunctive, imperative incl. future imperative, infinitive incl. future passive -um īrī, participle, gerund, gerundive, supine), voices (active, passive, deponent), tenses, conjugations, cases (incl. vocative and locative), numbers and declensions. New form types are off by default; turn them on in drill settings. Answers are typed and auto-checked, ignoring case, j/i and u/v and (by default) macrons, with a “Count as correct” override. Turn on **Require macrons** in Settings to make macrons count; ā ē ī ō ū keys then appear under the answer box. The answer box is focused automatically on each new card.
- **Cheat sheet:** endings for the five declensions (with i-stems and neuters), vocative & locative, adjective classes, gerund/gerundive/supine/future-imperative summary, all four conjugations (plus 3rd -iō and a deponent) in every drilled tense/voice/mood, and *sum, possum, eō, ferō, volō, nōlō, mālō, fīō*. Each drill question links straight to the relevant table.
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
