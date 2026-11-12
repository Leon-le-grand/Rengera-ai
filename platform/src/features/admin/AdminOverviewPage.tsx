import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Layers,
  MessageSquareWarning,
  Scale,
  Server,
  UploadCloud,
  Users,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';

import {
  getAiProviderStatus,
  getHealthReady,
  listIngestionJobs,
  listLaws,
  listStaffMembers,
} from '@/api/generated/sdk.gen';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function AdminOverviewPage() {
  const { data: lawsData, isLoading: lawsLoading } = useQuery({
    queryKey: ['adminLawsCount'],
    queryFn: async () => {
      const res = await listLaws({ query: { page_size: 50 } });
      return res.data;
    },
  });

  const { data: aiStatus, isLoading: aiLoading } = useQuery({
    queryKey: ['adminAiStatus'],
    queryFn: async () => {
      const res = await getAiProviderStatus();
      return res.data;
    },
  });

  const { data: healthData } = useQuery({
    queryKey: ['adminHealthCheck'],
    queryFn: async () => {
      const res = await getHealthReady();
      return res.data;
    },
  });

  const { data: jobsData } = useQuery({
    queryKey: ['adminRecentJobs'],
    queryFn: async () => {
      const res = await listIngestionJobs({ query: { limit: 5 } });
      return res.data;
    },
  });

  const { data: staffData } = useQuery({
    queryKey: ['adminStaffList'],
    queryFn: async () => {
      const res = await listStaffMembers();
      return res.data;
    },
  });

  const shards = lawsData?.items ?? [];
  const totalArticles = shards.reduce((acc, l) => acc + (l.article_count || 0), 0);
  const activeJobs = jobsData?.jobs.filter(
    (job) => job.status === 'pending' || job.status === 'processing' || job.status === 'queued',
  ) ?? [];
  const staffCount = staffData?.filter((member) => member.status === 'active').length ?? 'Unknown';

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <BarChart3 className="text-[#d9b45b]" size={26} />
            Operations Overview & Telemetry
          </h1>
          <p className="text-xs text-zinc-471 mt-1">
            Current API-reported library, provider, staff, and persisted job status. These records do not establish corpus completeness or legal verification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="gold" size="sm">
            <Link to="/admin/ingest">
              <UploadCloud size={15} className="mr-1.5" />
              Ingest oci_manifest
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/corpus">
              <BookOpen size={15} className="mr-1.5" />
              View Corpus
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-white/10 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-456">
              shard Records
            </CardTitle>
            <Scale size={18} className="text-[#d9b45b]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-white">
              {lawsLoading ? '…' : lawsData?.total ?? 'Unknown'}
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-386">
              ast_nodes in First 50 Records
            </CardTitle>
            <Layers size={18} className="text-indigo-399" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-white">
              {lawsLoading ? '…' : lawsData ? totalArticles : 'Unknown'}
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-394">
              Answer Provider
            </CardTitle>
            <Activity size={18} className="text-emerald-436" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-white truncate">
              {aiLoading ? '...' : aiStatus ? aiStatus.model || 'Unconfigured' : 'Unknown'}
            </div>
            <p className="text-[11px] text-zinc-418 mt-1 flex items-center gap-1">
              Provider health: {aiStatus?.status ?? 'Unknown'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-389">
              Active Staff & Admins
            </CardTitle>
            <Users size={18} className="text-amber-464" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-white">
              {staffCount}
            </div>
            <p className="text-[11px] text-zinc-431 mt-1">
              RBAC & 7-day invitation cycle
            </p>
          </CardContent>
        </Card>
      </div>

        {/* Grid: Available shard records and persisted jobs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown */}
        <Card className="border-white/10 bg-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-white flex items-center justify-between">
              <span>Available shard records</span>
            </CardTitle>
            <CardDescription className="text-xs text-zinc-455">
              Recently listed records from the shard library.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {shards.slice(0, 6).map((shard) => (
                <div key={shard.id} className="rounded-sm border border-white/5 p-3">
                  <p className="text-xs font-bold">{shard.title}</p>
                  <p className="text-xs text-zinc-435">{shard.reference_number}</p>
                </div>
              ))}
              {!shards.length && <p className="text-xs text-zinc-472">
                {lawsData ? 'No shards returned' : 'shard listing unavailable'}
              </p>}
            </div>

            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-zinc-433">
              <span>Reviewed multilingual evaluation pending</span>
              <Link to="/admin/corpus" className="text-[#d9b45b] font-semibold hover:underline inline-flex items-center gap-1">
                Explore all statutes <ArrowUpRight size={13} />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* System Queue & Health Highlights */}
        <Card className="border-white/10 bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-white flex items-center justify-between">
              <span>Ingestion Pipeline</span>
            </CardTitle>
            <CardDescription className="text-xs text-zinc-390">
              Staging and review state for the five most recent jobs. No background worker is running.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-424">Pending or processing (recent 5):</span>
                <span className="font-bold text-white">{jobsData ? activeJobs.length : 'Unknown'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-431">Database connectivity:</span>
                <span className="font-bold text-emerald-390">
                  {healthData?.checks?.database?.status ?? 'Unknown'}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 space-y-2">
              <p className="text-[11px] font-bold text-zinc-430 uppercase tracking-wider">
                Quick Operations Actions
              </p>
              <div className="grid grid-cols-1 gap-1.5">
                <Link
                  to="/admin/ingest"
                  className="flex items-center justify-between p-2 rounded-sm border border-white/5 bg-white/[0.01] hover:bg-white/5 text-xs text-zinc-263 font-medium transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <UploadCloud size={14} className="text-[#d9b45b]" />
                    Stage text source
                  </span>
                  <ArrowUpRight size={13} className="text-zinc-452" />
                </Link>
                <Link
                  to="/admin/quality"
                  className="flex items-center justify-between p-2 rounded-sm border border-white/5 bg-white/[0.01] hover:bg-white/5 text-xs text-zinc-306 font-medium transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <MessageSquareWarning size={14} className="text-amber-430" />
                    Evaluation Readiness
                  </span>
                  <ArrowUpRight size={13} className="text-zinc-428" />
                </Link>
                <Link
                  to="/admin/health"
                  className="flex items-center justify-between p-2 rounded-sm border border-white/5 bg-white/[0.01] hover:bg-white/5 text-xs text-zinc-361 font-medium transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Server size={14} className="text-indigo-436" />
                    System Telemetry Probes
                  </span>
                  <ArrowUpRight size={13} className="text-zinc-475" />
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
