export type JsonType =
  | boolean
  | null
  | number
  | string
  | JsonType[]
  | { [key: string]: JsonType | undefined }

interface IReadOnlyTable<Row extends Record<string, unknown>> {
  Insert: Partial<Row> & Record<string, unknown>
  Relationships: {
    columns: string[]
    foreignKeyName: string
    isOneToOne: boolean
    referencedColumns: string[]
    referencedRelation: string
  }[]
  Row: Row
  Update: Partial<Row> & Record<string, unknown>
}

type ICategoryDatabaseRow = {
  catalog_area: 'art' | 'decoration'
  created_at: string
  deleted_at: string | null
  description: string | null
  display_order: number
  id: string
  image_path: string
  is_active: boolean
  name: string
  slug: string
  updated_at: string
}

type IProductDatabaseRow = {
  category_id: string
  created_at: string
  deleted_at: string | null
  description: string | null
  id: string
  image_path: string | null
  is_active: boolean
  is_featured: boolean
  name: string
  price: number
  slug: string
  stock_quantity: number
  updated_at: string
}

type ISettingsDatabaseRow = {
  address: string
  bank_name: string
  business_hours: string
  business_name: string
  created_at: string
  facebook: string | null
  id: string
  instagram: string | null
  logo_path: string | null
  low_stock_threshold: number
  maps_url: string
  singleton_key: boolean
  transfer_alias: string
  transfer_cbu: string
  transfer_discount: number
  updated_at: string
  whatsapp: string
}

type ICustomerDatabaseRow = {
  created_at: string
  deleted_at: string | null
  first_name: string
  id: string
  last_name: string
  notes: string | null
  phone: string
  phone_normalized: string
  updated_at: string
}

type IGuestSessionDatabaseRow = {
  created_at: string
  expires_at: string
  id: string
  last_accessed_at: string | null
  revoked_at: string | null
  token_hash: string
  updated_at: string
}

type IOrderDatabaseRow = {
  created_at: string
  customer_first_name: string
  customer_id: string
  customer_last_name: string
  customer_phone: string
  customer_phone_normalized: string
  delivery_method: 'pickup' | 'shipping'
  discount: number
  id: string
  notes: string | null
  order_number: string
  payment_method: 'bank_transfer' | 'cash'
  payment_status: 'paid' | 'pending' | 'rejected'
  picked_up_at: string | null
  shipping_address: string | null
  status: 'cancelled' | 'confirmed' | 'delivered' | 'pending' | 'picked_up' | 'preparing' | 'ready'
  subtotal: number
  total: number
  updated_at: string
}

type IOrderItemDatabaseRow = {
  created_at: string
  id: string
  order_id: string
  product_id: string
  product_name: string
  quantity: number
  subtotal: number
  unit_price: number
  updated_at: string
}

type IGuestSessionOrderDatabaseRow = {
  created_at: string
  guest_session_id: string
  id: string
  order_id: string
  updated_at: string
}

type IRecoveryAttemptDatabaseRow = {
  blocked_until: string | null
  created_at: string
  failed_count: number
  fingerprint: string
  id: string
  scope: 'ip' | 'order_phone'
  updated_at: string
  window_started_at: string
}

type IProfileDatabaseRow = {
  created_at: string
  email: string
  full_name: string
  id: string
  is_active: boolean
  role: 'administrator'
  updated_at: string
}

type IInventoryMovementDatabaseRow = {
  created_at: string
  created_by: string | null
  id: string
  movement_type: 'initial_stock' | 'manual_adjustment' | 'order_cancelled' | 'order_created'
  order_id: string | null
  product_id: string
  quantity_delta: number
  reason: string | null
  stock_after: number
  stock_before: number
}

