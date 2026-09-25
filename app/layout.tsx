import type {Metadata} from 'next';
import { Plus_Jakarta_Sans, Squada_One } from 'next/font/google';
import './globals.css';

const sans = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta' });
const brand = Squada_One({ subsets: ['latin'], weight: '400', variable: '--font-squada' });

export const metadata: Metadata = {
  title: 'RENGERA AI | Know Your Rights. Protect Your Future.',
  description: 'AI-powered legal literacy platform for Rwanda.',
  manifest: '/manifest.json',
  themeColor: '#0f172a'
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${sans.variable} ${brand.variable} font-sans antialiased bg-white text-slate-900 selection:bg-emerald-500/30`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
