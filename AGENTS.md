# AGENTS.md — Latin 1400

Offline PWA that teaches Paul Diederich's high-frequency Latin vocabulary (study deck ≈1,470 entries after dropping 48 cross-refs). Tabs: Cards (Leitner flashcards), Learn (21 lessons), Drills (Type / Identify / Mix), Cheat sheet, Words, About. Live at https://ericianni.github.io/latin-diederich-vocab/. No backend; progress in `localStorage` key `latin1400.v1`.

## File map

| Path | Purpose |
|------|---------|
| `index.html` | Shell; loads morph → identify → drillpick → lessons → app |
| `app.js` | App shell: tabs, Cards, Drills UI, Cheat sheet, Words, Settings, Test mode, export/import |
| `morph.js` | Morphology engine (`Morph`) |
| `identify.js` | Identify-mode parsing / chips (`Identify`) |
| `drillpick.js` | Weak-spot weighted free-practice picker (`DrillPick`) |
| `lessons.js` | 21 lesson specs (`LESSONS`) |
| `style.css` | Styles (`.alt` = amber “Accepted alternate” note) |
| `sw.js` | Service worker; **bump `CACHE` on every code/data release** |
| `manifest.webmanifest` | PWA manifest |
| `data/words.json` | Word list |
| `sentences.html` / `sentences.js` | Separate Sentences (beta) page |
| `sentences/engine.js` | Sentence generator (`LatinEngine`) |
| `sentences/lexicon.js` (+ `lexicon_s*.js`) | Hand-tagged lexicon for sentences |
| `tools/test_morph.js` | Paradigm + sweep tests |
| `tools/test_identify.js` | Identify / And…? tests |
| `tools/test_drillpick.js` | Picker unit tests |
| `tools/test_sentences.js` | Sentence engine tests |
| `tools/test_*_browser.js` | Headless Chrome E2E (needs Chrome + puppeteer-core) |
| `tools/build_data.py` | Rebuild `words.json` from Lodge + DWF |
| `tools/build_www.js` | Copy root web files → `www/` for Capacitor |
| `tools/make_android_assets.js` | Android icons/splash helper |
| `android/`, `www/` | Capacitor APK bundle — **do not edit for web releases** |
| `icons/`, `assets/`, `screenshots/` | Icons / Capacitor assets / docs screenshots |

### Morph (`morph.js` → `Morph`)

- `analyze(entry)` → paradigm (`tbl` keyed by form, or `{skip}`)
- `standard(cell)` → **the one form to display** (first of the cell)
- `accepts(cell)` → all accepted spellings (array)
- `grade(input, cell, strict)` / `gradeHead(...)` → `{ok, alternate, standard}`; `alternate: true` when a non-standard accepted form was typed
- `check` / `checkHead` / `variants` / `label` / `norm` / `normM` / `plain`
- Tables: `TENSES`, `CASES`, `CASES_X`, `MOODS`, `VOICES`, `PERS`, `P`, `CASE_N`, `GEN_N`

Cell rule: a cell is a string or array; **index 0 is standard; renderers must show only that**. Alternates stay in the array for grading only.

### Identify (`Identify`)

`pick`, `parses`, `rows`, `grade`, `andGrade`, `parseLabel`, `allowed`, `typedSub`, … — builds chip rows and judges Identify / And…? answers. Readings use **standard** forms only (`index` ignores alternates).

### DrillPick

`record`, `acc`, `weight`, `masses`, `pickCombo`, `pickWord`, `weakest` — stats key = `"paradigm|form"` (e.g. `n3|dat.pl`).

### Sentences (`LatinEngine`)

`generate` / `generateOne` / `generateMany`, `gradeEnglish` / `gradeLatin` / `gradeLatinReport`, `identifyTargets`, `chipsLaEn` / `chipsEnLa`, `setPool`, …

## Data: `data/words.json`

Array of 1,518 Lodge lines (study UI hides `d: true` cross-refs → 1,470). Fields:

| Field | Meaning |
|-------|---------|
| `id` | Stable numeric id (Lodge row order) |
| `la` | Dictionary line (principal parts / genitive + gender) |
| `en` | US-English gloss |
| `pos` | `noun` `verb` `adjective` `adverb` `pronoun` `preposition` `conjunction` `interjection` `indeclinable` `prefix` |
| `s` / `ss` | Diederich section / subsection |
| `sub` | `true` if Lodge `xx` (subsection entry) |
| `d` | Cross-reference duplicate (omit from study deck) |
| `f` | Raw frequency total (or null) |
| `r` | Frequency rank 1…N (or null) |

