// PWA Service Worker kayıt + iOS install banner
(function () {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function (err) {
        console.warn('SW kayıt hatası:', err);
      });
    });
  }

  // Android Chrome install prompt
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    window.__bt_installPrompt = function () {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.finally(function () {
        deferredPrompt = null;
      });
    };
  });
})();
