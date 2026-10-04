import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getSharedConsultation } from '@/app/share-actions';
import ShareConsultationView from './ShareConsultationView';
import ShareActions from './ShareActions';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ token: string }>;
}

export const metadata = {
  title: 'Shared Legal Consultation | RENGERA AI',
  description: 'A legal question and its cited answer from RENGERA AI.',
  robots: { index: false, follow: false },
};

export default async function SharedConsultationPage({ params }: PageProps) {
  const { token } = await params;
  const consultation = await getSharedConsultation(token);

  if (!consultation) {
    notFound();
  }

  return (
    <main className="min-h-dvh bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-5">
          <Image
            src="/rengera-logo-light.png"
            alt="RENGERA AI"
            width={32}
            height={32}
          />
          <span className="font-brand text-lg tracking-wide">RENGERA AI</span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            Forward this answer
          </p>
          <ShareActions title={consultation.question.slice(0, 90)} />
        </div>
        <ShareConsultationView consultation={consultation} />
      </div>
    </main>
  );
}
