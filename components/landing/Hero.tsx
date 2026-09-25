'use client';

import { motion } from 'motion/react';
import { ArrowRight, ShieldCheck, FileText } from 'lucide-react';
import RengeraLogo from '@/components/brand/RengeraLogo';

export default function Hero({ onStartFree }: { onStartFree: () => void }) {
  return (
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
      {/* Background Mesh/Gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 bg-slate-50">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-200/40 blur-[100px]" />
        <div className="absolute top-[20%] right-[-5%] w-[30%] h-[30%] rounded-full bg-teal-200/40 blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[50%] h-[50%] rounded-full bg-blue-100/40 blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <motion.div 
            className="flex-1 text-center lg:text-left"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-sm font-semibold mb-6 border border-emerald-200/50">
              <ShieldCheck size={16} />
              <span>Know Your Rights. Protect Your Future.</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-slate-900 tracking-tight leading-[1.1] mb-6">
              Understand Rwanda&apos;s Laws in <span className="text-gradient">Minutes</span>, Not Hours.
            </h1>
            <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Rengera transforms complex legal language into simple, practical guidance that every citizen can understand. Empowering you with AI-driven clarity.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
              <button
                type="button"
                onClick={onStartFree}
                className="w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-semibold text-lg transition-all shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
              >
                Start Free
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                type="button"
                onClick={() => document.getElementById('interactive-demo')?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 rounded-full font-semibold text-lg transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
              >
                Watch Demo
              </button>
            </div>
            
            <div className="mt-10 flex items-center justify-center lg:justify-start gap-6 text-sm text-slate-500 font-medium">
              <div className="flex items-center gap-1.5"><ShieldCheck size={16} className="text-emerald-500" /> Source-linked guidance</div>
              <div className="flex items-center gap-1.5"><FileText size={16} className="text-emerald-500" /> Emergency routing</div>
            </div>
          </motion.div>

          <motion.div 
            className="flex-1 w-full max-w-lg lg:max-w-none relative"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          >
            {/* Abstract Illustration replacing image */}
            <div className="relative w-full aspect-square md:aspect-[4/3] lg:aspect-square rounded-[2rem] bg-gradient-to-br from-slate-900 to-slate-800 p-8 shadow-2xl overflow-hidden flex flex-col border border-slate-700">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-[80px]" />
              
              <div className="flex items-center gap-4 mb-8">
                <RengeraLogo size={72} />
                <div>
                  <div className="font-brand text-xl text-white">RENGERA AI</div>
                  <div className="text-emerald-400 text-sm">Legal Assistant</div>
                </div>
              </div>

              <div className="flex flex-col gap-4 flex-1">
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1, duration: 0.5 }}
                  className="self-end bg-slate-700 text-white rounded-2xl rounded-tr-sm px-5 py-3 max-w-[85%] text-sm"
                >
                  My landlord locked me out because I&apos;m 2 days late on rent. Is this legal?
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 2, duration: 0.5 }}
                  className="self-start bg-emerald-900/50 border border-emerald-800/50 text-slate-200 rounded-2xl rounded-tl-sm px-5 py-4 max-w-[90%] text-sm backdrop-blur-sm"
                >
                  <p className="mb-2"><strong className="text-white">No, this is not legal.</strong></p>
                  <p className="mb-3 text-slate-300 text-xs">According to the <span className="text-emerald-400">Law regulating residential property in Rwanda (Article 45)</span>, a landlord cannot forcefully evict a tenant without a court order.</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-white bg-slate-800/50 p-2 rounded-lg">
                      <ShieldCheck size={14} className="text-emerald-400" />
                      Take photos of the locked door
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white bg-slate-800/50 p-2 rounded-lg">
                      <FileText size={14} className="text-emerald-400" />
                      Contact local authorities (RIB)
                    </div>
                  </div>
                </motion.div>
              </div>
              
              {/* Decorative UI elements */}
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-slate-700/50 rounded-2xl border border-slate-600/50 backdrop-blur-md transform rotate-12" />
              <div className="absolute -bottom-10 right-10 w-24 h-24 bg-emerald-600/20 rounded-full blur-xl" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
