'use client';

import { motion } from 'motion/react';
import { Bot, Search, BookOpen, AlertCircle, FileSignature, Briefcase, Mic, Globe } from 'lucide-react';

const features = [
  {
    icon: <Bot className="text-emerald-500" size={24} />,
    title: "AI Legal Assistant",
    description: "Ask legal questions in plain language and get instant, accurate answers based on Rwandan law."
  },
  {
    icon: <Search className="text-emerald-500" size={24} />,
    title: "Search Laws",
    description: "Easily navigate through the constitution, penal code, and civil laws with semantic search."
  },
  {
    icon: <BookOpen className="text-emerald-500" size={24} />,
    title: "Offline Library",
    description: "Access your downloaded laws and saved legal advice even without an internet connection."
  },
  {
    icon: <AlertCircle className="text-emerald-500" size={24} />,
    title: "Emergency Contacts",
    description: "One-click access to RIB, local authorities, and legal aid clinics in your district."
  },
  {
    icon: <FileSignature className="text-emerald-500" size={24} />,
    title: "Complaint Generator",
    description: "Automatically format official complaints and legal letters ready for submission."
  },
  {
    icon: <Briefcase className="text-emerald-500" size={24} />,
    title: "Business Compliance",
    description: "Specialized tools for HR, contracts, and regulatory compliance for SMEs."
  },
  {
    icon: <Mic className="text-emerald-500" size={24} />,
    title: "Voice Search",
    description: "Speak your questions naturally in Kinyarwanda, English, or French."
  },
  {
    icon: <Globe className="text-emerald-500" size={24} />,
    title: "Multilingual Support",
    description: "Seamless translation across all three official languages to ensure full comprehension."
  }
];

export default function Features() {
  return (
    <section id="features" className="py-24 bg-white relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6">
            Everything You Need to <span className="text-gradient">Protect Your Rights</span>
          </h2>
          <p className="text-lg text-slate-600">
            A comprehensive suite of tools designed to make legal knowledge accessible, actionable, and free for every citizen.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              whileHover={{ y: -5 }}
              className="bg-slate-50 rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
