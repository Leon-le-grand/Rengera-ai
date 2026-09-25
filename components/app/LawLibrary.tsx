'use client';
import { useState } from 'react';
import { Search, Book, Briefcase, Home, Users, Car, Shield, FileText, Map, ChevronRight, X } from 'lucide-react';

const CATEGORIES = [
  { id: 'labour', name: 'Labour', icon: Briefcase, color: 'text-blue-500', bg: 'bg-blue-100', desc: 'Employment rights, contracts, dismissals' },
  { id: 'housing', name: 'Housing', icon: Home, color: 'text-emerald-500', bg: 'bg-emerald-100', desc: 'Tenancy, eviction, property rental' },
  { id: 'family', name: 'Family', icon: Users, color: 'text-purple-500', bg: 'bg-purple-100', desc: 'Marriage, divorce, inheritance' },
  { id: 'traffic', name: 'Traffic', icon: Car, color: 'text-amber-500', bg: 'bg-amber-100', desc: 'Road rules, fines, accidents' },
  { id: 'business', name: 'Business', icon: FileText, color: 'text-indigo-500', bg: 'bg-indigo-100', desc: 'Registration, taxes, corporate law' },
  { id: 'cybercrime', name: 'Cybercrime', icon: Shield, color: 'text-rose-500', bg: 'bg-rose-100', desc: 'Online fraud, data theft' },
  { id: 'privacy', name: 'Privacy', icon: Shield, color: 'text-teal-500', bg: 'bg-teal-100', desc: 'Data protection, personal rights' },
  { id: 'land', name: 'Land', icon: Map, color: 'text-orange-500', bg: 'bg-orange-100', desc: 'Ownership, transfer, disputes' }
];

export default function LawLibrary() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50">
      <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-4 sm:px-6 sm:py-5">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900 sm:text-2xl">
              <Book className="text-emerald-600" size={24} />
              Rwanda Legal Library
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              Browse simplified versions of official Rwandan laws. Search by topic, category, or keyword.
            </p>
          </div>

          <div className="relative w-full lg:max-w-md">
            <input
              type="text"
              placeholder="Search laws or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-6xl">
          {selectedCategory ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <button 
                onClick={() => setSelectedCategory(null)}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-6 font-medium transition-colors"
              >
                <X size={18} /> Back to Categories
              </button>
              
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                <div className="mb-5 flex items-center gap-3 sm:gap-4">
                  {(() => {
                    const cat = CATEGORIES.find(c => c.id === selectedCategory);
                    if (!cat) return null;
                    const Icon = cat.icon;
                    return (
                      <>
                        <div className={`rounded-xl p-3 ${cat.bg} ${cat.color}`}>
                          <Icon size={26} />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-slate-900">{cat.name} Law</h2>
                          <p className="text-sm text-slate-500">{cat.desc}</p>
                        </div>
                      </>
                    )
                  })()}
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 border border-slate-200 rounded-xl hover:border-emerald-500 cursor-pointer transition-colors group">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-slate-900 text-lg">Law N° 66/2018 of 30/08/2018 regulating labour in Rwanda</h3>
                      <ChevronRight className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
                    </div>
                    <p className="text-sm text-slate-500 mt-2">Published: Official Gazette n° Special of 06/09/2018</p>
                    <div className="mt-4 flex gap-2">
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">Contracts</span>
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">Leave</span>
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">Termination</span>
                    </div>
                  </div>
                  
                  <div className="p-4 border border-slate-200 rounded-xl hover:border-emerald-500 cursor-pointer transition-colors group">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-slate-900 text-lg">Law N° 02/2015 of 25/02/2015 modifying and complementing Law n° 13/2009 of 27/05/2009</h3>
                      <ChevronRight className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
                    </div>
                    <p className="text-sm text-slate-500 mt-2">Maternity leave benefits and regulations.</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="mb-4 text-lg font-bold text-slate-900">Browse Categories</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {CATEGORIES.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className="group flex flex-col rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-emerald-500 hover:shadow-md"
                  >
                    <div className={`mb-3 w-fit rounded-lg p-2.5 ${category.bg} ${category.color} transition-transform group-hover:scale-105`}>
                      <category.icon size={21} />
                    </div>
                    <h3 className="mb-1 text-base font-bold text-slate-900">{category.name}</h3>
                    <p className="line-clamp-2 text-xs leading-5 text-slate-500">{category.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
