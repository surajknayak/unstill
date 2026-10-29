import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  GlassCard,
  PrimaryButton,
  ProgressRing,
  StatTile,
  TabHeader,
} from '../components/ui';
import { PWAInstallBanner } from '../components/PWAInstallBanner';
import {
  Play,
  Check,
  Clock,
  RefreshCw,
  Droplets,
  Footprints,
  Sparkles,
  HeartHandshake,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sun,
  Award,
  Dumbbell,
  Share2,
  SlidersHorizontal,
  CloudUpload,
} from 'lucide-react';
import quotesData from '../data/quotes.json';
import { shareQuoteCard } from '../lib/shareQuote';
import { getTimeOfDayGreeting } from '../lib/planEngine';

const TimeOfDayMotif: React.FC<{ period: 'morning' | 'afternoon' | 'evening' }> = ({ period }) => {
  return (
    <svg viewBox="0 0 72 72" className="w-14 h-14 shrink-0" fill="none" aria-hidden="true">
      {period === 'morning' && (
        <>
          <circle cx="36" cy="40" r="16" fill="#FFD24D" />
          <path d="M12 52 H60" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" opacity="0.9" />
          <path d="M36 14 V20 M18 24 L22 28 M54 24 L50 28" stroke="#FFD24D" strokeWidth="3.5" strokeLinecap="round" />
        </>
      )}
      {period === 'afternoon' && (
        <>
          <circle cx="28" cy="28" r="13" fill="#FFD24D" />
          <path
            d="M26 48 H50 C55 48 58 44 58 40 C58 36 55 33 51 33 C49 27 44 24 38 25 C33 26 30 30 30 34 C25 34 22 38 22 42 C22 46 24 48 26 48 Z"
            fill="#FFFFFF"
            opacity="0.92"
          />
        </>
      )}
      {period === 'evening' && (
        <>
          <path
            d="M44 20 C34 22 28 32 30 42 C32 50 40 55 48 54 C39 58 28 54 24 44 C20 34 25 22 36 18 C39 17 42 18 44 20 Z"
            fill="#FFD24D"
          />
          <circle cx="52" cy="24" r="2.5" fill="#5EE6B0" />
          <circle cx="20" cy="26" r="2" fill="#FFFFFF" />
        </>
      )}
    </svg>
  );
};

