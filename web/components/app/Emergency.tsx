'use client';
import { ShieldAlert, Phone, Search, ClipboardCheck, Clock, Users } from 'lucide-react';
import { useState } from 'react';
import { UI_STRINGS } from '@/lib/answer-language';
import { useStoredLanguage } from '@/components/chat/LanguageMenu';

const CONTACTS = [
  {
    id: 1,
    name: 'Rwanda Investigation Bureau (RIB)',
    phone: '166',
    altPhone: '+250 788 311 152',
    descriptionKey: 'rib',
    categoryKey: 'police',
    tags: ['crime', 'fraud', 'theft', 'assault']
  },
  {
    id: 2,
    name: 'Rwanda National Police (RNP)',
    phone: '112',
    altPhone: '113 (Traffic)',
    descriptionKey: 'rnp',
    categoryKey: 'police',
    tags: ['emergency', 'traffic', 'accident', 'security']
  },
  {
    id: 3,
    name: 'MAJ (Access to Justice)',
    phone: 'Find your district MAJ',
    descriptionKey: 'maj',
    categoryKey: 'legalAid',
    altPhone: null,
    tags: ['free lawyer', 'advice', 'district', 'civil']
  },
  {
    id: 4,
    name: 'National Cyber Security Authority (NCSA)',
    phone: '4045',
    descriptionKey: 'ncsa',
    categoryKey: 'cyber',
    altPhone: null,
    tags: ['cybercrime', 'hacking', 'privacy', 'online']
  },
  {
    id: 5,
    name: 'Ministry of Public Service and Labour (MIFOTRA)',
    phone: '4455',
    descriptionKey: 'mifotra',
    categoryKey: 'labour',
    altPhone: null,
    tags: ['work', 'employer', 'salary', 'contract']
  },
  {
    id: 6,
    name: 'Isange One Stop Center',
    phone: '3029',
    descriptionKey: 'isange',
    categoryKey: 'socialSupport',
    altPhone: null,
    tags: ['gbv', 'abuse', 'violence', 'women', 'children']
  }
 ] as const;

const URGENT_FLOW_KEYS = [
  {
    id: 'immediateDanger',
    icon: ShieldAlert,
  },
  {
    id: 'reportIssue',
    icon: ClipboardCheck,
  },
  {
    id: 'gbv',
    icon: Users,
  },
  {
    id: 'workplace',
    icon: Clock,
  },
] as const;

export default function Emergency() {
  const [search, setSearch] = useState('');
  const [language] = useStoredLanguage();
  const strings = UI_STRINGS[language];

  const filteredContacts = CONTACTS.filter(contact => 
    contact.name.toLowerCase().includes(search.toLowerCase()) ||
    contact.tags.some(tag => tag.includes(search.toLowerCase())) ||
    strings.emergencyContactDescriptions[contact.descriptionKey].toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="app-surface flex h-full flex-col">
      <div className="app-surface border-b border-slate-200 px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6 border p-4 sm:p-5" style={{ borderColor: 'var(--app-danger-border)', backgroundColor: 'var(--app-danger-bg)' }}>
            <h1 className="mb-2 flex items-center gap-3 text-2xl font-bold" style={{ color: 'var(--app-danger-text)' }}>
              <ShieldAlert size={28} />
              {strings.emergencyPageTitle}
            </h1>
            <p className="max-w-3xl text-sm leading-6" style={{ color: 'var(--app-danger-text)', opacity: 0.88 }}>
              {strings.emergencyPageIntro}
            </p>
            <a href="tel:112" className="mt-4 inline-flex min-h-11 items-center gap-2 border px-4 text-sm font-semibold transition-colors hover:brightness-95" style={{ borderColor: 'var(--app-danger-border)', color: 'var(--app-danger-text)' }}>
              <Phone size={16} />
              {strings.call112}
            </a>
          </div>
          
          <div className="relative max-w-2xl">
            <label htmlFor="rengera-emergency-search" className="sr-only">{strings.searchContactsLabel}</label>
            <input 
              id="rengera-emergency-search"
              type="text"
              placeholder={strings.searchContactsPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 text-slate-900 transition-shadow focus:border-[#d8b485] focus:ring-2 focus:ring-[#d8b485]/30"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <section>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">{strings.whatToDoNow}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {URGENT_FLOW_KEYS.map(({ id, icon: FlowIcon }) => {
                const flow = strings.emergencyFlows[id];
                return <div key={id} className="border border-slate-200 bg-white p-5">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-slate-950">{flow.title}</h3>
                      <p className="mt-1 text-sm font-semibold text-[#d8b485]">{flow.route}</p>
                    </div>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-[#d8b485]/30 text-[#d8b485]">
                      <FlowIcon size={20} />
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {flow.steps.map(step => (
                      <li key={step} className="flex gap-2 text-sm leading-5 text-slate-600">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#d8b485]" />
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>;
              })}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">{strings.officialContactsHeading}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredContacts.map(contact => (
            <div key={contact.id} className="border border-slate-200 bg-white p-5 transition-colors hover:border-red-500/40">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 block">
                    {strings.emergencyContactCategories[contact.categoryKey]}
                  </span>
                  <h2 className="text-xl font-bold text-slate-900">{contact.name}</h2>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-[#d8b485]/30 text-[#d8b485]">
                  <Phone size={24} />
                </div>
              </div>
              
              <p className="text-slate-500 text-sm mb-6 min-h-[40px]">
                {strings.emergencyContactDescriptions[contact.descriptionKey]}
              </p>
              
              <div className="flex flex-col gap-2 border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-600">{strings.primaryNumberLabel}:</span>
                  <span className="font-bold text-lg text-slate-900">{contact.phone}</span>
                </div>
                {contact.altPhone && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-600">{strings.alternativeNumberLabel}:</span>
                    <span className="font-semibold text-slate-900">{contact.altPhone}</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {filteredContacts.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500">
              {strings.noContactsFound} {strings.generalEmergencyNote}
            </div>
          )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
