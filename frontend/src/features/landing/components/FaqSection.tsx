import type { IFaqItem } from '@/shared/types/content'
import { Accordion, Container, Section, Typography } from '@/shared/components'

interface IFaqSectionProps {
  items: IFaqItem[]
}

export function FaqSection({ items }: IFaqSectionProps) {
  const accordionItems = items.map((item) => ({
    content: <p className="landing-faq__answer">{item.answer}</p>,
    id: item.id,
    title: item.question,
  }))

  return (
    <Section aria-labelledby="faq-title" background="muted" className="landing-faq" id="preguntas">
      <Container className="landing-faq__layout">
        <div className="landing-faq__intro">
          <Typography id="faq-title" variant="h2">
            Preguntas frecuentes
          </Typography>
          <Typography>
            Reunimos las respuestas principales para que puedas comprar con tranquilidad.
          </Typography>
        </div>
        <Accordion className="landing-faq__accordion" items={accordionItems} />
      </Container>
    </Section>
  )
}
