# SakaogluStore Admin Panel

SakaogluStore için geliştirilen bu admin paneli, e-ticaret platformunun yönetimsel işlemlerini kolayca yapabilmenizi sağlar. Kullanıcı, sipariş ve ürün yönetimi, toplu işlemler ve gelişmiş arama/filtreleme özellikleri sunar.

## Özellikler

- **Kullanıcı Yönetimi**
  - Kullanıcıları listele, ara ve filtrele
  - Kullanıcı doğrulama (bireysel ve toplu)
  - Kullanıcı adreslerini görüntüle
- **Sipariş Yönetimi**
  - Siparişleri listele, ara ve filtrele
  - Sipariş durumunu güncelle (onayla, reddet, iptal et)
  - Kargo takip numarası ekle/güncelle (tekli ve Excel ile toplu)
  - PDF yükleyerek toplu sipariş onaylama
  - Siparişleri XML/Excel olarak dışa aktar
- **Ürün Yönetimi**
  - Hediye kutularını ekle, düzenle, sil
  - Ürün içeriklerini yönet
- **Admin Yönetimi**
  - Yeni admin ekle, yetkilerini belirle
  - Adminleri düzenle ve sil
- **Gelişmiş Arama & Filtreleme**
  - Kullanıcı, sipariş ve ürünlerde hızlı arama
  - Tarih aralığı ve durum filtreleri
- **Mobil ve Masaüstü Uyumlu Modern Arayüz**

## Kurulum

1. **Gereksinimler:**
   - Node.js 18+
   - npm veya yarn

2. **Projeyi Klonla:**
   ```sh
   git clone https://github.com/sakaoglustore/sakaoglustore-admin-panel.git
   cd sakaoglustore-admin-panel
   ```

3. **Bağımlılıkları Yükle:**
   ```sh
   npm install
   # veya
   yarn install
   ```

4. **Başlat:**
   ```sh
   npm start
   # veya
   yarn start
   ```

5. **Giriş:**
   - Admin hesabınızla giriş yapın.
   - Gerekli yetkilere sahip değilseniz bazı sayfalara erişemezsiniz.

## API
Tüm işlemler için [https://api.sakaoglustore.net](https://api.sakaoglustore.net) adresi kullanılmaktadır. Giriş yaptıktan sonra alınan JWT token otomatik olarak tüm isteklerde kullanılır.

## Geliştirici Notları
- PDF ile toplu sipariş onaylama ve Excel ile toplu kargo takip güncelleme desteklenir.
- İptal edilen siparişler tekrar onaylanabilir.
- Her işlem sonrası başarılı/başarısız bildirimler ekranda gösterilir.
- Modern ve responsive arayüz ile kolay kullanım.

## Katkı ve Lisans
Katkıda bulunmak için pull request gönderebilirsiniz. Lisans: MIT

---

**Güncelleme tarihi:** 25 Haziran 2025
