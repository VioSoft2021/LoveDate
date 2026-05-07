import iconUrl from '../assets/icon.png'

type LogoVariant = 'hero' | 'full' | 'compact' | 'icon-only'
type LogoSize = 'sm' | 'md' | 'lg' | 'xl'

type LogoProps = {
  variant?: LogoVariant
  size?: LogoSize
  showSlogan?: boolean
  slogan?: string
  className?: string
}

const DEFAULT_SLOGAN = 'the best you can do for you'

export function Logo({
  variant = 'compact',
  size = 'md',
  showSlogan = false,
  slogan = DEFAULT_SLOGAN,
  className = '',
}: LogoProps) {
  const rootClass = `ld-logo ld-logo--${variant} ld-logo--${size} ${className}`.trim()

  const icon = (
    <span className="ld-logo-mark" aria-hidden="true">
      <img className="ld-logo-mark-img" src={iconUrl} alt="" />
    </span>
  )

  const wordmark = <span className="ld-logo-text">LOVEDATE</span>

  if (variant === 'icon-only') {
    return (
      <span className={rootClass} aria-label="LoveDate logo">
        {icon}
      </span>
    )
  }

  if (variant === 'hero') {
    return (
      <span className={rootClass}>
        <span className="ld-logo-main ld-logo-main--stacked-text">
          {icon}
          <span className="ld-logo-title-block">
            {wordmark}
            {showSlogan ? <span className="ld-logo-slogan">{slogan}</span> : null}
          </span>
        </span>
      </span>
    )
  }

  if (variant === 'full') {
    return (
      <span className={rootClass}>
        <span className="ld-logo-main ld-logo-main--stacked-text">
          {icon}
          <span className="ld-logo-title-block">
            {wordmark}
            {showSlogan ? <span className="ld-logo-slogan">{slogan}</span> : null}
          </span>
        </span>
      </span>
    )
  }

  return (
    <span className={rootClass}>
      {icon}
      {wordmark}
      {showSlogan ? <span className="ld-logo-slogan">{slogan}</span> : null}
    </span>
  )
}
