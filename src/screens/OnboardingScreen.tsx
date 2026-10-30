import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  GlassCard,
  PrimaryButton,
  Chip,
  GlowBackground,
  UnStillLogo,
  PrivacyPolicyContent,
} from '../components/ui';
import {
  ConditionId,
  Goal,
  Level,
  CheerStyle,
  HabitType,
  WorkType,
} from '../types';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ShieldAlert,
  Sparkles,
  Clock,
  Heart,
  Smile,
  Laptop,
  Dumbbell,
  User,
  Calendar,
  Search,
  X,
  RefreshCw,
} from 'lucide-react';
import { buildWhyThisPlanText, getConditionDisplayNames } from '../lib/planEngine';
import {
  computeResumeOnboardingStep,
  isOnboardingComplete,
  getOnboardingDraftForUid,
  saveOnboardingDraftForUid,
  getOnboardingStepForUid,
  saveOnboardingStepForUid,
  extractFirstNameFromDisplayName,
} from '../lib/db';

const CONDITION_OPTIONS: { id: ConditionId; label: string; desc: string }[] = [
  { id: 'neck_cs', label: 'Neck / cervical stiffness', desc: 'Chin-nod & gentle shoulder release' },
  { id: 'upper_back', label: 'Upper back & rounded shoulders', desc: 'Chest openers & posture resets' },
  { id: 'lower_back', label: 'Lower back tightness', desc: 'Hip hinges & gentle pelvic mobility' },
  { id: 'shoulder', label: 'Shoulder tension', desc: 'Blade squeezes & smooth range' },
  { id: 'wrist_hand', label: 'Wrist / hand / mouse fatigue', desc: 'Tendon glides & neutral wrist care' },
  { id: 'knee', label: 'Knee discomfort', desc: 'Chair-assisted & quad support' },
  { id: 'hip_glute', label: 'Hip / glute tightness', desc: 'Seated figure-4 & hip flexor release' },
  { id: 'ankle_foot', label: 'Ankle / foot stiffness', desc: 'Ankle circles & arch rolls' },
  { id: 'eye_strain', label: 'Eye strain / screen headaches', desc: '20-20-20 breaks & palming' },
  { id: 'stiff_sitting', label: 'Stiff from long sitting', desc: 'Micro-walks & circulation boosts' },
  { id: 'low_energy', label: 'Low energy / stress tension', desc: 'Box breathing & gentle wake-ups' },
];

const HABIT_TYPES: { id: HabitType; label: string; desc: string }[] = [
  { id: 'Move more', label: 'Move more during the day', desc: 'Break up long sitting blocks' },
  { id: 'Stretch & posture', label: 'Stretch & improve posture', desc: 'Relieve desk & screen tension' },
  { id: 'Short home workouts', label: 'Short home workouts', desc: '5–15 min gentle strength & mobility' },
  { id: 'Walk breaks', label: 'Walk breaks & steps', desc: 'Easy circulation & step goals' },
  { id: 'Calm breathing', label: 'Calm breathing & stress reset', desc: '2-minute nervous system resets' },
  { id: 'All of the above', label: 'All of the above', desc: 'Balanced daily movement flow' },
];

export const IANA_TIMEZONES: { id: string; label: string }[] = [
  { id: 'Asia/Kolkata', label: 'Asia/Kolkata (India, IST, UTC+05:30)' },
  { id: 'America/New_York', label: 'America/New_York (Eastern, UTC-05:00)' },
  { id: 'America/Chicago', label: 'America/Chicago (Central, UTC-06:00)' },
  { id: 'America/Denver', label: 'America/Denver (Mountain, UTC-07:00)' },
  { id: 'America/Los_Angeles', label: 'America/Los_Angeles (Pacific, UTC-08:00)' },
  { id: 'America/Toronto', label: 'America/Toronto (Canada Eastern)' },
  { id: 'America/Vancouver', label: 'America/Vancouver (Canada Pacific)' },
  { id: 'America/Sao_Paulo', label: 'America/Sao_Paulo (Brazil, UTC-03:00)' },
  { id: 'Europe/London', label: 'Europe/London (UK, GMT/BST)' },
  { id: 'Europe/Berlin', label: 'Europe/Berlin (Central Europe, CET)' },
  { id: 'Europe/Paris', label: 'Europe/Paris (France, CET)' },
  { id: 'Europe/Madrid', label: 'Europe/Madrid (Spain, CET)' },
  { id: 'Europe/Zurich', label: 'Europe/Zurich (Switzerland, CET)' },
  { id: 'Asia/Dubai', label: 'Asia/Dubai (UAE, GST, UTC+04:00)' },
  { id: 'Asia/Singapore', label: 'Asia/Singapore (SGT, UTC+08:00)' },
  { id: 'Asia/Tokyo', label: 'Asia/Tokyo (Japan, JST, UTC+09:00)' },
  { id: 'Asia/Seoul', label: 'Asia/Seoul (Korea, KST, UTC+09:00)' },
  { id: 'Asia/Hong_Kong', label: 'Asia/Hong_Kong (HKT, UTC+08:00)' },
  { id: 'Asia/Bangkok', label: 'Asia/Bangkok (ICT, UTC+07:00)' },
  { id: 'Australia/Sydney', label: 'Australia/Sydney (AEST, UTC+10:00)' },
  { id: 'Australia/Melbourne', label: 'Australia/Melbourne (AEST, UTC+10:00)' },
  { id: 'Pacific/Auckland', label: 'Pacific/Auckland (New Zealand, NZST)' },
  { id: 'UTC', label: 'UTC (Coordinated Universal Time)' },
];

interface OnboardingDraft {
  name?: string;
  ageBand?: string;
  sex?: string;
  timeZone?: string;
  habitType?: HabitType | null;
  sittingHours?: number | null;
  activeDays?: number | null;
  conditions?: ConditionId[];
  noneSelected?: boolean;
  painBaseline?: Record<string, number>;
  painDuration?: Record<string, string>;
  gettingWorse?: Record<string, boolean>;
  pregnantOrPostpartum?: boolean | null;
  doctorAdviceToAvoid?: boolean | null;
  recentSurgery?: boolean | null;
  redFlags?: string[];
  workStart?: string;
  workEnd?: string;
  workType?: WorkType | null;
  remindersPerDay?: number;
  daysOff?: number[];
  location?: string;
  equipment?: string[];
  level?: Level | null;
  goal?: Goal | null;
  cheerStyle?: CheerStyle | null;
  consentChecked?: boolean;
}

function loadOnboardingDraft(uid: string | undefined): OnboardingDraft | null {
  return getOnboardingDraftForUid<OnboardingDraft>(uid);
}

