import { House, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'
import { cn } from './lib'

export function Logo({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className={cn(
          'grid h-9 w-9 place-items-center rounded-full',
          light ? 'bg-white/15 text-white' : 'bg-mint text-forest',
        )}
      >
        <House size={17} strokeWidth={1.7} />
      </span>
      {!compact && (
        <span
          className={cn(
            'font-display text-[26px] leading-none tracking-tight',
            light ? 'text-white' : 'text-ink',
          )}
        >
          Homey
        </span>
      )}
    </span>
  )
}

type Tone = 'green' | 'clay' | 'sand' | 'amber' | 'rose' | 'blue' | 'outline'

const toneClass: Record<Tone, string> = {
  green: 'bg-mint text-forest',
  clay: 'bg-clay-soft text-clay',
  sand: 'bg-sand text-muted',
  amber: 'bg-amber-soft text-amber-ink',
  rose: 'bg-rose-soft text-rose-ink',
  blue: 'bg-[#e8eef4] text-[#3f637f]',
  outline: 'bg-white/90 text-ink border border-line',
}

export function Badge({
  children,
  tone = 'sand',
  className,
}: {
  children: ReactNode
  tone?: Tone
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium',
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, { tone: Tone; label: string }> = {
    published: { tone: 'green', label: 'Published' },
    pending: { tone: 'amber', label: 'Pending Approval' },
    rejected: { tone: 'rose', label: 'Rejected' },
    draft: { tone: 'sand', label: 'Draft' },
    open: { tone: 'rose', label: 'Open' },
    review: { tone: 'amber', label: 'In review' },
    resolved: { tone: 'green', label: 'Resolved' },
    accepted: { tone: 'green', label: 'Accepted' },
    declined: { tone: 'sand', label: 'Declined' },
    awaiting: { tone: 'amber', label: 'Awaiting reply' },
  }
  const meta = map[status] ?? { tone: 'sand' as Tone, label: status }
  return <Badge tone={meta.tone}>{meta.label}</Badge>
}

export function Avatar({
  src,
  name,
  size = 36,
  className,
}: {
  src?: string
  name?: string
  size?: number
  className?: string
}) {
  return src ? (
    <img
      src={src}
      alt={name ?? ''}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={cn('rounded-full object-cover', className)}
    />
  ) : (
    <span
      style={{ width: size, height: size }}
      className={cn(
        'grid place-items-center rounded-full bg-mint text-xs font-semibold text-forest',
        className,
      )}
    >
      {(name ?? '?').slice(0, 1)}
    </span>
  )
}

export function MatchRing({ score, size = 68 }: { score: number; size?: number }) {
  const stroke = size > 60 ? 4 : 3
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <span className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ebe7dc" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#1f4b3a"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(score / 100) * c} ${c}`}
        />
      </svg>
      <span className="absolute text-center leading-none">
        <span className="block font-semibold text-forest" style={{ fontSize: size * 0.22 }}>
          {score}%
        </span>
        {size >= 60 && (
          <span className="mt-0.5 block text-[8px] tracking-[0.14em] text-muted-soft">MATCH</span>
        )}
      </span>
    </span>
  )
}

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label?: string
  hint?: string
  error?: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={cn('block', className)}>
      {label && <span className="field-label">{label}</span>}
      {children}
      {error ? (
        <span className="mt-1 block text-[11px] text-rose-ink">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-[11px] text-muted-soft">{hint}</span>
      ) : null}
    </label>
  )
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn('input', props.className)} />
}

export function Th(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1 text-[11px] font-medium text-muted transition hover:border-[#cfc8b9]',
        props.className,
      )}
    />
  )
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#1f2a23]/35 p-4 backdrop-blur-[2px]">
      <div
        className={cn(
          'fade-up max-h-[90vh] w-full overflow-y-auto rounded-3xl bg-cream shadow-2xl',
          wide ? 'max-w-3xl' : 'max-w-lg',
        )}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h3 className="font-display text-2xl">{title}</h3>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-sand"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition',
        checked ? 'bg-forest' : 'bg-[#d8d3c6]',
      )}
    >
      <span
        className={cn(
          'inline-block h-4.5 w-4.5 rounded-full bg-white shadow transition',
          checked ? 'translate-x-[22px]' : 'translate-x-[3px]',
        )}
        style={{ height: 18, width: 18 }}
      />
    </button>
  )
}

export function EmptyState({
  title,
  text,
  icon,
  action,
}: {
  title: string
  text?: string
  icon?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="grid place-items-center rounded-3xl border border-dashed border-line bg-white/60 px-6 py-14 text-center">
      {icon && <div className="mb-3 text-muted-soft">{icon}</div>}
      <p className="font-display text-2xl">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function StatCard({
  label,
  value,
  icon,
  delta,
  hint,
}: {
  label: string
  value: ReactNode
  icon?: ReactNode
  delta?: string
  hint?: string
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-semibold tracking-[0.15em] text-muted uppercase">{label}</p>
        {icon && (
          <span className="grid h-8 w-8 place-items-center rounded-full bg-sand text-forest">
            {icon}
          </span>
        )}
      </div>
      <p className="mt-3 font-display text-4xl leading-none">{value}</p>
      <div className="mt-2 flex items-center gap-2">
        {delta && (
          <span className="rounded-full bg-mint px-2 py-0.5 text-[10px] font-medium text-forest">
            {delta}
          </span>
        )}
        {hint && <span className="text-[11px] text-muted-soft">{hint}</span>}
      </div>
    </div>
  )
}

export function AreaChart({
  data,
  labels,
  height = 180,
}: {
  data: number[]
  labels: string[]
  height?: number
}) {
  const w = 640
  const h = 200
  const max = Math.max(...data) * 1.15
  const min = 0
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * (w - 40) + 20
    const y = h - 26 - ((v - min) / (max - min)) * (h - 52)
    return [x, y] as const
  })
  const line = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ')
  const area = `${line} L${points[points.length - 1][0]},${h - 20} L${points[0][0]},${h - 20} Z`
  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${w} ${h}`} style={{ height }} className="w-full">
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2c5c47" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#2c5c47" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((i) => (
          <line
            key={i}
            x1="20"
            x2={w - 20}
            y1={20 + i * 40}
            y2={20 + i * 40}
            stroke="#ece8dc"
            strokeWidth="1"
          />
        ))}
        <path d={area} fill="url(#areaFill)" />
        <path d={line} fill="none" stroke="#1f4b3a" strokeWidth="2" strokeLinecap="round" />
        {points.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.5" fill="#1f4b3a" />
        ))}
        {labels.map((label, i) => (
          <text
            key={label}
            x={points[i][0]}
            y={h - 4}
            textAnchor="middle"
            fontSize="9"
            fill="#93938a"
          >
            {label}
          </text>
        ))}
      </svg>
    </div>
  )
}

