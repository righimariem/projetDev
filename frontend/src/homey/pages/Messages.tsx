import { ArrowLeft, Info, Search, Send, ShieldCheck } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { cn, dateLabel, money } from '../lib'
import { useCurrentUser, useDemo } from '../store'
import { Avatar, Badge, EmptyState, showToast } from '../ui'

export default function MessagesPage() {
  const user = useCurrentUser()
  const users = useDemo((s) => s.users)
  const listings = useDemo((s) => s.listings)
  const conversations = useDemo((s) => s.conversations)
  const sendMessage = useDemo((s) => s.sendMessage)
  const markRead = useDemo((s) => s.markConversationRead)
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [text, setText] = useState('')
  const [search, setSearch] = useState('')
  const bottom = useRef<HTMLDivElement>(null)
  const base = location.pathname.startsWith('/owner') ? '/owner/messages' : '/messages'

  const mine = useMemo(
    () =>
      conversations
        .filter((c) => user && c.participantIds.includes(user.id))
        .map((c) => {
          const otherId = c.participantIds.find((p) => p !== user?.id)
          return {
            ...c,
            other: users.find((u) => u.id === otherId),
            listing: listings.find((l) => l.id === c.listingId),
          }
        })
        .filter((c) => c.other)
        .filter((c) =>
          search
            ? `${c.other?.name} ${c.listing?.title ?? ''}`.toLowerCase().includes(search.toLowerCase())
            : true,
        )
        .sort((a, b) => b.messages.length - a.messages.length),
    [conversations, users, listings, user, search],
  )

  const active = mine.find((c) => c.id === id)

  useEffect(() => {
    if (active) markRead(active.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id])

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' })
  }, [active?.messages.length, active?.id])

  if (!user) return <Navigate to="/login?next=/messages" replace />

  const send = (e: React.FormEvent) => {
    e.preventDefault()
    if (!active || !text.trim()) return
    sendMessage(active.id, text.trim())
    setText('')
  }

  return (
    <div className="container-page py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Your conversations</p>
          <h1 className="display mt-2 text-[42px] leading-none">Messages</h1>
          <p className="mt-2 text-[12px] text-muted">
            Owners, tenants and matched roommates, in one place.
          </p>
        </div>
        <button
          onClick={() => showToast('Demo conversations are stored in this browser only.')}
          className="btn btn-outline btn-sm"
        >
          <Info size={12} /> Demo conversations
        </button>
      </div>

      <div className="mt-5 grid overflow-hidden rounded-2xl border border-line bg-white lg:grid-cols-[300px_1fr]">
        <aside className={cn('border-b border-line lg:block lg:border-r lg:border-b-0', active && 'hidden')}>
          <div className="relative border-b border-line px-3 py-2.5">
            <Search size={12} className="absolute top-1/2 left-5 -translate-y-1/2 text-muted-soft" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations"
              className="w-full rounded-lg bg-cream py-1.5 pr-2 pl-7 text-[11px] outline-none"
            />
          </div>
          <div className="max-h-[520px] overflow-y-auto">
            {mine.length === 0 && (
              <p className="p-5 text-[11px] text-muted">No conversations yet.</p>
            )}
            {mine.map((c) => {
              const last = c.messages[c.messages.length - 1]
              const selected = c.id === id
              return (
                <button
                  key={c.id}
                  onClick={() => navigate(`${base}/${c.id}`)}
                  className={cn(
                    'flex w-full gap-2.5 border-b border-line-soft px-3 py-3 text-left transition last:border-0',
                    selected ? 'bg-[#f3f6f1]' : 'hover:bg-cream',
                  )}
                >
                  <div className="relative shrink-0">
                    <Avatar src={c.other?.avatar} name={c.other?.name} size={38} />
                    {c.unread > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-clay px-1 text-[8px] text-white">
                        {c.unread}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-[11.5px] font-medium">{c.other?.name}</p>
                      <span className="shrink-0 text-[9px] text-muted-soft">{last?.at}</span>
                    </div>
                    {c.listing && (
                      <p className="truncate text-[9.5px] text-clay">{c.listing.title}</p>
                    )}
                    <p className="mt-0.5 truncate text-[10px] text-muted">{last?.text}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </aside>

        <section className="flex min-h-[520px] flex-col">
          {active ? (
            <>
              <div className="flex items-center gap-3 border-b border-line px-4 py-3">
                <button
                  onClick={() => navigate(base)}
                  className="btn btn-ghost btn-sm -ml-2 lg:hidden"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft size={14} />
                </button>
                <Avatar src={active.other?.avatar} name={active.other?.name} size={38} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-[12px] font-medium">
                    {active.other?.name}
                    {active.other?.verified && <ShieldCheck size={11} className="text-forest" />}
                  </p>
                  <p className="text-[9.5px] text-muted">
                    {active.other?.role === 'owner' ? 'Owner' : 'Tenant'} ·{' '}
                    {active.other?.verified ? 'Verified' : 'Not verified'}
                  </p>
                </div>
                {active.listing && (
                  <Link
                    to={`/properties/${active.listing.id}`}
                    className="hidden items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 text-[10px] text-muted hover:bg-cream sm:flex"
                  >
                    <img src={active.listing.photos[0]} alt="" className="h-6 w-8 rounded object-cover" />
                    <span className="max-w-[150px] truncate">{active.listing.title}</span>
                    <span className="text-ink">{money(active.listing.rent)}</span>
                  </Link>
                )}
              </div>

              <div className="border-b border-line-soft bg-[#faf8f1] px-4 py-2 text-center text-[9.5px] text-muted">
                <Info size={10} className="mr-1 inline" /> This conversation is part of the Homey
                demo. Messages are kept in memory only and are never sent to a real person.
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-5">
                {active.messages.map((m) => (
                  <div key={m.id} className={cn('flex', m.from === 'me' ? 'justify-end' : 'justify-start')}>
                    <div className={cn('max-w-[78%]', m.from === 'me' && 'text-right')}>
                      <p
                        className={cn(
                          'rounded-2xl px-3.5 py-2 text-left text-[11.5px] leading-relaxed',
                          m.from === 'me'
                            ? 'rounded-br-sm bg-forest text-white'
                            : 'rounded-bl-sm bg-[#f2f0e8] text-ink',
                        )}
                      >
                        {m.text}
                      </p>
                      <p className="mt-0.5 text-[8.5px] text-muted-soft">{m.at}</p>
                    </div>
                  </div>
                ))}
                <div ref={bottom} />
              </div>

              <form onSubmit={send} className="flex items-center gap-2 border-t border-line p-3">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={`Message ${active.other?.name.split(' ')[0]}…`}
                  className="input"
                />
                <button
                  type="submit"
                  disabled={!text.trim()}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-forest text-white disabled:opacity-40"
                  aria-label="Send message"
                >
                  <Send size={15} />
                </button>
              </form>
            </>
          ) : (
            <div className="grid flex-1 place-items-center p-6">
              <EmptyState
                title="Select a conversation"
                text="Choose someone on the left to read the thread, or contact an owner from a listing."
                action={
                  <Link to="/properties" className="btn btn-primary btn-sm">
                    Browse homes
                  </Link>
                }
              />
            </div>
          )}
        </section>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-soft">
        <span>
          {mine.length} conversation{mine.length === 1 ? '' : 's'} ·{' '}
          {mine.reduce((n, c) => n + c.unread, 0)} unread
        </span>
        <span className="flex items-center gap-1.5">
          <Badge tone="green">Safety</Badge> Never send a deposit before viewing the home.
        </span>
      </div>

      {active?.listing && (
        <p className="mt-2 text-[9.5px] text-muted-soft">
          Listing published {dateLabel(active.listing.createdAt)} · reference {active.listing.reference}
        </p>
      )}
    </div>
  )
}