export const TodayScreen: React.FC = () => {
  const {
    user,
    profile,
    todayPlan,
    streaks,
    startSession,
    markTaskDone,
    snoozeTask,
    swapTaskMove,
    addWaterCup,
    updateSteps,
    setShowPostureCheck,
    setShowWorkoutBuilder,
    setShowPainCheckin,
    setActiveTab,
    linkGuestToGoogle,
  } = useApp();

  const [stepModalOpen, setStepModalOpen] = useState(false);
  const [stepInput, setStepInput] = useState(String(todayPlan?.steps || 0));
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [whyExpanded, setWhyExpanded] = useState(false);

  if (!todayPlan || !profile) return null;

  const nextTask = todayPlan.tasks.find((t) => t.status === 'pending') || todayPlan.tasks[0];
  const progressRatio =
    todayPlan.totalCount > 0 ? todayPlan.completedCount / todayPlan.totalCount : 0;

  const daySeed = todayPlan.date.split('-').reduce((a, b) => a + parseInt(b, 10), 0);
  const quote = quotesData[daySeed % quotesData.length];
  const { greeting, period } = getTimeOfDayGreeting(profile.timeZone);

  const heroTintClass =
    period === 'morning'
      ? 'from-[#1CA7EC] via-[#27C8E8] to-[#38E2B0]'
      : period === 'afternoon'
      ? 'from-[#2EB8F5] via-[#27C8E8] to-[#5EE6B0]'
      : 'from-[#1C6EA4] via-[#2EB8F5] to-[#8B78FF]';

  const handleShareQuote = async () => {
    try {
      const msg = await shareQuoteCard(quote);
      setShareToast(msg);
      setTimeout(() => setShareToast(null), 2500);
    } catch {
      // User cancelled native share sheet
    }
  };

  const hasStepsLogged = todayPlan.steps > 0;
  const stepsProgressRatio =
    todayPlan.stepGoal > 0 ? Math.min(1, todayPlan.steps / todayPlan.stepGoal) : 0;

  return (
    <div className="space-y-5 pb-28">
      <TabHeader
        title={`${greeting}, ${profile.name || 'Friend'}`}
        subtitle="Small resets keep your body feeling light."
        streak={streaks.currentStreak}
        rightAction={
          <button
            type="button"
            onClick={() => setShowPainCheckin(true)}
            className="px-3.5 py-2 rounded-2xl bg-white dark:bg-[#162636] border border-slate-200/80 dark:border-white/15 text-xs font-bold text-[#0A5C80] dark:text-[#7CD6FF] flex items-center gap-1.5 shadow-sm"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Comfort check
          </button>
        }
      />

      {/* Section 12.2: Non-intrusive Guest Mode banner */}
      {user?.isGuest && (
        <div className="px-4 py-3 rounded-2xl bg-sky-500/12 dark:bg-sky-400/15 border border-sky-400/35 flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-[var(--text)] leading-snug">
            Guest mode: your progress is only on this device.
          </p>
          <button
            type="button"
            onClick={linkGuestToGoogle}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl primary-gradient text-white text-xs font-display font-bold shadow-sm"
          >
            <CloudUpload className="w-3.5 h-3.5" /> Save my progress
          </button>
        </div>
      )}

      <PWAInstallBanner />

      {/* Hero Next Reset Card with layered sky-to-mint-to-lavender floating gradient & faint ring motif */}
      <div
        className={`rounded-[28px] p-6 bg-gradient-to-br ${heroTintClass} text-white shadow-xl shadow-sky-500/20 relative overflow-hidden`}
      >
        {/* Ambient floating blobs & faint UnStill ring texture */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-10 w-44 h-44 rounded-full bg-white/15 blur-2xl animate-slow-float"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-10 -bottom-10 w-40 h-40 rounded-full bg-[#B9A6FF]/25 blur-2xl animate-slow-float"
        />
        <svg
          aria-hidden="true"
          viewBox="0 0 200 200"
          className="pointer-events-none absolute -right-12 -bottom-12 w-52 h-52 opacity-12"
          fill="none"
        >
          <circle
            cx="100"
            cy="100"
            r="74"
            stroke="#FFFFFF"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray="340 460"
          />
          <circle
            cx="100"
            cy="100"
            r="44"
            stroke="#FFFFFF"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray="190 280"
            transform="rotate(160 100 100)"
          />
        </svg>

        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              {todayPlan.completedCount === todayPlan.totalCount
                ? 'All Done Today!'
                : `Up Next · ${nextTask?.scheduledTime || 'Now'}`}
            </div>
            <h2 className="text-2xl font-display font-extrabold leading-tight">
              {nextTask ? nextTask.title : '2-Minute Desk Reset'}
            </h2>
            <p className="text-sm text-white/95 font-medium">
              {nextTask ? nextTask.subtitle : 'Gentle neck, shoulder & hip relief'}
            </p>
          </div>

          <div className="flex flex-col items-center gap-1">
            <ProgressRing
              progress={progressRatio}
              size={84}
              strokeWidth={8}
              color="#5EE6B0"
            >
              <div className="text-center">
                <div className="text-lg font-display font-extrabold">
                  {todayPlan.completedCount}/{todayPlan.totalCount}
                </div>
                <div className="text-[10px] uppercase font-bold text-white/90">Resets</div>
              </div>
            </ProgressRing>
          </div>
        </div>

        <div className="relative z-10 mt-5 flex items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={() =>
              startSession({
                title: nextTask?.title || 'Quick Reset',
                moveIds: nextTask?.moveId ? [nextTask.moveId] : ['chin_tuck', 'shoulder_roll'],
                taskId: nextTask?.id,
              })
            }
            className="flex-1 min-h-[50px] bg-white text-slate-900 rounded-2xl font-display font-extrabold text-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-transform"
          >
            <Play className="w-4 h-4 fill-slate-900" />
            Start {Math.max(1, Math.round((nextTask?.durationSec || 120) / 60))}-Min Reset
          </button>

          {nextTask && (
            <button
              type="button"
              onClick={() => swapTaskMove(nextTask.id, true)}
              title="Swap for a gentler move"
              className="min-h-[50px] px-4 rounded-2xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold flex items-center gap-1.5 backdrop-blur-sm transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Easier
            </button>
          )}

          <div className="hidden sm:block">
            <TimeOfDayMotif period={period} />
          </div>
        </div>
      </div>

      {/* Why Today Banner with expandable Why This Plan details */}
      {(todayPlan.whyToday || todayPlan.whyThisPlan) && (
        <GlassCard className="p-4 bg-sky-500/5 border-sky-200/60 dark:border-sky-500/20 space-y-2">
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-start gap-2.5">
              <HeartHandshake className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
              <p className="text-xs font-medium text-[var(--text)] leading-relaxed">
                {todayPlan.whyToday}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setWhyExpanded((w) => !w)}
              className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-[#0A5C80] dark:text-[#7CD6FF]"
            >
              Why today?
              {whyExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {whyExpanded && (
            <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 text-xs text-[var(--text-soft)] space-y-1">
              <p>{todayPlan.whyThisPlan}</p>
              {todayPlan.themeFocus && (
                <p className="font-semibold text-[var(--text)]">
                  Today&apos;s rhythm: {todayPlan.themeFocus}
                </p>
              )}
            </div>
          )}
        </GlassCard>
      )}

      {/* Quick Actions Strip */}
      <div className="grid grid-cols-2 gap-3">
        <GlassCard
          onClick={() => setShowPostureCheck(true)}
          className="p-4 flex items-center justify-between bg-gradient-to-br from-emerald-500/10 to-teal-500/5"
        >
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              60 Seconds
            </span>
            <h3 className="font-display font-bold text-sm text-[var(--text)] mt-0.5">
              Posture Check
            </h3>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
            <ChevronRight className="w-5 h-5" />
          </div>
        </GlassCard>

        <GlassCard
          onClick={() => setShowWorkoutBuilder(true)}
          className="p-4 flex items-center justify-between bg-gradient-to-br from-purple-500/10 to-sky-500/5"
        >
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
              Custom Flow
            </span>
            <h3 className="font-display font-bold text-sm text-[var(--text)] mt-0.5">
              Plan Workout
            </h3>
          </div>
          <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-300 flex items-center justify-center">
            <Dumbbell className="w-4 h-4" />
          </div>
        </GlassCard>
      </div>

      {/* Today's Micro-Plan Checklist */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-display font-bold text-base text-[var(--text)]">
            Today&apos;s Movement Plan
          </h3>
          <button
            type="button"
            onClick={() => setActiveTab('plan')}
            className="text-xs font-bold text-[#0A5C80] dark:text-[#7CD6FF] hover:underline"
          >
            Full library
          </button>
        </div>

        <div className="space-y-2.5">
          {todayPlan.tasks.map((task) => {
            const isDone = task.status === 'done';
            return (
              <GlassCard
                key={task.id}
                className={`p-4 flex items-center justify-between gap-3 transition-opacity ${
                  isDone ? 'opacity-65' : ''
                }`}
              >
                <button
                  type="button"
                  onClick={() => markTaskDone(task.id)}
                  aria-label={`Mark ${task.title} as done`}
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all ${
                    isDone
                      ? 'bg-[#24B47E] text-white shadow-sm'
                      : 'border-2 border-sky-400/70 hover:bg-sky-50 dark:hover:bg-white/10'
                  }`}
                >
                  {isDone && <Check className="w-4 h-4" />}
                </button>

                <div
                  onClick={() =>
                    startSession({
                      title: task.title,
                      moveIds: task.moveId ? [task.moveId] : ['chin_tuck'],
                      taskId: task.id,
                    })
                  }
                  className="flex-1 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-[#0A5C80] dark:text-[#7CD6FF]">
                      {task.scheduledTime || task.timeWindow}
                    </span>
                    {task.targetArea && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                        {task.targetArea}
                      </span>
                    )}
                  </div>
                  <h4
                    className={`font-display font-bold text-sm text-[var(--text)] ${
                      isDone ? 'line-through' : ''
                    }`}
                  >
                    {task.title}
                  </h4>
                  <p className="text-xs text-[var(--text-soft)] line-clamp-1">{task.subtitle}</p>
                </div>

                <div className="flex items-center gap-1.5">
                  {!isDone && (
                    <button
                      type="button"
                      onClick={() => swapTaskMove(task.id)}
                      title="Swap exercise"
                      className="p-2 rounded-xl hover:bg-slate-500/10 text-[var(--text-soft)]"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      startSession({
                        title: task.title,
                        moveIds: task.moveId ? [task.moveId] : ['chin_tuck'],
                        taskId: task.id,
                      })
                    }
                    className="px-3 py-1.5 rounded-xl bg-sky-500/15 text-[#0A5C80] dark:text-[#7CD6FF] text-xs font-bold flex items-center gap-1"
                  >
                    <Clock className="w-3 h-3" />
                    {Math.max(1, Math.round(task.durationSec / 60))}m
                  </button>
                </div>
              </GlassCard>
            );
          })}
        </div>
      </div>

      {/* Stat Tiles: Steps & Hydration with white track + mint-green fill */}
      <div className="grid grid-cols-2 gap-3">
        <StatTile
          label="Gentle Steps"
          value={
            profile.stepSource === 'none' && !hasStepsLogged
              ? 'Log steps'
              : todayPlan.steps.toLocaleString()
          }
          sublabel={`of ${todayPlan.stepGoal.toLocaleString()} goal`}
          icon={<Footprints className="w-5 h-5" />}
          accentColor="bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
          progress={stepsProgressRatio}
          onClick={() => {
            setStepInput(String(todayPlan.steps));
            setStepModalOpen(true);
          }}
        />
        <StatTile
          label="Hydration"
          value={`${todayPlan.waterCups} / ${todayPlan.waterGoal}`}
          sublabel="Tap to add a glass"
          icon={<Droplets className="w-5 h-5" />}
          accentColor="bg-sky-500/15 text-sky-600 dark:text-sky-300"
          progress={todayPlan.waterGoal > 0 ? todayPlan.waterCups / todayPlan.waterGoal : 0}
          onClick={addWaterCup}
        />
      </div>

      {/* Badges & Streak Freeze Info */}
      <GlassCard className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl sun-gradient flex items-center justify-center text-slate-900 shadow-sm">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-[var(--text)]">
              {streaks.freezeTokens} Grace Days Available
            </div>
            <div className="text-[11px] text-[var(--text-soft)]">
              Busy day or flare-up? Your streak stays safe.
            </div>
          </div>
        </div>
        <span className="text-xs font-bold text-[#0A5C80] dark:text-[#7CD6FF]">
          {streaks.badges[streaks.badges.length - 1]}
        </span>
      </GlassCard>

      {/* Section 3.5: Daily Boost Quote Card moved below task list and stat tiles */}
      <GlassCard className="p-4 bg-gradient-to-r from-amber-500/10 via-sky-500/10 to-emerald-500/10 border-amber-200/50 dark:border-white/10">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-xl sun-gradient flex items-center justify-center text-slate-900 shrink-0 mt-0.5">
              <Sun className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                Daily Boost · {quote.tag}
              </span>
              <p className="text-xs font-semibold text-[var(--text)] mt-0.5 leading-relaxed">
                &ldquo;{quote.text}&rdquo;
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleShareQuote}
            className="p-2 rounded-xl bg-white/70 dark:bg-white/10 text-[var(--text-soft)] hover:text-sky-500 shrink-0"
            title="Share quote card"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
        {shareToast && (
          <div className="mt-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            {shareToast}
          </div>
        )}
      </GlassCard>

      {/* Step Update Modal */}
      {stepModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <GlassCard className="w-full max-w-xs p-5 space-y-4">
            <h3 className="font-display font-bold text-lg text-[var(--text)]">
              Update Today&apos;s Steps
            </h3>
            <input
              type="number"
              value={stepInput}
              onChange={(e) => setStepInput(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-[#0F1B26] border border-slate-200 dark:border-white/15 font-display font-bold text-xl text-center"
            />
            <div className="flex gap-2">
              {[+500, +1000, +2500].map((inc) => (
                <button
                  key={inc}
                  type="button"
                  onClick={() =>
                    setStepInput(String(Math.max(0, (parseInt(stepInput, 10) || 0) + inc)))
                  }
                  className="flex-1 py-2 rounded-xl bg-sky-500/15 text-[#0A5C80] dark:text-[#7CD6FF] text-xs font-bold"
                >
                  +{inc}
                </button>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <PrimaryButton
                variant="ghost"
                onClick={() => setStepModalOpen(false)}
                className="flex-1 min-h-[44px]"
              >
                Cancel
              </PrimaryButton>
              <PrimaryButton
                onClick={() => {
                  updateSteps(parseInt(stepInput, 10) || 0);
                  setStepModalOpen(false);
                }}
                className="flex-1 min-h-[44px]"
              >
                Save
              </PrimaryButton>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};
