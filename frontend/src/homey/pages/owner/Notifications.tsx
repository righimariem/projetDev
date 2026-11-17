import { Bell, Check, CheckCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useDemo } from '../../store'
import { Badge, EmptyState, showToast } from '../../ui'

export default function OwnerNotifications() {
  const notifications = useDemo((s) => s.notifications)
  const markRead = useDemo((s) => s.markNotificationsRead)
  const unread = notifications.filter((n) => !n.read).length

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Owner workspace</p>
          <h1 className="display mt-2 text-[38px] leading-none">Notifications</h1>
          <p className="mt-2 text-[12px] text-muted">
            Requests, review updates and messages, newest first.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={unread ? 'amber' : 'green'}>{unread} unread</Badge>
          <button
            onClick={() => {
              markRead()
              showToast('All notifications marked as read.')
            }}
            className="btn btn-outline btn-sm"
          >
            <CheckCheck size={12} /> Mark all read
          </button>
        </div>
      </div>

      <div className="card mt-5 divide-y divide-line">
        {notifications.length === 0 && (
          <div className="p-5">
            <EmptyState title="No notifications" text="New activity on your listings will appear here." />
          </div>
        )}
        {notifications.map((n) => (
          <Link
            key={n.id}
            to={n.href ?? '/owner'}
            onClick={markRead}
            className="flex items-start gap-3 px-4 py-4 hover:bg-cream"
          >
            <span
              className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${
                n.read ? 'bg-sand text-muted' : 'bg-mint text-forest'
              }`}
            >
              <Bell size={13} />
            </span>
            <div className="min-w-0 flex-1">
              <p className={`text-[11.5px] leading-relaxed ${n.read ? 'text-muted' : 'text-ink'}`}>
                {n.text}
              </p>
              <p className="mt-1 text-[9.5px] text-muted-soft">{n.at}</p>
            </div>
            {!n.read && (
              <span className="mt-1 flex items-center gap-1 text-[9px] text-clay">
                <span className="h-1.5 w-1.5 rounded-full bg-clay" /> New
              </span>
            )}
            {n.read && <Check size={12} className="mt-1 text-muted-soft" />}
          </Link>
        ))}
      </div>

      <p className="mt-3 text-[9.5px] text-muted-soft">
        Demo only. Notifications are stored in this browser and reset when you clear demo data.
      </p>
    </div>
  )
}
