import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Pause, Play } from 'lucide-react';
import movesData from '../data/moves.json';
import { MoveItem } from '../types';

const allMoves = movesData as MoveItem[];

interface PosePoints {
  head: [number, number];
  neck: [number, number];
  pelvis: [number, number];
  shoulderL: [number, number];
  elbowL: [number, number];
  handL: [number, number];
  shoulderR: [number, number];
  elbowR: [number, number];
  handR: [number, number];
  kneeL: [number, number];
  footL: [number, number];
  kneeR: [number, number];
  footR: [number, number];
  spineMid?: [number, number];
  highlight: 'neck' | 'shoulders' | 'spine' | 'wrists' | 'hips' | 'knees' | 'ankles' | 'eyes' | 'breath';
  chair?: boolean;
  arrowDir?: 'up-down' | 'left-right' | 'circle' | 'in-out';
}

interface MoveAnimDef {
  poseA: PosePoints;
  poseB: PosePoints;
  focusLabel: string;
  twoSided?: boolean;
}

const SEATED_BASE: PosePoints = {
  head: [100, 38],
  neck: [100, 56],
  spineMid: [100, 78],
  pelvis: [100, 102],
  shoulderL: [84, 60],
  elbowL: [76, 84],
  handL: [84, 98],
  shoulderR: [116, 60],
  elbowR: [124, 84],
  handR: [116, 98],
  kneeL: [86, 112],
  footL: [86, 146],
  kneeR: [114, 112],
  footR: [114, 146],
  highlight: 'spine',
  chair: true,
};

const STANDING_BASE: PosePoints = {
  head: [100, 32],
  neck: [100, 48],
  spineMid: [100, 72],
  pelvis: [100, 94],
  shoulderL: [82, 52],
  elbowL: [74, 76],
  handL: [78, 96],
  shoulderR: [118, 52],
  elbowR: [126, 76],
  handR: [122, 96],
  kneeL: [88, 120],
  footL: [86, 148],
  kneeR: [112, 120],
  footR: [114, 148],
  highlight: 'hips',
  chair: false,
};

