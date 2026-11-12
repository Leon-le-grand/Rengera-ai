import { useQuery } from '@tanstack/react-query';

import { getAiProviderStatus, getHealthLive, getHealthReady } from '@/api/generated/sdk.gen';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function AdminHealthPage() {
  const live = useQuery({
    queryKey: ['healthLiveProbe'],
    queryFn: async () => (await getHealthLive()).data ?? null,
  });
  const ready = useQuery({
    queryKey: ['healthReadyProbe'],
    queryFn: async () => {
      const result = await getHealthReady();
      return result.data ?? result.error ?? null;
    },
  });
  const policy = useQuery({
    queryKey: ['aiProviderStatusProbe'],
    queryFn: async () => (await getAiProviderStatus()).data ?? null,
  });
  const readiness = ready.data && 'checks' in ready.data ? ready.data : undefined;
  const status = policy.data;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">System health</h1>
        <Button variant="outline" onClick={() => {
          void live.refetch();
          void ready.refetch();
          void policy.refetch();
        }}>
          Refresh
        </Button>
      </header>
      <Card>
        <CardHeader><CardTitle>API and database</CardTitle></CardHeader>
        <CardContent>
          <dl className="space-y-2">
            <div><dt>API liveness</dt><dd>{live.data?.status ?? 'Unknown'}</dd></div>
            <div><dt>API readiness</dt><dd>{readiness?.status ?? 'Unknown'}</dd></div>
            <div><dt>Database</dt><dd>{readiness?.checks?.database?.status ?? 'Unknown'}</dd></div>
          </dl>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Agent policy</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <dl className="space-y-2">
            <div><dt>Provider health</dt><dd>{status?.status ?? 'Unknown'}</dd></div>
            <div><dt>Policy version</dt><dd>{status?.policy_version ?? 'Unavailable'}</dd></div>
            <div><dt>Preferred answer model</dt><dd>{status?.model || 'Unconfigured'}</dd></div>
          </dl>
          {!!status?.models?.length && (
            <ul className="space-y-2" aria-label="Policy models">
              {status.models.map((model) => (
                <li key={model.id}>{model.id} ({model.provider}) · {model.tasks.join(', ')}</li>
              ))}
            </ul>
          )}
          {!!status?.workflows?.length && (
            <ul className="space-y-2" aria-label="Configured policy workflows">
              {status.workflows.map((workflow) => (
                <li key={workflow.task}>
                  {workflow.task} · {workflow.models.join(' → ')} · {workflow.max_model_calls} model calls · {workflow.timeout_seconds}s
                </li>
              ))}
            </ul>
          )}
          <h2 className="font-semibold">Recent model attempts on this server</h2>
          {status?.recent_attempts?.length ? (
            <ul className="space-y-2">
              {status.recent_attempts.map((attempt, index) => (
                <li key={`${attempt.observed_at}-${index}`}>
                  {attempt.task} · {attempt.model_id} · {attempt.outcome} · run {attempt.run_id.slice(0, 8)}
                  {attempt.reason && ` · ${attempt.reason.replaceAll('_', ' ')}`}
                  {' · '}<time dateTime={attempt.observed_at}>
                    {new Date(attempt.observed_at).toLocaleString()}
                  </time>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">No attempts observed.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
