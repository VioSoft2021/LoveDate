const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (typeof value !== 'string') {
    return fallback
  }

  const normalized = value.trim().toLowerCase()
  if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on') {
    return true
  }

  if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off') {
    return false
  }

  return fallback
}

const readCsv = (value: string | undefined): string[] => {
  if (typeof value !== 'string') {
    return []
  }

  return value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0)
}

const isProd = import.meta.env.PROD

export const runtimeConfig = {
  auth: {
    requireInviteCode: parseBoolean(import.meta.env.VITE_REQUIRE_INVITE_CODE as string | undefined, true),
    allowGuestLogin: parseBoolean(import.meta.env.VITE_ALLOW_GUEST_LOGIN as string | undefined, !isProd),
    allowedEmailDomains: readCsv(import.meta.env.VITE_BETA_ALLOWED_EMAIL_DOMAINS as string | undefined),
  },
  backend: {
    allowLocalFallbackInProduction: parseBoolean(
      import.meta.env.VITE_ALLOW_LOCAL_FALLBACK_IN_PROD as string | undefined,
      false,
    ),
  },
  limits: {
    inviteAttemptsPer15Min: Number(import.meta.env.VITE_INVITE_ATTEMPTS_PER_15_MIN ?? 8),
  },
  calls: {
    jitsiDomain: (import.meta.env.VITE_JITSI_DOMAIN as string | undefined) ?? '',
    jitsiAppId: (import.meta.env.VITE_JITSI_APP_ID as string | undefined) ?? '',
    jitsiJwt: (import.meta.env.VITE_JITSI_JWT as string | undefined) ?? '',
  },
} as const

export const isAllowedEmailDomain = (email: string): boolean => {
  const domains = runtimeConfig.auth.allowedEmailDomains
  if (domains.length === 0) {
    return true
  }

  const atIndex = email.lastIndexOf('@')
  if (atIndex <= 0) {
    return false
  }

  const domain = email.slice(atIndex + 1).trim().toLowerCase()
  return domains.includes(domain)
}
