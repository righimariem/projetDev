import { ArrowRight, MapPin, Pencil, Search, Sparkles, Star, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { tenantSearchHistory } from '../data'
import { cn, money } from '../lib'
import { useCurrentUser, useDemo } from '../store'
import ListingCard from '../ListingCard'
import { Avatar, Badge, EmptyState, Field, Modal, showToast, Switch } from '../ui'

const tabs = [
  ['profile', 'Profile'],
  ['preferences', 'Preferences'],
  ['favorites', 'Favorites'],
  ['history', 'Search history'],
] as const

type Tab = (typeof tabs)[number][0]

export default function ProfilePage() {
  const user = useCurrentUser()
  const listings = useDemo((s) => s.listings)
  const favorites = useDemo((s) => s.favorites)
  const prefs = useDemo((s) => s.prefs)
  const setPrefs = useDemo((s) => s.setPrefs)
  const updateProfile = useDemo((s) => s.updateProfile)
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) ?? 'profile'
  const [edit, setEdit] = useState(false)
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [city, setCity] = useState(user?.city ?? 'Ariana')
  const [bio, setBio] = useState(user?.bio ?? '')

  useEffect(() => {
    if (user) {
      setName(user.name)
      setEmail(user.email)
      setCity(user.city)
      setBio(user.bio)
    }
  }, [user])

  if (!user) return <Navigate to="/login?next=/profile" replace />

  const saved = listings.filter((l) => favorites.includes(l.id))
  const setTab = (t: Tab) => setParams(t === 'profile' ? {} : { tab: t })

  return (
    <div className="container-page py-8">
      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        <div className="h-24 bg-gradient-to-r from-[#e7eee4] via-[#f0f3e8] to-[#f6ece4]" />
        <div className="px-5 pb-5 sm:px-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex items-end gap-4">
              <Avatar
                src={user.avatar}
                name={user.name}
                size={82}
                className="-mt-10 border-4 border-white shadow-sm"
              />
              <div className="pb-1">
                <h1 className="font-display text-[32px] leading-none">{user.name}</h1>
                <p className="mt-1 text-[10.5px] text-muted">{user.email}</p>
              </div>
            </div>
            <button onClick={() => setEdit(true)} className="btn btn-outline btn-sm mb-1">
              <Pencil size={12} /> Edit profile
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[10.5px] text-muted">
            <span className="flex items-center gap-1">
              <MapPin size={11} /> {user.city}
            </span>
            <span className="flex items-center gap-1">
              <Star size={11} /> Since {user.since}
            </span>
            {user.verified ? (
              <Badge tone="green">Verified account</Badge>
            ) : (
              <Badge tone="sand">Verification pending</Badge>
            )}
          </div>
          <p className="mt-3 max-w-[620px] text-[11.5px] leading-relaxed text-muted">{user.bio}</p>
        </div>
      </div>

      <div className="mt-4 flex gap-1 overflow-x-auto rounded-full border border-line bg-white p-1">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-[11px] whitespace-nowrap transition',
              tab === key ? 'bg-sand font-medium text-ink' : 'text-muted hover:text-ink',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_1fr]">
          <div className="card p-5">
            <h2 className="font-display text-[26px]">Home preferences</h2>
            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {[
                ['Property type', 'Apartment'],
                ['Layout', prefs.layout],
                ['Furnished', prefs.furnished ? 'Yes' : 'No'],
                ['Near transport', prefs.nearMetro ? 'Important' : 'Not a priority'],
                ['Shared home', 'Not preferred'],
                ['Pets', 'No pets'],
                ['Budget', money(prefs.budgetMax)],
                ['City', prefs.city],
                ['Quiet', prefs.quiet ? 'Important' : 'Flexible'],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg border border-line-soft bg-[#fcfbf6] px-3 py-2">
                  <p className="text-[8.5px] tracking-[0.1em] text-muted-soft uppercase">{k}</p>
                  <p className="mt-0.5 text-[11px]">{v}</p>
                </div>
              ))}
            </div>
            <Link to="/roommates" className="btn btn-outline btn-sm mt-4">
              Refine with roommate matching <ArrowRight size={11} />
            </Link>
          </div>

          <div className="rounded-2xl border border-line bg-[#f7f4ec] p-5">
            <p className="flex items-center gap-1.5 text-[11px] font-medium text-forest">
              <Users size={13} /> Roommate preferences
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {['Early bird', 'Tidy', 'Quiet evenings', 'Non-smoker', 'No pets'].map((tag) => (
                <span key={tag} className="chip bg-white">
                  {tag}
                </span>
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted">
              You are open to a shared home under {money(prefs.budgetMax)} per person,
              preferably within a short walk of the metro.
            </p>
            <Link to="/roommates" className="btn btn-primary btn-sm mt-4">
              See compatible people
            </Link>
          </div>
        </div>
      )}

      {tab === 'preferences' && (
        <div className="card mt-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="eyebrow">Personalisation</p>
              <h2 className="display mt-1.5 text-[30px]">What should Homey look for?</h2>
            </div>
            <Badge tone="green">
              <Sparkles size={10} /> Scores update immediately
            </Badge>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Field label="City">
              <select value={prefs.city} onChange={(e) => setPrefs({ city: e.target.value })} className="select">
                {['Ariana', 'Tunis', 'La Marsa', 'Ben Arous', 'Manouba', 'Sidi Bou Said', 'Gammarth'].map(
                  (c) => (
                    <option key={c}>{c}</option>
                  ),
                )}
              </select>
            </Field>
            <Field label="Monthly budget (DT)">
              <input
                value={prefs.budgetMax}
                onChange={(e) => setPrefs({ budgetMax: Number(e.target.value.replace(/\D/g, '')) || 0 })}
                className="input"
              />
            </Field>
            <Field label="Layout">
              <select value={prefs.layout} onChange={(e) => setPrefs({ layout: e.target.value })} className="select">
                {['S+0', 'S+1', 'S+2', 'S+3', 'S+4'].map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="mt-4 space-y-2">
            {[
              ['Furnished', 'furnished'],
              ['Near public transport', 'nearMetro'],
              ['Quiet area', 'quiet'],
            ].map(([label, key]) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-xl border border-line px-3.5 py-2.5"
              >
                <span className="text-[11.5px]">{label}</span>
                <Switch
                  checked={Boolean(prefs[key as 'furnished' | 'nearMetro' | 'quiet'])}
                  onChange={(v) => setPrefs({ [key]: v })}
                  label={label}
                />
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] text-muted-soft">
              These preferences are stored locally and used by the demo scoring engine.
            </p>
            <button
              onClick={() => showToast('Preferences saved. Your matches are updated.')}
              className="btn btn-primary btn-sm"
            >
              Save preferences
            </button>
          </div>
        </div>
      )}

      {tab === 'favorites' && (
        <div className="mt-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Saved</p>
              <h2 className="display mt-1.5 text-[30px]">Homes you want to keep</h2>
            </div>
            <Link to="/properties" className="btn btn-outline btn-sm">
              Browse more
            </Link>
          </div>
          {saved.length ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {saved.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          ) : (
            <div className="mt-4">
              <EmptyState
                title="No saved homes yet"
                text="Tap the heart on any listing to keep it here for later."
                action={
                  <Link to="/properties" className="btn btn-primary btn-sm">
                    Explore homes
                  </Link>
                }
              />
            </div>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="card mt-4 p-5">
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="eyebrow">Recent</p>
              <h2 className="display mt-1.5 text-[30px]">Search history</h2>
            </div>
            <Link to="/search/ai" className="btn btn-primary btn-sm">
              <Sparkles size={12} /> New AI search
            </Link>
          </div>
          <div className="mt-4 divide-y divide-line">
            {tenantSearchHistory.map((h) => (
              <div key={h.query} className="flex flex-wrap items-center gap-3 py-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-sand text-forest">
                  <Search size={13} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11.5px]">{h.query}</p>
                  <p className="text-[9.5px] text-muted-soft">
                    {h.at} · {h.results} homes matched
                  </p>
                </div>
                <Link
                  to={`/search/ai?q=${encodeURIComponent(h.query)}`}
                  className="text-[10.5px] font-medium text-forest hover:underline"
                >
                  Run again →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal open={edit} onClose={() => setEdit(false)} title="Edit profile">
        <div className="space-y-3">
          <Field label="Full name">
            <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
          </Field>
          <Field label="Email">
            <input value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
          </Field>
          <Field label="City">
            <select value={city} onChange={(e) => setCity(e.target.value)} className="select">
              {['Ariana', 'Tunis', 'La Marsa', 'Ben Arous', 'Manouba', 'Sidi Bou Said', 'Gammarth'].map(
                (c) => (
                  <option key={c}>{c}</option>
                ),
              )}
            </select>
          </Field>
          <Field label="About you">
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} className="textarea" />
          </Field>
          <div className="flex justify-end gap-2">
            <button onClick={() => setEdit(false)} className="btn btn-outline">
              Cancel
            </button>
            <button
              onClick={() => {
                updateProfile({ name, email, city, bio })
                setEdit(false)
                showToast('Profile updated.')
              }}
              className="btn btn-primary"
            >
              Save changes
            </button>
          </div>
          <p className="text-[9.5px] text-muted-soft">Demo only — changes stay in this browser.</p>
        </div>
      </Modal>
    </div>
  )
}
