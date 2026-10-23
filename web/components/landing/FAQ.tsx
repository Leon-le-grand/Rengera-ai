'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    q: "Is Rengera really free?",
    a: "Yes. Core features including the AI Legal Assistant, searching laws, and emergency contacts are completely free for all Rwandan citizens. We offer paid plans for businesses that need advanced compliance tools."
  },
  {
    q: "Are the answers legally binding?",
    a: "No. Rengera provides legal education and information based on official Rwandan laws, but it does not constitute formal legal advice. Always consult a qualified lawyer for serious legal matters."
  },
  {
    q: "Does it work offline?",
    a: "Yes. Once you download the Rengera app, you can save specific laws, articles, and past AI conversations for offline access, ensuring you have the information when you need it most."
  },
  {
    q: "What languages are supported?",
    a: "Rengera fully supports Kinyarwanda, English, and French. You can switch between languages seamlessly during a conversation."
  },
  {
    q: "How is my privacy protected?",
    a: "We use end-to-end encryption for all your conversations. We do not share your personal data or legal queries with any third parties or government agencies without your explicit consent."
  }
];

export default function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 bg-white">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6">Frequently Asked Questions</h2>
          <p className="text-lg text-slate-600">Everything you need to know about how Rengera works.</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div 
                key={idx} 
                className={`border rounded-2xl overflow-hidden transition-colors duration-300 ${isOpen ? 'border-emerald-500/50 bg-emerald-50/30' : 'border-slate-200 bg-white'}`}
              >
                <button
                  className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                >
                  <span className="font-semibold text-lg text-slate-900">{faq.q}</span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 ${isOpen ? 'bg-emerald-100 text-emerald-600 rotate-180' : 'bg-slate-100 text-slate-500'}`}>
                    <ChevronDown size={18} />
                  </div>
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      <div className="px-6 pb-5 pt-0 text-slate-600 leading-relaxed">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  );
}
