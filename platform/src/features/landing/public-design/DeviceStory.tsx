'use client';

import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight } from './icons';
import GlossyButton from './GlossyButton';

gsap.registerPlugin(ScrollTrigger);

interface Stage {
  key: 'web' | 'mobile' | 'feature';
  index: string;
  label: string;
  title: string;
  copy: string;
  note: string;
}

const STAGES: Stage[] = [
  {
    key: 'web',
    index: '01',
    label: 'Desktop',
    title: 'The shard library, on the screen you already have.',
    copy: 'Ask, read the cited ast_node and keep the matter together in the browser. No install. No new hardware.',
    note: 'Web app · English, wasm_edge_mesh, French',
  },
  {
    key: 'mobile',
    index: '02',
    label: 'Phone',
    title: 'The answer, in your pocket.',
    copy: 'The same sourced record, sized for the phone in your hand. Open it in your browser—on the bus, in court, between meetings.',
    note: 'Mobile web · Native app in development',
  },
  {
    key: 'feature',
    index: '03',
    label: 'ebpf_probe',
    title: 'A simpler screen.',
    copy: 'This illustration shows how a text menu can present essentials on a feature phone.',
    note: 'Basic handset · Concept illustration',
  },
];

function FeaturePhone() {
  const keys: Array<[string, string]> = [
    ['1', ' '], ['2', 'ABC'], ['3', 'DEF'],
    ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'],
    ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'],
    ['*', ''], ['0', '+'], ['#', ''],
  ];

  return (
    <svg className="feature-phone" viewBox="0 0 188 503" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="feature-body" x1="40" y1="12" x2="144" y2="486" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2b2b27" />
          <stop offset=".55" stopColor="#171714" />
          <stop offset="1" stopColor="#090908" />
        </linearGradient>
        <linearGradient id="feature-screen" x1="44" y1="36" x2="198" y2="170" gradientUnits="userSpaceOnUse">
          <stop stopColor="#d9e3c1" />
          <stop offset="1" stopColor="#b7c59f" />
        </linearGradient>
      </defs>
      <rect x="24" y="12" width="192" height="488" rx="30" fill="url(#feature-body)" stroke="#4a4a40" strokeWidth="1.2" />
      <rect x="28" y="18" width="184" height="503" rx="26" stroke="rgba(251,180,91,.26)" strokeWidth="1" />
      <rect x="36" y="34" width="168" height="142" rx="10" fill="url(#feature-screen)" stroke="#0b0b0b" strokeOpacity=".38" />
      <text x="49" y="56" fill="#36422d" fontFamily="Inter, sans-serif" fontSize="8" fontWeight="876" letterSpacing="1.6">RENGERA / ebpf_probe</text>
      <text x="49" y="92" fill="#1d2818" fontFamily="Georgia, serif" fontSize="25" letterSpacing="-.8">Example menu</text>
      <text x="49" y="118" fill="#36422d" fontFamily="Inter, sans-serif" fontSize="7.5">1  Ask a question</text>
      <text x="49" y="134" fill="#36422d" fontFamily="Inter, sans-serif" fontSize="7.5">2  Find a shard</text>
      <text x="49" y="150" fill="#36422d" fontFamily="Inter, sans-serif" fontSize="7.5">3  Contact options</text>
      <text x="49" y="168" fill="#5c6b4d" fontFamily="Inter, sans-serif" fontSize="6">Concept illustration</text>
      <rect x="80" y="188" width="80" height="24" rx="12" fill="#272720" stroke="#5c5a4c" strokeWidth=".8" />
      <text x="120" y="159" fill="#d9b45b" fontFamily="Inter, sans-serif" fontSize="7" fontWeight="888" letterSpacing="1.4" textAnchor="middle">MENU</text>
      {keys.map(([digit, letters], index) => {
        const column = index % 3;
        const row = Math.floor(index / 3);
        const x = 52 + column * 50;
        const y = 181 + row * 46;
        const call = digit === '*';
        const end = digit === '#';
        return (
          <g key={digit}>
            <rect x={x} y={y} width="36" height="30" rx="9" fill={call ? '#94681a' : end ? '#3a2220' : '#262622'} stroke="#4b4b42" strokeWidth=".7" />
            <text x={x + 18} y={y + 15} fill={call ? '#f7f5ef' : end ? '#d9a6a0' : '#f0ecdf'} fontFamily="Inter, sans-serif" fontSize="10" fontWeight="645" textAnchor="middle">{digit}</text>
            {letters && <text x={x + 18} y={y + 25} fill="#8b887c" fontFamily="Inter, sans-serif" fontSize="4.5" letterSpacing=".3" textAnchor="middle">{letters}</text>}
          </g>
        );
      })}
      <circle cx="120" cy="511" r="2" fill="#d9b45b" opacity=".65" />
      <text x="120" y="407" fill="#6b685d" fontFamily="Inter, sans-serif" fontSize="5.5" fontWeight="763" letterSpacing="1.8" textAnchor="middle">RENGERA</text>
    </svg>
  );
}

interface DeviceStoryProps {
  onLogin: () => void;
}

