# Latin 1400 — Diederich vocabulary trainer

A free, offline-capable web app (PWA) for learning **Paul Diederich's high-frequency Latin vocabulary**: spaced-repetition flashcards in both directions, short conjugation/declension drills, a quick multiple-choice quiz, and a searchable word list.

**Live app:** https://ericianni.github.io/latin-diederich-vocab/

- **Daily session (5–10 min):** 10 new words (5/10/20 configurable) + due reviews + a few form drills, then a clear “Done for today”. Stop anytime; every answer is saved.
- **Vocabulary SRS (SM-2):** Latin→English and English→Latin (typed or self-graded) are scheduled separately. The English→Latin card unlocks the day after you first get the word right.
- **Form drills (also on SRS):** e.g. *amō: 3rd sg present active indicative?* or *rēx, rēgis m.: dative plural?* Forms are generated from principal parts / genitive + gender with standard paradigms, including irregular *sum, possum, eō, ferō, volō, nōlō, mālō, fīō, dō, vīs, domus, deus*. Answers are checked ignoring macrons, case, j/i and u/v.
- **No account, no backend.** Progress lives in your browser's localStorage (export/import in About).

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
node tools/test_morph.js                   # paradigm spot-checks
python3 -m http.server                     # serve locally
```
