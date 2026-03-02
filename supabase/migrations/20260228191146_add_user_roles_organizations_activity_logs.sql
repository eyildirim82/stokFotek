/*
  User Roles, Organizations, and Activity Logs

  1. New Tables
    - organizations: Store company/organization information
    - user_roles: Assign roles to users within organizations (admin, manager, warehouse_staff, viewer)
    - user_activity_logs: Track all user actions for audit purposes (separate from existing activity_log)

  2. Modified Tables
    - user_profiles: Add default_organization_id
    - products: Add organization_id and min_stock_level
    - transactions: Add organization_id

  3. Security
    - Enable RLS on all new tables
    - Organization-based access control
    - Role-based permissions (admin > manager > warehouse_staff > viewer)

  4. Migration Notes
    - Creates a default organization for existing data
    - Assigns existing users as admins in the default organization
*/

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'manager', 'warehouse_staff', 'viewer')),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(user_id, organization_id)
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create user_activity_logs table (separate from existing activity_log)
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Add columns to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'default_organization_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN default_organization_id uuid REFERENCES organizations(id);
  END IF;
END $$;

-- Add columns to products
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE products ADD COLUMN organization_id uuid REFERENCES organizations(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'min_stock_level'
  ) THEN
    ALTER TABLE products ADD COLUMN min_stock_level numeric(18,4) DEFAULT 0;
  END IF;
END $$;

-- Add columns to transactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN organization_id uuid REFERENCES organizations(id);
  END IF;
END $$;

-- Create default organization and migrate existing data
DO $$
DECLARE
  default_org_id uuid;
BEGIN
  INSERT INTO organizations (name, created_at)
  VALUES ('Default Organization', now())
  ON CONFLICT DO NOTHING
  RETURNING id INTO default_org_id;

  IF default_org_id IS NULL THEN
    SELECT id INTO default_org_id FROM organizations WHERE name = 'Default Organization' LIMIT 1;
  END IF;

  -- Migrate existing products
  UPDATE products SET organization_id = default_org_id WHERE organization_id IS NULL;
  
  -- Migrate existing transactions
  UPDATE transactions SET organization_id = default_org_id WHERE organization_id IS NULL;
  
  -- Assign all existing users as admins in default organization
  INSERT INTO user_roles (user_id, organization_id, role)
  SELECT id, default_org_id, 'admin'
  FROM auth.users
  ON CONFLICT (user_id, organization_id) DO NOTHING;
  
  -- Set default organization for existing profiles
  UPDATE user_profiles SET default_organization_id = default_org_id WHERE default_organization_id IS NULL;
END $$;

-- Make organization_id NOT NULL after migration
ALTER TABLE products ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE transactions ALTER COLUMN organization_id SET NOT NULL;

-- RLS Policies for organizations
CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.organization_id = organizations.id
      AND user_roles.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can create organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update their organizations"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.organization_id = organizations.id
      AND user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- RLS Policies for user_roles
CREATE POLICY "Users can view roles in their organizations"
  ON user_roles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles AS ur
      WHERE ur.organization_id = user_roles.organization_id
      AND ur.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage user roles"
  ON user_roles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles AS ur
      WHERE ur.organization_id = user_roles.organization_id
      AND ur.user_id = auth.uid()
      AND ur.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles AS ur
      WHERE ur.organization_id = user_roles.organization_id
      AND ur.user_id = auth.uid()
      AND ur.role = 'admin'
    )
  );

-- RLS Policies for user_activity_logs
CREATE POLICY "Users can view activity logs in their organizations"
  ON user_activity_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.organization_id = user_activity_logs.organization_id
      AND user_roles.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create activity logs"
  ON user_activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.organization_id = user_activity_logs.organization_id
      AND user_roles.user_id = auth.uid()
    )
  );

-- Update products policies to include organization check
DROP POLICY IF EXISTS "Authenticated users can view all products" ON products;
DROP POLICY IF EXISTS "Authenticated users can insert products" ON products;
DROP POLICY IF EXISTS "Authenticated users can update products" ON products;

CREATE POLICY "Users can view products in their organizations"
  ON products FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.organization_id = products.organization_id
      AND user_roles.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and managers can create products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.organization_id = products.organization_id
      AND user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins and managers can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.organization_id = products.organization_id
      AND user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins can delete products"
  ON products FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.organization_id = products.organization_id
      AND user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Update transactions policies
DROP POLICY IF EXISTS "Authenticated users can view all transactions" ON transactions;
DROP POLICY IF EXISTS "Authenticated users can insert transactions" ON transactions;

CREATE POLICY "Users can view transactions in their organizations"
  ON transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.organization_id = transactions.organization_id
      AND user_roles.user_id = auth.uid()
    )
  );

CREATE POLICY "Authorized users can create transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.organization_id = transactions.organization_id
      AND user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'manager', 'warehouse_staff')
    )
  );

-- Create function to get user role in organization
CREATE OR REPLACE FUNCTION get_user_role(org_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM user_roles
  WHERE user_id = auth.uid()
  AND organization_id = org_id;
  
  RETURN user_role;
END;
$$;

-- Create function to log user activity
CREATE OR REPLACE FUNCTION log_user_activity(
  org_id uuid,
  action_type text,
  entity_type_val text,
  entity_id_val uuid,
  details_val jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_activity_logs (user_id, organization_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), org_id, action_type, entity_type_val, entity_id_val, details_val);
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_org ON user_roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_org ON user_activity_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created ON user_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_org ON products(organization_id);
CREATE INDEX IF NOT EXISTS idx_transactions_org ON transactions(organization_id);