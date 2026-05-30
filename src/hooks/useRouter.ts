// Phase D extraction (2026-05-30) — routing state + navigation lifted
// out of App.tsx. Owns:
//   - screen / previousScreen / selectedProfileId state
//   - the screenRef ref synced to screen (consumed by chat realtime
//     handlers that need the *current* screen from inside callbacks)
//   - the popstate/hashchange listeners that pull URL → state
//   - the navigate() function that pushes/replaces history entries
//
// What it deliberately does NOT do (those stay in App.tsx):
//   - the auth-route guard (depends on isAuthenticated from useAuth)
//   - the onboarding-route guard (depends on cloud profile hydration)
//
// Initial-screen behavior matches the legacy App.tsx exactly: `screen`
// starts at 'login' regardless of URL; `selectedProfileId` is seeded from
// the URL on first render. The popstate/hashchange listener then keeps
// state in sync with URL after mount.

import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppScreen } from '../domain/ui'
import {
  buildPath,
  readRouteFromWindow,
  shouldUseHashRouting,
} from '../utils'

export type NavigateOptions = {
  profileId?: number | null
  replace?: boolean
}

export type RouterApi = {
  screen: AppScreen
  setScreen: React.Dispatch<React.SetStateAction<AppScreen>>
  previousScreen: AppScreen
  setPreviousScreen: React.Dispatch<React.SetStateAction<AppScreen>>
  selectedProfileId: number | null
  setSelectedProfileId: React.Dispatch<React.SetStateAction<number | null>>
  screenRef: React.MutableRefObject<AppScreen>
  navigate: (nextScreen: AppScreen, options?: NavigateOptions) => void
}

export function useRouter(): RouterApi {
  const initialRoute = readRouteFromWindow()

  const [screen, setScreen] = useState<AppScreen>('login')
  const [previousScreen, setPreviousScreen] = useState<AppScreen>('discover')
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(
    initialRoute.profileId,
  )
  const screenRef = useRef<AppScreen>('login')

  // Keep screenRef.current in sync with the screen state. Consumed by
  // callbacks (e.g. realtime chat handlers) that need to know the current
  // screen without re-creating the callback on every screen change.
  useEffect(() => {
    screenRef.current = screen
  }, [screen])

  // Browser back/forward (and hash navigation under GH Pages subpath)
  // updates the URL — pull the change back into state so the screen
  // re-renders correctly without a full reload.
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

  const navigate = useCallback(
    (nextScreen: AppScreen, options?: NavigateOptions) => {
      const profileId = options?.profileId ?? null
      setScreen(nextScreen)
      if (nextScreen === 'profile-detail') {
        setSelectedProfileId(profileId)
      } else {
        setSelectedProfileId(null)
      }

      const nextPath = buildPath(
        nextScreen,
        nextScreen === 'profile-detail' ? profileId : null,
      )
      const navMethod = options?.replace
        ? window.history.replaceState
        : window.history.pushState

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

  return {
    screen,
    setScreen,
    previousScreen,
    setPreviousScreen,
    selectedProfileId,
    setSelectedProfileId,
    screenRef,
    navigate,
  }
}
