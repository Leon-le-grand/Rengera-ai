import { useQuery } from '@tanstack/react-query';

import { fetchLawDetail } from '@/api/shards';
import { queryKeys } from '@/api/query-keys';

export function useLawDetail(lawId: string) {
  return useQuery({
    queryKey: queryKeys.shards.detail(lawId),
    queryFn: ({ signal }) => fetchLawDetail(lawId, signal),
    staleTime: 60_000,
    enabled: Boolean(lawId),
  });
}
