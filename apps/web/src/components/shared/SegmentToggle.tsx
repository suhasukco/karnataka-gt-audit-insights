import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Segment } from '@/lib/liveApi'
import { cn } from '@/lib/utils'

/**
 * One selector, not three, because the census's three geographic labels are
 * not independent of one another:
 *
 *   Metro  selects exactly the same outlets as  Tier 1   (Bengaluru is the only
 *                                                         Tier-1 city, and the
 *                                                         only metro in range)
 *   Rural  selects exactly the same outlets as  Beyond Tier-3
 *   Urban  is simply "any tier at all"
 *
 * Three independent filters would let someone ask for Metro + Rural. That is
 * not a narrow result, it is an empty one — and an empty chart reads as a bug
 * rather than as a contradiction in the question. A single-select control
 * cannot express the contradiction, so it never has to explain it.
 *
 * The groups below are the three ways of cutting the same census, coarse to
 * fine, so picking one is picking a lens rather than stacking conditions.
 */
const GROUPS: { heading: string; options: { value: Segment; label: string }[] }[] = [
  {
    heading: '',
    options: [{ value: 'all', label: 'All' }],
  },
  {
    heading: 'Metro',
    options: [
      { value: 'metro', label: 'Metro' },
      { value: 'non-metro', label: 'Non-Metro' },
    ],
  },
  {
    heading: 'Density',
    options: [
      { value: 'urban', label: 'Urban' },
      { value: 'rural', label: 'Rural' },
    ],
  },
  {
    heading: 'Tier',
    options: [
      { value: 'tier-1', label: 'T1' },
      { value: 'tier-2', label: 'T2' },
      { value: 'tier-3', label: 'T3' },
    ],
  },
]

const ALL_OPTIONS = GROUPS.flatMap((g) => g.options)
const VALID = new Set<string>(ALL_OPTIONS.map((o) => o.value))

/**
 * Reads and writes the segment in the URL rather than component state, so the
 * selection survives a reload, stays when moving between the four pages, and
 * makes a filtered view something you can paste to someone.
 */
export function useSegment(): [Segment, (next: Segment) => void] {
  const [params, setParams] = useSearchParams()
  const raw = params.get('segment') ?? 'all'
  const segment = (VALID.has(raw) ? raw : 'all') as Segment

  const setSegment = useCallback(
    (next: Segment) => {
      const p = new URLSearchParams(params)
      // 'all' is the default, so it stays out of the URL entirely.
      if (next === 'all') p.delete('segment')
      else p.set('segment', next)
      setParams(p, { replace: true })
    },
    [params, setParams],
  )

  return [segment, setSegment]
}

interface SegmentToggleProps {
  value: Segment
  onChange: (next: Segment) => void
  className?: string
}

/** Radio semantics, not buttons — these are mutually exclusive views of one
 *  dataset, and a screen reader should say so. */
export function SegmentToggle({ value, onChange, className }: SegmentToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Settlement segment"
      className={cn(
        'inline-flex flex-wrap items-center gap-0.5 rounded-full border border-[#e2e0d8] bg-white p-1 shadow-card',
        className,
      )}
    >
      {GROUPS.map((group, gi) => (
        <div key={group.heading || 'all'} className="flex items-center gap-0.5">
          {/* Hairline between lenses, so the groups read as alternatives
              rather than one undifferentiated row of eight. */}
          {gi > 0 && <span aria-hidden className="mx-1 h-4 w-px bg-[#e2e0d8]" />}
          {group.options.map((o) => {
            const active = o.value === value
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={active}
                // The short tier labels need their full name announced.
                aria-label={group.heading === 'Tier' ? `Tier ${o.label.slice(1)}` : o.label}
                onClick={() => onChange(o.value)}
                className={cn(
                  // `min-h-11` (44px) is the Apple/Material touch floor. The
                  // chip only *looks* ~30px tall; the hit area is padded out to
                  // the floor so a thumb lands on it. `grid place-items-center`
                  // keeps the label optically centred once the box grows.
                  'grid min-h-11 place-items-center rounded-full px-3.5 text-[13px] font-semibold transition-colors duration-200',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-900',
                  active
                    ? 'bg-accent-900 text-white'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-navy-900',
                )}
              >
                {o.label}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
