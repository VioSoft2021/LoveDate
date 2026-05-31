import { useCallback, useEffect } from 'react'
import { backendInvokeIcebreaker } from '../services/ai/icebreaker'
import { backendInvokeDatePlanner } from '../services/ai/datePlanner'
import { UI_TEXT, translateInterestForSentence } from '../constants'
import type {
  AppLanguage,
  ChatMessage,
  ChemistryInsights,
  DatePlan,
  SelfProfile,
} from '../domain'
import type { Profile } from '../services/priveApi'

// Phase D2.2 — useChatAiActions
//
// Two AI surfaces inside the chat thread:
//   1. Icebreaker / chat-coach suggestions (Haiku via E1)
//   2. Date planner cards (Sonnet via E4)
//
// Both follow the same shape: an async generator that calls the Edge
// Function, falls back to a templated alternative on failure, and
// pushes the result into a state slot that lives in useChatState.
//
// Also owns the "clear AI state when the active chat changes" effect
// so callers don't have to wire that up themselves.
//
// Kept separate from useChatState (which owns the AI state slots) so
// useChatState stays a pure-state container. Behavior + side effects
// live here.

type UseChatAiActionsInput = {
  selectedChatProfile: Profile | null
  chatThreads: Record<number, ChatMessage[]>
  selfProfile: SelfProfile
  appLanguage: AppLanguage
  getChemistryInsights: (profile: Profile) => ChemistryInsights
  // AI state owned by useChatState
  setAiCoachLoading: (loading: boolean) => void
  setAiCoachSuggestions: (suggestions: string[]) => void
  setAiDatePlannerLoading: (loading: boolean) => void
  setAiDatePlans: (plans: DatePlan[]) => void
}

