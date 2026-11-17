import { ArrowRight, RotateCcw, Send, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  criteriaChips,
  money,
  parseQuery,
  scoreListing,
  searchListings,
} from '../lib'
import { useDemo } from '../store'
import type { Listing, SearchCriteria } from '../types'
import { Badge } from '../ui'

interface Exchange {
  id: number
  question: string
  criteria: SearchCriteria
  matches: Array<{ listing: Listing; score: number }>
}

const prompts = [
  'Somewhere quieter, but still near the metro',
  'I can stretch the budget to 800 DT',
  'Show me furnished places only',
]

export default function AiSearchPage() {
  const listings = useDemo((s) => s.listings)
  const lastSearch = useDemo((s) => s.lastSearch)
  const setLastSearch = useDemo((s) => s.setLastSearch)
  const [params] = useSearchParams()
  const [input, setInput] = useState('')
  const [exchanges, setExchanges] = useState<Exchange[]>([])
  const [criteria, setCriteria] = useState<SearchCriteria | null>(null)
  const [typing, setTyping] = useState(false)
  const bottom = useRef<HTMLDivElement>(null)
  const started = useRef(false)

  const run = (question: string, previous: SearchCriteria | null) => {
    const parsed = parseQuery(question)
    const merged: SearchCriteria = {
      ...(previous ?? {}),
      ...parsed,
      keywords: Array.from(new Set([...(previous?.keywords ?? []), ...parsed.keywords])),
    }
    const matches = searchListings(listings, merged).slice(0, 3)
    setCriteria(merged)
    setTyping(true)
    window.setTimeout(() => {
      setExchanges((prev) => [
        ...prev,
        { id: Date.now(), question, criteria: merged, matches },
      ])
      setTyping(false)
    }, 450)
    setInput('')
  }

  useEffect(() => {
    if (started.current) return
    started.current = true
    const q = params.get('q')
    if (q) {
      if (q !== lastSearch) {
        setLastSearch(q)
        run(q, null)
      }
    } else if (lastSearch && exchanges.length === 0) {
      run(lastSearch, null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [exchanges.length, typing])

  const startOver = () => {
    setExchanges([])
    setCriteria(null)
    setLastSearch('')
  }

  return (
    <div>
      <section className="border-b border-line bg-gradient-to-b from-[#f6f3ea] to-cream">
        <div className="container-page py-12 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1 text-[9.5px] font-semibold tracking-[0.15em] text-clay uppercase">
            <Sparkles size={10} /> AI property search
          </span>
          <h1 className="display mx-auto mt-4 max-w-[680px] text-[46px] leading-[1.02] sm:text-[56px]">
            Tell us what you’re looking for.
          </h1>
          <p className="mx-auto mt-3 max-w-[500px] text-[12.5px] leading-relaxed text-muted">
            One sentence is enough. Homey will read the details, show what it understood, and
            suggest homes with a compatibility score you can question.
          </p>
        </div>
      </section>

      <section className="container-page grid gap-5 py-8 lg:grid-cols-[1fr_310px]">
        <div className="card flex min-h-[600px] flex-col overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-forest text-white">
                <Sparkles size={15} />
              </span>
              <div>
                <p className="text-[12.5px] font-medium">Homey assistant</p>
                <p className="text-[9.5px] text-muted">Demo responses · no model is called</p>
              </div>
            </div>
            <button
              onClick={startOver}
              className="inline-flex items-center gap-1 text-[10.5px] text-muted hover:text-forest"
            >
              <RotateCcw size={11} /> Start over
            </button>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
            <div className="flex gap-2.5">
              <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-mint text-forest">
                <Sparkles size={12} />
              </span>
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-[#f7f4ec] px-4 py-3 text-[12px] leading-relaxed text-muted">
                Tell me what you’re looking for, in your own words. A neighbourhood, a budget,
                the way you like to live — anything you would say to a friend.
              </div>
            </div>

            {exchanges.map((ex) => (
              <div key={ex.id} className="space-y-3">
                <div className="flex justify-end">
                  <p className="max-w-[80%] rounded-2xl rounded-tr-sm bg-forest px-4 py-2.5 text-[12px] text-white">
                    {ex.question}
                  </p>
                </div>
                <div className="flex gap-2.5">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-mint text-forest">
                    <Sparkles size={12} />
                  </span>
                  <div className="w-full max-w-[92%]">
                    <p className="rounded-2xl rounded-tl-sm bg-[#f7f4ec] px-4 py-3 text-[12px] leading-relaxed text-muted">
                      {ex.matches.length
                        ? `I read that as ${describe(ex.criteria)}. ${ex.matches.length} ${ex.matches.length === 1 ? 'home fits' : 'homes fit'}, and ${
                            ex.matches[0].listing.title
                          } is the closest match right now. Here is why it rose to the top.`
                        : 'I could not find a home that satisfies every point. Try widening the budget or the neighbourhood, and I will look again.'}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {criteriaChips(ex.criteria).map((chip) => (
                        <span key={chip} className="chip chip-active">
                          {chip}
                        </span>
                      ))}
                    </div>
                    {ex.matches.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {ex.matches.map(({ listing, score }, i) => (
                          <Link
                            key={listing.id}
                            to={`/properties/${listing.id}`}
                            className="flex items-center gap-3 rounded-xl border border-line bg-white p-2.5 transition hover:border-[#cfc8b9]"
                          >
                            <img
                              src={listing.photos[0]}
                              alt=""
                              className="h-12 w-16 shrink-0 rounded-lg object-cover"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[11.5px] font-medium">{listing.title}</p>
                              <p className="truncate text-[10px] text-muted">
                                {listing.neighbourhood}, {listing.city} · {listing.surface} m² ·{' '}
                                {money(listing.rent)}
                              </p>
                            </div>
                            {i === 0 && <Badge tone="green">Best fit</Badge>}
                            <span className="shrink-0 rounded-full bg-forest px-2 py-0.5 text-[9.5px] text-white">
                              {score}%
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}
                    {ex.matches[0] && (
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[10px] text-muted-soft">
                          {scoreListing(ex.matches[0].listing).reasons.slice(0, 2).join(' · ')}
                        </p>
                        <Link
                          to={`/properties/${ex.matches[0].listing.id}`}
                          className="text-[10.5px] font-medium text-forest hover:underline"
                        >
                          See the full explanation →
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {typing && (
              <div className="flex gap-2.5">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-mint text-forest">
                  <Sparkles size={12} />
                </span>
                <span className="flex items-center gap-1 rounded-2xl bg-[#f7f4ec] px-4 py-3">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-soft"
                      style={{ animationDelay: `${i * 120}ms` }}
                    />
                  ))}
                </span>
              </div>
            )}
            <div ref={bottom} />
          </div>

          <div className="border-t border-line px-4 py-3 sm:px-6">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {['S+1 in Ariana, 700 DT maximum, near the metro', 'Furnished studio under 550 DT', 'Two bedrooms in La Marsa'].map(
                (p) => (
                  <button
                    key={p}
                    onClick={() => run(p, criteria)}
                    className="chip text-[10px] hover:border-[#cfc8b9]"
                  >
                    <Sparkles size={9} /> {p}
                  </button>
                ),
              )}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (input.trim()) run(input.trim(), criteria)
              }}
              className="flex items-center gap-2 rounded-xl border border-line bg-white p-1.5 pl-3 focus-within:border-[#9db4a5]"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe the home you want…"
                className="min-w-0 flex-1 bg-transparent py-1.5 text-[12px] outline-none placeholder:text-muted-soft"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-forest text-white disabled:opacity-40"
                aria-label="Send"
              >
                <Send size={13} />
              </button>
            </form>
            <p className="mt-2 text-[9.5px] text-muted-soft">
              Demo only. Homey reads keywords locally and never sends this text anywhere.
            </p>
          </div>
        </div>

        <aside className="space-y-3">
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <p className="text-[9.5px] font-semibold tracking-[0.14em] text-muted uppercase">
                What Homey understood
              </p>
              <Badge tone="green">{criteria ? criteriaChips(criteria).length : 0}</Badge>
            </div>
            {!criteria ? (
              <p className="mt-3 text-[11px] leading-relaxed text-muted">
                Nothing yet. Send a sentence and the interpreted criteria will appear here, so
                you can check the assistant understood you.
              </p>
            ) : (
              <>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {criteriaChips(criteria).map((c) => (
                    <span key={c} className="chip">
                      {c}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-[10px] leading-relaxed text-muted-soft">
                  Interpreted locally from your sentence. Nothing is sent to a model. Change any
                  of it with a follow-up line.
                </p>
              </>
            )}
          </div>

          <div className="rounded-2xl border border-line bg-[#f7f4ec] p-4">
            <p className="text-[9.5px] font-semibold tracking-[0.14em] text-muted uppercase">
              Keep refining
            </p>
            <div className="mt-2.5 space-y-2">
              {prompts.map((p) => (
                <button
                  key={p}
                  onClick={() => run(p, criteria)}
                  className="w-full rounded-lg border border-line bg-white px-3 py-2 text-left text-[10.5px] text-muted hover:border-[#cfc8b9] hover:text-ink"
                >
                  {p}
                </button>
              ))}
            </div>
            {exchanges.length > 0 && (
              <button
                onClick={startOver}
                className="mt-3 w-full text-center text-[10px] text-muted hover:text-forest"
              >
                Clear and start again
              </button>
            )}
          </div>

          <div className="card p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-medium">
              <Sparkles size={12} className="text-clay" /> How this works
            </p>
            <p className="mt-1.5 text-[10.5px] leading-relaxed text-muted">
              The demo interprets keywords locally. A Django backend with the same contract
              would receive the request at <code className="text-[9.5px]">/api/v1/search-natural/</code>{' '}
              and return structured criteria plus property matches.
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-white p-4">
            <p className="text-[10px] leading-relaxed text-muted-soft">
              Prefer filters? You can always{' '}
              <Link to="/properties" className="font-medium text-forest hover:underline">
                browse every home <ArrowRight size={9} className="inline" />
              </Link>
            </p>
          </div>
        </aside>
      </section>
    </div>
  )
}

function describe(criteria: SearchCriteria) {
  const bits: string[] = []
  if (criteria.layout) bits.push(`a ${criteria.layout}`)
  if (criteria.city) bits.push(`in ${criteria.city}`)
  if (criteria.budgetMax) bits.push(`up to ${money(criteria.budgetMax)}`)
  if (criteria.furnished) bits.push('furnished')
  if (criteria.nearMetro) bits.push('near transport')
  if (criteria.quiet) bits.push('in a quiet area')
  return bits.length ? bits.join(', ') : 'a home matching what you described'
}
