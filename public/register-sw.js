// PWA Service Worker kayıt + otomatik güncelleme
(function () {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').then(function (reg) {
        // Her 5 dakikada güncelleme kontrol et
        setInterval(function () {
          reg.update();
        }, 5 * 60 * 1000);

        // Yeni SW bulunduğunda sayfayı yenile
        reg.addEventListener('updatefound', function () {
          var newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', function () {
              if (newWorker.state === 'activated') {
                // Yeni versiyon aktif, sayfayı yenile
                window.location.reload();
              }
            });
          }
        });
      }).catch(function (err) {
        console.warn('SW kayıt hatası:', err);
      });
    });
  }
})();
