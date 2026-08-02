import type { IProduct } from '@/shared/types/catalog'

import { ClassicHeroSection } from './ClassicHeroSection'
import { ShowcaseHeroSection } from './ShowcaseHeroSection'

interface IHeroSectionProps {
  featuredProduct?: IProduct
}

const HERO_VARIANT = import.meta.env.VITE_LANDING_HERO_VARIANT ?? 'showcase'

export function HeroSection({ featuredProduct }: IHeroSectionProps) {
  if (HERO_VARIANT === 'classic') {
    return <ClassicHeroSection />
  }

  return <ShowcaseHeroSection featuredProduct={featuredProduct} />
}
