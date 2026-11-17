import {
  Check,
  CheckCircle2,
  Copy,
  Image as ImageIcon,
  Eye,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { analyzeListing, cn, dateLabel, money } from '../../lib'
import { useCurrentUser, useDemo } from '../../store'
import type { AlertSeverity } from '../../types'
import {
  AreaChart,
  Avatar,
  Badge,
  BarChart,
  EmptyState,
  MatchRing,
  showToast,
  StatCard,
  StatusPill,
} from '../../ui'

export function AdminDashboard() {
  const user = useCurrentUser()
  const listings = useDemo((s) => s.listings)
  const users = useDemo((s) => s.users)
  const alerts = useDemo((s) => s.alerts)
  const pending = listings.filter((l) => l.status === 'pending')
  const published = listings.filter((l) => l.status === 'published')
  const openAlerts = alerts.filter((a) => a.status !== 'resolved')
  const avgQuality = Math.round(
    published.reduce((n, l) => n + l.qualityScore, 0) / Math.max(1, published.length),
  )

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Administration</p>
          <h1 className="display mt-2 text-[40px] leading-none">Good morning, {user?.name.split(' ')[0]}.</h1>
          <p className="mt-2 text-[12px] text-muted">
            A review of everything waiting on a decision, and the signals worth reading first.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/pending" className="btn btn-outline btn-sm">
            Review queue <Badge tone="amber">{pending.length}</Badge>
          </Link>
          <Link to="/admin/alerts" className="btn btn-primary btn-sm">
            <Sparkles size={12} /> AI alerts
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Pending review" value={pending.length} icon={<ShieldCheck size={14} />} hint="newest first" />
        <StatCard label="Published" value={published.length} icon={<Eye size={14} />} delta="↗ 4" hint="this month" />
        <StatCard label="Accounts" value={users.length} icon={<Users size={14} />} hint="tenants & owners" />
        <StatCard label="Open AI alerts" value={openAlerts.length} icon={<TriangleAlert size={14} />} hint="need a human" />
        <StatCard label="Avg quality" value={`${avgQuality}/100`} icon={<Sparkles size={14} />} delta="stable" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-medium">Platform activity</p>
              <p className="text-[10px] text-muted">Listings published and accounts created</p>
            </div>
            <div className="flex items-center gap-3 text-[9px] text-muted">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-3 rounded bg-[#c9d6c6]" /> Listings
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-3 rounded bg-forest" /> Users
              </span>
            </div>
          </div>
          <div className="mt-3">
            <BarChart
              labels={['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov']}
              a={[12, 15, 18, 16, 22, 19]}
              b={[8, 10, 12, 14, 18, 21]}
              height={195}
            />
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-medium">Views across published listings</p>
            <Badge tone="green">↗ 9%</Badge>
          </div>
          <AreaChart
            data={[420, 510, 480, 610, 720, 690]}
            labels={['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov']}
            height={190}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-medium">Review queue</p>
              <p className="text-[10px] text-muted">Newest submissions first</p>
            </div>
            <Link to="/admin/pending" className="text-[10.5px] font-medium text-forest hover:underline">
              Open queue ↗
            </Link>
          </div>
          <div className="mt-3 divide-y divide-line">
            {pending.map((l) => (
              <div key={l.id} className="flex items-center gap-3 py-2.5">
                <img src={l.photos[0]} alt="" className="h-11 w-14 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11.5px] font-medium">{l.title}</p>
                  <p className="truncate text-[9.5px] text-muted">
                    {users.find((u) => u.id === l.ownerId)?.name} · {money(l.rent)}
                  </p>
                </div>
                <span className="flex items-center gap-1 text-[10px] text-muted">
                  <Sparkles size={9} /> {l.qualityScore}
                </span>
                <Link to={`/admin/pending?listing=${l.id}`} className="btn btn-outline btn-sm">
                  Review
                </Link>
              </div>
            ))}
            {pending.length === 0 && (
              <p className="py-6 text-center text-[11px] text-muted">The queue is empty. Nice.</p>
            )}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-medium">AI signals</p>
              <p className="text-[10px] text-muted">Advisory only — a human decides</p>
            </div>
            <Link to="/admin/alerts" className="text-[10.5px] font-medium text-forest hover:underline">
              All alerts ↗
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {alerts.slice(0, 4).map((a) => (
              <Link
                key={a.id}
                to="/admin/alerts"
                className="flex items-start gap-2 rounded-lg border border-line-soft px-3 py-2 hover:bg-cream"
              >
                <span className="mt-0.5 text-clay">
                  <AlertIcon type={a.type} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10.5px] font-medium">{a.type}</p>
                  <p className="truncate text-[9px] text-muted">{a.note}</p>
                </div>
                <Severity severity={a.severity} />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function AdminPending() {
  const listings = useDemo((s) => s.listings)
  const users = useDemo((s) => s.users)
  const alerts = useDemo((s) => s.alerts)
  const setStatus = useDemo((s) => s.setListingStatus)
  const [params, setParams] = useSearchParams()
  const queue = listings.filter((l) => l.status === 'pending')
  const [selectedId, setSelectedId] = useState(params.get('listing') ?? queue[0]?.id ?? '')
  const selected = listings.find((l) => l.id === selectedId) ?? queue[0]

  useEffect(() => {
    if (selected) setSelectedId(selected.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!selected) {
    return (
      <div>
        <h1 className="display text-[38px]">Pending listings</h1>
        <div className="mt-5">
          <EmptyState
            title="Nothing waiting for review"
            text="New submissions will appear here. You can still browse every listing."
            action={
              <Link to="/admin/listings" className="btn btn-primary btn-sm">
                View all listings
              </Link>
            }
          />
        </div>
      </div>
    )
  }

  const owner = users.find((u) => u.id === selected.ownerId)
  const quality = analyzeListing(selected)
  const listingAlerts = alerts.filter((a) => a.listingId === selected.id)
  const decide = (status: 'published' | 'rejected', message: string) => {
    setStatus(selected.id, status)
    showToast(message)
    const nextItem = queue.find((l) => l.id !== selected.id)
    if (nextItem) {
      setSelectedId(nextItem.id)
      setParams({ listing: nextItem.id })
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Administration</p>
          <h1 className="display mt-2 text-[38px] leading-none">Pending listings</h1>
          <p className="mt-2 text-[12px] text-muted">
            Read each submission, weigh the AI suggestions and decide. Every action is recorded
            against your account.
          </p>
        </div>
        <Badge tone="amber">{queue.length} in the demo queue</Badge>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[240px_1fr]">
        <div className="space-y-2">
          {queue.map((l) => (
            <button
              key={l.id}
              onClick={() => {
                setSelectedId(l.id)
                setParams({ listing: l.id })
              }}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-xl border bg-white p-2.5 text-left transition',
                l.id === selected.id ? 'border-[#bcd0bf] bg-[#fbfcf8]' : 'border-line hover:border-[#cfc8b9]',
              )}
            >
              <img src={l.photos[0]} alt="" className="h-11 w-14 shrink-0 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10.5px] font-medium">{l.title}</p>
                <p className="truncate text-[9px] text-muted">
                  {users.find((u) => u.id === l.ownerId)?.name} · {money(l.rent)}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-[9px] text-muted">
                  <Sparkles size={8} /> {l.qualityScore}/100
                </p>
              </div>
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div className="relative">
              <img src={selected.photos[0]} alt="" className="h-56 w-full object-cover" />
              <div className="absolute top-3 left-3 flex gap-1.5">
                <Badge tone="outline">{selected.type}</Badge>
                <Badge tone="outline">{selected.layout}</Badge>
                <Badge tone="amber">Submitted {dateLabel(selected.createdAt)}</Badge>
              </div>
            </div>
            <div className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-[30px] leading-none">{selected.title}</h2>
                  <p className="mt-1 text-[10.5px] text-muted">
                    {selected.neighbourhood}, {selected.city} · {selected.surface} m² ·{' '}
                    {selected.bedrooms} bed · {selected.bathrooms} bath
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Avatar src={owner?.avatar} name={owner?.name} size={22} />
                    <span className="text-[10px] text-muted">{owner?.name}</span>
                    <span className="text-[9px] text-muted-soft">
                      · {listings.filter((l) => l.ownerId === owner?.id).length} listings
                    </span>
                  </div>
                </div>
                <p className="font-display text-[28px]">{money(selected.rent)}</p>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-muted">{selected.description}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {selected.amenities.slice(0, 5).map((a) => (
                  <span key={a} className="chip">
                    {a}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex gap-1.5">
                {selected.photos.map((p) => (
                  <img key={p} src={p} alt="" className="h-12 w-16 rounded-md object-cover" />
                ))}
                <span className="grid h-12 w-16 place-items-center rounded-md bg-sand text-[9px] text-muted">
                  {selected.photos.length} photos
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="card p-4">
              <p className="flex items-center gap-1.5 text-[9.5px] font-semibold tracking-[0.12em] text-muted uppercase">
                <Sparkles size={10} /> AI quality score
              </p>
              <div className="mt-3 flex items-center gap-4">
                <MatchRing score={quality.score} size={64} />
                <div>
                  <p className="text-[11.5px] font-medium">Some facts need clarification.</p>
                  <p className="text-[9.5px] text-muted">Advisory only. A human decides.</p>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                {quality.checks.map((c) => (
                  <p key={c.label} className="flex items-center gap-1.5 text-[9.5px]">
                    {c.ok ? (
                      <Check size={10} className="text-forest" />
                    ) : (
                      <TriangleAlert size={10} className="text-clay" />
                    )}
                    <span className={c.ok ? 'text-muted' : 'text-clay'}>{c.label}</span>
                  </p>
                ))}
              </div>
            </div>

            <div className="card p-4">
              <p className="flex items-center gap-1.5 text-[9.5px] font-semibold tracking-[0.12em] text-muted uppercase">
                <TriangleAlert size={10} /> Detected alerts
              </p>
              <div className="mt-3 space-y-2">
                {listingAlerts.length ? (
                  listingAlerts.map((a) => (
                    <div key={a.id} className="rounded-lg border border-line-soft px-2.5 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[9.5px] font-medium">{a.type}</p>
                        <Severity severity={a.severity} />
                      </div>
                      <p className="mt-1 text-[9px] leading-relaxed text-muted">{a.note}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-muted">No alert detected on this listing.</p>
                )}
              </div>
              <p className="mt-2 flex items-start gap-1 text-[8.5px] text-muted-soft">
                <ShieldCheck size={9} className="mt-0.5 shrink-0" /> AI advice is never the final
                decision. You can approve a listing despite a low score.
              </p>
            </div>
          </div>

          <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="max-w-[300px] text-[9.5px] leading-relaxed text-muted-soft">
              Approval publishes the listing immediately. Rejection keeps it private and available
              to the owner for editing.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => decide('rejected', 'Listing rejected. The owner can edit and resubmit.')}
                className="btn btn-outline btn-sm text-rose-ink"
              >
                <X size={11} /> Reject
              </button>
              <button
                onClick={() => showToast('Change request sent to the owner.')}
                className="btn btn-outline btn-sm"
              >
                Request changes
              </button>
              <button
                onClick={() => decide('published', 'Listing approved and published.')}
                className="btn btn-primary btn-sm"
              >
                <Check size={11} /> Approve & publish
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Severity({ severity }: { severity: AlertSeverity }) {
  const map: Record<AlertSeverity, { tone: 'rose' | 'amber' | 'sand'; label: string }> = {
    high: { tone: 'rose', label: 'High severity' },
    medium: { tone: 'amber', label: 'Medium severity' },
    low: { tone: 'sand', label: 'Low severity' },
  }
  return <Badge tone={map[severity].tone}>{map[severity].label}</Badge>
}

function AlertIcon({ type }: { type: string }) {
  if (type === 'Price anomaly') return <TriangleAlert size={13} />
  if (type === 'Description mismatch') return <Sparkles size={13} />
  if (type === 'Duplicate photos') return <Copy size={13} />
  return <ImageIcon size={13} />
}

export function AdminAlerts() {
  const alerts = useDemo((s) => s.alerts)
  const listings = useDemo((s) => s.listings)
  const users = useDemo((s) => s.users)
  const setAlertStatus = useDemo((s) => s.setAlertStatus)
  const [tab, setTab] = useState<'all' | 'open' | 'review' | 'resolved'>('all')
  const [severity, setSeverity] = useState('all')

  const counts = {
    all: alerts.length,
    open: alerts.filter((a) => a.status === 'open').length,
    review: alerts.filter((a) => a.status === 'review').length,
    resolved: alerts.filter((a) => a.status === 'resolved').length,
  }

  const rows = alerts
    .filter((a) => (tab === 'all' ? true : a.status === tab))
    .filter((a) => (severity === 'all' ? true : a.severity === severity))

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Trust &amp; safety</p>
          <h1 className="display mt-2 text-[38px] leading-none">AI alerts</h1>
          <p className="mt-2 text-[12px] text-muted">
            Anomalies detected in listings, ranked by severity. Each one needs a human review before
            it is closed.
          </p>
        </div>
        <Badge tone="outline">
          <ShieldCheck size={10} /> Human decision required
        </Badge>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-full border border-line bg-white p-1">
          {(['all', 'open', 'review', 'resolved'] as const).map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'rounded-full px-3 py-1 text-[10.5px] capitalize transition',
                tab === key ? 'bg-sand font-medium text-ink' : 'text-muted hover:text-ink',
              )}
            >
              {key === 'review' ? 'In review' : key}{' '}
              <span className="ml-0.5 text-muted-soft">{counts[key]}</span>
            </button>
          ))}
        </div>
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          className="select ml-auto w-auto py-1.5 text-[10.5px]"
        >
          <option value="all">All severity</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      <div className="mt-4 space-y-3">
        {rows.length === 0 && (
          <EmptyState title="No alerts in this filter" text="Change the tab or severity to see more." />
        )}
        {rows.map((a) => {
          const listing = listings.find((l) => l.id === a.listingId)
          const owner = users.find((u) => u.id === listing?.ownerId)
          return (
            <article key={a.id} className="card p-4 sm:p-5">
              <div className="flex flex-wrap items-start gap-3">
                <span
                  className={cn(
                    'grid h-9 w-9 shrink-0 place-items-center rounded-lg',
                    a.status === 'resolved' ? 'bg-mint text-forest' : 'bg-clay-soft text-clay',
                  )}
                >
                  {a.status === 'resolved' ? <CheckCircle2 size={15} /> : <AlertIcon type={a.type} />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-[12px] font-medium">{a.type}</p>
                    <Severity severity={a.severity} />
                    <StatusPill status={a.status} />
                  </div>
                  <p className="mt-0.5 truncate text-[10px] text-muted">
                    {listing?.title} · {owner?.name} · flagged {dateLabel(a.flaggedAt)}
                  </p>
                  <p className="mt-2 rounded-lg bg-[#faf8f1] px-3 py-2 text-[10.5px] leading-relaxed text-muted">
                    {a.note}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {a.status === 'open' && (
                      <>
                        <button
                          onClick={() => {
                            setAlertStatus(a.id, 'review')
                            showToast('Alert moved to review.')
                          }}
                          className="btn btn-outline btn-sm"
                        >
                          Start review
                        </button>
                        <button
                          onClick={() => showToast('Change request sent to the owner.')}
                          className="btn btn-outline btn-sm"
                        >
                          Request changes
                        </button>
                        <button
                          onClick={() => {
                            setAlertStatus(a.id, 'resolved')
                            showToast('Alert marked resolved and documented.')
                          }}
                          className="btn btn-primary btn-sm"
                        >
                          <Check size={11} /> Resolve
                        </button>
                      </>
                    )}
                    {a.status === 'review' && (
                      <>
                        <button
                          onClick={() => {
                            setAlertStatus(a.id, 'open')
                            showToast('Alert reopened.')
                          }}
                          className="btn btn-outline btn-sm"
                        >
                          Reopen
                        </button>
                        <button
                          onClick={() => {
                            setAlertStatus(a.id, 'resolved')
                            showToast('Alert marked resolved and documented.')
                          }}
                          className="btn btn-primary btn-sm"
                        >
                          <Check size={11} /> Resolve
                        </button>
                      </>
                    )}
                    {a.status === 'resolved' && (
                      <p className="text-[9.5px] text-muted-soft">
                        Resolved and documented. The listing remains under observation.
                      </p>
                    )}
                    {listing && (
                      <Link
                        to={listing.status === 'pending' ? `/admin/pending?listing=${listing.id}` : `/properties/${listing.id}`}
                        className="ml-auto text-[10px] font-medium text-forest hover:underline"
                      >
                        Open listing →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      <p className="mt-4 flex items-start gap-1.5 rounded-xl border border-line bg-white px-4 py-3 text-[9.5px] leading-relaxed text-muted">
        <ShieldCheck size={12} className="mt-0.5 shrink-0 text-forest" />
        An anomaly does not mean a listing is fraudulent. It only means the price or the details
        look unusual compared with similar homes.
      </p>
    </div>
  )
}
