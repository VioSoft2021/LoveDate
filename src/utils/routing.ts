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

export const readRouteFromWindow = (): { screen: AppScreen; profileId: number | null } => {
  const isFileProtocol = window.location.protocol === 'file:'
  if (isFileProtocol) {
    const rawHash = window.location.hash.replace(/^#/, '')
    const hashPath = rawHash.length > 0 ? (rawHash.startsWith('/') ? rawHash : `/${rawHash}`) : '/login'
    return parseRoute(hashPath)
  }

  return parseRoute(window.location.pathname)
}