Per-word morphology overrides live **in `morph.js`**, not in JSON (PERF_FIX, NOUN_IRR, defective lists, `parēns` → `parentum`, etc.).

## Architecture (brief)

- **Cards:** Leitner boxes 0–7 (intervals 0,1,3,7,14,30,60,120 days); separate `r:` (LA→EN) and `p:` (EN→LA) keys; right/wrong only; optional typed EN→LA via `Morph.gradeHead`.
- **Drills:** Free practice (no due pile). Modes `type` / `id` / `mix`. Weighted toward weak / unseen / stale combos (`DrillPick`). Miss → same combo, different word, ~3 later. Settings chips in `S.set.df`.
- **And…?:** After a right Identify on an ambiguous form, optional follow-up names other readings (no schedule impact). Toggle `S.set.andMore` (default on).
- **Learn:** Lessons from `lessons.js`; tables call `Morph.standard`; quick check does not touch SRS; “Practice this in Drills” writes filters.
- **Cheat sheet / prompts / cards:** Always `Morph.standard(cell)`.
- **Test mode:** Snapshot progress; nothing saved until exit.
- **SW:** Precache + stale-while-revalidate; new `CACHE` name on release so clients refresh.

## Policies

- Teach **standard classical** forms only (Allen & Greenough). No rare / archaic / poetic forms unless A&G treats them as normal.
- **Exactly one** standard form is ever shown (charts, lessons, cheat sheet, prompts, cards).
- Normal classical alternates may be **accepted** in typed answers but must show amber: `Accepted alternate — standard form: X` (via `Morph.grade` → `alternate`).
- I-stem adjective accusative plural **shown as `-ēs`** (`omnēs` standard; `omnīs` accepted alternate). Same pattern for nouns like `fīlia`: dat/abl pl standard `fīliīs`, alternate `fīliābus`.
- Right/wrong grading only (no ease/confidence). US English UI and glosses.
- Future **Church Latin** pack → keep morphology/data extensible; do not hard-wire “classical-only” into irreversible schemas.

## Release / Git / APK

- Every user-facing code or data change: bump `const CACHE = 'latin1400-vNN'` in root `sw.js` (currently `latin1400-v31`) and add new assets to `ASSETS` if needed.
- **Docs-only** commits (e.g. this file) do **not** need a cache bump.
- Do **not** touch `android/` or `www/` except when Eric asks for an APK. `www/` is a Capacitor copy and is often stale vs root — rebuild with `npm run build:web` / `android:debug` only for APK.
- APK (when asked): `JAVA_HOME=/opt/jdk21 ANDROID_HOME=/opt/android-sdk npm run android:debug` (signed with `~/.android/debug.keystore`).
- Commit as `ericianni <ericianni@users.noreply.github.com>`; push straight to `main`; never rewrite pushed history.
  ```
  git -c credential.helper= -c credential.helper='!/usr/local/bin/gh auth git-credential' push
  ```

## Tests (all must pass before push)

| Command | ~time | Notes |
|---------|-------|-------|
| `node tools/test_morph.js` | ~2s | ~11k checks |
| `node tools/test_identify.js` | ~8s | large sweep |
| `node tools/test_drillpick.js` | ~0.2s | |
| `node tools/test_sentences.js` | ~16s | 2k sentences |
| Browser: `tools/test_drills_browser.js`, `test_sentences_browser.js`, `test_testmode_browser.js` | slower | need Chrome |

## Gotchas

- Edit **root** web files, not `www/` (Capacitor mirror; currently lags root).
- Display path: always `Morph.standard`; never join/`[0]` ad hoc in UI.
- `Morph.norm` folds j/i, v/u and strips macrons; `normM` keeps macrons (`S.set.strictMac`, default off).
- Pronouns not in `PRON` table return `{skip:'pronoun (not drilled)'}` (`is`, `īdem`, `iste`, `ipse`, `quī`/`quis`, `sē`, indefinites).
- Sentences page is separate (`sentences.html`); main app About links to it on web.
- Homographs across **different** dictionary words are not And…? readings (question names its headword).
