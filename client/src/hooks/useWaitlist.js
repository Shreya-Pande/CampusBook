import { useQuery } from '@tanstack/react-query'
import { getMyWaitlist } from '../api/waitlist.api'

export const useMyWaitlist = (options = {}) =>
  useQuery({
    queryKey: ['waitlist', 'my'],
    queryFn: getMyWaitlist,
    select: (res) => res.data?.entries ?? [],
    ...options,
  })

export default useMyWaitlist