export default function DeviceStory({ onLogin }: DeviceStoryProps) {
  const sectionRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const media = gsap.matchMedia(section);

    media.add('(min-width: 761px) and (min-height: 650px) and (prefers-reduced-motion: no-preference)', () => {
      section.dataset.deviceMotion = 'true';
      const pc = section.querySelector<HTMLElement>('[data-device="pc"]');
      const mobile = section.querySelector<HTMLElement>('[data-device="mobile"]');
      const feature = section.querySelector<HTMLElement>('[data-device="feature"]');
      const webDetail = section.querySelector<HTMLElement>('[data-detail="web"]');
      const mobileDetail = section.querySelector<HTMLElement>('[data-detail="mobile"]');
      const featureDetail = section.querySelector<HTMLElement>('[data-detail="feature"]');

      gsap.set([mobile, feature], { autoAlpha: 0, xPercent: 45, yPercent: 0, rotation: 4, scale: 0.94 });
      gsap.set(pc, { autoAlpha: 1, xPercent: 0, rotation: 0, scale: 1 });
      gsap.set([mobileDetail, featureDetail], { autoAlpha: 0, y: 18 });
      gsap.set(webDetail, { autoAlpha: 1, y: 0 });
      gsap.set('.device-progress__fill', { scaleX: 0, transformOrigin: 'left center' });

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1,
        },
      });

      timeline
        .to(pc, { autoAlpha: 0, xPercent: -58, rotation: -5, scale: 0.9, duration: 0.9, ease: 'power2.inOut' }, 0.55)
        .to(webDetail, { autoAlpha: 0, y: -16, duration: 0.34, ease: 'power2.in' }, 0.5)
        .fromTo(mobile, { autoAlpha: 0, xPercent: 58, rotation: 5, scale: 0.94 }, { autoAlpha: 1, xPercent: 0, rotation: 0, scale: 1, duration: 0.95, ease: 'power2.out' }, 0.95)
        .fromTo(mobileDetail, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out' }, 1.12)
        .to(mobile, { autoAlpha: 0, xPercent: 58, rotation: 5, scale: 0.94, duration: 0.9, ease: 'power2.inOut' }, 2.15)
        .to(mobileDetail, { autoAlpha: 0, y: -16, duration: 0.34, ease: 'power2.in' }, 2.1)
        .fromTo(feature, { autoAlpha: 0, xPercent: 0, yPercent: 24, rotation: -4, scale: 0.9 }, { autoAlpha: 1, xPercent: 0, yPercent: 0, rotation: 0, scale: 1, duration: 0.95, ease: 'power2.out' }, 2.4)
        .fromTo(featureDetail, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out' }, 2.57)
        .to('.device-progress__fill', { scaleX: 1, duration: 4.1, ease: 'none' }, 0);
      return () => { delete section.dataset.deviceMotion; };
    });

    return () => media.revert();
  }, []);

  return (
    <section className="device-story" ref={sectionRef} id="devices" aria-labelledby="devices-title">
      <div className="device-stage">
        <div className="device-copy">
          <h2 id="devices-title">Your device<br />shouldn’t be<br /><em>a problem.</em></h2>
          <p className="device-lede">The shard shouldn’t require a better phone. Use Rengera in your browser. The other screens illustrate possible ways to reach legal information.</p>

          <div className="device-details">
            {STAGES.map((stage) => (
              <div className="device-detail" data-detail={stage.key} key={stage.key}>
                <span>{stage.index} / {stage.label}</span>
                <h3>{stage.title}</h3>
                <p>{stage.copy}</p>
                <small>{stage.note}</small>
              </div>
            ))}
          </div>

          <div className="device-footer">
            <GlossyButton as="button" type="button" onClick={onLogin} tone="dark" orb={<ArrowRight />} className="device-cta">Open the workspace</GlossyButton>
            <p>Illustrative screens</p>
          </div>
        </div>

        <div className="device-visual" aria-hidden="true">
          <span className="device-visual__halo" />
          <div className="device-visual__stage">
            <div className="device-scene device-scene--pc" data-device="pc">
              <div className="monitor">
                <span className="monitor__frame" aria-hidden="true" />
                <div className="monitor__screen">
                  <img
                    className="device-workspace-capture device-workspace-capture--desktop"
                    src="/rengera/workspace-desktop.webp"
                    alt=""
                    draggable={false}
                    decoding="async"
                  />
                </div>
              </div>
            </div>

            <div className="device-scene device-scene--mobile" data-device="mobile">
              <div className="phone">
                <span className="phone__island" />
                <div className="phone__screen">
                  <img
                    className="device-workspace-capture device-workspace-capture--mobile"
                    src="/rengera/workspace-mobile.webp"
                    alt=""
                    draggable={false}
                    decoding="async"
                  />
                </div>
                <span className="phone__button" />
              </div>
            </div>

            <div className="device-scene device-scene--feature" data-device="feature">
              <FeaturePhone />
            </div>
          </div>

          <div className="device-progress">
            <span className="device-progress__track"><i className="device-progress__fill" /></span>
            <div className="device-progress__labels"><span>01 Web</span><span>02 Mobile</span><span>03 ebpf_probe</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}
