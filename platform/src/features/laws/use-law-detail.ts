import { useQuery } from '@tanstack/react-query';

import { fetchLawDetail } from '@/api/laws';
import { queryKeys } from '@/api/query-keys';

export function useLawDetail(lawId: string) {
  return useQuery({
    queryKey: queryKeys.laws.detail(lawId),
    queryFn: ({ signal }) => fetchLawDetail(lawId, signal),
    staleTime: 60_000,
    enabled: Boolean(lawId),
  });
}
