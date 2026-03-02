/*
  Atomic Product Creation & Bulk Import RPCs
*/

-- 1. Create Product with Initial Stock
CREATE OR REPLACE FUNCTION public.create_product_with_stock(
  p_sku text,
  p_name text,
  p_fixed_cost_usd numeric,
  p_list_price_usd numeric,
  p_min_stock_level numeric,
  p_current_stock numeric,
  p_org_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_product_id uuid;
BEGIN
  -- Insert product
  INSERT INTO products (
    sku,
    name,
    fixed_cost_usd,
    list_price_usd,
    min_stock_level,
    current_stock,
    organization_id
  )
  VALUES (
    p_sku,
    p_name,
    p_fixed_cost_usd,
    p_list_price_usd,
    p_min_stock_level,
    p_current_stock,
    p_org_id
  )
  RETURNING product_id INTO v_product_id;

  -- Insert transaction record if initial stock is not zero
  IF p_current_stock != 0 THEN
    INSERT INTO transactions (
      product_id,
      user_id,
      organization_id,
      type,
      quantity,
      reason_code
    )
    VALUES (
      v_product_id,
      p_user_id,
      p_org_id,
      'ADJUST',
      p_current_stock,
      'INITIAL_STOCK'
    );
  END IF;

  -- Log activity
  PERFORM log_user_activity(
    p_org_id,
    'create',
    'product',
    v_product_id,
    jsonb_build_object(
      'sku', p_sku,
      'name', p_name,
      'initial_stock', p_current_stock
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'product_id', v_product_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_product_with_stock(text, text, numeric, numeric, numeric, numeric, uuid, uuid) TO authenticated;

-- 2. Bulk Create Products with Stock Transactions
CREATE OR REPLACE FUNCTION public.bulk_create_products(
  p_products jsonb, -- Array of product objects
  p_org_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_product_record jsonb;
  v_product_id uuid;
  v_inserted_count integer := 0;
  v_product_skus text[] := ARRAY[]::text[];
BEGIN
  FOR v_product_record IN SELECT * FROM jsonb_array_elements(p_products)
  LOOP
    -- Insert product
    INSERT INTO products (
      sku,
      name,
      fixed_cost_usd,
      list_price_usd,
      current_stock,
      organization_id
    )
    VALUES (
      (v_product_record->>'sku'),
      (v_product_record->>'name'),
      (v_product_record->>'fixed_cost_usd')::numeric,
      (v_product_record->>'list_price_usd')::numeric,
      (v_product_record->>'current_stock')::numeric,
      p_org_id
    )
    RETURNING product_id INTO v_product_id;

    v_inserted_count := v_inserted_count + 1;
    v_product_skus := array_append(v_product_skus, (v_product_record->>'sku'));

    -- Insert transaction if stock != 0
    IF (v_product_record->>'current_stock')::numeric != 0 THEN
      INSERT INTO transactions (
        product_id,
        user_id,
        organization_id,
        type,
        quantity,
        reason_code
      )
      VALUES (
        v_product_id,
        p_user_id,
        p_org_id,
        'ADJUST',
        (v_product_record->>'current_stock')::numeric,
        'BULK_IMPORT'
      );
    END IF;
  END LOOP;

  -- Log single bulk activity
  PERFORM log_user_activity(
    p_org_id,
    'BULK_IMPORT',
    'product',
    NULL,
    jsonb_build_object(
      'count', v_inserted_count,
      'skus', v_product_skus
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'count', v_inserted_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.bulk_create_products(jsonb, uuid, uuid) TO authenticated;
