'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { PlayerStats, DailyState, AttemptResult, Puzzle } from '@/types/game';
import {
  loadStats,
  saveStats,
  loadDailyState,
  saveDailyState,
  setLastSeen,
  cleanOldDailyStates,
  defaultStats,
  updateStatsAfterGame,
} from '@/utils/storage';
import { todayDateStr, dateToSeed } from '@/utils/dailySeed';
import { generateDailyPuzzle, generatePuzzle } from '@/utils/puzzleGenerator';
import { logEvent, setScreen as setAnalyticsScreen } from '@/utils/analytics';
import { fetchRemoteConfig } from '@/utils/remoteConfig';
import Lobby from '@/components/Lobby';
import Game from '@/components/Game';
import DebugPanel from '@/components/DebugPanel';

type Screen = 'lobby' | 'game' | 'loading';

export default function Home() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [stats, setStats] = useState<PlayerStats>(defaultStats());
  const [dailyState, setDailyState] = useState<DailyState | null>(null);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [currentSeed, setCurrentSeed] = useState(0);
  const [debugSolutionStep, setDebugSolutionStep] = useState<number | null>(null);
  const seedRef = useRef(0);

  useEffect(() => {
    fetchRemoteConfig();

    const today = todayDateStr();
    setLastSeen(today);
    cleanOldDailyStates(today);

    const loadedStats = loadStats();
    setStats(loadedStats);

    const baseSeed = dateToSeed(today);
    setCurrentSeed(baseSeed);
    seedRef.current = baseSeed;

    const existingDaily = loadDailyState(today);
    if (existingDaily && existingDaily.attemptHistory.length > 0) {
      setDailyState(existingDaily);
      setPuzzle(existingDaily.puzzle);
      setScreen('lobby');
      setAnalyticsScreen('lobby');
      return;
    }

    try {
      const newPuzzle = generateDailyPuzzle(today);
      const newDaily: DailyState = {
        puzzleNumber: newPuzzle.puzzleNumber,
        date: today,
        puzzle: newPuzzle,
        attemptHistory: [],
        currentAttempt: 1,
        completed: false,
        won: false,
      };
      saveDailyState(newDaily);
      setDailyState(newDaily);
      setPuzzle(newPuzzle);
      setScreen('lobby');
      setAnalyticsScreen('lobby');
    } catch {
      setError('Could not generate today\'s puzzle. Please refresh the page.');
      setScreen('lobby');
    }
  }, []);

  const handlePlay = useCallback(() => {
    if (puzzle && dailyState && !dailyState.completed) {
      setScreen('game');
      setAnalyticsScreen('game');
      logEvent('game_start', {
        puzzle_number: puzzle.puzzleNumber,
        date: puzzle.date,
      });
    }
  }, [puzzle, dailyState]);

  const handleBack = useCallback(() => {
    setScreen('lobby');
    setAnalyticsScreen('lobby');
  }, []);

  const handleComplete = useCallback(
    (won: boolean, attempt: number, history: AttemptResult[]) => {
      logEvent(won ? 'game_won' : 'game_lost', {
        attempt_number: attempt,
        puzzle_number: puzzle?.puzzleNumber ?? 0,
        date: puzzle?.date ?? '',
      });
      const today = todayDateStr();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

      const newStats = updateStatsAfterGame(stats, won, attempt, today, yesterdayStr);
      setStats(newStats);
      saveStats(newStats);

      if (dailyState) {
        const updated: DailyState = {
          ...dailyState,
          attemptHistory: history,
          currentAttempt: attempt,
          completed: true,
          won,
        };
        setDailyState(updated);
        saveDailyState(updated);
      }
    },
    [stats, dailyState]
  );

  const handleAttemptEnd = useCallback(
    (history: AttemptResult[], nextAttempt: number) => {
      const lastResult = history[history.length - 1];
      logEvent('attempt_fail', {
        attempt_number: nextAttempt - 1,
        order_correct: lastResult?.orderCorrect ?? false,
        placements_correct: lastResult?.placementHints.filter((h) => h.correct).length ?? 0,
      });
      if (dailyState) {
        const updated: DailyState = {
          ...dailyState,
          attemptHistory: history,
          currentAttempt: nextAttempt,
        };
        setDailyState(updated);
        saveDailyState(updated);
      }
    },
    [dailyState]
  );

  const loadNewPuzzle = useCallback((newPuzzle: Puzzle, newSeed: number) => {
    const today = todayDateStr();
    newPuzzle.puzzleNumber = dailyState?.puzzleNumber ?? 0;
    newPuzzle.date = today;
    setCurrentSeed(newSeed);
    seedRef.current = newSeed;
    const newDaily: DailyState = {
      puzzleNumber: newPuzzle.puzzleNumber,
      date: today,
      puzzle: newPuzzle,
      attemptHistory: [],
      currentAttempt: 1,
      completed: false,
      won: false,
    };
    saveDailyState(newDaily);
    setDailyState(newDaily);
    setPuzzle(newPuzzle);
    setDebugSolutionStep(null);
    if (screen === 'game') setScreen('lobby');
  }, [dailyState, screen]);

  const handleSeedPlay = useCallback((seed: number) => {
    for (let attempt = 0; attempt < 50; attempt++) {
      const actualSeed = seed + attempt;
      const newPuzzle = generatePuzzle(actualSeed);
      if (newPuzzle) {
        newPuzzle.puzzleNumber = actualSeed;
        newPuzzle.date = 'practice';
        setCurrentSeed(actualSeed);
        seedRef.current = actualSeed;
        const practiceDaily: DailyState = {
          puzzleNumber: actualSeed,
          date: 'practice',
          puzzle: newPuzzle,
          attemptHistory: [],
          currentAttempt: 1,
          completed: false,
          won: false,
        };
        setDailyState(practiceDaily);
        setPuzzle(newPuzzle);
        setDebugSolutionStep(null);
        setScreen('game');
        setAnalyticsScreen('game');
        logEvent('practice_start', { seed: actualSeed });
        return;
      }
    }
    setError('No valid puzzle found for this seed.');
  }, []);

  const handleDebugSeedChange = useCallback((newSeed: number) => {
    for (let attempt = 0; attempt < 50; attempt++) {
      const newPuzzle = generatePuzzle(newSeed + attempt);
      if (newPuzzle) {
        loadNewPuzzle(newPuzzle, newSeed + attempt);
        return;
      }
    }
    setError('No valid puzzle found for this seed.');
  }, [loadNewPuzzle]);

  const handleDebugRegenerate = useCallback(() => {
    const seed = seedRef.current;

    for (let attempt = 0; attempt < 100; attempt++) {
      const newPuzzle = generatePuzzle(seed + attempt * 31);
      if (newPuzzle) {
        loadNewPuzzle(newPuzzle, seed + attempt * 31);
        return;
      }
    }
    setError('No valid puzzle found.');
  }, [loadNewPuzzle]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '`' && e.ctrlKey) setDebugMode((prev) => !prev);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (screen === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[100dvh]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center space-y-3"
        >
          <div className="text-5xl animate-pulse">🧩</div>
          <p className="text-white/60 text-sm">Generating today&apos;s puzzle...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh]">
        <div className="text-center space-y-3 px-6">
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-game px-8"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence mode="wait">
        {screen === 'game' && puzzle && dailyState ? (
          <motion.div
            key="game"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
          >
            <Game
              puzzle={puzzle}
              initialAttempt={dailyState.currentAttempt}
              initialHistory={dailyState.attemptHistory}
              onComplete={handleComplete}
              onBack={handleBack}
              onAttemptEnd={handleAttemptEnd}
              debugSolutionStep={debugMode ? debugSolutionStep : null}
            />
          </motion.div>
        ) : (
          <motion.div
            key="lobby"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.25 }}
          >
            <Lobby
              stats={stats}
              dailyState={dailyState}
              onPlay={handlePlay}
              onSeedPlay={handleSeedPlay}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {!debugMode && process.env.NODE_ENV === 'development' && (
        <button
          onClick={() => setDebugMode(true)}
          className="fixed top-2 right-2 z-50 bg-yellow-600/80 text-black text-xs font-bold px-2 py-1 rounded opacity-50 active:opacity-100 transition-opacity"
        >
          DEBUG
        </button>
      )}

      {debugMode && puzzle && (
        <DebugPanel
          puzzle={puzzle}
          seed={currentSeed}
          onSeedChange={handleDebugSeedChange}
          onRegenerate={handleDebugRegenerate}
          onShowSolution={setDebugSolutionStep}
        />
      )}
    </>
  );
}
