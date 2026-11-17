import { ArrowLeft, ArrowRight, Eye, EyeOff, ShieldCheck, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { cn } from '../lib'
import { useDemo } from '../store'
import type { Role } from '../types'
import { Avatar, Logo } from '../ui'

const demoCredentials: Record<Role, { email: string; password: string; label: string }> = {
  tenant: { email: 'amira.khelifi@example.com', password: 'homey2026', label: 'Tenant' },
  owner: { email: 'youssef.benali@example.com', password: 'homey2026', label: 'Property owner' },
  admin: { email: 'sofia.naceur@example.com', password: 'homey2026', label: 'Administrator' },
}

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-[calc(100vh-76px)] lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-forest lg:block">
        <img
          src="/photos/house-3.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#15372a]/90 via-[#1c4534]/80 to-[#15372a]/95" />
        <div className="relative flex h-full flex-col justify-between px-12 py-10 text-white">
          <Logo light />
          <div>
            <span className="font-display text-[54px] leading-none opacity-60">”</span>
            <h2 className="display mt-2 max-w-[420px] text-[42px] leading-[1.05]">
              A home should feel like the easiest decision you make this year.
            </h2>
            <p className="mt-4 max-w-[380px] text-[12.5px] leading-relaxed text-white/75">
              Verified listings, honest descriptions and a matching engine that explains its
              reasoning. That is the whole idea behind Homey.
            </p>
            <div className="mt-7 flex items-center gap-2.5">
              <div className="flex -space-x-2">
                {['amira', 'sarah', 'nour'].map((id) => (
                  <Avatar key={id} src={`/photos/avatar-${id}.jpg`} size={30} className="ring-2 ring-[#1c4534]" />
                ))}
              </div>
              <p className="text-[10.5px] leading-tight text-white/75">
                <span className="font-medium text-white">1 200+ tenants</span>
                <br />
                found a home through Homey this year.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] text-white/50">
            <span>© 2026 Homey</span>
            <span>Demo environment</span>
          </div>
        </div>
      </div>
      <div className="flex items-start justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-[420px]">{children}</div>
      </div>
    </div>
  )
}

