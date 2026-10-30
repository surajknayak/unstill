import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  GlassCard,
  PrimaryButton,
  Chip,
  TabHeader,
  PrivacyPolicyContent,
} from '../components/ui';
import {
  Bell,
  Moon,
  Sun,
  Download,
  Trash2,
  LogOut,
  Calendar,
  Shield,
  Sliders,
  UserPlus,
  MessageSquareWarning,
  HelpCircle,
  X,
  Search,
} from 'lucide-react';
import { downloadCalendarReminders } from '../lib/calendarExport';
import {
  exportAllData,
  getLastWriteResult,
  getQueuedWritesList,
  getAllQueuedWritesDebugSummary,
  getLastReadWriteError,
  getLastSyncTime,
  getLastSyncError,
  LastReadWriteErrorInfo,
  isOnboardingComplete,
  computeResumeOnboardingStep,
  SyncTask,
} from '../lib/db';
import { databaseId } from '../lib/firebase';
import { Level, CheerStyle, LastWriteResult } from '../types';
import { APP_VERSION, BUILD_ID } from '../config';
import { IANA_TIMEZONES } from './OnboardingScreen';

function checkWebPushSupported(): {
  supported: boolean;
  reason?: 'ios-not-installed' | 'no-api';
} {
  if (typeof window === 'undefined') return { supported: false, reason: 'no-api' };
  const ua = window.navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;

  if (isIOS && !isStandalone) {
    return { supported: false, reason: 'ios-not-installed' };
  }
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return { supported: false, reason: 'no-api' };
  }
  return { supported: true };
}

