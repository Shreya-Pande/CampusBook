import User from '../models/User.js'

const LEVEL_THRESHOLDS = [0, 5, 15, 30, 50, 80, 120, 170, 230, 300]
const BADGES = {
  frequent_booker: 10, // 10+ bookings
  punctual: 5, // 5+ on-time check-ins
  team_player: 3, // 3+ multi-room bookings
}

export const updateGamification = async (userId, action) => {
  const inc = {}
  if (action === 'booking_created') inc['gamification.totalBookings'] = 1
  if (action === 'on_time_checkin') inc['gamification.onTimeCheckIns'] = 1
  if (action === 'early_cancellation') inc['gamification.hoursSaved'] = 1

  const user = await User.findByIdAndUpdate(userId, { $inc: inc }, { new: true })

  const newLevel = LEVEL_THRESHOLDS.findLastIndex((t) => user.gamification.totalBookings >= t) + 1
  const newBadges = Object.entries(BADGES)
    .filter(([, threshold]) => user.gamification.totalBookings >= threshold)
    .map(([badge]) => badge)
    .filter((badge) => !user.gamification.badges.includes(badge))

  if (newLevel !== user.gamification.level || newBadges.length > 0) {
    await User.findByIdAndUpdate(userId, {
      'gamification.level': Math.min(newLevel, 10),
      $addToSet: { 'gamification.badges': { $each: newBadges } },
    })
  }
}

export default updateGamification
