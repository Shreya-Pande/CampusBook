import { useCallback, useEffect } from 'react'
import { usePortalStore } from '../store/portalStore'
import { getPortalStatus } from '../api/portal.api'

const POLL_INTERVAL_MS = 60 * 1000

export const usePortalStatus = () => {
  const status = usePortalStore((state) => state.status)
  const nextOpen = usePortalStore((state) => state.nextOpen)
  const nextClose = usePortalStore((state) => state.nextClose)
  const currentWeek = usePortalStore((state) => state.currentWeek)
  const setPortalData = usePortalStore((state) => state.setPortalData)

  const fetchStatus = useCallback(async () => {
    try {
      const { data } = await getPortalStatus()
      setPortalData(data)
    } catch {
      // Network hiccup — keep showing the last known status until the next poll.
    }
  }, [setPortalData])

  useEffect(() => {
    fetchStatus()
    const id = setInterval(fetchStatus, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [fetchStatus])

  const countdownTarget = status === 'open' ? nextClose : nextOpen

  return { status, nextOpen, nextClose, currentWeek, countdownTarget }
}

export default usePortalStatus
