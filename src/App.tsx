// ZODIAC_EMOJI moved to src/constants/zodiac.ts.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import './App.css'
import { getMyMatches, resolveMatch, type Profile } from './services/priveApi'
import { DEMO_AUTO_REPLIES, DEMO_GENERIC_AUTO_REPLIES } from './services/demo/demoConstants'
import {
  DEMO_GUEST_GENDER,
  DEMO_GUEST_LOVE_PERSONALITY,
  DEMO_GUEST_STABILITY,
} from './services/demo/demoProfiles'
import { backendInvokeDatePlanner } from './services/ai/datePlanner'
import { backendInvokeIcebreaker } from './services/ai/icebreaker'
import {
  backendInvokeSemanticFilter,
  type SemanticFilterResult,
} from './services/ai/semanticFilter'
import { backendInvokeSafetyTriage } from './services/ai/safetyTriage'
import { enablePushNotifications, disablePushNotifications } from './services/push'
import { FilterScreen } from './components/FilterScreen'
import { Logo } from './components/Logo'
import { BuildChip } from './components/BuildChip'
import { TopBar } from './components/TopBar'
import { MobileTabBar, type MobileTabBarItem } from './components/MobileTabBar'
import { ToastStack } from './components/ToastStack'
import { PhotoLightbox } from './components/PhotoLightbox'
import { MatchCelebrationModal } from './components/MatchCelebrationModal'
import { ReportProfileDialog } from './components/ReportProfileDialog'
import { CallModal } from './components/CallModal'
import { UpdateBanner } from './components/UpdateBanner'
import { useAuth } from './hooks/useAuth'
import { useDeck } from './hooks/useDeck'
import { useChatState } from './hooks/useChatState'
import { useChatViews } from './hooks/useChatViews'
import { useDiscoveryFilter } from './hooks/useDiscoveryFilter'
import { useMatchInsights } from './hooks/useMatchInsights'
import { useChatAiActions } from './hooks/useChatAiActions'
import { useMatchScoring } from './hooks/useMatchScoring'
import { useCallScreen } from './hooks/useCallScreen'
import { useUiModals } from './hooks/useUiModals'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useProfileEditor } from './hooks/useProfileEditor'
import { usePhotoStudio } from './hooks/usePhotoStudio'
import { useReports } from './hooks/useReports'
import { useToasts } from './hooks/useToasts'
import { useEngagement } from './hooks/useEngagement'
import { useAppSettings } from './hooks/useAppSettings'
import { useRouter } from './hooks/useRouter'
import { useStableMatch } from './hooks/useStableMatch'
import { ActivityScreen } from './screens/ActivityScreen'
import { ChatScreen } from './screens/ChatScreen'
import { DiscoverScreen } from './screens/DiscoverScreen'
import { LoginScreen } from './screens/LoginScreen'
import { WaitlistReplyScreen } from './screens/WaitlistReplyScreen'
import { ModerationScreen } from './screens/ModerationScreen'
import { OnboardingScreen } from './screens/OnboardingScreen'
import { PersonalityGuideScreen } from './screens/PersonalityGuideScreen'
import { LovePersonalityScreen } from './screens/LovePersonalityScreen'
import { LovePersonalityQuizScreen } from './screens/LovePersonalityQuizScreen'
import { StabilityQuizScreen } from './screens/StabilityQuizScreen'
import { PhotoStudioScreen } from './screens/PhotoStudioScreen'
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
  backendAdminSetProfileActive,
  backendDeleteSelfAccount,
  backendSendChatMessage,
  backendLoadChatHistory,
  backendSubscribeToInbox,
  backendLoadBlockedProfileIds,
  backendLoadPreferences,
  backendLoadSettings,
  backendLoadSwipeHistory,
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
import { PERSONALITY_QUESTION_COUNT, type LikertAnswer } from './services/compatibility'
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
import { PLAN_OPTIONS, type PlanTier } from './spec/priveConfig'
import type {
  AppLanguage,
  AppScreen,
  CallLogEntry,
  CallState,
  ChatMessage,
  ChemistryInsights,
  DatePlan,
  Filters,
  HiddenEntry,
  HiddenReason,
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
  HISTORY_STORAGE_KEY,
  normalizeSelfProfile,
  persistAppLanguage,
  readAppLanguage,
  readAuth,
  readCallHistory,
  readChatThreads,
  readHistory,
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
  PRIVE_NAVY_2,
  PRIVE_NAVY_3,
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
  UI_TEXT,
  ZODIAC_DEEP_DIVE,
  ZODIAC_DESCRIPTIONS,
  ZODIAC_EMOJI,
  translateInterestForSentence,
} from './constants'
import {
  analyzePhoto,
  bootCleanup,
  buildCallRoom,
  buildHighResImageUrl,
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
  readWaitlistReplyToken,
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

// SOCIAL_PLATFORM_META, DEFAULT_SOCIAL_CONNECTIONS now in src/constants/profile.ts

// buildHighResImageUrl, toDataUrl, getStrongPasswordError, normalizeProfilePhotos
// now live in src/utils/ (imported via the utils barrel).

// Profile constants (initialFilters, ZODIAC_COMPATIBILITY, DEFAULT_SELF_PROFILE, EMPTY_SELF_PROFILE,
// all *_OPTIONS arrays) now live in src/constants/profile.ts.

// ZODIAC_DESCRIPTIONS moved to src/constants/zodiac.ts.

// ZODIAC_DEEP_DIVE moved to src/constants/zodiac.ts.

// parseRoute, buildPath, readRouteFromWindow now live in src/utils/.

// readAuth, readHistory now live in src/persistence/ (imported above).

// normalizeSelfProfile, readSelfProfile, toProfileDraft now live in src/persistence/selfProfile.ts.

// readChatThreads, readCallHistory now live in src/persistence/.

// formatShortTime, sanitizeRoomPart, buildCallRoom, getCallOutcomeLabel, getCallDurationLabel
// now live in src/utils/ (call.ts / format.ts).

// readAppLanguage, persistAppLanguage now live in src/persistence/language.ts.

// formatUiText, getProfilePhotos, getProfilePrompts, toGenderKey,
// loadImageFromSource, readFileAsDataUrl now live in src/utils/.

// analyzePhoto, renderEditedPhoto now live in src/utils/image.ts.

// ── Dev-only screen preview (2026-05-31) ──────────────────────────────
// Lets the CSS-regression harness render any screen with seeded demo state,
// bypassing auth + onboarding, so cascade changes can be verified per-screen.
// Gated on import.meta.env.DEV → statically false in production builds, so
// this whole block tree-shakes out and never ships. Dev usage:
//   /?preview=discover     /?preview=settings&lang=ro     /?preview=moderation
const PREVIEW_SCREEN: string | null =
  import.meta.env.DEV && typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('preview')
    : null
const PREVIEW_LANG: string | null =
  import.meta.env.DEV && typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('lang')
    : null
// A complete self-profile so the preview lands directly on the target screen
// (a filled profile ⇒ profileEmpty is false ⇒ no onboarding redirect).
const DEMO_PREVIEW_SELF: SelfProfile = {
  ...EMPTY_SELF_PROFILE,
  name: 'Tester',
  age: 45,
  city: 'București',
  gender: 'Woman',
  bio: 'Preview profile for layout verification.',
  interests: ['Coffee', 'Music', 'Travel'],
  photos: ['https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1600&q=85'],
  lovePersonality: DEMO_GUEST_LOVE_PERSONALITY,
  stabilityProfile: DEMO_GUEST_STABILITY,
}
// `?preview=chat-active` seeds a real DEMO_PROFILES match (Andra, 90001 — an id
// that survives the deck's demo load) plus a fixed conversation, so the harness
// covers the chat conversation pane (.chat-*, .msg-*, incl. a call-log chip).
// Fixed ids + timestamps keep the render byte-stable across captures.
const DEMO_PREVIEW_CHAT_ID = 90001
const DEMO_PREVIEW_MESSAGES: ChatMessage[] = [
  { id: 8000001, sender: 'them', text: 'Hi! I really liked your profile 😊', createdAt: 1717200000000, status: 'read' },
  { id: 8000002, sender: 'me', text: 'Thank you! Yours too — what are you reading these days?', createdAt: 1717200600000, status: 'read' },
  { id: 8000003, sender: 'them', text: 'Just finished a detective novel. You?', createdAt: 1717201200000, status: 'read' },
  { id: 8000004, sender: 'me', text: 'Same passion here. Want to grab a coffee this week?', createdAt: 1717201800000, status: 'read' },
  { id: 8000005, sender: 'them', text: 'I would love that ✨', createdAt: 1717202400000, status: 'read' },
  { id: 8000006, sender: 'me', text: '', createdAt: 1717203000000, status: 'read', callMeta: { type: 'video', roomId: 'demo', roomUrl: 'https://example.com/demo', event: 'ended' } },
]

function App() {
  // Phase D extraction (2026-05-30) — legacy orphan removal + one-time
  // unauthenticated demo-data sweep now live in utils/bootCleanup.
  bootCleanup()

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
  // login form is pre-filled, but never auto-resume a session. Routing state
  // + navigate live in useRouter (D extraction 2026-05-30).
  const {
    screen,
    setScreen,
    previousScreen,
    setPreviousScreen,
    selectedProfileId,
    setSelectedProfileId,
    screenRef,
    navigate,
  } = useRouter()
  // Waitlist v2 magic-link reply page (2026-05-27). Captured once at
  // mount from the URL. When non-null, the app renders the public
  // reply screen and nothing else — it's a pre-auth, token-only route.
  const [waitlistReplyToken, setWaitlistReplyToken] = useState<string | null>(
    () => readWaitlistReplyToken(),
  )

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
  // activeMatch (match-found celebration) + lightbox state now in
  // useUiModals (D2.5).
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
  // unreadChats / matchQueueIds / chatAttachmentDraft / showFullChatHistory /
  // isRecordingVoice now live in useChatState above.
  //
  // Phase D2.4 — callState, callStateRef, jitsiProvider, and all 9
  // call handlers moved into useCallScreen. The hook is constructed
  // below alongside the other late hooks.

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
    moderationReportsSorted,
    moderationReportsFiltered,
    selectedModerationReport,
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

  // Phase D2.1 — photo studio (refs, crop state, 11 handlers) lives in
  // usePhotoStudio. Consumes the source/controls/busy/dragging slots
  // owned by useProfileEditor, plus pushToast and appLanguage.
  const photoStudio = usePhotoStudio({
    photoUrlInput,
    setPhotoUrlInput,
    profileDraft,
    setProfileDraft,
    setProfileSaveStatus,
    photoStudioSource,
    setPhotoStudioSource,
    photoStudioAnalysis,
    setPhotoStudioAnalysis,
    photoStudioControls,
    setPhotoStudioControls,
    setPhotoStudioBusy,
    isDraggingCrop,
    setIsDraggingCrop,
    pushToast,
    appLanguage,
  })
  const {
    studioFrameRef,
    isRedrawCropMode,
    setIsRedrawCropMode,
    addPhotoFromUrl,
    removeDraftPhoto,
    setPrimaryDraftPhoto,
    resetPhotoStudioControls,
    closePhotoStudio,
    handlePhotoUpload,
    applyPhotoStudio,
    handleStudioPointerDown,
    handleStudioPointerMove,
    handleStudioPointerUp,
  } = photoStudio

  // Phase D2.5 — small app-level modal slots (lightbox + activeMatch
  // celebration) live in useUiModals.
  const {
    lightboxPhoto,
    lightboxZoom,
    setLightboxZoom,
    openLightbox,
    closeLightbox,
    zoomLightbox,
    activeMatch,
    setActiveMatch,
  } = useUiModals()

  // Phase D2.3 — match scoring (heuristic + AI overlay) moved into
  // useMatchScoring. aiMatchScores state, getMatchAnalysis/
  // getChemistryInsights/getCompatibilityScore, the AI fetch effect,
  // and the 4 per-candidate memos all live there now.

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
    // Sourced exclusively from VITE_MODERATION_ADMIN_EMAILS. The
    // hardcoded fallback that used to live here leaked operator
    // emails into the production JS bundle (2026-05-27 audit) — any
    // user with DevTools could grep them. Now: if the env var is
    // missing, the moderation panel renders no admins. The real
    // gate is server-side `is_admin()` SQL function anyway.
    const envRaw = (import.meta.env.VITE_MODERATION_ADMIN_EMAILS as string | undefined) ?? ''
    const parsed = envRaw
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter((item) => item.length > 0)
    if (parsed.length === 0 && import.meta.env.DEV) {
      console.warn(
        '[Privé] VITE_MODERATION_ADMIN_EMAILS is empty. Moderation UI will hide for everyone.',
      )
    }
    return Array.from(new Set(parsed))
  }, [])
  // isModerationAdmin moved below useAuth() — userEmail is now sourced
  // from there and isn't in scope until after the destructure.

  // dragStart ref now lives in useDeck — see deck.dragStart above.
  const attachmentInputRef = useRef<HTMLInputElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  // activeCallLogIdRef + callStateRef moved into useCallScreen (D2.4).
  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const preserveScrollOnExpandRef = useRef<{ top: number; height: number } | null>(null)
  const shouldStickToBottomRef = useRef(true)
  const allProfilesRef = useRef<Profile[]>([])
  const activeChatIdRef = useRef<number | null>(null)
  // Phase D2.1 — all photo-studio refs, crop interaction state, and the
  // ~390 lines of pointer/crop/upload/apply handlers moved into
  // src/hooks/usePhotoStudio.ts. The hook is constructed below alongside
  // the rest of the editor state.

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
        .then(() => StatusBar.setBackgroundColor({ color: PRIVE_NAVY_2 }))
        .catch(() => {})
    }
  }, [])

  // callStateRef sync effect moved into useCallScreen (D2.4).

  useEffect(() => {
    persistAppLanguage(appLanguage)
  }, [appLanguage])

  useEffect(() => {
    refreshEngagementUsage(activePlan)
  }, [activePlan, refreshEngagementUsage])

  // pushToast / pushNotification / markAllNotificationsRead now live in useToasts.


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
      (selfProfile.personalityAnswers?.length ?? 0) === PERSONALITY_QUESTION_COUNT,
    ]
    const completed = checks.filter(Boolean).length
    return Math.round((completed / checks.length) * 100)
  }, [selfProfile])

  const isProfileVerified = useMemo(() => selfProfile.photos.length >= 3 && profileCompletion >= 80, [selfProfile.photos.length, profileCompletion])

  // openLightbox / closeLightbox / zoomLightbox now in useUiModals (D2.5).

  // Phase D1.1 — auth state + handlers extracted to useAuth.
  // onSignedIn navigates to the home screen; onSignedOut clears the
  // non-auth state that handleSignOut used to reset inline.
  const auth = useAuth({
    pushToast,
    appLanguage,
    onSignedIn: () => navigate('discover', { replace: true }),
    onSignedOut: () => {
      setActiveMatch(null)
      setActiveChatId(null)
      // useCallScreen watches isAuthenticated and resets call state
      // itself when it drops to false — no inline reset needed here.
    },
  })
  const {
    isAuthenticated,
    isGuest,
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
    passwordRecoveryActive,
    passwordRecoveryLoading,
    passwordRecoveryError,
    forgotPasswordSending,
    forgotPasswordStatus,
  } = auth
  const handleLoginSubmit = auth.submitLogin
  const handleGuestLogin = auth.guestLogin
  const handleSignOut = auth.signOut
  const handleExitApp = auth.exitApp
  const handleUseDevAccount = auth.useDevAccount
  const handleResetDevAccount = auth.resetDevAccount
  const completePasswordRecovery = auth.completePasswordRecovery
  const sendForgotPasswordEmail = auth.sendForgotPasswordEmail
  const resetForgotPasswordState = auth.resetForgotPasswordState

  // Phase D2.3 — match scoring lives here so the heuristic functions
  // are available BEFORE filteredProfiles uses getCompatibilityScore
  // in its sort, and BEFORE useChatAiActions consumes
  // getChemistryInsights.
  const {
    aiMatchScores,
    getMatchAnalysis,
    getCompatibilityScore,
    getChemistryInsights,
    fetchAiScoreFor,
  } = useMatchScoring({
    selfProfile,
    isAuthenticated,
    appLanguage,
    aiPreferencePrompt: filters.aiPreferencePrompt,
  })

  const isModerationAdmin = useMemo(
    () => Boolean(PREVIEW_SCREEN) || moderationAdminEmails.includes(userEmail.trim().toLowerCase()),
    [moderationAdminEmails, userEmail],
  )

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

  // Phase A bonus fix (2026-05-24) — the onboarding-trigger effect below
  // needs to know when cloud hydration has finished, otherwise it can fire
  // against the still-empty local cache on a fresh browser and ROUTE AN
  // EXISTING USER INTO THE NEW-USER WIZARD. This flag flips true once the
  // cloud fetch resolves (success or error). Reset on sign-out.
  const [cloudProfileHydrated, setCloudProfileHydrated] = useState(false)

  // One-time cleanup of the legacy global `lovedate:onboarded` flag that
  // used to gate the onboarding wizard. Removed 2026-05-26 after it was
  // found to leak across accounts on the same browser. Profile
  // completeness is now the sole source of truth. The removeItem call
  // is a no-op on fresh browsers; on browsers that still have the stale
  // key we tidy it up so localStorage stays clean.
  useEffect(() => {
    try {
      window.localStorage.removeItem('lovedate:onboarded')
    } catch {
      // localStorage unavailable / quota / private mode — ignore. The
      // routing effect doesn't read this key any more anyway.
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      setCloudProfileHydrated(false)
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
        if (cancelled) return
        if (cloudProfile) {
          const normalized = normalizeSelfProfile(cloudProfile)
          setSelfProfile(normalized)
          setProfileDraft(toProfileDraft(normalized))
        }
        setCloudProfileHydrated(true)
      })
      .catch(() => {
        // Offline or transient error — local cache remains authoritative
        // until the next successful fetch. Still mark hydration done so
        // the onboarding decision can run with the local data we have.
        setCloudProfileHydrated(true)
      })

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, userEmail, setProfileDraft, setSelfProfile])

  // Auto-persist selfProfile changes to localStorage + cloud (debounced).
  //
  // Why: prior to this effect, only the editor's "Save Profile" button
  // and the `saveSelfProfilePatch` helper would persist changes. Other
  // setSelfProfile sources — completing the personality quiz from the
  // retake screen, the LovePersonalityScreen auto-fire-reveal commit,
  // the Photo Coach verification badge award — only updated React state.
  // The data evaporated on next reload because cloud hydration would
  // restore the older saved profile.
  //
  // This effect watches selfProfile and pushes any change through to
  // backendSaveSelfProfile (local cache + Supabase upsert). Debounced
  // 800ms so rapid form-typing doesn't spam the cloud, and gated on
  // cloudProfileHydrated so the initial cloud read doesn't echo itself
  // back to the cloud during mount.
  //
  // Guest Tour (Phase 4, 2026-05-26): skip entirely when isGuest. The
  // tour visitor's profile is ephemeral by promise — nothing they
  // type during the tour should land in localStorage or Supabase.
  const profileSaveDebounceRef = useRef<number | null>(null)
  useEffect(() => {
    if (!isAuthenticated || !cloudProfileHydrated || isGuest) {
      return
    }
    if (profileSaveDebounceRef.current !== null) {
      window.clearTimeout(profileSaveDebounceRef.current)
    }
    profileSaveDebounceRef.current = window.setTimeout(() => {
      void backendSaveSelfProfile(userEmail, selfProfile).catch(() => {
        // Cloud sync failed — local cache still has the change; the next
        // successful save will reconcile. Don't toast here because this
        // effect fires on every selfProfile change and a toast storm
        // would mask real signal.
      })
    }, 800)
    return () => {
      if (profileSaveDebounceRef.current !== null) {
        window.clearTimeout(profileSaveDebounceRef.current)
      }
    }
  }, [selfProfile, isAuthenticated, cloudProfileHydrated, isGuest, userEmail])

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

  // D2 — hydrate swipe history from the cloud on auth.
  // Until this shipped, swipedIds lived only in localStorage scoped per
  // origin. Domain changes (LoveDate → Privé), site-data clears, and
  // new devices all reset the user's "already-swiped" memory, causing
  // previously-passed profiles to re-appear in the deck. The `swipes`
  // table has always been written; this effect finally reads it.
  // Cloud is treated as the source of truth on conflict — but local
  // entries not yet known to the cloud are preserved (and will be
  // re-uploaded the next time the user swipes them, which is a no-op
  // upsert thanks to the (liker_id, target_id) primary key).
  useEffect(() => {
    if (!isAuthenticated) {
      return
    }
    let cancelled = false
    void (async () => {
      const cloud = await backendLoadSwipeHistory()
      if (cancelled) return
      setHistory((current) => {
        const likedIds = Array.from(new Set([...cloud.likedIds, ...current.likedIds]))
        const passedIds = Array.from(new Set([...cloud.passedIds, ...current.passedIds]))
        return { ...current, likedIds, passedIds }
      })
    })()
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, userEmail, setHistory])

  // loadProfiles now lives in useDeck.

  useEffect(() => {
    void loadProfiles({ isGuest })
  }, [loadProfiles, isGuest])

  // Profile completeness — single source of truth for the onboarding
  // routing decision. Empty = no photos AND no name; anything else is
  // a real (or partly-real) profile and we don't auto-route.
  const profileEmpty =
    selfProfile.photos.length === 0 && !selfProfile.name.trim()

  // The routing decision is "pending" while we're authed, the local
  // profile cache is empty, and the cloud fetch hasn't resolved yet.
  // During this window the destination screen is genuinely unknown —
  // a brand-new account routes to onboarding, an existing user on a
  // fresh browser routes to wherever they were. Showing ANY screen in
  // this window is a guess. The render block below uses this to render
  // a placeholder so the user never sees the wrong screen flash before
  // routing.
  const routeDecisionPending =
    isAuthenticated && profileEmpty && !cloudProfileHydrated

  // First-run onboarding trigger. The single source of truth is profile
  // completeness — if the authed user has no photos AND no name after
  // cloud hydration finishes, route them to OnboardingScreen. Otherwise
  // they stay on whatever screen they navigated to.
  //
  // No "I've seen the wizard" flag — that lived in localStorage globally,
  // was never cleared on sign-out, and silently leaked across accounts
  // on the same browser. Profile-completeness covers every legitimate
  // case the flag was trying to handle (pre-hydration race, post-
  // completion, existing-user sign-in) without the cross-account leak.
  //
  // Gated on cloudProfileHydrated so we wait for the cloud profile to
  // load before deciding — otherwise an existing user briefly lands on
  // onboarding while their cloud profile is still in flight.
  useEffect(() => {
    if (PREVIEW_SCREEN) return // dev-only screen preview bypasses onboarding
    if (!isAuthenticated) return
    if (!cloudProfileHydrated) return
    if (profileEmpty) {
      navigate('onboarding', { replace: true })
    }
  }, [
    isAuthenticated,
    cloudProfileHydrated,
    profileEmpty,
    navigate,
  ])

  // Guest Tour (2026-05-30): seed the self profile's Love Personality +
  // gender so the Gale-Shapley stable-match lens on the Discover card
  // shows a real verdict instead of "Pending". A real guest has no
  // personality data (the onboarding quiz is skippable), which would
  // otherwise leave this marquee feature invisible during the entire tour.
  // Only the two fields G-S needs are seeded — name + photos stay empty so
  // the onboarding wizard still triggers (profileEmpty is unaffected), and
  // a guest who completes the quiz overwrites lovePersonality with their
  // real result. Gender is only filled when it isn't already a binary value
  // (so a guest's own onboarding choice is never clobbered).
  useEffect(() => {
    if (!isGuest) return
    if (selfProfile.lovePersonality) return
    setSelfProfile((prev) => ({
      ...prev,
      gender:
        prev.gender === 'Man' || prev.gender === 'Woman'
          ? prev.gender
          : DEMO_GUEST_GENDER,
      lovePersonality: DEMO_GUEST_LOVE_PERSONALITY,
      // Seed the optional Stability Assessment too, so the stability lens +
      // per-match reading also demo in the tour (not just Gale-Shapley).
      stabilityProfile: prev.stabilityProfile ?? DEMO_GUEST_STABILITY,
    }))
  }, [isGuest, selfProfile.lovePersonality, setSelfProfile])

  // Dev-only: boot straight into a seeded screen for the CSS-regression
  // harness (see PREVIEW_SCREEN above). Runs once on mount; tree-shaken out
  // of production so it never affects real users.
  useEffect(() => {
    if (!PREVIEW_SCREEN) return
    if (PREVIEW_LANG === 'ro' || PREVIEW_LANG === 'en') setAppLanguage(PREVIEW_LANG)
    handleGuestLogin()
    setSelfProfile(DEMO_PREVIEW_SELF)
    if (PREVIEW_SCREEN === 'chat-active') {
      // Seed a match (Andra, 90001 — arrives with the deck's demo load) + a
      // fixed conversation so the harness renders the chat conversation pane.
      // The relaxed phone guard below lets activeChatId auto-select on mobile too.
      setHistory((prev) => ({ ...prev, matchIds: [...prev.matchIds, DEMO_PREVIEW_CHAT_ID] }))
      setChatThreads((prev) => ({ ...prev, [DEMO_PREVIEW_CHAT_ID]: DEMO_PREVIEW_MESSAGES }))
      setActiveChatId(DEMO_PREVIEW_CHAT_ID)
    }
    const previewTarget = PREVIEW_SCREEN === 'chat-active' || PREVIEW_SCREEN === 'call-active' ? 'chats' : PREVIEW_SCREEN
    navigate(previewTarget as AppScreen, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Dev-only: seed an active video call for ?preview=call-active so the harness
  // renders the call overlay (.call-*). Keyed on isAuthenticated (not mount) so
  // it lands AFTER guestLogin — otherwise useCallScreen's reset-on-signed-out
  // effect, which runs later in the tree, clobbers the seed back to idle.
  // roomUrl is set so EmbeddedCallStage mounts its chrome; the Jitsi script is
  // cross-origin → blocked by the harness, and fails gracefully.
  useEffect(() => {
    // Positive import.meta.env.DEV guard so `false && …` dead-code-eliminates
    // the whole block in prod (a `!==` early-return would leave the body in).
    if (import.meta.env.DEV && PREVIEW_SCREEN === 'call-active' && isAuthenticated) {
      setCallState({
        active: true, type: 'video', status: 'connecting', startedAt: 1717203000000,
        targetProfileId: DEMO_PREVIEW_CHAT_ID, muted: false, cameraOff: false,
        roomId: 'demo-room', roomUrl: 'https://meet.example.com/demo-room',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  // Cloud-backed match list. Run on every authed mount so matches survive
  // reinstall — the local history state starts empty after a wipe, but the
  // cloud knows both sides right-swiped. Merge the returned profiles into
  // allProfiles (deck filter excludes already-swiped, so matches wouldn't
  // be there otherwise) and into history.matchIds. Seed empty chat threads
  // for any match that doesn't already have one.
  //
  // Guest Tour (2026-05-26, Phase 2): when isGuest, skip the cloud call
  // and seed pre-baked matches (Andra + Mateo) with pre-baked chat
  // history instead. The Chats tab + ChatScreen surfaces are then
  // visible end-to-end from the moment the visitor enters the tour.
  useEffect(() => {
    if (!isAuthenticated) {
      return
    }
    if (isGuest) {
      // Guest Tour (Phase 4, 2026-05-26): a tour visitor experiences
      // the app as a brand-new user would — no pre-seeded selfProfile,
      // no pre-baked matches, no pre-baked chat threads. They walk
      // through the OnboardingScreen wizard, fill in their own data,
      // start with an empty Discover deck of demo profiles, and earn
      // matches by swiping right. Skipping the cloud getMyMatches
      // call is the only thing this branch does — everything else
      // happens naturally through the same code paths a real new
      // user follows. The persistent banner reminds them that
      // nothing is saved.
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
  }, [isAuthenticated, isGuest, setAllProfiles, setChatThreads, setHistory])

  useEffect(() => {
    allProfilesRef.current = allProfiles
  }, [allProfiles])

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

  // Client-side deck filter (gender → age/city/interest/goal/distance/verified/
  // swiped/zodiac → sort), extracted to useDiscoveryFilter. The AI semantic
  // filter below narrows clientFilteredProfiles further into filteredProfiles.
  const { clientFilteredProfiles, hiddenBreakdown } = useDiscoveryFilter({
    allProfiles,
    filters,
    history,
    blockedProfileIds,
    getCompatibilityScore,
  })

  // ───────────────────────────────────────────────────────────────
  // Phase B (E4) — AI-First Semantic Filter
  //
  // When the viewer has set a free-text preference ("into hiking,
  // not into clubs"), call the ai-semantic-filter Edge Function with
  // the current client-filtered deck. The model returns matches+reason
  // per candidate; we shrink the deck to matches and surface the reason
  // on each card. Future Phase C (pgvector) swaps the backend call
  // without touching this state shape.
  // ───────────────────────────────────────────────────────────────
  const [semanticByProfileId, setSemanticByProfileId] = useState<
    Map<number, SemanticFilterResult> | null
  >(null)
  const [aiFilterStatus, setAiFilterStatus] = useState<
    'inactive' | 'fetching' | 'active' | 'error'
  >('inactive')

  // Stable hash of the candidate set so the effect doesn't re-fire on
  // every render where the array reference changed but the IDs didn't.
  const candidateIdsKey = useMemo(
    () =>
      clientFilteredProfiles
        .slice(0, 50)
        .map((p) => p.id)
        .sort((a, b) => a - b)
        .join(','),
    [clientFilteredProfiles],
  )

  const trimmedAiPrompt = filters.aiPreferencePrompt.trim()

  useEffect(() => {
    // No prompt → clear any previous AI results, fall back to client filter.
    if (trimmedAiPrompt.length < 5 || clientFilteredProfiles.length === 0) {
      setSemanticByProfileId(null)
      setAiFilterStatus('inactive')
      return
    }

    let cancelled = false
    setAiFilterStatus('fetching')

    const candidates = clientFilteredProfiles.slice(0, 50).map((p) => ({
      id: p.id,
      name: p.name,
      age: p.age,
      city: p.city,
      bio: p.bio,
      interests: p.interests,
      vibe: p.vibe,
      relationshipGoal: p.relationshipGoal,
    }))

    void (async () => {
      const results = await backendInvokeSemanticFilter({
        viewerPrompt: trimmedAiPrompt,
        candidates,
        language: appLanguage,
      })
      if (cancelled) return
      if (!results) {
        // Graceful fallback: clear AI results, keep client-filtered deck.
        setSemanticByProfileId(null)
        setAiFilterStatus('error')
        return
      }
      const map = new Map<number, SemanticFilterResult>()
      for (const r of results) map.set(r.profileId, r)
      setSemanticByProfileId(map)
      setAiFilterStatus('active')
    })()

    return () => {
      cancelled = true
    }
    // candidateIdsKey is a stable string-hash of clientFilteredProfiles ids
    // so this effect only re-fires when the actual candidate set changes,
    // not on every render of the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmedAiPrompt, candidateIdsKey, appLanguage])

  // Apply the semantic filter on top of the client-filtered list. Keep
  // profiles for which the model returned matches=true OR didn't return
  // any result (defensive — never over-filter when the model is silent).
  const filteredProfiles = useMemo(() => {
    if (!semanticByProfileId || semanticByProfileId.size === 0) {
      return clientFilteredProfiles
    }
    return clientFilteredProfiles.filter((p) => {
      const r = semanticByProfileId.get(p.id)
      return !r || r.matches !== false
    })
  }, [clientFilteredProfiles, semanticByProfileId])

  // 2026-05-30 — second matching lens (Gale-Shapley) runs over the same
  // pool the user actually sees. The verdict is surfaced on the top
  // profile card next to the existing AI compatibility score.
  const stableMatchVerdict = useStableMatch(selfProfile, filteredProfiles)

  // D3 — hydrate filter preferences from the cloud on auth.
  // backendSavePreferences has always written to user_preferences; this
  // is the matching read. Cloud values override the local defaults so
  // the user's filters survive domain change, new device, and sign-in
  // on a fresh origin. The prefsHydratedRef guard blocks the
  // 280ms-debounced save effect below from echoing the hydrated values
  // back to the cloud during the same render cycle.
  const prefsHydratedRef = useRef(false)
  useEffect(() => {
    if (!isAuthenticated) {
      prefsHydratedRef.current = false
      return
    }
    if (prefsHydratedRef.current) {
      return
    }
    let cancelled = false
    void (async () => {
      const cloud = await backendLoadPreferences()
      if (cancelled) return
      if (cloud) {
        setFilters((current) => ({
          ...current,
          minAge: cloud.minAge,
          maxAge: cloud.maxAge,
          city: cloud.city,
          interest: cloud.interest,
          // Phase B (E4): the viewer's free-text AI prompt now persists in
          // the cloud too. Drives the semantic filter; survives device + domain.
          aiPreferencePrompt: cloud.aiPreferencePrompt,
        }))
      }
      // Mark hydration complete so the next filter change triggers a save.
      prefsHydratedRef.current = true
    })()
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, userEmail, setFilters])

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }
    // Skip the save while preference hydration from the cloud is still
    // pending — otherwise we'd echo the hydrated values back as if they
    // were a fresh user change, masking any in-flight cloud updates.
    if (!prefsHydratedRef.current) {
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
    if (isPhone && activeChatId === null && !PREVIEW_SCREEN) return

    const stillExists = matchedProfiles.some((profile) => profile.id === activeChatId)
    if (!stillExists) {
      setActiveChatId(isPhone && !PREVIEW_SCREEN ? null : matchedProfiles[0].id)
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

  // Phase D2.4 — call/Jitsi lifecycle (callState + ref + 9 handlers).
  // Watches isAuthenticated and resets itself on sign-out.
  const {
    callState,
    jitsiProvider,
    startCall,
    markCallConnected,
    markCallFailed,
    setCallMuted,
    setCallCameraOff,
    endCall,
    openCallRoom,
    copyCallInvite,
    rejoinCallFromHistory,
    setCallState,
  } = useCallScreen({
    isAuthenticated,
    selectedChatProfile,
    userEmail,
    runtimeCalls: {
      jitsiDomain: runtimeConfig.calls.jitsiDomain,
      jitsiAppId: runtimeConfig.calls.jitsiAppId,
      jitsiJwt: runtimeConfig.calls.jitsiJwt,
    },
    setCallHistory,
    setChatThreads,
    pushToast,
    appLanguage,
  })

  const selectedDetailProfile = useMemo(() => {
    if (!selectedProfileId) {
      return null
    }
    return profileById.get(selectedProfileId) ?? null
  }, [selectedProfileId, profileById])

  const topProfile = filteredProfiles[index]

  // Phase D2.3 — fire the AI overlay fetch once topProfile +
  // selectedDetailProfile are known. The cache-and-set logic lives
  // in useMatchScoring.fetchAiScoreFor.
  useEffect(() => {
    if (topProfile) void fetchAiScoreFor(topProfile)
    if (selectedDetailProfile) void fetchAiScoreFor(selectedDetailProfile)
  }, [topProfile, selectedDetailProfile, fetchAiScoreFor])

  // Per-candidate overlays — heuristic from useMatchScoring + AI overlay
  // merged. If the AI fetch hasn't landed yet, the user sees the pure
  // heuristic; once it resolves these memos recompute with the richer
  // payload.
  const matchInsightsDeps = { getMatchAnalysis, getChemistryInsights, aiMatchScores }
  const { matchAnalysis: topProfileMatchAnalysis, chemistry: topProfileChemistry } =
    useMatchInsights(topProfile, matchInsightsDeps)
  const { matchAnalysis: selectedDetailMatchAnalysis, chemistry: selectedDetailChemistry } =
    useMatchInsights(selectedDetailProfile, matchInsightsDeps)

  // Phase D2.2 — chat-AI surfaces (icebreaker + date planner generators
  // + reset effect). Consumes getChemistryInsights declared above.
  const { generateAiCoachSuggestions, generateAiDatePlans } = useChatAiActions({
    selectedChatProfile,
    chatThreads,
    selfProfile,
    appLanguage,
    getChemistryInsights,
    setAiCoachLoading,
    setAiCoachSuggestions,
    setAiDatePlannerLoading,
    setAiDatePlans,
  })

  const upcoming = useMemo(() => filteredProfiles.slice(index + 1, index + 3), [filteredProfiles, index])

  // resetDrag now lives in useDeck.

  const openProfileDetail = (profileId: number, fromScreen: AppScreen) => {
    setPreviousScreen(fromScreen)
    navigate('profile-detail', { profileId })
  }

  const closeProfileDetail = useCallback(() => {
    navigate(previousScreen)
  }, [navigate, previousScreen])

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

  // Match-only side effects. Runs ONLY after resolveMatch confirms a
  // mutual right-swipe. History + swipeLog commits happen earlier in
  // swipeCard (immediately after the exit animation) so the deck
  // advances without waiting on the network round-trip — that change
  // closes the "Viocanada flash" timing desync (D1, plan 2026-05-21).
  const onMatchConfirmed = useCallback(
    (profile: Profile) => {
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
    },
    [pushNotification, pushToast, setActiveMatch, setChatThreads, setMatchQueueIds, setUnreadChats],
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
        setExitDirection(null)
        resetDrag()

        // D1 fix: commit to history BEFORE awaiting backend. swipedIds
        // updates → byReviewed filter removes swipedProfile → filteredProfiles
        // shrinks by one in the SAME React render. Since the swiped card
        // is removed, the existing index (unchanged) now points to what
        // was the next card. No index advancement needed. This eliminates
        // the timing window where index had advanced but filteredProfiles
        // hadn't shrunk yet — the cause of cards flashing then vanishing.
        addSwipeHistory(swipedProfile.id, direction, false)
        setSwipeLog((current) => [
          ...current,
          { profileId: swipedProfile.id, direction, intent, wasMatch: false },
        ])

        try {
          if (isGuest) {
            // Guest Tour (Phase 4, 2026-05-26): no backend writes,
            // BUT every right-swipe results in a match so the tour
            // visitor can experience the celebration + the empty
            // chat surface they need to populate to feel what the
            // app is for. Demo profiles are pre-curated as plausible
            // candidates — none of them "pass" on the visitor.
            // Engagement counters (like / super-like usage) are
            // skipped: the visitor never sees a limit during the
            // tour and the counter wouldn't survive refresh anyway.
            if (direction === 'right' && (intent === 'like' || intent === 'super-like')) {
              addSwipeHistory(swipedProfile.id, direction, true)
              setSwipeLog((current) =>
                current.map((entry) =>
                  entry.profileId === swipedProfile.id && !entry.wasMatch
                    ? { ...entry, wasMatch: true }
                    : entry,
                ),
              )
              onMatchConfirmed(swipedProfile)
            }
          } else {
            await backendRecordSwipe(swipedProfile.id, direction)
            if (direction === 'right') {
              const wasMatch = await resolveMatch(swipedProfile.id)
              if (wasMatch) {
                // Upgrade history.matchIds + swipeLog entry. addSwipeHistory
                // is idempotent on likedIds (already includes the id from the
                // earlier call) but will add to matchIds when wasMatch=true.
                addSwipeHistory(swipedProfile.id, direction, true)
                setSwipeLog((current) =>
                  current.map((entry) =>
                    entry.profileId === swipedProfile.id && !entry.wasMatch
                      ? { ...entry, wasMatch: true }
                      : entry,
                  ),
                )
                onMatchConfirmed(swipedProfile)
              }
              if (intent === 'like' || intent === 'super-like') {
                recordLikeEvent()
                if (intent === 'super-like') {
                  recordSuperLikeEvent()
                  pushToast('Super Like sent.', 'success')
                }
                refreshEngagementUsage(activePlan)
              }
            }
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
      isGuest,
      activePlan,
      resetDrag,
      addSwipeHistory,
      setSwipeLog,
      onMatchConfirmed,
      pushToast,
      refreshEngagementUsage,
      setExitDirection,
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
    setActiveMatch,
    setIndex,
    setLastIntent,
    setRewindsLeft,
    setSwipeLog,
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

    // Guest Tour (2026-05-26, Phase 2): no cloud round-trip. Promote
    // the just-sent message to 'sent' locally, then schedule a single
    // auto-reply from the synthetic counterpart so the conversation
    // feels alive without going off-brand. Reply line is picked
    // round-robin from DEMO_AUTO_REPLIES[id] based on how many "me"
    // messages exist in the thread so the same reply doesn't fire
    // twice in a row.
    if (isGuest) {
      const guestTargetId = selectedChatProfile.id
      setChatThreads((current) => {
        const thread = current[guestTargetId] ?? []
        return {
          ...current,
          [guestTargetId]: thread.map((msg) =>
            msg.id === baseId ? { ...msg, status: 'sent' as const } : msg,
          ),
        }
      })
      const replies: readonly string[] =
        DEMO_AUTO_REPLIES[guestTargetId] ?? DEMO_GENERIC_AUTO_REPLIES
      if (replies.length > 0) {
        window.setTimeout(() => {
          setChatThreads((current) => {
            const thread = current[guestTargetId] ?? []
            const myCount = thread.filter((m) => m.sender === 'me').length
            const idx = Math.max(0, myCount - 1) % replies.length
            return {
              ...current,
              [guestTargetId]: [
                ...thread,
                {
                  id: Date.now() + Math.floor(Math.random() * 1000),
                  sender: 'them' as const,
                  text: replies[idx],
                  createdAt: Date.now(),
                  status: 'read' as const,
                },
              ],
            }
          })
        }, 1400)
      }
      return
    }

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
      reporterEmail: userEmail || 'guest@prive-app.club',
    })
    setSafetyReports((current) => [report, ...current].slice(0, 200))
    void (async () => {
      const submission = await backendSubmitReport({
        reportedProfileId: report.profileId,
        reportedProfileName: report.profileName,
        category: report.category,
        details: report.details,
        profileSnapshot: report.profileSnapshot,
      })
      if (!submission?.reportId) return
      // Fire-and-forget triage. The Edge Function writes the verdict back
      // to safety_reports via the service role; we also overlay it on the
      // local queue so the operator sees AI summary immediately.
      const verdict = await backendInvokeSafetyTriage({
        reportId: submission.reportId,
        category: report.category,
        details: report.details,
        profileSnapshot: {
          name: report.profileName,
          age: report.profileSnapshot.age,
          city: report.profileSnapshot.city,
          vibe: report.profileSnapshot.vibe,
          bio: report.profileSnapshot.bio,
          relationshipGoal: report.profileSnapshot.relationshipGoal,
        },
        language: appLanguage,
      })
      if (verdict) {
        setSafetyReports((current) =>
          current.map((item) =>
            item.id === report.id
              ? {
                  ...item,
                  aiRiskLevel: verdict.riskLevel,
                  aiCategories: verdict.categories,
                  aiSummary: verdict.summary,
                }
              : item,
          ),
        )
      }
    })()
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

  // D5 admin moderation: deactivate (or reactivate) a profile via the
  // admin_set_profile_active RPC. The server gates this on public.is_admin();
  // we additionally hide the trigger in the UI when isModerationAdmin is
  // false so a non-admin never sees the button. After success the user
  // is bumped back to Discover so the now-hidden profile isn't lingering.
  const handleToggleProfileActive = useCallback(
    async (profile: Profile) => {
      const nextActive = false // for the friend-test use case, only deactivation
      const confirmMsg =
        appLanguage === 'ro'
          ? `Dezactivează profilul "${profile.name}"? Va dispărea din toate deck-urile.`
          : `Deactivate "${profile.name}"? It will disappear from every deck.`
      if (typeof window !== 'undefined' && !window.confirm(confirmMsg)) {
        return
      }
      const ok = await backendAdminSetProfileActive(profile.id, nextActive)
      if (!ok) {
        pushToast(
          appLanguage === 'ro'
            ? 'Acțiunea de moderare a eșuat. Verifică drepturile de admin.'
            : 'Moderation action failed. Check admin permissions.',
          'error',
        )
        return
      }
      pushToast(
        appLanguage === 'ro'
          ? `${profile.name} a fost dezactivat.`
          : `${profile.name} has been deactivated.`,
        'success',
      )
      closeProfileDetail()
      // Remove the deactivated profile from local deck immediately so the
      // user doesn't have to wait for the next loadProfiles() refresh.
      setAllProfiles((current) => current.filter((p) => p.id !== profile.id))
    },
    [appLanguage, pushToast, closeProfileDetail, setAllProfiles],
  )

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

  // Phase D2.6 — keyboard shortcuts (Escape closes overlays + Discover
  // arrow/u shortcuts) now in useKeyboardShortcuts.
  useKeyboardShortcuts({
    screen,
    activeMatch,
    setActiveMatch,
    reportDraftProfile,
    closeReportProfileDialog,
    lightboxPhoto,
    closeLightbox,
    swipeCard,
    undoSwipe,
  })

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
    return 'Connect social accounts to build trust and help friends discover you faster on Privé.'
  }, [socialConnectedCount])

  const saveSelfProfilePatch = useCallback(
    (nextProfile: SelfProfile, successMessage?: string) => {
      setSelfProfile(nextProfile)
      setProfileDraft(toProfileDraft(nextProfile))
      // Guest Tour (Phase 4, 2026-05-26): no persistence for tour
      // visitors — the local React state above is the entire story;
      // it evaporates on signOut / refresh. The success toast still
      // fires so the user gets feedback that their change registered.
      if (!isGuest) {
        // Local persistence handled by `backendSaveSelfProfile`; avoid writing
        // the global fallback key which can leak another user's cache.
        void backendSaveSelfProfile(userEmail, nextProfile).catch(() => {
          pushToast('Saved locally, but cloud sync failed for profile.', 'error')
        })
      }
      if (successMessage) {
        pushToast(successMessage, 'success')
      }
    },
    [isGuest, userEmail, pushToast, setProfileDraft, setSelfProfile],
  )

  const suggestSocialHandle = (platform: SocialPlatform): string => {
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

  const sharePriveOnPlatform = async (platform: SocialPlatform) => {
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
  }

  // useCallback'd so ProfileScreen (React.memo'd) skips renders when only
  // unrelated parent state changes. Without this, every keystroke triggers
  // a full re-render of the ~1300-line editor.
  const handleProfileDraftChange = useCallback(
    (key: keyof typeof profileDraft, value: string) => {
      setProfileDraft((current) => ({
        ...current,
        [key]: value,
      }))
      setProfileSaveStatus('idle')
    },
    [setProfileDraft, setProfileSaveStatus],
  )

  const handleProfileDraftToggle = useCallback(
    (key: 'travelMode', checked: boolean) => {
      setProfileDraft((current) => ({
        ...current,
        [key]: checked,
      }))
      setProfileSaveStatus('idle')
    },
    [setProfileDraft, setProfileSaveStatus],
  )

  const handlePersonalityAnswerChange = (questionIndex: number, answer: LikertAnswer) => {
    setProfileDraft((current) => {
      const existing = current.personalityAnswers ?? Array<LikertAnswer | undefined>(PERSONALITY_QUESTION_COUNT).fill(undefined)
      const nextAnswers = [...existing] as Array<LikertAnswer | undefined>
      nextAnswers[questionIndex] = answer
      return {
        ...current,
        personalityAnswers: nextAnswers.every((value): value is LikertAnswer => value !== undefined)
          ? (nextAnswers as LikertAnswer[])
          : current.personalityAnswers,
      }
    })
    setProfileSaveStatus('idle')
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
      Array.isArray(profileDraft.personalityAnswers) &&
      profileDraft.personalityAnswers.length === PERSONALITY_QUESTION_COUNT &&
      profileDraft.personalityAnswers.every((v): v is LikertAnswer => v === 1 || v === 2 || v === 3 || v === 4 || v === 5)
        ? (profileDraft.personalityAnswers as LikertAnswer[])
        : undefined

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
      lovePersonality: selfProfile.lovePersonality,
      // Stability Assessment isn't edited via the profile form — carry it
      // through untouched so saving the profile never wipes it.
      stabilityAnswers: selfProfile.stabilityAnswers,
      stabilityProfile: selfProfile.stabilityProfile,
    }

    setSelfProfile(nextProfile)
    if (!isGuest) {
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
          await backendSaveSelfProfile(userEmail, migratedProfile)
        } catch {
          pushToast('Saved locally, but cloud sync failed for profile.', 'error')
        }
      })()
    }
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

  const {
    chatPreviews,
    filteredChatPreviews,
    selectedChatMessages,
    selectedChatCallHistory,
    hiddenChatMessageCount,
    selectedChatChemistry,
  } = useChatViews({
    matchedProfiles,
    chatThreads,
    unreadChats,
    chatSearch,
    selectedChatProfile,
    showFullChatHistory,
    callHistory,
    getChemistryInsights,
  })

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

  const unreadNotificationCount = useMemo(
    () => notifications.reduce((count, item) => count + (item.read ? 0 : 1), 0),
    [notifications],
  )

  // Moderation tab is admin-only AND hidden in Guest Tour (a visitor
  // exploring the app has no business seeing real users' reports).
  const navItems: Array<{ key: AppScreen; label: string; badge?: number }> = [
    { key: 'discover', label: copy.nav.discover },
    { key: 'activity', label: copy.nav.activity },
    { key: 'chats', label: copy.nav.chats, badge: Object.values(unreadChats).reduce((sum, count) => sum + count, 0) },
    ...(isModerationAdmin && !isGuest
      ? [{
          key: 'moderation' as AppScreen,
          label: copy.nav.moderation,
          badge: safetyReports.filter((report) => report.status === 'open').length,
        }]
      : []),
    { key: 'profile', label: copy.nav.profile },
    { key: 'settings', label: copy.nav.settings, badge: unreadNotificationCount },
  ]

  // Tier A (2026-05-24) — old DMFR personality code is gone. Screens now consume
  // the LovePersonality object (Big Five + Attachment + optional Claude reveal).
  // For remote profiles we only have the public derived fields (bigFive +
  // attachmentStyle); we don't reconstruct a full LovePersonality from those,
  // so screens read those two fields directly.
  const selfLovePersonality = selfProfile.lovePersonality ?? null
  const selectedDetailBigFive = selectedDetailProfile?.bigFive ?? null
  const selectedDetailAttachment = selectedDetailProfile?.attachmentStyle ?? null
  const selectedChatBigFive = selectedChatProfile?.bigFive ?? null
  const selectedChatAttachment = selectedChatProfile?.attachmentStyle ?? null
  // Waitlist v2 magic-link reply page — wins over EVERYTHING, including
  // the auth gate and password recovery. It's a public token-only route
  // the applicant reaches from the link Master sends them.
  if (waitlistReplyToken) {
    return (
      <WaitlistReplyScreen
        token={waitlistReplyToken}
        appLanguage={appLanguage}
        setAppLanguage={setAppLanguage}
        onExit={() => {
          setWaitlistReplyToken(null)
          // Clear the token from the URL so a refresh doesn't re-open it.
          if (typeof window !== 'undefined') {
            window.location.hash = '#/login'
          }
        }}
      />
    )
  }

  if (screen === 'login' || passwordRecoveryActive) {
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
        passwordRecoveryActive={passwordRecoveryActive}
        passwordRecoveryLoading={passwordRecoveryLoading}
        passwordRecoveryError={passwordRecoveryError}
        onCompletePasswordRecovery={completePasswordRecovery}
        forgotPasswordSending={forgotPasswordSending}
        forgotPasswordStatus={forgotPasswordStatus}
        onSendForgotPasswordEmail={sendForgotPasswordEmail}
        onResetForgotPasswordState={resetForgotPasswordState}
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
    const base = `linear-gradient(135deg, ${PRIVE_NAVY_2}, ${PRIVE_NAVY_3})`
    return `${veil}, ${bloom}, ${base}`
  }
  return (
    <main className={`app-shell app-shell--${screen}${isGuest ? ' app-shell--guest' : ''}`}>
      <UpdateBanner />
      {/* Dev-only build/viewport pill. Hidden in the real (built) app so it
          never clutters the header or covers the sign-out control. */}
      {import.meta.env.DEV && <BuildChip />}
      {/* Guest Tour persistent banner (Phase 3, 2026-05-26). Sits above
          every screen while isGuest, gently reminds the visitor they're
          in tour mode + offers a one-tap exit to sign up. The exit hits
          handleSignOut which (for guests) just clears local state and
          returns them to the landing hero. */}
      {isGuest ? (
        <div className="guest-banner" role="status">
          <span className="guest-banner-text">{copy.auth.guestBannerText}</span>
          <button
            type="button"
            className="guest-banner-cta"
            onClick={handleSignOut}
          >
            {copy.auth.guestBannerCta}
          </button>
        </div>
      ) : null}
      <div className="grain" aria-hidden="true" />
      {/* TopBar hides during full-screen takeover moments — onboarding,
          the Love Personality destination, and the retake quiz. Each of
          those screens owns its own header chrome so the global nav
          doesn't compete with the cinematic moment. */}
      {screen !== 'onboarding'
        && screen !== 'love-personality'
        && screen !== 'love-personality-quiz'
        && screen !== 'stability-quiz' && (
        <TopBar
          navItems={navItems}
          currentScreen={screen}
          onNavigate={navigate}
          exitToLoginLabel={copy.common.exitToLogin}
          exitAppLabel={copy.a11y.exitApp}
          onSignOut={handleSignOut}
          showExitAppButton={true}
          onExitApp={handleExitApp}
        />
      )}
      <section className={`screen-panel ${screen === 'discover' ? 'screen-panel--discover' : ''}`} aria-live="polite">
        {/* While the routing decision is pending — authed, local profile
            cache empty, cloud fetch still in flight — render nothing.
            The TopBar with the crest still shows, so the user sees the
            brand mark rather than a half-loaded Discover deck flashing
            "0 in deck" for half a second before being redirected to
            the onboarding wizard. */}
        {routeDecisionPending ? null : (<>
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
              appLanguage={appLanguage}
              matchCount={filteredProfiles.length}
            />
          </section>
        )}
        {screen === 'discover' && (
          <DiscoverScreen
            appLanguage={appLanguage}
            selfProfile={selfProfile}
            isGuest={isGuest}
            filteredProfiles={filteredProfiles}
            hiddenBreakdown={hiddenBreakdown}
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
            setBlockedProfileIds={setBlockedProfileIds}
            navigate={navigate}
            openProfileDetail={openProfileDetail}
            pushToast={pushToast}
            pushNotification={pushNotification}
            aiFilterStatus={aiFilterStatus}
            aiFilterPrompt={trimmedAiPrompt}
            stableMatchVerdict={stableMatchVerdict}
            selfStabilityProfile={selfProfile.stabilityProfile}
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
            selectedChatBigFive={selectedChatBigFive}
            selectedChatAttachment={selectedChatAttachment}
            selfLovePersonality={selfLovePersonality}
            selectedChatMessages={selectedChatMessages}
            selectedChatCallHistory={selectedChatCallHistory}
            hiddenChatMessageCount={hiddenChatMessageCount}
            revealOlderMessages={revealOlderMessages}
            messagesContainerRef={messagesContainerRef}
            handleMessagesScroll={handleMessagesScroll}
            aiCoachSuggestions={aiCoachSuggestions}
            aiCoachLoading={aiCoachLoading}
            generateAiCoachSuggestions={generateAiCoachSuggestions}
            clearAiCoachSuggestions={() => setAiCoachSuggestions([])}
            aiDatePlans={aiDatePlans}
            aiDatePlannerLoading={aiDatePlannerLoading}
            generateAiDatePlans={generateAiDatePlans}
            clearAiDatePlans={() => setAiDatePlans([])}
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
            saveMyProfile={saveMyProfile}
            profileSaveErrors={profileSaveErrors}
            selfLovePersonality={selfLovePersonality}
            socialConnectedCount={socialConnectedCount}
            onOpenPhotoStudio={() => navigate('photo-studio')}
            onOpenPersonalityGuide={() => navigate('personality-guide')}
            onOpenLovePersonality={() => navigate('love-personality')}
            onOpenLovePersonalityQuiz={() => navigate('love-personality-quiz')}
            onOpenStabilityQuiz={() => navigate('stability-quiz')}
            onOpenSettings={() => navigate('settings')}
          />
        )}

        {screen === 'photo-studio' && (
          <PhotoStudioScreen
            appLanguage={appLanguage}
            selfProfile={selfProfile}
            profileDraft={profileDraft}
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
            onBack={() => navigate('profile')}
          />
        )}

        {screen === 'personality-guide' && (
          <PersonalityGuideScreen
            appLanguage={appLanguage}
            selfLovePersonality={selfLovePersonality}
            onBackToProfile={() => navigate('profile')}
          />
        )}

        {screen === 'love-personality' && (
          <LovePersonalityScreen
            appLanguage={appLanguage}
            selfLovePersonality={selfLovePersonality}
            selfName={selfProfile.name}
            setSelfProfile={setSelfProfile}
            onRetake={() => navigate('love-personality-quiz')}
            onBackToProfile={() => navigate('profile')}
          />
        )}

        {screen === 'love-personality-quiz' && (
          <LovePersonalityQuizScreen
            appLanguage={appLanguage}
            selfProfile={selfProfile}
            setSelfProfile={setSelfProfile}
            onSaved={() => navigate('love-personality')}
            onCancel={() => navigate('love-personality')}
          />
        )}

        {screen === 'stability-quiz' && (
          <StabilityQuizScreen
            appLanguage={appLanguage}
            selfProfile={selfProfile}
            setSelfProfile={setSelfProfile}
            onSaved={() => navigate('profile')}
            onCancel={() => navigate('profile')}
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
            sharePriveOnPlatform={sharePriveOnPlatform}
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
            isGuest={isGuest}
            onOpenModeration={() => navigate('moderation')}
            onDeleteAccount={async () => {
              const ok = await backendDeleteSelfAccount()
              if (!ok) return false
              try {
                await handleSignOut()
              } catch {
                // Sign-out can fail because the user is already gone — fine.
              }
              return true
            }}
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
        {screen === 'onboarding' && (
          <OnboardingScreen
            appLanguage={appLanguage}
            selfProfile={selfProfile}
            setSelfProfile={setSelfProfile}
            pushToast={pushToast}
            onComplete={() => {
              navigate('discover', { replace: true })
            }}
            isGuest={isGuest}
          />
        )}
        {screen === 'profile-detail' && (
          <ProfileDetailScreen
            appLanguage={appLanguage}
            selectedDetailProfile={selectedDetailProfile ?? null}
            selfProfile={selfProfile}
            selfLovePersonality={selfLovePersonality}
            selectedDetailBigFive={selectedDetailBigFive}
            selectedDetailAttachment={selectedDetailAttachment}
            selectedDetailMatchAnalysis={selectedDetailMatchAnalysis ?? null}
            selectedDetailChemistry={selectedDetailChemistry ?? null}
            getCompatibilityScore={getCompatibilityScore}
            reportProfile={reportProfile}
            blockProfile={blockProfile}
            openLightbox={openLightbox}
            closeProfileDetail={closeProfileDetail}
            onBackToDiscover={() => navigate('discover')}
            isModerationAdmin={isModerationAdmin}
            onToggleProfileActive={handleToggleProfileActive}
            isMatched={Boolean(
              selectedDetailProfile && history.matchIds.includes(selectedDetailProfile.id),
            )}
            selfId={userEmail}
          />
        )}
        </>)}
      </section>
      <MatchCelebrationModal
        match={activeMatch}
        appLanguage={appLanguage}
        onDismiss={() => setActiveMatch(null)}
        onOpenChat={() => {
          if (!activeMatch) return
          setActiveChatId(activeMatch.id)
          setActiveMatch(null)
          navigate('chats')
        }}
      />
      <CallModal
        callState={callState}
        appLanguage={appLanguage}
        videoCallLabel={copy.chats.videoCallLabel}
        audioCallLabel={copy.chats.audioCallLabel}
        matchName={
          callState.targetProfileId
            ? profileById.get(callState.targetProfileId)?.name ??
              (appLanguage === 'ro' ? 'Potrivire' : 'Match')
            : appLanguage === 'ro' ? 'Potrivire' : 'Match'
        }
        displayName={selfProfile.name || userEmail.split('@')[0] || 'Privé guest'}
        jitsiProvider={jitsiProvider}
        onConnected={markCallConnected}
        onEnded={endCall}
        onFailed={markCallFailed}
        setMuted={setCallMuted}
        setCameraOff={setCallCameraOff}
        onCopyInvite={() => void copyCallInvite()}
        onOpenRoom={openCallRoom}
      />
      <ReportProfileDialog
        profile={reportDraftProfile}
        appLanguage={appLanguage}
        category={reportDraftCategory}
        setCategory={setReportDraftCategory}
        details={reportDraftDetails}
        setDetails={setReportDraftDetails}
        onCancel={closeReportProfileDialog}
        onSubmit={submitProfileReport}
      />
      <PhotoLightbox
        photoUrl={lightboxPhoto}
        zoom={lightboxZoom}
        setZoom={setLightboxZoom}
        zoomBy={zoomLightbox}
        onClose={closeLightbox}
      />
      <ToastStack toasts={toasts} />
      <MobileTabBar
        currentScreen={screen}
        onNavigate={navigate}
        items={[
          { key: 'discover', label: copy.nav.discover },
          { key: 'activity', label: copy.nav.activity, badge: notifications.filter((n) => !n.read).length },
                { key: 'chats', label: copy.nav.chats, badge: Object.values(unreadChats).reduce((s, c) => s + c, 0) },
          ...(isModerationAdmin
            ? [{ key: 'moderation' as const, label: copy.nav.moderation, badge: safetyReports.filter((r) => r.status === 'open').length }]
            : []),
          { key: 'profile', label: copy.nav.profile },
          { key: 'settings', label: copy.nav.settings, badge: unreadNotificationCount },
        ] satisfies MobileTabBarItem[]}
      />
    </main>
  )
}

export default App


