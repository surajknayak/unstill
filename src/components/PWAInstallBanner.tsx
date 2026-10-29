import React, { useState, useEffect } from 'react';
import { Download, X, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { GlassCard, PrimaryButton, UnStillLogo } from './ui';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

type BrowserPlatform =
  | 'ios-safari'
  | 'ipad-safari'
  | 'ios-other'
  | 'android-chrome'
  | 'desktop-chrome-edge'
  | 'desktop-safari'
  | 'other';

function detectBrowserPlatform(): BrowserPlatform {
  if (typeof window === 'undefined') return 'other';
  const ua = window.navigator.userAgent;
  const isIPad =
    /iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isIPhone = /iPhone|iPod/.test(ua);
  const isIOS = isIPad || isIPhone;
  const isCriOS = /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  const isAndroid = /Android/.test(ua);
  const isSafari = /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(ua);

  if (isIPad) return isCriOS ? 'ios-other' : 'ipad-safari';
  if (isIPhone) return isCriOS ? 'ios-other' : 'ios-safari';
  if (isAndroid) return 'android-chrome';
  if (isSafari) return 'desktop-safari';
  return 'desktop-chrome-edge';
}

const ShareIconSvg: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 3v12" />
    <path d="m8 7 4-4 4 4" />
    <rect x="4" y="11" width="16" height="10" rx="2.5" />
  </svg>
);

const MoreDotsSvg: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <circle cx="12" cy="5" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="12" cy="19" r="2" />
  </svg>
);

