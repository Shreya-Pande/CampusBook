import { useQuery } from '@tanstack/react-query'
import { getResources } from '../api/resource.api'

export const useResources = (params = {}) =>
  useQuery({
    queryKey: ['resources', params],
    queryFn: () => getResources(params),
    select: (res) => res.data?.resources ?? [],
  })

export default useResources
