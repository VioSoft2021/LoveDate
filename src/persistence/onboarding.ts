import { ONBOARDED_KEY } from './keys'

// Onboarding wizard "seen" flag. Set once a user finishes the 6-step
// post-signup wizard (or explicitly skips). On next render the wizard
// will not auto-fire again. Per-origin localStorage; users on a fresh
// browser go through onboarding once.
export const readOnboardedFlag = (): boolean => {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(ONBOARDED_KEY) === '1'
}

export const persistOnboardedFlag = (): void => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(ONBOARDED_KEY, '1')
}

export const clearOnboardedFlag = (): void => {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(ONBOARDED_KEY)
}
