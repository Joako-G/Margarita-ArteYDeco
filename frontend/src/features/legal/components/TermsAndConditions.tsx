import { Link } from 'react-router-dom'

import { usePublicSettings } from '@/features/settings'
import { Container, Section, Typography } from '@/shared/components'

import { LegalList } from './LegalList'
import { LegalSection } from './LegalSection'
import './legal.css'

export function TermsAndConditions() {
  const { data: settings } = usePublicSettings()
  const businessName = settings?.businessName ?? 'Margaritas Arte & Deco'

  return (
    <main className="legal-page" id="main-content">
      <Section>
        <Container>
          <div className="legal-page__content">
            <Typography as="h1" variant="h1">
              Términos y Condiciones
            </Typography>

            <LegalSection title="Introducción">
              <Typography variant="body">
                Estos Términos y Condiciones regulan el acceso y uso del sitio web de {businessName}
                . Al utilizar el sitio y enviar un pedido, aceptás estos términos.
              </Typography>
            </LegalSection>

            <LegalSection title="Uso del sitio">
              <Typography variant="body">Al utilizar el sitio, te comprometés a:</Typography>
              <LegalList
                items={[
                  'Proporcionar información verdadera y actualizada.',
                  'Utilizar el sitio de buena fe.',
                  'No realizar acciones que puedan afectar el funcionamiento del sitio.',
                ]}
              />
            </LegalSection>

            <LegalSection title="Productos">
              <Typography variant="body">
                Los productos publicados pueden modificarse y sus precios pueden actualizarse sin
                previo aviso. Las fotografías son ilustrativas y, en el caso de productos
                artesanales, pueden existir pequeñas diferencias respecto del producto final.
              </Typography>
            </LegalSection>

            <LegalSection title="Pedidos">
              <Typography variant="body">
                El envío del formulario genera una solicitud de pedido. El comercio podrá
                contactarte para confirmar la información antes de gestionarlo.
              </Typography>
              <Typography variant="body">
                El pedido podrá ser aceptado, modificado o cancelado antes de concretarse, por
                ejemplo, si existe un error evidente en el precio publicado o si el producto ya no
                se encuentra disponible.
              </Typography>
            </LegalSection>

            <LegalSection title="Disponibilidad de productos">
              <Typography variant="body">
                La disponibilidad de los productos está sujeta al stock existente. Si un producto
                deja de estar disponible, el comercio podrá comunicarse con vos para ofrecer una
                alternativa o cancelar el pedido.
              </Typography>
            </LegalSection>

            <LegalSection title="Entregas y retiros">
              <Typography variant="body">
                Al realizar el pedido, podés elegir retirarlo en el local o solicitar un envío a
                coordinar. Los plazos podrán variar según la disponibilidad de los productos.
              </Typography>
              <Typography variant="body">
                Si elegís envío, el comercio se comunicará con vos por WhatsApp para coordinar el
                costo y la entrega. El costo del envío no está incluido en el total del pedido y el
                sitio no gestiona transportistas ni seguimiento.
              </Typography>
            </LegalSection>

            <LegalSection title="Responsabilidad">
              <Typography variant="body">
                {businessName} realiza esfuerzos razonables para mantener la información del sitio
                actualizada y correcta. No obstante, pueden existir errores involuntarios, que el
                comercio podrá corregir cuando sean detectados.
              </Typography>
              <Typography variant="body">
                El comercio no garantiza la disponibilidad permanente del sitio ni la ausencia de
                interrupciones.
              </Typography>
            </LegalSection>

            <LegalSection title="Propiedad intelectual">
              <Typography variant="body">
                El contenido del sitio, sus fotografías, logotipo, diseño y textos pertenecen a
                {` ${businessName}`} y no pueden utilizarse, reproducirse o modificarse sin
                autorización.
              </Typography>
            </LegalSection>

            <LegalSection title="Protección de datos">
              <Typography variant="body">
                El tratamiento de los datos personales se encuentra regulado por la{' '}
                <Link to="/politica-de-privacidad">Política de Privacidad</Link> del sitio.
              </Typography>
            </LegalSection>

            <LegalSection title="Modificaciones">
              <Typography variant="body">
                El comercio podrá actualizar estos Términos y Condiciones cuando resulte necesario.
                Las modificaciones comenzarán a regir desde su publicación en el sitio.
              </Typography>
            </LegalSection>

            <LegalSection title="Legislación aplicable">
              <Typography variant="body">
                Estos Términos y Condiciones se rigen por las leyes de la República Argentina.
              </Typography>
            </LegalSection>

            <Typography className="legal-page__last-update" variant="small">
              Última actualización: agosto de 2026.
            </Typography>
          </div>
        </Container>
      </Section>
    </main>
  )
}
