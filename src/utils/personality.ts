export const cognitiveFunctionTokens = (stack: {
  primary: string
  support: string
  tertiary: string
  shadow: string
}): string[] => {
  const toToken = (value: string) => value.trim().split(/\s+/)[0] ?? ''
  return [
    toToken(stack.primary),
    toToken(stack.support),
    toToken(stack.tertiary),
    toToken(stack.shadow),
  ].filter((item) => item.length > 0)
}
