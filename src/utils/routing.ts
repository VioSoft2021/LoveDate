import type { AppScreen } from '../domain'

export const parseRoute = (path: string): { screen: AppScreen; profileId: number | null } => {
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

export const buildPath = (screen: AppScreen, profileId: number | null): string => {
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

// Hash routing is used when the build can't rely on pathname-based SPA
// routing — namely Capacitor's file:// scheme and static hosts that serve
// 404 for unknown paths (e.g. GitHub Pages without a 404.html fallback).
// VITE_HASH_ROUTING=true is set by the GitHub Pages deploy workflow.
export const shouldUseHashRouting = (): boolean => {
  if (typeof window === 'undefined') return false
  if (window.location.protocol === 'file:') return true
  return (import.meta.env.VITE_HASH_ROUTING as string | undefined) === 'true'
}

export const readRouteFromWindow = (): { screen: AppScreen; profileId: number | null } => {
  if (shouldUseHashRouting()) {
    const rawHash = window.location.hash.replace(/^#/, '')
    const hashPath = rawHash.length > 0 ? (rawHash.startsWith('/') ? rawHash : `/${rawHash}`) : '/login'
    return parseRoute(hashPath)
  }

  return parseRoute(window.location.pathname)
}
