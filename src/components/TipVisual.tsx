import React from 'react';
import { ConditionId } from '../types';

export type TipVisualKind =
  | 'laptop-tilt'
  | 'eye-level'
  | 'feet-elbows-back'
  | 'eye-20-20-20'
  | 'spine-shift'
  | 'wrist-neutral'
  | 'neck-nod'
  | 'hip-stand'
  | 'knee-chair'
  | 'ankle-pump'
  | 'shoulder-relax';

export function getTipVisualKindForCondition(id: ConditionId): TipVisualKind {
  switch (id) {
    case 'neck_cs':
      return 'neck-nod';
    case 'upper_back':
    case 'shoulder':
      return 'shoulder-relax';
    case 'lower_back':
      return 'feet-elbows-back';
    case 'wrist_hand':
      return 'wrist-neutral';
    case 'knee':
      return 'knee-chair';
    case 'hip_glute':
      return 'hip-stand';
    case 'ankle_foot':
      return 'ankle-pump';
    case 'eye_strain':
      return 'eye-20-20-20';
    case 'stiff_sitting':
    case 'low_energy':
    default:
      return 'spine-shift';
  }
}

export const TipVisual: React.FC<{
  kind: TipVisualKind;
  className?: string;
}> = ({ kind, className = '' }) => {
  return (
    <div
      className={`w-full rounded-2xl bg-gradient-to-br from-[#E9F7FF] via-[#F4FAFF] to-[#F6F3FF] dark:from-[#122230] dark:via-[#152838] dark:to-[#192D40] border border-sky-200/60 dark:border-white/10 p-3 flex items-center justify-center overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {kind === 'laptop-tilt' && (
        <svg viewBox="0 0 280 120" className="w-full max-w-[260px] h-[108px]" fill="none">
          {/* Desk surface */}
          <rect x="20" y="96" width="240" height="8" rx="4" fill="#CBD5E1" opacity="0.7" />
          {/* Seated head & eyes on left */}
          <circle cx="58" cy="40" r="16" fill="#2EB8F5" />
          <path d="M40 96 C40 68, 76 68, 76 96 Z" fill="#27C8E8" />
          {/* Eye-level dotted line */}
          <line
            x1="78"
            y1="40"
            x2="212"
            y2="46"
            stroke="#2EB8F5"
            strokeWidth="2.5"
            strokeDasharray="5 5"
            strokeLinecap="round"
          />
          <circle cx="67" cy="38" r="2.5" fill="#FFFFFF" />
          {/* Laptop base on desk */}
          <rect x="164" y="88" width="56" height="8" rx="4" fill="#0F2A3A" />
          {/* Tilted laptop screen */}
          <line
            x1="214"
            y1="90"
            x2="232"
            y2="34"
            stroke="#0F2A3A"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <line
            x1="214"
            y1="88"
            x2="230"
            y2="38"
            stroke="#5EE6B0"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {/* Curved tilt arrow */}
          <path
            d="M198 48 C206 34, 222 26, 240 30"
            stroke="#FF7A59"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path d="M235 24 L243 31 L234 35" stroke="#FF7A59" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="96" y="14" width="84" height="20" rx="10" fill="#FFFFFF" opacity="0.9" />
          <text x="138" y="27" textAnchor="middle" fill="#0F2A3A" fontSize="10" fontWeight="700">
            Tilt 15° back
          </text>
        </svg>
      )}

      {kind === 'eye-level' && (
        <svg viewBox="0 0 280 120" className="w-full max-w-[260px] h-[108px]" fill="none">
          {/* Desk */}
          <rect x="20" y="98" width="240" height="7" rx="3.5" fill="#CBD5E1" opacity="0.7" />
          {/* Person */}
          <circle cx="58" cy="38" r="15" fill="#2EB8F5" />
          <circle cx="67" cy="36" r="2.5" fill="#FFFFFF" />
          <path d="M40 98 C40 66, 76 66, 76 98 Z" fill="#27C8E8" />
          {/* Horizontal dotted eye-level line */}
          <line
            x1="78"
            y1="36"
            x2="196"
            y2="36"
            stroke="#5EE6B0"
            strokeWidth="3"
            strokeDasharray="6 5"
            strokeLinecap="round"
          />
          {/* Stack of books under monitor */}
          <rect x="184" y="88" width="60" height="10" rx="3" fill="#B9A6FF" />
          <rect x="188" y="78" width="52" height="10" rx="3" fill="#FFD24D" />
          {/* Monitor stand & screen */}
          <rect x="210" y="66" width="8" height="12" rx="2" fill="#0F2A3A" />
          <rect x="198" y="74" width="32" height="5" rx="2.5" fill="#0F2A3A" />
          <rect x="188" y="30" width="52" height="38" rx="6" fill="#0F2A3A" />
          <rect x="193" y="35" width="42" height="28" rx="4" fill="#2EB8F5" opacity="0.35" />
          <rect x="94" y="14" width="84" height="18" rx="9" fill="#FFFFFF" opacity="0.9" />
          <text x="136" y="26" textAnchor="middle" fill="#0F2A3A" fontSize="9.5" fontWeight="700">
            Top at eye level
          </text>
        </svg>
      )}

      {kind === 'feet-elbows-back' && (
        <svg viewBox="0 0 280 128" className="w-full max-w-[260px] h-[112px]" fill="none">
          {/* Floor */}
          <rect x="30" y="114" width="220" height="6" rx="3" fill="#CBD5E1" opacity="0.7" />
          {/* Chair back & seat */}
          <path d="M98 30 L98 84 L144 84" stroke="#94A3B8" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="118" y1="84" x2="118" y2="114" stroke="#94A3B8" strokeWidth="6" strokeLinecap="round" />
          {/* Lower back cushion */}
          <ellipse cx="105" cy="66" rx="8" ry="14" fill="#FFD24D" />
          {/* Seated figure */}
          <circle cx="118" cy="24" r="12" fill="#2EB8F5" />
          {/* Torso */}
          <line x1="118" y1="38" x2="118" y2="76" stroke="#27C8E8" strokeWidth="14" strokeLinecap="round" />
          {/* Upper arm + forearm at 90 deg */}
          <path d="M118 46 L118 66 L146 66" stroke="#0F2A3A" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          {/* 90 deg elbow indicator */}
          <path d="M118 56 L128 56 L128 66" stroke="#5EE6B0" strokeWidth="2.5" strokeLinecap="round" />
          {/* Thigh + lower leg + flat feet */}
          <path d="M118 76 L154 76 L154 110 L170 110" stroke="#2EB8F5" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
          {/* Labels */}
          <rect x="180" y="22" width="84" height="22" rx="11" fill="#FFFFFF" opacity="0.92" />
          <text x="222" y="36" textAnchor="middle" fill="#0F2A3A" fontSize="9.5" fontWeight="700">
            90° Elbows
          </text>
          <rect x="180" y="52" width="84" height="22" rx="11" fill="#FFFFFF" opacity="0.92" />
          <text x="222" y="66" textAnchor="middle" fill="#0F2A3A" fontSize="9.5" fontWeight="700">
            Back supported
          </text>
          <rect x="180" y="82" width="84" height="22" rx="11" fill="#FFFFFF" opacity="0.92" />
          <text x="222" y="96" textAnchor="middle" fill="#0F2A3A" fontSize="9.5" fontWeight="700">
            Feet flat
          </text>
        </svg>
      )}

      {kind === 'eye-20-20-20' && (
        <svg viewBox="0 0 280 116" className="w-full max-w-[260px] h-[104px]" fill="none">
          {/* Soft eye shape on left */}
          <path
            d="M24 58 C42 34, 74 34, 92 58 C74 82, 42 82, 24 58 Z"
            fill="#FFFFFF"
            stroke="#2EB8F5"
            strokeWidth="4"
          />
          <circle cx="58" cy="58" r="11" fill="#2EB8F5" />
          <circle cx="61" cy="55" r="3.5" fill="#FFFFFF" />
          {/* Dashed gaze arrow */}
          <line
            x1="102"
            y1="58"
            x2="196"
            y2="58"
            stroke="#5EE6B0"
            strokeWidth="3.5"
            strokeDasharray="6 5"
            strokeLinecap="round"
          />
          <path d="M190 51 L200 58 L190 65" stroke="#5EE6B0" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* Distant window with tree/sun */}
          <rect x="210" y="24" width="48" height="68" rx="10" fill="#FFFFFF" stroke="#27C8E8" strokeWidth="3.5" />
          <circle cx="242" cy="40" r="7" fill="#FFD24D" />
          <path d="M214 78 Q228 62 240 74 T256 72 L256 90 L214 90 Z" fill="#5EE6B0" />
          <rect x="108" y="26" width="80" height="20" rx="10" fill="#FFFFFF" opacity="0.92" />
          <text x="148" y="39" textAnchor="middle" fill="#0F2A3A" fontSize="9.5" fontWeight="700">
            20 ft · 20 sec
          </text>
        </svg>
      )}

      {(kind === 'spine-shift' ||
        kind === 'wrist-neutral' ||
        kind === 'neck-nod' ||
        kind === 'hip-stand' ||
        kind === 'knee-chair' ||
        kind === 'ankle-pump' ||
        kind === 'shoulder-relax') && (
        <svg viewBox="0 0 280 116" className="w-full max-w-[260px] h-[104px]" fill="none">
          {/* Gentle posture wave / spine alignment visual */}
          <circle cx="62" cy="58" r="34" fill="#2EB8F5" opacity="0.14" />
          <circle cx="62" cy="38" r="12" fill="#2EB8F5" />
          <path
            d="M62 52 C60 66, 64 78, 62 92"
            stroke="#27C8E8"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Motion arrows around torso */}
          <path
            d="M36 62 C36 48, 44 40, 50 40"
            stroke="#5EE6B0"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M88 62 C88 48, 80 40, 74 40"
            stroke="#5EE6B0"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Right side summary visual pills */}
          <rect x="116" y="24" width="144" height="28" rx="14" fill="#FFFFFF" opacity="0.92" />
          <circle cx="132" cy="38" r="5" fill="#2EB8F5" />
          <text x="146" y="42" fill="#0F2A3A" fontSize="10.5" fontWeight="700">
            Change posture often
          </text>
          <rect x="116" y="62" width="144" height="28" rx="14" fill="#FFFFFF" opacity="0.92" />
          <circle cx="132" cy="76" r="5" fill="#5EE6B0" />
          <text x="146" y="80" fill="#0F2A3A" fontSize="10.5" fontWeight="700">
            Stay below 3/10 tension
          </text>
        </svg>
      )}
    </div>
  );
};
