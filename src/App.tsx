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
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import './App.css'
import { getProfiles, resolveMatch, type Profile } from './services/loveDateApi'
import { FilterScreen } from './components/FilterScreen'
import { EmbeddedCallStage } from './components/EmbeddedCallStage'
import { Logo } from './components/Logo'
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
  backendLoadBlockedProfileIds,
  backendLoadSettings,
  backendSavePreferences,
  backendSaveSettings,
  backendUploadDataUrlPhotos,
  backendUploadProfilePhoto,
  purgeAllSelfProfileCaches,
  purgeOtherSelfProfileCaches,
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
  persistAppLanguage,
  readAppLanguage,
  readAuth,
  readCallHistory,
  readChatThreads,
  readCircleRsvps,
  readCirclePosts,
  readHistory,
  readJoinedCircles,
} from './persistence'

// Re-export Filters so legacy imports `from '../App'` still resolve.
export type { Filters }

/* cSpell:disable */
const UI_TEXT = {
  en: {
    nav: {
      discover: 'Discover',
      activity: 'Activity',
      circles: 'Circles',
      chats: 'Chats',
      moderation: 'Moderation',
      profile: 'Profile',
      settings: 'Settings',
    },
    auth: {
      signInTitle: 'Sign in to LoveDate',
      createTitle: 'Create your LoveDate account',
      inviteCode: 'Beta Invite Code',
      invitePlaceholder: 'Enter your invite code',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      passwordHint: 'Use at least 10 chars with uppercase, lowercase, number, and symbol.',
      pleaseWait: 'Please wait...',
      createAccount: 'Create Account',
      signIn: 'Sign In',
      continueGuest: 'Continue as Guest',
      switchToCreate: 'Create account',
      switchToLogin: 'I already have an account',
      language: 'App Language',
      english: 'English',
      romanian: 'Romanian',
    },
    common: {
      exitToLogin: 'Exit to Login',
      backToDiscover: 'Back to Discover',
      loading: 'Loading',
      error: 'Error',
      retry: 'Retry',
      noResults: 'No Results',
      reset: 'Reset',
      saveStatus: 'saved',
      savingStatus: 'saving',
      idleStatus: 'idle',
      errorStatus: 'error',
    },
    discover: {
      summary: 'Discover summary',
      inDeck: 'In Deck',
      matches: 'Matches',
      likesLeft: 'Likes Left',
      superLikes: 'Super Likes',
      openFilters: 'Open Filters',
      boost: 'Boost',
      resetFilters: 'Reset Filters',
      findingProfiles: 'Finding profiles near you...',
      noProfilesMatch: 'No profiles match your filters',
      upNext: 'Up Next',
      activeNow: 'Active now',
      zodiac: 'Zodiac',
      matchScore: 'Match score',
      personality: 'Personality',
      chemistry: 'Chemistry',
      cognitiveOverlap: 'Cognitive overlap',
      aligned: 'Aligned',
      neutral: 'Neutral',
      viewFullProfile: 'View full profile',
      pass: 'Pass',
      superLike: 'Super Like',
      like: 'Like',
      keyboardShortcuts: 'Keyboard shortcuts',
      undoHint: 'U (undo), Esc (close match).',
      likeLimitReached: 'Like limit reached for your current plan.',
      superLikeLimitReached: 'Super Like limit reached for this week.',
      checkingMatch: 'Checking for a match...',
      lastAction: 'Last action',
      deckComplete: 'Deck Complete',
      noMoreProfiles: 'No more profiles for these filters',
      startAgain: 'Start Again',
      clearHistory: 'Clear History',
    },
    settings: {
      controlCenter: 'Control Center',
      title: 'Settings',
      subtitle: 'Manage preferences, sharing, notifications, and safety from one polished dashboard.',
      profileSync: 'Profile sync',
      settingsSync: 'Settings sync',
      connectedSocials: 'Connected socials',
      unreadAlerts: 'Unread alerts',
      preferences: 'Preferences',
      pushNotifications: 'Push Notifications',
      emailNotifications: 'Email Notifications',
      privateMode: 'Private Mode',
      incognitoMode: 'Incognito Mode',
      appLanguage: 'App Language',
      syncLine: 'Settings: {settings} • Preferences sync: {preferences}',
    },
    activity: {
      overview: 'Activity overview',
      liked: 'Liked',
      passed: 'Passed',
      matches: 'Matches',
      noMatchesYet: 'No matches yet.',
      noLikesYet: 'No likes yet.',
      noPassesYet: 'No passes yet.',
      chat: 'Chat',
      view: 'View',
    },
    circles: {
      community: 'Circles community',
      title: 'Circles',
      subtitle: 'Join communities around interests and personality vibes.',
      search: 'Search circles',
      searchPlaceholder: 'Design, travel, coffee...',
      members: 'members',
      joined: 'Joined',
      explore: 'Explore',
      leaveCircle: 'Leave Circle',
      joinCircle: 'Join Circle',
      upcomingEvents: 'Upcoming Events',
      rsvpSaved: 'RSVP Saved',
      rsvp: 'RSVP',
      feed: 'Circle Feed',
      sharePrompt: 'Share something with this circle',
      sharePlaceholder: 'Post a thought, event idea, or question...',
      publishPost: 'Publish Post',
      noPosts: 'No posts yet. Be the first to start the conversation.',
      noCirclesFound: 'No circles found for this search.',
    },
    chats: {
      searchPlaceholder: 'Search conversations...',
      online: 'Online',
      audioCall: 'Audio call',
      videoCall: 'Video call',
      moreOptions: 'More options',
      compatibility: 'Compatibility snapshot',
      type: 'Type',
      zodiac: 'Zodiac',
      cognitive: 'Cognitive',
      unknown: 'Unknown',
      uniqueCosmicSignature: 'Unique cosmic signature.',
      aiCoach: 'AI Date Coach (Beta)',
      thinking: 'Thinking...',
      generateSuggestions: 'Generate suggestions',
      coachEmpty: 'Generate personalized opener ideas based on your chemistry and recent chat context.',
      aiPlanner: 'AI Date Planner (Beta)',
      planning: 'Planning...',
      planDate: 'Plan a date',
      useMessage: 'Use this message',
      plannerEmpty: 'Generate 3 personalized date plan options using your shared interests and chemistry.',
      recentCalls: 'Recent Calls',
      videoCallLabel: 'Video call',
      audioCallLabel: 'Audio call',
      rejoin: 'Rejoin',
      openRoom: 'Open room',
      noCallActivity: 'No call activity with this match yet.',
      olderMessages: 'Show {count} older messages',
      joinCall: 'Join call',
      openExternally: 'Open externally',
      attachmentReady: 'Attachment ready:',
      remove: 'Remove',
      typeMessage: 'Type a message...',
      attachMedia: 'Attach media',
      stopRecording: 'Stop recording',
      recordVoice: 'Record voice',
      send: 'Send',
      noChat: 'No Chat',
      selectMatch: 'Select a match to begin chatting',
    },
    profile: {
      screen: 'Profile screen',
      overview: 'Profile overview',
      aboutMe: 'About Me',
      personalityCode: 'Personality code',
      primary: 'Primary',
      support: 'Support',
      zodiacNote: 'Zodiac note',
      uniqueCosmicSignature: 'Unique cosmic signature.',
      whatCodeMeans: 'What does this code mean?',
      interests: 'Interests',
      socialTrust: 'Social Trust',
      connectedAccounts: 'Connected accounts',
      noSocialAccounts: 'No social accounts connected yet',
      editProfile: 'Edit My Profile',
      identity: 'Identity',
      name: 'Name',
      age: 'Age',
      pronouns: 'Pronouns',
      gender: 'Gender',
      orientation: 'Orientation',
      heightCm: 'Height (cm)',
      profileDetails: 'Profile Details',
      city: 'City',
      hometown: 'Hometown',
      vibe: 'Vibe',
      lookingFor: 'Looking For',
      relationshipIntent: 'Relationship Intent',
      interestsComma: 'Interests (comma separated)',
      bio: 'Bio',
      personalityQuiz: 'Personality Quiz',
      compatibilityCode: 'Compatibility code',
      pickOption: 'Pick the option that fits you best.',
      openGuide: 'Open personality guide',
      careerLifestyle: 'Career And Lifestyle',
      jobTitle: 'Job Title',
      company: 'Company',
      education: 'Education',
      languagesComma: 'Languages (comma separated)',
      drinking: 'Drinking',
      smoking: 'Smoking',
      workout: 'Workout',
      pets: 'Pets',
      childrenPlan: 'Children Plan',
      religion: 'Religion',
      politics: 'Politics',
      zodiac: 'Zodiac',
      promptsSocial: 'Prompts And Social',
      prompt1: 'Prompt 1',
      prompt2: 'Prompt 2',
      prompt3: 'Prompt 3',
      dealbreakersComma: 'Dealbreakers (comma separated)',
      instagram: 'Instagram',
      anthem: 'Anthem',
      travelMode: 'Travel Mode',
      photos: 'Photos',
      pastePhotoUrl: 'Paste photo URL',
      addUrl: 'Add URL',
      uploadPhoto: 'Upload photo (opens editor)',
      primaryPhoto: 'Primary',
      setAsPrimary: 'Set as Primary',
    },
  },
  ro: {
    nav: {
      discover: 'Descoperă',
      activity: 'Activitate',
      circles: 'Cercuri',
      chats: 'Chat-uri',
      moderation: 'Moderare',
      profile: 'Profil',
      settings: 'Setări',
    },
    auth: {
      signInTitle: 'Conectează-te la LoveDate',
      createTitle: 'Creează-ți contul LoveDate',
      inviteCode: 'Cod invitație beta',
      invitePlaceholder: 'Introdu codul de invitație',
      email: 'Email',
      password: 'Parolă',
      confirmPassword: 'Confirmă parola',
      passwordHint: 'Folosește cel puțin 10 caractere cu literă mare, literă mică, număr și simbol.',
      pleaseWait: 'Te rugăm așteaptă...',
      createAccount: 'Creează cont',
      signIn: 'Conectare',
      continueGuest: 'Continuă ca invitat',
      switchToCreate: 'Creează cont',
      switchToLogin: 'Am deja cont',
      language: 'Limba aplicației',
      english: 'Engleză',
      romanian: 'Română',
    },
    common: {
      exitToLogin: 'Ieși la autentificare',
      backToDiscover: 'Înapoi la Descoperă',
      loading: 'Se încarcă',
      error: 'Eroare',
      retry: 'Reîncearcă',
      noResults: 'Fără rezultate',
      reset: 'Resetează',
      saveStatus: 'salvat',
      savingStatus: 'se salvează',
      idleStatus: 'inactiv',
      errorStatus: 'eroare',
    },
    discover: {
      summary: 'Rezumat descoperire',
      inDeck: 'În pachet',
      matches: 'Potriviri',
      likesLeft: 'Like-uri rămase',
      superLikes: 'Super Like-uri',
      openFilters: 'Deschide filtrele',
      boost: 'Promovare',
      resetFilters: 'Resetează filtrele',
      findingProfiles: 'Căutăm profile în apropierea ta...',
      noProfilesMatch: 'Niciun profil nu se potrivește cu filtrele tale',
      upNext: 'Urmează',
      activeNow: 'Activ acum',
      zodiac: 'Zodie',
      matchScore: 'Scor compatibilitate',
      personality: 'Personalitate',
      chemistry: 'Chimie',
      cognitiveOverlap: 'Suprapunere cognitivă',
      aligned: 'Aliniat',
      neutral: 'Neutru',
      viewFullProfile: 'Vezi profilul complet',
      pass: 'Pas',
      superLike: 'Super Like',
      like: 'Like',
      keyboardShortcuts: 'Scurtături tastatură',
      undoHint: 'U (anulează), Esc (închide potrivirea).',
      likeLimitReached: 'Ai atins limita de Like-uri pentru planul tău curent.',
      superLikeLimitReached: 'Ai atins limita de Super Like-uri pentru această săptămână.',
      checkingMatch: 'Verificăm dacă există o potrivire...',
      lastAction: 'Ultima acțiune',
      deckComplete: 'Pachet terminat',
      noMoreProfiles: 'Nu mai există profile pentru aceste filtre',
      startAgain: 'Pornește din nou',
      clearHistory: 'Șterge istoricul',
    },
    settings: {
      controlCenter: 'Centru de control',
      title: 'Setări',
      subtitle: 'Gestionează preferințele, distribuirea, notificările și siguranța dintr-un singur panou elegant.',
      profileSync: 'Sincronizare profil',
      settingsSync: 'Sincronizare setări',
      connectedSocials: 'Rețele conectate',
      unreadAlerts: 'Alerte necitite',
      preferences: 'Preferințe',
      pushNotifications: 'Notificări push',
      emailNotifications: 'Notificări email',
      privateMode: 'Mod privat',
      incognitoMode: 'Mod incognito',
      appLanguage: 'Limba aplicației',
      syncLine: 'Setări: {settings} • Sincronizare preferințe: {preferences}',
    },
    activity: {
      overview: 'Prezentare activitate',
      liked: 'Apreciate',
      passed: 'Respinse',
      matches: 'Potriviri',
      noMatchesYet: 'Nu ai încă potriviri.',
      noLikesYet: 'Nu ai încă aprecieri.',
      noPassesYet: 'Nu ai încă respingeri.',
      chat: 'Chat',
      view: 'Vezi',
    },
    circles: {
      community: 'Comunitatea cercurilor',
      title: 'Cercuri',
      subtitle: 'Intră în comunități construite în jurul intereselor și al vibrației de personalitate.',
      search: 'Caută cercuri',
      searchPlaceholder: 'Design, călătorii, cafea...',
      members: 'membri',
      joined: 'Membru',
      explore: 'Explorează',
      leaveCircle: 'Părăsește cercul',
      joinCircle: 'Alătură-te cercului',
      upcomingEvents: 'Evenimente viitoare',
      rsvpSaved: 'RSVP salvat',
      rsvp: 'RSVP',
      feed: 'Fluxul cercului',
      sharePrompt: 'Spune ceva acestui cerc',
      sharePlaceholder: 'Publică un gând, o idee de eveniment sau o întrebare...',
      publishPost: 'Publică postarea',
      noPosts: 'Nu există încă postări. Fii primul care începe conversația.',
      noCirclesFound: 'Nu au fost găsite cercuri pentru această căutare.',
    },
    chats: {
      searchPlaceholder: 'Caută conversații...',
      online: 'Online',
      audioCall: 'Apel audio',
      videoCall: 'Apel video',
      moreOptions: 'Mai multe opțiuni',
      compatibility: 'Rezumat compatibilitate',
      type: 'Tip',
      zodiac: 'Zodie',
      cognitive: 'Cognitiv',
      unknown: 'Necunoscut',
      uniqueCosmicSignature: 'Semnătură cosmică unică.',
      aiCoach: 'Antrenor AI pentru întâlniri (Beta)',
      thinking: 'Se gândește...',
      generateSuggestions: 'Generează sugestii',
      coachEmpty: 'Generează idei personalizate de început de conversație pe baza chimiei și a contextului recent din chat.',
      aiPlanner: 'Planificator AI de întâlniri (Beta)',
      planning: 'Planifică...',
      planDate: 'Planifică o întâlnire',
      useMessage: 'Folosește mesajul',
      plannerEmpty: 'Generează 3 opțiuni personalizate de întâlnire folosind interesele și chimia voastră comună.',
      recentCalls: 'Apeluri recente',
      videoCallLabel: 'Apel video',
      audioCallLabel: 'Apel audio',
      rejoin: 'Reintră',
      openRoom: 'Deschide camera',
      noCallActivity: 'Nu există încă activitate de apel cu această potrivire.',
      olderMessages: 'Arată {count} mesaje mai vechi',
      joinCall: 'Intră în apel',
      openExternally: 'Deschide extern',
      attachmentReady: 'Atașament pregătit:',
      remove: 'Elimină',
      typeMessage: 'Scrie un mesaj...',
      attachMedia: 'Atașează media',
      stopRecording: 'Oprește înregistrarea',
      recordVoice: 'Înregistrează voce',
      send: 'Trimite',
      noChat: 'Fără chat',
      selectMatch: 'Selectează o potrivire pentru a începe conversația',
    },
    profile: {
      screen: 'Ecran profil',
      overview: 'Prezentare profil',
      aboutMe: 'Despre mine',
      personalityCode: 'Cod de personalitate',
      primary: 'Principal',
      support: 'Suport',
      zodiacNote: 'Notă zodiacală',
      uniqueCosmicSignature: 'Semnătură cosmică unică.',
      whatCodeMeans: 'Ce înseamnă acest cod?',
      interests: 'Interese',
      socialTrust: 'Încredere socială',
      connectedAccounts: 'Conturi conectate',
      noSocialAccounts: 'Nu există încă conturi sociale conectate',
      editProfile: 'Editează profilul meu',
      identity: 'Identitate',
      name: 'Nume',
      age: 'Vârstă',
      pronouns: 'Pronume',
      gender: 'Gen',
      orientation: 'Orientare',
      heightCm: 'Înălțime (cm)',
      profileDetails: 'Detalii profil',
      city: 'Oraș',
      hometown: 'Oraș natal',
      vibe: 'Vibe',
      lookingFor: 'Caut',
      relationshipIntent: 'Intenția relației',
      interestsComma: 'Interese (separate prin virgulă)',
      bio: 'Bio',
      personalityQuiz: 'Test de personalitate',
      compatibilityCode: 'Cod de compatibilitate',
      pickOption: 'Alege opțiunea care ți se potrivește cel mai bine.',
      openGuide: 'Deschide ghidul de personalitate',
      careerLifestyle: 'Carieră și stil de viață',
      jobTitle: 'Funcție',
      company: 'Companie',
      education: 'Educație',
      languagesComma: 'Limbi vorbite (separate prin virgulă)',
      drinking: 'Alcool',
      smoking: 'Fumat',
      workout: 'Sport',
      pets: 'Animale',
      childrenPlan: 'Plan pentru copii',
      religion: 'Religie',
      politics: 'Politică',
      zodiac: 'Zodie',
      promptsSocial: 'Prompturi și social',
      prompt1: 'Prompt 1',
      prompt2: 'Prompt 2',
      prompt3: 'Prompt 3',
      dealbreakersComma: 'Dealbreakers (separate prin virgulă)',
      instagram: 'Instagram',
      anthem: 'Imn',
      travelMode: 'Mod călătorie',
      photos: 'Poze',
      pastePhotoUrl: 'Lipește URL-ul pozei',
      addUrl: 'Adaugă URL',
      uploadPhoto: 'Încarcă poză (deschide editorul)',
      primaryPhoto: 'Principală',
      setAsPrimary: 'Setează ca principală',
    },
  },
} as const
/* cSpell:enable */