export interface IDatabase {
  public: {
    CompositeTypes: Record<string, never>
    Enums: {
      delivery_method: 'pickup' | 'shipping'
      order_status: 'cancelled' | 'confirmed' | 'delivered' | 'pending' | 'picked_up' | 'preparing' | 'ready'
      payment_method: 'bank_transfer' | 'cash'
      recovery_limit_scope: 'ip' | 'order_phone'
    }
    Functions: {
      cancel_order_with_stock: {
        Args: {
          p_actor_profile_id: string
          p_confirm_manual_refund: boolean
          p_expected_updated_at: string
          p_order_id: string
          p_reason: string
        }
        Returns: boolean
      }
      adjust_product_stock: {
        Args: {
          p_actor_profile_id: string
          p_product_id: string
          p_quantity_delta: number
          p_reason: string
        }
        Returns: number
      }
      clear_public_recovery_failures: {
        Args: {
          p_ip_fingerprint: string
          p_order_fingerprint: string
        }
        Returns: number
      }
      create_order_with_stock: {
        Args: {
          p_customer_first_name: string
          p_customer_last_name: string
          p_customer_phone: string
          p_customer_phone_normalized: string
          p_delivery_method: 'pickup' | 'shipping'
          p_guest_session_id: string
          p_items: JsonType
          p_notes: string | null
          p_payment_method: 'bank_transfer' | 'cash'
          p_shipping_address: string | null
        }
        Returns: {
          order_id: string
          order_number: string
        }[]
      }
      get_public_recovery_limit: {
        Args: {
          p_captcha_threshold: number
          p_ip_fingerprint: string
          p_order_fingerprint: string
          p_window: string
        }
        Returns: {
          captcha_required: boolean
          is_blocked: boolean
          retry_after_seconds: number
        }[]
      }
      recover_order_guest_session: {
        Args: {
          p_current_session_id: string | null
          p_expires_at: string
          p_order_id: string
          p_token_hash: string
        }
        Returns: {
          expires_at: string
          guest_session_id: string
        }[]
      }
      register_public_recovery_failure: {
        Args: {
          p_block_duration: string
          p_captcha_threshold: number
          p_ip_fingerprint: string
          p_max_attempts: number
          p_order_fingerprint: string
          p_window: string
        }
        Returns: {
          captcha_required: boolean
          is_blocked: boolean
          retry_after_seconds: number
        }[]
      }
      revoke_guest_session: {
        Args: { p_guest_session_id: string }
        Returns: boolean
      }
      touch_guest_session: {
        Args: { p_guest_session_id: string }
        Returns: boolean
      }
      transition_order_status: {
        Args: {
          p_actor_profile_id: string
          p_expected_updated_at: string
          p_order_id: string
          p_payment_status: 'paid' | 'pending' | 'rejected'
          p_status: 'cancelled' | 'confirmed' | 'delivered' | 'pending' | 'picked_up' | 'preparing' | 'ready'
        }
        Returns: boolean
      }
    }
    Tables: {
      categories: IReadOnlyTable<ICategoryDatabaseRow>
      customers: IReadOnlyTable<ICustomerDatabaseRow>
      products: IReadOnlyTable<IProductDatabaseRow> & {
        Relationships: [
          {
            columns: ['category_id']
            foreignKeyName: 'products_category_id_fkey'
            isOneToOne: false
            referencedColumns: ['id']
            referencedRelation: 'categories'
          },
        ]
      }
      guest_session_orders: IReadOnlyTable<IGuestSessionOrderDatabaseRow>
      guest_sessions: IReadOnlyTable<IGuestSessionDatabaseRow>
      inventory_movements: IReadOnlyTable<IInventoryMovementDatabaseRow> & {
        Relationships: [
          {
            columns: ['created_by']
            foreignKeyName: 'inventory_movements_created_by_fkey'
            isOneToOne: false
            referencedColumns: ['id']
            referencedRelation: 'profiles'
          },
          {
            columns: ['order_id']
            foreignKeyName: 'inventory_movements_order_id_fkey'
            isOneToOne: false
            referencedColumns: ['id']
            referencedRelation: 'orders'
          },
          {
            columns: ['product_id']
            foreignKeyName: 'inventory_movements_product_id_fkey'
            isOneToOne: false
            referencedColumns: ['id']
            referencedRelation: 'products'
          },
        ]
      }
      order_items: IReadOnlyTable<IOrderItemDatabaseRow>
      orders: IReadOnlyTable<IOrderDatabaseRow>
      profiles: IReadOnlyTable<IProfileDatabaseRow>
      public_recovery_attempts: IReadOnlyTable<IRecoveryAttemptDatabaseRow>
      settings: IReadOnlyTable<ISettingsDatabaseRow>
    }
    Views: Record<string, never>
  }
}
