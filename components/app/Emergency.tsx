'use client';
import { ShieldAlert, Phone, MapPin, ExternalLink, Search } from 'lucide-react';
import { useState } from 'react';

const CONTACTS = [
  {
    id: 1,
    name: 'Rwanda Investigation Bureau (RIB)',
    description: 'For reporting crimes, fraud, and severe legal violations.',
    phone: '166',
    altPhone: '+250 788 311 152',
    category: 'Police & Investigation',
    tags: ['crime', 'fraud', 'theft', 'assault']
  },
  {
    id: 2,
    name: 'Rwanda National Police (RNP)',
    description: 'For immediate emergency assistance, traffic accidents, and security.',
    phone: '112',
    altPhone: '113 (Traffic)',
    category: 'Police & Investigation',
    tags: ['emergency', 'traffic', 'accident', 'security']
  },
  {
    id: 3,
    name: 'MAJ (Access to Justice)',
    description: 'Free legal advice and assistance for citizens at the district level.',
    phone: 'Find your district MAJ',
    category: 'Legal Aid',
    tags: ['free lawyer', 'advice', 'district', 'civil']
  },
  {
    id: 4,
    name: 'National Cyber Security Authority (NCSA)',
    description: 'For reporting cyber incidents, data breaches, and online fraud.',
    phone: '4045',
    category: 'Cyber & Data',
    tags: ['cybercrime', 'hacking', 'privacy', 'online']
  },
  {
    id: 5,
    name: 'Ministry of Public Service and Labour (MIFOTRA)',
    description: 'For reporting severe labor violations and workplace issues.',
    phone: '4455',
    category: 'Labour & Employment',
    tags: ['work', 'employer', 'salary', 'contract']
  },
  {
    id: 6,
    name: 'Isange One Stop Center',
    description: 'Support and justice for victims of gender-based violence and child abuse.',
    phone: '3029',
    category: 'Social Support',
    tags: ['gbv', 'abuse', 'violence', 'women', 'children']
  }
];

export default function Emergency() {
  const [search, setSearch] = useState('');

  const filteredContacts = CONTACTS.filter(contact => 
    contact.name.toLowerCase().includes(search.toLowerCase()) ||
    contact.tags.some(tag => tag.includes(search.toLowerCase())) ||
    contact.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-red-50 border-b border-red-100 px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold text-red-700 mb-4 flex items-center gap-3">
            <ShieldAlert size={32} />
            Emergency & Official Services
          </h1>
          <p className="text-red-900/80 text-lg mb-6 max-w-2xl">
            Quick access to official authorities in Rwanda. If you are in immediate danger, dial 112 immediately.
          </p>
          
          <div className="relative max-w-2xl">
            <input 
              type="text"
              placeholder="Describe your issue (e.g., 'car accident', 'unpaid salary', 'cybercrime')..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border border-red-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-shadow text-slate-900 shadow-sm"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredContacts.map(contact => (
            <div key={contact.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-red-300 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 block">
                    {contact.category}
                  </span>
                  <h2 className="text-xl font-bold text-slate-900">{contact.name}</h2>
                </div>
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center shrink-0">
                  <Phone size={24} />
                </div>
              </div>
              
              <p className="text-slate-500 text-sm mb-6 min-h-[40px]">
                {contact.description}
              </p>
              
              <div className="bg-slate-50 rounded-xl p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">Primary Number:</span>
                  <span className="font-bold text-lg text-slate-900">{contact.phone}</span>
                </div>
                {contact.altPhone && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-600">Alternative:</span>
                    <span className="font-semibold text-slate-900">{contact.altPhone}</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {filteredContacts.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500">
              No specific authorities found for your search. For general emergencies, please dial 112.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
