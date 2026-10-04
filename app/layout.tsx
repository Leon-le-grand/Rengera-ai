import type {Metadata} from 'next';
import { Plus_Jakarta_Sans, Squada_One } from 'next/font/google';
import './globals.css';
import PageLoader from '@/components/brand/PageLoader';

const sans = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta' });
const brand = Squada_One({ subsets: ['latin'], weight: '400', variable: '--font-squada' });

export const metadata: Metadata = {
  title: 'RENGERA AI | Know Your Rights. Protect Your Future.',
  description: 'AI-powered legal literacy platform for Rwanda.',
  manifest: '/manifest.json',
  themeColor: '#0f172a'
};

/**
 * Applies the saved theme before first paint. Without this the app would flash
 * the light palette on every load for anyone who chose dark.
 */
const THEME_BOOTSTRAP = `try{var t=localStorage.getItem('rengera_theme_v1');document.documentElement.dataset.theme=(t==='light'||t==='dark')?t:'dark';}catch(e){document.documentElement.dataset.theme='dark';}`;

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className="scroll-smooth" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className={`${sans.variable} ${brand.variable} font-sans antialiased bg-white text-slate-900 selection:bg-emerald-500/30`} suppressHydrationWarning>
        <PageLoader />
        {children}
      </body>
    </html>
  );
}
