import {
  UserProfile,
  SchedulePrefs,
  DailyPlan,
  PlanTask,
  MoveItem,
  ConditionId,
  CustomWorkout,
  WorkoutGoal,
  WorkoutStyle,
  WorkoutLocation,
  Level,
  WorkoutBlock,
  PainLog,
  CareCardData,
  StreakData,
} from '../types';
import movesData from '../data/moves.json';
import careCardsData from '../data/careCards.json';

const moves: MoveItem[] = movesData as MoveItem[];
const careCards: CareCardData[] = careCardsData as CareCardData[];

export function getTodayDateString(timeZone?: string): string {
  try {
    if (timeZone) {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(new Date());
      const y = parts.find((p) => p.type === 'year')?.value;
      const m = parts.find((p) => p.type === 'month')?.value;
      const d = parts.find((p) => p.type === 'day')?.value;
      if (y && m && d) return `${y}-${m}-${d}`;
    }
  } catch {
    // Fallback to local system clock if IANA zone is unrecognized
  }
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDaysToYYYYMMDD(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00`);
  if (isNaN(d.getTime())) return dateStr;
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function diffDaysBetween(fromYYYYMMDD: string, toYYYYMMDD: string): number {
  if (!fromYYYYMMDD || !toYYYYMMDD) return 0;
  const a = new Date(`${fromYYYYMMDD}T12:00:00`).getTime();
  const b = new Date(`${toYYYYMMDD}T12:00:00`).getTime();
  if (isNaN(a) || isNaN(b)) return 0;
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

export function computeUpdatedStreak(current: StreakData | null | undefined, dateStr: string): StreakData {
  const next: StreakData = {
    currentStreak: current?.currentStreak ?? 0,
    bestStreak: current?.bestStreak ?? 0,
    freezeTokens: current?.freezeTokens ?? 2,
    maxFreezes: current?.maxFreezes ?? 2,
    lastActiveDate: current?.lastActiveDate ?? '',
    weeklyConsistency: { ...(current?.weeklyConsistency || {}) },
    badges: [...(current?.badges || ['First Step'])],
  };

  if (next.lastActiveDate === dateStr) {
    if (next.currentStreak < 1) {
      next.currentStreak = 1;
    }
    next.weeklyConsistency[dateStr] = 'done';
  } else {
    const yesterday = addDaysToYYYYMMDD(dateStr, -1);
    if (!next.lastActiveDate) {
      next.currentStreak = 1;
    } else if (next.lastActiveDate === yesterday) {
      next.currentStreak = Math.max(1, next.currentStreak + 1);
    } else if (diffDaysBetween(next.lastActiveDate, dateStr) > 1 && next.freezeTokens > 0) {
      next.freezeTokens -= 1;
      next.currentStreak = Math.max(1, next.currentStreak + 1);
      next.weeklyConsistency[yesterday] = 'grace';
    } else {
      next.currentStreak = 1;
    }
    next.lastActiveDate = dateStr;
    next.weeklyConsistency[dateStr] = 'done';
  }

  if (next.currentStreak > next.bestStreak) {
    next.bestStreak = next.currentStreak;
  }

  if (!next.badges.includes('First Step')) {
    next.badges.push('First Step');
  }
  if (next.currentStreak >= 3 && !next.badges.includes('3-Day Flow')) {
    next.badges.push('3-Day Flow');
  }
  if (next.currentStreak >= 7 && !next.badges.includes('Week of Ease')) {
    next.badges.push('Week of Ease');
  }

  return next;
}

export function mergeCompletedTasksIntoPlan(
  previousPlan: DailyPlan | null | undefined,
  nextPlan: DailyPlan
): DailyPlan {
  if (!previousPlan || previousPlan.date !== nextPlan.date) {
    return nextPlan;
  }
  const prevById = new Map(previousPlan.tasks.map((t) => [t.id, t]));
  const mergedTasks: PlanTask[] = nextPlan.tasks.map((task) => {
    const prev = prevById.get(task.id);
    if (prev && prev.status === 'done') {
      return {
        ...task,
        status: 'done',
        completedAt: prev.completedAt || Date.now(),
      };
    }
    return task;
  });
  const completedCount = mergedTasks.filter((t) => t.status === 'done').length;
  return {
    ...nextPlan,
    tasks: mergedTasks,
    completedCount: Math.max(completedCount, previousPlan.completedCount || 0),
    activeMinutes: Math.max(nextPlan.activeMinutes || 0, previousPlan.activeMinutes || 0),
    waterCups: Math.max(nextPlan.waterCups || 0, previousPlan.waterCups || 0),
    steps: Math.max(nextPlan.steps || 0, previousPlan.steps || 0),
  };
}

export function getCurrentHHMMInTimeZone(timeZone?: string): string {
  try {
    if (timeZone) {
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).formatToParts(new Date());
      const h = parts.find((p) => p.type === 'hour')?.value;
      const m = parts.find((p) => p.type === 'minute')?.value;
      if (h && m) return `${h}:${m}`;
    }
  } catch {
    // fallback
  }
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function getTimeOfDayGreeting(timeZone?: string): {
  greeting: string;
  period: 'morning' | 'afternoon' | 'evening';
} {
  const hhmm = getCurrentHHMMInTimeZone(timeZone);
  const hr = parseInt(hhmm.split(':')[0] || '12', 10);
  if (hr < 12) return { greeting: 'Good morning', period: 'morning' };
  if (hr < 17) return { greeting: 'Good afternoon', period: 'afternoon' };
  return { greeting: 'Good evening', period: 'evening' };
}

export function getSafeMovesForUser(profile: UserProfile, latestPain?: PainLog | null): MoveItem[] {
  const userConditions = profile.conditions || [];
  const disabledMoves = new Set(profile.disabledMoves || []);
  const painScores = latestPain?.scores || profile.painBaseline || {};
  const highPainAreas = Object.entries(painScores)
    .filter(([, score]) => score >= 7)
    .map(([cond]) => cond as ConditionId);

  return moves.filter((m) => {
    if (disabledMoves.has(m.id)) return false;

    const hasConflict = m.avoidOrModifyFor.some((c) => userConditions.includes(c));
    if (hasConflict && !m.helpsWith.some((c) => userConditions.includes(c))) {
      return false;
    }

    if (highPainAreas.length > 0) {
      if (m.avoidOrModifyFor.some((c) => highPainAreas.includes(c))) {
        return false;
      }
      if (m.durationSec > 45 && m.category === 'Strength') {
        return false;
      }
    }

    if (
      (profile.pregnantOrPostpartum || profile.recentSurgery || profile.doctorAdviceToAvoid) &&
      m.position === 'Floor'
    ) {
      return false;
    }

    return true;
  });
}

export function getConditionDisplayNames(conditions: ConditionId[]): string[] {
  if (!conditions || conditions.length === 0) return ['Full-body ease'];
  return conditions.map((id) => {
    const found = careCards.find((c) => c.id === id);
    return found ? found.shortTitle : id.replace('_', ' ');
  });
}

export function buildWhyThisPlanText(profile: UserProfile, schedule: SchedulePrefs): string {
  const focusNames = getConditionDisplayNames(profile.conditions || []).join(', ');
  const resets = Math.max(2, Math.min(6, schedule.remindersPerDay || 4));
  const windowStr = `${schedule.workStart || '09:00'} to ${schedule.workEnd || '18:00'}`;
  const equipStr =
    schedule.equipment && schedule.equipment.length > 0
      ? schedule.equipment.join(', ')
      : 'Chair / Desk only';

  return `Built for a ${profile.level} pace with ${resets} short resets between ${windowStr}. Focused on ${focusNames.toLowerCase()} using ${equipStr.toLowerCase()} to support your "${profile.goal}" goal.`;
}

function getWeeklyRhythmTheme(
  dateStr: string,
  daysOff: number[],
  isGentleOverride: boolean
): {
  label: string;
  preferredCategories: string[];
} {
  const parsed = new Date(`${dateStr}T12:00:00`);
  const dayOfWeek = isNaN(parsed.getTime()) ? new Date().getDay() : parsed.getDay();

  if (isGentleOverride) {
    return {
      label: 'Gentle Recovery Pace',
      preferredCategories: ['Mobility', 'Stretch', 'Breathing'],
    };
  }

  if (daysOff.includes(dayOfWeek)) {
    return {
      label: 'Rest & Gentle Mobility Day',
      preferredCategories: ['Stretch', 'Mobility', 'Breathing'],
    };
  }

  // Weekly rhythm across working days:
  // Mon (1): Posture & Mobility, Tue (2): Gentle Strength, Wed (3): Circulation & Cardio,
  // Thu (4): Joint Care & Core, Fri (5): Full-Body Feel-Good Flow
  switch (dayOfWeek) {
    case 1:
      return { label: 'Mobility & Posture Day', preferredCategories: ['Posture', 'Mobility'] };
    case 2:
      return { label: 'Gentle Strength Day', preferredCategories: ['Strength', 'Posture'] };
    case 3:
      return { label: 'Circulation & Energy Day', preferredCategories: ['Circulation', 'Mobility'] };
    case 4:
      return { label: 'Joint Relief & Balance Day', preferredCategories: ['Mobility', 'Stretch'] };
    case 5:
    default:
      return { label: 'Feel-Good Recovery Day', preferredCategories: ['Stretch', 'Mobility'] };
  }
}

function parseHHMMToMinutes(hhmm: string, fallback: number): number {
  const parts = (hhmm || '').split(':').map(Number);
  if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return fallback;
  return parts[0] * 60 + parts[1];
}

function formatMinutesToHHMM(totalMin: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(totalMin)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function buildScheduledTimes(schedule: SchedulePrefs, count: number): string[] {
  const startMin = parseHHMMToMinutes(schedule.workStart, 9 * 60 + 30);
  const endMin = Math.max(startMin + 120, parseHHMMToMinutes(schedule.workEnd, 18 * 60));
  const span = endMin - startMin;
  const times: string[] = [];
  for (let i = 0; i < count; i++) {
    const frac = count === 1 ? 0.5 : (i + 0.5) / count;
    times.push(formatMinutesToHHMM(startMin + span * frac));
  }
  return times;
}

export function generateDailyPlan(
  profile: UserProfile,
  schedule: SchedulePrefs,
  date: string = getTodayDateString(profile.timeZone),
  latestPain?: PainLog | null,
  yesterdayMoveIds: string[] = []
): DailyPlan {
  const safeMoves = getSafeMovesForUser(profile, latestPain);
  const userConditions = profile.conditions || [];
  const painScores = latestPain?.scores || profile.painBaseline || {};
  const maxPain = Math.max(0, ...Object.values(painScores));
  const isHighStiffness = latestPain?.stiffness === 'High' || maxPain >= 7;
  const isLowEnergy = latestPain?.energy === 'Low' || userConditions.includes('low_energy');
  const isGentleRecoveryActive = Boolean(
    profile.gentleLoadUntilDate && profile.gentleLoadUntilDate >= date
  );

  //Deterministic date seed so daily moves rotate cleanly and avoid repeating yesterday's moves
  const seed = date.split('-').reduce((acc, val) => acc + parseInt(val, 10), 0) + (profile.planVersion || 1);
  const avoidYesterday = new Set(yesterdayMoveIds);

  const pickMove = (
    filterFn: (m: MoveItem) => boolean,
    offset: number,
    alreadyPicked: Set<string>
  ): MoveItem => {
    const matching = safeMoves.filter(filterFn);
    const nonRepeating = matching.filter(
      (m) => !alreadyPicked.has(m.id) && !avoidYesterday.has(m.id)
    );
    const pool =
      nonRepeating.length > 0
        ? nonRepeating
        : matching.filter((m) => !alreadyPicked.has(m.id)).length > 0
        ? matching.filter((m) => !alreadyPicked.has(m.id))
        : safeMoves;
    const chosen = pool[(seed + offset) % pool.length] || moves[0];
    alreadyPicked.add(chosen.id);
    return chosen;
  };

  const pickedMoveIds = new Set<string>();
  const rhythm = getWeeklyRhythmTheme(
    date,
    schedule.daysOff || [0, 6],
    isHighStiffness || isLowEnergy || isGentleRecoveryActive
  );

  const conditionMove = pickMove(
    (m) => m.helpsWith.some((c) => userConditions.includes(c)),
    1,
    pickedMoveIds
  );
  const postureMove = pickMove(
    (m) => m.category === 'Posture' || m.targetAreas.includes('Neck') || m.targetAreas.includes('Upper Back'),
    2,
    pickedMoveIds
  );
  const rhythmMove = pickMove(
    (m) => rhythm.preferredCategories.includes(m.category),
    3,
    pickedMoveIds
  );
  const lowerBodyMove = pickMove(
    (m) =>
      m.targetAreas.includes('Hips') ||
      m.targetAreas.includes('Knees') ||
      m.targetAreas.includes('Ankles') ||
      m.category === 'Circulation',
    4,
    pickedMoveIds
  );
  const breathOrEyeMove = pickMove(
    (m) =>
      userConditions.includes('eye_strain')
        ? m.category === 'Eyes'
        : m.category === 'Breathing' || m.category === 'Stretch',
    5,
    pickedMoveIds
  );

  const parsedDate = new Date(`${date}T12:00:00`);
  const dayOfWeek = isNaN(parsedDate.getTime()) ? new Date().getDay() : parsedDate.getDay();
  const isDayOff = (schedule.daysOff || [0, 6]).includes(dayOfWeek);

  const requestedCount = Math.max(2, Math.min(6, schedule.remindersPerDay || 4));
  const slotTimes = buildScheduledTimes(schedule, 6);

  const candidateTasks: PlanTask[] = [
    {
      id: `task-${date}-1`,
      title: `Morning ${conditionMove.name}`,
      subtitle:
        userConditions.length > 0
          ? `Gentle care for your ${conditionMove.targetAreas.join(' & ').toLowerCase()}`
          : 'Smooth wake-up mobility for stiff joints',
      category: 'care',
      durationSec: isHighStiffness ? 60 : 120,
      moveId: conditionMove.id,
      timeWindow: 'Morning',
      scheduledTime: slotTimes[0] || '09:30',
      status: 'pending',
      isCareSafe: true,
      targetArea: conditionMove.targetAreas[0],
    },
    {
      id: `task-${date}-2`,
      title: `Posture Check + ${postureMove.name}`,
      subtitle:
        schedule.workType === 'Standing'
          ? 'Unclench shoulders, soften knees & lengthen spine'
          : 'Uncurl shoulders & align ears over shoulders',
      category: 'posture',
      durationSec: 90,
      moveId: postureMove.id,
      timeWindow: 'Morning',
      scheduledTime: slotTimes[1] || '11:15',
      status: 'pending',
      isCareSafe: true,
      targetArea: 'Posture',
    },
    {
      id: `task-${date}-3`,
      title: isLowEnergy || isHighStiffness ? `Gentle ${rhythmMove.name}` : 'Midday Walk & Hydrate',
      subtitle:
        isLowEnergy || isHighStiffness
          ? 'Easy pace — stay well below discomfort'
          : `${rhythm.label} · 3-minute stroll + a glass of water`,
      category: isLowEnergy || isHighStiffness ? 'reset' : 'walk',
      durationSec: isLowEnergy || isHighStiffness ? 90 : 180,
      moveId: rhythmMove.id,
      timeWindow: 'Midday',
      scheduledTime: slotTimes[2] || '13:30',
      status: 'pending',
      isCareSafe: true,
      targetArea: rhythmMove.targetAreas[0] || 'Circulation',
    },
    {
      id: `task-${date}-4`,
      title: `Afternoon ${lowerBodyMove.name}`,
      subtitle: `Release sitting stiffness in ${lowerBodyMove.targetAreas.join(' & ').toLowerCase()}`,
      category: 'reset',
      durationSec: profile.level === 'Starter' || isGentleRecoveryActive ? 90 : 150,
      moveId: lowerBodyMove.id,
      timeWindow: 'Afternoon',
      scheduledTime: slotTimes[3] || '15:30',
      status: 'pending',
      isCareSafe: true,
      targetArea: lowerBodyMove.targetAreas[0],
    },
    {
      id: `task-${date}-5`,
      title: userConditions.includes('eye_strain')
        ? '20-20-20 Eye & Neck Refresh'
        : `Calm ${breathOrEyeMove.name}`,
      subtitle: userConditions.includes('eye_strain')
        ? 'Look 20 ft away + relax jaw and shoulders'
        : 'Reset your nervous system & soften tension',
      category: userConditions.includes('eye_strain') ? 'eye' : 'breath',
      durationSec: 60,
      moveId: breathOrEyeMove.id,
      timeWindow: 'Evening',
      scheduledTime: slotTimes[4] || '17:30',
      status: 'pending',
      isCareSafe: true,
      targetArea: userConditions.includes('eye_strain') ? 'Eyes' : 'Calm',
    },
    {
      id: `task-${date}-6`,
      title: `Evening Decompress: ${rhythmMove.name}`,
      subtitle: 'Let go of the workday tension before evening rest',
      category: 'care',
      durationSec: 90,
      moveId: rhythmMove.id,
      timeWindow: 'Evening',
      scheduledTime: slotTimes[5] || '19:00',
      status: 'pending',
      isCareSafe: true,
      targetArea: rhythmMove.targetAreas[0] || 'Full Body',
    },
  ];

  const targetTaskCount = isDayOff
    ? Math.max(2, Math.min(3, requestedCount))
    : isHighStiffness || isGentleRecoveryActive
    ? Math.max(2, Math.min(4, requestedCount))
    : requestedCount;

  const finalTasks = candidateTasks.slice(0, targetTaskCount);

  let whyToday = `${rhythm.label}: tailored to your ${profile.level.toLowerCase()} pace`;
  if (userConditions.length > 0) {
    whyToday += ` and ${getConditionDisplayNames(userConditions).slice(0, 2).join(' + ').toLowerCase()} care.`;
  } else {
    whyToday += ` and "${profile.goal}" goal.`;
  }

  if (isGentleRecoveryActive) {
    whyToday = 'Welcome back! We eased your plan into a gentle recovery pace for 3 days.';
  } else if (isHighStiffness) {
    whyToday = 'High stiffness or comfort check noted — today uses shorter, soothing range-of-motion resets.';
  } else if (isLowEnergy) {
    whyToday = 'Low energy mode active — gentle seated and breath-led resets to recharge without strain.';
  }

  const defaultStepsGoal =
    profile.stepGoal ||
    (profile.level === 'Starter' ? 4500 : profile.level === 'Steady' ? 6500 : 8000);

  return {
    date,
    tasks: finalTasks,
    completedCount: 0,
    totalCount: finalTasks.length,
    activeMinutes: 0,
    waterCups: 0,
    waterGoal: 6,
    steps: 0,
    stepGoal: defaultStepsGoal,
    whyToday,
    whyThisPlan: buildWhyThisPlanText(profile, schedule),
    planVersion: profile.planVersion || 1,
    themeFocus: rhythm.label,
  };
}

export function getSubstituteMove(
  currentMoveId: string | undefined,
  profile: UserProfile,
  easierOnly: boolean = false
): MoveItem {
  const safeMoves = getSafeMovesForUser(profile);
  const current = moves.find((m) => m.id === currentMoveId);

  let candidates = safeMoves.filter((m) => m.id !== currentMoveId);
  if (current) {
    const sameArea = candidates.filter((m) =>
      m.targetAreas.some((area) => current.targetAreas.includes(area))
    );
    if (sameArea.length > 0) candidates = sameArea;
  }

  if (easierOnly) {
    const seatedOrGentle = candidates.filter(
      (m) => m.position === 'Seated' || m.category === 'Stretch' || m.category === 'Breathing'
    );
    if (seatedOrGentle.length > 0) candidates = seatedOrGentle;
  }

  return candidates[Math.floor(Math.random() * candidates.length)] || safeMoves[0] || moves[0];
}

export function generateCustomWorkout(
  profile: UserProfile,
  opts: {
    goal: WorkoutGoal;
    durationMin: number;
    level: Level;
    style: WorkoutStyle;
    location: WorkoutLocation;
    equipment: string[];
  },
  latestPain?: PainLog | null
): CustomWorkout {
  const safeMoves = getSafeMovesForUser(profile, latestPain);
  const userConditions = profile.conditions || [];

  let locationFiltered = safeMoves;
  if (opts.location === 'At desk') {
    locationFiltered = safeMoves.filter((m) => m.position === 'Seated' || m.position === 'Standing');
  } else if (opts.location === 'Small space') {
    locationFiltered = safeMoves.filter((m) => m.position !== 'Floor' || opts.equipment.includes('Mat'));
  }

  const warmups = locationFiltered.filter(
    (m) => m.category === 'Mobility' || m.category === 'Posture' || m.category === 'Eyes'
  );
  const mains = locationFiltered.filter((m) => {
    if (opts.goal === 'Strength') return m.category === 'Strength' || m.category === 'Posture';
    if (opts.goal === 'Core & posture') return m.category === 'Posture' || m.category === 'Strength';
    if (opts.goal === 'Gentle cardio') return m.category === 'Circulation' || m.category === 'Strength';
    if (opts.goal === 'Evening stretch') return m.category === 'Stretch' || m.category === 'Breathing';
    return m.category === 'Mobility' || m.category === 'Posture' || m.category === 'Strength';
  });
  const cooldowns = locationFiltered.filter(
    (m) => m.category === 'Stretch' || m.category === 'Breathing'
  );

  const totalBlocks =
    opts.durationMin <= 5 ? 3 : opts.durationMin <= 10 ? 5 : opts.durationMin <= 15 ? 7 : 9;
  const blocks: WorkoutBlock[] = [];

  const pickFrom = (arr: MoveItem[], idx: number) =>
    arr[idx % Math.max(1, arr.length)] || safeMoves[idx % safeMoves.length] || moves[0];

  const w1 = pickFrom(warmups, 0);
  blocks.push({
    id: `wb-warmup-1`,
    name: w1.name,
    phase: 'Warm-up',
    moveId: w1.id,
    durationSec: 45,
    reps: opts.style === 'Checklist sets & reps' ? '1 set · 8 slow reps' : undefined,
    cues: w1.cues,
    breathingCue: w1.breathingCue,
    easierVariant: w1.easierVariant,
    avoidNote: w1.dontCue,
  });

  if (totalBlocks >= 5) {
    const w2 = pickFrom(warmups, 1);
    blocks.push({
      id: `wb-warmup-2`,
      name: w2.name,
      phase: 'Warm-up',
      moveId: w2.id,
      durationSec: 45,
      reps: opts.style === 'Checklist sets & reps' ? '1 set · 8 slow reps' : undefined,
      cues: w2.cues,
      breathingCue: w2.breathingCue,
      easierVariant: w2.easierVariant,
      avoidNote: w2.dontCue,
    });
  }

  const mainCount = Math.max(1, totalBlocks - (totalBlocks >= 5 ? 4 : 2));
  for (let i = 0; i < mainCount; i++) {
    const m = pickFrom(mains, i);
    const setsStr = opts.level === 'Starter' ? '1–2 sets' : opts.level === 'Steady' ? '2 sets' : '2–3 sets';
    blocks.push({
      id: `wb-main-${i + 1}`,
      name: m.name,
      phase: 'Main',
      moveId: m.id,
      durationSec: opts.level === 'Starter' ? 45 : 60,
      reps: opts.style === 'Checklist sets & reps' ? `${setsStr} · 8–10 reps` : undefined,
      cues: m.cues,
      breathingCue: m.breathingCue,
      easierVariant: m.easierVariant,
      avoidNote: m.dontCue,
    });
  }

  const c1 = pickFrom(cooldowns, 0);
  blocks.push({
    id: `wb-cool-1`,
    name: c1.name,
    phase: 'Cool-down',
    moveId: c1.id,
    durationSec: 45,
    reps: opts.style === 'Checklist sets & reps' ? 'Hold 30 sec' : undefined,
    cues: c1.cues,
    breathingCue: c1.breathingCue,
    easierVariant: c1.easierVariant,
    avoidNote: c1.dontCue,
  });

  if (totalBlocks >= 5) {
    const c2 = pickFrom(cooldowns, 1);
    blocks.push({
      id: `wb-cool-2`,
      name: c2.name,
      phase: 'Cool-down',
      moveId: c2.id,
      durationSec: 60,
      reps: opts.style === 'Checklist sets & reps' ? '5 slow breaths' : undefined,
      cues: c2.cues,
      breathingCue: c2.breathingCue,
      easierVariant: c2.easierVariant,
      avoidNote: c2.dontCue,
    });
  }

  const safeNotes: string[] = [];
  if (userConditions.includes('neck_cs')) {
    safeNotes.push('Neck care: Avoid neck circles and backward head tilt; keep chin gently nodded.');
  }
  if (userConditions.includes('lower_back')) {
    safeNotes.push('Lower back care: Hinge from hips with soft knees; skip deep loaded spinal twists.');
  }
  if (userConditions.includes('knee')) {
    safeNotes.push('Knee comfort: Use higher chair height and pain-free range on sit-to-stands.');
  }
  if (userConditions.includes('wrist_hand')) {
    safeNotes.push('Wrist friendly: No heavy floor weight-bearing on bent wrists.');
  }
  if (safeNotes.length === 0) {
    safeNotes.push('Move within a comfortable, pain-free range (0–3/10 tension).');
  }

  return {
    id: `workout-${Date.now()}`,
    title: `${opts.durationMin}-Min ${opts.goal} Flow`,
    subtitle: `${opts.level} · ${opts.location} · ${opts.style}`,
    goal: opts.goal,
    durationMin: opts.durationMin,
    level: opts.level,
    style: opts.style,
    location: opts.location,
    equipment: opts.equipment,
    blocks,
    safeNotes,
    isSaved: false,
    createdAt: Date.now(),
  };
}
