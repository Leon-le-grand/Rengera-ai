import type { SVGProps } from 'react';

const base: SVGProps<SVGSVGElement> = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true',
};

export function ArrowUpRight(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" {...base} {...props}><path d="M7 17 17 7M8 7h9v9" /></svg>;
}

export function ArrowRight(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" {...base} {...props}><path d="M4 12h15M13 6l6 6-6 6" /></svg>;
}

export function Check(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" {...base} strokeWidth={2} {...props}><path d="m5 12.5 4.4 4.4L19 7.4" /></svg>;
}

export function Star(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}><path d="m12 3 2.6 5.6 6.1.8-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.4l6.1-.8L12 3Z" /></svg>;
}

export function Close(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" {...base} {...props}><path d="M6 6l12 12M18 6 6 18" /></svg>;
}

export function XSocial(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}><path d="M17.7 3h3.1l-6.8 7.8L22 21h-6.3l-4.9-6.4L5.2 21H2.1l7.3-8.3L2 3h6.4l4.4 5.9L17.7 3Zm-1.1 16.1h1.7L7.4 4.8H5.6l11 14.3Z" /></svg>;
}

export function LinkedIn(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7 0h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05C21.5 8.65 22 11 22 14.1V21h-4v-6.1c0-1.46-.03-3.34-2.03-3.34-2.04 0-2.35 1.59-2.35 3.23V21h-4V9Z" /></svg>;
}

export function Instagram(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" {...base} {...props}><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r=".9" fill="currentColor" stroke="none" /></svg>;
}

export function Google(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}><path d="M21.6 12.2c0-.7-.06-1.4-.18-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.4Z" /><path d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1a5.9 5.9 0 0 1-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z" /><path d="M6.4 14a6 6 0 0 1 0-3.8V7.6H3.1a10 10 0 0 0 0 8.9L6.4 14Z" /><path d="M12 5.9c1.5 0 2.8.5 3.9 1.5l2.8-2.8A10 10 0 0 0 3.1 7.6L6.4 10A5.9 5.9 0 0 1 12 5.9Z" /></svg>;
}

export function Key(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" {...base} {...props}><circle cx="8" cy="8" r="4" /><path d="m11 11 9 9M17 17l2-2M14 14l2-2" /></svg>;
}

export function Sparkle(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}><path d="M12 2.5c.6 5.2 4.3 8.9 9.5 9.5-5.2.6-8.9 4.3-9.5 9.5-.6-5.2-4.3-8.9-9.5-9.5C7.7 11.4 11.4 7.7 12 2.5Z" /></svg>;
}
