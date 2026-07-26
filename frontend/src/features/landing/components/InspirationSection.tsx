import laminasImage from '@/assets/images/laminas.webp'
import moldesImage from '@/assets/images/moldes-silicona.webp'
import { Container, Section, Typography } from '@/shared/components'

export function InspirationSection() {
  return (
    <Section
      aria-labelledby="inspiration-title"
      background="muted"
      className="landing-inspiration"
      id="inspiracion"
    >
      <Container className="landing-inspiration__layout">
        <div className="landing-inspiration__content">
          <p className="landing-inspiration__phrase">
            Una idea puede empezar con un pequeño detalle.
          </p>
          <Typography id="inspiration-title" variant="h2">
            Imaginá, combiná y hacelo propio
          </Typography>
          <Typography>
            Un molde, una lámina o el pincel adecuado pueden abrir nuevas posibilidades. Elegí los
            materiales que te inspiren y disfrutá cada parte del proceso.
          </Typography>
        </div>

        <div className="landing-inspiration__images">
          <img
            alt="Láminas con motivos florales y un colibrí"
            className="landing-inspiration__image landing-inspiration__image--main"
            height="1329"
            loading="lazy"
            src={laminasImage}
            width="1183"
          />
          <img
            alt="Moldes de silicona con formas de flores"
            className="landing-inspiration__image landing-inspiration__image--detail"
            height="1302"
            loading="lazy"
            src={moldesImage}
            width="1208"
          />
        </div>
      </Container>
    </Section>
  )
}
