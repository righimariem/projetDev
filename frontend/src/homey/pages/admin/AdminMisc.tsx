import { Check, Eye, Heart, Search, Sparkles, TrendingUp, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { cn, dateLabel, money } from '../../lib'
import { useDemo } from '../../store'
import type { DemoUser } from '../../types'
import {
  AreaChart,
  Avatar,
  Badge,
  BarChart,
  EmptyState,
  showToast,
  StatCard,
  StatusPill,
  Switch,
} from '../../ui'

export function AdminListings() {
  const listings = useDemo((s) => s.listings)
  const users = useDemo((s) => s.users)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')

  const rows = listings
    .filter((l) => (status === 'all' ? true : l.status === status))
    .filter((l) =>
      search
        ? `${l.title} ${l.city} ${users.find((u) => u.id === l.ownerId)?.name ?? ''}`
            .toLowerCase()
            .includes(search.toLowerCase())
        : true,
    )

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Administration</p>
          <h1 className="display mt-2 text-[38px] leading-none">Listings</h1>
          <p className="mt-2 text-[12px] text-muted">
            Every property submitted to Homey, with its current publication status and AI quality
            score.
          </p>
        </div>
        <Badge tone="outline">
          {listings.length} total · {rows.length} shown
        </Badge>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search size={14} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-soft" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, owner or city"
            className="w-full rounded-full border border-line bg-white py-2 pr-4 pl-9 text-[11px] outline-none"
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="select w-auto py-2 text-[11px]">
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      <div className="mt-4 space-y-2">
        {rows.map((l) => {
          const owner = users.find((u) => u.id === l.ownerId)
          return (
            <div key={l.id} className="card flex flex-wrap items-center gap-3 p-3">
              <img src={l.photos[0]} alt="" className="h-14 w-20 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11.5px] font-medium">{l.title}</p>
                <p className="truncate text-[9.5px] text-muted">
                  {owner?.name} · {l.neighbourhood}, {l.city} · {l.layout} · {l.surface} m²
                </p>
                <p className="text-[9px] text-muted-soft">
                  Submitted {dateLabel(l.createdAt)} · {l.views} views
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11.5px] font-medium">{money(l.rent)}</p>
                <p className="text-[8.5px] text-muted-soft">per month</p>
              </div>
              <div className="flex w-[80px] items-center justify-center gap-1 text-[10px] text-muted">
                <Sparkles size={9} /> {l.qualityScore}/100
              </div>
              <div className="w-[130px]">
                <StatusPill status={l.status} />
              </div>
              <Link
                to={l.status === 'pending' ? `/admin/pending?listing=${l.id}` : `/properties/${l.id}`}
                className="btn btn-outline btn-sm"
              >
                <Eye size={11} /> View
              </Link>
            </div>
          )
        })}
        {rows.length === 0 && <EmptyState title="No listing matches" text="Try another status or search." />}
      </div>
    </div>
  )
}

export function AdminUsers({ role }: { role?: 'owner' | 'tenant' }) {
  const users = useDemo((s) => s.users)
  const setSuspended = useDemo((s) => s.setUserSuspended)
  const [search, setSearch] = useState('')
  const title = role === 'owner' ? 'Owners' : role === 'tenant' ? 'Tenants' : 'Users'
  const rows = users
    .filter((u) => (role ? u.role === role : true))
    .filter((u) =>
      search ? `${u.name} ${u.email} ${u.city}`.toLowerCase().includes(search.toLowerCase()) : true,
    )

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Administration</p>
          <h1 className="display mt-2 text-[38px] leading-none">{title}</h1>
          <p className="mt-2 text-[12px] text-muted">
            Accounts registered in the demo, with their role, city and verification state.
          </p>
        </div>
        <Badge tone="outline">{rows.length} accounts</Badge>
      </div>

      <div className="relative mt-5 max-w-[340px]">
        <Search size={13} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-soft" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email or city"
          className="w-full rounded-full border border-line bg-white py-2 pr-3 pl-8 text-[11px] outline-none"
        />
      </div>

      <div className="card mt-4 overflow-hidden">
        <div className="hidden grid-cols-[1.6fr_80px_100px_80px_100px_90px] gap-3 border-b border-line px-4 py-2.5 text-[8.5px] font-semibold tracking-[0.12em] text-muted uppercase md:grid">
          <span>Account</span>
          <span>Role</span>
          <span>City</span>
          <span>Since</span>
          <span>Verification</span>
          <span>Status</span>
        </div>
        {rows.map((u) => (
          <div
            key={u.id}
            className="grid grid-cols-1 items-center gap-2 border-b border-line-soft px-4 py-3 last:border-0 md:grid-cols-[1.6fr_80px_100px_80px_100px_90px]"
          >
            <div className="flex items-center gap-2.5">
              <Avatar src={u.avatar} name={u.name} size={34} />
              <div className="min-w-0">
                <p className="truncate text-[11.5px] font-medium">{u.name}</p>
                <p className="truncate text-[9.5px] text-muted">{u.email}</p>
              </div>
            </div>
            <span className="text-[10px] text-muted capitalize">{u.role}</span>
            <span className="text-[10px] text-muted">{u.city}</span>
            <span className="text-[10px] text-muted">{u.since}</span>
            <span>
              {u.verified ? <Badge tone="green">Verified</Badge> : <Badge tone="sand">Pending</Badge>}
            </span>
            <button
              onClick={() => {
                setSuspended(u.id, !u.suspended)
                showToast(u.suspended ? 'Account reactivated.' : 'Account suspended.')
              }}
              className={cn(
                'justify-self-start rounded-full px-2 py-1 text-[9px] font-medium',
                u.suspended ? 'bg-rose-soft text-rose-ink' : 'bg-mint text-forest',
              )}
            >
              {u.suspended ? 'Suspended' : 'Active'}
            </button>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="px-4 py-6 text-center text-[11px] text-muted">No account matches this search.</p>
        )}
      </div>
    </div>
  )
}

