// Privé brand palette — JS-land constants.
//
// CSS already has these as custom properties (see src/styles/tokens.css:
// --prive-navy-deep, --prive-navy-1, --prive-navy-2, --prive-navy-3,
// --prive-gold, etc). This module duplicates the navy values for the
// minority of call sites that need a string color in JavaScript —
// native StatusBar setBackgroundColor, linear-gradient string literals,
// inline React `style` props for the ErrorBoundary, and a couple of
// fallback gradients computed at runtime.
//
// If you change a value here, change the matching --prive-navy-* in
// tokens.css too. Keep them in lockstep.

/** Deepest navy — page background (deepest). */
export const PRIVE_NAVY_DEEP = '#050818'

/** Primary navy surface — also the PWA `theme_color`. */
export const PRIVE_NAVY_1 = '#0a0e27'

/** Card / modal surface — also the Android system status bar color. */
export const PRIVE_NAVY_2 = '#141937'

/** Secondary card surface (legacy / gradient stop). */
export const PRIVE_NAVY_3 = '#252d5c'

/** Default 2-stop discover-card fallback gradient palette. */
export const DISCOVER_CARD_GRADIENT: readonly [string, string] = [PRIVE_NAVY_2, PRIVE_NAVY_3]
