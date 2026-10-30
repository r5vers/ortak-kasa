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

## Doğrulama
npm test
npm run build

## GitHub Pages
Canlı demo: https://r5vers.github.io/ortak-kasa/

Yayın dosyaları docs/ klasöründedir. Değişikliklerden sonra:

```bash
npm ci
npm test
npm run build
rm -rf docs
cp -r dist docs
touch docs/.nojekyll
```

GitHub Pages, main dalındaki /docs klasöründen yayınlanır.
Bu proje bağımsız bir tarayıcı demosudur; sunucu veritabanı ve kullanıcı doğrulaması içermez.
