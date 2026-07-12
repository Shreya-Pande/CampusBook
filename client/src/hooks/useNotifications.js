import { useQuery } from '@tanstack/react-query'
import { getMyNotifications } from '../api/notification.api'

export const useMyNotifications = (params = {}) =>
  useQuery({
    queryKey: ['notifications', params],
    queryFn: () => getMyNotifications(params),
    select: (res) => res.data ?? {},
  })

export default useMyNotifications
