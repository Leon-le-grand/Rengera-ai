'use client';

import { motion } from 'motion/react';
import { CheckCircle2, TrendingUp, Users, ShieldAlert, ArrowRight } from 'lucide-react';

export default function Business() {
  return (
    <section id="business" className="py-24 bg-slate-50 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          
          <div className="flex-1 order-2 lg:order-1 w-full max-w-xl mx-auto lg:max-w-none relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-blue-100/50 rounded-full blur-[100px] -z-10" />
            
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Compliance Overview</h3>
                  <p className="text-sm text-slate-500">Kigali Tech Hub Ltd.</p>
                </div>
                <div className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  98% Compliant
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                    <Users size={16} /> Employees
                  </div>
                  <div className="text-2xl font-bold text-slate-900">42</div>
                  <div className="text-xs text-emerald-600 font-medium mt-1">All contracts signed</div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                    <ShieldAlert size={16} /> Alerts
                  </div>
                  <div className="text-2xl font-bold text-slate-900">1</div>
                  <div className="text-xs text-amber-600 font-medium mt-1">Policy update needed</div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-900">Recent Actions</h4>
                {[
                  "Generated NDAs for 3 new hires",
                  "Updated Maternity Leave Policy (Law N° 66/2018)",
                  "Filed tax extension request"
                ].map((action, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                    <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                    <span className="text-sm text-slate-700">{action}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          <div className="flex-1 order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 text-blue-800 text-sm font-semibold mb-6">
              <TrendingUp size={16} />
              <span>For SMEs & Enterprise</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">
              Automate Your <br/>
              <span className="text-slate-500">Business Compliance</span>
            </h2>
            <p className="text-lg text-slate-600 mb-8 leading-relaxed">
              Stay ahead of regulations. Rengera Business provides HR tools, contract generators, and real-time compliance alerts tailored for Rwandan companies.
            </p>
            
            <div className="space-y-4 mb-10">
              {[
                { title: "Labour Law Assistant", desc: "Instant answers for HR disputes." },
                { title: "Contract Summaries", desc: "Analyze vendor contracts for risks." },
                { title: "Policy Generator", desc: "Create employee handbooks in minutes." }
              ].map((feature, i) => (
                <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-white border border-slate-100 shadow-sm">
                  <div className="mt-1 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0 font-bold text-sm">
                    {i + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{feature.title}</h4>
                    <p className="text-sm text-slate-500">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-semibold transition-all flex items-center gap-2 group">
              Explore Business Plans
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

        </div>
      </div>
    </section>
  );
}
