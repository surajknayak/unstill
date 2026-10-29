import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  onAuthStateChanged,
  signOut as fbSignOut,
  signInWithPopup,
  signInWithRedirect,
  linkWithPopup,
  linkWithRedirect,
  getRedirectResult,
  signInAnonymously,
  signInWithCredential,
  GoogleAuthProvider,
  OAuthCredential,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db as firestoreDb, googleProvider } from '../lib/firebase';
import {
  UserProfile,
  SchedulePrefs,
  DailyPlan,
  SessionLog,
  PainLog,
  StreakData,
  CustomWorkout,
  PlanTask,
  ConditionId,
  ReportCategory,
  Level,
} from '../types';
import {
  getLocalProfile,
  fetchCloudProfileDetailed,
  createInitialUserDoc,
  extractFirstNameFromDisplayName,
  saveProfile,
  getLocalSchedule,
  fetchCloudSchedule,
  saveSchedule,
  getLocalDailyPlan,
  fetchCloudDailyPlan,
  saveDailyPlan,
  getLocalSessionLogs,
  fetchCloudSessionLogs,
  saveSessionLog,
  getLocalPainLogs,
  fetchCloudPainLogs,
  savePainLog,
  sortPainLogsNewestFirst,
  getLocalStreaks,
  fetchCloudStreaks,
  saveStreaks,
  getLocalWorkouts,
  fetchCloudWorkouts,
  saveCustomWorkout,
  deleteCustomWorkout,
  clearAllUserData,
  clearSessionCacheOnSignOut,
  clearOnboardingDraftForUid,
  saveOnboardingStepForUid,
  downloadUserDataAsJsonFile,
  flushPendingSyncQueue,
  formatCloudError,
  submitProblemReport,
  ensureLocalDBHealthy,
  repairLocalCacheDB,
  isOnboardingComplete,
  computeResumeOnboardingStep,
  extractScheduleFromUserDoc,
  saveOnboardingStepProgress,
  completeOnboardingBatch,
  recordWriteResult,
} from '../lib/db';
import {
  generateDailyPlan,
  getTodayDateString,
  getSubstituteMove,
  getCurrentHHMMInTimeZone,
  addDaysToYYYYMMDD,
  diffDaysBetween,
  computeUpdatedStreak,
  mergeCompletedTasksIntoPlan,
  buildWhyThisPlanText,
  getConditionDisplayNames,
} from '../lib/planEngine';

export interface AppUser {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  provider: 'anonymous' | 'google';
  isGuest: boolean;
}

interface LinkConflictDialogState {
  open: boolean;
  guestUid: string;
  credential: OAuthCredential | null;
  isProcessing?: boolean;
}

interface AppContextType {
  user: AppUser | null;
  loading: boolean;
  authRestored: boolean;
  profileLoadError: string | null;
  retryLoadProfile: () => Promise<void>;
  startFreshOnboarding: () => void;
  isEditingProfile: boolean;
  setIsEditingProfile: (v: boolean) => void;
  isShowingPlanReady: boolean;
  setIsShowingPlanReady: (v: boolean) => void;
  showWelcomeOverride: boolean;
  returnToWelcomeFromOnboarding: () => void;
  isOffline: boolean;
  toastMessage: { text: string; type: 'info' | 'error' | 'success' } | null;
  clearToast: () => void;
  showToast: (text: string, type?: 'info' | 'error' | 'success') => void;
  profile: UserProfile | null;
  schedule: SchedulePrefs;
  todayPlan: DailyPlan | null;
  sessions: SessionLog[];
  painLogs: PainLog[];
  streaks: StreakData;
  workouts: CustomWorkout[];
  activeTab: 'today' | 'plan' | 'care' | 'progress' | 'me';
  setActiveTab: (tab: 'today' | 'plan' | 'care' | 'progress' | 'me') => void;
  activeSession: {
    title: string;
    moveIds: string[];
    taskId?: string;
    workout?: CustomWorkout;
  } | null;
  startSession: (opts: { title: string; moveIds: string[]; taskId?: string; workout?: CustomWorkout }) => void;
  closeSession: () => void;
  completeSession: (durationSec: number) => Promise<void>;
  submitSessionFeedback: (
    feedback?: 'easy' | 'good' | 'hard' | 'hurt' | 'none',
    hurtArea?: string,
    hurtMoveId?: string
  ) => Promise<void>;
  showPostureCheck: boolean;
  setShowPostureCheck: (v: boolean) => void;
  showWorkoutBuilder: boolean;
  setShowWorkoutBuilder: (v: boolean) => void;
  activeWorkoutDetail: CustomWorkout | null;
  setActiveWorkoutDetail: (w: CustomWorkout | null) => void;
  showPainCheckin: boolean;
  setShowPainCheckin: (v: boolean) => void;
  reportSheetState: { open: boolean; defaultCategory?: ReportCategory };
  openReportSheet: (defaultCategory?: ReportCategory) => void;
  closeReportSheet: () => void;
  sendProblemReport: (category: ReportCategory, message: string) => Promise<void>;
  linkConflictDialog: LinkConflictDialogState;
  confirmLinkConflictSignIn: () => Promise<void>;
  cancelLinkConflictDialog: () => void;
  signInWithGoogle: () => Promise<void>;
  continueAsGuest: () => Promise<void>;
  linkGuestToGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  saveOnboardingStep: (
    nextStep: number,
    stepAnswers: Record<string, any>
  ) => Promise<{ ok: boolean; error?: string }>;
  completeOnboarding: (
    p: Partial<UserProfile>,
    s: Partial<SchedulePrefs>,
    stayOnSummaryScreen?: boolean
  ) => Promise<{ ok: boolean; error?: string }>;
  finishOnboardingSummary: () => void;
  updateProfileAndSchedule: (p: Partial<UserProfile>, s?: Partial<SchedulePrefs>) => Promise<void>;
  markTaskDone: (taskId: string) => Promise<void>;
  snoozeTask: (taskId: string) => Promise<void>;
  swapTaskMove: (taskId: string, easierOnly?: boolean) => Promise<void>;
  addWaterCup: () => Promise<void>;
  updateSteps: (steps: number) => Promise<void>;
  savePainCheckin: (
    scores: Record<string, number>,
    stiffness: 'Low' | 'Moderate' | 'High',
    energy: 'Low' | 'Steady' | 'Bright',
    notes?: string
  ) => Promise<void>;
  addWorkout: (w: CustomWorkout) => Promise<void>;
  removeWorkout: (id: string) => Promise<void>;
  deleteAccountData: () => Promise<void>;
}

const defaultSchedule: SchedulePrefs = {
  workStart: '09:30',
  workEnd: '18:00',
  workType: 'Desk / laptop',
  breakWindows: ['10:30', '13:30', '16:00', '17:30'],
  daysOff: [0, 6],
  remindersPerDay: 4,
  quietHours: { start: '21:30', end: '08:00' },
  equipment: ['Chair / Desk'],
  location: 'At desk',
};

const defaultStreaks: StreakData = {
  currentStreak: 0,
  bestStreak: 0,
  freezeTokens: 2,
  maxFreezes: 2,
  lastActiveDate: '',
  weeklyConsistency: {},
  badges: ['First Step'],
};

const AppContext = createContext<AppContextType | undefined>(undefined);

