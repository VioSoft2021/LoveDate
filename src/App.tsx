// ZODIAC_EMOJI moved to src/constants/zodiac.ts.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import './App.css'
import { getMyMatches, resolveMatch, type Profile } from './services/loveDateApi'
import { backendInvokeIcebreaker } from './services/ai/icebreaker'
import { backendInvokeMatchScore, type AiMatchScoreResult } from './services/ai/matchScore'
import { enablePushNotifications, disablePushNotifications } from './services/push'
import { FilterScreen } from './components/FilterScreen'
import { EmbeddedCallStage } from './components/EmbeddedCallStage'
import { Logo } from './components/Logo'
import { BuildChip } from './components/BuildChip'
import { UpdateBanner } from './components/UpdateBanner'
import { useAuth } from './hooks/useAuth'
import { useDeck } from './hooks/useDeck'
import { useChatState } from './hooks/useChatState'
import { useProfileEditor } from './hooks/useProfileEditor'
import { useReports } from './hooks/useReports'
import { useToasts } from './hooks/useToasts'
import { useEngagement } from './hooks/useEngagement'
import { useAppSettings } from './hooks/useAppSettings'
import { useCirclesState } from './hooks/useCirclesState'
import { ActivityScreen } from './screens/ActivityScreen'
import { ChatScreen } from './screens/ChatScreen'
import { CirclesScreen } from './screens/CirclesScreen'
import { DiscoverScreen } from './screens/DiscoverScreen'
import { LoginScreen } from './screens/LoginScreen'
import { ModerationScreen } from './screens/ModerationScreen'
import { PersonalityGuideScreen } from './screens/PersonalityGuideScreen'
import { ProfileDetailScreen } from './screens/ProfileDetailScreen'
import { ProfileScreen } from './screens/ProfileScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import {
  backendGuestLogin,
  backendLogin,
  backendFetchSelfProfile,
  backendReadSelfProfile,
  backendRegister,
  backendSaveSelfProfile,
  backendSetLocalSelfProfile,
  backendResetLocalSelfProfile,
  backendAddBlock,
  backendBackfillBlocks,
  backendRepairDiscoverableProfile,
  backendSubmitReport,
  backendRecordSwipe,
  backendSendChatMessage,
  backendLoadChatHistory,
  backendSubscribeToInbox,
  backendLoadBlockedProfileIds,
  backendLoadSettings,
  backendSavePreferences,
  backendSaveSettings,
  backendUploadDataUrlPhotos,
  backendUploadProfilePhoto,
  purgeAllSelfProfileCaches,
  purgeOtherSelfProfileCaches,
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
import {
  PERSONALITY_QUESTIONS,
  compatibilityFromAnswers,
  personalityCodeFromAnswers,
  sanitizeAnswers,
  type PersonalityAnswer,
} from './services/compatibility'
import { createJitsiProviderConfig } from './services/jitsiEmbedConfig'
import {
  SAFETY_CATEGORIES,
  createSafetyReport,
  readBlockedProfileIds,
  readModerationQueue,
  saveBlockedProfileIds,
  saveModerationQueue,
  type ModerationStatus,
  type SafetyCategory,
  type SafetyReport,
} from './services/moderation'
import { PLAN_OPTIONS, type PlanTier } from './spec/lovedateConfig'
import type {
  AppLanguage,
  AppScreen,
  CallLogEntry,
  CallState,
  ChatMessage,
  ChemistryInsights,
  Circle,
  CirclePost,
  CropHandle,
  DatePlan,
  Filters,
  MatchAnalysis,
  ModerationFilter,
  NotificationItem,
  PhotoStudioAnalysis,
  PhotoStudioControls,
  SelfProfile,
  SocialConnection,
  SocialConnections,
  SocialPlatform,
  SwipeDirection,
  SwipeHistory,
  SwipeIntent,
  SwipeLog,
  Toast,
} from './domain'
import {
  AUTH_STORAGE_KEY,
  CALL_HISTORY_STORAGE_KEY,
  CHAT_THREADS_STORAGE_KEY,
  CIRCLES_JOINED_STORAGE_KEY,
  CIRCLES_POSTS_STORAGE_KEY,
  CIRCLES_RSVP_STORAGE_KEY,
  HISTORY_STORAGE_KEY,
  normalizeSelfProfile,
  persistAppLanguage,
  readAppLanguage,
  readAuth,
  readCallHistory,
  readChatThreads,
  readCircleRsvps,
  readCirclePosts,
  readHistory,
  readJoinedCircles,
  readSelfProfile,
  toProfileDraft,
} from './persistence'
import {
  CHILDREN_PLAN_OPTIONS,
  DEFAULT_SELF_PROFILE,
  DEFAULT_SOCIAL_CONNECTIONS,
  DRINKING_OPTIONS,
  EMPTY_SELF_PROFILE,
  GENDER_OPTIONS,
  LOOKING_FOR_OPTIONS,
  ORIENTATION_OPTIONS,
  PETS_OPTIONS,
  POLITICS_OPTIONS,
  PRONOUNS_OPTIONS,
  RELATIONSHIP_INTENT_OPTIONS,
  RELIGION_OPTIONS,
  SMOKING_OPTIONS,
  SOCIAL_PLATFORM_META,
  WORKOUT_OPTIONS,
  ZODIAC_COMPATIBILITY,
  ZODIAC_OPTIONS,
  CIRCLE_SEED,
  PERSONALITY_COGNITIVE_FUNCTIONS,
  PERSONALITY_DIMENSIONS,
  PERSONALITY_TYPE_GUIDE,
  UI_TEXT,
  ZODIAC_DEEP_DIVE,
  ZODIAC_DESCRIPTIONS,
  ZODIAC_EMOJI,
} from './constants'
import {
  analyzePhoto,
  buildCallRoom,
  buildHighResImageUrl,
  buildPath,
  cognitiveFunctionTokens,
  formatShortTime,
  formatUiText,
  getCallDurationLabel,
  getCallOutcomeLabel,
  getProfilePhotos,
  getProfilePrompts,
  getStrongPasswordError,
  loadImageFromSource,
  normalizeProfilePhotos,
  parseRoute,
  readFileAsDataUrl,
  readRouteFromWindow,
  shouldUseHashRouting,
  renderEditedPhoto,
  sanitizeRoomPart,
  toDataUrl,
  toGenderKey,
} from './utils'

// Re-export Filters so legacy imports `from '../App'` still resolve.
export type { Filters }

// UI_TEXT moved to src/constants/uiText.ts.

// PhotoStudio types now live in src/domain/photoStudio.ts (imported above via the domain barrel).

// Storage keys live in src/persistence/keys.ts (imported via the persistence barrel).
const CHAT_RENDER_WINDOW = 120

// CIRCLE_SEED moved to src/constants/circles.ts.

// SOCIAL_PLATFORM_META, DEFAULT_SOCIAL_CONNECTIONS now in src/constants/profile.ts

// buildHighResImageUrl, toDataUrl, getStrongPasswordError, normalizeProfilePhotos
// now live in src/utils/ (imported via the utils barrel).

// Profile constants (initialFilters, ZODIAC_COMPATIBILITY, DEFAULT_SELF_PROFILE, EMPTY_SELF_PROFILE,
// all *_OPTIONS arrays) now live in src/constants/profile.ts.

// PERSONALITY_DIMENSIONS moved to src/constants/personality.ts.

// PERSONALITY_TYPE_GUIDE moved to src/constants/personality.ts.

// PERSONALITY_COGNITIVE_FUNCTIONS moved to src/constants/personality.ts.

// ZODIAC_DESCRIPTIONS moved to src/constants/zodiac.ts.

// ZODIAC_DEEP_DIVE moved to src/constants/zodiac.ts.

// cognitiveFunctionTokens, parseRoute, buildPath, readRouteFromWindow now live in src/utils/.

// readAuth, readHistory now live in src/persistence/ (imported above).

// normalizeSelfProfile, readSelfProfile, toProfileDraft now live in src/persistence/selfProfile.ts.

// readChatThreads, readCallHistory, readJoinedCircles, readCirclePosts, readCircleRsvps now live in src/persistence/.

// formatShortTime, sanitizeRoomPart, buildCallRoom, getCallOutcomeLabel, getCallDurationLabel
// now live in src/utils/ (call.ts / format.ts).

// readAppLanguage, persistAppLanguage now live in src/persistence/language.ts.

// formatUiText, getProfilePhotos, getProfilePrompts, toGenderKey,
// loadImageFromSource, readFileAsDataUrl now live in src/utils/.

// analyzePhoto, renderEditedPhoto now live in src/utils/image.ts.

