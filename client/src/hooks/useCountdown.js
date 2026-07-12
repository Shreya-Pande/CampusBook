import { useEffect, useState } from 'react'

export const useCountdown = (targetDate) => {
  const [timeLeft, setTimeLeft] = useState(null)

  useEffect(() => {
    if (!targetDate) {
      setTimeLeft(null)
      return undefined
    }

    const tick = () => {
      const diff = new Date(targetDate) - new Date()
      if (diff <= 0) {
        setTimeLeft(null)
        return
      }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      })
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [targetDate])

  return timeLeft
}

export default useCountdown
