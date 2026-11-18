import type { ServerSupabaseClient } from '../config/supabase.js'
import { RepositoryError } from '../utils/app-error.js'

export interface PaymentInboxRecord {
  environment: 'sandbox' | 'production'
  requestId: string
  resourceId: string
  resourceType: string
  signatureDigest: Buffer
}

export interface IPaymentInboxRepository {
  acknowledge(record: PaymentInboxRecord): Promise<{ duplicate: boolean }>
}

export class PaymentInboxRepository implements IPaymentInboxRepository {
  public constructor(private readonly client: ServerSupabaseClient) {}

  public async acknowledge(record: PaymentInboxRecord): Promise<{ duplicate: boolean }> {
    const client = this.client as unknown as {
      rpc: (name: string, args: Record<string, unknown>) => Promise<{
        data: boolean | { acknowledge_payment_webhook_v2?: boolean }[] | null
        error: { message?: string } | null
      }>
    }
    const { data, error } = await client.rpc('acknowledge_payment_webhook_v2', {
      p_environment: record.environment,
      p_request_id: record.requestId,
      p_resource_id: record.resourceId,
      p_resource_type: record.resourceType,
      p_signature_digest: `\\x${record.signatureDigest.toString('hex')}`,
    })

    if (error !== null) throw new RepositoryError('No fue posible registrar la notificación de pago')
    const firstRow = Array.isArray(data) ? data[0] : undefined
    const duplicate = data === true || (
      typeof firstRow === 'object'
      && firstRow !== null
      && 'acknowledge_payment_webhook_v2' in firstRow
      && firstRow.acknowledge_payment_webhook_v2 === true
    )
    return { duplicate }
  }
}
