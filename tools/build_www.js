// Copy the static PWA into www/ so Capacitor bundles it inside the APK (fully offline from first launch).
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), out = path.join(root, 'www');
const items = ['index.html', 'style.css', 'app.js', 'morph.js', 'lessons.js', 'identify.js', 'drillpick.js', 'liturgical.js', 'church.js', 'sentences.html', 'sentences.js', 'sentences', 'manifest.webmanifest', 'sw.js', 'data', 'icons', 'fonts'];
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
for (const it of items) fs.cpSync(path.join(root, it), path.join(out, it), { recursive: true });
console.log('www/ built:', items.join(', '));