function mapFirebaseUserToAppUser(fbUser: FirebaseUser): AppUser {
  const hasGoogleProvider =
    Array.isArray(fbUser.providerData) &&
    fbUser.providerData.some((p) => p?.providerId === 'google.com');
  const isGuest = Boolean(fbUser.isAnonymous && !hasGoogleProvider);
  return {
    uid: fbUser.uid,
    email: fbUser.email,
    displayName: fbUser.displayName,
    photoURL: fbUser.photoURL,
    provider: isGuest ? 'anonymous' : 'google',
    isGuest,
  };
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authRestored, setAuthRestored] = useState(false);
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isShowingPlanReady, setIsShowingPlanReady] = useState(false);
  const [showWelcomeOverride, setShowWelcomeOverride] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'info' | 'error' | 'success' } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [schedule, setSchedule] = useState<SchedulePrefs>(defaultSchedule);
  const [todayPlan, setTodayPlan] = useState<DailyPlan | null>(null);
  const [sessions, setSessions] = useState<SessionLog[]>([]);
  const [painLogs, setPainLogs] = useState<PainLog[]>([]);
  const [streaks, setStreaks] = useState<StreakData>(defaultStreaks);
  const [workouts, setWorkouts] = useState<CustomWorkout[]>([]);
  const [activeTab, setActiveTab] = useState<'today' | 'plan' | 'care' | 'progress' | 'me'>('today');

  const [activeSession, setActiveSession] = useState<{
    title: string;
    moveIds: string[];
    taskId?: string;
    workout?: CustomWorkout;
  } | null>(null);
  const [lastCompletedLogId, setLastCompletedLogId] = useState<string | null>(null);
  const [showPostureCheck, setShowPostureCheck] = useState(false);
  const [showWorkoutBuilder, setShowWorkoutBuilder] = useState(false);
  const [activeWorkoutDetail, setActiveWorkoutDetail] = useState<CustomWorkout | null>(null);
  const [showPainCheckin, setShowPainCheckin] = useState(false);
  const [reportSheetState, setReportSheetState] = useState<{ open: boolean; defaultCategory?: ReportCategory }>({
    open: false,
  });
  const [linkConflictDialog, setLinkConflictDialog] = useState<LinkConflictDialogState>({
    open: false,
    guestUid: '',
    credential: null,
    isProcessing: false,
  });

  const isLinkingGuestRef = useRef(false);
  const activeUidRef = useRef<string | null>(null);

  // Live refs to prevent stale closures in timers or rapid sequential actions
  const userRef = useRef(user);
  userRef.current = user;
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const scheduleRef = useRef(schedule);
  scheduleRef.current = schedule;
  const todayPlanRef = useRef(todayPlan);
  todayPlanRef.current = todayPlan;
  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;
  const painLogsRef = useRef(painLogs);
  painLogsRef.current = painLogs;
  const streaksRef = useRef(streaks);
  streaksRef.current = streaks;
  const activeSessionRef = useRef(activeSession);
  activeSessionRef.current = activeSession;
  const lastCompletedLogIdRef = useRef(lastCompletedLogId);
  lastCompletedLogIdRef.current = lastCompletedLogId;
  const sessionCompletionAppliedRef = useRef<boolean>(false);

  const lastNotifiedSlotRef = useRef<string>('');
  const toastTimerRef = useRef<number | null>(null);

  const showToast = (text: string, type: 'info' | 'error' | 'success' = 'info') => {
    setToastMessage({ text, type });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  };

  const clearToast = () => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToastMessage(null);
  };

  /**
   * Requirement A.5: "Saved on this device, will sync later" may show ONLY if a Firestore write
   * actually failed or the device is offline, and never for a different account.
   */
  const handleCloudError = (msg: string) => {
    if (!userRef.current) return;
    if (msg.startsWith('Saved on this device') || !navigator.onLine) {
      showToast('Saved on this device, will sync later', 'info');
    } else {
      showToast('Saved on this device, will sync later', 'info');
    }
  };

  /**
   * Discards all in-memory state from any previous uid so nothing leaks across accounts.
   */
  const resetInMemoryStateForUidChange = (nextUid: string | null) => {
    activeUidRef.current = nextUid;
    profileRef.current = null;
    scheduleRef.current = defaultSchedule;
    todayPlanRef.current = null;
    sessionsRef.current = [];
    painLogsRef.current = [];
    streaksRef.current = defaultStreaks;
    activeSessionRef.current = null;
    lastCompletedLogIdRef.current = null;
    sessionCompletionAppliedRef.current = false;

    setProfile(null);
    setSchedule(defaultSchedule);
    setTodayPlan(null);
    setSessions([]);
    setPainLogs([]);
    setStreaks(defaultStreaks);
    setWorkouts([]);
    setActiveSession(null);
    setLastCompletedLogId(null);
    setProfileLoadError(null);
    setIsEditingProfile(false);
    setIsShowingPlanReady(false);
    clearToast();
  };

  /**
   * Guard against a missing or expired auth user:
   * Re-establishes the Google or guest session or falls back to local-only guest UID.
   */
  const resolveOrRestoreUser = (): AppUser => {
    if (userRef.current?.uid) {
      return userRef.current;
    }
    if (auth.currentUser?.uid) {
      const restored = mapFirebaseUserToAppUser(auth.currentUser);
      userRef.current = restored;
      setUser(restored);
      return restored;
    }
    let guestId = localStorage.getItem('hf_guest_uid') || profileRef.current?.uid || '';
    if (!guestId) {
      guestId = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      try {
        localStorage.setItem('hf_guest_uid', guestId);
      } catch {
        // ignore storage restrictions
      }
    }
    const fallbackUser: AppUser = {
      uid: guestId,
      displayName: profileRef.current?.name || '',
      provider: 'anonymous',
      isGuest: true,
    };
    userRef.current = fallbackUser;
    setUser(fallbackUser);
    return fallbackUser;
  };

  const openReportSheet = (defaultCategory: ReportCategory = 'Bug') => {
    setReportSheetState({ open: true, defaultCategory });
  };

  const closeReportSheet = () => {
    setReportSheetState({ open: false });
  };

  const sendProblemReport = async (category: ReportCategory, message: string) => {
    const activeU = resolveOrRestoreUser();
    const { syncedNow } = await submitProblemReport(activeU.uid, category, message);
    if (syncedNow) {
      showToast("Thanks, we've logged this.", 'success');
    } else {
      showToast('Saved on this device, will sync later', 'info');
    }
  };

  // Online / Offline listeners: retry queued writes automatically on reconnect and show a quiet "Synced" when done
  useEffect(() => {
    const handleOnline = async () => {
      setIsOffline(false);
      const currentU = userRef.current;
      if (currentU && auth.currentUser?.uid === currentU.uid) {
        const { syncedCount, failedCount } = await flushPendingSyncQueue(
          currentU.uid,
          handleCloudError
        );
        if (syncedCount > 0 && failedCount === 0) {
          showToast('Synced', 'success');
        }
      }
    };
    const handleOffline = () => {
      setIsOffline(true);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user]);

  // Local foreground notification scheduler respecting user's IANA timeZone
  useEffect(() => {
    if (!profile?.onboardingComplete || !schedule.breakWindows?.length) return;
    const interval = window.setInterval(() => {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      const tz = profile.timeZone;
      const hhmm = getCurrentHHMMInTimeZone(tz);
      const todayStr = getTodayDateString(tz);
      const slotKey = `${todayStr}-${hhmm}`;

      if (lastNotifiedSlotRef.current === slotKey) return;

      const qStart = schedule.quietHours?.start || '21:30';
      const qEnd = schedule.quietHours?.end || '08:00';
      const inQuietHours = qStart > qEnd ? hhmm >= qStart || hhmm < qEnd : hhmm >= qStart && hhmm < qEnd;
      if (inQuietHours) return;

      const nowDay = new Date().getDay();
      if (schedule.daysOff?.includes(nowDay)) return;

      if (schedule.breakWindows.includes(hhmm)) {
        lastNotifiedSlotRef.current = slotKey;
        const pendingTask = todayPlan?.tasks.find((t) => t.status === 'pending');
        const title = pendingTask ? `Time for: ${pendingTask.title}` : '2-Minute Movement Reset';
        const body = pendingTask
          ? `${pendingTask.subtitle} (${Math.round(pendingTask.durationSec / 60)} min)`
          : 'Unclench your shoulders, soften your jaw, and take 3 slow breaths.';
        try {
          new Notification(title, { body, icon: `${import.meta.env.BASE_URL}icon.svg` });
        } catch {
          // ignore if Notification constructor restricted on mobile browser
        }
      }
    }, 30000);
    return () => window.clearInterval(interval);
  }, [profile, schedule, todayPlan]);

  // Apply Dark / Light Theme
  useEffect(() => {
    const root = document.documentElement;
    const themePref = profile?.theme || (localStorage.getItem('hf_theme') as 'light' | 'dark' | 'system') || 'light';
    if (profile?.theme) {
      localStorage.setItem('hf_theme', profile.theme);
    }
    if (profile?.level) {
      localStorage.setItem('hf_user_pace', profile.level);
    }
    const isDark =
      themePref === 'dark' ||
      (themePref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [profile?.theme, profile?.level]);

  const hydrateCompletedUserToToday = async (
    uid: string,
    targetProfile: UserProfile,
    activeSchedule: SchedulePrefs,
    localPains: PainLog[],
    localSess: SessionLog[],
    initialStreaks: StreakData
  ) => {
    const tz = targetProfile.timeZone;
    const today = getTodayDateString(tz);
    const yesterday = addDaysToYYYYMMDD(today, -1);

    let updatedP: UserProfile = {
      ...targetProfile,
      uid,
      onboardingComplete: true,
    };

    if (initialStreaks.lastActiveDate && diffDaysBetween(initialStreaks.lastActiveDate, today) >= 3) {
      const gentleUntil = addDaysToYYYYMMDD(today, 3);
      if (!updatedP.gentleLoadUntilDate || updatedP.gentleLoadUntilDate < today) {
        updatedP = { ...updatedP, gentleLoadUntilDate: gentleUntil, updatedAt: Date.now() };
        saveProfile(uid, updatedP);
      }
    }

    profileRef.current = updatedP;
    setProfile(updatedP);
    setIsShowingPlanReady(false);
    setProfileLoadError(null);

    let plan = await getLocalDailyPlan(today, uid);
    const yesterdayPlan = await getLocalDailyPlan(yesterday, uid);
    const yesterdayMoves = (yesterdayPlan?.tasks || [])
      .map((t) => t.moveId)
      .filter(Boolean) as string[];

    if (!plan || (updatedP.planVersion && plan.planVersion !== updatedP.planVersion)) {
      const generated = generateDailyPlan(
        updatedP,
        activeSchedule,
        today,
        localPains[0] || null,
        yesterdayMoves
      );
      plan = mergeCompletedTasksIntoPlan(plan, generated);
      await saveDailyPlan(uid, plan, handleCloudError);
    }
    todayPlanRef.current = plan;
    setTodayPlan(plan);

    let activeStreaks = initialStreaks;
    const completedToday =
      (plan && (plan.completedCount > 0 || plan.tasks.some((t) => t.status === 'done'))) ||
      localSess.some((s) => s.date === today);
    if (
      completedToday &&
      (activeStreaks.lastActiveDate !== today || activeStreaks.currentStreak < 1)
    ) {
      activeStreaks = computeUpdatedStreak(activeStreaks, today);
      streaksRef.current = activeStreaks;
      setStreaks(activeStreaks);
      await saveStreaks(uid, activeStreaks);
    }
    return activeStreaks;
  };

  /**
   * Requirement B: ONE ROUTING FUNCTION
   * Runs after onAuthStateChanged (or explicit sign-in / guest start).
   * Discards any previous uid's in-memory state, loads only data for `uid`,
   * reads `users/{uid}` and `users/{uid}/meta/main` from `VITE_FIREBASE_DATABASE_ID`,
   * and routes deterministically:
   * - Doc exists and `onboardingComplete === true` -> Today
   * - Doc missing (new Google user) -> create `users/{uid}` with Google fields, go to Step 1 with first name prefilled and health answers empty
   * - Doc missing (new Guest user) -> create `users/{anonUid}` `{ isGuest: true, createdAt }`, go to Step 1
   * - Doc exists and `onboardingComplete` is not true -> resume at `users/{uid}.onboardingStep` with all saved answers prefilled
   * - Read error -> retry screen with real error; never fall into onboarding
   */
  const routeAndLoadUserForUid = async (appUser: AppUser) => {
    const { uid, isGuest } = appUser;

    if (activeUidRef.current !== uid) {
      resetInMemoryStateForUidChange(uid);
    }

    setLoading(true);
    setProfileLoadError(null);

    try {
      await ensureLocalDBHealthy();

      // Replay queued writes ONLY for this signed-in uid (Requirement A.3 & A.5)
      if (auth.currentUser && auth.currentUser.uid === uid && navigator.onLine) {
        const flushRes = await flushPendingSyncQueue(uid, handleCloudError);
        if (flushRes.syncedCount > 0 && flushRes.failedCount === 0) {
          showToast('Synced', 'success');
        }
      }

      let localP: UserProfile | null = null;
      let localS: SchedulePrefs | null = null;
      let localSess: SessionLog[] = [];
      let localPains: PainLog[] = [];
      let localSt: StreakData | null = null;
      let localW: CustomWorkout[] = [];

      try {
        [localP, localS, localSess, localPains, localSt, localW] = await Promise.all([
          getLocalProfile(uid),
          getLocalSchedule(uid),
          getLocalSessionLogs(uid),
          getLocalPainLogs(uid),
          getLocalStreaks(uid),
          getLocalWorkouts(uid),
        ]);
      } catch (localErr) {
        console.warn('[UnStill DB] Local cache read error, repairing cache and continuing with Firestore:', localErr);
        await repairLocalCacheDB();
      }

      if (activeUidRef.current !== uid) return;

      const activeSchedule = localS || defaultSchedule;
      scheduleRef.current = activeSchedule;
      setSchedule(activeSchedule);
      sessionsRef.current = localSess;
      setSessions(localSess);
      painLogsRef.current = localPains;
      setPainLogs(localPains);
      let activeStreaks = localSt || defaultStreaks;
      streaksRef.current = activeStreaks;
      setStreaks(activeStreaks);
      setWorkouts(localW);

      const hasCompletedCache = isOnboardingComplete(localP);

      // If no Firebase Auth session exists (e.g. offline local-only guest fallback), route from IndexedDB
      if (!auth.currentUser || auth.currentUser.uid !== uid) {
        if (hasCompletedCache && localP) {
          await hydrateCompletedUserToToday(
            uid,
            localP,
            activeSchedule,
            localPains,
            localSess,
            activeStreaks
          );
        } else if (localP) {
          const resumeStep = computeResumeOnboardingStep(localP);
          const partialLocal: UserProfile = {
            ...localP,
            uid,
            onboardingStep: resumeStep,
            onboardingComplete: false,
          };
          profileRef.current = partialLocal;
          setProfile(partialLocal);
          saveOnboardingStepForUid(uid, resumeStep);
        } else {
          const createdGuest = await createInitialUserDoc(uid, {
            isGuest: true,
            provider: 'anonymous',
          });
          profileRef.current = createdGuest;
          setProfile(createdGuest);
        }
        setLoading(false);
        setAuthRestored(true);
        return;
      }

      // Load users/{uid} and users/{uid}/meta/main from the named Firestore database
      const cloudRes = await fetchCloudProfileDetailed(uid);
      if (activeUidRef.current !== uid) return;

      if (cloudRes.status === 'found' && isOnboardingComplete(cloudRes.profile)) {
        // Flow d: Existing completed user -> go straight to Today
        const [cloudS, cloudSess, cloudPains, cloudSt, cloudW] = await Promise.all([
          fetchCloudSchedule(uid),
          fetchCloudSessionLogs(uid),
          fetchCloudPainLogs(uid),
          fetchCloudStreaks(uid),
          fetchCloudWorkouts(uid),
        ]);

        if (activeUidRef.current !== uid) return;

        const finalSchedule =
          cloudS ||
          extractScheduleFromUserDoc(cloudRes.profile as Record<string, any>, localS) ||
          localS ||
          defaultSchedule;
        scheduleRef.current = finalSchedule;
        setSchedule(finalSchedule);

        const mergedSess = cloudSess || localSess;
        const painById = new Map<string, PainLog>();
        for (const l of localPains || []) {
          if (l?.id) painById.set(l.id, l);
        }
        for (const l of cloudPains || []) {
          if (l?.id) painById.set(l.id, l);
        }
        const mergedPains = sortPainLogsNewestFirst(Array.from(painById.values()));
        sessionsRef.current = mergedSess;
        setSessions(mergedSess);
        painLogsRef.current = mergedPains;
        setPainLogs(mergedPains);
        if (cloudW) setWorkouts(cloudW);

        const finalProfile: UserProfile = {
          ...cloudRes.profile!,
          uid,
          isGuest: appUser.isGuest,
          provider: appUser.provider,
          onboardingComplete: true,
        };
        profileRef.current = finalProfile;
        setProfile(finalProfile);
        setIsShowingPlanReady(false);
        setProfileLoadError(null);
        clearOnboardingDraftForUid(uid);

        const userToday = getTodayDateString(finalProfile.timeZone);
        const localPlanToday = await getLocalDailyPlan(userToday, uid);
        const cloudPlanToday = await fetchCloudDailyPlan(uid, userToday);
        let plan = localPlanToday
          ? cloudPlanToday
            ? mergeCompletedTasksIntoPlan(localPlanToday, cloudPlanToday)
            : localPlanToday
          : cloudPlanToday;
        if (!plan) {
          plan = generateDailyPlan(
            finalProfile,
            finalSchedule,
            userToday,
            mergedPains[0] || null
          );
          await saveDailyPlan(uid, plan);
        }
        todayPlanRef.current = plan;
        setTodayPlan(plan);

        let resolvedStreaks = cloudSt || activeStreaks;
        const hasDoneToday =
          (plan && (plan.completedCount > 0 || plan.tasks.some((t) => t.status === 'done'))) ||
          mergedSess.some((s) => s.date === userToday);
        if (
          hasDoneToday &&
          (resolvedStreaks.lastActiveDate !== userToday || resolvedStreaks.currentStreak < 1)
        ) {
          resolvedStreaks = computeUpdatedStreak(resolvedStreaks, userToday);
          await saveStreaks(uid, resolvedStreaks);
        }
        streaksRef.current = resolvedStreaks;
        setStreaks(resolvedStreaks);
        setActiveTab('today');
      } else if (
        cloudRes.status === 'found' &&
        cloudRes.profile &&
        !isOnboardingComplete(cloudRes.profile)
      ) {
        if (hasCompletedCache && localP && isOnboardingComplete(localP)) {
          await saveProfile(uid, { ...localP, uid, onboardingComplete: true });
          await hydrateCompletedUserToToday(
            uid,
            localP,
            activeSchedule,
            localPains,
            localSess,
            activeStreaks
          );
        } else {
          // Doc exists in Firestore but onboardingComplete is not true:
          // Resume at users/{uid}.onboardingStep with all saved answers prefilled (name included)
          const cloudS = await fetchCloudSchedule(uid);
          const resumeStep = computeResumeOnboardingStep(cloudRes.profile);
          const firstNameFallback = !appUser.isGuest
            ? extractFirstNameFromDisplayName(appUser.displayName)
            : '';
          const partialProfile: UserProfile = {
            ...cloudRes.profile,
            uid,
            name: cloudRes.profile.name || firstNameFallback || '',
            email: cloudRes.profile.email || appUser.email || undefined,
            photoURL: cloudRes.profile.photoURL || appUser.photoURL || undefined,
            provider: appUser.provider,
            isGuest: appUser.isGuest,
            onboardingStep: resumeStep,
            onboardingComplete: false,
          };
          const partialSchedule =
            extractScheduleFromUserDoc(
              partialProfile as Record<string, any>,
              cloudS || localS
            ) ||
            cloudS ||
            localS ||
            defaultSchedule;
          profileRef.current = partialProfile;
          setProfile(partialProfile);
          scheduleRef.current = partialSchedule;
          setSchedule(partialSchedule);
          saveOnboardingStepForUid(uid, resumeStep);
          setProfileLoadError(null);
        }
      } else if (cloudRes.status === 'not_found') {
        if (hasCompletedCache && localP) {
          // Cached profile for THIS uid is complete -> sync up to Firestore and land on Today
          await saveProfile(uid, { ...localP, uid, onboardingComplete: true });
          await hydrateCompletedUserToToday(
            uid,
            localP,
            activeSchedule,
            localPains,
            localSess,
            activeStreaks
          );
        } else if (localP && computeResumeOnboardingStep(localP) > 1) {
          const resumeStep = computeResumeOnboardingStep(localP);
          const partialLocal: UserProfile = {
            ...localP,
            uid,
            onboardingStep: resumeStep,
            onboardingComplete: false,
          };
          profileRef.current = partialLocal;
          setProfile(partialLocal);
          saveOnboardingStepForUid(uid, resumeStep);
          setProfileLoadError(null);
        } else {
          // Doc missing in Firestore (Flow c: New Google user OR Flow a: New Guest user)
          // Create users/{uid} with Google fields (or Guest fields), prefill first name for Google,
          // leave every health answer empty, and go to onboarding Step 1.
          const newDoc = await createInitialUserDoc(uid, {
            isGuest: appUser.isGuest,
            provider: appUser.provider,
            displayName: appUser.displayName,
            email: appUser.email,
            photoURL: appUser.photoURL,
          });
          profileRef.current = newDoc;
          setProfile(newDoc);
          setProfileLoadError(null);
        }
      } else if (cloudRes.status === 'error') {
        console.error('read failed', cloudRes.error);
        if (hasCompletedCache && localP) {
          await hydrateCompletedUserToToday(
            uid,
            localP,
            activeSchedule,
            localPains,
            localSess,
            activeStreaks
          );
          setProfileLoadError(null);
        } else if (localP) {
          profileRef.current = localP;
          setProfile(localP);
          setProfileLoadError(null);
        } else {
          // Requirement B: Read error -> retry screen with the real error; never fall into onboarding
          profileRef.current = null;
          setProfile(null);
          setProfileLoadError(cloudRes.error || 'Could not load your saved plan from Firestore.');
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('read failed', msg);
      setProfileLoadError(msg);
    } finally {
      if (activeUidRef.current === uid) {
        setLoading(false);
        setAuthRestored(true);
      }
    }
  };

  const retryLoadProfile = async () => {
    const activeU = resolveOrRestoreUser();
    setProfileLoadError(null);
    await repairLocalCacheDB();
    await routeAndLoadUserForUid(activeU);
  };

  const startFreshOnboarding = () => {
    setProfileLoadError(null);
    profileRef.current = null;
    setProfile(null);
    setShowWelcomeOverride(false);
  };

  const returnToWelcomeFromOnboarding = () => {
    if (isEditingProfile) {
      setIsEditingProfile(false);
      setActiveTab('me');
      return;
    }
    setShowWelcomeOverride(true);
  };

  useEffect(() => {
    // Handle any pending redirect result from popup-blocked fallback
    getRedirectResult(auth)
      .then((res) => {
        if (res && res.user) {
          const linkedOrSignedIn = mapFirebaseUserToAppUser(res.user);
          if (!linkedOrSignedIn.isGuest) {
            localStorage.removeItem('hf_guest_uid');
          }
        }
      })
      .catch((err) => {
        if (err?.code === 'auth/credential-already-in-use') {
          const cred = GoogleAuthProvider.credentialFromError(err);
          const currentUid = auth.currentUser?.uid || userRef.current?.uid || '';
          setLinkConflictDialog({
            open: true,
            guestUid: currentUid,
            credential: cred,
            isProcessing: false,
          });
        }
      });

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (isLinkingGuestRef.current) {
        return;
      }
      if (fbUser) {
        const mapped = mapFirebaseUserToAppUser(fbUser);
        userRef.current = mapped;
        setUser(mapped);
        await routeAndLoadUserForUid(mapped);
      } else {
        const guestId = localStorage.getItem('hf_guest_uid');
        if (guestId) {
          const guestU: AppUser = {
            uid: guestId,
            displayName: '',
            provider: 'anonymous',
            isGuest: true,
          };
          userRef.current = guestU;
          setUser(guestU);
          await routeAndLoadUserForUid(guestU);
        } else {
          resetInMemoryStateForUidChange(null);
          userRef.current = null;
          setUser(null);
          setLoading(false);
          setAuthRestored(true);
        }
      }
    });
    return () => unsub();
  }, []);

  const signInWithGoogle = async () => {
    setShowWelcomeOverride(false);
    setProfileLoadError(null);

    try {
      setLoading(true);
      isLinkingGuestRef.current = true;
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      const res = await signInWithPopup(auth, googleProvider);
      localStorage.removeItem('hf_guest_uid');
      const mapped = mapFirebaseUserToAppUser(res.user);
      userRef.current = mapped;
      setUser(mapped);
      isLinkingGuestRef.current = false;
      await routeAndLoadUserForUid(mapped);
    } catch (e: any) {
      isLinkingGuestRef.current = false;
      setLoading(false);
      const rawErr = e instanceof Error ? e.message : String(e);
      console.warn('[UnStill Auth] Google sign-in error:', rawErr);
      recordWriteResult({
        status: 'error',
        operation: 'write',
        path: 'auth/signInWithGoogle',
        timestamp: Date.now(),
        error: rawErr,
      });
      if (e?.code === 'auth/popup-closed-by-user') {
        showToast("Sign-in window was closed. Tap 'Continue with Google' whenever you're ready.", 'info');
      } else if (e?.code === 'auth/popup-blocked') {
        showToast('Popup was blocked by your browser. Redirecting to Google sign-in...', 'info');
        try {
          await signInWithRedirect(auth, googleProvider);
        } catch (redirErr) {
          showToast(formatCloudError(redirErr), 'error');
        }
      } else {
        showToast(formatCloudError(e), 'error');
      }
    }
  };

  /**
   * Requirement D.a:
   * "Continue as guest" -> signInAnonymously -> create users/{anonUid} { isGuest: true, createdAt }
   * -> onboarding as now (saved step by step to Firestore) -> Today.
   */
  const continueAsGuest = async () => {
    setShowWelcomeOverride(false);
    setProfileLoadError(null);
    setLoading(true);

    try {
      isLinkingGuestRef.current = true;
      let fbUser = auth.currentUser;
      if (!fbUser || !fbUser.isAnonymous) {
        const cred = await signInAnonymously(auth);
        fbUser = cred.user;
      }
      const anonUid = fbUser.uid;
      localStorage.setItem('hf_guest_uid', anonUid);

      const guestU: AppUser = {
        uid: anonUid,
        displayName: '',
        provider: 'anonymous',
        isGuest: true,
      };
      userRef.current = guestU;
      setUser(guestU);
      isLinkingGuestRef.current = false;
      await routeAndLoadUserForUid(guestU);
    } catch (e) {
      isLinkingGuestRef.current = false;
      console.warn('[UnStill Auth] signInAnonymously fallback to local guest uid:', e);
      let guestId = localStorage.getItem('hf_guest_uid');
      if (!guestId) {
        guestId = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        localStorage.setItem('hf_guest_uid', guestId);
      }
      const guestU: AppUser = {
        uid: guestId,
        displayName: '',
        provider: 'anonymous',
        isGuest: true,
      };
      userRef.current = guestU;
      setUser(guestU);
      await routeAndLoadUserForUid(guestU);
    }
  };

  /**
   * Requirement D.b:
   * Guest taps "Link Google account" (Me banner and "Save my progress"):
   * use `linkWithPopup(auth.currentUser, googleProvider)` with `select_account`.
   * On success: keep the SAME uid, update `users/{uid}` with name/email/photoURL, set `isGuest: false`,
   * keep all data, toast "Your progress is now saved to your Google account".
   * If linking fails with `auth/credential-already-in-use`: show conflict dialog.
   */
  const linkGuestToGoogle = async () => {
    const currentU = resolveOrRestoreUser();
    const guestProfileSnapshot = profileRef.current;
    const guestScheduleSnapshot = scheduleRef.current;
    const guestStreaksSnapshot = streaksRef.current;
    const guestPlanSnapshot = todayPlanRef.current;
    const guestSessionsSnapshot = [...sessionsRef.current];
    const guestPainsSnapshot = [...painLogsRef.current];
    const guestWorkoutsSnapshot = [...workouts];

    try {
      isLinkingGuestRef.current = true;
      googleProvider.setCustomParameters({ prompt: 'select_account' });

      const activeFbUser = auth.currentUser;
      let linkedFbUser: FirebaseUser;
      if (activeFbUser && activeFbUser.isAnonymous) {
        const res = await linkWithPopup(activeFbUser, googleProvider);
        linkedFbUser = res.user;
      } else {
        const res = await signInWithPopup(auth, googleProvider);
        linkedFbUser = res.user;
      }

      const sameUid = linkedFbUser.uid;
      const googleFirstName = extractFirstNameFromDisplayName(linkedFbUser.displayName);
      const now = Date.now();

      const resolvedName =
        guestProfileSnapshot?.name &&
        guestProfileSnapshot.name.trim() !== '' &&
        guestProfileSnapshot.name !== 'Friend'
          ? guestProfileSnapshot.name
          : googleFirstName || linkedFbUser.displayName || 'Friend';

      if (guestProfileSnapshot) {
        const updatedProfile: UserProfile = {
          ...guestProfileSnapshot,
          uid: sameUid,
          name: resolvedName,
          email: linkedFbUser.email || undefined,
          photoURL: linkedFbUser.photoURL || undefined,
          provider: 'google',
          isGuest: false,
          onboardingComplete: true,
          updatedAt: now,
        };
        profileRef.current = updatedProfile;
        setProfile(updatedProfile);

        // Await root users/{uid} update directly so isGuest: false and provider: 'google' are immediately committed
        try {
          await setDoc(
            doc(firestoreDb, 'users', sameUid),
            {
              ...updatedProfile,
              ...guestScheduleSnapshot,
              uid: sameUid,
              name: resolvedName,
              email: linkedFbUser.email || '',
              photoURL: linkedFbUser.photoURL || '',
              provider: 'google',
              isGuest: false,
              onboardingComplete: true,
              updatedAt: now,
            },
            { merge: true }
          );
          recordWriteResult({
            status: 'success',
            operation: 'write',
            path: `users/${sameUid}`,
            timestamp: Date.now(),
            error: null,
          });
        } catch (err) {
          console.warn('[UnStill Auth] Queuing linked profile write:', err);
        }

        await saveProfile(sameUid, updatedProfile, handleCloudError);
        await saveSchedule(sameUid, guestScheduleSnapshot, handleCloudError);
        await saveStreaks(sameUid, guestStreaksSnapshot, handleCloudError);
        if (guestPlanSnapshot) await saveDailyPlan(sameUid, guestPlanSnapshot, handleCloudError);
        for (const s of guestSessionsSnapshot) await saveSessionLog(sameUid, s, handleCloudError);
        for (const p of guestPainsSnapshot) await savePainLog(sameUid, p, handleCloudError);
        for (const w of guestWorkoutsSnapshot) await saveCustomWorkout(sameUid, w, handleCloudError);
      }

      localStorage.removeItem('hf_guest_uid');

      const linkedUser: AppUser = {
        uid: sameUid,
        email: linkedFbUser.email,
        displayName: linkedFbUser.displayName,
        photoURL: linkedFbUser.photoURL,
        provider: 'google',
        isGuest: false,
      };
      activeUidRef.current = sameUid;
      userRef.current = linkedUser;
      setUser(linkedUser);
      isLinkingGuestRef.current = false;

      showToast('Your progress is now saved to your Google account', 'success');
    } catch (e: any) {
      isLinkingGuestRef.current = false;
      const rawErr = e instanceof Error ? e.message : String(e);
      console.warn('[UnStill Auth] Error linking guest account:', rawErr);
      recordWriteResult({
        status: 'error',
        operation: 'write',
        path: 'auth/linkGuestToGoogle',
        timestamp: Date.now(),
        error: rawErr,
      });
      if (
        e?.code === 'auth/credential-already-in-use' ||
        e?.code === 'auth/email-already-in-use'
      ) {
        const pendingCred = GoogleAuthProvider.credentialFromError(e);
        setLinkConflictDialog({
          open: true,
          guestUid: currentU.uid,
          credential: pendingCred,
          isProcessing: false,
        });
      } else if (e?.code === 'auth/popup-closed-by-user') {
        showToast("Sign-in window was closed. Tap again whenever you're ready.", 'info');
      } else if (e?.code === 'auth/popup-blocked') {
        showToast('Popup was blocked by your browser. Redirecting to Google...', 'info');
        if (auth.currentUser) {
          try {
            await linkWithRedirect(auth.currentUser, googleProvider);
          } catch (redirErr) {
            showToast(`Could not link Google account: ${formatCloudError(redirErr)}`, 'error');
          }
        }
      } else {
        showToast(formatCloudError(e), 'error');
      }
    }
  };

  /**
   * Conflict dialog confirmation handler (Requirement D.b):
   * 1. Exports guest progress on this device as a JSON file first
   * 2. Signs in to the existing Google account with the credential
   * 3. Routes by B
   */
  const confirmLinkConflictSignIn = async () => {
    const { guestUid, credential } = linkConflictDialog;
    setLinkConflictDialog((prev) => ({ ...prev, isProcessing: true }));

    try {
      if (guestUid) {
        await downloadUserDataAsJsonFile(guestUid, 'unstill-guest-progress');
      }

      isLinkingGuestRef.current = true;
      localStorage.removeItem('hf_guest_uid');

      let signedInUser: FirebaseUser;
      if (credential) {
        const res = await signInWithCredential(auth, credential);
        signedInUser = res.user;
      } else {
        googleProvider.setCustomParameters({ prompt: 'select_account' });
        const res = await signInWithPopup(auth, googleProvider);
        signedInUser = res.user;
      }

      setLinkConflictDialog({
        open: false,
        guestUid: '',
        credential: null,
        isProcessing: false,
      });

      const mapped = mapFirebaseUserToAppUser(signedInUser);
      userRef.current = mapped;
      setUser(mapped);
      isLinkingGuestRef.current = false;

      await routeAndLoadUserForUid(mapped);
    } catch (e: any) {
      isLinkingGuestRef.current = false;
      setLinkConflictDialog((prev) => ({ ...prev, isProcessing: false, open: false }));
      if (e?.code !== 'auth/popup-closed-by-user') {
        showToast(formatCloudError(e), 'error');
      }
    }
  };

  const cancelLinkConflictDialog = () => {
    setLinkConflictDialog({
      open: false,
      guestUid: '',
      credential: null,
      isProcessing: false,
    });
  };

  /**
   * Requirement A.2:
   * On sign out: stop listeners, flush pending writes for the current uid if online
   * (otherwise keep them under that uid's key), then clear in-memory state and the
   * cached profile/draft of that session, reset the router to the welcome screen.
   * After sign out, the welcome screen must show no name, email or draft.
   */
  const signOut = async () => {
    const currentUid = userRef.current?.uid || auth.currentUser?.uid || null;

    if (currentUid && auth.currentUser?.uid === currentUid && navigator.onLine) {
      try {
        await flushPendingSyncQueue(currentUid);
      } catch {
        // keep un-flushed tasks in syncQueue under currentUid
      }
    }

    await clearSessionCacheOnSignOut(currentUid);

    try {
      await fbSignOut(auth);
    } catch {
      // ignore sign-out network errors
    }

    resetInMemoryStateForUidChange(null);
    userRef.current = null;
    setUser(null);
    setShowWelcomeOverride(false);
    setActiveTab('today');
    setLoading(false);
    setAuthRestored(true);
  };

  const saveOnboardingStep = async (
    nextStep: number,
    stepAnswers: Record<string, any>
  ): Promise<{ ok: boolean; error?: string }> => {
    const activeU = resolveOrRestoreUser();
    const existingP = profileRef.current;
    const preserveCompleted = Boolean(isEditingProfile && existingP?.onboardingComplete === true);

    const res = await saveOnboardingStepProgress(
      activeU.uid,
      nextStep,
      {
        ...stepAnswers,
        email: activeU.email || existingP?.email,
        photoURL: activeU.photoURL || existingP?.photoURL,
        provider: activeU.provider,
        isGuest: activeU.isGuest,
        onboardingComplete: preserveCompleted,
      },
      activeU.isGuest
    );

    profileRef.current = res.profile;
    setProfile(res.profile);

    const updatedSched = extractScheduleFromUserDoc(
      res.profile as Record<string, any>,
      scheduleRef.current
    );
    if (updatedSched) {
      scheduleRef.current = updatedSched;
      setSchedule(updatedSched);
    }

    if (!res.ok && res.error) {
      showToast(res.error, 'error');
    }

    return { ok: res.ok, error: res.error };
  };

  const finishOnboardingSummary = () => {
    const activeU = userRef.current;
    clearOnboardingDraftForUid(activeU?.uid);
    setIsShowingPlanReady(false);
    setIsEditingProfile(false);
    setShowWelcomeOverride(false);
    setActiveTab('today');
  };

  const completeOnboarding = async (
    p: Partial<UserProfile>,
    s: Partial<SchedulePrefs>,
    stayOnSummaryScreen: boolean = false
  ): Promise<{ ok: boolean; error?: string }> => {
    const activeU = resolveOrRestoreUser();
    const existingP = profileRef.current;
    const now = Date.now();
    const nextPlanVersion = (existingP?.planVersion || 0) + 1;

    const fullSchedule: SchedulePrefs = {
      ...defaultSchedule,
      ...scheduleRef.current,
      ...s,
    };

    const fullProfile: UserProfile = {
      uid: activeU.uid,
      name: p.name || existingP?.name || 'Friend',
      email: activeU.email || existingP?.email,
      photoURL: activeU.photoURL || existingP?.photoURL,
      provider: activeU.provider,
      isGuest: activeU.isGuest,
      ageBand: p.ageBand || existingP?.ageBand || '',
      sex: p.sex ?? existingP?.sex ?? '',
      heightUnit: p.heightUnit || existingP?.heightUnit,
      timeZone:
        p.timeZone ||
        existingP?.timeZone ||
        Intl.DateTimeFormat().resolvedOptions().timeZone ||
        'Asia/Kolkata',
      habitType: p.habitType || existingP?.habitType || 'All of the above',
      sittingHoursPerDay: p.sittingHoursPerDay ?? existingP?.sittingHoursPerDay ?? 7,
      currentActiveDays: p.currentActiveDays ?? existingP?.currentActiveDays ?? 2,
      level: p.level || existingP?.level || 'Starter',
      goal: p.goal || existingP?.goal || 'Ease stiffness',
      conditions: p.conditions || existingP?.conditions || [],
      noneSelected: p.noneSelected ?? existingP?.noneSelected,
      painBaseline: p.painBaseline || existingP?.painBaseline || {},
      painDuration: p.painDuration || existingP?.painDuration || {},
      gettingWorse: p.gettingWorse || existingP?.gettingWorse || {},
      safetyFlags: p.safetyFlags || existingP?.safetyFlags || [],
      pregnantOrPostpartum: p.pregnantOrPostpartum ?? existingP?.pregnantOrPostpartum ?? false,
      doctorAdviceToAvoid: p.doctorAdviceToAvoid ?? existingP?.doctorAdviceToAvoid ?? false,
      recentSurgery: p.recentSurgery ?? existingP?.recentSurgery ?? false,
      cheerStyle: p.cheerStyle || existingP?.cheerStyle || 'Warm & celebratory',
      theme: p.theme || existingP?.theme || 'light',
      reducedMotion: p.reducedMotion ?? existingP?.reducedMotion ?? false,
      soundHaptics: p.soundHaptics ?? existingP?.soundHaptics ?? true,
      stepSource: p.stepSource || existingP?.stepSource || 'manual',
      stepGoal:
        p.stepGoal ||
        (p.level === 'Active' ? 8000 : p.level === 'Steady' ? 6500 : 4500),
      disabledMoves: p.disabledMoves || existingP?.disabledMoves || [],
      planVersion: nextPlanVersion,
      onboardingStep: 9,
      onboardingComplete: true,
      onboardingCompletedAt: now,
      consentGivenAt: existingP?.consentGivenAt || now,
      workStart: fullSchedule.workStart,
      workEnd: fullSchedule.workEnd,
      workType: fullSchedule.workType,
      breakWindows: fullSchedule.breakWindows,
      daysOff: fullSchedule.daysOff,
      remindersPerDay: fullSchedule.remindersPerDay,
      quietHours: fullSchedule.quietHours,
      equipment: fullSchedule.equipment,
      location: fullSchedule.location,
      createdAt: existingP?.createdAt || now,
      updatedAt: now,
    };

    const today = getTodayDateString(fullProfile.timeZone);
    const generatedPlan = generateDailyPlan(fullProfile, fullSchedule, today);
    const initialPlan = mergeCompletedTasksIntoPlan(todayPlanRef.current, generatedPlan);
    const nextStreaks = streaksRef.current?.lastActiveDate ? streaksRef.current : defaultStreaks;

    let initialPainLog: PainLog | null = null;
    if (Object.keys(fullProfile.painBaseline).length > 0 && painLogsRef.current.length === 0) {
      initialPainLog = {
        id: `pain-${now}`,
        date: today,
        timestamp: now,
        scores: fullProfile.painBaseline,
        stiffness: 'Moderate',
        energy: 'Steady',
        notes: 'Initial onboarding check-in',
      };
    }

    const metaMain = {
      planSummary: {
        whyThisPlan: buildWhyThisPlanText(fullProfile, fullSchedule),
        level: fullProfile.level,
        goal: fullProfile.goal,
        focusAreas: getConditionDisplayNames(fullProfile.conditions),
        remindersPerDay: fullSchedule.remindersPerDay,
        activeWindow: `${fullSchedule.workStart} – ${fullSchedule.workEnd}`,
        workType: fullSchedule.workType || 'Desk / laptop',
        location: fullSchedule.location,
        equipment: fullSchedule.equipment,
      },
      monthlyTheme: fullProfile.goal || 'Ease stiffness',
      weeklyRhythm: {
        workStart: fullSchedule.workStart,
        workEnd: fullSchedule.workEnd,
        workType: fullSchedule.workType || 'Desk / laptop',
        remindersPerDay: fullSchedule.remindersPerDay,
        daysOff: fullSchedule.daysOff,
        breakWindows: fullSchedule.breakWindows,
        level: fullProfile.level,
      },
      planVersion: nextPlanVersion,
      updatedAt: now,
    };

    const batchRes = await completeOnboardingBatch(
      activeU.uid,
      fullProfile,
      fullSchedule,
      metaMain,
      initialPlan,
      nextStreaks,
      initialPainLog,
      activeU.isGuest
    );

    scheduleRef.current = fullSchedule;
    todayPlanRef.current = initialPlan;
    streaksRef.current = nextStreaks;
    setSchedule(fullSchedule);
    setTodayPlan(initialPlan);
    setStreaks(nextStreaks);
    if (initialPainLog) {
      painLogsRef.current = [initialPainLog];
      setPainLogs([initialPainLog]);
    }

    if (!batchRes.ok) {
      profileRef.current = batchRes.profile;
      setProfile(batchRes.profile);
      const errText = batchRes.error || "Couldn't save.";
      showToast(errText, 'error');
      return { ok: false, error: errText };
    }

    if (stayOnSummaryScreen) {
      setIsShowingPlanReady(true);
    } else {
      setIsShowingPlanReady(false);
      setIsEditingProfile(false);
    }

    profileRef.current = batchRes.profile;
    setProfile(batchRes.profile);
    setShowWelcomeOverride(false);
    setProfileLoadError(null);
    if (!stayOnSummaryScreen) {
      clearOnboardingDraftForUid(activeU.uid);
      showToast(isOffline ? 'Saved on this device, will sync later' : 'Synced', 'success');
    }
    return { ok: true };
  };

  const updateProfileAndSchedule = async (p: Partial<UserProfile>, s?: Partial<SchedulePrefs>) => {
    const activeU = resolveOrRestoreUser();
    const currentProfile = profileRef.current;
    if (!currentProfile) return;

    const nextVersion = (currentProfile.planVersion || 1) + 1;
    const updatedP: UserProfile = {
      ...currentProfile,
      ...p,
      planVersion: nextVersion,
      updatedAt: Date.now(),
    };
    profileRef.current = updatedP;
    setProfile(updatedP);

    const updatedS: SchedulePrefs = s ? { ...scheduleRef.current, ...s } : scheduleRef.current;
    if (s) {
      scheduleRef.current = updatedS;
      setSchedule(updatedS);
    }

    const today = getTodayDateString(updatedP.timeZone);
    const generatedPlan = generateDailyPlan(updatedP, updatedS, today, painLogsRef.current[0] || null);
    const newPlan = mergeCompletedTasksIntoPlan(todayPlanRef.current, generatedPlan);
    todayPlanRef.current = newPlan;
    setTodayPlan(newPlan);

    await Promise.all([
      saveProfile(activeU.uid, updatedP, handleCloudError),
      s ? saveSchedule(activeU.uid, updatedS, handleCloudError) : Promise.resolve(),
      saveDailyPlan(activeU.uid, newPlan, handleCloudError),
    ]);
    if (!isOffline) {
      showToast('Synced', 'success');
    }
  };

  const recordStreakActivity = async (dateStr: string) => {
    const activeU = resolveOrRestoreUser();
    const nextStreaks = computeUpdatedStreak(streaksRef.current, dateStr);
    streaksRef.current = nextStreaks;
    setStreaks(nextStreaks);
    await saveStreaks(activeU.uid, nextStreaks, handleCloudError);
  };

  const markTaskDone = async (taskId: string) => {
    try {
      const activeU = resolveOrRestoreUser();
      const currentPlan = todayPlanRef.current;
      const tz = profileRef.current?.timeZone;
      const today = currentPlan?.date || getTodayDateString(tz);

      if (currentPlan) {
        const now = Date.now();
        let addedMin = 0;
        const updatedTasks: PlanTask[] = currentPlan.tasks.map((t) => {
          if (t.id === taskId && t.status !== 'done') {
            addedMin = Math.max(1, Math.round(t.durationSec / 60));
            return { ...t, status: 'done', completedAt: now };
          }
          return t;
        });
        const completedCount = updatedTasks.filter((t) => t.status === 'done').length;
        const updatedPlan: DailyPlan = {
          ...currentPlan,
          tasks: updatedTasks,
          completedCount,
          activeMinutes: currentPlan.activeMinutes + addedMin,
        };
        todayPlanRef.current = updatedPlan;
        setTodayPlan(updatedPlan);
        await saveDailyPlan(activeU.uid, updatedPlan, handleCloudError);
      }

      await recordStreakActivity(today);
    } catch (err) {
      console.error('[UnStill ResetComplete] Error in markTaskDone:', err);
      showToast('Could not save task completion locally.', 'error');
    }
  };

  const snoozeTask = async (taskId: string) => {
    const activeU = resolveOrRestoreUser();
    const currentPlan = todayPlanRef.current;
    if (!currentPlan) return;
    const updatedTasks: PlanTask[] = currentPlan.tasks.map((t) =>
      t.id === taskId ? { ...t, status: 'snoozed' } : t
    );
    const updatedPlan: DailyPlan = { ...currentPlan, tasks: updatedTasks };
    todayPlanRef.current = updatedPlan;
    setTodayPlan(updatedPlan);
    await saveDailyPlan(activeU.uid, updatedPlan, handleCloudError);
  };

  const swapTaskMove = async (taskId: string, easierOnly: boolean = false) => {
    const activeU = resolveOrRestoreUser();
    const currentPlan = todayPlanRef.current;
    const currentProfile = profileRef.current;
    if (!currentPlan || !currentProfile) return;
    const updatedTasks: PlanTask[] = currentPlan.tasks.map((t) => {
      if (t.id === taskId) {
        const sub = getSubstituteMove(t.moveId, currentProfile, easierOnly);
        return {
          ...t,
          title: `${t.timeWindow} ${sub.name}`,
          subtitle: `${easierOnly ? 'Gentler option · ' : ''}Safe for ${sub.targetAreas.join(' & ').toLowerCase()}`,
          moveId: sub.id,
          targetArea: sub.targetAreas[0],
        };
      }
      return t;
    });
    const updatedPlan: DailyPlan = { ...currentPlan, tasks: updatedTasks };
    todayPlanRef.current = updatedPlan;
    setTodayPlan(updatedPlan);
    await saveDailyPlan(activeU.uid, updatedPlan, handleCloudError);
  };

  const addWaterCup = async () => {
    const activeU = resolveOrRestoreUser();
    const currentPlan = todayPlanRef.current;
    if (!currentPlan) return;
    const updatedPlan: DailyPlan = {
      ...currentPlan,
      waterCups: Math.min(12, currentPlan.waterCups + 1),
    };
    todayPlanRef.current = updatedPlan;
    setTodayPlan(updatedPlan);
    await saveDailyPlan(activeU.uid, updatedPlan, handleCloudError);
  };

  const updateSteps = async (steps: number) => {
    const activeU = resolveOrRestoreUser();
    const currentPlan = todayPlanRef.current;
    if (!currentPlan) return;
    const updatedPlan: DailyPlan = {
      ...currentPlan,
      steps: Math.max(0, steps),
    };
    todayPlanRef.current = updatedPlan;
    setTodayPlan(updatedPlan);
    await saveDailyPlan(activeU.uid, updatedPlan, handleCloudError);
  };

  const startSession = (opts: { title: string; moveIds: string[]; taskId?: string; workout?: CustomWorkout }) => {
    sessionCompletionAppliedRef.current = false;
    lastCompletedLogIdRef.current = null;
    setLastCompletedLogId(null);
    activeSessionRef.current = opts;
    setActiveSession(opts);
  };

  const closeSession = () => {
    activeSessionRef.current = null;
    setActiveSession(null);
  };

  /**
   * Internal helper to apply session completion to state and IndexedDB immediately.
   * Safe against missing user, undefined taskId, or undefined sessionId.
   */
  const applySessionCompletionLocalFirst = async (
    durationSec: number,
    feedback?: 'easy' | 'good' | 'hard' | 'hurt' | 'none',
    hurtArea?: string,
    hurtMoveId?: string
  ): Promise<{ uid: string; log: SessionLog; today: string }> => {
    const activeU = resolveOrRestoreUser();
    const currentProfile = profileRef.current;
    const today = getTodayDateString(currentProfile?.timeZone);
    const currentSession = activeSessionRef.current;
    const safeDuration = Math.max(1, durationSec || 60);
    const addedMin = Math.max(1, Math.round(safeDuration / 60));
    const now = Date.now();

    // 1. Create or update SessionLog
    let log: SessionLog;
    const existingLogId = lastCompletedLogIdRef.current;
    const existingLog = existingLogId
      ? sessionsRef.current.find((s) => s.id === existingLogId)
      : undefined;

    if (existingLog) {
      log = {
        ...existingLog,
        ...(feedback ? { feedback } : {}),
        ...(hurtArea ? { hurtArea } : {}),
        ...(hurtMoveId ? { hurtMoveId } : {}),
      };
      const updatedList = sessionsRef.current.map((s) => (s.id === existingLog.id ? log : s));
      sessionsRef.current = updatedList;
      setSessions(updatedList);
    } else {
      const logId = existingLogId || `sess-${now}`;
      log = {
        id: logId,
        date: today,
        timestamp: now,
        title: currentSession?.title || 'Movement Reset',
        category: currentSession?.workout ? currentSession.workout.goal : 'Reset',
        durationSec: safeDuration,
        ...(feedback ? { feedback } : {}),
        ...(hurtArea ? { hurtArea } : {}),
        ...(hurtMoveId ? { hurtMoveId } : {}),
      };
      const nextSessions = [log, ...sessionsRef.current.filter((s) => s.id !== logId)];
      sessionsRef.current = nextSessions;
      setSessions(nextSessions);
      lastCompletedLogIdRef.current = logId;
      setLastCompletedLogId(logId);
    }

    // 2. Update today's plan (tick task & add activeMinutes if not yet applied for this session)
    let planToSave = todayPlanRef.current;
    if (!planToSave && currentProfile) {
      planToSave = generateDailyPlan(
        currentProfile,
        scheduleRef.current,
        today,
        painLogsRef.current[0] || null
      );
    }

    if (planToSave && !sessionCompletionAppliedRef.current) {
      const targetTaskId = currentSession?.taskId;
      const sessionMoveIds = currentSession?.moveIds || [];

      // Find matching task by taskId, or fallback to matching moveId, or first pending reset/posture/care task
      let matchedTaskId = targetTaskId;
      if (!matchedTaskId || !planToSave.tasks.some((t) => t.id === matchedTaskId)) {
        const byMove = planToSave.tasks.find(
          (t) => t.status !== 'done' && t.moveId && sessionMoveIds.includes(t.moveId)
        );
        const firstPending = planToSave.tasks.find((t) => t.status !== 'done');
        matchedTaskId = byMove?.id || firstPending?.id;
      }

      let taskIncrementedMin = 0;
      const updatedTasks: PlanTask[] = planToSave.tasks.map((t) => {
        if (matchedTaskId && t.id === matchedTaskId && t.status !== 'done') {
          taskIncrementedMin = Math.max(1, Math.round(t.durationSec / 60));
          return { ...t, status: 'done', completedAt: now };
        }
        return t;
      });

      const completedCount = updatedTasks.filter((t) => t.status === 'done').length;
      planToSave = {
        ...planToSave,
        tasks: updatedTasks,
        completedCount,
        activeMinutes: (planToSave.activeMinutes || 0) + (taskIncrementedMin || addedMin),
      };
      todayPlanRef.current = planToSave;
      setTodayPlan(planToSave);
    }

    // 3. Update streak immediately (0 Days -> 1 Day on first completion in user's timeZone)
    const nextStreaks = computeUpdatedStreak(streaksRef.current, today);
    streaksRef.current = nextStreaks;
    setStreaks(nextStreaks);

    sessionCompletionAppliedRef.current = true;

    // 4. Write to IndexedDB first (background Firestore sync is queued inside save* without blocking)
    await Promise.all([
      saveSessionLog(activeU.uid, log, handleCloudError),
      planToSave ? saveDailyPlan(activeU.uid, planToSave, handleCloudError) : Promise.resolve(),
      saveStreaks(activeU.uid, nextStreaks, handleCloudError),
    ]);

    return { uid: activeU.uid, log, today };
  };

  const completeSession = async (durationSec: number) => {
    try {
      await applySessionCompletionLocalFirst(durationSec);
    } catch (err) {
      console.error('[UnStill ResetComplete] Error in completeSession:', err);
      showToast('Could not save session locally, but your progress is updated in memory.', 'error');
    }
  };

  const submitSessionFeedback = async (
    feedback: 'easy' | 'good' | 'hard' | 'hurt' | 'none' = 'none',
    hurtArea?: string,
    hurtMoveId?: string
  ) => {
    const safeFeedback = feedback || 'none';
    const sessionSnapshot = activeSessionRef.current;

    try {
      const { uid, today } = await applySessionCompletionLocalFirst(
        60,
        safeFeedback,
        hurtArea,
        hurtMoveId
      );

      const currentProfile = profileRef.current;
      let updatedProfile: UserProfile | null = null;
      let updatedPlan: DailyPlan | null = todayPlanRef.current;

      // If user picked "Something hurt" ('hurt'), disable that move and switch to gentler alternative
      if (safeFeedback === 'hurt' && currentProfile) {
        const moveToDisable = hurtMoveId || sessionSnapshot?.moveIds?.[0];
        const currentDisabled = new Set(currentProfile.disabledMoves || []);
        if (moveToDisable) currentDisabled.add(moveToDisable);
        const updatedConditions = [...(currentProfile.conditions || [])];
        if (hurtArea && !updatedConditions.includes(hurtArea as ConditionId)) {
          updatedConditions.push(hurtArea as ConditionId);
        }
        const nextVersion = (currentProfile.planVersion || 1) + 1;
        updatedProfile = {
          ...currentProfile,
          disabledMoves: Array.from(currentDisabled),
          conditions: updatedConditions,
          planVersion: nextVersion,
          updatedAt: Date.now(),
        };
        profileRef.current = updatedProfile;
        setProfile(updatedProfile);

        const generated = generateDailyPlan(
          updatedProfile,
          scheduleRef.current,
          today,
          painLogsRef.current[0] || null
        );
        updatedPlan = mergeCompletedTasksIntoPlan(todayPlanRef.current, generated);
        todayPlanRef.current = updatedPlan;
        setTodayPlan(updatedPlan);
      } else if (safeFeedback === 'easy' && currentProfile && currentProfile.level !== 'Active') {
        const recentEasyCount = sessionsRef.current
          .slice(0, 8)
          .filter((s) => s.feedback === 'easy').length;
        if (recentEasyCount >= 5) {
          const nextLevel: Level = currentProfile.level === 'Starter' ? 'Steady' : 'Active';
          const nextVersion = (currentProfile.planVersion || 1) + 1;
          updatedProfile = {
            ...currentProfile,
            level: nextLevel,
            planVersion: nextVersion,
            updatedAt: Date.now(),
          };
          profileRef.current = updatedProfile;
          setProfile(updatedProfile);

          const generated = generateDailyPlan(
            updatedProfile,
            scheduleRef.current,
            today,
            painLogsRef.current[0] || null
          );
          updatedPlan = mergeCompletedTasksIntoPlan(todayPlanRef.current, generated);
          todayPlanRef.current = updatedPlan;
          setTodayPlan(updatedPlan);
        }
      } else if (safeFeedback === 'hard' && updatedPlan && currentProfile) {
        const pendingTask = updatedPlan.tasks.find((t) => t.status === 'pending');
        if (pendingTask) {
          const sub = getSubstituteMove(pendingTask.moveId, currentProfile, true);
          const easierTasks: PlanTask[] = updatedPlan.tasks.map((t) =>
            t.id === pendingTask.id
              ? {
                  ...t,
                  title: `${t.timeWindow} ${sub.name}`,
                  subtitle: `Gentler option · Safe for ${sub.targetAreas.join(' & ').toLowerCase()}`,
                  moveId: sub.id,
                  targetArea: sub.targetAreas[0],
                }
              : t
          );
          updatedPlan = { ...updatedPlan, tasks: easierTasks };
          todayPlanRef.current = updatedPlan;
          setTodayPlan(updatedPlan);
        }
      }

      // Persist any profile/plan adaptations to IndexedDB first
      await Promise.all([
        updatedProfile ? saveProfile(uid, updatedProfile, handleCloudError) : Promise.resolve(),
        updatedPlan ? saveDailyPlan(uid, updatedPlan, handleCloudError) : Promise.resolve(),
      ]);

      // Navigate back to Today immediately
      activeSessionRef.current = null;
      lastCompletedLogIdRef.current = null;
      sessionCompletionAppliedRef.current = false;
      setActiveSession(null);
      setLastCompletedLogId(null);
      setShowPostureCheck(false);
      setActiveWorkoutDetail(null);
      setActiveTab('today');

      if (safeFeedback === 'hurt') {
        showToast(
          'We removed that move for your safety and switched your plan to a gentler option.',
          'info'
        );
      } else if (!navigator.onLine) {
        showToast('Saved on this device, will sync later', 'info');
      }
    } catch (err) {
      console.error('[UnStill ResetComplete] Failed to save reset completion and feedback:', err);
      // Even if IndexedDB throws, navigate back so the user is never trapped on CompleteScreen
      activeSessionRef.current = null;
      lastCompletedLogIdRef.current = null;
      sessionCompletionAppliedRef.current = false;
      setActiveSession(null);
      setLastCompletedLogId(null);
      setShowPostureCheck(false);
      setActiveWorkoutDetail(null);
      setActiveTab('today');
      showToast('Could not save locally on this device, but your session was updated.', 'error');
    }
  };

  const savePainCheckin = async (
    scores: Record<string, number>,
    stiffness: 'Low' | 'Moderate' | 'High',
    energy: 'Low' | 'Steady' | 'Bright',
    notes?: string
  ) => {
    const activeU = resolveOrRestoreUser();
    const currentProfile = profileRef.current;
    if (!currentProfile) return;
    const today = getTodayDateString(currentProfile.timeZone);
    const now = Date.now();
    const prevMaxTs = painLogsRef.current.reduce(
      (max, l) => Math.max(max, typeof l.timestamp === 'number' ? l.timestamp : 0),
      0
    );
    const timestamp = Math.max(now, prevMaxTs + 1);
    const log: PainLog = {
      id: `pain-${timestamp}`,
      date: today,
      timestamp,
      scores,
      stiffness,
      energy,
      notes,
    };
    const nextPainLogs = sortPainLogsNewestFirst([
      log,
      ...painLogsRef.current.filter((l) => l.id !== log.id),
    ]);
    painLogsRef.current = nextPainLogs;
    setPainLogs(nextPainLogs);

    const nextVersion = (currentProfile.planVersion || 1) + 1;
    const updatedProfile: UserProfile = {
      ...currentProfile,
      painBaseline: { ...currentProfile.painBaseline, ...scores },
      planVersion: nextVersion,
      updatedAt: Date.now(),
    };
    profileRef.current = updatedProfile;
    setProfile(updatedProfile);

    const generatedPlan = generateDailyPlan(updatedProfile, scheduleRef.current, today, log);
    const adaptedPlan = mergeCompletedTasksIntoPlan(todayPlanRef.current, generatedPlan);
    todayPlanRef.current = adaptedPlan;
    setTodayPlan(adaptedPlan);
    setShowPainCheckin(false);

    showToast('Saving...', 'info');
    await Promise.all([
      savePainLog(activeU.uid, log, handleCloudError),
      saveProfile(activeU.uid, updatedProfile, handleCloudError),
      saveDailyPlan(activeU.uid, adaptedPlan, handleCloudError),
    ]);
    showToast('Comfort check saved — today’s plan updated.', 'success');
  };

  const addWorkout = async (w: CustomWorkout) => {
    if (!user) return;
    const saved = { ...w, isSaved: true };
    setWorkouts([saved, ...workouts.filter((item) => item.id !== w.id)]);
    await saveCustomWorkout(user.uid, saved, handleCloudError);
  };

  const removeWorkout = async (id: string) => {
    if (!user) return;
    setWorkouts(workouts.filter((w) => w.id !== id));
    await deleteCustomWorkout(user.uid, id, handleCloudError);
  };

  const deleteAccountData = async () => {
    if (!user) return;
    await clearAllUserData(user.uid);
    await signOut();
  };

  return (
    <AppContext.Provider
      value={{
        user,
        loading,
        authRestored,
        profileLoadError,
        retryLoadProfile,
        startFreshOnboarding,
        isEditingProfile,
        setIsEditingProfile,
        isShowingPlanReady,
        setIsShowingPlanReady,
        showWelcomeOverride,
        returnToWelcomeFromOnboarding,
        isOffline,
        toastMessage,
        clearToast,
        showToast,
        profile,
        schedule,
        todayPlan,
        sessions,
        painLogs,
        streaks,
        workouts,
        activeTab,
        setActiveTab,
        activeSession,
        startSession,
        closeSession,
        completeSession,
        submitSessionFeedback,
        showPostureCheck,
        setShowPostureCheck,
        showWorkoutBuilder,
        setShowWorkoutBuilder,
        activeWorkoutDetail,
        setActiveWorkoutDetail,
        showPainCheckin,
        setShowPainCheckin,
        reportSheetState,
        openReportSheet,
        closeReportSheet,
        sendProblemReport,
        linkConflictDialog,
        confirmLinkConflictSignIn,
        cancelLinkConflictDialog,
        signInWithGoogle,
        continueAsGuest,
        linkGuestToGoogle,
        signOut,
        saveOnboardingStep,
        completeOnboarding,
        finishOnboardingSummary,
        updateProfileAndSchedule,
        markTaskDone,
        snoozeTask,
        swapTaskMove,
        addWaterCup,
        updateSteps,
        savePainCheckin,
        addWorkout,
        removeWorkout,
        deleteAccountData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
};
