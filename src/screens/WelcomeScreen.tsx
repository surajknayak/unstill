import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  GlassCard,
  PrimaryButton,
  UnStillLogo,
  UnStillWordmark,
  GlowBackground,
  PrivacyPolicyContent,
} from '../components/ui';
import { ShieldCheck, ArrowRight, X } from 'lucide-react';
import { APP_TAGLINE } from '../config';

export const WelcomeScreen: React.FC = () => {
  const { signInWithGoogle, continueAsGuest } = useApp();
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  return (
    <GlowBackground className="min-h-dvh flex flex-col justify-between p-6 max-w-[430px] mx-auto">
      {/* Top spacer for generous vertical white space without scrolling on 360px phones */}
      <div aria-hidden="true" className="pt-2" />

      {/* Centred Brand Mark, Concentric Rings & Copy */}
      <div className="my-auto py-4 flex flex-col items-center text-center">
        <div className="relative flex items-center justify-center w-52 h-52 mb-3">
          {/* Faint concentric ring outlines behind the logo (sky at 8% to 12% opacity) */}
          <svg
            viewBox="0 0 208 208"
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 w-full h-full"
          >
            <circle
              cx="104"
              cy="104"
              r="64"
              fill="none"
              stroke="var(--primary)"
              strokeOpacity="0.12"
              strokeWidth="1.25"
            />
            <circle
              cx="104"
              cy="104"
              r="82"
              fill="none"
              stroke="var(--primary)"
              strokeOpacity="0.10"
              strokeWidth="1.25"
            />
            <circle
              cx="104"
              cy="104"
              r="100"
              fill="none"
              stroke="var(--primary)"
              strokeOpacity="0.08"
              strokeWidth="1.25"
            />
          </svg>

          <UnStillLogo size={96} animateAmbient className="relative z-10" />
        </div>

        <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-[var(--text)] leading-tight">
          <UnStillWordmark className="text-3xl sm:text-4xl" />
        </h1>
        <p className="text-base font-medium text-[var(--text-soft)] mt-2.5">
          {APP_TAGLINE}
        </p>
        <p className="text-xs font-medium text-[var(--text-soft)] opacity-85 mt-1.5 tracking-wide">
          Small moves. Steady days.
        </p>
      </div>

      {/* Actions */}
      <div className="space-y-3 pb-4">
        <PrimaryButton onClick={continueAsGuest} className="w-full text-lg">
          Start in 60 seconds <ArrowRight className="w-5 h-5" />
        </PrimaryButton>

        <PrimaryButton
          variant="outline"
          onClick={signInWithGoogle}
          className="w-full !bg-white !text-[#0F2A3A] hover:!bg-slate-50 border-2 border-sky-400/50 dark:border-sky-400/40 !gap-3 items-center justify-center"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="w-5 h-5 shrink-0"
          >
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span>Continue with Google</span>
        </PrimaryButton>

        <div className="pt-2 flex items-center justify-center gap-4 text-xs text-[var(--text-soft)]">
          <button
            type="button"
            onClick={() => setShowPrivacyModal(true)}
            className="underline hover:text-[var(--text)] flex items-center gap-1 font-semibold"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Safety & Privacy Notice
          </button>
        </div>
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
    </GlowBackground>
  );
};
