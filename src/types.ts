export type Level = 'Starter' | 'Steady' | 'Active';
export type Goal = 'Sit less' | 'Ease stiffness' | 'Build a routine' | 'Gentle strength' | 'Posture' | 'Calm energy';
export type CheerStyle = 'Warm & celebratory' | 'Calm & minimal' | 'Playful';
export type HabitType = 'Move more' | 'Stretch & posture' | 'Short home workouts' | 'Walk breaks' | 'Calm breathing' | 'All of the above';
export type WorkType = 'Desk / laptop' | 'Standing' | 'On the move' | 'Mixed';
export type ReportCategory = 'Bug' | 'Wrong plan or exercise' | 'Safety concern' | 'Idea';

export type ConditionId =
  | 'neck_cs'
  | 'upper_back'
  | 'lower_back'
  | 'shoulder'
  | 'wrist_hand'
  | 'knee'
  | 'hip_glute'
  | 'ankle_foot'
  | 'eye_strain'
  | 'stiff_sitting'
  | 'low_energy';

export interface LastWriteResult {
  status: 'idle' | 'success' | 'error';
  operation?: 'read' | 'write';
  path: string;
  timestamp: number;
  error?: string | null;
}

export interface UserProfile {
  uid: string;
  name?: string;
  email?: string;
  photoURL?: string;
  provider?: 'anonymous' | 'google' | string;
  isGuest?: boolean;
  ageBand?: string;
  sex?: string;
  heightUnit?: string;
  language?: string;
  timeZone?: string;
  habitType?: HabitType;
  sittingHoursPerDay?: number;
  currentActiveDays?: number;
  level: Level;
  goal: Goal;
  conditions: ConditionId[];
  noneSelected?: boolean;
  painBaseline: Record<string, number>;
  painDuration?: Record<string, string>;
  gettingWorse?: Record<string, boolean>;
  safetyFlags: string[];
  pregnantOrPostpartum?: boolean;
  doctorAdviceToAvoid?: boolean;
  recentSurgery?: boolean;
  cheerStyle: CheerStyle;
  theme: 'light' | 'dark' | 'system';
  reducedMotion: boolean;
  soundHaptics: boolean;
  stepSource?: 'manual' | 'device' | 'none';
  stepGoal?: number;
  disabledMoves?: string[];
  planVersion?: number;
  gentleLoadUntilDate?: string;
  onboardingStep?: number;
  onboardingComplete: boolean;
  onboardingCompletedAt?: number;
  consentGivenAt?: number;
  // Schedule fields also mirrored on users/{uid} for progressive onboarding & final batch
  workStart?: string;
  workEnd?: string;
  workType?: WorkType;
  breakWindows?: string[];
  daysOff?: number[];
  remindersPerDay?: number;
  quietHours?: { start: string; end: string };
  equipment?: string[];
  location?: string;
  createdAt: number;
  updatedAt: number;
}

export interface SchedulePrefs {
  workStart: string; // "09:00"
  workEnd: string;   // "18:00"
  workType?: WorkType;
  breakWindows: string[]; // ["11:00", "15:00", "17:30"]
  daysOff: number[]; // [0, 6]
  remindersPerDay: number;
  quietHours: { start: string; end: string };
  equipment: string[];
  location: string;
}

export interface PlanTask {
  id: string;
  title: string;
  subtitle: string;
  category: 'reset' | 'posture' | 'walk' | 'care' | 'hydrate' | 'eye' | 'breath' | 'workout';
  durationSec: number;
  moveId?: string;
  sessionId?: string;
  timeWindow: 'Morning' | 'Midday' | 'Afternoon' | 'Evening';
  scheduledTime?: string;
  status: 'pending' | 'done' | 'skipped' | 'snoozed';
  completedAt?: number;
  isCareSafe?: boolean;
  targetArea?: string;
}

export interface DailyPlan {
  date: string; // YYYY-MM-DD
  tasks: PlanTask[];
  completedCount: number;
  totalCount: number;
  activeMinutes: number;
  waterCups: number;
  waterGoal: number;
  steps: number;
  stepGoal: number;
  whyToday?: string;
  whyThisPlan?: string;
  planVersion?: number;
  themeFocus?: string;
}

export interface SessionLog {
  id: string;
  date: string;
  timestamp: number;
  title: string;
  category: string;
  durationSec: number;
  feedback?: 'easy' | 'good' | 'hard' | 'hurt' | 'none';
  hurtArea?: string;
  hurtMoveId?: string;
  notes?: string;
}

export interface PainLog {
  id: string;
  date: string;
  timestamp: number;
  scores: Record<string, number>; // 0 - 10
  stiffness: 'Low' | 'Moderate' | 'High';
  energy: 'Low' | 'Steady' | 'Bright';
  notes?: string;
}

export interface StreakData {
  currentStreak: number;
  bestStreak: number;
  freezeTokens: number;
  maxFreezes: number;
  lastActiveDate: string;
  weeklyConsistency: Record<string, 'done' | 'grace' | 'rest' | 'none'>; // YYYY-MM-DD -> status
  badges: string[];
}

export interface MoveItem {
  id: string;
  name: string;
  category: string;
  durationSec: number;
  position: 'Seated' | 'Standing' | 'Floor' | 'Any';
  targetAreas: string[];
  helpsWith: ConditionId[];
  avoidOrModifyFor: ConditionId[];
  easierVariant: string;
  harderVariant: string;
  cues: string[];
  dontCue: string;
  breathingCue: string;
  twoSided?: boolean;
  focusArea?: string;
  illustrationKey: string;
}

export interface SessionTemplate {
  id: string;
  title: string;
  subtitle: string;
  durationMin: number;
  category: 'Desk Reset' | 'Neck & Shoulder' | 'Back Care' | 'Hip & Knee' | 'Full Body' | 'Evening Wind-down' | 'Morning Wake-up';
  level: Level;
  position: 'Seated' | 'Standing' | 'Floor' | 'Mixed';
  moveIds: string[];
  safeFor: ConditionId[];
}

export interface CareCardData {
  id: ConditionId;
  title: string;
  shortTitle: string;
  icon: string;
  color: string;
  summary: string;
  whatHelps: string[];
  pacingRules: string[];
  modifyOrSkip: string[];
  deskTips: string[];
  redFlags: string[];
  recommendedMoveIds: string[];
}

export type WorkoutGoal = 'Feel good' | 'Mobility' | 'Strength' | 'Core & posture' | 'Gentle cardio' | 'Low-impact full body' | 'Evening stretch';
export type WorkoutStyle = 'Guided timer' | 'Checklist sets & reps' | 'Circuit' | 'Stretch flow';
export type WorkoutLocation = 'At desk' | 'Bedroom / living room' | 'Small space' | 'Outdoors / walk' | 'Gym';

export interface WorkoutBlock {
  id: string;
  name: string;
  phase: 'Warm-up' | 'Main' | 'Cool-down';
  moveId?: string;
  durationSec: number;
  reps?: string;
  cues: string[];
  breathingCue: string;
  easierVariant: string;
  avoidNote?: string;
  completed?: boolean;
}

export interface CustomWorkout {
  id: string;
  title: string;
  subtitle: string;
  goal: WorkoutGoal;
  durationMin: number;
  level: Level;
  style: WorkoutStyle;
  location: WorkoutLocation;
  equipment: string[];
  blocks: WorkoutBlock[];
  safeNotes: string[];
  isSaved?: boolean;
  scheduledDays?: number[]; // 0-6
  timeWindow?: 'Morning' | 'Midday' | 'Afternoon' | 'Evening';
  createdAt: number;
}