export const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem('unstill_install_done') === '1';
    } catch {
      return false;
    }
  });
  const [isStandalone, setIsStandalone] = useState(false);
  const [platform, setPlatform] = useState<BrowserPlatform>('other');
  const [showWhere, setShowWhere] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);
    setPlatform(detectBrowserPlatform());

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const installedHandler = () => {
      setIsStandalone(true);
      try {
        localStorage.setItem('unstill_install_done', '1');
      } catch {}
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  if (isStandalone || dismissed) return null;

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      markDone();
    }
  };

  const markDone = () => {
    try {
      localStorage.setItem('unstill_install_done', '1');
    } catch {}
    setDismissed(true);
  };

  return (
    <GlassCard className="p-4 border-sky-200 dark:border-sky-500/30 bg-gradient-to-r from-sky-500/10 to-emerald-500/10 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <UnStillLogo size={42} />
          <div>
            <h4 className="font-display font-bold text-sm text-[var(--text)]">
              Install UnStill on your screen
            </h4>
            <p className="text-xs text-[var(--text-soft)] mt-0.5 leading-relaxed">
              One-tap access, full-screen timer, and offline support.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Hide install card for now"
          className="p-1.5 text-[var(--text-soft)] hover:text-[var(--text)]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Native 1-tap install when browser supports beforeinstallprompt */}
      {deferredPrompt ? (
        <div className="flex items-center gap-2">
          <PrimaryButton
            onClick={handleInstall}
            className="flex-1 min-h-[42px] py-2 text-xs rounded-xl"
          >
            <Download className="w-3.5 h-3.5" /> Install UnStill
          </PrimaryButton>
          <button
            type="button"
            onClick={markDone}
            className="px-3 py-2 rounded-xl text-xs font-bold text-[var(--text-soft)] hover:text-[var(--text)]"
          >
            Done
          </button>
        </div>
      ) : (
        <div className="space-y-2.5 text-xs text-[var(--text)]">
          {platform === 'ios-safari' && (
            <ol className="space-y-1.5 list-decimal list-inside text-[var(--text-soft)] font-medium">
              <li>
                Tap the <strong className="text-[var(--text)]">Share</strong> button{' '}
                <span className="inline-flex items-center align-middle px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-600 dark:text-sky-300">
                  <ShareIconSvg className="w-3.5 h-3.5" />
                </span>{' '}
                at the bottom of Safari.
              </li>
              <li>
                Scroll down the sheet and tap{' '}
                <strong className="text-[var(--text)]">Add to Home Screen</strong>.
              </li>
              <li>
                Tap <strong className="text-[var(--text)]">Add</strong> in the top-right corner.
              </li>
            </ol>
          )}

          {platform === 'ipad-safari' && (
            <ol className="space-y-1.5 list-decimal list-inside text-[var(--text-soft)] font-medium">
              <li>
                Tap the <strong className="text-[var(--text)]">Share</strong> icon{' '}
                <span className="inline-flex items-center align-middle px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-600 dark:text-sky-300">
                  <ShareIconSvg className="w-3.5 h-3.5" />
                </span>{' '}
                at the <strong className="text-[var(--text)]">top-right</strong> of Safari&apos;s toolbar.
              </li>
              <li>
                Choose <strong className="text-[var(--text)]">Add to Home Screen</strong>, then tap{' '}
                <strong className="text-[var(--text)]">Add</strong>.
              </li>
            </ol>
          )}

          {platform === 'ios-other' && (
            <ol className="space-y-1.5 list-decimal list-inside text-[var(--text-soft)] font-medium">
              <li>
                Tap the <strong className="text-[var(--text)]">Share</strong> icon{' '}
                <span className="inline-flex items-center align-middle px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-600 dark:text-sky-300">
                  <ShareIconSvg className="w-3.5 h-3.5" />
                </span>{' '}
                in the address bar (or open this page in <strong className="text-[var(--text)]">Safari</strong>).
              </li>
              <li>
                Tap <strong className="text-[var(--text)]">Add to Home Screen</strong>, then tap{' '}
                <strong className="text-[var(--text)]">Add</strong>.
              </li>
            </ol>
          )}

          {platform === 'android-chrome' && (
            <ol className="space-y-1.5 list-decimal list-inside text-[var(--text-soft)] font-medium">
              <li>
                Tap the <strong className="text-[var(--text)]">three-dots menu</strong>{' '}
                <span className="inline-flex items-center align-middle px-1 py-0.5 rounded bg-sky-500/15 text-sky-600 dark:text-sky-300">
                  <MoreDotsSvg className="w-3.5 h-3.5" />
                </span>{' '}
                in the top-right of your browser.
              </li>
              <li>
                Tap <strong className="text-[var(--text)]">Install app</strong> or{' '}
                <strong className="text-[var(--text)]">Add to Home screen</strong>.
              </li>
            </ol>
          )}

          {(platform === 'desktop-chrome-edge' || platform === 'other') && (
            <ol className="space-y-1.5 list-decimal list-inside text-[var(--text-soft)] font-medium">
              <li>
                Click the <strong className="text-[var(--text)]">Install icon</strong> (computer with
                down arrow) on the right side of your address bar, or open the{' '}
                <strong className="text-[var(--text)]">⋮ browser menu</strong>.
              </li>
              <li>
                Choose <strong className="text-[var(--text)]">Install UnStill</strong>.
              </li>
            </ol>
          )}

          {platform === 'desktop-safari' && (
            <ol className="space-y-1.5 list-decimal list-inside text-[var(--text-soft)] font-medium">
              <li>
                In the top Mac menu bar, click <strong className="text-[var(--text)]">File</strong>{' '}
                &rarr; <strong className="text-[var(--text)]">Add to Dock...</strong>
              </li>
              <li>
                Click <strong className="text-[var(--text)]">Add</strong> to keep UnStill in your Dock.
              </li>
            </ol>
          )}

          {/* Show me where toggle + Done button */}
          <div className="flex items-center justify-between pt-1 gap-2">
            <button
              type="button"
              onClick={() => setShowWhere((s) => !s)}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#0A5C80] dark:text-[#7CD6FF] hover:underline"
            >
              {showWhere ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showWhere ? 'Hide visual guide' : 'Show me where'}
            </button>

            <button
              type="button"
              onClick={markDone}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/85 dark:bg-[#162636] border border-slate-200/80 dark:border-white/15 text-xs font-bold text-[var(--text)]"
            >
              <Check className="w-3.5 h-3.5 text-emerald-500" /> Done, I added it
            </button>
          </div>

          {showWhere && (
            <div className="p-3 rounded-2xl bg-white/90 dark:bg-[#0F1B26] border border-sky-200/70 dark:border-white/10">
              <svg viewBox="0 0 280 96" className="w-full h-24" fill="none">
                {platform === 'ios-safari' ? (
                  <>
                    <text x="140" y="20" textAnchor="middle" fill="#4F6B7A" fontSize="10" fontWeight="700">
                      Bottom of iPhone Safari screen
                    </text>
                    <rect x="20" y="34" width="240" height="44" rx="14" fill="#0F2A3A" />
                    <path d="M52 56 L60 48 M52 56 L60 64" stroke="#94A3B8" strokeWidth="2.2" strokeLinecap="round" />
                    <path d="M96 56 L88 48 M96 56 L88 64" stroke="#94A3B8" strokeWidth="2.2" strokeLinecap="round" />
                    {/* Highlighted Share button */}
                    <circle cx="140" cy="56" r="18" fill="#2EB8F5" />
                    <path d="M140 46 v10 M136 50 l4-4 4 4" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <rect x="133" y="54" width="14" height="10" rx="2" stroke="#FFFFFF" strokeWidth="2" />
                    <rect x="182" y="49" width="14" height="14" rx="3" stroke="#94A3B8" strokeWidth="2" />
                    <circle cx="226" cy="56" r="7" stroke="#94A3B8" strokeWidth="2" />
                  </>
                ) : (
                  <>
                    <text x="140" y="20" textAnchor="middle" fill="#4F6B7A" fontSize="10" fontWeight="700">
                      Top-right of your browser bar
                    </text>
                    <rect x="20" y="34" width="240" height="44" rx="14" fill="#0F2A3A" />
                    <rect x="34" y="44" width="150" height="24" rx="12" fill="#1E293B" />
                    <text x="50" y="59" fill="#94A3B8" fontSize="10" fontWeight="600">
                      unstill.app
                    </text>
                    {/* Highlighted Install / Menu button */}
                    <circle cx="228" cy="56" r="16" fill="#2EB8F5" />
                    <circle cx="228" cy="50" r="1.8" fill="#FFFFFF" />
                    <circle cx="228" cy="56" r="1.8" fill="#FFFFFF" />
                    <circle cx="228" cy="62" r="1.8" fill="#FFFFFF" />
                  </>
                )}
              </svg>
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
};
