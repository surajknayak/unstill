import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { GlassCard, PrimaryButton, Chip, TabHeader } from '../components/ui';
import { ExpandableMoveDemo } from '../components/MoveAnimation';
import {
  Play,
  Sparkles,
  Clock,
  Shuffle,
  Dumbbell,
  Calendar,
  Trash2,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import sessionsData from '../data/sessions.json';
import movesData from '../data/moves.json';
import { SessionTemplate, MoveItem } from '../types';

const sessions: SessionTemplate[] = sessionsData as SessionTemplate[];
const moves: MoveItem[] = movesData as MoveItem[];

export const PlanScreen: React.FC = () => {
  const {
    todayPlan,
    workouts,
    startSession,
    swapTaskMove,
    setShowWorkoutBuilder,
    setActiveWorkoutDetail,
    removeWorkout,
  } = useApp();

  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [durationFilter, setDurationFilter] = useState<number | null>(null);

  const categories = [
    'All',
    'Desk Reset',
    'Neck & Shoulder',
    'Back Care',
    'Hip & Knee',
    'Full Body',
    'Evening Wind-down',
  ];

  const filteredSessions = sessions.filter((s) => {
    if (categoryFilter !== 'All' && s.category !== categoryFilter) return false;
    if (durationFilter && s.durationMin > durationFilter) return false;
    return true;
  });

  const handleSurpriseMe = () => {
    const randomSess = sessions[Math.floor(Math.random() * sessions.length)];
    startSession({
      title: randomSess.title,
      moveIds: randomSess.moveIds,
    });
  };

  return (
    <div className="space-y-6 pb-28">
      <TabHeader
        title="Plan & Sessions"
        subtitle="Guided routines & custom workouts that fit your space."
        rightAction={
          <button
            type="button"
            onClick={handleSurpriseMe}
            className="px-3.5 py-2 rounded-2xl bg-sky-500/12 dark:bg-sky-400/15 border border-sky-500/40 dark:border-sky-400/40 text-[#0A5C80] dark:text-[#7CD6FF] text-xs font-bold flex items-center gap-1.5 shadow-sm hover:bg-sky-500/20 transition-colors"
          >
            <Shuffle className="w-3.5 h-3.5" />
            Surprise me
          </button>
        }
      />

      {/* Plan a Workout Hero CTA */}
      <GlassCard className="p-5 bg-gradient-to-br from-sky-500/15 via-emerald-500/10 to-purple-500/15 border-sky-200 dark:border-white/15">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0A5C80] dark:text-[#7CD6FF]">
              <Sparkles className="w-3.5 h-3.5" /> Personalized Generator
            </div>
            <h2 className="text-xl font-display font-extrabold text-[var(--text)]">
              Build a Custom Workout
            </h2>
            <p className="text-xs text-[var(--text-soft)] leading-relaxed">
              Pick 5–30 mins, your room or desk, and your equipment. Automatically adapts to your comfort check.
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl primary-gradient text-white flex items-center justify-center shrink-0 shadow-md">
            <Dumbbell className="w-6 h-6" />
          </div>
        </div>
        <PrimaryButton
          onClick={() => setShowWorkoutBuilder(true)}
          className="w-full mt-4 min-h-[48px] text-sm"
        >
          Plan a Workout
        </PrimaryButton>
      </GlassCard>

      {/* Saved Custom Workouts */}
      {workouts.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display font-bold text-base text-[var(--text)] px-1">
            Your Saved Workouts
          </h3>
          <div className="space-y-2.5">
            {workouts.map((w) => (
              <GlassCard
                key={w.id}
                onClick={() => setActiveWorkoutDetail(w)}
                className="p-4 flex items-center justify-between gap-3"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-700 dark:text-purple-300">
                      {w.goal}
                    </span>
                    <span className="text-xs text-[var(--text-soft)] font-semibold">
                      {w.durationMin} min · {w.level}
                    </span>
                  </div>
                  <h4 className="font-display font-bold text-sm text-[var(--text)]">{w.title}</h4>
                  <p className="text-xs text-[var(--text-soft)]">{w.subtitle}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeWorkout(w.id);
                    }}
                    className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10"
                    title="Delete workout"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-[#0A5C80] dark:text-[#7CD6FF] flex items-center justify-center">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* Today's Time-of-Day Slots with Expandable Move Demos & High-Contrast Swap Button */}
      {todayPlan && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-display font-bold text-base text-[var(--text)] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-500" /> Today&apos;s Schedule Slots
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-2.5">
            {todayPlan.tasks.map((t) => (
              <GlassCard key={t.id} className="p-3.5 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#0A5C80] dark:text-[#7CD6FF]">
                      {t.timeWindow} ({t.scheduledTime})
                    </span>
                    <div className="font-display font-bold text-sm text-[var(--text)]">
                      {t.title}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => swapTaskMove(t.id)}
                      className="px-3 py-1.5 rounded-xl bg-sky-500/12 dark:bg-sky-400/15 border border-sky-500/40 dark:border-sky-400/40 text-xs font-bold text-[#0A5C80] dark:text-[#7CD6FF] inline-flex items-center gap-1 hover:bg-sky-500/20 transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" /> Swap
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        startSession({
                          title: t.title,
                          moveIds: t.moveId ? [t.moveId] : ['chin_tuck'],
                          taskId: t.id,
                        })
                      }
                      className="px-3 py-1.5 rounded-xl primary-gradient text-white text-xs font-bold"
                    >
                      Start
                    </button>
                  </div>
                </div>
                <ExpandableMoveDemo moveId={t.moveId} />
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* Session Library Filters */}
      <div className="space-y-3">
        <h3 className="font-display font-bold text-base text-[var(--text)] px-1">
          Guided Session Library
        </h3>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {categories.map((cat) => (
            <Chip
              key={cat}
              label={cat}
              selected={categoryFilter === cat}
              onClick={() => setCategoryFilter(cat)}
              className="shrink-0"
            />
          ))}
        </div>

        <div className="flex gap-2">
          {[null, 3, 5, 10].map((min) => (
            <button
              key={String(min)}
              type="button"
              onClick={() => setDurationFilter(min)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                durationFilter === min
                  ? 'bg-emerald-500 text-white border-emerald-500'
                  : 'bg-white/80 dark:bg-[#162636] border-slate-200/80 dark:border-white/15 text-[var(--text)]'
              }`}
            >
              {min === null ? 'Any length' : `≤ ${min} min`}
            </button>
          ))}
        </div>

        <div className="space-y-3 pt-1">
          {filteredSessions.map((sess) => {
            const sessionMoves = sess.moveIds
              .map((id) => moves.find((m) => m.id === id)?.name)
              .filter(Boolean);

            return (
              <GlassCard key={sess.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-sky-500/15 text-[#0A5C80] dark:text-[#7CD6FF]">
                        {sess.category}
                      </span>
                      <span className="text-xs font-semibold text-[var(--text-soft)] flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {sess.durationMin} min · {sess.position}
                      </span>
                    </div>
                    <h4 className="font-display font-bold text-base text-[var(--text)] mt-1">
                      {sess.title}
                    </h4>
                    <p className="text-xs text-[var(--text-soft)] mt-0.5">{sess.subtitle}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      startSession({
                        title: sess.title,
                        moveIds: sess.moveIds,
                      })
                    }
                    className="w-11 h-11 rounded-2xl primary-gradient text-white flex items-center justify-center shrink-0 shadow-md active:scale-95 transition-transform"
                    aria-label={`Start ${sess.title}`}
                  >
                    <Play className="w-5 h-5 fill-white" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {sessionMoves.map((mName, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] font-medium px-2.5 py-1 rounded-xl bg-slate-500/10 dark:bg-white/10 text-[var(--text)]"
                    >
                      {mName}
                    </span>
                  ))}
                </div>

                <ExpandableMoveDemo moveId={sess.moveIds[0]} label="Preview first move" />
              </GlassCard>
            );
          })}
        </div>
      </div>
    </div>
  );
};
