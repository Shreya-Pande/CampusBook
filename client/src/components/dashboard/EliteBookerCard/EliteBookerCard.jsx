import { useQuery } from '@tanstack/react-query'
import { Award, Medal, Star, Trophy } from 'lucide-react'
import { getMe } from '../../../api/auth.api'
import Skeleton from '../../ui/Skeleton/Skeleton'
import './EliteBookerCard.css'

// Mirrors the server's gamification.service.js exactly.
const LEVEL_THRESHOLDS = [0, 5, 15, 30, 50, 80, 120, 170, 230, 300]
const MAX_LEVEL = 10

const BADGE_META = {
  frequent_booker: { label: 'Frequent Booker', icon: Trophy },
  punctual: { label: 'Punctual', icon: Star },
  team_player: { label: 'Team Player', icon: Medal },
}

const EliteBookerCard = () => {
  const { data: user, isLoading, isError } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: getMe,
    select: (res) => res.data?.user,
  })

  if (isLoading) {
    return (
      <div className="elite-booker-card rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (isError || !user) {
    return (
      <div className="elite-booker-card rounded-2xl border border-gray-200 bg-white p-5 text-center text-sm text-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-500">
        Couldn&apos;t load your booker profile.
      </div>
    )
  }

  const { gamification } = user
  const level = Math.min(gamification?.level || 1, MAX_LEVEL)
  const totalBookings = gamification?.totalBookings || 0
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] ?? 0
  const nextThreshold = LEVEL_THRESHOLDS[level] ?? currentThreshold + 1
  const span = nextThreshold - currentThreshold || 1
  const progress =
    level >= MAX_LEVEL ? 100 : Math.min(100, Math.max(0, Math.round(((totalBookings - currentThreshold) / span) * 100)))
  const badges = gamification?.badges || []

  return (
    <div className="elite-booker-card rounded-2xl border border-gray-200 bg-gradient-to-br from-indigo-600 to-indigo-800 p-5 text-white dark:border-gray-800">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-indigo-100">Elite Booker</p>
        <span className="level-badge flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
          {level}
        </span>
      </div>

      <div className="mt-4">
        <div className="flex justify-between text-xs text-indigo-100">
          <span>Level {level}</span>
          {level < MAX_LEVEL && <span>Level {level + 1}</span>}
        </div>
        <div className="progress-track mt-1 h-2 w-full overflow-hidden rounded-full bg-white/20">
          <div className="progress-fill h-full rounded-full bg-white" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <p className="mt-4 text-sm text-indigo-50">
        You&apos;ve saved <span className="font-semibold">{gamification?.hoursSaved || 0} hours</span> of waiting
        time.
      </p>

      {badges.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {badges.map((badge) => {
            const meta = BADGE_META[badge] || { label: badge, icon: Award }
            const Icon = meta.icon
            return (
              <span
                key={badge}
                title={meta.label}
                className="badge-pill flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 text-xs font-medium"
              >
                <Icon size={14} />
                {meta.label}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default EliteBookerCard
