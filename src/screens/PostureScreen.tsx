import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { GlassCard, PrimaryButton } from '../components/ui';
import { TipVisual, TipVisualKind } from '../components/TipVisual';
import { MoveAnimation } from '../components/MoveAnimation';
import { X, Check, Play, Laptop, Eye, Sparkles } from 'lucide-react';

interface PostureChecklistItem {
  id: string;
  partLabel: string;
  question: string;
  cue: string;
  fixTip: string;
  tipVisual: TipVisualKind;
  calloutPos: { x: number; y: number };
}

const POSTURE_ITEMS: PostureChecklistItem[] = [
  {
    id: 'head_neck',
    partLabel: 'Head and neck',
    question: 'Are your ears gently stacked over your shoulders?',
    cue: 'Gently glide your chin back 1 inch so your neck feels long.',
    fixTip: 'Raise your screen or tilt your laptop back so your chin does not jut forward.',
    tipVisual: 'eye-level',
    calloutPos: { x: 112, y: 28 },
  },
  {
    id: 'shoulders',
    partLabel: 'Shoulders',
    question: 'Are your shoulders relaxed down away from your ears?',
    cue: 'Exhale and let your shoulder blades rest wide and heavy.',
    fixTip: 'Bring your keyboard and mouse closer so your elbows rest right by your ribs.',
    tipVisual: 'shoulder-relax',
    calloutPos: { x: 112, y: 52 },
  },
  {
    id: 'back',
    partLabel: 'Back',
    question: 'Is your lower back supported by your chair or a small cushion?',
    cue: 'Scoot your hips all the way back into the chair and place a rolled towel at your belt line.',
    fixTip: 'Use a small pillow or rolled towel behind your lower back to support its natural curve.',
    tipVisual: 'feet-elbows-back',
    calloutPos: { x: 96, y: 74 },
  },
  {
    id: 'wrists',
    partLabel: 'Wrists',
    question: 'Are your elbows near 90° with wrists floating straight?',
    cue: 'Keep wrists straight and neutral rather than bent upward on the desk edge.',
    fixTip: 'Adjust chair height so your forearms are level with the keyboard.',
    tipVisual: 'wrist-neutral',
    calloutPos: { x: 146, y: 68 },
  },
  {
    id: 'feet',
    partLabel: 'Feet',
    question: 'Are both feet resting flat on the floor or a footrest?',
    cue: 'Uncross your legs and plant both heels comfortably underneath your knees.',
    fixTip: 'Place a book or box under your feet if your chair is high.',
    tipVisual: 'feet-elbows-back',
    calloutPos: { x: 162, y: 116 },
  },
];

const POSTURE_MOVES = [
  { id: 'chin_tuck', name: 'Chin Tucks', durationSec: 45 },
  { id: 'wall_angel', name: 'Wall Angels', durationSec: 45 },
  { id: 'shoulder_blade_squeeze', name: 'Blade Squeeze', durationSec: 45 },
  { id: 'chest_opener', name: 'Chest Opener', durationSec: 45 },
];

type TriAnswer = 'yes' | 'unsure' | 'no';

