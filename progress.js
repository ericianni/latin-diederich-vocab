/* Export, import, and the "last saved copy" reminder. `exported` is stamped on the file only. */
(function (root, factory) {
  const P = factory();
  if (typeof module === 'object' && module.exports) module.exports = P; else root.Progress = P;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const TIP = 'Add this app to your home screen so your device is less likely to erase your progress. On iPhone or iPad, tap Share, then Add to Home Screen. On a Chromebook or Android phone, open the Chrome menu and tap Install app or Add to Home screen. School Chromebooks may still erase data when you sign out, so export a copy too.';
  const STALE = 'It\'s been a while since you saved a copy. Export one so you can get your progress back if this device clears its data.';

  function copyState(s) {
    const o = Object.assign({}, s || {});
    delete o.app;
    delete o.exported;
    delete o.lastBackup;
    return o;
  }
  function exportObj(state, appKey, now) {
    return Object.assign({ app: appKey, exported: (now || new Date()).toISOString() }, copyState(state));
  }
  function exportText(state, appKey, now) { return JSON.stringify(exportObj(state, appKey, now)); }
  function importObj(text, appKey, legacy) {
    let s;
    try { s = JSON.parse(text); } catch (e) { throw new Error('not a progress file'); }
    if (!s || typeof s !== 'object' || Array.isArray(s)) throw new Error('not a progress file');
    if (!s.cards || typeof s.cards !== 'object' || Array.isArray(s.cards)) throw new Error('not a progress file');
    if (s.app !== appKey && !(legacy && s.app == null)) throw new Error('not a progress file');
    return copyState(s);
  }
  function fileName(stem, now) {
    return stem + '-progress-' + (now || new Date()).toISOString().slice(0, 10) + '.json';
  }
  function shareFileName(jsonName) { return String(jsonName).replace(/\.json$/i, '.txt'); }
  async function deliver(text, filename, nav, download) {
    let file = null;
    try { if (typeof File === 'function') file = new File([text], shareFileName(filename), { type: 'text/plain' }); } catch (e) {}
    try {
      if (file && nav && typeof nav.canShare === 'function' && nav.canShare({ files: [file] }) && typeof nav.share === 'function') {
        await nav.share({ files: [file] });
        return 'share';
      }
    } catch (e) { /* cancelled or the WebView refused the sheet: download instead */ }
    download(filename, text);
    return 'download';
  }
  function backupKey(appKey) { return appKey + '.lastBackup'; }
  function isoDay(d) { return (d || new Date()).toISOString().slice(0, 10); }
  function daysBetween(earlier, later) {
    const p = s => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
    return Math.round((p(later) - p(earlier)) / 86400000);
  }
  function longDate(day) {
    const p = day.split('-').map(Number);
    return new Date(Date.UTC(p[0], p[1] - 1, p[2])).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  }
  function hasProgress(s) {
    if (!s) return false;
    if (s.cards && Object.keys(s.cards).length) return true;
    if (s.lessons && Object.keys(s.lessons).length) return true;
    if (s.dst && Object.keys(s.dst).length) return true;
    if (s.ds && s.ds.w && Object.keys(s.ds.w).length) return true;
    return false;
  }
  function backupLine(savedDay, today, progress) {
    if (savedDay && daysBetween(savedDay, today) < 14) return 'Last saved copy: ' + longDate(savedDay) + '.';
    if ((savedDay && daysBetween(savedDay, today) >= 14) || (!savedDay && progress)) return STALE;
    return '';
  }
  function keepIfConfirmed(current, next, confirmed) { return confirmed ? next : current; }
  function rememberBackup(storage, appKey, day) { storage.setItem(backupKey(appKey), day || isoDay()); }
  function forgetBackup(storage, appKey) { storage.removeItem(backupKey(appKey)); }
  function readBackup(storage, appKey) { try { return storage.getItem(backupKey(appKey)) || ''; } catch (e) { return ''; } }
  function askPersist(nav) {
    try {
      const st = nav && nav.storage;
      if (st && typeof st.persist === 'function') return st.persist();
    } catch (e) {}
  }
  function homeTip(capacitor) { return capacitor ? '' : TIP; }
  return {
    exportObj, exportText, importObj, fileName, shareFileName, deliver, backupKey, isoDay, daysBetween, longDate,
    hasProgress, backupLine, keepIfConfirmed, rememberBackup, forgetBackup, readBackup, askPersist, homeTip, TIP, STALE,
  };
});
