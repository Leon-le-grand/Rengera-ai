'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Building, Users, FileText, AlertTriangle, 
  TrendingUp, CheckCircle, Clock, ShieldAlert,
  ArrowRight, Briefcase
} from 'lucide-react';

export default function BusinessDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'hr' | 'contracts' | 'reports'>('overview');

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Briefcase className="text-blue-600" size={24} />
            Kigali Tech Hub Ltd.
          </h1>
          <p className="text-slate-500 mt-1">Enterprise Compliance Dashboard</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold uppercase tracking-wider">
            Active Subscription
          </span>
          <button className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">
            Generate Report
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'hr', label: 'HR & Employees' },
          { id: 'contracts', label: 'Contract Analysis' },
          { id: 'reports', label: 'Compliance Reports' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                  <TrendingUp size={20} />
                </div>
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">+2%</span>
              </div>
              <div className="text-2xl font-bold text-slate-900">98%</div>
              <div className="text-sm text-slate-500 font-medium">Overall Compliance Score</div>
            </div>
            
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <Users size={20} />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900">42</div>
              <div className="text-sm text-slate-500 font-medium">Active Employees</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                  <AlertTriangle size={20} />
                </div>
                <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">Requires Action</span>
              </div>
              <div className="text-2xl font-bold text-slate-900">2</div>
              <div className="text-sm text-slate-500 font-medium">Pending Contract Reviews</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <FileText size={20} />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900">12</div>
              <div className="text-sm text-slate-500 font-medium">Active Policies</div>
            </div>
          </div>

          {/* Activity & Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Recent Alerts & Updates</h3>
              <div className="space-y-4">
                <div className="flex gap-4 p-4 rounded-xl bg-amber-50 border border-amber-100">
                  <ShieldAlert className="text-amber-600 shrink-0 mt-0.5" size={20} />
                  <div>
                    <h4 className="font-semibold text-slate-900 text-sm">New Data Privacy Regulations (Law N° 058/2021)</h4>
                    <p className="text-slate-600 text-sm mt-1 mb-2">You need to update your employee data collection consent forms by Oct 15.</p>
                    <button className="text-amber-700 text-sm font-medium hover:underline flex items-center gap-1">
                      Update Forms Now <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
                
                <div className="flex gap-4 p-4 rounded-xl border border-slate-100">
                  <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={20} />
                  <div>
                    <h4 className="font-semibold text-slate-900 text-sm">Maternity Leave Policy Updated</h4>
                    <p className="text-slate-500 text-sm mt-1">Automatically updated to reflect current RSSB guidelines.</p>
                  </div>
                </div>

                <div className="flex gap-4 p-4 rounded-xl border border-slate-100">
                  <Clock className="text-slate-400 shrink-0 mt-0.5" size={20} />
                  <div>
                    <h4 className="font-semibold text-slate-900 text-sm">Tax Filing Deadline Approaching</h4>
                    <p className="text-slate-500 text-sm mt-1">PAYE returns are due in 4 days (15th of the month).</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
               <h3 className="text-lg font-bold text-slate-900 mb-6">Quick Actions</h3>
               <div className="grid grid-cols-2 gap-4">
                 {[
                   { title: 'Draft NDA', desc: 'Create a non-disclosure agreement', icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                   { title: 'HR Dispute', desc: 'Ask the AI about employee termination', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
                   { title: 'Analyze Contract', desc: 'Upload vendor contract for risks', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
                   { title: 'Generate Policy', desc: 'Create remote work policy', icon: Building, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                 ].map((action, i) => (
                   <button key={i} className="flex flex-col items-start text-left p-4 rounded-xl border border-slate-100 hover:border-slate-300 hover:shadow-sm transition-all group">
                     <div className={`w-10 h-10 rounded-lg ${action.bg} ${action.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                       <action.icon size={20} />
                     </div>
                     <span className="font-semibold text-slate-900 text-sm">{action.title}</span>
                     <span className="text-xs text-slate-500 mt-1">{action.desc}</span>
                   </button>
                 ))}
               </div>
            </div>

          </div>
        </motion.div>
      )}

      {activeTab !== 'overview' && (
        <div className="h-64 flex flex-col items-center justify-center text-center bg-white rounded-2xl border border-slate-200 border-dashed">
          <Briefcase className="text-slate-300 mb-4" size={48} />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Coming Soon</h2>
          <p className="text-slate-500 max-w-sm">The {activeTab} module is currently being tailored for Rwandan business regulations.</p>
        </div>
      )}
    </div>
  );
}
