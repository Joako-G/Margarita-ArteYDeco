import { Quote } from 'lucide-react'

import type { ITestimonial } from '@/shared/types/content'
import { Container, Section, Typography } from '@/shared/components'

interface ITestimonialsSectionProps {
  testimonials: ITestimonial[]
}

export function TestimonialsSection({ testimonials }: ITestimonialsSectionProps) {
  return (
    <Section aria-labelledby="testimonials-title" className="landing-testimonials">
      <Container>
        <div className="landing-section-heading landing-section-heading--compact">
          <Typography id="testimonials-title" variant="h2">
            Crear también es compartir
          </Typography>
          <Typography>
            Experiencias de personas que encontraron materiales y acompañamiento para sus ideas.
          </Typography>
        </div>
        <div className="landing-testimonials__list">
          {testimonials.map((testimonial) => (
            <blockquote className="landing-testimonial" key={testimonial.id}>
              <Quote aria-hidden="true" size={28} strokeWidth={2} />
              <p>“{testimonial.quote}”</p>
              <footer>
                <strong>{testimonial.author}</strong>
                <span>{testimonial.role}</span>
              </footer>
            </blockquote>
          ))}
        </div>
      </Container>
    </Section>
  )
}
