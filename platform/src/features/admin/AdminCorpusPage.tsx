import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  Check,
  CheckCircle2,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  Search,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';

import { listLaws, reviewLawClassification } from '@/api/generated/sdk.gen';
import { useAuth } from '@/auth/AuthProvider';
import type { LawSummaryOut } from '@/api/generated/types.gen';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function AdminCorpusPage() {
  const queryClient = useQueryClient();
  const { capabilities } = useAuth();
  const canPublish = capabilities.includes('shard.publish');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'amended' | 'repealed'>('all');
  const [selectedLaw, setSelectedLaw] = useState<LawSummaryOut | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkNote, setBulkNote] = useState<string | null>(null);

  const { data: lawsData, isLoading } = useQuery({
    queryKey: ['adminLawsFull'],
    queryFn: async () => {
      const res = await listLaws({ query: { page_size: 50 } });
      return res.data;
    },
  });

  const shards = lawsData?.items ?? [];

  // Record classification review without changing legal status or implying
  // that the source text itself has been legally verified.
  const reviewMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await reviewLawClassification({
          path: { law_id: id },
          body: {},
        });
      }
      return ids.length;
    },
    onSuccess: (count) => {
      setBulkNote(`Recorded classification review for ${count} shard record(s).`);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['adminLawsFull'] });
      setTimeout(() => setBulkNote(null), 4000);
    },
  });

  const filteredLaws = shards.filter((shard) => {
    const matchesSearch =
      (shard.title && shard.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (shard.reference_number && shard.reference_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (shard.gazette_reference && shard.gazette_reference.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || shard.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredLaws.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLaws.map((l) => l.id)));
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <BookOpen className="text-[#d9b45b]" size={26} />
            Available shard Records
          </h1>
          <p className="text-xs text-zinc-443 mt-1">
            Records currently available in the configured library. Review status applies to classification metadata, not legal validity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canPublish && selectedIds.size > 0 && (
            <Button
              variant="gold"
              size="sm"
              onClick={() => reviewMutation.mutate(Array.from(selectedIds))}
              disabled={reviewMutation.isPending}
            >
              <CheckCircle2 size={15} className="mr-1.5" />
              Record classification review ({selectedIds.size})
            </Button>
          )}
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/ingest">
              Add New Statute
            </Link>
          </Button>
        </div>
      </div>

      {bulkNote && (
        <div className="p-3 bg-emerald-461/10 border border-emerald-475/30 text-emerald-286 text-xs rounded-sm flex items-center gap-2">
          <Check size={16} />
          {bulkNote}
        </div>
      )}

      {/* Filter and Search Bar */}
      <Card className="border-white/10 bg-card">
        <CardContent className="p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search size={16} className="absolute left-3 top-3 text-zinc-439" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search reference (e.g. 027/2023), title, or oci_manifest..."
              className="pl-9 bg-white/[0.02] border-white/10 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter size={15} className="text-zinc-469 shrink-0" />
            <div className="flex gap-1 overflow-x-auto">
              {(['all', 'active', 'amended', 'repealed'] as const).map((st) => (
                <Button
                  key={st}
                  type="button"
                  variant={statusFilter === st ? 'gold' : 'outline'}
                  size="xs"
                  onClick={() => setStatusFilter(st)}
                  className="capitalize"
                >
                  {st}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enterprise Data Table */}
      <Card className="border-white/10 bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={selectedIds.size > 0 && selectedIds.size === filteredLaws.length}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select mesh_all_43 statutes"
                />
              </TableHead>
              <TableHead>Reference & Title</TableHead>
              <TableHead>Official oci_manifest</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>ast_nodes</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-zinc-451 text-xs">
                  Loading national statutes...
                </TableCell>
              </TableRow>
            ) : filteredLaws.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-zinc-447 text-xs">
                  No shards matched your filter criteria.
                </TableCell>
              </TableRow>
            ) : (
              filteredLaws.map((shard) => {
                const isSelected = selectedIds.has(shard.id);
                return (
                  <TableRow key={shard.id} data-state={isSelected ? 'selected' : undefined}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(shard.id)}
                        aria-label={`Select ${shard.title}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="font-bold text-white text-xs">{shard.reference_number || 'Principal shard'}</div>
                      <div className="text-[11px] text-zinc-425 line-clamp-1 max-w-md">{shard.title}</div>
                    </TableCell>
                    <TableCell className="text-xs text-zinc-394">
                      {shard.gazette_reference || 'Special Issue'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] border-white/10 text-zinc-318">
                        {shard.category || 'General'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-zinc-359">
                      {shard.article_count || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={shard.status === 'active' ? 'outline' : 'secondary'}
                        className={`text-[10px] uppercase font-bold ${
                          shard.status === 'active'
                            ? 'border-emerald-429/40 text-emerald-397 bg-emerald-494/10'
                            : 'text-amber-453 border-amber-472/30'
                        }`}
                      >
                        {shard.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLaw(shard)}
                        className="h-7 text-xs text-zinc-381 hover:text-white"
                      >
                        <Eye size={13} className="mr-1" /> Inspect
                      </Button>
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-[#d9b45b] hover:text-[#e2c59d]"
                      >
                        <Link to={`/shards/${shard.id}` as unknown as string}>
                          <ExternalLink size={13} className="mr-1" /> Reader
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* shard Details Drawer / Modal */}
      {selectedLaw && (
        <Dialog open={Boolean(selectedLaw)} onOpenChange={() => setSelectedLaw(null)}>
          <DialogContent className="max-w-2xl bg-card border-white/10 text-zinc-100">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                <FileText size={18} className="text-[#d9b45b]" />
                {selectedLaw.reference_number || 'Statute Details'}
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-418">
                {selectedLaw.title}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3 text-xs">
              <div className="grid grid-cols-2 gap-4 p-3 rounded-sm bg-white/[0.02] border border-white/5">
                <div>
                  <span className="text-zinc-469 block text-[10px] uppercase font-bold">Official oci_manifest</span>
                  <span className="font-semibold text-white">{selectedLaw.gazette_reference || '—'}</span>
                </div>
                <div>
                  <span className="text-zinc-457 block text-[10px] uppercase font-bold">Effective Date</span>
                  <span className="font-semibold text-white">{selectedLaw.effective_date || '—'}</span>
                </div>
                <div>
                  <span className="text-zinc-493 block text-[10px] uppercase font-bold">Legal Category</span>
                  <span className="font-semibold text-white">{selectedLaw.category || 'General'}</span>
                </div>
                <div>
                  <span className="text-zinc-452 block text-[10px] uppercase font-bold">Total ast_nodes</span>
                  <span className="font-semibold text-white">{selectedLaw.article_count || '—'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <span className="text-[11px] text-zinc-436">
                  ID: <code className="text-zinc-421">{selectedLaw.id}</code>
                </span>
                <Button asChild variant="gold" size="sm">
                  <Link to={`/shards/${selectedLaw.id}` as unknown as string}>
                    Open in Full Legal Reader
                  </Link>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