export function BarChart({
  labels,
  a,
  b,
  height = 200,
}: {
  labels: string[]
  a: number[]
  b: number[]
  height?: number
}) {
  const w = 420
  const h = 200
  const max = Math.max(...a, ...b) * 1.1
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ height }} className="w-full">
      {[0, 1, 2, 3].map((i) => (
        <line
          key={i}
          x1="28"
          x2={w - 8}
          y1={20 + i * 40}
          y2={20 + i * 40}
          stroke="#ece8dc"
        />
      ))}
      {labels.map((label, i) => {
        const group = (w - 50) / labels.length
        const x = 40 + i * group
        const ha = (a[i] / max) * 130
        const hb = (b[i] / max) * 130
        return (
          <g key={label}>
            <rect x={x} y={160 - ha} width="14" height={ha} rx="3" fill="#c9d6c6" />
            <rect x={x + 17} y={160 - hb} width="14" height={hb} rx="3" fill="#1f4b3a" />
            <text x={x + 15} y={178} textAnchor="middle" fontSize="9" fill="#93938a">
              {label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// --- Toasts simples, sans dépendance ---
type Toast = { id: number; text: string }
const toastListeners = new Set<(toasts: Toast[]) => void>()
let toasts: Toast[] = []

export function showToast(text: string) {
  const toast = { id: Date.now() + Math.random(), text }
  toasts = [...toasts, toast]
  toastListeners.forEach((l) => l(toasts))
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== toast.id)
    toastListeners.forEach((l) => l(toasts))
  }, 3400)
}

export function ToastHost() {
  const [items, setItems] = useState<Toast[]>(toasts)
  useEffect(() => {
    toastListeners.add(setItems)
    return () => {
      toastListeners.delete(setItems)
    }
  }, [])
  return (
    <div className="pointer-events-none fixed right-5 bottom-5 z-[60] flex w-[min(360px,90vw)] flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className="fade-up flex items-center gap-2 rounded-xl border border-[#3b5c4c] bg-forest px-4 py-3 text-sm text-white shadow-xl"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#b9d3b8]" />
          {t.text}
        </div>
      ))}
    </div>
  )
}
