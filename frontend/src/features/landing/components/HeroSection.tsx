import { motion, useReducedMotion } from 'framer-motion'

import { Container, Section, Typography } from '@/shared/components'

export function HeroSection() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <Section aria-labelledby="landing-title" className="landing-editorial-hero">
      <Container className="landing-editorial-hero__inner">
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="landing-editorial-hero__content"
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 16 }}
          transition={
            shouldReduceMotion ? { duration: 0 } : { duration: 0.4, ease: [0.16, 1, 0.3, 1] }
          }
        >
          <div aria-hidden="true" className="landing-editorial-hero__top-detail">
            <span className="landing-editorial-hero__star">✧</span>
            <span className="landing-editorial-hero__detail-lines" />
          </div>

          <Typography
            as="h1"
            className="landing-editorial-hero__title"
            id="landing-title"
            variant="h1"
          >
            <span>Nuestros</span>
            <span>Productos</span>
          </Typography>

          <div aria-hidden="true" className="landing-editorial-hero__divider">
            <span />
            <span className="landing-editorial-hero__heart">♡</span>
            <span />
          </div>

          <Typography className="landing-editorial-hero__description">
            Descubrí nuestra colección de artículos de arte y decoración pensados para inspirar cada
            espacio.
          </Typography>
        </motion.div>
      </Container>
    </Section>
  )
}
