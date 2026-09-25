'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Send, ShieldCheck, FileText, Download, Building, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import RengeraLogo from '@/components/brand/RengeraLogo';

export default function InteractiveDemo() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer1 = setTimeout(() => setStep(1), 1000);
    const timer2 = setTimeout(() => setStep(2), 2500);
    const timer3 = setTimeout(() => setStep(3), 4500);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  const handleReplay = () => {
    setStep(0);
    setTimeout(() => setStep(1), 500);
    setTimeout(() => setStep(2), 2000);
    setTimeout(() => setStep(3), 4000);
  };

  return (
    <section id="interactive-demo" className="scroll-mt-24 py-24 bg-slate-900 overflow-hidden relative">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px]" />
      
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          
          <div className="flex-1 lg:pr-10">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
              Real Answers.<br/>
              <span className="text-emerald-400">Backed by Law.</span>
            </h2>
            <p className="text-lg text-slate-300 mb-10 leading-relaxed">
              Experience how Rengera processes your situation, finds the exact legal articles, and provides an actionable checklist to protect yourself.
            </p>
            
            <ul className="space-y-6">
              {[
                "Simple explanations without legal jargon",
                "Direct citations of official Rwandan articles",
                "Step-by-step evidence collection guides",
                "One-click official complaint generation"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="mt-1 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <ShieldCheck size={14} />
                  </div>
                  <span className="text-slate-300 text-lg">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex-1 w-full max-w-xl">
            <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="bg-slate-800/50 border-b border-slate-700 p-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500">
                  <RengeraLogo size={40} label="" />
                </div>
                <div>
                  <h3 className="font-brand text-lg text-white">RENGERA AI</h3>
                  <p className="text-emerald-400 text-xs">Online • Ready to help</p>
                </div>
              </div>

              {/* Chat Area */}
              <div className="p-6 space-y-6 h-[400px] overflow-y-auto scrollbar-hide">
                
                {step >= 1 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="flex justify-end"
                  >
                    <div className="bg-emerald-600 text-white rounded-2xl rounded-tr-sm px-5 py-3 max-w-[85%]">
                      My employer fired me without notice and refused to pay my last month&apos;s salary.
                    </div>
                  </motion.div>
                )}

                {step >= 2 && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start gap-3"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-700">
                      <RengeraLogo size={30} label="" />
                    </div>
                    <div className="bg-slate-700 rounded-2xl rounded-tl-sm px-5 py-4 max-w-[90%] text-slate-200">
                      {step === 2 ? (
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" />
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <strong className="text-white block mb-1 text-lg">Your Rights Have Been Violated</strong>
                            <p className="text-sm text-slate-300">Under Rwandan Labour Law, you are entitled to notice and unpaid wages.</p>
                          </div>
                          
                          <div className="bg-slate-800 p-3 rounded-lg border border-slate-600">
                            <h4 className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">Relevant Law</h4>
                            <p className="text-sm">Law N° 66/2018 of 30/08/2018 regulating labour in Rwanda (Articles 27 & 28 on Dismissal Notice).</p>
                          </div>

                          <div>
                            <h4 className="text-white text-sm font-medium mb-2">Recommended Next Steps:</h4>
                            <ul className="space-y-2">
                              <li className="flex items-start gap-2 text-sm bg-slate-800/50 p-2 rounded-lg">
                                <FileText size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                                <span>Collect your employment contract and any emails/texts.</span>
                              </li>
                              <li className="flex items-start gap-2 text-sm bg-slate-800/50 p-2 rounded-lg">
                                <Building size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                                <span>Report to the Labour Inspector in your District.</span>
                              </li>
                            </ul>
                          </div>
                          
                          <button className="w-full mt-2 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium border border-emerald-500/20 transition-colors flex items-center justify-center gap-2">
                            <Download size={16} />
                            Generate Formal Complaint Letter
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Input Area */}
              <div className="p-4 bg-slate-800 border-t border-slate-700">
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Type your situation..." 
                    className="w-full bg-slate-900 border border-slate-700 rounded-full px-5 py-3 pr-12 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                    disabled
                  />
                  <button className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white hover:bg-emerald-500 transition-colors">
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </div>
            
            {step === 3 && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="mt-6 text-center"
              >
                <button onClick={handleReplay} className="text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors">
                  Replay Animation
                </button>
              </motion.div>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}
