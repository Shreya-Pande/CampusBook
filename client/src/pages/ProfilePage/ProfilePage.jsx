import { useQuery } from '@tanstack/react-query'
import { Award, Building2, Clock3, Mail, Medal, ShieldCheck, Star, Trophy, UserRound } from 'lucide-react'
import { getMe } from '../../api/auth.api'
import Skeleton from '../../components/ui/Skeleton/Skeleton'
import './ProfilePage.css'

// Mirrors server/src/services/gamification.service.js exactly.
const LEVEL_THRESHOLDS = [0, 5, 15, 30, 50, 80, 120, 170, 230, 300]
const MAX_LEVEL = 10

const BADGE_META = {
  frequent_booker: { label: 'Frequent Booker', description: '10+ bookings', icon: Trophy },
  punctual: { label: 'Punctual', description: '5+ on-time check-ins', icon: Star },
  team_player: { label: 'Team Player', description: '3+ multi-room bookings', icon: Medal },
}

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  hod: 'HOD',
  department_admin: 'Department Admin',
}

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 py-3">
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
      <Icon size={16} />
    </span>
    <div className="min-w-0">
      <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
      <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{value || '—'}</p>
    </div>
  </div>
)

const ProfilePage = () => {
  const { data: user, isLoading, isError } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: getMe,
    select: (res) => res.data?.user,
  })

  if (isLoading) {
    return (
      <div className="profile-page mx-auto max-w-3xl">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-4 h-48 w-full" />
        <Skeleton className="mt-4 h-48 w-full" />
      </div>
    )
  }

  if (isError || !user) {
    return (
      <div className="profile-page mx-auto max-w-3xl py-16 text-center">
        <p className="text-sm text-gray-400 dark:text-gray-500">Couldn&apos;t load your profile.</p>
      </div>
    )
  }

  const isAdmin = user.role === 'admin'
  const roleLabel = isAdmin ? ROLE_LABELS[user.adminType] || 'Admin' : 'CR / Faculty'

  const gamification = user.gamification || {}
  const level = Math.min(gamification.level || 1, MAX_LEVEL)
  const totalBookings = gamification.totalBookings || 0
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] ?? 0
  const nextThreshold = LEVEL_THRESHOLDS[level] ?? currentThreshold + 1
  const span = nextThreshold - currentThreshold || 1
  const progress =
    level >= MAX_LEVEL ? 100 : Math.min(100, Math.max(0, Math.round(((totalBookings - currentThreshold) / span) * 100)))
  const badges = gamification.badges || []

  return (
    <div className="profile-page mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Profile</h1>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xl font-bold text-white">
            {user.name?.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{user.name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{roleLabel}</p>
          </div>
        </div>

        <div className="mt-2 divide-y divide-gray-100 dark:divide-gray-800">
          <InfoRow icon={Mail} label="Email" value={user.email} />
          <InfoRow icon={ShieldCheck} label="Role" value={roleLabel} />
          {!isAdmin && <InfoRow icon={UserRound} label="Designation" value={user.designation} />}
          <InfoRow icon={Building2} label="Department" value={user.department} />
        </div>
      </div>

      <div className="elite-booker-section mt-6 rounded-2xl border border-gray-200 bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 text-white dark:border-gray-800">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-indigo-100">Elite Booker</p>
          <span className="level-badge flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-base font-bold">
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

        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-2">
          <div className="stat-tile rounded-xl bg-white/10 p-4">
            <p className="flex items-center gap-1.5 text-xs text-indigo-100">
              <Trophy size={14} />
              Total Bookings
            </p>
            <p className="mt-1 text-2xl font-bold">{totalBookings}</p>
          </div>
          <div className="stat-tile rounded-xl bg-white/10 p-4">
            <p className="flex items-center gap-1.5 text-xs text-indigo-100">
              <Clock3 size={14} />
              Hours Saved
            </p>
            <p className="mt-1 text-2xl font-bold">{gamification.hoursSaved || 0}</p>
          </div>
        </div>

        <div className="mt-5">
          <p className="text-xs font-medium text-indigo-100">Badges Earned</p>
          {badges.length === 0 ? (
            <p className="mt-2 text-sm text-indigo-100/80">No badges yet — keep booking to earn your first one.</p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              {badges.map((badge) => {
                const meta = BADGE_META[badge] || { label: badge, description: '', icon: Award }
                const Icon = meta.icon
                return (
                  <span
                    key={badge}
                    title={meta.description}
                    className="badge-pill flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium"
                  >
                    <Icon size={14} />
                    {meta.label}
                  </span>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProfilePage
