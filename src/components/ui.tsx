import React, { useId, useState } from 'react';
import { Flame, Check, AlertCircle, X, MessageSquareWarning } from 'lucide-react';
import { ReportCategory } from '../types';

export const GlowBackground: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div className={`relative overflow-hidden ${className}`}>
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden z-0"
    >
      <div
        className="absolute -top-24 -left-24 w-80 h-80 rounded-full blur-3xl opacity-20"
        style={{ background: 'var(--primary)' }}
      />
      <div
        className="absolute top-1/3 -right-24 w-80 h-80 rounded-full blur-3xl opacity-20"
        style={{ background: 'var(--mint)' }}
      />
      <div
        className="absolute -bottom-24 left-1/4 w-72 h-72 rounded-full blur-3xl opacity-20"
        style={{ background: 'var(--lavender)' }}
      />
    </div>
    <div className="relative z-10">{children}</div>
  </div>
);

export const SyncStatus: React.FC<{
  text: string;
  done?: boolean;
  className?: string;
}> = ({ text, done = false, className = '' }) => (
  <div className={`inline-flex items-center gap-2 ${className}`}>
    <span className="inline-flex items-center gap-1" aria-hidden="true">
      <span
        className={`w-1.5 h-1.5 rounded-full ${done ? '' : 'splash-dot-1'}`}
        style={{ backgroundColor: done ? '#24B47E' : '#2EB8F5' }}
      />
      <span
        className={`w-1.5 h-1.5 rounded-full ${done ? '' : 'splash-dot-2'}`}
        style={{ backgroundColor: done ? '#24B47E' : '#2EB8F5' }}
      />
      <span
        className={`w-1.5 h-1.5 rounded-full ${done ? '' : 'splash-dot-3'}`}
        style={{ backgroundColor: '#5EE6B0' }}
      />
    </span>
    <span>{text}</span>
  </div>
);

export const GlassCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}> = ({ children, className = '', onClick }) => (
  <div
    onClick={onClick}
    className={`glass-card p-5 transition-all duration-200 ${
      onClick ? 'cursor-pointer active:scale-[0.99] hover:shadow-lg' : ''
    } ${className}`}
  >
    {children}
  </div>
);

export const PrimaryButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  variant?: 'sky' | 'mint' | 'sun' | 'ghost' | 'outline';
  type?: 'button' | 'submit';
}> = ({ children, onClick, disabled, className = '', variant = 'sky', type = 'button' }) => {
  const base =
    'min-h-[54px] px-6 rounded-[20px] font-display font-bold text-base flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none';
  const variants = {
    sky: 'primary-gradient text-white shadow-md shadow-sky-500/20 hover:brightness-105',
    mint: 'mint-gradient text-white shadow-md shadow-emerald-500/20 hover:brightness-105',
    sun: 'sun-gradient text-slate-900 shadow-md shadow-amber-500/20 hover:brightness-105',
    outline:
      'bg-white/80 dark:bg-[#162636] border-2 border-sky-400/50 dark:border-sky-400/40 text-[#0A5C80] dark:text-[#7CD6FF] hover:bg-sky-50/50',
    ghost:
      'bg-slate-500/10 dark:bg-white/10 text-[var(--text)] hover:bg-slate-500/15',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

export const Chip: React.FC<{
  label: string;
  selected?: boolean;
  onClick?: () => void;
  icon?: React.ReactNode;
  color?: 'sky' | 'mint' | 'lavender' | 'coral' | 'sun';
  className?: string;
}> = ({ label, selected, onClick, icon, color = 'sky', className = '' }) => {
  const activeColors = {
    sky: 'bg-sky-500 text-white border-sky-500 shadow-sm shadow-sky-500/25',
    mint: 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/25',
    lavender: 'bg-purple-500 text-white border-purple-500 shadow-sm shadow-purple-500/25',
    coral: 'bg-orange-500 text-white border-orange-500 shadow-sm shadow-orange-500/25',
    sun: 'bg-amber-400 text-slate-900 border-amber-400 shadow-sm shadow-amber-400/25',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[42px] px-4 py-2 rounded-2xl text-sm font-semibold border transition-all duration-150 flex items-center gap-2 select-none ${
        selected
          ? activeColors[color]
          : 'bg-white/85 dark:bg-[#162636]/90 border-slate-200/80 dark:border-white/15 text-[var(--text)] hover:border-sky-300'
      } ${className}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
};

export const ProgressRing: React.FC<{
  progress: number; // 0 to 1
  size?: number;
  strokeWidth?: number;
  color?: string;
  children?: React.ReactNode;
}> = ({ progress, size = 120, strokeWidth = 10, color = '#5EE6B0', children }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const clamped = Math.min(1, Math.max(0, progress));
  const offset = circumference - clamped * circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        {/* Track is always crisp white/light */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="rgba(255, 255, 255, 0.85)"
          strokeWidth={strokeWidth}
          className="dark:stroke-white/20"
        />
        {clamped > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
};

export const StatTile: React.FC<{
  label: string;
  value: string | number;
  sublabel?: string;
  icon: React.ReactNode;
  accentColor?: string;
  progress?: number; // 0 to 1
  onClick?: () => void;
}> = ({ label, value, sublabel, icon, accentColor = 'bg-sky-500/15 text-sky-600', progress, onClick }) => {
  const pct = typeof progress === 'number' ? Math.min(100, Math.max(0, Math.round(progress * 100))) : null;

  return (
    <GlassCard onClick={onClick} className="p-4 flex flex-col justify-between gap-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-soft)]">
          {label}
        </span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accentColor}`}>
          {icon}
        </div>
      </div>
      <div>
        <div className="text-2xl font-display font-extrabold text-[var(--text)]">{value}</div>
        {sublabel && (
          <div className="text-xs text-[var(--text-soft)] font-medium mt-0.5">{sublabel}</div>
        )}
      </div>
      {pct !== null && (
        <div className="w-full h-2.5 rounded-full bg-white/95 dark:bg-white/15 border border-slate-200/80 dark:border-white/10 overflow-hidden">
          {pct > 0 && (
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${pct}%`,
                background: 'linear-gradient(90deg, #5EE6B0 0%, #24B47E 100%)',
              }}
            />
          )}
        </div>
      )}
    </GlassCard>
  );
};

