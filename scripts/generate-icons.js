// Build-time: public/ dosyalarını dist'e kopyala + index.html'e PWA meta etiketleri ekle
// Sharp gerektirmez - SVG ikonları doğrudan kullanılır
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const DIST_DIR = path.join(ROOT, 'dist');

function copyPublicFiles() {
  if (!fs.existsSync(PUBLIC_DIR)) {
    console.log('  ℹ public/ klasörü yok, atlandı.');
    return;
  }
  const files = fs.readdirSync(PUBLIC_DIR);
  for (const f of files) {
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
    <link rel="apple-touch-icon" href="/icon.svg" />
    <link rel="icon" type="image/svg+xml" href="/icon.svg" />
    <script src="/register-sw.js" defer></script>
  `;

  html = html.replace('</head>', meta + '\n  </head>');
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('  ✓ dist/index.html → PWA meta etiketleri eklendi');
}

console.log('📦 PWA dosyaları kopyalanıyor...');
copyPublicFiles();
console.log('📝 index.html güncelleniyor...');
injectPwaMeta();
console.log('✅ PWA hazır');
