import { Link } from 'react-router-dom'
import type { Segment } from '@/lib/liveApi'
import { useSegment } from '@/components/shared/SegmentToggle'
import { useLiveQuery } from '@/lib/useLiveQuery'
import * as api from '@/lib/liveApi'

import { Reveal, CountUp, fmtIN, pct } from '@/components/geo-narrative/primitives'
import { HeroConstellation } from '@/components/geo-narrative/HeroConstellation'
import { Waffle } from '@/components/geo-narrative/Waffle'
import { Lollipop } from '@/components/geo-narrative/Lollipop'
import { Treemap, type TreemapDatum } from '@/components/geo-narrative/Treemap'
import { ClassGauge, OwnershipDonut, ChannelFunnel, type Slice } from '@/components/geo-narrative/Minis'
import { AgeRidge } from '@/components/geo-narrative/AgeRidge'

import '@/styles/geo-narrative.css'

/* ───────────────────────────────────────────────────────────────────────────
   Geography & Outlets.

   A scroll narrative rather than a card grid, and the only dark surface in the
   app. Every figure on the page is read from the live API for the currently
   selected segment — there are no hardcoded census numbers here, so changing
   the segment genuinely re-queries Postgres rather than scaling a constant.
   ─────────────────────────────────────────────────────────────────────────── */

const SEGMENT_GROUPS: { heading: string; options: { value: Segment; label: string }[] }[] = [
  { heading: '', options: [{ value: 'all', label: 'All' }] },
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

/** Ranked ramp: brightest for the largest share, cooling down the order. The
 *  `darkText` flag is the measured legible choice on each swatch, not a
 *  position rule — see TreemapDatum. */
const RANK_COLORS: { color: string; darkText: boolean }[] = [
  { color: '#e6a93b', darkText: true },
  { color: '#d4933c', darkText: true },
  { color: '#b9864b', darkText: true },
  { color: '#8a8576', darkText: true },
  { color: '#5f6b8c', darkText: false },
  { color: '#3b4666', darkText: false },
]

const TYPE_SLICES = 5

function median(values: number[]): number {
  if (!values.length) return 0
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2)
}