/**
 * UnStill Logo Tile:
 * Rounded square with sky-to-aqua gradient (--aqua to --primary),
 * two concentric open white rings rotated so their gaps do not align,
 * round caps, stroke width >= 6% of tile, and a mint dot (--mint) in the outer ring gap.
 */
export const UnStillLogo: React.FC<{
  size?: number;
  animateIntro?: boolean;
  animateAmbient?: boolean;
  className?: string;
}> = ({ size = 40, animateIntro = false, animateAmbient = false, className = '' }) => {
  const gradId = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 104 104"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 shadow-sm shadow-sky-500/20 rounded-[24%] ${
        animateAmbient ? 'animate-hero-breathe' : ''
      } ${className}`}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="104" y2="104" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--aqua)" />
          <stop offset="100%" stopColor="var(--primary)" />
        </linearGradient>
      </defs>
      <rect width="104" height="104" rx="26" fill={`url(#${gradId})`} />
      <g
        className={
          animateAmbient
            ? 'animate-unstill-ring-spin'
            : animateIntro
            ? 'animate-unstill-ring-intro'
            : ''
        }
      >
        {/* Outer open white ring */}
        <circle
          cx="52"
          cy="52"
          r="30"
          stroke="#FFFFFF"
          strokeWidth="7.2"
          strokeLinecap="round"
          strokeDasharray="148 190"
          transform="rotate(20 52 52)"
        />
        {/* Inner open white ring rotated so gaps do not line up */}
        <circle
          cx="52"
          cy="52"
          r="17.5"
          stroke="#FFFFFF"
          strokeWidth="6.8"
          strokeLinecap="round"
          strokeDasharray="83 112"
          transform="rotate(200 52 52)"
        />
        {/* Small mint dot sitting in the gap of the outer ring */}
        <circle cx="74" cy="31" r="4.6" fill="var(--mint)" />
      </g>
    </svg>
  );
};

// Backwards-compatible alias so any existing import continues working
export const HabitFlowLogo = UnStillLogo;

export const UnStillWordmark: React.FC<{
  className?: string;
}> = ({ className = 'text-2xl' }) => (
  <span className={`font-display font-extrabold tracking-tight ${className}`}>
    <span className="bg-gradient-to-r from-[var(--lavender)] to-[var(--primary)] bg-clip-text text-transparent">
      Un
    </span>
    <span className="text-[var(--text)]">Still</span>
  </span>
);

