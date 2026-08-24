import { useCallback, useEffect, useRef, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, CircleAlert, Clipboard, RotateCcw } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { Link } from 'react-router-dom'

import { routes } from '@/config/routes'
import {
  consumerWithdrawalSchema,
  getConsumerWithdrawalError,
  useCreateConsumerWithdrawal,
} from '@/features/consumer-withdrawals'
import type {
  ConsumerWithdrawalFormType,
  IConsumerWithdrawalReceipt,
} from '@/features/consumer-withdrawals'
import { normalizePhone } from '@/features/checkout/utils/checkout-links'
import { TurnstileChallenge } from '@/features/public-orders/components/TurnstileChallenge'
import { usePublicSettings } from '@/features/settings'
import { Button, Card, Checkbox, Container, Input, Section, TextArea, Typography } from '@/shared/components'
import { buildWhatsAppUrl } from '@/shared/utils/whatsapp'

import './styles.css'

export function ConsumerWithdrawalPage() {
  const createRequest = useCreateConsumerWithdrawal()
  const { data: settings } = usePublicSettings()
  const successTitleRef = useRef<HTMLHeadingElement>(null)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [isCaptchaRequired, setIsCaptchaRequired] = useState(false)
  const [receipt, setReceipt] = useState<IConsumerWithdrawalReceipt | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isCodeCopied, setIsCodeCopied] = useState(false)
  const form = useForm<ConsumerWithdrawalFormType>({
    defaultValues: { comment: '', orderNumber: '', orderNumberUnavailable: false, phone: '' },
    mode: 'onBlur',
    resolver: zodResolver(consumerWithdrawalSchema),
  })
  const isOrderNumberUnavailable = useWatch({ control: form.control, name: 'orderNumberUnavailable' })

  useEffect(() => {
    if (!isOrderNumberUnavailable) return
    form.setValue('orderNumber', '', { shouldValidate: true })
  }, [form, isOrderNumberUnavailable])

  useEffect(() => {
    if (receipt !== null) successTitleRef.current?.focus()
  }, [receipt])

  const handleCaptchaToken = useCallback((token: string | null) => setCaptchaToken(token), [])

  async function handleSubmit(values: ConsumerWithdrawalFormType) {
    if (isCaptchaRequired && captchaToken === null) {
      setErrorMessage('Completá la verificación de seguridad antes de enviar la solicitud.')
      return
    }
    setErrorMessage(null)
    try {
      const result = await createRequest.mutateAsync({
        orderNumberUnavailable: values.orderNumberUnavailable,
        phone: normalizePhone(values.phone),
        ...(values.orderNumberUnavailable ? {} : { orderNumber: values.orderNumber.trim().toUpperCase() }),
        ...(values.comment.trim() ? { comment: values.comment.trim() } : {}),
        ...(captchaToken ? { captchaToken } : {}),
      })
      setReceipt(result)
    } catch (error) {
      const feedback = getConsumerWithdrawalError(error)
      setErrorMessage(feedback.message)
      if (feedback.captchaRequired) {
        setIsCaptchaRequired(true)
        setCaptchaToken(null)
      }
    }
  }

  async function handleCopyCode() {
    if (receipt === null) return
    try {
      await navigator.clipboard.writeText(receipt.requestCode)
      setIsCodeCopied(true)
    } catch {
      setIsCodeCopied(false)
    }
  }

  const whatsappUrl = settings?.whatsapp ? buildWhatsAppUrl(settings.whatsapp) : null

  return (
    <main className="consumer-withdrawal" id="main-content">
      <Section>
        <Container className="consumer-withdrawal__container">
          {receipt ? (
            <Card className="consumer-withdrawal__receipt" role="status">
              <div className="consumer-withdrawal__icon" aria-hidden="true"><Check size={28} /></div>
              <h1 className="ui-typography ui-typography--h1" ref={successTitleRef} tabIndex={-1}>
                Recibimos tu solicitud
              </h1>
              <p>Guardá este código para consultar el estado de tu solicitud.</p>
              <strong className="consumer-withdrawal__code">{receipt.requestCode}</strong>
              <p>
                Presentada el <time dateTime={receipt.submittedAt}>{new Intl.DateTimeFormat('es-AR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(receipt.submittedAt))}</time>.
              </p>
              <p>{receipt.nextStep}</p>
              {form.getValues('orderNumberUnavailable') ? <p>Nos comunicaremos para identificar la compra que querés cancelar o devolver.</p> : null}
              <p className="consumer-withdrawal__notice">Registrar la solicitud no determina por sí solo si corresponde el derecho. Revisaremos el caso y te informaremos los próximos pasos.</p>
              <div className="consumer-withdrawal__actions">
                <Button onClick={() => void handleCopyCode()} variant="secondary">
                  <Clipboard aria-hidden="true" size={18} />
                  {isCodeCopied ? 'Código copiado' : 'Copiar código'}
                </Button>
                <Link className="ui-button ui-button--primary" to={routes.consumerWithdrawalStatus}>Consultar estado</Link>
                <Link className="ui-button ui-button--ghost" to={routes.home}>Volver a la tienda</Link>
              </div>
            </Card>
          ) : (
            <>
              <header className="consumer-withdrawal__heading">
                <div className="consumer-withdrawal__icon" aria-hidden="true"><RotateCcw size={28} /></div>
                <div>
                  <Typography as="h1" variant="h1">Solicitá el arrepentimiento de una compra</Typography>
                  <p>Completá estos datos para registrar tu solicitud. No necesitás crear una cuenta ni explicar el motivo.</p>
                </div>
              </header>
              <Card className="consumer-withdrawal__card">
                {errorMessage ? <div className="consumer-withdrawal__error" role="alert"><CircleAlert aria-hidden="true" size={22} /><p>{errorMessage}</p></div> : null}
                <form noValidate onSubmit={form.handleSubmit(handleSubmit)}>
                  <fieldset className="consumer-withdrawal__order-fields">
                    <legend>Datos para identificar la compra</legend>
                    <Input
                      autoCapitalize="characters"
                      autoComplete="off"
                      disabled={isOrderNumberUnavailable}
                      error={form.formState.errors.orderNumber?.message}
                      helpText="Si lo tenés, nos ayuda a encontrar tu compra más rápido."
                      label="Número de pedido"
                      placeholder="MAD-AAAAMMDD-000001"
                      {...form.register('orderNumber', { onChange: (event) => { event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '') } })}
                    />
                    <Checkbox label="No encuentro mi número de pedido" {...form.register('orderNumberUnavailable')} />
                  </fieldset>
                  <Input
                    autoComplete="tel"
                    error={form.formState.errors.phone?.message}
                    inputMode="numeric"
                    label="Celular utilizado en la compra"
                    maxLength={15}
                    type="tel"
                    {...form.register('phone', { onChange: (event) => { event.target.value = normalizePhone(event.target.value) } })}
                  />
                  <TextArea
                    error={form.formState.errors.comment?.message}
                    helpText="No necesitás justificar tu solicitud."
                    label="Comentario (opcional)"
                    maxLength={1000}
                    {...form.register('comment')}
                  />
                  {isCaptchaRequired ? <TurnstileChallenge action="consumer_withdrawal" onTokenChange={handleCaptchaToken} /> : null}
                  <Button isLoading={createRequest.isPending} loadingText="Enviando solicitud…" size="large" type="submit">Enviar solicitud</Button>
                </form>
                <div className="consumer-withdrawal__support">
                  <strong>Atención al cliente</strong>
                  <p>Después de registrar la solicitud podremos contactarte para coordinar los próximos pasos.</p>
                  <p>Si el formulario no funciona, {whatsappUrl ? <a href={whatsappUrl} rel="noopener noreferrer" target="_blank">escribinos por WhatsApp</a> : 'contactanos por WhatsApp'} para que registremos tu solicitud y te informemos el código.</p>
                  {settings?.businessHours ? <p>Horario de atención: {settings.businessHours}</p> : null}
                </div>
              </Card>
              <div className="consumer-withdrawal__secondary-links">
                <Link to={routes.consumerWithdrawalStatus}>Consultar una solicitud existente</Link>
                <Link to="/terminos-y-condiciones">Términos y Condiciones</Link>
                <Link to="/politica-de-privacidad">Política de Privacidad</Link>
              </div>
            </>
          )}
        </Container>
      </Section>
    </main>
  )
}
