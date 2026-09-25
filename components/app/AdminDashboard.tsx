'use client';

import { useState } from 'react';
import { processNewLaw } from '@/app/admin-actions';
import { Upload, Database, ShieldCheck, Loader2, Link } from 'lucide-react';

const RLRC_LABOUR_QUEUE = [
  {
    fileName: '9.7.1._Labour__Law_n___66_of_2018.pdf',
    title: 'Law N° 66/2018 of 30/08/2018 regulating labour in Rwanda',
    lawNumber: '66/2018',
  },
  {
    fileName: '9.7.2.Labor_in_Rwanda___law_no_027_of_2023_amend.pdf',
    title: 'Law N° 027/2023 amending the labour law in Rwanda',
    lawNumber: '027/2023',
  },
  {
    fileName: '9.7.5.__Written_employment_contract_M.O_no_007.19.20_of_2020.pdf',
    title: 'Ministerial Order N° 007/19.20 of 2020 relating to written employment contracts',
    lawNumber: '007/19.20',
  },
];

export default function AdminDashboard() {
  const [formData, setFormData] = useState({
    title: '',
    lawNumber: '',
    category: 'labour',
    publicationDate: '',
    effectiveDate: '',
    sourceUrl: '',
    language: 'english',
    status: 'in_force',
    rawText: ''
  });
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; count?: number; amendments?: number; lawTitle?: string; error?: string } | null>(null);

  const applyQueueItem = (item: typeof RLRC_LABOUR_QUEUE[number]) => {
    setFormData(prev => ({
      ...prev,
      title: item.title,
      lawNumber: item.lawNumber,
      category: 'labour',
      language: 'english',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const payload = new FormData();
      Object.entries(formData).forEach(([key, value]) => payload.append(key, value));
      if (pdfFile) payload.append('pdf', pdfFile);

      const res = await processNewLaw(payload);
      setResult(res);
      if (res.success) {
        setFormData({
          title: '',
          lawNumber: '',
          category: 'labour',
          publicationDate: '',
          effectiveDate: '',
          sourceUrl: '',
          language: 'english',
          status: 'in_force',
          rawText: '',
        });
        setPdfFile(null);
      }
    } catch (err: unknown) {
      setResult({ success: false, error: err instanceof Error ? err.message : 'Unknown ingestion error.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
          <Database size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Legal Data Ingestion</h1>
          <p className="text-slate-500">Upload official RLRC PDFs and index article-level citations</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">First RLRC labour sources</h2>
            <div className="mt-3 space-y-2">
              {RLRC_LABOUR_QUEUE.map(item => (
                <button
                  key={item.fileName}
                  type="button"
                  onClick={() => applyQueueItem(item)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-amber-300 hover:bg-amber-50"
                >
                  <span className="block text-sm font-semibold text-slate-900">{item.title}</span>
                  <span className="block text-xs text-slate-500">{item.fileName}</span>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Law Title</label>
                <input 
                  required
                  type="text"
                  placeholder="e.g. Law N° 66/2018 regulating labour..."
                  value={formData.title}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Law Number</label>
                <input
                  type="text"
                  placeholder="e.g. 66/2018 or 027/2023"
                  value={formData.lawNumber}
                  onChange={e => setFormData(prev => ({ ...prev, lawNumber: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Category</label>
                <select 
                  value={formData.category}
                  onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="labour">Labour & Employment</option>
                  <option value="housing">Housing & Rent</option>
                  <option value="business">Business & Corporate</option>
                  <option value="family">Family & Marriage</option>
                  <option value="criminal">Criminal Law</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Publication Date</label>
                <input 
                  required
                  type="date"
                  value={formData.publicationDate}
                  onChange={e => setFormData(prev => ({ ...prev, publicationDate: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Effective Date</label>
                <input
                  type="date"
                  value={formData.effectiveDate}
                  onChange={e => setFormData(prev => ({ ...prev, effectiveDate: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Language</label>
                <select 
                  value={formData.language}
                  onChange={e => setFormData(prev => ({ ...prev, language: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="english">English</option>
                  <option value="kinyarwanda">Kinyarwanda</option>
                  <option value="french">French</option>
                  <option value="multi">Multilingual Gazette</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">RLRC Source URL</label>
                <div className="relative">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    required
                    type="url"
                    placeholder="https://www.rlrc.gov.rw/index.php?eID=dumpFile..."
                    value={formData.sourceUrl}
                    onChange={e => setFormData(prev => ({ ...prev, sourceUrl: e.target.value }))}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Status</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="in_force">In force</option>
                  <option value="amended">Amended</option>
                  <option value="repealed">Repealed</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Official RLRC PDF</label>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-amber-300 bg-amber-50/50 px-4 py-6 text-center transition hover:bg-amber-50">
                <Upload className="mb-2 text-amber-600" size={24} />
                <span className="text-sm font-semibold text-slate-800">
                  {pdfFile ? pdfFile.name : 'Choose an official PDF'}
                </span>
                <span className="mt-1 text-xs text-slate-500">PDF text is extracted locally before embeddings are generated.</span>
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={event => setPdfFile(event.target.files?.[0] || null)}
                />
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Fallback Official Text</label>
              <textarea 
                rows={12}
                placeholder="Optional fallback if PDF extraction is not available. Paste official extracted text only, not an AI summary."
                value={formData.rawText}
                onChange={e => setFormData(prev => ({ ...prev, rawText: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading || (!pdfFile && !formData.rawText.trim())}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
              {loading ? 'Extracting PDF and indexing...' : 'Process Official Source'}
            </button>
            
            {result && (
              <div className={`p-4 rounded-lg text-sm font-medium ${result.success ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
                {result.success 
                  ? `Successfully indexed ${result.count} articles from ${result.lawTitle}. Amendment links detected: ${result.amendments || 0}.`
                  : `Error: ${result.error}`}
              </div>
            )}
          </form>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-sm">
             <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
               <ShieldCheck className="text-emerald-400" size={20} />
               Security & Access
             </h3>
             <p className="text-sm text-slate-400 leading-relaxed mb-4">
               The ingestion pipeline currently connects to our semantic vector store. 
               Only authenticated data officers can commit new laws.
             </p>
             <div className="space-y-2">
               <div className="flex items-center justify-between text-sm border-b border-slate-800 pb-2">
                 <span className="text-slate-500">Pipeline Status</span>
                 <span className="text-emerald-400 font-medium">Active</span>
               </div>
               <div className="flex items-center justify-between text-sm border-b border-slate-800 pb-2">
                 <span className="text-slate-500">Embedding Model</span>
                 <span className="text-slate-300 font-mono text-xs">SPACE_BUNNY_EMBEDDING_MODEL</span>
               </div>
               <div className="flex items-center justify-between text-sm pb-2">
                 <span className="text-slate-500">Storage</span>
                 <span className="text-slate-300 font-mono text-xs">Vector DB</span>
               </div>
             </div>
          </div>
          
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
             <h3 className="text-md font-bold text-slate-900 mb-2">How it works</h3>
             <ul className="text-sm text-slate-600 space-y-3">
               <li className="flex gap-2">
                 <span className="text-amber-500 font-bold">1.</span>
                 Official RLRC PDF text is extracted first and treated as the source of truth.
               </li>
               <li className="flex gap-2">
                 <span className="text-amber-500 font-bold">2.</span>
                 Rengera identifies law metadata, article headings, and amendment references.
               </li>
               <li className="flex gap-2">
                 <span className="text-amber-500 font-bold">3.</span>
                 Space Bunny embeddings are generated for each official article text when configured.
               </li>
               <li className="flex gap-2">
                 <span className="text-amber-500 font-bold">4.</span>
                 Answers cite the article, law number, and source URL used by retrieval.
               </li>
             </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
