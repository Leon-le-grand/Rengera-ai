import type {Metadata} from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const sans = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta' });

export const metadata: Metadata = {
  title: 'Rengera | Know Your Rights. Protect Your Future.',
  description: 'AI-powered legal literacy platform for Rwanda.',
  manifest: '/manifest.json',
  themeColor: '#0f172a'
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${sans.variable} font-sans antialiased bg-white text-slate-900 selection:bg-emerald-500/30`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
