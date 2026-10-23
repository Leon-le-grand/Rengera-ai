'use client';

import { motion } from 'motion/react';

export default function Stats() {
  return (
    <section className="py-20 bg-emerald-900 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-1/2 h-full bg-emerald-800/50 skew-x-12 transform origin-top-right -z-10" />
      
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-emerald-800/50">
          
          {[
            { label: "Citizens Assisted", value: "50,000+" },
            { label: "Laws Indexed", value: "1,200+" },
            { label: "Languages", value: "3" },
            { label: "Uptime", value: "99.9%" }
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="text-center px-4"
            >
              <div className="text-3xl md:text-5xl font-bold text-white mb-2">{stat.value}</div>
              <div className="text-emerald-200 text-sm md:text-base font-medium">{stat.label}</div>
            </motion.div>
          ))}
          
        </div>
      </div>
    </section>
  );
}
