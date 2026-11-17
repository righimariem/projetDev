import {
  ArrowRight,
  CalendarCheck,
  Check,
  ChevronDown,
  ClipboardCheck,
  FileText,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar, Badge } from '../ui'

const faqs = [
  {
    q: 'Does Homey charge tenants to look?',
    a: 'No. Browsing, saving homes and messaging owners is free for tenants in this demo. A future production version would state any owner-side fee clearly before a listing is published.',
  },
  {
    q: 'What does the compatibility score actually mean?',
    a: 'It is a weighted comparison between a listing and your stated preferences — budget, area, layout, furnishing, transport and quiet. The individual reasons are always shown so you can disagree with the result and adjust your profile.',
  },
  {
    q: 'Is a price anomaly proof that a listing is fraudulent?',
    a: 'No. It only means the rent looks unusual compared with similar homes. A human reviewer checks the details; the listing may be perfectly legitimate and simply priced differently.',
  },
  {
    q: 'Who can publish a property?',
    a: 'Only authenticated owner accounts. Each listing goes through an AI quality review and a human moderation step before appearing publicly. Rejected listings stay available to their owner for editing.',
  },
]

export default function HowItWorksPage() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <div>
      <section className="container-page grid gap-10 py-12 lg:grid-cols-[1fr_1fr] lg:items-center">
        <div>
          <p className="eyebrow">How it works</p>
          <h1 className="display mt-3 max-w-[520px] text-[48px] leading-[1.02] sm:text-[58px]">
            A rental process with fewer surprises.
          </h1>
          <p className="mt-4 max-w-[460px] text-[13px] leading-relaxed text-muted">
            Homey keeps the parts that matter — a truthful listing, a clear conversation, a
            visit — and removes the parts that waste your week. Here is exactly what happens,
            for tenants and for owners.
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <Link to="/properties" className="btn btn-primary">
              Start exploring
            </Link>
            <Link to="/owner/listings/new" className="btn btn-outline">
              List a property
            </Link>
          </div>
          <div className="mt-7 flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {['amira', 'sarah', 'nour'].map((id) => (
                  <Avatar key={id} src={`/photos/avatar-${id}.jpg`} size={28} className="ring-2 ring-cream" />
                ))}
              </div>
              <p className="text-[10.5px] leading-tight text-muted">
                <span className="font-semibold text-ink">1 200+ tenants</span>
                <br />
                found a home this year
              </p>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-muted">
              <Star size={12} className="text-clay" fill="currentColor" /> 4.8 average visit rating
            </div>
          </div>
        </div>
        <div className="relative">
          <img
            src="/photos/living-5.jpg"
            alt="A calm living room"
            className="h-[320px] w-full rounded-[26px] object-cover sm:h-[420px]"
          />
          <div className="absolute bottom-4 left-4 flex max-w-[300px] items-center gap-2.5 rounded-xl bg-white/95 p-3 shadow-lg backdrop-blur">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-mint text-forest">
              <ShieldCheck size={14} />
            </span>
            <p className="text-[10.5px] leading-snug text-muted">
              <span className="font-medium text-ink">842 homes reviewed</span> by a person, not
              only a model.
            </p>
          </div>
        </div>
      </section>

      <section className="container-page pb-14">
        <div className="rounded-[26px] bg-[#f4f1e8] px-6 py-10 sm:px-10">
          <p className="eyebrow">At a glance</p>
          <h2 className="display mt-2 text-[36px] sm:text-[42px]">Three steps, no pressure</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              ['01', 'Tell us how you want to live', 'A sentence or precise filters. Both work.'],
              ['02', 'See homes that actually fit', 'Scored against you, with the reasoning shown.'],
              ['03', 'Visit and decide', 'Message a verified owner, agree a time, take your time.'],
            ].map(([n, title, text]) => (
              <div key={n} className="rounded-2xl border border-line bg-white p-5">
                <span className="font-display text-[24px] italic text-clay">{n}</span>
                <h3 className="mt-3 font-display text-[22px] leading-tight">{title}</h3>
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page grid gap-10 pb-14 lg:grid-cols-[1fr_1fr]">
        <div>
          <p className="eyebrow">For tenants</p>
          <h2 className="display mt-2 text-[38px] leading-tight">From a sentence to a set of keys</h2>
          <div className="mt-5 space-y-4">
            {[
              {
                icon: Search,
                title: 'Describe the life, not just the flat',
                text: '“Quiet, near the metro, under 700 DT, furnished.” Homey turns that into criteria and shows how it read them.',
              },
              {
                icon: Sparkles,
                title: 'Compare without fifteen tabs',
                text: 'Save homes, see the match reasons side by side, and ask follow-up questions without losing the thread.',
              },
              {
                icon: CalendarCheck,
                title: 'Request a visit in one message',
                text: 'No phone number exchange. The owner sees the request with your move-in date and answers in the same thread.',
              },
              {
                icon: ClipboardCheck,
                title: 'Check before you commit',
                text: 'Read what is included, confirm the deposit, see when the listing was verified and by whom.',
              },
            ].map((step) => (
              <div key={step.title} className="flex gap-3">
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-mint text-forest">
                  <step.icon size={15} />
                </span>
                <div>
                  <p className="text-[12.5px] font-medium">{step.title}</p>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">{step.text}</p>
                </div>
              </div>
            ))}
          </div>
          <Link to="/properties" className="btn btn-primary btn-sm mt-5">
            Browse current homes <ArrowRight size={12} />
          </Link>
        </div>
        <div className="card h-fit p-6">
          <Badge tone="green">
            <Check size={10} /> What Homey checks
          </Badge>
          <h3 className="mt-3 font-display text-[26px]">A listing is more than a photo</h3>
          <ul className="mt-3 space-y-2">
            {[
              'Owner identity and contact details verified',
              'Address checked against known streets',
              'Rent compared with similar homes nearby',
              'Description checked against the declared layout',
              'Photo quality and duplicates reviewed',
              'Human approval before the listing goes live',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-[11.5px] text-muted">
                <Check size={12} className="mt-0.5 shrink-0 text-forest" /> {item}
              </li>
            ))}
          </ul>
          <p className="mt-4 rounded-lg bg-sand/70 px-3 py-2 text-[10px] leading-relaxed text-muted">
            Verification reduces risk; it does not replace a visit. Always see the home and read
            the lease before paying anything.
          </p>
        </div>
      </section>

      <section className="container-page grid gap-10 pb-14 border-t border-line pt-12 lg:grid-cols-[1fr_1fr]">
        <div className="card h-fit p-6">
          <Badge tone="clay">
            <Sparkles size={10} /> AI quality review
          </Badge>
          <h3 className="mt-3 font-display text-[26px]">Publish with a second pair of eyes</h3>
          <p className="mt-2 text-[11.5px] leading-relaxed text-muted">
            Before a human sees your listing, Homey checks it for the things that make renters
            scroll past: a vague title, missing photos, a rent far from comparable homes, a
            description that contradicts the layout.
          </p>
          <div className="mt-4 space-y-2">
            {[
              ['Title and location', true],
              ['At least three photos', true],
              ['Rent compared with nearby homes', true],
              ['Description matches the layout', false],
              ['Bathroom and kitchen photos', false],
            ].map(([label, ok]) => (
              <div
                key={label as string}
                className="flex items-center justify-between rounded-lg border border-line-soft px-3 py-2 text-[11px]"
              >
                {label}
                <span className={ok ? 'text-forest' : 'text-clay'}>{ok ? 'Passed' : 'Suggestion'}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="eyebrow">For owners</p>
          <h2 className="display mt-2 text-[38px] leading-tight">Present your home the way it deserves</h2>
          <div className="mt-5 space-y-4">
            {[
              {
                icon: FileText,
                title: 'A guided listing in four steps',
                text: 'General information, photos and amenities, practical details, then a description. Nothing important is optional.',
              },
              {
                icon: Sparkles,
                title: 'An AI draft you can edit',
                text: 'Generate a description from the facts you entered, keep the sentences you like and rewrite the rest.',
              },
              {
                icon: ShieldCheck,
                title: 'A quality score before review',
                text: 'See what is missing and improve the listing before an administrator opens it.',
              },
              {
                icon: MessageSquare,
                title: 'One place for requests',
                text: 'Accept, decline or ask a question without losing track of who asked for what, and when.',
              },
            ].map((step) => (
              <div key={step.title} className="flex gap-3">
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-clay-soft text-clay">
                  <step.icon size={15} />
                </span>
                <div>
                  <p className="text-[12.5px] font-medium">{step.title}</p>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">{step.text}</p>
                </div>
              </div>
            ))}
          </div>
          <Link to="/owner/listings/new" className="btn btn-primary btn-sm mt-5">
            List a property <ArrowRight size={12} />
          </Link>
        </div>
      </section>

      <section className="container-page pb-14">
        <div className="rounded-[26px] bg-[#f4f1e8] px-6 py-9 sm:px-9">
          <div className="grid gap-6 md:grid-cols-4">
            {[
              { icon: ShieldCheck, title: 'A person decides', text: 'AI flags; humans approve, reject and resolve.' },
              { icon: Users, title: 'Consent by default', text: 'Profiles share only what they choose to share.' },
              { icon: MessageSquare, title: 'No phone numbers', text: 'Conversations stay in one place.' },
              { icon: Sparkles, title: 'No invented facts', text: 'The assistant only uses what the owner entered.' },
            ].map((item) => (
              <div key={item.title}>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-forest">
                  <item.icon size={15} />
                </span>
                <p className="mt-3 text-[11.5px] font-medium">{item.title}</p>
                <p className="mt-1 text-[10.5px] leading-relaxed text-muted">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page pb-14">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="eyebrow">Questions</p>
            <h2 className="display mt-2 text-[36px]">The things people ask first</h2>
            <p className="mt-2 max-w-[320px] text-[11.5px] text-muted">
              If something is missing here, the rental guide goes further — and a real support
              address would answer the rest.
            </p>
          </div>
          <div>
            {faqs.map((faq, i) => (
              <div key={faq.q} className="border-b border-line">
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="flex w-full items-center justify-between gap-4 py-4 text-left"
                >
                  <span className="text-[12.5px] font-medium">{faq.q}</span>
                  <ChevronDown
                    size={15}
                    className={open === i ? 'rotate-180 text-forest transition' : 'text-muted transition'}
                  />
                </button>
                {open === i && <p className="pb-4 text-[11.5px] leading-relaxed text-muted">{faq.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page pb-6">
        <div className="rounded-[26px] border border-line bg-white px-6 py-10 text-center">
          <h2 className="display text-[36px]">Ready when you are.</h2>
          <p className="mx-auto mt-2 max-w-[420px] text-[12px] text-muted">
            Browse the current homes, or start from a sentence and let Homey make the first pass.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2.5">
            <Link to="/search/ai" className="btn btn-primary">
              <Sparkles size={13} /> Describe your home
            </Link>
            <Link to="/properties" className="btn btn-outline">
              Explore properties
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
