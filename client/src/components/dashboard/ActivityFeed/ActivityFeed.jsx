import { formatDistanceToNow } from 'date-fns'
import { useMyNotifications } from '../../../hooks/useNotifications'
import { getNotificationLabel, getNotificationVariant } from '../../../utils/notificationLabels'
import Skeleton from '../../ui/Skeleton/Skeleton'
import ActivityItem from '../ActivityItem/ActivityItem'
import './ActivityFeed.css'

// Recent Activity is sourced from the user's own notifications — the
// backend has no separate "activity feed" endpoint, and notification types
// map cleanly onto the blueprint's activity item types (confirmed/waitlist
// alert/rejected/expired/etc).
const ActivityFeed = () => {
  const { data, isLoading, isError } = useMyNotifications({ limit: 10 })
  const notifications = data?.notifications ?? []

  return (
    <div className="activity-feed rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Recent Activity</h2>

      {isLoading ? (
        <div className="mt-4 space-y-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : isError ? (
        <p className="mt-6 text-center text-sm text-gray-400 dark:text-gray-500">
          Couldn&apos;t load recent activity.
        </p>
      ) : notifications.length === 0 ? (
        <p className="mt-6 text-center text-sm text-gray-400 dark:text-gray-500">No recent activity yet.</p>
      ) : (
        <ul className="mt-2">
          {notifications.map((notification) => {
            const { title, description } = getNotificationLabel(notification.type)
            const isWaitlistOffer = notification.type === 'waitlist_offered'

            return (
              <ActivityItem
                key={notification._id}
                variant={getNotificationVariant(notification.type)}
                title={title}
                description={description}
                timestamp={formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                actionLabel={isWaitlistOffer ? 'Claim Spot' : undefined}
                actionTo={isWaitlistOffer ? '/waitlist' : undefined}
              />
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default ActivityFeed