export function AdminSettings() {
  const listings = useDemo((s) => s.listings)
  const [name, setName] = useState('Homey')
  const [email, setEmail] = useState('support@homey.tn')
  const [city, setCity] = useState('Tunis')
  const [threshold, setThreshold] = useState(75)
  const [autoApprove, setAutoApprove] = useState(false)
  const [requireId, setRequireId] = useState(true)
  const [notify, setNotify] = useState(true)

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Administration</p>
          <h1 className="display mt-2 text-[38px] leading-none">Settings</h1>
          <p className="mt-2 text-[12px] text-muted">
            Platform identity, AI review thresholds and integration status. Changes apply to the demo
            only.
          </p>
        </div>
        <button
          onClick={() => showToast('Settings saved in this browser session.')}
          className="btn btn-primary btn-sm"
        >
          <Check size={12} /> Save settings
        </button>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="font-display text-[24px]">Platform</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="field-label">Site name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
              </label>
              <label className="block">
                <span className="field-label">Support email</span>
                <input value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
              </label>
              <label className="block">
                <span className="field-label">Default city</span>
                <select value={city} onChange={(e) => setCity(e.target.value)} className="select">
                  {['Tunis', 'Ariana', 'La Marsa', 'Sousse', 'Sfax'].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="field-label">Currency</span>
                <select className="select">
                  <option>TND — Tunisian dinar</option>
                  <option>EUR — Euro</option>
                </select>
              </label>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="flex items-center gap-1.5 font-display text-[24px]">
              <Sparkles size={16} className="text-clay" /> AI review
            </h2>
            <p className="mt-1 text-[10.5px] text-muted">
              AI checks are advisory; publication always requires a human decision.
            </p>
            <div className="mt-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px]">Flag listings scoring below</span>
                <span className="text-[11px] font-medium">{threshold} / 100</span>
              </div>
              <input
                type="range"
                min={40}
                max={100}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="mt-2 w-full accent-[#1f4b3a]"
              />
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl border border-line px-3.5 py-2.5">
              <div>
                <p className="text-[11px]">Auto-approve verified owners</p>
                <p className="text-[9.5px] text-muted">Still records the quality score and any alerts.</p>
              </div>
              <Switch checked={autoApprove} onChange={setAutoApprove} label="Auto approve" />
            </div>
          </div>

          <div className="card p-5">
            <h2 className="font-display text-[24px]">Membership &amp; verification</h2>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between rounded-xl border border-line px-3.5 py-2.5">
                <div>
                  <p className="text-[11px]">Require identity verification for owners</p>
                  <p className="text-[9.5px] text-muted">Owners can browse but not publish until verified.</p>
                </div>
                <Switch checked={requireId} onChange={setRequireId} label="Require ID" />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-line px-3.5 py-2.5">
                <div>
                  <p className="text-[11px]">Notify administrators of new listings</p>
                  <p className="text-[9.5px] text-muted">Sends a daily digest to the support inbox.</p>
                </div>
                <Switch checked={notify} onChange={setNotify} label="Notify admins" />
              </div>
            </div>
            <p className="mt-3 text-[9.5px] text-muted-soft">
              Rejected listings stay available to their owner for editing.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <p className="text-[9.5px] font-semibold tracking-[0.13em] text-muted uppercase">
              Integration status
            </p>
            <div className="mt-3 space-y-2 text-[10.5px]">
              {[
                ['Django API', 'Not connected', 'sand'],
                ['JWT auth', 'Prepared', 'green'],
                ['Demo data layer', 'Active', 'green'],
                ['AI endpoints', 'Prepared', 'green'],
              ].map(([label, status, tone]) => (
                <div key={label as string} className="flex items-center justify-between">
                  <span className="text-muted">{label}</span>
                  <Badge tone={tone as 'green' | 'sand'}>{status}</Badge>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[9.5px] leading-relaxed text-muted-soft">
              Set <code className="text-[9px]">VITE_API_BASE_URL</code> and{' '}
              <code className="text-[9px]">VITE_USE_MOCK_DATA=false</code> to switch the whole app to
              the Django backend.
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-[#f7f4ec] p-5">
            <p className="text-[10px] font-medium">Demo data</p>
            <p className="mt-1 text-[10px] leading-relaxed text-muted">
              {listings.length} listings, stored in this browser. Reset removes any listing, message
              or account you created.
            </p>
            <button
              onClick={() => {
                if (window.confirm('Reset all demo data? This clears listings and conversations you created.')) {
                  useDemo.getState().resetDemo()
                  showToast('Demo data reset.')
                }
              }}
              className="btn btn-outline btn-sm mt-3"
            >
              Clear and start again
            </button>
          </div>

          <div className="card p-5">
            <p className="flex items-center gap-1.5 text-[10.5px] font-medium">
              <TrendingUp size={12} /> Review policy
            </p>
            <ul className="mt-2 space-y-1.5 text-[10px] leading-relaxed text-muted">
              <li>· Every new listing is reviewed by a person.</li>
              <li>· AI alerts never close automatically.</li>
              <li>· Decisions are recorded against the admin account.</li>
              <li>· Owners can edit a rejected listing and resubmit.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AdminStatistics() {
  const listings = useDemo((s) => s.listings)
  const users = useDemo((s) => s.users)
  const requests = useDemo((s) => s.requests)
  const published = listings.filter((l) => l.status === 'published')
  const views = listings.reduce((n, l) => n + l.views, 0)
  const cities = Array.from(new Set(listings.map((l) => l.city))).map((city) => {
    const rows = listings.filter((l) => l.city === city)
    return {
      city,
      count: rows.length,
      avg: Math.round(rows.reduce((n, l) => n + l.rent, 0) / rows.length),
      views: rows.reduce((n, l) => n + l.views, 0),
    }
  })

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Administration</p>
          <h1 className="display mt-2 text-[38px] leading-none">Statistics</h1>
          <p className="mt-2 text-[12px] text-muted">
            Listing supply, demand and quality across the platform.
          </p>
        </div>
        <Badge tone="green">
          <TrendingUp size={10} /> Updated just now
        </Badge>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total views" value={views.toLocaleString('en-US')} icon={<Eye size={14} />} delta="↗ 9%" />
        <StatCard label="Published listings" value={published.length} icon={<Sparkles size={14} />} hint={`${listings.length} total`} />
        <StatCard label="Accounts" value={users.length} icon={<Users size={14} />} hint="all roles" />
        <StatCard label="Visit requests" value={requests.length} icon={<Heart size={14} />} hint="demo queue" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <p className="text-[12px] font-medium">Views over the last six months</p>
          <AreaChart
            data={[420, 510, 480, 610, 720, 690]}
            labels={['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov']}
            height={200}
          />
        </div>
        <div className="card p-5">
          <p className="text-[12px] font-medium">New listings vs. accounts</p>
          <BarChart a={[12, 15, 18, 16, 22, 19]} b={[8, 10, 12, 14, 18, 21]} labels={['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov']} />
        </div>
      </div>

      <div className="card mt-4 overflow-hidden">
        <div className="border-b border-line px-4 py-3">
          <p className="text-[12px] font-medium">By city</p>
          <p className="text-[9.5px] text-muted">Supply and average rent</p>
        </div>
        <div className="hidden grid-cols-[1fr_80px_120px_90px] gap-3 border-b border-line px-4 py-2 text-[8.5px] font-semibold tracking-[0.12em] text-muted uppercase sm:grid">
          <span>City</span>
          <span>Listings</span>
          <span>Average rent</span>
          <span>Views</span>
        </div>
        {cities.map((c) => (
          <div
            key={c.city}
            className="grid grid-cols-2 gap-2 border-b border-line-soft px-4 py-2.5 text-[10.5px] last:border-0 sm:grid-cols-[1fr_80px_120px_90px]"
          >
            <span className="font-medium">{c.city}</span>
            <span className="text-muted">{c.count}</span>
            <span className="text-muted">{money(c.avg)}</span>
            <span className="text-muted">{c.views}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function AdminMatching() {
  const roommates = useDemo((s) => s.roommates)
  const users = useDemo((s) => s.users)
  const pairs = useMemo(() => {
    const rows: Array<{ a: (typeof roommates)[number]; b: (typeof roommates)[number]; score: number; shared: string[] }> = []
    for (let i = 0; i < roommates.length; i++) {
      for (let j = i + 1; j < roommates.length; j++) {
        const a = roommates[i]
        const b = roommates[j]
        const shared = a.lifestyle.filter((l) => b.lifestyle.includes(l))
        const budgetClose = Math.max(0, 1 - Math.abs(a.budget - b.budget) / 600)
        const score = Math.round(
          58 + budgetClose * 18 + (a.city === b.city ? 10 : 2) + Math.min(12, shared.length * 4),
        )
        rows.push({ a, b, score: Math.min(97, score), shared })
      }
    }
    return rows.sort((x, y) => y.score - x.score).slice(0, 6)
  }, [roommates])

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Administration</p>
          <h1 className="display mt-2 text-[38px] leading-none">Matching</h1>
          <p className="mt-2 text-[12px] text-muted">
            How roommate matching is performing, and the pairs currently closest to a conversation.
          </p>
        </div>
        <Badge tone="green">
          <Sparkles size={10} /> 215 matches this month
        </Badge>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Matches proposed" value="215" hint="last month" />
        <StatCard label="Moved to conversation" value="128" delta="↗ 12%" />
        <StatCard label="Average compatibility" value="84%" />
        <StatCard label="Pairs browsing homes" value="34" hint="this week" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-medium">Closest pairs</p>
              <p className="text-[10px] text-muted">Illustrative demo calculations</p>
            </div>
            <Link to="/roommates" className="text-[10.5px] font-medium text-forest hover:underline">
              Open matching ↗
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {pairs.map(({ a, b, score, shared }) => {
              const ua = users.find((u) => u.id === a.userId)
              const ub = users.find((u) => u.id === b.userId)
              return (
                <div
                  key={`${a.userId}-${b.userId}`}
                  className="flex items-center gap-2 rounded-xl border border-line-soft px-3 py-2.5"
                >
                  <div className="flex -space-x-2">
                    <Avatar src={ua?.avatar} name={ua?.name} size={28} className="ring-2 ring-white" />
                    <Avatar src={ub?.avatar} name={ub?.name} size={28} className="ring-2 ring-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10.5px] font-medium">
                      {ua?.name.split(' ')[0]} &amp; {ub?.name.split(' ')[0]}
                    </p>
                    <p className="truncate text-[9px] text-muted">
                      {shared.length ? shared.join(' · ') : 'Similar budget and area'}
                    </p>
                  </div>
                  <span className="rounded-full bg-forest px-2 py-0.5 text-[9.5px] text-white">{score}%</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-[#f7f4ec] p-5">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.12em] text-clay uppercase">
            <Sparkles size={10} /> How the score is built
          </p>
          <ul className="mt-3 space-y-2 text-[10.5px] leading-relaxed text-muted">
            <li>1. Budget and area are compared first — they eliminate the most pairs.</li>
            <li>2. Layout and rental duration refine the shortlist.</li>
            <li>3. Lifestyle, smoking, pets and noise adjust the final score.</li>
            <li>4. Only shared preferences are shown on public profiles.</li>
            <li>5. A proposal is always a human action; nothing is automatic.</li>
          </ul>
          <p className="mt-4 text-[9.5px] leading-relaxed text-muted-soft">
            The demo uses deterministic local rules rather than a trained model. The Django backend
            exposes the same contract at <code className="text-[9px]">/api/v1/colocation/suggestions/</code>.
          </p>
        </div>
      </div>
    </div>
  )
}

// Type export utile pour éviter un import inutilisé de DemoUser dans certains builds
export type _AdminUser = DemoUser
