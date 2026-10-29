import { describe, it, expect } from 'vitest';
import {
  getSafeMovesForUser,
  generateDailyPlan,
  generateCustomWorkout,
  buildWhyThisPlanText,
  computeUpdatedStreak,
  mergeCompletedTasksIntoPlan,
  getTodayDateString,
} from './planEngine';
import { UserProfile, SchedulePrefs, StreakData } from '../types';
import {
  SPLASH_MIN_MS,
  SPLASH_READY_HOLD_MS,
  SPLASH_FADE_MS,
  SPLASH_SLOW_MS,
} from '../config';

const mockProfile: UserProfile = {
  uid: 'test-user',
  name: 'Alex',
  level: 'Starter',
  goal: 'Ease stiffness',
  conditions: ['neck_cs', 'lower_back'],
  painBaseline: { neck_cs: 5, lower_back: 4 },
  safetyFlags: [],
  cheerStyle: 'Warm & celebratory',
  theme: 'light',
  reducedMotion: false,
  soundHaptics: true,
  onboardingComplete: true,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const mockSchedule: SchedulePrefs = {
  workStart: '09:00',
  workEnd: '17:00',
  breakWindows: ['10:30', '13:30', '16:00'],
  daysOff: [0, 6],
  remindersPerDay: 4,
  quietHours: { start: '21:00', end: '08:00' },
  equipment: ['Chair / Desk'],
  location: 'At desk',
};

describe('UnStill Plan & Safety Engine', () => {
  it('filters out moves that conflict with user conditions or high pain', () => {
    const safe = getSafeMovesForUser(mockProfile);
    expect(safe.length).toBeGreaterThan(5);
    const hasHighPainConflict = getSafeMovesForUser(mockProfile, {
      id: 'p1',
      date: '2026-04-17',
      timestamp: Date.now(),
      scores: { neck_cs: 8, knee: 8 },
      stiffness: 'High',
      energy: 'Low',
    });
    expect(hasHighPainConflict.every((m) => !m.avoidOrModifyFor.includes('knee'))).toBe(true);
  });

  it('generates a daily plan respecting high stiffness or low energy and avoids yesterday moves', () => {
    const normalPlan = generateDailyPlan(mockProfile, mockSchedule, '2026-04-17');
    expect(normalPlan.tasks.length).toBeGreaterThanOrEqual(3);
    expect(normalPlan.whyThisPlan).toContain('Starter pace');

    const firstMoveId = normalPlan.tasks[0]?.moveId;
    const nextDayPlan = generateDailyPlan(
      mockProfile,
      mockSchedule,
      '2026-04-18',
      null,
      firstMoveId ? [firstMoveId] : []
    );
    expect(nextDayPlan.tasks[0]?.moveId).not.toBe(firstMoveId);

    const gentlePlan = generateDailyPlan(mockProfile, mockSchedule, '2026-04-17', {
      id: 'p2',
      date: '2026-04-17',
      timestamp: Date.now(),
      scores: { neck_cs: 8 },
      stiffness: 'High',
      energy: 'Low',
    });
    expect(gentlePlan.whyToday).toContain('High stiffness');
  });

  it('builds a clear Why This Plan explanation string', () => {
    const text = buildWhyThisPlanText(mockProfile, mockSchedule);
    expect(text).toContain('Starter pace');
    expect(text).toContain('09:00 to 17:00');
  });

  it('generates a custom workout with Warm-up, Main, and Cool-down phases and safety notes', () => {
    const workout = generateCustomWorkout(mockProfile, {
      goal: 'Mobility',
      durationMin: 10,
      level: 'Starter',
      style: 'Guided timer',
      location: 'At desk',
      equipment: ['Chair / Desk'],
    });
    expect(workout.blocks.some((b) => b.phase === 'Warm-up')).toBe(true);
    expect(workout.blocks.some((b) => b.phase === 'Main')).toBe(true);
    expect(workout.blocks.some((b) => b.phase === 'Cool-down')).toBe(true);
    expect(workout.safeNotes.some((n) => n.includes('Neck care'))).toBe(true);
  });

  it('exports the configured splash timing constants (SPLASH_MIN_MS = 2500)', () => {
    expect(SPLASH_MIN_MS).toBe(2500);
    expect(SPLASH_READY_HOLD_MS).toBe(700);
    expect(SPLASH_FADE_MS).toBe(400);
    expect(SPLASH_SLOW_MS).toBe(5000);
  });

  it('updates streak from 0 to 1 after first completed reset and respects user time zone day boundary', () => {
    const initialStreaks: StreakData = {
      currentStreak: 0,
      bestStreak: 0,
      freezeTokens: 2,
      maxFreezes: 2,
      lastActiveDate: '',
      weeklyConsistency: {},
      badges: ['First Step'],
    };

    const tzDate = getTodayDateString('Asia/Kolkata');
    expect(tzDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // First completion on 2026-04-17 -> 0 becomes 1
    const afterFirst = computeUpdatedStreak(initialStreaks, '2026-04-17');
    expect(afterFirst.currentStreak).toBe(1);
    expect(afterFirst.bestStreak).toBe(1);
    expect(afterFirst.lastActiveDate).toBe('2026-04-17');
    expect(afterFirst.weeklyConsistency['2026-04-17']).toBe('done');

    // Second completion on the same day -> stays 1
    const afterSecondSameDay = computeUpdatedStreak(afterFirst, '2026-04-17');
    expect(afterSecondSameDay.currentStreak).toBe(1);

    // Next day completion -> increments to 2
    const afterNextDay = computeUpdatedStreak(afterSecondSameDay, '2026-04-18');
    expect(afterNextDay.currentStreak).toBe(2);
    expect(afterNextDay.bestStreak).toBe(2);
  });

  it('preserves completed tasks and active minutes when adapting the daily plan after feedback', () => {
    const initialPlan = generateDailyPlan(mockProfile, mockSchedule, '2026-04-17');
    const firstTaskId = initialPlan.tasks[0].id;
    const planWithCompletedTask = {
      ...initialPlan,
      tasks: initialPlan.tasks.map((t, idx) =>
        idx === 0 ? { ...t, status: 'done' as const, completedAt: 123456 } : t
      ),
      completedCount: 1,
      activeMinutes: 3,
    };

    const adaptedProfile: UserProfile = {
      ...mockProfile,
      disabledMoves: [initialPlan.tasks[1]?.moveId || 'chin_tuck'],
      planVersion: 2,
    };
    const regenerated = generateDailyPlan(adaptedProfile, mockSchedule, '2026-04-17');
    const merged = mergeCompletedTasksIntoPlan(planWithCompletedTask, regenerated);

    expect(merged.tasks.find((t) => t.id === firstTaskId)?.status).toBe('done');
    expect(merged.completedCount).toBe(1);
    expect(merged.activeMinutes).toBe(3);
  });
});
