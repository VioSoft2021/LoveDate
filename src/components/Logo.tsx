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
      <svg className="ld-logo-mark-svg" viewBox="0 0 64 64" role="presentation" focusable="false">
        <path
          className="ld-logo-heart-shape"
          d="M32 17.2c-4.7-6.4-15.4-4.4-15.4 5.3 0 7.5 6.9 12.2 15.4 19.4 8.5-7.2 15.4-11.9 15.4-19.4 0-9.7-10.7-11.7-15.4-5.3Z"
        />
        <circle className="ld-logo-spark" cx="47.5" cy="16.5" r="2.3" />
        <circle className="ld-logo-spark" cx="51.5" cy="22.3" r="1.5" />
      </svg>
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
        <span className="ld-logo-main">
          {icon}
          {wordmark}
        </span>
        {showSlogan ? <span className="ld-logo-slogan">{slogan}</span> : null}
      </span>
    )
  }

  if (variant === 'full') {
    return (
      <span className={rootClass}>
        <span className="ld-logo-main">
          {icon}
          {wordmark}
        </span>
        {showSlogan ? <span className="ld-logo-slogan">{slogan}</span> : null}
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

