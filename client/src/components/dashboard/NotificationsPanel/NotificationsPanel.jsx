import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { useMyNotifications } from '../../../hooks/useNotifications'
import { getNotificationLabel } from '../../../utils/notificationLabels'
import Skeleton from '../../ui/Skeleton/Skeleton'
import './NotificationsPanel.css'

const NotificationsPanel = () => {
  const { data, isLoading, isError } = useMyNotifications({ limit: 5 })
  const notifications = data?.notifications ?? []
  const unreadCount = data?.unreadCount ?? 0

  return (
    <div className="notifications-panel rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-100">
          Notifications
          {unreadCount > 0 && (
            <span className="unread-badge rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
              {unreadCount}
            </span>
          )}
        </h2>
        <Link
          to="/notifications"
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
        >
          View All
        </Link>
      </div>

      <div className="mt-4 space-y-4">
        {isLoading ? (
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)
        ) : isError ? (
          <p className="text-center text-sm text-gray-400 dark:text-gray-500">Couldn&apos;t load notifications.</p>
        ) : notifications.length === 0 ? (
          <p className="text-center text-sm text-gray-400 dark:text-gray-500">You&apos;re all caught up.</p>
        ) : (
          notifications.map((notification) => {
            const { title, description } = getNotificationLabel(notification.type)
            return (
              <div
                key={notification._id}
                className={`notification-row rounded-lg px-2 py-1.5 ${!notification.isRead ? 'is-unread' : ''}`}
              >
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
                <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                  {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                </p>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default NotificationsPanel
