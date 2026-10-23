import { ImageResponse } from 'next/og';
import { getSharedConsultation } from '@/app/share-actions';

export const runtime = 'nodejs';
export const alt = 'A cited legal answer from RENGERA AI';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * The shareable answer card.
 *
 * In Rwanda a product grows through WhatsApp, and WhatsApp only renders a rich
 * preview when the link carries an Open Graph image. This route draws the
 * question and the laws that were cited onto a branded card so a forwarded link
 * looks like a card, not a bare URL.
 */
export default async function OpengraphImage({ params }: { params: { token: string } }) {
  const consultation = await getSharedConsultation(params.token);

  const question = consultation?.question || 'A legal question answered with citations.';
  const laws = (consultation?.sources || []).slice(0, 4);
  const excerpt = (consultation?.answer || '')
    .replace(/[#*_>`]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 260);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#09090b',
          padding: 64,
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: '#d8b485',
              color: '#09090b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26,
              fontWeight: 700,
            }}
          >
            R
          </div>
          <div style={{ display: 'flex', fontSize: 26, letterSpacing: 6, color: '#d8b485' }}>
            RENGERA AI
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div
            style={{
              display: 'flex',
              fontSize: 20,
              letterSpacing: 4,
              textTransform: 'uppercase',
              color: '#8b8b93',
            }}
          >
            The question
          </div>
          <div style={{ display: 'flex', fontSize: 44, lineHeight: 1.2, fontWeight: 700 }}>
            {question.length > 120 ? `${question.slice(0, 120)}…` : question}
          </div>
          <div style={{ display: 'flex', fontSize: 24, lineHeight: 1.45, color: '#a1a1aa' }}>
            {excerpt}…
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {laws.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {laws.map((law, index) => (
                <div
                  key={`${law.lawId}-${index}`}
                  style={{
                    display: 'flex',
                    padding: '10px 18px',
                    borderRadius: 999,
                    border: '1px solid #d8b48555',
                    color: '#d8b485',
                    fontSize: 20,
                  }}
                >
                  {law.referenceNumber || law.title}
                  {law.articleNumber ? ` · Art. ${law.articleNumber}` : ''}
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', fontSize: 22, color: '#71717a' }}>
            Know Your Rights. Protect Your Future.
          </div>
        </div>
      </div>
    ),
    size,
  );
}