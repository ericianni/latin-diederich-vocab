// Export, import, and the backup reminder. Run: node tools/test_progress.js
const P = require('../progress.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + ' (got ' + JSON.stringify(a) + ')');

const state = { cards: { 'r:1': { box: 2, due: 9 } }, lessons: {}, dst: {}, ds: { w: {} } };
const txt = P.exportText(state, 'latin1400.v1', new Date('2026-11-28T15:00:00Z'));
const payload = JSON.parse(txt);
eq(payload.app, 'latin1400.v1', 'export stamps app');
ok(payload.exported === '2026-11-28T15:00:00.000Z', 'export stamps exported');
ok(!('exported' in state), 'exported is not written back onto the live state');
eq(P.importObj(txt, 'latin1400.v1', true).cards['r:1'].due, 9, 'round trip keeps cards');
eq(JSON.parse(P.exportText(P.importObj(txt, 'latin1400.v1', true), 'latin1400.v1')).app, 'latin1400.v1', 'round trip keeps the app field on the file');
let threw = false;
try { P.importObj('not json', 'latin1400.v1', true); } catch (e) { threw = true; }
ok(threw, 'rejects garbage');
threw = false;
try { P.importObj('{"x":1}', 'latin1400.v1', true); } catch (e) { threw = true; }
ok(threw, 'rejects a file with no cards');
threw = false;
try { P.importObj('{"app":"italiano1500.v1","cards":{}}', 'latin1400.v1', true); } catch (e) { threw = true; }
ok(threw, 'rejects an Italian export');
eq(P.importObj('{"cards":{"r:1":{"due":3}}}', 'latin1400.v1', true).cards['r:1'].due, 3, 'legacy Latin file with no app field is accepted');
threw = false;
try { P.importObj('{"cards":{"r:1":{"due":3}}}', 'italiano1500.v1', false); } catch (e) { threw = true; }
ok(threw, 'Italian rejects a missing app field');
eq(P.importObj('{"app":"italiano1500.v1","cards":{"r:a":{"due":4}}}', 'italiano1500.v1', false).cards['r:a'].due, 4, 'a txt file is the same JSON');
const before = { cards: { a: 1 } };
eq(P.keepIfConfirmed(before, { cards: { b: 2 } }, false), before, 'cancelling confirm leaves the state unchanged');
eq(P.keepIfConfirmed(before, { cards: { b: 2 } }, true).cards.b, 2, 'confirm replaces the state');
const bak = { d: {}, getItem(k) { return this.d[k] || null; }, setItem(k, v) { this.d[k] = v; }, removeItem(k) { delete this.d[k]; } };
P.rememberBackup(bak, 'latin1400.v1', '2026-11-12');
eq(bak.getItem('latin1400.v1.lastBackup'), '2026-11-12', 'lastBackup is a separate key');
ok(!txt.includes('lastBackup'), 'lastBackup stays out of the file');
P.forgetBackup(bak, 'latin1400.v1');
eq(bak.getItem('latin1400.v1.lastBackup'), null, 'reset clears lastBackup');
eq(P.longDate('2026-11-12'), 'November 12, 2026', 'US long date');
eq(P.backupLine('2026-11-12', '2026-11-20', true), 'Last saved copy: November 12, 2026.', 'a recent copy shows the date');
ok(/It's been a while/.test(P.backupLine('2026-11-01', '2026-11-15', true)), '14 days asks for a new copy');
ok(/It's been a while/.test(P.backupLine('', '2026-11-15', true)), 'progress with no copy asks for one');
eq(P.backupLine('', '2026-11-15', false), '', 'a fresh start stays quiet');
eq(P.fileName('latin1400', new Date('2026-11-28T15:00:00Z')), 'latin1400-progress-2026-11-28.json', 'dated filename');

(async () => {
  const downloaded = [];
  eq(await P.deliver('{"a":1}', 'latin1400-progress-2026-11-28.json', { canShare: () => true, share: async () => {} }, n => downloaded.push(n)), 'share', 'share when the sheet can take a file');
  eq(downloaded.length, 0, 'a successful share does not also download');
  eq(await P.deliver('{"a":1}', 'latin1400-progress-2026-11-28.json', { canShare: () => false, share: async () => {} }, n => downloaded.push(n)), 'download', 'download when share is unavailable');
  eq(downloaded[0], 'latin1400-progress-2026-11-28.json', 'download keeps the json name');
  eq(await P.deliver('x', 'latin1400-progress-2026-11-28.json', { canShare: () => true, share: async () => { throw new Error('cancel'); } }, n => downloaded.push('fb:' + n)), 'download', 'a cancelled share falls back to download');
  let persisted = 0;
  P.askPersist({ storage: { persist: () => { persisted++; return Promise.resolve(true); } } });
  eq(persisted, 1, 'persist is called');
  P.askPersist({});
  P.askPersist(null);
  ok(true, 'boot works without the storage API');
  eq(P.homeTip(true), '', 'the home-screen tip is hidden in the app wrapper');
  ok(/Add to Home Screen/.test(P.homeTip(false)), 'the web tip names Add to Home Screen');
  const app = require('fs').readFileSync(require('path').join(__dirname, '..', 'app.js'), 'utf8');
  ok(/Progress\.homeTip\(window\.Capacitor\)/.test(app) && /Progress\.askPersist\(navigator\)/.test(app) && /importObj\(t, KEY, true\)/.test(app), 'the app wires the tip, persist, and legacy import');
  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
