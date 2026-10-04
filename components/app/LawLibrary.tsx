'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  BookOpen,
  MessageSquareText,
  ChevronRight,
  X,
  Loader2,
  FileText,
  Briefcase,
  Home,
  Users,
  Car,
  Shield,
  Map,
  ScrollText,
  ExternalLink,
  Layers,
  ArrowLeftRight,
  Check,
} from 'lucide-react';
import type { ElementType } from 'react';
import { getLawLibrary, type LawLibraryCategory, type LawLibraryEntry } from '@/app/legal-actions';
import LawComparison from './LawComparison';
import { cn } from '@/lib/utils';

interface LawLibraryProps {
  /** Law and article the reader should open. Null closes the reader. */
  openLawId?: string | null;
  openArticleNumber?: string | null;
  onOpenLaw: (lawId: string, articleNumber?: string | null) => void;
  onCloseReader: () => void;
  isAdmin?: boolean;
  /** Sends the open law or article into the chat as a grounded follow-up. */
  onAskAboutArticle?: (ask: {
    prompt: string;
    lawId: string;
    lawTitle: string;
    referenceNumber: string | null;
    articleNumber: string | null;
    text: string | null;
  }) => void;
}

const CATEGORY_STYLES: { match: RegExp; icon: ElementType; tone: string }[] = [
  { match: /labou?r|employ|social security/i, icon: Briefcase, tone: 'blue' },
  { match: /housing|land|property|tenan|rental|urban/i, icon: Home, tone: 'emerald' },
  { match: /family|marriag|divorce|inherit|succession/i, icon: Users, tone: 'purple' },
  { match: /traffic|road|transport|accident/i, icon: Car, tone: 'amber' },
  { match: /business|commercial|corporate|compan|tax|bank/i, icon: FileText, tone: 'indigo' },
  { match: /cyber|crime|penali/i, icon: Shield, tone: 'rose' },
  { match: /privacy|data|personal protection|information/i, icon: Shield, tone: 'teal' },
  { match: /environment|water|forest|agricultur/i, icon: Map, tone: 'orange' },
  { match: /health|medical|public health/i, icon: ScrollText, tone: 'lime' },
];

const TONE_CLASSES: Record<string, { icon: string; badge: string; ring: string }> = {
  blue: { icon: 'bg-blue-100 text-blue-600', badge: 'bg-blue-50 text-blue-700', ring: 'hover:border-blue-400' },
  emerald: { icon: 'bg-emerald-100 text-emerald-600', badge: 'bg-emerald-50 text-emerald-700', ring: 'hover:border-emerald-400' },
  purple: { icon: 'bg-purple-100 text-purple-600', badge: 'bg-purple-50 text-purple-700', ring: 'hover:border-purple-400' },
  amber: { icon: 'bg-amber-100 text-amber-600', badge: 'bg-amber-50 text-amber-700', ring: 'hover:border-amber-400' },
  indigo: { icon: 'bg-indigo-100 text-indigo-600', badge: 'bg-indigo-50 text-indigo-700', ring: 'hover:border-indigo-400' },
  rose: { icon: 'bg-rose-100 text-rose-600', badge: 'bg-rose-50 text-rose-700', ring: 'hover:border-rose-400' },
  teal: { icon: 'bg-teal-100 text-teal-600', badge: 'bg-teal-50 text-teal-700', ring: 'hover:border-teal-400' },
  orange: { icon: 'bg-orange-100 text-orange-600', badge: 'bg-orange-50 text-orange-700', ring: 'hover:border-orange-400' },
  lime: { icon: 'bg-lime-100 text-lime-600', badge: 'bg-lime-50 text-lime-700', ring: 'hover:border-lime-400' },
};

const DEFAULT_TONE = { icon: 'bg-slate-100 text-slate-600', badge: 'bg-slate-100 text-slate-700', ring: 'hover:border-slate-400' };

/**
 * Cover art for the card artwork. Each entry is a plain photo id so the card can
 * render it with a plain <img> and no remote-loader configuration. If a photo
 * ever fails to load the tile falls back to its gradient (see `CardArtwork`).
 */
