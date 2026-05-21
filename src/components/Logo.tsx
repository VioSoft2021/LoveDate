type LogoVariant = 'hero' | 'full' | 'compact' | 'icon-only'
type LogoSize = 'sm' | 'md' | 'lg' | 'xl'

type LogoProps = {
  variant?: LogoVariant
  size?: LogoSize
  showSlogan?: boolean
  slogan?: string
  className?: string
}

// Privé brand defaults. Tagline mirrors the wordmark's positioning:
// exclusivist + intentional. Override via the `slogan` prop if needed.
const DEFAULT_SLOGAN = 'Members only · By design'

// Icon mark: Cinzel-serif "P" with a horizontal accent line above it.
// Used ONLY for the icon-only variant — i.e. PWA app icon, favicon,
// home-screen launcher, Play Store listing, social avatars.
// Per the Hermès / Chanel pattern, this glyph never appears in the
// running app's UI — inside the app users see only the wordmark.
// Filled with the gold gradient defined in index.html
// (`<linearGradient id="priveGold">`).
const IconMark = ({ pixelSize }: { pixelSize: number }) => {
  const height = Math.round(pixelSize * (280 / 220))
  return (
    <svg
      viewBox="0 0 220 280"
      width={pixelSize}
      height={height}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="ld-logo-mark-svg"
    >
      <line
        x1="22"
        y1="40"
        x2="198"
        y2="40"
        stroke="url(#priveGold)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <text
        x="110"
        y="235"
        fontFamily="Cinzel, serif"
        fontWeight="700"
        fontSize="240"
        fill="url(#priveGold)"
        textAnchor="middle"
      >
        P
      </text>
    </svg>
  )
}

const ICON_PIXEL_SIZE: Record<LogoSize, number> = {
  sm: 28,
  md: 40,
  lg: 64,
  xl: 96,
}

export function Logo({
  variant = 'compact',
  size = 'md',
  showSlogan = false,
  slogan = DEFAULT_SLOGAN,
  className = '',
}: LogoProps) {
  const rootClass = `ld-logo ld-logo--${variant} ld-logo--${size} ${className}`.trim()

  // icon-only: ONLY the P+line glyph. Used for app icon / favicon /
  // social avatar. No wordmark accompanies it in this variant.
  if (variant === 'icon-only') {
    return (
      <span className={rootClass} aria-label="Privé logo">
        <span className="ld-logo-mark" aria-hidden="true">
          <IconMark pixelSize={ICON_PIXEL_SIZE[size]} />
        </span>
      </span>
    )
  }

  // Wordmark: PRIVÉ in Bodoni Moda Black. The É is split into the
  // letter + a CSS-positioned accent line above it, so the line can
  // extend wider than the letter (Direction D's elongated-accent
  // signature). Letter-spacing applied via CSS.
  const wordmark = (
    <span className="ld-logo-text" aria-label="Privé">
      <span aria-hidden="true">PRIV</span>
      <span className="ld-logo-text-e" aria-hidden="true">E</span>
    </span>
  )

  // All other variants (hero / full / compact) render ONLY the wordmark.
  // Inside the running app the brand is the wordmark; the P-icon
  // belongs to the app's launcher / favicon contexts.
  if (variant === 'hero' || variant === 'full') {
    return (
      <span className={rootClass}>
        <span className="ld-logo-title-block">
          {wordmark}
          {showSlogan ? <span className="ld-logo-slogan">{slogan}</span> : null}
        </span>
      </span>
    )
  }

  // compact: just the wordmark inline (used by TopBar header).
  return (
    <span className={rootClass}>
      {wordmark}
      {showSlogan ? <span className="ld-logo-slogan">{slogan}</span> : null}
    </span>
  )
}