// PhotoStudio types now live in src/domain/photoStudio.ts (imported above via the domain barrel).

// Storage keys live in src/persistence/keys.ts (imported via the persistence barrel).
const CHAT_RENDER_WINDOW = 120
const APP_BOOT_TS = Date.now()

const CIRCLE_SEED: Circle[] = [
  {
    id: 'design-lounge',
    name: 'Design Lounge',
    theme: 'Creative critiques and inspiration',
    description: 'For product, UX, and visual people who love deep craft conversations and portfolio energy.',
    tags: ['Design', 'UX', 'Creativity'],
    memberCount: 182,
    hero:
      'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=2000&q=90',
    events: [
      { id: 'dl-event-1', title: 'UX Coffee Jam', when: 'Thu 19:00', where: 'Online room' },
      { id: 'dl-event-2', title: 'Portfolio Roast Night', when: 'Sat 21:00', where: 'Community Live' },
    ],
  },
  {
    id: 'travel-circle',
    name: 'Travel Circle',
    theme: 'Trips, city guides, and adventure plans',
    description: 'Share routes, hidden spots, and spontaneous weekend plans with fellow explorers.',
    tags: ['Travel', 'City breaks', 'Adventure'],
    memberCount: 246,
    hero:
      'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=2000&q=90',
    events: [
      { id: 'tr-event-1', title: '48h Escape Planning', when: 'Fri 18:30', where: 'Online room' },
      { id: 'tr-event-2', title: 'Budget Europe Hacks', when: 'Sun 20:00', where: 'Audio circle' },
    ],
  },
  {
    id: 'coffee-club',
    name: 'Coffee Club',
    theme: 'Beans, cafes, and cozy date spots',
    description: 'From espresso rituals to best date-friendly cafes in every city.',
    tags: ['Coffee', 'Brunch', 'Cafes'],
    memberCount: 139,
    hero:
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=2000&q=90',
    events: [
      { id: 'cf-event-1', title: 'Home Brew Workshop', when: 'Wed 20:30', where: 'Live stream' },
      { id: 'cf-event-2', title: 'Best First-Date Cafes', when: 'Sat 17:00', where: 'Group chat' },
    ],
  },
  {
    id: 'music-vinyl',
    name: 'Music & Vinyl',
    theme: 'Playlists, vinyl finds, and concerts',
    description: 'Share sounds, discover artists, and plan live-gig meetups.',
    tags: ['Music', 'Vinyl', 'Concerts'],
    memberCount: 167,
    hero:
      'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=2000&q=90',
    events: [
      { id: 'mv-event-1', title: 'Friday Playlist Battle', when: 'Fri 22:00', where: 'Live room' },
      { id: 'mv-event-2', title: 'Album Listening Party', when: 'Sun 21:00', where: 'Audio circle' },
    ],
  },
]

const SOCIAL_PLATFORM_META: Array<{ id: SocialPlatform; label: string; shortLabel: string }> = [
  { id: 'x', label: 'X (Twitter)', shortLabel: 'X' },
  { id: 'instagram', label: 'Instagram', shortLabel: 'IG' },
  { id: 'facebook', label: 'Facebook', shortLabel: 'FB' },
  { id: 'linkedin', label: 'LinkedIn', shortLabel: 'LI' },
  { id: 'tiktok', label: 'TikTok', shortLabel: 'TT' },
]

const DEFAULT_SOCIAL_CONNECTIONS: SocialConnections = {
  x: { connected: false, handle: '' },
  instagram: { connected: false, handle: '' },
  facebook: { connected: false, handle: '' },
  linkedin: { connected: false, handle: '' },
  tiktok: { connected: false, handle: '' },
}

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

const toDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === 'string') {
        resolve(result)
      } else {
        reject(new Error('Could not read media file.'))
      }
    }
    reader.onerror = () => reject(reader.error ?? new Error('Could not read media file.'))
    reader.readAsDataURL(blob)
  })

const getStrongPasswordError = (password: string): string | null => {
  if (password.length < 10) {
    return 'Password must be at least 10 characters.'
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must include at least one uppercase letter.'
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must include at least one lowercase letter.'
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must include at least one number.'
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'Password must include at least one symbol.'
  }
  return null
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
  // Default to 'any' so a brand-new user with no opposite-gender profiles
  // in the deck doesn't see an empty discover screen on first run.
  gender: 'any',
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
  socialConnections: DEFAULT_SOCIAL_CONNECTIONS,
  socialPromotionOptIn: true,
  travelMode: false,
  photos: [
    'https://images.unsplash.com/photo-1521119989659-a83eee488004?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=3000&q=100&dpr=2&fm=webp',
  ],
  personalityAnswers: ['B', 'A', 'A', 'A', 'A', 'A', 'A', 'A'],
}

// Empty profile used for new users so fields render blank instead of
// showing example/demo data.
// Dropdown option lists. Some are gated by DB CHECK constraints (gender,
// relationshipIntent → public.profiles.relationship_goal); the rest are
// soft conventions to keep deck filters useful and free-text entropy down.
const GENDER_OPTIONS = ['Woman', 'Man', 'Non-binary'] as const
const ZODIAC_OPTIONS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const
const RELATIONSHIP_INTENT_OPTIONS = ['Long-term', 'Short-term', 'Friends', 'Figuring it out'] as const
const PRONOUNS_OPTIONS = ['She/Her', 'He/Him', 'They/Them', 'She/They', 'He/They', 'Other'] as const
const ORIENTATION_OPTIONS = ['Straight', 'Gay', 'Lesbian', 'Bisexual', 'Pansexual', 'Asexual', 'Queer', 'Open', 'Other'] as const
const LOOKING_FOR_OPTIONS = [
  'Long-term relationship',
  'Short-term, open to long',
  'Short-term fun',
  'New friends',
  'Figuring it out',
] as const
const DRINKING_OPTIONS = ['Never', 'Rarely', 'Socially', 'Often', 'Prefer not to say'] as const
const SMOKING_OPTIONS = ['Never', 'Socially', 'Regularly', 'Trying to quit', 'Prefer not to say'] as const
const WORKOUT_OPTIONS = ['Never', 'Sometimes', '1-2x per week', '3x per week', '4-5x per week', 'Daily'] as const
const CHILDREN_PLAN_OPTIONS = [
  'Want someday',
  'Maybe someday',
  'Don’t want',
  'Have and want more',
  'Have, don’t want more',
  'Prefer not to say',
] as const
const PETS_OPTIONS = ['Dog person', 'Cat person', 'Both', 'Allergic', 'Want one', 'Prefer not to say'] as const
const RELIGION_OPTIONS = [
  'Agnostic', 'Atheist', 'Buddhist', 'Christian', 'Hindu', 'Jewish',
  'Muslim', 'Spiritual', 'Other', 'Prefer not to say',
] as const
const POLITICS_OPTIONS = ['Liberal', 'Moderate', 'Conservative', 'Apolitical', 'Other', 'Prefer not to say'] as const

const EMPTY_SELF_PROFILE: SelfProfile = {
  name: '',
  age: 0,
  city: '',
  vibe: '',
  bio: '',
  interests: [],
  pronouns: '',
  gender: '',
  orientation: '',
  lookingFor: '',
  relationshipIntent: '',
  heightCm: 0,
  jobTitle: '',
  company: '',
  education: '',
  hometown: '',
  languages: [],
  drinking: '',
  smoking: '',
  workout: '',
  religion: '',
  politics: '',
  zodiac: '',
  childrenPlan: '',
  pets: '',
  promptOne: '',
  promptTwo: '',
  promptThree: '',
  dealbreakers: [],
  instagram: '',
  anthem: '',
  socialConnections: DEFAULT_SOCIAL_CONNECTIONS,
  socialPromotionOptIn: false,
  travelMode: false,
  photos: [],
  personalityAnswers: Array(PERSONALITY_QUESTIONS.length).fill(''),
}

const PERSONALITY_DIMENSIONS: Array<{
  letter: string
  title: string
  meaning: string
  opposite: string
}> = [
  {
    letter: 'D',
    title: 'Dynamic',
    meaning: 'High energy, action-first, proactive in social and romantic momentum.',
    opposite: 'C (Calm)',
  },
  {
    letter: 'C',
    title: 'Calm',
    meaning: 'Grounded energy, reflective style, prefers steadier pace and emotional depth.',
    opposite: 'D (Dynamic)',
  },
  {
    letter: 'S',
    title: 'Spontaneous',
    meaning: 'Enjoys flexible plans, novelty, and in-the-moment decisions.',
    opposite: 'M (Measured)',
  },
  {
    letter: 'M',
    title: 'Measured',
    meaning: 'Likes deliberate pacing, clarity, and thoughtful progression.',
    opposite: 'S (Spontaneous)',
  },
  {
    letter: 'O',
    title: 'Outgoing',
    meaning: 'Socially expressive, gains energy from people and active interaction.',
    opposite: 'F (Focused)',
  },
  {
    letter: 'F',
    title: 'Focused',
    meaning: 'Selective with social energy, prefers fewer but deeper connections.',
    opposite: 'O (Outgoing)',
  },
  {
    letter: 'A',
    title: 'Adaptive',
    meaning: 'Comfortable with uncertainty, adjusts quickly when plans shift.',
    opposite: 'R (Reliable)',
  },
  {
    letter: 'R',
    title: 'Reliable',
    meaning: 'Values structure, consistency, and predictable emotional safety.',
    opposite: 'A (Adaptive)',
  },
]

const PERSONALITY_TYPE_GUIDE: Array<{
  code: string
  label: string
  summary: string
}> = [
  { code: 'DSOA', label: 'Spark Explorer', summary: 'Fast-moving, social, and flexible. Thrives on novelty and momentum.' },
  { code: 'DSOR', label: 'Social Trailblazer', summary: 'Bold and outgoing, but with a dependable backbone in relationships.' },
  { code: 'DSFA', label: 'Focused Adventurer', summary: 'Energetic and spontaneous with a selective, depth-first social style.' },
  { code: 'DSFR', label: 'Intentional Firestarter', summary: 'High-energy and direct, yet loyal to structure where it matters.' },
  { code: 'DMOA', label: 'Vision Catalyst', summary: 'Driven and social with thoughtful pacing and adaptable execution.' },
  { code: 'DMOR', label: 'Strategic Charmer', summary: 'People-oriented and confident, blending planning with charisma.' },
  { code: 'DMFA', label: 'Calibrated Maverick', summary: 'Purposeful intensity, private depth, and flexible life navigation.' },
  { code: 'DMFR', label: 'Architect Heart', summary: 'Ambitious, intentional, and loyal. Builds relationships with depth and structure.' },
  { code: 'CSOA', label: 'Warm Voyager', summary: 'Gentle energy with social spontaneity and openness to change.' },
  { code: 'CSOR', label: 'Steady Connector', summary: 'Calm and social with a dependable, grounding relationship style.' },
  { code: 'CSFA', label: 'Quiet Wanderer', summary: 'Reflective and selective, but playful and open to surprises.' },
  { code: 'CSFR', label: 'Grounded Romantic', summary: 'Soft-spoken and intentional, values trust, consistency, and emotional depth.' },
  { code: 'CMOA', label: 'Balanced Diplomat', summary: 'Thoughtful and social, prefers quality pacing with adaptive mindset.' },
  { code: 'CMOR', label: 'Harmony Builder', summary: 'Reliable, people-centered, and emotionally steady in long-term dynamics.' },
  { code: 'CMFA', label: 'Reflective Creator', summary: 'Calm, inward-focused, and flexible. Builds strong one-to-one bonds.' },
  { code: 'CMFR', label: 'Deep Anchor', summary: 'Reserved, consistent, and deeply loyal. Strong foundation for stable love.' },
]

const PERSONALITY_COGNITIVE_FUNCTIONS: Record<
  string,
  { primary: string; support: string; tertiary: string; shadow: string }
