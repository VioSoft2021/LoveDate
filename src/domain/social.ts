export type SocialPlatform = 'x' | 'instagram' | 'facebook' | 'linkedin' | 'tiktok'

export type SocialConnection = {
  connected: boolean
  handle: string
}

export type SocialConnections = Record<SocialPlatform, SocialConnection>
