import { Check, Eye, MapPin, Pencil, ShieldCheck, Star } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCurrentUser, useDemo } from '../../store'
import { Avatar, Badge, Field, Modal, showToast } from '../../ui'

export default function OwnerProfile() {
  const user = useCurrentUser()
  const listings = useDemo((s) => s.listings)
  const updateProfile = useDemo((s) => s.updateProfile)
  const [edit, setEdit] = useState(false)
  const [name, setName] = useState(user?.name ?? '')
  const [bio, setBio] = useState(user?.bio ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [city, setCity] = useState(user?.city ?? '')

  if (!user) return null
  const mine = listings.filter((l) => l.ownerId === user.id)
  const views = mine.reduce((n, l) => n + l.views, 0)

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Owner workspace</p>
          <h1 className="display mt-2 text-[38px] leading-none">Your owner profile</h1>
          <p className="mt-2 text-[12px] text-muted">
            The information tenants see before they request a visit.
          </p>
        </div>
        <button onClick={() => setEdit(true)} className="btn btn-outline btn-sm">
          <Pencil size={12} /> Edit profile
        </button>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="card p-5 sm:p-6">
          <div className="flex flex-wrap items-start gap-4">
            <Avatar src={user.avatar} name={user.name} size={74} />
            <div className="min-w-0 flex-1">
              <p className="font-display text-[30px] leading-none">{user.name}</p>
              <p className="mt-1 text-[10.5px] text-muted">{user.email}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted">
                <span className="flex items-center gap-1">
                  <MapPin size={11} /> {user.city}
                </span>
                <span className="flex items-center gap-1">
                  <Star size={11} /> Member since {user.since}
                </span>
                {user.verified ? (
                  <Badge tone="green">
                    <ShieldCheck size={10} /> Identity verified
                  </Badge>
                ) : (
                  <Badge tone="amber">Verification pending</Badge>
                )}
              </div>
            </div>
          </div>
          <p className="mt-4 text-[11.5px] leading-relaxed text-muted">{user.bio}</p>
          <div className="mt-4 grid grid-cols-3 divide-x divide-line rounded-xl bg-[#faf8f1] py-3 text-center">
            <div>
              <p className="font-display text-[24px]">{mine.length}</p>
              <p className="text-[8.5px] tracking-wide text-muted uppercase">listings</p>
            </div>
            <div>
              <p className="font-display text-[24px]">{views.toLocaleString('en-US')}</p>
              <p className="text-[8.5px] tracking-wide text-muted uppercase">views</p>
            </div>
            <div>
              <p className="font-display text-[24px]">98%</p>
              <p className="text-[8.5px] tracking-wide text-muted uppercase">response</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="card p-5">
            <p className="text-[9.5px] font-semibold tracking-[0.13em] text-muted uppercase">
              Verification checklist
            </p>
            <div className="mt-2.5 space-y-2">
              {[
                ['Identity document', true],
                ['Phone number', true],
                ['Property ownership proof', user.verified],
                ['Bank details for payouts', false],
              ].map(([label, ok]) => (
                <div key={label as string} className="flex items-center justify-between text-[10.5px]">
                  <span className="flex items-center gap-1.5 text-muted">
                    {ok ? <Check size={11} className="text-forest" /> : <span className="h-2.5 w-2.5 rounded-full border border-line" />}
                    {label}
                  </span>
                  <span className={ok ? 'text-forest' : 'text-muted-soft'}>{ok ? 'Done' : 'Pending'}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[9.5px] leading-relaxed text-muted-soft">
              In the demo, verification is illustrative and no document is uploaded anywhere.
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-white p-5">
            <p className="flex items-center gap-1.5 text-[10.5px] font-medium">
              <Eye size={12} /> What tenants see
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-muted">
              Your name, photo, city, member since, verification badge and response rate appear on
              each listing. Your email and phone stay private until you accept a request.
            </p>
            {mine[0] && (
              <Link to="/owner/listings" className="btn btn-outline btn-sm mt-3">
                Review my listings
              </Link>
            )}
          </div>
        </div>
      </div>

      <Modal open={edit} onClose={() => setEdit(false)} title="Edit owner profile">
        <div className="space-y-3">
          <Field label="Full name">
            <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
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
          <Field label="Phone (private)">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input" />
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
                updateProfile({ name, bio, phone, city })
                setEdit(false)
                showToast('Owner profile updated.')
              }}
              className="btn btn-primary"
            >
              Save changes
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
