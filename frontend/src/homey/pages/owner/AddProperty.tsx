import {
  ArrowLeft,
  ArrowRight,
  Check,
  ImagePlus,
  Info,
  Plus,
  Sparkles,
  X,
} from 'lucide-react'
import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { amenityOptions } from '../../data'
import { cn, money } from '../../lib'
import { useDemo } from '../../store'
import type { Listing, ListingType } from '../../types'
import { Badge, Field, showToast, Switch } from '../../ui'

const steps = ['General information', 'Photos & amenities', 'Practical details', 'Description']
const demoPhotos = [
  '/photos/living-1.jpg',
  '/photos/living-2.jpg',
  '/photos/living-5.jpg',
  '/photos/kitchen-1.jpg',
  '/photos/room-1.jpg',
  '/photos/room-3.jpg',
  '/photos/house-2.jpg',
  '/photos/living-7.jpg',
]

async function fileToDataUrl(file: File): Promise<string> {
  const raw = await new Promise<string>((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.readAsDataURL(file)
  })
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = raw
  })
  const max = 1000
  const scale = Math.min(1, max / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.72)
}

export default function AddProperty() {
  const { id } = useParams()
  const listings = useDemo((s) => s.listings)
  const addListing = useDemo((s) => s.addListing)
  const updateListing = useDemo((s) => s.updateListing)
  const setListingStatus = useDemo((s) => s.setListingStatus)
  const navigate = useNavigate()
  const existing = listings.find((l) => l.id === id)
  const editing = Boolean(existing)

  const [step, setStep] = useState(0)
  const [title, setTitle] = useState(existing?.title ?? '')
  const [type, setType] = useState<ListingType>(existing?.type ?? 'Apartment')
  const [layout, setLayout] = useState(existing?.layout ?? 'S+1')
  const [rent, setRent] = useState(existing ? String(existing.rent) : '')
  const [surface, setSurface] = useState(existing ? String(existing.surface) : '')
  const [city, setCity] = useState(existing?.city ?? 'Ariana')
  const [neighbourhood, setNeighbourhood] = useState(existing?.neighbourhood ?? '')
  const [address, setAddress] = useState(existing?.address ?? '')
  const [bedrooms, setBedrooms] = useState(String(existing?.bedrooms ?? 1))
  const [bathrooms, setBathrooms] = useState(String(existing?.bathrooms ?? 1))
  const [deposit, setDeposit] = useState(existing ? String(existing.deposit) : '')
  const [availableFrom, setAvailableFrom] = useState(
    existing?.availableFrom ?? new Date().toISOString().slice(0, 10),
  )
  const [furnished, setFurnished] = useState(existing?.furnished ?? false)
  const [nearMetro, setNearMetro] = useState(existing?.nearMetro ?? true)
  const [quiet, setQuiet] = useState(existing?.quiet ?? true)
  const [amenities, setAmenities] = useState<string[]>(existing?.amenities ?? [])
  const [photos, setPhotos] = useState<string[]>(existing?.photos ?? [])
  const [description, setDescription] = useState(existing?.description ?? '')
  const [generated, setGenerated] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [authorized, setAuthorized] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  const validateStep1 = () => {
    const next: Record<string, string> = {}
    if (!title.trim()) next.title = 'Give the listing a clear title.'
    if (!rent || Number(rent) <= 0) next.rent = 'Enter the monthly rent in DT.'
    if (!surface || Number(surface) < 10) next.surface = 'Surface should be at least 10 m².'
    if (!neighbourhood.trim()) next.neighbourhood = 'Name the neighbourhood, e.g. Ariana Centre.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const next = () => {
    if (step === 0 && !validateStep1()) return
    if (step === 1 && photos.length === 0) {
      showToast('Add at least one photo or pick a demo photo.')
      return
    }
    setStep((s) => Math.min(3, s + 1))
  }

  const upload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 6 - photos.length)
    if (!files.length) return
    setUploading(true)
    const urls = await Promise.all(files.map(fileToDataUrl))
    setPhotos((prev) => [...prev, ...urls].slice(0, 6))
    setUploading(false)
  }

  const generate = () => {
    const list = amenities.slice(0, 4).join(', ')
    const text = `A ${furnished ? 'furnished ' : ''}${type.toLowerCase()} of ${surface} m² in ${neighbourhood}, ${city}, offered at ${rent} DT per month. There ${Number(bedrooms) > 1 ? 'are' : 'is'} ${bedrooms} bedroom${Number(bedrooms) > 1 ? 's' : ''} and ${bathrooms} bathroom${Number(bathrooms) > 1 ? 's' : ''}. ${list ? `Highlights include ${list}.` : ''} ${nearMetro ? 'The metro is a short walk away.' : 'Parking is available nearby.'} ${quiet ? 'The street is quiet through the day.' : 'The flat is in a lively part of the city.'} Available from ${availableFrom}.`
    setDescription(text)
    setGenerated(true)
    showToast('AI draft generated — edit any sentence you like.')
  }

  const completeness = [
    { label: 'Title and location', ok: Boolean(title && neighbourhood) },
    { label: 'Rent and surface', ok: Boolean(rent && surface) },
    { label: 'At least one photo', ok: photos.length >= 1 },
    { label: 'Four or more photos', ok: photos.length >= 4 },
    { label: 'Description drafted', ok: description.length > 40 },
  ]

  const save = (status: 'draft' | 'pending') => {
    if (!validateStep1()) {
      setStep(0)
      return
    }
    setSaving(true)
    const payload: Partial<Listing> = {
      title,
      type,
      layout,
      city,
      neighbourhood,
      address,
      rent: Number(rent),
      surface: Number(surface),
      bedrooms: Number(bedrooms),
      bathrooms: Number(bathrooms),
      furnished,
      nearMetro,
      quiet,
      photos,
      description,
      amenities,
      availableFrom,
      deposit: Number(deposit || rent),
      qualityScore: 74 + (photos.length >= 3 ? 8 : 0) + (description.length > 80 ? 6 : 0),
    }
    if (editing && existing) {
      updateListing(existing.id, payload)
      setListingStatus(existing.id, status)
    } else {
      addListing({ ...payload, title, rent: Number(rent) })
    }
    window.setTimeout(() => {
      setSaving(false)
      showToast(
        status === 'draft'
          ? 'Draft saved. You can finish it from My listings.'
          : 'Listing submitted. A human reviews it before publication.',
      )
      navigate('/owner/listings')
    }, 500)
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Add property</p>
          <h1 className="display mt-2 text-[36px] leading-none">
            {editing ? 'Edit your listing' : 'List your home'}
          </h1>
          <p className="mt-2 text-[11.5px] text-muted">
            Step {step + 1} of 4 · {steps[step]}
          </p>
        </div>
        <Link to="/owner/listings" className="btn btn-outline btn-sm">
          <ArrowLeft size={12} /> Back to listings
        </Link>
      </div>

      <div className="mt-4 grid gap-1.5 sm:grid-cols-4">
        {steps.map((s, i) => (
          <button
            key={s}
            onClick={() => i < step && setStep(i)}
            className={cn(
              'flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-[10px] transition',
              i === step
                ? 'border-[#bcd0bf] bg-mint text-forest'
                : i < step
                  ? 'border-line bg-white text-forest'
                  : 'border-line bg-white text-muted-soft',
            )}
          >
            <span
              className={cn(
                'grid h-5 w-5 shrink-0 place-items-center rounded-full text-[9px]',
                i <= step ? 'bg-forest text-white' : 'bg-sand text-muted',
              )}
            >
              {i < step ? <Check size={10} /> : i + 1}
            </span>
            <span className="truncate">{s}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_280px]">
        <div className="card p-5 sm:p-6">
          {step === 0 && (
            <div>
              <h2 className="font-display text-[28px]">General information</h2>
              <p className="mt-1 text-[11px] text-muted">What is the home, where is it, and what does it cost?</p>
              <div className="mt-4">
                <Field label="Listing title" error={errors.title} hint="Name the layout and the neighbourhood, not just “Nice apartment”.">
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="input"
                    placeholder="Sunlit S+1 near Ariana Centre"
                  />
                </Field>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Property type">
                  <select value={type} onChange={(e) => setType(e.target.value as ListingType)} className="select">
                    {['Apartment', 'Studio', 'Villa', 'Room', 'House'].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Layout">
                  <select value={layout} onChange={(e) => setLayout(e.target.value)} className="select">
                    {['S+0', 'S+1', 'S+2', 'S+3', 'S+4'].map((l) => (
                      <option key={l}>{l}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Monthly rent (DT)" error={errors.rent}>
                  <input
                    value={rent}
                    onChange={(e) => setRent(e.target.value.replace(/\D/g, ''))}
                    className="input"
                    placeholder="680"
                  />
                </Field>
                <Field label="Surface (m²)" error={errors.surface}>
                  <input
                    value={surface}
                    onChange={(e) => setSurface(e.target.value.replace(/\D/g, ''))}
                    className="input"
                    placeholder="62"
                  />
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
                <Field label="Neighbourhood" error={errors.neighbourhood}>
                  <input
                    value={neighbourhood}
                    onChange={(e) => setNeighbourhood(e.target.value)}
                    className="input"
                    placeholder="Ariana Centre"
                  />
                </Field>
              </div>
              <Field
                label="Street address (optional)"
                className="mt-3"
                hint="The exact address is only shown to tenants after you accept their request."
              >
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="input"
                  placeholder="Rue de l’École, Ariana 2080"
                />
              </Field>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="font-display text-[28px]">Photos & amenities</h2>
              <p className="mt-1 text-[11px] text-muted">
                The first photo becomes the cover. Drag order later; for now, pick the best one first.
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {photos.map((src, i) => (
                  <div key={`${src.slice(-20)}-${i}`} className="group relative overflow-hidden rounded-xl border border-line">
                    <img src={src} alt="" className="h-28 w-full object-cover" />
                    {i === 0 && <Badge tone="outline" className="absolute top-1.5 left-1.5">Cover</Badge>}
                    <button
                      onClick={() => setPhotos((prev) => prev.filter((_, index) => index !== i))}
                      className="absolute top-1.5 right-1.5 grid h-6 w-6 place-items-center rounded-full bg-white/90 text-muted hover:text-rose-ink"
                      aria-label="Remove photo"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
                {photos.length < 6 && (
                  <label className="grid h-28 cursor-pointer place-items-center rounded-xl border border-dashed border-line bg-[#fcfbf6] text-center text-[10px] text-muted hover:border-[#bcd0bf]">
                    <span>
                      <ImagePlus size={18} className="mx-auto text-muted-soft" />
                      <span className="mt-1 block">{uploading ? 'Reading…' : 'Upload photos'}</span>
                    </span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={upload} />
                  </label>
                )}
              </div>

              <div className="mt-3">
                <p className="field-label">Or use a demo photo</p>
                <div className="flex flex-wrap gap-1.5">
                  {demoPhotos.map((src) => (
                    <button
                      key={src}
                      onClick={() => setPhotos((prev) => (prev.length >= 6 ? prev : [...prev, src]))}
                      className="relative h-12 w-16 overflow-hidden rounded-lg border border-line"
                    >
                      <img src={src} alt="" className="h-full w-full object-cover" />
                      <span className="absolute right-0.5 bottom-0.5 grid h-4 w-4 place-items-center rounded-full bg-white/90">
                        <Plus size={9} />
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <p className="field-label mt-4">Amenities</p>
              <div className="flex flex-wrap gap-1.5">
                {amenityOptions.map((a) => {
                  const active = amenities.includes(a)
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() =>
                        setAmenities((prev) => (active ? prev.filter((x) => x !== a) : [...prev, a]))
                      }
                      className={cn('chip', active && 'chip-active')}
                    >
                      {a}
                    </button>
                  )
                })}
              </div>

              <div className="mt-4 flex items-center justify-between rounded-xl border border-line px-3.5 py-2.5">
                <div>
                  <p className="text-[11.5px]">Furnished</p>
                  <p className="text-[9.5px] text-muted">Shown as a badge on the listing card</p>
                </div>
                <Switch checked={furnished} onChange={setFurnished} label="Furnished" />
              </div>
              <div className="mt-2 text-[10px] text-muted-soft">
                What a good set includes: living room in daylight · main bedroom · kitchen with
                surfaces clear · bathroom · building entrance.
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="font-display text-[28px]">Practical details</h2>
              <p className="mt-1 text-[11px] text-muted">Everything a tenant needs before requesting a visit.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="Bedrooms">
                  <select value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} className="select">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Bathrooms">
                  <select value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} className="select">
                    {[1, 2, 3].map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Available from">
                  <input
                    type="date"
                    value={availableFrom}
                    onChange={(e) => setAvailableFrom(e.target.value)}
                    className="input"
                  />
                </Field>
                <Field label="Deposit (DT)" hint="Leave empty to use one month’s rent.">
                  <input
                    value={deposit}
                    onChange={(e) => setDeposit(e.target.value.replace(/\D/g, ''))}
                    className="input"
                    placeholder={rent || '680'}
                  />
                </Field>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between rounded-xl border border-line px-3.5 py-2.5">
                  <div>
                    <p className="text-[11.5px]">Near public transport</p>
                    <p className="text-[9.5px] text-muted">Metro, bus or train within a short walk</p>
                  </div>
                  <Switch checked={nearMetro} onChange={setNearMetro} label="Near transport" />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-line px-3.5 py-2.5">
                  <div>
                    <p className="text-[11.5px]">Quiet street</p>
                    <p className="text-[9.5px] text-muted">Useful for tenants who work from home</p>
                  </div>
                  <Switch checked={quiet} onChange={setQuiet} label="Quiet street" />
                </div>
              </div>
              <div className="mt-4 flex gap-2.5 rounded-xl bg-clay-soft px-4 py-3">
                <Info size={14} className="mt-0.5 shrink-0 text-clay" />
                <p className="text-[10px] leading-relaxed text-[#8a5a46]">
                  Only list a home you are authorised to rent out. Administrators may ask for proof
                  of ownership before publication. This is a demo; nothing is verified.
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="font-display text-[28px]">Description</h2>
              <p className="mt-1 text-[11px] text-muted">
                Write it as if you were showing the home to a friend. Or start from an AI draft.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#e7d8ca] bg-[#fbf1ea] px-3.5 py-3">
                <div>
                  <p className="flex items-center gap-1.5 text-[11px] font-medium">
                    <Sparkles size={12} className="text-clay" /> Generate with AI
                  </p>
                  <p className="text-[9.5px] text-muted">Uses only the facts you entered. Every sentence stays editable.</p>
                </div>
                <button onClick={generate} className="btn btn-primary btn-sm">
                  <Sparkles size={11} /> Generate description
                </button>
              </div>
              {generated && (
                <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-mint px-3 py-2 text-[9.5px] text-forest">
                  <Check size={11} /> AI draft applied
                  <button onClick={generate} className="ml-auto hover:underline">Regenerate</button>
                  <button
                    onClick={() => {
                      setDescription('')
                      setGenerated(false)
                    }}
                    className="hover:underline"
                  >
                    Discard draft
                  </button>
                </div>
              )}
              <div className="mt-3">
                <Field label="Description">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={8}
                    maxLength={900}
                    className="textarea"
                    placeholder="Start with the light, the layout and the street. Mention what is included and who the home suits."
                  />
                </Field>
                <p className="mt-1 text-right text-[9.5px] text-muted-soft">{description.length} characters</p>
              </div>

              <div className="mt-2 rounded-xl bg-[#faf8f1] px-4 py-3">
                <p className="text-[10px] font-medium">Before you submit</p>
                <ul className="mt-1.5 space-y-1 text-[10px] text-muted">
                  <li>· Confirm the rent and what it includes (charges, water, internet).</li>
                  <li>· Check the layout matches the bedroom count.</li>
                  <li>· An administrator reviews every listing; AI analysis is advisory only.</li>
                </ul>
              </div>

              <label className="mt-3 flex items-start gap-2 text-[10px] text-muted">
                <input
                  type="checkbox"
                  checked={authorized}
                  onChange={(e) => setAuthorized(e.target.checked)}
                  className="mt-0.5 accent-[#1f4b3a]"
                />
                I confirm I am authorised to rent out this property and the information is accurate.
              </label>
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="btn btn-outline btn-sm"
            >
              <ArrowLeft size={11} /> Previous
            </button>
            {step < 3 ? (
              <button onClick={next} className="btn btn-primary btn-sm">
                Continue <ArrowRight size={11} />
              </button>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => save('draft')}
                  disabled={saving}
                  className="btn btn-outline btn-sm"
                >
                  Save draft
                </button>
                <button
                  onClick={() => {
                    if (!authorized) {
                      showToast('Please confirm you are authorised to list this home.')
                      return
                    }
                    save('pending')
                  }}
                  disabled={saving}
                  className="btn btn-primary btn-sm"
                >
                  {saving ? 'Submitting…' : editing ? 'Resubmit for review' : 'Submit for review'}
                  {!saving && <ArrowRight size={11} />}
                </button>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-3">
          <div className="card overflow-hidden">
            {photos[0] ? (
              <img src={photos[0]} alt="" className="h-40 w-full object-cover" />
            ) : (
              <div className="grid h-40 place-items-center bg-[#f7f4ec] text-center text-[10px] text-muted">
                <span>
                  <ImagePlus size={20} className="mx-auto text-muted-soft" />
                  Your cover photo appears here
                </span>
              </div>
            )}
            <div className="p-4">
              <p className="text-[11.5px] font-medium">{title || 'Your listing title'}</p>
              <p className="text-[9.5px] text-muted">
                {neighbourhood || 'Neighbourhood'}, {city}
              </p>
              <div className="mt-2 flex items-baseline justify-between">
                <p className="text-[16px] font-semibold">{rent ? money(Number(rent)) : '— DT'}</p>
                <span className="text-[9.5px] text-muted">{layout}</span>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <p className="text-[9px] font-semibold tracking-[0.13em] text-muted uppercase">
              Listing completeness
            </p>
            <div className="mt-2 space-y-1.5">
              {completeness.map((c) => (
                <p key={c.label} className="flex items-center gap-1.5 text-[10px]">
                  {c.ok ? (
                    <Check size={11} className="text-forest" />
                  ) : (
                    <span className="h-2.5 w-2.5 rounded-full border border-line" />
                  )}
                  <span className={c.ok ? 'text-muted' : 'text-muted-soft'}>{c.label}</span>
                </p>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-clay-soft p-4">
            <p className="flex items-center gap-1.5 text-[10px] font-medium text-clay">
              <Info size={11} /> Authorisation reminder
            </p>
            <p className="mt-1 text-[9.5px] leading-relaxed text-[#8a5a46]">
              Only list a home you are authorised to rent out. Administrators may ask for proof of
              ownership before publishing.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