function App() {
  // Boot-time orphan cleanup: remove the legacy global self-profile key
  // (`lovedate:self-profile`) from devices that used pre-fix builds. The
  // current code never reads it, but leaving it sitting in localStorage is
  // a passive data-at-rest leak on shared devices.
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem('lovedate:self-profile')
    } catch {
      // best-effort
    }
  }

  // Clear any leftover demo/test data on first launch if not authenticated.
  // This ensures new installs start completely empty.
  if (typeof window !== 'undefined') {
    const CLEAN_FLAG = 'lovedate:clean-v1'
    if (!window.localStorage.getItem(CLEAN_FLAG)) {
      const auth = window.localStorage.getItem(AUTH_STORAGE_KEY)
      let isRealAuth = false
      try {
        const parsed = JSON.parse(auth ?? '{}') as { isAuthenticated?: boolean }
        isRealAuth = parsed.isAuthenticated === true
      } catch { /* ignore */ }
      if (!isRealAuth) {
        ;[
          HISTORY_STORAGE_KEY,
          CHAT_THREADS_STORAGE_KEY,
          CALL_HISTORY_STORAGE_KEY,
          CIRCLES_JOINED_STORAGE_KEY,
          CIRCLES_POSTS_STORAGE_KEY,
          CIRCLES_RSVP_STORAGE_KEY,
          'lovedate:blocked-profiles',
          'lovedate:moderation-queue',
        ].forEach((key) => window.localStorage.removeItem(key))
      }
      window.localStorage.setItem(CLEAN_FLAG, '1')
    }
  }

  const initialRoute = readRouteFromWindow()
  const initialAuth = readAuth()
  const initialSelfProfile = readSelfProfile(initialAuth.email)

  // Toasts must come first — other hooks (useAuth, useChatState handlers,
  // etc.) take pushToast as a callback so transient errors can surface
  // anywhere in the app.
  const {
    toasts,
    notifications,
    pushToast,
    pushNotification,
    markAllNotificationsRead,
  } = useToasts()

  // Always require fresh login on cold start. We keep the saved email so the
  // login form is pre-filled, but never auto-resume a session.
  const [screen, setScreen] = useState<AppScreen>('login')
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(initialRoute.profileId)
  const [previousScreen, setPreviousScreen] = useState<AppScreen>('discover')

  // Auth state + handlers live in useAuth — wired in below, after pushToast
  // and navigate are defined (so onSignedIn/onSignedOut can use them).
  // Profile editor + photo studio state moves into useProfileEditor.
  const profileEditor = useProfileEditor(initialSelfProfile)
  const {
    selfProfile, setSelfProfile,
    profileDraft, setProfileDraft,
    profileSaveStatus, setProfileSaveStatus,
    profileSaveErrors, setProfileSaveErrors,
    photoUrlInput, setPhotoUrlInput,
    photoStudioSource, setPhotoStudioSource,
    photoStudioAnalysis, setPhotoStudioAnalysis,
    photoStudioControls, setPhotoStudioControls,
    photoStudioBusy, setPhotoStudioBusy,
    isDraggingCrop, setIsDraggingCrop,
  } = profileEditor

  // Deck state + drag gesture + pure derivations now live in useDeck.
  const deck = useDeck()
  const {
    allProfiles,
    loadingProfiles,
    loadError,
    index,
    filters,
    dragX,
    dragY,
    isDragging,
    isResolvingSwipe,
    exitDirection,
    lastIntent,
    rightBadgeOpacity,
    leftBadgeOpacity,
    setAllProfiles,
    setIndex,
    setFilters,
    setDragX,
    setDragY,
    setIsDragging,
    setIsResolvingSwipe,
    setExitDirection,
    setLastIntent,
    loadProfiles,
    resetDrag,
    getCardStyle,
  } = deck
  const dragStart = deck.dragStart
  const [history, setHistory] = useState<SwipeHistory>(() => readHistory())
  const [activeMatch, setActiveMatch] = useState<Profile | null>(null)
  const [swipeLog, setSwipeLog] = useState<SwipeLog[]>([])

  // Chat state moves into useChatState. callHistory stays in App.tsx
  // for now (used by both chat + call modal coordination).
  const chat = useChatState()
  const {
    chatThreads, setChatThreads,
    activeChatId, setActiveChatId,
    chatDraft, setChatDraft,
    chatSearch, setChatSearch,
    chatAttachmentDraft, setChatAttachmentDraft,
    isRecordingVoice, setIsRecordingVoice,
    showFullChatHistory, setShowFullChatHistory,
    aiCoachSuggestions, setAiCoachSuggestions,
    aiCoachLoading, setAiCoachLoading,
    aiDatePlans, setAiDatePlans,
    aiDatePlannerLoading, setAiDatePlannerLoading,
    unreadChats, setUnreadChats,
    matchQueueIds, setMatchQueueIds,
  } = chat
  const [callHistory, setCallHistory] = useState<CallLogEntry[]>(() => readCallHistory())
  // Circles UI state moves into useCirclesState.
  const circles = useCirclesState()
  const {
    circleSearch, setCircleSearch,
    joinedCircleIds, setJoinedCircleIds,
    circlePosts, setCirclePosts,
    circlePostDraft, setCirclePostDraft,
    selectedCircleId, setSelectedCircleId,
    circleRsvps, setCircleRsvps,
  } = circles
  // unreadChats / matchQueueIds / chatAttachmentDraft / showFullChatHistory /
  // isRecordingVoice now live in useChatState above.
  const [callState, setCallState] = useState<CallState>({
    active: false,
    type: null,
    status: 'connecting',
    startedAt: 0,
    targetProfileId: null,
    muted: false,
    cameraOff: false,
    roomId: null,
    roomUrl: null,
  })
  const jitsiProvider = useMemo(
    () =>
      createJitsiProviderConfig({
        domain: runtimeConfig.calls.jitsiDomain,
        appId: runtimeConfig.calls.jitsiAppId,
        jwt: runtimeConfig.calls.jitsiJwt,
      }),
    [],
  )
  // Reports / moderation state moves into useReports.
  const reports = useReports()
  const {
    blockedProfileIds, setBlockedProfileIds,
    safetyReports, setSafetyReports,
    reportDraftProfile, setReportDraftProfile,
    reportDraftCategory, setReportDraftCategory,
    reportDraftDetails, setReportDraftDetails,
    activeModerationReportId, setActiveModerationReportId,
    moderationStatusFilter, setModerationStatusFilter,
    moderationSearchQuery, setModerationSearchQuery,
  } = reports
  // notifications + toasts state now live in useToasts (above).
  // boostsLeft + rewindsLeft now in useEngagement.

  // App settings + language + save-status state moves into useAppSettings.
  const appSettings = useAppSettings()
  const {
    settings, setSettings,
    settingsSaveStatus, setSettingsSaveStatus,
    preferenceSaveStatus, setPreferenceSaveStatus,
    appLanguage, setAppLanguage,
  } = appSettings
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null)
  const [lightboxZoom, setLightboxZoom] = useState(1)

  // Phase E3 — AI match scoring overlay. Keyed by profile id. The
  // matchScore service caches results 7 days in localStorage, so even
  // after a reload we only pay the API cost once per profile pair.
  const [aiMatchScores, setAiMatchScores] = useState<Record<number, AiMatchScoreResult>>({})

  const backendMode = getBackendMode()
  // Engagement state (plan tier, like/super-like usage, boost/rewind
  // counters) moves into useEngagement.
  const engagement = useEngagement()
  const {
    activePlan, setActivePlan,
    likeUsage, superLikeUsage,
    refreshEngagementUsage,
    boostsLeft, setBoostsLeft,
    rewindsLeft, setRewindsLeft,
  } = engagement
  const moderationAdminEmails = useMemo(() => {
    const envRaw = (import.meta.env.VITE_MODERATION_ADMIN_EMAILS as string | undefined) ?? ''
    const fallbackAdmins = ['viomediere@gmail.com', 'viorelbox1@gmail.com']
    return Array.from(
      new Set(
        [...envRaw.split(','), ...fallbackAdmins]
          .map((item) => item.trim().toLowerCase())
          .filter((item) => item.length > 0),
      ),
    )
  }, [])
  // isModerationAdmin moved below useAuth() — userEmail is now sourced
  // from there and isn't in scope until after the destructure.

  // dragStart ref now lives in useDeck — see deck.dragStart above.
  const attachmentInputRef = useRef<HTMLInputElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const activeCallLogIdRef = useRef<string | null>(null)
  const callStateRef = useRef<CallState>({
    active: false,
    type: null,
    status: 'connecting',
    startedAt: 0,
    targetProfileId: null,
    muted: false,
    cameraOff: false,
    roomId: null,
    roomUrl: null,
  })
  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const preserveScrollOnExpandRef = useRef<{ top: number; height: number } | null>(null)
  const shouldStickToBottomRef = useRef(true)
  const allProfilesRef = useRef<Profile[]>([])
  const screenRef = useRef<AppScreen>('login')
  const activeChatIdRef = useRef<number | null>(null)
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
  // isDraggingCrop now in useProfileEditor.
  const [activeCropHandle, setActiveCropHandle] = useState<CropHandle | null>(null)
  const [isMovingCrop, setIsMovingCrop] = useState(false)
  const [isRedrawCropMode, setIsRedrawCropMode] = useState(false)

  const copy = UI_TEXT[appLanguage]
  const formatStatusLabel = useCallback(
    (status: 'idle' | 'saving' | 'saved' | 'error') =>
      ({
        idle: copy.common.idleStatus,
        saving: copy.common.savingStatus,
        saved: copy.common.saveStatus,
        error: copy.common.errorStatus,
      })[status],
    [copy],
  )

  // refreshEngagementUsage + its initial effect now live in useEngagement.

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      StatusBar.setOverlaysWebView({ overlay: false })
        .then(() => StatusBar.setStyle({ style: Style.Dark }))
        .then(() => StatusBar.setBackgroundColor({ color: '#141937' }))
        .catch(() => {})
    }
  }, [])

  useEffect(() => {
    callStateRef.current = callState
  }, [callState])

  useEffect(() => {
    persistAppLanguage(appLanguage)
  }, [appLanguage])

  useEffect(() => {
    refreshEngagementUsage(activePlan)
  }, [activePlan, refreshEngagementUsage])

  // pushToast / pushNotification / markAllNotificationsRead now live in useToasts.

  const getMatchAnalysis = useCallback(
    (profile: Profile): MatchAnalysis => {
      const myInterests = selfProfile.interests.map((interest) => interest.toLowerCase())
      const sharedInterests = profile.interests.filter((interest) =>
        myInterests.some((mine) => mine.includes(interest.toLowerCase()) || interest.toLowerCase().includes(mine)),
      )
      const ageGap = Math.abs(selfProfile.age - profile.age)
      const personalityScore = compatibilityFromAnswers(selfProfile.personalityAnswers, profile.personalityAnswers)
      const myZodiacCompat = ZODIAC_COMPATIBILITY[selfProfile.zodiac] ?? []
      const zodiacAligned = myZodiacCompat.includes(profile.zodiac)
      const intentAligned =
        selfProfile.lookingFor.toLowerCase().includes('long') && profile.relationshipGoal === 'Long-term'

      let score = 34
      score += Math.round(personalityScore * 0.32)
      score += Math.min(sharedInterests.length * 6, 18)
      score += Math.max(0, Math.round(8 - ageGap * 1.2))
      score += selfProfile.city.toLowerCase() === profile.city.toLowerCase() ? 8 : profile.distanceKm <= 12 ? 6 : profile.distanceKm <= 30 ? 3 : 0
      score += intentAligned ? 8 : 0
      score += zodiacAligned ? 5 : 0
      score += profile.verified ? 3 : 0
      const finalScore = Math.max(1, Math.min(99, Math.round(score)))

      const myCode = personalityCodeFromAnswers(selfProfile.personalityAnswers)
      const theirCode = personalityCodeFromAnswers(profile.personalityAnswers)
      const reasons: string[] = []
      if (personalityScore >= 82) {
        reasons.push('Your personality rhythm is strongly aligned.')
      } else if (personalityScore >= 68) {
        reasons.push('Your personalities are compatible with a good balance of similarity and contrast.')
      } else {
        reasons.push('You have complementary personality differences that can create spark.')
      }
      if (sharedInterests.length >= 2) {
        reasons.push(`Shared interests: ${sharedInterests.slice(0, 2).join(' and ')}.`)
      }
      if (intentAligned) {
        reasons.push('Both of you are clearly oriented toward long-term connection.')
      }
      if (selfProfile.city.toLowerCase() === profile.city.toLowerCase()) {
        reasons.push('You are in the same city, which makes meeting easier.')
      } else if (profile.distanceKm <= 12) {
        reasons.push('You are close enough for spontaneous plans.')
      }
      if (zodiacAligned) {
        reasons.push(`Zodiac chemistry: ${selfProfile.zodiac} and ${profile.zodiac}.`)
      }
      if (profile.verified) {
        reasons.push('Verified account adds trust signal.')
      }

      const caution =
        !intentAligned && personalityScore < 65
          ? 'Possible mismatch risk: different relationship pace and intent.'
          : null

      return {
        score: finalScore,
        personalityScore,
        sharedInterests,
        intentAligned,
        zodiacAligned,
        ageGap,
        reasons: reasons.slice(0, 4),
        caution,
        pairCode: `${myCode} x ${theirCode}`,
      }
    },
    [selfProfile],
  )

  const getCompatibilityScore = useCallback(
    (profile: Profile): number => getMatchAnalysis(profile).score,
    [getMatchAnalysis],
  )

  const getChemistryInsights = useCallback(
    (profile: Profile): ChemistryInsights => {
      const match = getMatchAnalysis(profile)
      const myCode = personalityCodeFromAnswers(selfProfile.personalityAnswers)
      const myStack = PERSONALITY_COGNITIVE_FUNCTIONS[myCode]
      const theirCode = personalityCodeFromAnswers(profile.personalityAnswers)
      const theirStack = PERSONALITY_COGNITIVE_FUNCTIONS[theirCode]

      let cognitiveOverlapScore = 48
      if (myStack && theirStack) {
        const mine = cognitiveFunctionTokens(myStack)
        const theirs = cognitiveFunctionTokens(theirStack)
        const overlapCount = mine.filter((token) => theirs.includes(token)).length
        const primaryMatch = mine[0] && theirs[0] && mine[0] === theirs[0]
        const supportMatch = mine[1] && theirs[1] && mine[1] === theirs[1]
        cognitiveOverlapScore = Math.min(
          98,
          36 + overlapCount * 14 + (primaryMatch ? 18 : 0) + (supportMatch ? 8 : 0),
        )
      }

      const chemistryScore = Math.max(
        1,
        Math.min(
          99,
          Math.round(
            match.score * 0.58 +
              cognitiveOverlapScore * 0.27 +
              (match.zodiacAligned ? 12 : 0) +
              (match.intentAligned ? 3 : 0),
          ),
        ),
      )

      const summary = match.zodiacAligned
        ? 'Strong chemistry signal from cognitive overlap and zodiac alignment.'
        : 'Good chemistry driven mostly by cognitive-function overlap and compatibility.'

      return {
        chemistryScore,
        cognitiveOverlapScore,
        zodiacAligned: match.zodiacAligned,
        summary,
      }
    },
    [getMatchAnalysis, selfProfile.personalityAnswers],
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
      selfProfile.personalityAnswers.length === PERSONALITY_QUESTIONS.length,
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

      if (shouldUseHashRouting()) {
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

  // Phase D1.1 — auth state + handlers extracted to useAuth.
  // onSignedIn navigates to the home screen; onSignedOut clears the
  // non-auth state that handleSignOut used to reset inline.
  const auth = useAuth({
    pushToast,
    onSignedIn: () => navigate('discover', { replace: true }),
    onSignedOut: () => {
      setActiveMatch(null)
      setActiveChatId(null)
      setCallState({
        active: false,
        type: null,
        status: 'connecting',
        startedAt: 0,
        targetProfileId: null,
        muted: false,
        cameraOff: false,
        roomId: null,
        roomUrl: null,
      })
    },
  })
  const {
    isAuthenticated,
    userEmail,
    loginEmail,
    loginPassword,
    registerPasswordConfirm,
    loginError,
    loginNotice,
    authMode,
    inviteCode,
    loggingIn,
    setLoginEmail,
    setLoginPassword,
    setRegisterPasswordConfirm,
    setAuthMode,
    setInviteCode,
    setLoginError,
    setLoginNotice,
  } = auth
  const handleLoginSubmit = auth.submitLogin
  const handleGuestLogin = auth.guestLogin
  const handleSignOut = auth.signOut
  const handleExitApp = auth.exitApp
  const handleUseDevAccount = auth.useDevAccount
  const handleResetDevAccount = auth.resetDevAccount

  const isModerationAdmin = useMemo(
    () => moderationAdminEmails.includes(userEmail.trim().toLowerCase()),
    [moderationAdminEmails, userEmail],
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

  }, [isAuthenticated, screen, isModerationAdmin, navigate])

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

  useEffect(() => {
    window.localStorage.setItem(CALL_HISTORY_STORAGE_KEY, JSON.stringify(callHistory))
  }, [callHistory])

  useEffect(() => {
    window.localStorage.setItem(CIRCLES_JOINED_STORAGE_KEY, JSON.stringify(joinedCircleIds))
  }, [joinedCircleIds])

  useEffect(() => {
    window.localStorage.setItem(CIRCLES_POSTS_STORAGE_KEY, JSON.stringify(circlePosts))
  }, [circlePosts])

  useEffect(() => {
    window.localStorage.setItem(CIRCLES_RSVP_STORAGE_KEY, JSON.stringify(circleRsvps))
  }, [circleRsvps])

  useEffect(() => {
    saveBlockedProfileIds(blockedProfileIds)
  }, [blockedProfileIds])

  useEffect(() => {
    saveModerationQueue(safetyReports)
  }, [safetyReports])

  useEffect(() => {
    if (safetyReports.length === 0) {
      setActiveModerationReportId(null)
      return
    }
    if (!activeModerationReportId || !safetyReports.some((item) => item.id === activeModerationReportId)) {
      const first = safetyReports.slice().sort((a, b) => b.createdAt - a.createdAt)[0]
      setActiveModerationReportId(first?.id ?? null)
    }
  }, [safetyReports, activeModerationReportId, setActiveModerationReportId])

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }

    // Synchronous local-cache read first so the profile screen renders
    // instantly without a flash of empty/default data.
    const loaded = readSelfProfile(userEmail)
    setSelfProfile(loaded)
    setProfileDraft(toProfileDraft(loaded))

    // Async cloud fetch: pulls the canonical copy from Supabase. On a
    // fresh device this is the only way to recover the user's profile.
    // On an existing device this brings in changes made elsewhere.
    let cancelled = false
    void backendFetchSelfProfile(userEmail)
      .then((cloudProfile) => {
        if (cancelled || !cloudProfile) {
          return
        }
        const normalized = normalizeSelfProfile(cloudProfile)
        setSelfProfile(normalized)
        setProfileDraft(toProfileDraft(normalized))
      })
      .catch(() => {
        // Offline or transient error — local cache remains authoritative
        // until the next successful fetch.
      })

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, userEmail, setProfileDraft, setSelfProfile])

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }
    let cancelled = false
    void backendLoadSettings()
      .then((loaded) => {
        if (cancelled || !loaded) {
          return
        }
        setSettings(loaded)
      })
      .catch(() => {
        // Offline or transient error — defaults / local cache stand in.
      })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, userEmail, setSettings])

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }
    let cancelled = false
    // Hydrate the block list from the cloud, merging with anything we have
    // locally (which may include blocks made before B3 shipped). Backfill
    // those local-only entries to the cloud so the next device sees them.
    void (async () => {
      const cloud = await backendLoadBlockedProfileIds()
      if (cancelled) return
      const local = readBlockedProfileIds()
      const localOnly = local.filter((id) => !cloud.includes(id))
      if (localOnly.length > 0) {
        void backendBackfillBlocks(localOnly)
      }
      const merged = Array.from(new Set([...cloud, ...local])).sort((a, b) => a - b)
      setBlockedProfileIds(merged)
    })()
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, userEmail, setBlockedProfileIds])

  // loadProfiles now lives in useDeck.

  useEffect(() => {
    void loadProfiles()
  }, [loadProfiles])

  // Cloud-backed match list. Run on every authed mount so matches survive
  // reinstall — the local history state starts empty after a wipe, but the
  // cloud knows both sides right-swiped. Merge the returned profiles into
  // allProfiles (deck filter excludes already-swiped, so matches wouldn't
  // be there otherwise) and into history.matchIds. Seed empty chat threads
  // for any match that doesn't already have one.
  useEffect(() => {
    if (!isAuthenticated) {
      return
    }
    let cancelled = false
    void (async () => {
      const matches = await getMyMatches()
      if (cancelled || matches.length === 0) {
        return
      }
      const normalized = matches.map(normalizeProfilePhotos)
      setAllProfiles((current) => {
        const byId = new Map<number, Profile>(current.map((p) => [p.id, p]))
        for (const m of normalized) {
          if (!byId.has(m.id)) {
            byId.set(m.id, m)
          }
        }
        return Array.from(byId.values())
      })
      setHistory((current) => {
        const existing = new Set(current.matchIds)
        const merged = [...current.matchIds]
        for (const m of normalized) {
          if (!existing.has(m.id)) {
            merged.push(m.id)
          }
        }
        return { ...current, matchIds: merged }
      })
      setChatThreads((current) => {
        const next = { ...current }
        for (const m of normalized) {
          if (!(m.id in next)) {
            next[m.id] = []
          }
        }
        return next
      })
    })()
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, setAllProfiles, setChatThreads])

  useEffect(() => {
    allProfilesRef.current = allProfiles
  }, [allProfiles])

  useEffect(() => {
    screenRef.current = screen
  }, [screen])

  useEffect(() => {
    activeChatIdRef.current = activeChatId
  }, [activeChatId])

  // Phase C3 — subscribe to inbox while authenticated. Realtime fires for
  // every message where the current user is the recipient; the callback
  // looks up the sender's local profile.id and appends to the thread.
  // dedups by cloudId so a history reload + realtime arrival don't double.
  useEffect(() => {
    if (!isAuthenticated) {
      return
    }
    const unsubscribe = backendSubscribeToInbox((incoming) => {
      const senderProfile = allProfilesRef.current.find(
        (profile) => profile.authUserId === incoming.senderId,
      )
      if (!senderProfile) {
        return
      }
      setChatThreads((current) => {
        const thread = current[senderProfile.id] ?? []
        if (thread.some((message) => message.cloudId === incoming.id)) {
          return current
        }
        return {
          ...current,
          [senderProfile.id]: [
            ...thread,
            {
              id: Date.now() + Math.floor(Math.random() * 1000),
              cloudId: incoming.id,
              sender: 'them',
              text: incoming.text,
              createdAt: incoming.createdAt,
              attachment: incoming.attachment ?? undefined,
              status: 'read',
            },
          ],
        }
      })
      const isOpen =
        screenRef.current === 'chats' && activeChatIdRef.current === senderProfile.id
      if (!isOpen) {
        setUnreadChats((current) => ({
          ...current,
          [senderProfile.id]: (current[senderProfile.id] ?? 0) + 1,
        }))
        pushNotification({
          title: `${senderProfile.name} sent a message`,
          body:
            incoming.text ||
            (incoming.attachment ? `Shared a ${incoming.attachment.kind}` : ''),
          category: 'message',
        })
      }
    })
    return unsubscribe
  }, [isAuthenticated, pushNotification, setChatThreads, setUnreadChats])

  // Phase C3 — load cloud history for the open chat. Replaces the local
  // thread for that profile so messages stay consistent across devices.
  useEffect(() => {
    if (!isAuthenticated || activeChatId == null) {
      return
    }
    const target = allProfilesRef.current.find((profile) => profile.id === activeChatId)
    const recipientAuthId = target?.authUserId
    if (!recipientAuthId) {
      return
    }
    let cancelled = false
    void (async () => {
      const history = await backendLoadChatHistory(recipientAuthId)
      if (cancelled) {
        return
      }
      const mapped: ChatMessage[] = history.map((message) => ({
        id: Date.now() + Math.floor(Math.random() * 1000000),
        cloudId: message.id,
        sender: message.sender,
        text: message.text,
        createdAt: message.createdAt,
        attachment: message.attachment ?? undefined,
        status: 'read',
      }))
      setChatThreads((current) => ({ ...current, [activeChatId]: mapped }))
    })()
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, activeChatId, setChatThreads])

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
      const byReviewed = !swipedIds.has(profile.id)
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
  }, [genderFilteredProfiles, filters, swipedIds, blockedProfileIds, getCompatibilityScore])

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }

    let cancelled = false
    const persist = async () => {
      try {
        setPreferenceSaveStatus('saving')
        await backendSavePreferences({ ...filters })
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
  }, [filters, isAuthenticated, setPreferenceSaveStatus])

  useEffect(() => {
    setIndex(0)
    setDragX(0)
    setDragY(0)
    setIsDragging(false)
    setExitDirection(null)
    setIsResolvingSwipe(false)
    dragStart.current = null
  }, [filters, dragStart, setDragX, setDragY, setExitDirection, setIndex, setIsDragging, setIsResolvingSwipe])

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

    // On phone, allow activeChatId to be null — null means "show the
    // chat list view". Auto-selecting the first match here is what
    // makes the chat back button appear broken: user taps back, this
    // effect resets activeChatId to matchedProfiles[0].id, user never
    // sees the list. On desktop the right pane needs something to
    // show, so the auto-select still applies.
    const isPhone =
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 768px)').matches
    if (isPhone && activeChatId === null) return

    const stillExists = matchedProfiles.some((profile) => profile.id === activeChatId)
    if (!stillExists) {
      setActiveChatId(isPhone ? null : matchedProfiles[0].id)
    }
  }, [matchedProfiles, activeChatId, setActiveChatId])

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
  }, [screen, activeChatId, setMatchQueueIds, setUnreadChats])

  useEffect(() => {
    setShowFullChatHistory(false)
    shouldStickToBottomRef.current = true
  }, [activeChatId, setShowFullChatHistory])

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

  // Phase E3 — fetch AI score for the currently-visible candidates.
  // Only the topProfile (Discover front card) and selectedDetailProfile
  // (full-profile modal) actually display match analysis; everything
  // else uses the heuristic sort score. Fetch fires once per profile
  // and caches in service-level localStorage for 7 days.
  useEffect(() => {
    if (!isAuthenticated) return
    const candidates = [topProfile, selectedDetailProfile].filter(
      (p): p is Profile => Boolean(p),
    )
    let cancelled = false
    for (const candidate of candidates) {
      if (aiMatchScores[candidate.id]) continue
      void (async () => {
        const result = await backendInvokeMatchScore({
          selfProfile: {
            name: selfProfile.name,
            age: selfProfile.age,
            city: selfProfile.city,
            vibe: selfProfile.vibe,
            bio: selfProfile.bio,
            interests: selfProfile.interests,
            relationshipGoal: selfProfile.lookingFor,
            zodiac: selfProfile.zodiac,
            workout: selfProfile.workout,
            drinking: selfProfile.drinking,
            smoking: selfProfile.smoking,
            pets: selfProfile.pets,
            religion: selfProfile.religion,
            politics: selfProfile.politics,
            childrenPlan: selfProfile.childrenPlan,
          },
          candidateProfile: {
            id: candidate.id,
            name: candidate.name,
            age: candidate.age,
            city: candidate.city,
            vibe: candidate.vibe,
            bio: candidate.bio,
            interests: candidate.interests,
            relationshipGoal: candidate.relationshipGoal,
            zodiac: candidate.zodiac,
          },
        })
        if (cancelled || !result) return
        setAiMatchScores((prev) =>
          prev[candidate.id] ? prev : { ...prev, [candidate.id]: result },
        )
      })()
    }
    return () => {
      cancelled = true
    }
  }, [topProfile, selectedDetailProfile, selfProfile, isAuthenticated, aiMatchScores])

  const topProfileMatchAnalysis = useMemo(() => {
    if (!topProfile) return null
    const base = getMatchAnalysis(topProfile)
    const ai = aiMatchScores[topProfile.id]
    if (!ai) return base
    return {
      ...base,
      score: ai.score,
      reasons: ai.reasons,
      caution: ai.redFlags.length > 0 ? ai.redFlags.join(' · ') : base.caution,
    }
  }, [topProfile, getMatchAnalysis, aiMatchScores])
  const topProfileChemistry = useMemo(
    () => (topProfile ? getChemistryInsights(topProfile) : null),
    [topProfile, getChemistryInsights],
  )
  const selectedDetailMatchAnalysis = useMemo(() => {
    if (!selectedDetailProfile) return null
    const base = getMatchAnalysis(selectedDetailProfile)
    const ai = aiMatchScores[selectedDetailProfile.id]
    if (!ai) return base
    return {
      ...base,
      score: ai.score,
      reasons: ai.reasons,
      caution: ai.redFlags.length > 0 ? ai.redFlags.join(' · ') : base.caution,
    }
  }, [selectedDetailProfile, getMatchAnalysis, aiMatchScores])
  const selectedDetailChemistry = useMemo(
    () => (selectedDetailProfile ? getChemistryInsights(selectedDetailProfile) : null),
    [selectedDetailProfile, getChemistryInsights],
  )
  const upcoming = useMemo(() => filteredProfiles.slice(index + 1, index + 3), [filteredProfiles, index])

  // resetDrag now lives in useDeck.

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
  }, [setChatThreads, setMatchQueueIds, setUnreadChats])

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
            [profile.id]: [],
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
    [addSwipeHistory, pushNotification, pushToast, setChatThreads, setMatchQueueIds, setUnreadChats],
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

      window.setTimeout(async () => {
        setIndex((current) => current + 1)
        setExitDirection(null)
        resetDrag()

        try {
          await backendRecordSwipe(swipedProfile.id, direction)
          const wasMatch =
            direction === 'right' ? await resolveMatch(swipedProfile.id) : false
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
      setExitDirection,
      setIndex,
      setIsResolvingSwipe,
      setLastIntent,
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
    setIndex,
    setLastIntent,
    setRewindsLeft,
  ])

  const sendChatMessage = () => {
    const text = chatDraft.trim()
    if (!selectedChatProfile || (text.length === 0 && !chatAttachmentDraft)) {
      return
    }
    shouldStickToBottomRef.current = true

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
    const attachmentForSend = chatAttachmentDraft ?? undefined

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
            attachment: attachmentForSend,
            status: 'sending',
          },
        ],
      }
    })
    setChatDraft('')
    setChatAttachmentDraft(null)

    const recipientAuthId = selectedChatProfile.authUserId
    if (!recipientAuthId) {
      pushToast('Cannot send to this profile yet (no linked account).', 'error')
      return
    }
    const targetProfileId = selectedChatProfile.id

    void backendSendChatMessage({
      recipientId: recipientAuthId,
      text: composedText,
      attachment: attachmentForSend ?? null,
    })
      .then((sent) => {
        if (!sent) {
          pushToast('Message did not reach the cloud. Try again.', 'error')
          return
        }
        setChatThreads((current) => {
          const currentThread = current[targetProfileId] ?? []
          return {
            ...current,
            [targetProfileId]: currentThread.map((message) =>
              message.id === baseId
                ? { ...message, status: 'sent' as const, cloudId: sent.id }
                : message,
            ),
          }
        })
      })
      .catch(() => {
        pushToast('Message failed to sync.', 'error')
      })
  }

  const generateAiCoachSuggestions = useCallback(() => {
    if (!selectedChatProfile) {
      return
    }

    const target = selectedChatProfile
    setAiCoachLoading(true)

    const buildTemplatedFallback = (): string[] => {
      const thread = chatThreads[target.id] ?? []
      const lastThem = [...thread].reverse().find((message) => message.sender === 'them')
      const interest = target.interests[0] ?? 'coffee'
      const interestTwo = target.interests[1] ?? 'music'
      const chemistry = getChemistryInsights(target).chemistryScore
      const localTypeCode = personalityCodeFromAnswers(target.personalityAnswers)
      const typeLabel =
        PERSONALITY_TYPE_GUIDE.find((type) => type.code === localTypeCode)?.label ?? localTypeCode
      const zodiac = target.zodiac

      const suggestions: string[] = []
      if (lastThem?.text?.includes('?')) {
        suggestions.push(
          `Great question. I’d love to tell you more - and I’m curious about your take too. What’s your favorite ${interest} spot lately?`,
        )
      }
      suggestions.push(
        `You seem like a ${typeLabel.toLowerCase()} and I like that energy. Want to do a quick ${interest} plan this week and see how we vibe live?`,
      )
      suggestions.push(
        `I noticed our chemistry score is around ${chemistry}% - I’m into this connection. What kind of date feels most “you”: ${interest} or ${interestTwo}?`,
      )
      suggestions.push(
        `Okay ${zodiac} energy detected. I vote we keep this fun: one playful question each and the loser plans the first date.`,
      )
      return suggestions.slice(0, 3)
    }

    void (async () => {
      try {
        const thread = chatThreads[target.id] ?? []
        const recent = thread
          .slice(-10)
          .map((message) => ({
            sender: message.sender,
            text: message.text,
          }))
        const aiSuggestions = await backendInvokeIcebreaker({
          selfProfile: {
            name: selfProfile.name,
            age: selfProfile.age,
            city: selfProfile.city,
            vibe: selfProfile.vibe,
            bio: selfProfile.bio,
            interests: selfProfile.interests,
            relationshipGoal: selfProfile.relationshipIntent,
            zodiac: selfProfile.zodiac,
          },
          otherProfile: {
            id: target.id,
            name: target.name,
            age: target.age,
            city: target.city,
            vibe: target.vibe,
            bio: target.bio,
            interests: target.interests,
            relationshipGoal: target.relationshipGoal,
            zodiac: target.zodiac,
          },
          chatExcerpt: recent,
        })
        const next = aiSuggestions && aiSuggestions.length > 0
          ? aiSuggestions.slice(0, 3)
          : buildTemplatedFallback()
        setAiCoachSuggestions(next)
      } catch {
        setAiCoachSuggestions(buildTemplatedFallback())
      } finally {
        setAiCoachLoading(false)
      }
    })()
  }, [
    selectedChatProfile,
    chatThreads,
    selfProfile,
    getChemistryInsights,
    setAiCoachLoading,
    setAiCoachSuggestions,
  ])

  const generateAiDatePlans = useCallback(() => {
    if (!selectedChatProfile) {
      return
    }

    setAiDatePlannerLoading(true)
    window.setTimeout(() => {
      const chemistry = getChemistryInsights(selectedChatProfile).chemistryScore
      const city = selectedChatProfile.city || selfProfile.city || 'your city'
      const sharedInterests = selectedChatProfile.interests.filter((interest) =>
        selfProfile.interests.some(
          (mine) =>
            mine.toLowerCase().includes(interest.toLowerCase()) ||
            interest.toLowerCase().includes(mine.toLowerCase()),
        ),
      )
      const anchorInterest = sharedInterests[0] ?? selectedChatProfile.interests[0] ?? 'coffee'
      const anchorInterestTwo = sharedInterests[1] ?? selectedChatProfile.interests[1] ?? 'music'

      const vibeTone =
        chemistry >= 78
          ? 'playful and flirty'
          : chemistry >= 62
            ? 'warm and curious'
            : 'light and low-pressure'

      const plans: DatePlan[] = [
        {
          id: `micro-date-${selectedChatProfile.id}`,
          title: 'Golden Hour Micro-Date',
          placeType: `${anchorInterest} + scenic walk`,
          budget: '$',
          duration: '60-90 min',
          pitch: `A ${vibeTone} first meetup: quick ${anchorInterest} stop, then a short walk in ${city}.`,
          message: `I have an idea: a ${vibeTone} first meetup this week - ${anchorInterest} and a short golden-hour walk in ${city}. 60-90 minutes, easy vibe. What day works for you?`,
        },
        {
          id: `culture-date-${selectedChatProfile.id}`,
          title: 'Culture + Conversation',
          placeType: `gallery or museum + ${anchorInterestTwo}`,
          budget: '$$',
          duration: '2-3 hours',
          pitch: `A deeper date with conversation moments and shared taste around ${anchorInterestTwo}.`,
          message: `Would you be up for a culture date? We could do a gallery/museum stop and then ${anchorInterestTwo} after. I think that would fit our vibe really well.`,
        },
        {
          id: `signature-date-${selectedChatProfile.id}`,
          title: 'Signature Night Plan',
          placeType: `${anchorInterest} experience + dinner`,
          budget: '$$$',
          duration: '3-4 hours',
          pitch: `A more curated date flow designed around your chemistry and shared energy.`,
          message: `I want to plan a proper signature date: start with a ${anchorInterest} experience and continue with dinner. If you like, I can send you two concrete options and you pick your favorite.`,
        },
      ]

      setAiDatePlans(plans)
      setAiDatePlannerLoading(false)
    }, 520)
  }, [selectedChatProfile, getChemistryInsights, selfProfile.city, selfProfile.interests, setAiDatePlannerLoading, setAiDatePlans])

  useEffect(() => {
    setAiCoachSuggestions([])
    setAiCoachLoading(false)
    setAiDatePlans([])
    setAiDatePlannerLoading(false)
  }, [selectedChatProfile?.id, setAiCoachLoading, setAiCoachSuggestions, setAiDatePlannerLoading, setAiDatePlans])

  const handleAttachmentPick = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

    try {
      const dataUrl = await toDataUrl(file)
      setChatAttachmentDraft({
        kind: isImage ? 'image' : 'video',
        url: dataUrl,
        name: file.name,
      })
    } catch {
      pushToast('Could not read this file. Please try another one.', 'error')
    }
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
        void toDataUrl(blob)
          .then((dataUrl) => {
            setChatAttachmentDraft({
              kind: 'audio',
              url: dataUrl,
              name: `voice-note-${new Date().toISOString()}.webm`,
            })
          })
          .catch(() => {
            pushToast('Could not read voice note. Please try again.', 'error')
          })
          .finally(() => {
            setIsRecordingVoice(false)
            stream.getTracks().forEach((track) => track.stop())
          })
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
    const rawRoomId = buildCallRoom(userEmail || 'guest@lovedate.app', selectedChatProfile.id, type)
    const roomId = jitsiProvider.formatRoomName(rawRoomId)
    const roomUrl = jitsiProvider.buildRoomUrl(rawRoomId)
    const now = Date.now()
    const logId = `call_${now}_${selectedChatProfile.id}`
    const nextCallEntry: CallLogEntry = {
      id: logId,
      profileId: selectedChatProfile.id,
      profileName: selectedChatProfile.name,
      type,
      roomId,
      roomUrl,
      startedAt: now,
      answeredAt: null,
      endedAt: null,
      outcome: 'initiated',
    }
    activeCallLogIdRef.current = logId
    setCallHistory((current) => [nextCallEntry, ...current].slice(0, 200))
    setCallState({
      active: true,
      type,
      status: 'connecting',
      startedAt: now,
      targetProfileId: selectedChatProfile.id,
      muted: false,
      cameraOff: type === 'audio',
      roomId,
      roomUrl,
    })
    setChatThreads((current) => {
      const currentThread = current[selectedChatProfile.id] ?? []
      return {
        ...current,
        [selectedChatProfile.id]: [
          ...currentThread,
          {
            id: now,
            sender: 'me',
            text: `Private ${type} call invite (no phone number): ${roomUrl}`,
            callMeta: {
              type,
              roomId,
              roomUrl,
              event: 'invite',
            },
            createdAt: now,
            status: 'sent',
          },
        ],
      }
    })
    pushToast(
      jitsiProvider.needsModeratorAuth
        ? 'Private call link created, but meet.jit.si may require a moderator login. Configure JaaS for reliable calls.'
        : 'Private call link created and shared in chat.',
      jitsiProvider.needsModeratorAuth ? 'info' : 'success',
    )
  }

  const markCallConnected = useCallback(() => {
    const connectedAt = Date.now()
    const logId = activeCallLogIdRef.current
    if (logId) {
      setCallHistory((current) =>
        current.map((entry) =>
          entry.id === logId && !entry.answeredAt
            ? {
                ...entry,
                outcome: 'connected',
                answeredAt: connectedAt,
              }
            : entry,
        ),
      )
    }
    setCallState((current) => (current.active ? { ...current, status: 'live' } : current))
  }, [])

  const markCallFailed = useCallback(() => {
    const logId = activeCallLogIdRef.current
    if (logId) {
      setCallHistory((current) =>
        current.map((entry) =>
          entry.id === logId && entry.outcome !== 'connected' && entry.outcome !== 'ended'
            ? {
                ...entry,
                outcome: 'failed',
              }
            : entry,
        ),
      )
    }
    setCallState((current) => (current.active ? { ...current, status: 'error' } : current))
  }, [])

  const setCallMuted = useCallback((muted: boolean) => {
    setCallState((current) => (current.active ? { ...current, muted } : current))
  }, [])

  const setCallCameraOff = useCallback((cameraOff: boolean) => {
    setCallState((current) => (current.active ? { ...current, cameraOff } : current))
  }, [])

  const endCall = useCallback(() => {
    const snapshot = callStateRef.current
    const activeType = snapshot.type
    const activeTargetProfileId = snapshot.targetProfileId
    const activeRoomId = snapshot.roomId
    const activeRoomUrl = snapshot.roomUrl
    const activeStatus = snapshot.status
    const endedAt = Date.now()
    const logId = activeCallLogIdRef.current
    if (logId) {
      setCallHistory((current) =>
        current.map((entry) =>
          entry.id === logId
            ? {
                ...entry,
                outcome: entry.answeredAt ? 'ended' : entry.outcome === 'failed' ? 'failed' : 'missed',
                endedAt,
              }
            : entry,
        ),
      )
    }
    if (activeTargetProfileId && activeType && activeRoomId && activeRoomUrl) {
      const callMetaEvent: 'ended' | 'missed' = activeStatus === 'live' ? 'ended' : 'missed'
      setChatThreads((current) => {
        const currentThread = current[activeTargetProfileId] ?? []
        return {
          ...current,
          [activeTargetProfileId]: [
            ...currentThread,
            {
              id: endedAt,
              sender: 'me',
              text: activeStatus === 'live' ? `${activeType} call ended.` : `${activeType} call was missed.`,
              callMeta: {
                type: activeType,
                roomId: activeRoomId,
                roomUrl: activeRoomUrl,
                event: callMetaEvent,
              },
              createdAt: endedAt,
              status: 'sent',
            },
          ],
        }
      })
    }
    activeCallLogIdRef.current = null
    setCallState({
      active: false,
      type: null,
      status: 'connecting',
      startedAt: 0,
      targetProfileId: null,
      muted: false,
      cameraOff: false,
      roomId: null,
      roomUrl: null,
    })
  }, [setChatThreads])

  const openCallRoom = useCallback(() => {
    if (!callState.roomUrl) {
      return
    }
    markCallConnected()
    window.open(callState.roomUrl, '_blank', 'noopener,noreferrer')
  }, [callState.roomUrl, markCallConnected])

  const copyCallInvite = async () => {
    if (!callState.roomUrl) {
      return
    }
    try {
      await navigator.clipboard.writeText(callState.roomUrl)
      pushToast('Call invite link copied.', 'success')
    } catch {
      pushToast('Copy failed. Please copy the link manually from chat.', 'error')
    }
  }

  const rejoinCallFromHistory = (entry: CallLogEntry) => {
    activeCallLogIdRef.current = entry.id
    setCallState({
      active: true,
      type: entry.type,
      status: 'connecting',
      startedAt: entry.startedAt,
      targetProfileId: entry.profileId,
      muted: false,
      cameraOff: entry.type === 'audio',
      roomId: entry.roomId,
      roomUrl: entry.roomUrl,
    })
    pushToast(`Rejoining ${entry.type} call with ${entry.profileName}.`, 'info')
  }

  const closeReportProfileDialog = useCallback(() => {
    setReportDraftProfile(null)
    setReportDraftCategory('spam')
    setReportDraftDetails('')
  }, [setReportDraftCategory, setReportDraftDetails, setReportDraftProfile])

  const reportProfile = (profile: Profile) => {
    setReportDraftProfile(profile)
    setReportDraftCategory('spam')
    setReportDraftDetails('')
  }

  const submitProfileReport = () => {
    if (!reportDraftProfile) {
      return
    }

    const report = createSafetyReport({
      profile: reportDraftProfile,
      category: reportDraftCategory,
      details: reportDraftDetails.trim(),
      reporterEmail: userEmail || 'guest@lovedate.app',
    })
    setSafetyReports((current) => [report, ...current].slice(0, 200))
    void backendSubmitReport({
      reportedProfileId: report.profileId,
      reportedProfileName: report.profileName,
      category: report.category,
      details: report.details,
      profileSnapshot: report.profileSnapshot,
    })
    pushNotification({
      title: `Report submitted for ${reportDraftProfile.name}`,
      body: `Category: ${reportDraftCategory}`,
      category: 'safety',
    })
    pushToast(`Report submitted for ${reportDraftProfile.name}.`, 'success')
    closeReportProfileDialog()
  }

  const updateReportStatus = (reportId: string, status: ModerationStatus) => {
    setSafetyReports((current) =>
      current.map((item) => {
        if (item.id !== reportId) {
          return item
        }
        return {
          ...item,
          status,
          reviewedAt: status === 'open' ? null : Date.now(),
          reviewerEmail: status === 'open' ? null : userEmail,
        }
      }),
    )
    pushToast(`Report moved to ${status}.`, 'info')
  }

  const blockProfileById = (profileId: number, profileName = 'Profile') => {
    setBlockedProfileIds((current) => (current.includes(profileId) ? current : [...current, profileId]))
    void backendAddBlock(profileId)
    setChatThreads((current) => {
      const clone = { ...current }
      delete clone[profileId]
      return clone
    })
    setUnreadChats((current) => {
      const clone = { ...current }
      delete clone[profileId]
      return clone
    })
    setHistory((current) => ({
      likedIds: current.likedIds.filter((id) => id !== profileId),
      passedIds: current.passedIds.filter((id) => id !== profileId),
      matchIds: current.matchIds.filter((id) => id !== profileId),
    }))
    if (activeChatId === profileId) {
      setActiveChatId(null)
    }
    pushToast(`${profileName} blocked.`, 'info')
  }

  const blockProfile = (profile: Profile) => {
    blockProfileById(profile.id, profile.name)
  }

  const resolveAndBlockReport = (report: SafetyReport) => {
    updateReportStatus(report.id, 'resolved')
    blockProfileById(report.profileId, report.profileName)
    pushNotification({
      title: `Resolved report for ${report.profileName}`,
      body: 'Profile blocked and report marked as resolved.',
      category: 'safety',
    })
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

  // Separate pointercancel handler: when the browser hijacks the gesture
  // for native scrolling (touch-action: pan-y on phone), it fires
  // pointercancel — NOT pointerup. Treating that as a tap and opening
  // the full profile is the cause of the 'every scroll attempt opens the
  // profile' bug. Just reset drag state, don't navigate.
  const handlePointerCancel = () => {
    if (!dragStart.current) return
    resetDrag()
  }

  const handlePointerUp = () => {
    if (!dragStart.current) {
      return
    }

    // Tighter threshold (was 14): a real intentional tap moves <6px,
    // anything more is the user attempting to scroll/swipe.
    const tapThreshold = 6
    if (
      Math.abs(dragX) < tapThreshold &&
      Math.abs(dragY) < tapThreshold &&
      topProfile &&
      !isResolvingSwipe &&
      !exitDirection
    ) {
      resetDrag()
      openProfileDetail(topProfile.id, 'discover')
      return
    }

    const threshold = 80
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

      if (event.key === 'Escape' && reportDraftProfile) {
        closeReportProfileDialog()
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
  }, [activeMatch, reportDraftProfile, lightboxPhoto, closeReportProfileDialog, closeLightbox, screen, swipeCard, undoSwipe])

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

    // Side effect: when the user flips Push Notifications on, request
    // permission + subscribe. Reverting the local toggle if denied keeps
    // the UI honest. Flipping off purges the subscription.
    if (key === 'pushNotifications') {
      if (checked) {
        void enablePushNotifications().then((result) => {
          if (!result.ok) {
            setSettings((current) => ({ ...current, pushNotifications: false }))
            const message =
              result.reason === 'denied'
                ? 'Browser blocked notifications. Enable them in site settings.'
                : result.reason === 'unsupported'
                  ? 'Push not supported on this browser/device.'
                  : 'Could not enable push notifications.'
            pushToast(message, 'error')
          } else {
            pushToast('Push notifications enabled.', 'success')
          }
        })
      } else {
        void disablePushNotifications()
      }
    }
  }

  const socialConnectedCount = useMemo(
    () => SOCIAL_PLATFORM_META.filter((platform) => selfProfile.socialConnections[platform.id]?.connected).length,
    [selfProfile.socialConnections],
  )

  const socialMotivationLine = useMemo(() => {
    if (socialConnectedCount >= 4) {
      return 'Ambassador status unlocked: your profile now has maximum social trust signals.'
    }
    if (socialConnectedCount >= 2) {
      return 'Great momentum. Connect one more network to strengthen profile credibility.'
    }
    if (socialConnectedCount === 1) {
      return 'Nice start. Add another social account to improve trust and discoverability.'
    }
    return 'Connect social accounts to build trust and help friends discover you faster on LoveDate.'
  }, [socialConnectedCount])

  const saveSelfProfilePatch = useCallback(
    (nextProfile: SelfProfile, successMessage?: string) => {
      setSelfProfile(nextProfile)
      setProfileDraft(toProfileDraft(nextProfile))
      // Local persistence handled by `backendSaveSelfProfile`; avoid writing
      // the global fallback key which can leak another user's cache.
      void backendSaveSelfProfile(userEmail, nextProfile as unknown as Record<string, unknown>).catch(() => {
        pushToast('Saved locally, but cloud sync failed for profile.', 'error')
      })
      if (successMessage) {
        pushToast(successMessage, 'success')
      }
    },
    [userEmail, pushToast, setProfileDraft, setSelfProfile],
  )

  const suggestSocialHandle = (platform: SocialPlatform): string => {
    const baseFromName = selfProfile.name.toLowerCase().replace(/[^a-z0-9]+/g, '')
    const fallback = baseFromName.length > 0 ? baseFromName : 'lovedateuser'
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
  }

  const setSocialConnectionDecision = (platform: SocialPlatform, connect: boolean) => {
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
  }

  const toggleSocialPromotionOptIn = (checked: boolean) => {
    const nextProfile: SelfProfile = {
      ...selfProfile,
      socialPromotionOptIn: checked,
    }
    saveSelfProfilePatch(nextProfile, checked ? 'Social sharing prompts enabled.' : 'Social sharing prompts paused.')
  }

  const shareLoveDateOnPlatform = async (platform: SocialPlatform) => {
    if (!selfProfile.socialPromotionOptIn) {
      pushToast('Enable social sharing prompts first.', 'info')
      return
    }

    const appUrl = 'https://lovedate-beta.vercel.app'
    const pitch = `I just joined LoveDate. Come find me there.`
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

  const handlePersonalityAnswerChange = (questionIndex: number, answer: PersonalityAnswer) => {
    setProfileDraft((current) => {
      const nextAnswers = [...current.personalityAnswers]
      nextAnswers[questionIndex] = answer
      return {
        ...current,
        personalityAnswers: nextAnswers,
      }
    })
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
      .then(async (editedPhoto) => {
        // Upload to Supabase Storage; fall back to the data URL if upload
        // fails (offline or bucket misconfig) so the draft is never blocked.
        const uploaded = await backendUploadProfilePhoto(editedPhoto)
        const finalPhoto = uploaded ?? editedPhoto

        setProfileDraft((current) => {
          if (current.photos.includes(finalPhoto)) {
            return current
          }

          return {
            ...current,
            photos: [finalPhoto, ...current.photos].slice(0, 9),
          }
        })
        setProfileSaveStatus('idle')
        closePhotoStudio()
        pushToast(
          uploaded ? 'Photo uploaded and added to draft.' : 'Photo added (offline mode — will sync on next save).',
          'success',
        )
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
      const safeAge = Number.isFinite(requestedAge) ? Math.min(99, Math.max(18, requestedAge)) : EMPTY_SELF_PROFILE.age
      const requestedHeight = Number(profileDraft.heightCm)
      const safeHeight = Number.isFinite(requestedHeight) ? Math.min(230, Math.max(130, requestedHeight)) : EMPTY_SELF_PROFILE.heightCm
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
    const personalityAnswers =
      sanitizeAnswers(profileDraft.personalityAnswers).length === PERSONALITY_QUESTIONS.length
        ? (sanitizeAnswers(profileDraft.personalityAnswers) as PersonalityAnswer[])
        : EMPTY_SELF_PROFILE.personalityAnswers

    // Relaxed for beta. Onboarding required-fields flow is a future
    // conversation; for now just need a name so we have something to
    // identify the row by. Everything else can be filled in later.
    const nameLen = profileDraft.name.trim().length
    if (nameLen < 2) {
      setProfileSaveStatus('error')
      setProfileSaveErrors(['Name (need at least 2 characters)'])
      const sections = document.querySelectorAll<HTMLDetailsElement>('.profile-editor-section')
      if (sections.length > 0) sections[0].open = true
      pushToast('Save blocked — Name needs at least 2 characters.', 'error')
      return
    }
    setProfileSaveErrors([])

    const nextProfile: SelfProfile = {
      name: profileDraft.name.trim(),
      age: safeAge,
      city: profileDraft.city.trim() || EMPTY_SELF_PROFILE.city,
      vibe: profileDraft.vibe.trim() || EMPTY_SELF_PROFILE.vibe,
      bio: profileDraft.bio.trim(),
      interests: interests.length > 0 ? interests : EMPTY_SELF_PROFILE.interests,
      pronouns: profileDraft.pronouns.trim() || EMPTY_SELF_PROFILE.pronouns,
      gender: profileDraft.gender.trim() || EMPTY_SELF_PROFILE.gender,
      orientation: profileDraft.orientation.trim() || EMPTY_SELF_PROFILE.orientation,
      lookingFor: profileDraft.lookingFor.trim() || EMPTY_SELF_PROFILE.lookingFor,
      relationshipIntent: profileDraft.relationshipIntent.trim() || EMPTY_SELF_PROFILE.relationshipIntent,
      heightCm: safeHeight,
      jobTitle: profileDraft.jobTitle.trim() || EMPTY_SELF_PROFILE.jobTitle,
      company: profileDraft.company.trim() || EMPTY_SELF_PROFILE.company,
      education: profileDraft.education.trim() || EMPTY_SELF_PROFILE.education,
      hometown: profileDraft.hometown.trim() || EMPTY_SELF_PROFILE.hometown,
      languages: languages.length > 0 ? languages : EMPTY_SELF_PROFILE.languages,
      drinking: profileDraft.drinking.trim() || EMPTY_SELF_PROFILE.drinking,
      smoking: profileDraft.smoking.trim() || EMPTY_SELF_PROFILE.smoking,
      workout: profileDraft.workout.trim() || EMPTY_SELF_PROFILE.workout,
      religion: profileDraft.religion.trim() || EMPTY_SELF_PROFILE.religion,
      politics: profileDraft.politics.trim() || EMPTY_SELF_PROFILE.politics,
      zodiac: profileDraft.zodiac.trim() || EMPTY_SELF_PROFILE.zodiac,
      childrenPlan: profileDraft.childrenPlan.trim() || EMPTY_SELF_PROFILE.childrenPlan,
      pets: profileDraft.pets.trim() || EMPTY_SELF_PROFILE.pets,
      promptOne: profileDraft.promptOne.trim() || EMPTY_SELF_PROFILE.promptOne,
      promptTwo: profileDraft.promptTwo.trim() || EMPTY_SELF_PROFILE.promptTwo,
      promptThree: profileDraft.promptThree.trim() || EMPTY_SELF_PROFILE.promptThree,
      dealbreakers: dealbreakers.length > 0 ? dealbreakers : EMPTY_SELF_PROFILE.dealbreakers,
      instagram: profileDraft.instagram.trim() || EMPTY_SELF_PROFILE.instagram,
      anthem: profileDraft.anthem.trim() || EMPTY_SELF_PROFILE.anthem,
      socialConnections: selfProfile.socialConnections,
      socialPromotionOptIn: profileDraft.socialPromotionOptIn,
      travelMode: profileDraft.travelMode,
      photos: photos.length > 0 ? photos : EMPTY_SELF_PROFILE.photos,
      personalityAnswers,
    }

    setSelfProfile(nextProfile)
    void (async () => {
      // Lazy-migrate any leftover data URLs (from saves predating B2) to
      // Storage URLs before persisting. Failed uploads keep their original
      // data URL so offline saves still work.
      const migratedPhotos = await backendUploadDataUrlPhotos(nextProfile.photos)
      const migratedProfile =
        migratedPhotos === nextProfile.photos
          ? nextProfile
          : { ...nextProfile, photos: migratedPhotos }
      if (migratedPhotos !== nextProfile.photos) {
        setSelfProfile(migratedProfile)
        setProfileDraft(toProfileDraft(migratedProfile))
        // Namespaced local cache will be updated by backendSaveSelfProfile below.
      }
      try {
        await backendSaveSelfProfile(
          userEmail,
          migratedProfile as unknown as Record<string, unknown>,
        )
      } catch {
        pushToast('Saved locally, but cloud sync failed for profile.', 'error')
      }
    })()
    // Local cache persisted via `backendSaveSelfProfile` (called above).
    setProfileDraft(toProfileDraft(nextProfile))
    setProfileSaveStatus('saved')
    pushToast('Profile updated.', 'success')
  }

  // getCardStyle + rightBadgeOpacity + leftBadgeOpacity now live in useDeck.
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
      const messages = chatThreads[profile.id] ?? []
      const last = messages[messages.length - 1]
      return {
        profile,
        lastText: last?.text ?? '',
        lastTime: last ? formatShortTime(last.createdAt) : '',
        unread: unreadChats[profile.id] ?? 0,
      }
    })
  }, [matchedProfiles, chatThreads, unreadChats])

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

  const selectedChatMessages = useMemo(() => {
    if (!selectedChatProfile) {
      return []
    }
    const messages = chatThreads[selectedChatProfile.id] ?? []
    return showFullChatHistory ? messages : messages.slice(-CHAT_RENDER_WINDOW)
  }, [selectedChatProfile, chatThreads, selfProfile.name, showFullChatHistory])

  const selectedChatCallHistory = useMemo(() => {
    if (!selectedChatProfile) {
      return []
    }
    return callHistory.filter((entry) => entry.profileId === selectedChatProfile.id).slice(0, 4)
  }, [selectedChatProfile, callHistory])

  const hiddenChatMessageCount = useMemo(() => {
    if (!selectedChatProfile || showFullChatHistory) {
      return 0
    }
    const messages = chatThreads[selectedChatProfile.id] ?? []
    return Math.max(0, messages.length - CHAT_RENDER_WINDOW)
  }, [selectedChatProfile, chatThreads, selfProfile.name, showFullChatHistory])

  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container || selectedChatMessages.length === 0) {
      return
    }

    if (preserveScrollOnExpandRef.current) {
      const { top, height } = preserveScrollOnExpandRef.current
      const delta = container.scrollHeight - height
      container.scrollTop = top + Math.max(0, delta)
      preserveScrollOnExpandRef.current = null
      return
    }

    if (shouldStickToBottomRef.current) {
      container.scrollTop = container.scrollHeight
    }
  }, [selectedChatMessages])

  const revealOlderMessages = () => {
    const container = messagesContainerRef.current
    if (container) {
      preserveScrollOnExpandRef.current = {
        top: container.scrollTop,
        height: container.scrollHeight,
      }
    }
    setShowFullChatHistory(true)
  }

  const handleMessagesScroll = () => {
    const container = messagesContainerRef.current
    if (!container) {
      return
    }
    const distanceFromBottom = container.scrollHeight - (container.scrollTop + container.clientHeight)
    shouldStickToBottomRef.current = distanceFromBottom < 96
  }

  const filteredCircles = useMemo(() => {
    const query = circleSearch.trim().toLowerCase()
    if (query.length === 0) {
      return CIRCLE_SEED
    }
    return CIRCLE_SEED.filter((circle) => {
      const searchable = [circle.name, circle.theme, circle.description, ...circle.tags].join(' ').toLowerCase()
      return searchable.includes(query)
    })
  }, [circleSearch])

  useEffect(() => {
    if (!filteredCircles.some((circle) => circle.id === selectedCircleId) && filteredCircles.length > 0) {
      setSelectedCircleId(filteredCircles[0].id)
    }
  }, [filteredCircles, selectedCircleId])

  const selectedCircle = useMemo(
    () => CIRCLE_SEED.find((circle) => circle.id === selectedCircleId) ?? filteredCircles[0] ?? null,
    [selectedCircleId, filteredCircles],
  )

  const selectedCirclePosts = useMemo(() => {
    if (!selectedCircle) {
      return []
    }
    return circlePosts
      .filter((post) => post.circleId === selectedCircle.id)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 20)
  }, [circlePosts, selectedCircle])

  const toggleCircleJoin = useCallback((circleId: string) => {
    setJoinedCircleIds((current) =>
      current.includes(circleId) ? current.filter((id) => id !== circleId) : [...current, circleId],
    )
  }, [])

  const toggleCircleRsvp = useCallback((eventId: string) => {
    setCircleRsvps((current) => ({ ...current, [eventId]: !current[eventId] }))
  }, [])

  const publishCirclePost = useCallback(() => {
    if (!selectedCircle) {
      return
    }
    const text = circlePostDraft.trim()
    if (text.length < 8) {
      pushToast('Write at least a short thought before posting.', 'error')
      return
    }
    if (!joinedCircleIds.includes(selectedCircle.id)) {
      pushToast('Join the circle first to post there.', 'error')
      return
    }
    const nextPost: CirclePost = {
      id: `circle_post_${Date.now()}`,
      circleId: selectedCircle.id,
      author: selfProfile.name,
      text,
      createdAt: Date.now(),
    }
    setCirclePosts((current) => [nextPost, ...current])
    setCirclePostDraft('')
    pushToast('Posted to the circle feed.', 'success')
  }, [selectedCircle, circlePostDraft, joinedCircleIds, selfProfile.name, pushToast])

  const unreadNotificationCount = useMemo(
    () => notifications.reduce((count, item) => count + (item.read ? 0 : 1), 0),
    [notifications],
  )

  const navItems: Array<{ key: AppScreen; label: string; badge?: number }> = [
    { key: 'discover', label: copy.nav.discover },
    { key: 'activity', label: copy.nav.activity },
    { key: 'circles', label: copy.nav.circles, badge: joinedCircleIds.length > 0 ? joinedCircleIds.length : undefined },
    { key: 'chats', label: copy.nav.chats, badge: Object.values(unreadChats).reduce((sum, count) => sum + count, 0) },
    {
      key: 'moderation',
      label: copy.nav.moderation,
      badge: isModerationAdmin ? safetyReports.filter((report) => report.status === 'open').length : undefined,
    },
    { key: 'profile', label: copy.nav.profile },
    { key: 'settings', label: copy.nav.settings, badge: unreadNotificationCount },
  ]

  const moderationReportsSorted = useMemo(
    () => safetyReports.slice().sort((a, b) => b.createdAt - a.createdAt),
    [safetyReports],
  )
  const moderationReportsFiltered = useMemo(() => {
    const query = moderationSearchQuery.trim().toLowerCase()
    return moderationReportsSorted.filter((report) => {
      const statusMatches = moderationStatusFilter === 'all' || report.status === moderationStatusFilter
      if (!statusMatches) {
        return false
      }
      if (query.length === 0) {
        return true
      }
      const searchableText = [
        report.profileName,
        report.profileSnapshot.city,
        report.profileSnapshot.vibe,
        report.category,
        report.details,
        report.reporterEmail,
      ]
        .join(' ')
        .toLowerCase()
      return searchableText.includes(query)
    })
  }, [moderationReportsSorted, moderationSearchQuery, moderationStatusFilter])
  const selectedModerationReport = useMemo(() => {
    if (moderationReportsFiltered.length === 0) {
      return null
    }
    if (!activeModerationReportId) {
      return moderationReportsFiltered[0]
    }
    return (
      moderationReportsFiltered.find((report) => report.id === activeModerationReportId) ??
      moderationReportsFiltered[0]
    )
  }, [activeModerationReportId, moderationReportsFiltered])

  const selfPersonalityCode = useMemo(
    () => personalityCodeFromAnswers(selfProfile.personalityAnswers),
    [selfProfile.personalityAnswers],
  )
  const selfTypeGuide = useMemo(
    () => PERSONALITY_TYPE_GUIDE.find((type) => type.code === selfPersonalityCode) ?? null,
    [selfPersonalityCode],
  )
  const selfCognitiveFunctions = useMemo(
    () => PERSONALITY_COGNITIVE_FUNCTIONS[selfPersonalityCode] ?? null,
    [selfPersonalityCode],
  )
  const draftPersonalityCode = useMemo(
    () => personalityCodeFromAnswers(profileDraft.personalityAnswers),
    [profileDraft.personalityAnswers],
  )
  const selectedDetailPersonalityCode = useMemo(
    () => (selectedDetailProfile ? personalityCodeFromAnswers(selectedDetailProfile.personalityAnswers) : null),
    [selectedDetailProfile],
  )
  const selectedDetailTypeGuide = useMemo(
    () =>
      selectedDetailPersonalityCode
        ? PERSONALITY_TYPE_GUIDE.find((type) => type.code === selectedDetailPersonalityCode) ?? null
        : null,
    [selectedDetailPersonalityCode],
  )
  const selectedDetailCognitiveFunctions = useMemo(
    () => (selectedDetailPersonalityCode ? PERSONALITY_COGNITIVE_FUNCTIONS[selectedDetailPersonalityCode] ?? null : null),
    [selectedDetailPersonalityCode],
  )
  const selectedChatPersonalityCode = useMemo(
    () => (selectedChatProfile ? personalityCodeFromAnswers(selectedChatProfile.personalityAnswers) : null),
    [selectedChatProfile],
  )
  const selectedChatTypeGuide = useMemo(
    () =>
      selectedChatPersonalityCode
        ? PERSONALITY_TYPE_GUIDE.find((type) => type.code === selectedChatPersonalityCode) ?? null
        : null,
    [selectedChatPersonalityCode],
  )
  const selectedChatCognitiveFunctions = useMemo(
    () => (selectedChatPersonalityCode ? PERSONALITY_COGNITIVE_FUNCTIONS[selectedChatPersonalityCode] ?? null : null),
    [selectedChatPersonalityCode],
  )
  const selectedChatChemistry = useMemo(
    () => (selectedChatProfile ? getChemistryInsights(selectedChatProfile) : null),
    [selectedChatProfile, getChemistryInsights],
  )

  if (screen === 'login') {
    return (
      <LoginScreen
        appLanguage={appLanguage}
        setAppLanguage={setAppLanguage}
        authMode={authMode}
        setAuthMode={setAuthMode}
        inviteCode={inviteCode}
        setInviteCode={setInviteCode}
        loginEmail={loginEmail}
        setLoginEmail={setLoginEmail}
        loginPassword={loginPassword}
        setLoginPassword={setLoginPassword}
        registerPasswordConfirm={registerPasswordConfirm}
        setRegisterPasswordConfirm={setRegisterPasswordConfirm}
        loginError={loginError}
        setLoginError={setLoginError}
        loginNotice={loginNotice}
        setLoginNotice={setLoginNotice}
        loggingIn={loggingIn}
        onSubmit={handleLoginSubmit}
        onGuestLogin={handleGuestLogin}
        onUseDevAccount={handleUseDevAccount}
        onResetDevAccount={handleResetDevAccount}
      />
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
      <UpdateBanner />
      <BuildChip />
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
        <div className="top-exit-group">
          <button type="button" className="top-exit-btn" onClick={handleSignOut}>
            {copy.common.exitToLogin}
          </button>
          {(Capacitor.isNativePlatform() ||
            (typeof navigator !== 'undefined' &&
              navigator.userAgent.includes('Electron'))) && (
            <button
              type="button"
              className="top-exit-btn top-exit-btn--quit"
              onClick={handleExitApp}
              aria-label="Exit App"
              title="Exit App"
            >
              ⏻
            </button>
          )}
        </div>
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
              {'\u2190'} {copy.common.backToDiscover}
            </button>
            <FilterScreen
              filters={filters}
              setFilters={setFilters}
              cityOptions={cityOptions}
              genderOptions={genderOptions}
              relationshipGoalOptions={relationshipGoalOptions}
              ZODIAC_EMOJI={ZODIAC_EMOJI}
            />
          </section>
        )}
        {screen === 'discover' && (
          <DiscoverScreen
            appLanguage={appLanguage}
            selfProfile={selfProfile}
            filteredProfiles={filteredProfiles}
            matchedProfiles={matchedProfiles}
            topProfile={topProfile ?? null}
            upcoming={upcoming}
            topProfileMatchAnalysis={topProfileMatchAnalysis ?? null}
            topProfileChemistry={topProfileChemistry ?? null}
            likeUsage={likeUsage}
            superLikeUsage={superLikeUsage}
            boostsLeft={boostsLeft}
            setBoostsLeft={setBoostsLeft}
            loadingProfiles={loadingProfiles}
            loadError={loadError}
            showingNoResults={showingNoResults}
            showingDeckCompletion={showingDeckCompletion}
            loadProfiles={loadProfiles}
            isDragging={isDragging}
            isResolvingSwipe={isResolvingSwipe}
            likeLimitReached={likeLimitReached}
            superLikeLimitReached={superLikeLimitReached}
            lastIntent={lastIntent}
            rightBadgeOpacity={rightBadgeOpacity}
            leftBadgeOpacity={leftBadgeOpacity}
            swipeCard={swipeCard}
            handlePointerDown={handlePointerDown}
            handlePointerMove={handlePointerMove}
            handlePointerUp={handlePointerUp}
            handlePointerCancel={handlePointerCancel}
            getCardStyle={getCardStyle}
            getDiscoverCardBackground={getDiscoverCardBackground}
            getCompatibilityScore={getCompatibilityScore}
            setFilters={setFilters}
            setIndex={setIndex}
            setHistory={setHistory}
            setSwipeLog={setSwipeLog}
            setChatThreads={setChatThreads}
            setUnreadChats={setUnreadChats}
            setMatchQueueIds={setMatchQueueIds}
            setActiveChatId={setActiveChatId}
            navigate={navigate}
            openProfileDetail={openProfileDetail}
            pushToast={pushToast}
            pushNotification={pushNotification}
          />
        )}
        {screen === 'activity' && (
          <ActivityScreen
            appLanguage={appLanguage}
            likedProfiles={likedProfiles}
            passedProfiles={passedProfiles}
            matchedProfiles={matchedProfiles}
            onChatWith={(profileId) => {
              setActiveChatId(profileId)
              navigate('chats')
            }}
            onViewProfile={(profileId) => openProfileDetail(profileId, 'activity')}
          />
        )}
        {screen === 'circles' && (
          <CirclesScreen
            appLanguage={appLanguage}
            circleSearch={circleSearch}
            setCircleSearch={setCircleSearch}
            filteredCircles={filteredCircles}
            joinedCircleIds={joinedCircleIds}
            selectedCircle={selectedCircle ?? null}
            setSelectedCircleId={setSelectedCircleId}
            toggleCircleJoin={toggleCircleJoin}
            circleRsvps={circleRsvps}
            toggleCircleRsvp={toggleCircleRsvp}
            circlePostDraft={circlePostDraft}
            setCirclePostDraft={setCirclePostDraft}
            publishCirclePost={publishCirclePost}
            selectedCirclePosts={selectedCirclePosts}
          />
        )}
        {screen === 'chats' && (
          <ChatScreen
            appLanguage={appLanguage}
            chatSearch={chatSearch}
            setChatSearch={setChatSearch}
            filteredChatPreviews={filteredChatPreviews}
            activeChatId={activeChatId}
            setActiveChatId={setActiveChatId}
            selectedChatProfile={selectedChatProfile ?? null}
            selectedChatChemistry={selectedChatChemistry ?? null}
            selectedChatPersonalityCode={selectedChatPersonalityCode ?? null}
            selectedChatTypeGuide={selectedChatTypeGuide}
            selectedChatCognitiveFunctions={selectedChatCognitiveFunctions}
            selectedChatMessages={selectedChatMessages}
            selectedChatCallHistory={selectedChatCallHistory}
            hiddenChatMessageCount={hiddenChatMessageCount}
            revealOlderMessages={revealOlderMessages}
            messagesContainerRef={messagesContainerRef}
            handleMessagesScroll={handleMessagesScroll}
            aiCoachSuggestions={aiCoachSuggestions}
            aiCoachLoading={aiCoachLoading}
            generateAiCoachSuggestions={generateAiCoachSuggestions}
            aiDatePlans={aiDatePlans}
            aiDatePlannerLoading={aiDatePlannerLoading}
            generateAiDatePlans={generateAiDatePlans}
            chatDraft={chatDraft}
            setChatDraft={setChatDraft}
            chatAttachmentDraft={chatAttachmentDraft}
            setChatAttachmentDraft={setChatAttachmentDraft}
            attachmentInputRef={attachmentInputRef}
            handleAttachmentPick={handleAttachmentPick}
            isRecordingVoice={isRecordingVoice}
            startVoiceRecording={startVoiceRecording}
            sendChatMessage={sendChatMessage}
            rejoinCallFromHistory={rejoinCallFromHistory}
            openProfileDetail={openProfileDetail}
          />
        )}
        {screen === 'profile' && (
          <ProfileScreen
            appLanguage={appLanguage}
            selfProfile={selfProfile}
            profileDraft={profileDraft}
            setProfileDraft={setProfileDraft}
            handleProfileDraftChange={handleProfileDraftChange}
            handleProfileDraftToggle={handleProfileDraftToggle}
            handlePersonalityAnswerChange={handlePersonalityAnswerChange}
            saveMyProfile={saveMyProfile}
            profileSaveErrors={profileSaveErrors}
            selfPersonalityCode={selfPersonalityCode}
            selfTypeGuide={selfTypeGuide}
            selfCognitiveFunctions={selfCognitiveFunctions}
            draftPersonalityCode={draftPersonalityCode}
            socialConnectedCount={socialConnectedCount}
            photoUrlInput={photoUrlInput}
            setPhotoUrlInput={setPhotoUrlInput}
            addPhotoFromUrl={addPhotoFromUrl}
            handlePhotoUpload={handlePhotoUpload}
            setPrimaryDraftPhoto={setPrimaryDraftPhoto}
            removeDraftPhoto={removeDraftPhoto}
            photoStudioSource={photoStudioSource}
            photoStudioAnalysis={photoStudioAnalysis}
            photoStudioControls={photoStudioControls}
            setPhotoStudioControls={setPhotoStudioControls}
            photoStudioBusy={photoStudioBusy}
            isDraggingCrop={isDraggingCrop}
            isRedrawCropMode={isRedrawCropMode}
            setIsRedrawCropMode={setIsRedrawCropMode}
            applyPhotoStudio={applyPhotoStudio}
            resetPhotoStudioControls={resetPhotoStudioControls}
            closePhotoStudio={closePhotoStudio}
            studioFrameRef={studioFrameRef}
            handleStudioPointerDown={handleStudioPointerDown}
            handleStudioPointerMove={handleStudioPointerMove}
            handleStudioPointerUp={handleStudioPointerUp}
            onOpenPersonalityGuide={() => navigate('personality-guide')}
            onOpenSettings={() => navigate('settings')}
          />
        )}

        {screen === 'personality-guide' && (
          <PersonalityGuideScreen
            selfPersonalityCode={selfPersonalityCode}
            onBackToProfile={() => navigate('profile')}
          />
        )}

        {screen === 'settings' && (
          <SettingsScreen
            appLanguage={appLanguage}
            setAppLanguage={setAppLanguage}
            settings={settings}
            settingsSaveStatus={settingsSaveStatus}
            preferenceSaveStatus={preferenceSaveStatus}
            handleSettingsToggle={handleSettingsToggle}
            socialConnectedCount={socialConnectedCount}
            socialMotivationLine={socialMotivationLine}
            unreadNotificationCount={unreadNotificationCount}
            selfProfile={selfProfile}
            toggleSocialPromotionOptIn={toggleSocialPromotionOptIn}
            setSocialConnectionDecision={setSocialConnectionDecision}
            shareLoveDateOnPlatform={shareLoveDateOnPlatform}
            activePlan={activePlan}
            setActivePlan={setActivePlan}
            persistActivePlan={persistActivePlan}
            refreshEngagementUsage={refreshEngagementUsage}
            likeUsage={likeUsage}
            superLikeUsage={superLikeUsage}
            boostsLeft={boostsLeft}
            rewindsLeft={rewindsLeft}
            backendMode={backendMode}
            notifications={notifications}
            markAllNotificationsRead={markAllNotificationsRead}
            blockedProfileIds={blockedProfileIds}
            safetyReports={safetyReports}
            profileById={profileById}
            isModerationAdmin={isModerationAdmin}
            onOpenModeration={() => navigate('moderation')}
          />
        )}
        {screen === 'moderation' && (
          <ModerationScreen
            appLanguage={appLanguage}
            isModerationAdmin={isModerationAdmin}
            userEmail={userEmail}
            moderationStatusFilter={moderationStatusFilter}
            setModerationStatusFilter={setModerationStatusFilter}
            moderationSearchQuery={moderationSearchQuery}
            setModerationSearchQuery={setModerationSearchQuery}
            moderationReportsFiltered={moderationReportsFiltered}
            moderationReportsSorted={moderationReportsSorted}
            selectedModerationReport={selectedModerationReport ?? null}
            setActiveModerationReportId={setActiveModerationReportId}
            updateReportStatus={updateReportStatus}
            resolveAndBlockReport={resolveAndBlockReport}
            onBackToSettings={() => navigate('settings')}
          />
        )}
        {screen === 'profile-detail' && (
          <ProfileDetailScreen
            appLanguage={appLanguage}
            selectedDetailProfile={selectedDetailProfile ?? null}
            selfProfile={selfProfile}
            selfPersonalityCode={selfPersonalityCode}
            selectedDetailMatchAnalysis={selectedDetailMatchAnalysis ?? null}
            selectedDetailChemistry={selectedDetailChemistry ?? null}
            getCompatibilityScore={getCompatibilityScore}
            reportProfile={reportProfile}
            blockProfile={blockProfile}
            openLightbox={openLightbox}
            closeProfileDetail={closeProfileDetail}
            onBackToDiscover={() => navigate('discover')}
          />
        )}
      </section>
      {activeMatch ? (
        <div className="match-modal" role="dialog" aria-modal="true" aria-label={appLanguage === 'ro' ? 'Potrivire găsită' : 'Match found'}>
          <article className="match-card">
            <p className="pill">{appLanguage === 'ro' ? 'Este o potrivire' : "It's a match"}</p>
            <h2>{appLanguage === 'ro' ? `Tu și ${activeMatch.name} v-ați apreciat reciproc` : `You and ${activeMatch.name} liked each other`}</h2>
            <p>{appLanguage === 'ro' ? 'Trimite un mesaj acum sau continuă să descoperi profile.' : 'Send a message now or keep swiping.'}</p>
            <div className="match-actions">
              <button type="button" className="ghost" onClick={() => setActiveMatch(null)}>
                {appLanguage === 'ro' ? 'Continuă descoperirea' : 'Keep Swiping'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveChatId(activeMatch.id)
                  setActiveMatch(null)
                  navigate('chats')
                }}
              >
                {appLanguage === 'ro' ? 'Deschide chatul' : 'Open Chat'}
              </button>
            </div>
          </article>
        </div>
      ) : null}
      {callState.active ? (
        <div className="match-modal" role="dialog" aria-modal="true" aria-label={appLanguage === 'ro' ? 'Apel în desfășurare' : 'Call in progress'}>
          <article className="match-card call-card call-card--embedded">
            <p className="pill">{callState.type === 'video' ? copy.chats.videoCallLabel : copy.chats.audioCallLabel}</p>
            <h2>
              {callState.targetProfileId ? profileById.get(callState.targetProfileId)?.name ?? (appLanguage === 'ro' ? 'Potrivire' : 'Match') : (appLanguage === 'ro' ? 'Potrivire' : 'Match')}
            </h2>
            <p>
              {callState.status === 'connecting'
                ? (appLanguage === 'ro' ? 'Pregătim camera ta privată LoveDate...' : 'Preparing your private LoveDate room...')
                : callState.status === 'error'
                  ? (appLanguage === 'ro' ? 'Camera privată nu a putut fi pregătită.' : 'The private room could not be prepared.')
                  : appLanguage === 'ro'
                    ? `Camera privată este gata | ${formatShortTime(callState.startedAt)}`
                    : `Private room ready | ${formatShortTime(callState.startedAt)}`}
            </p>
            {callState.roomUrl ? (
              <p className="call-room-link">
                {appLanguage === 'ro' ? 'Cameră' : 'Room'}: <strong>{callState.roomId}</strong>
              </p>
            ) : null}
            {callState.type && callState.roomId && callState.roomUrl ? (
              <EmbeddedCallStage
                key={callState.roomId}
                callType={callState.type}
                domain={jitsiProvider.domain}
                scriptUrl={jitsiProvider.scriptUrl}
                jwt={jitsiProvider.jwt}
                setupMessage={jitsiProvider.setupMessage}
                roomId={callState.roomId}
                roomUrl={callState.roomUrl}
                displayName={selfProfile.name || userEmail.split('@')[0] || 'LoveDate guest'}
                matchName={
                  callState.targetProfileId
                    ? profileById.get(callState.targetProfileId)?.name ?? (appLanguage === 'ro' ? 'Potrivire' : 'Match')
                    : appLanguage === 'ro' ? 'Potrivire' : 'Match'
                }
                startedAtLabel={formatShortTime(callState.startedAt)}
                muted={callState.muted}
                cameraOff={callState.cameraOff}
                language={appLanguage}
                onConnected={markCallConnected}
                onEnded={endCall}
                onFailed={markCallFailed}
                onMuteChange={setCallMuted}
                onCameraChange={setCallCameraOff}
                onCopyInvite={() => void copyCallInvite()}
                onOpenFallback={openCallRoom}
              />
            ) : null}
            {/* Legacy branded placeholder replaced by EmbeddedCallStage.
            <div className={`call-embed-frame ${callState.type === 'audio' ? 'audio-only' : ''}`}>
              <div className="call-brand-shell">
                <div className="call-orb" aria-hidden="true" />
                <div className="call-shell-copy">
                  <h3>{callState.type === 'video'
                    ? (appLanguage === 'ro' ? 'Apel video LoveDate' : 'LoveDate video call')
                    : (appLanguage === 'ro' ? 'Apel audio LoveDate' : 'LoveDate audio call')}</h3>
                  <p>
                    {appLanguage === 'ro'
                      ? 'Camera ta privată este gata. Deschide-o în browser atunci când vrei să începi conversația, păstrându-ți numărul personal de telefon privat.'
                      : 'Your private room is ready. Open it in your browser when you want to start talking, while keeping your personal phone number private.'}
                  </p>
                  <div className="call-shell-status">
                    <span>{callState.status === 'live' ? (appLanguage === 'ro' ? 'Cameră activă' : 'Room active') : (appLanguage === 'ro' ? 'Cameră în așteptare' : 'Room standby')}</span>
                    <span>{callState.type === 'video' ? (appLanguage === 'ro' ? 'Compatibil cameră' : 'Camera capable') : (appLanguage === 'ro' ? 'Doar audio' : 'Audio only')}</span>
                    <span>{appLanguage === 'ro' ? 'Link privat generat' : 'Private invite link generated'}</span>
                  </div>
                </div>
              </div>
            </div>
            */}
            <div className="match-actions call-actions call-actions-primary">
              <button type="button" className="ghost" onClick={openCallRoom} disabled={!callState.roomUrl}>
                {appLanguage === 'ro' ? 'Deschide camera privată' : 'Open Private Room'}
              </button>
              <button type="button" className="ghost" onClick={() => void copyCallInvite()} disabled={!callState.roomUrl}>
                {appLanguage === 'ro' ? 'Copiază invitația' : 'Copy Invite'}
              </button>
              <button type="button" className="danger" onClick={endCall}>
                {appLanguage === 'ro' ? 'Închide apelul' : 'End Call'}
              </button>
            </div>
          </article>
        </div>
      ) : null}
      {reportDraftProfile ? (
        <div className="match-modal" role="dialog" aria-modal="true" aria-label={appLanguage === 'ro' ? `Raportează ${reportDraftProfile.name}` : `Report ${reportDraftProfile.name}`}>
          <article className="match-card report-modal-card">
            <p className="pill">{appLanguage === 'ro' ? 'Siguranță' : 'Safety'}</p>
            <h2>{appLanguage === 'ro' ? `Raportează ${reportDraftProfile.name}` : `Report ${reportDraftProfile.name}`}</h2>
            <p>{appLanguage === 'ro' ? 'Spune-ne ce s-a întâmplat. Raportarea ta va apărea în Centrul de Moderare pentru analiză.' : 'Tell us what happened. Your report will appear in the Moderation Center for review.'}</p>
            <label className="report-field">
              <span>{appLanguage === 'ro' ? 'Categorie' : 'Category'}</span>
              <select
                value={reportDraftCategory}
                onChange={(event) => setReportDraftCategory(event.target.value as SafetyCategory)}
              >
                {SAFETY_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </label>
            <label className="report-field report-field--textarea">
              <span>{appLanguage === 'ro' ? 'Detalii' : 'Details'}</span>
              <textarea
                value={reportDraftDetails}
                onChange={(event) => setReportDraftDetails(event.target.value)}
                placeholder={appLanguage === 'ro' ? 'Adaugă orice detaliu util pentru echipa de moderare.' : 'Add any useful detail for the moderation team.'}
              />
            </label>
            <div className="match-actions">
              <button type="button" className="ghost" onClick={closeReportProfileDialog}>
                {appLanguage === 'ro' ? 'Anulează' : 'Cancel'}
              </button>
              <button type="button" className="danger" onClick={submitProfileReport}>
                {appLanguage === 'ro' ? 'Trimite raportarea' : 'Submit report'}
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
              <img src={lightboxPhoto} alt="Expanded profile" decoding="async" style={{ transform: `scale(${lightboxZoom})` }} />
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
      {/* Mobile tab bar — all 7 destinations, per user request. Compact
         icon-only mode (labels hidden via CSS) keeps them tappable even
         at 384px phone width. */}
      <nav className="mobile-tab-bar" aria-label="Primary navigation">
        {([
          { key: 'discover' as AppScreen, label: copy.nav.discover, icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> },
          { key: 'activity' as AppScreen, label: copy.nav.activity, badge: notifications.filter(n => !n.read).length, icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> },
          { key: 'circles' as AppScreen, label: copy.nav.circles, badge: joinedCircleIds.length > 0 ? joinedCircleIds.length : undefined, icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></svg> },
          { key: 'chats' as AppScreen, label: copy.nav.chats, badge: Object.values(unreadChats).reduce((s, c) => s + c, 0), icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
          ...(isModerationAdmin
            ? [{ key: 'moderation' as AppScreen, label: copy.nav.moderation, badge: safetyReports.filter(r => r.status === 'open').length, icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> }]
            : []),
          { key: 'profile' as AppScreen, label: copy.nav.profile, icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
          { key: 'settings' as AppScreen, label: copy.nav.settings, badge: unreadNotificationCount, icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> },
        ] as Array<{ key: AppScreen; label: string; icon: React.ReactNode; badge?: number }>).map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={screen === tab.key ? 'active' : ''}
            onClick={() => navigate(tab.key)}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge && tab.badge > 0 ? <span className="tab-badge">{tab.badge}</span> : null}
          </button>
        ))}
      </nav>
    </main>
  )
}

export default App


