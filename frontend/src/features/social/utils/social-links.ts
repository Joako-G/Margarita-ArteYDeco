import { Facebook, Instagram, Music2 } from 'lucide-react'

import type { IPublicSettings } from '@/shared/types/commerce'

import type { ISocialLink } from '../types/social-links'

export function createSocialLinks(settings?: Pick<IPublicSettings, 'facebook' | 'instagram' | 'tiktok'>) {
  const links: ISocialLink[] = []

  if (settings?.instagram) {
    links.push({
      Icon: Instagram,
      id: 'instagram',
      name: 'Instagram',
      url: settings.instagram,
    })
  }

  if (settings?.facebook) {
    links.push({
      Icon: Facebook,
      id: 'facebook',
      name: 'Facebook',
      url: settings.facebook,
    })
  }

  if (settings?.tiktok) {
    links.push({
      Icon: Music2,
      id: 'tiktok',
      name: 'TikTok',
      url: settings.tiktok,
    })
  }

  return links
}
