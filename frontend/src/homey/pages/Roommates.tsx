import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  Check,
  Heart,
  Home,
  MapPin,
  Search,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { lifestyleOptions } from '../data'
import { cn, money, scoreRoommate } from '../lib'
import { useCurrentUser, useDemo } from '../store'
import type { RoommateProfile } from '../types'
import { Avatar, Badge, Field, Modal, showToast } from '../ui'

export default function RoommatesPage() {
  const listings = useDemo((s) => s.listings)
  const roommates = useDemo((s) => s.roommates)
  const users = useDemo((s) => s.users)
  const prefs = useDemo((s) => s.prefs)
  const setPrefs = useDemo((s) => s.setPrefs)
  const startConversation = useDemo((s) => s.startConversation)
  const user = useCurrentUser()
  const navigate = useNavigate()
  const resultsRef = useRef<HTMLDivElement>(null)

  const [budget, setBudget] = useState(String(prefs.budgetMax))
  const [city, setCity] = useState(prefs.city)
  const [layout, setLayout] = useState(prefs.layout)
  const [duration, setDuration] = useState('12 months')
  const [lifestyle, setLifestyle] = useState<string[]>(['Early bird', 'Tidy', 'Quiet evenings'])
  const [smoking, setSmoking] = useState('Non-smoker')
  const [pets, setPets] = useState('No pets')
  const [noise, setNoise] = useState('Quiet')
  const [notes, setNotes] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [selected, setSelected] = useState<RoommateProfile | null>(null)
  const [proposed, setProposed] = useState<string[]>([])

  const me = roommates.find((r) => r.userId === user?.id)

  const results = useMemo(
    () =>
      roommates
        .filter((r) => r.userId !== user?.id)
        .map((profile) => {
          const account = users.find((u) => u.id === profile.userId)
          return {
            profile,
            account,
            ...scoreRoommate(profile, { budgetMax: Number(budget), city, layout }, me),
          }
        })
        .sort((a, b) => b.score - a.score),
    [roommates, users, budget, city, layout, me, user],
  )

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setPrefs({ budgetMax: Number(budget), city, layout })
    setSubmitted(true)
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  const propose = (profile: RoommateProfile) => {
    if (!user) {
      navigate('/login?next=/roommates')
      return
    }
    const account = users.find((u) => u.id === profile.userId)
    if (!account) return
    startConversation(
      account.id,
      undefined,
      `Hi ${account.name.split(' ')[0]}, I saw we were matched on Homey. Would you be open to a quick chat about sharing a flat?`,
    )
    setProposed((prev) => [...prev, profile.userId])
    showToast(`Match proposal sent to ${account.name.split(' ')[0]}.`)
  }

  return (
    <div>
      <section className="border-b border-line bg-sand/50">
        <div className="container-page py-10">
          <p className="eyebrow">Roommates</p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="display max-w-[600px] text-[46px] leading-[1.02] sm:text-[54px]">
                Share a home with someone who fits.
              </h1>
              <p className="mt-3 max-w-[500px] text-[12.5px] leading-relaxed text-muted">
                Tell Homey how you live — budget, neighbourhood, habits — and see the people who
                line up with it. Every score comes with the reasons behind it.
              </p>
            </div>
            <Badge tone="green">
              <Sparkles size={10} /> 215 matches proposed last month
            </Badge>
          </div>
        </div>
      </section>

      <section className="container-page py-8">
        <div className="grid gap-3 md:grid-cols-3">
          <Link to="/properties" className="card card-hover flex items-start gap-3 p-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-mint text-forest">
              <Home size={15} />
            </span>
            <div>
              <p className="text-[12.5px] font-medium">I’m looking for a property</p>
              <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted">
                Browse verified rentals and explain what matters to you.
              </p>
            </div>
            <ArrowUpRight size={13} className="ml-auto shrink-0 text-muted" />
          </Link>
          <button
            onClick={() => document.getElementById('roommate-form')?.scrollIntoView({ behavior: 'smooth' })}
            className="card card-hover flex items-start gap-3 p-4 text-left"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-mint text-forest">
              <UserRound size={15} />
            </span>
            <div>
              <p className="text-[12.5px] font-medium">I’m looking for a roommate</p>
              <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted">
                Match on budget, neighbourhood and the way you live.
              </p>
            </div>
          </button>
          <button
            onClick={() => {
              document.getElementById('roommate-form')?.scrollIntoView({ behavior: 'smooth' })
              showToast('Fill in the preferences below to see compatible people.')
            }}
            className="card card-hover flex items-start gap-3 border-[#bcd0bf] bg-[#fbfcf8] p-4 text-left"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-forest text-white">
              <Building2 size={15} />
            </span>
            <div>
              <p className="text-[12.5px] font-medium">I have a property and need a roommate</p>
              <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted">
                Find someone to share your place, with a fair compatibility score.
              </p>
            </div>
            <BadgeCheck size={14} className="ml-auto shrink-0 text-forest" />
          </button>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_300px]">
          <form id="roommate-form" onSubmit={submit} className="card p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="eyebrow">Your preferences</p>
                <h2 className="display mt-2 text-[32px]">Tell us how you live</h2>
                <p className="mt-1 text-[11.5px] text-muted">
                  The more you share, the more useful the match. You can change any of it later.
                </p>
              </div>
              <Badge tone="green">
                <Sparkles size={10} /> Owner search
              </Badge>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Field label="Monthly budget (DT)">
                <input
                  value={budget}
                  onChange={(e) => setBudget(e.target.value.replace(/\D/g, ''))}
                  className="input"
                  placeholder="700"
                />
              </Field>
              <Field label="Preferred location">
                <select value={city} onChange={(e) => setCity(e.target.value)} className="select">
                  {['Ariana', 'Tunis', 'La Marsa', 'Ben Arous', 'Manouba', 'Sidi Bou Said', 'Gammarth'].map(
                    (c) => (
                      <option key={c}>{c}</option>
                    ),
                  )}
                </select>
              </Field>
              <Field label="Property layout">
                <select value={layout} onChange={(e) => setLayout(e.target.value)} className="select">
                  {['S+0', 'S+1', 'S+2', 'S+3', 'S+4'].map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </Field>
              <Field label="Rental duration">
                <select value={duration} onChange={(e) => setDuration(e.target.value)} className="select">
                  {['6 months', '12 months', '24 months', 'Flexible'].map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="mt-4">
              <p className="field-label">Lifestyle</p>
              <div className="flex flex-wrap gap-1.5">
                {lifestyleOptions.map((l) => {
                  const active = lifestyle.includes(l)
                  return (
                    <button
                      key={l}
                      type="button"
                      onClick={() =>
                        setLifestyle((prev) => (active ? prev.filter((x) => x !== l) : [...prev, l]))
                      }
                      className={cn('chip', active && 'chip-active')}
                    >
                      {l}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Field label="Smoking">
                <select value={smoking} onChange={(e) => setSmoking(e.target.value)} className="select">
                  <option>Non-smoker</option>
                  <option>Smoker</option>
                  <option>Outside only</option>
                </select>
              </Field>
              <Field label="Pets">
                <select value={pets} onChange={(e) => setPets(e.target.value)} className="select">
                  <option>No pets</option>
                  <option>Cat</option>
                  <option>Dog</option>
                  <option>Fine with pets</option>
                </select>
              </Field>
              <Field label="Noise at home">
                <select value={noise} onChange={(e) => setNoise(e.target.value)} className="select">
                  <option>Quiet</option>
                  <option>Relaxed</option>
                  <option>Lively</option>
                </select>
              </Field>
            </div>

            <Field label="Anything else? (optional)" className="mt-4">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="For example: I’d prefer a flatmate with two bathrooms, or someone who works during the day."
                className="textarea"
              />
            </Field>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[9.5px] text-muted-soft">
                Profile data is stored in this browser only in demo mode.
              </p>
              <button type="submit" className="btn btn-primary">
                <Search size={13} /> Find my matches
              </button>
            </div>
          </form>

          <aside className="space-y-3">
            <div className="rounded-2xl bg-[#f7f4ec] p-4">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.12em] text-clay uppercase">
                <Sparkles size={10} /> How matching works
              </p>
              <ol className="mt-3 space-y-2.5">
                {[
                  'We compare budget, area and property layout first.',
                  'Lifestyle, schedule, guests and habits adjust the score.',
                  'Only shared preferences are shown on a public profile.',
                  'You decide whether to propose a match. Nothing is automatic.',
                ].map((step, i) => (
                  <li key={step} className="flex gap-2 text-[10.5px] leading-relaxed text-muted">
                    <span className="font-display text-[14px] leading-none text-clay">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
            <div className="card p-4">
              <p className="text-[11px] font-medium">Good to know</p>
              <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
                A high score is a conversation starter, not a guarantee. Always meet before
                signing anything together, and agree in writing how rent and bills are split.
              </p>
              <Link to="/how-it-works" className="mt-2 inline-flex items-center gap-1 text-[10.5px] font-medium text-forest">
                Read the rental guide <ArrowRight size={10} />
              </Link>
            </div>
            <div className="card p-4">
              <div className="flex -space-x-2">
                {['rania', 'yosra', 'amine', 'nour'].map((id) => (
                  <Avatar key={id} src={`/photos/avatar-${id}.jpg`} size={30} className="ring-2 ring-white" />
                ))}
              </div>
              <p className="mt-2 text-[10.5px] leading-relaxed text-muted">
                215 roommate matches were proposed on Homey last month. 128 moved forward to a
                conversation.
              </p>
            </div>
          </aside>
        </div>

        <div ref={resultsRef}>
          {submitted ? (
            <>
              <div className="mt-10 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="eyebrow">Your matches</p>
                  <h2 className="display mt-2 text-[34px]">{results.length} people line up with you</h2>
                  <p className="mt-1 text-[11.5px] text-muted">
                    Sorted by compatibility. Each score comes with the reasons behind it.
                  </p>
                </div>
                <Badge tone="green">
                  <MapPin size={10} /> {city} · {money(Number(budget))}
                </Badge>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {results.slice(0, 4).map(({ profile, account, score, reasons }) => {
                  const shared = profile.lifestyle.filter((l) => lifestyle.includes(l))
                  return (
                    <article key={profile.userId} className="card p-4">
                      <div className="flex items-start gap-3">
                        <Avatar src={account?.avatar} name={account?.name} size={52} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="text-[14px] font-medium">
                              {account?.name.split(' ')[0]} · {profile.age}
                            </p>
                            {account?.verified && <BadgeCheck size={13} className="text-forest" />}
                          </div>
                          <p className="truncate text-[10.5px] text-muted">{profile.job}</p>
                          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-muted">
                            <span className="flex items-center gap-1">
                              <MapPin size={10} /> {profile.city}
                            </span>
                            <span className="flex items-center gap-1">
                              <Building2 size={10} /> {money(profile.budget)}
                            </span>
                          </p>
                        </div>
                        <MatchPill score={score} />
                      </div>
                      <p className="mt-3 line-clamp-2 text-[11px] leading-relaxed text-muted">{profile.bio}</p>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {profile.lifestyle.map((l) => (
                          <span key={l} className="chip">
                            {l}
                          </span>
                        ))}
                        <span className="chip">{profile.pets === 'No pets' ? 'No pets' : profile.pets}</span>
                      </div>
                      <div className="mt-3 rounded-lg bg-[#faf8f1] p-3">
                        <p className="text-[9px] font-semibold tracking-[0.12em] text-muted uppercase">
                          You both want
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                          {(shared.length ? shared : lifestyle.slice(0, 2))
                            .concat(['Furnished room', 'Near metro'])
                            .slice(0, 4)
                            .map((tag) => (
                              <span key={tag} className="flex items-center gap-1 text-[10px] text-muted">
                                <Check size={10} className="text-forest" /> {tag}
                              </span>
                            ))}
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <button
                          onClick={() => setSelected(profile)}
                          className="btn btn-outline btn-sm flex-1"
                        >
                          View profile
                        </button>
                        <button
                          onClick={() => propose(profile)}
                          disabled={proposed.includes(profile.userId)}
                          className="btn btn-primary btn-sm flex-1"
                        >
                          <Heart size={12} /> {proposed.includes(profile.userId) ? 'Proposed' : 'Propose match'}
                        </button>
                      </div>
                      {reasons.length > 0 && (
                        <p className="mt-2 text-[9.5px] text-muted-soft">
                          {reasons.slice(0, 3).join(' · ')}
                        </p>
                      )}
                    </article>
                  )
                })}
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4">
                <p className="text-[11px] text-muted">
                  Want to see the homes a pair like yours could afford? Homey combines both
                  budgets for a shared search.
                </p>
                <Link to="/properties" className="btn btn-primary btn-sm">
                  <Home size={12} /> Browse shared homes
                </Link>
              </div>
            </>
          ) : (
            <div className="mt-8 rounded-2xl border border-dashed border-line bg-white/60 p-8 text-center">
              <Search size={20} className="mx-auto text-muted-soft" />
              <p className="mt-2 font-display text-2xl">Your matches will appear here</p>
              <p className="mt-1 text-[11.5px] text-muted">
                Set your preferences above and choose “Find my matches”.
              </p>
            </div>
          )}
        </div>
      </section>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `${users.find((u) => u.id === selected.userId)?.name}` : 'Profile'}
      >
        {selected && (
          <div>
            <div className="flex items-center gap-4">
              <Avatar
                src={users.find((u) => u.id === selected.userId)?.avatar}
                name={users.find((u) => u.id === selected.userId)?.name}
                size={64}
              />
              <div>
                <p className="font-display text-2xl">{selected.age} years old</p>
                <p className="text-[11px] text-muted">{selected.job}</p>
                <p className="mt-1 flex items-center gap-1 text-[11px] text-muted">
                  <MapPin size={11} /> {selected.city} · {money(selected.budget)}
                </p>
              </div>
            </div>
            <p className="mt-4 text-[12px] leading-relaxed text-muted">{selected.bio}</p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
              {[
                ['Layout', selected.layout],
                ['Duration', selected.duration],
                ['Smoking', selected.smoking],
                ['Pets', selected.pets],
                ['At home', selected.noise],
                ['Lifestyle', selected.lifestyle.join(', ')],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-sand/60 px-3 py-2">
                  <p className="text-[9px] tracking-[0.1em] text-muted uppercase">{k}</p>
                  <p className="mt-0.5">{v}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setSelected(null)} className="btn btn-outline">
                Close
              </button>
              <button
                onClick={() => {
                  propose(selected)
                  setSelected(null)
                }}
                className="btn btn-primary"
              >
                <Heart size={13} /> Propose match
              </button>
            </div>
          </div>
        )}
      </Modal>

      <section className="container-page pb-4">
        <div className="rounded-2xl border border-line bg-white p-4 text-[10.5px] text-muted">
          {listings.filter((l) => l.status === 'published').length} published homes ·{' '}
          {roommates.length} roommate profiles in the demo · scores are illustrative, not a
          promise of suitability.
        </div>
      </section>
    </div>
  )
}

function MatchPill({ score }: { score: number }) {
  return (
    <span className="shrink-0 rounded-full bg-forest px-2.5 py-1 text-[10px] font-medium text-white">
      {score}%
    </span>
  )
}