> = {
  DSOA: {
    primary: 'Se Vision: Acts quickly on chemistry and real-world momentum.',
    support: 'Fe Sync: Reads social energy and adapts to group dynamics.',
    tertiary: 'Ne Spark: Generates new date ideas and playful possibilities.',
    shadow: 'Ti Check: Can skip reflection when moving too fast.',
  },
  DSOR: {
    primary: 'Se Vision: Confident action and direct romantic initiative.',
    support: 'Te Structuring: Turns attraction into clear plans.',
    tertiary: 'Fe Warmth: Social ease and expressive connection style.',
    shadow: 'Ni Overfocus: May lock on outcomes too early.',
  },
  DSFA: {
    primary: 'Se Vision: Loves immediate chemistry and shared experiences.',
    support: 'Fi Depth: Strong private values and emotional authenticity.',
    tertiary: 'Ne Spark: Creative twists and spontaneous exploration.',
    shadow: 'Te Rigidity: Can resist external structure.',
  },
  DSFR: {
    primary: 'Se Vision: Action-led and physically present in connection.',
    support: 'Si Loyalty: Builds trust through consistency and routines.',
    tertiary: 'Fi Depth: Selective emotional openness.',
    shadow: 'Ne Drift: May feel stretched by too many options.',
  },
  DMOA: {
    primary: 'Te Structuring: Goal-oriented, clear, and execution-focused.',
    support: 'Ne Spark: Expands options and sees future opportunities.',
    tertiary: 'Fe Warmth: Engages socially with confidence.',
    shadow: 'Fi Doubt: Can postpone vulnerable emotional expression.',
  },
  DMOR: {
    primary: 'Te Structuring: Organizes relationships with clarity and intent.',
    support: 'Si Loyalty: Reliable follow-through and practical care.',
    tertiary: 'Fe Warmth: Social confidence with emotional steadiness.',
    shadow: 'Ne Drift: May over-control uncertainty.',
  },
  DMFA: {
    primary: 'Ni Patterning: Strategic thinker who sees deeper direction.',
    support: 'Te Structuring: Turns insight into real action.',
    tertiary: 'Fi Depth: Protective inner values and selective intimacy.',
    shadow: 'Se Overload: Can feel drained by chaotic environments.',
  },
  DMFR: {
    primary: 'Ni Patterning: Reads long-term compatibility and relational trajectory.',
    support: 'Te Structuring: Creates secure, practical relationship systems.',
    tertiary: 'Fi Depth: Values loyalty, integrity, and emotional truth.',
    shadow: 'Se Overload: May underplay present-moment spontaneity.',
  },
  CSOA: {
    primary: 'Fe Sync: Nurtures social harmony and emotional inclusion.',
    support: 'Ne Spark: Curious, playful, and idea-open in dating.',
    tertiary: 'Si Loyalty: Warm consistency over time.',
    shadow: 'Ti Detach: Can delay hard boundaries.',
  },
  CSOR: {
    primary: 'Fe Sync: Relationship-centered and emotionally attentive.',
    support: 'Si Loyalty: Reliable care and steady relational rituals.',
    tertiary: 'Ne Spark: Open to shared adventures when trust is high.',
    shadow: 'Ti Detach: May over-prioritize peace over clarity.',
  },
  CSFA: {
    primary: 'Fi Depth: Values emotional authenticity and one-to-one truth.',
    support: 'Ne Spark: Creative romantic expression.',
    tertiary: 'Si Loyalty: Stable, memory-rich attachment style.',
    shadow: 'Te Push: Can avoid direct confrontation.',
  },
  CSFR: {
    primary: 'Fi Depth: Deeply values sincerity and emotional safety.',
    support: 'Si Loyalty: Grounded, nurturing, and dependable presence.',
    tertiary: 'Ne Spark: Gentle curiosity in connection.',
    shadow: 'Te Push: May need time before decisive action.',
  },
  CMOA: {
    primary: 'Ti Check: Reflective analysis before commitment.',
    support: 'Ne Spark: Enjoys idea-rich conversations and novelty.',
    tertiary: 'Fe Sync: Warms gradually through shared understanding.',
    shadow: 'Si Stuck: Can over-reference past patterns.',
  },
  CMOR: {
    primary: 'Si Loyalty: Stability-first and trust-building over time.',
    support: 'Te Structuring: Clear standards and practical consistency.',
    tertiary: 'Fe Warmth: Gentle care with social reliability.',
    shadow: 'Ne Drift: May resist rapid change.',
  },
  CMFA: {
    primary: 'Fi Depth: Inner-value led and emotionally nuanced.',
    support: 'Ni Patterning: Sees meaning and long-range dynamics.',
    tertiary: 'Se Presence: Expresses through lived moments.',
    shadow: 'Te Push: Can under-communicate concrete needs.',
  },
  CMFR: {
    primary: 'Si Loyalty: Consistent, grounded, and emotionally dependable.',
    support: 'Fi Depth: Quiet but profound emotional sincerity.',
    tertiary: 'Te Structuring: Practical support and long-term reliability.',
    shadow: 'Ne Drift: Hesitates with ambiguous or rapidly changing dynamics.',
  },
}

const ZODIAC_DESCRIPTIONS: Record<
  string,
  {
    overview: string
    loveStyle: string
    communication: string
    greenFlags: string
    growthEdge: string
    bestMatches: string
  }
> = {
  Aries: {
    overview: 'Bold initiator with passionate momentum. Aries moves fast when chemistry feels real.',
    loveStyle: 'Direct, playful, and action-oriented. Loves dates that feel alive and adventurous.',
    communication: 'Honest and immediate. Prefers clarity over mixed signals.',
    greenFlags: 'Courage, loyalty in conflict, and willingness to show up quickly.',
    growthEdge: 'Can rush emotional pacing before deeper alignment is established.',
    bestMatches: 'Leo, Sagittarius, Gemini, Aquarius, Libra',
  },
  Taurus: {
    overview: 'Steady sensualist who builds love through consistency, touch, and trust.',
    loveStyle: 'Slow-burn and devoted. Invests deeply once safety is established.',
    communication: 'Grounded and practical. Values reliability in words and actions.',
    greenFlags: 'Emotional stability, patience, and dependable follow-through.',
    growthEdge: 'May resist change or hold on to comfort too long.',
    bestMatches: 'Virgo, Capricorn, Cancer, Pisces',
  },
  Gemini: {
    overview: 'Curious connector who bonds through ideas, humor, and mental spark.',
    loveStyle: 'Playful, social, and novelty-seeking. Thrives in dynamic conversations.',
    communication: 'Fast, expressive, and witty. Loves responsive dialogue.',
    greenFlags: 'Open-mindedness, adaptability, and social intelligence.',
    growthEdge: 'Can struggle with emotional consistency when bored.',
    bestMatches: 'Libra, Aquarius, Aries, Leo',
  },
  Cancer: {
    overview: 'Protective heart with strong emotional intuition and care instincts.',
    loveStyle: 'Nurturing, attachment-oriented, and deeply sentimental.',
    communication: 'Emotion-first and subtle. Reads tone and intention carefully.',
    greenFlags: 'Loyalty, compassion, and relationship dedication.',
    growthEdge: 'May withdraw or become defensive when feeling unsafe.',
    bestMatches: 'Scorpio, Pisces, Taurus, Virgo',
  },
  Leo: {
    overview: 'Warm spotlight giver who loves expressive romance and confident connection.',
    loveStyle: 'Generous, loyal, and affectionate. Enjoys visible appreciation.',
    communication: 'Open and charismatic. Responds well to sincere admiration.',
    greenFlags: 'Big-hearted devotion, protective instinct, and consistency in affection.',
    growthEdge: 'Can over-index on validation when feeling unseen.',
    bestMatches: 'Aries, Sagittarius, Gemini, Libra',
  },
  Virgo: {
    overview: 'Intentional partner who expresses love through care, precision, and effort.',
    loveStyle: 'Practical devotion. Builds trust through meaningful details.',
    communication: 'Clear, thoughtful, and solution-oriented.',
    greenFlags: 'Reliability, emotional responsibility, and strong standards.',
    growthEdge: 'May overanalyze or become too self-critical.',
    bestMatches: 'Taurus, Capricorn, Cancer, Scorpio',
  },
  Libra: {
    overview: 'Harmony seeker who values emotional balance, aesthetics, and mutuality.',
    loveStyle: 'Romantic, socially graceful, and partnership-focused.',
    communication: 'Diplomatic and relational. Prefers collaborative tone.',
    greenFlags: 'Fairness, charm, and commitment to mutual respect.',
    growthEdge: 'Can delay hard decisions to avoid conflict.',
    bestMatches: 'Gemini, Aquarius, Leo, Sagittarius',
  },
  Scorpio: {
    overview: 'Intensity and depth sign. Bonds through trust, loyalty, and emotional truth.',
    loveStyle: 'All-in attachment with strong protective and transformative energy.',
    communication: 'Private but piercingly honest when trust is built.',
    greenFlags: 'Emotional courage, loyalty, and deep commitment.',
    growthEdge: 'Can become guarded or controlling under uncertainty.',
    bestMatches: 'Cancer, Pisces, Virgo, Capricorn',
  },
  Sagittarius: {
    overview: 'Freedom-loving explorer with optimistic, curious dating energy.',
    loveStyle: 'Adventure-forward and honest. Needs space and shared growth.',
    communication: 'Straightforward, candid, and future-oriented.',
    greenFlags: 'Authenticity, positivity, and openness to exploration.',
    growthEdge: 'May avoid emotional heaviness if pace feels restrictive.',
    bestMatches: 'Aries, Leo, Libra, Aquarius',
  },
  Capricorn: {
    overview: 'Grounded builder who takes commitment seriously and plans long-term.',
    loveStyle: 'Stable, intentional, and loyalty-centered.',
    communication: 'Measured and practical. Prefers substance over drama.',
    greenFlags: 'Reliability, ambition, and strong relational accountability.',
    growthEdge: 'Can appear emotionally reserved during early stages.',
    bestMatches: 'Taurus, Virgo, Scorpio, Pisces',
  },
  Aquarius: {
    overview: 'Independent visionary who seeks authenticity, ideas, and mutual freedom.',
    loveStyle: 'Friendship-led intimacy with strong individuality.',
    communication: 'Conceptual, open-minded, and future-facing.',
    greenFlags: 'Respect for boundaries, originality, and intellectual honesty.',
    growthEdge: 'Can intellectualize emotions instead of feeling them fully.',
    bestMatches: 'Gemini, Libra, Sagittarius, Aries',
  },
  Pisces: {
    overview: 'Empathic dreamer with rich intuition and romantic imagination.',
    loveStyle: 'Tender, soulful, and emotionally immersive.',
    communication: 'Sensitive and symbolic. Needs emotional safety.',
    greenFlags: 'Compassion, creativity, and emotional attunement.',
    growthEdge: 'May blur boundaries when idealizing connection.',
    bestMatches: 'Cancer, Scorpio, Taurus, Capricorn',
  },
}

const ZODIAC_DEEP_DIVE: Record<
  string,
  {
    emotionalNeeds: string
    intimacyStyle: string
    conflictStyle: string
    idealDateEnergy: string
  }
> = {
  Aries: {
    emotionalNeeds: 'Respect, momentum, and a partner who meets intensity with honesty.',
    intimacyStyle: 'Passionate and direct. Attraction grows through shared action and challenge.',
    conflictStyle: 'Fast and fiery, then ready to reset when clarity is reached.',
    idealDateEnergy: 'Active, bold, and spontaneous.',
  },
  Taurus: {
    emotionalNeeds: 'Safety, consistency, and trustworthy routines.',
    intimacyStyle: 'Sensual, loyal, and gradually deepening through reliability.',
    conflictStyle: 'Patient, but stubborn when boundaries or values are pushed.',
    idealDateEnergy: 'Cozy, tactile, and grounded.',
  },
  Gemini: {
    emotionalNeeds: 'Mental stimulation, playfulness, and freedom to explore ideas.',
    intimacyStyle: 'Curious and conversational. Attraction grows through shared wit and novelty.',
    conflictStyle: 'Talks things out quickly, but may shift topics when emotions get heavy.',
    idealDateEnergy: 'Light, social, and intellectually fun.',
  },
  Cancer: {
    emotionalNeeds: 'Emotional safety, reassurance, and genuine care.',
    intimacyStyle: 'Deep bonding, nurturing gestures, and trust-first vulnerability.',
    conflictStyle: 'Protective and sensitive. Needs warmth and patience to reopen.',
    idealDateEnergy: 'Tender, private, and heartfelt.',
  },
  Leo: {
    emotionalNeeds: 'Appreciation, loyalty, and emotional admiration.',
    intimacyStyle: 'Warm, affectionate, and expressive with generous romantic effort.',
    conflictStyle: 'Proud but sincere. Resolves best through respectful acknowledgment.',
    idealDateEnergy: 'Playful, glamorous, and celebratory.',
  },
  Virgo: {
    emotionalNeeds: 'Reliability, practical care, and emotional sincerity.',
    intimacyStyle: 'Detail-driven devotion. Love is shown through thoughtful consistency.',
    conflictStyle: 'Analytical and solution-focused; prefers constructive, calm repair.',
    idealDateEnergy: 'Intentional, quality-focused, and meaningful.',
  },
  Libra: {
    emotionalNeeds: 'Mutual respect, emotional harmony, and balanced partnership.',
    intimacyStyle: 'Romantic, attentive, and aesthetically minded connection.',
    conflictStyle: 'Diplomatic, but can delay tension if tone feels harsh.',
    idealDateEnergy: 'Elegant, social, and emotionally balanced.',
  },
  Scorpio: {
    emotionalNeeds: 'Trust, loyalty, and emotional depth without games.',
    intimacyStyle: 'Intense and transformative. Bonds through honesty and total presence.',
    conflictStyle: 'All-or-nothing when trust is threatened; repairs through truth and accountability.',
    idealDateEnergy: 'Private, magnetic, and emotionally deep.',
  },
  Sagittarius: {
    emotionalNeeds: 'Freedom, honesty, and shared growth.',
    intimacyStyle: 'Adventure-led bonding with authentic, unfiltered connection.',
    conflictStyle: 'Direct and blunt; needs room plus perspective to reconnect.',
    idealDateEnergy: 'Exploratory, optimistic, and expansive.',
  },
  Capricorn: {
    emotionalNeeds: 'Respect, long-term alignment, and proven reliability.',
    intimacyStyle: 'Steady commitment that deepens through earned trust.',
    conflictStyle: 'Controlled and pragmatic; prefers solutions and accountability.',
    idealDateEnergy: 'Structured, quality-driven, and purposeful.',
  },
  Aquarius: {
    emotionalNeeds: 'Authenticity, space, and intellectual equality.',
    intimacyStyle: 'Friendship-first intimacy with strong individuality.',
    conflictStyle: 'Detached at first; re-engages through logic and fairness.',
    idealDateEnergy: 'Original, unconventional, and idea-rich.',
  },
  Pisces: {
    emotionalNeeds: 'Emotional tenderness, empathy, and gentle clarity.',
    intimacyStyle: 'Soulful and imaginative. Love flows through emotional resonance.',
    conflictStyle: 'Avoidant under pressure, but deeply receptive to soft honesty.',
    idealDateEnergy: 'Dreamy, creative, and emotionally safe.',
  },
}