function getMoveAnimDef(moveId?: string): MoveAnimDef {
  const id = (moveId || '').toLowerCase();

  // 1. Chin Tuck / Neck Release
  if (id.includes('chin_tuck') || id.includes('neck')) {
    return {
      focusLabel: 'Neck & upper spine',
      twoSided: id.includes('neck_release'),
      poseA: {
        ...SEATED_BASE,
        head: [107, 38],
        highlight: 'neck',
        arrowDir: 'left-right',
      },
      poseB: {
        ...SEATED_BASE,
        head: id.includes('neck_release') ? [90, 40] : [95, 38],
        highlight: 'neck',
        arrowDir: 'left-right',
      },
    };
  }

  // 2. Shoulder Roll / Blade Squeeze
  if (id.includes('shoulder') || id.includes('blade')) {
    return {
      focusLabel: 'Shoulders & upper back',
      poseA: {
        ...SEATED_BASE,
        shoulderL: [82, 62],
        shoulderR: [118, 62],
        elbowL: [74, 84],
        elbowR: [126, 84],
        highlight: 'shoulders',
        arrowDir: 'circle',
      },
      poseB: {
        ...SEATED_BASE,
        shoulderL: [86, 52],
        shoulderR: [114, 52],
        elbowL: [70, 76],
        elbowR: [130, 76],
        highlight: 'shoulders',
        arrowDir: 'circle',
      },
    };
  }

  // 3. Chest Opener / Wall Angel / Arm Circles
  if (id.includes('chest') || id.includes('wall_angel') || id.includes('arm_circle')) {
    return {
      focusLabel: 'Chest & shoulders',
      poseA: {
        ...STANDING_BASE,
        elbowL: [64, 58],
        handL: [66, 40],
        elbowR: [136, 58],
        handR: [134, 40],
        highlight: 'shoulders',
        arrowDir: 'up-down',
      },
      poseB: {
        ...STANDING_BASE,
        elbowL: [56, 38],
        handL: [72, 22],
        elbowR: [144, 38],
        handR: [128, 22],
        highlight: 'shoulders',
        arrowDir: 'up-down',
      },
    };
  }

  // 4. Cat-Cow / Pelvic Tilt / Seated Spine
  if (id.includes('cat_cow') || id.includes('pelvic') || id.includes('forward_fold')) {
    return {
      focusLabel: 'Mid & lower back',
      poseA: {
        ...SEATED_BASE,
        head: [104, 34],
        spineMid: [108, 76],
        highlight: 'spine',
        arrowDir: 'in-out',
      },
      poseB: {
        ...SEATED_BASE,
        head: [94, 44],
        spineMid: [90, 78],
        highlight: 'spine',
        arrowDir: 'in-out',
      },
    };
  }

  // 5. Seated Twist / Side Bend
  if (id.includes('twist') || id.includes('side_bend')) {
    return {
      focusLabel: 'Thoracic spine & ribs',
      twoSided: true,
      poseA: {
        ...STANDING_BASE,
        head: [92, 34],
        spineMid: [94, 72],
        elbowL: [66, 74],
        handL: [70, 96],
        elbowR: [126, 36],
        handR: [104, 20],
        highlight: 'spine',
        arrowDir: 'left-right',
      },
      poseB: {
        ...STANDING_BASE,
        head: [108, 34],
        spineMid: [106, 72],
        elbowL: [74, 36],
        handL: [96, 20],
        elbowR: [134, 74],
        handR: [130, 96],
        highlight: 'spine',
        arrowDir: 'left-right',
      },
    };
  }

  // 6. Wrists / Hands / Forearms
  if (
    id.includes('wrist') ||
    id.includes('prayer') ||
    id.includes('tendon') ||
    id.includes('finger') ||
    id.includes('forearm')
  ) {
    return {
      focusLabel: 'Wrists & hands',
      twoSided: id.includes('forearm'),
      poseA: {
        ...SEATED_BASE,
        elbowL: [72, 76],
        handL: [94, 68],
        elbowR: [128, 76],
        handR: [106, 68],
        highlight: 'wrists',
        arrowDir: 'circle',
      },
      poseB: {
        ...SEATED_BASE,
        elbowL: [66, 82],
        handL: [88, 78],
        elbowR: [134, 82],
        handR: [112, 78],
        highlight: 'wrists',
        arrowDir: 'circle',
      },
    };
  }

  // 7. Hip Flexor / Glute / Figure Four / Hip Hinge / Knee Hug
  if (
    id.includes('hip') ||
    id.includes('glute') ||
    id.includes('figure_four') ||
    id.includes('knee_hug')
  ) {
    return {
      focusLabel: 'Hips & glutes',
      twoSided: !id.includes('glute_squeeze') && !id.includes('hip_hinge'),
      poseA: {
        ...STANDING_BASE,
        kneeL: [84, 118],
        footL: [78, 148],
        kneeR: [116, 118],
        footR: [122, 148],
        highlight: 'hips',
        arrowDir: 'up-down',
      },
      poseB: {
        ...STANDING_BASE,
        pelvis: [98, 98],
        kneeL: [78, 102],
        footL: [82, 128],
        kneeR: [114, 120],
        footR: [114, 148],
        highlight: 'hips',
        arrowDir: 'up-down',
      },
    };
  }

  // 8. Squat / Sit to Stand / Knee Extension / Calf Raise / Balance / March
  if (
    id.includes('sit_to_stand') ||
    id.includes('squat') ||
    id.includes('knee') ||
    id.includes('march') ||
    id.includes('balance') ||
    id.includes('calf')
  ) {
    return {
      focusLabel: 'Legs, knees & balance',
      twoSided: id.includes('balance') || id.includes('knee_ext'),
      poseA: {
        ...STANDING_BASE,
        highlight: 'knees',
        arrowDir: 'up-down',
      },
      poseB: {
        ...STANDING_BASE,
        head: [100, 44],
        neck: [100, 60],
        spineMid: [100, 82],
        pelvis: [100, 106],
        elbowL: [76, 68],
        handL: [88, 64],
        elbowR: [124, 68],
        handR: [112, 64],
        kneeL: [82, 122],
        kneeR: [118, 122],
        highlight: 'knees',
        arrowDir: 'up-down',
      },
    };
  }

  // 9. Ankles / Feet / Toes
  if (id.includes('ankle') || id.includes('toe') || id.includes('foot')) {
    return {
      focusLabel: 'Ankles & feet',
      twoSided: true,
      poseA: {
        ...SEATED_BASE,
        kneeR: [118, 108],
        footR: [130, 134],
        highlight: 'ankles',
        arrowDir: 'circle',
      },
      poseB: {
        ...SEATED_BASE,
        kneeR: [118, 104],
        footR: [136, 124],
        highlight: 'ankles',
        arrowDir: 'circle',
      },
    };
  }

  // 10. Eyes
  if (id.includes('eye') || id.includes('palming') || id.includes('blink')) {
    return {
      focusLabel: 'Eye muscles & focus',
      poseA: {
        ...SEATED_BASE,
        highlight: 'eyes',
        arrowDir: 'left-right',
      },
      poseB: {
        ...SEATED_BASE,
        elbowL: [78, 60],
        handL: [92, 40],
        elbowR: [122, 60],
        handR: [108, 40],
        highlight: 'eyes',
        arrowDir: 'left-right',
      },
    };
  }

  // Default: Calm Breathing / Full Body Reset
  return {
    focusLabel: 'Full body & calm breath',
    poseA: {
      ...SEATED_BASE,
      highlight: 'breath',
      arrowDir: 'in-out',
    },
    poseB: {
      ...SEATED_BASE,
      shoulderL: [80, 56],
      shoulderR: [120, 56],
      elbowL: [68, 76],
      elbowR: [132, 76],
      handL: [74, 92],
      handR: [126, 92],
      highlight: 'breath',
      arrowDir: 'in-out',
    },
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function interpolatePose(a: PosePoints, b: PosePoints, t: number): PosePoints {
  const pt = (pa: [number, number], pb: [number, number]): [number, number] => [
    lerp(pa[0], pb[0], t),
    lerp(pa[1], pb[1], t),
  ];
  return {
    ...a,
    head: pt(a.head, b.head),
    neck: pt(a.neck, b.neck),
    spineMid: pt(a.spineMid || [100, 76], b.spineMid || [100, 76]),
    pelvis: pt(a.pelvis, b.pelvis),
    shoulderL: pt(a.shoulderL, b.shoulderL),
    elbowL: pt(a.elbowL, b.elbowL),
    handL: pt(a.handL, b.handL),
    shoulderR: pt(a.shoulderR, b.shoulderR),
    elbowR: pt(a.elbowR, b.elbowR),
    handR: pt(a.handR, b.handR),
    kneeL: pt(a.kneeL, b.kneeL),
    footL: pt(a.footL, b.footL),
    kneeR: pt(a.kneeR, b.kneeR),
    footR: pt(a.footR, b.footR),
  };
}

function getHighlightCoords(pose: PosePoints): [number, number] {
  switch (pose.highlight) {
    case 'neck':
      return pose.neck;
    case 'shoulders':
      return [(pose.shoulderL[0] + pose.shoulderR[0]) / 2, pose.shoulderL[1]];
    case 'wrists':
      return [(pose.handL[0] + pose.handR[0]) / 2, (pose.handL[1] + pose.handR[1]) / 2];
    case 'hips':
      return pose.pelvis;
    case 'knees':
      return [(pose.kneeL[0] + pose.kneeR[0]) / 2, (pose.kneeL[1] + pose.kneeR[1]) / 2];
    case 'ankles':
      return pose.footR;
    case 'eyes':
      return pose.head;
    case 'breath':
    case 'spine':
    default:
      return pose.spineMid || [100, 76];
  }
}

const FigureSvg: React.FC<{ pose: PosePoints; label?: string }> = ({ pose, label }) => {
  const spineMid = pose.spineMid || [100, 76];
  const [hx, hy] = getHighlightCoords(pose);

  return (
    <svg viewBox="0 0 200 165" className="w-full h-full" fill="none">
      {/* Soft ground shadow */}
      <ellipse cx="100" cy="152" rx="54" ry="6" fill="#2EB8F5" opacity="0.16" />

      {/* Optional chair silhouette */}
      {pose.chair && (
        <g opacity="0.45">
          <rect x="70" y="102" width="60" height="8" rx="4" fill="#94A3B8" />
          <rect x="74" y="64" width="7" height="42" rx="3.5" fill="#94A3B8" />
          <line x1="82" y1="110" x2="78" y2="148" stroke="#94A3B8" strokeWidth="5" strokeLinecap="round" />
          <line x1="118" y1="110" x2="122" y2="148" stroke="#94A3B8" strokeWidth="5" strokeLinecap="round" />
        </g>
      )}

      {/* Target Joint Soft Glow */}
      <circle cx={hx} cy={hy} r="22" fill="#5EE6B0" opacity="0.24" />
      <circle cx={hx} cy={hy} r="12" fill="#2EB8F5" opacity="0.22" />

      {/* Legs */}
      <path
        d={`M ${pose.pelvis[0] - 8} ${pose.pelvis[1]} L ${pose.kneeL[0]} ${pose.kneeL[1]} L ${pose.footL[0]} ${pose.footL[1]}`}
        stroke="#0F2A3A"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={`M ${pose.pelvis[0] + 8} ${pose.pelvis[1]} L ${pose.kneeR[0]} ${pose.kneeR[1]} L ${pose.footR[0]} ${pose.footR[1]}`}
        stroke="#0F2A3A"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Torso / Spine */}
      <path
        d={`M ${pose.neck[0]} ${pose.neck[1]} Q ${spineMid[0]} ${spineMid[1]} ${pose.pelvis[0]} ${pose.pelvis[1]}`}
        stroke="#2EB8F5"
        strokeWidth="24"
        strokeLinecap="round"
      />

      {/* Arms */}
      <path
        d={`M ${pose.shoulderL[0]} ${pose.shoulderL[1]} L ${pose.elbowL[0]} ${pose.elbowL[1]} L ${pose.handL[0]} ${pose.handL[1]}`}
        stroke="#27C8E8"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={`M ${pose.shoulderR[0]} ${pose.shoulderR[1]} L ${pose.elbowR[0]} ${pose.elbowR[1]} L ${pose.handR[0]} ${pose.handR[1]}`}
        stroke="#27C8E8"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Hands */}
      <circle cx={pose.handL[0]} cy={pose.handL[1]} r="5.5" fill="#5EE6B0" />
      <circle cx={pose.handR[0]} cy={pose.handR[1]} r="5.5" fill="#5EE6B0" />

      {/* Head (no facial features per specification) */}
      <circle cx={pose.head[0]} cy={pose.head[1]} r="14" fill="#0F2A3A" />

      {/* Direction cue arrows */}
      {pose.arrowDir === 'left-right' && (
        <g stroke="#5EE6B0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M 56 38 L 44 38 M 48 33 L 43 38 L 48 43" />
          <path d="M 144 38 L 156 38 M 152 33 L 157 38 L 152 43" />
        </g>
      )}
      {pose.arrowDir === 'up-down' && (
        <g stroke="#5EE6B0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M 156 54 L 156 34 M 151 39 L 156 33 L 161 39" />
          <path d="M 156 64 L 156 84 M 151 79 L 156 85 L 161 79" />
        </g>
      )}
      {pose.arrowDir === 'circle' && (
        <path
          d="M 148 52 A 12 12 0 1 1 138 40"
          stroke="#5EE6B0"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="4 3"
        />
      )}
      {pose.arrowDir === 'in-out' && (
        <circle
          cx={spineMid[0]}
          cy={spineMid[1]}
          r="26"
          stroke="#5EE6B0"
          strokeWidth="2"
          strokeDasharray="4 4"
        />
      )}

      {label && (
        <g>
          <rect x="64" y="4" width="72" height="18" rx="9" fill="#FFFFFF" opacity="0.9" />
          <text x="100" y="16" textAnchor="middle" fill="#0F2A3A" fontSize="9.5" fontWeight="700">
            {label}
          </text>
        </g>
      )}
    </svg>
  );
};

