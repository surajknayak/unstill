import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { TodayScreen } from './screens/TodayScreen';
import { PlanScreen } from './screens/PlanScreen';
import { CareScreen } from './screens/CareScreen';
import { ProgressScreen } from './screens/ProgressScreen';
import { MeScreen } from './screens/MeScreen';
import { PlayerScreen } from './screens/PlayerScreen';
import { PostureScreen } from './screens/PostureScreen';
import { PlanWorkoutScreen } from './screens/PlanWorkoutScreen';
import { WorkoutDetailScreen } from './screens/WorkoutDetailScreen';
import { PainCheckinScreen } from './screens/PainCheckinScreen';
import {
  ToastBanner,
  SyncStatus,
  ReportProblemSheet,
  GlowBackground,
  GlassCard,
  PrimaryButton,
  UnStillLogo,
} from './components/ui';
import { SplashScreen } from './components/SplashScreen';
import {
  Sun,
  Calendar,
  HeartHandshake,
  BarChart3,
  User,
  WifiOff,
  RefreshCw,
  AlertCircle,
  X,
} from 'lucide-react';
import { Level } from './types';
import { isOnboardingComplete } from './lib/db';
import { useRegisterSW } from 'virtual:pwa-register/react';
import {
  SPLASH_MIN_MS,
  SPLASH_READY_HOLD_MS,
  SPLASH_FADE_MS,
  SPLASH_SLOW_MS,
  BUILD_ID,
  RELOADED_FOR_BUILD_PREFIX,
  UPDATED_TOAST_SESSION_KEY,
  checkVersionJsonAndKillSwitch,
  fetchRemoteVersionJson,
  isUpdateBannerDismissedForBuild,
  dismissUpdateBannerForBuild,
  hasShownUpdateBannerInSession,
  markUpdateBannerShownInSession,
} from './config';

let hasShownLaunchSplashInProcess = false;

const SW_UPDATE_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

const UpdateAvailableBanner: React.FC<{
  visible: boolean;
  onUpdate: () => void;
  onDismiss: () => void;
}> = ({ visible, onUpdate, onDismiss }) => {
  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="update-available-banner"
      className="sticky top-0 z-40 px-4 pt-2 pointer-events-none"
    >
      <div className="max-w-[430px] mx-auto px-3.5 py-2 rounded-2xl bg-sky-500/15 dark:bg-sky-500/20 backdrop-blur-md border border-sky-500/30 flex items-center justify-between gap-2 text-xs font-bold text-sky-900 dark:text-sky-200 shadow-sm pointer-events-auto">
        <span>Update available</span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onUpdate}
            data-testid="update-available-apply-btn"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl primary-gradient text-white text-[11px] font-bold shadow-xs active:scale-95 transition-transform"
          >
            <RefreshCw className="w-3 h-3" /> Update
          </button>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss update notification"
            data-testid="update-available-dismiss-btn"
            className="w-6 h-6 rounded-lg flex items-center justify-center text-sky-900/70 dark:text-sky-200/70 hover:bg-sky-500/15 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

