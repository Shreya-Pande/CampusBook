import { useQuery } from '@tanstack/react-query'
import { getMyBookings } from '../api/booking.api'

export const useMyBookings = (params = {}, options = {}) =>
  useQuery({
    queryKey: ['bookings', 'my', params],
    queryFn: () => getMyBookings(params),
    select: (res) => res.data?.bookings ?? [],
    ...options,
  })

export default useMyBookings
