import { useQuery } from '@tanstack/react-query'
import { getResourceAvailability } from '../api/resource.api'

export const useResourceAvailability = (resourceId, date, options = {}) =>
  useQuery({
    queryKey: ['resources', resourceId, 'availability', date],
    queryFn: () => getResourceAvailability(resourceId, date),
    select: (res) => res.data?.slots ?? [],
    enabled: Boolean(resourceId && date),
    ...options,
  })

export default useResourceAvailability
