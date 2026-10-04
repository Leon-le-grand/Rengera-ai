export const LEGAL_PDF_BUCKET = 'legal-pdfs';

/**
 * Public URL for a stored legal PDF.
 *
 * This is a plain module rather than an export of a 'use server' file, because
 * Next.js requires every export of a server-action module to be async. The
 * reader uses this to build the <object> src.
 */
export function getPublicPdfUrl(sourcePdfPath: string | null): string | null {
  if (!sourcePdfPath) return null;

  const base = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;

  const encodedPath = sourcePdfPath.split('/').map(encodeURIComponent).join('/');
  return `${base.replace(/\/$/, '')}/storage/v1/object/public/${LEGAL_PDF_BUCKET}/${encodedPath}`;
}