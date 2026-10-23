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
    <main className="min-h-dvh bg-[#efede9]">
      <header className="border-b border-white/5 bg-[#0c0c0e] shadow-[0_8px_30px_-12px_rgba(0,0,0,0.55)]">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-4">
          <Image
            src="/rengera-logo.jpg"
            alt="RENGERA AI"
            width={32}
            height={32}
          />
          <span className="font-brand text-lg font-bold tracking-wide text-white">RENGERA AI</span>
          <span className="ml-auto text-[10px] font-extrabold uppercase tracking-widest text-[#d8b485]">
            Shared consultation
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-6 rounded-[3px] border border-zinc-950/10 bg-[#f7f6f3] p-5 shadow-[0_2px_12px_-6px_rgba(24,24,27,0.25)]">
          <p className="mb-3 text-[11px] font-extrabold uppercase tracking-widest text-zinc-500">
            Forward this answer
          </p>
          <ShareActions title={consultation.question.slice(0, 90)} />
        </div>
        <ShareConsultationView consultation={consultation} />
      </div>
    </main>
  );
}
