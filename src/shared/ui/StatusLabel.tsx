import React from 'react';
import type { SemanticTone } from '@/src/shared/types/common';

interface StatusTextProps {
  tone: SemanticTone;
  label: string;
  symbol?: string;
}

const TONE_STYLES: Record<SemanticTone, string> = {
  success: 'bg-[#ECFDF3] text-[#166534] border-[#BBF7D0]',
  warning: 'bg-[#FEF7EC] text-[#B45309] border-[#FDE68A]',
  error: 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]',
  processing: 'bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]',
  neutral: 'bg-[#F1F2EE] text-[#5F645D] border-[#D9DDD4]',
  accent: 'bg-[var(--qsl-accent)] text-[var(--qsl-accent-ink)] border-[var(--qsl-accent-border)]',
};

const TONE_PREFIX: Record<SemanticTone, string> = {
  success: '✓',
  warning: '!',
  error: '×',
  processing: '•',
  neutral: '—',
  accent: '★',
};

export const StatusLabel: React.FC<StatusTextProps> = ({ tone, label, symbol }) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-[14px] font-medium whitespace-nowrap ${TONE_STYLES[tone]}`}
    >
      <span aria-hidden="true" className="text-[13px] leading-none">
        {symbol ?? TONE_PREFIX[tone]}
      </span>
      <span>{label}</span>
    </span>
  );
};
