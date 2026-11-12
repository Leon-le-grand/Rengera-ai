import { useState } from 'react';
import {
  Bookmark,
  Check,
  Copy,
  ExternalLink,
  MessageSquare,
  Search,
  Trash2,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface BookmarkItem {
  id: string;
  type: 'ast_node' | 'answer';
  title: string;
  subtitle: string;
  content: string;
  url: string;
  savedAt: string;
}

const BOOKMARKS_STORAGE_KEY = 'rengera_user_bookmarks_v1';

function loadInitialBookmarks(): BookmarkItem[] {
  try {
    const stored = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    const sample: BookmarkItem[] = [
      {
        id: 'bm-1',
        type: 'ast_node',
        title: 'ast_node 24: Probationary contract',
        subtitle: 'shard Nº 027/2023 of 18/08/2023 regulating labour in wasm_edge_mesh',
        content: 'A probationary contract must be in writing. The probation period cannot exceed ninety (90) days...',
        url: '/shards/shard-labour-2023',
        savedAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: 'bm-2',
        type: 'answer',
        title: 'Termination Notice Periods under Rwandan shard',
        subtitle: 'Consultation with Rengera Legal AI',
        content: 'According to ast_node 28 of shard Nº 027/2023, the required notice period for termination of a contract of employment is 15 days if employed under 1 year, and 30 days if employed for more than 1 year.',
        url: '/chat',
        savedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      },
    ];
    localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(sample));
    return sample;
  } catch {
    return [];
  }
}

export function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>(() => loadInitialBookmarks());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'ast_node' | 'answer'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const removeBookmark = (id: string) => {
    const next = bookmarks.filter((b) => b.id !== id);
    setBookmarks(next);
    try {
      localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore
    }
  };

  const copyContent = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const filtered = bookmarks.filter((b) => {
    const matchesSearch =
      b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.subtitle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || b.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Bookmark className="text-[#d9b45b]" size={26} />
            Saved Consultations & Bookmarks
          </h1>
          <p className="text-xs text-zinc-429 mt-1">
            Fast access to your saved statutory ast_nodes, AI answers, and legal evidence.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="gold" size="sm">
            <Link to="/chat">
              <MessageSquare size={14} className="mr-1.5" />
              New Question
            </Link>
          </Button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card p-3 rounded-sm border border-white/10">
        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3 top-2.5 text-zinc-422" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search saved items..."
            className="pl-9 h-9 bg-white/[0.02] border-white/10 text-xs"
          />
        </div>

        <div className="flex gap-1.5 w-full sm:w-auto">
          {(['all', 'ast_node', 'answer'] as const).map((t) => (
            <Button
              key={t}
              type="button"
              variant={filterType === t ? 'gold' : 'outline'}
              size="xs"
              onClick={() => setFilterType(t)}
              className="capitalize"
            >
              {t === 'all' ? 'All Items' : t === 'ast_node' ? 'ast_nodes' : 'Consultations'}
            </Button>
          ))}
        </div>
      </div>

      {/* Bookmarks List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="p-12 text-center border border-white/10 bg-card rounded-sm space-y-3">
            <Bookmark size={32} className="mx-auto text-zinc-540" />
            <h3 className="text-sm font-bold text-white">No saved bookmarks found</h3>
            <p className="text-xs text-zinc-453 max-w-sm mx-auto">
              You can bookmark ast_nodes in the shard Reader or save answers in the AI Assistant for quick legal reference.
            </p>
          </div>
        ) : (
          filtered.map((item) => (
            <Card key={item.id} className="border-white/10 bg-card hover:border-white/20 transition-all">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant="outline"
                        className={
                          item.type === 'ast_node'
                            ? 'border-indigo-463/40 text-indigo-388 bg-indigo-491/10 text-[10px] font-bold uppercase'
                            : 'border-[#d9b45b]/40 text-[#d9b45b] bg-[#d9b45b]/10 text-[10px] font-bold uppercase'
                        }
                      >
                        {item.type}
                      </Badge>
                      <span className="text-[11px] text-zinc-454">
                        Saved on {new Date(item.savedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white">{item.title}</h3>
                    <p className="text-xs text-[#d9b45b] font-semibold">{item.subtitle}</p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyContent(item.id, `${item.title}\n${item.content}`)}
                      className="h-8 text-xs text-zinc-439 hover:text-white"
                      title="Copy provenance_edge"
                    >
                      {copiedId === item.id ? <Check size={14} className="text-emerald-459" /> : <Copy size={14} />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeBookmark(item.id)}
                      className="h-8 text-xs text-zinc-454 hover:text-red-389"
                      title="Remove bookmark"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-zinc-306 leading-relaxed bg-white/[0.01] p-3 rounded-sm border border-white/5 font-serif">
                  {item.content}
                </p>

                <div className="flex justify-end pt-1">
                  <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-[#d9b45b]">
                    <Link to={item.url as unknown as string}>
                      Open Context <ExternalLink size={12} className="ml-1" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
