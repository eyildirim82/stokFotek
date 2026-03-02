/*
  Consolidated Audit Fixes Migration
  
  1. Atomic Stock Movement:
    - Creates `process_stock_movement` function to handle stock updates and transaction records atomically.
  
  2. Activity Log Consolidation:
    - Migrates data from `activity_log` to `user_activity_logs`.
    - Updates `user_activity_logs` to ensure consistency.
    - Drops the legacy `activity_log` table.
*/

-- 1. Atomic Stock Movement Function
CREATE OR REPLACE FUNCTION public.process_stock_movement(
  p_product_id uuid,
  p_org_id uuid,
  p_user_id uuid,
  p_type text,
  p_quantity numeric,
  p_reference_number text DEFAULT NULL,
  p_reason_code text DEFAULT NULL,
  p_current_version integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_new_stock numeric;
  v_new_version integer;
  v_product_exists boolean;
BEGIN
  -- Validate quantity
  IF p_quantity = 0 THEN
    RAISE EXCEPTION 'Miktar sıfır olamaz.';
  END IF;

  -- Ensure product belongs to organization and check version if provided
  IF p_current_version IS NOT NULL THEN
    UPDATE products
    SET current_stock = current_stock + p_quantity,
        version = version + 1
    WHERE product_id = p_product_id 
      AND organization_id = p_org_id
      AND version = p_current_version
    RETURNING current_stock, version INTO v_new_stock, v_new_version;
  ELSE
    UPDATE products
    SET current_stock = current_stock + p_quantity,
        version = version + 1
    WHERE product_id = p_product_id 
      AND organization_id = p_org_id
    RETURNING current_stock, version INTO v_new_stock, v_new_version;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stok güncelleme başarısız: Ürün bulunamadı, farklı bir organizasyona ait veya versiyon uyuşmazlığı (Concurrency Error).';
  END IF;

  -- Insert transaction record
  INSERT INTO transactions (
    product_id, 
    user_id, 
    organization_id, 
    type, 
    quantity, 
    reference_number, 
    reason_code
  )
  VALUES (
    p_product_id, 
    p_user_id, 
    p_org_id, 
    p_type, 
    p_quantity, 
    p_reference_number, 
    p_reason_code
  );

  -- Log activity
  PERFORM log_user_activity(
    p_org_id, 
    CASE WHEN p_quantity > 0 THEN 'stock_in' ELSE 'stock_out' END, 
    'transaction', 
    p_product_id, 
    jsonb_build_object(
      'quantity', p_quantity,
      'new_stock', v_new_stock,
      'reference', p_reference_number,
      'reason', p_reason_code
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'new_stock', v_new_stock,
    'new_version', v_new_version
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_stock_movement(uuid, uuid, uuid, text, numeric, text, text, integer) TO authenticated;

-- 2. Activity Log Consolidation
-- First, ensure user_activity_logs has enough flexibility for old logs
-- The existing user_activity_logs has: 
-- id, user_id, organization_id, action, entity_type, entity_id, details, created_at

-- Migrate data from legacy activity_log
-- activity_log has: log_id, user_id, action, payload, created_at
-- We need to map an organization_id. We'll use the default organization for orphans.
DO $$
DECLARE
  v_default_org_id uuid;
BEGIN
  SELECT id INTO v_default_org_id FROM organizations WHERE name = 'Default Organization' LIMIT 1;
  
  IF v_default_org_id IS NULL THEN
    -- If no default org, use any available org or create one if needed
    SELECT id INTO v_default_org_id FROM organizations LIMIT 1;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_log') THEN
    INSERT INTO user_activity_logs (
      user_id, 
      organization_id, 
      action, 
      entity_type, 
      details, 
      created_at
    )
    SELECT 
      user_id, 
      COALESCE((SELECT default_organization_id FROM user_profiles WHERE id = activity_log.user_id), v_default_org_id),
      action,
      'legacy_system',
      payload,
      created_at
    FROM activity_log;
    
    -- Drop the legacy table
    DROP TABLE activity_log;
  END IF;
END $$;
