// Validated against scripts/validate_palette.js (dataviz skill) — light surface #fcfcfb.
// Categorical hues are assigned in this fixed order and never cycled or reassigned by rank.
export const CATEGORICAL = {
  blue: '#2563EB',
  teal: '#0D9488',
  amber: '#D97706',
  purple: '#7C3AED',
  emerald: '#059669',
  indigo: '#4F46E5',
} as const

export const CATEGORICAL_ORDER = [
  CATEGORICAL.blue,
  CATEGORICAL.teal,
  CATEGORICAL.amber,
  CATEGORICAL.purple,
  CATEGORICAL.emerald,
  CATEGORICAL.indigo,
]

// Sequential ramp (single hue, light -> dark) for continuous magnitude
// encodings (heatmap cells). Blue rather than the previous teal so the
// magnitude ramp, the choropleth bands below, and the interface accent read as
// one system; it lands on the brand #0B0445 at the dark end.
//
// A sequential ramp is gated on lightness monotonicity, not on the categorical
// six checks — adjacent steps are *meant* to be close, which is what makes it a
// ramp. Measured: strictly decreasing luminance 0.902 -> 0.006 across all seven
// steps, contrast against the light surface rising 1.07:1 -> 18.3:1. The pale
// end sits below 3:1 by design (it encodes "least", and the cell carries a
// visible value label), matching how the teal ramp behaved.
// Step 5 was #3A72E5, which is fine as a *bar fill* but was the one step in the
// ramp that could not carry a value label: luminance 0.186 puts it exactly in
// the dead zone where near-black reaches only 4.01:1 and white only 4.45:1, so
// a heatmap cell on that step failed AA whichever way the label was coloured.
// #2F66DE (luminance 0.154) gives white 5.15:1 with headroom, and keeps the
// ramp's luminance strictly decreasing (0.305 -> 0.154 -> 0.074).
export const SEQUENTIAL_BLUE = ['#EFF4FE', '#CBDBFA', '#9DBCF4', '#6B95E8', '#2F66DE', '#21489C', '#0B0445']

// Discrete 5-band ramp for the Karnataka choropleth map — distinct saturated steps read as
// separate classes at a glance, matching official-report cartography rather than a soft blend.
export const CHOROPLETH_BANDS = ['#E7F0FE', '#B9D3FA', '#6FA4F2', '#3A72E5', '#15307A']

// Diverging pair for gap/surplus encodings (amber = deficit, teal = surplus), neutral slate midpoint.
export const DIVERGING = { low: '#D97706', mid: '#CBD5E1', high: '#0D9488' }

export const STATUS = {
  good: '#059669',
  warning: '#D97706',
  serious: '#DC2626',
  critical: '#991B1B',
} as const

export const OUTLET_TYPE_COLORS: Record<string, string> = {
  'Kirana / Small': CATEGORICAL.blue,
  Medium: CATEGORICAL.teal,
  Large: CATEGORICAL.amber,
  Others: '#94A3B8',
}

/** WCAG relative luminance of a `#rrggbb` string. */
function relativeLuminance(hex: string): number {
  const h = hex.replace('#', '')
  const ch = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
  const [r, g, b] = ch.map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * Picks the label colour for a filled swatch by measuring the fill, not by
 * guessing from the underlying data value.
 *
 * The heatmap used to switch on `value > (vMin + vMax) / 1.6` — a threshold on
 * the *data*, which has no fixed relationship to how light the cell ended up.
 * On this ramp it flipped to white one step too early, so the mid band carried
 * white text at 4.45:1. Deciding from luminance is correct by construction:
 * every step of SEQUENTIAL_BLUE now clears 4.5:1 (worst case 5.15:1).
 */
export function readableTextOn(background: string): '#0f172a' | '#ffffff' {
  const bg = relativeLuminance(background)
  const contrastWithDark = (bg + 0.05) / (relativeLuminance('#0f172a') + 0.05)
  const contrastWithWhite = (relativeLuminance('#ffffff') + 0.05) / (bg + 0.05)
  return contrastWithDark >= contrastWithWhite ? '#0f172a' : '#ffffff'
}

export function sequentialColor(value: number, min: number, max: number): string {
  const ramp = SEQUENTIAL_BLUE
  const t = max === min ? 0 : (value - min) / (max - min)
  const idx = Math.round(Math.max(0, Math.min(1, t)) * (ramp.length - 1))
  return ramp[idx]
}
