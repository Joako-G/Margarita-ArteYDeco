import type { IFaqItem } from '@/shared/types/content'

export const faqMock: IFaqItem[] = [
  {
    id: 'faq-purchase',
    question: '¿Cómo realizo una compra?',
    answer:
      'Elegí tus productos, revisá las cantidades y completá tus datos. Podés pagar en efectivo o por transferencia.',
  },
  {
    id: 'faq-pickup',
    question: '¿Cómo recibo mi pedido?',
    answer:
      'Por el momento todos los pedidos se retiran en el local. Te mostraremos la dirección y los horarios antes de confirmar.',
  },
  {
    id: 'faq-ready',
    question: '¿Cómo sé cuándo está listo?',
    answer:
      'Cuando terminemos de prepararlo, nos comunicaremos con vos al número informado durante la compra.',
  },
  {
    id: 'faq-transfer',
    question: '¿La transferencia tiene descuento?',
    answer: 'Sí. El porcentaje vigente y el total final se muestran antes de confirmar el pedido.',
  },
  {
    id: 'faq-stock',
    question: '¿Puedo pedir más unidades de las disponibles?',
    answer:
      'No. La tienda limita cada cantidad al stock disponible y vuelve a validarlo al confirmar el pedido.',
  },
]