export const MoveAnimation: React.FC<{
  moveId?: string;
  height?: number;
  interactive?: boolean;
  showMetaChips?: boolean;
  sideLabel?: 'Left side' | 'Right side' | null;
  className?: string;
}> = ({
  moveId,
  height = 220,
  interactive = true,
  showMetaChips = true,
  sideLabel = null,
  className = '',
}) => {
  const move = allMoves.find((m) => m.id === moveId);
  const def = getMoveAnimDef(moveId);

  const [paused, setPaused] = useState(false);
  const [phase, setPhase] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);

  useEffect(() => {
    if (paused || reducedMotion) return;
    let rafId: number;
    const start = performance.now();
    const tick = (now: number) => {
      // Smooth 2.8 second loop (0 -> 1 -> 0)
      const elapsed = (now - start) / 2800;
      const t = (Math.sin(elapsed * Math.PI * 2 - Math.PI / 2) + 1) / 2;
      setPhase(t);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [paused, reducedMotion]);

  const currentPose = interpolatePose(def.poseA, def.poseB, phase);
  const focusText = move?.focusArea || def.focusLabel;
  const isTwoSided = move?.twoSided ?? def.twoSided ?? false;
  const activeSideText = sideLabel || (isTwoSided ? (phase < 0.5 ? 'Left side' : 'Right side') : null);

  return (
    <div className={`w-full ${className}`}>
      <div
        onClick={interactive && !reducedMotion ? () => setPaused((p) => !p) : undefined}
        role={interactive && !reducedMotion ? 'button' : undefined}
        tabIndex={interactive && !reducedMotion ? 0 : undefined}
        onKeyDown={
          interactive && !reducedMotion
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setPaused((p) => !p);
                }
              }
            : undefined
        }
        aria-label={
          interactive && !reducedMotion
            ? `${move?.name || 'Exercise'} animation. Tap to ${paused ? 'play' : 'pause'}`
            : `${move?.name || 'Exercise'} visual guide`
        }
        style={{ minHeight: `${height}px` }}
        className={`relative w-full rounded-[24px] bg-gradient-to-br from-[#E9F7FF] via-[#F4FAFF] to-[#EBFDF5] dark:from-[#112230] dark:via-[#15293A] dark:to-[#132C2E] border border-white/90 dark:border-white/15 shadow-inner overflow-hidden flex flex-col items-center justify-center p-3 ${
          interactive && !reducedMotion ? 'cursor-pointer select-none' : ''
        }`}
      >
        {/* Top badges inside animation stage */}
        <div className="w-full flex items-center justify-between gap-2 z-10 px-1">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/90 dark:bg-[#0F1B26]/90 border border-slate-200/70 dark:border-white/15 text-[11px] font-bold text-[#0F2A3A] dark:text-white">
            <span className="w-2 h-2 rounded-full bg-[#5EE6B0]" />
            Focus: {focusText}
          </span>

          <div className="flex items-center gap-1.5">
            {activeSideText && (
              <span className="px-2.5 py-1 rounded-full bg-sky-500/15 dark:bg-sky-400/20 text-sky-800 dark:text-sky-200 text-[11px] font-bold">
                {activeSideText}
              </span>
            )}
            {interactive && !reducedMotion && (
              <span className="w-7 h-7 rounded-full bg-white/90 dark:bg-[#0F1B26]/90 border border-slate-200/70 dark:border-white/15 flex items-center justify-center text-[#0F2A3A] dark:text-white">
                {paused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
              </span>
            )}
          </div>
        </div>

        {/* Reduced motion shows Start & Finish key poses side by side */}
        {reducedMotion ? (
          <div className="grid grid-cols-2 gap-2 w-full flex-1 items-center py-1">
            <div className="h-[145px]">
              <FigureSvg pose={def.poseA} label="Pose 1" />
            </div>
            <div className="h-[145px]">
              <FigureSvg pose={def.poseB} label="Pose 2" />
            </div>
          </div>
        ) : (
          <div className="w-full flex-1 flex items-center justify-center max-h-[175px]">
            <FigureSvg pose={currentPose} />
          </div>
        )}

        {/* Bottom caution / don't cue */}
        {showMetaChips && move?.dontCue && (
          <div className="w-full mt-1 px-2.5 py-1.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-700/40 text-[11px] font-semibold text-amber-900 dark:text-amber-200 text-center">
            Avoid: {move.dontCue}
          </div>
        )}
      </div>
    </div>
  );
};

export const ExpandableMoveDemo: React.FC<{
  moveId?: string;
  label?: string;
}> = ({ moveId, label = 'Show me how' }) => {
  const [open, setOpen] = useState(false);
  const move = allMoves.find((m) => m.id === moveId);

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 dark:bg-sky-400/15 border border-sky-500/30 dark:border-sky-400/40 text-xs font-bold text-[#0A5C80] dark:text-[#7CD6FF] hover:bg-sky-500/20 transition-colors"
      >
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {open ? 'Hide demo' : label}
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="mt-2.5 p-2.5 rounded-2xl bg-white/80 dark:bg-[#0F1B26]/80 border border-slate-200/70 dark:border-white/10 space-y-2"
        >
          <MoveAnimation moveId={moveId} height={180} />
          {move && (
            <div className="px-1 space-y-1">
              <p className="text-xs font-bold text-[var(--text)]">{move.cues[0]}</p>
              <p className="text-[11px] text-[var(--text-soft)]">Breathing: {move.breathingCue}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
