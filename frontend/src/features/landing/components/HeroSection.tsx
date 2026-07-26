import { motion, useReducedMotion } from 'framer-motion'
import { ArrowDownRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import fibroFacilImage from '@/assets/images/fibro-facil.webp'
import moldesImage from '@/assets/images/moldes-silicona.webp'
import pincelesImage from '@/assets/images/pinceles.webp'
import { Button, Container, Typography } from '@/shared/components'

export function HeroSection() {
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()

  function handleExplore() {
    navigate('/productos')
  }

  function handleAbout() {
    document.querySelector('#nosotros')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="landing-hero" id="inicio">
      <Container className="landing-hero__container">
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="landing-hero__content"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="landing-hero__intro">Tu espacio creativo empieza acá.</p>
          <Typography className="landing-hero__title" variant="hero">
            Materiales para crear a tu manera
          </Typography>
          <Typography className="landing-hero__description">
            Descubrí herramientas, insumos y detalles seleccionados para transformar cada idea en un
            proyecto propio.
          </Typography>
          <div className="landing-hero__actions">
            <Button onClick={handleExplore} size="large">
              Explorar productos
              <ArrowDownRight aria-hidden="true" size={20} strokeWidth={2} />
            </Button>
            <Button onClick={handleAbout} size="large" variant="secondary">
              Conocenos
            </Button>
          </div>
        </motion.div>

        <motion.div
          animate={{ opacity: 1, scale: 1 }}
          aria-label="Selección de materiales creativos"
          className="landing-hero__visual"
          initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.96 }}
          transition={{ delay: shouldReduceMotion ? 0 : 0.1, duration: 0.5 }}
        >
          <img
            alt="Objetos de Fibro Fácil listos para decorar"
            className="landing-hero__main-image"
            fetchPriority="high"
            height="1116"
            src={fibroFacilImage}
            width="1409"
          />
          <img
            alt="Pinceles para diferentes técnicas"
            className="landing-hero__detail-image landing-hero__detail-image--brushes"
            height="1204"
            src={pincelesImage}
            width="1306"
          />
          <img
            alt="Moldes de silicona con formas florales"
            className="landing-hero__detail-image landing-hero__detail-image--molds"
            height="1302"
            src={moldesImage}
            width="1208"
          />
          <span aria-hidden="true" className="landing-hero__flower">
            ✿
          </span>
        </motion.div>
      </Container>
    </section>
  )
}
