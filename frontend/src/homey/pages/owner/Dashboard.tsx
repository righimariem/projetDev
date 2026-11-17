import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  CalendarDays,
  ClipboardList,
  Eye,
  Heart,
  MessageSquare,
  PlusCircle,
  Sparkles,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { dateLabel, money } from '../../lib'
import { useCurrentUser, useDemo } from '../../store'
import { AreaChart, Avatar, Badge, MatchRing, StatCard, StatusPill } from '../../ui'

export default function OwnerDashboard() {
  const user = useCurrentUser()
  const listings = useDemo((s) => s.listings)
  const requests = useDemo((s) => s.requests)
  const users = useDemo((s) => s.users)
  const conversations = useDemo((s) => s.conversations)

  if (!user) return null
  const mine = listings.filter((l) => l.ownerId === user.id)
  const active = mine.filter((l) => l.status === 'published')
  const pending = mine.filter((l) => l.status === 'pending')
  const views = mine.reduce((n, l) => n + l.views, 0)
  const interested = mine.reduce((n, l) => n + l.interested, 0)
  const ownerRequests = requests.filter((r) => mine.some((l) => l.id === r.listingId))
  const awaiting = ownerRequests.filter((r) => r.status === 'pending')
  const pendingListing = pending[0]
  const latest = ownerRequests[0]
  const latestTenant = users.find((u) => u.id === latest?.tenantId)
  const unread = conversations.filter(
    (c) => c.participantIds.includes(user.id) && c.unread > 0,
  ).length

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Owner workspace</p>
          <h1 className="display mt-2 text-[40px] leading-none">Good morning, {user.name.split(' ')[0]}.</h1>
          <p className="mt-2 text-[12px] text-muted">
            A calm summary of your listings, the people interested, and what needs your attention
            this week.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/owner/requests" className="btn btn-outline btn-sm">
            Requests{' '}
            <span className="ml-0.5 rounded-full bg-clay px-1.5 text-[9px] text-white">
              {awaiting.length}
            </span>
          </Link>
          <Link to="/owner/listings/new" className="btn btn-primary btn-sm">
            <PlusCircle size={12} /> Add property
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total listings" value={mine.length} icon={<Building2 size={14} />} hint="including drafts" />
        <StatCard label="Active" value={active.length} icon={<Building2 size={14} />} hint="visible to tenants" />
        <StatCard label="Pending" value={pending.length} icon={<CalendarDays size={14} />} hint="awaiting review" />
        <StatCard label="Property views" value={views.toLocaleString('en-US')} icon={<Eye size={14} />} delta="↗ 12%" />
        <StatCard label="Interested tenants" value={interested} icon={<Users size={14} />} delta="↗ 8%" />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[12px] font-medium">Views and requests</p>
                <p className="text-[10px] text-muted">The last six months across all published listings</p>
              </div>
              <Badge tone="green">↗ 18% this month</Badge>
            </div>
            <div className="mt-4">
              <AreaChart
                data={[230, 280, 340, 390, 440, 470]}
                labels={['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov']}
                height={190}
              />
            </div>
            <div className="mt-1 flex items-center gap-4 text-[9.5px] text-muted">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-3 rounded-full bg-forest" /> Views
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-3 rounded-full bg-[#c9d6c6]" /> Requests
              </span>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] font-medium">Recent listings</p>
                <p className="text-[10px] text-muted">Status, performance and quality at a glance</p>
              </div>
              <Link to="/owner/listings" className="text-[10.5px] font-medium text-forest hover:underline">
                View all ↗
              </Link>
            </div>
            <div className="mt-3 divide-y divide-line">
              {mine.slice(0, 4).map((l) => (
                <div key={l.id} className="flex items-center gap-3 py-2.5">
                  <img src={l.photos[0]} alt="" className="h-11 w-14 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11.5px] font-medium">{l.title}</p>
                    <p className="truncate text-[9.5px] text-muted">
                      {money(l.rent)} · {l.neighbourhood}, {l.city} · Added {dateLabel(l.createdAt)}
                    </p>
                  </div>
                  <span className="hidden items-center gap-1 text-[9.5px] text-muted sm:flex">
                    <Eye size={10} /> {l.views}
                  </span>
                  <StatusPill status={l.status} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {pendingListing ? (
            <div className="rounded-2xl border border-[#e7d8ca] bg-[#fbf1ea] p-5">
              <p className="flex items-center gap-1.5 text-[9.5px] font-semibold tracking-[0.12em] text-clay uppercase">
                <Sparkles size={10} /> AI review ready
              </p>
              <div className="mt-3 flex items-start gap-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white">
                  {pendingListing.photos[0] && (
                    <img src={pendingListing.photos[0]} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-medium">{pendingListing.title}</p>
                  <p className="mt-0.5 text-[10px] text-muted">
                    Quality score {pendingListing.qualityScore}/100 · 1 suggestion before publication.
                  </p>
                  <div className="mt-1.5">
                    <StatusPill status="pending" />
                  </div>
                </div>
              </div>
              <Link
                to={`/owner/listings?review=${pendingListing.id}`}
                className="btn btn-primary btn-sm mt-4 w-full"
              >
                Review the analysis <ArrowRight size={11} />
              </Link>
            </div>
          ) : (
            <div className="card p-5">
              <p className="text-[12px] font-medium">No listing waiting for review</p>
              <p className="mt-1 text-[10.5px] text-muted">Your published listings are up to date.</p>
            </div>
          )}

          <div className="card p-5">
            <div className="flex items-center justify-between">
              <p className="text-[9.5px] font-semibold tracking-[0.13em] text-muted uppercase">Latest request</p>
              <span className="text-[9px] text-muted-soft">15 h ago</span>
            </div>
            {latest && latestTenant ? (
              <>
                <div className="mt-3 flex items-center gap-2.5">
                  <Avatar src={latestTenant.avatar} name={latestTenant.name} size={38} />
                  <div className="min-w-0">
                    <p className="text-[11.5px] font-medium">{latestTenant.name}</p>
                    <p className="truncate text-[9.5px] text-clay">
                      {listings.find((l) => l.id === latest.listingId)?.title}
                    </p>
                  </div>
                </div>
                <p className="mt-3 line-clamp-3 rounded-lg bg-[#faf8f1] px-3 py-2 text-[10px] leading-relaxed text-muted">
                  {latest.message}
                </p>
                <Link to="/owner/requests" className="btn btn-outline btn-sm mt-3 w-full">
                  Read and reply
                </Link>
              </>
            ) : (
              <p className="mt-2 text-[10.5px] text-muted">No requests yet.</p>
            )}
          </div>

          <div className="card p-5">
            <p className="text-[9.5px] font-semibold tracking-[0.13em] text-muted uppercase">Quick actions</p>
            <div className="mt-2 space-y-1">
              {[
                { to: '/owner/listings/new', icon: PlusCircle, label: 'Add a new property', hint: '4 guided steps' },
                { to: '/owner/messages', icon: MessageSquare, label: 'Answer tenant messages', hint: `${unread} unread` },
                { to: '/owner/profile', icon: Heart, label: 'Review your owner profile', hint: 'Reputation' },
                { to: '/owner/listings', icon: Sparkles, label: 'See how listing analysis works', hint: 'Guide' },
              ].map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex items-center gap-2 rounded-lg px-1.5 py-2 text-[10.5px] hover:bg-cream"
                >
                  <item.icon size={12} className="text-forest" />
                  <span className="flex-1">{item.label}</span>
                  <span className="text-[9px] text-muted-soft">{item.hint}</span>
                  <ArrowUpRight size={10} className="text-muted-soft" />
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-line bg-white px-4 py-3">
            <div>
              <p className="flex items-center gap-1.5 text-[10.5px] font-medium">
                <ClipboardList size={12} /> Requests
              </p>
              <p className="text-[9.5px] text-muted">{awaiting.length} awaiting your reply</p>
            </div>
            <MatchRing score={pendingListing?.qualityScore ?? 86} size={46} />
          </div>
        </div>
      </div>
    </div>
  )
}
