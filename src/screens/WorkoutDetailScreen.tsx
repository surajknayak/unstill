import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { GlassCard, PrimaryButton } from '../components/ui';
import { ExpandableMoveDemo } from '../components/MoveAnimation';
import {
  ArrowLeft,
  Play,
  Bookmark,
  Check,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { getSubstituteMove } from '../lib/planEngine';
import { WorkoutBlock } from '../types';

export const WorkoutDetailScreen: React.FC = () => {
  const {
    activeWorkoutDetail,
    setActiveWorkoutDetail,
    addWorkout,
    startSession,
    completeSession,
    profile,
  } = useApp();

  const [checkedBlocks, setCheckedBlocks] = useState<Record<string, boolean>>({});
  const [savedToast, setSavedToast] = useState(false);

  if (!activeWorkoutDetail || !profile) return null;

  const toggleBlock = (id: string) => {
    setCheckedBlocks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSwapBlock = (blockId: string) => {
    const updatedBlocks: WorkoutBlock[] = activeWorkoutDetail.blocks.map((b) => {
      if (b.id === blockId) {
        const sub = getSubstituteMove(b.moveId, profile);
        return {
          ...b,
          name: sub.name,
          moveId: sub.id,
          cues: sub.cues,
          breathingCue: sub.breathingCue,
          easierVariant: sub.easierVariant,
          avoidNote: sub.dontCue,
        };
      }
      return b;
    });
    setActiveWorkoutDetail({
      ...activeWorkoutDetail,
      blocks: updatedBlocks,
    });
  };

  const handleSave = async () => {
    await addWorkout(activeWorkoutDetail);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  };

  const handleStartGuided = () => {
    const moveIds = activeWorkoutDetail.blocks
      .map((b) => b.moveId)
      .filter(Boolean) as string[];
    const w = activeWorkoutDetail;
    setActiveWorkoutDetail(null);
    startSession({
      title: w.title,
      moveIds: moveIds.length > 0 ? moveIds : ['chin_tuck', 'shoulder_roll'],
      workout: w,
    });
  };

  const handleCompleteChecklist = async () => {
    await completeSession(activeWorkoutDetail.durationMin * 60);
    setActiveWorkoutDetail(null);
  };

  const phases: ('Warm-up' | 'Main' | 'Cool-down')[] = ['Warm-up', 'Main', 'Cool-down'];

  return (
    <div className="fixed inset-0 z-50 bg-[var(--bg-mid)] flex flex-col justify-between p-5 max-w-[430px] mx-auto overflow-y-auto">
      <div className="space-y-5 pb-28">
        {/* Top Nav */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => setActiveWorkoutDetail(null)}
            className="px-3.5 py-2 rounded-2xl bg-white/85 dark:bg-[#162636] text-xs font-bold text-[var(--text)] flex items-center gap-1.5 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-3.5 py-2 rounded-2xl bg-sky-500/15 text-[#0A5C80] dark:text-[#7CD6FF] text-xs font-bold flex items-center gap-1.5"
          >
            <Bookmark className="w-3.5 h-3.5" />
            {savedToast || activeWorkoutDetail.isSaved ? 'Saved!' : 'Save Routine'}
          </button>
        </div>

        {/* Header Info */}
        <GlassCard className="p-5 space-y-3 bg-gradient-to-br from-sky-500/15 to-emerald-500/10">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/85 dark:bg-[#162636] text-[#0A5C80] dark:text-[#7CD6FF]">
              {activeWorkoutDetail.goal}
            </span>
            <span className="text-xs font-semibold text-[var(--text-soft)]">
              {activeWorkoutDetail.durationMin} min · {activeWorkoutDetail.level}
            </span>
          </div>

          <h1 className="text-2xl font-display font-extrabold text-[var(--text)]">
            {activeWorkoutDetail.title}
          </h1>
          <p className="text-xs text-[var(--text-soft)]">{activeWorkoutDetail.subtitle}</p>

          <div className="pt-2 space-y-1.5">
            {activeWorkoutDetail.safeNotes.map((note, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 text-xs text-emerald-800 dark:text-emerald-300 font-medium"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{note}</span>
              </div>
            ))}
          </div>

          <PrimaryButton onClick={handleStartGuided} className="w-full mt-2">
            <Play className="w-4 h-4 fill-white" /> Start Guided Timer
          </PrimaryButton>
        </GlassCard>

        {/* Phases & Blocks with ExpandableMoveDemo */}
        {phases.map((phase) => {
          const phaseBlocks = activeWorkoutDetail.blocks.filter((b) => b.phase === phase);
          if (phaseBlocks.length === 0) return null;

          return (
            <div key={phase} className="space-y-2.5">
              <h3 className="font-display font-bold text-sm uppercase tracking-wider text-[var(--text-soft)] px-1">
                {phase} ({phaseBlocks.length})
              </h3>

              {phaseBlocks.map((block) => {
                const isChecked = !!checkedBlocks[block.id];
                return (
                  <GlassCard key={block.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => toggleBlock(block.id)}
                          className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all ${
                            isChecked
                              ? 'bg-emerald-500 text-white'
                              : 'border-2 border-sky-400/60'
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5" />}
                        </button>
                        <div>
                          <h4
                            className={`font-display font-bold text-sm text-[var(--text)] ${
                              isChecked ? 'line-through opacity-60' : ''
                            }`}
                          >
                            {block.name}
                          </h4>
                          <div className="text-xs font-bold text-[#0A5C80] dark:text-[#7CD6FF] mt-0.5">
                            {block.reps || `${block.durationSec} sec`} · {block.breathingCue}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSwapBlock(block.id)}
                        title="Swap move"
                        className="px-2.5 py-1.5 rounded-xl bg-sky-500/12 dark:bg-sky-400/15 border border-sky-500/35 text-xs font-bold text-[#0A5C80] dark:text-[#7CD6FF] inline-flex items-center gap-1"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Swap
                      </button>
                    </div>

                    <ul className="pl-9 space-y-1 text-xs text-[var(--text-soft)]">
                      {block.cues.map((c, idx) => (
                        <li key={idx}>• {c}</li>
                      ))}
                      <li className="text-emerald-700 dark:text-emerald-400 font-medium">
                        Easier: {block.easierVariant}
                      </li>
                    </ul>

                    <div className="pl-9">
                      <ExpandableMoveDemo moveId={block.moveId} />
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          );
        })}

        <PrimaryButton variant="mint" onClick={handleCompleteChecklist} className="w-full">
          <Check className="w-5 h-5" /> Mark Workout Complete
        </PrimaryButton>
      </div>
    </div>
  );
};
