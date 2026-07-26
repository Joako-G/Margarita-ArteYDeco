export interface IFaqItem {
  answer: string
  id: string
  question: string
}

export interface IGalleryItem {
  alt: string
  id: string
  image: string
  size: 'large' | 'medium' | 'small'
  title: string
}

export interface ITestimonial {
  author: string
  id: string
  quote: string
  role: string
}
