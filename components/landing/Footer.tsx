'use client';

import RengeraLogo from '@/components/brand/RengeraLogo';

export default function Footer() {
  return (
    <footer className="bg-slate-900 py-16 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 text-white mb-6">
              <RengeraLogo size={64} />
              <span className="font-brand text-2xl tracking-wide">RENGERA AI</span>
            </div>
            <p className="text-slate-400 max-w-sm leading-relaxed">
              Empowering Rwandan citizens through accessible, AI-driven legal education. Know your rights, protect your future.
            </p>
          </div>
          
          <div>
            <h4 className="text-white font-semibold mb-6">Platform</h4>
            <ul className="space-y-4 text-sm text-slate-400">
              <li><a href="#" className="hover:text-emerald-400 transition-colors">AI Assistant</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Browse Laws</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Business Compliance</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Download App</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-white font-semibold mb-6">Company</h4>
            <ul className="space-y-4 text-sm text-slate-400">
              <li><a href="#" className="hover:text-emerald-400 transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors">Terms of Service</a></li>
            </ul>
          </div>
          
        </div>
        
        <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} RENGERA AI. All rights reserved. Made in Kigali.
          </p>
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-emerald-600 transition-all cursor-pointer">
              {/* social icon placeholder */}
              <span className="text-xs">X</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-emerald-600 transition-all cursor-pointer">
              <span className="text-xs">in</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
