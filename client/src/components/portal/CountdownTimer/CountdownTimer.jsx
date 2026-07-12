import { useCountdown } from '../../../hooks/useCountdown'
import './CountdownTimer.css'

const pad = (n) => String(n).padStart(2, '0')

// Renders a live dd:hh:mm:ss countdown to targetDate, ticking every second
// via useCountdown. Renders nothing once the target has passed.
const CountdownTimer = ({ targetDate, className = '' }) => {
  const timeLeft = useCountdown(targetDate)

  if (!timeLeft) return null

  const { days, hours, minutes, seconds } = timeLeft

  return (
    <span className={`countdown-timer font-mono font-bold tabular-nums ${className}`}>
      {pad(days)}:{pad(hours)}:{pad(minutes)}:{pad(seconds)}
    </span>
  )
}

export default CountdownTimer
