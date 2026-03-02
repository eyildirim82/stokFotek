export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          created_at: string
          log_id: number
          payload: Json | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          log_id?: number
          payload?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          log_id?: number
          payload?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          created_at: string
          current_stock: number
          fixed_cost_usd: number
          is_deleted: boolean
          list_price_usd: number | null
          min_stock_level: number | null
          name: string
          organization_id: string
          product_id: string
          sku: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          current_stock?: number
          fixed_cost_usd: number
          is_deleted?: boolean
          list_price_usd?: number | null
          min_stock_level?: number | null
          name: string
          organization_id: string
          product_id?: string
          sku: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Update: {
          created_at?: string
          current_stock?: number
          fixed_cost_usd?: number
          is_deleted?: boolean
          list_price_usd?: number | null
          min_stock_level?: number | null
          name?: string
          organization_id?: string
          product_id?: string
          sku?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      transactions: {
        Row: {
          created_at: string
          organization_id: string
          product_id: string
          quantity: number
          reason_code: string | null
          reference_number: string | null
          transaction_id: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          organization_id: string
          product_id: string
          quantity: number
          reason_code?: string | null
          reference_number?: string | null
          transaction_id?: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          organization_id?: string
          product_id?: string
          quantity?: number
          reason_code?: string | null
          reference_number?: string | null
          transaction_id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          }
        ]
      }
      user_activity_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          organization_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          organization_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          organization_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      user_profiles: {
        Row: {
          created_at: string
          default_organization_id: string | null
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_organization_id?: string | null
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_organization_id?: string | null
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_default_organization_id_fkey"
            columns: ["default_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          organization_id: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: {
          org_id: string
        }
        Returns: string
      }
      log_user_activity: {
        Args: {
          p_action: string
          p_entity_id?: string
          p_entity_type?: string
          p_organization_id: string
          p_payload?: Json
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
