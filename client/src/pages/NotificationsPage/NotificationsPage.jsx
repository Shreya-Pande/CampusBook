import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { Bell, BellOff, CheckCheck, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { useMyNotifications } from '../../hooks/useNotifications'
import { markNotificationRead, markAllNotificationsRead } from '../../api/notification.api'
import { getNotificationLabel, getNotificationVariant } from '../../utils/notificationLabels'
import Button from '../../components/ui/Button/Button'
import Skeleton from '../../components/ui/Skeleton/Skeleton'
import './NotificationsPage.css'

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
]

const VARIANT_ICONS = {
  confirmed: { icon: CheckCircle2, className: 'text-emerald-500' },
  waitlist: { icon: Bell, className: 'text-amber-500' },
  completed: { icon: Clock, className: 'text-gray-400 dark:text-gray-500' },
  rejected: { icon: XCircle, className: 'text-red-500' },
}

const NotificationRow = ({ notification }) => {
  const queryClient = useQueryClient()
  const { title, description } = getNotificationLabel(notification.type)
  const { icon: Icon, className } = VARIANT_ICONS[getNotificationVariant(notification.type)] || VARIANT_ICONS.completed

  const readMutation = useMutation({
    mutationFn: () => markNotificationRead(notification._id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  return (
    <button
      type="button"
      onClick={() => !notification.isRead && readMutation.mutate()}
      className={`notification-row flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition ${
        notification.isRead
          ? 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900'
          : 'border-indigo-200 bg-indigo-50/60 dark:border-indigo-900 dark:bg-indigo-950/40'
      }`}
    >
      <span className={`mt-0.5 shrink-0 ${className}`}>
        <Icon size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{title}</p>
        {description && <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>}
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </p>
      </div>
      {!notification.isRead && <span className="unread-dot mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-600" />}
    </button>
  )
}

const NotificationsPage = () => {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('all')
  const [page, setPage] = useState(1)

  const { data, isLoading, isError } = useMyNotifications({
    page,
    limit: 20,
    isRead: activeTab === 'unread' ? false : undefined,
  })
  const notifications = data?.notifications ?? []
  const totalPages = data?.totalPages ?? 1
  const unreadCount = data?.unreadCount ?? 0

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const changeTab = (tab) => {
    setActiveTab(tab)
    setPage(1)
  }

  return (
    <div className="notifications-page">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Notifications</h1>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => markAllMutation.mutate()}
          disabled={markAllMutation.isPending || unreadCount === 0}
        >
          <CheckCheck size={14} />
          Mark All as Read
        </Button>
      </div>

      <div className="tabs-row mt-4 flex gap-1 border-b border-gray-200 dark:border-gray-800">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => changeTab(tab.key)}
            className={`notification-tab border-b-2 px-4 py-2 text-sm font-medium ${
              activeTab === tab.key
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {tab.label}
            {tab.key === 'unread' && unreadCount > 0 && (
              <span className="ml-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-semibold text-white">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {isLoading ? (
          [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)
        ) : isError ? (
          <p className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">Couldn&apos;t load notifications.</p>
        ) : notifications.length === 0 ? (
          <div className="empty-state flex flex-col items-center gap-2 py-16 text-center text-gray-400 dark:text-gray-500">
            <BellOff size={32} />
            <p className="text-sm">
              {activeTab === 'unread' ? "You're all caught up." : 'No notifications yet.'}
            </p>
          </div>
        ) : (
          notifications.map((notification) => <NotificationRow key={notification._id} notification={notification} />)
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
            Previous
          </Button>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Page {page} of {totalPages}
          </span>
          <Button variant="secondary" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>
            Next
          </Button>
        </div>
      )}
    </div>
  )
}

export default NotificationsPage
