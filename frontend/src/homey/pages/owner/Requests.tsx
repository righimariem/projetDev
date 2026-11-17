import { Bell, Check, Clock, MessageSquare, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { dateLabel, money } from '../../lib'
import { useCurrentUser, useDemo } from '../../store'
import type { RequestStatus } from '../../types'
import { Avatar, Badge, EmptyState, showToast, StatusPill } from '../../ui'

export default function OwnerRequests() {
  const user = useCurrentUser()
  const listings = useDemo((s) => s.listings)
  const requests = useDemo((s) => s.requests)
  const users = useDemo((s) => s.users)
  const respond = useDemo((s) => s.respondRequest)
  const startConversation = useDemo((s) => s.startConversation)

  const mine = listings.filter((l) => l.ownerId === user?.id)
  const mineRequests = requests.filter((r) => mine.some((l) => l.id === r.listingId))
  const pending = mineRequests.filter((r) => r.status === 'pending').length

  const answer = (id: string, status: RequestStatus, tenantId: string) => {
    respond(id, status)
    const tenant = users.find((u) => u.id === tenantId)
    showToast(
      status === 'accepted'
        ? `Request accepted. ${tenant?.name.split(' ')[0]} can now be messaged.`
        : 'Request declined. The tenant is notified.',
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Owner workspace</p>
          <h1 className="display mt-2 text-[38px] leading-none">Requests</h1>
          <p className="mt-2 text-[12px] text-muted">
            Read each request, check the details and decide. Every action is recorded in the demo.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge tone="amber">
            <Clock size={10} /> {pending} awaiting reply
          </Badge>
          <Badge tone="green">
            <Check size={10} /> {mineRequests.filter((r) => r.status === 'accepted').length} accepted
          </Badge>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {mineRequests.length === 0 && (
          <EmptyState
            title="No visit requests yet"
            text="When a tenant asks to visit one of your listings, it lands here with their message and move-in date."
          />
        )}
        {mineRequests.map((r) => {
          const tenant = users.find((u) => u.id === r.tenantId)
          const listing = listings.find((l) => l.id === r.listingId)
          return (
            <article key={r.id} className="card p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar src={tenant?.avatar} name={tenant?.name} size={40} />
                  <div>
                    <p className="flex items-center gap-1.5 text-[12.5px] font-medium">
                      {tenant?.name}
                      {tenant?.verified && <Badge tone="green">Verified</Badge>}
                    </p>
                    <p className="text-[9.5px] text-muted">
                      Requested {dateLabel(r.createdAt)} · move in {r.moveIn}
                    </p>
                  </div>
                </div>
                <StatusPill status={r.status === 'pending' ? 'awaiting' : r.status} />
              </div>

              <div className="mt-3 rounded-lg bg-[#faf8f1] px-3.5 py-2.5 text-[11px] leading-relaxed text-muted">
                <p className="mb-1 text-[8.5px] font-semibold tracking-[0.13em] text-muted-soft uppercase">
                  Message
                </p>
                {r.message}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <Link
                  to={`/properties/${listing?.id}`}
                  className="text-[10.5px] text-muted hover:text-forest"
                >
                  {listing?.title} · {money(listing?.rent ?? 0)} / month
                </Link>
                {r.status === 'pending' ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => answer(r.id, 'declined', r.tenantId)}
                      className="btn btn-outline btn-sm"
                    >
                      <X size={11} /> Decline
                    </button>
                    <button
                      onClick={() => answer(r.id, 'accepted', r.tenantId)}
                      className="btn btn-primary btn-sm"
                    >
                      <Check size={11} /> Accept
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <p className="text-[9.5px] text-muted-soft">
                      You {r.status === 'accepted' ? 'accepted' : 'declined'} this request.
                    </p>
                    {r.status === 'accepted' && (
                      <button
                        onClick={() => {
                          if (tenant) startConversation(tenant.id, r.listingId)
                          showToast('Conversation ready in Messages.')
                        }}
                        className="btn btn-outline btn-sm"
                      >
                        <MessageSquare size={11} /> Message
                      </button>
                    )}
                  </div>
                )}
              </div>
            </article>
          )
        })}
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-xl border border-line bg-white px-4 py-3 text-[10px] text-muted">
        <Bell size={12} className="mt-0.5 shrink-0 text-forest" />
        Accepting a request does not create a lease. It opens a conversation and shares the exact
        address so you can arrange a visit.
      </div>
    </div>
  )
}