const cognitiveFunctionTokens = (stack: {
  primary: string
  support: string
  tertiary: string
  shadow: string
}): string[] => {
  const toToken = (value: string) => value.trim().split(/\s+/)[0] ?? ''
  return [toToken(stack.primary), toToken(stack.support), toToken(stack.tertiary), toToken(stack.shadow)].filter(
    (item) => item.length > 0,
  )
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

  if (path === '/circles') {
    return { screen: 'circles', profileId: null }
  }

  if (path === '/chats') {
    return { screen: 'chats', profileId: null }
  }

  if (path === '/profile') {
    return { screen: 'profile', profileId: null }
  }

  if (path === '/personality-guide') {
    return { screen: 'personality-guide', profileId: null }
  }

  if (path === '/settings') {
    return { screen: 'settings', profileId: null }
  }

  if (path === '/moderation') {
    return { screen: 'moderation', profileId: null }
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

  if (screen === 'moderation') {
    return '/moderation'
  }

  if (screen === 'personality-guide') {
    return '/personality-guide'
  }

  if (screen === 'circles') {
    return '/circles'
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

// readAuth, readHistory now live in src/persistence/ (imported above).

const normalizeSelfProfile = (raw: unknown): SelfProfile => {
  try {
    const parsed = (raw ?? null) as Partial<SelfProfile> | null
    if (!parsed) {
      return EMPTY_SELF_PROFILE
    }
    const safeInterests = Array.isArray(parsed.interests)
      ? parsed.interests.filter((value): value is string => typeof value === 'string').slice(0, 6)
      : EMPTY_SELF_PROFILE.interests
    const safeLanguages = Array.isArray(parsed.languages)
      ? parsed.languages.filter((value): value is string => typeof value === 'string').slice(0, 6)
      : EMPTY_SELF_PROFILE.languages
    const safeDealbreakers = Array.isArray(parsed.dealbreakers)
      ? parsed.dealbreakers.filter((value): value is string => typeof value === 'string').slice(0, 8)
      : EMPTY_SELF_PROFILE.dealbreakers
    const safePhotos = Array.isArray(parsed.photos)
      ? parsed.photos.filter((value): value is string => typeof value === 'string' && value.trim().length > 0).slice(0, 9)
      : EMPTY_SELF_PROFILE.photos

    const safeString = (value: unknown, fallback = ''): string => {
      return typeof value === 'string' && value.trim().length > 0 ? value : fallback
    }
    const parsedSocialRaw = parsed.socialConnections
    const parsedSocialObject =
      parsedSocialRaw && typeof parsedSocialRaw === 'object'
        ? (parsedSocialRaw as Partial<Record<SocialPlatform, Partial<SocialConnection>>>)
        : {}
    const safeSocialConnections = SOCIAL_PLATFORM_META.reduce((accumulator, platform) => {
      const next = parsedSocialObject[platform.id]
      accumulator[platform.id] = {
        connected:
          typeof next?.connected === 'boolean'
            ? next.connected
            : DEFAULT_SOCIAL_CONNECTIONS[platform.id].connected,
        handle:
          typeof next?.handle === 'string'
            ? next.handle.slice(0, 60)
            : DEFAULT_SOCIAL_CONNECTIONS[platform.id].handle,
      }
      return accumulator
    }, {} as SocialConnections)

    return {
      name: safeString(parsed.name, EMPTY_SELF_PROFILE.name),
      age: Number.isFinite(parsed.age) ? Math.min(99, Math.max(18, Number(parsed.age))) : EMPTY_SELF_PROFILE.age,
      city: safeString(parsed.city, EMPTY_SELF_PROFILE.city),
      vibe: safeString(parsed.vibe, EMPTY_SELF_PROFILE.vibe),
      bio: safeString(parsed.bio, EMPTY_SELF_PROFILE.bio),
      interests: safeInterests.length > 0 ? safeInterests : EMPTY_SELF_PROFILE.interests,
      pronouns: safeString(parsed.pronouns, EMPTY_SELF_PROFILE.pronouns),
      gender: safeString(parsed.gender, EMPTY_SELF_PROFILE.gender),
      orientation: safeString(parsed.orientation, EMPTY_SELF_PROFILE.orientation),
      lookingFor: safeString(parsed.lookingFor, EMPTY_SELF_PROFILE.lookingFor),
      relationshipIntent: safeString(parsed.relationshipIntent, EMPTY_SELF_PROFILE.relationshipIntent),
      heightCm: Number.isFinite(parsed.heightCm)
        ? Math.min(230, Math.max(130, Number(parsed.heightCm)))
        : EMPTY_SELF_PROFILE.heightCm,
      jobTitle: safeString(parsed.jobTitle, EMPTY_SELF_PROFILE.jobTitle),
      company: safeString(parsed.company, EMPTY_SELF_PROFILE.company),
      education: safeString(parsed.education, EMPTY_SELF_PROFILE.education),
      hometown: safeString(parsed.hometown, EMPTY_SELF_PROFILE.hometown),
      languages: safeLanguages.length > 0 ? safeLanguages : EMPTY_SELF_PROFILE.languages,
      drinking: safeString(parsed.drinking, EMPTY_SELF_PROFILE.drinking),
      smoking: safeString(parsed.smoking, EMPTY_SELF_PROFILE.smoking),
      workout: safeString(parsed.workout, EMPTY_SELF_PROFILE.workout),
      religion: safeString(parsed.religion, EMPTY_SELF_PROFILE.religion),
      politics: safeString(parsed.politics, EMPTY_SELF_PROFILE.politics),
      zodiac: safeString(parsed.zodiac, EMPTY_SELF_PROFILE.zodiac),
      childrenPlan: safeString(parsed.childrenPlan, EMPTY_SELF_PROFILE.childrenPlan),
      pets: safeString(parsed.pets, EMPTY_SELF_PROFILE.pets),
      promptOne: safeString(parsed.promptOne, EMPTY_SELF_PROFILE.promptOne),
      promptTwo: safeString(parsed.promptTwo, EMPTY_SELF_PROFILE.promptTwo),
      promptThree: safeString(parsed.promptThree, EMPTY_SELF_PROFILE.promptThree),
      dealbreakers: safeDealbreakers.length > 0 ? safeDealbreakers : EMPTY_SELF_PROFILE.dealbreakers,
      instagram: safeString(parsed.instagram, EMPTY_SELF_PROFILE.instagram),
      anthem: safeString(parsed.anthem, EMPTY_SELF_PROFILE.anthem),
      socialConnections: safeSocialConnections,
      socialPromotionOptIn:
        typeof parsed.socialPromotionOptIn === 'boolean' ? parsed.socialPromotionOptIn : EMPTY_SELF_PROFILE.socialPromotionOptIn,
      travelMode: typeof parsed.travelMode === 'boolean' ? parsed.travelMode : EMPTY_SELF_PROFILE.travelMode,
      photos: safePhotos.length > 0 ? safePhotos : EMPTY_SELF_PROFILE.photos,
      personalityAnswers:
        sanitizeAnswers(parsed.personalityAnswers).length === PERSONALITY_QUESTIONS.length
          ? (sanitizeAnswers(parsed.personalityAnswers) as PersonalityAnswer[])
          : EMPTY_SELF_PROFILE.personalityAnswers,
    }
  } catch {
    return EMPTY_SELF_PROFILE
  }
}

const readSelfProfile = (email = ''): SelfProfile =>
  normalizeSelfProfile(backendReadSelfProfile(email))

const toProfileDraft = (profile: SelfProfile) => ({
  name: profile.name,
  age: profile.age > 0 ? String(profile.age) : '',
  city: profile.city,
  vibe: profile.vibe,
  bio: profile.bio,
  interests: profile.interests.join(', '),
  pronouns: profile.pronouns,
  gender: profile.gender,
  orientation: profile.orientation,
  lookingFor: profile.lookingFor,
  relationshipIntent: profile.relationshipIntent,
  heightCm: profile.heightCm > 0 ? String(profile.heightCm) : '',
  jobTitle: profile.jobTitle,
  company: profile.company,
  education: profile.education,
  hometown: profile.hometown,
  languages: profile.languages.join(', '),
  drinking: profile.drinking,
  smoking: profile.smoking,
  workout: profile.workout,
  religion: profile.religion,
  politics: profile.politics,
  zodiac: profile.zodiac,
  childrenPlan: profile.childrenPlan,
  pets: profile.pets,
  promptOne: profile.promptOne,
  promptTwo: profile.promptTwo,
  promptThree: profile.promptThree,
  dealbreakers: profile.dealbreakers.join(', '),
  instagram: profile.instagram,
  anthem: profile.anthem,
  socialPromotionOptIn: profile.socialPromotionOptIn,
  travelMode: profile.travelMode,
  photos: profile.photos,
  personalityAnswers: profile.personalityAnswers,
})

// readChatThreads, readCallHistory, readJoinedCircles, readCirclePosts, readCircleRsvps now live in src/persistence/.

const formatShortTime = (timestamp: number): string =>
  new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

const sanitizeRoomPart = (value: string): string => {
  const cleaned = value.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const normalized = cleaned.replace(/-+/g, '-').replace(/^-+|-+$/g, '')
  return normalized.slice(0, 24) || 'guest'
}

const buildCallRoom = (userEmail: string, profileId: number, type: 'audio' | 'video'): string => {
  const owner = sanitizeRoomPart(userEmail.split('@')[0] ?? 'guest')
  const stamp = Date.now().toString(36)
  return `lovedate-${type}-${owner}-${profileId}-${stamp}`
}

const getCallOutcomeLabel = (outcome: CallLogEntry['outcome']): string => {
  switch (outcome) {
    case 'connected':
      return 'Connected'
    case 'ended':
      return 'Ended'
    case 'missed':
      return 'Missed'
    case 'failed':
      return 'Failed'
    default:
      return 'Calling'
  }
}

const getCallDurationLabel = (startedAt: number, endedAt: number | null): string => {
  const durationMs = Math.max(0, (endedAt ?? Date.now()) - startedAt)
  const totalSeconds = Math.floor(durationMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
}

// readAppLanguage, persistAppLanguage now live in src/persistence/language.ts.

const formatUiText = (template: string, replacements: Record<string, string | number>): string =>
  Object.entries(replacements).reduce(
    (current, [key, value]) => current.replaceAll(`{${key}}`, String(value)),
    template,
  )

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
    id: APP_BOOT_TS,
    sender: 'them',
    text: `Hey! Nice to match with you. Up for a chat, ${selfName}?`,
    createdAt: APP_BOOT_TS,
  },
]

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

  // Always require fresh login on cold start. We keep the saved email so the
  // login form is pre-filled, but never auto-resume a session.
  const [screen, setScreen] = useState<AppScreen>('login')
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(initialRoute.profileId)
  const [previousScreen, setPreviousScreen] = useState<AppScreen>('discover')

  const [isAuthenticated, setIsAuthenticated] = useState(false)
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
  const [profileDraft, setProfileDraft] = useState(() => toProfileDraft(initialSelfProfile))
  const [profileSaveStatus, setProfileSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [profileSaveErrors, setProfileSaveErrors] = useState<string[]>([])
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
  const [history, setHistory] = useState<SwipeHistory>(() => readHistory())
  const [activeMatch, setActiveMatch] = useState<Profile | null>(null)
  const [swipeLog, setSwipeLog] = useState<SwipeLog[]>([])

  const [chatThreads, setChatThreads] = useState<Record<number, ChatMessage[]>>(() => readChatThreads())
  const [callHistory, setCallHistory] = useState<CallLogEntry[]>(() => readCallHistory())
  const [activeChatId, setActiveChatId] = useState<number | null>(null)
  const [chatDraft, setChatDraft] = useState('')
  const [chatSearch, setChatSearch] = useState('')
  const [aiCoachSuggestions, setAiCoachSuggestions] = useState<string[]>([])
  const [aiCoachLoading, setAiCoachLoading] = useState(false)
  const [aiDatePlans, setAiDatePlans] = useState<DatePlan[]>([])
  const [aiDatePlannerLoading, setAiDatePlannerLoading] = useState(false)
  const [circleSearch, setCircleSearch] = useState('')
  const [joinedCircleIds, setJoinedCircleIds] = useState<string[]>(() => readJoinedCircles())
  const [circlePosts, setCirclePosts] = useState<CirclePost[]>(() => readCirclePosts())
  const [circlePostDraft, setCirclePostDraft] = useState('')
  const [selectedCircleId, setSelectedCircleId] = useState<string>('design-lounge')
  const [circleRsvps, setCircleRsvps] = useState<Record<string, boolean>>(() => readCircleRsvps())
  const [unreadChats, setUnreadChats] = useState<Record<number, number>>({})
  const [matchQueueIds, setMatchQueueIds] = useState<number[]>([])
  const [chatAttachmentDraft, setChatAttachmentDraft] = useState<ChatMessage['attachment'] | null>(null)
  const [showFullChatHistory, setShowFullChatHistory] = useState(false)
  const [isRecordingVoice, setIsRecordingVoice] = useState(false)
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
  const [blockedProfileIds, setBlockedProfileIds] = useState<number[]>(() => readBlockedProfileIds())
  const [safetyReports, setSafetyReports] = useState<SafetyReport[]>(() => readModerationQueue())
  const [reportDraftProfile, setReportDraftProfile] = useState<Profile | null>(null)
  const [reportDraftCategory, setReportDraftCategory] = useState<SafetyCategory>('spam')
  const [reportDraftDetails, setReportDraftDetails] = useState('')
  const [activeModerationReportId, setActiveModerationReportId] = useState<string | null>(null)
  const [moderationStatusFilter, setModerationStatusFilter] = useState<ModerationFilter>('open')
  const [moderationSearchQuery, setModerationSearchQuery] = useState('')
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [boostsLeft, setBoostsLeft] = useState(3)
  const [rewindsLeft, setRewindsLeft] = useState(5)

  const [settings, setSettings] = useState<SettingsPayload>({
    pushNotifications: true,
    emailNotifications: false,
    privateMode: false,
    incognitoMode: false,
  })
  const [settingsSaveStatus, setSettingsSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [preferenceSaveStatus, setPreferenceSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [appLanguage, setAppLanguage] = useState<AppLanguage>(() => readAppLanguage())
  const [toasts, setToasts] = useState<Toast[]>([])
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null)
  const [lightboxZoom, setLightboxZoom] = useState(1)

  const backendMode = getBackendMode()
  const [activePlan, setActivePlan] = useState<PlanTier>(() => getActivePlan())
  const [likeUsage, setLikeUsage] = useState(() => getLikeUsage(activePlan))
  const [superLikeUsage, setSuperLikeUsage] = useState(() => getSuperLikeUsage(activePlan))
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
  const isModerationAdmin = useMemo(
    () => moderationAdminEmails.includes(userEmail.trim().toLowerCase()),
    [moderationAdminEmails, userEmail],
  )

  const dragStart = useRef<{ x: number; y: number } | null>(null)
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

  const refreshEngagementUsage = useCallback((plan: PlanTier) => {
    setLikeUsage(getLikeUsage(plan))
    setSuperLikeUsage(getSuperLikeUsage(plan))
  }, [])

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
  }, [safetyReports, activeModerationReportId])

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
  }, [isAuthenticated, userEmail])

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
  }, [isAuthenticated, userEmail])

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
  }, [isAuthenticated, userEmail])

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
  }, [filters, isAuthenticated])

  useEffect(() => {
    setIndex(0)
    setDragX(0)
    setDragY(0)
    setIsDragging(false)
    setExitDirection(null)
    setIsResolvingSwipe(false)
    dragStart.current = null
  }, [filters])

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
    setShowFullChatHistory(false)
    shouldStickToBottomRef.current = true
  }, [activeChatId])

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
  const topProfileMatchAnalysis = useMemo(
    () => (topProfile ? getMatchAnalysis(topProfile) : null),
    [topProfile, getMatchAnalysis],
  )
  const topProfileChemistry = useMemo(
    () => (topProfile ? getChemistryInsights(topProfile) : null),
    [topProfile, getChemistryInsights],
  )
  const selectedDetailMatchAnalysis = useMemo(
    () => (selectedDetailProfile ? getMatchAnalysis(selectedDetailProfile) : null),
    [selectedDetailProfile, getMatchAnalysis],
  )
  const selectedDetailChemistry = useMemo(
    () => (selectedDetailProfile ? getChemistryInsights(selectedDetailProfile) : null),
    [selectedDetailProfile, getChemistryInsights],
  )
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

  const generateAiCoachSuggestions = useCallback(() => {
    if (!selectedChatProfile) {
      return
    }

    setAiCoachLoading(true)
    window.setTimeout(() => {
      const thread = chatThreads[selectedChatProfile.id] ?? seedChat(selfProfile.name)
      const lastThem = [...thread].reverse().find((message) => message.sender === 'them')
      const interest = selectedChatProfile.interests[0] ?? 'coffee'
      const interestTwo = selectedChatProfile.interests[1] ?? 'music'
      const chemistry = getChemistryInsights(selectedChatProfile).chemistryScore
      const localTypeCode = personalityCodeFromAnswers(selectedChatProfile.personalityAnswers)
      const typeLabel =
        PERSONALITY_TYPE_GUIDE.find((type) => type.code === localTypeCode)?.label ?? localTypeCode
      const zodiac = selectedChatProfile.zodiac

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

      setAiCoachSuggestions(suggestions.slice(0, 3))
      setAiCoachLoading(false)
    }, 450)
  }, [
    selectedChatProfile,
    chatThreads,
    selfProfile.name,
    getChemistryInsights,
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
  }, [selectedChatProfile, getChemistryInsights, selfProfile.city, selfProfile.interests])

  useEffect(() => {
    setAiCoachSuggestions([])
    setAiCoachLoading(false)
    setAiDatePlans([])
    setAiDatePlannerLoading(false)
  }, [selectedChatProfile?.id])

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
  }, [])

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
  }, [])

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

  const handlePointerUp = () => {
    if (!dragStart.current) {
      return
    }

    const tapThreshold = 14
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

  const handleLoginSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoggingIn(true)
    setLoginError(null)
    setLoginNotice(null)

    if (authMode === 'register') {
      const strongPasswordError = getStrongPasswordError(loginPassword)
      if (strongPasswordError) {
        setLoginError(strongPasswordError)
        setLoggingIn(false)
        return
      }
    }

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

        // Scrub any other user's profile cache before we hydrate ours.
        // Closes the shared-device data-at-rest leak: nothing in localStorage
        // for any account other than this one.
        purgeOtherSelfProfileCaches(result.email)
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
        purgeOtherSelfProfileCaches(result.email)
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

  // Dev test-account helpers (DEV only)
  const DEV_TEST_EMAIL = (import.meta.env.VITE_DEV_TEST_EMAIL as string | undefined) ?? 'dev@lovedate.local'

  const handleUseDevAccount = async () => {
    if (!import.meta.env.DEV) return
    setLoggingIn(true)
    try {
      // Always overwrite local profile for the dev test email with an empty profile
      // so tests start from a clean slate regardless of prior runs.
      backendResetLocalSelfProfile(DEV_TEST_EMAIL)
      await backendSaveSelfProfile(DEV_TEST_EMAIL, EMPTY_SELF_PROFILE as unknown as Record<string, unknown>)
      setIsAuthenticated(true)
      setUserEmail(DEV_TEST_EMAIL)
      setLoginEmail(DEV_TEST_EMAIL)
      navigate('discover', { replace: true })
      pushToast('Dev account loaded.', 'info')
    } catch {
      pushToast('Dev account load failed.', 'error')
    } finally {
      setLoggingIn(false)
    }
  }

  const handleResetDevAccount = async () => {
    if (!import.meta.env.DEV) return
    setLoggingIn(true)
    try {
      backendResetLocalSelfProfile(DEV_TEST_EMAIL)
      await backendSaveSelfProfile(DEV_TEST_EMAIL, EMPTY_SELF_PROFILE as unknown as Record<string, unknown>)
      pushToast('Dev account reset locally.', 'success')
    } catch {
      pushToast('Dev reset failed.', 'error')
    } finally {
      setLoggingIn(false)
    }
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

  const handleExitApp = () => {
    handleSignOut()
    void import('@capacitor/app')
      .then(({ App: CapacitorApp }) => CapacitorApp.exitApp())
      .catch(() => {
        window.close()
      })
  }

  const handleSignOut = () => {
    void backendSignOut()
      .catch(() => {
        pushToast('Sign out sync failed, local session cleared anyway.', 'error')
      })
      .finally(() => {
        // Wipe every self-profile cache (current + any leftovers) so the
        // next person on this device cannot read profile data via devtools.
        // Trades instant-render on next sign-in (cloud fetch instead) for
        // a hard zero-leak guarantee.
        purgeAllSelfProfileCaches()
        setIsAuthenticated(false)
        setUserEmail('')
        setLoginPassword('')
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
      })
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
    [userEmail, pushToast],
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

  const selectedChatMessages = useMemo(() => {
    if (!selectedChatProfile) {
      return []
    }
    const messages = chatThreads[selectedChatProfile.id] ?? seedChat(selfProfile.name)
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
    const messages = chatThreads[selectedChatProfile.id] ?? seedChat(selfProfile.name)
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
      <main className="login-shell">
        <div className="grain" aria-hidden="true" />
        <article className="login-card">
          <Logo variant="hero" size="lg" showSlogan className="login-hero-logo" />
          <div className="login-language-row">
            <label>
              {copy.auth.language}
              <select value={appLanguage} onChange={(event) => setAppLanguage(event.target.value as AppLanguage)}>
                <option value="en">{copy.auth.english}</option>
                <option value="ro">{copy.auth.romanian}</option>
              </select>
            </label>
          </div>
          <h1>{authMode === 'register' ? copy.auth.createTitle : copy.auth.signInTitle}</h1>
          <form className="login-form" onSubmit={handleLoginSubmit}>
            {runtimeConfig.auth.requireInviteCode ? (
              <label>
                {copy.auth.inviteCode}
                <input
                  type="text"
                  autoComplete="one-time-code"
                  value={inviteCode}
                  onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
                  placeholder={copy.auth.invitePlaceholder}
                  required
                />
              </label>
            ) : null}
            <label>
              {copy.auth.email}
              <input
                type="email"
                autoComplete="email"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                required
              />
            </label>
            <label>
              {copy.auth.password}
              <input
                type="password"
                autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                required
              />
              {authMode === 'register' ? (
                <small className="soft">{copy.auth.passwordHint}</small>
              ) : null}
            </label>
            {authMode === 'register' ? (
              <label>
                {copy.auth.confirmPassword}
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
                {loggingIn ? copy.auth.pleaseWait : authMode === 'register' ? copy.auth.createAccount : copy.auth.signIn}
              </button>
              {runtimeConfig.auth.allowGuestLogin && authMode === 'login' ? (
                <button type="button" className="ghost" onClick={handleGuestLogin} disabled={loggingIn}>
                  {copy.auth.continueGuest}
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
                {authMode === 'login' ? copy.auth.switchToCreate : copy.auth.switchToLogin}
              </button>
            </div>
            {import.meta.env.DEV ? (
              <div className="dev-auth-row">
                <button type="button" className="ghost" onClick={handleUseDevAccount} disabled={loggingIn}>
                  Use Dev Account
                </button>
                <button type="button" className="ghost" onClick={handleResetDevAccount} disabled={loggingIn}>
                  Reset Dev Account
                </button>
              </div>
            ) : null}
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
        <div className="top-exit-group">
          <button type="button" className="top-exit-btn" onClick={handleSignOut}>
            {copy.common.exitToLogin}
          </button>
          <button
            type="button"
            className="top-exit-btn top-exit-btn--quit"
            onClick={handleExitApp}
            aria-label="Exit App"
            title="Exit App"
          >
            ⏻
          </button>
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
          <section className="discover-main-only discover-redesign" aria-label="Discover cards and actions">
            <section className="discover-metrics" aria-label={copy.discover.summary}>
              <div className="discover-kpis">
                <div className="discover-kpi">
                  <strong className="discover-kpi-value">{filteredProfiles.length}</strong>
                  <span className="discover-kpi-label">{copy.discover.inDeck}</span>
                </div>
                <div className="discover-kpi">
                  <strong className="discover-kpi-value">{matchedProfiles.length}</strong>
                  <span className="discover-kpi-label">{copy.discover.matches}</span>
                </div>
                <div className="discover-kpi">
                  <strong className="discover-kpi-value">
                    {likeUsage.limit === null || likeUsage.limit === Infinity
                      ? '∞'
                      : Math.max(0, likeUsage.limit - likeUsage.used)}
                  </strong>
                  <span className="discover-kpi-label">{copy.discover.likesLeft}</span>
                </div>
                <div className="discover-kpi">
                  <strong className="discover-kpi-value">
                    {superLikeUsage.limit === Infinity ? '∞' : Math.max(0, superLikeUsage.limit - superLikeUsage.used)}
                  </strong>
                  <span className="discover-kpi-label">{copy.discover.superLikes}</span>
                </div>
              </div>
              <div className="discover-metric-controls">
                <button type="button" className="discover-metric-btn" onClick={() => navigate('filters')}>
                  {copy.discover.openFilters}
                </button>
                <button
                  type="button"
                  className="discover-metric-btn"
                  onClick={() => {
                    if (boostsLeft <= 0) {
                      pushToast(appLanguage === 'ro' ? 'Nu mai ai promovări disponibile momentan.' : 'No boosts left right now.', 'error')
                      return
                    }
                    setBoostsLeft((current) => Math.max(0, current - 1))
                    setIndex(0)
                    pushNotification({
                      title: appLanguage === 'ro' ? 'Promovare profil activată' : 'Profile boost activated',
                      body:
                        appLanguage === 'ro'
                          ? 'Profilul tău primește vizibilitate extra pentru următoarea oră (demo).'
                          : 'Your profile gets extra visibility for the next hour (demo).',
                      category: 'system',
                    })
                    pushToast(appLanguage === 'ro' ? 'Promovare activată.' : 'Boost activated.', 'success')
                  }}
                >
                  {copy.discover.boost}
                </button>
                <button type="button" className="discover-metric-btn" onClick={() => setFilters(initialFilters)}>
                  {copy.common.reset}
                </button>
              </div>
            </section>

            {loadingProfiles && (
              <section className="state-box" aria-live="polite">
                <p className="pill">{copy.common.loading}</p>
                <h1>{copy.discover.findingProfiles}</h1>
              </section>
            )}
            {loadError && !loadingProfiles && (
              <section className="state-box" aria-live="assertive">
                <p className="pill">{copy.common.error}</p>
                <h1>{loadError}</h1>
                <button type="button" onClick={() => void loadProfiles()}>
                  {copy.common.retry}
                </button>
              </section>
            )}
            {showingNoResults && !loadError && (
              <section className="state-box" aria-live="polite">
                <p className="pill">{copy.common.noResults}</p>
                <h1>{copy.discover.noProfilesMatch}</h1>
                <div className="summary-actions">
                  <button type="button" onClick={() => setFilters(initialFilters)}>
                    {copy.discover.resetFilters}
                  </button>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => {
                      setHistory({ likedIds: [], passedIds: [], matchIds: [] })
                      setSwipeLog([])
                      setIndex(0)
                    }}
                  >
                    {appLanguage === 'ro' ? 'Reset istoric swipe' : 'Reset swipe history'}
                  </button>
                </div>
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
                            <p className="mini-label">{copy.discover.upNext}</p>
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
                      role="button"
                      tabIndex={0}
                      aria-label={`Open ${topProfile.name} full profile`}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          openProfileDetail(topProfile.id, 'discover')
                        }
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
                                {copy.discover.activeNow}
                              </p>
                              <p className="discover-location-line">
                                {'\u{1F4CD}'} {topProfile.city} {'\u2022'} {topProfile.distanceKm} miles away
                              </p>
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
                              {copy.discover.activeNow}
                            </p>
                            <p className="discover-location-line">
                              {'\u{1F4CD}'} {topProfile.city} {'\u2022'} {topProfile.distanceKm} miles away
                            </p>
                          </div>
                        </>
                      )}
                    </article>
                  </section>
                </div>
                <aside className="discover-side-panel" aria-label="Profile insights and actions">
                  <article className="discover-info-panel">
                    <h2 className="discover-side-name">
                      {topProfile.name}, {topProfile.age}
                    </h2>
                    <p className="discover-zodiac-line">
                      {copy.discover.zodiac}: {topProfile.zodiac} {ZODIAC_EMOJI[topProfile.zodiac] ?? ''}
                    </p>
                    <p className="compatibility-score">
                      {copy.discover.matchScore}: {topProfileMatchAnalysis?.score ?? getCompatibilityScore(topProfile)}% {'\u2022'} {copy.discover.personality}:{' '}
                      {topProfileMatchAnalysis?.personalityScore ?? compatibilityFromAnswers(selfProfile.personalityAnswers, topProfile.personalityAnswers)}%
                    </p>
                    {topProfileChemistry ? (
                      <p className="compatibility-score">
                        {copy.discover.chemistry}: {topProfileChemistry.chemistryScore}% {'\u2022'} {copy.discover.cognitiveOverlap}:{' '}
                        {topProfileChemistry.cognitiveOverlapScore}% {'\u2022'} {copy.discover.zodiac}:{' '}
                        {topProfileChemistry.zodiacAligned ? copy.discover.aligned : copy.discover.neutral}
                      </p>
                    ) : null}
                    <p className="compatibility-score">{topProfileMatchAnalysis?.pairCode}</p>
                    {topProfileMatchAnalysis?.reasons?.length ? (
                      <ul className="discover-reasons-list">
                        {topProfileMatchAnalysis.reasons.slice(0, 3).map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    ) : null}
                    <p className="mini-label discover-spotlight-pill">{topProfile.vibe}</p>
                    <p className="vibe">{topProfile.vibe}</p>
                    <div className="discover-interest-chips">
                      {topProfile.interests.slice(0, 3).map((interest) => (
                        <span key={`${topProfile.id}-${interest}`}>{interest}</span>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="details-link"
                      onClick={(event) => {
                        event.stopPropagation()
                        openProfileDetail(topProfile.id, 'discover')
                      }}
                    >
                      {copy.discover.viewFullProfile}
                    </button>
                  </article>
                  <section className="actions discover-action-cluster discover-primary-actions" aria-label="Swipe actions">
                    <button
                      type="button"
                      className="ghost pass-action"
                      onClick={() => swipeCard('left')}
                      disabled={!topProfile || isResolvingSwipe}
                    >
                      {copy.discover.pass}
                    </button>
                    <button
                      type="button"
                      className="super super-action"
                      onClick={() => swipeCard('right', 'super-like')}
                      disabled={!topProfile || isResolvingSwipe || likeLimitReached || superLikeLimitReached}
                    >
                      {copy.discover.superLike}
                    </button>
                    <button
                      type="button"
                      className="solid like-action"
                      onClick={() => swipeCard('right')}
                      disabled={!topProfile || isResolvingSwipe || likeLimitReached}
                    >
                      {copy.discover.like}
                    </button>
                  </section>
                  <footer className="hint discover-hint">
                    <div className="discover-keymap" aria-label={copy.discover.keyboardShortcuts}>
                      <span><b>{'\u2190'}</b> {copy.discover.pass}</span>
                      <span><b>{'\u2191'}</b> {copy.discover.superLike}</span>
                      <span><b>{'\u2192'}</b> {copy.discover.like}</span>
                    </div>
                    <p>{copy.discover.undoHint}</p>
                    {likeLimitReached && <p className="result">{copy.discover.likeLimitReached}</p>}
                    {superLikeLimitReached && <p className="result">{copy.discover.superLikeLimitReached}</p>}
                    {isResolvingSwipe && <p className="result">{copy.discover.checkingMatch}</p>}
                    {lastIntent && <p className="result">{copy.discover.lastAction}: {lastIntent.replace('-', ' ')}</p>}
                  </footer>
                </aside>
              </section>
            )}
            {showingDeckCompletion && (
              <section className="match-summary">
                <p className="pill">{copy.discover.deckComplete}</p>
                <h1>{copy.discover.noMoreProfiles}</h1>
                <div className="summary-actions">
                  <button type="button" onClick={() => setIndex(0)}>
                    {copy.discover.startAgain}
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
                    {copy.discover.clearHistory}
                  </button>
                </div>
              </section>
            )}
          </section>
        )}
        {screen === 'activity' && (
          <section className="activity-layout">
            <section className="activity-overview" aria-label={copy.activity.overview}>
              <p>
                {copy.activity.liked} <strong>{likedProfiles.length}</strong>
              </p>
              <p>
                {copy.activity.passed} <strong>{passedProfiles.length}</strong>
              </p>
              <p>
                {copy.activity.matches} <strong>{matchedProfiles.length}</strong>
              </p>
            </section>

            <article className="list-panel activity-panel activity-panel--matches">
              <h2>{copy.activity.matches}</h2>
              {matchedProfiles.length === 0 ? (
                <p className="soft">{copy.activity.noMatchesYet}</p>
              ) : (
                <ul>
                  {matchedProfiles.map((profile) => (
                    <li key={profile.id} className="activity-item">
                      <div className="activity-item-main">
                        <div className="activity-avatar-wrap">
                          <img className="activity-avatar" src={profile.photos[0]} alt={`${profile.name} avatar`} loading="lazy" decoding="async" />
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
                        {copy.activity.chat}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </article>

            <article className="list-panel activity-panel">
              <h2>{copy.activity.liked}</h2>
              {likedProfiles.length === 0 ? (
                <p className="soft">{copy.activity.noLikesYet}</p>
              ) : (
                <ul>
                  {likedProfiles.map((profile) => (
                    <li key={profile.id} className="activity-item">
                      <div className="activity-item-main">
                        <div className="activity-avatar-wrap">
                          <img className="activity-avatar" src={profile.photos[0]} alt={`${profile.name} avatar`} loading="lazy" decoding="async" />
                          <span className="activity-status-dot activity-status-dot--liked" aria-hidden="true" />
                        </div>
                        <div className="activity-item-meta">
                          <strong>{profile.name}</strong>
                          <span>{profile.city}</span>
                        </div>
                      </div>
                      <button type="button" className="mini-btn" onClick={() => openProfileDetail(profile.id, 'activity')}>
                        {copy.activity.view}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </article>

            <article className="list-panel activity-panel">
              <h2>{copy.activity.passed}</h2>
              {passedProfiles.length === 0 ? (
                <p className="soft">{copy.activity.noPassesYet}</p>
              ) : (
                <ul>
                  {passedProfiles.map((profile) => (
                    <li key={profile.id} className="activity-item">
                      <div className="activity-item-main">
                        <div className="activity-avatar-wrap">
                          <img className="activity-avatar" src={profile.photos[0]} alt={`${profile.name} avatar`} loading="lazy" decoding="async" />
                          <span className="activity-status-dot activity-status-dot--passed" aria-hidden="true" />
                        </div>
                        <div className="activity-item-meta">
                          <strong>{profile.name}</strong>
                          <span>{profile.city}</span>
                        </div>
                      </div>
                      <button type="button" className="mini-btn" onClick={() => openProfileDetail(profile.id, 'activity')}>
                        {copy.activity.view}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </section>
        )}
        {screen === 'circles' && (
          <section className="settings-screen circles-screen" aria-label={copy.circles.community}>
            <article className="profile-settings circles-list-panel">
              <h2>{copy.circles.title}</h2>
              <p className="soft">{copy.circles.subtitle}</p>
              <label>
                {copy.circles.search}
                <input
                  type="text"
                  value={circleSearch}
                  onChange={(event) => setCircleSearch(event.target.value)}
                  placeholder={copy.circles.searchPlaceholder}
                />
              </label>
              <div className="notification-list circles-list">
                {filteredCircles.map((circle) => {
                  const joined = joinedCircleIds.includes(circle.id)
                  return (
                    <button
                      key={circle.id}
                      type="button"
                      className={`chat-item ${selectedCircle?.id === circle.id ? 'active' : ''}`}
                      onClick={() => setSelectedCircleId(circle.id)}
                    >
                      <div className="chat-item-body">
                        <div className="chat-meta">
                          <strong>{circle.name}</strong>
                          <span>{circle.memberCount + (joined ? 1 : 0)} {copy.circles.members}</span>
                        </div>
                        <div className="chat-status">
                          <small>{joined ? copy.circles.joined : copy.circles.explore}</small>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </article>
            <article className="profile-settings circles-detail-panel">
              {selectedCircle ? (
                <>
                  <div className="circles-hero">
                    <img src={selectedCircle.hero} alt={`${selectedCircle.name} cover`} loading="lazy" decoding="async" />
                    <div className="circles-hero-overlay">
                      <h3>{selectedCircle.name}</h3>
                      <p>{selectedCircle.theme}</p>
                    </div>
                  </div>
                  <p>{selectedCircle.description}</p>
                  <div className="chips">
                    {selectedCircle.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                  <div className="summary-actions">
                    <button type="button" className="ghost" onClick={() => toggleCircleJoin(selectedCircle.id)}>
                      {joinedCircleIds.includes(selectedCircle.id) ? copy.circles.leaveCircle : copy.circles.joinCircle}
                    </button>
                  </div>
                  <h3>{copy.circles.upcomingEvents}</h3>
                  <div className="circles-events">
                    {selectedCircle.events.map((eventItem) => (
                      <div key={eventItem.id} className="circles-event-card">
                        <p>
                          <strong>{eventItem.title}</strong>
                        </p>
                        <p>{eventItem.when} {'\u2022'} {eventItem.where}</p>
                        <button type="button" className="ghost" onClick={() => toggleCircleRsvp(eventItem.id)}>
                          {circleRsvps[eventItem.id] ? copy.circles.rsvpSaved : copy.circles.rsvp}
                        </button>
                      </div>
                    ))}
                  </div>
                  <h3>{copy.circles.feed}</h3>
                  <label>
                    {copy.circles.sharePrompt}
                    <textarea
                      rows={3}
                      value={circlePostDraft}
                      onChange={(event) => setCirclePostDraft(event.target.value)}
                      placeholder={copy.circles.sharePlaceholder}
                    />
                  </label>
                  <div className="summary-actions">
                    <button type="button" onClick={publishCirclePost}>
                      {copy.circles.publishPost}
                    </button>
                  </div>
                  <div className="notification-list circles-posts">
                    {selectedCirclePosts.length === 0 ? (
                      <p className="soft">{copy.circles.noPosts}</p>
                    ) : (
                      selectedCirclePosts.map((post) => (
                        <div key={post.id} className="notification-item">
                          <strong>{post.author}</strong>
                          <span>{post.text}</span>
                          <small>{formatShortTime(post.createdAt)}</small>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <p className="soft">{copy.circles.noCirclesFound}</p>
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
                  placeholder={copy.chats.searchPlaceholder}
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
                    <img className="chat-avatar" src={preview.profile.photos[0]} alt={preview.profile.name} loading="lazy" decoding="async" />
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
                        <img className="chat-avatar" src={selectedChatProfile.photos[0]} alt={selectedChatProfile.name} decoding="async" fetchPriority="high" />
                        <span className="chat-online-dot" aria-hidden="true" />
                      </div>
                      <div>
                        <h2>{selectedChatProfile.name}</h2>
                        <p className="chat-presence">{copy.chats.online}</p>
                      </div>
                    </div>
                    <div className="chat-header-actions">
                      <button
                        type="button"
                        className="chat-icon-btn"
                        aria-label={copy.chats.moreOptions}
                        onClick={() => openProfileDetail(selectedChatProfile.id, 'chats')}
                        title={copy.discover.viewFullProfile}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <circle cx="12" cy="5" r="1.8" />
                          <circle cx="12" cy="12" r="1.8" />
                          <circle cx="12" cy="19" r="1.8" />
                        </svg>
                      </button>
                    </div>
                  </header>
                  <section className="chat-compatibility-panel" aria-label={copy.chats.compatibility}>
                    <p className="compatibility-score">
                      {copy.discover.chemistry}: {selectedChatChemistry?.chemistryScore ?? 0}% {'\u2022'} {copy.discover.cognitiveOverlap}:{' '}
                      {selectedChatChemistry?.cognitiveOverlapScore ?? 0}% {'\u2022'} {copy.chats.zodiac}:{' '}
                      {selectedChatChemistry?.zodiacAligned ? copy.discover.aligned : copy.discover.neutral}
                    </p>
                    <p className="chat-compatibility-line">
                      <strong>{copy.chats.type}:</strong> {selectedChatPersonalityCode ?? copy.chats.unknown}
                      {selectedChatTypeGuide ? ` - ${selectedChatTypeGuide.label}` : ''}
                    </p>
                    <p className="chat-compatibility-line">
                      <strong>{copy.chats.zodiac}:</strong> {selectedChatProfile.zodiac} {ZODIAC_EMOJI[selectedChatProfile.zodiac] ?? ''} {'\u2022'}{' '}
                      {ZODIAC_DESCRIPTIONS[selectedChatProfile.zodiac]?.overview ?? copy.chats.uniqueCosmicSignature}
                    </p>
                    {selectedChatCognitiveFunctions ? (
                      <p className="chat-compatibility-line">
                        <strong>{copy.chats.cognitive}:</strong> {selectedChatCognitiveFunctions.primary} {'\u2022'} {selectedChatCognitiveFunctions.support}
                      </p>
                    ) : null}
                  </section>
                  <section className="chat-ai-coach" aria-label={copy.chats.aiCoach}>
                    <div className="chat-ai-coach-head">
                      <p className="compatibility-score">{copy.chats.aiCoach}</p>
                      <button
                        type="button"
                        className="ghost"
                        onClick={generateAiCoachSuggestions}
                        disabled={aiCoachLoading}
                      >
                        {aiCoachLoading ? copy.chats.thinking : copy.chats.generateSuggestions}
                      </button>
                    </div>
                    {aiCoachSuggestions.length > 0 ? (
                      <div className="chat-ai-suggestion-list">
                        {aiCoachSuggestions.map((suggestion, index) => (
                          <button
                            key={`${index}-${suggestion.slice(0, 18)}`}
                            type="button"
                            className="chat-ai-suggestion"
                            onClick={() => setChatDraft(suggestion)}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="soft">{copy.chats.coachEmpty}</p>
                    )}
                  </section>
                  <section className="chat-date-planner" aria-label={copy.chats.aiPlanner}>
                    <div className="chat-date-planner-head">
                      <p className="compatibility-score">{copy.chats.aiPlanner}</p>
                      <button
                        type="button"
                        className="ghost"
                        onClick={generateAiDatePlans}
                        disabled={aiDatePlannerLoading}
                      >
                        {aiDatePlannerLoading ? copy.chats.planning : copy.chats.planDate}
                      </button>
                    </div>
                    {aiDatePlans.length > 0 ? (
                      <div className="chat-date-plan-list">
                        {aiDatePlans.map((plan) => (
                          <article key={plan.id} className="chat-date-plan-card">
                            <div className="chat-date-plan-top">
                              <strong>{plan.title}</strong>
                              <span className="chat-date-plan-budget">{plan.budget}</span>
                            </div>
                            <p className="chat-date-plan-meta">
                              {plan.placeType} {'\u2022'} {plan.duration}
                            </p>
                            <p className="chat-date-plan-pitch">{plan.pitch}</p>
                            <button type="button" className="mini-btn" onClick={() => setChatDraft(plan.message)}>
                              {copy.chats.useMessage}
                            </button>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="soft">{copy.chats.plannerEmpty}</p>
                    )}
                  </section>
                  <section className="chat-call-history" aria-label={copy.chats.recentCalls}>
                    <div className="chat-call-history-head">
                      <p className="compatibility-score">{copy.chats.recentCalls}</p>
                    </div>
                    {selectedChatCallHistory.length > 0 ? (
                      <div className="chat-call-history-list">
                        {selectedChatCallHistory.map((entry) => (
                          <article key={entry.id} className={`chat-call-history-item ${entry.outcome}`}>
                            <div>
                              <strong>{entry.type === 'video' ? copy.chats.videoCallLabel : copy.chats.audioCallLabel}</strong>
                              <p>
                                {getCallOutcomeLabel(entry.outcome)} {'\u2022'} {formatShortTime(entry.startedAt)}
                                {entry.endedAt ? ` \u2022 ${getCallDurationLabel(entry.startedAt, entry.endedAt)}` : ''}
                              </p>
                            </div>
                            <div className="summary-actions">
                              <button type="button" className="ghost mini-btn" onClick={() => rejoinCallFromHistory(entry)}>
                                {copy.chats.rejoin}
                              </button>
                              <button type="button" className="mini-btn" onClick={() => window.open(entry.roomUrl, '_blank', 'noopener,noreferrer')}>
                                {copy.chats.openRoom}
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="soft">{copy.chats.noCallActivity}</p>
                    )}
                  </section>
                  {hiddenChatMessageCount > 0 ? (
                    <div className="messages-toolbar">
                      <button type="button" className="ghost mini-btn" onClick={revealOlderMessages}>
                        {formatUiText(copy.chats.olderMessages, { count: hiddenChatMessageCount })}
                      </button>
                    </div>
                  ) : null}
                  <div ref={messagesContainerRef} className="messages" onScroll={handleMessagesScroll}>
                    {selectedChatMessages.map((message) => (
                      <p key={message.id} className={`msg ${message.sender}`}>
                        {message.text}
                        {message.callMeta
                          ? (() => {
                              const callMeta = message.callMeta
                              return (
                                <span className={`msg-call-chip ${callMeta.event}`}>
                                  {callMeta.type === 'video' ? copy.chats.videoCallLabel : copy.chats.audioCallLabel} {callMeta.event}
                                </span>
                              )
                            })()
                          : null}
                        {message.attachment?.kind === 'image' ? (
                          <img className="msg-media" src={message.attachment.url} alt={message.attachment.name} loading="lazy" decoding="async" />
                        ) : null}
                        {message.attachment?.kind === 'video' ? (
                          <video className="msg-media" src={message.attachment.url} controls />
                        ) : null}
                        {message.attachment?.kind === 'audio' ? (
                          <audio className="msg-audio" src={message.attachment.url} controls />
                        ) : null}
                        {message.callMeta && selectedChatProfile
                          ? (() => {
                              const callMeta = message.callMeta
                              return (
                                <div className="msg-call-actions">
                                  <button
                                    type="button"
                                    className="ghost mini-btn"
                                    onClick={() =>
                                      rejoinCallFromHistory({
                                        id: `${message.id}-${callMeta.roomId}`,
                                        profileId: selectedChatProfile.id,
                                        profileName: selectedChatProfile.name,
                                        type: callMeta.type,
                                        roomId: callMeta.roomId,
                                        roomUrl: callMeta.roomUrl,
                                        startedAt: message.createdAt,
                                        answeredAt: null,
                                        endedAt: null,
                                        outcome: 'initiated',
                                      })
                                    }
                                  >
                                    {copy.chats.joinCall}
                                  </button>
                                  <button
                                    type="button"
                                    className="ghost mini-btn"
                                    onClick={() => window.open(callMeta.roomUrl, '_blank', 'noopener,noreferrer')}
                                  >
                                    {copy.chats.openExternally}
                                  </button>
                                </div>
                              )
                            })()
                          : null}
                        <span>
                          {formatShortTime(message.createdAt)}
                          {message.sender === 'me' ? ` | ${message.status ?? 'sent'}` : ''}
                        </span>
                      </p>
                    ))}
                  </div>
                  {chatAttachmentDraft ? (
                    <div className="chat-attachment-preview">
                      <strong>{copy.chats.attachmentReady}</strong> {chatAttachmentDraft.name}
                      <button type="button" className="mini-btn" onClick={() => setChatAttachmentDraft(null)}>
                        {copy.chats.remove}
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
                      placeholder={copy.chats.typeMessage}
                      value={chatDraft}
                      onChange={(event) => setChatDraft(event.target.value)}
                    />
                    <input ref={attachmentInputRef} type="file" accept="image/*,video/*" hidden onChange={handleAttachmentPick} />
                    <button type="button" className="chat-icon-btn" aria-label={copy.chats.attachMedia} onClick={() => attachmentInputRef.current?.click()}>
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M21.4 11.2l-8.9 8.9a5 5 0 0 1-7.1-7.1l9.5-9.5a3.5 3.5 0 1 1 5 5l-9.8 9.8a2 2 0 1 1-2.8-2.8l8.8-8.8" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className={`chat-icon-btn ${isRecordingVoice ? 'danger' : ''}`}
                      aria-label={isRecordingVoice ? copy.chats.stopRecording : copy.chats.recordVoice}
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
                    <button type="submit" className="chat-send-btn" aria-label={copy.chats.send}>
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M22 2L11 13" />
                        <path d="M22 2L15 22l-4-9-9-4z" />
                      </svg>
                    </button>
                  </form>
                </>
              ) : (
                <section className="state-box">
                  <p className="pill">{copy.chats.noChat}</p>
                  <h1>{copy.chats.selectMatch}</h1>
                </section>
              )}
            </article>
          </section>
        )}
        {screen === 'profile' && (
          <section className="profile-screen" aria-label={copy.profile.screen}>
            <aside className="profile-left-column" aria-label={copy.profile.overview}>
              <article className="profile-summary profile-summary-card">
                {selfProfile.photos.length > 0 && (
                  <div className="profile-summary-hero">
                    <img
                      src={selfProfile.photos[0]}
                      alt={`${selfProfile.name} primary profile`}
                      decoding="async"
                      fetchPriority="high"
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
                <h3>{copy.profile.aboutMe}</h3>
                <p>{selfProfile.bio}</p>
                <p className="profile-about-meta">
                  {selfProfile.jobTitle} at {selfProfile.company} {'\u2022'} {selfProfile.lookingFor}
                </p>
                <p className="compatibility-score">{copy.profile.personalityCode}: {selfPersonalityCode}</p>
                {selfTypeGuide ? (
                  <p className="soft">
                    {selfTypeGuide.label}: {selfTypeGuide.summary}
                  </p>
                ) : null}
                {selfCognitiveFunctions ? (
                  <ul className="profile-cognitive-list">
                    <li><strong>{copy.profile.primary}:</strong> {selfCognitiveFunctions.primary}</li>
                    <li><strong>{copy.profile.support}:</strong> {selfCognitiveFunctions.support}</li>
                  </ul>
                ) : null}
                <p className="soft">{copy.profile.zodiacNote}: {ZODIAC_DESCRIPTIONS[selfProfile.zodiac]?.overview ?? copy.profile.uniqueCosmicSignature}</p>
                <button type="button" className="ghost personality-guide-open" onClick={() => navigate('personality-guide')}>
                  {copy.profile.whatCodeMeans}
                </button>
              </article>

              <article className="profile-summary profile-interests-card">
                <h3>{copy.profile.interests}</h3>
                <div className="chips profile-interest-chips">
                  {selfProfile.interests.map((interest) => (
                    <span key={interest}>{interest}</span>
                  ))}
                </div>
              </article>
              <article className="profile-summary profile-interests-card">
                <h3>{copy.profile.socialTrust}</h3>
                <p className="soft">
                  {copy.profile.connectedAccounts}: <strong>{socialConnectedCount}</strong> / {SOCIAL_PLATFORM_META.length}
                </p>
                <div className="chips profile-interest-chips">
                  {SOCIAL_PLATFORM_META.filter((platform) => selfProfile.socialConnections[platform.id].connected).length > 0 ? (
                    SOCIAL_PLATFORM_META.filter((platform) => selfProfile.socialConnections[platform.id].connected).map((platform) => (
                      <span key={platform.id}>{platform.label}</span>
                    ))
                  ) : (
                    <span>{copy.profile.noSocialAccounts}</span>
                  )}
                </div>
              </article>
            </aside>

            <article className="profile-settings profile-editor">
              <h2>{copy.profile.editProfile}</h2>
              <form onSubmit={saveMyProfile}>
                <details className="profile-editor-section" open>
                <summary>{copy.profile.identity}</summary>
                <div className="profile-editor-grid">
                    <label>
                      {copy.profile.name}
                      <input
                        type="text"
                        value={profileDraft.name}
                        onChange={(event) => handleProfileDraftChange('name', event.target.value)}
                      />
                    </label>
                    <label>
                      {copy.profile.age}
                      <input
                        type="number"
                        min={18}
                        max={99}
                        value={profileDraft.age}
                        onChange={(event) => handleProfileDraftChange('age', event.target.value)}
                      />
                    </label>
                    <label>
                      {copy.profile.pronouns}
                      <select
                        value={profileDraft.pronouns}
                        onChange={(event) => handleProfileDraftChange('pronouns', event.target.value)}
                      >
                        <option value="">Select...</option>
                        {PRONOUNS_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      {copy.profile.gender}
                      <select
                        value={profileDraft.gender}
                        onChange={(event) => handleProfileDraftChange('gender', event.target.value)}
                      >
                        <option value="">Select...</option>
                        {GENDER_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      {copy.profile.orientation}
                      <select
                        value={profileDraft.orientation}
                        onChange={(event) => handleProfileDraftChange('orientation', event.target.value)}
                      >
                        <option value="">Select...</option>
                        {ORIENTATION_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      {copy.profile.heightCm}
                      <input
                        type="number"
                        min={130}
                        max={230}
                        value={profileDraft.heightCm}
                        onChange={(event) => handleProfileDraftChange('heightCm', event.target.value)}
                      />
                    </label>
                </div>

                </details>

                <details className="profile-editor-section">
                <summary>{copy.profile.profileDetails}</summary>
                <div className="profile-editor-grid">
                    <label>
                      {copy.profile.city}
                      <input
                        type="text"
                        value={profileDraft.city}
                        onChange={(event) => handleProfileDraftChange('city', event.target.value)}
                      />
                    </label>
                    <label>
                      {copy.profile.hometown}
                      <input
                        type="text"
                        value={profileDraft.hometown}
                        onChange={(event) => handleProfileDraftChange('hometown', event.target.value)}
                      />
                    </label>
                    <label>
                      {copy.profile.vibe}
                      <input
                        type="text"
                        value={profileDraft.vibe}
                        onChange={(event) => handleProfileDraftChange('vibe', event.target.value)}
                      />
                    </label>
                    <label>
                      {copy.profile.lookingFor}
                      <select
                        value={profileDraft.lookingFor}
                        onChange={(event) => handleProfileDraftChange('lookingFor', event.target.value)}
                      >
                        <option value="">Select...</option>
                        {LOOKING_FOR_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      {copy.profile.relationshipIntent}
                      <select
                        value={profileDraft.relationshipIntent}
                        onChange={(event) => handleProfileDraftChange('relationshipIntent', event.target.value)}
                      >
                        <option value="">Select...</option>
                        {RELATIONSHIP_INTENT_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      {copy.profile.interestsComma}
                      <input
                        type="text"
                        value={profileDraft.interests}
                        onChange={(event) => handleProfileDraftChange('interests', event.target.value)}
                      />
                    </label>
                    <label className="full-width">
                      {copy.profile.bio}
                      <textarea
                        rows={3}
                        value={profileDraft.bio}
                        onChange={(event) => handleProfileDraftChange('bio', event.target.value)}
                      />
                    </label>
                </div>

                </details>

                <details className="profile-editor-section">
                <summary>{copy.profile.personalityQuiz}</summary>
                <div className="profile-editor-grid">
                  <p className="soft full-width">
                    {copy.profile.compatibilityCode}: <strong>{draftPersonalityCode}</strong>. {copy.profile.pickOption}
                  </p>
                  <button type="button" className="ghost full-width personality-guide-open" onClick={() => navigate('personality-guide')}>
                    {copy.profile.openGuide}
                  </button>
                  {PERSONALITY_QUESTIONS.map((question, index) => (
                    <label key={question.id} className="full-width">
                      {question.prompt}
                      <select
                        value={profileDraft.personalityAnswers[index] ?? 'A'}
                        onChange={(event) =>
                          handlePersonalityAnswerChange(
                            index,
                            event.target.value === 'B' ? 'B' : 'A',
                          )
                        }
                      >
                        <option value="A">A) {question.optionA}</option>
                        <option value="B">B) {question.optionB}</option>
                      </select>
                    </label>
                  ))}
                </div>

                </details>

                <details className="profile-editor-section">
                <summary>{copy.profile.careerLifestyle}</summary>
                <div className="profile-editor-grid">
                  <label>
                    {copy.profile.jobTitle}
                    <input
                      type="text"
                      value={profileDraft.jobTitle}
                      onChange={(event) => handleProfileDraftChange('jobTitle', event.target.value)}
                    />
                  </label>
                  <label>
                    {copy.profile.company}
                    <input
                      type="text"
                      value={profileDraft.company}
                      onChange={(event) => handleProfileDraftChange('company', event.target.value)}
                    />
                  </label>
                  <label>
                    {copy.profile.education}
                    <input
                      type="text"
                      value={profileDraft.education}
                      onChange={(event) => handleProfileDraftChange('education', event.target.value)}
                    />
                  </label>
                  <label>
                    {copy.profile.languagesComma}
                    <input
                      type="text"
                      value={profileDraft.languages}
                      onChange={(event) => handleProfileDraftChange('languages', event.target.value)}
                    />
                  </label>
                  <label>
                    {copy.profile.drinking}
                    <select
                      value={profileDraft.drinking}
                      onChange={(event) => handleProfileDraftChange('drinking', event.target.value)}
                    >
                      <option value="">Select...</option>
                      {DRINKING_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {copy.profile.smoking}
                    <select
                      value={profileDraft.smoking}
                      onChange={(event) => handleProfileDraftChange('smoking', event.target.value)}
                    >
                      <option value="">Select...</option>
                      {SMOKING_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {copy.profile.workout}
                    <select
                      value={profileDraft.workout}
                      onChange={(event) => handleProfileDraftChange('workout', event.target.value)}
                    >
                      <option value="">Select...</option>
                      {WORKOUT_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {copy.profile.pets}
                    <select
                      value={profileDraft.pets}
                      onChange={(event) => handleProfileDraftChange('pets', event.target.value)}
                    >
                      <option value="">Select...</option>
                      {PETS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {copy.profile.childrenPlan}
                    <select
                      value={profileDraft.childrenPlan}
                      onChange={(event) => handleProfileDraftChange('childrenPlan', event.target.value)}
                    >
                      <option value="">Select...</option>
                      {CHILDREN_PLAN_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {copy.profile.religion}
                    <select
                      value={profileDraft.religion}
                      onChange={(event) => handleProfileDraftChange('religion', event.target.value)}
                    >
                      <option value="">Select...</option>
                      {RELIGION_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {copy.profile.politics}
                    <select
                      value={profileDraft.politics}
                      onChange={(event) => handleProfileDraftChange('politics', event.target.value)}
                    >
                      <option value="">Select...</option>
                      {POLITICS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {copy.profile.zodiac}
                    <select
                      value={profileDraft.zodiac}
                      onChange={(event) => handleProfileDraftChange('zodiac', event.target.value)}
                    >
                      <option value="">Select...</option>
                      {ZODIAC_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </label>
                </div>

                </details>

                <details className="profile-editor-section">
                <summary>{copy.profile.promptsSocial}</summary>
                <div className="profile-editor-grid">
                  <label className="full-width">
                    {copy.profile.prompt1}
                    <textarea
                      rows={2}
                      value={profileDraft.promptOne}
                      onChange={(event) => handleProfileDraftChange('promptOne', event.target.value)}
                    />
                  </label>
                  <label className="full-width">
                    {copy.profile.prompt2}
                    <textarea
                      rows={2}
                      value={profileDraft.promptTwo}
                      onChange={(event) => handleProfileDraftChange('promptTwo', event.target.value)}
                    />
                  </label>
                  <label className="full-width">
                    {copy.profile.prompt3}
                    <textarea
                      rows={2}
                      value={profileDraft.promptThree}
                      onChange={(event) => handleProfileDraftChange('promptThree', event.target.value)}
                    />
                  </label>
                  <label>
                    {copy.profile.dealbreakersComma}
                    <input
                      type="text"
                      value={profileDraft.dealbreakers}
                      onChange={(event) => handleProfileDraftChange('dealbreakers', event.target.value)}
                    />
                  </label>
                  <label>
                    {copy.profile.instagram}
                    <input
                      type="text"
                      value={profileDraft.instagram}
                      onChange={(event) => handleProfileDraftChange('instagram', event.target.value)}
                    />
                  </label>
                  <label>
                    {copy.profile.anthem}
                    <input
                      type="text"
                      value={profileDraft.anthem}
                      onChange={(event) => handleProfileDraftChange('anthem', event.target.value)}
                    />
                  </label>
                  <label className="toggle">
                    {copy.profile.travelMode}
                    <input
                      type="checkbox"
                      checked={profileDraft.travelMode}
                      onChange={(event) => handleProfileDraftToggle('travelMode', event.target.checked)}
                    />
                  </label>
                </div>

                </details>

                <details className="profile-editor-section">
                <summary>{copy.profile.photos}</summary>
                <div className="photo-input-row">
                    <input
                      type="url"
                      placeholder={copy.profile.pastePhotoUrl}
                      value={photoUrlInput}
                      onChange={(event) => setPhotoUrlInput(event.target.value)}
                    />
                    <button type="button" className="ghost" onClick={addPhotoFromUrl}>
                      {copy.profile.addUrl}
                    </button>
                  </div>
                  <label className="upload-field">
                    {copy.profile.uploadPhoto}
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} />
                  </label>

                <div className="draft-photo-grid">
                  {profileDraft.photos.map((photo, index) => (
                    <div key={`${photo}-${index}`} className="draft-photo-item">
                      <img src={photo} alt={`Draft profile ${index + 1}`} loading="lazy" decoding="async" />
                      <div className="draft-photo-actions">
                        {index === 0 ? (
                          <span className="draft-photo-primary-badge">{copy.profile.primaryPhoto}</span>
                        ) : (
                          <button
                            type="button"
                            className="mini-btn ghost"
                            onClick={() => setPrimaryDraftPhoto(index)}
                          >
                            {copy.profile.setAsPrimary}
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
                        decoding="async"
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
                </details>

                {profileSaveErrors.length > 0 ? (
                  <div className="profile-editor-errors" role="alert">
                    <strong>Save blocked — fix the following:</strong>
                    <ul>
                      {profileSaveErrors.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div className="profile-editor-actions">
                  <button type="submit">Save Profile</button>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => setProfileDraft(toProfileDraft(selfProfile))}
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

        {screen === 'personality-guide' && (
          <section className="settings-screen personality-guide-screen" aria-label="Personality guide">
            <article className="profile-settings personality-guide-intro">
              <p className="pill">Personality Guide</p>
              <h2>Understanding LoveDate Personality Codes</h2>
              <p>
                Your code has 4 letters. Example: <strong>DMFR</strong>. Each letter describes one core axis of your dating style.
                This helps people quickly understand compatibility and communication rhythm.
              </p>
              <p>
                Your current code: <strong>{selfPersonalityCode}</strong>
              </p>
              <button type="button" className="ghost" onClick={() => navigate('profile')}>
                {'\u2190'} Back to Profile
              </button>
            </article>

            <article className="profile-settings personality-dimensions">
              <h2>Letter Meanings</h2>
              <div className="personality-dimension-grid">
                {PERSONALITY_DIMENSIONS.map((item) => (
                  <div key={item.letter} className="personality-dimension-card">
                    <p className="compatibility-score">{item.letter}</p>
                    <h3>{item.title}</h3>
                    <p>{item.meaning}</p>
                    <p className="soft">Opposite: {item.opposite}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="profile-settings personality-types">
              <h2>All 16 Personality Types</h2>
              <div className="personality-types-grid">
                {PERSONALITY_TYPE_GUIDE.map((type) => (
                  <div key={type.code} className={`personality-type-card ${type.code === selfPersonalityCode ? 'is-user-type' : ''}`}>
                    <p className="compatibility-score">{type.code}</p>
                    <h3>{type.label}</h3>
                    <p>{type.summary}</p>
                    {PERSONALITY_COGNITIVE_FUNCTIONS[type.code] ? (
                      <ul className="profile-cognitive-list">
                        <li><strong>Primary:</strong> {PERSONALITY_COGNITIVE_FUNCTIONS[type.code].primary}</li>
                        <li><strong>Support:</strong> {PERSONALITY_COGNITIVE_FUNCTIONS[type.code].support}</li>
                        <li><strong>Tertiary:</strong> {PERSONALITY_COGNITIVE_FUNCTIONS[type.code].tertiary}</li>
                        <li><strong>Shadow:</strong> {PERSONALITY_COGNITIVE_FUNCTIONS[type.code].shadow}</li>
                      </ul>
                    ) : null}
                    {type.code === selfPersonalityCode ? <p className="soft">This is your current type.</p> : null}
                  </div>
                ))}
              </div>
            </article>
          </section>
        )}

        {screen === 'settings' && (
          <section className="settings-screen settings-dashboard">
            <article className="profile-settings settings-hero-card">
              <div className="settings-hero-copy">
                <p className="pill">{copy.settings.controlCenter}</p>
                <h1>{copy.settings.title}</h1>
                <p className="soft">{copy.settings.subtitle}</p>
              </div>
              <div className="settings-status-grid" aria-label="Settings overview">
                <p>
                  <strong>{copy.settings.profileSync}</strong>
                  <span>{formatStatusLabel(preferenceSaveStatus)}</span>
                </p>
                <p>
                  <strong>{copy.settings.settingsSync}</strong>
                  <span>{formatStatusLabel(settingsSaveStatus)}</span>
                </p>
                <p>
                  <strong>{copy.settings.connectedSocials}</strong>
                  <span>{socialConnectedCount}</span>
                </p>
                <p>
                  <strong>{copy.settings.unreadAlerts}</strong>
                  <span>{unreadNotificationCount}</span>
                </p>
              </div>
            </article>
            <details className="profile-settings settings-card settings-card--preferences" open>
              <summary>{copy.settings.preferences}</summary>
              <label className="setting-row">
                {copy.settings.pushNotifications}
                <input
                  type="checkbox"
                  checked={settings.pushNotifications}
                  onChange={(event) => handleSettingsToggle('pushNotifications', event.target.checked)}
                />
              </label>
              <label className="setting-row">
                {copy.settings.emailNotifications}
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={(event) => handleSettingsToggle('emailNotifications', event.target.checked)}
                />
              </label>
              <label className="setting-row">
                {copy.settings.privateMode}
                <input
                  type="checkbox"
                  checked={settings.privateMode}
                  onChange={(event) => handleSettingsToggle('privateMode', event.target.checked)}
                />
              </label>
              <p className="soft">
                {formatUiText(copy.settings.syncLine, {
                  settings: formatStatusLabel(settingsSaveStatus),
                  preferences: formatStatusLabel(preferenceSaveStatus),
                })}
              </p>
              <label className="setting-row">
                {copy.settings.incognitoMode}
                <input
                  type="checkbox"
                  checked={settings.incognitoMode}
                  onChange={(event) => handleSettingsToggle('incognitoMode', event.target.checked)}
                />
              </label>
              <label className="setting-row setting-row--select">
                {copy.settings.appLanguage}
                <select value={appLanguage} onChange={(event) => setAppLanguage(event.target.value as AppLanguage)}>
                  <option value="en">{copy.auth.english}</option>
                  <option value="ro">{copy.auth.romanian}</option>
                </select>
              </label>
            </details>
            <details className="profile-settings settings-card settings-card--social">
              <summary>Social Connect & Share</summary>
              <p className="soft">{socialMotivationLine}</p>
              <p>
                Connected: <strong>{socialConnectedCount}</strong> / {SOCIAL_PLATFORM_META.length}
              </p>
              <p className="soft">Simple mode: for each platform, users just pick Yes or No.</p>
              <label className="setting-row">
                Prompt me to share LoveDate socially
                <input
                  type="checkbox"
                  checked={selfProfile.socialPromotionOptIn}
                  onChange={(event) => toggleSocialPromotionOptIn(event.target.checked)}
                />
              </label>
              <div className="social-grid">
                {SOCIAL_PLATFORM_META.map((platform) => {
                  const entry = selfProfile.socialConnections[platform.id]
                  return (
                    <article key={platform.id} className="social-item-card">
                      <div className="social-item-head">
                        <strong>{platform.label}</strong>
                        <span className={`social-status ${entry.connected ? 'is-connected' : ''}`}>
                          {entry.connected ? 'Connected' : 'Not connected'}
                        </span>
                      </div>
                      <label className="setting-row">
                        Connect this account (Yes)
                        <input
                          type="checkbox"
                          checked={entry.connected}
                          onChange={(event) => setSocialConnectionDecision(platform.id, event.target.checked)}
                        />
                      </label>
                      <div className="summary-actions">
                        <button
                          type="button"
                          className="mini-btn"
                          onClick={() => void shareLoveDateOnPlatform(platform.id)}
                          disabled={!entry.connected || !selfProfile.socialPromotionOptIn}
                        >
                          Share LoveDate
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            </details>
            <details className="profile-settings settings-card settings-card--plan">
              <summary>Plan & Session</summary>
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
              <p className="soft">Sign out and Exit App live in the top header.</p>
            </details>
            <details className="profile-settings settings-card settings-card--notifications">
              <summary>Notifications</summary>
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
            </details>
            <details className="profile-settings settings-card settings-card--safety">
              <summary>Safety</summary>
              <p>{appLanguage === 'ro' ? 'Profiluri blocate' : 'Blocked profiles'}: {blockedProfileIds.length}</p>
              <p>{appLanguage === 'ro' ? 'Raportări trimise' : 'Reports submitted'}: {safetyReports.length}</p>
              <p>{appLanguage === 'ro' ? 'Raportări deschise' : 'Open reports'}: {safetyReports.filter((report) => report.status === 'open').length}</p>
              {safetyReports.length > 0 ? (
                <ul>
                  {safetyReports.slice(-4).map((report, idx) => {
                    const profileName = profileById.get(report.profileId)?.name ?? report.profileName
                    return (
                      <li key={`${report.id}-${idx}`}>
                        {profileName}: {report.category} ({report.status})
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="soft">{appLanguage === 'ro' ? 'Nu există încă raportări de siguranță.' : 'No safety reports yet.'}</p>
              )}
              {isModerationAdmin ? (
                <button type="button" className="ghost" onClick={() => navigate('moderation')}>
                  {appLanguage === 'ro' ? 'Deschide centrul de moderare' : 'Open Moderation Center'}
                </button>
              ) : null}
            </details>
          </section>
        )}
        {screen === 'moderation' && (
          <section className="settings-screen moderation-screen">
            {!isModerationAdmin ? (
              <article className="profile-settings moderation-detail">
                <h2>{appLanguage === 'ro' ? 'Acces restricționat' : 'Access Restricted'}</h2>
                <p className="soft">{appLanguage === 'ro' ? 'Centrul de moderare este disponibil doar pentru conturile de administrator.' : 'Moderation Center is available only for admin accounts.'}</p>
                <p className="soft">
                  {appLanguage === 'ro' ? 'Conectat ca' : 'Signed in as'}: <strong>{userEmail || (appLanguage === 'ro' ? 'necunoscut' : 'unknown')}</strong>
                </p>
                <button type="button" className="ghost" onClick={() => navigate('settings')}>
                  {appLanguage === 'ro' ? 'Înapoi la setări' : 'Back to Settings'}
                </button>
              </article>
            ) : (
              <>
                <article className="profile-settings moderation-list">
                  <h2>{appLanguage === 'ro' ? 'Coada de moderare' : 'Moderation Queue'}</h2>
                  <p className="soft">{appLanguage === 'ro' ? 'Spațiu separat de revizuire pentru raportările utilizatorilor.' : 'Separate review workspace for user reports.'}</p>
                  <div className="moderation-toolbar">
                    <label>
                      {appLanguage === 'ro' ? 'Status' : 'Status'}
                      <select
                        value={moderationStatusFilter}
                        onChange={(event) => setModerationStatusFilter(event.target.value as ModerationFilter)}
                      >
                        <option value="open">{appLanguage === 'ro' ? 'Deschise' : 'Open'}</option>
                        <option value="reviewing">{appLanguage === 'ro' ? 'În analiză' : 'Reviewing'}</option>
                        <option value="resolved">{appLanguage === 'ro' ? 'Rezolvate' : 'Resolved'}</option>
                        <option value="dismissed">{appLanguage === 'ro' ? 'Respinse' : 'Dismissed'}</option>
                        <option value="all">{appLanguage === 'ro' ? 'Toate' : 'All'}</option>
                      </select>
                    </label>
                    <label className="moderation-search">
                      {appLanguage === 'ro' ? 'Caută' : 'Search'}
                      <input
                        type="text"
                        value={moderationSearchQuery}
                        onChange={(event) => setModerationSearchQuery(event.target.value)}
                        placeholder={appLanguage === 'ro' ? 'Nume, email, categorie, detalii...' : 'Name, email, category, details...'}
                      />
                    </label>
                  </div>
                  <p className="soft">
                    {appLanguage === 'ro'
                      ? `Se afișează ${moderationReportsFiltered.length} din ${moderationReportsSorted.length} raportări.`
                      : `Showing ${moderationReportsFiltered.length} of ${moderationReportsSorted.length} reports.`}
                  </p>
                  {moderationReportsFiltered.length === 0 ? (
                    <p className="soft">{appLanguage === 'ro' ? 'Nicio raportare nu corespunde filtrelor curente.' : 'No reports match current filters.'}</p>
                  ) : (
                    <div className="notification-list">
                      {moderationReportsFiltered.map((report) => (
                        <button
                          key={report.id}
                          type="button"
                          className={`chat-item ${selectedModerationReport?.id === report.id ? 'active' : ''}`}
                          onClick={() => setActiveModerationReportId(report.id)}
                        >
                          <div className="chat-item-body">
                            <div className="chat-meta">
                              <strong>{report.profileName}</strong>
                              <span>{report.category}</span>
                            </div>
                            <div className="chat-status">
                              <small>{report.status}</small>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </article>

                <article className="profile-settings moderation-detail">
                  <h2>{appLanguage === 'ro' ? 'Detalii raportare' : 'Report Details'}</h2>
                  {selectedModerationReport ? (
                    <>
                      {selectedModerationReport.profileSnapshot.photoUrl ? (
                        <img
                          className="chat-avatar"
                          style={{ width: '5.2rem', height: '5.2rem', borderRadius: '1rem', marginBottom: '0.8rem' }}
                          src={selectedModerationReport.profileSnapshot.photoUrl}
                          alt={`${selectedModerationReport.profileName} snapshot`}
                          loading="lazy"
                          decoding="async"
                        />
                      ) : null}
                      <p>
                        <strong>{appLanguage === 'ro' ? 'Utilizator' : 'User'}:</strong> {selectedModerationReport.profileName}, {selectedModerationReport.profileSnapshot.age}
                      </p>
                      <p>
                        <strong>{appLanguage === 'ro' ? 'Context' : 'Context'}:</strong> {selectedModerationReport.profileSnapshot.city} {'\u2022'}{' '}
                        {selectedModerationReport.profileSnapshot.relationshipGoal}
                      </p>
                      <p>
                        <strong>{copy.profile.vibe}:</strong> {selectedModerationReport.profileSnapshot.vibe}
                      </p>
                      <p>
                        <strong>{appLanguage === 'ro' ? 'Instantaneu bio' : 'Bio snapshot'}:</strong> {selectedModerationReport.profileSnapshot.bio}
                      </p>
                      <p>
                        <strong>{appLanguage === 'ro' ? 'Categorie' : 'Category'}:</strong> {selectedModerationReport.category}
                      </p>
                      <p>
                        <strong>{appLanguage === 'ro' ? 'Raportat de' : 'Reporter'}:</strong> {selectedModerationReport.reporterEmail}
                      </p>
                      <p>
                        <strong>{appLanguage === 'ro' ? 'Detalii' : 'Details'}:</strong> {selectedModerationReport.details || (appLanguage === 'ro' ? 'Nu au fost oferite detalii suplimentare.' : 'No extra details provided.')}
                      </p>
                      <p>
                        <strong>{appLanguage === 'ro' ? 'Status' : 'Status'}:</strong> {selectedModerationReport.status}
                      </p>
                      <div className="summary-actions">
                        <button type="button" className="ghost" onClick={() => updateReportStatus(selectedModerationReport.id, 'reviewing')}>
                          {appLanguage === 'ro' ? 'În analiză' : 'Reviewing'}
                        </button>
                        <button type="button" className="ghost" onClick={() => updateReportStatus(selectedModerationReport.id, 'resolved')}>
                          {appLanguage === 'ro' ? 'Rezolvă' : 'Resolve'}
                        </button>
                        <button type="button" className="danger" onClick={() => resolveAndBlockReport(selectedModerationReport)}>
                          {appLanguage === 'ro' ? 'Rezolvă + blochează' : 'Resolve + Block'}
                        </button>
                        <button type="button" className="danger" onClick={() => updateReportStatus(selectedModerationReport.id, 'dismissed')}>
                          {appLanguage === 'ro' ? 'Respinge' : 'Dismiss'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="soft">{appLanguage === 'ro' ? 'Selectează o raportare din coadă.' : 'Select a report from the queue.'}</p>
                  )}
                </article>
              </>
            )}
          </section>
        )}
        {screen === 'profile-detail' && (
          <section className="profile-detail">
            {selectedDetailProfile ? (
              <>
                <article className="profile-summary">
                  <button type="button" className="ghost" onClick={closeProfileDetail}>
                    {'\u2190'} {appLanguage === 'ro' ? 'Înapoi' : 'Back'}
                  </button>
                  <h2>
                    {selectedDetailProfile.name}, {selectedDetailProfile.age}
                  </h2>
                  <p>{appLanguage === 'ro' ? 'Scor compatibilitate' : 'Compatibility score'}: {selectedDetailMatchAnalysis?.score ?? getCompatibilityScore(selectedDetailProfile)}%</p>
                  <p>
                    {appLanguage === 'ro' ? 'Potrivire de personalitate' : 'Personality fit'}: {selectedDetailMatchAnalysis?.personalityScore ?? compatibilityFromAnswers(selfProfile.personalityAnswers, selectedDetailProfile.personalityAnswers)}%
                    {' \u2022 '}{appLanguage === 'ro' ? 'Pereche' : 'Pair'}: {selectedDetailMatchAnalysis?.pairCode ?? `${selfPersonalityCode} x ${personalityCodeFromAnswers(selectedDetailProfile.personalityAnswers)}`}
                  </p>
                  <p>{selectedDetailProfile.vibe}</p>
                  <p>{selectedDetailProfile.bio}</p>
                  <p>
                    {selectedDetailProfile.gender} {'\u2022'} {selectedDetailProfile.city} {'\u2022'}{' '}
                    {selectedDetailProfile.distanceKm} km
                  </p>
                  <p>
                    {copy.profile.zodiac}: {selectedDetailProfile.zodiac} {ZODIAC_EMOJI[selectedDetailProfile.zodiac] ?? ''}
                  </p>
                  <p className="soft">{ZODIAC_DESCRIPTIONS[selectedDetailProfile.zodiac]?.overview ?? copy.profile.uniqueCosmicSignature}</p>
                  {ZODIAC_DESCRIPTIONS[selectedDetailProfile.zodiac] ? (
                    <section className="match-insights zodiac-reading">
                      <h3>{appLanguage === 'ro' ? 'Profil zodiacal' : 'Zodiac Profile'}</h3>
                      <p>
                        <strong>{selectedDetailProfile.zodiac} {appLanguage === 'ro' ? 'pe scurt' : 'overview'}:</strong>{' '}
                        {ZODIAC_DESCRIPTIONS[selectedDetailProfile.zodiac].overview}
                      </p>
                      <ul>
                        <li><strong>Love style:</strong> {ZODIAC_DESCRIPTIONS[selectedDetailProfile.zodiac].loveStyle}</li>
                        <li><strong>Communication:</strong> {ZODIAC_DESCRIPTIONS[selectedDetailProfile.zodiac].communication}</li>
                        <li><strong>Green flags:</strong> {ZODIAC_DESCRIPTIONS[selectedDetailProfile.zodiac].greenFlags}</li>
                        <li><strong>Growth edge:</strong> {ZODIAC_DESCRIPTIONS[selectedDetailProfile.zodiac].growthEdge}</li>
                        <li><strong>Emotional needs:</strong> {ZODIAC_DEEP_DIVE[selectedDetailProfile.zodiac]?.emotionalNeeds ?? 'Connection, honesty, and safety.'}</li>
                        <li><strong>Intimacy style:</strong> {ZODIAC_DEEP_DIVE[selectedDetailProfile.zodiac]?.intimacyStyle ?? 'Expressive and relational.'}</li>
                        <li><strong>Conflict style:</strong> {ZODIAC_DEEP_DIVE[selectedDetailProfile.zodiac]?.conflictStyle ?? 'Seeks resolution with care.'}</li>
                        <li><strong>Ideal date energy:</strong> {ZODIAC_DEEP_DIVE[selectedDetailProfile.zodiac]?.idealDateEnergy ?? 'Balanced and authentic.'}</li>
                        <li><strong>Best matches:</strong> {ZODIAC_DESCRIPTIONS[selectedDetailProfile.zodiac].bestMatches}</li>
                      </ul>
                      <p className="soft">
                        {appLanguage === 'ro'
                          ? 'Lectură completă: acest semn tinde să se simtă cel mai împlinit atunci când ritmul relației, limbajul emoțional și comportamentul de zi cu zi se aliniază cu aceste trăsături, nu doar atracția.'
                          : 'Complete reading: This sign tends to feel most fulfilled when relationship pacing, emotional language, and daily behavior align with these traits, not just attraction.'}
                      </p>
                    </section>
                  ) : null}
                  {selectedDetailChemistry ? (
                    <section className="match-insights">
                      <h3>{appLanguage === 'ro' ? 'Chimia compatibilității' : 'Compatibility Chemistry'}</h3>
                      <ul>
                        <li><strong>Total chemistry:</strong> {selectedDetailChemistry.chemistryScore}%</li>
                        <li><strong>Cognitive overlap:</strong> {selectedDetailChemistry.cognitiveOverlapScore}%</li>
                        <li><strong>Zodiac:</strong> {selectedDetailChemistry.zodiacAligned ? 'Aligned' : 'Neutral'}</li>
                      </ul>
                      <p className="soft">{selectedDetailChemistry.summary}</p>
                    </section>
                  ) : null}
                  {selectedDetailTypeGuide ? (
                    <p>
                      <strong>{copy.chats.type}:</strong> {selectedDetailPersonalityCode} - {selectedDetailTypeGuide.label}
                    </p>
                  ) : null}
                  {selectedDetailCognitiveFunctions ? (
                    <section className="match-insights">
                      <h3>{appLanguage === 'ro' ? 'Funcții cognitive' : 'Cognitive Functions'}</h3>
                      <ul>
                        <li><strong>Primary:</strong> {selectedDetailCognitiveFunctions.primary}</li>
                        <li><strong>Support:</strong> {selectedDetailCognitiveFunctions.support}</li>
                        <li><strong>Tertiary:</strong> {selectedDetailCognitiveFunctions.tertiary}</li>
                        <li><strong>Shadow:</strong> {selectedDetailCognitiveFunctions.shadow}</li>
                      </ul>
                    </section>
                  ) : null}
                  {selectedDetailMatchAnalysis ? (
                    <section className="match-insights">
                      <h3>{appLanguage === 'ro' ? 'De ce vă potriviți' : 'Why you match'}</h3>
                      <ul>
                        {selectedDetailMatchAnalysis.reasons.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                      {selectedDetailMatchAnalysis.caution ? <p className="soft">{selectedDetailMatchAnalysis.caution}</p> : null}
                    </section>
                  ) : null}
                  <div className="summary-actions">
                    <button type="button" className="ghost" onClick={() => reportProfile(selectedDetailProfile)}>
                      {appLanguage === 'ro' ? 'Raportează profilul' : 'Report profile'}
                    </button>
                    <button type="button" className="danger" onClick={() => blockProfile(selectedDetailProfile)}>
                      {appLanguage === 'ro' ? 'Blochează profilul' : 'Block profile'}
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
                        <img src={photo} alt={`${selectedDetailProfile.name} photo ${idx + 1}`} loading="lazy" decoding="async" />
                      </button>
                    </div>
                  ))}
                </article>
              </>
            ) : (
              <article className="state-box">
                <p className="pill">{appLanguage === 'ro' ? 'Indisponibil' : 'Unavailable'}</p>
                <h1>{appLanguage === 'ro' ? 'Profilul nu a fost găsit' : 'Profile was not found'}</h1>
                <button type="button" onClick={() => navigate('discover')}>
                  {copy.common.backToDiscover}
                </button>
              </article>
            )}
          </section>
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
      <nav className="mobile-tab-bar" aria-label="Primary navigation">
        {([
          { key: 'discover' as AppScreen, label: copy.nav.discover, icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> },
          { key: 'activity' as AppScreen, label: copy.nav.activity, badge: notifications.filter(n => !n.read).length, icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> },
          { key: 'chats' as AppScreen, label: copy.nav.chats, badge: Object.values(unreadChats).reduce((s, c) => s + c, 0), icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
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


