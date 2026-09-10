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
              <LegalList
                items={[
                  'Nombre y apellido.',
                  'Número de teléfono.',
                  'Observaciones, únicamente si decidís incluirlas.',
                  'Dirección de entrega, únicamente cuando solicitás un envío.',
                  'Medio de pago elegido y datos operativos del pedido, sin almacenar tarjetas ni credenciales bancarias.',
                  'En solicitudes de arrepentimiento: número de pedido opcional, celular, comentario, código de solicitud y eventos necesarios para gestionar el trámite.',
                  'Datos técnicos mínimos de sesión, seguridad, CSRF, límites de solicitudes, prevención de abuso y verificación condicional.',
                ]}
              />
              <Typography variant="body">
                No solicitamos correo electrónico ni documento de identidad. Tampoco es necesario
                crear una cuenta para comprar.
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
                  'Coordinar el costo y la entrega cuando se solicita un envío.',
                  'Responder consultas relacionadas con un pedido.',
                  'Registrar, verificar, gestionar y auditar solicitudes de arrepentimiento.',
                  'Permitir la gestión interna del negocio mediante el Panel Administrativo.',
                  'Proteger el sitio, prevenir abusos y mantener la seguridad de las operaciones.',
                ]}
              />
              <Typography variant="body">
                Los datos no se utilizan para enviar publicidad, campañas de marketing ni
                comunicaciones comerciales.
              </Typography>
            </LegalSection>

            <LegalSection title="Cookies y almacenamiento en el dispositivo">
              <Typography variant="body">
                Utilizamos únicamente cookies técnicas y almacenamiento local necesario para la
                sesión anónima de pedidos, la seguridad y la recuperación. Por ahora no mostramos
                un banner de consentimiento y no afirmamos que la normativa imponga o exceptúe un
                banner. No usamos estas tecnologías para publicidad, analítica de comportamiento ni
                seguimiento entre sitios.
              </Typography>
              <LegalList
                items={[
                  'Seguridad del formulario: una cookie técnica ayuda a evitar envíos fraudulentos; su período concreto queda pendiente de revisión.',
                  'Sesión anónima de pedidos: una cookie segura permite consultar desde este dispositivo los pedidos asociados; su período concreto queda pendiente de revisión.',
                  'Último pedido: el navegador conserva localmente solo su número para ofrecer un acceso rápido; no guarda el detalle, el celular, los importes ni datos bancarios.',
                  'Administración: el área privada utiliza cookies de sesión exclusivas para el personal autorizado.',
                ]}
              />
              <Typography variant="body">
                Podés borrar estas tecnologías desde la configuración del navegador o utilizar la
                opción “Olvidar pedidos de este dispositivo”. Al hacerlo, el pedido no se elimina,
                pero deberás recuperarlo nuevamente con su número y el celular utilizado en la
                compra.
              </Typography>
            </LegalSection>

            <LegalSection title="Proveedores tecnológicos y servicios externos">
              <Typography variant="body">
                No vendemos datos personales ni los compartimos con terceros para fines comerciales
                o publicitarios. Para operar el sitio utilizamos proveedores que pueden tratar la
                información necesaria para prestar sus servicios:
              </Typography>
              <LegalList
                items={[
                  'Vercel, para el alojamiento y la entrega de la aplicación.',
                  'Supabase, para la base de datos, el almacenamiento y la autenticación del área administrativa.',
                  'Cloudflare Turnstile, únicamente cuando se requiere una verificación de seguridad.',
                  'Tipografías locales en formato WOFF2, sin solicitud necesaria a Google Fonts.',
                ]}
              />
              <Typography variant="body">
                Estos servicios pueden procesar información técnica o personal fuera de la
                República Argentina según su infraestructura y sus propias políticas. Si elegís
                abrir WhatsApp o Google Maps desde el sitio, la interacción continuará en ese
                servicio externo y quedará sujeta a sus términos y políticas de privacidad.
              </Typography>
            </LegalSection>

            <LegalSection title="Seguridad">
              <Typography variant="body">
                Implementamos medidas técnicas y organizativas razonables para proteger la
                información almacenada. Sin embargo, ningún sistema es completamente invulnerable,
                por lo que trabajamos continuamente para mantener la seguridad y la integridad de
                los datos.
              </Typography>
              <Typography variant="body">
                Aplicamos protección CSRF y límites de solicitudes para prevenir abuso. Cloudflare
                Turnstile se carga únicamente si una operación sensible aprobada requiere una
                verificación. En ese caso, Cloudflare puede procesar datos técnicos y señales del
                navegador según sus propias políticas. Consultá su{' '}
                <a href="https://www.cloudflare.com/privacypolicy/" rel="noreferrer" target="_blank">
                  Política de Privacidad
                </a>{' '}y la{' '}
                <a href="https://www.cloudflare.com/website-terms/" rel="noreferrer" target="_blank">
                  información de Turnstile
                </a>.
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
                cumplir estas finalidades o una obligación aplicable. Los períodos concretos y los
                disparadores de eliminación o anonimización todavía requieren confirmación del
                contador y revisión legal final. No prometemos una eliminación automática.
              </Typography>
              <LegalList
                items={[
                  'Pedidos y comprobantes operativos: mientras sean necesarios para administrar, dar soporte o cumplir obligaciones aplicables.',
                  'Evidencia de reclamos y solicitudes de derechos: mientras sea necesaria para responder o acreditar la gestión; el plazo y disparador están pendientes de revisión.',
                  'Registros de seguridad y límites de solicitudes: mientras sean necesarios para prevenir y analizar abuso; el plazo está pendiente de revisión.',
                  'Datos temporales de checkout y de verificación: mientras sean necesarios para completar o proteger la operación; el disparador está pendiente de revisión.',
                ]}
              />
            </LegalSection>

            <LegalSection title="Derechos del usuario">
              <Typography variant="body">
                Podés solicitar en cualquier momento el acceso, actualización, rectificación o
                eliminación de tus datos personales. La eliminación estará siempre supeditada a las
                obligaciones legales que pudieran corresponder al negocio.
              </Typography>
              <Typography variant="body">
                Para ejercer estos derechos, escribí a{' '}
                <a href="mailto:margaritas.arteydeco.jujuy@gmail.com">
                  margaritas.arteydeco.jujuy@gmail.com
                </a>.
              </Typography>
            </LegalSection>

            <LegalSection title="Registro de solicitudes de privacidad" variant="disclosure">
              <Typography variant="body">
                Las solicitudes de acceso, actualización, rectificación o supresión se reciben y
                siguen en un hilo de correo restringido a la persona titular y al personal autorizado
                con acceso al buzón. Se registra únicamente la fecha de recepción, categoría de la
                solicitud, contacto necesario, estado de verificación y resolución, fecha de cierre
                y la revisión de conservación o eliminación. No se crea una tabla, API ni nueva
                persistencia en el backend, ni se copia al sistema el contenido innecesario de la
                solicitud, el teléfono o los datos completos de un pedido.
              </Typography>
              <Typography variant="body">
                El período y el disparador de eliminación de esta evidencia quedan pendientes de
                confirmación del contador y revisión legal final.
              </Typography>
            </LegalSection>

            <LegalSection title="Contacto">
              <Typography variant="body">
                Si tenés alguna consulta sobre esta política o sobre el tratamiento de tus datos
                personales, podés comunicarte con nosotros a través de los medios oficiales de
                contacto del comercio:
              </Typography>
              <p>
                Privacidad y derechos:{' '}
                <a href="mailto:margaritas.arteydeco.jujuy@gmail.com">
                  margaritas.arteydeco.jujuy@gmail.com
                </a>
              </p>
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
