import React from 'react';
import { useApp } from '../context/AppContext';
import { GlassCard, TabHeader } from '../components/ui';
import { TipVisual } from '../components/TipVisual';
import {
  Flame,
  Award,
  Clock,
  CheckCircle2,
  TrendingDown,
  Calendar,
  Sparkles,
  Lightbulb,
} from 'lucide-react';
import tipsData from '../data/tips.json';

export const ProgressScreen: React.FC = () => {
  const { streaks, sessions, painLogs, todayPlan } = useApp();

  const totalSessions = sessions.length;
  const totalMinutes = Math.round(
    sessions.reduce((acc, s) => acc + s.durationSec, 0) / 60 + (todayPlan?.activeMinutes || 0)
  );

  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  const dailyTip = tipsData[dayOfYear % tipsData.length];

  const last7Days = Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - idx));
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
    const dayLabel = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()];
    const status = streaks.weeklyConsistency[dateStr] || 'none';
    return { dateStr, dayLabel, status };
  });

  const recentPains = painLogs.slice(0, 7).reverse();

  return (
    <div className="space-y-5 pb-28">
      <TabHeader
        title="Your Progress"
        subtitle="Consistency over intensity — every 2-minute reset counts."
        streak={streaks.currentStreak}
      />

      {/* Top Summary Cards */}
      <div className="grid grid-cols-3 gap-2.5">
        <GlassCard className="p-3.5 text-center space-y-1">
          <div className="w-8 h-8 rounded-xl bg-orange-500/15 text-orange-500 flex items-center justify-center mx-auto">
            <Flame className="w-4 h-4 fill-orange-500" />
          </div>
          <div className="text-xl font-display font-extrabold text-[var(--text)]">
            {streaks.currentStreak}
          </div>
          <div className="text-[10px] font-bold uppercase text-[var(--text-soft)]">
            Day Streak
          </div>
        </GlassCard>

        <GlassCard className="p-3.5 text-center space-y-1">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-xl font-display font-extrabold text-[var(--text)]">
            {totalSessions}
          </div>
          <div className="text-[10px] font-bold uppercase text-[var(--text-soft)]">
            Sessions
          </div>
        </GlassCard>

        <GlassCard className="p-3.5 text-center space-y-1">
          <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-500 flex items-center justify-center mx-auto">
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-xl font-display font-extrabold text-[var(--text)]">
            {totalMinutes}m
          </div>
          <div className="text-[10px] font-bold uppercase text-[var(--text-soft)]">
            Active Time
          </div>
        </GlassCard>
      </div>

      {/* 7-Day Consistency Strip */}
      <GlassCard className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-sm text-[var(--text)] flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-500" /> 7-Day Rhythm
          </h3>
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            {streaks.freezeTokens} Grace Days Left
          </span>
        </div>

        <div className="flex justify-between gap-2 pt-1">
          {last7Days.map((day) => {
            const isDone = day.status === 'done';
            const isGrace = day.status === 'grace';
            return (
              <div key={day.dateStr} className="flex flex-col items-center gap-1.5 flex-1">
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center font-display font-bold text-xs transition-all ${
                    isDone
                      ? 'mint-gradient text-white shadow-sm'
                      : isGrace
                      ? 'bg-sky-500/20 text-sky-600 border border-sky-400'
                      : 'bg-white/75 dark:bg-white/10 text-[var(--text-soft)]'
                  }`}
                >
                  {isDone ? '✓' : isGrace ? '❄' : day.dayLabel}
                </div>
                <span className="text-[10px] font-semibold text-[var(--text-soft)]">
                  {day.dateStr.slice(8)}
                </span>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* Comfort & Stiffness Trend */}
      <GlassCard className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-sm text-[var(--text)] flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-emerald-500" /> Comfort & Stiffness Log
          </h3>
          <span className="text-[11px] font-semibold text-[var(--text-soft)]">
            0 = Great · 10 = High
          </span>
        </div>

        {recentPains.length === 0 ? (
          <p className="text-xs text-[var(--text-soft)] py-3">
            No comfort logs yet. Tap &ldquo;Comfort check&rdquo; on Today to track how your joints feel over time.
          </p>
        ) : (
          <div className="space-y-2.5 pt-1">
            {recentPains.map((log) => {
              const vals = Object.values(log.scores) as number[];
              const avg =
                vals.length > 0
                  ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
                  : 0;
              return (
                <div key={log.id} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-[var(--text)]">
                      {log.date} · Stiffness: {log.stiffness}
                    </span>
                    <span className="font-bold text-sky-600 dark:text-sky-400">
                      Avg {avg}/10
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-white/95 dark:bg-white/15 border border-slate-200/80 dark:border-white/10 overflow-hidden">
                    {avg > 0 && (
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.max(8, avg * 10)}%`,
                          background:
                            avg <= 3
                              ? 'linear-gradient(90deg, #5EE6B0 0%, #24B47E 100%)'
                              : avg <= 6
                              ? 'linear-gradient(90deg, #27C8E8 0%, #2EB8F5 100%)'
                              : 'linear-gradient(90deg, #FFD24D 0%, #FF7A59 100%)',
                        }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>

      {/* Earned Badges */}
      <GlassCard className="p-5 space-y-3">
        <h3 className="font-display font-bold text-sm text-[var(--text)] flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-500" /> Milestones & Badges
        </h3>
        <div className="flex flex-wrap gap-2">
          {streaks.badges.map((badge) => (
            <div
              key={badge}
              className="px-3.5 py-2 rounded-2xl bg-amber-500/15 border border-amber-400/30 text-amber-900 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              {badge}
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Tip of the Day Card with TipVisual */}
      <GlassCard className="p-5 space-y-3 bg-gradient-to-br from-sky-500/10 to-emerald-500/10">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0A5C80] dark:text-[#7CD6FF]">
          <Lightbulb className="w-4 h-4" /> Tip of the Day · {dailyTip.category}
        </div>
        <h3 className="font-display font-bold text-base text-[var(--text)]">
          {dailyTip.title}
        </h3>
        <p className="text-xs text-[var(--text-soft)] leading-relaxed">{dailyTip.body}</p>
        <TipVisual kind="spine-shift" />
      </GlassCard>

      {/* Recent Activity History */}
      {sessions.length > 0 && (
        <div className="space-y-2.5">
          <h3 className="font-display font-bold text-sm text-[var(--text)] px-1">
            Recent Sessions
          </h3>
          {sessions.slice(0, 5).map((s) => (
            <GlassCard key={s.id} className="p-3.5 flex items-center justify-between">
              <div>
                <div className="font-display font-bold text-sm text-[var(--text)]">{s.title}</div>
                <div className="text-xs text-[var(--text-soft)]">
                  {s.date} · {Math.max(1, Math.round(s.durationSec / 60))} min
                </div>
              </div>
              {s.feedback && (
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 capitalize">
                  Felt {s.feedback}
                </span>
              )}
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
};