export const TabHeader: React.FC<{
  title: string;
  subtitle?: string;
  streak?: number;
  rightAction?: React.ReactNode;
}> = ({ title, subtitle, streak, rightAction }) => (
  <header
    className="flex flex-col gap-2 pt-3 pb-3 px-4 -mx-4 sticky top-0 z-20 backdrop-blur-md transition-colors"
    style={{ backgroundColor: 'var(--header-bg)' }}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <UnStillLogo size={36} />
        <span className="font-display font-extrabold text-xs uppercase tracking-[0.18em] text-[var(--text)]">
          UNSTILL
        </span>
      </div>
      <div className="flex items-center gap-2">
        {typeof streak === 'number' && (
          <div
            className="flex items-center gap-1.5 bg-white dark:bg-[#162636] border border-slate-200/90 dark:border-white/20 px-3.5 py-1.5 rounded-2xl shadow-sm"
            title="Current gentle streak"
          >
            <Flame className="w-4 h-4 text-[#FF7A59] fill-[#FF7A59]" />
            <span className="font-display font-extrabold text-sm text-[#0F2A3A] dark:text-white">
              {streak}
            </span>
          </div>
        )}
        {rightAction}
      </div>
    </div>
    <div>
      <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-[var(--text)] tracking-tight">
        {title}
      </h1>
      {subtitle && (
        <p className="text-sm text-[var(--text-soft)] font-medium mt-0.5">{subtitle}</p>
      )}
    </div>
  </header>
);