const CATEGORY_ART: Record<string, { src: string; wash: string; alt: string }> = {
  blue: {
    src: 'photo-1521737604893-d14cc237f11d',
    wash: 'from-blue-100 via-blue-50 to-slate-50',
    alt: 'Colleagues working together in an office',
  },
  emerald: {
    src: 'photo-1560518883-ce09059eeffa',
    wash: 'from-emerald-100 via-emerald-50 to-slate-50',
    alt: 'Residential housing',
  },
  purple: {
    src: 'photo-1511895426328-dc8714191300',
    wash: 'from-purple-100 via-purple-50 to-slate-50',
    alt: 'A family at home',
  },
  amber: {
    src: 'photo-1449965408869-eaa3f722e40d',
    wash: 'from-amber-100 via-amber-50 to-slate-50',
    alt: 'A road with traffic',
  },
  indigo: {
    src: 'photo-1454165804606-c3d57bc86b40',
    wash: 'from-indigo-100 via-indigo-50 to-slate-50',
    alt: 'A business planning session',
  },
  rose: {
    src: 'photo-1589829545856-d10d557cf95f',
    wash: 'from-rose-100 via-rose-50 to-slate-50',
    alt: 'Law books on a desk',
  },
  teal: {
    src: 'photo-1563013544-824ae1b704d3',
    wash: 'from-teal-100 via-teal-50 to-slate-50',
    alt: 'Digital privacy and security',
  },
  orange: {
    src: 'photo-1441974231531-c6227db76b6e',
    wash: 'from-orange-100 via-orange-50 to-slate-50',
    alt: 'A green landscape',
  },
  lime: {
    src: 'photo-1576091160399-112ba8d25d1d',
    wash: 'from-lime-100 via-lime-50 to-slate-50',
    alt: 'A medical professional',
  },
  slate: {
    src: 'photo-1450101499163-c8848c66ca85',
    wash: 'from-slate-200 via-slate-100 to-slate-50',
    alt: 'Official documents',
  },
};

function toneFor(category: string) {
  const style = CATEGORY_STYLES.find((entry) => entry.match.test(category));
  const tone = style ? style.tone : 'slate';
  const classes = TONE_CLASSES[tone] ?? DEFAULT_TONE;
  const art = CATEGORY_ART[tone] ?? CATEGORY_ART.slate;
  // `Icon` is the component; `icon` stays the class list. Keep the names apart.
  return { Icon: style?.icon || BookOpen, tone, art, ...classes };
}

