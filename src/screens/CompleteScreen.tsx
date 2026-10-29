import React, { useState } from 'react';
import { GlassCard, PrimaryButton, Chip } from '../components/ui';
import { Sparkles, CheckCircle2, Flame, HeartHandshake, Award } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ConditionId } from '../types';

const HURT_AREA_OPTIONS: { id: ConditionId; label: string }[] = [
  { id: 'neck_cs', label: 'Neck' },
  { id: 'upper_back', label: 'Upper back' },
  { id: 'lower_back', label: 'Lower back' },
  { id: 'shoulder', label: 'Shoulder' },
  { id: 'wrist_hand', label: 'Wrist / hand' },
  { id: 'knee', label: 'Knee' },
  { id: 'hip_glute', label: 'Hip / glute' },
  { id: 'ankle_foot', label: 'Ankle / foot' },
];

export const CompleteScreen: React.FC<{
  title: string;
  durationSec: number;
  onDone: (
    feedback: 'easy' | 'good' | 'hard' | 'hurt' | 'none',
    hurtArea?: string
  ) => Promise<void> | void;
}> = ({ title, durationSec, onDone }) => {
  const { streaks, profile } = useApp();
  const [selectedFeedback, setSelectedFeedback] = useState<
    'easy' | 'good' | 'hard' | 'hurt' | 'none'
  >('good');
  const [hurtArea, setHurtArea] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const displayStreak = Math.max(1, streaks.currentStreak || 0);

  const cheerMessage =
    profile?.cheerStyle === 'Calm & minimal'
      ? 'Nicely done. Your body thanks you for this pause.'
      : profile?.cheerStyle === 'Playful'
      ? 'Boom! Stiffness: 0, You: 1. Keep that flow going!'
      : 'Wonderful job! Every gentle reset builds lasting comfort.';

  const handleSaveAndReturn = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setLocalError(null);
    try {
      const feedbackToSave = selectedFeedback || 'none';
      await onDone(feedbackToSave, hurtArea || undefined);
    } catch (err) {
      console.error('[UnStill ResetComplete] Save & Return failed:', err);
      setLocalError('Could not save your reset on this device. Please tap to try again.');
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[var(--bg-mid)] flex flex-col justify-between p-6 max-w-[430px] mx-auto overflow-y-auto animate-in fade-in duration-300">
      <div className="my-auto flex flex-col items-center text-center space-y-5">
        <div className="w-20 h-20 rounded-[28px] mint-gradient text-white flex items-center justify-center shadow-lg shadow-emerald-500/25">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5" /> Reset Complete
        </div>

        <div>
          <h1 className="text-3xl font-display font-extrabold text-[var(--text)]">
            {title}
          </h1>
          <p className="text-sm text-[var(--text-soft)] mt-1.5 max-w-xs mx-auto leading-relaxed">
            {cheerMessage}
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3 w-full">
          <GlassCard className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/15 text-orange-500 flex items-center justify-center">
              <Flame className="w-5 h-5 fill-orange-500" />
            </div>
            <div className="text-left">
              <div className="text-lg font-display font-extrabold text-[var(--text)]">
                {displayStreak} Day{displayStreak === 1 ? '' : 's'}
              </div>
              <div className="text-[11px] font-semibold text-[var(--text-soft)]">
                Gentle Streak
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/15 text-sky-500 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="text-lg font-display font-extrabold text-[var(--text)]">
                +{Math.max(1, Math.round(durationSec / 60))} min
              </div>
              <div className="text-[11px] font-semibold text-[var(--text-soft)]">
                Active Time
              </div>
            </div>
          </GlassCard>
        </div>

        {/* How did that feel? */}
        <GlassCard className="w-full p-4 space-y-3 text-left">
          <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-soft)]">
            How did that feel?
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'easy', label: '😊 Easy & smooth' },
              { id: 'good', label: '✨ Just right' },
              { id: 'hard', label: '😮‍💨 A bit tough' },
              { id: 'hurt', label: '⚠️ Something hurt' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  setSelectedFeedback((prev) =>
                    prev === item.id ? 'none' : (item.id as 'easy' | 'good' | 'hard' | 'hurt')
                  )
                }
                className={`p-3 rounded-2xl text-xs font-bold border text-left transition-all ${
                  selectedFeedback === item.id
                    ? item.id === 'hurt'
                      ? 'bg-rose-500 text-white border-rose-500'
                      : 'bg-sky-500 text-white border-sky-500 shadow-sm'
                    : 'bg-white/75 dark:bg-[#162636] border-slate-200/70 dark:border-white/10 text-[var(--text)]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {selectedFeedback === 'hurt' && (
            <div className="pt-2 space-y-2 border-t border-slate-200/60 dark:border-white/10">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                <HeartHandshake className="w-4 h-4" /> Which area felt uncomfortable? We&apos;ll switch to safer moves:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {HURT_AREA_OPTIONS.map((area) => (
                  <Chip
                    key={area.id}
                    label={area.label}
                    color="coral"
                    selected={hurtArea === area.id}
                    onClick={() => setHurtArea(area.id)}
                  />
                ))}
              </div>
              <p className="text-[11px] font-medium text-rose-700 dark:text-rose-300 leading-relaxed pt-1">
                Safety note: We&apos;ll disable this move right away and switch your plan to a gentler option. Stop and rest if you feel sharp pain, dizziness, or numbness.
              </p>
            </div>
          )}
        </GlassCard>

        {localError && (
          <p role="alert" className="text-xs font-bold text-rose-600 dark:text-rose-400">
            {localError}
          </p>
        )}
      </div>

      <PrimaryButton
        variant="mint"
        disabled={isSaving}
        onClick={handleSaveAndReturn}
        className="w-full text-lg"
      >
        {isSaving ? 'Saving...' : 'Save & Return'}
      </PrimaryButton>
    </div>
  );
};
