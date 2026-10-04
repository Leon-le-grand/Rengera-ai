'use client';

import Image from 'next/image';

/**
 * The Rengera mark.
 *
 * This is the approved brand asset — the same file that ships as the favicon
 * (`public/rengera-logo-favicon.png`) — so the logo on the landing page, in the
 * product chrome and on the login screen is pixel-identical everywhere.
 *
 * It is deliberately static. The old inline SVG rotated whenever `loading` was
 * set, which made the mark look like a loading spinner rather than a logo.
 */
interface RengeraLogoProps {
  size?: number;
  className?: string;
  /** Kept for call-site compatibility. The mark no longer animates. */
  loading?: boolean;
  label?: string;
}

export default function RengeraLogo({
  size = 56,
  className = '',
  loading = false,
  label = 'Rengera',
}: RengeraLogoProps) {
  void loading;

  return (
    <span className={`inline-flex shrink-0 ${className}`}>
      <Image
        src="/rengera-logo-favicon.png"
        alt={label}
        width={size}
        height={size}
        className="block"
        style={{ width: size, height: size }}
        priority={false}
      />
    </span>
  );
}