export const ToastBanner: React.FC<{
  message: string | null;
  type?: 'info' | 'error' | 'success';
  onDismiss?: () => void;
  onReportProblem?: () => void;
}> = ({ message, type = 'info', onDismiss, onReportProblem }) => {
  if (!message) return null;

  const isStatusToast =
    message.startsWith('Saving') ||
    message.startsWith('Saved on this device') ||
    message.startsWith('Synced');

  const isDoneStatus =
    message.startsWith('Saved on this device') || message.startsWith('Synced');

  const styles = {
    info: 'bg-slate-900/95 dark:bg-[#162636]/95 text-white border-white/15',
    error: 'bg-rose-600/95 text-white border-rose-400/30',
    success: 'bg-emerald-600/95 text-white border-emerald-400/30',
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md animate-in fade-in slide-in-from-top-3 duration-200">
      <div
        className={`relative overflow-hidden px-4 py-3 rounded-2xl shadow-xl border backdrop-blur-md flex items-center justify-between gap-3 text-xs font-semibold ${styles[type]}`}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-6 -top-6 w-24 h-24 rounded-full blur-xl opacity-25"
          style={{ background: 'var(--primary)' }}
        />
        <div className="relative z-10 flex items-center gap-2.5 flex-1">
          {isStatusToast ? (
            <SyncStatus text={message} done={isDoneStatus} />
          ) : (
            <>
              {type === 'error' ? (
                <AlertCircle className="w-4 h-4 shrink-0" />
              ) : (
                <Check className="w-4 h-4 shrink-0" />
              )}
              <span className="leading-snug">{message}</span>
            </>
          )}
        </div>
        <div className="relative z-10 flex items-center gap-2 shrink-0">
          {type === 'error' && onReportProblem && (
            <button
              type="button"
              onClick={onReportProblem}
              className="underline font-bold text-white/95 hover:text-white"
            >
              Report a problem
            </button>
          )}
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="text-white/80 hover:text-white font-bold px-1.5 py-0.5 rounded-lg"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Plain-language Privacy Policy & Safety Notice (Section 10.1 & 3.6)
 * No code snippets or database rule syntax anywhere.
 */
export const PrivacyPolicyContent: React.FC = () => (
  <div className="space-y-4 text-xs text-[var(--text-soft)] leading-relaxed">
    <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-[var(--text)]">
      <p className="font-bold text-sm">Short Health & Safety Notice</p>
      <p className="mt-1 text-xs text-[var(--text-soft)]">
        UnStill offers general movement, posture, and wellness guidance, not medical diagnosis or
        treatment. Move within a comfortable range and stop immediately if you feel sharp pain,
        dizziness, numbness, tingling, or chest discomfort.
      </p>
    </div>

    <div>
      <h4 className="font-bold text-[var(--text)] text-sm">1. What UnStill does</h4>
      <p className="mt-0.5">
        UnStill helps you build a gentle daily movement habit with 2 to 5 minute movement resets,
        posture check-ins, and personalized joint care routines.
      </p>
    </div>

    <div>
      <h4 className="font-bold text-[var(--text)] text-sm">2. Information you give us</h4>
      <p className="mt-0.5">
        You can share your optional first name, age range, time zone, daily work hours, comfort or
        stiffness ratings (0 to 10), and session feedback so the app can tailor your daily plan.
      </p>
    </div>

    <div>
      <h4 className="font-bold text-[var(--text)] text-sm">3. Information collected automatically</h4>
      <p className="mt-0.5">
        We store basic app settings (like light or dark theme and reminder preferences) and, if you
        sign in with Google, your basic account identifier so your plan stays in sync.
      </p>
    </div>

    <div>
      <h4 className="font-bold text-[var(--text)] text-sm">4. Where your data is stored</h4>
      <p className="mt-0.5">
        Your plan and logs are saved first on your own device (using browser storage and IndexedDB)
        so the app works offline. If you sign in, a copy is securely synced to Google Firebase
        Firestore so you do not lose your progress.
      </p>
    </div>

    <div>
      <h4 className="font-bold text-[var(--text)] text-sm">5. Who can see your data</h4>
      <p className="mt-0.5">
        Only you can view or edit your personal profile, plans, and check-ins. We do not sell,
        rent, or share your personal or health data with advertisers or third parties.
      </p>
    </div>

    <div>
      <h4 className="font-bold text-[var(--text)] text-sm">6. How to export or delete your data</h4>
      <p className="mt-0.5">
        Open the <strong>Me</strong> tab at any time to download a complete JSON copy of your data
        (<strong>Export my data</strong>) or permanently erase your local and cloud records (
        <strong>Delete all data</strong>).
      </p>
    </div>

    <div>
      <h4 className="font-bold text-[var(--text)] text-sm">7. Health disclaimer</h4>
      <p className="mt-0.5">
        UnStill is for everyday movement and wellness only and does not replace advice from a
        qualified doctor or physiotherapist.
      </p>
    </div>

    <div>
      <h4 className="font-bold text-[var(--text)] text-sm">8. How to contact us or report a problem</h4>
      <p className="mt-0.5">
        Use <strong>Report a problem or suggest an idea</strong> in the <strong>Me</strong> tab (or
        inside any session) to send feedback directly to the UnStill team.
      </p>
    </div>

    <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 text-[11px] font-semibold text-[var(--text-soft)]">
      Last updated: October 2026
    </div>
  </div>
);

export const ReportProblemSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  defaultCategory?: ReportCategory;
  onSubmit: (category: ReportCategory, message: string) => Promise<void>;
}> = ({ open, onClose, defaultCategory = 'Bug', onSubmit }) => {
  const [category, setCategory] = useState<ReportCategory>(defaultCategory);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const categories: ReportCategory[] = [
    'Bug',
    'Wrong plan or exercise',
    'Safety concern',
    'Idea',
  ];

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setError('Please enter a short note before sending.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(category, message.trim().slice(0, 500));
      setMessage('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <GlassCard className="w-full max-w-md p-6 space-y-4 animate-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquareWarning className="w-5 h-5 text-sky-500" />
            <h3 className="text-lg font-display font-extrabold text-[var(--text)]">
              Report a problem or idea
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-500/10 flex items-center justify-center text-[var(--text-soft)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-soft)] block mb-2">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <Chip
                  key={c}
                  label={c}
                  selected={category === c}
                  onClick={() => setCategory(c)}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-soft)]">
                What happened or what would help?
              </label>
              <span className="text-[11px] font-semibold text-[var(--text-soft)]">
                {message.length}/500
              </span>
            </div>
            <textarea
              rows={4}
              maxLength={500}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what went wrong, which move felt off, or an idea to make UnStill better..."
              className="w-full p-3.5 rounded-2xl bg-white/90 dark:bg-[#0F1B26] border border-slate-200 dark:border-white/15 text-sm text-[var(--text)] focus:outline-none focus:border-sky-400"
            />
          </div>

          {error && <p className="text-xs font-semibold text-rose-500">{error}</p>}

          <div className="flex gap-2">
            <PrimaryButton
              variant="ghost"
              onClick={onClose}
              className="flex-1 min-h-[48px] text-sm"
            >
              Cancel
            </PrimaryButton>
            <PrimaryButton
              type="submit"
              disabled={submitting || !message.trim()}
              className="flex-1 min-h-[48px] text-sm"
            >
              {submitting ? 'Sending...' : 'Send'}
            </PrimaryButton>
          </div>
        </form>
      </GlassCard>
    </div>
  );
};