const AppShell: React.FC = () => {
  const {
    user,
    loading,
    authRestored,
    isAuthPopupOpen,
    profileLoadError,
    retryLoadProfile,
    startFreshOnboarding,
    isEditingProfile,
    isShowingPlanReady,
    showWelcomeOverride,
    isOffline,
    toastMessage,
    clearToast,
    showToast,
    profile,
    activeTab,
    setActiveTab,
    activeSession,
    showPostureCheck,
    showWorkoutBuilder,
    activeWorkoutDetail,
    showPainCheckin,
    reportSheetState,
    openReportSheet,
    closeReportSheet,
    sendProblemReport,
    linkConflictDialog,
    confirmLinkConflictSignIn,
    cancelLinkConflictDialog,
  } = useApp();

  const mainRef = useRef<HTMLDivElement>(null);
  const mountTimeRef = useRef<number>(Date.now());
  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const lastTypingAtRef = useRef<number>(0);
  const isApplyingUpdateRef = useRef<boolean>(false);

  const [swWaiting, setSwWaiting] = useState<boolean>(false);
  const [remoteBuildId, setRemoteBuildId] = useState<string | null>(null);
  const [isApplyingUpdate, setIsApplyingUpdate] = useState<boolean>(false);
  const [dismissedBuildIdState, setDismissedBuildIdState] = useState<string | null>(null);
  const [alreadyShownInPriorMount, setAlreadyShownInPriorMount] = useState<boolean>(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      swRegistrationRef.current = registration;
      if (registration.waiting) {
        setSwWaiting(true);
      }
      registration.addEventListener?.('updatefound', () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker?.controller) {
            setSwWaiting(true);
          }
        });
      });
      // Check for updates immediately on app start
      registration.update().catch(() => {});
    },
  });

  const [splashVisible, setSplashVisible] = useState<boolean>(() => !hasShownLaunchSplashInProcess);
  const [splashStatus, setSplashStatus] = useState<'loading' | 'ready' | 'slow'>('loading');
  const [splashFading, setSplashFading] = useState<boolean>(false);
  const [retryCounter, setRetryCounter] = useState<number>(0);
  const [confirmingStartFresh, setConfirmingStartFresh] = useState<boolean>(false);

  // Track typing activity so we never auto-reload while the user is typing in a field
  useEffect(() => {
    const handleKeyActivity = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) {
        lastTypingAtRef.current = Date.now();
      }
    };
    window.addEventListener('keydown', handleKeyActivity, { passive: true });
    window.addEventListener('input', handleKeyActivity, { passive: true });
    return () => {
      window.removeEventListener('keydown', handleKeyActivity);
      window.removeEventListener('input', handleKeyActivity);
    };
  }, []);

  const isUserTypingInField = useCallback((): boolean => {
    if (typeof document === 'undefined') return false;
    const active = document.activeElement as HTMLElement | null;
    if (active) {
      const tag = active.tagName;
      if (tag === 'TEXTAREA' || active.isContentEditable) return true;
      if (tag === 'INPUT') {
        const inputType = ((active as HTMLInputElement).type || 'text').toLowerCase();
        const nonTypingTypes = ['button', 'checkbox', 'radio', 'submit', 'reset', 'range'];
        if (!nonTypingTypes.includes(inputType)) {
          return true;
        }
      }
    }
    return Date.now() - lastTypingAtRef.current < 2500;
  }, []);

  // Startup & periodic (every 30m) & visibilitychange SW update check + /version.json kill switch
  useEffect(() => {
    const runChecks = () => {
      swRegistrationRef.current?.update().catch(() => {});
      if (swRegistrationRef.current?.waiting) {
        setSwWaiting(true);
      }
      void checkVersionJsonAndKillSwitch().then((res) => {
        if (res.remoteBuildId) {
          setRemoteBuildId(res.remoteBuildId);
        }
      });
    };

    runChecks();

    const intervalId = window.setInterval(runChecks, SW_UPDATE_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        runChecks();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // When needRefresh or swWaiting turns true, refresh remoteBuildId so we know the waiting build identity
  const hasWaitingSW = Boolean(needRefresh || swWaiting || swRegistrationRef.current?.waiting);

  useEffect(() => {
    if (!hasWaitingSW) return;
    let cancelled = false;
    void fetchRemoteVersionJson(2500).then((payload) => {
      if (cancelled || !payload?.buildId) return;
      const fetchedId = payload.buildId.trim();
      setRemoteBuildId(fetchedId);
      // If the remote server build is already the exact same build we are running and no worker is waiting, clear false-positive needRefresh
      if (fetchedId === BUILD_ID && !swRegistrationRef.current?.waiting) {
        setNeedRefresh(false);
        setSwWaiting(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [hasWaitingSW, setNeedRefresh]);

  const waitingBuildId =
    remoteBuildId && remoteBuildId !== BUILD_ID
      ? remoteBuildId
      : `sw-waiting-${BUILD_ID}`;

  const isNewerBuildWaiting =
    hasWaitingSW &&
    !isApplyingUpdate &&
    (!remoteBuildId || remoteBuildId !== BUILD_ID || Boolean(swRegistrationRef.current?.waiting));

  // Show one-time toast "Updated to the latest version" after an automatic or manual update reload
  useEffect(() => {
    if (splashVisible || !authRestored || loading) return;
    try {
      if (typeof sessionStorage !== 'undefined') {
        const updatedFrom = sessionStorage.getItem(UPDATED_TOAST_SESSION_KEY);
        if (updatedFrom) {
          sessionStorage.removeItem(UPDATED_TOAST_SESSION_KEY);
          showToast('Updated to the latest version', 'success');
        }
      }
    } catch {
      // ignore storage errors
    }
  }, [splashVisible, authRestored, loading, showToast]);

  const applyUpdateAndReload = useCallback(
    (targetBuildId: string) => {
      if (isApplyingUpdateRef.current) return;
      isApplyingUpdateRef.current = true;
      setIsApplyingUpdate(true);
      setNeedRefresh(false);
      setSwWaiting(false);

      try {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem(`${RELOADED_FOR_BUILD_PREFIX}${targetBuildId}`, '1');
          sessionStorage.setItem(UPDATED_TOAST_SESSION_KEY, targetBuildId);
        }
      } catch {
        // ignore storage errors
      }

      void Promise.resolve(updateServiceWorker(true)).catch(() => {});
      window.setTimeout(() => {
        if (typeof window !== 'undefined' && window.location?.reload) {
          window.location.reload();
        }
      }, 450);
    },
    [setNeedRefresh, updateServiceWorker]
  );

  const canAutoReloadSafely = useCallback((): boolean => {
    if (splashVisible) return false;
    if (isAuthPopupOpen || linkConflictDialog.open) return false;
    if (
      activeSession ||
      showPostureCheck ||
      showWorkoutBuilder ||
      showPainCheckin ||
      reportSheetState.open
    ) {
      return false;
    }
    if (isUserTypingInField()) return false;
    return true;
  }, [
    splashVisible,
    isAuthPopupOpen,
    linkConflictDialog.open,
    activeSession,
    showPostureCheck,
    showWorkoutBuilder,
    showPainCheckin,
    reportSheetState.open,
    isUserTypingInField,
  ]);

  const tryAutoApplyWaitingUpdate = useCallback(() => {
    if (!isNewerBuildWaiting || isApplyingUpdateRef.current) return false;
    if (!canAutoReloadSafely()) return false;

    let alreadyReloadedForBuild = false;
    try {
      if (typeof sessionStorage !== 'undefined') {
        alreadyReloadedForBuild =
          sessionStorage.getItem(`${RELOADED_FOR_BUILD_PREFIX}${waitingBuildId}`) === '1';
      }
    } catch {
      // ignore
    }

    if (alreadyReloadedForBuild) return false;

    applyUpdateAndReload(waitingBuildId);
    return true;
  }, [isNewerBuildWaiting, canAutoReloadSafely, waitingBuildId, applyUpdateAndReload]);

  const isOnWelcomeScreen = !user || showWelcomeOverride;

  // Trigger safe automatic reload:
  // - Right after splash finishes
  // - When returning to the Welcome screen
  // - When a waiting SW update finishes installing at a safe moment
  useEffect(() => {
    if (!isNewerBuildWaiting) return;
    tryAutoApplyWaitingUpdate();
  }, [isNewerBuildWaiting, splashVisible, isOnWelcomeScreen, tryAutoApplyWaitingUpdate]);

  // Also trigger safe automatic reload on tab-visible and right after an onboarding step's answers are saved locally
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        tryAutoApplyWaitingUpdate();
      }
    };
    const handleOnboardingStepSaved = () => {
      tryAutoApplyWaitingUpdate();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('unstill:onboarding-step-saved', handleOnboardingStepSaved);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('unstill:onboarding-step-saved', handleOnboardingStepSaved);
    };
  }, [tryAutoApplyWaitingUpdate]);

  // Check if the banner was already shown in a previous mount of this session for the same build
  useEffect(() => {
    setAlreadyShownInPriorMount(hasShownUpdateBannerInSession(waitingBuildId));
  }, [waitingBuildId]);

  const isDismissedForCurrentWaitingBuild =
    dismissedBuildIdState === waitingBuildId || isUpdateBannerDismissedForBuild(waitingBuildId);

  const shouldShowUpdateBanner =
    isNewerBuildWaiting &&
    !isApplyingUpdate &&
    !splashVisible &&
    !isAuthPopupOpen &&
    !linkConflictDialog.open &&
    !isDismissedForCurrentWaitingBuild &&
    !alreadyShownInPriorMount;

  useEffect(() => {
    if (shouldShowUpdateBanner && waitingBuildId) {
      markUpdateBannerShownInSession(waitingBuildId);
    }
  }, [shouldShowUpdateBanner, waitingBuildId]);

  const handleDismissUpdateBanner = () => {
    dismissUpdateBannerForBuild(waitingBuildId);
    setDismissedBuildIdState(waitingBuildId);
  };

  useEffect(() => {
    if (!profileLoadError) {
      setConfirmingStartFresh(false);
    }
  }, [profileLoadError]);

  useEffect(() => {
    hasShownLaunchSplashInProcess = true;
    document.title = 'UnStill — Everyday Movement That Fits Real Life';
  }, []);

  useEffect(() => {
    if (!splashVisible) return;

    if (loading || !authRestored) {
      const slowTimer = window.setTimeout(() => {
        setSplashStatus('slow');
      }, SPLASH_SLOW_MS);
      return () => window.clearTimeout(slowTimer);
    }

    const elapsed = Date.now() - mountTimeRef.current;
    const waitMs = Math.max(0, SPLASH_MIN_MS - elapsed);

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let readyHoldTimer: number | undefined;
    let removeTimer: number | undefined;

    const minTimer = window.setTimeout(() => {
      setSplashStatus('ready');

      readyHoldTimer = window.setTimeout(() => {
        if (prefersReducedMotion) {
          setSplashVisible(false);
          window.setTimeout(() => mainRef.current?.focus(), 20);
        } else {
          setSplashFading(true);
          removeTimer = window.setTimeout(() => {
            setSplashVisible(false);
            window.setTimeout(() => mainRef.current?.focus(), 20);
          }, SPLASH_FADE_MS);
        }
      }, SPLASH_READY_HOLD_MS);
    }, waitMs);

    return () => {
      window.clearTimeout(minTimer);
      if (readyHoldTimer) window.clearTimeout(readyHoldTimer);
      if (removeTimer) window.clearTimeout(removeTimer);
    };
  }, [loading, authRestored, splashVisible, retryCounter]);

  const handleSplashRetry = () => {
    mountTimeRef.current = Date.now();
    setSplashStatus('loading');
    setRetryCounter((c) => c + 1);
    retryLoadProfile();
  };

  const cachedPace =
    profile?.level ||
    (typeof window !== 'undefined'
      ? (localStorage.getItem('hf_user_pace') as Level | null)
      : null);

  let screenContent: React.ReactNode;

  if (!authRestored || loading) {
    screenContent = (
      <GlowBackground className="min-h-dvh flex flex-col items-center justify-center p-6 max-w-[430px] mx-auto text-center">
        <UnStillLogo size={64} />
        <div className="mt-5 glass-card px-5 py-2.5 rounded-full inline-flex items-center gap-2.5 shadow-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2EB8F5] splash-dot-1" aria-hidden="true" />
          <span className="text-sm font-display font-bold text-[var(--text)]">
            Loading your plan...
          </span>
        </div>
      </GlowBackground>
    );
  } else if (profileLoadError && !isOnboardingComplete(profile)) {
    screenContent = (
      <GlowBackground className="min-h-dvh flex flex-col items-center justify-center p-6 max-w-[430px] mx-auto">
        <GlassCard className="w-full p-6 space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-300 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-display font-extrabold text-[var(--text)]">
            We couldn&apos;t load your saved plan. Retry
          </h2>
          <p className="text-xs text-[var(--text-soft)] leading-relaxed break-words bg-slate-500/10 dark:bg-white/5 p-3 rounded-xl font-mono">
            {profileLoadError}
          </p>
          {!confirmingStartFresh ? (
            <div className="space-y-2.5 pt-1">
              <PrimaryButton
                onClick={() => {
                  setConfirmingStartFresh(false);
                  retryLoadProfile();
                }}
                className="w-full"
              >
                <RefreshCw className="w-4 h-4" /> Retry
              </PrimaryButton>
              <PrimaryButton
                variant="ghost"
                onClick={() => setConfirmingStartFresh(true)}
                className="w-full text-sm"
              >
                Start fresh
              </PrimaryButton>
            </div>
          ) : (
            <div
              role="alertdialog"
              aria-labelledby="confirm-start-fresh-text"
              className="space-y-3 pt-2 border-t border-slate-200/60 dark:border-white/10"
            >
              <p
                id="confirm-start-fresh-text"
                className="text-sm font-display font-bold text-[var(--text)] leading-snug"
              >
                This will replace your saved plan on this account. Continue?
              </p>
              <div className="space-y-2">
                <PrimaryButton
                  onClick={() => {
                    setConfirmingStartFresh(false);
                    retryLoadProfile();
                  }}
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4" /> Retry loading saved plan
                </PrimaryButton>
                <div className="grid grid-cols-2 gap-2">
                  <PrimaryButton
                    variant="outline"
                    onClick={() => setConfirmingStartFresh(false)}
                    className="w-full text-sm"
                  >
                    Cancel
                  </PrimaryButton>
                  <PrimaryButton
                    variant="ghost"
                    onClick={() => {
                      setConfirmingStartFresh(false);
                      startFreshOnboarding();
                    }}
                    className="w-full text-sm text-rose-600 dark:text-rose-400"
                  >
                    Continue
                  </PrimaryButton>
                </div>
              </div>
            </div>
          )}
        </GlassCard>
      </GlowBackground>
    );
  } else if (!user || showWelcomeOverride) {
    screenContent = <WelcomeScreen />;
  } else if (isEditingProfile || isShowingPlanReady || !isOnboardingComplete(profile)) {
    screenContent = <OnboardingScreen />;
  } else {
    screenContent = (
      <div className="min-h-dvh max-w-[460px] mx-auto px-4 pt-2 flex flex-col justify-between relative">
        {isOffline && (
          <div className="mb-2 px-3.5 py-2 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
            <div className="flex items-center gap-2">
              <WifiOff className="w-3.5 h-3.5 shrink-0" />
              <span>Offline mode — everything works locally</span>
            </div>
            <SyncStatus text="Saved on this device" done className="text-[11px]" />
          </div>
        )}

        <main className="flex-1">
          {activeTab === 'today' && <TodayScreen />}
          {activeTab === 'plan' && <PlanScreen />}
          {activeTab === 'care' && <CareScreen />}
          {activeTab === 'progress' && <ProgressScreen />}
          {activeTab === 'me' && <MeScreen />}
        </main>

        {/* Bottom Navigation Bar */}
        <nav
          aria-label="Primary Bottom Navigation"
          className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none"
        >
          <div className="max-w-[460px] mx-auto px-4 pb-4 pt-2 pointer-events-auto">
            <div className="glass-card p-1.5 rounded-[26px] flex items-center justify-around shadow-xl border border-white/90 dark:border-white/15">
              {[
                { id: 'today', label: 'Today', icon: Sun },
                { id: 'plan', label: 'Plan', icon: Calendar },
                { id: 'care', label: 'Care', icon: HeartHandshake },
                { id: 'progress', label: 'Progress', icon: BarChart3 },
                { id: 'me', label: 'Me', icon: User },
              ].map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id as any)}
                    className={`flex-1 py-2.5 rounded-[20px] flex flex-col items-center justify-center gap-1 transition-all duration-200 select-none ${
                      active
                        ? 'primary-gradient text-white shadow-md shadow-sky-500/25 scale-[1.02]'
                        : 'text-[var(--text-soft)] hover:text-[var(--text)]'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-[11px] font-display font-bold tracking-tight">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Modal Overlays */}
        {activeSession && <PlayerScreen />}
        {showPostureCheck && <PostureScreen />}
        {showWorkoutBuilder && <PlanWorkoutScreen />}
        {activeWorkoutDetail && <WorkoutDetailScreen />}
        {showPainCheckin && <PainCheckinScreen />}
      </div>
    );
  }

  return (
    <>
      <ToastBanner
        message={toastMessage?.text || null}
        type={toastMessage?.type}
        onDismiss={clearToast}
        onReportProblem={() => {
          clearToast();
          openReportSheet('Bug');
        }}
      />
      <ReportProblemSheet
        open={reportSheetState.open}
        onClose={closeReportSheet}
        defaultCategory={reportSheetState.defaultCategory}
        onSubmit={sendProblemReport}
      />
      {linkConflictDialog.open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="link-conflict-dialog-title"
          data-testid="link-conflict-dialog"
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <GlassCard className="max-w-md w-full p-6 space-y-4">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-300 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <p
              id="link-conflict-dialog-title"
              className="text-sm font-display font-bold text-[var(--text)] leading-relaxed"
            >
              This Google account already has an UnStill profile. Sign in to it? Your guest progress on this device will be exported as a JSON file first
            </p>
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <PrimaryButton
                variant="outline"
                onClick={cancelLinkConflictDialog}
                data-testid="link-conflict-cancel-btn"
                className="w-full text-sm"
              >
                Cancel
              </PrimaryButton>
              <PrimaryButton
                onClick={confirmLinkConflictSignIn}
                data-testid="link-conflict-signin-btn"
                className="w-full text-sm"
              >
                Sign in
              </PrimaryButton>
            </div>
          </GlassCard>
        </div>
      )}
      {splashVisible && (
        <SplashScreen
          status={splashStatus}
          fadingOut={splashFading}
          pace={cachedPace}
          onRetry={handleSplashRetry}
        />
      )}
      <div ref={mainRef} tabIndex={-1} className="outline-none">
        {!loading && (
          <>
            <UpdateAvailableBanner
              visible={shouldShowUpdateBanner}
              onUpdate={() => applyUpdateAndReload(waitingBuildId)}
              onDismiss={handleDismissUpdateBanner}
            />
            {screenContent}
          </>
        )}
      </div>
    </>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}

