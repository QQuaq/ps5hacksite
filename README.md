# ORBIT — PS5 yerel site

**Canlı site (GitHub Pages):** https://qquaq.github.io/ps5hacksite/  
**Panel:** https://qquaq.github.io/ps5hacksite/panel.html

## PS5’te kullanım

### A) Sadece tarayıcı (github.io)

PS5 internet tarayıcısına canlı adresi yaz — ücretsiz, bilgisayar kapalıyken de açılır.

### B) DNS ile kılavuz yolu (yerel sunucu)

1. `start.bat` dosyasını **yönetici** olarak çalıştır.
2. Paneldeki IP’yi PS5 **birincil DNS** yap.
3. Kullanım Kılavuzu’nu aç veya `http://IP/` adresine git.

## Geliştirme

```bash
npm run dev      # önizleme :8080
npm start        # PS5 için :80 + DNS :53 (yönetici)
npm run pages    # docs/ üret → GitHub Pages
```

## Güncelleme (GitHub)

```powershell
npm run pages
git add -A
git commit -m "Site guncelleme"
git push
```