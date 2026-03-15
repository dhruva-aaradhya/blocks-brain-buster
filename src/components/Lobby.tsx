'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Flame, Trophy, BarChart3 } from 'lucide-react';
import type { PlayerStats, DailyState } from '@/types/game';
import HowToPlay from './HowToPlay';
import { generateShareText, copyToClipboard } from './ShareCard';

interface LobbyProps {
  stats: PlayerStats;
  dailyState: DailyState | null;
  onPlay: () => void;
  onSeedPlay?: (seed: number) => void;
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-white/50">{label}</div>
    </div>
  );
}

function DistributionBar({
  attempt,
  count,
  maxCount,
  highlight,
}: {
  attempt: number;
  count: number;
  maxCount: number;
  highlight: boolean;
}) {
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-3 text-white/60">{attempt}</span>
      <div className="flex-1 h-5 bg-white/5 rounded overflow-hidden">
        <div
          className={`h-full rounded text-xs flex items-center justify-end pr-1.5 font-medium transition-all ${
            highlight ? 'bg-green-500 text-white' : 'bg-white/15 text-white/60'
          }`}
          style={{ width: `${Math.max(pct, count > 0 ? 8 : 0)}%` }}
        >
          {count > 0 ? count : ''}
        </div>
      </div>
    </div>
  );
}

export default function Lobby({ stats, dailyState, onPlay, onSeedPlay }: LobbyProps) {
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [countdown, setCountdown] = useState('');
  const [copied, setCopied] = useState(false);
  const [showPractice, setShowPractice] = useState(false);
  const [seedInput, setSeedInput] = useState('');

  const isCompleted = dailyState?.completed ?? false;
  const winPct = stats.totalPlayed > 0 ? Math.round((stats.totalWon / stats.totalPlayed) * 100) : 0;
  const maxDist = Math.max(...stats.attemptDistribution, 1);

  const lastAttempt = isCompleted && dailyState
    ? dailyState.attemptHistory.length
    : 0;

  useEffect(() => {
    if (!isCompleted) return;
    const tick = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setHours(24, 0, 0, 0);
      const diff = tomorrow.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isCompleted]);

  const handleShare = async () => {
    if (!dailyState) return;
    const text = generateShareText(
      dailyState.puzzle,
      dailyState.attemptHistory,
      dailyState.won
    );
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // First time player
  useEffect(() => {
    if (stats.totalPlayed === 0) {
      setShowHowToPlay(true);
    }
  }, [stats.totalPlayed]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] px-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-4xl font-bold text-gold mb-1">
          Blocks Brain Buster
        </h1>
        <p className="text-white/50 text-sm">Daily block puzzle</p>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-xl p-4 w-full max-w-sm mb-4"
      >
        <div className="flex items-center justify-around">
          <StatBox label="Played" value={stats.totalPlayed} />
          <StatBox label="Win %" value={`${winPct}%`} />
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-400 flex items-center justify-center gap-1">
              <Flame size={18} /> {stats.currentStreak}
            </div>
            <div className="text-xs text-white/50">Current Streak</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400 flex items-center justify-center gap-1">
              <Trophy size={16} /> {stats.maxStreak}
            </div>
            <div className="text-xs text-white/50">Max Streak</div>
          </div>
        </div>
      </motion.div>

      {/* Distribution */}
      {stats.totalPlayed > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-xl p-4 w-full max-w-sm mb-6"
        >
          <div className="flex items-center gap-2 mb-2 text-white/70 text-sm font-medium">
            <BarChart3 size={14} /> Attempt Distribution
          </div>
          <div className="space-y-1">
            {stats.attemptDistribution.map((count, i) => (
              <DistributionBar
                key={i}
                attempt={i + 1}
                count={count}
                maxCount={maxDist}
                highlight={isCompleted && dailyState?.won === true && lastAttempt === i + 1}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Play / Completed State */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="w-full max-w-sm space-y-3"
      >
        {isCompleted ? (
          <>
            <div className="text-center text-white/60 text-sm">
              {dailyState?.won
                ? `Solved in ${lastAttempt}/6!`
                : 'Better luck tomorrow!'}
            </div>
            <button
              onClick={handleShare}
              className="w-full btn-game text-lg"
            >
              {copied ? 'Copied!' : 'Share Result'}
            </button>
            <div className="text-center text-white/40 text-sm">
              Next puzzle in {countdown}
            </div>
          </>
        ) : (
          <motion.button
            onClick={onPlay}
            className="w-full btn-game text-xl"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            PLAY
          </motion.button>
        )}
      </motion.div>

      {/* Practice / Custom Seed */}
      {onSeedPlay && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="w-full max-w-sm mt-4"
        >
          <button
            onClick={() => setShowPractice((p) => !p)}
            className="text-white/40 hover:text-white/60 text-xs transition mx-auto block"
          >
            {showPractice ? 'Hide practice mode' : 'Practice with a custom seed'}
          </button>
          {showPractice && (
            <div className="mt-2 glass rounded-xl p-3 flex gap-2 items-center">
              <input
                type="text"
                inputMode="numeric"
                placeholder="Seed #"
                value={seedInput}
                onChange={(e) => setSeedInput(e.target.value.replace(/[^0-9]/g, ''))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && seedInput) onSeedPlay(parseInt(seedInput, 10));
                }}
                className="flex-1 bg-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 outline-none focus:ring-1 focus:ring-gold/50"
              />
              <button
                onClick={() => {
                  if (seedInput) onSeedPlay(parseInt(seedInput, 10));
                  else onSeedPlay(Math.floor(Math.random() * 999999));
                }}
                className="bg-white/10 hover:bg-white/20 text-white font-medium text-sm px-4 py-2 rounded-lg transition"
              >
                {seedInput ? 'Go' : 'Random'}
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* How to Play */}
      <div className="mt-6">
        <HowToPlay open={showHowToPlay} onOpenChange={setShowHowToPlay} />
      </div>
    </div>
  );
}
