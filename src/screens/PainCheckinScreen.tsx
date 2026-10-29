import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { GlassCard, PrimaryButton, Chip } from '../components/ui';
import { X, HeartHandshake, Check, ShieldAlert } from 'lucide-react';
import { ConditionId, PainLog, UserProfile } from '../types';
import { getTodayDateString } from '../lib/planEngine';
import { sortPainLogsNewestFirst } from '../lib/db';

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

const VALID_STIFFNESS = ['Low', 'Moderate', 'High'] as const;
const VALID_ENERGY = ['Low', 'Steady', 'Bright'] as const;
export const ONBOARDING_CHECKIN_NOTE = 'Initial onboarding check-in';

export function selectLatestPainLog(
  painLogs: PainLog[] | null | undefined,
  todayDateStr: string
): PainLog | null {
  if (!painLogs || painLogs.length === 0) return null;
  const sorted = sortPainLogsNewestFirst(painLogs);
  if (sorted.length === 0) return null;
  const todaysLatest = sorted.find((log) => log.date === todayDateStr);
  return todaysLatest || sorted[0] || null;
}

export function computeInitialPainCheckinState(
  trackedAreas: ConditionId[],
  latestLog: PainLog | null,
  profile: UserProfile | null,
  todayDateStr: string
): {
  scores: Record<string, number>;
  stiffness: 'Low' | 'Moderate' | 'High';
  energy: 'Low' | 'Steady' | 'Bright';
  notes: string;
} {
  const scores: Record<string, number> = {};
  trackedAreas.forEach((area) => {
    const fromLog = latestLog?.scores?.[area];
    const fromBaseline = profile?.painBaseline?.[area];
    if (typeof fromLog === 'number' && !Number.isNaN(fromLog)) {
      scores[area] = fromLog;
    } else if (typeof fromBaseline === 'number' && !Number.isNaN(fromBaseline)) {
      scores[area] = fromBaseline;
    } else {
      scores[area] = 2;
    }
  });

  const stiffness: 'Low' | 'Moderate' | 'High' =
    latestLog && (VALID_STIFFNESS as readonly string[]).includes(latestLog.stiffness)
      ? latestLog.stiffness
      : 'Moderate';

  const energy: 'Low' | 'Steady' | 'Bright' =
    latestLog && (VALID_ENERGY as readonly string[]).includes(latestLog.energy)
      ? latestLog.energy
      : 'Steady';

  const notes =
    latestLog &&
    latestLog.date === todayDateStr &&
    typeof latestLog.notes === 'string' &&
    latestLog.notes !== ONBOARDING_CHECKIN_NOTE
      ? latestLog.notes
      : '';

  return { scores, stiffness, energy, notes };
}

export function formatTimeAgo(timestamp: number, now: number = Date.now()): string {
  if (!timestamp || !Number.isFinite(timestamp)) return 'just now';
  const diffSec = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  const weeks = Math.floor(diffDays / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export const PainCheckinScreen: React.FC = () => {
  const { profile, painLogs, savePainCheckin, setShowPainCheckin } = useApp();

  const trackedAreas: ConditionId[] =
    profile?.conditions && profile.conditions.length > 0
      ? profile.conditions
      : ['neck_cs', 'lower_back', 'stiff_sitting'];

  const today = getTodayDateString(profile?.timeZone);
  const latestLog = selectLatestPainLog(painLogs, today);

  const initialValues = computeInitialPainCheckinState(trackedAreas, latestLog, profile, today);

  const [scores, setScores] = useState<Record<string, number>>(() => initialValues.scores);
  const [stiffness, setStiffness] = useState<'Low' | 'Moderate' | 'High'>(
    () => initialValues.stiffness
  );
  const [energy, setEnergy] = useState<'Low' | 'Steady' | 'Bright'>(() => initialValues.energy);
  const [notes, setNotes] = useState<string>(() => initialValues.notes);

  const hasUserModifiedScoresRef = useRef(false);
  const hasUserModifiedStiffnessRef = useRef(false);
  const hasUserModifiedEnergyRef = useRef(false);
  const hasUserModifiedNotesRef = useRef(false);

  useEffect(() => {
    const nextInit = computeInitialPainCheckinState(trackedAreas, latestLog, profile, today);
    if (!hasUserModifiedScoresRef.current) {
      setScores(nextInit.scores);
    }
    if (!hasUserModifiedStiffnessRef.current) {
      setStiffness(nextInit.stiffness);
    }
    if (!hasUserModifiedEnergyRef.current) {
      setEnergy(nextInit.energy);
    }
    if (!hasUserModifiedNotesRef.current) {
      setNotes(nextInit.notes);
    }
  }, [
    latestLog?.id,
    latestLog?.timestamp,
    latestLog?.stiffness,
    latestLog?.energy,
    latestLog?.notes,
    today,
    profile?.uid,
    profile?.painBaseline,
    trackedAreas.join(','),
  ]);

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

        {latestLog && (
          <p
            data-testid="pain-checkin-last-updated"
            className="text-[11px] font-medium text-[var(--text-soft)] -mt-2"
          >
            Last updated: {formatTimeAgo(latestLog.timestamp)}
          </p>
        )}

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
                  onChange={(e) => {
                    hasUserModifiedScoresRef.current = true;
                    setScores({ ...scores, [area]: parseInt(e.target.value, 10) });
                  }}
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
                  onClick={() => {
                    hasUserModifiedStiffnessRef.current = true;
                    setStiffness(s);
                  }}
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
                  onClick={() => {
                    hasUserModifiedEnergyRef.current = true;
                    setEnergy(e);
                  }}
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
              onChange={(e) => {
                hasUserModifiedNotesRef.current = true;
                setNotes(e.target.value);
              }}
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
