import { HeartHandshake, Palette, Sparkles, Truck } from 'lucide-react'

import { Container, Section, Typography } from '@/shared/components'

const BENEFITS = [
  {
    description: 'Una selección pensada para distintas técnicas y proyectos.',
    icon: Palette,
    title: 'Variedad para crear',
  },
  {
    description: 'Productos elegidos para acompañarte desde la idea hasta el detalle final.',
    icon: Sparkles,
    title: 'Materiales seleccionados',
  },
  {
    description: 'Te orientamos para que encuentres lo que realmente necesitás.',
    icon: HeartHandshake,
    title: 'Atención cercana',
  },
  {
    description: 'Elegí retirar en el local o coordiná el envío con nosotros.',
    icon: Truck,
    title: 'Retiro o envío',
  },
]

export function BenefitsSection() {
  return (
    <Section className="landing-benefits" aria-labelledby="benefits-title">
      <Container>
        <div className="landing-section-heading landing-section-heading--compact">
          <Typography id="benefits-title" variant="h2">
            Todo para disfrutar el proceso
          </Typography>
          <Typography>
            Elegir materiales también es parte de crear. Queremos que sea simple, inspirador y
            cercano.
          </Typography>
        </div>
        <div className="landing-benefits__list">
          {BENEFITS.map((benefit) => {
            const Icon = benefit.icon

            return (
              <article className="landing-benefit" key={benefit.title}>
                <Icon aria-hidden="true" size={28} strokeWidth={2} />
                <Typography as="h3" variant="h3">
                  {benefit.title}
                </Typography>
                <Typography variant="small">{benefit.description}</Typography>
              </article>
            )
          })}
        </div>
      </Container>
    </Section>
  )
}
