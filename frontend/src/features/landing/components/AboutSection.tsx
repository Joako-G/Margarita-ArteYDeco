import fibroFacilImage from '@/assets/images/fibro-facil.webp'
import { Container, Section, Typography } from '@/shared/components'

export function AboutSection() {
  return (
    <Section
      aria-labelledby="about-title"
      background="muted"
      className="landing-about"
      id="nosotros"
    >
      <Container className="landing-about__layout">
        <div className="landing-about__image-wrap">
          <img
            alt="Distintos objetos de Fibro Fácil para proyectos de decoración"
            height="1116"
            loading="lazy"
            src={fibroFacilImage}
            width="1409"
          />
        </div>
        <div className="landing-about__content">
          <Typography id="about-title" variant="h2">
            Un espacio para quienes disfrutan crear
          </Typography>
          <Typography>
            Margaritas Arte & Deco nace del entusiasmo por las manualidades, la decoración y esos
            proyectos que llevan tiempo, paciencia y un toque personal.
          </Typography>
          <Typography>
            Seleccionamos materiales y herramientas para acompañarte desde la primera idea hasta el
            último detalle, con una atención cercana y sencilla.
          </Typography>
          <p className="landing-about__signature">Creatividad, inspiración y manos a la obra.</p>
        </div>
      </Container>
    </Section>
  )
}
