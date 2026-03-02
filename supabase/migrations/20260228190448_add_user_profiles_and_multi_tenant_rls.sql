/*
  # Kullanıcı Profilleri ve Çok Kullanıcılı RLS Politikaları

  ## Yeni Tablolar
  
  ### 1. `user_profiles` - Kullanıcı Profilleri Tablosu
    - `id` (uuid, primary key) - Supabase auth.users ile ilişkili kullanıcı kimliği
    - `email` (text) - Kullanıcı email adresi
    - `full_name` (text, nullable) - Kullanıcı adı soyadı
    - `created_at` (timestamptz) - Hesap oluşturulma zamanı
    - `updated_at` (timestamptz) - Profil güncellenme zamanı

  ## Değişiklikler
  
  ### Products Tablosu
    - `user_id` (uuid) - Ürünün sahibi olan kullanıcı eklendi
    
  ### Transactions Tablosu
    - Mevcut `user_id` alanı korundu
    
  ### Activity Log Tablosu
    - Mevcut `user_id` alanı korundu

  ## Güvenlik Güncellemeleri
    - Her tablo için RLS politikaları güncellendi
    - Kullanıcılar sadece kendi verilerini görebilir ve yönetebilir
    - user_profiles için otomatik trigger eklendi (yeni kullanıcı kaydında profil oluşturur)
    
  ## Notlar
    - Mevcut veriler için user_id'ler geçici UUID olarak ayarlanacak
    - Yeni veriler authenticated kullanıcının ID'si ile kaydedilecek
*/

-- User Profiles Tablosu
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Products tablosuna user_id ekle
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE products ADD COLUMN user_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
  END IF;
END $$;

-- RLS Politikalarını Güncelle

-- Products için eski politikaları kaldır ve yenilerini ekle
DROP POLICY IF EXISTS "Authenticated users can view all products" ON products;
DROP POLICY IF EXISTS "Authenticated users can insert products" ON products;
DROP POLICY IF EXISTS "Authenticated users can update products" ON products;

CREATE POLICY "Users can view own products"
  ON products FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own products"
  ON products FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Transactions için eski politikaları kaldır ve yenilerini ekle
DROP POLICY IF EXISTS "Authenticated users can view all transactions" ON transactions;
DROP POLICY IF EXISTS "Authenticated users can insert transactions" ON transactions;

CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Activity Log için eski politikaları kaldır ve yenilerini ekle
DROP POLICY IF EXISTS "Authenticated users can view all activity logs" ON activity_log;
DROP POLICY IF EXISTS "Authenticated users can insert activity logs" ON activity_log;

CREATE POLICY "Users can view own activity logs"
  ON activity_log FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own activity logs"
  ON activity_log FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- User Profiles RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Yeni kullanıcı kaydında otomatik profil oluşturma
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger for user_profiles
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();