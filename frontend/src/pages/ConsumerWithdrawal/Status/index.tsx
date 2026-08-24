import { useCallback, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { CircleAlert, Search } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'

import { routes } from '@/config/routes'
import {
  CONSUMER_WITHDRAWAL_STATUS_LABELS,
  consumerWithdrawalStatusSchema,
  getConsumerWithdrawalError,
  normalizeRequestCode,
  useConsumerWithdrawalStatus,
} from '@/features/consumer-withdrawals'
import type { ConsumerWithdrawalStatusFormType } from '@/features/consumer-withdrawals'
import { TurnstileChallenge } from '@/features/public-orders/components/TurnstileChallenge'
import { Button, Card, Container, Input, Section, Typography } from '@/shared/components'

import '../styles.css'

export function ConsumerWithdrawalStatusPage() {
  const statusMutation = useConsumerWithdrawalStatus()
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [isCaptchaRequired, setIsCaptchaRequired] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const form = useForm<ConsumerWithdrawalStatusFormType>({
    defaultValues: { requestCode: '' },
    mode: 'onBlur',
    resolver: zodResolver(consumerWithdrawalStatusSchema),
  })
  const handleCaptchaToken = useCallback((token: string | null) => setCaptchaToken(token), [])

  async function handleSubmit(values: ConsumerWithdrawalStatusFormType) {
    if (isCaptchaRequired && captchaToken === null) {
      setErrorMessage('Completá la verificación de seguridad antes de consultar.')
      return
    }
    setErrorMessage(null)
    try {
      await statusMutation.mutateAsync({
        requestCode: normalizeRequestCode(values.requestCode),
        ...(captchaToken ? { captchaToken } : {}),
      })
    } catch (error) {
      const feedback = getConsumerWithdrawalError(error)
      setErrorMessage(feedback.message)
      if (feedback.captchaRequired) {
        setIsCaptchaRequired(true)
        setCaptchaToken(null)
      }
    }
  }

  const result = statusMutation.data

  return (
    <main className="consumer-withdrawal" id="main-content">
      <Section>
        <Container className="consumer-withdrawal__container">
          <header className="consumer-withdrawal__heading">
            <div className="consumer-withdrawal__icon" aria-hidden="true"><Search size={28} /></div>
            <div>
              <Typography as="h1" variant="h1">Consultá tu solicitud</Typography>
              <p>Ingresá el código que recibiste al enviar el formulario.</p>
            </div>
          </header>
          <Card className="consumer-withdrawal__card">
            {errorMessage ? <div className="consumer-withdrawal__error" role="alert"><CircleAlert aria-hidden="true" size={22} /><p>{errorMessage}</p></div> : null}
            <form noValidate onSubmit={form.handleSubmit(handleSubmit)}>
              <Input
                autoCapitalize="characters"
                autoComplete="off"
                error={form.formState.errors.requestCode?.message}
                helpText="El código comienza con AR y no se guarda en este dispositivo."
                label="Código de solicitud"
                placeholder="AR-7K9M-Q4TX-V8NP-2C6R"
                {...form.register('requestCode', { onChange: (event) => { event.target.value = normalizeRequestCode(event.target.value) } })}
              />
              {isCaptchaRequired ? <TurnstileChallenge action="consumer_withdrawal" onTokenChange={handleCaptchaToken} /> : null}
              <Button isLoading={statusMutation.isPending} loadingText="Consultando…" size="large" type="submit">Consultar estado</Button>
            </form>
            {result ? (
              <section aria-live="polite" className="consumer-withdrawal__status-result">
                <span>Estado actual</span>
                <h2>{CONSUMER_WITHDRAWAL_STATUS_LABELS[result.status]}</h2>
                <dl>
                  <div><dt>Presentada</dt><dd><time dateTime={result.submittedAt}>{new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(result.submittedAt))}</time></dd></div>
                  <div><dt>Última actualización</dt><dd><time dateTime={result.updatedAt}>{new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(result.updatedAt))}</time></dd></div>
                </dl>
                {result.explanation ? <p>{result.explanation}</p> : null}
                <p><strong>Próximo paso:</strong> {result.nextStep}</p>
                {result.status === 'not_applicable' ? <p>{result.reviewChannel ?? 'Si necesitás revisar esta decisión, comunicate con Atención al cliente.'}</p> : null}
              </section>
            ) : null}
          </Card>
          <div className="consumer-withdrawal__secondary-links">
            <Link to={routes.consumerWithdrawal}>Enviar una nueva solicitud</Link>
            <Link to={routes.home}>Volver a la tienda</Link>
          </div>
        </Container>
      </Section>
    </main>
  )
}
