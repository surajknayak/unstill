import React from 'react';
import { Leaf, RefreshCw } from 'lucide-react';
import { UnStillLogo, UnStillWordmark } from './ui';
import { Level } from '../types';
import { APP_VERSION, APP_TAGLINE, SPLASH_FADE_MS } from '../config';

interface SplashScreenProps {
  status: 'loading' | 'ready' | 'slow';
  fadingOut: boolean;
  pace?: Level | null;
  onRetry: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  status,
  fadingOut,
  pace,
  onRetry,
}) => {
  const paceLabel = pace ? `${pace} Pace` : 'Welcome';
  const isReady = status === 'ready';
  const isSlow = status === 'slow';

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        transitionDuration: `${SPLASH_FADE_MS}ms`,
      }}
      className={`fixed inset-0 z-50 flex flex-col justify-between px-6 py-8 select-none transition-opacity ease-out ${
        fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <span className="sr-only">
        {isReady ? 'Ready' : 'Loading UnStill'}
      </span>

      {/* Background gradient + soft aqua-to-mint glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden -z-10"
        style={{
          background:
            'linear-gradient(165deg, var(--bg-top) 0%, var(--bg-mid) 50%, var(--bg-bottom) 100%)',
        }}
      >
        <div
          className="absolute top-[12%] left-[10%] w-72 h-72 rounded-full blur-3xl opacity-30"
          style={{ background: 'var(--primary)' }}
        />
        <div
          className="absolute bottom-[18%] right-[8%] w-72 h-72 rounded-full blur-3xl opacity-30"
          style={{ background: 'var(--mint)' }}
        />
      </div>

      {/* Top row: Left DAILY VITALITY pill, Right Pace pill */}
      <div className="w-full max-w-[430px] mx-auto flex items-center justify-between pt-1">
        <div className="glass-card px-3.5 py-1.5 rounded-full inline-flex items-center gap-2 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-[#24B47E]" aria-hidden="true" />
          <span className="text-[12px] font-display font-bold uppercase tracking-[0.12em] text-[var(--text)]">
            DAILY VITALITY
          </span>
        </div>

        <div className="glass-card px-3.5 py-1.5 rounded-full inline-flex items-center gap-1.5 shadow-sm">
          <Leaf className="w-3.5 h-3.5 text-[#24B47E]" aria-hidden="true" />
          <span className="text-xs font-display font-bold text-[var(--text)]">
            {paceLabel}
          </span>
        </div>
      </div>

      {/* Centre content: vertically centred in viewport */}
      <div className="my-auto flex flex-col items-center text-center max-w-[360px] mx-auto w-full">
        <div className="mb-6">
          <UnStillLogo size={104} animateIntro />
        </div>

        <h1 className="font-display font-extrabold text-[44px] leading-[1.08] tracking-tight">
          <UnStillWordmark className="text-[44px]" />
        </h1>

        <p className="mt-2.5 text-[18px] font-medium text-[var(--text-soft)]">
          {APP_TAGLINE}
        </p>

        {/* Status chip */}
        <div className="mt-7 glass-card px-5 py-2.5 rounded-full inline-flex items-center gap-2.5 shadow-sm">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{
              backgroundColor: isReady ? '#24B47E' : isSlow ? '#FF7A59' : '#2EB8F5',
            }}
            aria-hidden="true"
          />
          <span className="text-sm font-display font-bold text-[var(--text)]">
            {isSlow
              ? 'Taking longer than usual.'
              : isReady
              ? 'Ready for your day'
              : 'Getting your day ready'}
          </span>
        </div>

        {isSlow && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-display font-bold primary-gradient text-white shadow-sm active:scale-95 transition-transform"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        )}

        {/* Feature pill row */}
        <div className="mt-3.5 glass-card px-4 py-2 rounded-full inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-soft)] shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-[#2EB8F5]" aria-hidden="true" />
          <span>Micro-resets</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#5EE6B0]" aria-hidden="true" />
          <span>Posture</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#2EB8F5]" aria-hidden="true" />
          <span>Mobility</span>
        </div>
      </div>

      {/* Bottom: 3 pulsing dots + version line */}
      <div className="w-full max-w-[430px] mx-auto flex flex-col items-center gap-2.5 pb-[env(safe-area-inset-bottom,8px)]">
        <div className="flex items-center gap-2" aria-hidden="true">
          <span
            className={`w-2 h-2 rounded-full bg-[#2EB8F5] ${
              isReady ? '' : 'splash-dot-1'
            }`}
          />
          <span
            className={`w-2 h-2 rounded-full bg-[#2EB8F5] ${
              isReady ? '' : 'splash-dot-2'
            }`}
          />
          <span
            className={`w-2 h-2 rounded-full bg-[#5EE6B0] ${
              isReady ? '' : 'splash-dot-3'
            }`}
          />
        </div>
        <p className="text-[12px] font-medium text-[var(--text-soft)]">
          {isReady
            ? `v${APP_VERSION} · Ready`
            : `v${APP_VERSION} · Getting your day ready...`}
        </p>
      </div>
    </div>
  );
};
