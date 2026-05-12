import { AUTH_STORAGE_KEY } from './keys'

export const readAuth = (): { isAuthenticated: boolean; email: string } => {
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
