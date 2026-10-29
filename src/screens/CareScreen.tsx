import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { GlassCard, PrimaryButton, TabHeader } from '../components/ui';
import { TipVisual, getTipVisualKindForCondition } from '../components/TipVisual';
import { MoveAnimation } from '../components/MoveAnimation';
import {
  HeartHandshake,
  Play,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  SlidersHorizontal,
  ShieldAlert,
  ArrowLeft,
} from 'lucide-react';
import careCardsData from '../data/careCards.json';
import movesData from '../data/moves.json';
import { CareCardData, MoveItem, ConditionId } from '../types';

const careCards: CareCardData[] = careCardsData as CareCardData[];
const moves: MoveItem[] = movesData as MoveItem[];

/**
 * Section 5.1: Straight horizontal progress bar (0..10 comfort/discomfort score).
 * Replaces the old slanted sparkline line so rows never look tilted.
 */
const HorizontalScoreBar: React.FC<{ score: number }> = ({ score }) => {
  const clamped = Math.max(0, Math.min(10, score));
  const pct = (clamped / 10) * 100;
  return (
    <div
      className="w-20 h-2.5 rounded-full bg-white/95 dark:bg-white/15 border border-slate-200/80 dark:border-white/15 overflow-hidden shrink-0"
      aria-label={`Discomfort score ${clamped} out of 10`}
    >
      {pct > 0 && (
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${pct}%`,
            background:
              clamped <= 3
                ? 'linear-gradient(90deg, #5EE6B0 0%, #24B47E 100%)'
                : clamped <= 6
                ? 'linear-gradient(90deg, #27C8E8 0%, #2EB8F5 100%)'
                : 'linear-gradient(90deg, #FFD24D 0%, #FF7A59 100%)',
          }}
        />
      )}
    </div>
  );
};

export const CareScreen: React.FC = () => {
  const { profile, painLogs, startSession, setShowPainCheckin } = useApp();
  const [selectedCard, setSelectedCard] = useState<CareCardData | null>(null);

  const userConditions = profile?.conditions || [];
  const prioritizedCards = [
    ...careCards.filter((c) => userConditions.includes(c.id)),
    ...careCards.filter((c) => !userConditions.includes(c.id)),
  ];

  const getLatestScoreForCondition = (condId: ConditionId): number => {
    const recent = painLogs.find((l) => typeof l.scores[condId] === 'number');
    if (recent) return recent.scores[condId];
    if (profile?.painBaseline && typeof profile.painBaseline[condId] === 'number') {
      return profile.painBaseline[condId];
    }
    return 0;
  };

  if (selectedCard) {
    const cardMoves = selectedCard.recommendedMoveIds
      .map((id) => moves.find((m) => m.id === id))
      .filter(Boolean) as MoveItem[];
    const primaryMove = cardMoves[0] || moves[0];
    const currentScore = getLatestScoreForCondition(selectedCard.id);

    return (
      <div className="space-y-5 pb-28 animate-in fade-in duration-200">
        <div className="flex items-center justify-between pt-4">
          <button
            type="button"
            onClick={() => setSelectedCard(null)}
            className="px-3.5 py-2 rounded-2xl bg-white/85 dark:bg-[#162636] text-xs font-bold text-[var(--text)] flex items-center gap-1.5 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Care
          </button>
          <button
            type="button"
            onClick={() => setShowPainCheckin(true)}
            className="px-3.5 py-2 rounded-2xl bg-sky-500/15 text-[#0A5C80] dark:text-[#7CD6FF] text-xs font-bold flex items-center gap-1.5"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" /> Check in ({currentScore}/10)
          </button>
        </div>

        {/* Top card with TipVisual illustration */}
        <GlassCard className="p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
              <HeartHandshake className="w-3.5 h-3.5" /> Gentle Self-Care Guide
            </span>
            <div className="flex items-center gap-2">
              <HorizontalScoreBar score={currentScore} />
              <span className="text-xs font-bold text-[var(--text-soft)]">{currentScore}/10</span>
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-display font-extrabold text-[var(--text)]">
              {selectedCard.title}
            </h1>
            <p className="text-sm text-[var(--text-soft)] leading-relaxed mt-1">
              {selectedCard.summary}
            </p>
          </div>

          <TipVisual kind={getTipVisualKindForCondition(selectedCard.id)} />

          <PrimaryButton
            onClick={() =>
              startSession({
                title: `${selectedCard.shortTitle} Relief Flow`,
                moveIds: selectedCard.recommendedMoveIds,
              })
            }
            className="w-full"
          >
            <Play className="w-4 h-4 fill-white" /> Start 3-Min Relief Flow
          </PrimaryButton>
        </GlassCard>

        {/* 1. What to do now (3 short bullets) */}
        <GlassCard className="p-5 space-y-3">
          <h3 className="font-display font-bold text-base text-[var(--text)] flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" /> What to do now
          </h3>
          <ul className="space-y-2 text-xs text-[var(--text)]">
            {selectedCard.whatHelps.slice(0, 3).map((item, i) => (
              <li key={i} className="flex items-start gap-2.5 leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </GlassCard>

        {/* 2. What to avoid */}
        <GlassCard className="p-5 space-y-3">
          <h3 className="font-display font-bold text-base text-[var(--text)] flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" /> What to avoid
          </h3>
          <ul className="space-y-2 text-xs text-[var(--text)]">
            {selectedCard.modifyOrSkip.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5 leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </GlassCard>

        {/* 3. The one move to try (with MoveAnimation visual demo) */}
        {primaryMove && (
          <GlassCard className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#0A5C80] dark:text-[#7CD6FF]">
                  The One Move To Try
                </span>
                <h3 className="font-display font-bold text-base text-[var(--text)]">
                  {primaryMove.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() =>
                  startSession({
                    title: primaryMove.name,
                    moveIds: [primaryMove.id],
                  })
                }
                className="px-3.5 py-2 rounded-xl primary-gradient text-white text-xs font-bold inline-flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-white" /> Try 1 Min
              </button>
            </div>

            <MoveAnimation moveId={primaryMove.id} height={200} />

            <p className="text-xs text-[var(--text-soft)] leading-relaxed">
              <strong>Easier option:</strong> {primaryMove.easierVariant}
            </p>
          </GlassCard>
        )}

        {/* 4. When to see a doctor */}
        <GlassCard className="p-5 space-y-2.5 bg-rose-500/5 border-rose-200/60 dark:border-rose-500/20">
          <h3 className="font-display font-bold text-sm text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" /> When to see a doctor
          </h3>
          <ul className="space-y-1.5 text-xs text-[var(--text-soft)]">
            {selectedCard.redFlags.map((item, i) => (
              <li key={i} className="flex items-start gap-2 leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-28">
      <TabHeader
        title="Comfort & Care"
        subtitle="Joint-friendly relief guides & gentle comfort tracking."
        rightAction={
          <button
            type="button"
            onClick={() => setShowPainCheckin(true)}
            className="px-3.5 py-2 rounded-2xl primary-gradient text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Check in
          </button>
        }
      />

      {/* Comfort Check Summary Banner */}
      <GlassCard
        onClick={() => setShowPainCheckin(true)}
        className="p-4 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 via-sky-500/10 to-purple-500/10"
      >
        <div className="space-y-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
            Adaptive Pacing
          </span>
          <h3 className="font-display font-bold text-sm text-[var(--text)]">
            How does your body feel today?
          </h3>
          <p className="text-xs text-[var(--text-soft)]">
            Log stiffness or comfort (0–10) to adjust today&apos;s plan automatically.
          </p>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-white dark:bg-[#162636] flex items-center justify-center text-sky-500 shrink-0 shadow-sm">
          <ChevronRight className="w-5 h-5" />
        </div>
      </GlassCard>

      {/* Care Cards Grid with straight horizontal progress bars */}
      <div className="space-y-3">
        <h3 className="font-display font-bold text-base text-[var(--text)] px-1">
          Self-Care & Relief Guides
        </h3>

        <div className="grid grid-cols-1 gap-3">
          {prioritizedCards.map((card) => {
            const isUserFocus = userConditions.includes(card.id);
            const currentScore = getLatestScoreForCondition(card.id);

            return (
              <GlassCard
                key={card.id}
                onClick={() => setSelectedCard(card)}
                className={`p-4 flex items-center justify-between gap-3 ${
                  isUserFocus ? 'border-sky-300/80 dark:border-sky-500/40' : ''
                }`}
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display font-bold text-base text-[var(--text)]">
                      {card.shortTitle}
                    </span>
                    {isUserFocus && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/15 text-[#0A5C80] dark:text-[#7CD6FF] flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" /> Your Focus
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-soft)] line-clamp-2 leading-relaxed">
                    {card.summary}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <HorizontalScoreBar score={currentScore} />
                  <span className="text-[11px] font-bold text-[var(--text-soft)]">
                    {currentScore}/10
                  </span>
                </div>
              </GlassCard>
            );
          })}
        </div>
      </div>
    </div>
  );
};
