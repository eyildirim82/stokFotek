# ADR 001: Atomik Stok Operasyonları ve RPC Kullanımı

## Durum
Kabul Edildi

## Bağlam
Stok yönetimi gibi kritik sistemlerde, verinin tutarlılığı (Data Integrity) en önemli önceliktir. Birden fazla kullanıcının aynı anda stok güncellediği (Concurrency) senaryolarda race condition riskleri bulunmaktadır. Ayrıca, bir stok güncellemesi yapıldığında eşzamanlı olarak işlem kaydı (`transactions`) ve aktivite logu (`user_activity_logs`) oluşturulması gerekmektedir.

## Karar
Frontend tarafında doğrudan `supabase.from('products').update(...)` kullanmak yerine, tüm stok hareketlerinin veritabanı seviyesinde bir RPC fonksiyonu (`process_stock_movement`) üzerinden yürütülmesine karar verilmiştir.

### Teknik Detaylar
1. **Veritabanı Transaction'ı**: RPC fonksiyonu bir PL/pgSQL bloğu içinde çalışır, bu da tüm adımların (Update + Insert + Log) ya tamamen gerçekleşmesini ya da hata durumunda tamamen geri alınmasını (Atomic) sağlar.
2. **Optimistic Locking**: Her ürünün bir `version` kolonu vardır. RPC çağrısı yapılırken UI tarafındaki eski versiyon gönderilir. Eğer veritabanındaki versiyon değişmişse (başka bir kullanıcı işlem yapmışsa) işlem reddedilir.
3. **Merkezi Güvenlik**: RLS politikaları RPC içinde de `SECURITY DEFINER` ve `organization_id` kontrolü ile sıkı bir şekilde uygulanır.

## Sonuçlar
- **Artılar**:
    - Veri bütünlüğü %100 garanti altına alındı.
    - Race condition hataları kullanıcıya anlamlı hata mesajları olarak döner.
    - Audit trail (denetim izi) atlanamaz hale geldi.
- **Eksiler**:
    - İş mantığının bir kısmı veritabanı (migrations) içine taşındı, bu da deployment sırasında dikkat gerektirir.
