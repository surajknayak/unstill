import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { GlassCard, PrimaryButton, Chip } from '../components/ui';
import { X, HeartHandshake, Check, ShieldAlert } from 'lucide-react';
import { ConditionId } from '../types';

const AREA_LABELS: Record<ConditionId, string> = {
  neck_cs: 'Neck / Cervical',
  upper_back: 'Upper Back',
  lower_back: 'Lower Back',
  shoulder: 'Shoulders',
  wrist_hand: 'Wrists & Hands',
  knee: 'Knees',
  hip_glute: 'Hips & Glutes',
  ankle_foot: 'Ankles & Feet',
  eye_strain: 'Eyes / Screen Strain',
  stiff_sitting: 'General Sitting Stiffness',
  low_energy: 'Fatigue / Stress Tension',
};

export const PainCheckinScreen: React.FC = () => {
  const { profile, savePainCheckin, setShowPainCheckin } = useApp();

  const trackedAreas: ConditionId[] =
    profile?.conditions && profile.conditions.length > 0
      ? profile.conditions
      : ['neck_cs', 'lower_back', 'stiff_sitting'];

  const [scores, setScores] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    trackedAreas.forEach((a) => {
      init[a] = profile?.painBaseline?.[a] ?? 2;
    });
    return init;
  });

  const [stiffness, setStiffness] = useState<'Low' | 'Moderate' | 'High'>('Moderate');
  const [energy, setEnergy] = useState<'Low' | 'Steady' | 'Bright'>('Steady');
  const [notes, setNotes] = useState('');

  const maxScore = Math.max(0, ...(Object.values(scores) as number[]));

  const handleSave = async () => {
    await savePainCheckin(scores, stiffness, energy, notes.trim() || undefined);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[var(--bg-mid)] flex flex-col justify-between p-5 max-w-[430px] mx-auto overflow-y-auto">
      <div className="space-y-5 pb-8">
        <div className="flex items-center justify-between pt-2">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
              <HeartHandshake className="w-3.5 h-3.5" /> Daily Comfort Check
            </span>
            <h1 className="text-2xl font-display font-extrabold text-[var(--text)] mt-0.5">
              How does your body feel?
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setShowPainCheckin(false)}
            className="w-10 h-10 rounded-2xl bg-white/85 dark:bg-[#162636] flex items-center justify-center text-[var(--text)] shadow-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <GlassCard className="p-5 space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-soft)]">
            Discomfort or Tension (0 = None, 10 = Severe)
          </div>

          {trackedAreas.map((area) => {
            const val = scores[area] ?? 0;
            return (
              <div key={area} className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-[var(--text)]">{AREA_LABELS[area] || area}</span>
                  <span
                    className={
                      val >= 7
                        ? 'text-rose-500'
                        : val >= 4
                        ? 'text-amber-500'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }
                  >
                    {val} / 10
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={val}
                  onChange={(e) =>
                    setScores({ ...scores, [area]: parseInt(e.target.value, 10) })
                  }
                  className="w-full accent-sky-500"
                />
              </div>
            );
          })}

          {maxScore >= 7 && (
            <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-400/30 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200 font-medium">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Since discomfort is 7+ today, we&apos;ll automatically switch your plan to extra-gentle, soothing range-of-motion resets.
              </span>
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-5 space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-soft)] block mb-2">
              Overall Stiffness
            </label>
            <div className="flex gap-2">
              {(['Low', 'Moderate', 'High'] as const).map((s) => (
                <Chip
                  key={s}
                  label={s}
                  selected={stiffness === s}
                  onClick={() => setStiffness(s)}
                  className="flex-1 justify-center"
                />
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-soft)] block mb-2">
              Energy Level
            </label>
            <div className="flex gap-2">
              {(['Low', 'Steady', 'Bright'] as const).map((e) => (
                <Chip
                  key={e}
                  label={e}
                  color="mint"
                  selected={energy === e}
                  onClick={() => setEnergy(e)}
                  className="flex-1 justify-center"
                />
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-soft)] block mb-1.5">
              Optional Note
            </label>
            <input
              type="text"
              placeholder="e.g., Long morning meetings, slept well..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-white/90 dark:bg-[#0F1B26] border border-slate-200 dark:border-white/15 text-xs font-medium"
            />
          </div>
        </GlassCard>

        <PrimaryButton onClick={handleSave} className="w-full">
          <Check className="w-5 h-5" /> Save & Update Today&apos;s Plan
        </PrimaryButton>
      </div>
    </div>
  );
};
