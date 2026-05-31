import { PRIVE_NAVY_2, PRIVE_NAVY_3 } from '../constants'
import type { Profile } from '../services/priveApi'

/**
 * The layered gradient painted behind a discover card. Pure. `profile` is
 * accepted for call-site symmetry (per-profile theming may key off it later),
 * but the current palette depends only on the card face (`tone`): the front
 * gets a warmer violet bloom, the back a cooler cyan one, both over the brand
 * navy base.
 */
export const getDiscoverCardBackground = (
  _profile: Profile,
  tone: 'front' | 'back' = 'front',
): string => {
  const veil =
    tone === 'back'
      ? 'linear-gradient(155deg, rgba(20, 25, 55, 0.88), rgba(15, 20, 46, 0.84))'
      : 'linear-gradient(155deg, rgba(20, 25, 55, 0.84), rgba(37, 45, 92, 0.74))'
  const bloom =
    tone === 'back'
      ? 'radial-gradient(circle at 84% 14%, rgba(0, 229, 255, 0.12), transparent 52%)'
      : 'radial-gradient(circle at 84% 14%, rgba(167, 139, 250, 0.24), transparent 52%)'
  const base = `linear-gradient(135deg, ${PRIVE_NAVY_2}, ${PRIVE_NAVY_3})`
  return `${veil}, ${bloom}, ${base}`
}
