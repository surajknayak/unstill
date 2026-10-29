import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { GlassCard, PrimaryButton, Chip } from '../components/ui';
import { X, Sparkles, Dumbbell, Clock, MapPin, ShieldCheck } from 'lucide-react';
import {
  WorkoutGoal,
  WorkoutStyle,
  WorkoutLocation,
  Level,
} from '../types';
import { generateCustomWorkout } from '../lib/planEngine';

export const PlanWorkoutScreen: React.FC = () => {
  const {
    profile,
    painLogs,
    setShowWorkoutBuilder,
    setActiveWorkoutDetail,
  } = useApp();

  const [goal, setGoal] = useState<WorkoutGoal>('Feel good');
  const [durationMin, setDurationMin] = useState<number>(10);
  const [level, setLevel] = useState<Level>(profile?.level || 'Starter');
  const [style, setStyle] = useState<WorkoutStyle>('Guided timer');
  const [location, setLocation] = useState<WorkoutLocation>('At desk');
  const [equipment, setEquipment] = useState<string[]>(['Chair / Desk']);

  if (!profile) return null;

  const toggleEquip = (eq: string) => {
    if (equipment.includes(eq)) {
      setEquipment(equipment.filter((e) => e !== eq));
    } else {
      setEquipment([...equipment, eq]);
    }
  };

  const handleGenerate = () => {
    const workout = generateCustomWorkout(
      profile,
      {
        goal,
        durationMin,
        level,
        style,
        location,
        equipment,
      },
      painLogs[0] || null
    );
    setShowWorkoutBuilder(false);
    setActiveWorkoutDetail(workout);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[var(--bg-mid)] flex flex-col justify-between p-5 max-w-[430px] mx-auto overflow-y-auto">
      <div className="space-y-5 pb-8">
        {/* Top Bar */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0A5C80] dark:text-[#7CD6FF] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Smart Workout Planner
            </span>
            <h1 className="text-2xl font-display font-extrabold text-[var(--text)] mt-0.5">
              Plan Your Workout
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setShowWorkoutBuilder(false)}
            className="w-10 h-10 rounded-2xl bg-white/85 dark:bg-[#162636] flex items-center justify-center text-[var(--text)] shadow-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {profile.conditions.length > 0 && (
          <div className="px-3.5 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>
              Automatically tailored for your comfort focus ({profile.conditions.length} area
              {profile.conditions.length > 1 ? 's' : ''} protected).
            </span>
          </div>
        )}

        <GlassCard className="p-5 space-y-4">
          {/* Goal */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-soft)] block mb-2">
              1. Today&apos;s Focus
            </label>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  'Feel good',
                  'Mobility',
                  'Core & posture',
                  'Strength',
                  'Gentle cardio',
                  'Low-impact full body',
                  'Evening stretch',
                ] as WorkoutGoal[]
              ).map((g) => (
                <Chip
                  key={g}
                  label={g}
                  selected={goal === g}
                  onClick={() => setGoal(g)}
                />
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-soft)] flex items-center gap-1.5 mb-2">
              <Clock className="w-3.5 h-3.5 text-sky-500" /> 2. Duration (Minutes)
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[5, 10, 15, 20, 30].map((min) => (
                <button
                  key={min}
                  type="button"
                  onClick={() => setDurationMin(min)}
                  className={`py-2.5 rounded-2xl font-display font-bold text-sm border transition-all ${
                    durationMin === min
                      ? 'bg-sky-500 text-white border-sky-500 shadow-sm'
                      : 'bg-white/80 dark:bg-[#162636] border-slate-200/70 dark:border-white/10 text-[var(--text)]'
                  }`}
                >
                  {min}m
                </button>
              ))}
            </div>
          </div>

          {/* Intensity */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-soft)] block mb-2">
              3. Intensity Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Starter', 'Steady', 'Active'] as Level[]).map((lv) => (
                <Chip
                  key={lv}
                  label={lv}
                  color="mint"
                  selected={level === lv}
                  onClick={() => setLevel(lv)}
                  className="justify-center"
                />
              ))}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-soft)] flex items-center gap-1.5 mb-2">
              <MapPin className="w-3.5 h-3.5 text-purple-500" /> 4. Where You Are
            </label>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  'At desk',
                  'Bedroom / living room',
                  'Small space',
                  'Outdoors / walk',
                ] as WorkoutLocation[]
              ).map((loc) => (
                <Chip
                  key={loc}
                  label={loc}
                  color="lavender"
                  selected={location === loc}
                  onClick={() => setLocation(loc)}
                />
              ))}
            </div>
          </div>

          {/* Equipment */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-soft)] flex items-center gap-1.5 mb-2">
              <Dumbbell className="w-3.5 h-3.5 text-amber-500" /> 5. Available Equipment
            </label>
            <div className="flex flex-wrap gap-2">
              {['Chair / Desk', 'Wall', 'Mat', 'Resistance band', 'Light dumbbells', 'None'].map(
                (eq) => (
                  <Chip
                    key={eq}
                    label={eq}
                    color="sun"
                    selected={equipment.includes(eq)}
                    onClick={() => toggleEquip(eq)}
                  />
                )
              )}
            </div>
          </div>

          {/* Format / Style */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-soft)] block mb-2">
              6. Session Style
            </label>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  'Guided timer',
                  'Checklist sets & reps',
                  'Stretch flow',
                ] as WorkoutStyle[]
              ).map((st) => (
                <Chip
                  key={st}
                  label={st}
                  selected={style === st}
                  onClick={() => setStyle(st)}
                />
              ))}
            </div>
          </div>
        </GlassCard>

        <PrimaryButton onClick={handleGenerate} className="w-full text-base">
          <Sparkles className="w-5 h-5" /> Generate My Safe Workout
        </PrimaryButton>
      </div>
    </div>
  );
};
