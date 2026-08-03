'use client';

import { useState } from 'react';
import { processNewLaw } from '@/app/admin-actions';
import { Upload, FileText, Database, ShieldCheck, Loader2 } from 'lucide-react';

export default function AdminDashboard() {
  const [formData, setFormData] = useState({
    title: '',
    category: 'labour',
    date: '',
    language: 'kinyarwanda',
    rawText: ''
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; count?: number; error?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await processNewLaw(formData);
      setResult(res);
      if (res.success) {
        setFormData({ title: '', category: 'labour', date: '', language: 'kinyarwanda', rawText: '' });
      }
    } catch (err: any) {
      setResult({ success: false, error: err.message });
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
          <p className="text-slate-500">Add new laws to the Rengera RAG Database</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
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
                  value={formData.date}
                  onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
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
                  <option value="kinyarwanda">Kinyarwanda</option>
                  <option value="english">English</option>
                  <option value="french">French</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Raw Legal Text (Paste document contents)</label>
              <textarea 
                required
                rows={12}
                placeholder="Paste the raw text of the law here. The AI pipeline will automatically extract articles, generate semantic embeddings, and index them in the vector database."
                value={formData.rawText}
                onChange={e => setFormData(prev => ({ ...prev, rawText: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
              {loading ? 'Processing via AI Pipeline...' : 'Process and Index Law'}
            </button>
            
            {result && (
              <div className={`p-4 rounded-lg text-sm font-medium ${result.success ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
                {result.success 
                  ? `Successfully processed law and extracted ${result.count} articles into the semantic vector database.`
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
                 <span className="text-slate-300 font-mono text-xs">gemini-embedding-2</span>
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
                 Text is passed to the Gemini 3.1 Pro context extraction model.
               </li>
               <li className="flex gap-2">
                 <span className="text-amber-500 font-bold">2.</span>
                 The model segments the text into individual distinct articles.
               </li>
               <li className="flex gap-2">
                 <span className="text-amber-500 font-bold">3.</span>
                 High-dimensional vector embeddings are generated for each article.
               </li>
               <li className="flex gap-2">
                 <span className="text-amber-500 font-bold">4.</span>
                 Articles and embeddings are saved, allowing the RAG system to query them instantly.
               </li>
             </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