/** Card artwork: photo on a tone-matched wash, with a graceful fallback. */
function CardArtwork({ art, className }: { art: { src: string; wash: string; alt: string }; className?: string }) {
  return (
    <div className={cn('relative overflow-hidden bg-gradient-to-br', art.wash, className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://images.unsplash.com/${art.src}?auto=format&fit=crop&q=80`}
        alt={art.alt}
        loading="lazy"
        onError={(event) => {
          event.currentTarget.style.display = 'none';
        }}
        className="h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.12]"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/35 via-transparent to-white/10" />
    </div>
  );
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function matchesSearch(law: LawLibraryEntry, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;

  return [
    law.title,
    law.reference_number || '',
    law.summary || '',
    law.category || '',
    law.gazette_reference || '',
    ...law.subcategories,
    ...law.tags,
  ]
    .join(' ')
    .toLowerCase()
    .includes(needle);
}

export default function LawLibrary({
  openLawId,
  openArticleNumber,
  onOpenLaw,
  onCloseReader,
  isAdmin = false,
  onAskAboutArticle,
}: LawLibraryProps) {
  const [categories, setCategories] = useState<LawLibraryCategory[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await getLawLibrary();
        if (!cancelled) setCategories(data);
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : 'The law library could not be loaded right now.',
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // A deep link from an AI answer selects the law's category automatically.
  useEffect(() => {
    if (!openLawId) return;
    const owner = categories.find((group) => group.laws.some((law) => law.id === openLawId));
    if (owner) setSelectedCategory(owner.category);
  }, [openLawId, categories]);

  const visibleCategories = useMemo(() => {
    return categories
      .map((group) => ({
        ...group,
        laws: group.laws.filter((law) => matchesSearch(law, searchQuery)),
      }))
      .filter((group) => group.laws.length > 0);
  }, [categories, searchQuery]);

  const activeGroup = useMemo(
    () => visibleCategories.find((group) => group.category === selectedCategory) ?? null,
    [visibleCategories, selectedCategory],
  );

  const totalLaws = categories.reduce((total, group) => total + group.laws.length, 0);

  const header = (
    <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-4 sm:px-6 sm:py-5">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900 sm:text-2xl">
            <BookOpen className="text-emerald-600" size={24} strokeWidth={2.25} />
            Rwanda Legal Library
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            {totalLaws > 0
              ? `${totalLaws} official ${totalLaws === 1 ? 'law' : 'laws'} stored by administrators. Open one to read the exact article text.`
              : 'Official Rwandan laws stored by administrators. Open one to read the exact article text.'}
          </p>
        </div>

        <div className="relative w-full lg:max-w-md">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Search by title, reference, or keyword..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 shadow-sm outline-none transition-all duration-200 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </div>
    </div>
  );

  const toggleCompare = (lawId: string) => {
    setCompareIds((current) => {
      if (current.includes(lawId)) return current.filter((id) => id !== lawId);
      // Two at a time: picking a third replaces the older selection.
      return current.length === 2 ? [current[1], lawId] : [...current, lawId];
    });
  };

  const compareBar = compareIds.length > 0 && (
    <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
      <p className="text-sm font-semibold text-emerald-900">
        {compareIds.length} of 2 selected to compare
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setCompareIds([])}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-white"
        >
          Clear
        </button>
        <button
          type="button"
          disabled={compareIds.length !== 2}
          onClick={() => setIsComparing(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ArrowLeftRight size={14} />
          Compare
        </button>
      </div>
    </div>
  );

  const body = isLoading ? (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-400">
      <Loader2 size={28} className="animate-spin" />
      <p className="text-sm font-medium">Loading the official laws…</p>
    </div>
  ) : error ? (
    <div className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
      <p className="text-sm font-bold text-amber-900">The law library is unavailable</p>
      <p className="mt-2 text-sm leading-6 text-amber-800">{error}</p>
    </div>
  ) : totalLaws === 0 ? (
    <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <BookOpen size={32} className="mx-auto text-slate-300" strokeWidth={1.75} />
      <p className="mt-4 text-base font-bold text-slate-900">No laws stored yet</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        An administrator uploads a legal PDF in <strong>Administrator / Law Ingestion</strong>. It is
        classified, split into articles, and appears here automatically.
      </p>
    </div>
  ) : activeGroup ? (
    <div>
      <button
        type="button"
        onClick={() => setSelectedCategory(null)}
        className="mb-6 inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-slate-500 transition-colors duration-200 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      >
        <X size={18} strokeWidth={2.25} />
        All categories
      </button>

      <div className="mb-6 flex items-center gap-3 sm:gap-4">
        {(() => {
          const tone = toneFor(activeGroup.category);
          const Icon = tone.Icon;
          return (
            <>
              <div className={cn('rounded-xl p-3', tone.icon)}>
                <Icon size={26} strokeWidth={2.25} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{activeGroup.category}</h2>
                <p className="text-sm text-slate-500">
                  {activeGroup.laws.length} {activeGroup.laws.length === 1 ? 'law' : 'laws'}
                </p>
              </div>
            </>
          );
        })()}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 2xl:grid-cols-3">
        {activeGroup.laws.map((law) => (
          <LawCard
            key={law.id}
            law={law}
            onOpen={onOpenLaw}
            isCompared={compareIds.includes(law.id)}
            onToggleCompare={toggleCompare}
          />
        ))}
      </div>
    </div>
  ) : visibleCategories.length === 0 ? (
    <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <p className="text-base font-bold text-slate-900">No match for “{searchQuery}”</p>
      <p className="mt-2 text-sm text-slate-500">Try a law number, a keyword, or a category name.</p>
    </div>
  ) : (
    <div>
      <h2 className="mb-6 text-lg font-bold text-slate-900">Browse Categories</h2>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visibleCategories.map((group) => {
          const tone = toneFor(group.category);
          const Icon = tone.Icon;
          return (
            <motion.button
              key={group.category}
              type="button"
              onClick={() => setSelectedCategory(group.category)}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -8 }}
              whileTap={{ scale: 0.985 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                'group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm outline-none transition-shadow duration-500 hover:shadow-[0_28px_60px_-24px_rgba(15,23,42,0.45)] focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
                tone.ring,
              )}
            >
              <span
                className={cn(
                  'absolute left-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-xl shadow-sm backdrop-blur transition-all duration-500 group-hover:scale-110',
                  tone.icon,
                )}
              >
                <Icon size={19} strokeWidth={2} />
              </span>

              <CardArtwork art={tone.art} className="h-40 w-full sm:h-48" />

              <div className="flex flex-1 flex-col p-5 sm:p-6">
                <h3 className="text-lg font-bold leading-snug text-slate-900">{group.category}</h3>
                <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-slate-500">
                  {group.laws.length} {group.laws.length === 1 ? 'law' : 'laws'} · every article
                  searchable and citable.
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-slate-400 transition-colors duration-300 group-hover:text-emerald-600">
                  Open category
                  <ChevronRight
                    size={14}
                    strokeWidth={2.5}
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  />
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="app-dark flex h-full min-h-0 flex-col bg-slate-50">
      <AnimatePresence mode="wait">
        {isComparing && compareIds.length === 2 ? (
          <motion.div
            key="compare"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex h-full min-h-0 flex-col overflow-y-auto bg-slate-50 p-4 sm:p-6"
          >
            <div className="mx-auto w-full max-w-6xl">
              <LawComparison
                lawIdA={compareIds[0]}
                lawIdB={compareIds[1]}
                onClose={() => setIsComparing(false)}
                onOpenLaw={onOpenLaw}
              />
            </div>
          </motion.div>
        ) : openLawId ? (
          <motion.div
            key="reader"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex h-full min-h-0 flex-col bg-white"
          >
            <LawReader
              lawId={openLawId}
              focusArticle={openArticleNumber ?? null}
              onBack={onCloseReader}
              onAskAboutArticle={onAskAboutArticle}
            />
          </motion.div>
        ) : (
          <motion.div
            key="browser"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex h-full min-h-0 flex-col"
          >
            {header}
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="mx-auto max-w-6xl">
                {compareBar}
                {body}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LawCard({
  law,
  onOpen,
  isCompared = false,
  onToggleCompare,
}: {
  law: LawLibraryEntry;
  onOpen: (lawId: string, articleNumber?: string | null) => void;
  isCompared?: boolean;
  onToggleCompare?: (lawId: string) => void;
}) {
  const tone = toneFor(law.category || '');
  const published = formatDate(law.publication_date);

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(law.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(law.id);
        }
      }}
      whileHover={{ y: -8 }}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm outline-none transition-shadow duration-500 hover:shadow-[0_28px_60px_-24px_rgba(15,23,42,0.45)] focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
        tone.ring,
      )}
    >
      <div className="relative">
        <CardArtwork art={tone.art} className="h-44 w-full sm:h-48" />

        <span
          className={cn(
            'absolute left-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-xl shadow-sm backdrop-blur transition-all duration-500 group-hover:scale-110',
            tone.icon,
          )}
        >
          <tone.Icon size={19} strokeWidth={2} />
        </span>

        {onToggleCompare && (
          <button
            type="button"
            aria-pressed={isCompared}
            aria-label={`Compare ${law.reference_number || law.title}`}
            onClick={(event) => {
              event.stopPropagation();
              onToggleCompare(law.id);
            }}
            className={cn(
              'absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur transition-all duration-300 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
              isCompared
                ? 'border-emerald-600 bg-emerald-600 text-white'
                : 'border-white/70 bg-white/85 text-slate-400 hover:border-emerald-400 hover:text-emerald-600',
            )}
          >
            <Check size={15} strokeWidth={3} />
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        {law.reference_number && (
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">
            {law.reference_number}
          </p>
        )}

        <h3 className="text-lg font-bold leading-snug text-slate-900">{law.title}</h3>

        {law.summary && (
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">{law.summary}</p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className={cn('rounded-md px-2 py-1 text-xs font-bold', tone.badge)}>
            {law.article_count} {law.article_count === 1 ? 'article' : 'articles'}
          </span>
          {law.type === 'amendment' && (
            <span className="rounded-md bg-violet-50 px-2 py-1 text-xs font-bold text-violet-700">
              Amendment
            </span>
          )}
          {law.status !== 'active' && (
            <span className="rounded-md bg-red-50 px-2 py-1 text-xs font-bold text-red-700">
              {law.status}
            </span>
          )}
          {published && (
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
              Published {published}
            </span>
          )}
          {law.subcategories.slice(0, 3).map((subcategory) => (
            <span
              key={subcategory}
              className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600"
            >
              {subcategory}
            </span>
          ))}
        </div>

        <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-slate-400 transition-colors duration-300 group-hover:text-emerald-600">
          Read the law
          <ChevronRight
            size={14}
            strokeWidth={2.5}
            className="transition-transform duration-300 group-hover:translate-x-1"
          />
        </span>
      </div>
    </motion.div>
  );
}

type ReaderTab = 'document' | 'summary' | 'articles';

function LawReader({
  lawId,
  focusArticle,
  onBack,
  onAskAboutArticle,
}: {
  lawId: string;
  focusArticle: string | null;
  onBack: () => void;
  onAskAboutArticle?: LawLibraryProps['onAskAboutArticle'];
}) {
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof import('@/app/legal-actions').getLawDetail>>>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<ReaderTab>('document');

  // Deep-linking to an article means the reader must open on the text.
  useEffect(() => {
    if (focusArticle) {
      setTab('articles');
    }
  }, [focusArticle]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    (async () => {
      try {
        const { getLawDetail } = await import('@/app/legal-actions');
        const data = await getLawDetail(lawId);
        if (!cancelled) {
          setDetail(data);
          setError(data ? '' : 'That law is no longer in the library.');
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : 'This law could not be opened.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [lawId]);

  useEffect(() => {
    if (!focusArticle || isLoading) return;
    const anchor = document.getElementById(anchorId(lawId, focusArticle));
    anchor?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [focusArticle, isLoading, lawId]);

  const tone = toneFor(detail?.category || '');
  const pdfUrl = detail?.pdf_url ?? null;
  const hasPdf = Boolean(pdfUrl);
  const articleCount = detail?.article_count ?? 0;

  const TABS: { key: ReaderTab; label: string; icon: ElementType }[] = [
    { key: 'document', label: 'Document', icon: FileText },
    { key: 'summary', label: 'Summary', icon: Layers },
    { key: 'articles', label: `Articles (${articleCount})`, icon: ScrollText },
  ];

  return (
    <>
      <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <button
            type="button"
            onClick={onBack}
            className="mb-3 inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-slate-500 transition-colors duration-200 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <X size={18} strokeWidth={2.25} />
            Back to the library
          </button>

          {detail && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn('rounded-md px-2 py-1 text-xs font-bold', tone.badge)}>
                  {detail.category || 'Uncategorised'}
                </span>
                {detail.type === 'amendment' && (
                  <span className="rounded-md bg-violet-50 px-2 py-1 text-xs font-bold text-violet-700">
                    Amendment{detail.amends_law_reference ? ` of ${detail.amends_law_reference}` : ''}
                  </span>
                )}
                {detail.status !== 'active' && (
                  <span className="rounded-md bg-red-50 px-2 py-1 text-xs font-bold text-red-700">
                    {detail.status}
                  </span>
                )}
                {detail.reference_number && (
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                    {detail.reference_number}
                  </span>
                )}
              </div>

              <h1 className="mt-3 text-xl font-bold leading-snug text-slate-900 sm:text-2xl">
                {detail.title}
              </h1>

              {detail.summary && (
                <p className="mt-2 text-sm leading-6 text-slate-600">{detail.summary}</p>
              )}

              {detail.source_url && (
                <a
                  href={detail.source_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 underline underline-offset-2 transition hover:text-emerald-900"
                >
                  Open the official source
                </a>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile: tabs across the top, one panel at a time. Desktop: the PDF
          sits beside the tab rail so the law and its explanation are read
          against each other. */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="shrink-0 border-b border-slate-200 bg-white lg:w-64 lg:border-b-0 lg:border-r">
          <div className="flex overflow-x-auto lg:flex-col">
            {TABS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                aria-selected={tab === item.key}
                role="tab"
                className={cn(
                  'flex shrink-0 items-center gap-2.5 border-b-2 px-4 py-3 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 lg:w-full lg:border-b-0 lg:border-r-2 lg:px-4 lg:text-left',
                  tab === item.key
                    ? 'border-emerald-600 bg-emerald-50/60 text-emerald-800'
                    : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900',
                )}
              >
                <item.icon size={16} strokeWidth={2.25} className="shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </div>

          {hasPdf && (
            <div className="hidden border-t border-slate-200 p-4 lg:block">
              <a
                href={pdfUrl as string}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition-all duration-200 hover:-translate-y-px hover:border-emerald-400 hover:text-emerald-700 hover:shadow-md"
              >
                <ExternalLink size={14} strokeWidth={2.25} />
                Open full PDF
              </a>
              {detail?.source_pdf_name && (
                <p className="mt-2 truncate text-xs text-slate-400" title={detail.source_pdf_name}>
                  {detail.source_pdf_name}
                </p>
              )}
            </div>
          )}
        </aside>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50">
          {isLoading ? (
            <div className="flex flex-col items-center gap-3 py-20 text-slate-400">
              <Loader2 size={28} className="animate-spin" />
              <p className="text-sm font-medium">Opening the law…</p>
            </div>
          ) : error ? (
            <div className="mx-auto max-w-xl p-6">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
                <p className="text-sm font-bold text-amber-900">{error}</p>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-0 flex-col">
              {/* Document pane */}
              {tab === 'document' && (
                <div className="flex h-full min-h-0 flex-1 flex-col p-4">
                  {hasPdf ? (
                    <object
                      data={`${pdfUrl}#view=FitH`}
                      type="application/pdf"
                      className="min-h-[70vh] w-full flex-1 rounded-2xl border border-slate-200 bg-white shadow-sm"
                      aria-label={`Original PDF of ${detail?.title ?? 'the law'}`}
                    >
                      {/* Browsers without a built-in PDF viewer land here. */}
                      <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center">
                        <FileText size={32} className="text-slate-300" />
                        <p className="text-sm text-slate-500">
                          Your browser cannot display this PDF inline.
                        </p>
                        <a
                          href={pdfUrl as string}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white"
                        >
                          Open the PDF
                        </a>
                      </div>
                    </object>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                      <FileText size={30} className="mx-auto text-slate-300" />
                      <p className="mt-4 text-base font-bold text-slate-900">
                        No original PDF stored
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        This law was indexed from text only. Re-upload the PDF from{' '}
                        <strong>Administrator / Law Ingestion</strong> to keep the original
                        document here.
                      </p>
                      {detail?.source_url && (
                        <a
                          href={detail.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 underline underline-offset-2"
                        >
                          <ExternalLink size={14} strokeWidth={2.25} />
                          Open the official source
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}

              {tab === 'summary' && detail && (
                <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
                  {detail.summary && (
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-emerald-700">
                        Summary
                      </h3>
                      <p className="text-[15px] leading-7 text-slate-700">{detail.summary}</p>
                    </section>
                  )}

                  {detail.key_obligations.length > 0 && (
                    <SummaryList title="Key obligations" items={detail.key_obligations} />
                  )}
                  {detail.applicable_entities.length > 0 && (
                    <SummaryList title="Who it applies to" items={detail.applicable_entities} />
                  )}
                  {detail.penalties_non_compliance.length > 0 && (
                    <SummaryList
                      title="Penalties for non-compliance"
                      items={detail.penalties_non_compliance}
                      tone="rose"
                    />
                  )}
                  {detail.affected_articles.length > 0 && (
                    <SummaryList title="Articles affected" items={detail.affected_articles} />
                  )}
                  {detail.repealed_articles.length > 0 && (
                    <SummaryList title="Repealed articles" items={detail.repealed_articles} tone="rose" />
                  )}
                  {detail.inserted_articles.length > 0 && (
                    <SummaryList title="Inserted articles" items={detail.inserted_articles} tone="emerald" />
                  )}
                  {Object.keys(detail.retroactive_effective_date).length > 0 && (
                    <SummaryList
                      title="Applied retroactively from"
                      items={Object.entries(detail.retroactive_effective_date).map(
                        ([article, date]) => `${article} — ${date}`,
                      )}
                      tone="amber"
                    />
                  )}
                  {detail.subcategories.length > 0 && (
                    <SummaryList title="Subcategories" items={detail.subcategories} />
                  )}
                </div>
              )}

              {tab === 'articles' && (
                <div className="mx-auto max-w-3xl p-4 sm:p-6">
                  {detail && detail.articles.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                      <p className="text-base font-bold text-slate-900">No articles indexed yet</p>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        Re-upload the PDF from the administration workspace to split this law into
                        articles.
                      </p>
                    </div>
                  ) : (
                    <ol className="space-y-3">
                      {detail?.articles.map((article) => {
                        const isPreamble = article.chunk_type === 'preamble';
                        return (
                          <li
                            key={article.id}
                            id={anchorId(lawId, article.article_number)}
                            className="scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={cn(
                                  'rounded-lg px-2.5 py-1 text-xs font-bold',
                                  isPreamble ? 'bg-slate-100 text-slate-700' : tone.badge,
                                )}
                              >
                                {isPreamble
                                  ? 'Front matter'
                                  : `Article ${article.article_number}`}
                              </span>
                              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-600">
                                {article.language}
                              </span>
                            </div>

                            {article.article_title && !isPreamble && (
                              <h2 className="mt-3 text-base font-bold text-slate-900">
                                {article.article_title}
                              </h2>
                            )}

                            {onAskAboutArticle && !isPreamble && (
                              <button
                                type="button"
                                onClick={() =>
                                  onAskAboutArticle({
                                    prompt: `Explain Article ${article.article_number} of ${
                                      detail?.reference_number || detail?.title || 'this law'
                                    } in simple words, and tell me what it means for me.`,
                                    lawId,
                                    lawTitle: detail?.title || '',
                                    referenceNumber: detail?.reference_number ?? null,
                                    articleNumber: article.article_number,
                                    text: article.content,
                                  })
                                }
                                className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 transition-all duration-200 hover:-translate-y-px hover:bg-emerald-100 hover:shadow-sm"
                              >
                                <MessageSquareText size={13} strokeWidth={2.25} />
                                Ask Rengera about this article
                              </button>
                            )}

                            <p className="mt-3 whitespace-pre-wrap text-[15px] leading-7 text-slate-700">
                              {article.content}
                            </p>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function SummaryList({
  title,
  items,
  tone = 'slate',
}: {
  title: string;
  items: string[];
  tone?: 'slate' | 'emerald' | 'rose' | 'amber';
}) {
  const dot = {
    slate: 'bg-slate-400',
    emerald: 'bg-emerald-500',
    rose: 'bg-rose-500',
    amber: 'bg-amber-500',
  }[tone];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">{title}</h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-[15px] leading-6 text-slate-700">
            <span className={cn('mt-2 h-1.5 w-1.5 shrink-0 rounded-full', dot)} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function anchorId(lawId: string, articleNumber: string): string {
  const safeLaw = lawId.replace(/[^a-zA-Z0-9]/g, '');
  const safeArticle = articleNumber.replace(/[^a-zA-Z0-9]/g, '-');
  return `law-${safeLaw}-article-${safeArticle}`;
}