export function LoginPage() {
  const login = useDemo((s) => s.login)
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [role, setRole] = useState<Role>('tenant')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')

  const next = params.get('next')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const result = login(email, password)
    if (!result.ok) {
      setError(result.error ?? 'Unable to sign in.')
      return
    }
    const target = next || (role === 'owner' ? '/owner' : role === 'admin' ? '/admin' : '/')
    navigate(target, { replace: true })
  }

  const fill = () => {
    setEmail(demoCredentials[role].email)
    setPassword(demoCredentials[role].password)
    setError('')
  }

  return (
    <AuthShell>
      <div className="mb-5 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-1.5 text-[10.5px] text-muted hover:text-forest">
          <ArrowLeft size={11} /> Back to Homey
        </Link>
      </div>
      <p className="eyebrow">Welcome back</p>
      <h1 className="display mt-2 text-[44px] leading-none">Sign in to Homey</h1>
      <p className="mt-2 text-[12px] text-muted">
        Your saved homes, conversations and preferences are waiting.
      </p>

      <div className="mt-5 rounded-xl border border-line bg-white p-3.5">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-[9.5px] font-semibold tracking-[0.12em] text-forest uppercase">
            <Sparkles size={10} /> Demo mode
          </p>
          <span className="rounded-full bg-sand px-2 py-0.5 text-[9px] text-muted">No backend</span>
        </div>
        <p className="mt-1.5 text-[10.5px] leading-relaxed text-muted">
          Sign in with <span className="text-ink">amira.khelifi@example.com</span> /{' '}
          <span className="text-ink">homey2026</span>, or use an account you registered in this
          browser.
        </p>
        <button onClick={fill} type="button" className="mt-1.5 text-[10.5px] font-medium text-forest hover:underline">
          Fill demo credentials →
        </button>
      </div>

      <p className="mt-5 text-[11px] font-medium text-muted">Continue as</p>
      <div className="mt-1.5 grid grid-cols-3 gap-1 rounded-full border border-line bg-white p-1">
        {(['tenant', 'owner', 'admin'] as Role[]).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => {
              setRole(r)
              setEmail(demoCredentials[r].email)
              setPassword(demoCredentials[r].password)
              setError('')
            }}
            className={cn(
              'rounded-full px-2 py-1.5 text-[10.5px] transition',
              role === r ? 'bg-sand font-medium text-ink' : 'text-muted hover:text-ink',
            )}
          >
            {demoCredentials[r].label}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-[9.5px] text-muted-soft">
        The demo account opens the selected role. Administrator access exists for exploring the
        review tools only.
      </p>

      <form onSubmit={submit} className="mt-4 space-y-3">
        <label className="block">
          <span className="field-label">Email address</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="input"
          />
        </label>
        <label className="block">
          <span className="flex items-center justify-between">
            <span className="field-label">Password</span>
            <button
              type="button"
              onClick={() => setError('Password reset is not available in the demo.')}
              className="mb-1.5 text-[9.5px] text-muted hover:text-forest"
            >
              Forgot password?
            </button>
          </span>
          <span className="relative block">
            <input
              type={show ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="input pr-10"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-soft hover:text-ink"
              aria-label={show ? 'Hide password' : 'Show password'}
            >
              {show ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </span>
        </label>
        {error && (
          <p className="rounded-lg bg-rose-soft px-3 py-2 text-[10.5px] text-rose-ink">{error}</p>
        )}
        <button type="submit" className="btn btn-primary w-full">
          Log in
        </button>
      </form>

      <div className="mt-4 flex items-start gap-2 rounded-xl bg-[#faf8f1] px-3 py-2.5">
        <ShieldCheck size={13} className="mt-0.5 shrink-0 text-forest" />
        <p className="text-[9.5px] leading-relaxed text-muted">
          Prepared for JWT authentication against Django, including refresh tokens and expiry
          handling.
        </p>
      </div>

      <p className="mt-5 text-center text-[11px] text-muted">
        New to Homey?{' '}
        <Link to="/signup" className="font-medium text-forest hover:underline">
          Create an account
        </Link>
      </p>
      <p className="mt-3 text-center text-[9px] leading-relaxed text-muted-soft">
        Demo mode: accounts are stored in this browser only. No real authentication is performed.
      </p>
    </AuthShell>
  )
}

export function RegisterPage() {
  const register = useDemo((s) => s.register)
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [city, setCity] = useState('Ariana')
  const [role, setRole] = useState<Role>('tenant')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const result = register({ name, email, password, role, city })
    if (!result.ok) {
      setError(result.error ?? 'Unable to create the account.')
      return
    }
    navigate(role === 'owner' ? '/owner' : '/')
  }

  return (
    <AuthShell>
      <Link to="/" className="inline-flex items-center gap-1.5 text-[10.5px] text-muted hover:text-forest">
        <ArrowLeft size={11} /> Back to Homey
      </Link>
      <p className="eyebrow mt-5">Start here</p>
      <h1 className="display mt-2 text-[42px] leading-none">Create your Homey account</h1>
      <p className="mt-2 text-[12px] text-muted">
        One account for saving homes, matching with roommates and talking to owners.
      </p>

      <p className="mt-5 text-[11px] font-medium text-muted">I am joining as</p>
      <div className="mt-1.5 grid grid-cols-2 gap-1 rounded-full border border-line bg-white p-1">
        {(
          [
            ['tenant', 'A tenant'],
            ['owner', 'A property owner'],
          ] as Array<[Role, string]>
        ).map(([r, label]) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={cn(
              'rounded-full px-2 py-1.5 text-[10.5px] transition',
              role === r ? 'bg-sand font-medium text-ink' : 'text-muted hover:text-ink',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-4 space-y-3">
        <label className="block">
          <span className="field-label">Full name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required className="input" placeholder="Amira Khelifi" />
        </label>
        <label className="block">
          <span className="field-label">Email address</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="input"
            placeholder="you@example.com"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="field-label">Password</span>
            <span className="relative block">
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="input pr-9"
                placeholder="6+ characters"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-soft"
                aria-label="Toggle password"
              >
                {show ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </span>
          </label>
          <label className="block">
            <span className="field-label">City</span>
            <select value={city} onChange={(e) => setCity(e.target.value)} className="select">
              {['Ariana', 'Tunis', 'La Marsa', 'Ben Arous', 'Manouba', 'Sidi Bou Said', 'Gammarth'].map(
                (c) => (
                  <option key={c}>{c}</option>
                ),
              )}
            </select>
          </label>
        </div>
        {error && <p className="rounded-lg bg-rose-soft px-3 py-2 text-[10.5px] text-rose-ink">{error}</p>}
        <p className="text-[9.5px] leading-relaxed text-muted-soft">
          By creating an account you accept that this is a demo: no data leaves this browser and
          no home is really rented.
        </p>
        <button type="submit" className="btn btn-primary w-full">
          Create account <ArrowRight size={13} />
        </button>
      </form>

      <p className="mt-5 text-center text-[11px] text-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-forest hover:underline">
          Sign in
        </Link>
      </p>
      <p className="mt-3 text-center text-[9px] text-muted-soft">
        Demo mode: accounts are stored in this browser only.
      </p>
    </AuthShell>
  )
}
