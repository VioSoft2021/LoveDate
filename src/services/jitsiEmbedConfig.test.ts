import { describe, expect, it } from 'vitest'
import { createJitsiEmbedOptions, createJitsiProviderConfig } from './jitsiEmbedConfig'

describe('createJitsiProviderConfig', () => {
  it('uses public meet.jit.si as a demo fallback when no provider is configured', () => {
    const provider = createJitsiProviderConfig({})

    expect(provider.domain).toBe('meet.jit.si')
    expect(provider.scriptUrl).toBe('https://meet.jit.si/external_api.js')
    expect(provider.formatRoomName('lovedate-room')).toBe('lovedate-room')
    expect(provider.buildRoomUrl('lovedate-room')).toBe('https://meet.jit.si/lovedate-room')
    expect(provider.needsModeratorAuth).toBe(true)
    expect(provider.setupMessage).toBe('Set VITE_JITSI_DOMAIN, VITE_JITSI_APP_ID, and VITE_JITSI_JWT for reliable embedded calls.')
  })

  it('formats JaaS rooms with the app id and app-scoped external API script', () => {
    const provider = createJitsiProviderConfig({
      domain: '8x8.vc',
      appId: 'vpaas-magic-cookie-love-date',
      jwt: 'signed-token',
    })

    expect(provider.domain).toBe('8x8.vc')
    expect(provider.scriptUrl).toBe('https://8x8.vc/vpaas-magic-cookie-love-date/external_api.js')
    expect(provider.formatRoomName('lovedate-room')).toBe('vpaas-magic-cookie-love-date/lovedate-room')
    expect(provider.buildRoomUrl('lovedate-room')).toBe('https://8x8.vc/vpaas-magic-cookie-love-date/lovedate-room')
    expect(provider.jwt).toBe('signed-token')
    expect(provider.needsModeratorAuth).toBe(false)
    expect(provider.setupMessage).toBeNull()
  })
})

describe('createJitsiEmbedOptions', () => {
  it('builds reliable embedded video defaults for the Cinema Stage', () => {
    const options = createJitsiEmbedOptions({
      roomName: 'lovedate-video-alex-12-k9',
      displayName: 'Alex',
      callType: 'video',
      jwt: 'signed-token',
    })

    expect(options.roomName).toBe('lovedate-video-alex-12-k9')
    expect(options.jwt).toBe('signed-token')
    expect(options.userInfo).toEqual({ displayName: 'Alex' })
    expect(options.configOverwrite.prejoinPageEnabled).toBe(false)
    expect(options.configOverwrite.prejoinConfig).toEqual({
      enabled: false,
      hideDisplayName: true,
    })
    expect(options.configOverwrite.enableWelcomePage).toBe(false)
    expect(options.configOverwrite.disableDeepLinking).toBe(true)
    expect(options.configOverwrite.startWithAudioMuted).toBe(false)
    expect(options.configOverwrite.startWithVideoMuted).toBe(false)
    expect(options.interfaceConfigOverwrite.MOBILE_APP_PROMO).toBe(false)
  })

  it('starts audio calls with video muted while keeping the same embedded room flow', () => {
    const options = createJitsiEmbedOptions({
      roomName: 'lovedate-audio-alex-12-k9',
      displayName: 'Alex',
      callType: 'audio',
    })

    expect(options.configOverwrite.startWithVideoMuted).toBe(true)
    expect(options.configOverwrite.startAudioOnly).toBe(true)
    expect(options.interfaceConfigOverwrite.TOOLBAR_BUTTONS).toContain('microphone')
    expect(options.interfaceConfigOverwrite.TOOLBAR_BUTTONS).toContain('hangup')
  })
})
