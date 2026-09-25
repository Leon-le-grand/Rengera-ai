'use client';

import { motion } from 'motion/react';

interface RengeraLogoProps {
  size?: number;
  className?: string;
  loading?: boolean;
  label?: string;
}

export default function RengeraLogo({
  size = 56,
  className = '',
  loading = false,
  label = 'Rengera',
}: RengeraLogoProps) {
  const logo = (
    <svg
      viewBox="0 0 500 500"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
      className="block"
    >
      <path
        d="M250 8L492 250L250 492L8 250L250 8Z"
        fill="#1E2B45"
        stroke="#0B1528"
        strokeWidth="12"
      />
      <path
        d="M250 35L465 250L250 465L35 250L250 35Z"
        stroke="#B69D74"
        strokeWidth="4"
      />
      <g
        fill="#050609"
        stroke="#050609"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M245 143H255V339H245V143Z" />
        <path d="M169 339H331L347 356H153L169 339Z" />
        <path d="M196 356H304L315 369H185L196 356Z" />
      </g>
      <g
        fill="#B69D74"
        stroke="#B69D74"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M162 184H338V193H162V184Z" />
        <path d="M246 137H254V153H246V137Z" />
        <path d="M166 191C157 215 143 235 119 247" strokeWidth="8" />
        <path d="M334 191C343 215 357 235 381 247" strokeWidth="8" />
        <path d="M113 247H190L178 280C168 294 134 294 124 280L113 247Z" />
        <path d="M310 247H387L376 280C366 294 332 294 322 280L310 247Z" />
      </g>
      <path
        d="M350 57L361 91L396 102L361 113L350 148L339 113L304 102L339 91L350 57Z"
        fill="#FFFFFF"
        stroke="#B69D74"
        strokeWidth="7"
        strokeLinejoin="round"
      />
    </svg>
  );

  if (!loading) {
    return <span className={`inline-flex shrink-0 ${className}`}>{logo}</span>;
  }

  return (
    <motion.span
      className={`inline-flex shrink-0 ${className}`}
      animate={{ rotate: 360 }}
      transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
    >
      {logo}
    </motion.span>
  );
}
