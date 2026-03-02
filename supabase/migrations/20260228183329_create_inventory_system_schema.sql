/*
  # Stok Yönetim Sistemi - Ana Veritabanı Şeması

  ## Yeni Tablolar
  
  ### 1. `products` - Ürünler Tablosu
    - `product_id` (uuid, primary key) - Benzersiz ürün kimliği
    - `sku` (text, unique) - Stok Kodu (silinse dahi tekrar kullanılamaz)
    - `name` (text) - Ürün adı
    - `current_stock` (numeric) - Güncel stok miktarı (negatif değer alabilir)
    - `fixed_cost_usd` (numeric) - Sabit birim maliyet
    - `list_price_usd` (numeric, nullable) - Liste satış fiyatı
    - `is_deleted` (boolean) - Soft-delete flag
    - `version` (integer) - Optimistic locking için versiyon numarası
    - `created_at` (timestamptz) - Oluşturulma zamanı
    - `updated_at` (timestamptz) - Güncellenme zamanı

  ### 2. `transactions` - Stok Hareketleri Tablosu
    - `transaction_id` (uuid, primary key) - Benzersiz hareket kimliği
    - `product_id` (uuid, foreign key) - İlişkili ürün
    - `user_id` (uuid) - İşlemi yapan kullanıcı
    - `type` (text) - Hareket tipi: IN (Giriş), OUT (Çıkış), ADJUST (Düzeltme)
    - `quantity` (numeric) - Hareket miktarı
    - `reference_number` (text, nullable) - Fatura/İrsaliye numarası
    - `reason_code` (text, nullable) - Düzeltme nedeni
    - `created_at` (timestamptz) - İşlem zamanı

  ### 3. `activity_log` - Denetim İzi Tablosu
    - `log_id` (bigserial, primary key) - Otomatik artan log kimliği
    - `user_id` (uuid) - İşlemi yapan kullanıcı
    - `action` (text) - İşlem tipi (BULK_IMPORT, MANUAL_ADJUST, vb.)
    - `payload` (jsonb) - Detaylı değişim bilgisi (Before/After)
    - `created_at` (timestamptz) - Log zamanı

  ## Güvenlik
    - Her tablo için RLS aktif
    - Authenticated kullanıcılar kendi verilerine erişebilir
    - Transactions ve Activity_Log sadece ekleme ve okuma (silme yok)

  ## Performans
    - SKU için unique index
    - Product_id için foreign key indexleri
    - Soft-delete için partial index
*/

-- Products Tablosu
CREATE TABLE IF NOT EXISTS products (
  product_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text UNIQUE NOT NULL,
  name text NOT NULL,
  current_stock numeric(18,4) DEFAULT 0 NOT NULL,
  fixed_cost_usd numeric(18,4) NOT NULL,
  list_price_usd numeric(18,4),
  is_deleted boolean DEFAULT false NOT NULL,
  version integer DEFAULT 1 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT check_positive_cost CHECK (fixed_cost_usd >= 0),
  CONSTRAINT check_positive_price CHECK (list_price_usd IS NULL OR list_price_usd >= 0)
);

-- Transactions Tablosu
CREATE TABLE IF NOT EXISTS transactions (
  transaction_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(product_id),
  user_id uuid NOT NULL,
  type text NOT NULL,
  quantity numeric(18,4) NOT NULL,
  reference_number text,
  reason_code text,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT check_transaction_type CHECK (type IN ('IN', 'OUT', 'ADJUST')),
  CONSTRAINT check_nonzero_quantity CHECK (quantity != 0)
);

-- Activity Log Tablosu
CREATE TABLE IF NOT EXISTS activity_log (
  log_id bigserial PRIMARY KEY,
  user_id uuid NOT NULL,
  action text NOT NULL,
  payload jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Performans İndeksleri
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_transactions_product ON transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);

-- Updated_at otomatik güncelleme için trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Politikaları
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Products Politikaları
CREATE POLICY "Authenticated users can view all products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Transactions Politikaları (Silme yok, sadece ekleme ve okuma)
CREATE POLICY "Authenticated users can view all transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Activity Log Politikaları (Silme yok, sadece ekleme ve okuma)
CREATE POLICY "Authenticated users can view all activity logs"
  ON activity_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert activity logs"
  ON activity_log FOR INSERT
  TO authenticated
  WITH CHECK (true);