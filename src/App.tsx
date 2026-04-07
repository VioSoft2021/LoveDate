// Zodiac emoji mapping (creative alternative)
const ZODIAC_EMOJI: Record<string, string> = {
  Aries: '\u2648\uFE0F',
  Taurus: '\u2649\uFE0F',
  Gemini: '\u264A\uFE0F',
  Cancer: '\u264B\uFE0F',
  Leo: '\u264C\uFE0F',
  Virgo: '\u264D\uFE0F',
  Libra: '\u264E\uFE0F',
  Scorpio: '\u264F\uFE0F',
  Sagittarius: '\u2650\uFE0F',
  Capricorn: '\u2651\uFE0F',
  Aquarius: '\u2652\uFE0F',
  Pisces: '\u2653\uFE0F',
}
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { getProfiles, resolveMatch, type Profile } from './services/loveDateApi'
import { FilterScreen } from './components/FilterScreen'
import { Logo } from './components/Logo'
import {
  backendGuestLogin,
  backendLogin,
  backendRegister,
  backendSavePreferences,
  backendSaveSettings,
  backendSendChatReply,
  backendSignOut,
  backendValidateInviteCode,
  getBackendMode,
  type SettingsPayload,
} from './services/backendApi'
import { runtimeConfig } from './services/runtimeConfig'
import {
  canLikeNow,
  canSuperLikeNow,
  getLikeUsage,
  getSuperLikeUsage,
  recordLikeEvent,
  recordSuperLikeEvent,
  rollbackLastLikeEvent,
  rollbackLastSuperLikeEvent,
} from './services/engagementLimits'
import { canUsePassport, getActivePlan, setActivePlan as persistActivePlan } from './services/planGate'
import { PLAN_OPTIONS, type PlanTier } from './spec/lovedateConfig'

type SwipeDirection = 'left' | 'right'
type SwipeIntent = 'pass' | 'like' | 'super-like'
type AppScreen =
  | 'login'
  | 'discover'
  | 'activity'
  | 'chats'
  | 'profile'
  | 'settings'
  | 'profile-detail'
  | 'filters'

type SwipeHistory = {
  likedIds: number[]
  passedIds: number[]
  matchIds: number[]
}

export type Filters = {
  minAge: number
  maxAge: number
  city: string
  interest: string
  gender: 'any' | 'woman' | 'man' | 'non-binary'
  relationshipGoal: 'any' | Profile['relationshipGoal']
  maxDistanceKm: number
  verifiedOnly: boolean
  sortBy: 'recommended' | 'nearest' | 'youngest' | 'oldest'
  zodiacCompatibility: string // '' means no filter, otherwise filter for compatible signs
}

type SwipeLog = {
  profileId: number
  direction: SwipeDirection
  intent: SwipeIntent
  wasMatch: boolean
}

type ChatMessage = {
  id: number
  sender: 'me' | 'them'
  text: string
  createdAt: number
  attachment?: {
    kind: 'image' | 'video' | 'audio'
    url: string
    name: string
  }
  status?: 'sending' | 'sent' | 'read'
}

type Toast = {
  id: number
  message: string
  tone: 'info' | 'success' | 'error'
}

type NotificationItem = {
  id: number
  title: string
  body: string
  createdAt: number
  read: boolean
  category: 'match' | 'message' | 'system' | 'safety'
}

type CallState = {
  active: boolean
  type: 'audio' | 'video' | null
  status: 'ringing' | 'connected'
  startedAt: number
  targetProfileId: number | null
  muted: boolean
  cameraOff: boolean
}

type SafetyReport = {
  profileId: number
  reason: string
  createdAt: number
}

type SelfProfile = {
  name: string
  age: number
  city: string
  vibe: string
  bio: string
  interests: string[]
  pronouns: string
  gender: string
  orientation: string
  lookingFor: string
  relationshipIntent: string
  heightCm: number
  jobTitle: string
  company: string
  education: string
  hometown: string
  languages: string[]
  drinking: string
  smoking: string
  workout: string
  religion: string
  politics: string
  zodiac: string
  childrenPlan: string
  pets: string
  promptOne: string
  promptTwo: string
  promptThree: string
  dealbreakers: string[]
  instagram: string
  anthem: string
  travelMode: boolean
  photos: string[]
}

type PhotoStudioControls = {
  cropAspect: 'free' | 'portrait' | 'square' | 'classic'
  zoom: number
  rotate: number
  brightness: number
  contrast: number
  saturate: number
  offsetX: number
  offsetY: number
  freeCropX: number
  freeCropY: number
  freeCropWidth: number
  freeCropHeight: number
}

type PhotoStudioAnalysis = {
  width: number
  height: number
  aspectRatio: string
  sizeKb: number
  averageBrightness: number
}

type CropHandle = 'nw' | 'ne' | 'sw' | 'se'

const HISTORY_STORAGE_KEY = 'lovedate:swipe-history'
const AUTH_STORAGE_KEY = 'lovedate:auth-session'
const SELF_PROFILE_STORAGE_KEY = 'lovedate:self-profile'
const CHAT_THREADS_STORAGE_KEY = 'lovedate:chat-threads'

const buildHighResImageUrl = (url: string, width = 2400, dpr = 2): string => {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.toLowerCase()
    if (!host.includes('images.unsplash.com')) {
      return url
    }
    parsed.searchParams.set('auto', 'format')
    parsed.searchParams.set('fit', 'crop')
    parsed.searchParams.set('fm', 'webp')
    parsed.searchParams.set('w', String(width))
    parsed.searchParams.set('q', '95')
    parsed.searchParams.set('dpr', String(dpr))
    return parsed.toString()
  } catch {
    return url
  }
}

const normalizeProfilePhotos = (profile: Profile): Profile => ({
  ...profile,
  photos: profile.photos.map((photo) => buildHighResImageUrl(photo, 2400, 2)),
})

const initialFilters: Filters = {
  minAge: 18,
  maxAge: 60,
  city: '',
  interest: '',
  gender: 'woman',
  relationshipGoal: 'any',
  maxDistanceKm: 60,
  verifiedOnly: false,
  sortBy: 'recommended',
  zodiacCompatibility: '',
}
// Zodiac compatibility map (simplified, can be expanded)
const ZODIAC_COMPATIBILITY: Record<string, string[]> = {
  Aries: ['Leo', 'Sagittarius', 'Gemini', 'Aquarius', 'Libra'],
  Taurus: ['Virgo', 'Capricorn', 'Cancer', 'Pisces'],
  Gemini: ['Libra', 'Aquarius', 'Aries', 'Leo'],
  Cancer: ['Scorpio', 'Pisces', 'Taurus', 'Virgo'],
  Leo: ['Aries', 'Sagittarius', 'Gemini', 'Libra'],
  Virgo: ['Taurus', 'Capricorn', 'Cancer', 'Scorpio'],
  Libra: ['Gemini', 'Aquarius', 'Leo', 'Sagittarius'],
  Scorpio: ['Cancer', 'Pisces', 'Virgo', 'Capricorn'],
  Sagittarius: ['Aries', 'Leo', 'Libra', 'Aquarius'],
  Capricorn: ['Taurus', 'Virgo', 'Scorpio', 'Pisces'],
  Aquarius: ['Gemini', 'Libra', 'Sagittarius', 'Aries'],
  Pisces: ['Cancer', 'Scorpio', 'Taurus', 'Capricorn'],
}

const DEFAULT_SELF_PROFILE: SelfProfile = {
  name: 'You',
  age: 28,
  city: 'Prague',
  vibe: 'Builder mode',
  bio: 'Product-minded creative who likes coffee walks, good playlists, and spontaneous city trips.',
  interests: ['Design', 'Travel', 'Coffee', 'Live music'],
  pronouns: 'They/Them',
  gender: 'Non-binary',
  orientation: 'Open',
  lookingFor: 'Long-term relationship',
  relationshipIntent: 'Serious with playful energy',
  heightCm: 172,
  jobTitle: 'Product Designer',
  company: 'Studio Nova',
  education: 'MSc Human-Computer Interaction',
  hometown: 'Brno',
  languages: ['English', 'Czech'],
  drinking: 'Socially',
  smoking: 'Never',
  workout: '3x per week',
  religion: 'Agnostic',
  politics: 'Moderate',
  zodiac: 'Libra',
  childrenPlan: 'Maybe someday',
  pets: 'Dog-friendly',
  promptOne: 'A sunday well spent: farmers market and espresso.',
  promptTwo: 'Most irrational fear: escalators with weird timing.',
  promptThree: 'Green flag I love: emotional maturity.',
  dealbreakers: ['Rudeness', 'Dishonesty'],
  instagram: '@you',
  anthem: 'Midnight City - M83',
  travelMode: false,
  photos: [
    'https://images.unsplash.com/photo-1521119989659-a83eee488004?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
  ],
}

const parseRoute = (path: string): { screen: AppScreen; profileId: number | null } => {
  if (path === '/login' || path === '/') {
    return { screen: 'login', profileId: null }
  }

  if (path === '/discover') {
    return { screen: 'discover', profileId: null }
  }

  if (path === '/activity') {
    return { screen: 'activity', profileId: null }
  }

  if (path === '/chats') {
    return { screen: 'chats', profileId: null }
  }

  if (path === '/profile') {
    return { screen: 'profile', profileId: null }
  }

  if (path === '/settings') {
    return { screen: 'settings', profileId: null }
  }

  if (path === '/filters') {
    return { screen: 'filters', profileId: null }
  }

  if (path.startsWith('/profile/')) {
    const id = Number(path.split('/')[2])
    if (Number.isInteger(id)) {
      return { screen: 'profile-detail', profileId: id }
    }
  }

  return { screen: 'login', profileId: null }
}

const buildPath = (screen: AppScreen, profileId: number | null): string => {
  if (screen === 'profile-detail' && profileId) {
    return `/profile/${profileId}`
  }

  if (screen === 'filters') {
    return '/filters'
  }

  return `/${screen}`
}

const readRouteFromWindow = (): { screen: AppScreen; profileId: number | null } => {
  const isFileProtocol = window.location.protocol === 'file:'
  if (isFileProtocol) {
    const rawHash = window.location.hash.replace(/^#/, '')
    const hashPath = rawHash.length > 0 ? (rawHash.startsWith('/') ? rawHash : `/${rawHash}`) : '/login'
    return parseRoute(hashPath)
  }

  return parseRoute(window.location.pathname)
}

const readAuth = (): { isAuthenticated: boolean; email: string } => {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) {
      return { isAuthenticated: false, email: '' }
    }

    const parsed = JSON.parse(raw) as { email?: string; isAuthenticated?: boolean }
    if (parsed.isAuthenticated && typeof parsed.email === 'string') {
      return { isAuthenticated: true, email: parsed.email }
    }

    return { isAuthenticated: false, email: '' }
  } catch {
    return { isAuthenticated: false, email: '' }
  }
}

const readHistory = (): SwipeHistory => {
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY)
    if (!raw) {
      return { likedIds: [], passedIds: [], matchIds: [] }
    }

    const parsed = JSON.parse(raw) as Partial<SwipeHistory>
    return {
      likedIds: Array.isArray(parsed.likedIds)
        ? parsed.likedIds.filter((id): id is number => Number.isInteger(id))
        : [],
      passedIds: Array.isArray(parsed.passedIds)
        ? parsed.passedIds.filter((id): id is number => Number.isInteger(id))
        : [],
      matchIds: Array.isArray(parsed.matchIds)
        ? parsed.matchIds.filter((id): id is number => Number.isInteger(id))
        : [],
    }
  } catch {
    return { likedIds: [], passedIds: [], matchIds: [] }
  }
}

const readSelfProfile = (): SelfProfile => {
  try {
    const raw = window.localStorage.getItem(SELF_PROFILE_STORAGE_KEY)
    if (!raw) {
      return DEFAULT_SELF_PROFILE
    }

    const parsed = JSON.parse(raw) as Partial<SelfProfile>
    const safeInterests = Array.isArray(parsed.interests)
      ? parsed.interests.filter((value): value is string => typeof value === 'string').slice(0, 6)
      : DEFAULT_SELF_PROFILE.interests
    const safeLanguages = Array.isArray(parsed.languages)
      ? parsed.languages.filter((value): value is string => typeof value === 'string').slice(0, 6)
      : DEFAULT_SELF_PROFILE.languages
    const safeDealbreakers = Array.isArray(parsed.dealbreakers)
      ? parsed.dealbreakers.filter((value): value is string => typeof value === 'string').slice(0, 8)
      : DEFAULT_SELF_PROFILE.dealbreakers
    const safePhotos = Array.isArray(parsed.photos)
      ? parsed.photos.filter((value): value is string => typeof value === 'string' && value.trim().length > 0).slice(0, 9)
      : DEFAULT_SELF_PROFILE.photos

    const safeString = (value: unknown, fallback: string): string => {
      return typeof value === 'string' && value.trim().length > 0 ? value : fallback
    }

    return {
      name: safeString(parsed.name, DEFAULT_SELF_PROFILE.name),
      age: Number.isFinite(parsed.age)
        ? Math.min(99, Math.max(18, Number(parsed.age)))
        : DEFAULT_SELF_PROFILE.age,
      city: safeString(parsed.city, DEFAULT_SELF_PROFILE.city),
      vibe: safeString(parsed.vibe, DEFAULT_SELF_PROFILE.vibe),
      bio: safeString(parsed.bio, DEFAULT_SELF_PROFILE.bio),
      interests: safeInterests.length > 0 ? safeInterests : DEFAULT_SELF_PROFILE.interests,
      pronouns: safeString(parsed.pronouns, DEFAULT_SELF_PROFILE.pronouns),
      gender: safeString(parsed.gender, DEFAULT_SELF_PROFILE.gender),
      orientation: safeString(parsed.orientation, DEFAULT_SELF_PROFILE.orientation),
      lookingFor: safeString(parsed.lookingFor, DEFAULT_SELF_PROFILE.lookingFor),
      relationshipIntent: safeString(parsed.relationshipIntent, DEFAULT_SELF_PROFILE.relationshipIntent),
      heightCm: Number.isFinite(parsed.heightCm)
        ? Math.min(230, Math.max(130, Number(parsed.heightCm)))
        : DEFAULT_SELF_PROFILE.heightCm,
      jobTitle: safeString(parsed.jobTitle, DEFAULT_SELF_PROFILE.jobTitle),
      company: safeString(parsed.company, DEFAULT_SELF_PROFILE.company),
      education: safeString(parsed.education, DEFAULT_SELF_PROFILE.education),
      hometown: safeString(parsed.hometown, DEFAULT_SELF_PROFILE.hometown),
      languages: safeLanguages.length > 0 ? safeLanguages : DEFAULT_SELF_PROFILE.languages,
      drinking: safeString(parsed.drinking, DEFAULT_SELF_PROFILE.drinking),
      smoking: safeString(parsed.smoking, DEFAULT_SELF_PROFILE.smoking),
      workout: safeString(parsed.workout, DEFAULT_SELF_PROFILE.workout),
      religion: safeString(parsed.religion, DEFAULT_SELF_PROFILE.religion),
      politics: safeString(parsed.politics, DEFAULT_SELF_PROFILE.politics),
      zodiac: safeString(parsed.zodiac, DEFAULT_SELF_PROFILE.zodiac),
      childrenPlan: safeString(parsed.childrenPlan, DEFAULT_SELF_PROFILE.childrenPlan),
      pets: safeString(parsed.pets, DEFAULT_SELF_PROFILE.pets),
      promptOne: safeString(parsed.promptOne, DEFAULT_SELF_PROFILE.promptOne),
      promptTwo: safeString(parsed.promptTwo, DEFAULT_SELF_PROFILE.promptTwo),
      promptThree: safeString(parsed.promptThree, DEFAULT_SELF_PROFILE.promptThree),
      dealbreakers: safeDealbreakers.length > 0 ? safeDealbreakers : DEFAULT_SELF_PROFILE.dealbreakers,
      instagram: safeString(parsed.instagram, DEFAULT_SELF_PROFILE.instagram),
      anthem: safeString(parsed.anthem, DEFAULT_SELF_PROFILE.anthem),
      travelMode: typeof parsed.travelMode === 'boolean' ? parsed.travelMode : DEFAULT_SELF_PROFILE.travelMode,
      photos: safePhotos.length > 0 ? safePhotos : DEFAULT_SELF_PROFILE.photos,
    }
  } catch {
    return DEFAULT_SELF_PROFILE
  }
}