export const OnboardingScreen: React.FC = () => {
  const {
    user,
    profile,
    schedule,
    saveOnboardingStep,
    completeOnboarding,
    finishOnboardingSummary,
    returnToWelcomeFromOnboarding,
    signOut,
    isEditingProfile,
  } = useApp();

  const currentUid = user?.uid;
  const initialDraft = useMemo(() => loadOnboardingDraft(currentUid), [currentUid]);
  const hasSavedProfile = Boolean(profile && (!profile.uid || profile.uid === currentUid));
  const isCompletedProfile = isOnboardingComplete(profile);
  const googleFirstName = useMemo(
    () => (!user?.isGuest ? extractFirstNameFromDisplayName(user?.displayName) : ''),
    [user?.isGuest, user?.displayName]
  );

  const [step, setStep] = useState<number>(() => {
    if (isEditingProfile) return 1;
    if (profile && !isOnboardingComplete(profile)) {
      const resumeFromProfile = computeResumeOnboardingStep(profile);
      if (resumeFromProfile >= 1 && resumeFromProfile <= 8) {
        return resumeFromProfile;
      }
    }
    const parsed = getOnboardingStepForUid(currentUid) || 1;
    if (parsed >= 1 && parsed <= 8) {
      if (parsed === 1 && initialDraft) {
        const draftResume = computeResumeOnboardingStep({
          ...initialDraft,
          sittingHoursPerDay: initialDraft.sittingHours,
          currentActiveDays: initialDraft.activeDays,
        });
        if (draftResume > 1) return draftResume;
      }
      return parsed;
    }
    return 1;
  });

  const stepRef = React.useRef(step);
  stepRef.current = step;
  const resumedFromCloudRef = React.useRef<boolean>(false);
  const activeUidRef = React.useRef<string | undefined>(currentUid);

  const [isSavingStep, setIsSavingStep] = useState(false);
  const [showSavedTick, setShowSavedTick] = useState(false);
  const [isSavingFinalPlan, setIsSavingFinalPlan] = useState(false);
  const [finalSaveError, setFinalSaveError] = useState<string | null>(null);
  const savedTickTimerRef = React.useRef<number | null>(null);

  const triggerSavedTick = () => {
    setShowSavedTick(true);
    if (savedTickTimerRef.current) {
      window.clearTimeout(savedTickTimerRef.current);
    }
    savedTickTimerRef.current = window.setTimeout(() => {
      setShowSavedTick(false);
    }, 2600);
  };

  useEffect(() => {
    return () => {
      if (savedTickTimerRef.current) {
        window.clearTimeout(savedTickTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (currentUid) {
      saveOnboardingStepForUid(currentUid, step);
    }
  }, [currentUid, step]);

  // Step 1: About You — prefill from saved profile if present, else from uid draft, else Google first name (timezone defaults to Asia/Kolkata)
  const [name, setName] = useState<string>(() =>
    profile?.name || initialDraft?.name || googleFirstName || ''
  );
  const [ageBand, setAgeBand] = useState<string>(() =>
    profile?.ageBand || initialDraft?.ageBand || (isCompletedProfile ? '25–34' : '')
  );
  const [sex, setSex] = useState<string>(() =>
    profile?.sex ?? initialDraft?.sex ?? ''
  );
  const [timeZone, setTimeZone] = useState<string>(() =>
    profile?.timeZone || initialDraft?.timeZone || 'Asia/Kolkata'
  );
  const [tzQuery, setTzQuery] = useState('');
  const [tzDropdownOpen, setTzDropdownOpen] = useState(false);

  // Step 2: Habit & Current Activity
  const [habitType, setHabitType] = useState<HabitType | null>(() =>
    profile?.habitType || initialDraft?.habitType || (isCompletedProfile ? 'All of the above' : null)
  );
  const [sittingHours, setSittingHours] = useState<number | null>(() =>
    typeof profile?.sittingHoursPerDay === 'number'
      ? profile.sittingHoursPerDay
      : initialDraft?.sittingHours ?? (isCompletedProfile ? 7 : null)
  );
  const [activeDays, setActiveDays] = useState<number | null>(() =>
    typeof profile?.currentActiveDays === 'number'
      ? profile.currentActiveDays
      : initialDraft?.activeDays ?? (isCompletedProfile ? 2 : null)
  );

  // Step 3: Body & Comfort Check
  const [conditions, setConditions] = useState<ConditionId[]>(() =>
    Array.isArray(profile?.conditions) && profile.conditions.length > 0
      ? profile.conditions
      : initialDraft?.conditions ?? []
  );
  const [noneSelected, setNoneSelected] = useState<boolean>(() =>
    typeof profile?.noneSelected === 'boolean'
      ? profile.noneSelected
      : isCompletedProfile
      ? Boolean(profile && (!profile.conditions || profile.conditions.length === 0))
      : initialDraft?.noneSelected ?? false
  );
  const [painBaseline, setPainBaseline] = useState<Record<string, number>>(() =>
    profile?.painBaseline && Object.keys(profile.painBaseline).length > 0
      ? profile.painBaseline
      : initialDraft?.painBaseline ?? {}
  );
  const [painDuration, setPainDuration] = useState<Record<string, string>>(() =>
    profile?.painDuration && Object.keys(profile.painDuration).length > 0
      ? profile.painDuration
      : initialDraft?.painDuration ?? {}
  );
  const [gettingWorse, setGettingWorse] = useState<Record<string, boolean>>(() =>
    profile?.gettingWorse && Object.keys(profile.gettingWorse).length > 0
      ? profile.gettingWorse
      : initialDraft?.gettingWorse ?? {}
  );
  const [step3Attempted, setStep3Attempted] = useState(false);

  // Step 4: Health & Safety Check
  const [pregnantOrPostpartum, setPregnantOrPostpartum] = useState<boolean | null>(() =>
    typeof profile?.pregnantOrPostpartum === 'boolean'
      ? profile.pregnantOrPostpartum
      : initialDraft?.pregnantOrPostpartum ?? (isCompletedProfile ? false : null)
  );
  const [doctorAdviceToAvoid, setDoctorAdviceToAvoid] = useState<boolean | null>(() =>
    typeof profile?.doctorAdviceToAvoid === 'boolean'
      ? profile.doctorAdviceToAvoid
      : initialDraft?.doctorAdviceToAvoid ?? (isCompletedProfile ? false : null)
  );
  const [recentSurgery, setRecentSurgery] = useState<boolean | null>(() =>
    typeof profile?.recentSurgery === 'boolean'
      ? profile.recentSurgery
      : initialDraft?.recentSurgery ?? (isCompletedProfile ? false : null)
  );
  const [redFlags, setRedFlags] = useState<string[]>(() =>
    Array.isArray(profile?.safetyFlags) && profile.safetyFlags.length > 0
      ? profile.safetyFlags
      : initialDraft?.redFlags ?? []
  );

  // Step 5: Your Day & Schedule
  const [workStart, setWorkStart] = useState<string>(() =>
    profile?.workStart ||
    (isCompletedProfile ? schedule?.workStart : undefined) ||
    initialDraft?.workStart ||
    '09:30'
  );
  const [workEnd, setWorkEnd] = useState<string>(() =>
    profile?.workEnd ||
    (isCompletedProfile ? schedule?.workEnd : undefined) ||
    initialDraft?.workEnd ||
    '18:00'
  );
  const [workType, setWorkType] = useState<WorkType | null>(() =>
    profile?.workType ||
    (isCompletedProfile ? schedule?.workType || 'Desk / laptop' : undefined) ||
    initialDraft?.workType ||
    null
  );
  const [remindersPerDay, setRemindersPerDay] = useState<number>(() =>
    typeof profile?.remindersPerDay === 'number'
      ? profile.remindersPerDay
      : isCompletedProfile && typeof schedule?.remindersPerDay === 'number'
      ? schedule.remindersPerDay
      : initialDraft?.remindersPerDay ?? 4
  );
  const [daysOff, setDaysOff] = useState<number[]>(() =>
    Array.isArray(profile?.daysOff)
      ? profile.daysOff
      : isCompletedProfile && Array.isArray(schedule?.daysOff)
      ? schedule.daysOff
      : initialDraft?.daysOff ?? [0, 6]
  );

  // Step 6: Space & Equipment
  const [location, setLocation] = useState<string>(() =>
    profile?.location ||
    (isCompletedProfile ? schedule?.location || 'At desk' : '') ||
    initialDraft?.location ||
    ''
  );
  const [equipment, setEquipment] = useState<string[]>(() =>
    Array.isArray(profile?.equipment) && profile.equipment.length > 0
      ? profile.equipment
      : isCompletedProfile && schedule?.equipment?.length
      ? schedule.equipment
      : initialDraft?.equipment ?? []
  );
  const [level, setLevel] = useState<Level | null>(() =>
    profile?.level || initialDraft?.level || (isCompletedProfile ? 'Starter' : null)
  );

  // Step 7: Goals & Cheer Style
  const [goal, setGoal] = useState<Goal | null>(() =>
    profile?.goal || initialDraft?.goal || (isCompletedProfile ? 'Ease stiffness' : null)
  );
  const [cheerStyle, setCheerStyle] = useState<CheerStyle | null>(() =>
    profile?.cheerStyle ||
    initialDraft?.cheerStyle ||
    (isCompletedProfile ? 'Warm & celebratory' : null)
  );

  // Step 8: Consent
  const [consentChecked, setConsentChecked] = useState<boolean>(() =>
    Boolean(
      profile?.onboardingComplete ||
        profile?.consentGivenAt ||
        initialDraft?.consentChecked
    )
  );
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const hydrateFromSavedStateForCurrentUid = React.useCallback(() => {
    const uidDraft = loadOnboardingDraft(currentUid);
    const savedName = profile?.name || uidDraft?.name || googleFirstName || '';
    if (savedName) setName(savedName);
    if (profile?.ageBand || uidDraft?.ageBand) setAgeBand(profile?.ageBand || uidDraft?.ageBand || '');
    if (profile?.sex !== undefined && profile.sex !== '') setSex(profile.sex);
    else if (uidDraft?.sex) setSex(uidDraft.sex);
    if (profile?.timeZone || uidDraft?.timeZone) {
      setTimeZone(profile?.timeZone || uidDraft?.timeZone || 'Asia/Kolkata');
    }
    if (profile?.habitType || uidDraft?.habitType) {
      setHabitType(profile?.habitType || uidDraft?.habitType || null);
    }
    if (typeof profile?.sittingHoursPerDay === 'number') {
      setSittingHours(profile.sittingHoursPerDay);
    } else if (typeof uidDraft?.sittingHours === 'number') {
      setSittingHours(uidDraft.sittingHours);
    }
    if (typeof profile?.currentActiveDays === 'number') {
      setActiveDays(profile.currentActiveDays);
    } else if (typeof uidDraft?.activeDays === 'number') {
      setActiveDays(uidDraft.activeDays);
    }
    if (Array.isArray(profile?.conditions) && profile.conditions.length > 0) {
      setConditions(profile.conditions);
      setNoneSelected(false);
    } else if (profile?.noneSelected === true) {
      setConditions([]);
      setNoneSelected(true);
    } else if (Array.isArray(uidDraft?.conditions) && uidDraft.conditions.length > 0) {
      setConditions(uidDraft.conditions);
      setNoneSelected(false);
    } else if (uidDraft?.noneSelected === true) {
      setConditions([]);
      setNoneSelected(true);
    }
    if (profile?.painBaseline && Object.keys(profile.painBaseline).length > 0) {
      setPainBaseline(profile.painBaseline);
    } else if (uidDraft?.painBaseline && Object.keys(uidDraft.painBaseline).length > 0) {
      setPainBaseline(uidDraft.painBaseline);
    }
    if (profile?.painDuration && Object.keys(profile.painDuration).length > 0) {
      setPainDuration(profile.painDuration);
    } else if (uidDraft?.painDuration && Object.keys(uidDraft.painDuration).length > 0) {
      setPainDuration(uidDraft.painDuration);
    }
    if (profile?.gettingWorse && Object.keys(profile.gettingWorse).length > 0) {
      setGettingWorse(profile.gettingWorse);
    } else if (uidDraft?.gettingWorse && Object.keys(uidDraft.gettingWorse).length > 0) {
      setGettingWorse(uidDraft.gettingWorse);
    }
    if (typeof profile?.pregnantOrPostpartum === 'boolean') {
      setPregnantOrPostpartum(profile.pregnantOrPostpartum);
    } else if (typeof uidDraft?.pregnantOrPostpartum === 'boolean') {
      setPregnantOrPostpartum(uidDraft.pregnantOrPostpartum);
    }
    if (typeof profile?.doctorAdviceToAvoid === 'boolean') {
      setDoctorAdviceToAvoid(profile.doctorAdviceToAvoid);
    } else if (typeof uidDraft?.doctorAdviceToAvoid === 'boolean') {
      setDoctorAdviceToAvoid(uidDraft.doctorAdviceToAvoid);
    }
    if (typeof profile?.recentSurgery === 'boolean') {
      setRecentSurgery(profile.recentSurgery);
    } else if (typeof uidDraft?.recentSurgery === 'boolean') {
      setRecentSurgery(uidDraft.recentSurgery);
    }
    if (Array.isArray(profile?.safetyFlags) && profile.safetyFlags.length > 0) {
      setRedFlags(profile.safetyFlags);
    } else if (Array.isArray(uidDraft?.redFlags) && uidDraft.redFlags.length > 0) {
      setRedFlags(uidDraft.redFlags);
    }
    if (profile?.workStart || uidDraft?.workStart) {
      setWorkStart(profile?.workStart || uidDraft?.workStart || '09:30');
    }
    if (profile?.workEnd || uidDraft?.workEnd) {
      setWorkEnd(profile?.workEnd || uidDraft?.workEnd || '18:00');
    }
    if (profile?.workType || uidDraft?.workType) {
      setWorkType(profile?.workType || uidDraft?.workType || null);
    }
    if (typeof profile?.remindersPerDay === 'number') {
      setRemindersPerDay(profile.remindersPerDay);
    } else if (typeof uidDraft?.remindersPerDay === 'number') {
      setRemindersPerDay(uidDraft.remindersPerDay);
    }
    if (Array.isArray(profile?.daysOff)) {
      setDaysOff(profile.daysOff);
    } else if (Array.isArray(uidDraft?.daysOff)) {
      setDaysOff(uidDraft.daysOff);
    }
    if (profile?.location || uidDraft?.location) {
      setLocation(profile?.location || uidDraft?.location || '');
    }
    if (Array.isArray(profile?.equipment) && profile.equipment.length > 0) {
      setEquipment(profile.equipment);
    } else if (Array.isArray(uidDraft?.equipment) && uidDraft.equipment.length > 0) {
      setEquipment(uidDraft.equipment);
    }
    if (profile?.level || uidDraft?.level) {
      setLevel(profile?.level || uidDraft?.level || null);
    }
    if (profile?.goal || uidDraft?.goal) {
      setGoal(profile?.goal || uidDraft?.goal || null);
    }
    if (profile?.cheerStyle || uidDraft?.cheerStyle) {
      setCheerStyle(profile?.cheerStyle || uidDraft?.cheerStyle || null);
    }
  }, [currentUid, profile, googleFirstName]);

  // If currentUid changes while mounted, reset state cleanly for the new uid
  useEffect(() => {
    if (activeUidRef.current !== currentUid) {
      activeUidRef.current = currentUid;
      resumedFromCloudRef.current = false;
      const uidDraft = loadOnboardingDraft(currentUid);
      setName(profile?.name || uidDraft?.name || googleFirstName || '');
      setAgeBand(profile?.ageBand || uidDraft?.ageBand || '');
      setSex(profile?.sex ?? uidDraft?.sex ?? '');
      setTimeZone(profile?.timeZone || uidDraft?.timeZone || 'Asia/Kolkata');
      setHabitType(profile?.habitType || uidDraft?.habitType || null);
      setSittingHours(
        typeof profile?.sittingHoursPerDay === 'number'
          ? profile.sittingHoursPerDay
          : uidDraft?.sittingHours ?? null
      );
      setActiveDays(
        typeof profile?.currentActiveDays === 'number'
          ? profile.currentActiveDays
          : uidDraft?.activeDays ?? null
      );
      setConditions(
        Array.isArray(profile?.conditions) && profile.conditions.length > 0
          ? profile.conditions
          : uidDraft?.conditions ?? []
      );
      setNoneSelected(
        typeof profile?.noneSelected === 'boolean'
          ? profile.noneSelected
          : uidDraft?.noneSelected ?? false
      );
      setPainBaseline(profile?.painBaseline ?? uidDraft?.painBaseline ?? {});
      setPainDuration(profile?.painDuration ?? uidDraft?.painDuration ?? {});
      setGettingWorse(profile?.gettingWorse ?? uidDraft?.gettingWorse ?? {});
      setPregnantOrPostpartum(
        typeof profile?.pregnantOrPostpartum === 'boolean'
          ? profile.pregnantOrPostpartum
          : uidDraft?.pregnantOrPostpartum ?? null
      );
      setDoctorAdviceToAvoid(
        typeof profile?.doctorAdviceToAvoid === 'boolean'
          ? profile.doctorAdviceToAvoid
          : uidDraft?.doctorAdviceToAvoid ?? null
      );
      setRecentSurgery(
        typeof profile?.recentSurgery === 'boolean'
          ? profile.recentSurgery
          : uidDraft?.recentSurgery ?? null
      );
      setRedFlags(profile?.safetyFlags ?? uidDraft?.redFlags ?? []);
      setWorkStart(profile?.workStart || uidDraft?.workStart || '09:30');
      setWorkEnd(profile?.workEnd || uidDraft?.workEnd || '18:00');
      setWorkType(profile?.workType || uidDraft?.workType || null);
      setRemindersPerDay(
        typeof profile?.remindersPerDay === 'number'
          ? profile.remindersPerDay
          : uidDraft?.remindersPerDay ?? 4
      );
      setDaysOff(profile?.daysOff ?? uidDraft?.daysOff ?? [0, 6]);
      setLocation(profile?.location || uidDraft?.location || '');
      setEquipment(
        Array.isArray(profile?.equipment) && profile.equipment.length > 0
          ? profile.equipment
          : uidDraft?.equipment ?? []
      );
      setLevel(profile?.level || uidDraft?.level || null);
      setGoal(profile?.goal || uidDraft?.goal || null);
      setCheerStyle(profile?.cheerStyle || uidDraft?.cheerStyle || null);
      setConsentChecked(Boolean(profile?.onboardingComplete || profile?.consentGivenAt || uidDraft?.consentChecked));
    }
  }, [currentUid, profile, googleFirstName]);

  // Sync from profile if profile loads/updates while OnboardingScreen is mounted (e.g. partial Firestore doc or Me > Edit profile)
  useEffect(() => {
    if (!profile) {
      if (googleFirstName && !name) {
        setName(googleFirstName);
      }
      return;
    }
    if (profile.name) setName(profile.name);
    else if (googleFirstName && !name) setName(googleFirstName);
    if (profile.ageBand) setAgeBand(profile.ageBand);
    if (profile.sex !== undefined && profile.sex !== '') setSex(profile.sex);
    if (profile.timeZone) setTimeZone(profile.timeZone);
    if (profile.habitType) setHabitType(profile.habitType);
    if (typeof profile.sittingHoursPerDay === 'number') setSittingHours(profile.sittingHoursPerDay);
    if (typeof profile.currentActiveDays === 'number') setActiveDays(profile.currentActiveDays);
    if (Array.isArray(profile.conditions) && profile.conditions.length > 0) {
      setConditions(profile.conditions);
      setNoneSelected(false);
    } else if (profile.noneSelected === true) {
      setConditions([]);
      setNoneSelected(true);
    } else if (isOnboardingComplete(profile) && Array.isArray(profile.conditions) && profile.conditions.length === 0) {
      setNoneSelected(true);
    }
    if (profile.painBaseline && Object.keys(profile.painBaseline).length > 0) {
      setPainBaseline(profile.painBaseline);
    }
    if (profile.painDuration && Object.keys(profile.painDuration).length > 0) {
      setPainDuration(profile.painDuration);
    }
    if (profile.gettingWorse && Object.keys(profile.gettingWorse).length > 0) {
      setGettingWorse(profile.gettingWorse);
    }
    if (typeof profile.pregnantOrPostpartum === 'boolean') {
      setPregnantOrPostpartum(profile.pregnantOrPostpartum);
    }
    if (typeof profile.doctorAdviceToAvoid === 'boolean') {
      setDoctorAdviceToAvoid(profile.doctorAdviceToAvoid);
    }
    if (typeof profile.recentSurgery === 'boolean') {
      setRecentSurgery(profile.recentSurgery);
    }
    if (Array.isArray(profile.safetyFlags) && profile.safetyFlags.length > 0) {
      setRedFlags(profile.safetyFlags);
    }
    if (profile.workStart) setWorkStart(profile.workStart);
    else if (isOnboardingComplete(profile) && schedule?.workStart) setWorkStart(schedule.workStart);
    if (profile.workEnd) setWorkEnd(profile.workEnd);
    else if (isOnboardingComplete(profile) && schedule?.workEnd) setWorkEnd(schedule.workEnd);
    if (profile.workType) setWorkType(profile.workType);
    else if (isOnboardingComplete(profile) && schedule?.workType) setWorkType(schedule.workType);
    if (typeof profile.remindersPerDay === 'number') setRemindersPerDay(profile.remindersPerDay);
    else if (isOnboardingComplete(profile) && typeof schedule?.remindersPerDay === 'number') {
      setRemindersPerDay(schedule.remindersPerDay);
    }
    if (Array.isArray(profile.daysOff)) setDaysOff(profile.daysOff);
    else if (isOnboardingComplete(profile) && Array.isArray(schedule?.daysOff)) {
      setDaysOff(schedule.daysOff);
    }
    if (profile.location) setLocation(profile.location);
    else if (isOnboardingComplete(profile) && schedule?.location) setLocation(schedule.location);
    if (Array.isArray(profile.equipment) && profile.equipment.length > 0) {
      setEquipment(profile.equipment);
    } else if (
      isOnboardingComplete(profile) &&
      Array.isArray(schedule?.equipment) &&
      schedule.equipment.length > 0
    ) {
      setEquipment(schedule.equipment);
    }
    if (profile.level) setLevel(profile.level);
    if (profile.goal) setGoal(profile.goal);
    if (profile.cheerStyle) setCheerStyle(profile.cheerStyle);
    if (profile.onboardingComplete || profile.consentGivenAt) setConsentChecked(true);

    // If resuming an incomplete profile from Firestore/IndexedDB, jump to userDoc.onboardingStep (or first unanswered step)
    if (!isEditingProfile && !isOnboardingComplete(profile) && !resumedFromCloudRef.current) {
      const targetStep = computeResumeOnboardingStep(profile);
      resumedFromCloudRef.current = true;
      if (targetStep > 1 && targetStep <= 8 && stepRef.current === 1) {
        stepRef.current = targetStep;
        setStep(targetStep);
      }
    }
  }, [profile, schedule, isEditingProfile, googleFirstName]);

  // Persist answers under the current uid while going back and forward
  useEffect(() => {
    if (!currentUid) return;
    const draft: OnboardingDraft = {
      name,
      ageBand,
      sex,
      timeZone,
      habitType,
      sittingHours,
      activeDays,
      conditions,
      noneSelected,
      painBaseline,
      painDuration,
      gettingWorse,
      pregnantOrPostpartum,
      doctorAdviceToAvoid,
      recentSurgery,
      redFlags,
      workStart,
      workEnd,
      workType,
      remindersPerDay,
      daysOff,
      location,
      equipment,
      level,
      goal,
      cheerStyle,
      consentChecked,
    };
    saveOnboardingDraftForUid(currentUid, draft);
  }, [
    currentUid,
    name,
    ageBand,
    sex,
    timeZone,
    habitType,
    sittingHours,
    activeDays,
    conditions,
    noneSelected,
    painBaseline,
    painDuration,
    gettingWorse,
    pregnantOrPostpartum,
    doctorAdviceToAvoid,
    recentSurgery,
    redFlags,
    workStart,
    workEnd,
    workType,
    remindersPerDay,
    daysOff,
    location,
    equipment,
    level,
    goal,
    cheerStyle,
    consentChecked,
  ]);

  // Browser / phone back gesture support: Back moves one step, not out of the app
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.history.pushState({ unstillOnboardingStep: stepRef.current }, '');
    } catch {
      // ignore in restricted environments
    }

    const handlePopState = () => {
      if (stepRef.current > 1) {
        const prevStep = stepRef.current - 1;
        hydrateFromSavedStateForCurrentUid();
        stepRef.current = prevStep;
        setStep(prevStep);
        try {
          window.history.pushState({ unstillOnboardingStep: prevStep }, '');
        } catch {}
      } else {
        returnToWelcomeFromOnboarding();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [hydrateFromSavedStateForCurrentUid]);

  const advanceToStep = (nextStep: number) => {
    const clamped = Math.min(9, Math.max(1, nextStep));
    stepRef.current = clamped;
    setStep(clamped);
    try {
      window.history.pushState({ unstillOnboardingStep: clamped }, '');
    } catch {}
  };

  const handleBackStep = () => {
    if (step > 1) {
      const prevStep = step - 1;
      hydrateFromSavedStateForCurrentUid();
      stepRef.current = prevStep;
      setStep(prevStep);
    } else {
      returnToWelcomeFromOnboarding();
    }
  };

  const filteredTimezones = useMemo(() => {
    const q = tzQuery.trim().toLowerCase();
    if (!q) return IANA_TIMEZONES;
    return IANA_TIMEZONES.filter(
      (tz) => tz.id.toLowerCase().includes(q) || tz.label.toLowerCase().includes(q)
    );
  }, [tzQuery]);

  const toggleCondition = (id: ConditionId) => {
    setNoneSelected(false);
    if (conditions.includes(id)) {
      setConditions(conditions.filter((c) => c !== id));
      const nextB = { ...painBaseline };
      const nextD = { ...painDuration };
      const nextW = { ...gettingWorse };
      delete nextB[id];
      delete nextD[id];
      delete nextW[id];
      setPainBaseline(nextB);
      setPainDuration(nextD);
      setGettingWorse(nextW);
    } else {
      setConditions([...conditions, id]);
    }
  };

  const selectNoneCondition = () => {
    setNoneSelected(true);
    setConditions([]);
    setPainBaseline({});
    setPainDuration({});
    setGettingWorse({});
  };

  const toggleDayOff = (day: number) => {
    if (daysOff.includes(day)) {
      setDaysOff(daysOff.filter((d) => d !== day));
    } else {
      setDaysOff([...daysOff, day]);
    }
  };

  const toggleEquipment = (item: string) => {
    if (equipment.includes(item)) {
      setEquipment(equipment.filter((e) => e !== item));
    } else {
      setEquipment([...equipment, item]);
    }
  };

  const toggleRedFlag = (flag: string) => {
    if (redFlags.includes(flag)) {
      setRedFlags(redFlags.filter((f) => f !== flag));
    } else {
      setRedFlags([...redFlags, flag]);
    }
  };

  // Validate Step 3: Either "None" is selected, OR at least 1 condition is selected and EVERY selected condition has a rating (0-10), duration, and gettingWorse (true/false)
  const isConditionComplete = (cId: ConditionId) => {
    return (
      typeof painBaseline[cId] === 'number' &&
      Boolean(painDuration[cId]) &&
      typeof gettingWorse[cId] === 'boolean'
    );
  };

  const step3Valid =
    noneSelected || (conditions.length > 0 && conditions.every((cId) => isConditionComplete(cId)));

  const canProceedCurrentStep = (): boolean => {
    switch (step) {
      case 1:
        return Boolean(ageBand && timeZone);
      case 2:
        return Boolean(habitType && sittingHours !== null && activeDays !== null);
      case 3:
        return step3Valid;
      case 4:
        return (
          pregnantOrPostpartum !== null &&
          doctorAdviceToAvoid !== null &&
          recentSurgery !== null
        );
      case 5:
        return Boolean(workStart && workEnd && workType);
      case 6:
        return Boolean(location && equipment.length > 0 && level);
      case 7:
        return Boolean(goal && cheerStyle);
      case 8:
        return consentChecked;
      default:
        return true;
    }
  };

  const computeBreakWindows = (count: number): string[] => {
    if (count <= 2) return ['11:00', '15:30'];
    if (count === 3) return ['10:45', '14:00', '16:45'];
    if (count === 4) return ['10:30', '13:15', '15:30', '17:30'];
    return ['10:00', '12:00', '14:00', '16:00', '17:45'];
  };

  const buildStepAnswersPayload = (currentStep: number): Record<string, any> => {
    const base: Record<string, any> = {
      name: name.trim() || 'Friend',
      ageBand,
      sex,
      timeZone,
      ...(profile?.heightUnit ? { heightUnit: profile.heightUnit } : {}),
    };

    if (currentStep >= 2 || habitType) {
      base.habitType = habitType || undefined;
      if (sittingHours !== null) base.sittingHoursPerDay = sittingHours;
      if (activeDays !== null) {
        base.currentActiveDays = activeDays;
        base.stepGoal = Math.max(3000, activeDays * 700 + 2500);
      }
    }

    if (currentStep >= 3 || noneSelected || conditions.length > 0) {
      base.conditions = noneSelected ? [] : conditions;
      base.noneSelected = noneSelected;
      base.painBaseline = painBaseline;
      base.painDuration = painDuration;
      base.gettingWorse = gettingWorse;
    }

    if (
      currentStep >= 4 ||
      (pregnantOrPostpartum !== null &&
        doctorAdviceToAvoid !== null &&
        recentSurgery !== null)
    ) {
      if (pregnantOrPostpartum !== null) base.pregnantOrPostpartum = pregnantOrPostpartum;
      if (doctorAdviceToAvoid !== null) base.doctorAdviceToAvoid = doctorAdviceToAvoid;
      if (recentSurgery !== null) base.recentSurgery = recentSurgery;
      base.safetyFlags = redFlags;
    }

    if (currentStep >= 5 || workType) {
      base.workStart = workStart;
      base.workEnd = workEnd;
      if (workType) base.workType = workType;
      base.remindersPerDay = remindersPerDay;
      base.daysOff = daysOff;
      base.breakWindows = computeBreakWindows(remindersPerDay);
      base.quietHours = { start: '21:30', end: '08:00' };
    }

    if (currentStep >= 6 || (location && equipment.length > 0 && level)) {
      if (location) base.location = location;
      if (equipment.length > 0) base.equipment = equipment;
      if (level) base.level = level;
    }

    if (currentStep >= 7 || (goal && cheerStyle)) {
      if (goal) base.goal = goal;
      if (cheerStyle) base.cheerStyle = cheerStyle;
    }

    return base;
  };

  const notifyOnboardingStepSavedAndAdvanced = (nextStep: number) => {
    try {
      const activeEl = document?.activeElement as HTMLElement | null;
      if (activeEl && typeof activeEl.blur === 'function') {
        activeEl.blur();
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('unstill:onboarding-step-saved', { detail: { nextStep } })
        );
      }
    } catch {
      // ignore in headless/restricted environments
    }
  };

  const handleContinueStep = async () => {
    if (step === 3 && !step3Valid) {
      setStep3Attempted(true);
      return;
    }
    if (!canProceedCurrentStep() || isSavingStep) return;

    const nextStep = step + 1;
    setIsSavingStep(true);
    let advanced = false;

    const maxDisableTimer = window.setTimeout(() => {
      setIsSavingStep(false);
      if (!advanced) {
        advanced = true;
        triggerSavedTick();
        advanceToStep(nextStep);
        notifyOnboardingStepSavedAndAdvanced(nextStep);
      }
    }, 3000);

    try {
      const stepAnswers = buildStepAnswersPayload(step);
      await Promise.race([
        saveOnboardingStep(nextStep, stepAnswers),
        new Promise<{ ok: boolean }>((resolve) =>
          window.setTimeout(() => resolve({ ok: true }), 2000)
        ),
      ]);
      if (!advanced) {
        advanced = true;
        triggerSavedTick();
        advanceToStep(nextStep);
        notifyOnboardingStepSavedAndAdvanced(nextStep);
      }
    } catch {
      if (!advanced) {
        advanced = true;
        triggerSavedTick();
        advanceToStep(nextStep);
        notifyOnboardingStepSavedAndAdvanced(nextStep);
      }
    } finally {
      window.clearTimeout(maxDisableTimer);
      setIsSavingStep(false);
    }
  };

  const handleBuildPlanAndSave = async () => {
    if (!consentChecked || isSavingFinalPlan) return;
    setIsSavingFinalPlan(true);
    setFinalSaveError(null);
    let advanced = false;

    const maxDisableTimer = window.setTimeout(() => {
      setIsSavingFinalPlan(false);
      if (!advanced) {
        advanced = true;
        triggerSavedTick();
        advanceToStep(9);
      }
    }, 3000);

    try {
      await Promise.race([
        completeOnboarding(
          {
            name: name.trim() || 'Friend',
            ageBand,
            sex,
            ...(profile?.heightUnit ? { heightUnit: profile.heightUnit } : {}),
            timeZone,
            habitType: habitType || 'All of the above',
            sittingHoursPerDay: sittingHours ?? 7,
            currentActiveDays: activeDays ?? 2,
            level: level || 'Starter',
            goal: goal || 'Ease stiffness',
            conditions: noneSelected ? [] : conditions,
            noneSelected,
            painBaseline,
            painDuration,
            gettingWorse,
            safetyFlags: redFlags,
            pregnantOrPostpartum: Boolean(pregnantOrPostpartum),
            doctorAdviceToAvoid: Boolean(doctorAdviceToAvoid),
            recentSurgery: Boolean(recentSurgery),
            cheerStyle: cheerStyle || 'Warm & celebratory',
          },
          {
            workStart,
            workEnd,
            workType: workType || 'Desk / laptop',
            remindersPerDay,
            daysOff,
            location: location || 'At desk',
            equipment: equipment.length > 0 ? equipment : ['Chair / Desk'],
            breakWindows: computeBreakWindows(remindersPerDay),
          },
          true
        ),
        new Promise<{ ok: boolean }>((resolve) =>
          window.setTimeout(() => resolve({ ok: true }), 2000)
        ),
      ]);

      if (!advanced) {
        advanced = true;
        triggerSavedTick();
        advanceToStep(9);
      }
    } catch {
      if (!advanced) {
        advanced = true;
        triggerSavedTick();
        advanceToStep(9);
      }
    } finally {
      window.clearTimeout(maxDisableTimer);
      setIsSavingFinalPlan(false);
    }
  };

  const handleFinish = async () => {
    finishOnboardingSummary();
  };

  const totalSteps = 8;

  const previewProfile = {
    uid: 'preview',
    level: level || 'Starter',
    goal: goal || 'Ease stiffness',
    conditions,
    painBaseline,
    safetyFlags: redFlags,
    cheerStyle: cheerStyle || 'Warm & celebratory',
    theme: 'light' as const,
    reducedMotion: false,
    soundHaptics: true,
    onboardingComplete: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const previewSchedule = {
    workStart,
    workEnd,
    workType: workType || 'Desk / laptop',
    breakWindows: [],
    daysOff,
    remindersPerDay,
    quietHours: { start: '21:30', end: '08:00' },
    equipment: equipment.length > 0 ? equipment : ['Chair / Desk'],
    location: location || 'At desk',
  };

  const content = (
    <div className="min-h-dvh flex flex-col justify-between p-5 max-w-[430px] mx-auto">
      {/* Progress Header with Back arrow on EVERY step (1 through 9) */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleBackStep}
              aria-label="Back"
              className="w-10 h-10 rounded-2xl bg-white/80 dark:bg-[#162636] flex items-center justify-center text-[var(--text)] shadow-sm"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            {step === 1 && (
              <div className="flex items-center gap-2">
                <UnStillLogo size={32} />
                <span className="font-display font-extrabold text-xs uppercase tracking-[0.16em] text-[var(--text)]">
                  UNSTILL
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-soft)]">
              {step <= totalSteps ? `Step ${step} of ${totalSteps}` : 'Summary'}
            </span>
            {showSavedTick && (
              <span
                role="status"
                aria-live="polite"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 animate-in fade-in duration-150"
              >
                <Check className="w-3.5 h-3.5" /> Saved
              </span>
            )}
          </div>

          <div className="min-w-[40px] flex justify-end">
            {step === 1 ? (
              <button
                type="button"
                onClick={signOut}
                className="text-xs font-semibold text-[var(--text-soft)] hover:text-[var(--text)] underline"
              >
                Sign out
              </button>
            ) : (
              <div className="w-10" />
            )}
          </div>
        </div>

        {step <= totalSteps && (
          <div className="w-full h-2 bg-white/85 dark:bg-white/15 rounded-full overflow-hidden">
            <div
              className="h-full mint-gradient transition-all duration-300 rounded-full"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Step Body */}
      <div className="my-5 flex-1 flex flex-col justify-center">
        {step === 1 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/15 text-[#0A5C80] dark:text-[#7CD6FF] text-xs font-bold mb-2">
                <User className="w-3.5 h-3.5" /> About You
              </div>
              <h2 className="text-2xl font-display font-extrabold text-[var(--text)]">
                Let&apos;s personalize your flow
              </h2>
              <p className="text-sm text-[var(--text-soft)] mt-1">
                Everything is tailored to your day. Nothing is pre-filled.
              </p>
            </div>

            <GlassCard className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-soft)] block mb-1.5">
                  First Name or Nickname (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Alex"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-white/90 dark:bg-[#0F1B26] border border-slate-200 dark:border-white/15 text-sm font-medium focus:outline-none focus:border-sky-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-soft)] block mb-2">
                  Age Range <span className="text-rose-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {['18–24', '25–34', '35–44', '45–54', '55–64', '65+'].map((band) => (
                    <Chip
                      key={band}
                      label={band}
                      selected={ageBand === band}
                      onClick={() => setAgeBand(band)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-soft)] block mb-2">
                  Sex (Optional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Female', 'Male', 'Non-binary', 'Prefer not to say'].map((s) => (
                    <Chip
                      key={s}
                      label={s}
                      selected={sex === s}
                      onClick={() => setSex(sex === s ? '' : s)}
                    />
                  ))}
                </div>
              </div>

              {/* Searchable IANA Time zone dropdown defaulting to Asia/Kolkata */}
              <div className="relative">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-soft)] block mb-1.5">
                  Time Zone
                </label>
                <button
                  type="button"
                  onClick={() => setTzDropdownOpen((o) => !o)}
                  className="w-full px-4 py-3 rounded-2xl bg-white/90 dark:bg-[#0F1B26] border border-slate-200 dark:border-white/15 text-left text-xs font-bold text-[var(--text)] flex items-center justify-between"
                >
                  <span className="truncate">
                    {IANA_TIMEZONES.find((t) => t.id === timeZone)?.label || timeZone}
                  </span>
                  <Search className="w-4 h-4 text-[var(--text-soft)] shrink-0" />
                </button>

                {tzDropdownOpen && (
                  <div className="mt-2 p-2 rounded-2xl bg-white dark:bg-[#132332] border border-slate-200 dark:border-white/15 shadow-xl space-y-2 max-h-56 overflow-y-auto z-30">
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-[#0F1B26]">
                      <Search className="w-3.5 h-3.5 text-[var(--text-soft)]" />
                      <input
                        type="text"
                        value={tzQuery}
                        onChange={(e) => setTzQuery(e.target.value)}
                        placeholder="Search city, country, or UTC..."
                        className="w-full bg-transparent text-xs text-[var(--text)] focus:outline-none"
                      />
                      {tzQuery && (
                        <button type="button" onClick={() => setTzQuery('')}>
                          <X className="w-3.5 h-3.5 text-[var(--text-soft)]" />
                        </button>
                      )}
                    </div>
                    <div className="space-y-1">
                      {filteredTimezones.map((tz) => (
                        <button
                          key={tz.id}
                          type="button"
                          onClick={() => {
                            setTimeZone(tz.id);
                            setTzDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                            timeZone === tz.id
                              ? 'bg-sky-500 text-white'
                              : 'text-[var(--text)] hover:bg-sky-500/10'
                          }`}
                        >
                          {tz.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-bold mb-2">
                <Sparkles className="w-3.5 h-3.5" /> Habit & Activity
              </div>
              <h2 className="text-2xl font-display font-extrabold text-[var(--text)]">
                What kind of habit are you building?
              </h2>
              <p className="text-sm text-[var(--text-soft)] mt-1">
                Choose your focus and set both sliders below to continue.
              </p>
            </div>

            <div className="space-y-2 max-h-[42vh] overflow-y-auto pr-1 no-scrollbar">
              {HABIT_TYPES.map((h) => {
                const selected = habitType === h.id;
                return (
                  <GlassCard
                    key={h.id}
                    onClick={() => setHabitType(h.id)}
                    className={`p-3.5 flex items-center justify-between border-2 ${
                      selected
                        ? 'border-sky-400 bg-sky-50/70 dark:bg-sky-950/30'
                        : 'border-transparent'
                    }`}
                  >
                    <div>
                      <div className="font-display font-bold text-sm text-[var(--text)]">{h.label}</div>
                      <div className="text-xs text-[var(--text-soft)]">{h.desc}</div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        selected ? 'bg-sky-500 text-white' : 'border border-slate-300'
                      }`}
                    >
                      {selected && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </GlassCard>
                );
              })}
            </div>

            <GlassCard className="p-4 space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-[var(--text-soft)]">Sitting hours per day</span>
                  <span className="text-sky-600 dark:text-sky-400">
                    {sittingHours !== null ? `${sittingHours} hrs` : 'Tap to set'}
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={14}
                  value={sittingHours ?? 7}
                  onChange={(e) => setSittingHours(parseInt(e.target.value, 10))}
                  onClick={() => {
                    if (sittingHours === null) setSittingHours(7);
                  }}
                  className="w-full accent-sky-500"
                />
                {sittingHours === null && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[4, 6, 8, 10].map((hr) => (
                      <button
                        key={hr}
                        type="button"
                        onClick={() => setSittingHours(hr)}
                        className="px-2.5 py-1 rounded-lg bg-sky-500/10 text-xs font-bold text-[#0A5C80] dark:text-[#7CD6FF]"
                      >
                        {hr} hrs
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-[var(--text-soft)]">Current active days / week</span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {activeDays !== null ? `${activeDays} days` : 'Tap to set'}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={7}
                  value={activeDays ?? 2}
                  onChange={(e) => setActiveDays(parseInt(e.target.value, 10))}
                  onClick={() => {
                    if (activeDays === null) setActiveDays(2);
                  }}
                  className="w-full accent-emerald-500"
                />
                {activeDays === null && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[0, 2, 4, 6].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setActiveDays(d)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-xs font-bold text-emerald-700 dark:text-emerald-300"
                      >
                        {d} days
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </GlassCard>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-bold mb-2">
                <Heart className="w-3.5 h-3.5" /> Body & Comfort Check
              </div>
              <h2 className="text-2xl font-display font-extrabold text-[var(--text)]">
                Where do you feel stiff or tired?
              </h2>
              <p className="text-sm text-[var(--text-soft)] mt-1">
                Pick any areas that need extra care, or choose &ldquo;None — I feel good!&rdquo;
              </p>
            </div>

            <div className="space-y-2.5 max-h-[54vh] overflow-y-auto pr-1 no-scrollbar">
              <GlassCard
                onClick={selectNoneCondition}
                className={`p-3.5 flex items-center justify-between border-2 ${
                  noneSelected
                    ? 'border-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/30'
                    : 'border-transparent'
                }`}
              >
                <span className="font-display font-bold text-sm text-[var(--text)]">
                  None — I feel good!
                </span>
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    noneSelected ? 'bg-emerald-500 text-white' : 'border border-slate-300'
                  }`}
                >
                  {noneSelected && <Check className="w-4 h-4" />}
                </div>
              </GlassCard>

              {CONDITION_OPTIONS.map((item) => {
                const selected = conditions.includes(item.id);
                const hasRating = typeof painBaseline[item.id] === 'number';
                const hasDuration = Boolean(painDuration[item.id]);
                const hasWorse = typeof gettingWorse[item.id] === 'boolean';
                const incomplete = selected && (!hasRating || !hasDuration || !hasWorse);

                return (
                  <GlassCard
                    key={item.id}
                    className={`p-3.5 border-2 transition-all ${
                      selected
                        ? 'border-sky-400 bg-sky-50/60 dark:bg-sky-950/30'
                        : 'border-transparent'
                    }`}
                  >
                    <div
                      onClick={() => toggleCondition(item.id)}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <div className="font-display font-bold text-sm text-[var(--text)]">
                          {item.label}
                        </div>
                        <div className="text-xs text-[var(--text-soft)]">{item.desc}</div>
                      </div>
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                          selected ? 'bg-sky-500 text-white' : 'border border-slate-300'
                        }`}
                      >
                        {selected && <Check className="w-4 h-4" />}
                      </div>
                    </div>

                    {selected && (
                      <div className="mt-3 pt-3 border-t border-slate-200/70 dark:border-white/10 space-y-3">
                        <div>
                          <div className="flex items-center justify-between text-xs font-bold mb-1">
                            <span className="text-[var(--text-soft)]">
                              Today&apos;s discomfort (0–10):
                            </span>
                            <span className={hasRating ? 'text-sky-600 dark:text-sky-300' : 'text-amber-600'}>
                              {hasRating ? `${painBaseline[item.id]}/10` : 'Tap to rate 0 to 10'}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={10}
                            value={painBaseline[item.id] ?? 3}
                            onChange={(e) =>
                              setPainBaseline({
                                ...painBaseline,
                                [item.id]: parseInt(e.target.value, 10),
                              })
                            }
                            onClick={() => {
                              if (!hasRating) {
                                setPainBaseline({ ...painBaseline, [item.id]: 3 });
                              }
                            }}
                            className="w-full accent-sky-500"
                          />
                          {!hasRating && (
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {[1, 3, 5, 7].map((val) => (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() =>
                                    setPainBaseline({ ...painBaseline, [item.id]: val })
                                  }
                                  className="px-2.5 py-1 rounded-lg bg-sky-500/15 text-[11px] font-bold text-[#0A5C80] dark:text-[#7CD6FF]"
                                >
                                  {val}/10
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[11px] font-bold text-[var(--text-soft)] block mb-1">
                              How long? {!hasDuration && <span className="text-amber-600">*</span>}
                            </span>
                            <select
                              value={painDuration[item.id] || ''}
                              onChange={(e) =>
                                setPainDuration({ ...painDuration, [item.id]: e.target.value })
                              }
                              className="w-full px-2.5 py-2 rounded-xl bg-white dark:bg-[#0F1B26] border border-slate-200 dark:border-white/15 text-xs font-semibold text-[var(--text)]"
                            >
                              <option value="" disabled>
                                Choose
                              </option>
                              <option value="Few days">Few days</option>
                              <option value="Few weeks">Few weeks</option>
                              <option value="Months+">Months+</option>
                            </select>
                          </div>

                          <div>
                            <span className="text-[11px] font-bold text-[var(--text-soft)] block mb-1">
                              Getting worse? {!hasWorse && <span className="text-amber-600">*</span>}
                            </span>
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setGettingWorse({ ...gettingWorse, [item.id]: false })
                                }
                                className={`flex-1 py-1.5 rounded-xl text-xs font-bold border ${
                                  gettingWorse[item.id] === false
                                    ? 'bg-emerald-500 text-white border-emerald-500'
                                    : 'bg-white dark:bg-[#0F1B26] border-slate-200 dark:border-white/15 text-[var(--text-soft)]'
                                }`}
                              >
                                No
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setGettingWorse({ ...gettingWorse, [item.id]: true })
                                }
                                className={`flex-1 py-1.5 rounded-xl text-xs font-bold border ${
                                  gettingWorse[item.id] === true
                                    ? 'bg-amber-500 text-white border-amber-500'
                                    : 'bg-white dark:bg-[#0F1B26] border-slate-200 dark:border-white/15 text-[var(--text-soft)]'
                                }`}
                              >
                                Yes
                              </button>
                            </div>
                          </div>
                        </div>

                        {step3Attempted && incomplete && (
                          <p className="text-[11px] font-bold text-rose-500">
                            Please rate 0–10, choose duration, and tap Yes or No above.
                          </p>
                        )}
                      </div>
                    )}
                  </GlassCard>
                );
              })}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-xs font-bold mb-2">
                <ShieldAlert className="w-3.5 h-3.5" /> Safety & Health Check
              </div>
              <h2 className="text-2xl font-display font-extrabold text-[var(--text)]">
                Let&apos;s keep every move safe
              </h2>
              <p className="text-sm text-[var(--text-soft)] mt-1">
                Answer the three quick questions below so we can filter out floor or high-load moves if needed.
              </p>
            </div>

            <GlassCard className="space-y-3 p-4">
              {[
                {
                  label: 'Pregnant or postpartum?',
                  val: pregnantOrPostpartum,
                  setVal: setPregnantOrPostpartum,
                },
                {
                  label: 'Has a doctor advised avoiding exercise?',
                  val: doctorAdviceToAvoid,
                  setVal: setDoctorAdviceToAvoid,
                },
                {
                  label: 'Recent surgery or acute injury?',
                  val: recentSurgery,
                  setVal: setRecentSurgery,
                },
              ].map((q, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[var(--text)]">{q.label}</span>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => q.setVal(false)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                        q.val === false
                          ? 'bg-emerald-500 text-white border-emerald-500'
                          : 'bg-white dark:bg-[#0F1B26] border-slate-200 dark:border-white/15 text-[var(--text-soft)]'
                      }`}
                    >
                      No
                    </button>
                    <button
                      type="button"
                      onClick={() => q.setVal(true)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                        q.val === true
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-white dark:bg-[#0F1B26] border-slate-200 dark:border-white/15 text-[var(--text-soft)]'
                      }`}
                    >
                      Yes
                    </button>
                  </div>
                </div>
              ))}
            </GlassCard>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-soft)] block">
                Any of these symptoms right now? (Optional)
              </span>
              {[
                'Numbness, tingling, or pins & needles in arm/leg',
                'Sharp shooting pain or sudden weakness',
                'Dizziness, fainting, or chest pain',
              ].map((flag) => {
                const active = redFlags.includes(flag);
                return (
                  <GlassCard
                    key={flag}
                    onClick={() => toggleRedFlag(flag)}
                    className={`p-3 flex items-center justify-between border-2 ${
                      active
                        ? 'border-amber-400 bg-amber-50/70 dark:bg-amber-950/30'
                        : 'border-transparent'
                    }`}
                  >
                    <span className="text-xs font-semibold text-[var(--text)] pr-2">{flag}</span>
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        active ? 'bg-amber-500 text-white' : 'border border-slate-300'
                      }`}
                    >
                      {active && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-300 text-xs font-bold mb-2">
                <Clock className="w-3.5 h-3.5" /> Your Day & Schedule
              </div>
              <h2 className="text-2xl font-display font-extrabold text-[var(--text)]">
                Fit movement into your day
              </h2>
              <p className="text-sm text-[var(--text-soft)] mt-1">
                We only nudge you during your active hours and respect quiet days.
              </p>
            </div>

            <GlassCard className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-soft)] block mb-2">
                  Work Style <span className="text-rose-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {(['Desk / laptop', 'Standing', 'On the move', 'Mixed'] as WorkType[]).map((wt) => (
                    <Chip
                      key={wt}
                      label={wt}
                      selected={workType === wt}
                      onClick={() => setWorkType(wt)}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-soft)] block mb-1.5">
                    Start of Day
                  </label>
                  <input
                    type="time"
                    value={workStart}
                    onChange={(e) => setWorkStart(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-white/90 dark:bg-[#0F1B26] border border-slate-200 dark:border-white/15 font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-soft)] block mb-1.5">
                    Wrap Up
                  </label>
                  <input
                    type="time"
                    value={workEnd}
                    onChange={(e) => setWorkEnd(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-white/90 dark:bg-[#0F1B26] border border-slate-200 dark:border-white/15 font-bold text-sm"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-soft)]">
                    Gentle Resets Per Day
                  </label>
                  <span className="text-sm font-display font-extrabold text-sky-600 dark:text-sky-400">
                    {remindersPerDay} resets
                  </span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={6}
                  value={remindersPerDay}
                  onChange={(e) => setRemindersPerDay(parseInt(e.target.value, 10))}
                  className="w-full accent-sky-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-soft)] block mb-2">
                  Lighter / Rest Days
                </label>
                <div className="flex justify-between gap-1">
                  {[
                    { d: 0, l: 'S' },
                    { d: 1, l: 'M' },
                    { d: 2, l: 'T' },
                    { d: 3, l: 'W' },
                    { d: 4, l: 'T' },
                    { d: 5, l: 'F' },
                    { d: 6, l: 'S' },
                  ].map((item) => {
                    const isOff = daysOff.includes(item.d);
                    return (
                      <button
                        key={item.d}
                        type="button"
                        onClick={() => toggleDayOff(item.d)}
                        className={`w-10 h-10 rounded-xl font-display font-bold text-xs transition-all ${
                          isOff
                            ? 'bg-purple-500 text-white shadow-sm'
                            : 'bg-white/70 dark:bg-white/10 text-[var(--text-soft)]'
                        }`}
                      >
                        {item.l}
                      </button>
                    );
                  })}
                </div>
              </div>
            </GlassCard>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/15 text-[#0A5C80] dark:text-[#7CD6FF] text-xs font-bold mb-2">
                <Dumbbell className="w-3.5 h-3.5" /> Space & Equipment
              </div>
              <h2 className="text-2xl font-display font-extrabold text-[var(--text)]">
                Where will you move?
              </h2>
              <p className="text-sm text-[var(--text-soft)] mt-1">
                Pick your usual spot, at least one item around you, and your starting pace.
              </p>
            </div>

            <GlassCard className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-soft)] block mb-2">
                  Usual Spot <span className="text-rose-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {['At desk', 'Home living room', 'Small space', 'Outdoors'].map((loc) => (
                    <Chip
                      key={loc}
                      label={loc}
                      selected={location === loc}
                      onClick={() => setLocation(loc)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-soft)] block mb-2">
                  Available Around You <span className="text-rose-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Chair / Desk', 'Wall', 'Mat', 'Resistance band', 'Light dumbbells', 'None'].map(
                    (eq) => (
                      <Chip
                        key={eq}
                        label={eq}
                        color="mint"
                        selected={equipment.includes(eq)}
                        onClick={() => toggleEquipment(eq)}
                      />
                    )
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-soft)] block mb-2">
                  Starting Pace <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Starter', 'Steady', 'Active'] as Level[]).map((lv) => (
                    <button
                      key={lv}
                      type="button"
                      onClick={() => setLevel(lv)}
                      className={`p-3 rounded-2xl border text-center transition-all ${
                        level === lv
                          ? 'bg-sky-500 text-white border-sky-500 shadow-sm'
                          : 'bg-white/70 dark:bg-white/5 border-slate-200/70 dark:border-white/10 text-[var(--text)]'
                      }`}
                    >
                      <div className="font-display font-bold text-sm">{lv}</div>
                      <div
                        className={`text-[10px] mt-0.5 ${
                          level === lv ? 'text-sky-100' : 'text-[var(--text-soft)]'
                        }`}
                      >
                        {lv === 'Starter' ? '1–3 min' : lv === 'Steady' ? '3–5 min' : '5–10 min'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </GlassCard>
          </div>
        )}

        {step === 7 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-xs font-bold mb-2">
                <Smile className="w-3.5 h-3.5" /> Goals & Cheer Style
              </div>
              <h2 className="text-2xl font-display font-extrabold text-[var(--text)]">
                How should we cheer you on?
              </h2>
            </div>

            <GlassCard className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-soft)] block mb-2">
                  Main Focus <span className="text-rose-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      'Ease stiffness',
                      'Sit less',
                      'Posture',
                      'Build a routine',
                      'Gentle strength',
                      'Calm energy',
                    ] as Goal[]
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

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-soft)] block mb-2">
                  Encouragement Tone <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-2">
                  {(
                    [
                      {
                        id: 'Warm & celebratory',
                        desc: 'Friendly high-fives, gentle streaks, and sunny energy',
                      },
                      {
                        id: 'Calm & minimal',
                        desc: 'Quiet, soothing cues without extra fanfare',
                      },
                      {
                        id: 'Playful',
                        desc: 'Upbeat micro-challenges and lighthearted nudges',
                      },
                    ] as { id: CheerStyle; desc: string }[]
                  ).map((cs) => (
                    <div
                      key={cs.id}
                      onClick={() => setCheerStyle(cs.id)}
                      className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                        cheerStyle === cs.id
                          ? 'border-sky-400 bg-sky-50/70 dark:bg-sky-950/30'
                          : 'border-slate-200/70 dark:border-white/10 bg-white/60 dark:bg-white/5'
                      }`}
                    >
                      <div>
                        <div className="font-display font-bold text-sm text-[var(--text)]">
                          {cs.id}
                        </div>
                        <div className="text-xs text-[var(--text-soft)]">{cs.desc}</div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          cheerStyle === cs.id ? 'bg-sky-500 text-white' : 'border border-slate-300'
                        }`}
                      >
                        {cheerStyle === cs.id && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>
          </div>
        )}

        {step === 8 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-bold mb-2">
                <ShieldAlert className="w-3.5 h-3.5" /> Safety & Privacy Consent
              </div>
              <h2 className="text-2xl font-display font-extrabold text-[var(--text)]">
                One quick safety promise
              </h2>
              <p className="text-sm text-[var(--text-soft)] mt-1">
                Review and tick the box below to generate your personalized movement plan.
              </p>
            </div>

            <GlassCard className="space-y-3 text-xs text-[var(--text-soft)] leading-relaxed">
              <p className="font-semibold text-[var(--text)]">
                1. General Wellness Only (Not Medical Advice)
              </p>
              <p>
                UnStill provides gentle movement, posture education, and general fitness reminders.
                It is not a medical device and does not diagnose, treat, or replace professional
                medical or physiotherapy care.
              </p>
              <p className="font-semibold text-[var(--text)]">
                2. Move Within Your Comfort Zone
              </p>
              <p>
                Every stretch or exercise should feel like a gentle release (0–3/10 tension). Stop
                immediately if you feel sharp pain, dizziness, numbness, tingling, or chest
                discomfort.
              </p>
              <p className="font-semibold text-[var(--text)]">3. Your Data & Privacy</p>
              <p>
                Your comfort logs and schedule are stored on your device and in your private account
                solely to tailor your daily plan. You can export or delete your data anytime from
                the Me tab.{' '}
                <button
                  type="button"
                  onClick={() => setShowPrivacyModal(true)}
                  className="underline font-bold text-[#0A5C80] dark:text-[#7CD6FF]"
                >
                  Read full Safety & Privacy Policy
                </button>
              </p>

              <label className="pt-3 border-t border-slate-200/70 dark:border-white/10 flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="mt-0.5 w-5 h-5 rounded accent-sky-500"
                />
                <span className="text-xs font-bold text-[var(--text)]">
                  I understand that UnStill is for general wellness, and I will move within a
                  pain-free range.
                </span>
              </label>
            </GlassCard>
          </div>
        )}

        {step === 9 && (
          <div className="space-y-5 animate-in fade-in duration-300 text-center">
            <div className="flex justify-center">
              <div className="glass-card px-5 py-2.5 rounded-full inline-flex items-center gap-2.5 shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-[#24B47E]" aria-hidden="true" />
                <span className="text-sm font-display font-bold text-[var(--text)]">
                  Your plan is ready
                </span>
              </div>
            </div>

            <div>
              <h2 className="text-3xl font-display font-extrabold text-[var(--text)]">
                Welcome, {name.trim() || 'Friend'}!
              </h2>
              <p className="text-sm text-[var(--text-soft)] mt-1">
                Here is how UnStill tailored your daily plan from your answers:
              </p>
            </div>

            {/* Why this plan card */}
            <GlassCard className="text-left space-y-3 bg-gradient-to-br from-sky-500/10 to-emerald-500/10 border-sky-200/70 dark:border-sky-500/30">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0A5C80] dark:text-[#7CD6FF]">
                <Sparkles className="w-4 h-4" /> Why this plan
              </div>
              <p className="text-xs font-medium text-[var(--text)] leading-relaxed">
                {buildWhyThisPlanText(previewProfile, previewSchedule)}
              </p>
            </GlassCard>

            <GlassCard className="text-left space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-white/10 pb-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-soft)]">
                  Daily Rhythm
                </span>
                <span className="text-xs font-bold text-[#0A5C80] dark:text-[#7CD6FF] bg-sky-500/15 px-2.5 py-1 rounded-lg">
                  {level || 'Starter'} · {remindersPerDay} resets/day
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-[var(--text)] font-medium">
                  <Heart className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>
                    Focus areas:{' '}
                    <strong>{getConditionDisplayNames(conditions).join(', ')}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[var(--text)] font-medium">
                  <Clock className="w-4 h-4 text-sky-500 shrink-0" />
                  <span>
                    Active window:{' '}
                    <strong>
                      {workStart} – {workEnd}
                    </strong>{' '}
                    ({workType || 'Desk / laptop'})
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[var(--text)] font-medium">
                  <Laptop className="w-4 h-4 text-purple-500 shrink-0" />
                  <span>
                    Space & gear:{' '}
                    <strong>
                      {location || 'At desk'} ·{' '}
                      {equipment.length > 0 ? equipment.join(', ') : 'Chair / Desk'}
                    </strong>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[var(--text)] font-medium">
                  <Calendar className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>
                    Primary goal: <strong>{goal || 'Ease stiffness'}</strong>
                  </span>
                </div>
              </div>
            </GlassCard>
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="pb-3 space-y-2.5">
        {step === totalSteps && finalSaveError && (
          <GlassCard className="p-3.5 border-rose-500/40 bg-rose-500/10 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-display font-bold text-rose-600 dark:text-rose-300">
                Couldn&apos;t save. Retry
              </span>
              <button
                type="button"
                onClick={handleBuildPlanAndSave}
                disabled={isSavingFinalPlan}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-600 text-white text-xs font-bold"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </button>
            </div>
            <p className="text-[11px] font-mono text-[var(--text-soft)] break-words">
              {finalSaveError}
            </p>
          </GlassCard>
        )}

        {step < totalSteps && (
          <PrimaryButton
            onClick={handleContinueStep}
            disabled={!canProceedCurrentStep() || isSavingStep}
            className="w-full"
          >
            {isSavingStep ? 'Saving...' : 'Continue'} <ArrowRight className="w-5 h-5" />
          </PrimaryButton>
        )}
        {step === totalSteps && (
          <PrimaryButton
            onClick={handleBuildPlanAndSave}
            disabled={!consentChecked || isSavingFinalPlan}
            className="w-full"
          >
            {isSavingFinalPlan ? 'Saving your plan...' : 'Build My Safe Plan'}{' '}
            <Sparkles className="w-5 h-5" />
          </PrimaryButton>
        )}
        {step === 9 && (
          <PrimaryButton variant="mint" onClick={handleFinish} className="w-full text-lg">
            Show me today <ArrowRight className="w-5 h-5" />
          </PrimaryButton>
        )}
      </div>

      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <GlassCard className="max-w-md w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-display font-bold text-[var(--text)]">
                Safety & Privacy Policy
              </h3>
              <button
                type="button"
                onClick={() => setShowPrivacyModal(false)}
                className="w-8 h-8 rounded-full bg-slate-500/10 flex items-center justify-center text-[var(--text-soft)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <PrivacyPolicyContent />
            <PrimaryButton onClick={() => setShowPrivacyModal(false)} className="w-full">
              Got it
            </PrimaryButton>
          </GlassCard>
        </div>
      )}
    </div>
  );

  if (step === 9) {
    return <GlowBackground>{content}</GlowBackground>;
  }

  return content;
};
