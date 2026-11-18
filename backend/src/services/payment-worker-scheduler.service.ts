import type { PaymentWorkerService, PaymentWorkerResult } from './payment-worker.service.js'

export const PAYMENT_WORKER_CADENCE_SECONDS = 60

export interface PaymentWorkerSchedulerOptions {
  cadenceSeconds: number
  enabled: boolean
  workerId: string
}

export class PaymentWorkerScheduler {
  private running = false
  private timer: NodeJS.Timeout | undefined

  public constructor(
    private readonly worker: PaymentWorkerService,
    private readonly options: PaymentWorkerSchedulerOptions,
  ) {
    if (options.cadenceSeconds < PAYMENT_WORKER_CADENCE_SECONDS) {
      throw new Error('Payment worker cadence must be at least 60 seconds')
    }
    if (options.workerId.trim() === '') throw new Error('Payment worker identity is required')
  }

  public async tick(): Promise<PaymentWorkerResult | null> {
    if (!this.options.enabled || this.running) return null
    this.running = true
    try {
      return await this.worker.run(this.options.workerId)
    } finally {
      this.running = false
    }
  }

  public start(): void {
    if (!this.options.enabled || this.timer !== undefined) return
    this.timer = setInterval(() => { void this.tick() }, this.options.cadenceSeconds * 1_000)
    this.timer.unref()
  }

  public stop(): void {
    if (this.timer !== undefined) clearInterval(this.timer)
    this.timer = undefined
  }
}