const readChatThreads = (): Record<number, ChatMessage[]> => {
  try {
    const raw = window.localStorage.getItem(CHAT_THREADS_STORAGE_KEY)
    if (!raw) {
      return {}
    }

    const parsed = JSON.parse(raw) as Record<string, ChatMessage[]>
    const next: Record<number, ChatMessage[]> = {}

    for (const [key, thread] of Object.entries(parsed)) {
      const numericId = Number(key)
      if (!Number.isInteger(numericId) || !Array.isArray(thread)) {
        continue
      }

      next[numericId] = thread
        .filter((message) => message && typeof message === 'object')
        .map((message, index) => ({
          id: Number.isFinite(message.id) ? Number(message.id) : Date.now() + index,
          sender: message.sender === 'them' ? 'them' : 'me',
          text: typeof message.text === 'string' ? message.text : '',
          createdAt: Number.isFinite(message.createdAt) ? Number(message.createdAt) : Date.now(),
          attachment:
            message.attachment &&
            typeof message.attachment.url === 'string' &&
            !message.attachment.url.startsWith('blob:')
              ? {
                  kind: message.attachment.kind,
                  url: message.attachment.url,
                  name: message.attachment.name,
                }
              : undefined,
          status:
            message.status === 'sending' || message.status === 'sent' || message.status === 'read'
              ? message.status
              : undefined,
        }))
    }

    return next
  } catch {
    return {}
  }
}

const formatShortTime = (timestamp: number): string =>
  new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

const getProfilePhotos = (profile: Profile): string[] => profile.photos

const getProfilePrompts = (profile: Profile): string[] => [
  `A perfect first date for ${profile.name}: ${profile.interests[0]} and great coffee.`,
  `${profile.name} is currently obsessed with: ${profile.interests[1]}.`,
  `Ask ${profile.name} about: ${profile.vibe.toLowerCase()}.`,
]

const toGenderKey = (gender: Profile['gender']): Filters['gender'] => {
  if (gender === 'Woman') {
    return 'woman'
  }

  if (gender === 'Man') {
    return 'man'
  }

  return 'non-binary'
}

const loadImageFromSource = (source: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Image could not be loaded'))
    image.src = source
  })
}

const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }
      reject(new Error('Invalid file payload'))
    }
    reader.onerror = () => reject(new Error('File read failed'))
    reader.readAsDataURL(file)
  })
}

const analyzePhoto = async (source: string, fileSizeBytes: number): Promise<PhotoStudioAnalysis> => {
  const image = await loadImageFromSource(source)
  const sampleCanvas = document.createElement('canvas')
  const sampleWidth = 120
  const sampleHeight = Math.max(1, Math.round((image.naturalHeight / image.naturalWidth) * sampleWidth))
  sampleCanvas.width = sampleWidth
  sampleCanvas.height = sampleHeight
  const context = sampleCanvas.getContext('2d')

  let averageBrightness = 50
  if (context) {
    context.drawImage(image, 0, 0, sampleWidth, sampleHeight)
    const data = context.getImageData(0, 0, sampleWidth, sampleHeight).data
    let totalLuminance = 0
    const pixels = data.length / 4

    for (let index = 0; index < data.length; index += 4) {
      const red = data[index]
      const green = data[index + 1]
      const blue = data[index + 2]
      totalLuminance += 0.2126 * red + 0.7152 * green + 0.0722 * blue
    }

    averageBrightness = Math.round((totalLuminance / pixels / 255) * 100)
  }

  return {
    width: image.naturalWidth,
    height: image.naturalHeight,
    aspectRatio: `${image.naturalWidth}:${image.naturalHeight}`,
    sizeKb: Math.round(fileSizeBytes / 1024),
    averageBrightness,
  }
}

const renderEditedPhoto = async (source: string, controls: PhotoStudioControls): Promise<string> => {
  const image = await loadImageFromSource(source)

  if (controls.cropAspect === 'free') {
    const cropXPercent = Math.max(0, Math.min(95, controls.freeCropX))
    const cropYPercent = Math.max(0, Math.min(95, controls.freeCropY))
    const cropWidthPercent = Math.max(5, Math.min(100 - cropXPercent, controls.freeCropWidth))
    const cropHeightPercent = Math.max(5, Math.min(100 - cropYPercent, controls.freeCropHeight))

    const sourceX = Math.round((cropXPercent / 100) * image.naturalWidth)
    const sourceY = Math.round((cropYPercent / 100) * image.naturalHeight)
    const sourceWidth = Math.max(1, Math.round((cropWidthPercent / 100) * image.naturalWidth))
    const sourceHeight = Math.max(1, Math.round((cropHeightPercent / 100) * image.naturalHeight))

    const outputMaxSide = 1200
    const ratio = sourceWidth / sourceHeight
    const outputWidth = ratio >= 1 ? outputMaxSide : Math.round(outputMaxSide * ratio)
    const outputHeight = ratio >= 1 ? Math.round(outputMaxSide / ratio) : outputMaxSide

    const freeCanvas = document.createElement('canvas')
    freeCanvas.width = outputWidth
    freeCanvas.height = outputHeight
    const freeContext = freeCanvas.getContext('2d')
    if (!freeContext) {
      return source
    }

    freeContext.save()
    freeContext.fillStyle = '#0d0b12'
    freeContext.fillRect(0, 0, outputWidth, outputHeight)
    freeContext.filter = `brightness(${controls.brightness}%) contrast(${controls.contrast}%) saturate(${controls.saturate}%)`
    freeContext.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      outputWidth,
      outputHeight,
    )
    freeContext.restore()

    return freeCanvas.toDataURL('image/jpeg', 0.92)
  }

  const canvas = document.createElement('canvas')
  const outputHeight = controls.cropAspect === 'square' ? 1080 : 1200
  const ratio = controls.cropAspect === 'square' ? 1 : controls.cropAspect === 'classic' ? 3 / 4 : 4 / 5
  const outputWidth = Math.round(outputHeight * ratio)
  canvas.width = outputWidth
  canvas.height = outputHeight

  const context = canvas.getContext('2d')
  if (!context) {
    return source
  }

  const baseScale = Math.max(outputWidth / image.naturalWidth, outputHeight / image.naturalHeight)
  const drawWidth = image.naturalWidth * baseScale * controls.zoom
  const drawHeight = image.naturalHeight * baseScale * controls.zoom
  const drawX = (outputWidth - drawWidth) / 2 + controls.offsetX
  const drawY = (outputHeight - drawHeight) / 2 + controls.offsetY

  context.save()
  context.fillStyle = '#0d0b12'
  context.fillRect(0, 0, outputWidth, outputHeight)
  context.translate(outputWidth / 2, outputHeight / 2)
  context.rotate((controls.rotate * Math.PI) / 180)
  context.translate(-outputWidth / 2, -outputHeight / 2)
  context.filter = `brightness(${controls.brightness}%) contrast(${controls.contrast}%) saturate(${controls.saturate}%)`
  context.drawImage(image, drawX, drawY, drawWidth, drawHeight)
  context.restore()

  return canvas.toDataURL('image/jpeg', 0.92)
}

const seedChat = (selfName: string): ChatMessage[] => [
  {
    id: Date.now(),
    sender: 'them',
    text: `Hey! Nice to match with you. Up for a chat, ${selfName}?`,
    createdAt: Date.now(),
  },
]

