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
  discount_percentage: number
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
  sale_price: number
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
  tiktok: string | null
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
  contract_concluded_at: string | null
  created_at: string
  customer_first_name: string
  customer_id: string
  customer_last_name: string
  customer_phone: string
  customer_phone_normalized: string
  delivery_method: 'pickup' | 'shipping'
  discount: number
  delivered_at: string | null
  id: string
  notes: string | null
  order_number: string
  payment_method: 'bank_transfer' | 'cash' | 'mercado_pago'
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
  list_unit_price: number
  order_id: string
  product_id: string
  product_name: string
  product_discount_percentage: number
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
  movement_type:
    | 'consumer_withdrawal_return'
    | 'initial_stock'
    | 'manual_adjustment'
    | 'order_cancelled'
    | 'order_created'
    | 'payment_re_reserved'
    | 'payment_reservation_released'
  order_id: string | null
  product_id: string
  quantity_delta: number
  reason: string | null
  stock_after: number
  stock_before: number
  withdrawal_request_id: string | null
}

export interface IDatabase {
  public: {
    CompositeTypes: Record<string, never>
    Enums: {
      delivery_method: 'pickup' | 'shipping'
      order_status: 'cancelled' | 'confirmed' | 'delivered' | 'pending' | 'picked_up' | 'preparing' | 'ready'
      payment_method: 'bank_transfer' | 'cash' | 'mercado_pago'
      recovery_limit_scope: 'ip' | 'order_phone'
    }
    Functions: {
      acknowledge_payment_webhook_v2: {
        Args: {
          p_environment: 'sandbox' | 'production'
          p_request_id: string
          p_resource_id: string
          p_resource_type: string
          p_signature_digest: string
        }
        Returns: boolean
      }
      enqueue_payment_reconciliation_v2: {
        Args: { p_attempt_id: string; p_run_at?: string }
        Returns: { job_id: string }[]
      }
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
      create_order_with_payment_v2: {
        Args: {
          p_customer_first_name: string
          p_customer_last_name: string
          p_customer_phone: string
          p_customer_phone_normalized: string
          p_delivery_method: 'pickup' | 'shipping'
          p_environment: 'sandbox' | 'production'
          p_guest_session_id: string
          p_items: JsonType
          p_notes: string | null
          p_request_fingerprint: string
          p_shipping_address: string | null
          p_idempotency_key: string
        }
        Returns: { order_id: string; attempt_id: string; reservation_expires_at: string }[]
      }
      release_expired_payment_reservations_v2: {
        Args: { p_limit?: number }
        Returns: { examined_count: number; released_count: number; approved_count: number }[]
      }
      reconcile_payment_transaction_v1: {
        Args: {
          p_expected_provider_version: number | null
          p_expected_status: 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled' | 'manual_review'
          p_last_error: string | null
          p_next_status: 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled' | 'manual_review'
          p_provider_status: string
          p_provider_updated_at: string | null
          p_provider_version: number | null
          p_review_required: boolean
          p_transaction_id: string
        }
        Returns: { aggregate_status: 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled' | 'manual_review'; transition_applied: boolean }[]
      }
      transition_payment_attempt_v2: {
        Args: {
          p_attempt_id: string
          p_expected_provider_version: number | null
          p_expected_status: 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled' | 'manual_review'
          p_next_status: 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled' | 'manual_review'
          p_provider_status: string
          p_provider_updated_at: string | null
          p_provider_version: number | null
        }
        Returns: { transition_applied: boolean }[]
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
      payment_attempts: IReadOnlyTable<{
        amount: number
        created_at: string
        currency: 'ARS'
        environment: 'sandbox' | 'production'
        external_reference: string
        id: string
        last_error: string | null
        operation_key: string
        order_id: string
        provider: 'mercado_pago'
         provider_order_id: string | null
         provider_preference_id: string | null
         provider_payment_id: string | null
         provider_updated_at: string | null
         provider_version: number | null
        provider_status: string | null
        reservation_expires_at: string
         status: 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled' | 'manual_review'
        updated_at: string
      }>
      payment_transactions: IReadOnlyTable<{
        amount: number
        created_at: string
        currency: 'ARS'
        environment: 'sandbox' | 'production'
        id: string
        last_error: string | null
        payment_attempt_id: string
        payment_type_id: string | null
        provider: 'mercado_pago'
        provider_payment_id: string
        provider_status: string | null
        provider_updated_at: string | null
        provider_version: number | null
        review_required: boolean
        status: 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled' | 'manual_review'
        updated_at: string
      }>
      payment_inbox: IReadOnlyTable<{
        created_at: string
        environment: 'sandbox' | 'production'
        id: string
        processed_at: string | null
        received_at: string
        request_id: string
        resource_id: string
        resource_type: string
        retention_until: string
        signature_digest: string
        status: 'received' | 'queued' | 'processed' | 'quarantined'
        updated_at: string
      }>
      payment_outbox: IReadOnlyTable<{
        attempt_id: string
        available_at: string
        created_at: string
        id: string
        idempotency_key: string
        operation: 'create_order' | 'reconcile_order' | 'cancel_order'
        payload: JsonType
        status: 'pending' | 'leased' | 'succeeded' | 'dead_letter' | 'manual_review'
        updated_at: string
      }>
      profiles: IReadOnlyTable<IProfileDatabaseRow>
      public_recovery_attempts: IReadOnlyTable<IRecoveryAttemptDatabaseRow>
      settings: IReadOnlyTable<ISettingsDatabaseRow>
    }
    Views: Record<string, never>
  }
}
