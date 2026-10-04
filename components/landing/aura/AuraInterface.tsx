'use client';

import { FileText, Sparkles } from 'lucide-react';
import {
  AssistantBlock,
  AssistantHeading,
  Bullet,
  BulletList,
  CitationChip,
  ChatDisclaimer,
  ChatFrame,
  ChatTopBar,
  ComposerChip,
  ComposerFrame,
  ComposerToolbar,
  ContextChip,
  GeneratingRow,
  ScrollDownButton,
  SourceList,
  UserBubble,
  ViewedRow,
} from '@/components/chat/ChatSurface';
import AuraReveal, { SectionLabel } from './AuraReveal';

/**
 * Product showcase. It renders the real chat surface with a fixed transcript, so
 * the landing page shows the exact window a user gets after they log in.
 */
export default function AuraInterface() {
  return (
    <section
      id="interface"
      className="mx-auto w-full max-w-[1400px] scroll-mt-24 border-b border-white/5 px-6 py-20"
    >
      <SectionLabel className="mb-12">The Interface</SectionLabel>

      <div className="mb-12 grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-end">
        <AuraReveal>
          <h2 className="max-w-2xl text-3xl font-medium leading-[1.1] tracking-tight text-white md:text-5xl">
            One chat. Every answer cited.
          </h2>
        </AuraReveal>
        <AuraReveal delay={0.05}>
          <p className="max-w-md text-sm font-light leading-relaxed text-zinc-400">
            Ask a question in plain language. Rengera searches the published law, shows you what it
            read, and hands back the articles it used — so nothing stays hidden behind a summary.
          </p>
        </AuraReveal>
      </div>

      <AuraReveal>
        <div className="rounded-[32px] bg-[#e6e6e6] p-4 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.8)] md:p-10">
          <ChatFrame className="mx-auto h-[640px] max-w-[680px]">
            <ChatTopBar title="Rengera consultation" />

            <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto">
              <div className="mx-auto flex w-full max-w-[560px] flex-col gap-5 px-5 pb-6 pt-2 sm:px-7">
                <div className="flex flex-col gap-2">
                  <ContextChip icon={<Sparkles size={11} strokeWidth={2.5} />}>
                    Labour dispute
                  </ContextChip>
                  <UserBubble>
                    My employer refuses to pay me for overtime. What should I do?
                  </UserBubble>
                </div>

                <div className="flex flex-col gap-3">
                  <AssistantBlock>
                    <p className="mb-2.5 mt-0 text-[13px] leading-[1.65]">
                      Under Rwandan labour law, overtime is payable and an employer cannot refuse it
                      as a matter of course. <CitationChip>N° 66/2018</CitationChip>
                    </p>

                    <AssistantHeading>What the law says</AssistantHeading>
                    <BulletList>
                      <Bullet>
                        Overtime must be agreed in writing and paid at the rate fixed by the
                        regulations. <CitationChip>Art. 89</CitationChip>
                      </Bullet>
                      <Bullet>
                        The employer must keep a record of hours worked and produce it on
                        request. <CitationChip>Art. 91</CitationChip>
                      </Bullet>
                      <Bullet>
                        Unpaid overtime can be claimed before the labour inspector, then before
                        the employment council. <CitationChip>Art. 116</CitationChip>
                      </Bullet>
                    </BulletList>

                    <AssistantHeading>Key takeaways</AssistantHeading>
                    <BulletList>
                      <Bullet>
                        A refusal to pay is a violation, not a private disagreement — keep any
                        written contract, payslips or messages.
                      </Bullet>
                      <Bullet>
                        Claims are time-bound. Do not wait for the payslip season to end before
                        filing.
                      </Bullet>
                    </BulletList>
                  </AssistantBlock>

                  <ViewedRow source="Labour Law N° 66/2018" />

                  <SourceList
                    countLabel="4 results"
                    items={[
                      {
                        key: '1',
                        title: 'Labour Law N° 66/2018 — Article 89 (Overtime)',
                        active: true,
                      },
                      {
                        key: '2',
                        title: 'Labour Law N° 66/2018 — Article 91 (Record of hours)',
                      },
                      {
                        key: '3',
                        title: 'Labour Law N° 66/2018 — Article 116 (Dispute settlement)',
                      },
                      {
                        key: '4',
                        title: 'Law N° 027/2023 — Labour inspection amendments',
                        icon: <FileText size={12} strokeWidth={2} />,
                      },
                    ]}
                  />
                </div>

                <GeneratingRow label="Generating your next answer…" />
              </div>
            </div>

            <ScrollDownButton />

            <ComposerFrame>
              <div className="flex flex-col">
                <div className="mb-2">
                  <ComposerChip label="Overtime claim" />
                </div>
                <p className="px-1 py-1 text-[16px] leading-[1.5] text-[#9aa0a6]">Ask anything</p>
                <div className="mt-1 flex items-end justify-between gap-2">
                  <ComposerToolbar />
                </div>
              </div>
            </ComposerFrame>

            <ChatDisclaimer>
              Rengera AI can make mistakes. Please use with discretion and verify before you act.
            </ChatDisclaimer>
          </ChatFrame>
        </div>
      </AuraReveal>
    </section>
  );
}