function App() {
  const initialRoute = readRouteFromWindow()
  const initialAuth = readAuth()
  const initialSelfProfile = readSelfProfile()

  const [screen, setScreen] = useState<AppScreen>(initialRoute.screen)
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(initialRoute.profileId)
  const [previousScreen, setPreviousScreen] = useState<AppScreen>('discover')

  const [isAuthenticated, setIsAuthenticated] = useState(initialAuth.isAuthenticated)
  const [userEmail, setUserEmail] = useState(initialAuth.email)
  const [loginEmail, setLoginEmail] = useState(initialAuth.email)
  const [loginPassword, setLoginPassword] = useState('')
  const [registerPasswordConfirm, setRegisterPasswordConfirm] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loginNotice, setLoginNotice] = useState<string | null>(null)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [inviteCode, setInviteCode] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)
  const [selfProfile, setSelfProfile] = useState<SelfProfile>(initialSelfProfile)
  const [profileDraft, setProfileDraft] = useState(() => ({
    name: initialSelfProfile.name,
    age: String(initialSelfProfile.age),
    city: initialSelfProfile.city,
    vibe: initialSelfProfile.vibe,
    bio: initialSelfProfile.bio,
    interests: initialSelfProfile.interests.join(', '),
    pronouns: initialSelfProfile.pronouns,
    gender: initialSelfProfile.gender,
    orientation: initialSelfProfile.orientation,
    lookingFor: initialSelfProfile.lookingFor,
    relationshipIntent: initialSelfProfile.relationshipIntent,
    heightCm: String(initialSelfProfile.heightCm),
    jobTitle: initialSelfProfile.jobTitle,
    company: initialSelfProfile.company,
    education: initialSelfProfile.education,
    hometown: initialSelfProfile.hometown,
    languages: initialSelfProfile.languages.join(', '),
    drinking: initialSelfProfile.drinking,
    smoking: initialSelfProfile.smoking,
    workout: initialSelfProfile.workout,
    religion: initialSelfProfile.religion,
    politics: initialSelfProfile.politics,
    zodiac: initialSelfProfile.zodiac,
    childrenPlan: initialSelfProfile.childrenPlan,
    pets: initialSelfProfile.pets,
    promptOne: initialSelfProfile.promptOne,
    promptTwo: initialSelfProfile.promptTwo,
    promptThree: initialSelfProfile.promptThree,
    dealbreakers: initialSelfProfile.dealbreakers.join(', '),
    instagram: initialSelfProfile.instagram,
    anthem: initialSelfProfile.anthem,
    travelMode: initialSelfProfile.travelMode,
    photos: initialSelfProfile.photos,
  }))
  const [profileSaveStatus, setProfileSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [photoUrlInput, setPhotoUrlInput] = useState('')
  const [photoStudioSource, setPhotoStudioSource] = useState<string | null>(null)
  const [photoStudioAnalysis, setPhotoStudioAnalysis] = useState<PhotoStudioAnalysis | null>(null)
  const [photoStudioControls, setPhotoStudioControls] = useState<PhotoStudioControls>({
    cropAspect: 'free',
    zoom: 1,
    rotate: 0,
    brightness: 100,
    contrast: 100,
    saturate: 100,
    offsetX: 0,
    offsetY: 0,
    freeCropX: 10,
    freeCropY: 10,
    freeCropWidth: 80,
    freeCropHeight: 80,
  })
  const [photoStudioBusy, setPhotoStudioBusy] = useState(false)

  const [allProfiles, setAllProfiles] = useState<Profile[]>([])
  const [loadingProfiles, setLoadingProfiles] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [index, setIndex] = useState(0)
  const [filters, setFilters] = useState<Filters>(initialFilters)
  const [dragX, setDragX] = useState(0)
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isResolvingSwipe, setIsResolvingSwipe] = useState(false)
  const [exitDirection, setExitDirection] = useState<SwipeDirection | null>(null)
  const [lastIntent, setLastIntent] = useState<SwipeIntent | null>(null)
  const [includeReviewed, setIncludeReviewed] = useState(false)
  const [history, setHistory] = useState<SwipeHistory>(() => readHistory())
  const [activeMatch, setActiveMatch] = useState<Profile | null>(null)
  const [swipeLog, setSwipeLog] = useState<SwipeLog[]>([])

  const [chatThreads, setChatThreads] = useState<Record<number, ChatMessage[]>>(() => readChatThreads())
  const [activeChatId, setActiveChatId] = useState<number | null>(null)
  const [chatDraft, setChatDraft] = useState('')
  const [chatSearch, setChatSearch] = useState('')
  const [unreadChats, setUnreadChats] = useState<Record<number, number>>({})
  const [matchQueueIds, setMatchQueueIds] = useState<number[]>([])
  const [chatAttachmentDraft, setChatAttachmentDraft] = useState<ChatMessage['attachment'] | null>(null)
  const [isRecordingVoice, setIsRecordingVoice] = useState(false)
  const [callState, setCallState] = useState<CallState>({
    active: false,
    type: null,
    status: 'ringing',
    startedAt: 0,
    targetProfileId: null,
    muted: false,
    cameraOff: false,
  })
  const [blockedProfileIds, setBlockedProfileIds] = useState<number[]>([])
  const [safetyReports, setSafetyReports] = useState<SafetyReport[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [boostsLeft, setBoostsLeft] = useState(3)
  const [incognitoMode, setIncognitoMode] = useState(false)
  const [rewindsLeft, setRewindsLeft] = useState(5)

  const [settings, setSettings] = useState<SettingsPayload>({
    pushNotifications: true,
    emailNotifications: false,
    privateMode: false,
  })
  const [settingsSaveStatus, setSettingsSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [preferenceSaveStatus, setPreferenceSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [toasts, setToasts] = useState<Toast[]>([])
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null)
  const [lightboxZoom, setLightboxZoom] = useState(1)

  const backendMode = getBackendMode()
  const [activePlan, setActivePlan] = useState<PlanTier>(() => getActivePlan())
  const [likeUsage, setLikeUsage] = useState(() => getLikeUsage(activePlan))
  const [superLikeUsage, setSuperLikeUsage] = useState(() => getSuperLikeUsage(activePlan))

  const dragStart = useRef<{ x: number; y: number } | null>(null)
  const attachmentInputRef = useRef<HTMLInputElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const studioFrameRef = useRef<HTMLDivElement | null>(null)
  const cropDragStartRef = useRef<{ x: number; y: number } | null>(null)
  const cropResizeStartRef = useRef<{
    pointer: { x: number; y: number }
    rect: { x: number; y: number; width: number; height: number }
  } | null>(null)
  const cropMoveStartRef = useRef<{
    pointer: { x: number; y: number }
    rect: { x: number; y: number; width: number; height: number }
  } | null>(null)
  const [isDraggingCrop, setIsDraggingCrop] = useState(false)
  const [activeCropHandle, setActiveCropHandle] = useState<CropHandle | null>(null)
  const [isMovingCrop, setIsMovingCrop] = useState(false)
  const [isRedrawCropMode, setIsRedrawCropMode] = useState(false)

  const refreshEngagementUsage = useCallback((plan: PlanTier) => {
    setLikeUsage(getLikeUsage(plan))
    setSuperLikeUsage(getSuperLikeUsage(plan))
  }, [])

  useEffect(() => {
    refreshEngagementUsage(activePlan)
  }, [activePlan, refreshEngagementUsage])

  const pushToast = useCallback((message: string, tone: Toast['tone'] = 'info') => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    setToasts((current) => [...current, { id, message, tone }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, 2600)
  }, [])

  const pushNotification = useCallback((item: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>) => {
    const next: NotificationItem = {
      ...item,
      id: Date.now() + Math.floor(Math.random() * 1000),
      createdAt: Date.now(),
      read: false,
    }
    setNotifications((current) => [next, ...current].slice(0, 30))
  }, [])

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((current) => current.map((item) => ({ ...item, read: true })))
  }, [])

  const getCompatibilityScore = useCallback(
    (profile: Profile): number => {
      let score = 45
      const myInterests = selfProfile.interests.map((interest) => interest.toLowerCase())
      const sharedInterests = profile.interests.filter((interest) =>
        myInterests.some((mine) => mine.includes(interest.toLowerCase()) || interest.toLowerCase().includes(mine)),
      ).length
      score += Math.min(sharedInterests * 12, 30)

      const ageGap = Math.abs(selfProfile.age - profile.age)
      score += Math.max(0, 14 - ageGap)

      if (selfProfile.city.toLowerCase() === profile.city.toLowerCase()) {
        score += 10
      } else if (profile.distanceKm <= 12) {
        score += 6
      }

      const myZodiacCompat = ZODIAC_COMPATIBILITY[selfProfile.zodiac] ?? []
      if (myZodiacCompat.includes(profile.zodiac)) {
        score += 8
      }

      if (profile.verified) {
        score += 4
      }

      if (selfProfile.lookingFor.toLowerCase().includes('long') && profile.relationshipGoal === 'Long-term') {
        score += 8
      }

      return Math.max(1, Math.min(99, Math.round(score)))
    },
    [selfProfile],
  )

  const profileCompletion = useMemo(() => {
    const checks = [
      selfProfile.name.trim().length > 1,
      selfProfile.bio.trim().length > 40,
      selfProfile.city.trim().length > 1,
      selfProfile.interests.length >= 3,
      selfProfile.promptOne.trim().length > 10,
      selfProfile.promptTwo.trim().length > 10,
      selfProfile.promptThree.trim().length > 10,
      selfProfile.photos.length >= 3,
      selfProfile.jobTitle.trim().length > 1,
      selfProfile.languages.length >= 1,
    ]
    const completed = checks.filter(Boolean).length
    return Math.round((completed / checks.length) * 100)
  }, [selfProfile])

  const isProfileVerified = useMemo(() => selfProfile.photos.length >= 3 && profileCompletion >= 80, [selfProfile.photos.length, profileCompletion])

  const openLightbox = (photoUrl: string) => {
    setLightboxPhoto(photoUrl)
    setLightboxZoom(1)
  }

  const closeLightbox = useCallback(() => {
    setLightboxPhoto(null)
    setLightboxZoom(1)
  }, [])

  const zoomLightbox = (delta: number) => {
    setLightboxZoom((current) => Math.min(3, Math.max(1, Number((current + delta).toFixed(2)))))
  }

  const clampPercent = (value: number): number => Math.max(0, Math.min(100, value))
  const clampRange = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value))

  const getStudioPointerPercent = (
    event: React.PointerEvent<HTMLDivElement>,
  ): { x: number; y: number } | null => {
    const frame = studioFrameRef.current
    if (!frame) {
      return null
    }

    const rect = frame.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) {
      return null
    }

    const x = clampPercent(((event.clientX - rect.left) / rect.width) * 100)
    const y = clampPercent(((event.clientY - rect.top) / rect.height) * 100)
    return { x, y }
  }

  const handleStudioPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (photoStudioControls.cropAspect !== 'free') {
      return
    }

    event.preventDefault()

    const point = getStudioPointerPercent(event)
    if (!point) {
      return
    }

    const handleAttr = (event.target as HTMLElement)
      .closest('[data-crop-handle]')
      ?.getAttribute('data-crop-handle') as CropHandle | undefined
    const isCropBox = Boolean((event.target as HTMLElement).closest('[data-crop-box="true"]'))

    const currentRect = {
      x: photoStudioControls.freeCropX,
      y: photoStudioControls.freeCropY,
      width: photoStudioControls.freeCropWidth,
      height: photoStudioControls.freeCropHeight,
    }
    const insideCurrentCrop =
      point.x >= currentRect.x &&
      point.x <= currentRect.x + currentRect.width &&
      point.y >= currentRect.y &&
      point.y <= currentRect.y + currentRect.height

    if (handleAttr) {
      cropResizeStartRef.current = {
        pointer: point,
        rect: {
          x: photoStudioControls.freeCropX,
          y: photoStudioControls.freeCropY,
          width: photoStudioControls.freeCropWidth,
          height: photoStudioControls.freeCropHeight,
        },
      }
      setActiveCropHandle(handleAttr)
      setIsDraggingCrop(true)
      ;(event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId)
      return
    }

    if (isCropBox) {
      cropMoveStartRef.current = {
        pointer: point,
        rect: {
          x: photoStudioControls.freeCropX,
          y: photoStudioControls.freeCropY,
          width: photoStudioControls.freeCropWidth,
          height: photoStudioControls.freeCropHeight,
        },
      }
      cropDragStartRef.current = null
      cropResizeStartRef.current = null
      setActiveCropHandle(null)
      setIsMovingCrop(true)
      setIsDraggingCrop(true)
      ;(event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId)
      return
    }

    if (insideCurrentCrop) {
      cropMoveStartRef.current = {
        pointer: point,
        rect: currentRect,
      }
      cropDragStartRef.current = null
      cropResizeStartRef.current = null
      setActiveCropHandle(null)
      setIsMovingCrop(true)
      setIsDraggingCrop(true)
      ;(event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId)
      return
    }

    if (!isRedrawCropMode) {
      return
    }

    cropDragStartRef.current = point
    cropResizeStartRef.current = null
    cropMoveStartRef.current = null
    setActiveCropHandle(null)
    setIsMovingCrop(false)
    setPhotoStudioControls((current) => ({
      ...current,
      freeCropX: point.x,
      freeCropY: point.y,
      freeCropWidth: 5,
      freeCropHeight: 5,
    }))
    setIsDraggingCrop(true)
    ;(event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId)
  }

  const handleStudioPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingCrop || photoStudioControls.cropAspect !== 'free') {
      return
    }

    event.preventDefault()

    const start = cropDragStartRef.current
    const point = getStudioPointerPercent(event)
    if (!point) {
      return
    }

    if (isMovingCrop && cropMoveStartRef.current) {
      const initial = cropMoveStartRef.current
      const deltaX = point.x - initial.pointer.x
      const deltaY = point.y - initial.pointer.y
      const nextX = clampRange(initial.rect.x + deltaX, 0, 100 - initial.rect.width)
      const nextY = clampRange(initial.rect.y + deltaY, 0, 100 - initial.rect.height)

      setPhotoStudioControls((current) => ({
        ...current,
        freeCropX: nextX,
        freeCropY: nextY,
      }))
      return
    }

    if (activeCropHandle && cropResizeStartRef.current) {
      const initial = cropResizeStartRef.current
      const deltaX = point.x - initial.pointer.x
      const deltaY = point.y - initial.pointer.y
      const minSize = 5

      if (activeCropHandle === 'nw') {
        const nextDx = clampRange(deltaX, -initial.rect.x, initial.rect.width - minSize)
        const nextDy = clampRange(deltaY, -initial.rect.y, initial.rect.height - minSize)
        setPhotoStudioControls((current) => ({
          ...current,
          freeCropX: initial.rect.x + nextDx,
          freeCropY: initial.rect.y + nextDy,
          freeCropWidth: initial.rect.width - nextDx,
          freeCropHeight: initial.rect.height - nextDy,
        }))
        return
      }

      if (activeCropHandle === 'ne') {
        const nextDx = clampRange(
          deltaX,
          -(initial.rect.width - minSize),
          100 - (initial.rect.x + initial.rect.width),
        )
        const nextDy = clampRange(deltaY, -initial.rect.y, initial.rect.height - minSize)
        setPhotoStudioControls((current) => ({
          ...current,
          freeCropY: initial.rect.y + nextDy,
          freeCropWidth: initial.rect.width + nextDx,
          freeCropHeight: initial.rect.height - nextDy,
        }))
        return
      }

      if (activeCropHandle === 'sw') {
        const nextDx = clampRange(deltaX, -initial.rect.x, initial.rect.width - minSize)
        const nextDy = clampRange(
          deltaY,
          -(initial.rect.height - minSize),
          100 - (initial.rect.y + initial.rect.height),
        )
        setPhotoStudioControls((current) => ({
          ...current,
          freeCropX: initial.rect.x + nextDx,
          freeCropWidth: initial.rect.width - nextDx,
          freeCropHeight: initial.rect.height + nextDy,
        }))
        return
      }

      const nextDx = clampRange(
        deltaX,
        -(initial.rect.width - minSize),
        100 - (initial.rect.x + initial.rect.width),
      )
      const nextDy = clampRange(
        deltaY,
        -(initial.rect.height - minSize),
        100 - (initial.rect.y + initial.rect.height),
      )
      setPhotoStudioControls((current) => ({
        ...current,
        freeCropWidth: initial.rect.width + nextDx,
        freeCropHeight: initial.rect.height + nextDy,
      }))
      return
    }

    if (!start) {
      return
    }

    const left = Math.min(start.x, point.x)
    const top = Math.min(start.y, point.y)
    const width = Math.max(5, Math.abs(point.x - start.x))
    const height = Math.max(5, Math.abs(point.y - start.y))

    setPhotoStudioControls((current) => ({
      ...current,
      freeCropX: left,
      freeCropY: top,
      freeCropWidth: Math.min(width, 100 - left),
      freeCropHeight: Math.min(height, 100 - top),
    }))
  }

  const handleStudioPointerUp = () => {
    cropDragStartRef.current = null
    cropResizeStartRef.current = null
    cropMoveStartRef.current = null
    setActiveCropHandle(null)
    setIsMovingCrop(false)
    setIsDraggingCrop(false)
    setIsRedrawCropMode(false)
  }

  const navigate = useCallback(
    (nextScreen: AppScreen, options?: { profileId?: number | null; replace?: boolean }) => {
      const profileId = options?.profileId ?? null
      setScreen(nextScreen)
      if (nextScreen === 'profile-detail') {
        setSelectedProfileId(profileId)
      } else {
        setSelectedProfileId(null)
      }

      const nextPath = buildPath(nextScreen, nextScreen === 'profile-detail' ? profileId : null)
      const navMethod = options?.replace ? window.history.replaceState : window.history.pushState
      const isFileProtocol = window.location.protocol === 'file:'

      if (isFileProtocol) {
        const nextHash = `#${nextPath}`
        if (window.location.hash !== nextHash) {
          navMethod.call(window.history, null, '', nextHash)
        }
        return
      }

      if (window.location.pathname !== nextPath) {
        navMethod.call(window.history, null, '', nextPath)
      }
    },
    [],
  )

  useEffect(() => {
    const onPopState = () => {
      const route = readRouteFromWindow()
      setScreen(route.screen)
      setSelectedProfileId(route.profileId)
    }

    const onHashChange = () => {
      const route = readRouteFromWindow()
      setScreen(route.screen)
      setSelectedProfileId(route.profileId)
    }

    window.addEventListener('popstate', onPopState)
    window.addEventListener('hashchange', onHashChange)
    return () => {
      window.removeEventListener('popstate', onPopState)
      window.removeEventListener('hashchange', onHashChange)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated && screen !== 'login') {
      navigate('login', { replace: true })
    }

    if (isAuthenticated && screen === 'login') {
      navigate('discover', { replace: true })
    }
  }, [isAuthenticated, screen, navigate])

  useEffect(() => {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history))
  }, [history])

  useEffect(() => {
    window.localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ isAuthenticated, email: userEmail }),
    )
  }, [isAuthenticated, userEmail])

  useEffect(() => {
    window.localStorage.setItem(CHAT_THREADS_STORAGE_KEY, JSON.stringify(chatThreads))
  }, [chatThreads])

  const loadProfiles = useCallback(async () => {
    try {
      setLoadingProfiles(true)
      const incoming = await getProfiles()
      setAllProfiles(incoming.map(normalizeProfilePhotos))
      setLoadError(null)
    } catch {
      setLoadError('Could not load profiles. Please retry.')
    } finally {
      setLoadingProfiles(false)
    }
  }, [])

  useEffect(() => {
    void loadProfiles()
  }, [loadProfiles])

  const profileById = useMemo(() => {
    const map = new Map<number, Profile>()
    for (const profile of allProfiles) {
      map.set(profile.id, profile)
    }
    return map
  }, [allProfiles])

  const cityOptions = useMemo(
    () => Array.from(new Set(allProfiles.map((profile) => profile.city))).sort(),
    [allProfiles],
  )

  const genderOptions = useMemo(
    () => Array.from(new Set(allProfiles.map((profile) => profile.gender))),
    [allProfiles],
  )

  const relationshipGoalOptions = useMemo(
    () => Array.from(new Set(allProfiles.map((profile) => profile.relationshipGoal))),
    [allProfiles],
  )

  const swipedIds = useMemo(() => {
    return new Set([...history.likedIds, ...history.passedIds])
  }, [history.likedIds, history.passedIds])

  const genderFilteredProfiles = useMemo(() => {
    if (filters.gender === 'any') {
      return allProfiles
    }

    return allProfiles.filter((profile) => toGenderKey(profile.gender) === filters.gender)
  }, [allProfiles, filters.gender])

  const filteredProfiles = useMemo(() => {
    const interestFilter = filters.interest.trim().toLowerCase()
    const selectedGoal = filters.relationshipGoal.toLowerCase()

    const filtered = genderFilteredProfiles.filter((profile) => {
      if (blockedProfileIds.includes(profile.id)) {
        return false
      }
      const byAge = profile.age >= filters.minAge && profile.age <= filters.maxAge
      const byCity = filters.city.length === 0 || profile.city === filters.city
      const byInterest =
        interestFilter.length === 0 || 
        profile.interests.some((interest) => interest.toLowerCase().includes(interestFilter))
      const byGoal =
        selectedGoal === 'any' || profile.relationshipGoal.toLowerCase() === selectedGoal
      const byDistance = profile.distanceKm <= filters.maxDistanceKm
      const byVerified = !filters.verifiedOnly || profile.verified
      const byReviewed = includeReviewed || !swipedIds.has(profile.id)
      let byZodiac = true
      if (filters.zodiacCompatibility && filters.zodiacCompatibility !== 'any') {
        // Show only profiles compatible with the selected sign
        const compat = ZODIAC_COMPATIBILITY[filters.zodiacCompatibility] || []
        byZodiac = compat.includes(profile.zodiac)
      }
      return byAge && byCity && byInterest && byGoal && byDistance && byVerified && byReviewed && byZodiac
    })

    let sorted = filtered

    if (filters.sortBy === 'recommended') {
      sorted = filtered.slice().sort((a, b) => getCompatibilityScore(b) - getCompatibilityScore(a))
    }

    if (filters.sortBy === 'nearest') {
      sorted = filtered.slice().sort((a, b) => a.distanceKm - b.distanceKm)
    }

    if (filters.sortBy === 'youngest') {
      sorted = filtered.slice().sort((a, b) => a.age - b.age)
    }

    if (filters.sortBy === 'oldest') {
      sorted = filtered.slice().sort((a, b) => b.age - a.age)
    }

    return sorted
  }, [genderFilteredProfiles, filters, includeReviewed, swipedIds, blockedProfileIds, getCompatibilityScore])

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }

    let cancelled = false
    const persist = async () => {
      try {
        setPreferenceSaveStatus('saving')
        await backendSavePreferences({ ...filters, includeReviewed })
        if (!cancelled) {
          setPreferenceSaveStatus('saved')
        }
      } catch {
        if (!cancelled) {
          setPreferenceSaveStatus('error')
        }
      }
    }

    const timer = window.setTimeout(() => {
      void persist()
    }, 280)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [filters, includeReviewed, isAuthenticated])

  useEffect(() => {
    setIndex(0)
    setDragX(0)
    setDragY(0)
    setIsDragging(false)
    setExitDirection(null)
    setIsResolvingSwipe(false)
    dragStart.current = null
  }, [filters, includeReviewed])

  const matchedProfiles = useMemo(() => {
    return history.matchIds
      .map((id) => profileById.get(id))
      .filter((profile): profile is Profile => profile !== undefined && !blockedProfileIds.includes(profile.id))
      .reverse()
  }, [history.matchIds, profileById, blockedProfileIds])

  useEffect(() => {
    if (matchedProfiles.length === 0) {
      setActiveChatId(null)
      return
    }

    const stillExists = matchedProfiles.some((profile) => profile.id === activeChatId)
    if (!stillExists) {
      setActiveChatId(matchedProfiles[0].id)
    }
  }, [matchedProfiles, activeChatId])

  useEffect(() => {
    if (screen === 'chats' && activeChatId) {
      setUnreadChats((current) => {
        if (!current[activeChatId]) {
          return current
        }

        return {
          ...current,
          [activeChatId]: 0,
        }
      })
      setMatchQueueIds((current) => current.filter((id) => id !== activeChatId))
    }
  }, [screen, activeChatId])

  useEffect(() => {
    if (screen === 'settings' && notifications.some((item) => !item.read)) {
      markAllNotificationsRead()
    }
  }, [screen, notifications, markAllNotificationsRead])

  const selectedChatProfile = useMemo(() => {
    if (!activeChatId) {
      return null
    }
    return profileById.get(activeChatId) ?? null
  }, [activeChatId, profileById])

  const selectedDetailProfile = useMemo(() => {
    if (!selectedProfileId) {
      return null
    }
    return profileById.get(selectedProfileId) ?? null
  }, [selectedProfileId, profileById])

  const topProfile = filteredProfiles[index]
  const upcoming = useMemo(() => filteredProfiles.slice(index + 1, index + 3), [filteredProfiles, index])

  const resetDrag = useCallback(() => {
    setIsDragging(false)
    setDragX(0)
    setDragY(0)
    dragStart.current = null
  }, [])

  const openProfileDetail = (profileId: number, fromScreen: AppScreen) => {
    setPreviousScreen(fromScreen)
    navigate('profile-detail', { profileId })
  }

  const closeProfileDetail = () => {
    navigate(previousScreen)
  }

  const addSwipeHistory = useCallback((profileId: number, direction: SwipeDirection, wasMatch: boolean) => {
    setHistory((current) => {
      if (direction === 'right') {
        const likedIds = current.likedIds.includes(profileId)
          ? current.likedIds
          : [...current.likedIds, profileId]
        const matchIds = wasMatch && !current.matchIds.includes(profileId)
          ? [...current.matchIds, profileId]
          : current.matchIds

        return {
          ...current,
          likedIds,
          matchIds,
        }
      }

      const passedIds = current.passedIds.includes(profileId)
        ? current.passedIds
        : [...current.passedIds, profileId]

      return {
        ...current,
        passedIds,
      }
    })
  }, [])

  const removeSwipeHistory = useCallback((entry: SwipeLog) => {
    setHistory((current) => {
      if (entry.direction === 'right') {
        return {
          likedIds: current.likedIds.filter((id) => id !== entry.profileId),
          passedIds: current.passedIds,
          matchIds: entry.wasMatch
            ? current.matchIds.filter((id) => id !== entry.profileId)
            : current.matchIds,
        }
      }

      return {
        likedIds: current.likedIds,
        passedIds: current.passedIds.filter((id) => id !== entry.profileId),
        matchIds: current.matchIds,
      }
    })

    if (entry.wasMatch) {
      setChatThreads((current) => {
        const clone = { ...current }
        delete clone[entry.profileId]
        return clone
      })
      setUnreadChats((current) => {
        const clone = { ...current }
        delete clone[entry.profileId]
        return clone
      })
      setMatchQueueIds((current) => current.filter((id) => id !== entry.profileId))
    }
  }, [])

  const finalizeSwipe = useCallback(
    (profile: Profile, direction: SwipeDirection, intent: SwipeIntent, wasMatch: boolean) => {
      addSwipeHistory(profile.id, direction, wasMatch)
      setSwipeLog((current) => [...current, { profileId: profile.id, direction, intent, wasMatch }])

      if (wasMatch) {
        setActiveMatch(profile)
        setChatThreads((current) => {
          if (current[profile.id]) {
            return current
          }
          return {
            ...current,
            [profile.id]: seedChat(selfProfile.name),
          }
        })

        setUnreadChats((current) => ({
          ...current,
          [profile.id]: (current[profile.id] ?? 0) + 1,
        }))
        setMatchQueueIds((current) => (current.includes(profile.id) ? current : [profile.id, ...current]))
        pushNotification({
          title: `New match: ${profile.name}`,
          body: `You matched with ${profile.name}. Say hi now.`,
          category: 'match',
        })
        pushToast(`It's a match with ${profile.name}!`, 'success')
      }
    },
    [addSwipeHistory, pushNotification, pushToast, selfProfile.name],
  )

  const swipeCard = useCallback(
    (direction: SwipeDirection, intent: SwipeIntent = direction === 'right' ? 'like' : 'pass') => {
      if (!topProfile || exitDirection || isResolvingSwipe) {
        return
      }

      if (direction === 'right' && !canLikeNow(activePlan)) {
        pushToast('Daily like limit reached. Upgrade plan or try again later.', 'error')
        return
      }

      if (intent === 'super-like' && !canSuperLikeNow(activePlan)) {
        pushToast('No Super Likes left this week on your current plan.', 'error')
        return
      }

      setLastIntent(intent)
      setExitDirection(direction)
      setIsResolvingSwipe(true)

      const swipedProfile = topProfile
      const matchPromise = direction === 'right' ? resolveMatch(swipedProfile.id) : Promise.resolve(false)

      window.setTimeout(async () => {
        setIndex((current) => current + 1)
        setExitDirection(null)
        resetDrag()

        try {
          const wasMatch = await matchPromise
          finalizeSwipe(swipedProfile, direction, intent, wasMatch)
          if (direction === 'right' && (intent === 'like' || intent === 'super-like')) {
            recordLikeEvent()
            if (intent === 'super-like') {
              recordSuperLikeEvent()
              pushToast('Super Like sent.', 'success')
            }
            refreshEngagementUsage(activePlan)
          }
        } finally {
          setIsResolvingSwipe(false)
        }
      }, 260)
    },
    [
      topProfile,
      exitDirection,
      isResolvingSwipe,
      activePlan,
      resetDrag,
      finalizeSwipe,
      pushToast,
      refreshEngagementUsage,
    ],
  )

  const undoSwipe = useCallback(() => {
    if (isDragging || exitDirection || isResolvingSwipe || swipeLog.length === 0) {
      return
    }
    if (rewindsLeft <= 0) {
      pushToast('No rewinds left. Upgrade or wait for reset.', 'error')
      return
    }

    const lastSwipe = swipeLog[swipeLog.length - 1]
    setSwipeLog((current) => current.slice(0, -1))
    removeSwipeHistory(lastSwipe)
    setIndex((current) => Math.max(current - 1, 0))
    setRewindsLeft((current) => Math.max(0, current - 1))
    setLastIntent(null)
    setActiveMatch(null)
    if (lastSwipe.direction === 'right' && (lastSwipe.intent === 'like' || lastSwipe.intent === 'super-like')) {
      rollbackLastLikeEvent()
      if (lastSwipe.intent === 'super-like') {
        rollbackLastSuperLikeEvent()
      }
      refreshEngagementUsage(activePlan)
    }
  }, [
    isDragging,
    exitDirection,
    isResolvingSwipe,
    swipeLog,
    activePlan,
    removeSwipeHistory,
    refreshEngagementUsage,
    rewindsLeft,
    pushToast,
  ])

  const sendChatMessage = () => {
    const text = chatDraft.trim()
    if (!selectedChatProfile || (text.length === 0 && !chatAttachmentDraft)) {
      return
    }

    const baseId = Date.now()
    const attachmentLabel =
      chatAttachmentDraft?.kind === 'image'
        ? 'Photo'
        : chatAttachmentDraft?.kind === 'video'
          ? 'Video'
          : chatAttachmentDraft?.kind === 'audio'
            ? 'Voice message'
            : ''
    const composedText = text.length > 0 ? text : attachmentLabel

    setChatThreads((current) => {
      const currentThread = current[selectedChatProfile.id] ?? []
      return {
        ...current,
        [selectedChatProfile.id]: [
          ...currentThread,
          {
            id: baseId,
            sender: 'me',
            text: composedText,
            createdAt: Date.now(),
            attachment: chatAttachmentDraft ?? undefined,
            status: 'sending',
          },
        ],
      }
    })
    setChatDraft('')
    setChatAttachmentDraft(null)

    const backendPrompt =
      chatAttachmentDraft && text.length === 0 ? `Shared a ${chatAttachmentDraft.kind}.` : composedText

    void backendSendChatReply(selectedChatProfile.name, backendPrompt)
      .then((reply) => {
        setChatThreads((current) => {
          const currentThread = current[selectedChatProfile.id] ?? []
          const withDelivered = currentThread.map((message) =>
            message.id === baseId ? { ...message, status: 'sent' as const } : message,
          )
          return {
            ...current,
            [selectedChatProfile.id]: [
              ...withDelivered,
              {
                id: baseId + 1,
                sender: 'them',
                text: reply.text,
                createdAt: reply.createdAt,
                status: 'read',
              },
            ],
          }
        })

        const chatIsOpen = screen === 'chats' && activeChatId === selectedChatProfile.id
        if (!chatIsOpen) {
          setUnreadChats((current) => ({
            ...current,
            [selectedChatProfile.id]: (current[selectedChatProfile.id] ?? 0) + 1,
          }))
        }
        pushNotification({
          title: `${selectedChatProfile.name} sent a message`,
          body: reply.text,
          category: 'message',
        })
      })
      .catch(() => {
        pushToast('Message failed to sync. Retrying locally.', 'error')
        setChatThreads((current) => {
          const currentThread = current[selectedChatProfile.id] ?? []
          const withDelivered = currentThread.map((message) =>
            message.id === baseId ? { ...message, status: 'sent' as const } : message,
          )
          return {
            ...current,
            [selectedChatProfile.id]: [
              ...withDelivered,
              {
                id: baseId + 1,
                sender: 'them',
                text: 'Connection hiccup. Message me again in a sec?',
                createdAt: Date.now(),
                status: 'read',
              },
            ],
          }
        })
      })
  }

  const handleAttachmentPick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }
    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')
    if (!isImage && !isVideo) {
      pushToast('Only images and videos are supported here.', 'error')
      return
    }

    const url = URL.createObjectURL(file)
    setChatAttachmentDraft({
      kind: isImage ? 'image' : 'video',
      url,
      name: file.name,
    })
    event.target.value = ''
  }

  const startVoiceRecording = async () => {
    if (isRecordingVoice) {
      mediaRecorderRef.current?.stop()
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      recordedChunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data)
        }
      }
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        setChatAttachmentDraft({
          kind: 'audio',
          url,
          name: `voice-note-${new Date().toISOString()}.webm`,
        })
        setIsRecordingVoice(false)
        stream.getTracks().forEach((track) => track.stop())
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setIsRecordingVoice(true)
    } catch {
      pushToast('Microphone permission is needed for voice notes.', 'error')
    }
  }

  const startCall = (type: 'audio' | 'video') => {
    if (!selectedChatProfile) {
      return
    }
    setCallState({
      active: true,
      type,
      status: 'ringing',
      startedAt: Date.now(),
      targetProfileId: selectedChatProfile.id,
      muted: false,
      cameraOff: type === 'audio',
    })
    window.setTimeout(() => {
      setCallState((current) => {
        if (!current.active || current.targetProfileId !== selectedChatProfile.id) {
          return current
        }
        return {
          ...current,
          status: 'connected',
          startedAt: Date.now(),
        }
      })
    }, 1600)
  }

  const endCall = () => {
    setCallState({
      active: false,
      type: null,
      status: 'ringing',
      startedAt: 0,
      targetProfileId: null,
      muted: false,
      cameraOff: false,
    })
  }

  const reportProfile = (profile: Profile) => {
    const reason = window.prompt('Report reason (spam, scam, abuse, fake profile):', 'spam')?.trim() || 'unspecified'
    setSafetyReports((current) => [...current, { profileId: profile.id, reason, createdAt: Date.now() }])
    pushNotification({
      title: `Report submitted for ${profile.name}`,
      body: `Reason: ${reason}`,
      category: 'safety',
    })
    pushToast(`Report submitted for ${profile.name}.`, 'success')
  }

  const blockProfile = (profile: Profile) => {
    setBlockedProfileIds((current) => (current.includes(profile.id) ? current : [...current, profile.id]))
    setChatThreads((current) => {
      const clone = { ...current }
      delete clone[profile.id]
      return clone
    })
    setUnreadChats((current) => {
      const clone = { ...current }
      delete clone[profile.id]
      return clone
    })
    setHistory((current) => ({
      likedIds: current.likedIds.filter((id) => id !== profile.id),
      passedIds: current.passedIds.filter((id) => id !== profile.id),
      matchIds: current.matchIds.filter((id) => id !== profile.id),
    }))
    if (activeChatId === profile.id) {
      setActiveChatId(null)
    }
    pushToast(`${profile.name} blocked.`, 'info')
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (!topProfile || exitDirection || isResolvingSwipe) {
      return
    }

    const target = event.target as HTMLElement
    const isInteractive = Boolean(target.closest('button,input,select,textarea,a'))
    if (isInteractive) {
      return
    }

    dragStart.current = { x: event.clientX, y: event.clientY }
    setIsDragging(true)
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (!dragStart.current || !isDragging) {
      return
    }

    setDragX(event.clientX - dragStart.current.x)
    setDragY(event.clientY - dragStart.current.y)
  }

  const handlePointerUp = () => {
    if (!dragStart.current) {
      return
    }

    const threshold = 110
    if (dragX >= threshold) {
      swipeCard('right')
      return
    }

    if (dragX <= -threshold) {
      swipeCard('left')
      return
    }

    resetDrag()
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isTypingTarget =
        target?.tagName === 'INPUT' || target?.tagName === 'SELECT' || target?.tagName === 'TEXTAREA'

      if (isTypingTarget) {
        return
      }

      if (event.key === 'Escape' && activeMatch) {
        setActiveMatch(null)
        return
      }

      if (event.key === 'Escape' && lightboxPhoto) {
        closeLightbox()
        return
      }

      if (screen !== 'discover') {
        return
      }

      if (event.key === 'ArrowLeft') {
        swipeCard('left')
      }

      if (event.key === 'ArrowRight') {
        swipeCard('right')
      }

      if (event.key === 'ArrowUp') {
        swipeCard('right', 'super-like')
      }

      if (event.key.toLowerCase() === 'u') {
        undoSwipe()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [activeMatch, lightboxPhoto, closeLightbox, screen, swipeCard, undoSwipe])

  const handleLoginSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoggingIn(true)
    setLoginError(null)
    setLoginNotice(null)

    if (authMode === 'register' && loginPassword !== registerPasswordConfirm) {
      setLoginError('Passwords do not match.')
      setLoggingIn(false)
      return
    }

    const inviteValidation = runtimeConfig.auth.requireInviteCode
      ? backendValidateInviteCode(inviteCode.trim())
      : Promise.resolve()

    void inviteValidation
      .then(() =>
        authMode === 'register'
          ? backendRegister(loginEmail.trim(), loginPassword).then((result) => {
              if (result.signedIn) {
                return { email: result.email, signedIn: true, registered: true, needsEmailConfirmation: false }
              }
              return {
                email: result.email,
                signedIn: false,
                registered: true,
                needsEmailConfirmation: result.needsEmailConfirmation,
              }
            })
          : backendLogin(loginEmail.trim(), loginPassword).then((result) => ({
              email: result.email,
              signedIn: true,
              registered: false,
              needsEmailConfirmation: false,
            })),
      )
      .then((result) => {
        if (!result.signedIn && result.registered && result.needsEmailConfirmation) {
          setAuthMode('login')
          setLoginNotice('Account created. Confirm your email, then sign in.')
          pushToast('Account created. Please confirm your email.', 'info')
          return
        }

        setIsAuthenticated(true)
        setUserEmail(result.email)
        navigate('discover', { replace: true })
        pushToast(authMode === 'register' ? 'Account created successfully.' : 'Signed in successfully.', 'success')
      })
      .catch((error: unknown) => {
        const detail = error instanceof Error ? error.message : 'Login failed'
        setLoginError(detail)
        pushToast(authMode === 'register' ? 'Account creation failed.' : 'Login failed. Check invite code and credentials.', 'error')
      })
      .finally(() => {
        setLoggingIn(false)
      })
  }

  const handleGuestLogin = () => {
    setLoggingIn(true)
    setLoginError(null)
    setLoginNotice(null)

    const inviteValidation = runtimeConfig.auth.requireInviteCode
      ? backendValidateInviteCode(inviteCode.trim())
      : Promise.resolve()

    void inviteValidation
      .then(() => backendGuestLogin())
      .then((result) => {
        setIsAuthenticated(true)
        setUserEmail(result.email)
        setLoginEmail(result.email)
        navigate('discover', { replace: true })
        pushToast('Guest session started.', 'info')
      })
      .catch((error: unknown) => {
        const detail = error instanceof Error ? error.message : 'Guest login failed'
        setLoginError(detail)
        pushToast('Guest login failed.', 'error')
      })
      .finally(() => {
        setLoggingIn(false)
      })
  }

  const handleSettingsToggle = (key: keyof SettingsPayload, checked: boolean) => {
    const nextValue = {
      ...settings,
      [key]: checked,
    }

    setSettings(nextValue)
    setSettingsSaveStatus('saving')
    void backendSaveSettings(nextValue)
      .then(() => {
        setSettingsSaveStatus('saved')
        pushToast('Settings saved.', 'success')
      })
      .catch(() => {
        setSettingsSaveStatus('error')
        pushToast('Settings failed to save.', 'error')
      })
  }

  const handleSignOut = () => {
    void backendSignOut()
      .catch(() => {
        pushToast('Sign out sync failed, local session cleared anyway.', 'error')
      })
      .finally(() => {
        setIsAuthenticated(false)
        setUserEmail('')
        setLoginPassword('')
        setActiveMatch(null)
        setActiveChatId(null)
        setCallState({
          active: false,
          type: null,
          status: 'ringing',
          startedAt: 0,
          targetProfileId: null,
          muted: false,
          cameraOff: false,
        })
      })
  }

  const handleProfileDraftChange = (key: keyof typeof profileDraft, value: string) => {
    setProfileDraft((current) => ({
      ...current,
      [key]: value,
    }))
    setProfileSaveStatus('idle')
  }

  const handleProfileDraftToggle = (key: 'travelMode', checked: boolean) => {
    setProfileDraft((current) => ({
      ...current,
      [key]: checked,
    }))
    setProfileSaveStatus('idle')
  }

  const addPhotoFromUrl = () => {
    const nextUrl = photoUrlInput.trim()
    if (!nextUrl) {
      return
    }

    setProfileDraft((current) => {
      if (current.photos.includes(nextUrl)) {
        return current
      }

      return {
        ...current,
        photos: [nextUrl, ...current.photos].slice(0, 9),
      }
    })
    setPhotoUrlInput('')
    setProfileSaveStatus('idle')
  }

  const removeDraftPhoto = (photoUrl: string) => {
    setProfileDraft((current) => ({
      ...current,
      photos: current.photos.filter((photo) => photo !== photoUrl),
    }))
    setProfileSaveStatus('idle')
  }

  const setPrimaryDraftPhoto = (photoIndex: number) => {
    setProfileDraft((current) => {
      if (photoIndex <= 0 || photoIndex >= current.photos.length) {
        return current
      }

      const selectedPhoto = current.photos[photoIndex]
      const remainingPhotos = current.photos.filter((_, index) => index !== photoIndex)

      return {
        ...current,
        photos: [selectedPhoto, ...remainingPhotos],
      }
    })
    setProfileSaveStatus('idle')
  }

  const resetPhotoStudioControls = () => {
    setPhotoStudioControls({
      cropAspect: 'free',
      zoom: 1,
      rotate: 0,
      brightness: 100,
      contrast: 100,
      saturate: 100,
      offsetX: 0,
      offsetY: 0,
      freeCropX: 10,
      freeCropY: 10,
      freeCropWidth: 80,
      freeCropHeight: 80,
    })
  }

  const closePhotoStudio = () => {
    setPhotoStudioSource(null)
    setPhotoStudioAnalysis(null)
    setPhotoStudioBusy(false)
    resetPhotoStudioControls()
  }

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) {
      return
    }

    setPhotoStudioBusy(true)
    void readFileAsDataUrl(file)
      .then(async (source) => {
        const analysis = await analyzePhoto(source, file.size)
        setPhotoStudioSource(source)
        setPhotoStudioAnalysis(analysis)
        resetPhotoStudioControls()
      })
      .catch(() => {
        pushToast('Unable to open photo editor for this file.', 'error')
      })
      .finally(() => {
        event.target.value = ''
        setPhotoStudioBusy(false)
      })
  }

  const applyPhotoStudio = () => {
    if (!photoStudioSource) {
      return
    }

    setPhotoStudioBusy(true)
    void renderEditedPhoto(photoStudioSource, photoStudioControls)
      .then((editedPhoto) => {
        setProfileDraft((current) => {
          if (current.photos.includes(editedPhoto)) {
            return current
          }

          return {
            ...current,
            photos: [editedPhoto, ...current.photos].slice(0, 9),
          }
        })
        setProfileSaveStatus('idle')
        closePhotoStudio()
        pushToast('Photo edited and added to draft.', 'success')
      })
      .catch(() => {
        pushToast('Photo processing failed. Please try another image.', 'error')
      })
      .finally(() => {
        setPhotoStudioBusy(false)
      })
  }

  const saveMyProfile = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const requestedAge = Number(profileDraft.age)
    const safeAge = Number.isFinite(requestedAge) ? Math.min(99, Math.max(18, requestedAge)) : 28
    const requestedHeight = Number(profileDraft.heightCm)
    const safeHeight = Number.isFinite(requestedHeight) ? Math.min(230, Math.max(130, requestedHeight)) : 172
    const interests = profileDraft.interests
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0)
      .slice(0, 6)
    const languages = profileDraft.languages
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0)
      .slice(0, 6)
    const dealbreakers = profileDraft.dealbreakers
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0)
      .slice(0, 8)
    const photos = profileDraft.photos.filter((value) => value.trim().length > 0).slice(0, 9)

    if (
      profileDraft.name.trim().length < 2 ||
      profileDraft.bio.trim().length < 20 ||
      profileDraft.promptOne.trim().length < 8
    ) {
      setProfileSaveStatus('error')
      pushToast('Please add a valid name, fuller bio, and first prompt.', 'error')
      return
    }

    const nextProfile: SelfProfile = {
      name: profileDraft.name.trim(),
      age: safeAge,
      city: profileDraft.city.trim() || DEFAULT_SELF_PROFILE.city,
      vibe: profileDraft.vibe.trim() || DEFAULT_SELF_PROFILE.vibe,
      bio: profileDraft.bio.trim(),
      interests: interests.length > 0 ? interests : DEFAULT_SELF_PROFILE.interests,
      pronouns: profileDraft.pronouns.trim() || DEFAULT_SELF_PROFILE.pronouns,
      gender: profileDraft.gender.trim() || DEFAULT_SELF_PROFILE.gender,
      orientation: profileDraft.orientation.trim() || DEFAULT_SELF_PROFILE.orientation,
      lookingFor: profileDraft.lookingFor.trim() || DEFAULT_SELF_PROFILE.lookingFor,
      relationshipIntent: profileDraft.relationshipIntent.trim() || DEFAULT_SELF_PROFILE.relationshipIntent,
      heightCm: safeHeight,
      jobTitle: profileDraft.jobTitle.trim() || DEFAULT_SELF_PROFILE.jobTitle,
      company: profileDraft.company.trim() || DEFAULT_SELF_PROFILE.company,
      education: profileDraft.education.trim() || DEFAULT_SELF_PROFILE.education,
      hometown: profileDraft.hometown.trim() || DEFAULT_SELF_PROFILE.hometown,
      languages: languages.length > 0 ? languages : DEFAULT_SELF_PROFILE.languages,
      drinking: profileDraft.drinking.trim() || DEFAULT_SELF_PROFILE.drinking,
      smoking: profileDraft.smoking.trim() || DEFAULT_SELF_PROFILE.smoking,
      workout: profileDraft.workout.trim() || DEFAULT_SELF_PROFILE.workout,
      religion: profileDraft.religion.trim() || DEFAULT_SELF_PROFILE.religion,
      politics: profileDraft.politics.trim() || DEFAULT_SELF_PROFILE.politics,
      zodiac: profileDraft.zodiac.trim() || DEFAULT_SELF_PROFILE.zodiac,
      childrenPlan: profileDraft.childrenPlan.trim() || DEFAULT_SELF_PROFILE.childrenPlan,
      pets: profileDraft.pets.trim() || DEFAULT_SELF_PROFILE.pets,
      promptOne: profileDraft.promptOne.trim() || DEFAULT_SELF_PROFILE.promptOne,
      promptTwo: profileDraft.promptTwo.trim() || DEFAULT_SELF_PROFILE.promptTwo,
      promptThree: profileDraft.promptThree.trim() || DEFAULT_SELF_PROFILE.promptThree,
      dealbreakers: dealbreakers.length > 0 ? dealbreakers : DEFAULT_SELF_PROFILE.dealbreakers,
      instagram: profileDraft.instagram.trim() || DEFAULT_SELF_PROFILE.instagram,
      anthem: profileDraft.anthem.trim() || DEFAULT_SELF_PROFILE.anthem,
      travelMode: profileDraft.travelMode,
      photos: photos.length > 0 ? photos : DEFAULT_SELF_PROFILE.photos,
    }

    setSelfProfile(nextProfile)
    window.localStorage.setItem(SELF_PROFILE_STORAGE_KEY, JSON.stringify(nextProfile))
    setProfileDraft({
      name: nextProfile.name,
      age: String(nextProfile.age),
      city: nextProfile.city,
      vibe: nextProfile.vibe,
      bio: nextProfile.bio,
      interests: nextProfile.interests.join(', '),
      pronouns: nextProfile.pronouns,
      gender: nextProfile.gender,
      orientation: nextProfile.orientation,
      lookingFor: nextProfile.lookingFor,
      relationshipIntent: nextProfile.relationshipIntent,
      heightCm: String(nextProfile.heightCm),
      jobTitle: nextProfile.jobTitle,
      company: nextProfile.company,
      education: nextProfile.education,
      hometown: nextProfile.hometown,
      languages: nextProfile.languages.join(', '),
      drinking: nextProfile.drinking,
      smoking: nextProfile.smoking,
      workout: nextProfile.workout,
      religion: nextProfile.religion,
      politics: nextProfile.politics,
      zodiac: nextProfile.zodiac,
      childrenPlan: nextProfile.childrenPlan,
      pets: nextProfile.pets,
      promptOne: nextProfile.promptOne,
      promptTwo: nextProfile.promptTwo,
      promptThree: nextProfile.promptThree,
      dealbreakers: nextProfile.dealbreakers.join(', '),
      instagram: nextProfile.instagram,
      anthem: nextProfile.anthem,
      travelMode: nextProfile.travelMode,
      photos: nextProfile.photos,
    })
    setProfileSaveStatus('saved')
    pushToast('Profile updated.', 'success')
  }

  const getCardStyle = () => {
    if (exitDirection === 'right') {
      return {
        transform: `translate3d(520px, ${dragY}px, 0) rotate(24deg)`,
        opacity: 0,
      }
    }

    if (exitDirection === 'left') {
      return {
        transform: `translate3d(-520px, ${dragY}px, 0) rotate(-24deg)`,
        opacity: 0,
      }
    }

    return {
      transform: `translate3d(${dragX}px, ${dragY * 0.35}px, 0) rotate(${dragX / 16}deg)`,
      opacity: 1,
    }
  }

  const rightBadgeOpacity = Math.max(0, Math.min(1, dragX / 130))
  const leftBadgeOpacity = Math.max(0, Math.min(1, -dragX / 130))
  const likeLimitReached = !canLikeNow(activePlan)
  const superLikeLimitReached = !canSuperLikeNow(activePlan)

  const showingDeckCompletion = !loadingProfiles && filteredProfiles.length > 0 && !topProfile
  const showingNoResults = !loadingProfiles && filteredProfiles.length === 0

  const likedProfiles = useMemo(() => {
    return history.likedIds
      .map((id) => profileById.get(id))
      .filter((profile): profile is Profile => Boolean(profile))
      .reverse()
  }, [history.likedIds, profileById])

  const passedProfiles = useMemo(() => {
    return history.passedIds
      .map((id) => profileById.get(id))
      .filter((profile): profile is Profile => Boolean(profile))
      .reverse()
  }, [history.passedIds, profileById])

  const chatPreviews = useMemo(() => {
    return matchedProfiles.map((profile) => {
      const messages = chatThreads[profile.id] ?? seedChat(selfProfile.name)
      const last = messages[messages.length - 1]
      return {
        profile,
        lastText: last.text,
        lastTime: formatShortTime(last.createdAt),
        unread: unreadChats[profile.id] ?? 0,
      }
    })
  }, [matchedProfiles, chatThreads, unreadChats, selfProfile.name])

  const filteredChatPreviews = useMemo(() => {
    const query = chatSearch.trim().toLowerCase()
    if (query.length === 0) {
      return chatPreviews
    }

    return chatPreviews.filter(({ profile, lastText }) => {
      return (
        profile.name.toLowerCase().includes(query) ||
        lastText.toLowerCase().includes(query)
      )
    })
  }, [chatPreviews, chatSearch])

  const unreadNotificationCount = useMemo(
    () => notifications.reduce((count, item) => count + (item.read ? 0 : 1), 0),
    [notifications],
  )

  const navItems: Array<{ key: AppScreen; label: string; badge?: number }> = [
    { key: 'discover', label: 'Discover' },
    { key: 'activity', label: 'Activity' },
    { key: 'chats', label: 'Chats', badge: Object.values(unreadChats).reduce((sum, count) => sum + count, 0) },
    { key: 'profile', label: 'Profile' },
    { key: 'settings', label: 'Settings', badge: unreadNotificationCount },
  ]

  if (screen === 'login') {
    return (
      <main className="login-shell">
        <div className="grain" aria-hidden="true" />
        <article className="login-card">
          <Logo variant="hero" size="lg" showSlogan className="login-hero-logo" />
          <h1>{authMode === 'register' ? 'Create your LoveDate account' : 'Sign in to LoveDate'}</h1>
          <form className="login-form" onSubmit={handleLoginSubmit}>
            {runtimeConfig.auth.requireInviteCode ? (
              <label>
                Beta Invite Code
                <input
                  type="text"
                  autoComplete="one-time-code"
                  value={inviteCode}
                  onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
                  placeholder="Enter your invite code"
                  required
                />
              </label>
            ) : null}
            <label>
              Email
              <input
                type="email"
                autoComplete="email"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                required
              />
            </label>
            {authMode === 'register' ? (
              <label>
                Confirm Password
                <input
                  type="password"
                  autoComplete="new-password"
                  value={registerPasswordConfirm}
                  onChange={(event) => setRegisterPasswordConfirm(event.target.value)}
                  required
                />
              </label>
            ) : null}
            {loginError ? <p className="error-text">{loginError}</p> : null}
            {loginNotice ? <p className="info-text">{loginNotice}</p> : null}
            <div className="login-actions">
              <button type="submit" disabled={loggingIn}>
                {loggingIn ? 'Please wait...' : authMode === 'register' ? 'Create Account' : 'Sign In'}
              </button>
              {runtimeConfig.auth.allowGuestLogin && authMode === 'login' ? (
                <button type="button" className="ghost" onClick={handleGuestLogin} disabled={loggingIn}>
                  Continue as Guest
                </button>
              ) : null}
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setLoginError(null)
                  setLoginNotice(null)
                  setRegisterPasswordConfirm('')
                  setAuthMode((current) => (current === 'login' ? 'register' : 'login'))
                }}
                disabled={loggingIn}
              >
                {authMode === 'login' ? 'Create account' : 'I already have an account'}
              </button>
            </div>
          </form>
        </article>
      </main>
    )
  }

  const getDiscoverCardBackground = (_profile: Profile, tone: 'front' | 'back' = 'front'): string => {
    const veil = tone === 'back'
      ? 'linear-gradient(155deg, rgba(20, 25, 55, 0.88), rgba(15, 20, 46, 0.84))'
      : 'linear-gradient(155deg, rgba(20, 25, 55, 0.84), rgba(37, 45, 92, 0.74))'
    const bloom = tone === 'back'
      ? 'radial-gradient(circle at 84% 14%, rgba(0, 229, 255, 0.12), transparent 52%)'
      : 'radial-gradient(circle at 84% 14%, rgba(167, 139, 250, 0.24), transparent 52%)'
    const base = 'linear-gradient(135deg, #141937, #252d5c)'
    return `${veil}, ${bloom}, ${base}`
  }
  return (
    <main className={`app-shell app-shell--${screen}`}>
      <div className="grain" aria-hidden="true" />
      <header className="top-bar">
        <div>
          <Logo variant="compact" size="md" />
        </div>
        <nav className="bottom-nav" aria-label="Primary navigation">
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={screen === item.key ? 'active' : ''}
              onClick={() => navigate(item.key)}
            >
              {item.label}
              {item.badge && item.badge > 0 ? <span className="badge-count">{item.badge}</span> : null}
            </button>
          ))}
        </nav>
      </header>
      <section className={`screen-panel ${screen === 'discover' ? 'screen-panel--discover' : ''}`} aria-live="polite">
        {screen === 'filters' && (
          <section className="filter-screen-wrap">
            <button
              type="button"
              className="ghost"
              style={{ marginBottom: '1.5rem' }}
              onClick={() => navigate('discover')}
            >
              {'\u2190'} Back to Discover
            </button>
            <FilterScreen
              filters={filters}
              setFilters={setFilters}
              includeReviewed={includeReviewed}
              setIncludeReviewed={setIncludeReviewed}
              cityOptions={cityOptions}
              genderOptions={genderOptions}
              relationshipGoalOptions={relationshipGoalOptions}
              ZODIAC_EMOJI={ZODIAC_EMOJI}
            />
          </section>
        )}
        {screen === 'discover' && (
          <section className="discover-main-only discover-redesign" aria-label="Discover cards and actions">
            <section className="discover-metrics" aria-label="Discover summary">
              <div className="discover-kpis">
                <div className="discover-kpi">
                  <strong className="discover-kpi-value">{filteredProfiles.length}</strong>
                  <span className="discover-kpi-label">In Deck</span>
                </div>
                <div className="discover-kpi">
                  <strong className="discover-kpi-value">{matchedProfiles.length}</strong>
                  <span className="discover-kpi-label">Matches</span>
                </div>
                <div className="discover-kpi">
                  <strong className="discover-kpi-value">
                    {likeUsage.limit === null || likeUsage.limit === Infinity
                      ? '∞'
                      : Math.max(0, likeUsage.limit - likeUsage.used)}
                  </strong>
                  <span className="discover-kpi-label">Likes Left</span>
                </div>
                <div className="discover-kpi">
                  <strong className="discover-kpi-value">
                    {superLikeUsage.limit === Infinity ? '∞' : Math.max(0, superLikeUsage.limit - superLikeUsage.used)}
                  </strong>
                  <span className="discover-kpi-label">Super Likes</span>
                </div>
              </div>
              <div className="discover-metric-controls">
                <button type="button" className="discover-metric-btn" onClick={() => navigate('filters')}>
                  Open Filters
                </button>
                <button
                  type="button"
                  className="discover-metric-btn"
                  onClick={() => {
                    if (boostsLeft <= 0) {
                      pushToast('No boosts left right now.', 'error')
                      return
                    }
                    setBoostsLeft((current) => Math.max(0, current - 1))
                    setIndex(0)
                    setIncludeReviewed(true)
                    pushNotification({
                      title: 'Profile boost activated',
                      body: 'Your profile gets extra visibility for the next hour (demo).',
                      category: 'system',
                    })
                    pushToast('Boost activated.', 'success')
                  }}
                >
                  Boost
                </button>
                <button type="button" className="discover-metric-btn" onClick={() => setFilters(initialFilters)}>
                  Reset
                </button>
              </div>
            </section>

            {loadingProfiles && (
              <section className="state-box" aria-live="polite">
                <p className="pill">Loading</p>
                <h1>Finding profiles near you...</h1>
              </section>
            )}
            {loadError && !loadingProfiles && (
              <section className="state-box" aria-live="assertive">
                <p className="pill">Error</p>
                <h1>{loadError}</h1>
                <button type="button" onClick={() => void loadProfiles()}>
                  Retry
                </button>
              </section>
            )}
            {showingNoResults && !loadError && (
              <section className="state-box" aria-live="polite">
                <p className="pill">No Results</p>
                <h1>No profiles match your filters</h1>
                <button type="button" onClick={() => setFilters(initialFilters)}>
                  Reset Filters
                </button>
              </section>
            )}
            {!loadingProfiles && !loadError && topProfile && (
              <section className="discover-stage">
                <div className="discover-deck-column">
                  <section className="deck-wrap discover-deck">
                    {upcoming
                      .slice()
                      .reverse()
                      .map((profile, reverseIndex) => {
                        const depth = upcoming.length - reverseIndex
                        return (
                          <article
                            key={profile.id}
                            className="profile-card back"
                            style={{
                              background: getDiscoverCardBackground(profile, 'back'),
                              transform: `translateY(${depth * 6}px) scale(${1 - depth * 0.03})`,
                            }}
                          >
                            <p className="mini-label">Up Next</p>
                            <h2>
                              {profile.name}, {profile.age}
                            </h2>
                            <p>{profile.vibe}</p>
                          </article>
                        )
                      })}
                    <article
                      className={`profile-card front ${isDragging ? 'dragging' : ''}`}
                      style={{
                        background: getDiscoverCardBackground(topProfile, 'front'),
                        ...getCardStyle(),
                      }}
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerUp}
                    >
                      <div className="badge like" style={{ opacity: rightBadgeOpacity }}>
                        LIKE
                      </div>
                      <div className="badge nope" style={{ opacity: leftBadgeOpacity }}>
                        NOPE
                      </div>
                      {topProfile.photos[0] ? (
                        <div className="card-photo-wrap">
                          <img
                            src={buildHighResImageUrl(topProfile.photos[0], 2400, 2)}
                            srcSet={`${buildHighResImageUrl(topProfile.photos[0], 1800, 1)} 1x, ${buildHighResImageUrl(topProfile.photos[0], 3200, 2)} 2x`}
                            sizes="(min-width: 1200px) 1024px, (min-width: 768px) 88vw, 96vw"
                            alt={`${topProfile.name} profile`}
                            className="card-photo"
                            loading="eager"
                            decoding="async"
                            fetchPriority="high"
                          />
                          <div className="card-photo-overlay">
                            <div className="profile-head">
                              <h1 className="discover-card-name">
                                {topProfile.name}, {topProfile.age}
                              </h1>
                              <p className="discover-presence-line">
                                <span className="discover-status-dot" aria-hidden="true" />
                                Active now
                              </p>
                              <p className="discover-location-line">
                                {'\u{1F4CD}'} {topProfile.city} {'\u2022'} {topProfile.distanceKm} miles away
                              </p>
                              <p className="mini-label discover-spotlight-pill">{topProfile.vibe}</p>
                              <p className="vibe">{topProfile.vibe}</p>
                              <div className="discover-interest-chips">
                                {topProfile.interests.slice(0, 3).map((interest) => (
                                  <span key={`${topProfile.id}-${interest}`}>{interest}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="profile-head">
                            <h1 className="discover-card-name">
                              {topProfile.name}, {topProfile.age}
                            </h1>
                            <p className="discover-presence-line">
                              <span className="discover-status-dot" aria-hidden="true" />
                              Active now
                            </p>
                            <p className="discover-location-line">
                              {'\u{1F4CD}'} {topProfile.city} {'\u2022'} {topProfile.distanceKm} miles away
                            </p>
                            <p className="mini-label discover-spotlight-pill">{topProfile.vibe}</p>
                            <p className="vibe">{topProfile.vibe}</p>
                            <div className="discover-interest-chips">
                              {topProfile.interests.slice(0, 3).map((interest) => (
                                <span key={`${topProfile.id}-${interest}`}>{interest}</span>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </article>
                  </section>

                  <section className="actions discover-action-cluster discover-primary-actions" aria-label="Swipe actions">
                    <button
                      type="button"
                      className="ghost pass-action"
                      onClick={() => swipeCard('left')}
                      disabled={!topProfile || isResolvingSwipe}
                    >
                      Pass
                    </button>
                    <button
                      type="button"
                      className="super super-action"
                      onClick={() => swipeCard('right', 'super-like')}
                      disabled={!topProfile || isResolvingSwipe || likeLimitReached || superLikeLimitReached}
                    >
                      Super Like
                    </button>
                    <button
                      type="button"
                      className="solid like-action"
                      onClick={() => swipeCard('right')}
                      disabled={!topProfile || isResolvingSwipe || likeLimitReached}
                    >
                      Like
                    </button>
                  </section>
                  <footer className="hint discover-hint">
                    <div className="discover-keymap" aria-label="Keyboard shortcuts">
                      <span><b>←</b> Pass</span>
                      <span><b>↑</b> Super Like</span>
                      <span><b>→</b> Like</span>
                    </div>
                    <p>U (undo), Esc (close match).</p>
                    {likeLimitReached && <p className="result">Like limit reached for your current plan.</p>}
                    {superLikeLimitReached && <p className="result">Super Like limit reached for this week.</p>}
                    {isResolvingSwipe && <p className="result">Checking for a match...</p>}
                    {lastIntent && <p className="result">Last action: {lastIntent.replace('-', ' ')}</p>}
                  </footer>
                </div>
              </section>
            )}
            {showingDeckCompletion && (
              <section className="match-summary">
                <p className="pill">Deck Complete</p>
                <h1>No more profiles for these filters</h1>
                <div className="summary-actions">
                  <button type="button" onClick={() => setIndex(0)}>
                    Start Again
                  </button>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => {
                      setHistory({ likedIds: [], passedIds: [], matchIds: [] })
                      setSwipeLog([])
                      setChatThreads({})
                      setUnreadChats({})
                      setMatchQueueIds([])
                      setActiveChatId(null)
                      setIndex(0)
                    }}
                  >
                    Clear History
                  </button>
                </div>
              </section>
            )}
          </section>
        )}
        {screen === 'activity' && (
          <section className="activity-layout">
            <section className="activity-overview" aria-label="Activity overview">
              <p>
                Liked <strong>{likedProfiles.length}</strong>
              </p>
              <p>
                Passed <strong>{passedProfiles.length}</strong>
              </p>
              <p>
                Matches <strong>{matchedProfiles.length}</strong>
              </p>
            </section>

            <article className="list-panel activity-panel activity-panel--matches">
              <h2>Matches</h2>
              {matchedProfiles.length === 0 ? (
                <p className="soft">No matches yet.</p>
              ) : (
                <ul>
                  {matchedProfiles.map((profile) => (
                    <li key={profile.id} className="activity-item">
                      <div className="activity-item-main">
                        <div className="activity-avatar-wrap">
                          <img className="activity-avatar" src={profile.photos[0]} alt={`${profile.name} avatar`} />
                          <span className="activity-status-dot activity-status-dot--match" aria-hidden="true" />
                        </div>
                        <div className="activity-item-meta">
                          <strong>{profile.name}</strong>
                          <span>{profile.relationshipGoal}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="mini-btn"
                        onClick={() => {
                          setActiveChatId(profile.id)
                          navigate('chats')
                        }}
                      >
                        Chat
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </article>

            <article className="list-panel activity-panel">
              <h2>Liked</h2>
              {likedProfiles.length === 0 ? (
                <p className="soft">No likes yet.</p>
              ) : (
                <ul>
                  {likedProfiles.map((profile) => (
                    <li key={profile.id} className="activity-item">
                      <div className="activity-item-main">
                        <div className="activity-avatar-wrap">
                          <img className="activity-avatar" src={profile.photos[0]} alt={`${profile.name} avatar`} />
                          <span className="activity-status-dot activity-status-dot--liked" aria-hidden="true" />
                        </div>
                        <div className="activity-item-meta">
                          <strong>{profile.name}</strong>
                          <span>{profile.city}</span>
                        </div>
                      </div>
                      <button type="button" className="mini-btn" onClick={() => openProfileDetail(profile.id, 'activity')}>
                        View
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </article>

            <article className="list-panel activity-panel">
              <h2>Passed</h2>
              {passedProfiles.length === 0 ? (
                <p className="soft">No passes yet.</p>
              ) : (
                <ul>
                  {passedProfiles.map((profile) => (
                    <li key={profile.id} className="activity-item">
                      <div className="activity-item-main">
                        <div className="activity-avatar-wrap">
                          <img className="activity-avatar" src={profile.photos[0]} alt={`${profile.name} avatar`} />
                          <span className="activity-status-dot activity-status-dot--passed" aria-hidden="true" />
                        </div>
                        <div className="activity-item-meta">
                          <strong>{profile.name}</strong>
                          <span>{profile.city}</span>
                        </div>
                      </div>
                      <button type="button" className="mini-btn" onClick={() => openProfileDetail(profile.id, 'activity')}>
                        View
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </section>
        )}
        {screen === 'chats' && (
          <section className="chats-layout">
            <article className="chat-list">
              <div className="chat-tools">
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={chatSearch}
                  onChange={(event) => setChatSearch(event.target.value)}
                />
              </div>
              {filteredChatPreviews.map((preview) => (
                <button
                  key={preview.profile.id}
                  type="button"
                  className={`chat-item ${activeChatId === preview.profile.id ? 'active' : ''}`}
                  onClick={() => setActiveChatId(preview.profile.id)}
                >
                  <div className="chat-avatar-wrap">
                    <img className="chat-avatar" src={preview.profile.photos[0]} alt={preview.profile.name} />
                    <span className="chat-online-dot" aria-hidden="true" />
                  </div>
                  <div className="chat-item-body">
                    <div className="chat-meta">
                      <strong>{preview.profile.name}</strong>
                      <span>{preview.lastText}</span>
                    </div>
                    <div className="chat-status">
                      <small>{preview.lastTime}</small>
                      {preview.unread > 0 ? <span className="badge-count">{preview.unread}</span> : null}
                    </div>
                  </div>
                </button>
              ))}
            </article>
            <article className="chat-thread">
              {selectedChatProfile ? (
                <>
                  <header>
                    <div className="chat-header-profile">
                      <div className="chat-avatar-wrap">
                        <img className="chat-avatar" src={selectedChatProfile.photos[0]} alt={selectedChatProfile.name} />
                        <span className="chat-online-dot" aria-hidden="true" />
                      </div>
                      <div>
                        <h2>{selectedChatProfile.name}</h2>
                        <p className="chat-presence">Online</p>
                      </div>
                    </div>
                    <div className="chat-header-actions">
                      <button type="button" className="chat-icon-btn" aria-label="Audio call" onClick={() => startCall('audio')}>
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M22 16.8v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 11.2 19a19.3 19.3 0 0 1-6-6A19.8 19.8 0 0 1 2.2 4.2 2 2 0 0 1 4.2 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.7.6 2.5a2 2 0 0 1-.5 2l-1.2 1.2a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2-.5c.8.3 1.6.5 2.5.6A2 2 0 0 1 22 16.8z" />
                        </svg>
                      </button>
                      <button type="button" className="chat-icon-btn" aria-label="Video call" onClick={() => startCall('video')}>
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <rect x="3" y="6" width="14" height="12" rx="2" ry="2" />
                          <path d="M17 10l4-2v8l-4-2z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="chat-icon-btn"
                        aria-label="More options"
                        onClick={() => openProfileDetail(selectedChatProfile.id, 'chats')}
                        title="Open profile"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <circle cx="12" cy="5" r="1.8" />
                          <circle cx="12" cy="12" r="1.8" />
                          <circle cx="12" cy="19" r="1.8" />
                        </svg>
                      </button>
                    </div>
                  </header>
                  <div className="messages">
                    {(chatThreads[selectedChatProfile.id] ?? seedChat(selfProfile.name)).map((message) => (
                      <p key={message.id} className={`msg ${message.sender}`}>
                        {message.text}
                        {message.attachment?.kind === 'image' ? (
                          <img className="msg-media" src={message.attachment.url} alt={message.attachment.name} />
                        ) : null}
                        {message.attachment?.kind === 'video' ? (
                          <video className="msg-media" src={message.attachment.url} controls />
                        ) : null}
                        {message.attachment?.kind === 'audio' ? (
                          <audio className="msg-audio" src={message.attachment.url} controls />
                        ) : null}
                        <span>
                          {formatShortTime(message.createdAt)}
                          {message.sender === 'me' ? ` | ${message.status ?? 'sent'}` : ''}
                        </span>
                      </p>
                    ))}
                  </div>
                  {chatAttachmentDraft ? (
                    <div className="chat-attachment-preview">
                      <strong>Attachment ready:</strong> {chatAttachmentDraft.name}
                      <button type="button" className="mini-btn" onClick={() => setChatAttachmentDraft(null)}>
                        Remove
                      </button>
                    </div>
                  ) : null}
                  <form
                    className="chat-input"
                    onSubmit={(event) => {
                      event.preventDefault()
                      sendChatMessage()
                    }}
                  >
                    <input
                      type="text"
                      placeholder="Type a message..."
                      value={chatDraft}
                      onChange={(event) => setChatDraft(event.target.value)}
                    />
                    <input ref={attachmentInputRef} type="file" accept="image/*,video/*" hidden onChange={handleAttachmentPick} />
                    <button type="button" className="chat-icon-btn" aria-label="Attach media" onClick={() => attachmentInputRef.current?.click()}>
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M21.4 11.2l-8.9 8.9a5 5 0 0 1-7.1-7.1l9.5-9.5a3.5 3.5 0 1 1 5 5l-9.8 9.8a2 2 0 1 1-2.8-2.8l8.8-8.8" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className={`chat-icon-btn ${isRecordingVoice ? 'danger' : ''}`}
                      aria-label={isRecordingVoice ? 'Stop recording' : 'Record voice'}
                      onClick={() => void startVoiceRecording()}
                    >
                      {isRecordingVoice ? (
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <rect x="7" y="7" width="10" height="10" rx="1.8" ry="1.8" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <rect x="9" y="3" width="6" height="12" rx="3" ry="3" />
                          <path d="M5 11a7 7 0 0 0 14 0" />
                          <path d="M12 18v3" />
                          <path d="M8 21h8" />
                        </svg>
                      )}
                    </button>
                    <button type="submit" className="chat-send-btn" aria-label="Send">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M22 2L11 13" />
                        <path d="M22 2L15 22l-4-9-9-4z" />
                      </svg>
                    </button>
                  </form>
                </>
              ) : (
                <section className="state-box">
                  <p className="pill">No Chat</p>
                  <h1>Select a match to begin chatting</h1>
                </section>
              )}
            </article>
          </section>
        )}
        {screen === 'profile' && (
          <section className="profile-screen" aria-label="Profile screen">
            <aside className="profile-left-column" aria-label="Profile overview">
              <article className="profile-summary profile-summary-card">
                {selfProfile.photos.length > 0 && (
                  <div className="profile-summary-hero">
                    <img
                      src={selfProfile.photos[0]}
                      alt={`${selfProfile.name} primary profile`}
                    />
                    <div className="profile-summary-overlay">
                      <h3>
                        {selfProfile.name}, {selfProfile.age}
                      </h3>
                      <p>
                        {selfProfile.city} {'\u2022'} {selfProfile.vibe}
                      </p>
                    </div>
                  </div>
                )}
              </article>

              <article className="profile-summary profile-about-card">
                <h3>About Me</h3>
                <p>{selfProfile.bio}</p>
                <p className="profile-about-meta">
                  {selfProfile.jobTitle} at {selfProfile.company} {'\u2022'} {selfProfile.lookingFor}
                </p>
              </article>

              <article className="profile-summary profile-interests-card">
                <h3>Interests</h3>
                <div className="chips profile-interest-chips">
                  {selfProfile.interests.map((interest) => (
                    <span key={interest}>{interest}</span>
                  ))}
                </div>
              </article>
            </aside>

            <article className="profile-settings profile-editor">
              <h2>Edit My Profile</h2>
              <form onSubmit={saveMyProfile}>
                <h3>Identity</h3>
                <div className="profile-editor-grid">
                    <label>
                      Name
                      <input
                        type="text"
                        value={profileDraft.name}
                        onChange={(event) => handleProfileDraftChange('name', event.target.value)}
                      />
                    </label>
                    <label>
                      Age
                      <input
                        type="number"
                        min={18}
                        max={99}
                        value={profileDraft.age}
                        onChange={(event) => handleProfileDraftChange('age', event.target.value)}
                      />
                    </label>
                    <label>
                      Pronouns
                      <input
                        type="text"
                        value={profileDraft.pronouns}
                        onChange={(event) => handleProfileDraftChange('pronouns', event.target.value)}
                      />
                    </label>
                    <label>
                      Gender
                      <input
                        type="text"
                        value={profileDraft.gender}
                        onChange={(event) => handleProfileDraftChange('gender', event.target.value)}
                      />
                    </label>
                    <label>
                      Orientation
                      <input
                        type="text"
                        value={profileDraft.orientation}
                        onChange={(event) => handleProfileDraftChange('orientation', event.target.value)}
                      />
                    </label>
                    <label>
                      Height (cm)
                      <input
                        type="number"
                        min={130}
                        max={230}
                        value={profileDraft.heightCm}
                        onChange={(event) => handleProfileDraftChange('heightCm', event.target.value)}
                      />
                    </label>
                </div>

                <h3>Profile Details</h3>
                <div className="profile-editor-grid">
                    <label>
                      City
                      <input
                        type="text"
                        value={profileDraft.city}
                        onChange={(event) => handleProfileDraftChange('city', event.target.value)}
                      />
                    </label>
                    <label>
                      Hometown
                      <input
                        type="text"
                        value={profileDraft.hometown}
                        onChange={(event) => handleProfileDraftChange('hometown', event.target.value)}
                      />
                    </label>
                    <label>
                      Vibe
                      <input
                        type="text"
                        value={profileDraft.vibe}
                        onChange={(event) => handleProfileDraftChange('vibe', event.target.value)}
                      />
                    </label>
                    <label>
                      Looking For
                      <input
                        type="text"
                        value={profileDraft.lookingFor}
                        onChange={(event) => handleProfileDraftChange('lookingFor', event.target.value)}
                      />
                    </label>
                    <label>
                      Relationship Intent
                      <input
                        type="text"
                        value={profileDraft.relationshipIntent}
                        onChange={(event) => handleProfileDraftChange('relationshipIntent', event.target.value)}
                      />
                    </label>
                    <label>
                      Interests (comma separated)
                      <input
                        type="text"
                        value={profileDraft.interests}
                        onChange={(event) => handleProfileDraftChange('interests', event.target.value)}
                      />
                    </label>
                    <label className="full-width">
                      Bio
                      <textarea
                        rows={3}
                        value={profileDraft.bio}
                        onChange={(event) => handleProfileDraftChange('bio', event.target.value)}
                      />
                    </label>
                </div>

                <h3>Career And Lifestyle</h3>
                <div className="profile-editor-grid">
                  <label>
                    Job Title
                    <input
                      type="text"
                      value={profileDraft.jobTitle}
                      onChange={(event) => handleProfileDraftChange('jobTitle', event.target.value)}
                    />
                  </label>
                  <label>
                    Company
                    <input
                      type="text"
                      value={profileDraft.company}
                      onChange={(event) => handleProfileDraftChange('company', event.target.value)}
                    />
                  </label>
                  <label>
                    Education
                    <input
                      type="text"
                      value={profileDraft.education}
                      onChange={(event) => handleProfileDraftChange('education', event.target.value)}
                    />
                  </label>
                  <label>
                    Languages (comma separated)
                    <input
                      type="text"
                      value={profileDraft.languages}
                      onChange={(event) => handleProfileDraftChange('languages', event.target.value)}
                    />
                  </label>
                  <label>
                    Drinking
                    <input
                      type="text"
                      value={profileDraft.drinking}
                      onChange={(event) => handleProfileDraftChange('drinking', event.target.value)}
                    />
                  </label>
                  <label>
                    Smoking
                    <input
                      type="text"
                      value={profileDraft.smoking}
                      onChange={(event) => handleProfileDraftChange('smoking', event.target.value)}
                    />
                  </label>
                  <label>
                    Workout
                    <input
                      type="text"
                      value={profileDraft.workout}
                      onChange={(event) => handleProfileDraftChange('workout', event.target.value)}
                    />
                  </label>
                  <label>
                    Pets
                    <input
                      type="text"
                      value={profileDraft.pets}
                      onChange={(event) => handleProfileDraftChange('pets', event.target.value)}
                    />
                  </label>
                  <label>
                    Children Plan
                    <input
                      type="text"
                      value={profileDraft.childrenPlan}
                      onChange={(event) => handleProfileDraftChange('childrenPlan', event.target.value)}
                    />
                  </label>
                  <label>
                    Religion
                    <input
                      type="text"
                      value={profileDraft.religion}
                      onChange={(event) => handleProfileDraftChange('religion', event.target.value)}
                    />
                  </label>
                  <label>
                    Politics
                    <input
                      type="text"
                      value={profileDraft.politics}
                      onChange={(event) => handleProfileDraftChange('politics', event.target.value)}
                    />
                  </label>
                  <label>
                    Zodiac
                    <input
                      type="text"
                      value={profileDraft.zodiac}
                      onChange={(event) => handleProfileDraftChange('zodiac', event.target.value)}
                    />
                  </label>
                </div>

                <h3>Prompts And Social</h3>
                <div className="profile-editor-grid">
                  <label className="full-width">
                    Prompt 1
                    <textarea
                      rows={2}
                      value={profileDraft.promptOne}
                      onChange={(event) => handleProfileDraftChange('promptOne', event.target.value)}
                    />
                  </label>
                  <label className="full-width">
                    Prompt 2
                    <textarea
                      rows={2}
                      value={profileDraft.promptTwo}
                      onChange={(event) => handleProfileDraftChange('promptTwo', event.target.value)}
                    />
                  </label>
                  <label className="full-width">
                    Prompt 3
                    <textarea
                      rows={2}
                      value={profileDraft.promptThree}
                      onChange={(event) => handleProfileDraftChange('promptThree', event.target.value)}
                    />
                  </label>
                  <label>
                    Dealbreakers (comma separated)
                    <input
                      type="text"
                      value={profileDraft.dealbreakers}
                      onChange={(event) => handleProfileDraftChange('dealbreakers', event.target.value)}
                    />
                  </label>
                  <label>
                    Instagram
                    <input
                      type="text"
                      value={profileDraft.instagram}
                      onChange={(event) => handleProfileDraftChange('instagram', event.target.value)}
                    />
                  </label>
                  <label>
                    Anthem
                    <input
                      type="text"
                      value={profileDraft.anthem}
                      onChange={(event) => handleProfileDraftChange('anthem', event.target.value)}
                    />
                  </label>
                  <label className="toggle">
                    Travel Mode
                    <input
                      type="checkbox"
                      checked={profileDraft.travelMode}
                      onChange={(event) => handleProfileDraftToggle('travelMode', event.target.checked)}
                    />
                  </label>
                </div>

                <h3>Photos</h3>
                <div className="photo-input-row">
                    <input
                      type="url"
                      placeholder="Paste photo URL"
                      value={photoUrlInput}
                      onChange={(event) => setPhotoUrlInput(event.target.value)}
                    />
                    <button type="button" className="ghost" onClick={addPhotoFromUrl}>
                      Add URL
                    </button>
                  </div>
                  <label className="upload-field">
                    Upload photo (opens editor)
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} />
                  </label>

                <div className="draft-photo-grid">
                  {profileDraft.photos.map((photo, index) => (
                    <div key={`${photo}-${index}`} className="draft-photo-item">
                      <img src={photo} alt={`Draft profile ${index + 1}`} />
                      <div className="draft-photo-actions">
                        {index === 0 ? (
                          <span className="draft-photo-primary-badge">Primary</span>
                        ) : (
                          <button
                            type="button"
                            className="mini-btn ghost"
                            onClick={() => setPrimaryDraftPhoto(index)}
                          >
                            Set as Primary
                          </button>
                        )}
                        <button type="button" className="mini-btn" onClick={() => removeDraftPhoto(photo)}>
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {photoStudioSource && (
                  <aside className="photo-studio-inline" aria-label="Photo studio">
                    <h4>Photo Studio</h4>
                    <div
                      ref={studioFrameRef}
                      className={
                        photoStudioControls.cropAspect === 'free'
                          ? `studio-preview-frame free-crop-active ${isDraggingCrop ? 'dragging' : ''}`
                          : 'studio-preview-frame'
                      }
                      onPointerDown={handleStudioPointerDown}
                      onPointerMove={handleStudioPointerMove}
                      onPointerUp={handleStudioPointerUp}
                      onPointerCancel={handleStudioPointerUp}
                      style={{
                        aspectRatio:
                          photoStudioControls.cropAspect === 'square'
                            ? '1 / 1'
                            : photoStudioControls.cropAspect === 'classic'
                              ? '3 / 4'
                              : photoStudioControls.cropAspect === 'portrait'
                                ? '4 / 5'
                                : photoStudioAnalysis
                                  ? `${photoStudioAnalysis.width} / ${photoStudioAnalysis.height}`
                                  : '4 / 5',
                      }}
                    >
                      <img
                        src={photoStudioSource}
                        alt="Photo studio preview"
                        style={{
                          transform:
                            photoStudioControls.cropAspect === 'free'
                              ? 'none'
                              : `translate(${photoStudioControls.offsetX}px, ${photoStudioControls.offsetY}px) scale(${photoStudioControls.zoom}) rotate(${photoStudioControls.rotate}deg)`,
                          objectFit: photoStudioControls.cropAspect === 'free' ? 'fill' : 'cover',
                          filter: `brightness(${photoStudioControls.brightness}%) contrast(${photoStudioControls.contrast}%) saturate(${photoStudioControls.saturate}%)`,
                        }}
                      />
                      {photoStudioControls.cropAspect === 'free' && (
                        <>
                          <div
                            className="crop-mask"
                            style={{
                              left: `${photoStudioControls.freeCropX}%`,
                              top: `${photoStudioControls.freeCropY}%`,
                              width: `${photoStudioControls.freeCropWidth}%`,
                              height: `${photoStudioControls.freeCropHeight}%`,
                            }}
                          />
                          <div
                            className="crop-visual"
                            data-crop-box="true"
                            style={{
                              left: `${photoStudioControls.freeCropX}%`,
                              top: `${photoStudioControls.freeCropY}%`,
                              width: `${photoStudioControls.freeCropWidth}%`,
                              height: `${photoStudioControls.freeCropHeight}%`,
                            }}
                          >
                            <span className="crop-handle nw" data-crop-handle="nw" />
                            <span className="crop-handle ne" data-crop-handle="ne" />
                            <span className="crop-handle sw" data-crop-handle="sw" />
                            <span className="crop-handle se" data-crop-handle="se" />
                          </div>
                        </>
                      )}
                    </div>

                    {photoStudioAnalysis && (
                      <div className="studio-analysis">
                        <p>Resolution: {photoStudioAnalysis.width} x {photoStudioAnalysis.height}</p>
                        <p>Aspect: {photoStudioAnalysis.aspectRatio}</p>
                        <p>Size: {photoStudioAnalysis.sizeKb} KB</p>
                        <p>Brightness: {photoStudioAnalysis.averageBrightness}%</p>
                        {photoStudioControls.cropAspect === 'free' && (
                          <>
                            <p>Tip: drag inside box to move, drag corners to resize, use Redraw Selection to create a new box.</p>
                            <p>Crop start: {photoStudioControls.freeCropX}% / {photoStudioControls.freeCropY}%</p>
                            <p>Crop size: {photoStudioControls.freeCropWidth}% x {photoStudioControls.freeCropHeight}%</p>
                            <p>Redraw mode: {isRedrawCropMode ? 'ON' : 'OFF'}</p>
                          </>
                        )}
                      </div>
                    )}

                    <div className="studio-sliders">
                      <label>
                        Crop
                        <select
                          value={photoStudioControls.cropAspect}
                          onChange={(event) =>
                            setPhotoStudioControls((current) => ({
                              ...current,
                              cropAspect: event.target.value as PhotoStudioControls['cropAspect'],
                            }))
                          }
                        >
                          <option value="free">Free Crop</option>
                          <option value="portrait">Portrait 4:5</option>
                          <option value="classic">Classic 3:4</option>
                          <option value="square">Square 1:1</option>
                        </select>
                      </label>
                      {photoStudioControls.cropAspect === 'free' && (
                        <>
                          <label>
                            Crop X
                            <input
                              type="range"
                              min={0}
                              max={95}
                              step={1}
                              value={photoStudioControls.freeCropX}
                              onChange={(event) =>
                                setPhotoStudioControls((current) => {
                                  const nextX = Number(event.target.value)
                                  const maxWidth = 100 - nextX
                                  return {
                                    ...current,
                                    freeCropX: nextX,
                                    freeCropWidth: Math.min(current.freeCropWidth, maxWidth),
                                  }
                                })
                              }
                            />
                          </label>
                          <label>
                            Crop Y
                            <input
                              type="range"
                              min={0}
                              max={95}
                              step={1}
                              value={photoStudioControls.freeCropY}
                              onChange={(event) =>
                                setPhotoStudioControls((current) => {
                                  const nextY = Number(event.target.value)
                                  const maxHeight = 100 - nextY
                                  return {
                                    ...current,
                                    freeCropY: nextY,
                                    freeCropHeight: Math.min(current.freeCropHeight, maxHeight),
                                  }
                                })
                              }
                            />
                          </label>
                          <label>
                            Crop Width
                            <input
                              type="range"
                              min={5}
                              max={100 - photoStudioControls.freeCropX}
                              step={1}
                              value={photoStudioControls.freeCropWidth}
                              onChange={(event) =>
                                setPhotoStudioControls((current) => ({
                                  ...current,
                                  freeCropWidth: Number(event.target.value),
                                }))
                              }
                            />
                          </label>
                          <label>
                            Crop Height
                            <input
                              type="range"
                              min={5}
                              max={100 - photoStudioControls.freeCropY}
                              step={1}
                              value={photoStudioControls.freeCropHeight}
                              onChange={(event) =>
                                setPhotoStudioControls((current) => ({
                                  ...current,
                                  freeCropHeight: Number(event.target.value),
                                }))
                              }
                            />
                          </label>
                        </>
                      )}
                      <label>
                        Zoom
                        <input
                          type="range"
                          min={1}
                          max={2.5}
                          step={0.05}
                          value={photoStudioControls.zoom}
                          disabled={photoStudioControls.cropAspect === 'free'}
                          onChange={(event) =>
                            setPhotoStudioControls((current) => ({
                              ...current,
                              zoom: Number(event.target.value),
                            }))
                          }
                        />
                      </label>
                      <label>
                        Rotate
                        <input
                          type="range"
                          min={-20}
                          max={20}
                          step={1}
                          value={photoStudioControls.rotate}
                          disabled={photoStudioControls.cropAspect === 'free'}
                          onChange={(event) =>
                            setPhotoStudioControls((current) => ({
                              ...current,
                              rotate: Number(event.target.value),
                            }))
                          }
                        />
                      </label>
                      <label>
                        Brightness
                        <input
                          type="range"
                          min={70}
                          max={140}
                          step={1}
                          value={photoStudioControls.brightness}
                          onChange={(event) =>
                            setPhotoStudioControls((current) => ({
                              ...current,
                              brightness: Number(event.target.value),
                            }))
                          }
                        />
                      </label>
                      <label>
                        Contrast
                        <input
                          type="range"
                          min={70}
                          max={150}
                          step={1}
                          value={photoStudioControls.contrast}
                          onChange={(event) =>
                            setPhotoStudioControls((current) => ({
                              ...current,
                              contrast: Number(event.target.value),
                            }))
                          }
                        />
                      </label>
                      <label>
                        Saturation
                        <input
                          type="range"
                          min={70}
                          max={150}
                          step={1}
                          value={photoStudioControls.saturate}
                          onChange={(event) =>
                            setPhotoStudioControls((current) => ({
                              ...current,
                              saturate: Number(event.target.value),
                            }))
                          }
                        />
                      </label>
                      <label>
                        Horizontal Position
                        <input
                          type="range"
                          min={-220}
                          max={220}
                          step={1}
                          value={photoStudioControls.offsetX}
                          disabled={photoStudioControls.cropAspect === 'free'}
                          onChange={(event) =>
                            setPhotoStudioControls((current) => ({
                              ...current,
                              offsetX: Number(event.target.value),
                            }))
                          }
                        />
                      </label>
                      <label>
                        Vertical Position
                        <input
                          type="range"
                          min={-220}
                          max={220}
                          step={1}
                          value={photoStudioControls.offsetY}
                          disabled={photoStudioControls.cropAspect === 'free'}
                          onChange={(event) =>
                            setPhotoStudioControls((current) => ({
                              ...current,
                              offsetY: Number(event.target.value),
                            }))
                          }
                        />
                      </label>
                    </div>

                    <div className="profile-editor-actions">
                      {photoStudioControls.cropAspect === 'free' && (
                        <button
                          type="button"
                          className="ghost"
                          onClick={() => setIsRedrawCropMode((current) => !current)}
                        >
                          {isRedrawCropMode ? 'Cancel Redraw' : 'Redraw Selection'}
                        </button>
                      )}
                      <button type="button" onClick={applyPhotoStudio} disabled={photoStudioBusy}>
                        {photoStudioBusy ? 'Processing...' : 'Add Edited Photo'}
                      </button>
                      <button type="button" className="ghost" onClick={resetPhotoStudioControls}>
                        Reset Edits
                      </button>
                      <button type="button" className="ghost" onClick={closePhotoStudio}>
                        Cancel
                      </button>
                    </div>
                  </aside>
                )}
                <div className="profile-editor-actions">
                  <button type="submit">Save Profile</button>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => setProfileDraft({
                      name: selfProfile.name,
                      age: String(selfProfile.age),
                      city: selfProfile.city,
                      vibe: selfProfile.vibe,
                      bio: selfProfile.bio,
                      interests: selfProfile.interests.join(', '),
                      pronouns: selfProfile.pronouns,
                      gender: selfProfile.gender,
                      orientation: selfProfile.orientation,
                      lookingFor: selfProfile.lookingFor,
                      relationshipIntent: selfProfile.relationshipIntent,
                      heightCm: String(selfProfile.heightCm),
                      jobTitle: selfProfile.jobTitle,
                      company: selfProfile.company,
                      education: selfProfile.education,
                      hometown: selfProfile.hometown,
                      languages: selfProfile.languages.join(', '),
                      drinking: selfProfile.drinking,
                      smoking: selfProfile.smoking,
                      workout: selfProfile.workout,
                      religion: selfProfile.religion,
                      politics: selfProfile.politics,
                      zodiac: selfProfile.zodiac,
                      childrenPlan: selfProfile.childrenPlan,
                      pets: selfProfile.pets,
                      promptOne: selfProfile.promptOne,
                      promptTwo: selfProfile.promptTwo,
                      promptThree: selfProfile.promptThree,
                      dealbreakers: selfProfile.dealbreakers.join(', '),
                      instagram: selfProfile.instagram,
                      anthem: selfProfile.anthem,
                      travelMode: selfProfile.travelMode,
                      photos: selfProfile.photos,
                    })}
                  >
                    Reset Draft
                  </button>
                  <button type="button" className="ghost" onClick={() => navigate('settings')}>
                    Open Settings
                  </button>
                </div>
              </form>
            </article>
          </section>
        )}

        {screen === 'settings' && (
          <section className="settings-screen">
            <article className="profile-settings">
              <h2>Preferences</h2>
              <label className="setting-row">
                Push Notifications
                <input
                  type="checkbox"
                  checked={settings.pushNotifications}
                  onChange={(event) => handleSettingsToggle('pushNotifications', event.target.checked)}
                />
              </label>
              <label className="setting-row">
                Email Notifications
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={(event) => handleSettingsToggle('emailNotifications', event.target.checked)}
                />
              </label>
              <label className="setting-row">
                Private Mode
                <input
                  type="checkbox"
                  checked={settings.privateMode}
                  onChange={(event) => handleSettingsToggle('privateMode', event.target.checked)}
                />
              </label>
              <p className="soft">
                Settings: {settingsSaveStatus} {'\u2022'} Preferences sync: {preferenceSaveStatus}
              </p>
              <label className="setting-row">
                Incognito Mode
                <input
                  type="checkbox"
                  checked={incognitoMode}
                  onChange={(event) => setIncognitoMode(event.target.checked)}
                />
              </label>
            </article>
            <article className="profile-settings">
              <h2>Plan & Session</h2>
              <div className="plan-picker">
                <label htmlFor="plan-tier">Plan</label>
                <select
                  id="plan-tier"
                  value={activePlan}
                  onChange={(event) => {
                    const nextPlan = event.target.value as PlanTier
                    setActivePlan(nextPlan)
                    persistActivePlan(nextPlan)
                    refreshEngagementUsage(nextPlan)
                  }}
                >
                  {(Object.keys(PLAN_OPTIONS) as PlanTier[]).map((tier) => (
                    <option key={tier} value={tier}>
                      {tier.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              <p>
                Likes used: {likeUsage.used}/{likeUsage.limit === Infinity ? 'Unlimited' : likeUsage.limit}
              </p>
              <p>
                Super Likes used: {superLikeUsage.used}/{superLikeUsage.limit === Infinity ? 'Unlimited' : superLikeUsage.limit}
              </p>
              <p>Boosts left: {boostsLeft}</p>
              <p>Rewinds left: {rewindsLeft}</p>
              <p>Passport access: {canUsePassport(activePlan) ? 'Enabled' : 'Upgrade required'}</p>
              <p>Backend mode: {backendMode}</p>
              <button type="button" className="danger" onClick={handleSignOut}>
                Sign Out
              </button>
            </article>
            <article className="profile-settings">
              <h2>Notifications</h2>
              {notifications.length === 0 ? <p className="soft">No notifications yet.</p> : null}
              <div className="notification-list">
                {notifications.slice(0, 8).map((item) => (
                  <p key={item.id} className={`notification-item ${item.read ? 'read' : ''}`}>
                    <strong>{item.title}</strong>
                    <span>{item.body}</span>
                    <small>{formatShortTime(item.createdAt)}</small>
                  </p>
                ))}
              </div>
              <button type="button" className="ghost" onClick={markAllNotificationsRead}>
                Mark all as read
              </button>
            </article>
            <article className="profile-settings">
              <h2>Safety</h2>
              <p>Blocked profiles: {blockedProfileIds.length}</p>
              <p>Reports submitted: {safetyReports.length}</p>
              {safetyReports.length > 0 ? (
                <ul>
                  {safetyReports.slice(-4).map((report, idx) => {
                    const profileName = profileById.get(report.profileId)?.name ?? `#${report.profileId}`
                    return (
                      <li key={`${report.profileId}-${report.createdAt}-${idx}`}>
                        {profileName}: {report.reason}
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="soft">No safety reports yet.</p>
              )}
            </article>
          </section>
        )}
        {screen === 'profile-detail' && (
          <section className="profile-detail">
            {selectedDetailProfile ? (
              <>
                <article className="profile-summary">
                  <button type="button" className="ghost" onClick={closeProfileDetail}>
                    {'\u2190'} Back
                  </button>
                  <h2>
                    {selectedDetailProfile.name}, {selectedDetailProfile.age}
                  </h2>
                  <p>Compatibility score: {getCompatibilityScore(selectedDetailProfile)}%</p>
                  <p>{selectedDetailProfile.vibe}</p>
                  <p>{selectedDetailProfile.bio}</p>
                  <p>
                    {selectedDetailProfile.gender} {'\u2022'} {selectedDetailProfile.city} {'\u2022'}{' '}
                    {selectedDetailProfile.distanceKm} km
                  </p>
                  <div className="summary-actions">
                    <button type="button" className="ghost" onClick={() => reportProfile(selectedDetailProfile)}>
                      Report profile
                    </button>
                    <button type="button" className="danger" onClick={() => blockProfile(selectedDetailProfile)}>
                      Block profile
                    </button>
                  </div>
                  <ul>
                    {getProfilePrompts(selectedDetailProfile).map((prompt, indexPrompt) => (
                      <li key={`prompt-${indexPrompt}`}>{prompt}</li>
                    ))}
                  </ul>
                </article>
                <article className="detail-photos">
                  {getProfilePhotos(selectedDetailProfile).map((photo, idx) => (
                    <div key={`${photo}-${idx}`} className="photo-card">
                      <button type="button" className="photo-button" onClick={() => openLightbox(photo)}>
                        <img src={photo} alt={`${selectedDetailProfile.name} photo ${idx + 1}`} />
                      </button>
                    </div>
                  ))}
                </article>
              </>
            ) : (
              <article className="state-box">
                <p className="pill">Unavailable</p>
                <h1>Profile was not found</h1>
                <button type="button" onClick={() => navigate('discover')}>
                  Back to Discover
                </button>
              </article>
            )}
          </section>
        )}
      </section>
      {activeMatch ? (
        <div className="match-modal" role="dialog" aria-modal="true" aria-label="Match found">
          <article className="match-card">
            <p className="pill">It&apos;s a match</p>
            <h2>You and {activeMatch.name} liked each other</h2>
            <p>Send a message now or keep swiping.</p>
            <div className="match-actions">
              <button type="button" className="ghost" onClick={() => setActiveMatch(null)}>
                Keep Swiping
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveChatId(activeMatch.id)
                  setActiveMatch(null)
                  navigate('chats')
                }}
              >
                Open Chat
              </button>
            </div>
          </article>
        </div>
      ) : null}
      {callState.active ? (
        <div className="match-modal" role="dialog" aria-modal="true" aria-label="Call in progress">
          <article className="match-card call-card">
            <p className="pill">{callState.type === 'video' ? 'Video call' : 'Audio call'}</p>
            <h2>
              {callState.targetProfileId ? profileById.get(callState.targetProfileId)?.name ?? 'Match' : 'Match'}
            </h2>
            <p>
              {callState.status === 'ringing'
                ? 'Ringing...'
                : `Connected | ${formatShortTime(callState.startedAt)}`}
            </p>
            <div className="match-actions">
              <button
                type="button"
                className="ghost"
                onClick={() => setCallState((current) => ({ ...current, muted: !current.muted }))}
              >
                {callState.muted ? 'Unmute' : 'Mute'}
              </button>
              {callState.type === 'video' ? (
                <button
                  type="button"
                  className="ghost"
                  onClick={() => setCallState((current) => ({ ...current, cameraOff: !current.cameraOff }))}
                >
                  {callState.cameraOff ? 'Camera On' : 'Camera Off'}
                </button>
              ) : null}
              <button type="button" className="danger" onClick={endCall}>
                End Call
              </button>
            </div>
          </article>
        </div>
      ) : null}
      {lightboxPhoto ? (
        <div className="photo-lightbox" role="dialog" aria-modal="true" aria-label="Photo lightbox">
          <article className="photo-lightbox-panel">
            <div className="photo-lightbox-toolbar">
              <button type="button" className="ghost" onClick={closeLightbox}>
                Close
              </button>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={lightboxZoom}
                onChange={(event) => setLightboxZoom(Number(event.target.value))}
              />
              <button type="button" className="ghost" onClick={() => zoomLightbox(-0.2)}>
                -
              </button>
              <button type="button" className="ghost" onClick={() => zoomLightbox(0.2)}>
                +
              </button>
            </div>
            <div className="photo-lightbox-canvas">
              <img src={lightboxPhoto} alt="Expanded profile" style={{ transform: `scale(${lightboxZoom})` }} />
            </div>
          </article>
        </div>
      ) : null}
      {toasts.length > 0 ? (
        <div className="toast-stack" aria-live="polite">
          {toasts.map((toast) => (
            <p key={toast.id} className={`toast ${toast.tone}`}>
              {toast.message}
            </p>
          ))}
        </div>
      ) : null}
    </main>
  )
}

export default App


