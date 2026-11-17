import {
  ArrowLeft,
  ArrowUpRight,
  Bell,
  Building2,
  ChevronDown,
  ClipboardList,
  FileClock,
  Heart,
  House,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  PlusCircle,
  Search,
  Settings,
  Sparkles,
  TrendingUp,
  User,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { cn } from './lib'
import { findUser, useCurrentUser, useDemo } from './store'
import { Avatar, Badge, Logo } from './ui'

const publicNav = [
  { to: '/', label: 'Home', end: true },
  { to: '/properties', label: 'Explore Properties' },
  { to: '/roommates', label: 'Roommates' },
  { to: '/ai-features', label: 'AI Features' },
  { to: '/how-it-works', label: 'How It Works' },
]

function useOutside<T extends HTMLElement>(onClose: () => void) {
  const ref = useRef<T | null>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])
  return ref
}

function NotificationsBell({ light = false }: { light?: boolean }) {
  const notifications = useDemo((s) => s.notifications)
  const markRead = useDemo((s) => s.markNotificationsRead)
  const [open, setOpen] = useState(false)
  const ref = useOutside<HTMLDivElement>(() => setOpen(false))
  const unread = notifications.filter((n) => !n.read).length

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className={cn(
          'relative grid h-9 w-9 place-items-center rounded-full transition hover:bg-sand',
          light && 'hover:bg-white/10',
        )}
      >
        <Bell size={17} strokeWidth={1.6} className={light ? 'text-white' : 'text-muted'} />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-clay ring-2 ring-cream" />
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[330px] rounded-2xl border border-line bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-medium">Notifications</p>
            <button onClick={markRead} className="text-[11px] text-forest hover:underline">
              Mark all read
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.slice(0, 4).map((n) => (
              <Link
                key={n.id}
                to={n.href ?? '#'}
                onClick={() => setOpen(false)}
                className={cn(
                  'block border-b border-line-soft px-4 py-3 text-xs last:border-0 hover:bg-cream',
                  !n.read && 'bg-[#fbfcf8]',
                )}
              >
                <span className="flex gap-2">
                  {!n.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-clay" />}
                  <span className={cn('text-ink', n.read && 'text-muted')}>{n.text}</span>
                </span>
                <span className="mt-1 block pl-3.5 text-[10px] text-muted-soft">{n.at}</span>
              </Link>
            ))}
          </div>
          <div className="px-4 py-2.5">
            <Link
              to="/owner/notifications"
              onClick={() => setOpen(false)}
              className="text-[11px] font-medium text-forest hover:underline"
            >
              View all notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

function AvatarMenu() {
  const user = useCurrentUser()
  const users = useDemo((s) => s.users)
  const logout = useDemo((s) => s.logout)
  const loginAs = useDemo((s) => s.loginAs)
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useOutside<HTMLDivElement>(() => setOpen(false))
  if (!user) return null

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full p-0.5 hover:bg-sand"
        aria-label="Account menu"
      >
        <Avatar src={user.avatar} name={user.name} size={34} />
        <ChevronDown size={13} className="mr-1 text-muted" />
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-72 rounded-2xl border border-line bg-white p-2 shadow-xl">
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar src={user.avatar} name={user.name} size={40} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-[11px] text-muted">{user.email}</p>
            </div>
          </div>
          <div className="my-1 h-px bg-line-soft" />
          {[
            { to: '/profile', label: 'Your profile', icon: User },
            { to: '/profile?tab=favorites', label: 'Saved homes', icon: Heart },
            { to: '/messages', label: 'Messages', icon: MessageSquare },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-muted hover:bg-cream hover:text-ink"
            >
              <item.icon size={14} /> {item.label}
            </Link>
          ))}
          {user.role === 'owner' && (
            <Link
              to="/owner"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-muted hover:bg-cream hover:text-ink"
            >
              <LayoutDashboard size={14} /> Owner workspace
            </Link>
          )}
          {user.role === 'admin' && (
            <Link
              to="/admin"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-muted hover:bg-cream hover:text-ink"
            >
              <LayoutDashboard size={14} /> Administration
            </Link>
          )}
          <div className="my-1 h-px bg-line-soft" />
          <p className="px-2.5 pt-1 pb-1 text-[10px] font-semibold tracking-[0.14em] text-muted-soft uppercase">
            Preview a role
          </p>
          {[
            { role: 'tenant' as const, label: 'Tenant view', icon: UserRound },
            { role: 'owner' as const, label: 'Owner dashboard', icon: Building2 },
            { role: 'admin' as const, label: 'Administrator panel', icon: Users },
          ].map((item) => {
            const target = users.find((u) => u.role === item.role)
            return (
              <button
                key={item.role}
                onClick={() => {
                  if (target) loginAs(target.id)
                  navigate(item.role === 'tenant' ? '/' : item.role === 'owner' ? '/owner' : '/admin')
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs hover:bg-cream',
                  user.role === item.role ? 'text-forest' : 'text-muted',
                )}
              >
                <item.icon size={14} /> {item.label}
              </button>
            )
          })}
          <p className="px-2.5 py-1 text-[10px] text-muted-soft">Demo accounts only. Nothing is authenticated by a server.</p>
          <div className="my-1 h-px bg-line-soft" />
          <button
            onClick={() => {
              logout()
              setOpen(false)
              navigate('/')
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs text-muted hover:bg-cream hover:text-ink"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      )}
    </div>
  )
}

export function PublicLayout() {
  const user = useCurrentUser()
  const conversations = useDemo((s) => s.conversations)
  const [mobile, setMobile] = useState(false)
  const unread = conversations
    .filter((c) => user && c.participantIds.includes(user.id))
    .reduce((n, c) => n + c.unread, 0)

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-cream/95 backdrop-blur">
        <div className="container-page flex h-[76px] items-center gap-7">
          <Link to="/" aria-label="Homey home">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-0.5 lg:flex">
            {publicNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-full px-3.5 py-2 text-[12.5px] transition',
                    isActive
                      ? 'bg-sand font-medium text-ink'
                      : 'text-muted hover:bg-sand/70 hover:text-ink',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="mr-1 hidden items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1 text-[9px] font-semibold tracking-[0.12em] text-clay uppercase sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-clay" /> Demo
            </span>
            <Link
              to="/properties"
              aria-label="Search"
              className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-sand"
            >
              <Search size={16} strokeWidth={1.7} />
            </Link>
            {user ? (
              <>
                <Link
                  to="/messages"
                  aria-label="Messages"
                  className="relative grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-sand"
                >
                  <Mail size={16} strokeWidth={1.7} />
                  {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-clay px-1 text-[9px] text-white">
                      {unread}
                    </span>
                  )}
                </Link>
                <NotificationsBell />
                <AvatarMenu />
              </>
            ) : (
              <div className="flex items-center gap-2 pl-1">
                <Link to="/login" className="px-2.5 py-2 text-[12.5px] text-muted hover:text-ink">
                  Log in
                </Link>
                <Link to="/signup" className="btn btn-primary btn-sm">
                  Sign up
                </Link>
              </div>
            )}
            <button
              onClick={() => setMobile((v) => !v)}
              className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-sand lg:hidden"
              aria-label="Menu"
            >
              {mobile ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
        {mobile && (
          <div className="border-t border-line bg-cream px-5 py-3 lg:hidden">
            {publicNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMobile(false)}
                className={({ isActive }) =>
                  cn(
                    'block rounded-lg px-3 py-2 text-sm',
                    isActive ? 'bg-sand font-medium' : 'text-muted',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
            {!user && (
              <Link to="/login" onClick={() => setMobile(false)} className="block px-3 py-2 text-sm text-muted">
                Log in
              </Link>
            )}
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-20 border-t border-line bg-sand/60">
        <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-[260px] text-xs leading-relaxed text-muted">
              Verified listings, honest descriptions and a matching engine that explains
              its reasoning. Renting, thoughtfully — Tunisia.
            </p>
          </div>
          <FooterColumn
            title="Explore"
            links={[
              ['Properties', '/properties'],
              ['Roommates', '/roommates'],
              ['AI features', '/ai-features'],
              ['How it works', '/how-it-works'],
            ]}
          />
          <FooterColumn
            title="For owners"
            links={[
              ['List a property', '/owner/listings/new'],
              ['Owner workspace', '/owner'],
              ['Pricing guidance', '/ai-features'],
              ['Trust & safety', '/admin/alerts'],
            ]}
          />
          <FooterColumn
            title="Company"
            links={[
              ['About Homey', '/how-it-works'],
              ['Contact', '/how-it-works'],
              ['Privacy', '/how-it-works'],
              ['Terms', '/how-it-works'],
            ]}
          />
        </div>
        <div className="border-t border-line/80">
          <div className="container-page flex flex-wrap items-center justify-between gap-3 py-5 text-[11px] text-muted-soft">
            <span>© 2026 Homey. Renting, thoughtfully.</span>
            <span className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-clay" /> Demo environment
              </span>
              <span>Data stays in this browser</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FooterColumn({ title, links }: { title: string; links: Array<[string, string]> }) {
  return (
    <div>
      <p className="text-[10px] font-semibold tracking-[0.16em] text-ink uppercase">{title}</p>
      <ul className="mt-3 space-y-2">
        {links.map(([label, to]) => (
          <li key={label}>
            <Link to={to} className="text-xs text-muted hover:text-forest">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

const ownerNav = [
  { to: '/owner', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/owner/listings', label: 'My Listings', icon: Building2 },
  { to: '/owner/listings/new', label: 'Add Property', icon: PlusCircle },
  { to: '/owner/messages', label: 'Messages', icon: MessageSquare },
  { to: '/owner/requests', label: 'Requests', icon: ClipboardList },
  { to: '/owner/notifications', label: 'Notifications', icon: Bell },
  { to: '/owner/profile', label: 'Profile', icon: User },
]

const adminNav = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/owners', label: 'Owners', icon: Building2 },
  { to: '/admin/tenants', label: 'Tenants', icon: UserRound },
  { to: '/admin/listings', label: 'Listings', icon: House },
  { to: '/admin/pending', label: 'Pending Listings', icon: FileClock },
  { to: '/admin/alerts', label: 'AI Alerts', icon: Sparkles },
  { to: '/admin/matching', label: 'Matching', icon: Heart },
  { to: '/admin/statistics', label: 'Statistics', icon: TrendingUp },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

const titleFromPath = (path: string) => {
  if (path === '/owner') return 'Dashboard'
  if (path === '/admin') return 'Dashboard'
  if (path.startsWith('/owner/listings/new')) return 'Add Property'
  if (path.match(/^\/owner\/listings\/.+\/edit$/)) return 'Edit Property'
  if (path === '/owner/listings') return 'My Listings'
  if (path === '/owner/messages') return 'Messages'
  if (path === '/owner/requests') return 'Requests'
  if (path === '/owner/notifications') return 'Notifications'
  if (path === '/owner/profile') return 'Profile'
  const seg = path.replace('/admin/', '').replace(/-/g, ' ')
  return seg.charAt(0).toUpperCase() + seg.slice(1)
}

export function WorkspaceLayout({ role }: { role: 'owner' | 'admin' }) {
  const user = useCurrentUser()
  const alerts = useDemo((s) => s.alerts)
  const logout = useDemo((s) => s.logout)
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const nav = role === 'owner' ? ownerNav : adminNav
  const title = titleFromPath(location.pathname)
  const alertCount = alerts.filter((a) => a.status === 'open').length

  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />

  return (
    <div className="min-h-screen bg-cream lg:flex">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[250px] flex-col border-r border-line bg-[#f7f4ec] transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="px-5 pt-6 pb-5">
          <Link to="/" onClick={() => setOpen(false)}>
            <Logo />
          </Link>
          <p className="mt-3 pl-0.5 text-[9px] font-semibold tracking-[0.22em] text-muted-soft uppercase">
            {role === 'owner' ? 'Owner workspace' : 'Administration'}
          </p>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[12.5px] transition',
                  isActive
                    ? 'bg-forest font-medium text-white'
                    : 'text-muted hover:bg-sand hover:text-ink',
                )
              }
            >
              <item.icon size={15} strokeWidth={1.7} />
              <span className="flex-1">{item.label}</span>
              {item.label === 'AI Alerts' && alertCount > 0 && (
                <span className="rounded-full bg-clay px-1.5 text-[9px] text-white">{alertCount}</span>
              )}
              {item.label === 'Notifications' && <span className="h-1.5 w-1.5 rounded-full bg-clay" />}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-3 px-4 py-4">
          <div className="rounded-xl border border-line bg-white/70 p-3">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.1em] text-forest uppercase">
              <Sparkles size={11} /> Demo mode
            </p>
            <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
              Actions update local demo data only.
            </p>
          </div>
          <Link
            to="/"
            className="flex items-center gap-1.5 px-1 text-[11px] text-muted hover:text-forest"
          >
            <ArrowLeft size={12} /> Back to the public site
          </Link>
          <div className="flex items-center gap-2.5 border-t border-line pt-3">
            <Avatar src={user.avatar} name={user.name} size={32} />
            <div className="min-w-0">
              <p className="truncate text-[11.5px] font-medium">{user.name}</p>
              <p className="truncate text-[10px] text-muted-soft">{user.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/20 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-[62px] items-center gap-3 border-b border-line bg-cream/95 px-4 backdrop-blur md:px-7">
          <button
            className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-white lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={15} />
          </button>
          <div className="flex items-center gap-2 text-[11px] text-muted">
            <span className="hidden sm:inline">
              {role === 'owner' ? 'Owner workspace' : 'Administration'}
            </span>
            <span className="hidden text-muted-soft sm:inline">/</span>
            <span className="text-ink">{title}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge tone="outline" className="hidden sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-clay" /> Demo data
            </Badge>
            <NotificationsBell />
            <Link
              to="/"
              aria-label="Public site"
              className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-sand"
            >
              <ArrowUpRight size={16} />
            </Link>
            <div className="ml-1 flex items-center gap-2">
              <Avatar src={user.avatar} name={user.name} size={30} />
              <div className="hidden leading-tight md:block">
                <p className="text-[11px] font-medium">{user.name}</p>
                <p className="text-[9px] text-muted-soft">
                  {role === 'owner' ? 'Property owner' : 'Administrator'}
                </p>
              </div>
              <button
                onClick={() => {
                  logout()
                  navigate('/')
                }}
                className="ml-1 text-[10.5px] text-muted-soft hover:text-rose-ink"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>
        <div className="px-4 py-7 md:px-8 md:py-9">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export function RequireRole({ role, children }: { role: 'tenant' | 'owner' | 'admin'; children: ReactNode }) {
  const user = useCurrentUser()
  const location = useLocation()
  const users = useDemo((s) => s.users)
  const loginAs = useDemo((s) => s.loginAs)

  if (!user) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />
  }
  if (user.role !== role && user.role !== 'admin') {
    const target = findUser(users, users.find((u) => u.role === role)?.id)
    return (
      <div className="min-h-screen bg-cream">
        <div className="container-page flex h-[76px] items-center border-b border-line">
          <Link to="/">
            <Logo />
          </Link>
        </div>
        <div className="mx-auto max-w-lg px-6 py-20 text-center">
          <p className="eyebrow">Demo role switch</p>
          <p className="mt-3 font-display text-4xl leading-tight">
            This area is for {role === 'owner' ? 'owners' : role === 'admin' ? 'administrators' : 'tenants'}.
          </p>
          <p className="mt-2 text-sm text-muted">
            You are signed in as {user.name} ({user.role}). In the demo you can switch accounts
            instantly — no password needed.
          </p>
          <button onClick={() => target && loginAs(target.id)} className="btn btn-primary mt-5">
            Continue as {target?.name}
          </button>
          <div className="mt-3">
            <Link to="/" className="text-[11px] text-muted hover:text-forest">
              Back to the public site
            </Link>
          </div>
        </div>
      </div>
    )
  }
  return <>{children}</>
}
