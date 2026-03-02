/*
  # Security and Performance Optimization

  1. Index Improvements
    - Add missing indexes on foreign key columns
    - Improves query performance for JOIN operations

  2. RLS Policy Optimization
    - Replace auth.uid() with (SELECT auth.uid()) to avoid re-evaluation per row
    - Remove duplicate policies to prevent confusion
    - Ensures optimal query performance at scale

  3. Function Security
    - Fix search_path for all functions to prevent security issues
    - Use SECURITY DEFINER with explicit schema references

  4. Changes Made
    - Added indexes on foreign keys
    - Optimized all RLS policies to use SELECT pattern
    - Removed duplicate/conflicting policies
    - Secured function search paths
*/

-- ============================================================================
-- 1. ADD MISSING INDEXES ON FOREIGN KEYS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_organizations_created_by ON organizations(created_by);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_default_org_id ON user_profiles(default_organization_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_created_by ON user_roles(created_by);

-- ============================================================================
-- 2. DROP OLD DUPLICATE/INEFFICIENT POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own products" ON products;
DROP POLICY IF EXISTS "Users can insert own products" ON products;
DROP POLICY IF EXISTS "Users can update own products" ON products;
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can view own activity logs" ON activity_log;
DROP POLICY IF EXISTS "Users can insert own activity logs" ON activity_log;

-- ============================================================================
-- 3. RECREATE OPTIMIZED RLS POLICIES
-- ============================================================================

-- Products Table Policies
DROP POLICY IF EXISTS "Users can view products in their organizations" ON products;
CREATE POLICY "Users can view products in their organizations"
  ON products FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins and managers can create products" ON products;
CREATE POLICY "Admins and managers can create products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND role IN ('admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "Admins and managers can update products" ON products;
CREATE POLICY "Admins and managers can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND role IN ('admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "Admins can delete products" ON products;
CREATE POLICY "Admins can delete products"
  ON products FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );

-- Transactions Table Policies
DROP POLICY IF EXISTS "Users can view transactions in their organizations" ON transactions;
CREATE POLICY "Users can view transactions in their organizations"
  ON transactions FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authorized users can create transactions" ON transactions;
CREATE POLICY "Authorized users can create transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND role IN ('admin', 'manager', 'warehouse_staff')
    )
  );

-- User Activity Logs Table Policies
DROP POLICY IF EXISTS "Users can view activity logs in their organizations" ON user_activity_logs;
CREATE POLICY "Users can view activity logs in their organizations"
  ON user_activity_logs FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND role IN ('admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "Authenticated users can create activity logs" ON user_activity_logs;
CREATE POLICY "Authenticated users can create activity logs"
  ON user_activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
    )
  );

-- User Profiles Table Policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- Organizations Table Policies
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can create organizations" ON organizations;
CREATE POLICY "Admins can create organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update their organizations" ON organizations;
CREATE POLICY "Admins can update their organizations"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND role = 'admin'
    )
  )
  WITH CHECK (
    id IN (
      SELECT organization_id FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );

-- User Roles Table Policies
DROP POLICY IF EXISTS "Users can view roles in their organizations" ON user_roles;
CREATE POLICY "Users can view roles in their organizations"
  ON user_roles FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT ur.organization_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can manage user roles" ON user_roles;
CREATE POLICY "Admins can manage user roles"
  ON user_roles FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT ur.organization_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role = 'admin'
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT ur.organization_id FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role = 'admin'
    )
  );

-- ============================================================================
-- 4. FIX FUNCTION SEARCH PATHS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_org_id uuid;
BEGIN
  INSERT INTO public.organizations (name, created_by)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'organization_name', 'My Organization'),
    NEW.id
  )
  RETURNING id INTO new_org_id;

  INSERT INTO public.user_profiles (id, email, full_name, default_organization_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    new_org_id
  );

  INSERT INTO public.user_roles (user_id, organization_id, role, created_by)
  VALUES (NEW.id, new_org_id, 'admin', NEW.id);

  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.get_user_role(uuid);

CREATE FUNCTION public.get_user_role(org_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_roles.user_id = auth.uid()
    AND organization_id = org_id;

  RETURN user_role;
END;
$$;

DROP FUNCTION IF EXISTS public.log_user_activity(uuid, text, text, uuid, jsonb);

CREATE FUNCTION public.log_user_activity(
  p_organization_id uuid,
  p_action text,
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL,
  p_payload jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.user_activity_logs (
    organization_id,
    user_id,
    action,
    entity_type,
    entity_id,
    details
  )
  VALUES (
    p_organization_id,
    auth.uid(),
    p_action,
    p_entity_type,
    p_entity_id,
    p_payload
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_user_activity(uuid, text, text, uuid, jsonb) TO authenticated;
