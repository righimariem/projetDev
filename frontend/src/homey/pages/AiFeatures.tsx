import {
  ArrowRight,
  BarChart3,
  Check,
  Heart,
  Home,
  Lightbulb,
  ScanSearch,
  Sparkles,
  TriangleAlert,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { cn, estimatePrice, money } from '../lib'
import { Badge, MatchRing, Switch } from '../ui'

const features = [
  {
    tag: 'F2',
    icon: Home,
    title: 'Client → home recommendation',
    text: 'Your profile, budget and habits become a ranked list of homes. Each score is broken into the factors that pushed it up or down.',
    link: '/properties',
  },
  {
    tag: 'F4',
    icon: Users,
    title: 'Client → client matching',
    text: 'Two profiles are compared on budget, area, schedule, cleanliness and the way each person likes to live at home.',
    link: '/roommates',
  },
  {
    tag: 'F5',
    icon: Heart,
    title: 'Pair → home matching',
    text: 'After a mutual match, Homey combines both budgets and needs, then ranks homes that work for the two of you.',
    link: '/roommates',
  },
  {
    tag: 'F6',
    icon: Sparkles,
    title: 'Price estimation',
    text: 'A trained model estimates a fair monthly rent from location, surface, rooms, condition and amenities.',
    link: '#estimator',
  },
  {
    tag: 'F7',
    icon: ScanSearch,
    title: 'Anomaly detection',
    text: 'Prices far from comparable homes are flagged for a human review. A flag is not an accusation of fraud.',
    link: '#anomaly',
  },
  {
    tag: 'F8',
    icon: Lightbulb,
    title: 'Explainable reasoning',
    text: 'Every recommendation answers “why this one?” in plain language, so the score is never a black box.',
    link: '/properties',
  },
]

export default function AiFeaturesPage() {
  const [city, setCity] = useState('Ariana')
  const [surface, setSurface] = useState(100)
  const [bedrooms, setBedrooms] = useState(2)
  const [furnished, setFurnished] = useState(true)
  const [amenities, setAmenities] = useState<string[]>(['Air conditioning', 'Elevator', 'Fiber internet'])

  const estimate = estimatePrice({ city, surface, bedrooms, furnished, amenities })

  return (
    <div>
      <section className="border-b border-line bg-gradient-to-b from-[#f4f0e6] to-cream">
        <div className="container-page py-12 lg:py-16">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
            <div>
              <p className="eyebrow">AI features</p>
              <h1 className="display mt-3 max-w-[580px] text-[48px] leading-[1.02] sm:text-[58px]">
                A search that reads the way you talk.
              </h1>
              <p className="mt-4 max-w-[480px] text-[13px] leading-relaxed text-muted">
                Homey is not a wall of listings with a filter bar. It reads what you say,
                compares it against real homes and people, then explains every conclusion it
                reaches.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {['Recommendation', 'Roommate matching', 'Price model', 'Anomalies', 'Explanations'].map(
                  (tag) => (
                    <span key={tag} className="chip">
                      {tag}
                    </span>
                  ),
                )}
              </div>
              <div className="mt-6 flex flex-wrap gap-2.5">
                <Link to="/search/ai" className="btn btn-primary">
                  <Sparkles size={14} /> Try the AI search
                </Link>
                <Link to="/how-it-works" className="btn btn-outline">
                  How it works <ArrowRight size={13} />
                </Link>
              </div>
            </div>
            <div className="rounded-[24px] border border-line bg-white p-5 shadow-[0_30px_70px_-60px_rgba(31,75,58,0.6)]">
              <p className="text-[9px] font-semibold tracking-[0.16em] text-muted uppercase">
                One sentence becomes
              </p>
              <p className="mt-2 font-display text-[24px] leading-snug">
                “S+1 in Ariana, 700 DT maximum, near the metro, quiet, furnished.”
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {['Ariana', '≤ 700 DT', 'S+1', 'Metro', 'Quiet', 'Furnished'].map((c) => (
                  <span key={c} className="chip chip-active">
                    {c}
                  </span>
                ))}
              </div>
              <div className="mt-4 space-y-2">
                {[
                  ['Sunlit S+1 near Ariana Centre', 94],
                  ['Quiet S+2 in Menzah 6', 92],
                  ['Classic apartment in Tunis Centre', 88],
                ].map(([name, score], i) => (
                  <div
                    key={name as string}
                    className="flex items-center justify-between rounded-lg border border-line-soft px-3 py-2"
                  >
                    <span className="flex items-center gap-2 text-[11px]">
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-sand text-[9px] text-muted">
                        {i + 1}
                      </span>
                      {name}
                    </span>
                    <span className="rounded-full bg-forest px-2 py-0.5 text-[9.5px] text-white">{score}%</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[9.5px] text-muted-soft">
                Illustrative demo values · the reasoning is the product, not the number.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <a
              key={f.tag}
              href={f.link}
              className="card card-hover group p-5"
            >
              <div className="flex items-start justify-between">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-mint text-forest">
                  <f.icon size={15} />
                </span>
                <span className="font-display text-[22px] italic text-clay">{f.tag}</span>
              </div>
              <h3 className="mt-4 font-display text-[23px] leading-tight">{f.title}</h3>
              <p className="mt-2 text-[11.5px] leading-relaxed text-muted">{f.text}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-[10.5px] font-medium text-forest">
                See it in context <ArrowRight size={10} className="transition group-hover:translate-x-0.5" />
              </span>
            </a>
          ))}
        </div>
      </section>

      <section id="estimator" className="container-page py-4">
        <div className="grid overflow-hidden rounded-[26px] border border-line bg-white lg:grid-cols-2">
          <div className="p-6 sm:p-9">
            <p className="eyebrow">F6 · price estimation</p>
            <h2 className="display mt-2 text-[34px] sm:text-[40px]">What should this home rent for?</h2>
            <p className="mt-2 max-w-[420px] text-[12px] leading-relaxed text-muted">
              A local demo of the pricing model: it reads the same signals an owner would use,
              then gives a range instead of a single confident number.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="field-label">City</span>
                <select value={city} onChange={(e) => setCity(e.target.value)} className="select">
                  {['Ariana', 'Tunis', 'La Marsa', 'Gammarth', 'Ben Arous', 'Manouba', 'Sidi Bou Said'].map(
                    (c) => (
                      <option key={c}>{c}</option>
                    ),
                  )}
                </select>
              </label>
              <label className="block">
                <span className="field-label">Surface (m²)</span>
                <input
                  type="number"
                  min={10}
                  max={400}
                  value={surface}
                  onChange={(e) => setSurface(Math.max(10, Number(e.target.value)))}
                  className="input"
                />
              </label>
              <label className="block">
                <span className="field-label">Bedrooms</span>
                <select
                  value={bedrooms}
                  onChange={(e) => setBedrooms(Number(e.target.value))}
                  className="select"
                >
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-end justify-between rounded-xl border border-line px-3 py-2">
                <div>
                  <span className="field-label mb-0">Furnished</span>
                  <p className="text-[10px] text-muted">Furnished homes rent higher</p>
                </div>
                <Switch checked={furnished} onChange={setFurnished} label="Furnished" />
              </div>
            </div>
            <div className="mt-3">
              <span className="field-label">Amenities</span>
              <div className="flex flex-wrap gap-1.5">
                {['Air conditioning', 'Elevator', 'Balcony', 'Parking', 'Fiber internet', 'Garden', 'Pool'].map(
                  (a) => {
                    const active = amenities.includes(a)
                    return (
                      <button
                        key={a}
                        type="button"
                        onClick={() =>
                          setAmenities((prev) => (active ? prev.filter((x) => x !== a) : [...prev, a]))
                        }
                        className={cn('chip', active && 'chip-active')}
                      >
                        {a}
                      </button>
                    )
                  },
                )}
              </div>
            </div>
          </div>

          <div className="bg-[#f7f4ec] p-6 sm:p-9">
            <div className="rounded-2xl border border-line bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[9px] font-semibold tracking-[0.14em] text-muted uppercase">
                    Estimated monthly rent
                  </p>
                  <p className="mt-1 font-display text-[46px] leading-none">{money(estimate.price)}</p>
                  <p className="mt-1 text-[11px] text-muted">
                    Likely range {money(estimate.low)} – {money(estimate.high)}
                  </p>
                </div>
                <Badge tone="green">
                  <Sparkles size={10} /> {estimate.confidence}% confidence
                </Badge>
              </div>
              <div className="mt-4 grid grid-cols-3 divide-x divide-line rounded-xl bg-[#faf8f1] py-3 text-center">
                <div>
                  <p className="font-display text-[20px]">{estimate.perM2} DT</p>
                  <p className="text-[9px] tracking-wide text-muted uppercase">per m²</p>
                </div>
                <div>
                  <p className="font-display text-[20px]">{surface} m²</p>
                  <p className="text-[9px] tracking-wide text-muted uppercase">surface</p>
                </div>
                <div>
                  <p className="font-display text-[20px]">{bedrooms}</p>
                  <p className="text-[9px] tracking-wide text-muted uppercase">bedrooms</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-[9.5px] font-semibold tracking-[0.12em] text-muted uppercase">
                  Why this estimate
                </p>
                <ul className="mt-2 space-y-1.5">
                  {[
                    `Compared with recent ${city} listings of similar surface`,
                    furnished ? 'Furnished homes add roughly 11% in this area' : 'Unfurnished, so no furniture premium',
                    `${amenities.length} listed amenities adjust the range`,
                    'Location is the strongest signal, then surface and rooms',
                  ].map((line) => (
                    <li key={line} className="flex items-start gap-1.5 text-[10.5px] text-muted">
                      <Check size={11} className="mt-0.5 shrink-0 text-forest" /> {line}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-4 flex items-center gap-1.5 rounded-lg bg-sand/70 px-3 py-2 text-[9.5px] text-muted">
                <BarChart3 size={11} className="text-forest" /> Demo estimate computed locally, not a
                formal valuation.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="anomaly" className="container-page py-10">
        <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <div className="card p-6">
            <p className="eyebrow">F7 · anomaly detection</p>
            <h2 className="display mt-2 text-[32px]">A price that deserves a second look</h2>
            <p className="mt-2 text-[12px] leading-relaxed text-muted">
              Homey compares each listing with similar homes nearby. When the gap is large, it
              asks a human to review — it does not silently hide the listing or call the owner a
              fraudster.
            </p>
            <div className="mt-4 rounded-xl border border-line p-4">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-medium">Comparable studios · Manouba</p>
                <Badge tone="rose">
                  <TriangleAlert size={10} /> High severity
                </Badge>
              </div>
              <div className="mt-3 flex items-end gap-2">
                {[480, 505, 520, 495, 510, 420].map((price, i) => (
                  <div key={i} className="flex-1 text-center">
                    <div
                      className={cn('mx-auto w-full rounded-t', i === 5 ? 'bg-clay' : 'bg-[#cfdbc9]')}
                      style={{ height: Math.max(24, (price - 380) * 0.55) }}
                    />
                    <p className="mt-1 text-[9px] text-muted">{price}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[10.5px] leading-relaxed text-muted">
                The listing at 420 DT is 22% below the average for comparable studios in
                Manouba, while the description claims bills are included.
              </p>
              <p className="mt-2 text-[10px] text-clay">
                Price potentially unusual — verification recommended, not a fraud finding.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-[#f7f4ec] p-6">
            <p className="eyebrow">F8 · explanation</p>
            <h2 className="display mt-2 text-[32px]">Why this recommendation?</h2>
            <div className="mt-4 rounded-2xl border border-line bg-white p-5">
              <div className="flex items-center gap-4">
                <MatchRing score={94} size={76} />
                <div>
                  <p className="font-display text-[24px]">Sunlit S+1 near Ariana Centre</p>
                  <p className="text-[11px] text-muted">680 DT / month · 62 m² · S+1</p>
                </div>
              </div>
              <ul className="mt-4 space-y-1.5">
                {[
                  'Within your 700 DT monthly budget',
                  'Ariana, where your search was focused',
                  'S+1 layout, as requested',
                  'Near the Tunis metro line (4 min walk)',
                  'Quiet residential street',
                  'Furnished, as you asked',
                ].map((reason) => (
                  <li key={reason} className="flex items-start gap-2 text-[11px] text-muted">
                    <Check size={12} className="mt-0.5 shrink-0 text-forest" /> {reason}
                  </li>
                ))}
              </ul>
              <div className="mt-4 border-t border-line pt-3">
                <p className="text-[10px] text-muted-soft">
                  Score final 94% · you can adjust any criterion and the explanation updates.
                </p>
                <Link to="/properties/sunlit-ariana" className="mt-2 inline-flex items-center gap-1 text-[10.5px] font-medium text-forest">
                  Open this home <ArrowRight size={10} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page pb-4">
        <div className="rounded-[24px] bg-forest px-6 py-10 text-center text-white sm:px-10">
          <p className="text-[9.5px] font-semibold tracking-[0.18em] uppercase opacity-70">
            The whole idea
          </p>
          <h2 className="display mx-auto mt-2 max-w-[620px] text-[36px] leading-tight sm:text-[44px]">
            Not more listings. Better decisions.
          </h2>
          <p className="mx-auto mt-3 max-w-[460px] text-[12px] leading-relaxed opacity-75">
            Recommendation, roommate matching, price confidence and honest explanations — in
            one place, without the guesswork.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2.5">
            <Link to="/properties" className="btn bg-white text-forest hover:bg-sand">
              Explore homes
            </Link>
            <Link to="/roommates" className="btn border-white/30 text-white hover:bg-white/10">
              Find a roommate
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