export const MeScreen: React.FC = () => {
  const {
    user,
    profile,
    schedule,
    todayPlan,
    updateProfileAndSchedule,
    setIsEditingProfile,
    linkGuestToGoogle,
    signOut,
    deleteAccountData,
    openReportSheet,
    showToast,
  } = useApp();

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notifStatus, setNotifStatus] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'unsupported'
  );
  const [showNotifHelp, setShowNotifHelp] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [tzOpen, setTzOpen] = useState(false);
  const [tzSearch, setTzSearch] = useState('');
  const [versionTapCount, setVersionTapCount] = useState(0);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [debugLastWrite, setDebugLastWrite] = useState<LastWriteResult>(() => getLastWriteResult());
  const [debugLastError, setDebugLastError] = useState<LastReadWriteErrorInfo | null>(() =>
    getLastReadWriteError()
  );
  const [debugLastSyncTime, setDebugLastSyncTime] = useState<number | null>(() => getLastSyncTime());
  const [debugLastSyncError, setDebugLastSyncError] = useState<string | null>(() =>
    getLastSyncError()
  );
  const [debugQueuedWrites, setDebugQueuedWrites] = useState<SyncTask[]>([]);
  const [debugQueueSummary, setDebugQueueSummary] = useState<{
    totalCount: number;
    uids: string[];
    tasks: SyncTask[];
  }>({ totalCount: 0, uids: [], tasks: [] });

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifStatus(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (!showDebugPanel) return;
    let active = true;
    const refreshDebug = async () => {
      const lw = getLastWriteResult();
      const le = getLastReadWriteError();
      const lst = getLastSyncTime();
      const lse = getLastSyncError();
      const q = await getQueuedWritesList(user?.uid);
      const summary = await getAllQueuedWritesDebugSummary();
      if (active) {
        setDebugLastWrite(lw);
        setDebugLastError(le);
        setDebugLastSyncTime(lst);
        setDebugLastSyncError(lse);
        setDebugQueuedWrites(q);
        setDebugQueueSummary(summary);
      }
    };
    refreshDebug();
    const timer = window.setInterval(refreshDebug, 1500);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [showDebugPanel, user?.uid, profile?.updatedAt]);

  const handleVersionTap = async () => {
    const next = versionTapCount + 1;
    setVersionTapCount(next);
    if (next >= 7) {
      setShowDebugPanel((prev) => !prev);
      setVersionTapCount(0);
      setDebugLastWrite(getLastWriteResult());
      setDebugLastError(getLastReadWriteError());
      setDebugLastSyncTime(getLastSyncTime());
      setDebugLastSyncError(getLastSyncError());
      setDebugQueuedWrites(await getQueuedWritesList(user?.uid));
      setDebugQueueSummary(await getAllQueuedWritesDebugSummary());
    }
  };

  if (!profile) return null;

  const pushSupport = checkWebPushSupported();

  const requestNotificationPerm = async () => {
    if (!('Notification' in window)) {
      setNotifStatus('unsupported');
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      setNotifStatus(perm);
      if (perm === 'granted') {
        showToast('Reminders enabled!', 'success');
        try {
          new Notification('UnStill Reminders Active', {
            body: 'We will gently nudge you during your active hours.',
            icon: `${import.meta.env.BASE_URL}icon.svg`,
          });
        } catch {}
      }
    } catch {
      setNotifStatus('denied');
    }
  };

  const handleExportJSON = async () => {
    if (!user) return;
    const data = await exportAllData(user.uid);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `unstill-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredTimezones = IANA_TIMEZONES.filter(
    (tz) =>
      tz.id.toLowerCase().includes(tzSearch.toLowerCase()) ||
      tz.label.toLowerCase().includes(tzSearch.toLowerCase())
  );

  return (
    <div className="space-y-5 pb-28">
      <TabHeader
        title="Profile & Settings"
        subtitle="Customize your schedule, reminders, and privacy."
      />

      {/* Account Card */}
      <GlassCard className="p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-sky-500/15 text-[#0A5C80] dark:text-[#7CD6FF]">
              {user?.isGuest ? 'Guest Mode (Local Storage)' : 'Synced with Google'}
            </span>
            <h3 className="font-display font-bold text-lg text-[var(--text)] mt-1">
              {profile.name || user?.displayName || 'Friend'}
            </h3>
            {user?.email && <p className="text-xs text-[var(--text-soft)]">{user.email}</p>}
          </div>
          <button
            type="button"
            onClick={() => setIsEditingProfile(true)}
            className="shrink-0 px-3.5 py-2 rounded-2xl bg-sky-500/15 hover:bg-sky-500/25 text-[#0A5C80] dark:text-[#7CD6FF] text-xs font-display font-bold transition-colors"
          >
            Edit profile
          </button>
        </div>

        {user?.isGuest && (
          <PrimaryButton
            variant="outline"
            onClick={linkGuestToGoogle}
            className="w-full min-h-[46px] text-xs"
          >
            <UserPlus className="w-4 h-4" /> Link Google Account to Back Up Data
          </PrimaryButton>
        )}
      </GlassCard>

      {/* Pace, Tone & Time Zone */}
      <GlassCard className="p-5 space-y-4">
        <h3 className="font-display font-bold text-sm text-[var(--text)] flex items-center gap-2">
          <Sliders className="w-4 h-4 text-sky-500" /> Pace, Tone & Time Zone
        </h3>

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-soft)] block mb-2">
            Activity Pace
          </label>
          <div className="flex gap-2">
            {(['Starter', 'Steady', 'Active'] as Level[]).map((lv) => (
              <Chip
                key={lv}
                label={lv}
                selected={profile.level === lv}
                onClick={() => updateProfileAndSchedule({ level: lv })}
                className="flex-1 justify-center"
              />
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-soft)] block mb-2">
            Encouragement Style
          </label>
          <div className="flex flex-wrap gap-2">
            {(['Warm & celebratory', 'Calm & minimal', 'Playful'] as CheerStyle[]).map((cs) => (
              <Chip
                key={cs}
                label={cs}
                selected={profile.cheerStyle === cs}
                onClick={() => updateProfileAndSchedule({ cheerStyle: cs })}
              />
            ))}
          </div>
        </div>

        {/* Time zone selector */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-soft)] block mb-1.5">
            Time Zone
          </label>
          <button
            type="button"
            onClick={() => setTzOpen((o) => !o)}
            className="w-full px-3.5 py-2.5 rounded-2xl bg-white/90 dark:bg-[#0F1B26] border border-slate-200 dark:border-white/15 text-left text-xs font-bold text-[var(--text)] flex items-center justify-between"
          >
            <span className="truncate">
              {IANA_TIMEZONES.find((t) => t.id === profile.timeZone)?.label ||
                profile.timeZone ||
                'Asia/Kolkata (India, IST, UTC+05:30)'}
            </span>
            <Search className="w-3.5 h-3.5 text-[var(--text-soft)]" />
          </button>

          {tzOpen && (
            <div className="mt-2 p-2 rounded-2xl bg-white dark:bg-[#132332] border border-slate-200 dark:border-white/15 shadow-lg space-y-2 max-h-48 overflow-y-auto">
              <input
                type="text"
                value={tzSearch}
                onChange={(e) => setTzSearch(e.target.value)}
                placeholder="Search city or time zone..."
                className="w-full px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#0F1B26] text-xs text-[var(--text)]"
              />
              {filteredTimezones.map((tz) => (
                <button
                  key={tz.id}
                  type="button"
                  onClick={() => {
                    updateProfileAndSchedule({ timeZone: tz.id });
                    setTzOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-semibold ${
                    profile.timeZone === tz.id
                      ? 'bg-sky-500 text-white'
                      : 'text-[var(--text)] hover:bg-sky-500/10'
                  }`}
                >
                  {tz.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </GlassCard>

      {/* Section 9 & 11.2: Schedule & Reminders with Feature Detection */}
      <GlassCard className="p-5 space-y-4">
        <h3 className="font-display font-bold text-sm text-[var(--text)] flex items-center gap-2">
          <Bell className="w-4 h-4 text-emerald-500" /> Schedule & Reminders
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-[var(--text-soft)] block mb-1">
              Work Start
            </label>
            <input
              type="time"
              value={schedule.workStart}
              onChange={(e) =>
                updateProfileAndSchedule({}, { workStart: e.target.value })
              }
              className="w-full px-3 py-2 rounded-xl bg-white/90 dark:bg-[#0F1B26] border border-slate-200 dark:border-white/15 text-xs font-bold"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-[var(--text-soft)] block mb-1">
              Work End
            </label>
            <input
              type="time"
              value={schedule.workEnd}
              onChange={(e) =>
                updateProfileAndSchedule({}, { workEnd: e.target.value })
              }
              className="w-full px-3 py-2 rounded-xl bg-white/90 dark:bg-[#0F1B26] border border-slate-200 dark:border-white/15 text-xs font-bold"
            />
          </div>
        </div>

        {/* Notification Status & High-Contrast Action */}
        {!pushSupport.supported ? (
          <div className="p-3.5 rounded-2xl bg-sky-500/10 dark:bg-sky-400/15 border border-sky-400/30 space-y-2.5">
            <p className="text-xs font-semibold text-[var(--text)] leading-relaxed">
              {pushSupport.reason === 'ios-not-installed'
                ? 'On iPhone and iPad, web notifications work after you add UnStill to your Home Screen (tap Share → Add to Home Screen).'
                : 'Your current browser does not support background notifications. You can add daily reminders directly to your phone or computer calendar below.'}
            </p>
            <PrimaryButton
              onClick={() => downloadCalendarReminders(schedule, todayPlan, profile.timeZone)}
              className="w-full min-h-[44px] text-xs"
            >
              <Calendar className="w-4 h-4" /> Add reminders to my calendar
            </PrimaryButton>
          </div>
        ) : notifStatus === 'granted' ? (
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-500/12 border border-emerald-500/30">
            <div>
              <div className="text-xs font-bold text-[var(--text)]">Browser Notifications</div>
              <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold">
                Reminders are active during your work window
              </div>
            </div>
            <span className="px-3 py-1 rounded-xl bg-emerald-500 text-white text-xs font-bold">
              Active
            </span>
          </div>
        ) : notifStatus === 'denied' ? (
          <div className="p-3.5 rounded-2xl bg-amber-500/12 border border-amber-500/30 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-[var(--text)]">
                Notifications are blocked. Enable them in your browser&apos;s site settings.
              </p>
              <button
                type="button"
                onClick={() => setShowNotifHelp((s) => !s)}
                className="shrink-0 px-2.5 py-1 rounded-lg bg-white dark:bg-[#162636] text-xs font-bold text-[#0A5C80] dark:text-[#7CD6FF] inline-flex items-center gap-1"
              >
                <HelpCircle className="w-3.5 h-3.5" /> How
              </button>
            </div>
            {showNotifHelp && (
              <p className="text-[11px] text-[var(--text-soft)] leading-relaxed pt-1 border-t border-amber-500/20">
                Click the tune/lock icon on the left side of your browser address bar, set{' '}
                <strong>Notifications</strong> to <strong>Allow</strong>, and refresh the page.
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/80 dark:bg-[#162636] border border-slate-200/80 dark:border-white/15 gap-3">
            <div>
              <div className="text-xs font-bold text-[var(--text)]">Browser Notifications</div>
              <div className="text-[11px] text-[var(--text-soft)]">
                Gentle nudges during your active window
              </div>
            </div>
            <button
              type="button"
              onClick={requestNotificationPerm}
              className="shrink-0 px-4 py-2 rounded-xl primary-gradient text-white text-xs font-display font-bold shadow-sm active:scale-95 transition-transform"
            >
              Turn on reminders
            </button>
          </div>
        )}

        <PrimaryButton
          variant="outline"
          onClick={() => downloadCalendarReminders(schedule, todayPlan, profile.timeZone)}
          className="w-full min-h-[46px] text-xs"
        >
          <Calendar className="w-4 h-4" /> Download .ics Calendar Reminders
        </PrimaryButton>
      </GlassCard>

      {/* Appearance & Accessibility */}
      <GlassCard className="p-5 space-y-4">
        <h3 className="font-display font-bold text-sm text-[var(--text)] flex items-center gap-2">
          {profile.theme === 'dark' ? (
            <Moon className="w-4 h-4 text-purple-400" />
          ) : (
            <Sun className="w-4 h-4 text-amber-500" />
          )}
          Display & Motion
        </h3>

        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[var(--text)]">Theme</span>
          <div className="flex gap-1.5">
            {(['light', 'dark', 'system'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => updateProfileAndSchedule({ theme: t })}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize border ${
                  profile.theme === t
                    ? 'bg-sky-500 text-white border-sky-500'
                    : 'bg-white/80 dark:bg-[#162636] border-slate-200/80 dark:border-white/15 text-[var(--text)]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-xs font-bold text-[var(--text)]">Sound & Haptic Cues</span>
          <input
            type="checkbox"
            checked={profile.soundHaptics}
            onChange={(e) =>
              updateProfileAndSchedule({ soundHaptics: e.target.checked })
            }
            className="w-5 h-5 accent-sky-500 rounded"
          />
        </label>
      </GlassCard>

      {/* Section 10.2: Help & Report a problem */}
      <GlassCard className="p-5 space-y-3">
        <h3 className="font-display font-bold text-sm text-[var(--text)] flex items-center gap-2">
          <MessageSquareWarning className="w-4 h-4 text-sky-500" /> Help & Feedback
        </h3>
        <p className="text-xs text-[var(--text-soft)] leading-relaxed">
          Spotted a bug, felt an exercise didn&apos;t fit your plan, or have an idea for UnStill?
        </p>
        <PrimaryButton
          variant="outline"
          onClick={() => openReportSheet('Bug')}
          className="w-full min-h-[46px] text-xs"
        >
          <MessageSquareWarning className="w-4 h-4" /> Report a problem or suggest an idea
        </PrimaryButton>
      </GlassCard>

      {/* Data & Privacy Controls */}
      <GlassCard className="p-5 space-y-3">
        <h3 className="font-display font-bold text-sm text-[var(--text)] flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-500" /> Your Data & Privacy
        </h3>
        <p className="text-xs text-[var(--text-soft)] leading-relaxed">
          Your comfort logs and routines are stored locally and in your private account. Export or delete everything anytime.
        </p>

        <div className="flex gap-2 pt-1">
          <PrimaryButton
            variant="ghost"
            onClick={handleExportJSON}
            className="flex-1 min-h-[44px] text-xs"
          >
            <Download className="w-4 h-4" /> Export my data
          </PrimaryButton>

          <PrimaryButton
            variant="ghost"
            onClick={signOut}
            className="flex-1 min-h-[44px] text-xs"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </PrimaryButton>
        </div>

        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="w-full py-2.5 text-xs font-bold text-rose-500 hover:underline flex items-center justify-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete all data
          </button>
        ) : (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-2">
            <p className="text-xs font-bold text-rose-600 dark:text-rose-400">
              Permanently erase all local and cloud data?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2 rounded-xl bg-white dark:bg-slate-800 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteAccountData}
                className="flex-1 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold"
              >
                Yes, Erase Everything
              </button>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Section 3.6: Single small Safety and privacy link in the footer of Me */}
      <div className="pt-2 pb-4 text-center space-y-2">
        <button
          type="button"
          onClick={() => setShowPrivacyModal(true)}
          className="text-xs font-bold text-[var(--text-soft)] hover:text-[var(--text)] underline inline-flex items-center gap-1.5"
        >
          <Shield className="w-3.5 h-3.5 text-emerald-500" />
          Safety and privacy
        </button>

        <div>
          <button
            type="button"
            onClick={handleVersionTap}
            data-testid="me-version-button"
            className="text-[11px] font-medium text-[var(--text-soft)] opacity-75 hover:opacity-100 select-none"
          >
            UnStill v{APP_VERSION}
          </button>
        </div>

        {showDebugPanel && (
          <GlassCard
            data-testid="me-debug-panel"
            className="mt-2 p-4 text-left space-y-2.5 border-sky-500/30 bg-slate-900/5 dark:bg-slate-900/60"
          >
            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-white/10 pb-1.5">
              <span className="text-xs font-display font-extrabold uppercase tracking-wider text-[var(--text)]">
                Persistence Debug Panel
              </span>
              <button
                type="button"
                onClick={() => setShowDebugPanel(false)}
                className="text-[11px] font-bold text-[var(--text-soft)] hover:text-[var(--text)]"
              >
                Close
              </button>
            </div>
            <div className="space-y-1 text-[11px] font-mono text-[var(--text)] break-all">
              <div>
                <span className="text-[var(--text-soft)]">buildId:</span> {BUILD_ID}
              </div>
              <div>
                <span className="text-[var(--text-soft)]">uid:</span> {user?.uid || 'none'}
              </div>
              <div>
                <span className="text-[var(--text-soft)]">provider:</span>{' '}
                {user?.provider || profile.provider || (user?.isGuest ? 'anonymous' : 'google')}
              </div>
              <div>
                <span className="text-[var(--text-soft)]">isGuest:</span>{' '}
                {String(Boolean(user?.isGuest ?? profile.isGuest))}
              </div>
              <div>
                <span className="text-[var(--text-soft)]">onboardingStep:</span>{' '}
                {profile.onboardingStep ?? computeResumeOnboardingStep(profile)}
              </div>
              <div>
                <span className="text-[var(--text-soft)]">onboardingComplete:</span>{' '}
                {String(isOnboardingComplete(profile))}
              </div>
              <div>
                <span className="text-[var(--text-soft)]">databaseId:</span> {databaseId}
              </div>
              <div>
                <span className="text-[var(--text-soft)]">queuedWritesCount:</span>{' '}
                {debugQueuedWrites.length} (total: {debugQueueSummary.totalCount}, uids:{' '}
                {debugQueueSummary.uids.length > 0 ? debugQueueSummary.uids.join(', ') : 'none'})
                {debugQueuedWrites.length > 0 && (
                  <span className="text-[var(--text-soft)]">
                    {' '}
                    [{debugQueuedWrites.map((q) => `${q.collectionName}/${q.docId}`).join(', ')}]
                  </span>
                )}
              </div>
              <div>
                <span className="text-[var(--text-soft)]">lastSyncTime:</span>{' '}
                {debugLastSyncTime ? new Date(debugLastSyncTime).toISOString() : 'none'}
              </div>
              <div>
                <span className="text-[var(--text-soft)]">lastSyncError:</span>{' '}
                {debugLastSyncError || 'none'}
              </div>
              <div>
                <span className="text-[var(--text-soft)]">lastReadWriteError:</span>{' '}
                {debugLastError
                  ? `${debugLastError.operation.toUpperCase()} (${debugLastError.path}) at ${new Date(
                      debugLastError.timestamp
                    ).toISOString()} — ${debugLastError.error}`
                  : 'none'}
              </div>
              <div>
                <span className="text-[var(--text-soft)]">lastWriteResult:</span>{' '}
                {debugLastWrite.status === 'idle'
                  ? 'none'
                  : `${debugLastWrite.status.toUpperCase()} (${debugLastWrite.path}) at ${new Date(
                      debugLastWrite.timestamp
                    ).toLocaleTimeString()}${
                      debugLastWrite.error ? ` — ${debugLastWrite.error}` : ''
                    }`}
              </div>
            </div>
            <div className="pt-1">
              <button
                type="button"
                data-testid="copy-debug-info-btn"
                onClick={async () => {
                  const payload = {
                    buildId: BUILD_ID,
                    appVersion: APP_VERSION,
                    uid: user?.uid || 'none',
                    provider:
                      user?.provider || profile.provider || (user?.isGuest ? 'anonymous' : 'google'),
                    isGuest: Boolean(user?.isGuest ?? profile.isGuest),
                    onboardingStep:
                      profile.onboardingStep ?? computeResumeOnboardingStep(profile),
                    onboardingComplete: isOnboardingComplete(profile),
                    databaseId,
                    queuedWritesCount: debugQueuedWrites.length,
                    totalQueuedWritesCount: debugQueueSummary.totalCount,
                    queuedWriteUids: debugQueueSummary.uids,
                    lastSyncTime: debugLastSyncTime
                      ? new Date(debugLastSyncTime).toISOString()
                      : null,
                    lastSyncError: debugLastSyncError || null,
                    lastReadWriteError: debugLastError
                      ? {
                          ...debugLastError,
                          isoTimestamp: new Date(debugLastError.timestamp).toISOString(),
                        }
                      : null,
                    lastWriteResult: debugLastWrite,
                  };
                  try {
                    if (navigator.clipboard?.writeText) {
                      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
                    }
                    showToast('Debug info copied', 'success');
                  } catch {
                    showToast('Could not copy debug info', 'error');
                  }
                }}
                className="w-full py-2 px-3 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-[#0A5C80] dark:text-[#7CD6FF] text-xs font-display font-bold transition-colors"
              >
                Copy debug info
              </button>
            </div>
          </GlassCard>
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
              Close
            </PrimaryButton>
          </GlassCard>
        </div>
      )}
    </div>
  );
};
