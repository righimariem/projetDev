import {
  Check,
  Ellipsis,
  Eye,
  Heart,
  Pencil,
  PlusCircle,
  Search,
  Sparkles,
  TriangleAlert,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { analyzeListing, cn, dateLabel, money } from '../../lib'
import { useCurrentUser, useDemo } from '../../store'
import type { Listing } from '../../types'
import { Badge, EmptyState, MatchRing, Modal, StatusPill } from '../../ui'

const tabs = [
  ['all', 'All'],
  ['published', 'Published'],
  ['pending', 'Pending'],
  ['rejected', 'Rejected'],
  ['flagged', 'AI flagged'],
  ['draft', 'Drafts'],
] as const

export default function OwnerListings() {
  const user = useCurrentUser()
  const listings = useDemo((s) => s.listings)
  const alerts = useDemo((s) => s.alerts)
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState<(typeof tabs)[number][0]>('all')
  const [search, setSearch] = useState('')
  const [menu, setMenu] = useState<string | null>(null)
  const [review, setReview] = useState<Listing | null>(null)
  const navigate = useNavigate()

  const mine = listings.filter((l) => l.ownerId === user?.id)
  const flaggedIds = new Set(
    alerts.filter((a) => mine.some((l) => l.id === a.listingId)).map((a) => a.listingId),
  )

  useEffect(() => {
    const id = params.get('review')
    if (id) {
      const listing = mine.find((l) => l.id === id)
      if (listing) setReview(listing)
      setParams({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const counts: Record<string, number> = {
    all: mine.length,
    published: mine.filter((l) => l.status === 'published').length,
    pending: mine.filter((l) => l.status === 'pending').length,
    rejected: mine.filter((l) => l.status === 'rejected').length,
    flagged: flaggedIds.size,
    draft: mine.filter((l) => l.status === 'draft').length,
  }

  const rows = mine
    .filter((l) =>
      tab === 'all'
        ? true
        : tab === 'flagged'
          ? flaggedIds.has(l.id)
          : l.status === tab,
    )
    .filter((l) =>
      search
        ? `${l.title} ${l.city} ${l.neighbourhood}`.toLowerCase().includes(search.toLowerCase())
        : true,
    )

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Owner workspace</p>
          <h1 className="display mt-2 text-[38px] leading-none">My listings</h1>
          <p className="mt-2 text-[12px] text-muted">
            Manage publication, review the AI quality report, and open each listing’s performance.
          </p>
        </div>
        <Link to="/owner/listings/new" className="btn btn-primary btn-sm">
          <PlusCircle size={12} /> Add property
        </Link>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-full border border-line bg-white p-1">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'rounded-full px-2.5 py-1 text-[10.5px] transition',
                tab === key ? 'bg-sand font-medium text-ink' : 'text-muted hover:text-ink',
              )}
            >
              {label}{' '}
              <span className={cn('ml-0.5', tab === key ? 'text-clay' : 'text-muted-soft')}>
                {counts[key]}
              </span>
            </button>
          ))}
        </div>
        <div className="relative ml-auto min-w-[180px] flex-1 sm:max-w-[260px]">
          <Search size={12} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-soft" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search listings"
            className="w-full rounded-full border border-line bg-white py-1.5 pr-3 pl-8 text-[11px] outline-none"
          />
        </div>
      </div>

      <div className="card mt-4 overflow-hidden">
        <div className="hidden grid-cols-[1fr_80px_70px_80px_150px_30px] gap-3 border-b border-line px-4 py-2.5 text-[8.5px] font-semibold tracking-[0.12em] text-muted uppercase md:grid">
          <span>Listing</span>
          <span>Rent</span>
          <span>Views</span>
          <span>Interested</span>
          <span>Status</span>
          <span />
        </div>
        {rows.length === 0 && (
          <div className="p-6">
            <EmptyState
              title="Nothing in this tab yet"
              text="Add a property or change the filter to see your listings."
              action={
                <Link to="/owner/listings/new" className="btn btn-primary btn-sm">
                  Add a property
                </Link>
              }
            />
          </div>
        )}
        {rows.map((l) => (
          <div
            key={l.id}
            className="grid grid-cols-[1fr_30px] items-center gap-3 border-b border-line-soft px-4 py-3 last:border-0 md:grid-cols-[1fr_80px_70px_80px_150px_30px]"
          >
            <div className="flex min-w-0 items-center gap-3">
              <img src={l.photos[0]} alt="" className="h-12 w-16 shrink-0 rounded-lg object-cover" />
              <div className="min-w-0">
                <p className="truncate text-[11.5px] font-medium">{l.title}</p>
                <p className="truncate text-[9.5px] text-muted">
                  {l.neighbourhood}, {l.city} · {l.layout} · {l.surface} m²
                </p>
                <div className="mt-1 md:hidden">
                  <StatusPill status={l.status} />
                </div>
              </div>
            </div>
            <p className="hidden text-[11px] md:block">{money(l.rent)}</p>
            <p className="hidden items-center gap-1 text-[10px] text-muted md:flex">
              <Eye size={10} /> {l.views}
            </p>
            <p className="hidden items-center gap-1 text-[10px] text-muted md:flex">
              <Heart size={10} /> {l.interested}
            </p>
            <div className="hidden md:block">
              <StatusPill status={l.status} />
              <p className="mt-0.5 text-[8.5px] text-muted-soft">Added {dateLabel(l.createdAt)}</p>
            </div>
            <div className="relative">
              <button
                onClick={() => setMenu(menu === l.id ? null : l.id)}
                className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-sand"
                aria-label="Listing actions"
              >
                <Ellipsis size={14} />
              </button>
              {menu === l.id && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenu(null)} />
                  <div className="absolute right-0 z-20 mt-1 w-44 rounded-xl border border-line bg-white p-1 shadow-xl">
                    {l.status === 'published' && (
                      <Link
                        to={`/properties/${l.id}`}
                        onClick={() => setMenu(null)}
                        className="block rounded-lg px-2.5 py-1.5 text-[10.5px] text-muted hover:bg-cream"
                      >
                        View public listing
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        setReview(l)
                        setMenu(null)
                      }}
                      className="block w-full rounded-lg px-2.5 py-1.5 text-left text-[10.5px] text-muted hover:bg-cream"
                    >
                      AI quality analysis
                    </button>
                    <Link
                      to={`/owner/listings/${l.id}/edit`}
                      onClick={() => setMenu(null)}
                      className="block rounded-lg px-2.5 py-1.5 text-[10.5px] text-muted hover:bg-cream"
                    >
                      Edit listing
                    </Link>
                    <button
                      onClick={() => {
                        navigate(`/owner/requests`)
                        setMenu(null)
                      }}
                      className="block w-full rounded-lg px-2.5 py-1.5 text-left text-[10.5px] text-muted hover:bg-cream"
                    >
                      View requests
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[9.5px] text-muted-soft">
        <span>
          {mine.length} listings · {mine.filter((l) => l.status === 'published').length} published ·{' '}
          {mine.reduce((n, l) => n + l.views, 0).toLocaleString('en-US')} total views
        </span>
        <span>Listings are reviewed by a person before publication. AI analysis is advisory only.</span>
      </div>

      <Modal
        open={Boolean(review)}
        onClose={() => setReview(null)}
        title="AI listing analysis"
        wide
      >
        {review && <Analysis listing={review} />}
      </Modal>
    </div>
  )
}

function Analysis({ listing }: { listing: Listing }) {
  const alerts = useDemo((s) => s.alerts)
  const quality = analyzeListing(listing)
  const listingAlerts = alerts.filter((a) => a.listingId === listing.id)
  const suggestions = quality.checks.filter((c) => !c.ok)

  return (
    <div className="grid gap-5 sm:grid-cols-[200px_1fr]">
      <div>
        <img src={listing.photos[0]} alt="" className="h-36 w-full rounded-xl object-cover" />
        <p className="mt-2 text-[12px] font-medium">{listing.title}</p>
        <p className="text-[10px] text-muted">
          {listing.neighbourhood} · {money(listing.rent)} / month
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <StatusPill status={listing.status} />
          <Badge tone="green">AI check</Badge>
        </div>
        {listingAlerts.length > 0 && (
          <div className="mt-3 rounded-lg bg-rose-soft px-3 py-2">
            <p className="flex items-center gap-1 text-[10px] font-medium text-rose-ink">
              <TriangleAlert size={11} /> {listingAlerts.length} detected alert
              {listingAlerts.length > 1 ? 's' : ''}
            </p>
            {listingAlerts.map((a) => (
              <p key={a.id} className="mt-1 text-[9.5px] leading-relaxed text-rose-ink/80">
                {a.type} · {a.severity}
              </p>
            ))}
          </div>
        )}
      </div>
      <div>
        <div className="flex items-center gap-4">
          <MatchRing score={quality.score} size={62} />
          <div>
            <p className="text-[12px] font-medium">Quality score {quality.score}/100</p>
            <p className="text-[10px] text-muted">
              {suggestions.length
                ? `${suggestions.length} suggestion${suggestions.length > 1 ? 's' : ''} could improve clarity before publication.`
                : 'No blocking issue found. A human still makes the final decision.'}
            </p>
            <Badge tone="sand" className="mt-1.5">
              <Sparkles size={9} /> Suggestion only
            </Badge>
          </div>
        </div>
        <div className="mt-4 space-y-1.5">
          {quality.checks.map((c) => (
            <div
              key={c.label}
              className="flex items-center justify-between rounded-lg border border-line-soft px-3 py-2 text-[10.5px]"
            >
              <span className="flex items-center gap-1.5">
                {c.ok ? (
                  <Check size={11} className="text-forest" />
                ) : (
                  <TriangleAlert size={11} className="text-clay" />
                )}
                {c.label}
              </span>
              <span className={c.ok ? 'text-forest' : 'text-clay'}>{c.ok ? 'Passed' : 'Suggestion'}</span>
            </div>
          ))}
        </div>
        {suggestions.length > 0 && (
          <div className="mt-3 rounded-lg bg-[#faf8f1] px-3 py-2 text-[10px] leading-relaxed text-muted">
            <span className="font-medium text-ink">Suggestions:</span>{' '}
            {suggestions.map((s) => s.label).join(' · ')}. Add detail in the description step.
          </div>
        )}
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Link to={`/owner/listings/${listing.id}/edit`} className="btn btn-outline btn-sm">
            <Pencil size={11} /> Edit listing
          </Link>
          {listing.status === 'published' && (
            <Link to={`/properties/${listing.id}`} className="btn btn-primary btn-sm">
              <Eye size={11} /> View public page
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
