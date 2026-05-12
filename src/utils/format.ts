export const formatShortTime = (timestamp: number): string =>
  new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

export const formatUiText = (
  template: string,
  replacements: Record<string, string | number>,
): string =>
  Object.entries(replacements).reduce(
    (current, [key, value]) => current.replaceAll(`{${key}}`, String(value)),
    template,
  )
