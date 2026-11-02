// Generate Capacitor asset sources (assets/) from the existing PWA icon. Run: node tools/make_android_assets.js && npx capacitor-assets generate --android
const sharp = require('sharp'), fs = require('fs');
const src = 'icons/icon-512-maskable.png', bg = '#7a2e1d', paper = '#faf7f2';
fs.mkdirSync('assets', { recursive: true });
(async () => {
  const icon = n => sharp(src).resize(n, n).png().toBuffer();
  await sharp(src).resize(1024, 1024).toFile('assets/icon-only.png');
  // Adaptive foreground: capacitor-assets insets it 16.7% (= the visible mask), so the full-bleed maskable icon fits as-is.
  await sharp(src).resize(1024, 1024).toFile('assets/icon-foreground.png');
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: bg } }).png().toFile('assets/icon-background.png');
  for (const f of ['splash.png', 'splash-dark.png'])
    await sharp({ create: { width: 2732, height: 2732, channels: 4, background: paper } })
      .composite([{ input: await icon(600), gravity: 'center' }]).png().toFile('assets/' + f);
  console.log('assets/ ready');
})();
