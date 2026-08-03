'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-8 md:py-10">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900 mb-4 flex items-center gap-3">
            <Book className="text-emerald-600" size={32} />
            Rwanda Legal Library
          </h1>
          <p className="text-slate-500 text-lg mb-8 max-w-2xl">
            Browse simplified versions of official Rwandan laws. Search by topic, category, or keyword.
          </p>
          
          <div className="relative max-w-2xl">
            <input 
              type="text"
              placeholder="Search laws (e.g., 'maternity leave', 'eviction notice')..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow text-slate-900 shadow-sm"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto">
          {selectedCategory ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <button 
                onClick={() => setSelectedCategory(null)}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-6 font-medium transition-colors"
              >
                <X size={18} /> Back to Categories
              </button>
              
              <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4 mb-6">
                  {(() => {
                    const cat = CATEGORIES.find(c => c.id === selectedCategory);
                    if (!cat) return null;
                    const Icon = cat.icon;
                    return (
                      <>
                        <div className={`p-4 rounded-xl ${cat.bg} ${cat.color}`}>
                          <Icon size={32} />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-slate-900">{cat.name} Law</h2>
                          <p className="text-slate-500">{cat.desc}</p>
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
              <h2 className="text-xl font-bold text-slate-900 mb-6">Browse Categories</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {CATEGORIES.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className="flex flex-col text-left p-5 bg-white border border-slate-200 rounded-2xl hover:border-emerald-500 hover:shadow-md transition-all group"
                  >
                    <div className={`p-3 rounded-xl ${category.bg} ${category.color} w-fit mb-4 group-hover:scale-110 transition-transform`}>
                      <category.icon size={24} />
                    </div>
                    <h3 className="font-bold text-slate-900 text-lg mb-1">{category.name}</h3>
                    <p className="text-sm text-slate-500 line-clamp-2">{category.desc}</p>
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
