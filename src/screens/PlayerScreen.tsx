import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { GlassCard, PrimaryButton, ProgressRing } from '../components/ui';
import { MoveAnimation } from '../components/MoveAnimation';
import {
  X,
  Play,
  Pause,
  SkipForward,
  Volume2,
  VolumeX,
  Sparkles,
  Check,
  ShieldAlert,
  MessageSquareWarning,
} from 'lucide-react';
import movesData from '../data/moves.json';
import { MoveItem } from '../types';
import { CompleteScreen } from './CompleteScreen';

const moves: MoveItem[] = movesData as MoveItem[];

export const PlayerScreen: React.FC = () => {
  const {
    activeSession,
    closeSession,
    completeSession,
    submitSessionFeedback,
    profile,
    openReportSheet,
  } = useApp();

  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [useEasier, setUseEasier] = useState(false);
  const [soundOn, setSoundOn] = useState(profile?.soundHaptics ?? true);
  const [isFinished, setIsFinished] = useState(false);

  const sessionMoves: MoveItem[] = (activeSession?.moveIds || [])
    .map((id) => moves.find((m) => m.id === id))
    .filter(Boolean) as MoveItem[];

  const currentMove = sessionMoves[currentIdx] || moves[0];
  const initialDur = currentMove?.durationSec || 45;
  const [timeLeft, setTimeLeft] = useState(initialDur);

  useEffect(() => {
    if (!activeSession) return;
    setTimeLeft(currentMove?.durationSec || 45);
    setUseEasier(false);
  }, [currentIdx, currentMove?.id, activeSession?.title]);

  useEffect(() => {
    if (!activeSession || !isPlaying || isFinished) return;
    const timer = window.setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [activeSession, isPlaying, isFinished]);

  useEffect(() => {
    if (!activeSession || !isPlaying || isFinished || timeLeft > 0) return;

    if (soundOn && 'vibrate' in navigator) {
      try {
        navigator.vibrate(50);
      } catch {
        // ignore vibration errors
      }
    }

    if (currentIdx < sessionMoves.length - 1) {
      const nextDur = sessionMoves[currentIdx + 1]?.durationSec || 45;
      setCurrentIdx((i) => i + 1);
      setTimeLeft(nextDur);
    } else {
      const totalDuration = sessionMoves.reduce((acc, m) => acc + m.durationSec, 0);
      setIsFinished(true);
      completeSession(totalDuration);
    }
  }, [timeLeft, activeSession, isPlaying, isFinished, soundOn, currentIdx, sessionMoves, completeSession]);

  if (!activeSession) return null;

  if (isFinished) {
    const totalDuration = sessionMoves.reduce((acc, m) => acc + m.durationSec, 0);
    return (
      <CompleteScreen
        title={activeSession.title}
        durationSec={totalDuration}
        onDone={(feedback, hurtArea) =>
          submitSessionFeedback(feedback, hurtArea, currentMove?.id)
        }
      />
    );
  }

  const progress =
    currentMove.durationSec > 0
      ? (currentMove.durationSec - timeLeft) / currentMove.durationSec
      : 0;

  return (
    <div className="fixed inset-0 z-50 bg-[var(--bg-mid)] flex flex-col justify-between p-5 max-w-[430px] mx-auto overflow-y-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={closeSession}
          aria-label="Close session"
          className="w-10 h-10 rounded-2xl bg-white/85 dark:bg-[#162636] flex items-center justify-center text-[var(--text)] shadow-sm"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#0A5C80] dark:text-[#7CD6FF]">
            Move {currentIdx + 1} of {sessionMoves.length}
          </div>
          <div className="font-display font-bold text-sm text-[var(--text)] truncate max-w-[200px]">
            {activeSession.title}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setSoundOn(!soundOn)}
          aria-label={soundOn ? 'Mute sound and haptics' : 'Unmute sound and haptics'}
          className="w-10 h-10 rounded-2xl bg-white/85 dark:bg-[#162636] flex items-center justify-center text-[var(--text)] shadow-sm"
        >
          {soundOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
      </div>

      {/* Step Progress Segments: white track + mint-green fill */}
      <div className="flex gap-1.5 my-2">
        {sessionMoves.map((m, idx) => (
          <div
            key={`${m.id}-${idx}`}
            className="h-2 flex-1 rounded-full bg-white/90 dark:bg-white/15 border border-slate-200/70 dark:border-white/10 overflow-hidden"
          >
            {(idx < currentIdx || idx === currentIdx) && (
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: idx < currentIdx ? '100%' : `${Math.round(progress * 100)}%`,
                  background: 'linear-gradient(90deg, #5EE6B0 0%, #24B47E 100%)',
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Main Move Stage & Timer */}
      <div className="my-auto flex flex-col items-center text-center space-y-4 py-2">
        {/* Section 6: Animated SVG move demonstration (min 220px tall, tap to pause/play) */}
        <MoveAnimation moveId={currentMove.id} height={220} interactive />

        <div className="flex items-center justify-between w-full px-1 gap-3">
          <div className="text-left flex-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
              {currentMove.position} · {currentMove.targetAreas.join(' & ')}
            </span>
            <h2 className="text-xl font-display font-extrabold text-[var(--text)] mt-1">
              {currentMove.name}
            </h2>
          </div>

          <ProgressRing progress={progress} size={86} strokeWidth={8} color="#5EE6B0">
            <div className="text-center">
              <div className="text-xl font-display font-extrabold text-[var(--text)] tabular-nums">
                {timeLeft}s
              </div>
            </div>
          </ProgressRing>
        </div>

        {/* Cues & Breathing */}
        <GlassCard className="w-full text-left p-4 space-y-2.5">
          {useEasier ? (
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-start gap-2">
              <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>Easier Variant:</strong> {currentMove.easierVariant}
              </span>
            </div>
          ) : (
            <ul className="space-y-1.5 text-xs text-[var(--text)] font-medium">
              {currentMove.cues.map((cue, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-sky-500 shrink-0 mt-0.5" />
                  <span>{cue}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-[11px]">
            <span className="text-[#0A5C80] dark:text-[#7CD6FF] font-bold">
              Breathing: {currentMove.breathingCue}
            </span>
            <button
              type="button"
              onClick={() => setUseEasier(!useEasier)}
              className="underline font-bold text-emerald-700 dark:text-emerald-400"
            >
              {useEasier ? 'Standard cues' : 'Make it easier'}
            </button>
          </div>
        </GlassCard>

        {/* Section 3.6 & 10.2: Single short red-flag reminder inside active exercise session + Report link */}
        <div className="w-full flex items-center justify-between gap-2 px-2 text-[11px] text-[var(--text-soft)]">
          <span className="inline-flex items-center gap-1 text-left">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            Stop if you feel sharp pain, dizziness, or numbness.
          </span>
          <button
            type="button"
            onClick={() => openReportSheet('Wrong plan or exercise')}
            className="shrink-0 inline-flex items-center gap-1 font-bold text-[#0A5C80] dark:text-[#7CD6FF] hover:underline"
          >
            <MessageSquareWarning className="w-3.5 h-3.5" /> Report
          </button>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="flex items-center gap-3 pb-3">
        <PrimaryButton
          variant="outline"
          onClick={() => setIsPlaying(!isPlaying)}
          className="flex-1"
        >
          {isPlaying ? (
            <>
              <Pause className="w-5 h-5" /> Pause
            </>
          ) : (
            <>
              <Play className="w-5 h-5" /> Resume
            </>
          )}
        </PrimaryButton>

        <PrimaryButton
          onClick={() => {
            if (currentIdx < sessionMoves.length - 1) {
              setCurrentIdx((i) => i + 1);
            } else {
              const totalDuration = sessionMoves.reduce((acc, m) => acc + m.durationSec, 0);
              completeSession(totalDuration);
              setIsFinished(true);
            }
          }}
          className="flex-1"
        >
          {currentIdx < sessionMoves.length - 1 ? (
            <>
              Next Move <SkipForward className="w-5 h-5" />
            </>
          ) : (
            <>
              Finish <Check className="w-5 h-5" />
            </>
          )}
        </PrimaryButton>
      </div>
    </div>
  );
};
