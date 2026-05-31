import { useCallback } from 'react'
import { SOCIAL_PLATFORM_META } from '../constants'
import type { SelfProfile, SocialPlatform } from '../domain'

// Phase D — useSocialConnections
//
// The social-graph handlers, lifted out of App.tsx verbatim: suggesting a
// handle, connecting/disconnecting a platform, toggling the promotion opt-in,
// and sharing Privé to an external network. They read selfProfile and persist
// via saveSelfProfilePatch (which owns the setState + cloud sync + toast), so
// the only side channels here are the share-out (window.open / clipboard) and
// a couple of guard toasts.

export type UseSocialConnectionsInput = {
  selfProfile: SelfProfile
  saveSelfProfilePatch: (nextProfile: SelfProfile, successMessage?: string) => void
  pushToast: (message: string, tone?: 'info' | 'success' | 'error') => void
}

export type UseSocialConnectionsResult = {
  setSocialConnectionDecision: (platform: SocialPlatform, connect: boolean) => void
  toggleSocialPromotionOptIn: (checked: boolean) => void
  sharePriveOnPlatform: (platform: SocialPlatform) => Promise<void>
}

export const useSocialConnections = (
  deps: UseSocialConnectionsInput,
): UseSocialConnectionsResult => {
  const { selfProfile, saveSelfProfilePatch, pushToast } = deps

  // Internal — suggests a sensible default handle from the user's name (and
  // their existing Instagram value). Not exposed; only the connect path uses it.
  const suggestSocialHandle = useCallback(
    (platform: SocialPlatform): string => {
      const baseFromName = selfProfile.name.toLowerCase().replace(/[^a-z0-9]+/g, '')
      const fallback = baseFromName.length > 0 ? baseFromName : 'priveuser'
      if (platform === 'instagram') {
        return selfProfile.instagram.replace(/^@+/, '').trim() || fallback
      }
      if (platform === 'tiktok') {
        return `@${fallback}`
      }
      if (platform === 'linkedin') {
        return `in/${fallback}`
      }
      return fallback
    },
    [selfProfile.name, selfProfile.instagram],
  )

  const setSocialConnectionDecision = useCallback(
    (platform: SocialPlatform, connect: boolean) => {
      const currentEntry = selfProfile.socialConnections[platform]
      const nextHandle = connect
        ? currentEntry.handle.trim() || suggestSocialHandle(platform)
        : currentEntry.handle
      const nextProfile: SelfProfile = {
        ...selfProfile,
        socialConnections: {
          ...selfProfile.socialConnections,
          [platform]: {
            connected: connect,
            handle: nextHandle,
          },
        },
      }
      saveSelfProfilePatch(
        nextProfile,
        connect
          ? `${SOCIAL_PLATFORM_META.find((item) => item.id === platform)?.label ?? 'Social'} enabled.`
          : `${SOCIAL_PLATFORM_META.find((item) => item.id === platform)?.label ?? 'Social'} disabled.`,
      )
    },
    [selfProfile, saveSelfProfilePatch, suggestSocialHandle],
  )

  const toggleSocialPromotionOptIn = useCallback(
    (checked: boolean) => {
      const nextProfile: SelfProfile = {
        ...selfProfile,
        socialPromotionOptIn: checked,
      }
      saveSelfProfilePatch(
        nextProfile,
        checked ? 'Social sharing prompts enabled.' : 'Social sharing prompts paused.',
      )
    },
    [selfProfile, saveSelfProfilePatch],
  )

  const sharePriveOnPlatform = useCallback(
    async (platform: SocialPlatform) => {
      if (!selfProfile.socialPromotionOptIn) {
        pushToast('Enable social sharing prompts first.', 'info')
        return
      }

      const appUrl = 'https://prive-app.club'
      const pitch = `I just joined Privé. Come find me there.`
      const encodedPitch = encodeURIComponent(pitch)
      const encodedUrl = encodeURIComponent(appUrl)

      let shareUrl = ''
      if (platform === 'x') {
        shareUrl = `https://twitter.com/intent/tweet?text=${encodedPitch}&url=${encodedUrl}`
      } else if (platform === 'facebook') {
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedPitch}`
      } else if (platform === 'linkedin') {
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
      }

      if (shareUrl) {
        window.open(shareUrl, '_blank', 'noopener,noreferrer')
        pushToast('Share window opened.', 'success')
        return
      }

      const caption = `${pitch} ${appUrl}`
      try {
        await navigator.clipboard.writeText(caption)
        pushToast('Caption copied. Paste it into your Instagram/TikTok post.', 'success')
      } catch {
        pushToast('Copy failed. Please copy and share manually.', 'error')
      }
    },
    [selfProfile.socialPromotionOptIn, pushToast],
  )

  return {
    setSocialConnectionDecision,
    toggleSocialPromotionOptIn,
    sharePriveOnPlatform,
  }
}