export default function LiveGeography() {
  const [segment, setSegment] = useSegment()

  // `[segment]` is the refetch key — every lens is a fresh query, not a scalar
  // applied to a cached "All" response.
  const districts = useLiveQuery(() => api.getDistrictsGeo(segment), [segment])
  const clusters = useLiveQuery(() => api.getOutletClusters(2, segment), [segment])
  const segmentation = useLiveQuery(() => api.getSegmentationSummary(segment), [segment])
  const ageDist = useLiveQuery(() => api.getAgeDistribution(segment), [segment])

  const segbar = (
    <div className="segwrap" role="radiogroup" aria-label="Settlement segment">
      {SEGMENT_GROUPS.map((group, gi) => (
        <div key={group.heading || 'all'} style={{ display: 'contents' }}>
          {gi > 0 && (
            <span className="seg-group-label" aria-hidden>
              {group.heading}
            </span>
          )}
          {group.options.map((o) => (
            <button
              key={o.value}
              type="button"
              className="seg"
              role="radio"
              aria-checked={o.value === segment}
              aria-pressed={o.value === segment}
              aria-label={group.heading === 'Tier' ? `Tier ${o.label.slice(1)}` : o.label}
              onClick={() => setSegment(o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  )

  if (districts.loading) {
    return (
      <div className="geo-nar">
        <div className="nar-state">
          <div className="spinner" />
          <div className="t">Reading the census</div>
          <div className="s">Querying the live outlet warehouse.</div>
        </div>
      </div>
    )
  }

  if (districts.error || !districts.data) {
    return (
      <div className="geo-nar">
        <div className="nar-state">
          <div className="t">Couldn&rsquo;t reach the live API</div>
          <div className="s">
            {districts.error ?? 'No response from the census service.'} The dashboard reads every
            figure from the backend, so nothing on this page can render until it answers.
          </div>
        </div>
      </div>
    )
  }

  /* ── derived, all from live rows ──────────────────────────────────────── */
  const rows = districts.data
  const totalOutlets = rows.reduce((s, d) => s + d.outlet_count, 0)
  const totalTaluks = rows.reduce((s, d) => s + d.taluk_count, 0)
  const districtCount = rows.length
  const medianOutlets = median(rows.map((d) => d.outlet_count))

  const byOutlets = [...rows].sort((a, b) => b.outlet_count - a.outlet_count)
  const top8 = byOutlets.slice(0, 8)
  const leader = byOutlets[0]
  const leaderShare = leader ? (leader.outlet_count / totalOutlets) * 100 : 0
  const next7 = byOutlets.slice(1, 8).reduce((s, d) => s + d.outlet_count, 0)
  const next7Share = totalOutlets ? (next7 / totalOutlets) * 100 : 0
  const runnerUp = byOutlets[1]
  const leaderMultiple = runnerUp?.outlet_count ? leader.outlet_count / runnerUp.outlet_count : 0
  const over4k = byOutlets.filter((d) => d.outlet_count >= 4000)

  const seg = segmentation.data
  const typeRows = seg?.outletType ?? []
  const typeTotal = typeRows.reduce((s, t) => s + t.outlet_count, 0)
  const namedTypes = typeRows.slice(0, TYPE_SLICES)
  const otherTypes = typeRows.slice(TYPE_SLICES)
  const otherTotal = otherTypes.reduce((s, t) => s + t.outlet_count, 0)

  const treemapData: TreemapDatum[] = [
    ...namedTypes.map((t, i) => ({
      label: t.label,
      value: t.outlet_count,
      ...RANK_COLORS[i],
    })),
    ...(otherTotal > 0
      ? [
          {
            label: `Other · ${otherTypes.length} types`,
            value: otherTotal,
            ...RANK_COLORS[5],
          },
        ]
      : []),
  ]

  // Top three types are the food/grocery core the shelf fight happens on.
  const coreThree = typeRows.slice(0, 3).reduce((s, t) => s + t.outlet_count, 0)

  const classRows: Slice[] = (seg?.outletClass ?? []).map((r, i) => ({
    label: r.label,
    value: r.outlet_count,
    color: [ '#e6a93b', '#5f6b8c', '#b0781e' ][i] ?? '#3b4666',
  }))

  /* The ownership column carries two dirty values — a handful of rows answered
     the premises question with a bare "Yes"/"No", which is not a premises type.
     They are folded into one honestly-named bucket at their true combined
     count rather than being silently dropped or shown as if they were a
     category the census actually recorded. */
  const OWNERSHIP_KNOWN = new Set(['Rented', 'Own'])
  const ownershipRaw = seg?.ownership ?? []
  const ownershipKnown = ownershipRaw.filter((r) => OWNERSHIP_KNOWN.has(r.label))
  const ownershipUnclear = ownershipRaw
    .filter((r) => !OWNERSHIP_KNOWN.has(r.label))
    .reduce((s, r) => s + r.outlet_count, 0)
  const ownershipRows: Slice[] = [
    ...ownershipKnown.map((r, i) => ({
      label: r.label,
      value: r.outlet_count,
      color: i === 0 ? '#e6a93b' : '#5f6b8c',
    })),
    ...(ownershipUnclear > 0
      ? [{ label: 'Not stated', value: ownershipUnclear, color: '#3b4666' }]
      : []),
  ]

  const channelRows: Slice[] = (seg?.channel ?? []).map((r, i) => ({
    label: r.label,
    value: r.outlet_count,
    color: ['#e6a93b', '#8a7a55', '#5f6b8c', '#46527a', '#3b4666'][i] ?? '#3b4666',
  }))

  const ageBands = ageDist.data ?? []
  const settled = ageBands
    .filter((b) => ['5-10 years', '10-20 years', '20+ years'].includes(b.age_band))
    .reduce((s, b) => s + b.outlet_count, 0)
  const ageTotal = ageBands.reduce((s, b) => s + b.outlet_count, 0)
  const peakBand = ageBands.reduce(
    (best, b) => (b.outlet_count > (best?.outlet_count ?? 0) ? b : best),
    ageBands[0],
  )

  const segLabel =
    SEGMENT_GROUPS.flatMap((g) => g.options).find((o) => o.value === segment)?.label ?? 'All'
  /* "All" is the absence of a filter, so it reads wrong wherever the label is
     used as a modifier — "All lens", "the 1,03,622-outlet all census". These
     two forms say the same thing in prose instead. */
  const lensLabel = segment === 'all' ? 'statewide' : `${segLabel} lens`
  const censusLabel = segment === 'all' ? 'census' : `${segLabel.toLowerCase()} census`

  return (
    <div className="geo-nar">
      {/* ── hero ───────────────────────────────────────────────────────── */}
      <section className="hero">
        {clusters.data && <HeroConstellation points={clusters.data} />}
        <div className="hero-veil" />
        <div className="hero-inner">
          <div className="wrap">
            <div className="live-chip">
              <span className="dot" />
              Live census · {lensLabel}
            </div>
            <div className="hero-eyebrow">The state, shop by shop</div>
            <div className="hero-num">
              <CountUp to={totalOutlets} duration={1600} />
            </div>
            <h1 className="hero-title">
              Every kirana, bakery and darshini in Karnataka — mapped, counted, and ready to sell
              into.
            </h1>
            <p className="hero-sub">
              One field census. {fmtIN(totalOutlets)} physical outlets across {districtCount}{' '}
              districts. This is where India actually shops — and where your brand has to win the
              shelf.
            </p>
          </div>
        </div>
        <div className="scrollcue">
          <span>Scroll</span>
          <span className="ln" />
        </div>
      </section>

      {/* ── KPI band ───────────────────────────────────────────────────── */}
      <section className="block wrap" style={{ paddingBottom: 40 }}>
        <Reveal>
          <div className="chapter">The census at a glance</div>
        </Reveal>
        <Reveal delay={0.05}>
          <p className="lede" style={{ marginBottom: 28 }}>
            Built from a door-to-door field census. Pick a market lens — every figure below is
            re-queried for that segment, not scaled from a state-wide total.
          </p>
        </Reveal>
        <Reveal delay={0.1}>{segbar}</Reveal>

        <Reveal delay={0.15}>
          <div className="kpi-grid" style={{ marginTop: 26 }}>
            <div className="kpi lead">
              <div className="k-lab">Total outlets</div>
              <div className="k-val num">
                <CountUp to={totalOutlets} />
              </div>
              <div className="k-foot">field-verified storefronts</div>
            </div>
            <div className="kpi">
              <div className="k-lab">Districts covered</div>
              <div className="k-val num">
                <CountUp to={districtCount} duration={800} />
                <em> / 31</em>
              </div>
              <div className="k-foot">of Karnataka&rsquo;s 31 districts</div>
            </div>
            <div className="kpi">
              <div className="k-lab">Taluks represented</div>
              <div className="k-val num">
                <CountUp to={totalTaluks} duration={800} />
              </div>
              <div className="k-foot">down to the sub-district</div>
            </div>
            <div className="kpi">
              <div className="k-lab">Median outlets / district</div>
              <div className="k-val num">
                <CountUp to={medianOutlets} />
              </div>
              <div className="k-foot">the typical district, not the giant</div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── concentration ──────────────────────────────────────────────── */}
      {leader && (
        <section className="block">
          <div className="wrap split">
            <div>
              <Reveal>
                <div className="chapter">The concentration</div>
              </Reveal>
              <Reveal delay={0.05}>
                <div className="big-share num">
                  <CountUp to={leaderShare} format={(n) => `${n.toFixed(1)}%`} />
                </div>
              </Reveal>
              <Reveal delay={0.1}>
                <h2 className="h2">One city is the market.</h2>
              </Reveal>
              <Reveal delay={0.15}>
                <p className="lede">
                  <b>
                    {leader.district} alone holds {fmtIN(leader.outlet_count)} outlets
                  </b>
                  {runnerUp && leaderMultiple >= 2 && (
                    <>
                      {' '}
                      — {leaderMultiple.toFixed(1)}× the next district, {runnerUp.district}
                    </>
                  )}
                  . Plan distribution as if the rest of Karnataka were the long tail, because on
                  these numbers it is.
                </p>
              </Reveal>
              <Reveal delay={0.2}>
                <div className="waffle-key">
                  <span>
                    <i style={{ background: 'linear-gradient(150deg,#f4ce79,#b0781e)' }} />
                    {leader.district}
                  </span>
                  <span>
                    <i style={{ background: '#5f6b8c' }} />
                    Next {Math.min(7, Math.max(districtCount - 1, 0))} districts
                  </span>
                  <span>
                    <i style={{ background: '#1b2540' }} />
                    Everything else
                  </span>
                </div>
              </Reveal>
            </div>
            <div>
              <Reveal>
                <Waffle leaderShare={leaderShare} nextShare={next7Share} />
              </Reveal>
              <Reveal delay={0.1}>
                <p className="foot-note" style={{ textAlign: 'center', marginTop: 18 }}>
                  Each square ≈ 1% of the {fmtIN(totalOutlets)}-outlet {censusLabel}
                </p>
              </Reveal>
            </div>
          </div>
        </section>
      )}

      {/* ── top districts ──────────────────────────────────────────────── */}
      <section className="block block-tight">
        <div className="wrap split rev">
          <div>
            <Reveal>
              <Lollipop
                rows={top8.map((d) => ({ district: d.district, outlet_count: d.outlet_count }))}
                total={totalOutlets}
              />
            </Reveal>
            <Reveal delay={0.1}>
              <p className="foot-note" style={{ marginTop: 6, textAlign: 'right' }}>
                Log scale — so the long tail stays legible next to {leader?.district}
              </p>
            </Reveal>
          </div>
          <div>
            <Reveal>
              <div className="chapter">Where the shops are</div>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="h2">A distribution priority list.</h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="lede">
                After {leader?.district}, the volume thins fast.{' '}
                {over4k.length > 1 ? (
                  <>
                    <b>
                      {over4k
                        .slice(1)
                        .map((d) => d.district)
                        .join(', ')}
                    </b>{' '}
                    {over4k.length === 2 ? 'is the only other district' : 'are the only other districts'}{' '}
                    clearing 4,000 outlets.
                  </>
                ) : (
                  <>
                    <b>No other district clears 4,000 outlets</b> in this lens.
                  </>
                )}{' '}
                Beyond the top eight, you are building route-to-market one town at a time.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── outlet type ────────────────────────────────────────────────── */}
      {treemapData.length > 0 && (
        <section className="block block-tight">
          <div className="wrap">
            <Reveal>
              <div className="chapter">What kind of shops</div>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="h2" style={{ maxWidth: '16ch' }}>
                {pct(coreThree, typeTotal, 0)}% of doors are a general store, bakery or eatery.
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="lede" style={{ marginBottom: 38 }}>
                The composition tells you which shelf you are fighting for. General stores lead, but
                food-service — bakeries and QSR/darshini kitchens — is a large minority of the base
                and buys very differently. {typeRows.length} distinct outlet types were recorded in
                this lens.
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <Treemap data={treemapData} total={typeTotal} />
            </Reveal>
          </div>
        </section>
      )}

      {/* ── class / ownership / channel ────────────────────────────────── */}
      <section className="block block-tight">
        <div className="wrap">
          <Reveal>
            <div className="chapter">The shape of a typical door</div>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="h2" style={{ maxWidth: '18ch', marginBottom: 36 }}>
              Mostly medium, mostly rented, almost all retail.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="trio">
              <div className="mini">
                <h3>By size class</h3>
                <p>Footprint of the store</p>
                {classRows.length > 0 ? (
                  <ClassGauge rows={classRows} />
                ) : (
                  <p className="foot-note">No size data for this segment.</p>
                )}
              </div>
              <div className="mini">
                <h3>By premises</h3>
                <p>Rented vs owned</p>
                {ownershipRows.length > 0 ? (
                  <OwnershipDonut rows={ownershipRows} />
                ) : (
                  <p className="foot-note">No premises data for this segment.</p>
                )}
              </div>
              <div className="mini">
                <h3>By route to market</h3>
                <p>Where the volume funnels</p>
                {channelRows.length > 0 ? (
                  <ChannelFunnel rows={channelRows} />
                ) : (
                  <p className="foot-note">No channel data for this segment.</p>
                )}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── age ridge ──────────────────────────────────────────────────── */}
      {ageBands.length > 0 && (
        <section className="block block-tight">
          <div className="wrap">
            <Reveal>
              <div className="chapter">How long they have traded</div>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="h2" style={{ maxWidth: '17ch' }}>
                The base is established, not fledgling.
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="lede" style={{ marginBottom: 36 }}>
                <b>{pct(settled, ageTotal, 0)}% have traded five years or more</b>
                {peakBand && <>, peaking in the {peakBand.age_band} band</>}. These are settled
                owners with fixed supplier habits — winning them is a switching game, not a
                land-grab.
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <div className="ridgecard">
                <AgeRidge bands={ageBands} />
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* ── close ──────────────────────────────────────────────────────── */}
      <section className="close">
        <div className="wrap">
          <Reveal>
            <h2 className="close-h">
              You have seen the terrain.
              <br />
              <span>Now go take the shelf.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.05}>
            <p className="lede" style={{ marginBottom: 26 }}>
              {fmtIN(totalOutlets)} doors, mapped down to the taluk. Rank them by opportunity and
              hand your field team a route that starts where the volume actually is.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <Link
              to="/live/sales-opportunity"
              style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                background: 'var(--gold)',
                color: '#160f02',
                fontWeight: 600,
                fontFamily: '"Bricolage Grotesque", sans-serif',
                padding: '15px 26px',
                borderRadius: 999,
                fontSize: 15,
                textDecoration: 'none',
              }}
            >
              See the opportunity ranking →
            </Link>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="foot-note" style={{ marginTop: 70, position: 'relative' }}>
              Karnataka GT Intelligence · Ground-Truth Field Census 2026 · Every figure on this page
              is read live from the census warehouse ({lensLabel}).
            </p>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
