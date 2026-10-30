# Ortak Kasa — Portföy Demosu

Orijinal tasarımdan hazırlanmış, kişisel kayıt içermeyen bağımsız demo.
Gelir/gider, kişi ve ay filtreleri, kategori grafiği, aylık tekrarlanan giderler,
kredi kartı harcamaları, ödemeler ve ekstre günü ayarı korunmuştur.

Bu sürüm sunucu veritabanı yerine localStorage kullanır. Her tarayıcı boş başlar;
kayıtlar cihazlar arasında paylaşılmaz. Orijinal uygulamaya istek göndermez.
Kişi isimleri örnek isimlerle değiştirilmiştir. PIN erişimi demo için kaldırılmıştır.
Üst çubuktaki “Demoyu sıfırla” yalnızca bu demo adresindeki tarayıcı kayıtlarını siler.

## Yerel geliştirme
npm ci
npm run dev
# Tarayıcıda /demo.html adresini açın.

## Doğrulama
npm test
npm run build

## GitHub Pages
Canlı demo: https://r5vers.github.io/ortak-kasa/

Yayın dosyaları `docs/` içinde, yayın giriş sayfası deponun kökündedir.
Değişikliklerden sonra `npm ci`, `npm test` ve `npm run build` komutlarını çalıştırın.
Build komutu hem docs/ klasörünü hem kökteki index.html dosyasını günceller.

GitHub Pages, main dalının kökünden yayınlanır. Kaynak HTML şablonu demo.html dosyasıdır.
Bu proje bağımsız bir tarayıcı demosudur; sunucu veritabanı ve kullanıcı doğrulaması içermez.
