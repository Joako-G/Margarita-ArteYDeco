import { usePublicSettings } from '@/features/settings'
import { Container, Section, Typography } from '@/shared/components'

import { LegalList } from './LegalList'
import { LegalSection } from './LegalSection'
import './legal.css'

export function PrivacyPolicy() {
  const { data: settings } = usePublicSettings()

  const businessName = settings?.businessName ?? 'Margaritas Arte & Deco'
  const whatsapp = settings?.whatsapp
  const address = settings?.address
  const businessHours = settings?.businessHours

  return (
    <main className="legal-page" id="main-content">
      <Section>
        <Container>
          <div className="legal-page__content">
            <Typography as="h1" variant="h1">
              Política de Privacidad
            </Typography>

            <LegalSection title="Introducción">
              <Typography variant="body">
                En {businessName} respetamos la privacidad de quienes nos visitan y compran. Esta
                política explica de manera clara qué datos personales recopilamos, para qué los
                usamos y cómo los cuidamos cuando utilizás nuestra página.
              </Typography>
            </LegalSection>

            <LegalSection title="Datos que recopilamos">
              <Typography variant="body">
                Durante el proceso de compra únicamente solicitamos la información mínima necesaria
                para gestionar el pedido:
              </Typography>
              <LegalList items={['Nombre', 'Apellido', 'Número de teléfono']} />
              <Typography variant="body">
                No solicitamos correo electrónico, dirección de envío, documento de identidad ni
                ningún otro dato adicional. Tampoco es necesario crear una cuenta para comprar.
              </Typography>
            </LegalSection>

            <LegalSection title="Finalidad del tratamiento">
              <Typography variant="body">
                Los datos personales se utilizan exclusivamente para:
              </Typography>
              <LegalList
                items={[
                  'Identificar al cliente y gestionar el pedido.',
                  'Contactar al cliente para informar el estado del pedido.',
                  'Coordinar el retiro de la compra en el local.',
                  'Responder consultas relacionadas con un pedido.',
                ]}
              />
              <Typography variant="body">
                Los datos no se utilizan para enviar publicidad, campañas de marketing ni
                comunicaciones comerciales.
              </Typography>
            </LegalSection>

            <LegalSection title="Datos compartidos">
              <Typography variant="body">
                No vendemos datos personales. No compartimos información con terceros para fines
                comerciales ni publicitarios. Los datos permanecen dentro del sistema del negocio y
                solo son accedidos por quienes gestionan los pedidos de manera legítima.
              </Typography>
            </LegalSection>

            <LegalSection title="Seguridad">
              <Typography variant="body">
                Implementamos medidas técnicas y organizativas razonables para proteger la
                información almacenada. Sin embargo, ningún sistema es completamente invulnerable,
                por lo que trabajamos continuamente para mantener la seguridad y la integridad de
                los datos.
              </Typography>
            </LegalSection>

            <LegalSection title="Conservación de los datos">
              <Typography variant="body">
                Los datos personales y los pedidos se almacenan en la base de datos del sistema
                para:
              </Typography>
              <LegalList
                items={[
                  'Administrar correctamente los pedidos.',
                  'Mantener un historial comercial del negocio.',
                  'Brindar soporte posterior a una compra cuando sea necesario.',
                  'Cumplir con obligaciones legales o administrativas cuando corresponda.',
                ]}
              />
              <Typography variant="body">
                Los datos se conservarán únicamente durante el tiempo que resulte necesario para
                cumplir estas finalidades. Cuando ya no sean necesarios, podrán eliminarse o
                anonimizarse de forma segura.
              </Typography>
            </LegalSection>

            <LegalSection title="Derechos del usuario">
              <Typography variant="body">
                Podés solicitar en cualquier momento el acceso, actualización, rectificación o
                eliminación de tus datos personales. La eliminación estará siempre supeditada a las
                obligaciones legales que pudieran corresponder al negocio.
              </Typography>
            </LegalSection>

            <LegalSection title="Contacto">
              <Typography variant="body">
                Si tenés alguna consulta sobre esta política o sobre el tratamiento de tus datos
                personales, podés comunicarte con nosotros a través de los medios oficiales de
                contacto del comercio:
              </Typography>
              <ul className="legal-list legal-list--contact">
                {whatsapp ? (
                  <li>
                    <span className="legal-list__label">WhatsApp:</span>
                    <span>{whatsapp}</span>
                  </li>
                ) : null}
                {address ? (
                  <li>
                    <span className="legal-list__label">Dirección:</span>
                    <span>{address}</span>
                  </li>
                ) : null}
                {businessHours ? (
                  <li>
                    <span className="legal-list__label">Horarios de atención:</span>
                    <span>{businessHours}</span>
                  </li>
                ) : null}
                {!whatsapp && !address && !businessHours ? (
                  <li>
                    <span>
                      Los datos de contacto se encuentran disponibles en la página principal y en la
                      sección de contacto del sitio.
                    </span>
                  </li>
                ) : null}
              </ul>
            </LegalSection>

            <LegalSection title="Legislación aplicable">
              <Typography variant="body">
                Esta Política de Privacidad se encuentra redactada conforme a la normativa vigente
                en materia de protección de datos personales de la República Argentina, incluyendo
                la Ley N.º 25.326 de Protección de los Datos Personales.
              </Typography>
              <Typography variant="body">
                La Agencia de Acceso a la Información Pública, en su carácter de organismo de
                control de la Ley N.º 25.326, atiende consultas, reclamos y denuncias relacionadas
                con la protección de los datos personales.
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
