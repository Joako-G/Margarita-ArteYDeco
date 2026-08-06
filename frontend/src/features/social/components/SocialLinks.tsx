import type { ISocialLink } from '../types/social-links'

import './social-links.css'

interface ISocialLinksProps {
  links: ISocialLink[]
}

export function SocialLinks({ links }: ISocialLinksProps) {
  return (
    <div aria-label="Redes sociales" className="social-links" role="group">
      {links.map(({ Icon, id, name, url }) => (
        <a
          aria-label={name}
          className="social-links__link"
          href={url}
          key={id}
          rel="noopener noreferrer"
          target="_blank"
          title={name}
        >
          <Icon aria-hidden="true" size={24} strokeWidth={2} />
        </a>
      ))}
    </div>
  )
}
