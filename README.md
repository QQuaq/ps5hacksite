# ORBIT host + poopsploit dosyaları

Site içeriği [soniciso1/poopsploit](https://github.com/soniciso1/poopsploit) üzerinden `npm run sync` ile `public/` klasörüne kopyalanır.

**Yerel panel:** http://127.0.0.1/panel (DNS/IP ve günlük)

## PS5’te kullanım

### DNS + Kullanım Kılavuzu (önerilen)

1. `npm run sync` (ilk sefer ve poopsploit güncellenince)
2. `start.bat` → **yönetici**
3. Panelden IP’yi PS5 **birincil DNS** yap
4. Kullanım Kılavuzu veya tarayıcıda `http://IP/`

### Sadece tarayıcı

`http://BILGISAYAR-IP/` adresine doğrudan git (DNS şart değil).

## Geliştirme

```bash
git clone https://github.com/soniciso1/poopsploit.git vendor/poopsploit   # ilk sefer
npm run sync      # vendor -> public
npm run dev       # :8080 önizleme
npm start         # :80 + DNS :53 (yönetici)
npm run pages     # GitHub Pages docs/ (isteğe bağlı)
```

## Güncelleme (GitHub)

```powershell
npm run pages
git add -A
git commit -m "Site guncelleme"
git push
```