export const PostureScreen: React.FC = () => {
  const { setShowPostureCheck, startSession, showToast } = useApp();

  // Section 7.1: All 5 items start unanswered (0 of 5)
  const [answers, setAnswers] = useState<Record<string, TriAnswer>>({});
  const [selectedCalloutId, setSelectedCalloutId] = useState<string>('head_neck');
  const [selectedDurationMin, setSelectedDurationMin] = useState<2 | 3 | 5>(2);

  const answeredCount = Object.keys(answers).length;
  const activeCallout =
    POSTURE_ITEMS.find((i) => i.id === selectedCalloutId) || POSTURE_ITEMS[0];

  const setAnswer = (id: string, val: TriAnswer) => {
    setAnswers((prev) => ({ ...prev, [id]: val }));
    setSelectedCalloutId(id);
  };

  const handleSavePostureCheck = () => {
    if (answeredCount === 0) return;
    const yesCount = Object.values(answers).filter((v) => v === 'yes').length;
    showToast(
      `Posture check saved (${yesCount}/${answeredCount} aligned). Keep moving gently!`,
      'success'
    );
    setShowPostureCheck(false);
  };

  const handleStartPostureReset = () => {
    const moveIds =
      selectedDurationMin === 2
        ? ['chin_tuck', 'shoulder_blade_squeeze']
        : selectedDurationMin === 3
        ? ['chin_tuck', 'shoulder_blade_squeeze', 'chest_opener']
        : ['chin_tuck', 'wall_angel', 'shoulder_blade_squeeze', 'chest_opener', 'seated_cat_cow'];

    setShowPostureCheck(false);
    startSession({
      title: `${selectedDurationMin}-Minute Posture Reset`,
      moveIds,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-[var(--bg-mid)] flex flex-col justify-between p-5 max-w-[430px] mx-auto overflow-y-auto">
      <div className="space-y-5 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Interactive Posture Guide
            </span>
            <h1 className="text-2xl font-display font-extrabold text-[var(--text)]">
              60-Second Posture Check
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setShowPostureCheck(false)}
            className="w-10 h-10 rounded-2xl bg-white/85 dark:bg-[#162636] flex items-center justify-center text-[var(--text)] shadow-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section 7.2: Interactive Annotated Figure with 5 Tappable Callout Bubbles */}
        <GlassCard className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text)] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-500" /> Tap a body point to inspect
            </span>
            <span className="text-xs font-bold text-[#0A5C80] dark:text-[#7CD6FF]">
              {answeredCount} of {POSTURE_ITEMS.length} checked
            </span>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-[#E9F7FF] via-[#F4FAFF] to-[#EBFDF5] dark:from-[#10202E] dark:via-[#142738] dark:to-[#122A2B] border border-sky-200/70 dark:border-white/10 p-3">
            <svg viewBox="0 0 260 140" className="w-full h-40" fill="none">
              {/* Floor & Desk */}
              <rect x="20" y="124" width="220" height="5" rx="2.5" fill="#CBD5E1" opacity="0.7" />
              <rect x="158" y="72" width="68" height="6" rx="3" fill="#94A3B8" />
              <line x1="206" y1="78" x2="206" y2="124" stroke="#94A3B8" strokeWidth="5" strokeLinecap="round" />

              {/* Monitor at eye level */}
              <rect x="192" y="28" width="8" height="32" rx="3" fill="#0F2A3A" />
              <rect x="184" y="60" width="24" height="12" rx="2" fill="#FFD24D" />
              <line
                x1="126"
                y1="30"
                x2="188"
                y2="34"
                stroke="#5EE6B0"
                strokeWidth="2"
                strokeDasharray="4 4"
              />

              {/* Chair */}
              <path
                d="M88 38 L88 90 L136 90"
                stroke="#94A3B8"
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <line x1="112" y1="90" x2="112" y2="124" stroke="#94A3B8" strokeWidth="6" strokeLinecap="round" />
              {/* Lumbar pillow */}
              <ellipse cx="96" cy="74" rx="7" ry="13" fill="#FFD24D" />

              {/* Seated Side-View Figure */}
              <circle cx="112" cy="28" r="12" fill="#0F2A3A" />
              <line x1="112" y1="42" x2="112" y2="82" stroke="#2EB8F5" strokeWidth="16" strokeLinecap="round" />
              {/* Arm at 90 deg */}
              <path
                d="M112 52 L112 70 L146 70"
                stroke="#27C8E8"
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Thigh & lower leg */}
              <path
                d="M112 82 L152 82 L152 118 L168 118"
                stroke="#0F2A3A"
                strokeWidth="10"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* 5 Tappable Callout Bubbles */}
              {POSTURE_ITEMS.map((item, idx) => {
                const isSelected = selectedCalloutId === item.id;
                const ans = answers[item.id];
                const fill =
                  ans === 'yes'
                    ? '#24B47E'
                    : ans === 'no'
                    ? '#FF7A59'
                    : isSelected
                    ? '#2EB8F5'
                    : '#0F2A3A';

                return (
                  <g
                    key={item.id}
                    onClick={() => setSelectedCalloutId(item.id)}
                    className="cursor-pointer"
                  >
                    {isSelected && (
                      <circle
                        cx={item.calloutPos.x}
                        cy={item.calloutPos.y}
                        r="14"
                        fill="#2EB8F5"
                        opacity="0.28"
                      />
                    )}
                    <circle
                      cx={item.calloutPos.x}
                      cy={item.calloutPos.y}
                      r="9.5"
                      fill={fill}
                      stroke="#FFFFFF"
                      strokeWidth="2"
                    />
                    <text
                      x={item.calloutPos.x}
                      y={item.calloutPos.y + 3.5}
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize="9.5"
                      fontWeight="800"
                    >
                      {idx + 1}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Quick part selector chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {POSTURE_ITEMS.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedCalloutId(item.id)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                    selectedCalloutId === item.id
                      ? 'bg-sky-500 text-white shadow-sm'
                      : 'bg-white/85 dark:bg-[#162636] text-[var(--text)]'
                  }`}
                >
                  {idx + 1}. {item.partLabel}
                </button>
              ))}
            </div>
          </div>

          {/* Active Callout Explanation Card */}
          <div className="p-3.5 rounded-2xl bg-sky-500/10 dark:bg-sky-400/15 border border-sky-400/30 space-y-1">
            <div className="text-xs font-display font-extrabold text-[#0A5C80] dark:text-[#7CD6FF]">
              {activeCallout.partLabel}
            </div>
            <p className="text-xs font-medium text-[var(--text)] leading-relaxed">
              {activeCallout.cue}
            </p>
          </div>
        </GlassCard>

        {/* Section 7.1: 5-Point Checklist with Yes / Not sure / No */}
        <div className="space-y-2.5">
          <h3 className="font-display font-bold text-sm text-[var(--text)] px-1">
            Check Your Alignment ({answeredCount} of {POSTURE_ITEMS.length})
          </h3>

          {POSTURE_ITEMS.map((item, idx) => {
            const ans = answers[item.id];
            return (
              <GlassCard key={item.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#0A5C80] dark:text-[#7CD6FF]">
                      {idx + 1}. {item.partLabel}
                    </span>
                    <div className="font-display font-bold text-sm text-[var(--text)] mt-0.5">
                      {item.question}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'yes' as TriAnswer, label: 'Yes', activeClass: 'bg-emerald-500 text-white border-emerald-500' },
                    { key: 'unsure' as TriAnswer, label: 'Not sure', activeClass: 'bg-sky-500 text-white border-sky-500' },
                    { key: 'no' as TriAnswer, label: 'No', activeClass: 'bg-amber-500 text-white border-amber-500' },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setAnswer(item.id, opt.key)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        ans === opt.key
                          ? opt.activeClass
                          : 'bg-white/85 dark:bg-[#162636] border-slate-200/80 dark:border-white/15 text-[var(--text)]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* When user taps "No" or "Not sure", reveal adjustment tip + TipVisual */}
                {(ans === 'no' || ans === 'unsure') && (
                  <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 space-y-2">
                    <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                      Quick fix: {item.fixTip}
                    </p>
                    <TipVisual kind={item.tipVisual} />
                  </div>
                )}
              </GlassCard>
            );
          })}

          <PrimaryButton
            onClick={handleSavePostureCheck}
            disabled={answeredCount === 0}
            variant="outline"
            className="w-full"
          >
            <Check className="w-4 h-4" />
            {answeredCount === 0
              ? 'Answer at least 1 item to save'
              : `Save posture check (${answeredCount}/${POSTURE_ITEMS.length})`}
          </PrimaryButton>
        </div>

        {/* Section 7.2: Horizontal Row of Exercise Thumbnails + Duration Selector */}
        <GlassCard className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-sm text-[var(--text)]">
              Posture Reset Moves
            </h3>
            <div className="flex items-center gap-1">
              {([2, 3, 5] as const).map((min) => (
                <button
                  key={min}
                  type="button"
                  onClick={() => setSelectedDurationMin(min)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    selectedDurationMin === min
                      ? 'bg-sky-500 text-white'
                      : 'bg-slate-500/10 text-[var(--text-soft)]'
                  }`}
                >
                  {min} min
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {POSTURE_MOVES.map((pm) => (
              <div
                key={pm.id}
                className="min-w-[165px] p-2.5 rounded-2xl bg-white/85 dark:bg-[#162636] border border-slate-200/70 dark:border-white/10 flex flex-col justify-between gap-2 shrink-0"
              >
                <MoveAnimation
                  moveId={pm.id}
                  height={130}
                  interactive={false}
                  showMetaChips={false}
                />
                <div className="flex items-center justify-between gap-1 px-1">
                  <div>
                    <div className="font-display font-bold text-xs text-[var(--text)]">
                      {pm.name}
                    </div>
                    <div className="text-[10px] text-[var(--text-soft)] font-semibold">
                      {pm.durationSec}s
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPostureCheck(false);
                      startSession({
                        title: pm.name,
                        moveIds: [pm.id],
                      });
                    }}
                    className="px-2.5 py-1.5 rounded-xl primary-gradient text-white text-[11px] font-bold inline-flex items-center gap-1"
                  >
                    <Play className="w-3 h-3 fill-white" /> Start
                  </button>
                </div>
              </div>
            ))}
          </div>

          <PrimaryButton onClick={handleStartPostureReset} className="w-full">
            <Play className="w-4 h-4 fill-white" /> Start {selectedDurationMin}-Min Posture Reset
          </PrimaryButton>
        </GlassCard>

        {/* Section 8: Visual Ergonomic Tips */}
        <GlassCard className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0A5C80] dark:text-[#7CD6FF]">
            <Laptop className="w-4 h-4" /> Laptop & Desk Setup
          </div>
          <p className="text-xs text-[var(--text-soft)] leading-relaxed">
            On a laptop without a stand? Tilt the screen back slightly so your eyes look downward
            without dropping your whole head, or prop it on two sturdy books.
          </p>
          <TipVisual kind="laptop-tilt" />

          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 pt-1">
            <Eye className="w-4 h-4" /> 20-20-20 Eye Rule
          </div>
          <p className="text-xs text-[var(--text-soft)] leading-relaxed">
            Every 20 minutes, look at something 20 feet away for 20 seconds and blink slowly 5
            times.
          </p>
          <TipVisual kind="eye-20-20-20" />
        </GlassCard>
      </div>
    </div>
  );
};
