'use client';

import { Database, FileJson } from 'lucide-react';
import SupabaseLawClassifier from './SupabaseLawClassifier';

export default function AdminDashboard() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-8">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          <Database size={24} />
        </div>
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700">
            <FileJson size={14} />
            Supabase legal knowledge base
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950">Upload and classify official law</h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Upload one PDF. RENGERA AI extracts and classifies the metadata, preserves the full extracted text, and stores everything in Supabase.
          </p>
        </div>
      </div>

      <SupabaseLawClassifier />
    </div>
  );
}
