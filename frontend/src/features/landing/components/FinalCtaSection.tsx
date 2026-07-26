import { MapPin } from 'lucide-react'

import { Button, Container, Typography } from '@/shared/components'

export function FinalCtaSection() {
  function handleExplore() {
    document.querySelector('#categorias')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section aria-labelledby="cta-title" className="landing-final-cta">
      <Container className="landing-final-cta__inner">
        <div>
          <p className="landing-final-cta__pickup">
            <MapPin aria-hidden="true" size={22} strokeWidth={2} />
            Retiro coordinado en el local
          </p>
          <Typography id="cta-title" variant="h2">
            Tu próximo proyecto puede empezar hoy
          </Typography>
          <Typography>
            Explorá los materiales, elegí lo que necesitás y prepará nuevas ideas.
          </Typography>
        </div>
        <Button onClick={handleExplore} size="large" variant="secondary">
          Descubrir materiales
        </Button>
      </Container>
    </section>
  )
}
