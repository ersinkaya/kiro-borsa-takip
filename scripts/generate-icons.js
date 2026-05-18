// Build-time: SVG'den PNG ikonları üret + dist/index.html'e PWA meta etiketleri ekle
const fs = require('fs');
const path = require('path');

const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const DIST_DIR = path.join(ROOT, 'dist');

const SVG_PATH = path.join(PUBLIC_DIR, 'icon.svg');

const sizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'icon-maskable-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon.png', size: 64 },
];

async function generateIcons() {
  if (!fs.existsSync(SVG_PATH)) {
    console.error('icon.svg bulunamadı:', SVG_PATH);
    process.exit(1);
  }
  const svg = fs.readFileSync(SVG_PATH);

  for (const { name, size } of sizes) {
    const out = path.join(DIST_DIR, name);
    await sharp(svg).resize(size, size).png().toFile(out);
    console.log('  ✓', name, `(${size}x${size})`);
  }

  // public/* dosyalarını dist'e kopyala
  const publicFiles = fs.readdirSync(PUBLIC_DIR);
  for (const f of publicFiles) {
    const src = path.join(PUBLIC_DIR, f);
    const dst = path.join(DIST_DIR, f);
    if (fs.statSync(src).isFile()) {
      fs.copyFileSync(src, dst);
      console.log('  ✓ public/' + f + ' → dist/');
    }
  }
}

function injectPwaMeta() {
  const indexPath = path.join(DIST_DIR, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.error('dist/index.html bulunamadı, expo export çalıştırıldı mı?');
    process.exit(1);
  }
  let html = fs.readFileSync(indexPath, 'utf8');

  if (html.includes('manifest.webmanifest')) {
    console.log('  ℹ index.html zaten PWA meta içeriyor, atlandı.');
    return;
  }

  const meta = `
    <link rel="manifest" href="/manifest.webmanifest" />
    <meta name="theme-color" content="#1a1a2e" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Borsa Takip" />
    <meta name="application-name" content="Borsa Takip" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
    <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
    <link rel="icon" type="image/svg+xml" href="/icon.svg" />
    <link rel="shortcut icon" href="/favicon.png" />
    <script src="/register-sw.js" defer></script>
  `;

  html = html.replace('</head>', meta + '\n  </head>');
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('  ✓ dist/index.html → PWA meta etiketleri eklendi');
}

(async () => {
  console.log('🎨 PWA ikonları üretiliyor...');
  await generateIcons();
  console.log('📝 index.html güncelleniyor...');
  injectPwaMeta();
  console.log('✅ PWA hazır');
})().catch((e) => {
  console.error('❌ Hata:', e);
  process.exit(1);
});
