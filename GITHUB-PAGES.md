# GitHub Pages (ücretsiz, sürekli)

ORBIT’in **görünümü ve statik dosyaları** GitHub Pages’te ücretsiz kalabilir.  
**DNS yönlendirmesi ve yerel IP** GitHub’da çalışmaz; bunun için yine `start.bat` gerekir.

## Ne nerede çalışır?

| Özellik | github.io | Bilgisayar (`start.bat`) |
|--------|-----------|---------------------------|
| Site arayüzü | Evet | Evet |
| `public` içi JS/CSS/dosya | Evet | Evet |
| Birincil DNS / port 53 | Hayır | Evet |
| Kılavuz adı yönlendirme | Hayır | Evet |
| Canlı panel / günlük | Hayır | Evet |

PS5’te **tarayıcıya github.io adresini yazmak** poopsploit tarzı kullanım için yeterli olabilir.  
**Ayarlar → Kullanım Kılavuzu** ile DNS yakalama için bilgisayar şart.

## Yayınlama

1. GitHub’da repo oluştur (ör. `orbit-ps5`).
2. Projeyi push et.
3. `npm run pages` — `docs/` klasörünü üretir.
4. Repo **Settings → Pages → Build: Deploy from branch → main → /docs**.
5. Birkaç dakika sonra: `https://KULLANICI.github.io/REPO/`

Statik panelde DNS IP göstermek için:  
`https://KULLANICI.github.io/REPO/panel.html?dns=192.168.1.124`

## Yerel + Pages birlikte

- Geliştirme: `npm run dev`
- PS5 DNS: `start.bat` (yönetici)
- Herkese açık kopya: `npm run pages` sonra commit + push