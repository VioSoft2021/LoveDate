export type JitsiCallType = 'audio' | 'video'

export type JitsiProviderConfig = {
  domain: string
  scriptUrl: string
  jwt: string
  needsModeratorAuth: boolean
  setupMessage: string | null
  formatRoomName: (roomId: string) => string
  buildRoomUrl: (roomId: string) => string
}

export type JitsiEmbedOptions = {
  roomName: string
  width: string
  height: string
  jwt?: string
  configOverwrite: {
    disableDeepLinking: boolean
    enableWelcomePage: boolean
    prejoinPageEnabled: boolean
    prejoinConfig: {
      enabled: boolean
      hideDisplayName: boolean
    }
    startAudioOnly: boolean
    startWithAudioMuted: boolean
    startWithVideoMuted: boolean
  }
  interfaceConfigOverwrite: {
    MOBILE_APP_PROMO: boolean
    SHOW_JITSI_WATERMARK: boolean
    SHOW_WATERMARK_FOR_GUESTS: boolean
    TOOLBAR_BUTTONS: string[]
  }
  userInfo: {
    displayName: string
  }
}

const EMBED_TOOLBAR_BUTTONS = [
  'microphone',
  'camera',
  'desktop',
  'tileview',
  'fullscreen',
  'hangup',
  'settings',
]

const normalizeDomain = (domain: string | undefined): string => {
  const normalized = (domain ?? '').trim().replace(/^https?:\/\//, '').replace(/\/+$/, '')
  return normalized || 'meet.jit.si'
}

export const createJitsiProviderConfig = ({
  domain,
  appId,
  jwt,
}: {
  domain?: string
  appId?: string
  jwt?: string
}): JitsiProviderConfig => {
  const normalizedDomain = normalizeDomain(domain)
  const normalizedAppId = (appId ?? '').trim().replace(/^\/+|\/+$/g, '')
  const normalizedJwt = (jwt ?? '').trim()
  const isJaas = normalizedDomain === '8x8.vc' && normalizedAppId.length > 0
  const needsModeratorAuth = normalizedDomain === 'meet.jit.si' && normalizedJwt.length === 0
  const scriptUrl = isJaas
    ? `https://${normalizedDomain}/${normalizedAppId}/external_api.js`
    : `https://${normalizedDomain}/external_api.js`

  const formatRoomName = (roomId: string): string => {
    const cleanRoomId = roomId.trim().replace(/^\/+|\/+$/g, '')
    return isJaas ? `${normalizedAppId}/${cleanRoomId}` : cleanRoomId
  }

  return {
    domain: normalizedDomain,
    scriptUrl,
    jwt: normalizedJwt,
    needsModeratorAuth,
    setupMessage: needsModeratorAuth
      ? 'Set VITE_JITSI_DOMAIN, VITE_JITSI_APP_ID, and VITE_JITSI_JWT for reliable embedded calls.'
      : null,
    formatRoomName,
    buildRoomUrl: (roomId: string) => `https://${normalizedDomain}/${formatRoomName(roomId)}`,
  }
}

export const createJitsiEmbedOptions = ({
  roomName,
  displayName,
  callType,
  jwt,
}: {
  roomName: string
  displayName: string
  callType: JitsiCallType
  jwt?: string
}): JitsiEmbedOptions => {
  const isAudioOnly = callType === 'audio'

  return {
    roomName,
    width: '100%',
    height: '100%',
    ...(jwt?.trim() ? { jwt: jwt.trim() } : {}),
    configOverwrite: {
      disableDeepLinking: true,
      enableWelcomePage: false,
      prejoinPageEnabled: false,
      prejoinConfig: {
        enabled: false,
        hideDisplayName: true,
      },
      startAudioOnly: isAudioOnly,
      startWithAudioMuted: false,
      startWithVideoMuted: isAudioOnly,
    },
    interfaceConfigOverwrite: {
      MOBILE_APP_PROMO: false,
      SHOW_JITSI_WATERMARK: false,
      SHOW_WATERMARK_FOR_GUESTS: false,
      TOOLBAR_BUTTONS: EMBED_TOOLBAR_BUTTONS,
    },
    userInfo: {
      displayName: displayName.trim() || 'LoveDate guest',
    },
  }
}