export const useChatAiActions = ({
  selectedChatProfile,
  chatThreads,
  selfProfile,
  appLanguage,
  getChemistryInsights,
  setAiCoachLoading,
  setAiCoachSuggestions,
  setAiDatePlannerLoading,
  setAiDatePlans,
}: UseChatAiActionsInput) => {
  // Clear all AI panels when the active chat changes. Each chat has its
  // own pair of (sender, recipient) and the cached AI output for one
  // pair is meaningless for another.
  useEffect(() => {
    setAiCoachSuggestions([])
    setAiCoachLoading(false)
    setAiDatePlans([])
    setAiDatePlannerLoading(false)
  }, [
    selectedChatProfile?.id,
    setAiCoachLoading,
    setAiCoachSuggestions,
    setAiDatePlannerLoading,
    setAiDatePlans,
  ])

  const generateAiCoachSuggestions = useCallback(() => {
    if (!selectedChatProfile) return
    const target = selectedChatProfile
    setAiCoachLoading(true)

    const buildTemplatedFallback = (): string[] => {
      const thread = chatThreads[target.id] ?? []
      const lastThem = [...thread].reverse().find((message) => message.sender === 'them')
      const interest = target.interests[0] ?? 'coffee'
      const interestTwo = target.interests[1] ?? 'music'
      const chemistry = getChemistryInsights(target).chemistryScore
      const vibeLabel = target.vibe || target.relationshipGoal
      const zodiac = target.zodiac

      const suggestions: string[] = []
      if (lastThem?.text?.includes('?')) {
        suggestions.push(
          `Great question. I’d love to tell you more - and I’m curious about your take too. What’s your favorite ${interest} spot lately?`,
        )
      }
      suggestions.push(
        `Your ${vibeLabel.toLowerCase()} energy is doing it for me. Want to do a quick ${interest} plan this week and see how we vibe live?`,
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
        const recent = thread.slice(-10).map((message) => ({
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
            attachmentStyle: selfProfile.lovePersonality?.attachment,
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
            attachmentStyle: target.attachmentStyle,
          },
          chatExcerpt: recent,
          language: appLanguage,
          chemistryScore: getChemistryInsights(target).chemistryScore,
        })
        const next =
          aiSuggestions && aiSuggestions.length > 0
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
    appLanguage,
    getChemistryInsights,
    setAiCoachLoading,
    setAiCoachSuggestions,
  ])

  const generateAiDatePlans = useCallback(() => {
    if (!selectedChatProfile) return
    const target = selectedChatProfile
    setAiDatePlannerLoading(true)

    const buildTemplatedFallback = (): DatePlan[] => {
      const chemistry = getChemistryInsights(target).chemistryScore
      const city = target.city || selfProfile.city || 'your city'
      const sharedInterests = target.interests.filter((interest) =>
        selfProfile.interests.some(
          (mine) =>
            mine.toLowerCase().includes(interest.toLowerCase()) ||
            interest.toLowerCase().includes(mine.toLowerCase()),
        ),
      )
      const anchorInterestRaw = sharedInterests[0] ?? target.interests[0] ?? 'coffee'
      const anchorInterestTwoRaw = sharedInterests[1] ?? target.interests[1] ?? 'music'
      const anchorInterest = translateInterestForSentence(anchorInterestRaw, appLanguage)
      const anchorInterestTwo = translateInterestForSentence(
        anchorInterestTwoRaw,
        appLanguage,
      )

      const dp = UI_TEXT[appLanguage].chats
      const vibeTone =
        chemistry >= 78
          ? dp.datePlanTonePlayful
          : chemistry >= 62
            ? dp.datePlanToneWarm
            : dp.datePlanToneLight

      const fill = (template: string, vars: Record<string, string>): string =>
        Object.entries(vars).reduce(
          (acc, [key, value]) => acc.replaceAll(`{${key}}`, value),
          template,
        )
      const goldenVars = { anchor: anchorInterest, tone: vibeTone, city }
      const cultureVars = { anchorTwo: anchorInterestTwo }
      const signatureVars = { anchor: anchorInterest }

      return [
        {
          id: `micro-date-${target.id}`,
          title: dp.datePlanGoldenTitle,
          placeType: fill(dp.datePlanGoldenPlace, goldenVars),
          budget: '$',
          duration: dp.datePlanGoldenDuration,
          pitch: fill(dp.datePlanGoldenPitch, goldenVars),
          message: fill(dp.datePlanGoldenMessage, goldenVars),
        },
        {
          id: `culture-date-${target.id}`,
          title: dp.datePlanCultureTitle,
          placeType: fill(dp.datePlanCulturePlace, cultureVars),
          budget: '$$',
          duration: dp.datePlanCultureDuration,
          pitch: fill(dp.datePlanCulturePitch, cultureVars),
          message: fill(dp.datePlanCultureMessage, cultureVars),
        },
        {
          id: `signature-date-${target.id}`,
          title: dp.datePlanSignatureTitle,
          placeType: fill(dp.datePlanSignaturePlace, signatureVars),
          budget: '$$$',
          duration: dp.datePlanSignatureDuration,
          pitch: fill(dp.datePlanSignaturePitch, signatureVars),
          message: fill(dp.datePlanSignatureMessage, signatureVars),
        },
      ]
    }

    void (async () => {
      try {
        const chemistry = getChemistryInsights(target).chemistryScore
        const aiPlans = await backendInvokeDatePlanner({
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
          chemistryScore: chemistry,
          language: appLanguage,
        })

        if (aiPlans && aiPlans.length > 0) {
          setAiDatePlans(
            aiPlans.map((plan, idx) => ({
              id: `ai-date-${target.id}-${idx}`,
              title: plan.title,
              placeType: plan.placeType,
              budget: plan.budget,
              duration: plan.duration,
              pitch: plan.pitch,
              message: plan.message,
            })),
          )
        } else {
          setAiDatePlans(buildTemplatedFallback())
        }
      } catch {
        setAiDatePlans(buildTemplatedFallback())
      } finally {
        setAiDatePlannerLoading(false)
      }
    })()
  }, [
    selectedChatProfile,
    selfProfile,
    appLanguage,
    getChemistryInsights,
    setAiDatePlannerLoading,
    setAiDatePlans,
  ])

  return {
    generateAiCoachSuggestions,
    generateAiDatePlans,
  } as const
}
